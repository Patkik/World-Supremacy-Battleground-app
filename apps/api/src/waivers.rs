use crate::registration::{authenticate, AppState};
pub async fn version(
    State(state): State<AppState>,
    Path((chapter, event, revision)): Path<(String, String, u64)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    if let Some(repository) = &state.durable {
        return repository
            .waiver_draft_version(&claims, &chapter, &event, revision)
            .await
            .map(|v| Json(serde_json::json!(v)))
            .map_err(StatusCode::from);
    }
    Err(StatusCode::NOT_IMPLEMENTED)
}
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde_json::Value;

pub async fn read(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    if let Some(repository) = &state.durable {
        return repository
            .waiver_draft(&claims, &chapter, &event)
            .await
            .map(|v| Json(serde_json::json!(v)))
            .map_err(StatusCode::from);
    }
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn save(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    Json(command): Json<crate::repository::waivers::SaveWaiverDraft>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    if let Some(repository) = &state.durable {
        return repository
            .save_waiver_draft(&claims, &chapter, &event, command)
            .await
            .map(|v| Json(serde_json::json!(v)))
            .map_err(StatusCode::from);
    }
    Err(StatusCode::NOT_IMPLEMENTED)
}
