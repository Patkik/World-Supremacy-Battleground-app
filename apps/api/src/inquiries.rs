use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InquiryStatus {
    Open,
    InProgress,
    WaitingOnRequester,
    Resolved,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InquirySummary {
    pub id: String,
    pub chapter_id: String,
    pub subject: String,
    pub category: String,
    pub status: InquiryStatus,
    pub revision: u64,
    pub created_at: u64,
    pub updated_at: u64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Inquiry {
    pub summary: InquirySummary,
    pub requester_uid: Option<String>,
    pub requester_name: String,
    pub email: String,
    pub capability_hash: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InquiryMessage {
    pub sequence: u64,
    pub source: String,
    pub body: String,
    pub status: InquiryStatus,
    pub created_at: u64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InquiryStaffView {
    pub summary: InquirySummary,
    pub requester_name: String,
    pub email: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInquiry {
    pub operation_id: String,
    pub subject: String,
    pub category: String,
    pub requester_name: String,
    pub email: String,
    pub message: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InquiryUpdate {
    pub operation_id: String,
    pub expected_revision: u64,
    pub message: String,
    pub status: Option<InquiryStatus>,
}

#[cfg(feature = "firestore")]
pub mod http {
    use super::*;
    use crate::{
        registration::{authenticate, AppState, PageQuery},
        repository::{
            models::Page,
            support::{InquiryActor, InquiryThread},
        },
    };
    use axum::{
        extract::{Path, Query, State},
        http::{HeaderMap, StatusCode},
        Json,
    };

    fn repository(state: &AppState) -> Result<&crate::repository::FirestoreRepository, StatusCode> {
        state
            .durable
            .as_deref()
            .ok_or(StatusCode::SERVICE_UNAVAILABLE)
    }
    fn capability(headers: &HeaderMap) -> Result<String, StatusCode> {
        headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Contact "))
            .map(str::to_owned)
            .ok_or(StatusCode::NOT_FOUND)
    }
    pub async fn chapters(
        State(state): State<AppState>,
        Query(query): Query<PageQuery>,
    ) -> Result<Json<Page<crate::domain::Chapter>>, StatusCode> {
        repository(&state)?
            .contact_chapters(query.cursor, query.limit.unwrap_or(30))
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
    pub async fn create_contact(
        State(state): State<AppState>,
        Path(chapter): Path<String>,
        headers: HeaderMap,
        Json(body): Json<CreateInquiry>,
    ) -> Result<Json<InquirySummary>, StatusCode> {
        repository(&state)?
            .create_inquiry(&chapter, InquiryActor::Contact(capability(&headers)?), body)
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
    pub async fn contact_thread(
        State(state): State<AppState>,
        Path((chapter, id)): Path<(String, String)>,
        Query(query): Query<PageQuery>,
        headers: HeaderMap,
    ) -> Result<Json<InquiryThread>, StatusCode> {
        repository(&state)?
            .inquiry_thread(
                &chapter,
                &id,
                InquiryActor::Contact(capability(&headers)?),
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
    pub async fn update_contact(
        State(state): State<AppState>,
        Path((chapter, id)): Path<(String, String)>,
        headers: HeaderMap,
        Json(body): Json<InquiryUpdate>,
    ) -> Result<Json<InquirySummary>, StatusCode> {
        repository(&state)?
            .update_inquiry(
                &chapter,
                &id,
                InquiryActor::Contact(capability(&headers)?),
                body,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
    pub async fn create_support(
        State(state): State<AppState>,
        Path(chapter): Path<String>,
        headers: HeaderMap,
        Json(body): Json<CreateInquiry>,
    ) -> Result<Json<InquirySummary>, StatusCode> {
        let claims = authenticate(&state, &headers, &chapter).await?;
        repository(&state)?
            .create_inquiry(&chapter, InquiryActor::Member(claims), body)
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
    pub async fn support_thread(
        State(state): State<AppState>,
        Path((chapter, id)): Path<(String, String)>,
        Query(query): Query<PageQuery>,
        headers: HeaderMap,
    ) -> Result<Json<InquiryThread>, StatusCode> {
        let claims = authenticate(&state, &headers, &chapter).await?;
        repository(&state)?
            .inquiry_thread(
                &chapter,
                &id,
                InquiryActor::Member(claims),
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
    pub async fn update_support(
        State(state): State<AppState>,
        Path((chapter, id)): Path<(String, String)>,
        headers: HeaderMap,
        Json(body): Json<InquiryUpdate>,
    ) -> Result<Json<InquirySummary>, StatusCode> {
        let claims = authenticate(&state, &headers, &chapter).await?;
        repository(&state)?
            .update_inquiry(&chapter, &id, InquiryActor::Member(claims), body)
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
    pub async fn list_support(
        State(state): State<AppState>,
        Path(chapter): Path<String>,
        Query(query): Query<PageQuery>,
        headers: HeaderMap,
    ) -> Result<Json<Page<InquiryStaffView>>, StatusCode> {
        let claims = authenticate(&state, &headers, &chapter).await?;
        repository(&state)?
            .list_inquiries(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
            .await
            .map(Json)
            .map_err(StatusCode::from)
    }
}
