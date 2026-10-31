pub mod access;
pub mod auth;
pub mod domain;
pub mod event_ops;
pub mod finance;
pub mod inquiries;
pub mod judging;
#[cfg(feature = "local-testing")]
pub mod local_identity;
pub mod paymongo;
pub mod registration;
#[cfg(feature = "firestore")]
pub mod repository;
pub mod store;
pub mod verification;

use std::sync::Arc;
use tokio::sync::RwLock;

use axum::{
    extract::Request,
    middleware::{self, Next},
    response::Response,
};
use axum::{
    extract::{DefaultBodyLimit, Path, State},
    http::{header, HeaderMap, HeaderName, HeaderValue, Method, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use registration::AppState;
use store::RegistrationStore;

pub fn router(state: AppState, origin: HeaderValue) -> Router {
    let router = Router::new();
    #[cfg(feature = "firestore")]
    let router = router
        .route("/v1/contact/chapters", get(inquiries::http::chapters))
        .route(
            "/v1/chapters/{chapter_id}/contact",
            post(inquiries::http::create_contact),
        )
        .route(
            "/v1/chapters/{chapter_id}/contact/{inquiry_id}",
            get(inquiries::http::contact_thread).post(inquiries::http::update_contact),
        )
        .route(
            "/v1/chapters/{chapter_id}/support",
            get(inquiries::http::list_support).post(inquiries::http::create_support),
        )
        .route(
            "/v1/chapters/{chapter_id}/support/{inquiry_id}",
            get(inquiries::http::support_thread).post(inquiries::http::update_support),
        );
    #[cfg(feature = "local-testing")]
    let router = if state.local_identity.is_some() {
        router.route("/local/session", post(local_identity::sign_in))
    } else {
        router
    };
    router
        .route(
            "/healthz",
            get(|| async { Json(json!({"status":"ok","service":"wsb-api"})) }),
        )
        .route("/v1/chapters", get(registration::list_chapters))
        .route(
            "/v1/chapters/{chapter_id}/events",
            get(registration::list_events),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}",
            get(registration::get_event),
        )
        .route("/v1/chapters/{chapter_id}/session", get(session))
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions",
            get(registration::list_divisions),
        )
        .route(
            "/v1/chapters/{chapter_id}/crews",
            get(registration::list_crews).post(registration::create_crew),
        )
        .route(
            "/v1/chapters/{chapter_id}/crews/{crew_id}",
            get(registration::get_crew).put(registration::update_crew),
        )
        .route(
            "/v1/chapters/{chapter_id}/crews/{crew_id}/invitations",
            post(registration::create_invitation),
        )
        .route(
            "/v1/chapters/{chapter_id}/crews/{crew_id}/join",
            post(registration::join_crew),
        )
        .route(
            "/v1/chapters/{chapter_id}/crews/{crew_id}/members/{member_uid}/consent",
            post(registration::submit_guardian_consent),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries",
            get(registration::list_entries).post(registration::create_entry),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}",
            get(registration::get_entry_detail),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/roster",
            put(registration::update_entry_roster),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/audio",
            post(registration::update_entry_audio),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/dj-export",
            get(registration::export_dj_playlist),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/submit",
            post(registration::submit_entry),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/review",
            post(registration::review_entry),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/scores",
            post(judging::submit_score),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/lock",
            post(judging::lock_division),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/results",
            get(judging::get_division_results),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/quote",
            get(finance::get_payment_quote),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/local-checkout",
            get(finance::list_local_checkouts).post(finance::start_local_checkout),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/local-checkout-simulate",
            post(finance::simulate_local_payment),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/local-checkout-cancel",
            post(finance::cancel_local_checkout),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/pay",
            post(finance::process_payment),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/payments",
            post(finance::process_payment),
        )
        .route(
            "/v1/chapters/{chapter_id}/finance/payments",
            get(finance::list_payments),
        )
        .route(
            "/v1/chapters/{chapter_id}/finance/payments/{payment_id}/refund",
            post(finance::refund_payment),
        )
        .route(
            "/v1/chapters/{chapter_id}/finance/summary",
            get(finance::get_finance_summary),
        )
        .route(
            "/v1/chapters/{chapter_id}/finance/webhook",
            post(finance::handle_synthetic_webhook),
        )
        .route(
            "/v1/local/paymongo/webhook",
            post(finance::local_paymongo_webhook),
        )
        .route(
            "/v1/paymongo/webhook",
            post(finance::paymongo_webhook),
        )
        .route(
            "/v1/webhooks/paymongo",
            post(finance::paymongo_webhook),
        )
        .route(
            "/v1/webhooks/payments",
            post(finance::handle_synthetic_webhook),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/paymongo/checkout",
            post(finance::create_paymongo_checkout),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/paymongo/cancel",
            post(finance::cancel_paymongo_checkout),
        )
        .route(
            "/v1/chapters/{chapter_id}/verification",
            get(verification::list).post(verification::create),
        )
        .route(
            "/v1/chapters/{chapter_id}/verification/{case_id}/review",
            post(verification::review),
        )
        .route(
            "/v1/chapters/{chapter_id}/verification/{case_id}/submit",
            post(verification::submit),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/check-in",
            post(event_ops::check_in_dancer),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/check-ins",
            get(event_ops::list_check_ins),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stage-commands",
            post(event_ops::update_stage_position),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stages",
            get(event_ops::list_stages),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stages/{stage_id}",
            get(event_ops::get_stage),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stage-lineup",
            post(event_ops::save_stage_lineup),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stages/{stage_id}/lineup",
            get(event_ops::get_stage_lineup),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stage-configure",
            post(event_ops::configure_stage),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stage-create",
            post(event_ops::create_stage),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stage-marshals",
            post(event_ops::set_stage_marshals),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stage-holds",
            post(event_ops::set_stage_hold),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stages/{stage_id}/entries",
            get(event_ops::list_stage_entries),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stages/{stage_id}/lineup-history",
            get(event_ops::list_stage_lineup_history),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stages/{stage_id}/history",
            get(event_ops::list_stage_history),
        )
        .route(
            "/v1/events/{event_id}/battles",
            get(event_ops::list_battles),
        )
        .route(
            "/v1/events/{event_id}/battles/{match_id}",
            get(event_ops::get_battle),
        )
        .route(
            "/v1/events/{event_id}/battles/{match_id}/vote",
            post(event_ops::vote_battle),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/battles",
            get(event_ops::list_battles_chapter),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/battles/{match_id}",
            get(event_ops::get_battle_chapter),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/battles/{match_id}/vote",
            post(event_ops::vote_battle_chapter),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/publish",
            post(event_ops::publish_results),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/division-status",
            get(registration::list_division_status),
        )
        .route(
            "/v1/events/{event_id}/divisions/{division_id}/published",
            get(event_ops::get_published_snapshot),
        )
        .route(
            "/v1/events/{event_id}/published",
            get(event_ops::list_published_results),
        )
        .route(
            "/v1/chapters/{chapter_id}/finance/payments/{payment_id}/reconcile",
            post(finance::reconcile_payment),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/score-state",
            get(judging::score_state),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/deductions",
            put(judging::set_deductions),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/scorecard",
            get(judging::score_assignment),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/judge-lineup",
            get(judging::assigned_lineup),
        )
        .route("/readyz", get(readiness))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            durable_route_gate,
        ))
        .layer(middleware::from_fn(private_responses))
        .layer(DefaultBodyLimit::max(64 * 1024))
        .layer(
            CorsLayer::new()
                .allow_origin(origin)
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
                .allow_headers([
                    header::AUTHORIZATION,
                    header::CONTENT_TYPE,
                    HeaderName::from_static("x-firebase-id-token"),
                ]),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn session(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
) -> Result<([(header::HeaderName, &'static str); 1], Json<Value>), StatusCode> {
    let claims = registration::authenticate(&state, &headers, &chapter).await?;
    Ok((
        [(header::CACHE_CONTROL, "no-store")],
        Json(json!({"uid":claims.sub,"chapter_id":chapter,"role":claims.role})),
    ))
}

async fn readiness(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        let reachable = repository.readiness_probe().await.is_ok();
        // Storage connectivity is distinct from completing every workflow migration.
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(
                json!({"status":if reachable {"persistent_core_only"}else{"storage_unavailable"},"durable_storage":true,"database_reachable":reachable,"release_ready":false}),
            ),
        );
    }
    #[cfg(not(feature = "firestore"))]
    let _ = state;
    (
        StatusCode::SERVICE_UNAVAILABLE,
        Json(json!({"status":"synthetic_only","durable_storage":false,"release_ready":false})),
    )
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "wsb_api=info,tower_http=info".into()),
        )
        .init();
    let project = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into());
    let origin = std::env::var("WEB_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".into())
        .parse()?;
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8088".into())
        .parse()?;

    // The durable migration is incomplete. Keep real projects gated until verified.
    if project != "demo-wsb" {
        return Err(
            "Business persistence is not configured; this build supports demo-wsb only".into(),
        );
    }
    let storage_mode = std::env::var("WSB_STORAGE").unwrap_or_else(|_| "memory".into());
    if !matches!(storage_mode.as_str(), "memory" | "firestore") {
        return Err("Unknown WSB_STORAGE mode".into());
    }
    #[cfg(not(feature = "firestore"))]
    if storage_mode == "firestore" {
        return Err("Build with --features firestore to use persistent storage".into());
    }
    #[cfg(feature = "firestore")]
    let durable = if storage_mode == "firestore" {
        Some(Arc::new(
            repository::FirestoreRepository::connect(&project).await?,
        ))
    } else {
        None
    };

    let verifier = auth::Verifier::new(project.clone())?;
    #[cfg(feature = "local-testing")]
    let (verifier, local_identity) = if std::env::var("WSB_LOCAL_TESTING").as_deref() == Ok("true")
    {
        if durable.is_none() {
            return Err("Local signed identity requires durable demo-wsb storage".into());
        }
        let (verifier, identity) = local_identity::LocalIdentity::from_env(&project)?;
        (verifier, Some(Arc::new(identity)))
    } else {
        (verifier, None)
    };
    #[cfg(not(feature = "local-testing"))]
    if std::env::var("WSB_LOCAL_TESTING").as_deref() == Ok("true") {
        return Err("Local identity is not part of this build".into());
    }
    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity,
        #[cfg(feature = "firestore")]
        durable,
        verifier,
        store: Arc::new(RwLock::new(if storage_mode == "firestore" {
            RegistrationStore::empty()
        } else {
            RegistrationStore::new()
        })),
    };

    let app = router(state, origin);
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::UNSPECIFIED, port)).await?;
    tracing::info!(port, "WSB API listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await?;
    Ok(())
}

