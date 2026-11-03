//! Local event waiver drafting. Drafts are never signable consent documents.
use super::*;
use serde::Deserialize;

#[derive(Clone, Serialize, Deserialize)]
pub struct WaiverDraft {
    chapter_id: String,
    event_id: String,
    revision: u64,
    title: String,
    language: String,
    text: String,
    source: String,
    rules_version: String,
    status: String,
    saved_at: u64,
    saved_by: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SaveWaiverDraft {
    pub operation_id: String,
    pub expected_revision: u64,
    pub title: String,
    pub language: String,
    pub text: String,
    pub source: String,
}

#[derive(Serialize, Deserialize)]
struct Receipt {
    hash: String,
    response: WaiverDraft,
}

impl FirestoreRepository {
    pub async fn waiver_draft_version(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        revision: u64,
    ) -> Result<WaiverDraft> {
        if revision == 0 {
            return Err(invalid("Invalid waiver revision"));
        }
        let input = (claims.clone(), chapter.to_owned(), event.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["chapter_director", "registrar"],
                        )
                        .await?;
                        let draft: WaiverDraft = required(
                            &db,
                            &format!(
                                "{}/waiverDraftVersions/{revision}",
                                event_path(&chapter, &event)?
                            ),
                        )
                        .await?;
                        if draft.chapter_id != chapter
                            || draft.event_id != event
                            || draft.revision != revision
                            || draft.status != "draft"
                        {
                            return Err(forbidden());
                        }
                        Ok(draft)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn waiver_draft(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
    ) -> Result<Option<WaiverDraft>> {
        let input = (claims.clone(), chapter.to_owned(), event.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["chapter_director", "registrar"],
                        )
                        .await?;
                        let draft: Option<WaiverDraft> = get(
                            &db,
                            &format!("{}/waiverDrafts/current", event_path(&chapter, &event)?),
                        )
                        .await?;
                        if draft.as_ref().is_some_and(|v| {
                            v.chapter_id != chapter || v.event_id != event || v.status != "draft"
                        }) {
                            return Err(forbidden());
                        }
                        Ok(draft)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn save_waiver_draft(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        command: SaveWaiverDraft,
    ) -> Result<WaiverDraft> {
        segment(&command.operation_id)?;
        if command.title.trim().is_empty()
            || command.title.chars().count() > 200
            || command.source.trim().is_empty()
            || command.source.chars().count() > 500
            || command.text.trim().is_empty()
            || command.text.len() > 100_000
            || command.language.is_empty()
            || command.language.len() > 35
            || !command
                .language
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-')
        {
            return Err(invalid("Invalid waiver draft"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, command) = input.clone();
                Box::pin(async move {
                    async {
                        let event_record =
                            event_access(&db, &claims, &chapter, &event, &["chapter_director"])
                                .await?;
                        let hash = key(&[
                            &event,
                            &command.expected_revision.to_string(),
                            &command.title,
                            &command.language,
                            &command.text,
                            &command.source,
                        ]);
                        let receipt_path = format!(
                            "chapters/{}/waiverDraftOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        if let Some(receipt) = get::<Receipt>(&db, &receipt_path).await? {
                            if receipt.hash != hash {
                                return Err(conflict("Waiver operation already used"));
                            }
                            return Ok(receipt.response);
                        }
                        let parent = event_path(&chapter, &event)?;
                        let path = format!("{parent}/waiverDrafts/current");
                        let current: Option<WaiverDraft> = get(&db, &path).await?;
                        if current.as_ref().is_some_and(|v| {
                            v.chapter_id != chapter || v.event_id != event || v.status != "draft"
                        }) {
                            return Err(forbidden());
                        }
                        let revision = current.as_ref().map_or(0, |v| v.revision);
                        if revision != command.expected_revision {
                            return Err(conflict("Waiver draft changed"));
                        }
                        let revision = revision
                            .checked_add(1)
                            .ok_or_else(|| invalid("Waiver revision overflow"))?;
                        let response = WaiverDraft {
                            chapter_id: chapter.clone(),
                            event_id: event,
                            revision,
                            title: command.title,
                            language: command.language,
                            text: command.text,
                            source: command.source,
                            rules_version: event_record.rules_version,
                            status: "draft".into(),
                            saved_at: now_secs(),
                            saved_by: claims.sub.clone(),
                        };
                        let history = format!("{parent}/waiverDraftVersions/{revision}");
                        if get::<WaiverDraft>(&db, &history).await?.is_some() {
                            return Err(conflict("Waiver history already exists"));
                        }
                        put(&db, tx, &history, &response)?;
                        put(&db, tx, &path, &response)?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &Receipt {
                                hash,
                                response: response.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "waiver_draft_saved",
                            &revision.to_string(),
                            &key(&["waiver-draft", &claims.sub, &command.operation_id]),
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
}
