//! Server-only repositories. Read authorization and aggregates through the
//! transaction-bound client, before queuing any writes or returning a receipt.
mod finance;
mod judging;
pub mod lineup;
#[cfg(feature = "local-testing")]
pub mod paymongo_local;
mod publication;
mod reads;
mod registration;
pub mod stage;
pub mod support;
mod venue;
mod verification;
pub use models::DeductionUpdate;
pub use reads::ReadScope;
pub use registration::RegistrationCommand;
pub mod models;
#[cfg(test)]
mod tests;

use crate::{
    auth::{self, Claims},
    domain::{AuditRecord, Chapter, Crew, EntryReadiness, Event, Membership},
    store::{new_id, now_secs},
};
use axum::http::StatusCode;
use firestore::{
    errors::{BackoffError, FirestoreError},
    FirestoreDb, FirestoreDocumentId, FirestoreTransaction, FirestoreTransactionOps,
};
use models::*;
use serde::{de::DeserializeOwned, Serialize};
use sha2::{Digest, Sha256};
use std::{error::Error, fmt};

#[derive(Debug)]
pub enum RepositoryError {
    Denied(StatusCode, &'static str),
    Storage(FirestoreError),
}
pub type Result<T> = std::result::Result<T, RepositoryError>;
impl fmt::Display for RepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Denied(_, reason) => f.write_str(reason),
            Self::Storage(_) => f.write_str("Business storage is unavailable"),
        }
    }
}
impl Error for RepositoryError {}
impl From<FirestoreError> for RepositoryError {
    fn from(value: FirestoreError) -> Self {
        Self::Storage(value)
    }
}
impl From<RepositoryError> for StatusCode {
    fn from(error: RepositoryError) -> Self {
        match error {
            RepositoryError::Denied(status, _) => status,
            RepositoryError::Storage(_) => Self::SERVICE_UNAVAILABLE,
        }
    }
}
fn deny(status: StatusCode, reason: &'static str) -> RepositoryError {
    RepositoryError::Denied(status, reason)
}
fn missing() -> RepositoryError {
    deny(StatusCode::NOT_FOUND, "Record not found in this scope")
}
fn conflict(reason: &'static str) -> RepositoryError {
    deny(StatusCode::CONFLICT, reason)
}
fn invalid(reason: &'static str) -> RepositoryError {
    deny(StatusCode::BAD_REQUEST, reason)
}
fn forbidden() -> RepositoryError {
    deny(
        StatusCode::FORBIDDEN,
        "Current membership or assignment does not authorize this action",
    )
}
fn backoff(error: RepositoryError) -> BackoffError<RepositoryError> {
    match &error {
        RepositoryError::Storage(FirestoreError::DatabaseError(db)) if db.retry_possible => {
            BackoffError::transient(error)
        }
        RepositoryError::Storage(FirestoreError::NetworkError(_)) => BackoffError::transient(error),
        _ => BackoffError::permanent(error),
    }
}
fn transaction_error(error: FirestoreError) -> RepositoryError {
    match error {
        FirestoreError::ErrorInTransaction(error) => {
            match error.source.downcast::<RepositoryError>() {
                Ok(error) => *error,
                Err(_) => deny(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Business transaction failed",
                ),
            }
        }
        error => RepositoryError::Storage(error),
    }
}

