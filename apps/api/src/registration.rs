use crate::access;
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
    AudioUploadReceipt, Crew, CrewInvitation, CrewMember, DJExportManifest, Entry, EntryReadiness,
    EntryStatus, GuardianConsentReceipt, MemberRole, SubmitGuardianConsentPayload,
    UploadAudioPayload,
};
use crate::store::RegistrationStore;

#[derive(Clone)]
pub struct AppState {
    #[cfg(feature = "local-testing")]
    pub local_identity: Option<Arc<crate::local_identity::LocalIdentity>>,
    pub verifier: Verifier,
    pub store: Arc<RwLock<RegistrationStore>>,
    #[cfg(feature = "firestore")]
    pub durable: Option<Arc<crate::repository::FirestoreRepository>>,
}

pub async fn authenticate(
    state: &AppState,
    headers: &HeaderMap,
    expected_chapter: &str,
) -> Result<Claims, StatusCode> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let claims = state
        .verifier
        .verify(token)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if !auth::chapter_access(&claims, expected_chapter) {
        return Err(StatusCode::FORBIDDEN);
    }
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        repository
            .membership(&claims, expected_chapter)
            .await
            .map_err(StatusCode::from)?;
        return Ok(claims);
    }
    access::require_membership(&*state.store.read().await, &claims, expected_chapter)?;
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
    headers: HeaderMap,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .authorized_page(
                &claims,
                &chapter_id,
                crate::repository::ReadScope::Divisions(event_id),
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|v| Json(json!(v)))
            .map_err(StatusCode::from);
    }
    let _ = query;
    let _ = claims;
    let store = state.store.read().await;
    store
        .assert_event(&chapter_id, &event_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let divisions = store
        .get_divisions(&chapter_id, &event_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(json!(divisions)))
}

