use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NotificationRecord {
    pub id: String,
    pub chapter_id: String,
    pub recipient_uid: String,
    pub kind: String,
    pub title: String,
    pub message: String,
    pub href: String,
    pub created_at: u64,
    pub read_at: Option<u64>,
    pub revision: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPage {
    pub items: Vec<NotificationRecord>,
    pub next_page: Option<String>,
    pub unread_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NotificationReadResult {
    pub notification: NotificationRecord,
    pub unread_count: u64,
}

pub(super) struct NotificationRequest {
    pub recipient_uid: String,
    pub id: String,
    pub kind: String,
    pub title: String,
    pub message: String,
    pub href: String,
}

pub(super) fn destination(segments: &[&str], query: &[(&str, &str)]) -> Result<String> {
    let mut url = reqwest::Url::parse("https://wsb.invalid/")
        .map_err(|_| invalid("Invalid notification destination"))?;
    {
        let mut path = url
            .path_segments_mut()
            .map_err(|_| invalid("Invalid notification destination"))?;
        path.clear();
        for value in segments {
            path.push(segment(value)?);
        }
    }
    if !query.is_empty() {
        let mut pairs = url.query_pairs_mut();
        for (name, value) in query {
            pairs.append_pair(name, segment(value)?);
        }
    }
    Ok(match url.query() {
        Some(query) => format!("{}?{}", url.path(), query),
        None => url.path().to_owned(),
    })
}

fn safe_notification_href(value: &str) -> bool {
    if value.is_empty()
        || value.len() > 4096
        || !value.starts_with('/')
        || value.starts_with("//")
        || value
            .bytes()
            .any(|byte| byte == b'\\' || byte.is_ascii_control())
    {
        return false;
    }
    reqwest::Url::parse("https://wsb.invalid/")
        .and_then(|base| base.join(value))
        .is_ok_and(|url| {
            url.scheme() == "https"
                && url.host_str() == Some("wsb.invalid")
                && url.port().is_none()
                && url.username().is_empty()
                && url.password().is_none()
                && url.path().starts_with('/')
        })
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct NotificationSummary {
    chapter_id: String,
    recipient_uid: String,
    unread_count: u64,
    revision: u64,
    updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RosterNoticeJob {
    id: String,
    chapter_id: String,
    event_id: String,
    entry_id: String,
    recipients: Vec<String>,
    next: usize,
    notice_id: String,
    kind: String,
    title: String,
    message: String,
    href: String,
    #[serde(default)]
    failures: u64,
    #[serde(default)]
    last_failed_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PublicationNoticeJob {
    id: String,
    chapter_id: String,
    event_id: String,
    division_id: String,
    publication_id: String,
    next: usize,
    #[serde(default)]
    failures: u64,
    #[serde(default)]
    last_failed_at: Option<u64>,
}

trait QueueFailure {
    fn in_cooldown(&self) -> bool;
}

macro_rules! impl_queue_failure {
    ($kind:ty) => {
        impl QueueFailure for $kind {
            fn in_cooldown(&self) -> bool {
                self.last_failed_at
                    .is_some_and(|time| now_secs().saturating_sub(time) < 30)
            }
        }
    };
}
impl_queue_failure!(RosterNoticeJob);
impl_queue_failure!(PublicationNoticeJob);

#[derive(Serialize)]
pub struct QueueSample {
    pub pending_sampled: usize,
    pub failed_sampled: usize,
    pub unreadable_sampled: usize,
    pub has_more: bool,
}

#[derive(Serialize)]
pub struct NotificationQueueHealth {
    pub roster: QueueSample,
    pub publication: QueueSample,
    pub checked_at: u64,
}

#[derive(Deserialize)]
struct FailureSample {
    #[serde(default)]
    failures: u64,
}

#[derive(Serialize)]
struct QueueFailureMarker {
    failures: u64,
    last_failed_at: Option<u64>,
}

struct ScanFields {
    next: Option<usize>,
    last_failed_at: Option<u64>,
}

struct ScannedJob {
    id: String,
    fields: Option<ScanFields>,
}

async fn scan_queue(
    db: &FirestoreDb,
    collection: &str,
    cursor: Option<String>,
) -> Result<Page<ScannedJob>> {
    let builder = db
        .fluent()
        .list()
        .fields(["next", "last_failed_at", "failures"])
        .from(collection)
        .parent(db.get_documents_path().clone())
        .page_size(20);
    let builder = if let Some(cursor) = cursor {
        builder.page_token(cursor)
    } else {
        builder
    };
    let page = builder.get_page().await?;
    let mut items = Vec::with_capacity(page.documents.len());
    for document in &page.documents {
        let Some(id) = document.name.rsplit('/').next() else {
            continue;
        };
        if id.len() != 64 || !id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            tracing::warn!("Notification queue contains a document with an invalid identifier");
            continue;
        }
        items.push(ScannedJob {
            id: id.to_owned(),
            fields: FirestoreDb::deserialize_doc_to::<serde_json::Value>(document)
                .ok()
                .map(|value| ScanFields {
                    next: value
                        .get("next")
                        .and_then(serde_json::Value::as_u64)
                        .and_then(|next| usize::try_from(next).ok()),
                    last_failed_at: value
                        .get("last_failed_at")
                        .and_then(serde_json::Value::as_u64),
                }),
        });
    }
    Ok(Page {
        items,
        next_page: page.page_token,
    })
}

async fn sample_queue(db: &FirestoreDb, collection: &str) -> Result<QueueSample> {
    let page = db
        .fluent()
        .list()
        .fields(["failures"])
        .from(collection)
        .parent(db.get_documents_path().clone())
        .page_size(100)
        .get_page()
        .await?;
    let mut failed_sampled = 0;
    let mut unreadable_sampled = 0;
    for document in &page.documents {
        match FirestoreDb::deserialize_doc_to::<FailureSample>(document) {
            Ok(job) if job.failures > 0 => failed_sampled += 1,
            Ok(_) => {}
            Err(_) => unreadable_sampled += 1,
        }
    }
    Ok(QueueSample {
        pending_sampled: page.documents.len(),
        failed_sampled,
        unreadable_sampled,
        has_more: page.page_token.is_some(),
    })
}

pub(super) fn queue_publication_notice(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    snapshot: &crate::domain::PublishedResultSnapshot,
) -> Result<()> {
    let id = key(&[
        "publication-notice",
        &snapshot.chapter_id,
        &snapshot.event_id,
        &snapshot.publication_id,
    ]);
    let job = PublicationNoticeJob {
        id: id.clone(),
        chapter_id: snapshot.chapter_id.clone(),
        event_id: snapshot.event_id.clone(),
        division_id: snapshot.division_id.clone(),
        publication_id: snapshot.publication_id.clone(),
        next: 0,
        failures: 0,
        last_failed_at: None,
    };
    put(db, tx, &format!("publicationNoticeJobs/{id}"), &job)
}

// Keep recipient, transaction scope and notification content explicit at this boundary.
#[expect(
    clippy::too_many_arguments,
    reason = "explicit transaction and recipient scope"
)]
pub(super) fn queue_roster_notice(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    entry: &crate::domain::Entry,
    manager_uid: &str,
    notice_id: &str,
    kind: &str,
    title: &str,
    message: &str,
    href: &str,
) -> Result<()> {
    let mut seen = std::collections::HashSet::new();
    let mut recipients = Vec::new();
    for member in &entry.roster {
        segment(&member.uid)?;
        if member.uid != manager_uid && seen.insert(member.uid.clone()) {
            recipients.push(member.uid.clone());
        }
    }
    if recipients.is_empty() {
        return Ok(());
    }
    if recipients.len() > 500 {
        return Err(invalid("Roster exceeds notification capacity"));
    }
    let id = key(&[
        "roster-notice",
        &entry.chapter_id,
        &entry.event_id,
        notice_id,
    ]);
    let job = RosterNoticeJob {
        id: id.clone(),
        chapter_id: entry.chapter_id.clone(),
        event_id: entry.event_id.clone(),
        entry_id: entry.id.clone(),
        recipients,
        next: 0,
        failures: 0,
        last_failed_at: None,
        notice_id: notice_id.to_owned(),
        kind: kind.to_owned(),
        title: title.to_owned(),
        message: message.to_owned(),
        href: href.to_owned(),
    };
    put(db, tx, &format!("notificationFanoutJobs/{id}"), &job)
}

fn path(chapter: &str, uid: &str, notification_id: &str) -> Result<String> {
    Ok(format!(
        "chapters/{}/members/{}/notifications/{}",
        segment(chapter)?,
        segment(uid)?,
        segment(notification_id)?
    ))
}

fn summary_path(chapter: &str, uid: &str) -> Result<String> {
    Ok(format!(
        "chapters/{}/members/{}/notificationMeta/inbox",
        segment(chapter)?,
        segment(uid)?
    ))
}

// Keep recipient, transaction scope and notification content explicit at this boundary.
#[expect(
    clippy::too_many_arguments,
    reason = "explicit transaction and recipient scope"
)]
pub(super) async fn enqueue(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    chapter: &str,
    recipient_uid: &str,
    id: String,
    kind: &str,
    title: &str,
    message: &str,
    href: &str,
) -> Result<()> {
    enqueue_many(
        db,
        tx,
        chapter,
        vec![NotificationRequest {
            recipient_uid: recipient_uid.to_owned(),
            id,
            kind: kind.to_owned(),
            title: title.to_owned(),
            message: message.to_owned(),
            href: href.to_owned(),
        }],
    )
    .await
}

