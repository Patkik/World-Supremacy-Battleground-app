use crate::registration::{authenticate, AppState, PageQuery};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};

pub async fn list(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    Query(query): Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_notifications(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
            .await
            .and_then(|page| {
                serde_json::to_value(page).map(Json).map_err(|_| {
                    crate::repository::RepositoryError::Denied(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Invalid notification response",
                    )
                })
            })
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn mark_read(
    State(state): State<AppState>,
    Path((chapter, notification_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .mark_notification_read(&claims, &chapter, &notification_id)
            .await
            .and_then(|notification| {
                serde_json::to_value(notification).map(Json).map_err(|_| {
                    crate::repository::RepositoryError::Denied(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Invalid notification response",
                    )
                })
            })
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, notification_id);
    Err(StatusCode::NOT_IMPLEMENTED)
}