pub async fn list_division_status(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    access::require_role(&claims, &["head_judge", "chapter_director"])?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .authorized_page(
                &claims,
                &chapter_id,
                crate::repository::ReadScope::DivisionStatus(event_id),
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = query;
    let store = state.store.read().await;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let divisions = store
        .get_divisions(&chapter_id, &event_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let statuses: Vec<_> = divisions
        .into_iter()
        .map(|division| {
            let approved: Vec<_> = store
                .entries
                .values()
                .filter(|entry| {
                    entry.chapter_id == chapter_id
                        && entry.event_id == event_id
                        && entry.division_id == division.id
                        && entry.status == EntryStatus::Approved
                })
                .collect();
            let unready = approved
                .iter()
                .filter(|entry| {
                    store
                        .evaluate_readiness(entry)
                        .map(|readiness| !readiness.is_ready)
                        .unwrap_or(true)
                })
                .count();
            let lock_key = serde_json::to_string(&[event_id.as_str(), division.id.as_str()])
                .unwrap_or_default();
            let publication = store.get_published_snapshot(&event_id, &division.id);
            json!({
                "id": division.id,
                "name": division.name,
                "min_members": division.min_members,
                "max_members": division.max_members,
                "max_duration_secs": division.max_duration_secs,
                "locked": store.division_locks.get(&lock_key) == Some(&true),
                "publication_id": publication.map(|snapshot| snapshot.publication_id),
                "approved_entries": approved.len(),
                "unready_entries": unready,
            })
        })
        .collect();
    Ok(Json(json!(statuses)))
}

#[derive(Deserialize)]
pub struct CreateCrewPayload {
    pub operation_id: String,
    pub name: String,
    pub city: String,
}

pub async fn create_crew(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateCrewPayload>,
) -> Result<Json<Crew>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .registration_command(
                &claims,
                &chapter_id,
                &payload.operation_id,
                crate::repository::RegistrationCommand::CreateCrew {
                    name: payload.name,
                    city: payload.city,
                },
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::require_role(&claims, &["crew_manager"])?;
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
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .crew_detail(&claims, &chapter_id, &crew_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    access::crew_access(&store, &claims, &chapter_id, &crew_id, false)?;
    let crew = store
        .get_crew(&chapter_id, &crew_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(crew))
}

#[derive(Deserialize)]
pub struct PageQuery {
    pub cursor: Option<String>,
    pub limit: Option<usize>,
}
pub async fn list_crews(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .authorized_page(
                &claims,
                &chapter_id,
                crate::repository::ReadScope::Crews,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|v| Json(json!(v)))
            .map_err(StatusCode::from);
    }
    let _ = query;
    let store = state.store.read().await;
    let crews = store
        .list_crews_by_chapter(&chapter_id)
        .into_iter()
        .filter(|c| {
            claims.role.as_deref() == Some("chapter_director")
                || c.manager_uid == claims.sub
                || c.members.iter().any(|m| m.uid == claims.sub)
        })
        .collect::<Vec<_>>();
    Ok(Json(json!(crews)))
}

#[derive(Deserialize)]
pub struct UpdateCrewPayload {
    pub operation_id: String,
    pub expected_revision: u64,
    pub name: String,
    pub city: String,
}

pub async fn update_crew(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<UpdateCrewPayload>,
) -> Result<Json<Crew>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .registration_command(
                &claims,
                &chapter_id,
                &payload.operation_id,
                crate::repository::RegistrationCommand::UpdateCrew {
                    crew_id,
                    name: payload.name,
                    city: payload.city,
                    expected_revision: payload.expected_revision,
                },
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::crew_access(&store, &claims, &chapter_id, &crew_id, true)?;
    let crew = store
        .update_crew(&chapter_id, &crew_id, &payload.name, &payload.city)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(crew))
}

#[derive(Deserialize)]
pub struct OperationPayload {
    pub operation_id: String,
}

pub async fn create_invitation(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<OperationPayload>,
) -> Result<Json<CrewInvitation>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .registration_command(
                &claims,
                &chapter_id,
                &payload.operation_id,
                crate::repository::RegistrationCommand::Invite { crew_id },
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = payload;
    let mut store = state.store.write().await;
    access::crew_access(&store, &claims, &chapter_id, &crew_id, true)?;
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
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<JoinCrewPayload>,
) -> Result<Json<Crew>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .redeem_invitation(
                &claims,
                &chapter_id,
                &crew_id,
                &payload.token,
                &payload.dancer_name,
                payload.is_minor,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    if store
        .invitations
        .get(&payload.token)
        .is_none_or(|inv| inv.crew_id != crew_id || inv.chapter_id != chapter_id)
    {
        return Err(StatusCode::NOT_FOUND);
    }
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
    pub operation_id: String,
    pub crew_id: String,
    pub division_id: String,
}

pub async fn create_entry(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<CreateEntryPayload>,
) -> Result<Json<Entry>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .registration_command(
                &claims,
                &chapter_id,
                &payload.operation_id,
                crate::repository::RegistrationCommand::CreateEntry {
                    event_id,
                    crew_id: payload.crew_id,
                    division_id: payload.division_id,
                },
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::crew_access(&store, &claims, &chapter_id, &payload.crew_id, true)?;
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
    pub pending_minor: u64,
    pub entry: Entry,
    pub readiness: EntryReadiness,
}

pub async fn get_entry_detail(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<EntryDetailResponse>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .entry_detail(&claims, &chapter_id, &event_id, &entry_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    access::entry_access(&store, &claims, &chapter_id, &event_id, &entry_id, false)?;
    let entry = store
        .entries
        .get(&entry_id)
        .filter(|e| e.chapter_id == chapter_id && e.event_id == event_id)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;
    let readiness = store
        .evaluate_readiness(&entry)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(EntryDetailResponse {
        entry,
        readiness,
        pending_minor: 0,
    }))
}

#[derive(Deserialize)]
pub struct EntryVersionPayload {
    pub operation_id: String,
    pub expected_revision: u64,
}

pub async fn submit_entry(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<EntryVersionPayload>,
) -> Result<Json<Entry>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .registration_command(
                &claims,
                &chapter_id,
                &payload.operation_id,
                crate::repository::RegistrationCommand::Submit {
                    event_id,
                    entry_id,
                    expected_revision: payload.expected_revision,
                },
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = payload;
    let mut store = state.store.write().await;
    access::entry_access(&store, &claims, &chapter_id, &event_id, &entry_id, true)?;
    let entry = store
        .submit_entry(&chapter_id, &entry_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(entry))
}

pub async fn list_entries(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .authorized_page(
                &claims,
                &chapter_id,
                crate::repository::ReadScope::Entries(event_id),
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|v| Json(json!(v)))
            .map_err(StatusCode::from);
    }
    let _ = query;
    let store = state.store.read().await;
    store
        .assert_event(&chapter_id, &event_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let entries = store
        .list_entries_by_event(&chapter_id, &event_id)
        .into_iter()
        .filter(|entry| {
            access::entry_access(&store, &claims, &chapter_id, &event_id, &entry.id, false).is_ok()
        })
        .collect::<Vec<_>>();
    Ok(Json(json!(entries)))
}

#[derive(Deserialize)]
pub struct UpdateEntryRosterPayload {
    pub operation_id: String,
    pub expected_revision: u64,
    pub roster: Vec<String>,
}

pub async fn update_entry_roster(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<UpdateEntryRosterPayload>,
) -> Result<Json<Entry>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .registration_command(
                &claims,
                &chapter_id,
                &payload.operation_id,
                crate::repository::RegistrationCommand::Roster {
                    event_id,
                    entry_id,
                    uids: payload.roster,
                    expected_revision: payload.expected_revision,
                },
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::entry_access(&store, &claims, &chapter_id, &event_id, &entry_id, true)?;
    let selected = payload
        .roster
        .into_iter()
        .map(|uid| CrewMember {
            uid,
            name: String::new(),
            role: MemberRole::Dancer,
            is_minor: false,
            consent_verified: false,
        })
        .collect();
    let entry = store
        .update_entry_roster(&chapter_id, &entry_id, selected)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(entry))
}

