use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;

use crate::domain::{
    FinanceSummary, PaymentQuote, PaymentRecord, VerificationCase, VerificationStatus,
};
use crate::registration::{authenticate, AppState};

pub async fn get_payment_quote(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<PaymentQuote>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let quote = store
        .get_payment_quote(&chapter_id, &event_id, &entry_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(quote))
}

#[derive(Deserialize)]
pub struct ProcessPaymentPayload {
    pub provider_reference: String,
}

pub async fn process_payment(
    State(state): State<AppState>,
    Path((chapter_id, _event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ProcessPaymentPayload>,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let payment = store
        .process_payment(
            &chapter_id,
            &entry_id,
            &claims.sub,
            &payload.provider_reference,
        )
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(payment))
}

pub async fn refund_payment(
    State(state): State<AppState>,
    Path((chapter_id, payment_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let payment = store
        .refund_payment(&chapter_id, &payment_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(payment))
}

pub async fn list_payments(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Vec<PaymentRecord>>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let payments = store.list_payments(&chapter_id);
    Ok(Json(payments))
}

pub async fn get_finance_summary(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<FinanceSummary>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let summary = store.get_finance_summary(&chapter_id);
    Ok(Json(summary))
}

pub async fn list_verification_cases(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Vec<VerificationCase>>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let store = state.store.read().await;
    let cases = store.list_verification_cases(&chapter_id);
    Ok(Json(cases))
}

#[derive(Deserialize)]
pub struct SubmitVerificationPayload {
    pub dancer_name: String,
    pub is_minor: bool,
    pub document_type: String,
}

pub async fn submit_verification_case(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<SubmitVerificationPayload>,
) -> Result<Json<VerificationCase>, StatusCode> {
    let claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let case = store.submit_verification_case(
        &chapter_id,
        &claims.sub,
        &payload.dancer_name,
        payload.is_minor,
        &payload.document_type,
    );
    Ok(Json(case))
}

#[derive(Deserialize)]
pub struct ReviewVerificationPayload {
    pub status: VerificationStatus,
    pub note: Option<String>,
}

pub async fn review_verification_case(
    State(state): State<AppState>,
    Path((chapter_id, case_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ReviewVerificationPayload>,
) -> Result<Json<VerificationCase>, StatusCode> {
    let _claims = authenticate(&state.verifier, &headers, &chapter_id).await?;
    let mut store = state.store.write().await;
    let case = store
        .review_verification_case(&chapter_id, &case_id, payload.status, payload.note)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(case))
}
