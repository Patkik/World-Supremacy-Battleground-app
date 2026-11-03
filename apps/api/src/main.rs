pub mod access;
pub mod audio_inspection;
pub mod auth;
pub mod chapter_content;
pub mod domain;
pub mod event_ops;
pub mod finance;
pub mod guardian;
#[cfg(feature = "firestore")]
pub mod hq;
pub mod inquiries;
pub mod judging;
#[cfg(feature = "local-testing")]
pub mod local_identity;
pub mod malware_scan;
pub mod notifications;
pub mod paymongo;
pub mod registration;
#[cfg(feature = "firestore")]
pub mod repository;
#[cfg(feature = "firestore")]
pub mod staff;
pub mod store;
pub mod verification;
#[cfg(feature = "local-testing")]
pub mod waivers;

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
        .route(
            "/v1/chapters/{chapter_id}/content/drafts",
            get(chapter_content::list_drafts).post(chapter_content::create_draft),
        )
        .route(
            "/v1/chapters/{chapter_id}/content/drafts/{draft_id}",
            put(chapter_content::update_draft),
        )
        .route(
            "/v1/chapters/{chapter_id}/content/drafts/{draft_id}/versions",
            get(chapter_content::list_versions),
        );
    #[cfg(feature = "local-testing")]
    let router = router
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/waiver-draft",
            get(waivers::read).post(waivers::save),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/waiver-draft/versions/{revision}",
            get(waivers::version),
        );
    let router = router
        .route(
            "/v1/chapters/{chapter_id}/guardian-requests",
            get(guardian::list).post(guardian::create),
        )
        .route(
            "/v1/chapters/{chapter_id}/guardian-requests/{request_id}",
            get(guardian::read),
        )
        .route(
            "/v1/chapters/{chapter_id}/guardian-requests/{request_id}/respond",
            post(guardian::respond),
        )
        .route(
            "/v1/chapters/{chapter_id}/guardian-requests/{request_id}/withdraw",
            post(guardian::withdraw),
        );
    #[cfg(feature = "firestore")]
    let router = router
        .route("/v1/hq/session", get(hq::session))
        .route("/v1/hq/overview", get(hq::overview))
        .route("/v1/hq/integrations", get(hq::integrations))
        .route(
            "/v1/hq/notification-queue",
            get(hq::notification_queue_health),
        )
        .route("/v1/hq/chapters", get(hq::chapters))
        .route(
            "/v1/hq/chapters/{chapter_id}/members",
            get(hq::chapter_members),
        )
        .route(
            "/v1/hq/chapters/{chapter_id}/members/{uid}",
            put(hq::change_chapter_member),
        )
        .route("/v1/hq/applications", get(hq::applications))
        .route(
            "/v1/hq/applications/{id}",
            get(hq::application_thread).post(hq::update_application),
        )
        .route(
            "/v1/chapters/{chapter_id}/staff/members",
            get(staff::list_members),
        )
        .route(
            "/v1/chapters/{chapter_id}/staff/members/{uid}",
            put(staff::change_member),
        )
        .route(
            "/v1/chapters/{chapter_id}/staff/invitations",
            get(staff::list_invitations).post(staff::create_invitation),
        )
        .route(
            "/v1/chapters/{chapter_id}/staff/invitations/{invitation_id}/revoke",
            post(staff::revoke_invitation),
        )
        .route(
            "/v1/account/staff-invitations/accept",
            post(staff::accept_invitation),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/staff/assignments",
            get(staff::list_event_assignments),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/staff/eligible-stage-marshals",
            get(staff::list_stage_marshals),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/staff/assignments/{uid}",
            put(staff::change_event_assignment),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/judge-panel",
            get(staff::get_judge_panel).put(staff::change_judge_panel),
        )
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
        .route("/v1/account/chapters", get(registration::list_account_chapters))
        .route(
            "/v1/chapters/{chapter_id}/notifications",
            get(notifications::list),
        )
        .route(
            "/v1/chapters/{chapter_id}/notifications/{notification_id}/read",
            put(notifications::mark_read),
        )
        .route(
            "/v1/chapters/{chapter_id}/events",
            get(registration::list_events).post(registration::create_event),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/duty-access",
            get(registration::duty_event_access),
        )
        .route(
            "/v1/chapters/{chapter_id}/staff/duty-events",
            get(registration::list_duty_events),
        )
        .route(
            "/v1/chapters/{chapter_id}/staff/events",
            get(registration::list_managed_events),
        )
        .route(
            "/v1/chapters/{chapter_id}/audit",
            get(registration::list_audit_records),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/registration-window",
            put(registration::update_registration_window),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/division-policy-drafts",
            get(registration::list_division_policy_drafts),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/division-policy-drafts/{division_id}",
            put(registration::save_division_policy_draft),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/division-policy-drafts/{division_id}/versions",
            get(registration::list_division_policy_draft_versions),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}",
            get(registration::get_event).put(registration::update_event_draft),
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
            get(registration::list_crew_invitations).post(registration::create_invitation),
        )
        .route(
            "/v1/chapters/{chapter_id}/crews/{crew_id}/invitations/revoke",
            post(registration::revoke_invitation),
        )
        .route(
            "/v1/chapters/{chapter_id}/crews/{crew_id}/join/recover",
            post(registration::recover_crew_invitation),
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
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/stage-status",
            get(event_ops::participant_stage_positions),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/stage-calls",
            post(event_ops::participant_stage_calls),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/published-result",
            get(event_ops::participant_published_result),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/audio",
            post(registration::update_entry_audio),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/audio-inspect",
            post(registration::inspect_entry_audio),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/music-intents",
            post(registration::create_music_intent),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/music-queue",
            get(registration::music_review_queue),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/music-submission",
            get(registration::get_music_submission),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/music-submission/audio",
            get(registration::get_music_for_review),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/music-submission/advisory",
            get(registration::get_draft_music_advisory),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/music-submission/review",
            post(registration::review_submitted_music),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/music-intents/{intent_id}/inspect",
            post(registration::inspect_stored_music),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/music-intents/{intent_id}/submit",
            post(registration::submit_stored_music),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/dj-export",
            get(registration::export_dj_playlist),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/music-policy",
            get(registration::get_draft_music_policy).post(registration::save_draft_music_policy),
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
            "/v1/chapters/{chapter_id}/finance/payments/{payment_id}",
            get(finance::get_payment_record),
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
            "/v1/chapters/{chapter_id}/events/{event_id}/check-in/candidates",
            get(event_ops::list_check_in_candidates),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/check-ins",
            get(event_ops::list_check_ins),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/check-in/me",
            get(event_ops::own_check_in),
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
            get(event_ops::get_battle_chapter).post(event_ops::save_battle_chapter),
        )
        .route("/v1/chapters/{chapter_id}/events/{event_id}/battles/{match_id}/activate", post(event_ops::activate_battle_chapter))
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/battles/{match_id}/my-ballot",
            get(event_ops::own_battle_ballot_chapter),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/battles/{match_id}/vote",
            post(event_ops::vote_battle_chapter),
        )
        .route("/v1/chapters/{chapter_id}/events/{event_id}/battles/{match_id}/configuration", get(event_ops::battle_configuration_chapter))
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
        .route("/v1/events/{event_id}/live", get(event_ops::public_stage_display))
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
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/review",
            get(judging::division_review),
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

fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::args().nth(1).as_deref() == Some("--document-parser") {
        #[cfg(feature = "firestore")]
        std::process::exit(verification::document_parser_worker());
        #[cfg(not(feature = "firestore"))]
        return Err("Build with --features firestore to run the document parser".into());
    }
    run_server()
}

#[tokio::main]
async fn run_server() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "wsb_api=info,tower_http=info".into()),
        )
        .init();
    let project = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "demo-wsb".into());
    if std::env::args().nth(1).as_deref() == Some("backfill-global-applications") {
        #[cfg(feature = "firestore")]
        {
            if std::env::var("FIREBASE_PROJECT_ID").as_deref() != Ok("demo-wsb")
                || std::env::var("WSB_MIGRATION_CONFIRM").as_deref() != Ok("demo-wsb")
            {
                return Err("This backfill requires explicit demo-wsb project confirmation".into());
            }
            let emulator = std::env::var("FIRESTORE_EMULATOR_HOST")?;
            let (host, port) = emulator
                .split_once(':')
                .ok_or("Firestore emulator host must include a port")?;
            if !matches!(
                host,
                "127.0.0.1" | "localhost" | "host.docker.internal" | "firebase"
            ) || port.parse::<u16>().is_err()
            {
                return Err("Backfill accepts only a local demo-wsb Firestore emulator".into());
            }
            let repository = repository::FirestoreRepository::connect("demo-wsb").await?;
            let result = repository.backfill_global_application_indexes().await?;
            println!(
                "Application index backfill complete: scanned={}, inserted={}, refreshed={}, unchanged={}",
                result.scanned, result.inserted, result.refreshed, result.unchanged
            );
            return Ok(());
        }
        #[cfg(not(feature = "firestore"))]
        return Err("Build with --features firestore to run this migration".into());
    }
    let origin = std::env::var("WEB_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".into())
        .parse()?;
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8088".into())
        .parse()?;

    let storage_mode = std::env::var("WSB_STORAGE").unwrap_or_else(|_| "memory".into());
    if !matches!(storage_mode.as_str(), "memory" | "firestore") {
        return Err("Unknown WSB_STORAGE mode".into());
    }
    let production_storage_enabled =
        std::env::var("WSB_ENABLE_PRODUCTION_STORAGE").as_deref() == Ok("true");
    let emulator_configured = std::env::var("FIRESTORE_EMULATOR_HOST")
        .ok()
        .is_some_and(|value| !value.trim().is_empty());
    if project == "demo-wsb" {
        if production_storage_enabled {
            return Err("Production storage opt-in cannot be used with demo-wsb".into());
        }
    } else if !production_storage_enabled || storage_mode != "firestore" || emulator_configured {
        return Err("Non-demo projects require explicit production Firestore opt-in and must not use an emulator".into());
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

    #[cfg(feature = "firestore")]
    if let Some(repository) = state.durable.clone() {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));
            let mut cursor = None;
            let mut publication_cursor = None;
            loop {
                interval.tick().await;
                match repository
                    .process_publication_notice_page(publication_cursor.take())
                    .await
                {
                    Ok(next) => publication_cursor = next,
                    Err(error) => {
                        tracing::warn!(error = %error, "Publication notification queue unavailable; will retry")
                    }
                }
                match repository.process_roster_notice_page(cursor.take()).await {
                    Ok(next) => cursor = next,
                    Err(error) => {
                        tracing::warn!(error = %error, "Roster notification queue unavailable; will retry")
                    }
                }
            }
        });
    }

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
            && ((parts.len() == 4 && matches!(parts[3], "published" | "live"))
                || (parts.len() == 6 && parts[3] == "divisions" && parts[5] == "published"));
        let chapter_read = parts.get(1) == Some(&"chapters")
            && ((parts.len() == 4 && parts[3] == "audit")
                || (parts.len() == 5 && parts[3] == "events")
                || (parts.len() == 5 && parts[3] == "staff" && parts[4] == "members")
                || (parts.len() == 5 && parts[3] == "staff" && parts[4] == "duty-events")
                || (parts.len() == 7
                    && parts[3] == "events"
                    && parts[5] == "staff"
                    && matches!(parts[6], "assignments" | "eligible-stage-marshals"))
                || (parts.len() == 4 && parts[3] == "crews")
                || (parts.len() == 5 && parts[3] == "crews")
                || (parts.len() == 6 && parts[3] == "crews" && parts[5] == "invitations")
                || (parts.len() == 5 && parts[3] == "content" && parts[4] == "drafts")
                || (parts.len() == 6
                    && parts[3] == "content"
                    && parts[4] == "drafts"
                    && parts[5] != "")
                || (parts.len() == 7
                    && parts[3] == "content"
                    && parts[4] == "drafts"
                    && parts[6] == "versions")
                || (parts.len() == 5
                    && parts[3] == "finance"
                    && matches!(parts[4], "payments" | "summary"))
                || (parts.len() == 4 && parts[3] == "verification")
                || (parts.len() == 6 && parts[3] == "events" && parts[5] == "judge-lineup")
                || (parts.len() == 6 && parts[3] == "events" && parts[5] == "duty-access")
                || (parts.len() == 7
                    && parts[3] == "events"
                    && parts[5] == "check-in"
                    && parts[6] == "candidates")
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
                    && matches!(parts[5], "divisions" | "entries" | "music-queue"))
                || (parts.len() == 7 && parts[3] == "events" && parts[5] == "entries")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "entries"
                    && matches!(
                        parts[7],
                        "scorecard" | "music-submission" | "stage-status" | "published-result"
                    ))
                || (parts.len() == 9
                    && parts[3] == "events"
                    && parts[5] == "entries"
                    && parts[7] == "music-submission"
                    && matches!(parts[8], "audio" | "advisory"))
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "divisions"
                    && matches!(
                        parts[7],
                        "results" | "music-policy" | "judge-panel" | "review"
                    )));
        let durable_read = request.method() == Method::GET
            && parts.first() == Some(&"v1")
            && (public_projection_read || chapter_read);
        let hq_read = request.method() == Method::GET
            && parts.first() == Some(&"v1")
            && parts.get(1) == Some(&"hq")
            && ((parts.len() == 5 && parts[2] == "chapters" && parts[4] == "members")
                || (parts.len() == 3 && parts[2] == "chapters")
                || (parts.len() == 3 && parts[2] == "overview")
                || (parts.len() == 3 && parts[2] == "integrations")
                || (parts.len() == 3 && parts[2] == "notification-queue")
                || (parts.len() == 3 && parts[2] == "applications")
                || (parts.len() == 4 && parts[2] == "applications"));
        let hq_write = (request.method() == Method::PUT
            && parts.first() == Some(&"v1")
            && parts.get(1) == Some(&"hq")
            && parts.len() == 6
            && parts[2] == "chapters"
            && parts[4] == "members")
            || (request.method() == Method::POST
                && parts.first() == Some(&"v1")
                && parts.get(1) == Some(&"hq")
                && parts.len() == 4
                && parts[2] == "applications");
        let registration_write = matches!(*request.method(), Method::POST | Method::PUT)
            && parts.first() == Some(&"v1")
            && parts.get(1) == Some(&"chapters")
            && ((parts.len() == 4 && matches!(parts[3], "crews" | "events"))
                || (parts.len() == 5 && parts[3] == "content" && parts[4] == "drafts")
                || (parts.len() == 6 && parts[3] == "content" && parts[4] == "drafts")
                || (parts.len() == 5 && parts[3] == "crews")
                || (parts.len() == 6 && parts[3] == "staff" && parts[4] == "members")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "staff"
                    && parts[6] == "assignments")
                || (parts.len() == 6
                    && parts[3] == "crews"
                    && matches!(parts[5], "invitations" | "join"))
                || (parts.len() == 7
                    && parts[3] == "crews"
                    && parts[5] == "invitations"
                    && parts[6] == "revoke")
                || (parts.len() == 7
                    && parts[3] == "crews"
                    && parts[5] == "join"
                    && parts[6] == "recover")
                || (parts.len() == 6 && parts[3] == "events" && parts[5] == "entries")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "entries"
                    && matches!(
                        parts[7],
                        "roster" | "submit" | "review" | "audio-inspect" | "music-intents"
                    ))
                || (parts.len() == 10
                    && parts[3] == "events"
                    && parts[5] == "entries"
                    && parts[7] == "music-intents"
                    && matches!(parts[9], "inspect" | "submit"))
                || (parts.len() == 9
                    && parts[3] == "events"
                    && parts[5] == "entries"
                    && parts[7] == "music-submission"
                    && parts[8] == "review")
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "divisions"
                    && matches!(parts[7], "deductions" | "music-policy" | "judge-panel")));
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
        let guardian_route = cfg!(feature = "local-testing")
            && parts.first() == Some(&"v1")
            && parts.get(1) == Some(&"chapters")
            && ((parts.len() == 4
                && parts[3] == "guardian-requests"
                && matches!(*request.method(), Method::GET | Method::POST))
                || (parts.len() == 5
                    && parts[3] == "guardian-requests"
                    && request.method() == Method::GET)
                || (parts.len() == 6
                    && parts[3] == "guardian-requests"
                    && matches!(parts[5], "respond" | "withdraw")
                    && request.method() == Method::POST));
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
        let check_in_self = request.method() == Method::GET
            && parts.len() == 7
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "check-in"
            && parts[6] == "me";
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
        let waiver_route = cfg!(feature = "local-testing")
            && parts.len() == 6
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "waiver-draft"
            && matches!(*request.method(), Method::GET | Method::POST);
        let waiver_version_route = cfg!(feature = "local-testing")
            && parts.len() == 8
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "waiver-draft"
            && parts[6] == "versions"
            && request.method() == Method::GET;
        let battle_route = parts.len() >= 6
            && parts.len() <= 8
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "battles"
            && ((matches!(parts.len(), 6 | 7) && request.method() == Method::GET)
                || (parts.len() == 8
                    && parts[7] == "configuration"
                    && request.method() == Method::GET)
                || (parts.len() == 7 && request.method() == Method::POST)
                || (parts.len() == 8
                    && matches!(parts[7], "vote" | "activate")
                    && request.method() == Method::POST));
        let stage_calls_read = request.method() == Method::POST
            && parts.len() == 6
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "stage-calls";
        let local_dj_export = cfg!(feature = "local-testing")
            && request.method() == Method::GET
            && parts.len() == 6
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && parts[3] == "events"
            && parts[5] == "dj-export";
        let account_notification_route = (path == "/v1/account/chapters"
            && request.method() == Method::GET)
            || (parts.len() == 4
                && parts[0] == "v1"
                && parts[1] == "chapters"
                && parts[3] == "notifications"
                && request.method() == Method::GET)
            || (parts.len() == 6
                && parts[0] == "v1"
                && parts[1] == "chapters"
                && parts[3] == "notifications"
                && parts[5] == "read"
                && request.method() == Method::PUT);
        let event_setup_route = parts.len() >= 5
            && parts[0] == "v1"
            && parts[1] == "chapters"
            && ((parts.len() == 5 && parts[3] == "events" && request.method() == Method::PUT)
                || (parts.len() == 6
                    && parts[3] == "events"
                    && parts[5] == "registration-window"
                    && request.method() == Method::PUT)
                || (parts.len() == 6
                    && parts[3] == "events"
                    && parts[5] == "division-policy-drafts"
                    && request.method() == Method::GET)
                || (parts.len() == 7
                    && parts[3] == "events"
                    && parts[5] == "division-policy-drafts"
                    && request.method() == Method::PUT)
                || (parts.len() == 8
                    && parts[3] == "events"
                    && parts[5] == "division-policy-drafts"
                    && parts[7] == "versions"
                    && request.method() == Method::GET)
                || (parts.len() == 5
                    && parts[3] == "staff"
                    && matches!(parts[4], "events" | "invitations")
                    && request.method() == Method::GET));
        let staff_invitation_write = request.method() == Method::POST
            && ((parts.len() == 5
                && parts[0] == "v1"
                && parts[1] == "chapters"
                && parts[3] == "staff"
                && parts[4] == "invitations")
                || (parts.len() == 7
                    && parts[0] == "v1"
                    && parts[1] == "chapters"
                    && parts[3] == "staff"
                    && parts[4] == "invitations"
                    && parts[6] == "revoke")
                || (parts.len() == 4
                    && parts[0] == "v1"
                    && parts[1] == "account"
                    && parts[2] == "staff-invitations"
                    && parts[3] == "accept"));
        if !battle_route
            && !waiver_version_route
            && !waiver_route
            && !core
            && !durable_read
            && !hq_read
            && !hq_write
            && !registration_write
            && !verification_write
            && !inquiry_route
            && !guardian_route
            && !stage_calls_read
            && !local_dj_export
            && !account_notification_route
            && !event_setup_route
            && !staff_invitation_write
            && !check_in
            && !check_in_list
            && !check_in_self
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
