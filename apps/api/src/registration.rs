use std::sync::Arc;
use tokio::sync::RwLock;

use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::auth::{self, Claims, Verifier};
use crate::domain::{
    Crew, CrewInvitation, CrewMember, Entry, EntryReadiness, EntryStatus, MemberRole,
};
use crate::store::RegistrationStore;

#[derive(Clone)]
pub struct AppState {
    pub verifier: Verifier,
    pub store: Arc<RwLock<RegistrationStore>>,
}

pub async fn authenticate(
    verifier: &Verifier,
    headers: &HeaderMap,
    expected_chapter: &str,
) -> Result<Claims, StatusCode> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let claims = verifier
        .verify(token)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if !auth::chapter_access(&claims, expected_chapter) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(claims)
}

pub async fn list_chapters(State(state): State<AppState>) -> Result<Json<Value>, StatusCode> {
    let store = state.store.read().await;
    let chapters: Vec<_> = store.chapters.values().cloned().collect();
    Ok(Json(json!(chapters)))
}

pub async fn list_events(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let store = state.store.read().await;
    let events: Vec<_> = store
        .events
        .values()
        .filter(|e| e.chapter_id == chapter_id)
        .cloned()
        .collect();
    Ok(Json(json!(events)))
}

pub async fn get_event(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
) -> Result<Json<Value>, StatusCode> {
    let store = state.store.read().await;
    let event = store
        .events
        .get(&event_id)
        .filter(|e| e.chapter_id == chapter_id)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(json!(event)))
}

pub async fn list_divisions(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
) -> Result<Json<Value>, StatusCode> {
    let store = state.store.read().await;
    let divisions = store
        .get_divisions(&chapter_id, &event_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(json!(divisions)))
}

#[derive(Deserialize)]
pub struct CreateCrewPayload {
    pub name: String,
    pub city: String,
}

pub async fn create_crew(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateCrewPayload>,
) -> Result<Json<Crew>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let crew = store
        .create_crew(&chapter_id, &claims.sub, &payload.name, &payload.city)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(crew))
}

pub async fn get_crew(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Crew>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let crew = store
        .get_crew(&chapter_id, &crew_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(crew))
}

pub async fn list_crews(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
) -> Result<Json<Vec<Crew>>, StatusCode> {
    let store = state.store.read().await;
    let crews = store.list_crews_by_chapter(&chapter_id);
    Ok(Json(crews))
}

#[derive(Deserialize)]
pub struct UpdateCrewPayload {
    pub name: String,
    pub city: String,
}

pub async fn update_crew(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<UpdateCrewPayload>,
) -> Result<Json<Crew>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let crew = store
        .update_crew(&chapter_id, &crew_id, &payload.name, &payload.city)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(crew))
}

pub async fn create_invitation(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<CrewInvitation>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let inv = store
        .create_invitation(&chapter_id, &crew_id, &claims.sub, MemberRole::Dancer)
        .map_err(|_| StatusCode::FORBIDDEN)?;
    Ok(Json(inv))
}

#[derive(Deserialize)]
pub struct JoinCrewPayload {
    pub token: String,
    pub dancer_name: String,
    pub is_minor: bool,
}

pub async fn join_crew(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<JoinCrewPayload>,
) -> Result<Json<Crew>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let crew = store
        .accept_invitation(
            &chapter_id,
            &payload.token,
            &claims.sub,
            &payload.dancer_name,
            payload.is_minor,
        )
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(crew))
}

#[derive(Deserialize)]
pub struct CreateEntryPayload {
    pub crew_id: String,
    pub division_id: String,
}

pub async fn create_entry(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<CreateEntryPayload>,
) -> Result<Json<Entry>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let entry = store
        .create_entry(
            &chapter_id,
            &event_id,
            &payload.crew_id,
            &payload.division_id,
        )
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(entry))
}

#[derive(Serialize)]
pub struct EntryDetailResponse {
    pub entry: Entry,
    pub readiness: EntryReadiness,
}

pub async fn get_entry_detail(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<EntryDetailResponse>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let entry = store
        .entries
        .get(&entry_id)
        .filter(|e| e.chapter_id == chapter_id && e.event_id == event_id)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;
    let readiness = store
        .evaluate_readiness(&entry)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(EntryDetailResponse { entry, readiness }))
}

pub async fn submit_entry(
    State(state): State<AppState>,
    Path((chapter_id, _event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<Entry>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let entry = store
        .submit_entry(&chapter_id, &entry_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(entry))
}

pub async fn list_entries(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Vec<Entry>>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let entries = store.list_entries_by_event(&chapter_id, &event_id);
    Ok(Json(entries))
}

#[derive(Deserialize)]
pub struct UpdateEntryRosterPayload {
    pub roster: Vec<CrewMember>,
}

pub async fn update_entry_roster(
    State(state): State<AppState>,
    Path((chapter_id, _event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<UpdateEntryRosterPayload>,
) -> Result<Json<Entry>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let entry = store
        .update_entry_roster(&chapter_id, &entry_id, payload.roster)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(entry))
}

#[derive(Deserialize)]
pub struct ReviewEntryPayload {
    pub status: EntryStatus,
}

pub async fn review_entry(
    State(state): State<AppState>,
    Path((chapter_id, _event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ReviewEntryPayload>,
) -> Result<Json<Entry>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let entry = store
        .review_entry(&chapter_id, &entry_id, payload.status)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(entry))
}