// Keep recipient, transaction scope and notification content explicit at this boundary.
#[expect(
    clippy::too_many_arguments,
    reason = "explicit transaction and recipient scope"
)]
pub(super) async fn enqueue_payment_transition(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    chapter: &str,
    event_id: &str,
    entry_id: &str,
    crew_id: &str,
    payment_id: &str,
    payer_uid: &str,
    notification_id: String,
    kind: &str,
    payer_message: &str,
    manager_message: &str,
) -> Result<()> {
    let payer_notice = NotificationRequest {
        recipient_uid: payer_uid.to_owned(),
        id: notification_id.clone(),
        kind: kind.to_owned(),
        title: "Payment status updated".into(),
        message: payer_message.to_owned(),
        href: destination(&["app", "payments", payment_id], &[])?,
    };
    let mut requests = vec![payer_notice];
    let crew_path = format!("chapters/{}/crews/{}", segment(chapter)?, segment(crew_id)?);
    if let Some(crew) = get::<Crew>(db, &crew_path).await? {
        if crew.id != crew_id || crew.chapter_id != chapter {
            return Err(forbidden());
        }
        if !crew.manager_uid.is_empty() && crew.manager_uid != payer_uid {
            requests.push(NotificationRequest {
                recipient_uid: crew.manager_uid,
                id: notification_id,
                kind: kind.to_owned(),
                title: "Crew payment status updated".into(),
                message: manager_message.to_owned(),
                href: destination(
                    &["app", "entries", entry_id, "review"],
                    &[("event", event_id)],
                )?,
            });
        }
    }
    enqueue_many(db, tx, chapter, requests).await
}

