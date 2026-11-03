//! Local-only relationship requests; these never grant dependent access or consent authority.
use super::*;
use firestore::FirestoreQueryCursor;
use serde::Deserialize;

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct GuardianRequest {
    pub request_id: String,
    pub chapter_id: String,
    pub subject_uid: String,
    pub guardian_uid: String,
    pub status: String,
    pub revision: u64,
    pub created_at: u64,
    pub responded_at: Option<u64>,
}

#[derive(Clone, Serialize)]
pub struct GuardianRequestView {
    pub request_id: String,
    pub chapter_id: String,
    pub subject_uid: Option<String>,
    pub guardian_uid: Option<String>,
    pub status: String,
    pub revision: u64,
    pub created_at: u64,
    pub responded_at: Option<u64>,
    pub counterpart_available: bool,
}

fn request_view(
    value: GuardianRequest,
    viewer_uid: &str,
    counterpart_available: bool,
) -> GuardianRequestView {
    let viewer_is_subject = value.subject_uid == viewer_uid;
    GuardianRequestView {
        request_id: value.request_id,
        chapter_id: value.chapter_id,
        subject_uid: (viewer_is_subject || counterpart_available).then_some(value.subject_uid),
        guardian_uid: (!viewer_is_subject || counterpart_available).then_some(value.guardian_uid),
        status: value.status,
        revision: value.revision,
        created_at: value.created_at,
        responded_at: value.responded_at,
        counterpart_available,
    }
}

async fn counterpart_available(
    db: &FirestoreDb,
    chapter: &str,
    value: &GuardianRequest,
    viewer_uid: &str,
) -> Result<bool> {
    let (uid, role) = if value.subject_uid == viewer_uid {
        (&value.guardian_uid, "guardian")
    } else if value.guardian_uid == viewer_uid {
        (&value.subject_uid, "dancer")
    } else {
        return Err(forbidden());
    };
    match active_subject(db, chapter, uid, role).await {
        Ok(_) => Ok(true),
        Err(RepositoryError::Denied(_, _)) => Ok(false),
        Err(error) => Err(error),
    }
}

#[derive(Clone, Serialize, Deserialize)]
struct RequestReceipt {
    command_hash: String,
    response: GuardianRequest,
}

fn request_path(chapter: &str, request: &str) -> Result<String> {
    Ok(format!(
        "chapters/{}/guardianRequests/{}",
        segment(chapter)?,
        segment(request)?
    ))
}

async fn active_subject(
    db: &FirestoreDb,
    chapter: &str,
    uid: &str,
    role: &str,
) -> Result<Membership> {
    let value: Membership = required(
        db,
        &format!("chapters/{}/members/{}", segment(chapter)?, segment(uid)?),
    )
    .await?;
    if value.uid != uid
        || value.chapter_id != chapter
        || value.role != role
        || !value.active
        || value.expires_at.is_some_and(|expiry| expiry <= now_secs())
    {
        return Err(forbidden());
    }
    Ok(value)
}