pub fn key(parts: &[&str]) -> String {
    Sha256::digest(serde_json::to_vec(parts).expect("string tuple serializes"))
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}
fn segment(value: &str) -> Result<&str> {
    if value.is_empty() || value.len() > 200 || value.contains('/') || value == "." || value == ".."
    {
        return Err(invalid("Invalid record identifier"));
    }
    Ok(value)
}
fn event_path(chapter: &str, event: &str) -> Result<String> {
    Ok(format!(
        "chapters/{}/events/{}",
        segment(chapter)?,
        segment(event)?
    ))
}
fn division_path(chapter: &str, event: &str, division: &str) -> Result<String> {
    Ok(format!(
        "{}/divisionState/{}",
        event_path(chapter, event)?,
        segment(division)?
    ))
}
fn entry_path(chapter: &str, event: &str, entry: &str) -> Result<String> {
    Ok(format!(
        "{}/entries/{}",
        event_path(chapter, event)?,
        segment(entry)?
    ))
}
fn location(db: &FirestoreDb, path: &str) -> Result<(String, String, String)> {
    let parts: Vec<_> = path.split('/').collect();
    if parts.len() < 2 || parts.len() % 2 != 0 {
        return Err(invalid("Invalid document path"));
    }
    for part in &parts {
        FirestoreDocumentId::new(*part).map_err(RepositoryError::from)?;
    }
    let parent = if parts.len() == 2 {
        db.get_documents_path().clone()
    } else {
        format!(
            "{}/{}",
            db.get_documents_path(),
            parts[..parts.len() - 2].join("/")
        )
    };
    Ok((
        parent,
        parts[parts.len() - 2].into(),
        parts[parts.len() - 1].into(),
    ))
}
async fn get<T: DeserializeOwned + Send>(db: &FirestoreDb, path: &str) -> Result<Option<T>> {
    let (parent, collection, id) = location(db, path)?;
    Ok(db
        .fluent()
        .select()
        .by_id_in(collection)
        .parent(parent)
        .obj::<T>()
        .one(id)
        .await?)
}
async fn required<T: DeserializeOwned + Send>(db: &FirestoreDb, path: &str) -> Result<T> {
    get(db, path).await?.ok_or_else(missing)
}
fn put<T: Serialize + Sync + Send>(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    path: &str,
    value: &T,
) -> Result<()> {
    let (parent, collection, id) = location(db, path)?;
    tx.update_object_at(&parent, &collection, id, value, None, None, vec![])?;
    Ok(())
}
fn audit(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    chapter: &str,
    actor: &str,
    action: &str,
    resource: &str,
    id: &str,
) -> Result<()> {
    let value = AuditRecord {
        id: id.into(),
        actor_uid: actor.into(),
        chapter_id: chapter.into(),
        action: action.into(),
        resource_id: resource.into(),
        recorded_at: now_secs(),
    };
    put(
        db,
        tx,
        &format!("chapters/{}/audit/{}", segment(chapter)?, segment(id)?),
        &value,
    )
}

#[derive(Clone)]
pub struct FirestoreRepository {
    db: FirestoreDb,
}
impl FirestoreRepository {
    #[cfg(feature = "local-testing")]
    pub(crate) async fn local_identity_member(
        &self,
        uid: &str,
        chapter: &str,
    ) -> Result<Membership> {
        let member: Membership = required(
            &self.db,
            &format!("chapters/{}/members/{}", segment(chapter)?, segment(uid)?),
        )
        .await
        .map_err(|error| match error {
            RepositoryError::Denied(StatusCode::NOT_FOUND, _) => forbidden(),
            other => other,
        })?;
        let claims = Claims {
            sub: uid.into(),
            iat: now_secs(),
            auth_time: now_secs(),
            chapter_id: Some(chapter.into()),
            role: Some(member.role.clone()),
        };
        membership(&self.db, &claims, chapter).await
    }
    pub async fn connect(project: &str) -> Result<Self> {
        if project != "demo-wsb"
            || std::env::var("FIRESTORE_EMULATOR_HOST")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .is_none()
        {
            return Err(invalid(
                "Only demo-wsb with an explicit Firestore emulator is enabled",
            ));
        }
        Ok(Self {
            db: FirestoreDb::new(project).await?,
        })
    }
    pub async fn membership(&self, claims: &Claims, chapter: &str) -> Result<Membership> {
        membership(&self.db, claims, chapter).await
    }
    pub async fn readiness_probe(&self) -> Result<()> {
        let _: Option<serde_json::Value> = get(&self.db, "chapters/wsb-readiness-probe").await?;
        Ok(())
    }
    pub async fn page<T: DeserializeOwned>(
        &self,
        parent: &str,
        collection: &str,
        page_token: Option<String>,
        limit: usize,
    ) -> Result<Page<T>> {
        if limit == 0 || limit > 100 {
            return Err(invalid("Page size must be between 1 and 100"));
        }
        let builder = self
            .db
            .fluent()
            .list()
            .from(collection)
            .parent(if parent.is_empty() {
                self.db.get_documents_path().clone()
            } else {
                format!("{}/{}", self.db.get_documents_path(), parent)
            })
            .page_size(limit);
        let builder = if let Some(token) = page_token {
            builder.page_token(token)
        } else {
            builder
        };
        let result = builder.get_page().await?;
        let items = result
            .documents
            .iter()
            .map(FirestoreDb::deserialize_doc_to)
            .collect::<std::result::Result<Vec<T>, _>>()?;
        Ok(Page {
            items,
            next_page: result.page_token,
        })
    }
}

