use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde_json::{json, Value};

use crate::domain::{CrewResult, ScoreReceipt, SubmitScoreCommand};
use crate::registration::{authenticate, AppState};

pub async fn submit_score(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(cmd): Json<SubmitScoreCommand>,
) -> Result<Json<ScoreReceipt>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;

    // Only judges or head judges may submit scores
    if !matches!(claims.role.as_deref(), Some("judge" | "head_judge")) {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut store = state.store.write().await;
    let receipt = store
        .submit_score(&chapter_id, &event_id, &claims.sub, cmd)
        .map_err(|err| {
            if err.contains("locked") || err.contains("mismatch") {
                StatusCode::CONFLICT
            } else {
                StatusCode::BAD_REQUEST
            }
        })?;

    Ok(Json(receipt))
}

pub async fn lock_division(
    State(state): State<AppState>,
    Path((chapter_id, event_id, division_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;

    // Locking requires head judge or chapter director authorization
    if !matches!(
        claims.role.as_deref(),
        Some("head_judge" | "chapter_director")
    ) {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut store = state.store.write().await;
    store
        .lock_division(&chapter_id, &event_id, &division_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    Ok(Json(json!({
        "event_id": event_id,
        "division_id": division_id,
        "locked": true,
        "authorized_by": claims.sub
    })))
}

pub async fn get_division_results(
    State(state): State<AppState>,
    Path((chapter_id, event_id, division_id)): Path<(String, String, String)>,
) -> Result<Json<Vec<CrewResult>>, StatusCode> {
    let store = state.store.read().await;
    let results = store
        .get_division_results(&chapter_id, &event_id, &division_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(results))
}
