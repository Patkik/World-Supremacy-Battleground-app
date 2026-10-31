use super::*;
use crate::domain::{
    EntryStatus, FinanceSummary, PaymentQuote, PaymentRecord, PaymentStatus,
    SyntheticWebhookPayload, WebhookReceipt,
};

pub(super) fn quote(
    chapter: &Chapter,
    entry: &EntryDocument,
    division: &DivisionDocument,
) -> Result<PaymentQuote> {
    let count = entry.entry.roster.len();
    let total = division
        .policy
        .fee_minor
        .checked_mul(count as u64)
        .ok_or_else(|| invalid("Fee overflow"))?;
    let outstanding = total
        .checked_sub(entry.entry.paid_minor)
        .ok_or_else(|| conflict("Paid ledger exceeds configured total"))?;
    let available = outstanding
        .checked_sub(entry.pending_minor)
        .ok_or_else(|| conflict("Payment reservations exceed outstanding balance"))?;
    Ok(PaymentQuote {
        entry_id: entry.entry.id.clone(),
        division_name: division.policy.name.clone(),
        dancer_count: count,
        rate_per_dancer_minor: division.policy.fee_minor,
        total_amount_minor: total,
        currency: chapter.currency.clone(),
        paid_amount_minor: entry.entry.paid_minor,
        pending_amount_minor: entry.pending_minor,
        outstanding_amount_minor: outstanding,
        available_amount_minor: available,
    })
}