#[derive(Deserialize)]
pub struct ReviewEntryPayload {
    pub operation_id: String,
    pub expected_revision: u64,
    pub status: EntryStatus,
}

pub async fn review_entry(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ReviewEntryPayload>,
) -> Result<Json<Entry>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .registration_command(
                &claims,
                &chapter_id,
                &payload.operation_id,
                crate::repository::RegistrationCommand::Review {
                    event_id,
                    entry_id,
                    status: payload.status,
                    expected_revision: payload.expected_revision,
                },
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::require_role(&claims, &["registrar", "chapter_director"])?;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    store
        .assert_entry(&chapter_id, &event_id, &entry_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let entry = store
        .review_entry(&chapter_id, &entry_id, payload.status)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(entry))
}

pub async fn submit_guardian_consent(
    State(state): State<AppState>,
    Path((chapter_id, crew_id, member_uid)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<SubmitGuardianConsentPayload>,
) -> Result<Json<GuardianConsentReceipt>, StatusCode> {
    let _claims = authenticate(&state, &headers, &chapter_id).await?;
    let _ = (crew_id, member_uid, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn update_entry_audio(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<UploadAudioPayload>,
) -> Result<Json<AudioUploadReceipt>, StatusCode> {
    let _claims = authenticate(&state, &headers, &chapter_id).await?;
    let _ = (event_id, entry_id, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn export_dj_playlist(
    State(state): State<AppState>,
    Path((chapter_id, event_id, division_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<DJExportManifest>, StatusCode> {
    let _claims = authenticate(&state, &headers, &chapter_id).await?;
    let _ = (event_id, division_id);
    Err(StatusCode::NOT_IMPLEMENTED)
}
