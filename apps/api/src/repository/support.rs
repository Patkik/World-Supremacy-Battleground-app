use super::*;
use crate::inquiries::*;

#[derive(Clone)]
pub enum InquiryActor {
    Member(Claims),
    Contact(String),
    GlobalHQ(Claims),
}
#[derive(Serialize)]
pub struct InquiryThread {
    pub inquiry: InquirySummary,
    pub messages: Page<InquiryMessage>,
}
#[derive(Clone, Serialize, serde::Deserialize)]
struct InquiryIntent {
    fingerprint: String,
    receipt: InquirySummary,
}
#[derive(Clone, Serialize, serde::Deserialize)]
struct Quota {
    count: u32,
}
#[derive(Clone, Serialize, serde::Deserialize)]
pub struct GlobalApplicationIndex {
    pub id: String,
    pub chapter_id: String,
    pub category: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub revision: u64,
}

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
pub struct ApplicationIndexBackfillSummary {
    pub scanned: u64,
    pub inserted: u64,
    pub refreshed: u64,
    pub unchanged: u64,
}

#[derive(Clone, Copy)]
enum IndexBackfillOutcome {
    Inserted,
    Refreshed,
    Unchanged,
    NotApplication,
}
fn path(chapter: &str, id: &str) -> Result<String> {
    Ok(format!(
        "chapters/{}/inquiries/{}",
        segment(chapter)?,
        segment(id)?
    ))
}
fn text(value: &str, max: usize, required: bool) -> Result<String> {
    let value = value.trim();
    if value.len() > max
        || required && value.is_empty()
        || value
            .chars()
            .any(|c| c.is_control() && !matches!(c, '\n' | '\t'))
    {
        return Err(invalid("Invalid inquiry text"));
    }
    Ok(value.into())
}
fn secret(value: &str) -> Result<()> {
    if value.len() != 64 || !value.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(missing());
    }
    Ok(())
}
fn is_staff(claims: &Claims) -> bool {
    matches!(claims.role.as_deref(), Some("support" | "chapter_director"))
}
fn actor_key(actor: &InquiryActor) -> Result<String> {
    match actor {
        InquiryActor::Member(c) => Ok(format!("member:{}", c.sub)),
        InquiryActor::GlobalHQ(c) => Ok(format!("global-hq:{}", c.sub)),
        InquiryActor::Contact(key) => {
            secret(key)?;
            Ok(format!("contact:{}", super::key(&[key])))
        }
    }
}
fn is_application(category: &str) -> bool {
    matches!(
        category,
        "chapter_application" | "studio_application" | "partner_application"
    )
}
async fn authority(
    db: &FirestoreDb,
    chapter: &str,
    actor: &InquiryActor,
    record: &Inquiry,
) -> Result<bool> {
    if record.summary.chapter_id != chapter {
        return Err(missing());
    }
    match actor {
        InquiryActor::Member(claims) => {
            membership(db, claims, chapter).await?;
            if is_staff(claims) {
                Ok(true)
            } else if record.requester_uid.as_deref() == Some(&claims.sub) {
                Ok(false)
            } else {
                Err(forbidden())
            }
        }
        InquiryActor::Contact(token) => {
            secret(token)?;
            if record.requester_uid.is_none()
                && record.capability_hash.as_deref()
                    == Some(&key(&[chapter, &record.summary.id, token]))
            {
                Ok(false)
            } else {
                Err(missing())
            }
        }
        InquiryActor::GlobalHQ(claims) => {
            super::hq::global_membership(db, claims).await?;
            if is_application(&record.summary.category) {
                Ok(true)
            } else {
                Err(forbidden())
            }
        }
    }
}
async fn quota(
    db: &FirestoreDb,
    chapter: &str,
    bucket: &str,
    maximum: u32,
) -> Result<(String, Quota)> {
    let path = format!(
        "chapters/{}/inquiryQuotas/{}",
        segment(chapter)?,
        key(&[bucket, &(now_secs() / 3600).to_string()])
    );
    let mut quota = get::<Quota>(db, &path).await?.unwrap_or(Quota { count: 0 });
    if quota.count >= maximum {
        return Err(deny(
            StatusCode::TOO_MANY_REQUESTS,
            "Inquiry limit reached; try again later",
        ));
    }
    quota.count += 1;
    Ok((path, quota))
}
impl FirestoreRepository {
    /// Rebuilds the metadata-only Global HQ proposal index from chapter inquiry
    /// records. The caller is an offline migration command; connect() restricts
    /// this repository to the demo project and an explicit Firestore emulator.
    pub async fn backfill_global_application_indexes(
        &self,
    ) -> Result<ApplicationIndexBackfillSummary> {
        let mut summary = ApplicationIndexBackfillSummary::default();
        let mut chapter_cursor = None;
        loop {
            let chapters = self
                .page::<Chapter>("", "chapters", chapter_cursor, 100)
                .await?;
            for chapter in chapters.items {
                segment(&chapter.id)?;
                let parent = format!("chapters/{}", segment(&chapter.id)?);
                let mut inquiry_cursor = None;
                loop {
                    let inquiries = self
                        .page::<Inquiry>(&parent, "inquiries", inquiry_cursor, 100)
                        .await?;
                    for inquiry in inquiries.items {
                        if !is_application(&inquiry.summary.category) {
                            continue;
                        }
                        summary.scanned = summary
                            .scanned
                            .checked_add(1)
                            .ok_or_else(|| invalid("Backfill count overflow"))?;
                        segment(&inquiry.summary.id)?;
                        if inquiry.summary.chapter_id != chapter.id {
                            return Err(forbidden());
                        }
                        match self
                            .backfill_application_index(&chapter.id, &inquiry.summary.id)
                            .await?
                        {
                            IndexBackfillOutcome::Inserted => summary.inserted += 1,
                            IndexBackfillOutcome::Refreshed => summary.refreshed += 1,
                            IndexBackfillOutcome::Unchanged => summary.unchanged += 1,
                            IndexBackfillOutcome::NotApplication => {
                                return Err(conflict(
                                    "Application category changed during index backfill",
                                ));
                            }
                        }
                    }
                    inquiry_cursor = inquiries.next_page;
                    if inquiry_cursor.is_none() {
                        break;
                    }
                }
            }
            chapter_cursor = chapters.next_page;
            if chapter_cursor.is_none() {
                break;
            }
        }
        Ok(summary)
    }

