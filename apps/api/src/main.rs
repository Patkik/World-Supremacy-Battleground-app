pub mod auth;
pub mod domain;
pub mod event_ops;
pub mod finance;
pub mod judging;
pub mod registration;
pub mod store;

use std::sync::Arc;
use tokio::sync::RwLock;

use axum::{
    extract::{DefaultBodyLimit, Path, State},
    http::{header, HeaderMap, HeaderValue, Method, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use registration::AppState;
use store::RegistrationStore;

pub fn router(state: AppState, origin: HeaderValue) -> Router {
    Router::new()
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
            "/v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}/pay",
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
            "/v1/chapters/{chapter_id}/verification",
            get(finance::list_verification_cases).post(finance::submit_verification_case),
        )
        .route(
            "/v1/chapters/{chapter_id}/verification/{case_id}/review",
            post(finance::review_verification_case),
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
            "/v1/events/{event_id}/battles",
            get(event_ops::list_battles),
        )
        .route(
            "/v1/events/{event_id}/battles/{match_id}/vote",
            post(event_ops::vote_battle),
        )
        .route(
            "/v1/chapters/{chapter_id}/events/{event_id}/divisions/{division_id}/publish",
            post(event_ops::publish_results),
        )
        .route(
            "/v1/events/{event_id}/divisions/{division_id}/published",
            get(event_ops::get_published_snapshot),
        )
        .layer(DefaultBodyLimit::max(64 * 1024))
        .layer(
            CorsLayer::new()
                .allow_origin(origin)
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn session(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
) -> Result<([(header::HeaderName, &'static str); 1], Json<Value>), StatusCode> {
    let claims = registration::authenticate(&state.verifier, &headers, &chapter).await?;
    Ok((
        [(header::CACHE_CONTROL, "no-store")],
        Json(json!({"uid":claims.sub,"chapter_id":chapter,"role":claims.role})),
    ))
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

    #[cfg(feature = "firestore")]
    let _db = firestore::FirestoreDb::new(&project).await?;

    let state = AppState {
        verifier: auth::Verifier::new(project)?,
        store: Arc::new(RwLock::new(RegistrationStore::new())),
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

#[cfg(test)]
mod tests {
    use super::*;
    use tower::ServiceExt;

    #[tokio::test]
    async fn health_is_public_but_session_requires_auth() {
        let state = AppState {
            verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
            store: Arc::new(RwLock::new(RegistrationStore::new())),
        };
        let app = router(state, "http://localhost:3000".parse().unwrap());
        for (path, status) in [
            ("/healthz", StatusCode::OK),
            ("/v1/chapters/ph/session", StatusCode::UNAUTHORIZED),
            (
                "/v1/chapters/ph/events/manila-session-2027/divisions",
                StatusCode::OK,
            ),
        ] {
            let response = app
                .clone()
                .oneshot(
                    axum::http::Request::builder()
                        .uri(path)
                        .body(axum::body::Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), status);
        }
    }

    #[tokio::test]
    async fn registration_flow_and_readiness_evaluation() {
        let mut store = RegistrationStore::new();

        // 1. Create crew
        let crew = store
            .create_crew("ph", "manager-1", "A-Team Manila", "Quezon City")
            .expect("create crew");
        assert_eq!(crew.chapter_id, "ph");
        assert_eq!(crew.members.len(), 1);

        // 2. Issue invitation and accept
        let inv = store
            .create_invitation("ph", &crew.id, "manager-1", domain::MemberRole::Dancer)
            .expect("create invitation");
        let crew_updated = store
            .accept_invitation("ph", &inv.token, "dancer-1", "Carlos Dance", true)
            .expect("accept invitation");
        assert_eq!(crew_updated.members.len(), 2);
        assert!(crew_updated.members[1].is_minor);
        assert!(!crew_updated.members[1].consent_verified); // minor consent unverified

        // 3. Create entry in open-crew division
        let mut entry = store
            .create_entry("ph", "manila-session-2027", &crew.id, "open-crew")
            .expect("create entry");

        // 4. Evaluate readiness: should fail (roster count 2 < min 5, no music, minor consent pending, no payment)
        let readiness = store
            .evaluate_readiness(&entry)
            .expect("evaluate readiness");
        assert!(!readiness.is_ready);
        assert!(!readiness.roster_ready);
        assert!(!readiness.music_ready);
        assert!(!readiness.consent_ready);
        assert!(!readiness.payment_ready);
        assert!(readiness.diagnostics.len() >= 4);

        // 5. Submit entry with incomplete prerequisites -> transitions to NeedsCorrection
        let submitted = store.submit_entry("ph", &entry.id).expect("submit entry");
        assert_eq!(submitted.status, domain::EntryStatus::NeedsCorrection);

        // 6. Complete prerequisites on entry fixture
        entry.paid_minor = 120_000 * 6;
        entry.track_filename = Some("performance.mp3".into());
        entry.track_duration_secs = Some(160);
        entry.roster.clear();
        for i in 1..=6 {
            entry.roster.push(domain::CrewMember {
                uid: format!("dancer-{}", i),
                name: format!("Dancer {}", i),
                role: domain::MemberRole::Dancer,
                is_minor: false,
                consent_verified: true,
            });
        }
        store.entries.insert(entry.id.clone(), entry.clone());

        // 7. Re-evaluate readiness -> now fully ready
        let readiness_complete = store.evaluate_readiness(&entry).expect("evaluate complete");
        assert!(readiness_complete.is_ready);
        assert!(readiness_complete.roster_ready);
        assert!(readiness_complete.music_ready);
        assert!(readiness_complete.consent_ready);
        assert!(readiness_complete.payment_ready);

        // 8. Submit entry again -> transitions to Submitted
        let submitted_ok = store.submit_entry("ph", &entry.id).expect("submit entry");
        assert_eq!(submitted_ok.status, domain::EntryStatus::Submitted);
    }

    #[tokio::test]
    async fn offline_judging_command_protocol_and_locking() {
        let mut store = RegistrationStore::new();

        let cmd = domain::SubmitScoreCommand {
            operation_id: "op-score-1001".into(),
            division_id: "open-crew".into(),
            crew_id: "crew-sample".into(),
            expected_revision: 0,
            criteria: domain::ScoreCriteria {
                choreography: 18.5,
                musicality: 19.0,
                execution: 18.0,
                stage_presence: 17.5,
                entertainment: 19.0,
            },
            deductions: vec![domain::Deduction {
                code: "ded-fall".into(),
                reason: "Minor fall on stage".into(),
                points: 1.0,
            }],
        };

        // 1. Submit score
        let receipt1 = store
            .submit_score("ph", "manila-session-2027", "judge-1", cmd.clone())
            .expect("score submitted");
        assert_eq!(receipt1.operation_id, "op-score-1001");
        assert_eq!(receipt1.score_revision, 1);
        assert_eq!(receipt1.net_score, 91.0); // 92.0 - 1.0 = 91.0

        // 2. Idempotent re-submission returns identical receipt
        let receipt_dup = store
            .submit_score("ph", "manila-session-2027", "judge-1", cmd.clone())
            .expect("duplicate submission");
        assert_eq!(receipt_dup, receipt1);

        // 3. Submitting next score with stale revision (expected 0 instead of 1) -> Conflict
        let mut cmd2 = cmd.clone();
        cmd2.operation_id = "op-score-1002".into();
        cmd2.expected_revision = 0;
        let err = store.submit_score("ph", "manila-session-2027", "judge-2", cmd2);
        assert!(err.is_err());
        assert!(err.unwrap_err().contains("revision mismatch"));

        // 4. Submitting with correct revision 1 succeeds
        let mut cmd3 = cmd.clone();
        cmd3.operation_id = "op-score-1003".into();
        cmd3.expected_revision = 1;
        let receipt3 = store
            .submit_score("ph", "manila-session-2027", "judge-2", cmd3)
            .expect("score revision 1 accepted");
        assert_eq!(receipt3.score_revision, 2);

        // 5. Lock division
        store
            .lock_division("ph", "manila-session-2027", "open-crew")
            .expect("lock division");

        // 6. Submitting score after lock -> Conflict / Locked
        let mut cmd4 = cmd.clone();
        cmd4.operation_id = "op-score-1004".into();
        cmd4.expected_revision = 2;
        let err_locked = store.submit_score("ph", "manila-session-2027", "judge-3", cmd4);
        assert!(err_locked.is_err());
        assert!(err_locked.unwrap_err().contains("locked"));
    }

    #[tokio::test]
    async fn cross_chapter_access_denials() {
        let mut store = RegistrationStore::new();

        // Cross chapter division query
        let err_div = store.get_divisions("au", "manila-session-2027");
        assert!(err_div.is_err());

        // Cross chapter crew access
        let crew = store
            .create_crew("ph", "manager-ph", "Manila Stars", "Manila")
            .unwrap();
        let err_crew = store.get_crew("au", &crew.id);
        assert!(err_crew.is_err());

        // Cross chapter invitation redemption
        let inv = store
            .create_invitation("ph", &crew.id, "manager-ph", domain::MemberRole::Dancer)
            .unwrap();
        let err_join =
            store.accept_invitation("au", &inv.token, "dancer-au", "Sydney Dancer", false);
        assert!(err_join.is_err());
    }

    #[tokio::test]
    async fn registrar_review_and_roster_updates() {
        let mut store = RegistrationStore::new();

        // 1. Seed crew exists
        let crews = store.list_crews_by_chapter("ph");
        assert!(!crews.is_empty());
        assert_eq!(crews[0].name, "Afterhours Collective");

        // 2. Entries exist for manila-session-2027
        let entries = store.list_entries_by_event("ph", "manila-session-2027");
        assert!(!entries.is_empty());
        let entry_id = &entries[0].id;
        assert_eq!(entries[0].status, domain::EntryStatus::Submitted);

        // 3. Registrar review: request correction
        let review_res = store.review_entry("ph", entry_id, domain::EntryStatus::NeedsCorrection);
        assert!(review_res.is_ok());
        assert_eq!(
            review_res.unwrap().status,
            domain::EntryStatus::NeedsCorrection
        );

        // 4. Update entry roster
        let mut new_roster = entries[0].roster.clone();
        new_roster.pop();
        let update_roster_res = store.update_entry_roster("ph", entry_id, new_roster);
        assert!(update_roster_res.is_ok());
        assert_eq!(
            update_roster_res.unwrap().roster.len(),
            entries[0].roster.len() - 1
        );

        // 5. Registrar review: approve entry
        let approved = store
            .review_entry("ph", entry_id, domain::EntryStatus::Approved)
            .unwrap();
        assert_eq!(approved.status, domain::EntryStatus::Approved);

        // 6. Cannot update roster once approved
        let err_update = store.update_entry_roster("ph", entry_id, vec![]);
        assert!(err_update.is_err());
    }

    #[tokio::test]
    async fn financial_ledger_quotes_and_verification_cases() {
        let mut store = RegistrationStore::new();

        // 1. Quote calculation based on division fee * dancer count
        let quote = store
            .get_payment_quote("ph", "manila-session-2027", "entry-manila-open-1")
            .expect("payment quote");
        assert_eq!(quote.dancer_count, 6);
        assert_eq!(quote.rate_per_dancer_minor, 120_000);
        assert_eq!(quote.total_amount_minor, 720_000);
        assert_eq!(quote.currency, "PHP");

        // 2. Process payment settles and reconciles entry paid_minor
        let payment = store
            .process_payment("ph", "entry-manila-open-1", "manager-1", "ref-tx-9901")
            .expect("process payment");
        assert_eq!(payment.status, domain::PaymentStatus::Settled);
        assert_eq!(payment.amount_minor, 720_000);

        // 3. Finance summary tracks settled totals
        let summary = store.get_finance_summary("ph");
        assert!(summary.total_settled_minor >= 720_000);
        assert_eq!(summary.currency, "PHP");

        // 4. Refund payment transitions status to Refunded and deduces entry paid_minor
        let refunded = store
            .refund_payment("ph", &payment.payment_id)
            .expect("refund payment");
        assert_eq!(refunded.status, domain::PaymentStatus::Refunded);

        // 5. Verification case submission & registrar review
        let case = store.submit_verification_case(
            "ph",
            "dancer-new",
            "New Dancer",
            true,
            "Passport & Parent Form",
        );
        assert_eq!(case.status, domain::VerificationStatus::Pending);

        let reviewed = store
            .review_verification_case(
                "ph",
                &case.case_id,
                domain::VerificationStatus::Approved,
                Some("Pass".into()),
            )
            .expect("review verification");
        assert_eq!(reviewed.status, domain::VerificationStatus::Approved);
    }

    #[tokio::test]
    async fn venue_check_ins_battles_and_publication() {
        let mut store = RegistrationStore::new();

        // 1. Venue check-in creates pass
        let check_in =
            store.check_in_dancer("ph", "manila-session-2027", "dancer-1", "marshal-scanner");
        assert_eq!(check_in.dancer_uid, "dancer-1");

        let list = store.list_check_ins("ph", "manila-session-2027");
        assert!(!list.is_empty());

        // 2. Battle match voting
        let battles = store.list_battle_matches("manila-session-2027");
        assert!(!battles.is_empty());
        let match_id = battles[0].match_id.clone();

        // Cast 3 votes for red corner to achieve majority
        store
            .vote_battle("manila-session-2027", &match_id, "red")
            .unwrap();
        store
            .vote_battle("manila-session-2027", &match_id, "red")
            .unwrap();
        let voted = store
            .vote_battle("manila-session-2027", &match_id, "red")
            .unwrap();
        assert_eq!(voted.status, "completed");
        assert!(voted.winner_corner.unwrap().contains("Red Corner"));

        // 3. Score entry and publish division results
        let cmd = domain::SubmitScoreCommand {
            operation_id: "op-pub-1".into(),
            division_id: "open-crew".into(),
            crew_id: "crew-afterhours".into(),
            expected_revision: 0,
            criteria: domain::ScoreCriteria {
                choreography: 19.0,
                musicality: 19.0,
                execution: 19.0,
                stage_presence: 19.0,
                entertainment: 19.0,
            },
            deductions: vec![],
        };
        store
            .submit_score("ph", "manila-session-2027", "judge-1", cmd)
            .unwrap();

        let pub_snapshot = store
            .publish_division_results("ph", "manila-session-2027", "open-crew")
            .expect("publish results");
        assert!(!pub_snapshot.results.is_empty());
        assert_eq!(pub_snapshot.results[0].final_score, 95.0);

        let retrieved = store.get_published_snapshot("manila-session-2027", "open-crew");
        assert!(retrieved.is_some());
    }
}