pub(super) async fn enqueue_many(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    chapter: &str,
    requests: Vec<NotificationRequest>,
) -> Result<()> {
    let mut seen_recipients = std::collections::HashSet::new();
    let mut writes = Vec::with_capacity(requests.len());
    for request in requests {
        if request.kind.is_empty()
            || request.kind.len() > 80
            || request.title.trim().is_empty()
            || request.title.len() > 240
            || request.message.len() > 2000
            || !safe_notification_href(&request.href)
        {
            return Err(invalid("Invalid notification record"));
        }
        if !seen_recipients.insert(request.recipient_uid.clone()) {
            return Err(invalid("Batch notification recipients must be unique"));
        }
        let member_path = format!(
            "chapters/{}/members/{}",
            segment(chapter)?,
            segment(&request.recipient_uid)?
        );
        let Some(member) = get::<Membership>(db, &member_path).await? else {
            // A source command may finish after its intended recipient loses
            // chapter access. Do not create a durable inbox row for that UID.
            continue;
        };
        let now = now_secs();
        if member.uid != request.recipient_uid || member.chapter_id != chapter {
            return Err(forbidden());
        }
        if !member.active
            || member
                .expires_at
                .is_some_and(|expires_at| expires_at <= now)
        {
            continue;
        }
        let notification_path = path(chapter, &request.recipient_uid, &request.id)?;
        if let Some(existing) = get::<NotificationRecord>(db, &notification_path).await? {
            if existing.id != request.id
                || existing.chapter_id != chapter
                || existing.recipient_uid != request.recipient_uid
            {
                return Err(forbidden());
            }
            continue;
        }
        let meta_path = summary_path(chapter, &request.recipient_uid)?;
        let mut summary = get::<NotificationSummary>(db, &meta_path)
            .await?
            .unwrap_or_else(|| NotificationSummary {
                chapter_id: chapter.to_owned(),
                recipient_uid: request.recipient_uid.clone(),
                unread_count: 0,
                revision: 0,
                updated_at: now_secs(),
            });
        if summary.chapter_id != chapter || summary.recipient_uid != request.recipient_uid {
            return Err(forbidden());
        }
        summary.unread_count = summary
            .unread_count
            .checked_add(1)
            .ok_or_else(|| conflict("Unread notification count is exhausted"))?;
        summary.revision = summary
            .revision
            .checked_add(1)
            .ok_or_else(|| conflict("Notification summary revision is exhausted"))?;
        summary.updated_at = now_secs();
        let record = NotificationRecord {
            id: request.id,
            chapter_id: chapter.to_owned(),
            recipient_uid: request.recipient_uid,
            kind: request.kind,
            title: request.title,
            message: request.message,
            href: request.href,
            created_at: now_secs(),
            read_at: None,
            revision: 1,
        };
        writes.push((notification_path, record, meta_path, summary));
    }
    for (notification_path, record, meta_path, summary) in writes {
        put(db, tx, &notification_path, &record)?;
        put(db, tx, &meta_path, &summary)?;
    }
    Ok(())
}

