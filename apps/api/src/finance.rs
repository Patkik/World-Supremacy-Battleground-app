use crate::access;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};

#[allow(dead_code)]
fn webhook_digest(body: &[u8]) -> String {
    Sha256::digest(body)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

use crate::domain::{
    FinanceSummary, PaymentQuote, PaymentRecord, PaymentStatus, SyntheticWebhookPayload,
    WebhookReceipt,
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
            provider_payment_id: Some(
                paid[0]["id"]
                    .as_str()
                    .filter(|value| value.starts_with("pay_"))
                    .ok_or(StatusCode::BAD_REQUEST)?
                    .to_owned(),
            ),
            currency: paid[0]["attributes"]["currency"]
                .as_str()
                .ok_or(StatusCode::BAD_REQUEST)?
                .to_owned(),
            payload_digest: Some(webhook_digest(&body)),
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

pub async fn paymongo_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let secret = std::env::var("PAYMONGO_WEBHOOK_SECRET")
        .ok()
        .filter(|v| v.len() >= 32);
    #[cfg(feature = "local-testing")]
    let secret = secret.or_else(|| {
        if std::env::var("WSB_LOCAL_TESTING").as_deref() == Ok("true") {
            std::env::var("WSB_PAYMONGO_LOCAL_SECRET")
                .ok()
                .filter(|v| v.len() >= 32)
        } else {
            None
        }
    });
    let secret = secret.ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "PayMongo webhook secret is not configured"})),
        )
    })?;

    let signature = headers
        .get("paymongo-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Missing paymongo-signature header"})),
            )
        })?;

    let live_mode = std::env::var("PAYMONGO_LIVE_MODE").as_deref() == Ok("true");
    let now = crate::store::now_secs();
    if !crate::paymongo::verify_signature(signature, &body, secret.as_bytes(), live_mode, now, 300)
    {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Invalid webhook HMAC signature or timestamp expired"})),
        ));
    }

    let event = crate::paymongo::parse_event(&body).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": format!("Malformed webhook JSON payload: {e}")})),
        )
    })?;

    if event.livemode != live_mode {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Webhook mode mismatch"})),
        ));
    }
    #[cfg(all(feature = "firestore", not(feature = "local-testing")))]
    if state.durable.is_some() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error":"Provider settlement is not enabled"})),
        ));
    }
    #[cfg(feature = "local-testing")]
    if let Some(repository) = &state.durable {
        return repository
            .settle_paymongo_event(&event, &webhook_digest(&body))
            .await
            .map(|_| Json(json!({"received": true})))
            .map_err(|err| {
                (
                    StatusCode::from(&err),
                    Json(json!({"error": err.to_string()})),
                )
            });
    }

    if matches!(
        event.event_type,
        crate::paymongo::PaymongoEventType::PaymentRefunded
    ) {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "Durable provider refund reconciliation is unavailable"})),
        ));
    }

    let mut store = state.store.write().await;
    store
        .settle_paymongo_event(&event)
        .map(|_| Json(json!({"received": true})))
        .map_err(|err| (StatusCode::BAD_REQUEST, Json(json!({"error": err}))))
}

#[derive(Deserialize)]
pub struct PaymongoCheckoutPayload {
    pub operation_id: String,
    pub amount_minor: Option<u64>,
}

fn configured_paymongo_live_mode() -> Result<bool, String> {
    match std::env::var("PAYMONGO_LIVE_MODE").as_deref() {
        Ok("true") => Ok(true),
        Ok("false") => Ok(false),
        _ => Err("PAYMONGO_LIVE_MODE must be explicitly set to true or false".into()),
    }
}

fn validate_paymongo_session(
    session: &crate::paymongo::PaymongoCheckoutSession,
    reference: &str,
    amount_minor: u64,
    currency: &str,
    expected_live_mode: bool,
) -> Result<(), String> {
    if session.reference_number != reference
        || session.amount_minor != amount_minor
        || !session.currency.eq_ignore_ascii_case(currency)
        || session.livemode != expected_live_mode
        || !session.id.starts_with("cs_")
        || session.status != "active"
    {
        return Err("PayMongo checkout response did not match the reserved payment".into());
    }
    Ok(())
}

