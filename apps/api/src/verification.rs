use crate::{
    domain::{VerificationCase, VerificationPurpose, VerificationStatus},
    registration::{authenticate, AppState, PageQuery},
};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreateVerificationPayload {
    pub purpose: VerificationPurpose,
    pub operation_id: String,
}

#[derive(Deserialize)]
pub struct ReviewVerificationPayload {
    pub status: VerificationStatus,
    pub note: Option<String>,
    pub operation_id: String,
}

#[derive(Deserialize)]
#[cfg(feature = "firestore")]
struct StorageObjectMetadata {
    name: String,
    bucket: String,
    #[serde(rename = "contentType")]
    content_type: String,
    size: String,
}

#[cfg(feature = "firestore")]
fn encode_path(value: &str) -> String {
    value.bytes().fold(String::new(), |mut encoded, byte| {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
        encoded
    })
}

#[cfg(feature = "firestore")]
async fn storage_metadata(path: &str, token: &str) -> Result<StorageObjectMetadata, StatusCode> {
    if token.is_empty() || token.len() > 8192 || token.chars().any(char::is_control) {
        return Err(StatusCode::UNAUTHORIZED);
    }
    let project = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into());
    if project != "demo-wsb"
        && std::env::var("WSB_ALLOW_PRODUCTION_STORAGE").as_deref() != Ok("true")
    {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    let bucket = std::env::var("FIREBASE_STORAGE_BUCKET")
        .unwrap_or_else(|_| format!("{project}.appspot.com"));
    let origin = std::env::var("WSB_STORAGE_API_ORIGIN")
        .unwrap_or_else(|_| "https://firebasestorage.googleapis.com".into());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    let response = client
        .get(format!(
            "{}/v0/b/{}/o/{}",
            origin.trim_end_matches('/'),
            bucket,
            encode_path(path)
        ))
        .header("Authorization", format!("Firebase {token}"))
        .send()
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    if response.status() == reqwest::StatusCode::UNAUTHORIZED
        || response.status() == reqwest::StatusCode::FORBIDDEN
    {
        return Err(StatusCode::FORBIDDEN);
    }
    if !response.status().is_success() {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    response.json().await.map_err(|_| StatusCode::BAD_GATEWAY)
}

pub async fn list(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Query(query): Query<PageQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .verification_cases(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
            .await
            .map(|page| Json(serde_json::json!(page)))
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn create(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateVerificationPayload>,
) -> Result<Json<VerificationCase>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .create_verification_case(&claims, &chapter, payload.purpose, &payload.operation_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn submit(
    State(state): State<AppState>,
    Path((chapter, case_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<VerificationCase>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let value = repository
            .verification_upload_case(&claims, &chapter, &case_id)
            .await
            .map_err(StatusCode::from)?;
        let token = headers
            .get("x-firebase-id-token")
            .and_then(|v| v.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;
        let metadata = storage_metadata(&value.storage_path, token).await?;
        let expected_bucket = std::env::var("FIREBASE_STORAGE_BUCKET").unwrap_or_else(|_| {
            format!(
                "{}.appspot.com",
                std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into())
            )
        });
        if metadata.name != value.storage_path || metadata.bucket != expected_bucket {
            return Err(StatusCode::FORBIDDEN);
        }
        let size_bytes = metadata
            .size
            .parse()
            .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)?;
        return repository
            .submit_verification_case(
                &claims,
                &chapter,
                &case_id,
                &metadata.content_type,
                size_bytes,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, case_id);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn review(
    State(state): State<AppState>,
    Path((chapter, case_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ReviewVerificationPayload>,
) -> Result<Json<VerificationCase>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let case = repository
            .verification_review_case(&claims, &chapter, &case_id)
            .await
            .map_err(StatusCode::from)?;
        let token = headers
            .get("x-firebase-id-token")
            .and_then(|v| v.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;
        let metadata = storage_metadata(&case.storage_path, token).await?;
        let expected_bucket = std::env::var("FIREBASE_STORAGE_BUCKET").unwrap_or_else(|_| {
            format!(
                "{}.appspot.com",
                std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into())
            )
        });
        if metadata.name != case.storage_path
            || metadata.bucket != expected_bucket
            || case.content_type.as_deref() != Some(&metadata.content_type)
            || case.size_bytes != metadata.size.parse::<u64>().ok()
        {
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }
        return repository
            .review_verification_case(
                &claims,
                &chapter,
                &case_id,
                payload.status,
                payload.note,
                &payload.operation_id,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = (claims, case_id, payload);
    Err(StatusCode::NOT_IMPLEMENTED)
}
