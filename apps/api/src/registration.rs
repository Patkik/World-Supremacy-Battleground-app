use crate::access;
use std::sync::Arc;
use tokio::sync::RwLock;

use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::Response,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::auth::{self, Claims, Verifier};
use crate::domain::{
    AudioUploadReceipt, Crew, CrewInvitation, CrewMember, DivisionPolicyDraft, Entry,
    EntryReadiness, EntryStatus, Event, GuardianConsentReceipt, MemberRole,
    SubmitGuardianConsentPayload, UploadAudioPayload,
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

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateEventPayload {
    pub operation_id: String,
    pub reason: String,
    pub id: String,
    pub name: String,
    pub event_date: String,
    pub timezone: String,
    pub venue: String,
    pub rules_version: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateRegistrationWindowPayload {
    pub operation_id: String,
    pub reason: String,
    pub expected_revision: u64,
    pub opens_at_local: Option<String>,
    pub closes_at_local: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateEventDraftPayload {
    pub operation_id: String,
    pub reason: String,
    pub expected_revision: u64,
    pub name: String,
    pub event_date: String,
    pub timezone: String,
    pub venue: String,
    pub rules_version: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveDivisionPolicyDraftPayload {
    pub operation_id: String,
    pub reason: String,
    pub expected_revision: u64,
    pub name: String,
    pub min_members: usize,
    pub max_members: usize,
    pub max_duration_secs: u32,
    pub max_age: Option<u8>,
    pub fee_minor: u64,
    pub rules_source: String,
    pub rules_version: String,
    pub effective_date: String,
}

async fn inspect_audio_blocking(
    bytes: Vec<u8>,
    content_type: String,
) -> Result<crate::audio_inspection::AudioMetadata, StatusCode> {
    tokio::task::spawn_blocking(move || {
        crate::audio_inspection::inspect_audio(&bytes, &content_type)
    })
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)
}

pub async fn authenticate(
    state: &AppState,
    headers: &HeaderMap,
    expected_chapter: &str,
) -> Result<Claims, StatusCode> {
    let mut claims = authenticate_identity(state, headers).await?;

    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let member = repository
            .session_membership(&claims, expected_chapter)
            .await
            .map_err(StatusCode::from)?;
        if !auth::is_chapter_role(&member.role) {
            return Err(StatusCode::FORBIDDEN);
        }
        claims.chapter_id = Some(expected_chapter.to_owned());
        claims.role = Some(member.role);
        return Ok(claims);
    }
    let store = state.store.read().await;
    let role = access::current_membership_role(&store, &claims, expected_chapter)?;
    if !auth::is_chapter_role(&role) {
        return Err(StatusCode::FORBIDDEN);
    }
    claims.role = Some(role);
    claims.chapter_id = Some(expected_chapter.to_owned());
    Ok(claims)
}

pub async fn authenticate_identity(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Claims, StatusCode> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;

    state
        .verifier
        .verify(token)
        .await
        .map_err(crate::auth::VerifyError::status_code)
}

pub async fn list_account_chapters(
    State(state): State<AppState>,
    Query(query): Query<PageQuery>,
    headers: HeaderMap,
) -> Result<([(header::HeaderName, &'static str); 1], Json<Value>), StatusCode> {
    let claims = authenticate_identity(&state, &headers).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let page = repository
            .list_account_chapters(&claims, query.cursor, query.limit.unwrap_or(30))
            .await
            .map_err(StatusCode::from)?;
        return Ok(([(header::CACHE_CONTROL, "no-store")], Json(json!(page))));
    }
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
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

pub async fn create_event(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
    Json(command): Json<CreateEventPayload>,
) -> Result<Json<Event>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .create_event(&claims, &chapter_id, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn duty_event_access(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .duty_event_access(&claims, &chapter_id, &event_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, event_id);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_duty_events(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_duty_events(
                &claims,
                &chapter_id,
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

pub async fn list_managed_events(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_managed_events(
                &claims,
                &chapter_id,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_audit_records(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .chapter_audit_page(
                &claims,
                &chapter_id,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn update_registration_window(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(command): Json<UpdateRegistrationWindowPayload>,
) -> Result<Json<Event>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .update_registration_window(&claims, &chapter_id, &event_id, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, event_id, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn update_event_draft(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(command): Json<UpdateEventDraftPayload>,
) -> Result<Json<Event>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .update_event_draft(&claims, &chapter_id, &event_id, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, event_id, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_division_policy_drafts(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_division_policy_drafts(
                &claims,
                &chapter,
                &event,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, event, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn save_division_policy_draft(
    State(state): State<AppState>,
    Path((chapter, event, division_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(command): Json<SaveDivisionPolicyDraftPayload>,
) -> Result<Json<DivisionPolicyDraft>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .save_division_policy_draft(&claims, &chapter, &event, &division_id, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, event, division_id, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_division_policy_draft_versions(
    State(state): State<AppState>,
    Path((chapter, event, division_id)): Path<(String, String, String)>,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .division_policy_draft_versions(
                &claims,
                &chapter,
                &event,
                &division_id,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, event, division_id, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_event(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Event>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    if !matches!(
        claims.role.as_deref(),
        Some("chapter_director" | "registrar")
    ) {
        return Err(StatusCode::FORBIDDEN);
    }
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .event_details(&claims, &chapter_id, &event_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    let event = store
        .events
        .get(&event_id)
        .filter(|e| e.chapter_id == chapter_id)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(event))
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

pub async fn list_crew_invitations(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    axum::extract::Query(query): axum::extract::Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_crew_invitations(
                &claims,
                &chapter_id,
                &crew_id,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, crew_id, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

#[derive(Deserialize)]
pub struct RevokeCrewInvitationPayload {
    pub operation_id: String,
    pub token: Option<String>,
    pub invitation_id: Option<String>,
}

pub async fn revoke_invitation(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<RevokeCrewInvitationPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let command = match (payload.token, payload.invitation_id) {
            (Some(token), None) => {
                crate::repository::RegistrationCommand::RevokeInvite { crew_id, token }
            }
            (None, Some(invitation_id)) => {
                crate::repository::RegistrationCommand::RevokeInviteRef {
                    crew_id,
                    invitation_id,
                }
            }
            _ => return Err(StatusCode::BAD_REQUEST),
        };
        return repository
            .registration_command(&claims, &chapter_id, &payload.operation_id, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, crew_id, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

#[derive(Deserialize)]
pub struct RecoverCrewInvitationPayload {
    pub token: String,
}

pub async fn recover_crew_invitation(
    State(state): State<AppState>,
    Path((chapter_id, crew_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<RecoverCrewInvitationPayload>,
) -> Result<Json<Crew>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .recover_crew_invitation(&claims, &chapter_id, &crew_id, &payload.token)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, crew_id, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
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

#[derive(Deserialize)]
pub struct MusicSubmissionPayload {
    pub operation_id: String,
    pub expected_revision: u64,
    pub expected_version: u64,
}

#[derive(Deserialize)]
pub struct MusicReviewPayload {
    operation_id: String,
    expected_version: u64,
    decision: String,
    note: String,
}

#[derive(Deserialize)]
pub struct DraftMusicPolicyPayload {
    operation_id: String,
    expected_revision: u64,
    max_duration_ms: u64,
    grace_ms: u64,
    source: String,
}

pub async fn get_draft_music_policy(
    State(state): State<AppState>,
    Path((chapter, event, division)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(all(feature = "firestore", feature = "local-testing"))]
    if let Some(repository) = &state.durable {
        return repository
            .current_draft_music_policy(&claims, &chapter, &event, &division)
            .await
            .map(|value| Json(json!(value)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, division);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn save_draft_music_policy(
    State(state): State<AppState>,
    Path((chapter, event, division)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<DraftMusicPolicyPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(all(feature = "firestore", feature = "local-testing"))]
    if let Some(repository) = &state.durable {
        return repository
            .save_draft_music_policy(
                &claims,
                &chapter,
                &event,
                &division,
                &payload.operation_id,
                payload.expected_revision,
                payload.max_duration_ms,
                payload.grace_ms,
                &payload.source,
            )
            .await
            .map(|value| Json(json!(value)))
            .map_err(StatusCode::from);
    }
    let _ = (
        claims,
        event,
        division,
        payload.operation_id,
        payload.expected_revision,
        payload.max_duration_ms,
        payload.grace_ms,
        payload.source,
    );
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn review_submitted_music(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<MusicReviewPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(all(feature = "firestore", feature = "local-testing"))]
    if let Some(repository) = &state.durable {
        // Verify the submitted object and current reviewer access before recording a decision.
        let _audio = get_music_for_review(
            State(state.clone()),
            Path((chapter.clone(), event.clone(), entry.clone())),
            headers,
        )
        .await?;
        let reviewed = repository
            .review_music(
                &claims,
                &chapter,
                &event,
                &entry,
                &payload.operation_id,
                payload.expected_version,
                &payload.decision,
                &payload.note,
            )
            .await
            .map_err(StatusCode::from)?;
        return Ok(Json(json!(reviewed)));
    }
    let _ = (
        claims,
        event,
        entry,
        headers,
        payload.operation_id,
        payload.expected_version,
        payload.decision,
        payload.note,
    );
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn music_review_queue(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    Query(query): Query<PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .music_review_queue(
                &claims,
                &chapter,
                &event,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_music_submission(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .current_music_submission(&claims, &chapter, &event, &entry)
            .await
            .map(|value| Json(json!(value)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, entry);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_draft_music_advisory(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(all(feature = "firestore", feature = "local-testing"))]
    if let Some(repository) = &state.durable {
        return repository
            .draft_music_advisory(&claims, &chapter, &event, &entry)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, entry);
    Err(StatusCode::NOT_IMPLEMENTED)
}

/// Local-emulator reviewer access, with server-side assignment and digest checks.
pub async fn get_music_for_review(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<axum::response::Response, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(all(feature = "firestore", feature = "local-testing"))]
    if let Some(repository) = &state.durable {
        if std::env::var("FIREBASE_PROJECT_ID").ok().as_deref() != Some("demo-wsb") {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        let origin =
            std::env::var("WSB_STORAGE_API_ORIGIN").map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        let parsed = reqwest::Url::parse(&origin).map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        if parsed.scheme() != "http"
            || parsed.host_str() != Some("firebase")
            || parsed.path() != "/"
        {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        let (submission, intent) = repository
            .music_for_review(&claims, &chapter, &event, &entry)
            .await
            .map_err(StatusCode::from)?;
        let bucket = std::env::var("FIREBASE_STORAGE_BUCKET")
            .unwrap_or_else(|_| "demo-wsb.appspot.com".into());
        if bucket != "demo-wsb.appspot.com" {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        let encoded = intent
            .storage_path
            .bytes()
            .map(|b| {
                if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
                    (b as char).to_string()
                } else {
                    format!("%{b:02X}")
                }
            })
            .collect::<String>();
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        let mut response = client
            .get(format!(
                "{}/v0/b/{}/o/{}?alt=media",
                origin.trim_end_matches('/'),
                bucket,
                encoded
            ))
            .header("Authorization", "Bearer owner")
            .send()
            .await
            .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        if !response.status().is_success() {
            return Err(StatusCode::BAD_GATEWAY);
        }
        if response
            .content_length()
            .is_some_and(|length| length > crate::audio_inspection::MAX_WAV_BYTES as u64)
        {
            return Err(StatusCode::PAYLOAD_TOO_LARGE);
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| StatusCode::BAD_GATEWAY)?
        {
            if bytes
                .len()
                .checked_add(chunk.len())
                .is_none_or(|len| len > crate::audio_inspection::MAX_WAV_BYTES)
            {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }
            bytes.extend_from_slice(&chunk);
        }
        use sha2::{Digest, Sha256};
        let digest = Sha256::digest(&bytes)
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        if digest != submission.sha256 {
            return Err(StatusCode::CONFLICT);
        }
        let current = repository
            .music_for_review(&claims, &chapter, &event, &entry)
            .await
            .map_err(StatusCode::from)?;
        if current.0 != submission || current.1 != intent {
            return Err(StatusCode::CONFLICT);
        }
        return axum::http::Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, &submission.content_type)
            .header(header::CACHE_CONTROL, "private, no-store")
            .header("X-Content-Type-Options", "nosniff")
            .body(axum::body::Body::from(bytes))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR);
    }
    let _ = (claims, event, entry);
    Err(StatusCode::NOT_IMPLEMENTED)
}

/// Submit freshly inspected bytes for later review; this does not approve music.
pub async fn submit_stored_music(
    State(state): State<AppState>,
    Path((chapter, event, entry, intent)): Path<(String, String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<MusicSubmissionPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let Json(inspection) = inspect_stored_music(
            State(state.clone()),
            Path((
                chapter.clone(),
                event.clone(),
                entry.clone(),
                intent.clone(),
            )),
            headers,
        )
        .await?;
        let digest = inspection
            .get("sha256")
            .and_then(Value::as_str)
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
        let submission = repository
            .submit_music(
                &claims,
                &chapter,
                &event,
                &entry,
                &intent,
                &payload.operation_id,
                payload.expected_revision,
                payload.expected_version,
                digest,
            )
            .await
            .map_err(StatusCode::from)?;
        return Ok(Json(json!(submission)));
    }
    let _ = (claims, event, entry, intent, payload, headers);
    Err(StatusCode::NOT_IMPLEMENTED)
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

/// Inspect bytes only; this does not save a track or change readiness.
pub async fn inspect_entry_audio(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    request: axum::extract::Request,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    access::require_role(&claims, &["crew_manager"])?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        repository
            .authorize_audio_inspection(&claims, &chapter, &event, &entry)
            .await
            .map_err(StatusCode::from)?;
    } else {
        let store = state.store.read().await;
        access::entry_access(&store, &claims, &chapter, &event, &entry, true)?;
    }
    #[cfg(not(feature = "firestore"))]
    {
        let store = state.store.read().await;
        access::entry_access(&store, &claims, &chapter, &event, &entry, true)?;
    }
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::UNSUPPORTED_MEDIA_TYPE)?;
    let body = axum::body::to_bytes(request.into_body(), crate::audio_inspection::MAX_WAV_BYTES)
        .await
        .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;
    require_media_clean(&body).await?;
    let info = inspect_audio_blocking(body.to_vec(), content_type.to_owned()).await?;
    Ok(Json(
        json!({"format":info.format, "content_type":info.content_type, "duration_ms":info.duration_ms, "sample_rate":info.sample_rate, "channels":info.channels, "bits_per_sample":info.bits_per_sample, "saved":false}),
    ))
}

pub async fn create_music_intent(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<EntryVersionPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let intent = repository
            .create_music_intent(
                &claims,
                &chapter,
                &event,
                &entry,
                &payload.operation_id,
                payload.expected_revision,
            )
            .await
            .map_err(StatusCode::from)?;
        return Ok(Json(json!(intent)));
    }
    let _ = (claims, event, entry, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

/// Read and inspect the private object without accepting or approving it.
pub async fn inspect_stored_music(
    State(state): State<AppState>,
    Path((chapter, event, entry, intent_id)): Path<(String, String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let token = headers
            .get("x-firebase-id-token")
            .and_then(|v| v.to_str().ok())
            .filter(|v| !v.is_empty() && v.len() <= 8192)
            .ok_or(StatusCode::UNAUTHORIZED)?;
        let intent = repository
            .music_intent_for_inspection(&claims, &chapter, &event, &entry, &intent_id)
            .await
            .map_err(StatusCode::from)?;
        let project = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_default();
        if project != "demo-wsb" {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        let bucket = std::env::var("FIREBASE_STORAGE_BUCKET")
            .unwrap_or_else(|_| format!("{project}.appspot.com"));
        let origin =
            std::env::var("WSB_STORAGE_API_ORIGIN").map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        let encoded = intent
            .storage_path
            .bytes()
            .map(|b| {
                if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
                    (b as char).to_string()
                } else {
                    format!("%{b:02X}")
                }
            })
            .collect::<String>();
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        let mut response = client
            .get(format!(
                "{}/v0/b/{}/o/{}?alt=media",
                origin.trim_end_matches('/'),
                bucket,
                encoded
            ))
            .header("Authorization", format!("Firebase {token}"))
            .send()
            .await
            .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(StatusCode::NOT_FOUND);
        }
        if response.status() == reqwest::StatusCode::UNAUTHORIZED
            || response.status() == reqwest::StatusCode::FORBIDDEN
        {
            return Err(StatusCode::FORBIDDEN);
        }
        if !response.status().is_success() {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        if response
            .content_length()
            .is_some_and(|length| length > crate::audio_inspection::MAX_WAV_BYTES as u64)
        {
            return Err(StatusCode::PAYLOAD_TOO_LARGE);
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| StatusCode::BAD_GATEWAY)?
        {
            if bytes
                .len()
                .checked_add(chunk.len())
                .is_none_or(|len| len > crate::audio_inspection::MAX_WAV_BYTES)
            {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }
            bytes.extend_from_slice(&chunk);
        }
        require_media_clean(&bytes).await?;
        let content_type = response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(';').next())
            .ok_or(StatusCode::UNPROCESSABLE_ENTITY)?;
        use sha2::{Digest, Sha256};
        let digest = Sha256::digest(&bytes)
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect();
        let size_bytes = bytes.len() as u64;
        let info = inspect_audio_blocking(bytes, content_type.to_owned()).await?;
        let receipt = crate::repository::MusicInspectionReceipt {
            intent_id: intent.intent_id,
            chapter_id: chapter,
            event_id: event,
            entry_id: entry,
            owner_uid: claims.sub.clone(),
            entry_revision: intent.entry_revision,
            sha256: digest,
            size_bytes,
            format: info.format.into(),
            content_type: info.content_type.into(),
            duration_ms: info.duration_ms,
            sample_rate: info.sample_rate,
            channels: info.channels,
            bits_per_sample: info.bits_per_sample,
            malware_scan_status: Some("clean".into()),
        };
        repository
            .record_music_inspection(&claims, &receipt)
            .await
            .map_err(StatusCode::from)?;
        return Ok(Json(
            json!({"format":info.format,"content_type":info.content_type,"duration_ms":info.duration_ms,"sample_rate":info.sample_rate,"channels":info.channels,"bits_per_sample":info.bits_per_sample,"sha256":receipt.sha256,"saved":true,"approved":false}),
        ));
    }
    let _ = (claims, event, entry, intent_id, headers);
    Err(StatusCode::NOT_IMPLEMENTED)
}

async fn require_media_clean(bytes: &[u8]) -> Result<(), StatusCode> {
    match crate::malware_scan::require_clean(bytes).await {
        Ok(()) => Ok(()),
        Err(crate::malware_scan::ScanError::Infected) => Err(StatusCode::UNPROCESSABLE_ENTITY),
        Err(crate::malware_scan::ScanError::Unavailable) => Err(StatusCode::SERVICE_UNAVAILABLE),
        Err(crate::malware_scan::ScanError::InvalidSize) => Err(StatusCode::PAYLOAD_TOO_LARGE),
    }
}

pub async fn export_dj_playlist(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Response, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(all(feature = "firestore", feature = "local-testing"))]
    if let Some(repository) = &state.durable {
        if std::env::var("FIREBASE_PROJECT_ID").ok().as_deref() != Some("demo-wsb") {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        let origin =
            std::env::var("WSB_STORAGE_API_ORIGIN").map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        let parsed = reqwest::Url::parse(&origin).map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
        if parsed.scheme() != "http"
            || parsed.host_str() != Some("firebase")
            || parsed.path() != "/"
        {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        let bucket = std::env::var("FIREBASE_STORAGE_BUCKET")
            .unwrap_or_else(|_| "demo-wsb.appspot.com".into());
        if bucket != "demo-wsb.appspot.com" {
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
        let plan = repository
            .dj_export_plan(&claims, &chapter_id, &event_id)
            .await
            .map_err(StatusCode::from)?;
        let track_count = plan.items.len();
        let export_bytes = plan.uncompressed_bytes;
        let file_name = safe_export_component(&event_id);
        let (sender, receiver) = tokio::sync::mpsc::channel(8);
        let error_sender = sender.clone();
        tokio::spawn(async move {
            let result = write_dj_zip(sender, &origin, &bucket, plan).await;
            if result.is_err() {
                let _ = error_sender
                    .send(Err(std::io::Error::other(
                        "DJ export could not be completed; retry the download",
                    )))
                    .await;
            }
        });
        let body =
            axum::body::Body::from_stream(tokio_stream::wrappers::ReceiverStream::new(receiver));
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "application/zip")
            .header(
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"wsb-{file_name}.zip\""),
            )
            .header(header::CACHE_CONTROL, "private, no-store")
            .header(header::CONTENT_SECURITY_POLICY, "default-src 'none'")
            .header("X-Content-Type-Options", "nosniff")
            .header("X-WSB-Export-Track-Count", track_count.to_string())
            .header("X-WSB-Export-Bytes", export_bytes.to_string())
            .header(
                header::ACCESS_CONTROL_EXPOSE_HEADERS,
                "X-WSB-Export-Track-Count, X-WSB-Export-Bytes, Content-Disposition",
            )
            .body(body)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR);
    }
    let _ = (claims, event_id);
    Err(StatusCode::NOT_IMPLEMENTED)
}

#[cfg(all(feature = "firestore", feature = "local-testing"))]
type DJZipPermitFuture = std::pin::Pin<
    Box<
        dyn std::future::Future<
                Output = Result<
                    tokio::sync::mpsc::OwnedPermit<Result<axum::body::Bytes, std::io::Error>>,
                    tokio::sync::mpsc::error::SendError<()>,
                >,
            > + Send,
    >,
>;

#[cfg(all(feature = "firestore", feature = "local-testing"))]
struct DJZipChannelWriter {
    sender: tokio::sync::mpsc::Sender<Result<axum::body::Bytes, std::io::Error>>,
    pending: Option<DJZipPermitFuture>,
}

#[cfg(all(feature = "firestore", feature = "local-testing"))]
impl tokio::io::AsyncWrite for DJZipChannelWriter {
    fn poll_write(
        self: std::pin::Pin<&mut Self>,
        context: &mut std::task::Context<'_>,
        buffer: &[u8],
    ) -> std::task::Poll<std::io::Result<usize>> {
        use std::task::Poll;
        if buffer.is_empty() {
            return Poll::Ready(Ok(0));
        }
        let this = self.get_mut();
        if this.pending.is_none() {
            this.pending = Some(Box::pin(this.sender.clone().reserve_owned()));
        }
        match this
            .pending
            .as_mut()
            .expect("reserve future is set")
            .as_mut()
            .poll(context)
        {
            Poll::Pending => Poll::Pending,
            Poll::Ready(Err(_)) => Poll::Ready(Err(std::io::Error::new(
                std::io::ErrorKind::BrokenPipe,
                "DJ export receiver closed",
            ))),
            Poll::Ready(Ok(permit)) => {
                this.pending = None;
                let length = buffer.len().min(64 * 1024);
                permit.send(Ok(axum::body::Bytes::copy_from_slice(&buffer[..length])));
                Poll::Ready(Ok(length))
            }
        }
    }

    fn poll_flush(
        self: std::pin::Pin<&mut Self>,
        _context: &mut std::task::Context<'_>,
    ) -> std::task::Poll<std::io::Result<()>> {
        std::task::Poll::Ready(Ok(()))
    }

    fn poll_shutdown(
        self: std::pin::Pin<&mut Self>,
        _context: &mut std::task::Context<'_>,
    ) -> std::task::Poll<std::io::Result<()>> {
        std::task::Poll::Ready(Ok(()))
    }
}

#[cfg(all(feature = "firestore", feature = "local-testing"))]
async fn write_dj_zip(
    sender: tokio::sync::mpsc::Sender<Result<axum::body::Bytes, std::io::Error>>,
    origin: &str,
    bucket: &str,
    plan: crate::repository::DJExportPlan,
) -> Result<(), String> {
    use async_zip::tokio::write::ZipFileWriter;
    use async_zip::{Compression, ZipEntryBuilder};

    let mut zip = ZipFileWriter::with_tokio(DJZipChannelWriter {
        sender,
        pending: None,
    });
    let manifest = dj_export_manifest_csv(&plan);
    zip.write_entry_whole(
        ZipEntryBuilder::new("manifest.csv".into(), Compression::Stored),
        manifest.as_bytes(),
    )
    .await
    .map_err(|_| "Unable to write DJ export manifest".to_owned())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|_| "Unable to prepare private track download".to_owned())?;
    for item in plan.items {
        let encoded = item
            .storage_path
            .bytes()
            .map(|byte| {
                if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
                    (byte as char).to_string()
                } else {
                    format!("%{byte:02X}")
                }
            })
            .collect::<String>();
        let mut response = client
            .get(format!(
                "{}/v0/b/{}/o/{}?alt=media",
                origin.trim_end_matches('/'),
                bucket,
                encoded
            ))
            .header("Authorization", "Bearer owner")
            .send()
            .await
            .map_err(|_| "Unable to retrieve a reviewed track".to_owned())?;
        if !response.status().is_success()
            || response
                .content_length()
                .is_some_and(|length| length != item.size_bytes)
        {
            return Err("Reviewed track metadata changed".into());
        }
        let content_type = response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(';').next())
            .ok_or("Reviewed track has no content type")?
            .to_owned();
        if content_type != item.content_type {
            return Err("Reviewed track format changed".into());
        }
        let mut bytes = Vec::with_capacity(item.size_bytes as usize);
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| "Unable to read a reviewed track".to_owned())?
        {
            if bytes
                .len()
                .checked_add(chunk.len())
                .is_none_or(|length| length > crate::audio_inspection::MAX_WAV_BYTES)
            {
                return Err("Reviewed track exceeds the download limit".into());
            }
            bytes.extend_from_slice(&chunk);
        }
        use sha2::{Digest, Sha256};
        let digest = Sha256::digest(&bytes)
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        if bytes.len() as u64 != item.size_bytes || digest != item.sha256 {
            return Err("Reviewed track no longer matches its inspection receipt".into());
        }
        require_media_clean(&bytes).await.map_err(|_| {
            "Private media safety scanning is unavailable or rejected the track".to_owned()
        })?;
        zip.write_entry_whole(
            ZipEntryBuilder::new(item.export_path.into(), Compression::Stored),
            &bytes,
        )
        .await
        .map_err(|_| "Unable to package a reviewed track".to_owned())?;
    }
    zip.close()
        .await
        .map_err(|_| "Unable to finish the DJ export archive".to_owned())?;
    Ok(())
}

#[cfg(all(feature = "firestore", feature = "local-testing"))]
fn dj_export_manifest_csv(plan: &crate::repository::DJExportPlan) -> String {
    fn cell(value: &str) -> String {
        format!("\"{}\"", value.replace('"', "\"\""))
    }
    let mut output = String::from(
        "stage_id,lineup_revision,order,division_id,entry_id,crew_name,state,filename,duration_ms,format,sha256\r\n",
    );
    for item in &plan.items {
        output.push_str(&format!(
            "{},{},{},{},{},{},reviewed,{},{},{},{}\r\n",
            cell(&item.stage_id),
            item.lineup_revision,
            item.order,
            cell(&item.division_id),
            cell(&item.entry_id),
            cell(&item.crew_name),
            cell(&item.export_path),
            item.duration_ms,
            item.format,
            item.sha256,
        ));
    }
    for item in &plan.omitted {
        output.push_str(&format!(
            "{},{},{},{},{},{},{},,,,\r\n",
            cell(&item.stage_id),
            item.lineup_revision,
            item.order,
            cell(&item.division_id),
            cell(&item.entry_id),
            cell(&item.crew_name),
            cell(&item.status),
        ));
    }
    output
}

#[cfg(all(feature = "firestore", feature = "local-testing"))]
fn safe_export_component(value: &str) -> String {
    let cleaned: String = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .take(48)
        .collect();
    let trimmed = cleaned.trim_matches('_');
    if trimmed.is_empty() {
        "item".into()
    } else {
        trimmed.to_owned()
    }
}
