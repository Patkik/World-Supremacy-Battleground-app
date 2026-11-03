#[cfg(feature = "firestore")]
use crate::registration::AppState;
#[cfg(feature = "firestore")]
use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    Json,
};
#[cfg(feature = "firestore")]
use serde_json::{json, Value};

/// Confirms a signed identity against the separately provisioned global authority record.
#[cfg(feature = "firestore")]
pub async fn session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<([(header::HeaderName, &'static str); 1], Json<Value>), StatusCode> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;
    let claims = state
        .verifier
        .verify(token)
        .await
        .map_err(crate::auth::VerifyError::status_code)?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let member = repository
        .global_membership(&claims)
        .await
        .map_err(StatusCode::from)?;
    Ok((
        [(header::CACHE_CONTROL, "no-store")],
        Json(json!({"uid": claims.sub, "role": member.role})),
    ))
}

/// Returns safe configuration indicators and live Firestore reachability to HQ admins.
/// This endpoint never returns secret values or claims that external providers were pinged.
#[cfg(feature = "firestore")]
pub async fn integrations(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<([(header::HeaderName, &'static str); 1], Json<Value>), StatusCode> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    repository
        .global_membership(&claims)
        .await
        .map_err(StatusCode::from)?;

    let database_reachable = repository.readiness_probe().await.is_ok();
    let project_id = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into());
    let storage_mode = if state.durable.is_some() {
        "firestore"
    } else {
        "memory"
    };
    let webhook_secret_configured = std::env::var("PAYMONGO_WEBHOOK_SECRET")
        .ok()
        .is_some_and(|secret| secret.trim().len() >= 32);
    let webhook_mode = match std::env::var("PAYMONGO_LIVE_MODE").as_deref() {
        Ok("true") => "live",
        Ok("false") => "test",
        _ => "missing_or_invalid",
    };
    let checkout_configured = crate::paymongo::PaymongoClient::from_env().is_some();
    let webhook_ready = webhook_secret_configured && webhook_mode != "missing_or_invalid";
    let private_storage_configured = std::env::var("FIREBASE_STORAGE_BUCKET")
        .ok()
        .is_some_and(|value| !value.trim().is_empty());
    let storage_gateway_configured = std::env::var("WSB_STORAGE_API_ORIGIN")
        .ok()
        .is_some_and(|value| !value.trim().is_empty());
    let malware_scanner_configured = std::env::var("WSB_CLAMD_ADDRESS")
        .ok()
        .is_some_and(|value| !value.trim().is_empty());

    Ok((
        [(header::CACHE_CONTROL, "no-store")],
        Json(json!({
            "checked_at": crate::store::now_secs(),
            "release_ready": false,
            "database": {
                "project_id": project_id,
                "storage_mode": storage_mode,
                "reachable": database_reachable,
            },
            "paymongo": {
                "checkout_configured": checkout_configured,
                "webhook_secret_configured": webhook_secret_configured,
                "webhook_mode": webhook_mode,
                "webhook_ready": webhook_ready,
                "provider_connectivity_checked": false,
            },
            "private_media": {
                "storage_bucket_configured": private_storage_configured,
                "storage_gateway_configured": storage_gateway_configured,
                "malware_scanner_configured": malware_scanner_configured,
                "external_connectivity_checked": false,
            },
        })),
    ))
}

#[cfg(feature = "firestore")]
async fn verified_claims(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<crate::auth::Claims, StatusCode> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;
    state
        .verifier
        .verify(token)
        .await
        .map_err(crate::auth::VerifyError::status_code)
}

#[cfg(feature = "firestore")]
pub async fn notification_queue_health(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<
    (
        [(header::HeaderName, &'static str); 1],
        Json<crate::repository::notifications::NotificationQueueHealth>,
    ),
    StatusCode,
> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let result = repository
        .notification_queue_health(&claims)
        .await
        .map_err(StatusCode::from)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(result)))
}

/// Returns platform-wide chapter and event counts to current HQ admins.
/// The two aggregate reads do not represent one consistent snapshot.
#[cfg(feature = "firestore")]
pub async fn overview(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<([(header::HeaderName, &'static str); 1], Json<Value>), StatusCode> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let (chapters, events) = repository
        .hq_overview_counts(&claims)
        .await
        .map_err(StatusCode::from)?;
    Ok((
        [(header::CACHE_CONTROL, "no-store")],
        Json(json!({
            "checked_at": crate::store::now_secs(),
            "chapters": {"total": chapters},
            "events": {"total": events},
            "chapter_health": "unavailable",
            "approved_global_publications": "unavailable",
        })),
    ))
}

#[cfg(feature = "firestore")]
pub async fn chapter_members(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    Query(query): Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<
    (
        [(header::HeaderName, &'static str); 1],
        Json<crate::repository::MembershipPage>,
    ),
    StatusCode,
> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let page = repository
        .list_chapter_staff_as_hq(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
        .await
        .map_err(StatusCode::from)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(page)))
}

#[cfg(feature = "firestore")]
pub async fn chapters(
    State(state): State<AppState>,
    Query(query): Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<
    (
        [(header::HeaderName, &'static str); 1],
        Json<crate::repository::models::Page<crate::domain::Chapter>>,
    ),
    StatusCode,
> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let page = repository
        .list_hq_chapters(&claims, query.cursor, query.limit.unwrap_or(30))
        .await
        .map_err(StatusCode::from)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(page)))
}

#[cfg(feature = "firestore")]
pub async fn change_chapter_member(
    State(state): State<AppState>,
    Path((chapter, uid)): Path<(String, String)>,
    headers: HeaderMap,
    Json(command): Json<crate::repository::ChangeMembership>,
) -> Result<
    (
        [(header::HeaderName, &'static str); 1],
        Json<crate::repository::MembershipRecord>,
    ),
    StatusCode,
> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    if let Some(record) = repository
        .hq_staff_change_replay(&claims, &chapter, &uid, &command)
        .await
        .map_err(StatusCode::from)?
    {
        return Ok(([(header::CACHE_CONTROL, "no-store")], Json(record)));
    }
    if command.active {
        state
            .verifier
            .verify_target_account_active(&uid)
            .await
            .map_err(crate::auth::VerifyError::status_code)?;
    }
    let record = repository
        .change_chapter_staff_as_hq(&claims, &chapter, &uid, command)
        .await
        .map_err(StatusCode::from)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(record)))
}

#[cfg(feature = "firestore")]
pub async fn applications(
    State(state): State<AppState>,
    Query(query): Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<
    (
        [(header::HeaderName, &'static str); 1],
        Json<crate::repository::models::Page<crate::inquiries::InquiryStaffView>>,
    ),
    StatusCode,
> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let page = repository
        .list_hq_applications(&claims, query.cursor, query.limit.unwrap_or(30))
        .await
        .map_err(StatusCode::from)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(page)))
}

#[cfg(feature = "firestore")]
pub async fn application_thread(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(query): Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<
    (
        [(header::HeaderName, &'static str); 1],
        Json<crate::repository::support::InquiryThread>,
    ),
    StatusCode,
> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let thread = repository
        .hq_application_thread(&claims, &id, query.cursor, query.limit.unwrap_or(30))
        .await
        .map_err(StatusCode::from)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(thread)))
}

#[cfg(feature = "firestore")]
pub async fn update_application(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<crate::inquiries::InquiryUpdate>,
) -> Result<
    (
        [(header::HeaderName, &'static str); 1],
        Json<crate::inquiries::InquirySummary>,
    ),
    StatusCode,
> {
    let claims = verified_claims(&state, &headers).await?;
    let repository = state
        .durable
        .as_ref()
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let summary = repository
        .update_hq_application(&claims, &id, body)
        .await
        .map_err(StatusCode::from)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(summary)))
}
