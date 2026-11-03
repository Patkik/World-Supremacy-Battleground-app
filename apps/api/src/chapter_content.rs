use crate::registration::{authenticate, AppState, PageQuery};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;
#[cfg(feature = "firestore")]
use serde_json::json;
use serde_json::Value;

#[derive(Deserialize)]
pub struct SaveChapterContentDraftPayload {
    pub operation_id: String,
    pub draft_id: Option<String>,
    pub expected_revision: u64,
    pub title: String,
    pub body: String,
}

pub async fn list_drafts(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Query(query): Query<PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .chapter_content_drafts(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn create_draft(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Json(command): Json<SaveChapterContentDraftPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    if command.draft_id.is_some() {
        return Err(StatusCode::BAD_REQUEST);
    }
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .save_chapter_content_draft(
                &claims,
                &chapter,
                crate::repository::content::SaveChapterContentDraft {
                    operation_id: command.operation_id,
                    draft_id: command.draft_id,
                    expected_revision: command.expected_revision,
                    title: command.title,
                    body: command.body,
                },
            )
            .await
            .map(|draft| Json(json!(draft)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn update_draft(
    State(state): State<AppState>,
    Path((chapter, draft_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(mut command): Json<SaveChapterContentDraftPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    if command
        .draft_id
        .as_ref()
        .is_some_and(|value| value != &draft_id)
    {
        return Err(StatusCode::BAD_REQUEST);
    }
    command.draft_id = Some(draft_id);
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .save_chapter_content_draft(
                &claims,
                &chapter,
                crate::repository::content::SaveChapterContentDraft {
                    operation_id: command.operation_id,
                    draft_id: command.draft_id,
                    expected_revision: command.expected_revision,
                    title: command.title,
                    body: command.body,
                },
            )
            .await
            .map(|draft| Json(json!(draft)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_versions(
    State(state): State<AppState>,
    Path((chapter, draft_id)): Path<(String, String)>,
    headers: HeaderMap,
    Query(query): Query<PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    let _ = &draft_id;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .chapter_content_draft_versions(
                &claims,
                &chapter,
                &draft_id,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}