fn configured_paymongo_payment_methods() -> Result<Vec<String>, String> {
    let raw = std::env::var("PAYMONGO_PAYMENT_METHOD_TYPES").map_err(|_| {
        "Configure PAYMONGO_PAYMENT_METHOD_TYPES from the methods enabled on the PayMongo account before enabling hosted checkout.".to_string()
    })?;
    let values: Vec<String> = raw
        .split(',')
        .map(str::trim)
        .map(str::to_ascii_lowercase)
        .filter(|value| !value.is_empty())
        .collect();
    let unique: std::collections::HashSet<&str> = values.iter().map(String::as_str).collect();
    if values.is_empty()
        || values.len() > 20
        || unique.len() != values.len()
        || values.iter().any(|value| {
            value.len() > 40
                || !value
                    .bytes()
                    .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_')
        })
    {
        return Err("PAYMONGO_PAYMENT_METHOD_TYPES must be a comma-separated list of 1–20 distinct provider method identifiers.".into());
    }
    Ok(values)
}

pub async fn create_paymongo_checkout(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<PaymongoCheckoutPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let claims = authenticate(&state, &headers, &chapter)
        .await
        .map_err(|s| (s, Json(json!({"error": "Authentication required"}))))?;

    #[cfg(feature = "local-testing")]
    if state.local_identity.is_some() && std::env::var("PAYMONGO_SECRET_KEY").is_err() {
        let repo = state.durable.as_ref().ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "Durable storage unavailable"})),
        ))?;
        let res = repo
            .start_local_checkout(
                &claims,
                &chapter,
                &event,
                &entry,
                &payload.operation_id,
                payload.amount_minor,
            )
            .await
            .map_err(|err| {
                (
                    StatusCode::from(&err),
                    Json(json!({"error": err.to_string()})),
                )
            })?;
        let session_id = res.session_id.unwrap_or_default();
        return Ok(Json(json!({
            "checkout_url": format!("https://checkout.paymongo.com/local?session={session_id}"),
            "session_id": session_id,
            "reservation_id": res.id,
            "reference_number": res.id,
            "amount_minor": res.amount_minor,
            "currency": res.currency,
        })));
    }

    #[cfg(all(feature = "firestore", not(feature = "local-testing")))]
    if state.durable.is_some() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error":"Provider checkout is not enabled"})),
        ));
    }
    let client = crate::paymongo::PaymongoClient::from_env().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "error": "PayMongo checkout is not configured. Submit manual payment reference or contact chapter director."
            })),
        )
    })?;

    #[cfg(feature = "local-testing")]
    if let Some(repo) = &state.durable {
        let expected_live_mode = configured_paymongo_live_mode().map_err(|error| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({"error": error})),
            )
        })?;
        let payment_method_types = configured_paymongo_payment_methods().map_err(|error| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({"error": error})),
            )
        })?;
        let reservation = repo
            .reserve_local_checkout(
                &claims,
                &chapter,
                &event,
                &entry,
                &payload.operation_id,
                payload.amount_minor,
            )
            .await
            .map_err(|err| {
                (
                    StatusCode::from(&err),
                    Json(json!({"error": err.to_string()})),
                )
            })?;

        if let Some(session_id) = &reservation.session_id {
            if let Some(stored_mode) = reservation.provider_livemode {
                if stored_mode != expected_live_mode {
                    return Err((
                        StatusCode::CONFLICT,
                        Json(
                            json!({"error": "Checkout session belongs to a different PayMongo mode"}),
                        ),
                    ));
                }
            }
            let checkout_url = reservation.checkout_url.clone().ok_or_else(|| {
                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    Json(json!({
                        "error": "The saved checkout URL is missing; reconcile this reservation before retrying."
                    })),
                )
            })?;
            return Ok(Json(json!({
                "checkout_url": checkout_url,
                "session_id": session_id,
                "reference_number": reservation.id,
                "amount_minor": reservation.amount_minor,
                "currency": reservation.currency,
            })));
        }

        let public_web_url = std::env::var("WSB_PUBLIC_WEB_URL")
            .unwrap_or_else(|_| "http://localhost:3100".to_string());
        let success_url = format!(
            "{}/app/payment-return?session_id={{CHECKOUT_SESSION_ID}}&entry={}&event={}&chapter={}",
            public_web_url, entry, event, chapter
        );
        let cancel_url = format!(
            "{}/app/entries/{}/checkout?event={}",
            public_web_url, entry, event
        );

        let quote = repo
            .payment_quote(&claims, &chapter, &event, &entry)
            .await
            .map_err(|e| (StatusCode::from(&e), Json(json!({"error": e.to_string()}))))?;

        let reservation = repo
            .begin_paymongo_checkout_request(&claims, &reservation)
            .await
            .map_err(|err| {
                (
                    StatusCode::from(&err),
                    Json(json!({"error": err.to_string()})),
                )
            })?;
        let session = client
            .create_checkout_session(&crate::paymongo::CreateCheckoutRequest {
                reference_number: reservation.id.clone(),
                line_items: vec![crate::paymongo::PaymongoCheckoutItem {
                    name: format!("WSB Entry - {}", quote.division_name),
                    amount: reservation.amount_minor,
                    currency: reservation.currency.clone(),
                    quantity: 1,
                }],
                description: Some(format!("WSB {} entry registration", quote.division_name)),
                success_url: Some(success_url),
                cancel_url: Some(cancel_url),
                payment_method_types,
            })
            .await
            .map_err(|err| (StatusCode::BAD_GATEWAY, Json(json!({"error": err}))))?;

        validate_paymongo_session(
            &session,
            &reservation.id,
            reservation.amount_minor,
            &reservation.currency,
            expected_live_mode,
        )
        .map_err(|error| (StatusCode::BAD_GATEWAY, Json(json!({"error": error}))))?;

        let bound = repo
            .bind_local_checkout_session(
                &claims,
                &reservation,
                &session.id,
                Some(session.checkout_url.clone()),
                Some(session.livemode),
            )
            .await
            .map_err(|err| {
                (
                    StatusCode::from(&err),
                    Json(json!({"error": err.to_string()})),
                )
            })?;

        return Ok(Json(json!({
            "checkout_url": bound.checkout_url.unwrap_or(session.checkout_url),
            "session_id": bound.session_id.unwrap_or(session.id),
            "reference_number": reservation.id,
            "amount_minor": bound.amount_minor,
            "currency": bound.currency,
        })));
    }

    let (available, division_name, currency) = {
        let store = state.store.read().await;
        access::entry_access(&store, &claims, &chapter, &event, &entry, false)
            .map_err(|s| (s, Json(json!({"error": "Access denied"}))))?;
        let q = store
            .get_payment_quote(&chapter, &event, &entry)
            .map_err(|_| {
                (
                    StatusCode::NOT_FOUND,
                    Json(json!({"error": "Quote not found"})),
                )
            })?;
        (q.available_amount_minor, q.division_name, q.currency)
    };

    let amount = payload.amount_minor.unwrap_or(available);
    if amount == 0 || amount > available {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({"error": "Requested amount exceeds available balance"})),
        ));
    }

    let reference = format!("wsb_{}_{}_{}", chapter, entry, payload.operation_id);
    let expected_live_mode = configured_paymongo_live_mode().map_err(|error| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": error})),
        )
    })?;
    let payment_method_types = configured_paymongo_payment_methods().map_err(|error| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": error})),
        )
    })?;
    let session = client
        .create_checkout_session(&crate::paymongo::CreateCheckoutRequest {
            reference_number: reference.clone(),
            line_items: vec![crate::paymongo::PaymongoCheckoutItem {
                name: format!("WSB Entry - {}", division_name),
                amount,
                currency: currency.clone(),
                quantity: 1,
            }],
            description: Some(format!("WSB {} entry registration", division_name)),
            success_url: None,
            cancel_url: None,
            payment_method_types,
        })
        .await
        .map_err(|err| (StatusCode::BAD_GATEWAY, Json(json!({"error": err}))))?;

    validate_paymongo_session(&session, &reference, amount, &currency, expected_live_mode)
        .map_err(|error| (StatusCode::BAD_GATEWAY, Json(json!({"error": error}))))?;

    {
        let mut store = state.store.write().await;
        let pay_id = format!("pay_pm_{}", session.id);
        let new_pay = PaymentRecord {
            payment_id: pay_id.clone(),
            chapter_id: chapter.clone(),
            entry_id: entry.clone(),
            payer_uid: claims.sub.clone(),
            amount_minor: session.amount_minor,
            currency: session.currency.clone(),
            status: PaymentStatus::Pending,
            provider_reference: session.id.clone(),
            created_at: crate::store::now_secs(),
            settled_at: None,
        };
        store.payments.insert(pay_id, new_pay);
    }

    Ok(Json(json!({
        "checkout_url": session.checkout_url,
        "session_id": session.id,
        "reference_number": session.reference_number,
        "amount_minor": session.amount_minor,
        "currency": session.currency,
    })))
}

