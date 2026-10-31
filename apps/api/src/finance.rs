use crate::access;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;
use serde_json::json;

use crate::domain::{
    FinanceSummary, PaymentQuote, PaymentRecord, SyntheticWebhookPayload, WebhookReceipt,
};
use crate::registration::{authenticate, AppState};
use crate::store::{constant_time_eq, hmac_sha256};

pub async fn local_paymongo_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, StatusCode> {
    #[cfg(feature = "local-testing")]
    if state.local_identity.is_some() {
        let secret = std::env::var("WSB_PAYMONGO_LOCAL_SECRET")
            .ok()
            .filter(|v| v.len() >= 32)
            .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
        let signature = headers
            .get("paymongo-signature")
            .and_then(|v| v.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;
        if !crate::paymongo::verify_signature(
            signature,
            &body,
            secret.as_bytes(),
            false,
            crate::store::now_secs(),
            300,
        ) {
            return Err(StatusCode::UNAUTHORIZED);
        }
        let value: serde_json::Value =
            serde_json::from_slice(&body).map_err(|_| StatusCode::BAD_REQUEST)?;
        let data = &value["data"];
        let attributes = &data["attributes"];
        let session = &attributes["data"];
        let details = &session["attributes"];
        if data["type"] != "event"
            || attributes["type"] != "checkout_session.payment.paid"
            || attributes["livemode"] != false
            || session["type"] != "checkout_session"
            || details["livemode"] != false
        {
            return Err(StatusCode::BAD_REQUEST);
        }
        let payments = details["payments"]
            .as_array()
            .ok_or(StatusCode::BAD_REQUEST)?;
        let paid: Vec<_> = payments
            .iter()
            .filter(|p| p["type"] == "payment" && p["attributes"]["status"] == "paid")
            .collect();
        if paid.len() != 1 || paid[0]["attributes"]["livemode"] != false {
            return Err(StatusCode::BAD_REQUEST);
        }
        let event = crate::repository::paymongo_local::LocalPaidEvent {
            event_id: data["id"]
                .as_str()
                .ok_or(StatusCode::BAD_REQUEST)?
                .to_owned(),
            session_id: session["id"]
                .as_str()
                .ok_or(StatusCode::BAD_REQUEST)?
                .to_owned(),
            reference: details["reference_number"]
                .as_str()
                .ok_or(StatusCode::BAD_REQUEST)?
                .to_owned(),
            amount_minor: paid[0]["attributes"]["amount"]
                .as_u64()
                .ok_or(StatusCode::BAD_REQUEST)?,
            currency: paid[0]["attributes"]["currency"]
                .as_str()
                .ok_or(StatusCode::BAD_REQUEST)?
                .to_owned(),
        };
        let repo = state
            .durable
            .as_ref()
            .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
        return repo
            .settle_local_checkout(&event)
            .await
            .map(|_| Json(json!({"received":true})))
            .map_err(StatusCode::from);
    }
    let _ = (state, headers, body);
    Err(StatusCode::NOT_FOUND)
}

pub async fn get_payment_quote(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<PaymentQuote>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .payment_quote(&claims, &chapter_id, &event_id, &entry_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    access::entry_access(&store, &claims, &chapter_id, &event_id, &entry_id, false)?;
    let quote = store
        .get_payment_quote(&chapter_id, &event_id, &entry_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(quote))
}

#[derive(Deserialize)]
pub struct LocalCheckoutPayload {
    pub operation_id: String,
    pub amount_minor: Option<u64>,
}

pub async fn list_local_checkouts(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    #[cfg(feature = "local-testing")]
    if state.local_identity.is_some() {
        let claims = authenticate(&state, &headers, &chapter).await?;
        let repository = state
            .durable
            .as_ref()
            .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
        return repository
            .list_local_checkouts(
                &claims,
                &chapter,
                &event,
                &entry,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|r| Json(json!(r)))
            .map_err(StatusCode::from);
    }
    let _ = (state, chapter, event, entry, headers, query);
    Err(StatusCode::NOT_FOUND)
}

pub async fn start_local_checkout(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<LocalCheckoutPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    #[cfg(feature = "local-testing")]
    if state.local_identity.is_some() {
        let claims = authenticate(&state, &headers, &chapter).await?;
        let repository = state
            .durable
            .as_ref()
            .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
        return repository
            .start_local_checkout(
                &claims,
                &chapter,
                &event,
                &entry,
                &payload.operation_id,
                payload.amount_minor,
            )
            .await
            .map(|r| Json(json!(r)))
            .map_err(StatusCode::from);
    }
    let _ = (state, chapter, event, entry, headers, payload);
    Err(StatusCode::NOT_FOUND)
}

pub async fn simulate_local_payment(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<LocalCheckoutPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    #[cfg(feature = "local-testing")]
    if state.local_identity.is_some() {
        let claims = authenticate(&state, &headers, &chapter).await?;
        let repository = state
            .durable
            .as_ref()
            .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
        return repository
            .simulate_local_payment(&claims, &chapter, &event, &entry, &payload.operation_id)
            .await
            .map(|r| Json(json!(r)))
            .map_err(StatusCode::from);
    }
    let _ = (state, chapter, event, entry, headers, payload);
    Err(StatusCode::NOT_FOUND)
}

pub async fn cancel_local_checkout(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<LocalCheckoutPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    #[cfg(feature = "local-testing")]
    if state.local_identity.is_some() {
        let claims = authenticate(&state, &headers, &chapter).await?;
        let repository = state
            .durable
            .as_ref()
            .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
        return repository
            .cancel_local_checkout(&claims, &chapter, &event, &entry, &payload.operation_id)
            .await
            .map(|r| Json(json!(r)))
            .map_err(StatusCode::from);
    }
    let _ = (state, chapter, event, entry, headers, payload);
    Err(StatusCode::NOT_FOUND)
}

#[derive(Deserialize)]
pub struct ProcessPaymentPayload {
    pub provider_reference: String,
    pub amount_minor: Option<u64>,
}

pub async fn process_payment(
    State(state): State<AppState>,
    Path((chapter_id, event_id, entry_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ProcessPaymentPayload>,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .request_payment(
                &claims,
                &chapter_id,
                &event_id,
                &entry_id,
                &payload.provider_reference,
                payload.amount_minor,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::entry_access(&store, &claims, &chapter_id, &event_id, &entry_id, false)?;
    let payment = store
        .process_payment_amount(
            &chapter_id,
            &entry_id,
            &claims.sub,
            &payload.provider_reference,
            payload.amount_minor,
        )
        .map_err(|err| match err {
            "Provider reference already used with different amount"
            | "Payment amount exceeds available balance"
            | "No outstanding balance available for payment" => StatusCode::CONFLICT,
            "Payment amount must be greater than zero" | "Invalid payment reference" => {
                StatusCode::BAD_REQUEST
            }
            "Entry not found" | "Chapter not found" => StatusCode::NOT_FOUND,
            _ => StatusCode::BAD_REQUEST,
        })?;
    Ok(Json(payment))
}

pub async fn refund_payment(
    State(state): State<AppState>,
    Path((chapter_id, payment_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .refund_payment(&claims, &chapter_id, &payment_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let mut store = state.store.write().await;
    access::require_role(&claims, &["finance", "chapter_director"])?;
    let payment = store
        .refund_payment(&chapter_id, &payment_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    store.record_audit(&chapter_id, &claims.sub, "payment_refunded", &payment_id);
    Ok(Json(payment))
}

pub async fn list_payments(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
    axum::extract::Query(query): axum::extract::Query<crate::registration::PageQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .authorized_page(
                &claims,
                &chapter_id,
                crate::repository::ReadScope::Payments,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(|v| Json(serde_json::json!(v)))
            .map_err(StatusCode::from);
    }
    let _ = query;
    let store = state.store.read().await;
    let payments = store
        .list_payments(&chapter_id)
        .into_iter()
        .filter(|p| {
            matches!(claims.role.as_deref(), Some("finance" | "chapter_director"))
                || p.payer_uid == claims.sub
        })
        .collect::<Vec<_>>();
    Ok(Json(serde_json::json!(payments)))
}

pub async fn get_finance_summary(
    State(state): State<AppState>,
    Path(chapter_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<FinanceSummary>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .finance_summary(&claims, &chapter_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let store = state.store.read().await;
    access::require_role(&claims, &["finance", "chapter_director"])?;
    if !store.chapters.contains_key(&chapter_id) {
        return Err(StatusCode::NOT_FOUND);
    }
    let summary = store.get_finance_summary(&chapter_id);
    Ok(Json(summary))
}

#[derive(Deserialize)]
pub struct ReconcilePaymentPayload {
    pub approve: bool,
}

pub async fn reconcile_payment(
    State(state): State<AppState>,
    Path((chapter_id, payment_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<ReconcilePaymentPayload>,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .reconcile_payment(&claims, &chapter_id, &payment_id, payload.approve)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    access::require_role(&claims, &["finance", "chapter_director"])?;
    let mut store = state.store.write().await;
    let payment = store
        .reconcile_payment(&chapter_id, &payment_id, payload.approve)
        .map_err(|_| StatusCode::CONFLICT)?;
    store.record_audit(&chapter_id, &claims.sub, "payment_reconciled", &payment_id);
    Ok(Json(payment))
}

pub async fn handle_synthetic_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    uri: axum::http::Uri,
    body: axum::body::Bytes,
) -> Result<Json<WebhookReceipt>, (StatusCode, Json<serde_json::Value>)> {
    // Synthetic settlement is exclusively a demo-emulator test facility.
    // A production provider must implement its own verified webhook adapter.
    if !cfg!(feature = "local-testing")
        || std::env::var("WSB_LOCAL_TESTING").as_deref() != Ok("true")
        || std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
        || std::env::var("FIRESTORE_EMULATOR_HOST").is_err()
    {
        return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Not found"}))));
    }
    let secret = std::env::var("WSB_WEBHOOK_SECRET")
        .ok()
        .filter(|value| value.len() >= 32 && !value.trim().is_empty())
        .ok_or_else(|| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({"error": "Synthetic webhook is not configured"})),
            )
        })?;
    let sig_header = headers
        .get("x-signature")
        .or_else(|| headers.get("x-wsb-signature"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim());

    let provided_sig = match sig_header {
        Some(s) if !s.is_empty() => s,
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Invalid webhook HMAC signature"})),
            ));
        }
    };

    if provided_sig.chars().any(|c| c.is_ascii_uppercase()) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Invalid webhook HMAC signature"})),
        ));
    }

    let hmac_bytes = hmac_sha256(secret.as_bytes(), &body);
    let expected_hex: String = hmac_bytes.iter().map(|b| format!("{b:02x}")).collect();

    if !constant_time_eq(provided_sig.as_bytes(), expected_hex.as_bytes()) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Invalid webhook HMAC signature"})),
        ));
    }

    let payload: SyntheticWebhookPayload = serde_json::from_slice(&body).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Malformed webhook JSON payload"})),
        )
    })?;

    let chapter_id = {
        let path = uri.path().trim_matches('/');
        let parts: Vec<&str> = path.split('/').collect();
        if parts.len() >= 3 && parts[0] == "v1" && parts[1] == "chapters" {
            Some(parts[2].to_string())
        } else {
            None
        }
    };

    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .process_synthetic_webhook(chapter_id.as_deref(), &payload)
            .await
            .map(Json)
            .map_err(|err| match StatusCode::from(err) {
                StatusCode::NOT_FOUND => (
                    StatusCode::NOT_FOUND,
                    Json(json!({"error": "Payment record not found"})),
                ),
                status => (status, Json(json!({"error": "Failed to process webhook"}))),
            });
    }

    let mut store = state.store.write().await;
    let receipt = store
        .process_synthetic_webhook(chapter_id.as_deref(), &payload)
        .map_err(|err| match err {
            "Payment record not found" => (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Payment record not found"})),
            ),
            _ => (StatusCode::BAD_REQUEST, Json(json!({"error": err}))),
        })?;

    Ok(Json(receipt))
}
