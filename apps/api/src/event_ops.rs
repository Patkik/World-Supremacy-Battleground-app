use crate::access;
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::domain::{BattleMatch, BattleVotePayload, CheckInRecord, PublishedResultSnapshot};
use crate::registration::{authenticate, AppState};

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct PublishDivisionPayload {
    #[serde(default)]
    pub allow_ties: Option<bool>,
}

#[derive(Deserialize)]
pub struct CheckInPayload {
    pub dancer_uid: String,
    pub entry_id: Option<String>,
}

#[derive(Serialize)]
pub struct CheckInPage {
    pub items: Vec<CheckInRecord>,
    pub next_page: Option<String>,
}

pub async fn get_stage(
    State(state): State<AppState>,
    Path((chapter, event, stage)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .stage_detail(&claims, &chapter, &event, &stage)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, stage);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_stage_lineup(
    State(state): State<AppState>,
    Path((chapter, event, stage)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .stage_lineup(&claims, &chapter, &event, &stage)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, stage);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn set_stage_hold(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let command = serde_json::from_value(payload).map_err(|_| StatusCode::BAD_REQUEST)?;
        return repository
            .stage_hold(&claims, &chapter, &event, command)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn set_stage_marshals(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let command = serde_json::from_value(payload).map_err(|_| StatusCode::BAD_REQUEST)?;
        return repository
            .stage_marshals(&claims, &chapter, &event, command)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn create_stage(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let command = serde_json::from_value(payload).map_err(|_| StatusCode::BAD_REQUEST)?;
        return repository
            .stage_create(&claims, &chapter, &event, command)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn configure_stage(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let command = serde_json::from_value(payload).map_err(|_| StatusCode::BAD_REQUEST)?;
        return repository
            .stage_configure(&claims, &chapter, &event, command)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn save_stage_lineup(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let command = serde_json::from_value(payload).map_err(|_| StatusCode::BAD_REQUEST)?;
        return repository
            .stage_lineup_save(&claims, &chapter, &event, command)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_stages(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .stage_list(
                &claims,
                &chapter,
                &event,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_stage_entries(
    State(state): State<AppState>,
    Path((chapter, event, stage)): Path<(String, String, String)>,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .stage_entry_list(
                &claims,
                &chapter,
                &event,
                &stage,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, stage, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_stage_history(
    State(state): State<AppState>,
    Path((chapter, event, stage)): Path<(String, String, String)>,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .stage_history(
                &claims,
                &chapter,
                &event,
                &stage,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, stage, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_stage_lineup_history(
    State(state): State<AppState>,
    Path((chapter, event, stage)): Path<(String, String, String)>,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .stage_lineup_history(
                &claims,
                &chapter,
                &event,
                &stage,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event, stage, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn update_stage_position(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let command = serde_json::from_value(payload).map_err(|_| StatusCode::BAD_REQUEST)?;
        return repository
            .stage_command(&claims, &chapter_id, &event_id, command)
            .await
            .map(|record| Json(serde_json::json!(record)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, event_id, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn check_in_dancer(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<CheckInPayload>,
) -> Result<Json<CheckInRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let entry_id = payload.entry_id.as_deref().ok_or(StatusCode::BAD_REQUEST)?;
        return repository
            .check_in(
                &claims,
                &chapter_id,
                &event_id,
                entry_id,
                &payload.dancer_uid,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::require_role(&claims, &["marshal", "chapter_director"])?;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let record = store
        .check_in_dancer(&chapter_id, &event_id, &payload.dancer_uid, &claims.sub)
        .map_err(|_| StatusCode::CONFLICT)?;
    Ok(Json(record))
}

pub async fn list_check_ins(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<Json<CheckInPage>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_check_ins(
                &claims,
                &chapter_id,
                &event_id,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|page| {
                Json(CheckInPage {
                    items: page.items,
                    next_page: page.next_page,
                })
            })
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    access::require_role(&claims, &["marshal", "registrar", "chapter_director"])?;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let records = store.list_check_ins(&chapter_id, &event_id);
    let limit = query.limit.unwrap_or(30);
    if limit == 0 || limit > 100 || query.cursor.is_some() {
        return Err(StatusCode::BAD_REQUEST);
    }
    Ok(Json(CheckInPage {
        items: records.into_iter().take(limit).collect(),
        next_page: None,
    }))
}

pub async fn list_battles(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> Result<Json<Vec<BattleMatch>>, StatusCode> {
    let store = state.store.read().await;
    let battles = store.list_battle_matches(&event_id);
    Ok(Json(battles))
}

pub async fn get_battle(
    State(state): State<AppState>,
    Path((event_id, match_id)): Path<(String, String)>,
) -> Result<Json<BattleMatch>, StatusCode> {
    let store = state.store.read().await;
    let battle = store
        .get_battle_match(&event_id, &match_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(battle))
}

pub async fn vote_battle(
    State(state): State<AppState>,
    Path((event_id, match_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<BattleVotePayload>,
) -> Result<Json<BattleMatch>, StatusCode> {
    let chapter = state
        .store
        .read()
        .await
        .events
        .get(&event_id)
        .ok_or(StatusCode::NOT_FOUND)?
        .chapter_id
        .clone();
    let claims = authenticate(&state, &headers, &chapter).await?;
    access::require_role(&claims, &["judge", "head_judge"])?;
    let mut store = state.store.write().await;
    access::require_event(&store, &claims, &chapter, &event_id)?;
    let record = store
        .vote_battle(&event_id, &match_id, &claims.sub, &payload.winner_corner)
        .map_err(|err| match err {
            "Invalid corner" | "Battle panel not configured" => StatusCode::BAD_REQUEST,
            "Judge not assigned to battle" => StatusCode::FORBIDDEN,
            "Match not found in event" | "Match not found" | "Battle match not found" => {
                StatusCode::NOT_FOUND
            }
            _ => StatusCode::CONFLICT,
        })?;
    Ok(Json(record))
}

pub async fn list_battles_chapter(
    State(state): State<AppState>,
    Path((chapter_id, event_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Vec<BattleMatch>>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let event = store.events.get(&event_id).ok_or(StatusCode::NOT_FOUND)?;
    if event.chapter_id != chapter_id {
        return Err(StatusCode::FORBIDDEN);
    }
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let battles = store.list_battle_matches(&event_id);
    Ok(Json(battles))
}

pub async fn get_battle_chapter(
    State(state): State<AppState>,
    Path((chapter_id, event_id, match_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<BattleMatch>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let event = store.events.get(&event_id).ok_or(StatusCode::NOT_FOUND)?;
    if event.chapter_id != chapter_id {
        return Err(StatusCode::FORBIDDEN);
    }
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let battle = store
        .get_battle_match(&event_id, &match_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(battle))
}

pub async fn vote_battle_chapter(
    State(state): State<AppState>,
    Path((chapter_id, event_id, match_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    payload: Json<BattleVotePayload>,
) -> Result<Json<BattleMatch>, StatusCode> {
    let chapter = state
        .store
        .read()
        .await
        .events
        .get(&event_id)
        .ok_or(StatusCode::NOT_FOUND)?
        .chapter_id
        .clone();
    if chapter_id != chapter {
        return Err(StatusCode::FORBIDDEN);
    }
    vote_battle(State(state), Path((event_id, match_id)), headers, payload).await
}

pub async fn publish_results(
    State(state): State<AppState>,
    Path((chapter_id, event_id, division_id)): Path<(String, String, String)>,
    Query(query): Query<PublishDivisionPayload>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<PublishedResultSnapshot>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    let payload_from_body: Option<PublishDivisionPayload> = if body.is_empty() {
        None
    } else {
        serde_json::from_slice(&body).ok()
    };
    let allow_ties = payload_from_body
        .and_then(|p| p.allow_ties)
        .or(query.allow_ties);
    let payload = PublishDivisionPayload { allow_ties };

    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .publish_division_results_with_payload(
                &claims,
                &chapter_id,
                &event_id,
                &division_id,
                Some(&payload),
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::require_role(&claims, &["head_judge", "chapter_director"])?;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let snapshot = store
        .publish_division_results_with_payload(&chapter_id, &event_id, &division_id, Some(&payload))
        .map_err(|err| {
            if err.contains("locked") || err.contains("tie policy") || err.contains("results") {
                StatusCode::CONFLICT
            } else {
                StatusCode::BAD_REQUEST
            }
        })?;
    store.record_audit(
        &chapter_id,
        &claims.sub,
        "division_published",
        &snapshot.publication_id,
    );
    Ok(Json(snapshot))
}

pub async fn get_published_snapshot(
    State(state): State<AppState>,
    Path((event_id, division_id)): Path<(String, String)>,
) -> Result<Json<PublishedResultSnapshot>, StatusCode> {
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .published_snapshot(&event_id, &division_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    let snapshot = store
        .get_published_snapshot(&event_id, &division_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(snapshot))
}

pub async fn list_published_results(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> Result<Json<Vec<PublishedResultSnapshot>>, StatusCode> {
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .published_event_results(&event_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    let mut projections: Vec<_> = store
        .published_results
        .values()
        .filter(|p| p.event_id == event_id)
        .cloned()
        .collect();
    projections.sort_by(|a, b| a.division_id.cmp(&b.division_id));
    Ok(Json(projections))
}