impl FirestoreRepository {
    pub async fn payment_quote(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
    ) -> Result<PaymentQuote> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, entry_id) = input.clone();
                Box::pin(async move {
                    let claims = &claims;
                    let chapter = chapter.as_str();
                    let event = event.as_str();
                    let entry_id = entry_id.as_str();
                    async {
                        let entry =
                            entry_access(&db, claims, chapter, event, entry_id, false).await?;
                        let chapter_doc: Chapter =
                            required(&db, &format!("chapters/{}", segment(chapter)?)).await?;
                        let division: DivisionDocument = required(
                            &db,
                            &division_path(chapter, event, &entry.entry.division_id)?,
                        )
                        .await?;
                        quote(&chapter_doc, &entry, &division)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn request_payment(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        reference: &str,
        requested_amount: Option<u64>,
    ) -> Result<PaymentRecord> {
        let reference = reference.trim();
        if reference.is_empty() || reference.len() > 200 {
            return Err(invalid("Invalid payment reference"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
            reference.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, entry_id, reference) = input.clone();
                Box::pin(async move {
                    let claims = &claims;
                    let chapter = chapter.as_str();
                    let event = event.as_str();
                    let entry_id = entry_id.as_str();
                    let reference = reference.as_str();
                    async {
                        let mut entry =
                            entry_access(&db, claims, chapter, event, entry_id, false).await?;
                        let ref_path = format!(
                            "chapters/{}/paymentReferences/{}",
                            segment(chapter)?,
                            key(&[reference])
                        );
                        if let Some(existing) = get::<PaymentReference>(&db, &ref_path).await? {
                            if existing.entry_id != entry_id
                                || existing.event_id != event
                                || existing.payer_uid != claims.sub
                                || existing.reference != reference
                                || requested_amount.is_some_and(|v| v != existing.amount_minor)
                            {
                                return Err(conflict(
                                    "Provider reference already used with different amount",
                                ));
                            }
                            return required(
                                &db,
                                &format!(
                                    "chapters/{}/payments/{}",
                                    segment(chapter)?,
                                    segment(&existing.payment_id)?
                                ),
                            )
                            .await;
                        }
                        let chapter_doc: Chapter =
                            required(&db, &format!("chapters/{}", segment(chapter)?)).await?;
                        let division: DivisionDocument = required(
                            &db,
                            &division_path(chapter, event, &entry.entry.division_id)?,
                        )
                        .await?;
                        let quote = quote(&chapter_doc, &entry, &division)?;
                        if requested_amount == Some(0) {
                            return Err(invalid("Payment amount must be greater than zero"));
                        }
                        let amount = requested_amount.unwrap_or(quote.available_amount_minor);
                        if amount == 0 || amount > quote.available_amount_minor {
                            return Err(conflict("Payment amount exceeds available balance"));
                        }
                        let payment_id = new_id("pay");
                        let payment = PaymentRecord {
                            payment_id: payment_id.clone(),
                            chapter_id: chapter.into(),
                            entry_id: entry_id.into(),
                            payer_uid: claims.sub.clone(),
                            amount_minor: amount,
                            currency: quote.currency,
                            status: PaymentStatus::Pending,
                            provider_reference: reference.into(),
                            created_at: now_secs(),
                            settled_at: None,
                        };
                        entry.pending_minor = entry
                            .pending_minor
                            .checked_add(amount)
                            .ok_or_else(|| invalid("Reservation overflow"))?;
                        entry.entry.revision = entry
                            .entry
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Entry revision overflow"))?;
                        let pay_path =
                            format!("chapters/{}/payments/{}", segment(chapter)?, payment_id);
                        put(&db, tx, &entry_path(chapter, event, entry_id)?, &entry)?;
                        put(&db, tx, &pay_path, &payment)?;
                        put(
                            &db,
                            tx,
                            &format!(
                                "chapters/{}/paymentLocations/{}",
                                segment(chapter)?,
                                payment_id
                            ),
                            &PaymentLocation {
                                event_id: event.into(),
                                entry_id: entry_id.into(),
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &ref_path,
                            &PaymentReference {
                                payment_id: payment_id.clone(),
                                entry_id: entry_id.into(),
                                event_id: event.into(),
                                payer_uid: claims.sub.clone(),
                                amount_minor: amount,
                                reference: reference.into(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            chapter,
                            &claims.sub,
                            "payment_reference_requested",
                            &payment_id,
                            &payment_id,
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

    pub async fn reconcile_payment(
        &self,
        claims: &Claims,
        chapter: &str,
        payment_id: &str,
        approve: bool,
    ) -> Result<PaymentRecord> {
        self.payment_transition(
            claims,
            chapter,
            payment_id,
            if approve {
                PaymentStatus::Settled
            } else {
                PaymentStatus::Failed
            },
        )
        .await
    }
    pub async fn refund_payment(
        &self,
        claims: &Claims,
        chapter: &str,
        payment_id: &str,
    ) -> Result<PaymentRecord> {
        self.payment_transition(claims, chapter, payment_id, PaymentStatus::Refunded)
            .await
    }
    async fn payment_transition(
        &self,
        claims: &Claims,
        chapter: &str,
        payment_id: &str,
        target: PaymentStatus,
    ) -> Result<PaymentRecord> {
        let input = (claims.clone(), chapter.to_owned(), payment_id.to_owned());
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, payment_id) = input.clone();
                let target = target.clone();
                Box::pin(async move {
                    let claims = &claims;
                    let chapter = chapter.as_str();
                    let payment_id = payment_id.as_str();
                    async {
                        membership(&db, claims, chapter).await?;
                        if !matches!(claims.role.as_deref(), Some("finance" | "chapter_director")) {
                            return Err(forbidden());
                        }
                        let path = format!(
                            "chapters/{}/payments/{}",
                            segment(chapter)?,
                            segment(payment_id)?
                        );
                        let mut payment: PaymentRecord = required(&db, &path).await?;
                        if payment.chapter_id != chapter || payment.payment_id != payment_id {
                            return Err(forbidden());
                        }
                        let scope: PaymentLocation = required(
                            &db,
                            &format!(
                                "chapters/{}/paymentLocations/{}",
                                segment(chapter)?,
                                segment(payment_id)?
                            ),
                        )
                        .await?;
                        let mut entry = entry_access(
                            &db,
                            claims,
                            chapter,
                            &scope.event_id,
                            &scope.entry_id,
                            true,
                        )
                        .await?;
                        if payment.entry_id != entry.entry.id {
                            return Err(forbidden());
                        }
                        if payment.status == target {
                            return Ok(payment);
                        }
                        let mut division: DivisionDocument = required(
                            &db,
                            &division_path(chapter, &scope.event_id, &entry.entry.division_id)?,
                        )
                        .await?;
                        let before = readiness(&entry, &division)?.is_ready;
                        if target == PaymentStatus::Refunded {
                            if payment.status != PaymentStatus::Settled {
                                return Err(conflict("Only a settled payment may be refunded"));
                            }
                            entry.entry.paid_minor = entry
                                .entry
                                .paid_minor
                                .checked_sub(payment.amount_minor)
                                .ok_or_else(|| conflict("Paid ledger needs reconciliation"))?;
                        } else {
                            if payment.status != PaymentStatus::Pending {
                                return Err(conflict("Only a pending payment may be reconciled"));
                            }
                            entry.pending_minor = entry
                                .pending_minor
                                .checked_sub(payment.amount_minor)
                                .ok_or_else(|| {
                                    conflict("Reservation ledger needs reconciliation")
                                })?;
                            if target == PaymentStatus::Settled {
                                entry.entry.paid_minor = entry
                                    .entry
                                    .paid_minor
                                    .checked_add(payment.amount_minor)
                                    .ok_or_else(|| invalid("Paid amount overflow"))?;
                                payment.settled_at = Some(now_secs());
                            }
                        }
                        payment.status = target;
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
                        put(
                            &db,
                            tx,
                            &entry_path(chapter, &scope.event_id, &scope.entry_id)?,
                            &entry,
                        )?;
                        put(
                            &db,
                            tx,
                            &division_path(chapter, &scope.event_id, &entry.entry.division_id)?,
                            &division,
                        )?;
                        put(&db, tx, &path, &payment)?;
                        audit(
                            &db,
                            tx,
                            chapter,
                            &claims.sub,
                            if payment.status == PaymentStatus::Refunded {
                                "payment_refund_recorded"
                            } else {
                                "payment_reconciled"
                            },
                            payment_id,
                            &new_id("finance"),
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

    pub async fn finance_summary(&self, claims: &Claims, chapter: &str) -> Result<FinanceSummary> {
        membership(&self.db, claims, chapter).await?;
        if !matches!(claims.role.as_deref(), Some("finance" | "chapter_director")) {
            return Err(forbidden());
        }
        let chapter_doc: Chapter =
            required(&self.db, &format!("chapters/{}", segment(chapter)?)).await?;
        let parent = format!("chapters/{}", segment(chapter)?);
        let mut payments = Vec::new();
        let mut token = None;
        loop {
            let page = self
                .page::<PaymentRecord>(&parent, "payments", token, 100)
                .await?;
            payments.extend(page.items);
            token = page.next_page;
            if token.is_none() {
                break;
            }
        }

        let mut total_settled_minor = 0;
        let mut total_pending_minor = 0;
        let mut total_refunded_minor = 0;

        for p in &payments {
            match p.status {
                PaymentStatus::Settled => total_settled_minor += p.amount_minor,
                PaymentStatus::Pending => total_pending_minor += p.amount_minor,
                PaymentStatus::Refunded => total_refunded_minor += p.amount_minor,
                PaymentStatus::Failed => {}
            }
        }

        Ok(FinanceSummary {
            chapter_id: chapter.into(),
            total_settled_minor,
            total_pending_minor,
            total_refunded_minor,
            currency: chapter_doc.currency,
            transaction_count: payments.len(),
        })
    }

    pub async fn process_synthetic_webhook(
        &self,
        chapter_id: Option<&str>,
        payload: &SyntheticWebhookPayload,
    ) -> Result<WebhookReceipt> {
        if payload.status != "settled" {
            return Err(invalid("Unsupported synthetic webhook status"));
        }
        let payment_id = payload.payment_id.trim();
        if payment_id.is_empty() {
            return Err(invalid("Payment id required"));
        }
        // Payment IDs are chapter-scoped; never guess a chapter from a fixed list.
        let chapter = chapter_id
            .ok_or_else(|| invalid("Chapter scope required"))?
            .to_owned();
        segment(&chapter)?;

        let input = (chapter, payload.clone());
        self.db
            .run_transaction(|db, tx| {
                let (chapter, payload) = input.clone();
                Box::pin(async move {
                    let chapter = chapter.as_str();
                    let payment_id = payload.payment_id.as_str();
                    async {
                        let path = format!(
                            "chapters/{}/payments/{}",
                            segment(chapter)?,
                            segment(payment_id)?
                        );
                        let mut payment: PaymentRecord = required(&db, &path).await?;
                        if payment.chapter_id != chapter || payment.payment_id != payment_id {
                            return Err(missing());
                        }

                        if payload
                            .amount_minor
                            .is_some_and(|amount| amount != payment.amount_minor)
                        {
                            return Err(conflict("Synthetic payment amount mismatch"));
                        }
                        if payload.status == "settled" {
                            if payment.status == PaymentStatus::Settled {
                                return Ok(WebhookReceipt {
                                    received: true,
                                    payment,
                                });
                            }
                            if payment.status == PaymentStatus::Pending {
                                let loc: PaymentLocation = required(
                                    &db,
                                    &format!(
                                        "chapters/{}/paymentLocations/{}",
                                        segment(chapter)?,
                                        segment(payment_id)?
                                    ),
                                )
                                .await?;
                                if loc.entry_id != payment.entry_id {
                                    return Err(forbidden());
                                }
                                let mut entry: EntryDocument = required(
                                    &db,
                                    &entry_path(chapter, &loc.event_id, &loc.entry_id)?,
                                )
                                .await?;
                                if entry.entry.chapter_id != chapter
                                    || entry.entry.event_id != loc.event_id
                                    || entry.entry.id != loc.entry_id
                                {
                                    return Err(forbidden());
                                }
                                let mut division: DivisionDocument = required(
                                    &db,
                                    &division_path(
                                        chapter,
                                        &loc.event_id,
                                        &entry.entry.division_id,
                                    )?,
                                )
                                .await?;

                                let before = readiness(&entry, &division)?.is_ready;
                                entry.pending_minor = entry
                                    .pending_minor
                                    .checked_sub(payment.amount_minor)
                                    .ok_or_else(|| {
                                        conflict("Pending payment reservation is inconsistent")
                                    })?;
                                entry.entry.paid_minor = entry
                                    .entry
                                    .paid_minor
                                    .checked_add(payment.amount_minor)
                                    .ok_or_else(|| invalid("Paid amount overflow"))?;
                                payment.status = PaymentStatus::Settled;
                                payment.settled_at = Some(now_secs());
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

                                put(
                                    &db,
                                    tx,
                                    &entry_path(chapter, &loc.event_id, &loc.entry_id)?,
                                    &entry,
                                )?;
                                put(
                                    &db,
                                    tx,
                                    &division_path(
                                        chapter,
                                        &loc.event_id,
                                        &entry.entry.division_id,
                                    )?,
                                    &division,
                                )?;
                                put(&db, tx, &path, &payment)?;
                                audit(
                                    &db,
                                    tx,
                                    chapter,
                                    "synthetic_webhook",
                                    "payment_settled_via_webhook",
                                    payment_id,
                                    &new_id("hook"),
                                )?;
                                return Ok(WebhookReceipt {
                                    received: true,
                                    payment,
                                });
                            }
                        }

                        Err(conflict("Payment cannot be settled from its current state"))
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