    async fn backfill_application_index(
        &self,
        chapter: &str,
        id: &str,
    ) -> Result<IndexBackfillOutcome> {
        let chapter = chapter.to_owned();
        let id = id.to_owned();
        self.db
            .run_transaction(|db, tx| {
                let (chapter, id) = (chapter.clone(), id.clone());
                Box::pin(async move {
                    async {
                        let record: Inquiry = required(&db, &path(&chapter, &id)?).await?;
                        if record.summary.id != id || record.summary.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        if !is_application(&record.summary.category) {
                            return Ok(IndexBackfillOutcome::NotApplication);
                        }
                        let index_path = format!("globalApplications/{}", segment(&id)?);
                        let expected = GlobalApplicationIndex {
                            id: id.clone(),
                            chapter_id: chapter.clone(),
                            category: record.summary.category.clone(),
                            created_at: record.summary.created_at,
                            updated_at: record.summary.updated_at,
                            revision: record.summary.revision,
                        };
                        let existing = get::<GlobalApplicationIndex>(&db, &index_path).await?;
                        if let Some(existing) = &existing {
                            if existing.id != id
                                || existing.chapter_id != chapter
                                || !is_application(&existing.category)
                            {
                                return Err(conflict(
                                    "Global application index belongs to another inquiry",
                                ));
                            }
                            if existing.category == expected.category
                                && existing.created_at == expected.created_at
                                && existing.updated_at == expected.updated_at
                                && existing.revision == expected.revision
                            {
                                return Ok(IndexBackfillOutcome::Unchanged);
                            }
                        }
                        put(&db, tx, &index_path, &expected)?;
                        Ok(if existing.is_some() {
                            IndexBackfillOutcome::Refreshed
                        } else {
                            IndexBackfillOutcome::Inserted
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn contact_chapters(
        &self,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<crate::domain::Chapter>> {
        if cursor.as_ref().is_some_and(|v| v.len() > 4096) {
            return Err(invalid("Invalid cursor"));
        }
        // The typed Chapter projection contains no credentials, memberships or keys.
        self.page("", "chapters", cursor, limit).await
    }
    pub async fn create_inquiry(
        &self,
        chapter: &str,
        actor: InquiryActor,
        body: CreateInquiry,
    ) -> Result<InquirySummary> {
        if matches!(&actor, InquiryActor::GlobalHQ(_)) {
            return Err(forbidden());
        }
        segment(&body.operation_id)?;
        let input = (chapter.to_owned(), actor, body);
        self.db
            .run_transaction(|db, tx| {
                let (chapter, actor, body) = input.clone();
                Box::pin(async move {
                    async {
                        let chapter_doc: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        if chapter_doc.id != chapter {
                            return Err(missing());
                        }
                        if let InquiryActor::Member(claims) = &actor {
                            membership(&db, claims, &chapter).await?;
                        }
                        let actor_key = actor_key(&actor)?;
                        let intent = format!(
                            "chapters/{}/inquiryIntents/{}",
                            segment(&chapter)?,
                            key(&[&actor_key, &body.operation_id])
                        );
                        let fingerprint = key(&[&serde_json::to_string(&body)
                            .map_err(|_| invalid("Invalid request"))?]);
                        if let Some(existing) = get::<InquiryIntent>(&db, &intent).await? {
                            if existing.fingerprint != fingerprint {
                                return Err(conflict("Inquiry operation payload changed"));
                            }
                            return Ok(existing.receipt);
                        }
                        let name = text(&body.requester_name, 100, true)?;
                        let email = text(&body.email, 254, true)?;
                        if email.chars().any(char::is_whitespace)
                            || email.matches('@').count() != 1
                            || email.starts_with('@')
                            || email.ends_with('@')
                        {
                            return Err(invalid("Invalid contact email"));
                        }
                        if ![
                            "general",
                            "account",
                            "registration",
                            "payment",
                            "music",
                            "consent",
                            "chapter_application",
                            "studio_application",
                            "partner_application",
                        ]
                        .contains(&body.category.as_str())
                        {
                            return Err(invalid("Invalid inquiry category"));
                        }
                        let subject = text(&body.subject, 120, true)?;
                        let message = text(&body.message, 4000, true)?;
                        let actor_bucket = match &actor {
                            InquiryActor::Member(c) => format!("member:{}", c.sub),
                            InquiryActor::GlobalHQ(c) => format!("global-hq:{}", c.sub),
                            InquiryActor::Contact(_) => {
                                format!("email:{}", key(&[&email.to_lowercase()]))
                            }
                        };
                        let (actor_quota, quota_value) =
                            quota(&db, &chapter, &actor_bucket, 5).await?;
                        let (global_quota, global_value) =
                            quota(&db, &chapter, "all-contact-requests", 1000).await?;
                        let id = new_id("inquiry");
                        let now = now_secs();
                        let summary = InquirySummary {
                            id: id.clone(),
                            chapter_id: chapter.clone(),
                            subject,
                            category: body.category,
                            status: InquiryStatus::Open,
                            revision: 1,
                            created_at: now,
                            updated_at: now,
                        };
                        let (owner, capability_hash) = match &actor {
                            InquiryActor::Member(c) => (Some(c.sub.clone()), None),
                            InquiryActor::GlobalHQ(_) => return Err(forbidden()),
                            InquiryActor::Contact(token) => {
                                (None, Some(key(&[&chapter, &id, token])))
                            }
                        };
                        let record = Inquiry {
                            summary: summary.clone(),
                            requester_uid: owner,
                            requester_name: name,
                            email,
                            capability_hash,
                        };
                        let message = InquiryMessage {
                            sequence: 1,
                            source: "requester".into(),
                            body: message,
                            status: InquiryStatus::Open,
                            created_at: now,
                        };
                        put(&db, tx, &path(&chapter, &id)?, &record)?;
                        put(
                            &db,
                            tx,
                            &format!("{}/messages/{:020}", path(&chapter, &id)?, 1),
                            &message,
                        )?;
                        if is_application(&summary.category) {
                            put(
                                &db,
                                tx,
                                &format!("globalApplications/{}", segment(&id)?),
                                &GlobalApplicationIndex {
                                    id: id.clone(),
                                    chapter_id: chapter.clone(),
                                    category: summary.category.clone(),
                                    created_at: now,
                                    updated_at: now,
                                    revision: summary.revision,
                                },
                            )?;
                        }
                        put(
                            &db,
                            tx,
                            &intent,
                            &InquiryIntent {
                                fingerprint,
                                receipt: summary.clone(),
                            },
                        )?;
                        put(&db, tx, &actor_quota, &quota_value)?;
                        put(&db, tx, &global_quota, &global_value)?;
                        let audit_actor = match &actor {
                            InquiryActor::Member(c) => c.sub.as_str(),
                            InquiryActor::GlobalHQ(c) => c.sub.as_str(),
                            InquiryActor::Contact(_) => "public-contact",
                        };
                        audit(
                            &db,
                            tx,
                            &chapter,
                            audit_actor,
                            "inquiry_created",
                            &id,
                            &key(&["inquiry-created", &id]),
                        )?;
                        Ok(summary)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
    pub async fn inquiry_thread(
        &self,
        chapter: &str,
        id: &str,
        actor: InquiryActor,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<InquiryThread> {
        let input = (chapter.to_owned(), id.to_owned(), actor, cursor);
        self.db
            .run_transaction(|db, _tx| {
                let (chapter, id, actor, cursor) = input.clone();
                Box::pin(async move {
                    async {
                        let record: Inquiry = required(&db, &path(&chapter, &id)?).await?;
                        authority(&db, &chapter, &actor, &record).await?;
                        if record.summary.id != id {
                            return Err(missing());
                        }
                        let messages = super::reads::page(
                            &db,
                            &path(&chapter, &id)?,
                            "messages",
                            cursor,
                            limit,
                        )
                        .await?;
                        Ok(InquiryThread {
                            inquiry: record.summary,
                            messages,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
    pub async fn list_inquiries(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<InquiryStaffView>> {
        let input = (claims.clone(), chapter.to_owned(), cursor);
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, cursor) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let values = super::reads::page::<Inquiry>(
                            &db,
                            &format!("chapters/{}", segment(&chapter)?),
                            "inquiries",
                            cursor,
                            limit,
                        )
                        .await?;
                        let items = values
                            .items
                            .into_iter()
                            .filter(|v| {
                                v.summary.chapter_id == chapter
                                    && (is_staff(&claims)
                                        || v.requester_uid.as_deref() == Some(&claims.sub))
                            })
                            .map(|v| InquiryStaffView {
                                summary: v.summary,
                                requester_name: v.requester_name,
                                email: v.email,
                            })
                            .collect();
                        Ok(Page {
                            items,
                            next_page: values.next_page,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn list_hq_applications(
        &self,
        claims: &Claims,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<InquiryStaffView>> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        let input = (claims.clone(), cursor);
        self.db
            .run_transaction(|db, _tx| {
                let (claims, cursor) = input.clone();
                Box::pin(async move {
                    async {
                        super::hq::global_membership(&db, &claims).await?;
                        let indexes = super::reads::page::<GlobalApplicationIndex>(
                            &db,
                            "",
                            "globalApplications",
                            cursor,
                            limit,
                        )
                        .await?;
                        let mut items = Vec::with_capacity(indexes.items.len());
                        for index in indexes.items {
                            if !is_application(&index.category)
                                || segment(&index.id).is_err()
                                || segment(&index.chapter_id).is_err()
                            {
                                return Err(forbidden());
                            }
                            let record: Inquiry =
                                required(&db, &path(&index.chapter_id, &index.id)?).await?;
                            if record.summary.id != index.id
                                || record.summary.chapter_id != index.chapter_id
                                || record.summary.category != index.category
                            {
                                return Err(forbidden());
                            }
                            items.push(InquiryStaffView {
                                summary: record.summary,
                                requester_name: record.requester_name,
                                email: record.email,
                            });
                        }
                        Ok(Page {
                            items,
                            next_page: indexes.next_page,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn hq_application_thread(
        &self,
        claims: &Claims,
        id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<InquiryThread> {
        segment(id)?;
        super::hq::global_membership(&self.db, claims).await?;
        let index: GlobalApplicationIndex =
            required(&self.db, &format!("globalApplications/{}", segment(id)?)).await?;
        if index.id != id || !is_application(&index.category) {
            return Err(missing());
        }
        self.inquiry_thread(
            &index.chapter_id,
            id,
            InquiryActor::GlobalHQ(claims.clone()),
            cursor,
            limit,
        )
        .await
    }

    pub async fn update_hq_application(
        &self,
        claims: &Claims,
        id: &str,
        body: InquiryUpdate,
    ) -> Result<InquirySummary> {
        segment(id)?;
        super::hq::global_membership(&self.db, claims).await?;
        let index: GlobalApplicationIndex =
            required(&self.db, &format!("globalApplications/{}", segment(id)?)).await?;
        if index.id != id || !is_application(&index.category) {
            return Err(missing());
        }
        self.update_inquiry(
            &index.chapter_id,
            id,
            InquiryActor::GlobalHQ(claims.clone()),
            body,
        )
        .await
    }
    pub async fn update_inquiry(
        &self,
        chapter: &str,
        id: &str,
        actor: InquiryActor,
        body: InquiryUpdate,
    ) -> Result<InquirySummary> {
        segment(&body.operation_id)?;
        let input = (chapter.to_owned(), id.to_owned(), actor, body);
        self.db
            .run_transaction(|db, tx| {
                let (chapter, id, actor, body) = input.clone();
                Box::pin(async move {
                    async {
                        let mut record: Inquiry = required(&db, &path(&chapter, &id)?).await?;
                        let staff = authority(&db, &chapter, &actor, &record).await?;
                        if record.summary.id != id {
                            return Err(missing());
                        }
                        if !staff && body.status.is_some() {
                            return Err(forbidden());
                        }
                        let intent = format!(
                            "{}/operations/{}",
                            path(&chapter, &id)?,
                            key(&[&actor_key(&actor)?, &body.operation_id])
                        );
                        let fingerprint = key(&[&serde_json::to_string(&body)
                            .map_err(|_| invalid("Invalid inquiry update"))?]);
                        if let Some(existing) = get::<InquiryIntent>(&db, &intent).await? {
                            if existing.fingerprint != fingerprint {
                                return Err(conflict("Inquiry update payload changed"));
                            }
                            return Ok(existing.receipt);
                        }
                        if record.summary.revision != body.expected_revision {
                            return Err(conflict("Inquiry changed; reload before replying"));
                        }
                        let message = text(&body.message, 4000, !staff || body.status.is_none())?;
                        let application_index = if is_application(&record.summary.category) {
                            let index: GlobalApplicationIndex =
                                required(&db, &format!("globalApplications/{}", segment(&id)?))
                                    .await?;
                            if index.id != id
                                || index.chapter_id != chapter
                                || index.category != record.summary.category
                                || index.revision != record.summary.revision
                            {
                                return Err(conflict("Application index is out of date"));
                            }
                            Some(index)
                        } else {
                            None
                        };
                        record.summary.status = if staff {
                            body.status.unwrap_or(record.summary.status)
                        } else {
                            InquiryStatus::Open
                        };
                        record.summary.revision = record
                            .summary
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Inquiry revision overflow"))?;
                        record.summary.updated_at = now_secs();
                        let row = InquiryMessage {
                            sequence: record.summary.revision,
                            source: if matches!(&actor, InquiryActor::GlobalHQ(_)) {
                                "global_hq"
                            } else if staff {
                                "chapter_support"
                            } else {
                                "requester"
                            }
                            .into(),
                            body: message,
                            status: record.summary.status.clone(),
                            created_at: record.summary.updated_at,
                        };
                        if staff {
                            if let Some(requester_uid) = record.requester_uid.as_deref() {
                                let same_actor = matches!(&actor, InquiryActor::Member(claims) | InquiryActor::GlobalHQ(claims) if claims.sub == requester_uid);
                                if !same_actor {
                                    let href = super::notifications::destination(
                                        &["app", "support"],
                                        &[("chapter", &chapter), ("inquiry", &id)],
                                    )?;
                                    super::notifications::enqueue(
                                        &db,
                                        tx,
                                        &chapter,
                                        requester_uid,
                                        key(&["inquiry-update", &id, &row.sequence.to_string()]),
                                        "support_updated",
                                        "Support request updated",
                                        "Your support request has an update. Open account support to view it.",
                                        &href,
                                    )
                                    .await?;
                                }
                            }
                        }
                        put(
                            &db,
                            tx,
                            &format!("{}/messages/{:020}", path(&chapter, &id)?, row.sequence),
                            &row,
                        )?;
                        put(&db, tx, &path(&chapter, &id)?, &record)?;
                        if let Some(mut index) = application_index {
                            index.updated_at = record.summary.updated_at;
                            index.revision = record.summary.revision;
                            put(
                                &db,
                                tx,
                                &format!("globalApplications/{}", segment(&id)?),
                                &index,
                            )?;
                        }
                        put(
                            &db,
                            tx,
                            &intent,
                            &InquiryIntent {
                                fingerprint,
                                receipt: record.summary.clone(),
                            },
                        )?;
                        let audit_actor = match &actor {
                            InquiryActor::Member(c) => c.sub.as_str(),
                            InquiryActor::GlobalHQ(c) => c.sub.as_str(),
                            InquiryActor::Contact(_) => "public-contact",
                        };
                        audit(
                            &db,
                            tx,
                            &chapter,
                            audit_actor,
                            "inquiry_updated",
                            &id,
                            &key(&["inquiry-update", &id, &row.sequence.to_string()]),
                        )?;
                        Ok(record.summary)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