async fn shutdown() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install interrupt handler");
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install terminate handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    tracing::info!("Shutdown requested; draining connections");
}

async fn durable_route_gate(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    #[cfg(feature = "firestore")]
    if state.durable.is_some() {
        let path = request.uri().path();
        let core = path == "/healthz"
            || path == "/readyz"
            || path.ends_with("/session")
            || path.ends_with("/scores")
            || path.ends_with("/score-state")
            || path.ends_with("/lock")
            || path.ends_with("/quote")
            || path.ends_with("/pay")
            || path.ends_with("/payments")
            || path.ends_with("/reconcile")
            || path.ends_with("/refund")
            || path.ends_with("/webhook")
            || path == "/v1/webhooks/payments"
            || path == "/v1/webhooks/paymongo"
            || path.contains("/paymongo/")
            || (cfg!(feature = "local-testing") && path == "/v1/local/paymongo/webhook")
            || path == "/local/session"
            || path.contains("/battles")
            || path.ends_with("/results");
        let parts: Vec<_> = path.trim_matches('/').split('/').collect();
        let public_projection_read = parts.get(1) == Some(&"events")
            && ((parts.len() == 4 && parts[3] == "published")
                || (parts.len() == 6 && parts[3] == "divisions" && parts[5] == "published"));
        let chapter_read = parts.get(1) == Some(&"chapters")
            && ((parts.len() == 4 && parts[3] == "crews")
                || (parts.len() == 5 && parts[3] == "crews")
                || (parts.len() == 5
                    && parts[3] == "finance"
                    && matches!(parts[4], "payments" | "summary"))
                || (parts.len() == 4 && parts[3] == "verification")
                || (parts.len() == 6 && parts[3] == "events" && parts[5] == "judge-lineup")
                || (parts.len() == 6 && parts[3] == "events" && parts[5] == "division-status")
                || (parts.len() == 6 && parts[3] == "events" && parts[5] == "stages")
                || (parts.len() == 7 && parts[3] == "events" && parts[5] == "stages")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "stages"
                    && matches!(
                        parts[7],
                        "entries" | "history" | "lineup" | "lineup-history"
                    ))
                || (parts.len() == 6
                    && parts[3] == "events"
                    && matches!(parts[5], "divisions" | "entries"))
                || (parts.len() == 7 && parts[3] == "events" && parts[5] == "entries")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "entries"
                    && parts[7] == "scorecard")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "divisions"
                    && parts[7] == "results"));
        let durable_read = request.method() == Method::GET
            && parts.first() == Some(&"v1")
            && (public_projection_read || chapter_read);
        let registration_write = matches!(*request.method(), Method::POST | Method::PUT)
            && parts.first() == Some(&"v1")
            && parts.get(1) == Some(&"chapters")
            && ((parts.len() == 4 && parts[3] == "crews")
                || (parts.len() == 5 && parts[3] == "crews")
                || (parts.len() == 6
                    && parts[3] == "crews"
                    && matches!(parts[5], "invitations" | "join"))
                || (parts.len() == 6 && parts[3] == "events" && parts[5] == "entries")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "entries"
                    && matches!(parts[7], "roster" | "submit" | "review"))
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "divisions"
                    && parts[7] == "deductions"));
        let verification_write = request.method() == Method::POST
            && parts.first() == Some(&"v1")
            && parts.get(1) == Some(&"chapters")
            && ((parts.len() == 4 && parts[3] == "verification")
                || (parts.len() == 6
                    && parts[3] == "verification"
                    && matches!(parts[5], "submit" | "review")));
        let inquiry_route = path == "/v1/contact/chapters"
            || (parts.first() == Some(&"v1")
                && parts.get(1) == Some(&"chapters")
                && matches!(parts.len(), 4 | 5)
                && matches!(parts[3], "contact" | "support"));
        let check_in = request.method() == Method::POST
            && parts.len() == 6
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "check-in";
        let check_in_list = request.method() == Method::GET
            && parts.len() == 6
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "check-ins";
        let stage_command = request.method() == Method::POST
            && parts.len() == 6
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && matches!(
                parts[5],
                "stage-commands"
                    | "stage-holds"
                    | "stage-marshals"
                    | "stage-create"
                    | "stage-configure"
                    | "stage-lineup"
            );
        let local_checkout = cfg!(feature = "local-testing")
            && matches!(*request.method(), Method::GET | Method::POST)
            && parts.len() == 8
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "entries"
            && matches!(
                parts[7],
                "local-checkout" | "local-checkout-cancel" | "local-checkout-simulate"
            );
        let publication_write = request.method() == Method::POST
            && parts.len() == 8
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "divisions"
            && parts[7] == "publish";
        if !core
            && !durable_read
            && !registration_write
            && !verification_write
            && !inquiry_route
            && !check_in
            && !check_in_list
            && !stage_command
            && !local_checkout
            && !publication_write
        {
            use axum::response::IntoResponse;
            return (
                StatusCode::NOT_IMPLEMENTED,
                Json(json!({"error":"This workflow has not yet been migrated to durable storage"})),
            )
                .into_response();
        }
    }
    #[cfg(not(feature = "firestore"))]
    let _ = state;
    next.run(request).await
}

async fn private_responses(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

#[cfg(test)]
mod tests;