async fn membership(db: &FirestoreDb, claims: &Claims, chapter: &str) -> Result<Membership> {
    if !auth::chapter_access(claims, chapter) {
        return Err(forbidden());
    }
    let member: Membership = required(
        db,
        &format!(
            "chapters/{}/members/{}",
            segment(chapter)?,
            segment(&claims.sub)?
        ),
    )
    .await
    .map_err(|error| match error {
        RepositoryError::Denied(StatusCode::NOT_FOUND, _) => forbidden(),
        other => other,
    })?;
    if !member.active
        || member.uid != claims.sub
        || member.chapter_id != chapter
        || claims.role.as_deref() != Some(&member.role)
        || claims.auth_time < member.valid_after
    {
        return Err(forbidden());
    }
    Ok(member)
}
async fn event_access(
    db: &FirestoreDb,
    claims: &Claims,
    chapter: &str,
    event: &str,
    roles: &[&str],
) -> Result<Event> {
    membership(db, claims, chapter).await?;
    if !roles
        .iter()
        .any(|role| claims.role.as_deref() == Some(role))
    {
        return Err(forbidden());
    }
    let path = event_path(chapter, event)?;
    let record: Event = required(db, &path).await?;
    if record.id != event || record.chapter_id != chapter {
        return Err(forbidden());
    }
    if claims.role.as_deref() != Some("chapter_director") {
        let assignment: Assignment =
            required(db, &format!("{path}/assignments/{}", segment(&claims.sub)?))
                .await
                .map_err(|error| match error {
                    RepositoryError::Denied(StatusCode::NOT_FOUND, _) => forbidden(),
                    other => other,
                })?;
        if !assignment.active || assignment.uid != claims.sub || assignment.event_id != event {
            return Err(forbidden());
        }
    }
    Ok(record)
}
async fn entry_access(
    db: &FirestoreDb,
    claims: &Claims,
    chapter: &str,
    event: &str,
    entry_id: &str,
    staff: bool,
) -> Result<EntryDocument> {
    membership(db, claims, chapter).await?;
    let document: EntryDocument = required(db, &entry_path(chapter, event, entry_id)?).await?;
    if document.entry.id != entry_id
        || document.entry.chapter_id != chapter
        || document.entry.event_id != event
    {
        return Err(forbidden());
    }
    if staff {
        event_access(
            db,
            claims,
            chapter,
            event,
            &["finance", "registrar", "chapter_director", "head_judge"],
        )
        .await?;
    } else {
        let crew: Crew = required(
            db,
            &format!(
                "chapters/{}/crews/{}",
                segment(chapter)?,
                segment(&document.entry.crew_id)?
            ),
        )
        .await?;
        if crew.chapter_id != chapter
            || (crew.manager_uid != claims.sub && !crew.members.iter().any(|m| m.uid == claims.sub))
        {
            return Err(forbidden());
        }
    }
    Ok(document)
}
fn readiness(entry: &EntryDocument, division: &DivisionDocument) -> Result<EntryReadiness> {
    let mut store = crate::store::RegistrationStore::empty();
    store
        .divisions
        .insert(entry.entry.event_id.clone(), vec![division.policy.clone()]);
    store.evaluate_readiness(&entry.entry).map_err(invalid)
}
fn adjust_readiness(division: &mut DivisionDocument, before: bool, after: bool) -> Result<()> {
    if before == after {
        return Ok(());
    }
    if after {
        division.unready_entries = division
            .unready_entries
            .checked_sub(1)
            .ok_or_else(|| conflict("Readiness ledger needs reconciliation"))?;
    } else {
        division.unready_entries = division
            .unready_entries
            .checked_add(1)
            .ok_or_else(|| invalid("Readiness counter overflow"))?;
    }
    division.generation += 1;
    Ok(())
}
