use crate::access;
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
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .submit_score(&claims, &chapter_id, &event_id, &cmd)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }

    // Only judges or head judges may submit scores
    if !matches!(claims.role.as_deref(), Some("judge" | "head_judge")) {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut store = state.store.write().await;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let receipt = store
        .submit_score(&chapter_id, &event_id, &claims.sub, cmd)
        .map_err(|err| {
            if err.contains("locked") || err.contains("revision mismatch") {
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
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        repository
            .lock_division(&claims, &chapter_id, &event_id, &division_id)
            .await
            .map_err(StatusCode::from)?;
        return Ok(Json(
            json!({"event_id":event_id,"division_id":division_id,"locked":true,"authorized_by":claims.sub}),
        ));
    }

    // Locking requires head judge or chapter director authorization
    if !matches!(
        claims.role.as_deref(),
        Some("head_judge" | "chapter_director")
    ) {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut store = state.store.write().await;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    store
        .lock_division(&chapter_id, &event_id, &division_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    store.record_audit(&chapter_id, &claims.sub, "division_locked", &division_id);
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
    headers: HeaderMap,
) -> Result<Json<Vec<CrewResult>>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    access::require_role(&claims, &["head_judge", "chapter_director"])?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        if let Ok(snapshot) = repository.published_snapshot(&event_id, &division_id).await {
            if snapshot.chapter_id != chapter_id {
                return Err(StatusCode::FORBIDDEN);
            }
            return Ok(Json(snapshot.results));
        }
    }
    let store = state.store.read().await;
    access::require_event(&store, &claims, &chapter_id, &event_id)?;
    let results = store
        .get_division_results(&chapter_id, &event_id, &division_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(results))
}

#[derive(serde::Deserialize)]
pub struct ScoreStateQuery {
    pub crew_id: String,
}

pub async fn score_state(
    State(state): State<AppState>,
    Path((chapter, event, division)): Path<(String, String, String)>,
    axum::extract::Query(query): axum::extract::Query<ScoreStateQuery>,
    headers: HeaderMap,
) -> Result<Json<crate::domain::DivisionState>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .score_state(&claims, &chapter, &event, &division, &query.crew_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    access::require_role(&claims, &["judge", "head_judge"])?;
    let store = state.store.read().await;
    let status = store
        .division_state(&chapter, &event, &division, &query.crew_id, &claims.sub)
        .map_err(|_| StatusCode::FORBIDDEN)?;
    Ok(Json(status))
}

pub async fn score_assignment(
    State(state): State<AppState>,
    Path((chapter, event, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .score_assignment(&claims, &chapter, &event, &entry_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    access::require_role(&claims, &["judge", "head_judge"])?;
    let store = state.store.read().await;
    let entry = store
        .assert_entry(&chapter, &event, &entry_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    store
        .division_state(
            &chapter,
            &event,
            &entry.division_id,
            &entry.crew_id,
            &claims.sub,
        )
        .map_err(|_| StatusCode::FORBIDDEN)?;
    // Judges receive scorecard identifiers, never the private dancer roster or ledger.
    Ok(Json(
        json!({"entry_id": entry.id, "crew_id": entry.crew_id, "division_id": entry.division_id}),
    ))
}

pub async fn assigned_lineup(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    headers: HeaderMap,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .authorized_page(
                &claims,
                &chapter,
                crate::repository::ReadScope::JudgeLineup(event),
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|v| Json(json!(v)))
            .map_err(StatusCode::from);
    }
    access::require_role(&claims, &["judge", "head_judge"])?;
    let store = state.store.read().await;
    access::require_event(&store, &claims, &chapter, &event)?;
    let mut all_assignments = Vec::new();
    for entry in store.list_entries_by_event(&chapter, &event) {
        if entry.status == crate::domain::EntryStatus::Approved
            && store.has_judge_assignment(&event, &entry.division_id, &claims.sub)
        {
            let score_key =
                crate::store::scope_key(&[&event, &entry.division_id, &entry.crew_id, &claims.sub]);
            let completed = store.scores.contains_key(&score_key);
            all_assignments.push(json!({
                "event_id": event,
                "division_id": entry.division_id,
                "entry_id": entry.id,
                "crew_id": entry.crew_id,
                "completed": completed,
            }));
        }
    }
    let limit = query.limit.unwrap_or(30).min(100);
    if limit == 0 {
        return Ok(Json(json!({
            "items": [],
            "next_page": null,
            "total": all_assignments.len(),
        })));
    }
    let start_idx = query
        .cursor
        .as_deref()
        .and_then(|c| c.parse::<usize>().ok())
        .unwrap_or(0);
    let total = all_assignments.len();
    let items: Vec<_> = all_assignments
        .into_iter()
        .skip(start_idx)
        .take(limit)
        .collect();
    let next_page = if start_idx + limit < total {
        Some((start_idx + limit).to_string())
    } else {
        None
    };
    Ok(Json(json!({
        "items": items,
        "next_page": next_page,
        "total": total,
    })))
}

#[derive(serde::Deserialize)]
pub struct DeductionPayload {
    pub crew_id: String,
    pub expected_revision: u64,
    pub deductions: Vec<crate::domain::Deduction>,
}

pub async fn set_deductions(
    State(state): State<AppState>,
    Path((chapter, event, division)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<DeductionPayload>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let revision = repository
            .set_deductions(
                &claims,
                &chapter,
                &event,
                crate::repository::DeductionUpdate {
                    division_id: division.clone(),
                    crew_id: payload.crew_id.clone(),
                    expected_revision: payload.expected_revision,
                    deductions: payload.deductions.clone(),
                },
            )
            .await
            .map_err(StatusCode::from)?;
        return Ok(Json(json!({"revision":revision})));
    }
    access::require_role(&claims, &["head_judge"])?;
    let mut store = state.store.write().await;
    access::require_event(&store, &claims, &chapter, &event)?;
    let revision = store
        .set_deductions(
            &chapter,
            &event,
            &division,
            &payload.crew_id,
            payload.expected_revision,
            payload.deductions,
        )
        .map_err(|_| StatusCode::CONFLICT)?;
    store.record_audit(
        &chapter,
        &claims.sub,
        "deductions_updated",
        &payload.crew_id,
    );
    Ok(Json(json!({"revision": revision})))
}
