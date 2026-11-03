//! Private chapter content drafts. This module has no publication path.
use super::*;
use firestore::path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterContentDraft {
    pub id: String,
    pub chapter_id: String,
    pub revision: u64,
    pub title: String,
    pub body: String,
    pub updated_at: u64,
    pub updated_by: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterContentDraftVersion {
    pub draft_id: String,
    pub chapter_id: String,
    pub revision: u64,
    pub title: String,
    pub body: String,
    pub saved_at: u64,
    pub saved_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveChapterContentDraft {
    pub operation_id: String,
    pub draft_id: Option<String>,
    pub expected_revision: u64,
    pub title: String,
    pub body: String,
}

#[derive(Serialize, Deserialize)]
struct DraftReceipt {
    hash: String,
    response: ChapterContentDraft,
}

impl FirestoreRepository {
    pub async fn chapter_content_drafts(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<ChapterContentDraft>> {
        segment(chapter)?;
        if !(1..=100).contains(&limit) || cursor.as_ref().is_some_and(|v| v.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        self.db
            .run_transaction(|db, _tx| {
                let claims = claims.clone();
                let chapter = chapter.to_owned();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        Ok(())
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)?;

        let parent = format!(
            "{}/chapters/{}",
            self.db.get_documents_path(),
            segment(chapter)?
        );
        let mut builder = self
            .db
            .fluent()
            .list()
            .from("contentDrafts")
            .parent(parent)
            .order(|order| {
                order.fields([order.field(path!(ChapterContentDraft::updated_at)).desc()])
            })
            .page_size(limit);
        if let Some(token) = cursor {
            builder = builder.page_token(token);
        }
        let result = builder.get_page().await?;
        let items = result
            .documents
            .iter()
            .map(FirestoreDb::deserialize_doc_to)
            .collect::<std::result::Result<Vec<ChapterContentDraft>, _>>()?;
        if items.iter().any(|item| {
            item.chapter_id != chapter
                || item.id.is_empty()
                || item.status != "draft"
                || item.revision == 0
        }) {
            return Err(forbidden());
        }
        Ok(Page {
            items,
            next_page: result.page_token,
        })
    }

    pub async fn save_chapter_content_draft(
        &self,
        claims: &Claims,
        chapter: &str,
        command: SaveChapterContentDraft,
    ) -> Result<ChapterContentDraft> {
        segment(chapter)?;
        segment(&command.operation_id)?;
        if command
            .draft_id
            .as_ref()
            .is_some_and(|id| segment(id).is_err())
            || command.title.trim().is_empty()
            || command.title.chars().count() > 160
            || command.title.chars().any(char::is_control)
            || command.body.trim().is_empty()
            || command.body.chars().count() > 20_000
            || command.body.chars().any(|c| c == '\0')
            || (command.draft_id.is_none() && command.expected_revision != 0)
            || (command.draft_id.is_some() && command.expected_revision == 0)
        {
            return Err(invalid("Invalid chapter content draft"));
        }
        let input = (claims.clone(), chapter.to_owned(), command);
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, command) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        let hash = key(&[
                            &chapter,
                            command.draft_id.as_deref().unwrap_or("new"),
                            &command.expected_revision.to_string(),
                            command.title.trim(),
                            &command.body,
                        ]);
                        let receipt_path = format!(
                            "chapters/{}/contentDraftOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        if let Some(receipt) = get::<DraftReceipt>(&db, &receipt_path).await? {
                            return if receipt.hash == hash {
                                Ok(receipt.response)
                            } else {
                                Err(conflict("Content draft operation already used"))
                            };
                        }
                        let draft_id = command
                            .draft_id
                            .clone()
                            .unwrap_or_else(|| crate::store::new_id("content"));
                        let draft_path = format!(
                            "chapters/{}/contentDrafts/{}",
                            segment(&chapter)?,
                            segment(&draft_id)?
                        );
                        let current: Option<ChapterContentDraft> = get(&db, &draft_path).await?;
                        if current.as_ref().is_some_and(|v| {
                            v.chapter_id != chapter || v.id != draft_id || v.status != "draft"
                        }) {
                            return Err(forbidden());
                        }
                        let revision = current.as_ref().map_or(0, |v| v.revision);
                        if revision != command.expected_revision {
                            return Err(conflict("Content draft changed"));
                        }
                        let next_revision = revision
                            .checked_add(1)
                            .ok_or_else(|| invalid("Content draft revision overflow"))?;
                        let title = command.title.trim().to_owned();
                        let body = command.body.trim().to_owned();
                        let saved_at = now_secs();
                        let response = ChapterContentDraft {
                            id: draft_id.clone(),
                            chapter_id: chapter.clone(),
                            revision: next_revision,
                            title: title.clone(),
                            body: body.clone(),
                            updated_at: saved_at,
                            updated_by: claims.sub.clone(),
                            status: "draft".into(),
                        };
                        let version_path = format!("{draft_path}/versions/{next_revision:020}");
                        if get::<ChapterContentDraftVersion>(&db, &version_path)
                            .await?
                            .is_some()
                        {
                            return Err(conflict("Content draft revision already exists"));
                        }
                        put(
                            &db,
                            tx,
                            &version_path,
                            &ChapterContentDraftVersion {
                                draft_id: draft_id.clone(),
                                chapter_id: chapter.clone(),
                                revision: next_revision,
                                title: title.clone(),
                                body: body.clone(),
                                saved_at,
                                saved_by: claims.sub.clone(),
                            },
                        )?;
                        put(&db, tx, &draft_path, &response)?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &DraftReceipt {
                                hash,
                                response: response.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "chapter_content_draft_saved",
                            &format!("{draft_id}:{next_revision}"),
                            &key(&["chapter-content-draft", &claims.sub, &command.operation_id]),
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

    pub async fn chapter_content_draft_versions(
        &self,
        claims: &Claims,
        chapter: &str,
        draft_id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<ChapterContentDraftVersion>> {
        if !(1..=100).contains(&limit) || cursor.as_ref().is_some_and(|v| v.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        let chapter = segment(chapter)?;
        let draft_id = segment(draft_id)?;
        self.db
            .run_transaction(|db, _tx| {
                let claims = claims.clone();
                let chapter = chapter.to_owned();
                let draft_id = draft_id.to_owned();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        let path = format!("chapters/{chapter}/contentDrafts/{draft_id}");
                        let draft: ChapterContentDraft = required(&db, &path).await?;
                        if draft.chapter_id != chapter
                            || draft.id != draft_id
                            || draft.status != "draft"
                        {
                            return Err(forbidden());
                        }
                        Ok(())
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)?;
        let parent = format!(
            "{}/chapters/{chapter}/contentDrafts/{draft_id}",
            self.db.get_documents_path()
        );
        let mut builder = self
            .db
            .fluent()
            .list()
            .from("versions")
            .parent(parent)
            .order(|order| {
                order.fields([order
                    .field(path!(ChapterContentDraftVersion::revision))
                    .desc()])
            })
            .page_size(limit);
        if let Some(token) = cursor {
            builder = builder.page_token(token);
        }
        let result = builder.get_page().await?;
        let items = result
            .documents
            .iter()
            .map(FirestoreDb::deserialize_doc_to)
            .collect::<std::result::Result<Vec<ChapterContentDraftVersion>, _>>()?;
        if items.iter().any(|version| {
            version.chapter_id != chapter || version.draft_id != draft_id || version.revision == 0
        }) {
            return Err(forbidden());
        }
        Ok(Page {
            items,
            next_page: result.page_token,
        })
    }
}