impl FirestoreRepository {
    pub async fn guardian_request(
        &self,
        claims: &Claims,
        chapter: &str,
        request_id: &str,
    ) -> Result<GuardianRequestView> {
        segment(request_id)?;
        let input = (claims.clone(), chapter.to_owned(), request_id.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, request_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let request: GuardianRequest =
                            required(&db, &request_path(&chapter, &request_id)?).await?;
                        let owns = match claims.role.as_deref() {
                            Some("dancer") => request.subject_uid == claims.sub,
                            Some("guardian") => request.guardian_uid == claims.sub,
                            _ => false,
                        };
                        if !owns
                            || request.chapter_id != chapter
                            || request.request_id != request_id
                        {
                            return Err(missing());
                        }
                        let available =
                            counterpart_available(&db, &chapter, &request, &claims.sub).await?;
                        if !available
                            && !matches!(
                                request.status.as_str(),
                                "awaiting_guardian" | "awaiting_verification"
                            )
                        {
                            return Err(missing());
                        }
                        Ok(request_view(request, &claims.sub, available))
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn withdraw_guardian_request(
        &self,
        claims: &Claims,
        chapter: &str,
        request_id: &str,
        operation: &str,
        expected_revision: u64,
    ) -> Result<GuardianRequestView> {
        segment(operation)?;
        segment(request_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            request_id.to_owned(),
            operation.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, request_id, operation) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let path = request_path(&chapter, &request_id)?;
                        let mut request: GuardianRequest = required(&db, &path).await?;
                        let owns = match claims.role.as_deref() {
                            Some("dancer") => request.subject_uid == claims.sub,
                            Some("guardian") => request.guardian_uid == claims.sub,
                            _ => false,
                        };
                        if !owns
                            || request.chapter_id != chapter
                            || request.request_id != request_id
                        {
                            return Err(forbidden());
                        }
                        // Withdrawal must remain possible when the counterpart is inactive.
                        let op_path = format!(
                            "chapters/{}/guardianWithdrawalOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation])
                        );
                        let hash = key(&["withdraw", &request_id, &expected_revision.to_string()]);
                        if let Some(existing) = get::<RequestReceipt>(&db, &op_path).await? {
                            if existing.command_hash != hash {
                                return Err(conflict("Withdrawal operation already used"));
                            }
                            if existing.response.request_id != request_id || existing.response.chapter_id != chapter {
                                return Err(forbidden());
                            }
                            let available = counterpart_available(&db, &chapter, &existing.response, &claims.sub).await?;
                            return Ok(request_view(existing.response, &claims.sub, available));
                        }
                        if request.revision != expected_revision
                            || !matches!(
                                request.status.as_str(),
                                "awaiting_guardian" | "awaiting_verification"
                            )
                        {
                            return Err(conflict("Guardian request changed"));
                        }
                        request.status = "withdrawn".into();
                        request.revision = request
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| invalid("Request revision overflow"))?;
                        request.responded_at = Some(now_secs());
                        let (recipient, recipient_role) = if claims.sub == request.subject_uid {
                            (&request.guardian_uid, "guardian")
                        } else {
                            (&request.subject_uid, "dancer")
                        };
                        let available = match active_subject(&db, &chapter, recipient, recipient_role).await {
                            Ok(_) => { super::notifications::enqueue(
                                &db, tx, &chapter, recipient,
                                key(&["guardian-request-withdrawn", &request_id, &request.revision.to_string()]),
                                "guardian_request_updated", "Relationship request updated",
                                "A guardian relationship request was withdrawn. Open your relationship workspace for details.",
                                &super::notifications::destination(&["app", "dependents"], &[("chapter", &chapter), ("request", &request_id)])?,
                            ).await?; true },
                            Err(RepositoryError::Denied(_, _)) => false,
                            Err(error) => return Err(error),
                        };
                        put(&db, tx, &path, &request)?;
                        put(
                            &db,
                            tx,
                            &op_path,
                            &RequestReceipt {
                                command_hash: hash,
                                response: request.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "guardian_request_withdrawn",
                            &request_id,
                            &key(&["guardian-withdrawal", &claims.sub, &operation]),
                        )?;
                        Ok(request_view(request, &claims.sub, available))
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn guardian_requests(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<GuardianRequestView>> {
        if !(1..=100).contains(&limit)
            || cursor.as_ref().is_some_and(|value| {
                value.len() != 64 || !value.bytes().all(|byte| byte.is_ascii_hexdigit())
            })
        {
            return Err(invalid("Invalid guardian request page"));
        }
        let input = (claims.clone(), chapter.to_owned(), cursor);
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, cursor) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let field = match claims.role.as_deref() {
                            Some("dancer") => "subject_uid",
                            Some("guardian") => "guardian_uid",
                            _ => return Err(forbidden()),
                        };
                        let query = db
                            .fluent()
                            .select()
                            .from("guardianRequests")
                            .parent(format!(
                                "{}/chapters/{}",
                                db.get_documents_path(),
                                segment(&chapter)?
                            ))
                            .filter(|q| q.for_all([q.field(field).eq(&claims.sub)]))
                            .order(|order| order.fields([order.field("request_id").asc()]))
                            .limit((limit + 1) as u32);
                        let query = if let Some(cursor) = cursor.as_ref() {
                            query.start_at(FirestoreQueryCursor::AfterValue(vec![cursor
                                .clone()
                                .into()]))
                        } else {
                            query
                        };
                        let mut values: Vec<GuardianRequest> = query.obj().query().await?;
                        if values.iter().any(|value| {
                            value.chapter_id != chapter
                                || value.request_id.len() != 64
                                || !value
                                    .request_id
                                    .bytes()
                                    .all(|byte| byte.is_ascii_hexdigit())
                                || (field == "subject_uid" && value.subject_uid != claims.sub)
                                || (field == "guardian_uid" && value.guardian_uid != claims.sub)
                        }) || values
                            .windows(2)
                            .any(|pair| pair[0].request_id >= pair[1].request_id)
                        {
                            return Err(forbidden());
                        }
                        let has_more = values.len() > limit;
                        if has_more {
                            values.pop();
                        }
                        let next_page = if has_more {
                            values.last().map(|value| value.request_id.clone())
                        } else {
                            None
                        };
                        let mut visible = Vec::new();
                        for value in values {
                            let available =
                                counterpart_available(&db, &chapter, &value, &claims.sub).await?;
                            if available
                                || matches!(
                                    value.status.as_str(),
                                    "awaiting_guardian" | "awaiting_verification"
                                )
                            {
                                visible.push(request_view(value, &claims.sub, available));
                            }
                        }
                        Ok(Page {
                            items: visible,
                            next_page,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn request_guardian(
        &self,
        claims: &Claims,
        chapter: &str,
        operation: &str,
        guardian: &str,
    ) -> Result<GuardianRequest> {
        segment(operation)?;
        segment(guardian)?;
        if guardian == claims.sub {
            return Err(invalid("Invalid guardian account"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            operation.to_owned(),
            guardian.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, operation, guardian) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("dancer") {
                            return Err(forbidden());
                        }
                        let op_path = format!(
                            "chapters/{}/guardianRequestOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation])
                        );
                        let hash = key(&["create", &guardian]);
                        if let Some(existing) = get::<RequestReceipt>(&db, &op_path).await? {
                            if existing.command_hash != hash {
                                return Err(conflict("Request operation already used"));
                            }
                            return Ok(existing.response);
                        }
                        active_subject(&db, &chapter, &guardian, "guardian").await?;
                        let request_id = key(&["guardian-request", &claims.sub, &operation]);
                        let response = GuardianRequest {
                            request_id: request_id.clone(),
                            chapter_id: chapter.clone(),
                            subject_uid: claims.sub.clone(),
                            guardian_uid: guardian,
                            status: "awaiting_guardian".into(),
                            revision: 1,
                            created_at: now_secs(),
                            responded_at: None,
                        };
                        super::notifications::enqueue(
                            &db, tx, &chapter, &response.guardian_uid,
                            key(&["guardian-request-created", &request_id]),
                            "guardian_request_created", "Relationship request received",
                            "A guardian relationship request is waiting for your response. Open your relationship workspace to review it.",
                            &super::notifications::destination(&["app", "dependents"], &[("chapter", &chapter), ("request", &request_id)])?,
                        ).await?;
                        put(&db, tx, &request_path(&chapter, &request_id)?, &response)?;
                        put(
                            &db,
                            tx,
                            &op_path,
                            &RequestReceipt {
                                command_hash: hash,
                                response: response.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "guardian_request_created",
                            &request_id,
                            &key(&["guardian-request", &claims.sub, &operation]),
                        )?;
                        Ok(response)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn respond_guardian(
        &self,
        claims: &Claims,
        chapter: &str,
        request_id: &str,
        operation: &str,
        expected_revision: u64,
        decision: &str,
    ) -> Result<GuardianRequest> {
        segment(operation)?;
        segment(request_id)?;
        if !matches!(decision, "confirm" | "decline") {
            return Err(invalid("Invalid request response"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            request_id.to_owned(),
            operation.to_owned(),
            decision.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, request_id, operation, decision) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("guardian") {
                            return Err(forbidden());
                        }
                        let path = request_path(&chapter, &request_id)?;
                        let mut request: GuardianRequest = required(&db, &path).await?;
                        if request.chapter_id != chapter
                            || request.request_id != request_id
                            || request.guardian_uid != claims.sub
                        {
                            return Err(forbidden());
                        }
                        let op_path = format!(
                            "chapters/{}/guardianResponseOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation])
                        );
                        let hash = key(&[&request_id, &expected_revision.to_string(), &decision]);
                        if let Some(existing) = get::<RequestReceipt>(&db, &op_path).await? {
                            if existing.command_hash != hash {
                                return Err(conflict("Response operation already used"));
                            }
                            return Ok(existing.response);
                        }
                        active_subject(&db, &chapter, &request.subject_uid, "dancer").await?;
                        if request.revision != expected_revision
                            || request.status != "awaiting_guardian"
                        {
                            return Err(conflict("Guardian request changed"));
                        }
                        request.status = if decision == "confirm" {
                            "awaiting_verification"
                        } else {
                            "declined"
                        }
                        .into();
                        request.revision = request
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| invalid("Request revision overflow"))?;
                        request.responded_at = Some(now_secs());
                        super::notifications::enqueue(
                            &db, tx, &chapter, &request.subject_uid,
                            key(&["guardian-request-responded", &request_id, &request.revision.to_string()]),
                            "guardian_request_updated", "Relationship request updated",
                            "Your guardian relationship request has a response. Open your relationship workspace for details; verification may still be required.",
                            &super::notifications::destination(&["app", "dependents"], &[("chapter", &chapter), ("request", &request_id)])?,
                        ).await?;
                        put(&db, tx, &path, &request)?;
                        put(
                            &db,
                            tx,
                            &op_path,
                            &RequestReceipt {
                                command_hash: hash,
                                response: request.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "guardian_request_responded",
                            &request_id,
                            &key(&["guardian-response", &claims.sub, &operation]),
                        )?;
                        Ok(request)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
