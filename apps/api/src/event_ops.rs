use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;

use crate::domain::{BattleMatch, CheckInRecord, PublishedResultSnapshot};
use crate::registration::{authenticate, AppState};

#[derive(Deserialize)]
pub struct CheckInPayload {
    pub dancer_uid: String,
}

pub async fn check_in_dancer(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<CheckInPayload>,
) -> Result<Json<CheckInRecord>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let record = store.check_in_dancer(&chapter_id, &event_id, &payload.dancer_uid, &claims.sub);
    Ok(Json(record))
}

pub async fn list_check_ins(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Vec<CheckInRecord>>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let records = store.list_check_ins(&chapter_id, &event_id);
    Ok(Json(records))
}

pub async fn list_battles(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> Result<Json<Vec<BattleMatch>>, StatusCode> {
    let store = state.store.read().await;
    let battles = store.list_battle_matches(&event_id);
    Ok(Json(battles))
}

#[derive(Deserialize)]
pub struct BattleVotePayload {
    pub winner_corner: String,
}

pub async fn vote_battle(
    State(state): State<AppState>,
    Path((event_id, match_id)): Path<(String, String)>,
    Json(payload): Json<BattleVotePayload>,
) -> Result<Json<BattleMatch>, StatusCode> {
    let mut store = state.store.write().await;
    let match_record = store
        .vote_battle(&event_id, &match_id, &payload.winner_corner)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(match_record))
}

pub async fn publish_results(
    State(state): State<AppState>,
    Path((chapter_id, event_id, division_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<PublishedResultSnapshot>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let snapshot = store
        .publish_division_results(&chapter_id, &event_id, &division_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(snapshot))
}

pub async fn get_published_snapshot(
    State(state): State<AppState>,
    Path((event_id, division_id)): Path<(String, String)>,
) -> Result<Json<PublishedResultSnapshot>, StatusCode> {
    let store = state.store.read().await;
    let snapshot = store
        .get_published_snapshot(&event_id, &division_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(snapshot))
}
