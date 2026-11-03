use crate::registration::{authenticate, AppState};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
pub struct CreateRequest {
    operation_id: String,
    guardian_uid: String,
}
#[derive(Deserialize)]
pub struct RespondRequest {
    operation_id: String,
    expected_revision: u64,
    decision: String,
}
#[derive(Deserialize)]
pub struct WithdrawRequest {
    operation_id: String,
    expected_revision: u64,
}

pub async fn withdraw(
    State(state): State<AppState>,
    Path((chapter, request)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<WithdrawRequest>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "local-testing")]
    if let Some(repository) = &state.durable {
        return repository
            .withdraw_guardian_request(
                &claims,
                &chapter,
                &request,
                &payload.operation_id,
                payload.expected_revision,
            )
            .await
            .map(|v| Json(serde_json::json!(v)))
            .map_err(StatusCode::from);
    }
    let _ = (
        claims,
        request,
        payload.operation_id,
        payload.expected_revision,
    );
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    Query(query): Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "local-testing")]
    if let Some(repository) = &state.durable {
        return repository
            .guardian_requests(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn read(
    State(state): State<AppState>,
    Path((chapter, request)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "local-testing")]
    if let Some(repository) = &state.durable {
        return repository
            .guardian_request(&claims, &chapter, &request)
            .await
            .map(|value| Json(serde_json::json!(value)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, request);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn create(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateRequest>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "local-testing")]
    if let Some(repository) = &state.durable {
        return repository
            .request_guardian(
                &claims,
                &chapter,
                &payload.operation_id,
                &payload.guardian_uid,
            )
            .await
            .map(|v| Json(serde_json::json!(v)))
            .map_err(StatusCode::from);
    }
    let _ = (claims, payload.operation_id, payload.guardian_uid);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn respond(
    State(state): State<AppState>,
    Path((chapter, request)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<RespondRequest>,
) -> Result<Json<Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "local-testing")]
    if let Some(repository) = &state.durable {
        return repository
            .respond_guardian(
                &claims,
                &chapter,
                &request,
                &payload.operation_id,
                payload.expected_revision,
                &payload.decision,
            )
            .await
            .map(|v| Json(serde_json::json!(v)))
            .map_err(StatusCode::from);
    }
    let _ = (
        claims,
        request,
        payload.operation_id,
        payload.expected_revision,
        payload.decision,
    );
    Err(StatusCode::NOT_IMPLEMENTED)
}