pub async fn cancel_paymongo_checkout(
    State(state): State<AppState>,
    Path((chapter, event, entry)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(payload): Json<PaymongoCheckoutPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let claims = authenticate(&state, &headers, &chapter)
        .await
        .map_err(|s| (s, Json(json!({"error": "Authentication required"}))))?;

    #[cfg(all(feature = "firestore", not(feature = "local-testing")))]
    if state.durable.is_some() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error":"Provider cancellation is not enabled"})),
        ));
    }
    #[cfg(feature = "local-testing")]
    if let Some(repo) = &state.durable {
        let reservation = repo
            .cancel_local_checkout(&claims, &chapter, &event, &entry, &payload.operation_id)
            .await
            .map_err(|err| {
                (
                    StatusCode::from(&err),
                    Json(json!({"error": err.to_string()})),
                )
            })?;

        return Ok(Json(json!(reservation)));
    }

    #[cfg(feature = "local-testing")]
    if state.local_identity.is_some() {
        let repo = state.durable.as_ref().ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "Durable storage unavailable"})),
        ))?;
        return repo
            .cancel_local_checkout(&claims, &chapter, &event, &entry, &payload.operation_id)
            .await
            .map(|r| Json(json!(r)))
            .map_err(|err| {
                (
                    StatusCode::from(&err),
                    Json(json!({"error": err.to_string()})),
                )
            });
    }

    let _ = (state, claims, event, entry, payload);
    Ok(Json(json!({"cancelled": true})))
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

