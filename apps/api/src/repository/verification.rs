use super::*;
use crate::domain::{VerificationCase, VerificationPurpose, VerificationStatus};

#[derive(Clone, Serialize, serde::Deserialize)]
struct CreateIntent {
    purpose: VerificationPurpose,
    case_id: String,
}

#[derive(Clone, Serialize, serde::Deserialize)]
struct ReviewIntent {
    status: VerificationStatus,
    note: Option<String>,
    receipt: VerificationCase,
}

fn case_path(chapter: &str, case_id: &str) -> Result<String> {
    Ok(format!(
        "chapters/{}/verificationCases/{}",
        segment(chapter)?,
        segment(case_id)?
    ))
}

fn is_reviewer(claims: &Claims) -> bool {
    matches!(
        claims.role.as_deref(),
        Some("verifier" | "registrar" | "chapter_director")
    )
}

impl FirestoreRepository {
    pub async fn create_verification_case(
        &self,
        claims: &Claims,
        chapter: &str,
        purpose: VerificationPurpose,
        operation_id: &str,
    ) -> Result<VerificationCase> {
        segment(operation_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            purpose,
            operation_id.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, purpose, operation_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if !matches!(claims.role.as_deref(), Some("dancer" | "crew_manager")) {
                            return Err(forbidden());
                        }
                        let intent_path = format!(
                            "chapters/{}/verificationIntents/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation_id])
                        );
                        if let Some(intent) = get::<CreateIntent>(&db, &intent_path).await? {
                            if intent.purpose != purpose {
                                return Err(conflict("Verification creation payload changed"));
                            }
                            let existing: VerificationCase =
                                required(&db, &case_path(&chapter, &intent.case_id)?).await?;
                            if existing.chapter_id != chapter
                                || existing.dancer_uid != claims.sub
                                || existing.purpose != purpose
                            {
                                return Err(missing());
                            }
                            return Ok(existing);
                        }
                        let case_id = new_id("verify");
                        let value = VerificationCase {
                            case_id: case_id.clone(),
                            chapter_id: chapter.clone(),
                            dancer_uid: claims.sub.clone(),
                            purpose: purpose.clone(),
                            status: VerificationStatus::Uploading,
                            storage_path: format!(
                                "chapters/{chapter}/verification/{}/{case_id}/document",
                                segment(&claims.sub)?
                            ),
                            content_type: None,
                            size_bytes: None,
                            created_at: now_secs(),
                            submitted_at: None,
                            reviewed_at: None,
                            reviewer_uid: None,
                            reviewer_note: None,
                        };
                        put(&db, tx, &case_path(&chapter, &case_id)?, &value)?;
                        put(&db, tx, &intent_path, &CreateIntent { purpose, case_id })?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "verification_upload_started",
                            "verification_case",
                            &new_id("audit"),
                        )?;
                        Ok(value)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn verification_upload_case(
        &self,
        claims: &Claims,
        chapter: &str,
        case_id: &str,
    ) -> Result<VerificationCase> {
        let input = (claims.clone(), chapter.to_owned(), case_id.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, case_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let value: VerificationCase =
                            required(&db, &case_path(&chapter, &case_id)?).await?;
                        if value.case_id != case_id
                            || value.chapter_id != chapter
                            || value.dancer_uid != claims.sub
                            || !matches!(
                                value.status,
                                VerificationStatus::Uploading | VerificationStatus::Pending
                            )
                        {
                            return Err(missing());
                        }
                        Ok(value)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn verification_review_case(
        &self,
        claims: &Claims,
        chapter: &str,
        case_id: &str,
    ) -> Result<VerificationCase> {
        let input = (claims.clone(), chapter.to_owned(), case_id.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, case_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if !is_reviewer(&claims) {
                            return Err(forbidden());
                        }
                        let value: VerificationCase =
                            required(&db, &case_path(&chapter, &case_id)?).await?;
                        if value.case_id != case_id
                            || value.chapter_id != chapter
                            || !matches!(
                                value.status,
                                VerificationStatus::Pending
                                    | VerificationStatus::Approved
                                    | VerificationStatus::NeedsCorrection
                            )
                        {
                            return Err(missing());
                        }
                        Ok(value)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn submit_verification_case(
        &self,
        claims: &Claims,
        chapter: &str,
        case_id: &str,
        content_type: &str,
        size_bytes: u64,
    ) -> Result<VerificationCase> {
        if !matches!(content_type, "application/pdf" | "image/jpeg" | "image/png")
            || size_bytes == 0
            || size_bytes > 10 * 1024 * 1024
        {
            return Err(invalid("Unsupported or oversized verification document"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            case_id.to_owned(),
            content_type.to_owned(),
            size_bytes,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, case_id, content_type, size_bytes) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let mut value: VerificationCase =
                            required(&db, &case_path(&chapter, &case_id)?).await?;
                        if value.case_id != case_id
                            || value.chapter_id != chapter
                            || value.dancer_uid != claims.sub
                        {
                            return Err(missing());
                        }
                        if value.status == VerificationStatus::Pending
                            && value.content_type.as_deref() == Some(&content_type)
                            && value.size_bytes == Some(size_bytes)
                        {
                            return Ok(value);
                        }
                        if value.status != VerificationStatus::Uploading {
                            return Err(conflict("Verification submission is no longer editable"));
                        }
                        value.status = VerificationStatus::Pending;
                        value.content_type = Some(content_type);
                        value.size_bytes = Some(size_bytes);
                        value.submitted_at = Some(now_secs());
                        put(&db, tx, &case_path(&chapter, &case_id)?, &value)?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "verification_submitted",
                            "verification_case",
                            &new_id("audit"),
                        )?;
                        Ok(value)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn verification_cases(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<VerificationCase>> {
        let input = (claims.clone(), chapter.to_owned(), cursor);
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, cursor) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if !is_reviewer(&claims)
                            && !matches!(claims.role.as_deref(), Some("dancer" | "crew_manager"))
                        {
                            return Err(forbidden());
                        }
                        let mut result = super::reads::page::<VerificationCase>(
                            &db,
                            &format!("chapters/{}", segment(&chapter)?),
                            "verificationCases",
                            cursor,
                            limit,
                        )
                        .await?;
                        result.items.retain(|value| {
                            value.chapter_id == chapter
                                && (is_reviewer(&claims) || value.dancer_uid == claims.sub)
                        });
                        Ok(result)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn review_verification_case(
        &self,
        claims: &Claims,
        chapter: &str,
        case_id: &str,
        status: VerificationStatus,
        note: Option<String>,
        operation_id: &str,
    ) -> Result<VerificationCase> {
        segment(operation_id)?;
        if !matches!(
            status,
            VerificationStatus::Approved | VerificationStatus::NeedsCorrection
        ) {
            return Err(invalid("Invalid verification review state"));
        }
        let note = note.map(|value| value.trim().to_owned());
        if note.as_ref().is_some_and(|value| {
            value.len() > 500
                || value
                    .chars()
                    .any(|c| c.is_control() && !matches!(c, '\n' | '\t'))
        }) {
            return Err(invalid("Invalid review note"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            case_id.to_owned(),
            status,
            note,
            operation_id.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, case_id, status, note, operation_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if !is_reviewer(&claims) {
                            return Err(forbidden());
                        }
                        let mut value: VerificationCase =
                            required(&db, &case_path(&chapter, &case_id)?).await?;
                        if value.case_id != case_id || value.chapter_id != chapter {
                            return Err(missing());
                        }
                        let intent_path = format!(
                            "{}/reviewIntents/{}",
                            case_path(&chapter, &case_id)?,
                            key(&[&claims.sub, &operation_id])
                        );
                        if let Some(intent) = get::<ReviewIntent>(&db, &intent_path).await? {
                            if intent.status != status || intent.note != note {
                                return Err(conflict("Verification review payload changed"));
                            }
                            return Ok(intent.receipt);
                        }
                        if value.status != VerificationStatus::Pending {
                            return Err(conflict("Only submitted verification can be reviewed"));
                        }
                        value.status = status.clone();
                        value.reviewed_at = Some(now_secs());
                        value.reviewer_uid = Some(claims.sub.clone());
                        value.reviewer_note = note.clone();
                        put(&db, tx, &case_path(&chapter, &case_id)?, &value)?;
                        put(
                            &db,
                            tx,
                            &intent_path,
                            &ReviewIntent {
                                status,
                                note,
                                receipt: value.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "verification_reviewed",
                            "verification_case",
                            &new_id("audit"),
                        )?;
                        Ok(value)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