impl FirestoreRepository {
    async fn record_queue_failure(
        &self,
        collection: &'static str,
        job_id: &str,
        observed_next: Option<usize>,
    ) -> Result<()> {
        let job_id = segment(job_id)?.to_owned();
        self.db
            .run_transaction(|db, tx| {
                let job_id = job_id.clone();
                Box::pin(async move {
                    async {
                        let path = format!("{collection}/{job_id}");
                        if let Some(value) = get::<serde_json::Value>(&db, &path).await? {
                            let current_next = value
                                .get("next")
                                .and_then(serde_json::Value::as_u64)
                                .and_then(|next| usize::try_from(next).ok());
                            let last_failed_at = value
                                .get("last_failed_at")
                                .and_then(serde_json::Value::as_u64);
                            if current_next == observed_next
                                && !last_failed_at
                                    .is_some_and(|time| now_secs().saturating_sub(time) < 30)
                            {
                                let marker = QueueFailureMarker {
                                    failures: value
                                        .get("failures")
                                        .and_then(serde_json::Value::as_u64)
                                        .unwrap_or(0)
                                        .saturating_add(1),
                                    last_failed_at: Some(now_secs()),
                                };
                                tx.update_object(
                                    collection,
                                    &job_id,
                                    &marker,
                                    Some(vec!["failures".into(), "last_failed_at".into()]),
                                    None,
                                    vec![],
                                )?;
                            }
                        }
                        Ok(())
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn notification_queue_health(
        &self,
        claims: &Claims,
    ) -> Result<NotificationQueueHealth> {
        let claims = claims.clone();
        self.db
            .run_transaction(|db, _tx| {
                let claims = claims.clone();
                Box::pin(async move {
                    async {
                        super::hq::global_membership(&db, &claims).await?;
                        let roster = sample_queue(&db, "notificationFanoutJobs").await?;
                        let publication = sample_queue(&db, "publicationNoticeJobs").await?;
                        Ok(NotificationQueueHealth {
                            roster,
                            publication,
                            checked_at: now_secs(),
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    async fn expand_publication_notice(&self, job_id: &str) -> Result<()> {
        let job_id = segment(job_id)?.to_owned();
        self.db.run_transaction(|db, tx| {
            let job_id = job_id.clone();
            Box::pin(async move {
                async {
                    let path = format!("publicationNoticeJobs/{job_id}");
                    let Some(mut job) = get::<PublicationNoticeJob>(&db, &path).await? else { return Ok(()); };
                    if job.in_cooldown() { return Ok(()); }
                    if job.id != job_id { return Err(forbidden()); }
                    let snapshot: crate::domain::PublishedResultSnapshot = required(
                        &db, &super::publication::snapshot_path(&job.event_id, &job.division_id)?,
                    ).await?;
                    if snapshot.publication_id != job.publication_id || snapshot.chapter_id != job.chapter_id
                        || snapshot.event_id != job.event_id || snapshot.division_id != job.division_id
                        || job.next > snapshot.results.len() {
                        return Err(conflict("Published result notification scope is inconsistent"));
                    }
                    if let Some(result) = snapshot.results.get(job.next) {
                        let entry: Option<EntryDocument> = get(&db, &entry_path(&job.chapter_id, &job.event_id, &result.entry_id)?).await?;
                        if let Some(entry) = entry {
                            if entry.entry.id != result.entry_id || entry.entry.crew_id != result.crew_id
                                || entry.entry.chapter_id != job.chapter_id || entry.entry.event_id != job.event_id
                                || entry.entry.division_id != job.division_id { return Err(forbidden()); }
                            let crew: Crew = required(&db, &format!("chapters/{}/crews/{}", segment(&job.chapter_id)?, segment(&result.crew_id)?)).await?;
                            if crew.id != result.crew_id || crew.chapter_id != job.chapter_id { return Err(forbidden()); }
                            let notice_id = key(&["published-result", &job.chapter_id, &job.event_id, &job.publication_id, &result.entry_id]);
                            let href = destination(&["app", "scorecards"], &[("chapter", &job.chapter_id), ("event", &job.event_id)])?;
                            let title = "Results published";
                            let message = "A result for your crew has been published. Open your results workspace to view it.";
                            enqueue(&db, tx, &job.chapter_id, &crew.manager_uid, notice_id.clone(), "result_published", title, message, &href).await?;
                            queue_roster_notice(&db, tx, &entry.entry, &crew.manager_uid, &notice_id, "result_published", title, message, &href)?;
                        }
                        job.next += 1;
                    }
                    job.last_failed_at = None;
                    if job.next == snapshot.results.len() {
                        tx.delete_by_id("publicationNoticeJobs", &job_id, None)?;
                    } else {
                        put(&db, tx, &path, &job)?;
                    }
                    Ok(())
                }.await.map_err(backoff)
            })
        }).await.map_err(transaction_error)
    }

    pub async fn process_publication_notice_page(
        &self,
        cursor: Option<String>,
    ) -> Result<Option<String>> {
        let page = scan_queue(&self.db, "publicationNoticeJobs", cursor).await?;
        for job in page.items {
            if job
                .fields
                .as_ref()
                .and_then(|fields| fields.last_failed_at)
                .is_some_and(|time| now_secs().saturating_sub(time) < 30)
            {
                continue;
            }
            if let Err(error) = self.expand_publication_notice(&job.id).await {
                tracing::warn!(job_id = %job.id, error = %error, "Publication notification expansion failed; will retry");
                if let Some(fields) = job.fields {
                    if let Err(record_error) = self
                        .record_queue_failure("publicationNoticeJobs", &job.id, fields.next)
                        .await
                    {
                        tracing::warn!(error = %record_error, "Could not record publication queue failure");
                    }
                }
            }
        }
        Ok(page.next_page)
    }

    async fn deliver_roster_notice_batch(&self, job_id: &str) -> Result<()> {
        let job_id = segment(job_id)?.to_owned();
        self.db
            .run_transaction(|db, tx| {
                let job_id = job_id.clone();
                Box::pin(async move {
                    async {
                        let job_path = format!("notificationFanoutJobs/{job_id}");
                        let Some(mut job) = get::<RosterNoticeJob>(&db, &job_path).await? else {
                            return Ok(());
                        };
                        if job.in_cooldown() {
                            return Ok(());
                        }
                        if job.id != job_id
                            || job.recipients.len() > 500
                            || job.next > job.recipients.len()
                        {
                            return Err(conflict("Invalid notification fan-out job"));
                        }
                        let entry: Option<EntryDocument> = get(
                            &db,
                            &entry_path(&job.chapter_id, &job.event_id, &job.entry_id)?,
                        )
                        .await?;
                        if let Some(entry) = entry {
                            if entry.entry.chapter_id != job.chapter_id
                                || entry.entry.event_id != job.event_id
                                || entry.entry.id != job.entry_id
                            {
                                return Err(forbidden());
                            }
                            let end = (job.next + 20).min(job.recipients.len());
                            let requests = job.recipients[job.next..end]
                                .iter()
                                .filter(|uid| {
                                    entry.entry.roster.iter().any(|member| &member.uid == *uid)
                                })
                                .map(|uid| NotificationRequest {
                                    recipient_uid: uid.clone(),
                                    id: job.notice_id.clone(),
                                    kind: job.kind.clone(),
                                    title: job.title.clone(),
                                    message: job.message.clone(),
                                    href: job.href.clone(),
                                })
                                .collect();
                            enqueue_many(&db, tx, &job.chapter_id, requests).await?;
                            job.next = end;
                        } else {
                            job.next = job.recipients.len();
                        }
                        job.last_failed_at = None;
                        if job.next == job.recipients.len() {
                            tx.delete_by_id("notificationFanoutJobs", &job_id, None)?;
                        } else {
                            put(&db, tx, &job_path, &job)?;
                        }
                        Ok(())
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn process_roster_notice_page(
        &self,
        cursor: Option<String>,
    ) -> Result<Option<String>> {
        let page = scan_queue(&self.db, "notificationFanoutJobs", cursor).await?;
        for job in page.items {
            if job
                .fields
                .as_ref()
                .and_then(|fields| fields.last_failed_at)
                .is_some_and(|time| now_secs().saturating_sub(time) < 30)
            {
                continue;
            }
            if let Err(error) = self.deliver_roster_notice_batch(&job.id).await {
                tracing::warn!(job_id = %job.id, error = %error, "Roster notification batch failed; will retry");
                if let Some(fields) = job.fields {
                    if let Err(record_error) = self
                        .record_queue_failure("notificationFanoutJobs", &job.id, fields.next)
                        .await
                    {
                        tracing::warn!(error = %record_error, "Could not record roster queue failure");
                    }
                }
            }
        }
        Ok(page.next_page)
    }

    pub async fn list_notifications(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<NotificationPage> {
        segment(chapter)?;
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        membership(&self.db, claims, chapter).await?;
        let meta_path = summary_path(chapter, &claims.sub)?;
        let summary = get::<NotificationSummary>(&self.db, &meta_path).await?;
        if summary
            .as_ref()
            .is_some_and(|state| state.chapter_id != chapter || state.recipient_uid != claims.sub)
        {
            return Err(forbidden());
        }
        let page = self
            .page::<NotificationRecord>(
                &format!(
                    "chapters/{}/members/{}",
                    segment(chapter)?,
                    segment(&claims.sub)?
                ),
                "notifications",
                cursor,
                limit,
            )
            .await?;
        if page.items.iter().any(|item| {
            item.chapter_id != chapter
                || item.recipient_uid != claims.sub
                || segment(&item.id).is_err()
                || item.title.trim().is_empty()
                || item.title.len() > 240
                || item.kind.is_empty()
                || item.kind.len() > 80
                || item.message.len() > 2000
                || !safe_notification_href(&item.href)
        }) {
            return Err(forbidden());
        }
        Ok(NotificationPage {
            items: page.items,
            next_page: page.next_page,
            unread_count: summary.map_or(0, |state| state.unread_count),
        })
    }

    pub async fn mark_notification_read(
        &self,
        claims: &Claims,
        chapter: &str,
        notification_id: &str,
    ) -> Result<NotificationReadResult> {
        segment(chapter)?;
        segment(notification_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            notification_id.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, notification_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let document_path = path(&chapter, &claims.sub, &notification_id)?;
                        let mut notification: NotificationRecord =
                            required(&db, &document_path).await?;
                        if notification.id != notification_id
                            || notification.chapter_id != chapter
                            || notification.recipient_uid != claims.sub
                        {
                            return Err(forbidden());
                        }
                        let meta_path = summary_path(&chapter, &claims.sub)?;
                        let mut summary: NotificationSummary = required(&db, &meta_path).await?;
                        if summary.chapter_id != chapter || summary.recipient_uid != claims.sub {
                            return Err(forbidden());
                        }
                        if notification.read_at.is_none() {
                            notification.read_at = Some(now_secs());
                            notification.revision = notification
                                .revision
                                .checked_add(1)
                                .ok_or_else(|| conflict("Notification revision is exhausted"))?;
                            summary.unread_count =
                                summary.unread_count.checked_sub(1).ok_or_else(|| {
                                    conflict("Unread notification count is inconsistent")
                                })?;
                            summary.revision =
                                summary.revision.checked_add(1).ok_or_else(|| {
                                    conflict("Notification summary revision is exhausted")
                                })?;
                            summary.updated_at = now_secs();
                            put(&db, tx, &document_path, &notification)?;
                            put(&db, tx, &meta_path, &summary)?;
                        }
                        Ok(NotificationReadResult {
                            notification,
                            unread_count: summary.unread_count,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