#[derive(Deserialize)]
pub struct RefundPaymentPayload {
    pub operation_id: String,
    pub reason: String,
}

pub async fn refund_payment(
    State(state): State<AppState>,
    Path((chapter_id, payment_id)): Path<(String, String)>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    access::require_role(&claims, &["finance", "chapter_director"])?;
    let payload: RefundPaymentPayload =
        serde_json::from_slice(&body).map_err(|_| StatusCode::BAD_REQUEST)?;

    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let payment = repository
            .refund_payment(
                &claims,
                &chapter_id,
                &payment_id,
                &payload.operation_id,
                &payload.reason,
            )
            .await
            .map_err(StatusCode::from)?;
        return Ok(Json(payment));
    }

    let mut store = state.store.write().await;
    let payment = store
        .refund_payment(
            &chapter_id,
            &payment_id,
            &claims.sub,
            &payload.operation_id,
            &payload.reason,
        )
        .map_err(|_| StatusCode::BAD_REQUEST)?;
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

pub async fn get_payment_record(
    State(state): State<AppState>,
    Path((chapter_id, payment_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .authorized_payment(&claims, &chapter_id, &payment_id)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }

    let store = state.store.read().await;
    let Some(payment) = store
        .list_payments(&chapter_id)
        .into_iter()
        .find(|payment| payment.payment_id == payment_id)
    else {
        return Err(StatusCode::NOT_FOUND);
    };
    if !matches!(claims.role.as_deref(), Some("finance" | "chapter_director"))
        && payment.payer_uid != claims.sub
    {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(Json(payment))
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
    pub operation_id: String,
    pub reason: String,
}

pub async fn reconcile_payment(
    State(state): State<AppState>,
    Path((chapter_id, payment_id)): Path<(String, String)>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<PaymentRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter_id).await?;
    access::require_role(&claims, &["finance", "chapter_director"])?;
    let payload: ReconcilePaymentPayload =
        serde_json::from_slice(&body).map_err(|_| StatusCode::BAD_REQUEST)?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .reconcile_payment(
                &claims,
                &chapter_id,
                &payment_id,
                payload.approve,
                &payload.operation_id,
                &payload.reason,
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    access::require_role(&claims, &["finance", "chapter_director"])?;
    let mut store = state.store.write().await;
    let payment = store
        .reconcile_payment(
            &chapter_id,
            &payment_id,
            payload.approve,
            &claims.sub,
            &payload.operation_id,
            &payload.reason,
        )
        .map_err(|_| StatusCode::CONFLICT)?;
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
