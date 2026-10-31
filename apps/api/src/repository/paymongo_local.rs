//! Durable reservations for synthetic PayMongo checkout. Never used for live payments.
use super::*;
use crate::domain::{EntryStatus, PaymentRecord, PaymentStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LocalCheckoutReservation {
    pub id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub entry_id: String,
    pub payer_uid: String,
    pub operation_id: String,
    pub requested_amount_minor: Option<u64>,
    pub amount_minor: u64,
    pub currency: String,
    pub created_at: u64,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub cancelled: bool,
    #[serde(default)]
    pub settled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LocalPaidEvent {
    pub event_id: String,
    pub session_id: String,
    pub reference: String,
    pub amount_minor: u64,
    pub currency: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct LocalEventReceipt {
    event: LocalPaidEvent,
    payment: PaymentRecord,
}

impl FirestoreRepository {
    /// Drive the synthetic provider and signed callback, only for the current payer.
    pub async fn simulate_local_payment(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        operation_id: &str,
    ) -> Result<LocalCheckoutReservation> {
        if std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
            || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
            || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
        {
            return Err(forbidden());
        }
        segment(operation_id)?;
        entry_access(&self.db, claims, chapter, event, entry_id, false).await?;
        let id = key(&["local-paymongo", chapter, &claims.sub, operation_id]);
        let path = format!(
            "chapters/{}/localCheckoutReservations/{id}",
            segment(chapter)?
        );
        let reservation: LocalCheckoutReservation = required(&self.db, &path).await?;
        if reservation.id != id
            || reservation.chapter_id != chapter
            || reservation.event_id != event
            || reservation.entry_id != entry_id
            || reservation.payer_uid != claims.sub
            || reservation.operation_id != operation_id
        {
            return Err(forbidden());
        }
        if reservation.cancelled {
            return Err(conflict("Checkout was cancelled"));
        }
        if reservation.settled {
            return Ok(reservation);
        }
        let session = reservation
            .session_id
            .as_deref()
            .ok_or_else(|| conflict("Checkout session is not ready"))?;
        segment(session)?;
        if !session.starts_with("cs_") {
            return Err(invalid("Invalid synthetic session"));
        }
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .map_err(|_| {
                deny(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Local simulator unavailable",
                )
            })?;
        for action in ["pay", "deliver"] {
            let response = client
                .post(format!(
                    "http://paymongo-emulator:8191/test/checkout_sessions/{session}/{action}"
                ))
                .send()
                .await
                .map_err(|_| {
                    deny(
                        StatusCode::SERVICE_UNAVAILABLE,
                        "Local simulator unavailable; retry",
                    )
                })?;
            if !response.status().is_success() {
                return Err(deny(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Local payment delivery failed; retry",
                ));
            }
        }
        entry_access(&self.db, claims, chapter, event, entry_id, false).await?;
        let current: LocalCheckoutReservation = required(&self.db, &path).await?;
        if current.id != id || current.payer_uid != claims.sub || !current.settled {
            return Err(conflict("Synthetic payment is not settled"));
        }
        Ok(current)
    }

    /// Apply a previously authenticated synthetic event; never call with unverified input.
    pub async fn settle_local_checkout(&self, event: &LocalPaidEvent) -> Result<PaymentRecord> {
        segment(&event.event_id)?;
        segment(&event.session_id)?;
        if !event.reference.is_empty() {
            segment(&event.reference)?;
        }
        if !event.event_id.starts_with("evt_")
            || !event.session_id.starts_with("cs_")
            || event.currency != "PHP"
            || event.amount_minor == 0
        {
            return Err(invalid("Invalid synthetic event"));
        }
        let event = event.clone();
        self.db
            .run_transaction(|db, tx| {
                let event = event.clone();
                Box::pin(async move {
                    async {
                        let receipt_path =
                            format!("localCheckoutEvents/{}", key(&[&event.event_id]));
                        if let Some(receipt) = get::<LocalEventReceipt>(&db, &receipt_path).await? {
                            return if receipt.event == event {
                                Ok(receipt.payment)
                            } else {
                                Err(conflict("Event ID already used"))
                            };
                        }
                        let index_path =
                            format!("localCheckoutSessionIndex/{}", key(&[&event.session_id]));
                        let index: LocalCheckoutReservation = required(&db, &index_path).await?;
                        let reservation_path = format!(
                            "chapters/{}/localCheckoutReservations/{}",
                            segment(&index.chapter_id)?,
                            segment(&index.id)?
                        );
                        let mut reservation: LocalCheckoutReservation =
                            required(&db, &reservation_path).await?;
                        if reservation != index
                            || reservation.id != event.reference
                            || reservation.session_id.as_deref() != Some(&event.session_id)
                            || reservation.currency != event.currency
                            || reservation.amount_minor != event.amount_minor
                        {
                            return Err(conflict("Synthetic event does not match reservation"));
                        }
                        if reservation.cancelled || reservation.settled {
                            return Err(conflict("Reservation cannot be settled"));
                        }
                        let mut entry: EntryDocument = required(
                            &db,
                            &entry_path(
                                &reservation.chapter_id,
                                &reservation.event_id,
                                &reservation.entry_id,
                            )?,
                        )
                        .await?;
                        if entry.entry.chapter_id != reservation.chapter_id
                            || entry.entry.event_id != reservation.event_id
                            || entry.entry.id != reservation.entry_id
                        {
                            return Err(forbidden());
                        }
                        let division_path = division_path(
                            &reservation.chapter_id,
                            &reservation.event_id,
                            &entry.entry.division_id,
                        )?;
                        let mut division: DivisionDocument = required(&db, &division_path).await?;
                        let before = readiness(&entry, &division)?.is_ready;
                        entry.pending_minor = entry
                            .pending_minor
                            .checked_sub(reservation.amount_minor)
                            .ok_or_else(|| conflict("Reservation ledger needs reconciliation"))?;
                        entry.entry.paid_minor = entry
                            .entry
                            .paid_minor
                            .checked_add(reservation.amount_minor)
                            .ok_or_else(|| invalid("Paid amount overflow"))?;
                        entry.entry.revision = entry
                            .entry
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Entry revision overflow"))?;
                        entry.entry.updated_at = now_secs();
                        let after = readiness(&entry, &division)?.is_ready;
                        if entry.entry.status == EntryStatus::Approved {
                            adjust_readiness(&mut division, before, after)?;
                        }
                        reservation.settled = true;
                        let payment = PaymentRecord {
                            payment_id: reservation.id.clone(),
                            chapter_id: reservation.chapter_id.clone(),
                            entry_id: reservation.entry_id.clone(),
                            payer_uid: reservation.payer_uid.clone(),
                            amount_minor: reservation.amount_minor,
                            currency: reservation.currency.clone(),
                            status: PaymentStatus::Settled,
                            provider_reference: event.session_id.clone(),
                            created_at: reservation.created_at,
                            settled_at: Some(now_secs()),
                        };
                        let payment_path = format!(
                            "chapters/{}/payments/{}",
                            segment(&reservation.chapter_id)?,
                            segment(&reservation.id)?
                        );
                        if get::<PaymentRecord>(&db, &payment_path).await?.is_some() {
                            return Err(conflict("Payment record already exists"));
                        }
                        put(
                            &db,
                            tx,
                            &entry_path(
                                &reservation.chapter_id,
                                &reservation.event_id,
                                &reservation.entry_id,
                            )?,
                            &entry,
                        )?;
                        put(&db, tx, &division_path, &division)?;
                        put(&db, tx, &reservation_path, &reservation)?;
                        put(&db, tx, &index_path, &reservation)?;
                        put(&db, tx, &payment_path, &payment)?;
                        put(
                            &db,
                            tx,
                            &format!(
                                "chapters/{}/paymentLocations/{}",
                                segment(&reservation.chapter_id)?,
                                segment(&reservation.id)?
                            ),
                            &PaymentLocation {
                                event_id: reservation.event_id.clone(),
                                entry_id: reservation.entry_id.clone(),
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &LocalEventReceipt {
                                event: event.clone(),
                                payment: payment.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &reservation.chapter_id,
                            "local_paymongo",
                            "local_checkout_settled",
                            &reservation.id,
                            &key(&["local-paymongo-event", &event.event_id]),
                        )?;
                        Ok(payment)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    /// List only this payer's synthetic reservations for the currently authorized entry.
    pub async fn list_local_checkouts(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<LocalCheckoutReservation>> {
        if std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
            || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
            || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
        {
            return Err(forbidden());
        }
        if cursor.as_ref().is_some_and(|v| v.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        entry_access(&self.db, claims, chapter, event, entry_id, false).await?;
        let mut page = self
            .page::<LocalCheckoutReservation>(
                &format!("chapters/{}", segment(chapter)?),
                "localCheckoutReservations",
                cursor,
                limit,
            )
            .await?;
        if page.items.iter().any(|value| value.chapter_id != chapter) {
            return Err(forbidden());
        }
        page.items.retain(|value| {
            value.event_id == event && value.entry_id == entry_id && value.payer_uid == claims.sub
        });
        Ok(page)
    }

    /// Expire the synthetic session first; only then release its reservation.
    pub async fn cancel_local_checkout(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        operation_id: &str,
    ) -> Result<LocalCheckoutReservation> {
        if std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
            || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
            || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
        {
            return Err(forbidden());
        }
        segment(operation_id)?;
        entry_access(&self.db, claims, chapter, event, entry_id, false).await?;
        let id = key(&["local-paymongo", chapter, &claims.sub, operation_id]);
        let path = format!(
            "chapters/{}/localCheckoutReservations/{id}",
            segment(chapter)?
        );
        let reservation: LocalCheckoutReservation = required(&self.db, &path).await?;
        if reservation.id != id
            || reservation.chapter_id != chapter
            || reservation.event_id != event
            || reservation.entry_id != entry_id
            || reservation.payer_uid != claims.sub
            || reservation.operation_id != operation_id
        {
            return Err(forbidden());
        }
        if reservation.cancelled {
            return Ok(reservation);
        }
        if reservation.settled {
            return Err(conflict("Checkout already settled"));
        }
        let session = reservation
            .session_id
            .as_deref()
            .ok_or_else(|| conflict("Checkout session not ready; retry creation first"))?;
        crate::paymongo::expire_emulated_checkout(
            session,
            &reservation.id,
            reservation.amount_minor,
        )
        .await
        .map_err(|_| conflict("Checkout could not be safely expired; reservation retained"))?;
        let input = (claims.clone(), reservation.clone());
        self.db
            .run_transaction(|db, tx| {
                let (claims, expected) = input.clone();
                Box::pin(async move {
                    async {
                        let mut entry = entry_access(
                            &db,
                            &claims,
                            &expected.chapter_id,
                            &expected.event_id,
                            &expected.entry_id,
                            false,
                        )
                        .await?;
                        let path = format!(
                            "chapters/{}/localCheckoutReservations/{}",
                            segment(&expected.chapter_id)?,
                            segment(&expected.id)?
                        );
                        let mut current: LocalCheckoutReservation = required(&db, &path).await?;
                        if current.id != expected.id
                            || current.chapter_id != expected.chapter_id
                            || current.event_id != expected.event_id
                            || current.entry_id != expected.entry_id
                            || current.payer_uid != claims.sub
                            || current.operation_id != expected.operation_id
                            || current.amount_minor != expected.amount_minor
                            || current.session_id != expected.session_id
                        {
                            return Err(forbidden());
                        }
                        if current.cancelled {
                            return Ok(current);
                        }
                        if current.settled {
                            return Err(conflict("Checkout already settled"));
                        }
                        entry.pending_minor = entry
                            .pending_minor
                            .checked_sub(current.amount_minor)
                            .ok_or_else(|| conflict("Reservation ledger needs reconciliation"))?;
                        entry.entry.revision = entry
                            .entry
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Entry revision overflow"))?;
                        entry.entry.updated_at = now_secs();
                        current.cancelled = true;
                        put(
                            &db,
                            tx,
                            &entry_path(&current.chapter_id, &current.event_id, &current.entry_id)?,
                            &entry,
                        )?;
                        put(&db, tx, &path, &current)?;
                        let index = format!(
                            "localCheckoutSessionIndex/{}",
                            key(&[current
                                .session_id
                                .as_deref()
                                .ok_or_else(|| conflict("Session missing"))?])
                        );
                        put(&db, tx, &index, &current)?;
                        audit(
                            &db,
                            tx,
                            &current.chapter_id,
                            &claims.sub,
                            "local_checkout_cancelled",
                            &current.id,
                            &key(&["local-checkout-cancel", &current.id]),
                        )?;
                        Ok(current)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    /// Local-only orchestration; a session never indicates a settled payment.
    pub async fn start_local_checkout(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        operation_id: &str,
        amount: Option<u64>,
    ) -> Result<LocalCheckoutReservation> {
        if std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
            || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
            || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
        {
            return Err(forbidden());
        }
        let reservation = self
            .reserve_local_checkout(claims, chapter, event, entry_id, operation_id, amount)
            .await?;
        if reservation.cancelled {
            return Err(conflict("Checkout was cancelled"));
        }
        let session = crate::paymongo::create_emulated_checkout(
            "http://paymongo-emulator:8191",
            &reservation.id,
            &reservation.id,
            reservation.amount_minor,
        )
        .await
        .map_err(|_| {
            deny(
                StatusCode::SERVICE_UNAVAILABLE,
                "Local checkout temporarily unavailable; retry the same operation",
            )
        })?;
        self.bind_local_checkout_session(claims, &reservation, &session.session_id)
            .await
    }

    pub(crate) async fn bind_local_checkout_session(
        &self,
        claims: &Claims,
        reservation: &LocalCheckoutReservation,
        session_id: &str,
    ) -> Result<LocalCheckoutReservation> {
        segment(session_id)?;
        if !session_id.starts_with("cs_") {
            return Err(invalid("Invalid synthetic session"));
        }
        let input = (claims.clone(), reservation.clone(), session_id.to_owned());
        self.db
            .run_transaction(|db, tx| {
                let (claims, expected, session_id) = input.clone();
                Box::pin(async move {
                    async {
                        entry_access(
                            &db,
                            &claims,
                            &expected.chapter_id,
                            &expected.event_id,
                            &expected.entry_id,
                            false,
                        )
                        .await?;
                        if claims.sub != expected.payer_uid {
                            return Err(forbidden());
                        }
                        let path = format!(
                            "chapters/{}/localCheckoutReservations/{}",
                            segment(&expected.chapter_id)?,
                            segment(&expected.id)?
                        );
                        let mut current: LocalCheckoutReservation = required(&db, &path).await?;
                        if current.id != expected.id
                            || current.chapter_id != expected.chapter_id
                            || current.event_id != expected.event_id
                            || current.entry_id != expected.entry_id
                            || current.payer_uid != claims.sub
                            || current.operation_id != expected.operation_id
                            || current.amount_minor != expected.amount_minor
                            || current.currency != expected.currency
                        {
                            return Err(forbidden());
                        }
                        if current.cancelled {
                            return Err(conflict("Checkout was cancelled"));
                        }
                        if let Some(existing) = &current.session_id {
                            return if existing == &session_id {
                                Ok(current)
                            } else {
                                Err(conflict("Checkout session changed"))
                            };
                        }
                        let index_path =
                            format!("localCheckoutSessionIndex/{}", key(&[&session_id]));
                        if get::<LocalCheckoutReservation>(&db, &index_path)
                            .await?
                            .is_some()
                        {
                            return Err(conflict("Checkout session already assigned"));
                        }
                        current.session_id = Some(session_id);
                        put(&db, tx, &path, &current)?;
                        put(&db, tx, &index_path, &current)?;
                        audit(
                            &db,
                            tx,
                            &current.chapter_id,
                            &claims.sub,
                            "local_checkout_session_bound",
                            &current.id,
                            &key(&["local-checkout-bind", &current.id]),
                        )?;
                        Ok(current)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
    pub async fn reserve_local_checkout(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        operation_id: &str,
        amount: Option<u64>,
    ) -> Result<LocalCheckoutReservation> {
        segment(operation_id)?;
        if amount == Some(0) {
            return Err(invalid("Payment amount must be positive"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
            operation_id.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, entry_id, operation_id) = input.clone();
                Box::pin(async move {
                    async {
                        let mut entry =
                            entry_access(&db, &claims, &chapter, &event, &entry_id, false).await?;
                        let id = key(&["local-paymongo", &chapter, &claims.sub, &operation_id]);
                        let path = format!(
                            "chapters/{}/localCheckoutReservations/{id}",
                            segment(&chapter)?
                        );
                        if let Some(previous) = get::<LocalCheckoutReservation>(&db, &path).await? {
                            if previous.chapter_id != chapter
                                || previous.event_id != event
                                || previous.entry_id != entry_id
                                || previous.payer_uid != claims.sub
                                || previous.operation_id != operation_id
                                || previous.requested_amount_minor != amount
                            {
                                return Err(conflict("Checkout operation already used"));
                            }
                            return Ok(previous);
                        }
                        let chapter_doc: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        let division: DivisionDocument = required(
                            &db,
                            &division_path(&chapter, &event, &entry.entry.division_id)?,
                        )
                        .await?;
                        let quote = super::finance::quote(&chapter_doc, &entry, &division)?;
                        if quote.currency != "PHP" {
                            return Err(conflict("Local PayMongo simulation supports PHP only"));
                        }
                        let selected = amount.unwrap_or(quote.available_amount_minor);
                        if selected == 0 || selected > quote.available_amount_minor {
                            return Err(conflict("Payment amount exceeds available balance"));
                        }
                        entry.pending_minor = entry
                            .pending_minor
                            .checked_add(selected)
                            .ok_or_else(|| invalid("Reservation overflow"))?;
                        entry.entry.revision = entry
                            .entry
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Entry revision overflow"))?;
                        entry.entry.updated_at = now_secs();
                        let reservation = LocalCheckoutReservation {
                            id: id.clone(),
                            chapter_id: chapter.clone(),
                            event_id: event.clone(),
                            entry_id: entry_id.clone(),
                            payer_uid: claims.sub.clone(),
                            operation_id: operation_id.clone(),
                            requested_amount_minor: amount,
                            amount_minor: selected,
                            currency: quote.currency,
                            created_at: now_secs(),
                            session_id: None,
                            cancelled: false,
                            settled: false,
                        };
                        put(&db, tx, &entry_path(&chapter, &event, &entry_id)?, &entry)?;
                        put(&db, tx, &path, &reservation)?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "local_checkout_reserved",
                            &id,
                            &key(&["local-checkout", &claims.sub, &operation_id]),
                        )?;
                        Ok(reservation)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    /// Settle a verified PayMongo webhook event (either CheckoutSessionPaid or PaymentRefunded).
    pub async fn settle_paymongo_event(
        &self,
        event: &crate::paymongo::PaymongoEvent,
    ) -> Result<PaymentRecord> {
        match &event.event_type {
            crate::paymongo::PaymongoEventType::CheckoutSessionPaid => {
                let local_event = LocalPaidEvent {
                    event_id: event.event_id.clone(),
                    session_id: event.session_id.clone().unwrap_or_default(),
                    reference: event.reference_number.clone().unwrap_or_default(),
                    amount_minor: event.payment.as_ref().map(|p| p.amount_minor).unwrap_or(0),
                    currency: event
                        .payment
                        .as_ref()
                        .map(|p| p.currency.clone())
                        .unwrap_or_else(|| "PHP".into()),
                };
                self.settle_local_checkout(&local_event).await
            }
            crate::paymongo::PaymongoEventType::PaymentRefunded => {
                let payment_id = event
                    .payment
                    .as_ref()
                    .map(|p| p.payment_id.as_str())
                    .unwrap_or_default();
                let receipt_path = format!("localCheckoutEvents/{}", key(&[&event.event_id]));
                if let Some(existing) = get::<LocalEventReceipt>(&self.db, &receipt_path).await? {
                    return Ok(existing.payment);
                }
                let event = event.clone();
                let payment_id = payment_id.to_string();
                self.db
                    .run_transaction(|db, tx| {
                        let event = event.clone();
                        let payment_id = payment_id.clone();
                        Box::pin(async move {
                            async {
                                let receipt_path =
                                    format!("localCheckoutEvents/{}", key(&[&event.event_id]));
                                if let Some(receipt) =
                                    get::<LocalEventReceipt>(&db, &receipt_path).await?
                                {
                                    return Ok(receipt.payment);
                                }
                                let index_path =
                                    format!("localCheckoutSessionIndex/{}", key(&[&payment_id]));
                                let reservation: Option<LocalCheckoutReservation> =
                                    get(&db, &index_path).await?;
                                let (chapter_id, target_payment_id) = if let Some(res) = reservation
                                {
                                    (res.chapter_id, res.id)
                                } else {
                                    ("ph".to_string(), payment_id.clone())
                                };

                                let pay_path = format!(
                                    "chapters/{}/payments/{}",
                                    segment(&chapter_id)?,
                                    segment(&target_payment_id)?
                                );
                                let mut payment: PaymentRecord = required(&db, &pay_path).await?;
                                if payment.status == PaymentStatus::Refunded {
                                    return Ok(payment);
                                }
                                let scope: PaymentLocation = required(
                                    &db,
                                    &format!(
                                        "chapters/{}/paymentLocations/{}",
                                        segment(&chapter_id)?,
                                        segment(&target_payment_id)?
                                    ),
                                )
                                .await?;

                                let mut entry: EntryDocument = required(
                                    &db,
                                    &entry_path(&chapter_id, &scope.event_id, &scope.entry_id)?,
                                )
                                .await?;

                                let division_path = division_path(
                                    &chapter_id,
                                    &scope.event_id,
                                    &entry.entry.division_id,
                                )?;
                                let mut division: DivisionDocument =
                                    required(&db, &division_path).await?;
                                let before = readiness(&entry, &division)?.is_ready;

                                let refund_amount = event
                                    .payment
                                    .as_ref()
                                    .map(|p| p.amount_minor)
                                    .unwrap_or(payment.amount_minor);
                                entry.entry.paid_minor = entry
                                    .entry
                                    .paid_minor
                                    .checked_sub(refund_amount)
                                    .ok_or_else(|| conflict("Paid ledger underflow"))?;
                                entry.entry.revision = entry
                                    .entry
                                    .revision
                                    .checked_add(1)
                                    .ok_or_else(|| conflict("Revision overflow"))?;
                                entry.entry.updated_at = now_secs();

                                let after = readiness(&entry, &division)?.is_ready;
                                if entry.entry.status == EntryStatus::Approved {
                                    adjust_readiness(&mut division, before, after)?;
                                }

                                payment.status = PaymentStatus::Refunded;

                                put(
                                    &db,
                                    tx,
                                    &entry_path(&chapter_id, &scope.event_id, &scope.entry_id)?,
                                    &entry,
                                )?;
                                put(&db, tx, &division_path, &division)?;
                                put(&db, tx, &pay_path, &payment)?;
                                put(
                                    &db,
                                    tx,
                                    &receipt_path,
                                    &LocalEventReceipt {
                                        event: LocalPaidEvent {
                                            event_id: event.event_id.clone(),
                                            session_id: payment_id.clone(),
                                            reference: target_payment_id.clone(),
                                            amount_minor: refund_amount,
                                            currency: "PHP".into(),
                                        },
                                        payment: payment.clone(),
                                    },
                                )?;
                                audit(
                                    &db,
                                    tx,
                                    &chapter_id,
                                    "paymongo_webhook",
                                    "payment_refunded_webhook",
                                    &target_payment_id,
                                    &key(&["paymongo-refund-event", &event.event_id]),
                                )?;
                                Ok(payment)
                            }
                            .await
                            .map_err(backoff)
                        })
                    })
                    .await
                    .map_err(transaction_error)
            }
            _ => {
                let receipt_path = format!("localCheckoutEvents/{}", key(&[&event.event_id]));
                if let Some(existing) = get::<LocalEventReceipt>(&self.db, &receipt_path).await? {
                    return Ok(existing.payment);
                }
                let dummy = PaymentRecord {
                    payment_id: "evt_ack".into(),
                    chapter_id: "global".into(),
                    entry_id: String::new(),
                    payer_uid: String::new(),
                    amount_minor: 0,
                    currency: "PHP".into(),
                    status: PaymentStatus::Settled,
                    provider_reference: event.event_id.clone(),
                    created_at: now_secs(),
                    settled_at: Some(now_secs()),
                };
                Ok(dummy)
            }
        }
    }
}
