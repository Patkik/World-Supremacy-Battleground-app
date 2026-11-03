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
    pub checkout_url: Option<String>,
    #[serde(default)]
    pub provider_livemode: Option<bool>,
    #[serde(default)]
    pub provider_request_started_at: Option<u64>,
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
    #[serde(default)]
    pub provider_payment_id: Option<String>,
    #[serde(default)]
    pub payload_digest: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct LocalEventReceipt {
    event: LocalPaidEvent,
    payment: PaymentRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct ProviderPaymentLocation {
    chapter_id: String,
    payment_id: String,
    provider_payment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct ProviderRefundState {
    payment_id: String,
    currency: String,
    total_refunded_minor: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProviderRefundReceipt {
    refund: crate::paymongo::PaymongoRefund,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProviderWebhookReceipt {
    event_id: String,
    payload_digest: String,
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
        if event
            .provider_payment_id
            .as_ref()
            .is_some_and(|payment_id| !payment_id.starts_with("pay_"))
        {
            return Err(invalid("Invalid provider payment ID"));
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
                            provider_reference: event
                                .provider_payment_id
                                .clone()
                                .unwrap_or_else(|| event.session_id.clone()),
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
                        let provider_index_path = event
                            .provider_payment_id
                            .as_ref()
                            .map(|id| format!("providerPaymentLocations/{}", key(&[id])));
                        if let Some(index_path) = &provider_index_path {
                            if get::<ProviderPaymentLocation>(&db, index_path)
                                .await?
                                .is_some()
                            {
                                return Err(conflict("Provider payment is already assigned"));
                            }
                        }
                        super::notifications::enqueue_payment_transition(
                            &db,
                            tx,
                            &reservation.chapter_id,
                            &reservation.event_id,
                            &entry.entry.id,
                            &entry.entry.crew_id,
                            &payment.payment_id,
                            &payment.payer_uid,
                            key(&["paymongo-settlement", &event.event_id]),
                            "payment_reconciled",
                            "A PayMongo test-mode event updated your local demo payment record.",
                            "A test-mode payment update affects your crew's event entry. Open the entry workspace to review its current balance.",
                        )
                        .await?;
                        if let (Some(provider_id), Some(index_path)) =
                            (&event.provider_payment_id, &provider_index_path)
                        {
                            put(
                                &db,
                                tx,
                                index_path,
                                &ProviderPaymentLocation {
                                    chapter_id: reservation.chapter_id.clone(),
                                    payment_id: reservation.id.clone(),
                                    provider_payment_id: provider_id.clone(),
                                },
                            )?;
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
        if reservation.provider_request_started_at.is_some()
            || reservation.provider_livemode.is_some()
        {
            return Err(conflict(
                "Provider cancellation requires reconciliation; reservation retained",
            ));
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
                        if current.provider_request_started_at.is_some()
                            || current.provider_livemode.is_some()
                        {
                            return Err(conflict(
                                "Provider cancellation requires reconciliation; reservation retained",
                            ));
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
        self.bind_local_checkout_session(
            claims,
            &reservation,
            &session.session_id,
            Some(format!(
                "https://checkout.paymongo.com/local?session={}",
                session.session_id
            )),
            None,
        )
        .await
    }

    pub(crate) async fn bind_local_checkout_session(
        &self,
        claims: &Claims,
        reservation: &LocalCheckoutReservation,
        session_id: &str,
        checkout_url: Option<String>,
        provider_livemode: Option<bool>,
    ) -> Result<LocalCheckoutReservation> {
        segment(session_id)?;
        if !session_id.starts_with("cs_") {
            return Err(invalid("Invalid synthetic session"));
        }
        let input = (
            claims.clone(),
            reservation.clone(),
            session_id.to_owned(),
            checkout_url,
            provider_livemode,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, expected, session_id, checkout_url, provider_livemode) = input.clone();
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
                            return if existing == &session_id
                                && current.checkout_url == checkout_url
                                && current.provider_livemode == provider_livemode
                            {
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
                        current.checkout_url = checkout_url;
                        current.provider_livemode = provider_livemode;
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

    pub(crate) async fn begin_paymongo_checkout_request(
        &self,
        claims: &Claims,
        reservation: &LocalCheckoutReservation,
    ) -> Result<LocalCheckoutReservation> {
        let input = (claims.clone(), reservation.clone(), now_secs());
        self.db
            .run_transaction(|db, tx| {
                let (claims, expected, now) = input.clone();
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
                            || current.operation_id != expected.operation_id
                            || current.payer_uid != claims.sub
                            || current.amount_minor != expected.amount_minor
                            || current.currency != expected.currency
                        {
                            return Err(forbidden());
                        }
                        if current.cancelled || current.settled || current.session_id.is_some() {
                            return Err(conflict("Checkout reservation is no longer payable"));
                        }
                        if let Some(started_at) = current.provider_request_started_at {
                            if now.saturating_sub(started_at) >= 23 * 60 * 60 {
                                return Err(conflict(
                                    "Provider outcome is unknown; reconcile it before retrying",
                                ));
                            }
                            return Ok(current);
                        }
                        current.provider_request_started_at = Some(now);
                        put(&db, tx, &path, &current)?;
                        audit(
                            &db,
                            tx,
                            &current.chapter_id,
                            &claims.sub,
                            "paymongo_checkout_request_started",
                            &current.id,
                            &key(&["paymongo-checkout-start", &current.id]),
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
                            checkout_url: None,
                            provider_livemode: None,
                            provider_request_started_at: None,
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
        payload_digest: &str,
    ) -> Result<PaymentRecord> {
        if std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
            || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
            || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
            || event.livemode
        {
            return Err(forbidden());
        }
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
                    provider_payment_id: event.payment.as_ref().map(|p| p.payment_id.clone()),
                    payload_digest: Some(payload_digest.to_owned()),
                };
                self.settle_local_checkout(&local_event).await
            }
            crate::paymongo::PaymongoEventType::PaymentRefunded => {
                self.settle_provider_refund_event(event, payload_digest)
                    .await
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

    async fn settle_provider_refund_event(
        &self,
        event: &crate::paymongo::PaymongoEvent,
        payload_digest: &str,
    ) -> Result<PaymentRecord> {
        let payment_data = event
            .payment
            .as_ref()
            .ok_or_else(|| invalid("Refund event has no payment identity"))?;
        if !event.event_id.starts_with("evt_")
            || !payment_data.payment_id.starts_with("pay_")
            || payment_data.currency.is_empty()
            || event.refunds.len() > 50
            || payload_digest.len() != 64
        {
            return Err(invalid("Invalid provider refund event"));
        }
        let mut refund_ids = std::collections::HashSet::new();
        for refund in &event.refunds {
            if !refund.id.starts_with("ref_")
                || refund.payment_id != payment_data.payment_id
                || refund.currency != payment_data.currency
                || refund.livemode != event.livemode
                || refund.amount_minor == 0
                || !refund_ids.insert(refund.id.clone())
            {
                return Err(invalid("Refund records do not match the event payment"));
            }
        }

        let event = event.clone();
        let payload_digest = payload_digest.to_owned();
        self.db
            .run_transaction(|db, tx| {
                let event = event.clone();
                let payload_digest = payload_digest.clone();
                Box::pin(async move {
                    async {
                        let event_receipt_path =
                            format!("paymongoWebhookEvents/{}", key(&[&event.event_id]));
                        if let Some(receipt) =
                            get::<ProviderWebhookReceipt>(&db, &event_receipt_path).await?
                        {
                            return if receipt.payload_digest == payload_digest {
                                Ok(receipt.payment)
                            } else {
                                Err(conflict("Webhook event ID already used"))
                            };
                        }

                        let payment_id = event
                            .payment
                            .as_ref()
                            .expect("validated event payment")
                            .payment_id
                            .as_str();
                        let index_path = format!("providerPaymentLocations/{}", key(&[payment_id]));
                        let index: ProviderPaymentLocation = required(&db, &index_path).await?;
                        if index.provider_payment_id != payment_id {
                            return Err(forbidden());
                        }
                        let payment_path = format!(
                            "chapters/{}/payments/{}",
                            segment(&index.chapter_id)?,
                            segment(&index.payment_id)?
                        );
                        let mut payment: PaymentRecord = required(&db, &payment_path).await?;
                        let payment_data = event.payment.as_ref().expect("validated event payment");
                        if payment.chapter_id != index.chapter_id
                            || payment.payment_id != index.payment_id
                            || payment.provider_reference != payment_id
                            || payment.currency != payment_data.currency
                            || !matches!(
                                payment.status,
                                PaymentStatus::Settled | PaymentStatus::Refunded
                            )
                        {
                            return Err(conflict("Provider payment does not match the WSB ledger"));
                        }

                        let refund_state_path = format!(
                            "chapters/{}/providerRefundStates/{}",
                            segment(&index.chapter_id)?,
                            key(&[payment_id])
                        );
                        let refund_state: Option<ProviderRefundState> =
                            get(&db, &refund_state_path).await?;
                        let previous_total = refund_state
                            .as_ref()
                            .map(|state| state.total_refunded_minor)
                            .unwrap_or(0);
                        if previous_total > payment.amount_minor
                            || (payment.status == PaymentStatus::Refunded
                                && previous_total != payment.amount_minor)
                            || (payment.status == PaymentStatus::Settled
                                && previous_total >= payment.amount_minor)
                        {
                            return Err(conflict(
                                "Provider refund state does not match the payment ledger",
                            ));
                        }
                        if refund_state.as_ref().is_some_and(|state| {
                            state.payment_id != index.payment_id
                                || state.currency != payment.currency
                        }) {
                            return Err(forbidden());
                        }

                        let mut new_refunds = Vec::new();
                        let mut new_amount = 0_u64;
                        for refund in &event.refunds {
                            if refund.status != "succeeded" {
                                continue;
                            }
                            let refund_path = format!(
                                "chapters/{}/providerRefunds/{}",
                                segment(&index.chapter_id)?,
                                key(&[&refund.id])
                            );
                            if let Some(existing) =
                                get::<ProviderRefundReceipt>(&db, &refund_path).await?
                            {
                                if existing.refund != *refund {
                                    return Err(conflict("Provider refund ID changed"));
                                }
                            } else {
                                new_amount = new_amount
                                    .checked_add(refund.amount_minor)
                                    .ok_or_else(|| invalid("Refund amount overflow"))?;
                                new_refunds.push((refund_path, refund.clone()));
                            }
                        }
                        let next_total = previous_total
                            .checked_add(new_amount)
                            .ok_or_else(|| invalid("Refund total overflow"))?;
                        if next_total > payment.amount_minor
                            || (payment.status == PaymentStatus::Refunded
                                && next_total != payment.amount_minor)
                        {
                            return Err(conflict("Provider refunds exceed the settled payment"));
                        }

                        if new_amount > 0 {
                            let scope: PaymentLocation = required(
                                &db,
                                &format!(
                                    "chapters/{}/paymentLocations/{}",
                                    segment(&index.chapter_id)?,
                                    segment(&index.payment_id)?
                                ),
                            )
                            .await?;
                            let mut entry: EntryDocument = required(
                                &db,
                                &entry_path(&index.chapter_id, &scope.event_id, &scope.entry_id)?,
                            )
                            .await?;
                            if entry.entry.chapter_id != index.chapter_id
                                || entry.entry.event_id != scope.event_id
                                || entry.entry.id != payment.entry_id
                                || entry.entry.id != scope.entry_id
                            {
                                return Err(forbidden());
                            }
                            let division_path = division_path(
                                &index.chapter_id,
                                &scope.event_id,
                                &entry.entry.division_id,
                            )?;
                            let mut division: DivisionDocument =
                                required(&db, &division_path).await?;
                            let before = readiness(&entry, &division)?.is_ready;
                            entry.entry.paid_minor = entry
                                .entry
                                .paid_minor
                                .checked_sub(new_amount)
                                .ok_or_else(|| conflict("Paid ledger underflow"))?;
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
                            payment.status = if next_total == payment.amount_minor {
                                PaymentStatus::Refunded
                            } else {
                                PaymentStatus::Settled
                            };
                            super::notifications::enqueue_payment_transition(
                                &db,
                                tx,
                                &index.chapter_id,
                                &scope.event_id,
                                &entry.entry.id,
                                &entry.entry.crew_id,
                                &payment.payment_id,
                                &payment.payer_uid,
                                key(&["paymongo-refund", &event.event_id]),
                                "provider_refund_reconciled",
                                "A PayMongo test-mode refund event updated the local WSB payment ledger.",
                                "A test-mode refund update affects your crew's event entry. Open the entry workspace to review its current balance.",
                            )
                            .await?;
                            for (refund_path, refund) in new_refunds {
                                put(&db, tx, &refund_path, &ProviderRefundReceipt { refund })?;
                            }
                            put(
                                &db,
                                tx,
                                &refund_state_path,
                                &ProviderRefundState {
                                    payment_id: index.payment_id.clone(),
                                    currency: payment.currency.clone(),
                                    total_refunded_minor: next_total,
                                },
                            )?;
                            put(
                                &db,
                                tx,
                                &entry_path(&index.chapter_id, &scope.event_id, &scope.entry_id)?,
                                &entry,
                            )?;
                            put(&db, tx, &division_path, &division)?;
                            put(&db, tx, &payment_path, &payment)?;
                            audit(
                                &db,
                                tx,
                                &index.chapter_id,
                                "paymongo_webhook",
                                "provider_refund_reconciled",
                                &index.payment_id,
                                &key(&["paymongo-refund-event", &event.event_id]),
                            )?;
                        }
                        put(
                            &db,
                            tx,
                            &event_receipt_path,
                            &ProviderWebhookReceipt {
                                event_id: event.event_id.clone(),
                                payload_digest,
                                payment: payment.clone(),
                            },
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
}
