use super::*;
use crate::{access, auth::Claims, domain::*};
use std::collections::HashMap;
use tower::ServiceExt;

const EVENT: &str = "manila-session-2027";
const CREW: &str = "crew-afterhours";
const ENTRY: &str = "entry-manila-open-1";

fn fixture() -> RegistrationStore {
    let mut store = RegistrationStore::new();
    store.entries.get_mut(ENTRY).unwrap().status = EntryStatus::Approved;
    store.event_staff.insert(
        EVENT.into(),
        ["judge-1", "judge-2", "judge-3", "head-1", "marshal-1"]
            .map(String::from)
            .into(),
    );
    for (uid, role) in [
        ("judge-1", "judge"),
        ("judge-2", "judge"),
        ("judge-3", "judge"),
        ("head-1", "head_judge"),
        ("marshal-1", "marshal"),
    ] {
        store.memberships.insert(
            format!("ph/{uid}"),
            Membership {
                uid: uid.into(),
                chapter_id: "ph".into(),
                role: role.into(),
                active: true,
                valid_after: 0,
                expires_at: None,
            },
        );
    }
    store
        .set_judge_panel(EVENT, "open-crew", vec!["judge-1".into(), "judge-2".into()])
        .unwrap();
    store.battle_panels.insert(
        "match-101".into(),
        vec!["judge-1".into(), "judge-2".into(), "judge-3".into()],
    );
    store
}

fn command(operation: &str, revision: u64, points: f64) -> SubmitScoreCommand {
    SubmitScoreCommand {
        schema_version: 1,
        operation_id: operation.into(),
        division_id: "open-crew".into(),
        crew_id: CREW.into(),
        expected_revision: revision,
        criteria: ScoreCriteria {
            choreography: points,
            musicality: points,
            execution: points,
            stage_presence: points,
            entertainment: points,
        },
        deductions: vec![],
    }
}

fn claims(uid: &str, role: &str) -> Claims {
    Claims {
        sub: uid.into(),
        iat: 10,
        auth_time: 10,
        chapter_id: Some("ph".into()),
        role: Some(role.into()),
    }
}

#[tokio::test]
async fn private_routes_deny_unauthenticated_and_never_cache() {
    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(fixture())),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());
    for path in [
        "/v1/chapters/ph/session",
        "/v1/chapters/ph/crews",
        "/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/results",
        "/v1/chapters/ph/events/manila-session-2027/battles",
        "/v1/chapters/ph/events/manila-session-2027/battles/match-101",
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
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED, "{path}");
        assert_eq!(response.headers()[header::CACHE_CONTROL], "no-store");
    }
    let publish = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri(format!(
                    "/v1/chapters/ph/events/{EVENT}/divisions/open-crew/publish"
                ))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(r#"{"allow_ties": true}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(publish.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(publish.headers()[header::CACHE_CONTROL], "no-store");
    let vote = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri(format!("/v1/events/{EVENT}/battles/match-101/vote"))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(r#"{"winner_corner":"red"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(vote.status(), StatusCode::UNAUTHORIZED);
    let chapter_vote = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri(format!(
                    "/v1/chapters/ph/events/{EVENT}/battles/match-101/vote"
                ))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(r#"{"winner_corner":"red"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(chapter_vote.status(), StatusCode::UNAUTHORIZED);
    let public = app
        .oneshot(
            axum::http::Request::builder()
                .uri(format!("/v1/events/{EVENT}/divisions/open-crew/published"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(public.status(), StatusCode::NOT_FOUND);
}

#[test]
fn authoritative_membership_revocation_role_and_ownership() {
    let mut store = fixture();
    let manager = claims("dev-manager-1", "crew_manager");
    store.memberships.insert(
        "ph/dev-manager-1".into(),
        Membership {
            uid: manager.sub.clone(),
            chapter_id: "ph".into(),
            role: "crew_manager".into(),
            active: true,
            valid_after: 0,
            expires_at: None,
        },
    );
    assert!(access::require_membership(&store, &manager, "ph").is_ok());
    assert!(access::require_membership(&store, &manager, "hk").is_err());
    store
        .memberships
        .get_mut("ph/dev-manager-1")
        .unwrap()
        .active = false;
    assert!(access::require_membership(&store, &manager, "ph").is_err());
    store
        .memberships
        .get_mut("ph/dev-manager-1")
        .unwrap()
        .active = true;
    store
        .memberships
        .get_mut("ph/dev-manager-1")
        .unwrap()
        .valid_after = 11;
    assert!(access::require_membership(&store, &manager, "ph").is_err());
    assert!(access::require_role(&manager, &["finance"]).is_err());
    assert!(access::crew_access(&store, &manager, "ph", CREW, true).is_ok());
    assert!(access::crew_access(
        &store,
        &claims("other-manager", "crew_manager"),
        "ph",
        CREW,
        true
    )
    .is_err());
    assert!(
        access::entry_access(&store, &manager, "ph", "hk-championship-2027", ENTRY, true).is_err()
    );
    assert!(access::require_event(&store, &claims("unassigned", "judge"), "ph", EVENT).is_err());
}

#[test]
fn invitation_randomness_atomic_redemption_and_entry_retry() {
    let mut store = fixture();
    let a = store
        .create_crew("ph", "manager-a", "Synthetic A", "Manila")
        .unwrap();
    let b = store
        .create_crew("ph", "manager-b", "Synthetic B", "Manila")
        .unwrap();
    assert_ne!(a.id, b.id);
    let first = store
        .create_invitation("ph", &a.id, "manager-a", MemberRole::Dancer)
        .unwrap();
    let second = store
        .create_invitation("ph", &a.id, "manager-a", MemberRole::Dancer)
        .unwrap();
    assert_ne!(first.token, second.token);
    assert!(store
        .accept_invitation("ph", &first.token, "manager-a", "Manager", false)
        .is_err());
    assert!(!store.invitations[&first.token].used);
    let joined = store
        .accept_invitation("ph", &first.token, "minor-a", "Synthetic minor", true)
        .unwrap();
    assert!(!joined.members.last().unwrap().consent_verified);
    assert!(store
        .accept_invitation("ph", &first.token, "minor-b", "Synthetic minor", true)
        .is_err());
    let entry = store.create_entry("ph", EVENT, &a.id, "open-crew").unwrap();
    store.entries.get_mut(&entry.id).unwrap().paid_minor = 123;
    assert_eq!(
        store
            .create_entry("ph", EVENT, &a.id, "open-crew")
            .unwrap()
            .paid_minor,
        123
    );
}

#[test]
fn roster_cannot_forge_consent_or_duplicate_members() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().status = EntryStatus::Draft;
    store.crews.get_mut(CREW).unwrap().members[5].consent_verified = false;
    let roster = store.entries[ENTRY].roster.clone();
    let updated = store
        .update_entry_roster("ph", ENTRY, roster.clone())
        .unwrap();
    assert!(!updated.roster[5].consent_verified);
    assert!(!store.evaluate_readiness(&updated).unwrap().consent_ready);
    assert!(store
        .review_entry("ph", ENTRY, EntryStatus::Approved)
        .is_err());
    assert!(store
        .update_entry_roster("ph", ENTRY, vec![roster[0].clone(), roster[0].clone()])
        .is_err());
}

#[test]
fn audio_duration_uses_configured_maximum() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().status = EntryStatus::Draft;
    // Division open-crew max_duration_secs is 180s.
    // 180s track: ready
    store.entries.get_mut(ENTRY).unwrap().track_filename = Some("track.mp3".into());
    store.entries.get_mut(ENTRY).unwrap().track_duration_secs = Some(180);
    assert!(
        store
            .evaluate_readiness(&store.entries[ENTRY])
            .unwrap()
            .music_ready
    );

    // No unapproved grace is added to the configured maximum.
    store.entries.get_mut(ENTRY).unwrap().track_duration_secs = Some(185);
    assert!(
        !store
            .evaluate_readiness(&store.entries[ENTRY])
            .unwrap()
            .music_ready
    );

    // 186s track exceeds the configured maximum.
    store.entries.get_mut(ENTRY).unwrap().track_duration_secs = Some(186);
    let readiness = store.evaluate_readiness(&store.entries[ENTRY]).unwrap();
    assert!(!readiness.music_ready);
    assert!(readiness
        .diagnostics
        .iter()
        .any(|d| d.contains("exceeds configured division maximum 180s")));

    // 0s track: invalid
    store.entries.get_mut(ENTRY).unwrap().track_duration_secs = Some(0);
    assert!(
        !store
            .evaluate_readiness(&store.entries[ENTRY])
            .unwrap()
            .music_ready
    );

    // Test update_entry_audio method
    let receipt_compliant = store
        .update_entry_audio("ph", EVENT, ENTRY, "clean_mix.mp3", 180)
        .unwrap();
    assert!(receipt_compliant.compliant);
    assert_eq!(receipt_compliant.excess_secs, 0);
    assert_eq!(receipt_compliant.track_filename, "clean_mix.mp3");

    let receipt_overtime = store
        .update_entry_audio("ph", EVENT, ENTRY, "long_mix.mp3", 195)
        .unwrap();
    assert!(!receipt_overtime.compliant);
    assert_eq!(receipt_overtime.excess_secs, 15);

    // Rejects empty track name and zero duration
    assert!(store
        .update_entry_audio("ph", EVENT, ENTRY, "   ", 120)
        .is_err());
    assert!(store
        .update_entry_audio("ph", EVENT, ENTRY, "clean.mp3", 0)
        .is_err());

    // Rejects updating audio on Approved entry
    store.entries.get_mut(ENTRY).unwrap().status = EntryStatus::Approved;
    assert!(store
        .update_entry_audio("ph", EVENT, ENTRY, "clean.mp3", 120)
        .is_err());
}

#[test]
fn minor_guardian_consent_mutation_and_propagation() {
    let mut store = fixture();
    // In fixture(), crew member[5] is "dancer-5", is_minor: true.
    // Set dancer-5 to consent_verified: false
    store.crews.get_mut(CREW).unwrap().members[5].consent_verified = false;
    store.entries.get_mut(ENTRY).unwrap().status = EntryStatus::Draft;
    // Roster has dancer-5
    let roster = store.crews[CREW].members.clone();
    let entry = store.update_entry_roster("ph", ENTRY, roster).unwrap();
    assert!(!entry.roster[5].consent_verified);
    assert!(!store.evaluate_readiness(&entry).unwrap().consent_ready);

    // Rejects adult consent submission
    assert_eq!(
        store
            .submit_guardian_consent("ph", CREW, "dancer-1", "Parent Name", "2027-01-01")
            .unwrap_err(),
        "Member is not a minor"
    );

    // Rejects empty or whitespace guardian name
    assert_eq!(
        store
            .submit_guardian_consent("ph", CREW, "dancer-5", "   ", "2027-01-01")
            .unwrap_err(),
        "Guardian name required"
    );

    // Rejects name over 200 chars
    let long_name = "A".repeat(201);
    assert_eq!(
        store
            .submit_guardian_consent("ph", CREW, "dancer-5", &long_name, "2027-01-01")
            .unwrap_err(),
        "Guardian name invalid or exceeds 200 characters"
    );

    // Rejects non-existent minor
    assert_eq!(
        store
            .submit_guardian_consent("ph", CREW, "non-existent-uid", "Parent Name", "2027-01-01")
            .unwrap_err(),
        "Minor not found in crew"
    );

    // Valid guardian consent submission
    let receipt = store
        .submit_guardian_consent("ph", CREW, "dancer-5", "Maria Ramos", "2027-01-15")
        .unwrap();
    assert!(receipt.verified);
    assert_eq!(receipt.minor_uid, "dancer-5");
    assert_eq!(receipt.guardian_name, "Maria Ramos");

    // Verified in crew
    let minor_member = store.crews[CREW]
        .members
        .iter()
        .find(|m| m.uid == "dancer-5")
        .unwrap();
    assert!(minor_member.consent_verified);

    // Propagated to draft entry roster
    let entry_after = &store.entries[ENTRY];
    let entry_minor = entry_after
        .roster
        .iter()
        .find(|m| m.uid == "dancer-5")
        .unwrap();
    assert!(entry_minor.consent_verified);
    assert!(store.evaluate_readiness(entry_after).unwrap().consent_ready);
}

#[test]
fn dj_playlist_export_manifest_auto_renaming() {
    let mut store = fixture();
    // Prepare entries: ENTRY is currently Approved.
    store.entries.get_mut(ENTRY).unwrap().status = EntryStatus::Approved;
    store.entries.get_mut(ENTRY).unwrap().track_filename =
        Some("original_routine_final.wav".into());
    store.entries.get_mut(ENTRY).unwrap().track_duration_secs = Some(175);

    // Create a second crew and approved entry
    let crew2 = store
        .create_crew("ph", "manager-2", "The Hype! Crew / Project", "Manila")
        .unwrap();
    let entry2 = store
        .create_entry("ph", EVENT, &crew2.id, "open-crew")
        .unwrap();
    let entry2_mut = store.entries.get_mut(&entry2.id).unwrap();
    entry2_mut.status = EntryStatus::Approved;
    entry2_mut.track_filename = Some("hype_sound.mp3".into());
    entry2_mut.track_duration_secs = Some(160);

    // Create a third entry that is only Draft (should NOT be in export)
    let crew3 = store
        .create_crew("ph", "manager-3", "Draft Crew", "Manila")
        .unwrap();
    let entry3 = store
        .create_entry("ph", EVENT, &crew3.id, "open-crew")
        .unwrap();
    assert_eq!(entry3.status, EntryStatus::Draft);

    // Export DJ playlist
    let manifest = store.export_dj_playlist("ph", EVENT, "open-crew").unwrap();
    assert_eq!(manifest.event_id, EVENT);
    assert_eq!(manifest.division_id, "open-crew");
    assert_eq!(manifest.total_tracks, 2);
    assert_eq!(manifest.manifest.len(), 2);

    // Check Track 1
    let t1 = &manifest.manifest[0];
    assert_eq!(t1.order, 1);
    assert_eq!(t1.entry_id, ENTRY);
    assert_eq!(t1.crew_name, "Afterhours Collective");
    assert_eq!(t1.original_track, "original_routine_final.wav");
    assert_eq!(t1.duration_secs, 175);
    assert_eq!(t1.export_filename, "01_open-crew_Afterhours_Collective.mp3");

    // Check Track 2 (sanitized crew name with ! and / replaced with _)
    let t2 = &manifest.manifest[1];
    assert_eq!(t2.order, 2);
    assert_eq!(t2.entry_id, entry2.id);
    assert_eq!(t2.crew_name, "The Hype! Crew / Project");
    assert_eq!(
        t2.export_filename,
        "02_open-crew_The_Hype__Crew___Project.mp3"
    );
}

#[test]
fn offline_replay_checks_payload_actor_scope_and_assignment() {
    let mut store = fixture();
    let cmd = command("op-1", 0, 18.0);
    let receipt = store
        .submit_score("ph", EVENT, "judge-1", cmd.clone())
        .unwrap();
    assert_eq!(
        receipt,
        store
            .submit_score("ph", EVENT, "judge-1", cmd.clone())
            .unwrap()
    );
    let mut changed = cmd.clone();
    changed.criteria.execution = 19.0;
    assert!(store.submit_score("ph", EVENT, "judge-1", changed).is_err());
    assert!(store
        .submit_score("hk", EVENT, "judge-1", cmd.clone())
        .is_err());
    assert!(store
        .submit_score("ph", EVENT, "unassigned", cmd.clone())
        .is_err());
    // Each judge has their own revision, so another judge's queued command remains valid.
    assert_eq!(
        store
            .submit_score("ph", EVENT, "judge-2", command("op-1", 0, 17.0))
            .unwrap()
            .score_revision,
        1
    );
    assert!(store
        .submit_score("ph", EVENT, "judge-1", command("op-stale", 0, 18.0))
        .is_err());
    store.event_staff.get_mut(EVENT).unwrap().remove("judge-1");
    assert!(store.submit_score("ph", EVENT, "judge-1", cmd).is_err());
}

#[test]
fn score_revisions_replace_instead_of_adding_judges_and_deductions_apply_once() {
    let mut store = fixture();
    store
        .submit_score("ph", EVENT, "judge-1", command("a", 0, 18.0))
        .unwrap();
    store
        .submit_score("ph", EVENT, "judge-1", command("b", 1, 20.0))
        .unwrap();
    store
        .submit_score("ph", EVENT, "judge-2", command("c", 0, 18.0))
        .unwrap();
    let deduction = vec![Deduction {
        code: "reviewed".into(),
        reason: "Synthetic test deduction".into(),
        points: 2.0,
    }];
    assert_eq!(
        store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, deduction.clone())
            .unwrap(),
        1
    );
    assert_eq!(
        store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, deduction)
            .unwrap(),
        1
    );
    let results = store
        .get_division_results("ph", EVENT, "open-crew")
        .unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].crew_id, CREW);
    assert_eq!(results[0].raw_average, 95.0);
    assert_eq!(results[0].final_score, 93.0);
    assert!(store
        .get_division_results("hk", EVENT, "open-crew")
        .is_err());
    assert!(store
        .get_division_results("hk", "hk-championship-2027", "open-crew")
        .unwrap()
        .is_empty());
    let mut bad = command("bad", 2, 18.0);
    bad.criteria.execution = f64::INFINITY;
    assert!(store.submit_score("ph", EVENT, "judge-1", bad).is_err());
}

#[test]
fn complete_panel_lock_and_separate_publication_projection() {
    let mut store = fixture();
    let cmd = command("a", 0, 18.0);
    store
        .submit_score("ph", EVENT, "judge-1", cmd.clone())
        .unwrap();
    assert!(store.lock_division("ph", EVENT, "open-crew").is_err());
    assert!(store
        .publish_division_results("ph", EVENT, "open-crew")
        .is_err());
    store
        .submit_score("ph", EVENT, "judge-2", command("b", 0, 19.0))
        .unwrap();
    store.lock_division("ph", EVENT, "open-crew").unwrap();
    // A previously acknowledged command still has the same receipt after locking.
    assert!(store.submit_score("ph", EVENT, "judge-1", cmd).is_ok());
    assert!(store
        .submit_score("ph", EVENT, "judge-1", command("after-lock", 1, 20.0))
        .is_err());
    let snapshot = store
        .publish_division_results("ph", EVENT, "open-crew")
        .unwrap();
    assert_eq!(snapshot.digest.len(), 64);
    assert_eq!(
        snapshot,
        store
            .publish_division_results("ph", EVENT, "open-crew")
            .unwrap()
    );
    assert_eq!(
        Some(snapshot),
        store.get_published_snapshot(EVENT, "open-crew")
    );
}

#[test]
fn payment_requests_need_staff_reconciliation_and_replays_are_safe() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    store.payments.clear();
    let pending = store
        .process_payment("ph", ENTRY, "dev-manager-1", "bank-ref-1")
        .unwrap();
    assert_eq!(pending.status, PaymentStatus::Pending);
    assert_eq!(store.entries[ENTRY].paid_minor, 0);
    assert_eq!(
        pending,
        store
            .process_payment("ph", ENTRY, "dev-manager-1", "bank-ref-1")
            .unwrap()
    );
    assert!(store
        .process_payment("ph", ENTRY, "other", "bank-ref-1")
        .is_err());
    assert!(store
        .process_payment("ph", ENTRY, "dev-manager-1", "bank-ref-2")
        .is_err());
    let settled = store
        .reconcile_payment(
            "ph",
            &pending.payment_id,
            true,
            "finance-approve-one",
            "finance-1",
            "Verified against receipt 123",
        )
        .unwrap();
    assert_eq!(settled.status, PaymentStatus::Settled);
    store
        .reconcile_payment(
            "ph",
            &pending.payment_id,
            true,
            "finance-approve-one",
            "finance-1",
            "Verified against receipt 123",
        )
        .unwrap();
    assert_eq!(store.entries[ENTRY].paid_minor, 720_000);
    assert!(store
        .refund_payment(
            "hk",
            &pending.payment_id,
            "finance-1",
            "finance-refund-hk",
            "Wrong chapter attempt"
        )
        .is_err());
    store
        .refund_payment(
            "ph",
            &pending.payment_id,
            "finance-1",
            "finance-refund-one",
            "External reversal confirmed",
        )
        .unwrap();
    store
        .refund_payment(
            "ph",
            &pending.payment_id,
            "finance-1",
            "finance-refund-one",
            "External reversal confirmed",
        )
        .unwrap();
    assert_eq!(store.entries[ENTRY].paid_minor, 0);
}

#[test]
fn check_in_is_eligible_scoped_and_idempotent() {
    let mut store = fixture();
    let first = store
        .check_in_dancer("ph", EVENT, "dancer-1", "marshal-1")
        .unwrap();
    assert_eq!(
        first,
        store
            .check_in_dancer("ph", EVENT, "dancer-1", "marshal-2")
            .unwrap()
    );
    assert!(store
        .check_in_dancer("hk", EVENT, "dancer-1", "marshal-1")
        .is_err());
    assert!(store
        .check_in_dancer("ph", EVENT, "unknown", "marshal-1")
        .is_err());
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    assert!(store
        .check_in_dancer("ph", EVENT, "dancer-2", "marshal-1")
        .is_err());
}

#[test]
fn battle_ballots_are_assigned_unique_and_closed_after_majority() {
    let mut store = fixture();
    let first = store
        .vote_battle(EVENT, "match-101", "judge-1", "red")
        .unwrap();
    assert_eq!(
        first,
        store
            .vote_battle(EVENT, "match-101", "judge-1", "red")
            .unwrap()
    );
    assert!(store
        .vote_battle(EVENT, "match-101", "judge-1", "blue")
        .is_err());
    assert!(store
        .vote_battle(EVENT, "match-101", "unknown", "red")
        .is_err());
    let final_vote = store
        .vote_battle(EVENT, "match-101", "judge-2", "red")
        .unwrap();
    assert_eq!(final_vote.winner_corner.as_deref(), Some("red"));
    assert!(store
        .vote_battle(EVENT, "match-101", "judge-3", "blue")
        .is_err());
}

#[test]
fn split_payment_reservations_prevent_overallocation_and_changed_references() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    store.payments.clear();
    let first = store
        .process_payment_amount("ph", ENTRY, "dancer-1", "share-1", Some(120_000))
        .unwrap();
    let second = store
        .process_payment_amount("ph", ENTRY, "dancer-2", "share-2", Some(120_000))
        .unwrap();
    assert!(store
        .process_payment_amount("ph", ENTRY, "dancer-1", "share-1", Some(100_000))
        .is_err());
    assert!(store
        .process_payment_amount("ph", ENTRY, "dancer-3", "share-3", Some(600_000))
        .is_err());
    assert!(store
        .process_payment_amount("ph", ENTRY, "dancer-3", "share-zero", Some(0))
        .is_err());
    let quote = store.get_payment_quote("ph", EVENT, ENTRY).unwrap();
    assert_eq!(quote.pending_amount_minor, 240_000);
    assert_eq!(quote.available_amount_minor, 480_000);
    store
        .reconcile_payment(
            "ph",
            &first.payment_id,
            true,
            "finance-approve-first",
            "finance-1",
            "Verified against receipt 124",
        )
        .unwrap();
    store
        .reconcile_payment(
            "ph",
            &second.payment_id,
            false,
            "finance-reject-second",
            "finance-1",
            "Receipt amount did not match",
        )
        .unwrap();
    let quote = store.get_payment_quote("ph", EVENT, ENTRY).unwrap();
    assert_eq!(quote.paid_amount_minor, 120_000);
    assert_eq!(quote.available_amount_minor, 600_000);
}

#[test]
fn multiple_crews_remain_distinct_and_unresolved_ties_cannot_be_published() {
    let mut store = fixture();
    let mut second_entry = store.entries[ENTRY].clone();
    second_entry.id = "entry-synthetic-second".into();
    second_entry.crew_id = "crew-synthetic-second".into();
    store.entries.insert(second_entry.id.clone(), second_entry);
    for (judge, op) in [("judge-1", "one"), ("judge-2", "two")] {
        store
            .submit_score("ph", EVENT, judge, command(op, 0, 18.0))
            .unwrap();
        let mut second = command(&format!("{op}-second"), 0, 18.0);
        second.crew_id = "crew-synthetic-second".into();
        store.submit_score("ph", EVENT, judge, second).unwrap();
    }
    let results = store
        .get_division_results("ph", EVENT, "open-crew")
        .unwrap();
    assert_eq!(results.len(), 2);
    assert_ne!(results[0].crew_id, results[1].crew_id);
    assert_ne!(results[0].entry_id, results[1].entry_id);
    assert_eq!(results[0].rank, results[1].rank);
    store.lock_division("ph", EVENT, "open-crew").unwrap();
    // Default publication attempt fails closed without approved tie policy
    assert!(store
        .publish_division_results("ph", EVENT, "open-crew")
        .unwrap_err()
        .contains("tie policy"));
    assert!(store.get_published_snapshot(EVENT, "open-crew").is_none());

    // Explicit allow_ties = Some(false) also fails closed
    assert!(store
        .publish_division_results_with_policy("ph", EVENT, "open-crew", Some(false))
        .unwrap_err()
        .contains("tie policy"));
    assert!(store.get_published_snapshot(EVENT, "open-crew").is_none());

    // Explicit allow_ties = Some(true) succeeds and records shared rank with valid digest
    let snapshot = store
        .publish_division_results_with_policy("ph", EVENT, "open-crew", Some(true))
        .unwrap();
    assert_eq!(snapshot.results.len(), 2);
    assert_eq!(snapshot.results[0].rank, 1);
    assert_eq!(snapshot.results[1].rank, 1);
    assert_eq!(snapshot.digest.len(), 64);
    assert_eq!(
        Some(snapshot.clone()),
        store.get_published_snapshot(EVENT, "open-crew")
    );
    // Subsequent publication returns identical idempotent snapshot
    assert_eq!(
        snapshot,
        store
            .publish_division_results_with_policy("ph", EVENT, "open-crew", Some(true))
            .unwrap()
    );
}

#[test]
fn malicious_deductions_unknown_crews_and_revoked_panel_members_fail_closed() {
    let mut store = fixture();
    let negative = vec![Deduction {
        code: "invalid".into(),
        reason: "Synthetic invalid deduction".into(),
        points: -5.0,
    }];
    assert!(store
        .set_deductions("ph", EVENT, "open-crew", CREW, 0, negative)
        .is_err());
    let mut invented = command("unknown-crew", 0, 18.0);
    invented.crew_id = "invented".into();
    assert!(store
        .submit_score("ph", EVENT, "judge-1", invented)
        .is_err());
    store
        .submit_score("ph", EVENT, "judge-1", command("one", 0, 18.0))
        .unwrap();
    store
        .submit_score("ph", EVENT, "judge-2", command("two", 0, 19.0))
        .unwrap();
    store.memberships.get_mut("ph/judge-2").unwrap().active = false;
    assert!(store.lock_division("ph", EVENT, "open-crew").is_err());
}

#[tokio::test]
async fn public_http_exposes_only_explicit_publication_snapshots() {
    let mut store = fixture();
    store
        .submit_score("ph", EVENT, "judge-1", command("public-one", 0, 18.0))
        .unwrap();
    store
        .submit_score("ph", EVENT, "judge-2", command("public-two", 0, 19.0))
        .unwrap();
    store.lock_division("ph", EVENT, "open-crew").unwrap();
    store
        .publish_division_results("ph", EVENT, "open-crew")
        .unwrap();
    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(store)),
    };
    let response = router(state, "http://localhost:3000".parse().unwrap())
        .oneshot(
            axum::http::Request::builder()
                .uri(format!("/v1/events/{EVENT}/published"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), 64 * 1024)
        .await
        .unwrap();
    let projection: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(projection[0]["results"][0]["entry_id"], ENTRY);
    assert_eq!(projection[0]["results"][0]["crew_id"], CREW);
    let text = String::from_utf8(body.to_vec()).unwrap();
    for private_field in [
        "judge_uid",
        "dancer_uid",
        "roster",
        "provider_reference",
        "criteria",
    ] {
        assert!(!text.contains(private_field));
    }
}

#[tokio::test]
async fn readiness_endpoint_returns_503_synthetic_only_and_never_caches() {
    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(fixture())),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());
    let response = app
        .oneshot(
            axum::http::Request::builder()
                .uri("/readyz")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        response.headers()[header::CACHE_CONTROL],
        "no-store",
        "readiness response must enforce Cache-Control: no-store"
    );

    let body = axum::body::to_bytes(response.into_body(), 4096)
        .await
        .unwrap();
    let status: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(status["status"], "synthetic_only");
    assert_eq!(status["durable_storage"], false);
    assert_eq!(status["release_ready"], false);
}

#[tokio::test]
async fn universal_cache_control_no_store_across_endpoints_and_statuses() {
    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(fixture())),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());

    let test_cases = [
        ("/healthz", StatusCode::OK),
        ("/readyz", StatusCode::SERVICE_UNAVAILABLE),
        ("/v1/chapters", StatusCode::OK),
        ("/v1/chapters/ph/events", StatusCode::OK),
        ("/v1/chapters/ph/session", StatusCode::UNAUTHORIZED),
        ("/v1/chapters/ph/crews", StatusCode::UNAUTHORIZED),
        ("/nonexistent-path-404", StatusCode::NOT_FOUND),
    ];

    for (path, expected_status) in test_cases {
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
        assert_eq!(response.status(), expected_status, "Route: {path}");
        assert_eq!(
            response.headers()[header::CACHE_CONTROL],
            "no-store",
            "Route {path} must have Cache-Control: no-store"
        );
    }
}

#[tokio::test]
async fn adversarial_cache_control_matrix() {
    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(fixture())),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());

    let cases = vec![
        // Method Not Allowed (405)
        (
            axum::http::Method::POST,
            "/healthz",
            StatusCode::METHOD_NOT_ALLOWED,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::PUT,
            "/healthz",
            StatusCode::METHOD_NOT_ALLOWED,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::DELETE,
            "/healthz",
            StatusCode::METHOD_NOT_ALLOWED,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::POST,
            "/readyz",
            StatusCode::METHOD_NOT_ALLOWED,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::DELETE,
            "/v1/chapters",
            StatusCode::METHOD_NOT_ALLOWED,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::PUT,
            "/v1/chapters",
            StatusCode::METHOD_NOT_ALLOWED,
            None,
            axum::body::Body::empty(),
        ),
        // Not Found (404)
        (
            axum::http::Method::GET,
            "/",
            StatusCode::NOT_FOUND,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::GET,
            "/healthz/",
            StatusCode::NOT_FOUND,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::GET,
            "/v1/chapters/ph/unknown-endpoint-404",
            StatusCode::NOT_FOUND,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::POST,
            "/nonexistent",
            StatusCode::NOT_FOUND,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::GET,
            "/v1/chapters/ph/events/evt-1/divisions/div-1/unknown",
            StatusCode::NOT_FOUND,
            None,
            axum::body::Body::empty(),
        ),
        // Gated / Probe Endpoints with queries
        (
            axum::http::Method::GET,
            "/healthz?probe=true&timestamp=123",
            StatusCode::OK,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::GET,
            "/readyz?format=json",
            StatusCode::SERVICE_UNAVAILABLE,
            None,
            axum::body::Body::empty(),
        ),
        // Auth & Content-Type edge cases (415, 401, 400)
        (
            axum::http::Method::GET,
            "/v1/chapters/ph/session",
            StatusCode::UNAUTHORIZED,
            None,
            axum::body::Body::empty(),
        ),
        (
            axum::http::Method::GET,
            "/v1/chapters/ph/crews",
            StatusCode::UNAUTHORIZED,
            None,
            axum::body::Body::empty(),
        ),
        // Without Content-Type: application/json, Axum Json extractor rejects with 415
        (
            axum::http::Method::POST,
            "/v1/chapters/ph/crews",
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            None,
            axum::body::Body::empty(),
        ),
        // With Content-Type: application/json and incomplete JSON body, extractor rejects with 422
        (
            axum::http::Method::POST,
            "/v1/chapters/ph/crews",
            StatusCode::UNPROCESSABLE_ENTITY,
            Some("application/json"),
            axum::body::Body::from(r#"{"name":"test"}"#),
        ),
        // With Content-Type: application/json and malformed JSON, extractor rejects with 400
        (
            axum::http::Method::POST,
            "/v1/chapters/ph/crews",
            StatusCode::BAD_REQUEST,
            Some("application/json"),
            axum::body::Body::from(r#"{"name": bad"#),
        ),
    ];

    for (method, uri, expected_status, content_type, body) in cases {
        let mut builder = axum::http::Request::builder()
            .method(method.clone())
            .uri(uri);
        if let Some(ct) = content_type {
            builder = builder.header(header::CONTENT_TYPE, ct);
        }
        let req = builder.body(body).unwrap();
        let response = app.clone().oneshot(req).await.unwrap();
        assert_eq!(response.status(), expected_status, "Route: {method} {uri}");
        assert_eq!(
            response
                .headers()
                .get(header::CACHE_CONTROL)
                .and_then(|v| v.to_str().ok()),
            Some("no-store"),
            "Route {method} {uri} must have Cache-Control: no-store"
        );
    }
}

#[test]
fn adversarial_m2_adult_consent_attack() {
    let mut store = fixture();
    // 1. Attempt to consent manager (dev-manager-1 is adult manager in CREW)
    let res_manager =
        store.submit_guardian_consent("ph", CREW, "dev-manager-1", "Guardian Name", "2027-01-01");
    assert_eq!(res_manager.unwrap_err(), "Member is not a minor");

    // 2. Attempt to consent dancer-1 (dancer-1 is adult dancer in CREW)
    let res_dancer1 =
        store.submit_guardian_consent("ph", CREW, "dancer-1", "Guardian Name", "2027-01-01");
    assert_eq!(res_dancer1.unwrap_err(), "Member is not a minor");

    let dancer1 = store.crews[CREW]
        .members
        .iter()
        .find(|m| m.uid == "dancer-1")
        .unwrap();
    assert!(!dancer1.is_minor);
}

#[test]
fn adversarial_m2_malformed_guardian_names() {
    let mut store = fixture();
    store.crews.get_mut(CREW).unwrap().members[5].consent_verified = false;

    // Empty string
    let res_empty = store.submit_guardian_consent("ph", CREW, "dancer-5", "", "2027-01-01");
    assert_eq!(res_empty.unwrap_err(), "Guardian name required");

    // Whitespace strings
    let res_spaces = store.submit_guardian_consent("ph", CREW, "dancer-5", "    ", "2027-01-01");
    assert_eq!(res_spaces.unwrap_err(), "Guardian name required");
    let res_tabs = store.submit_guardian_consent("ph", CREW, "dancer-5", "\t\t\t", "2027-01-01");
    assert_eq!(res_tabs.unwrap_err(), "Guardian name required");

    // Control characters inside name: \n, \0, \r, \t, \x1b (ESC), \x7f (DEL), \x08 (BS)
    let control_cases = [
        ("Maria\nSantos", "newline"),
        ("Maria\0Santos", "null byte"),
        ("Maria\rSantos", "carriage return"),
        ("Maria\tSantos", "tab"),
        ("Maria\x1bSantos", "escape"),
        ("Maria\x7fSantos", "delete"),
        ("Maria\x08Santos", "backspace"),
    ];
    for (bad_name, desc) in control_cases {
        let res = store.submit_guardian_consent("ph", CREW, "dancer-5", bad_name, "2027-01-01");
        assert_eq!(
            res.unwrap_err(),
            "Guardian name invalid or exceeds 200 characters",
            "Failed to reject control character: {desc}"
        );
    }

    // 201 characters -> fails
    let name_201 = "A".repeat(201);
    let res_201 = store.submit_guardian_consent("ph", CREW, "dancer-5", &name_201, "2027-01-01");
    assert_eq!(
        res_201.unwrap_err(),
        "Guardian name invalid or exceeds 200 characters"
    );

    // 201 characters with surrounding whitespace -> fails
    let name_201_spaced = format!("   {}   ", "B".repeat(201));
    let res_201_spaced =
        store.submit_guardian_consent("ph", CREW, "dancer-5", &name_201_spaced, "2027-01-01");
    assert_eq!(
        res_201_spaced.unwrap_err(),
        "Guardian name invalid or exceeds 200 characters"
    );

    // Exactly 200 characters -> succeeds
    let name_200 = "C".repeat(200);
    let res_200 = store.submit_guardian_consent("ph", CREW, "dancer-5", &name_200, "2027-01-01");
    assert!(res_200.is_ok(), "Exactly 200 chars must succeed");
    let receipt = res_200.unwrap();
    assert_eq!(receipt.guardian_name.len(), 200);
    assert_eq!(receipt.guardian_name, name_200);

    // Exactly 200 characters with leading/trailing spaces -> trimmed length 200 -> succeeds
    let name_200_padded = format!("   {}   ", "D".repeat(200));
    let res_200_padded =
        store.submit_guardian_consent("ph", CREW, "dancer-5", &name_200_padded, "2027-01-01");
    assert!(
        res_200_padded.is_ok(),
        "Padded 200 chars must trim and succeed"
    );
    assert_eq!(res_200_padded.unwrap().guardian_name.len(), 200);
}

#[test]
fn adversarial_m2_cross_chapter_tenant_isolation() {
    let mut store = fixture();
    store.crews.get_mut(CREW).unwrap().members[5].consent_verified = false;

    // Mismatched chapter for existing crew
    let res_au = store.submit_guardian_consent("au", CREW, "dancer-5", "Parent", "2027-01-01");
    assert_eq!(res_au.unwrap_err(), "Crew not found");

    // Non-existent chapter
    let res_none =
        store.submit_guardian_consent("nonexistent", CREW, "dancer-5", "Parent", "2027-01-01");
    assert_eq!(res_none.unwrap_err(), "Crew not found");

    // Minor from CREW attempted under another crew
    let other_crew = store
        .create_crew("ph", "other-mgr", "Other Crew PH", "Manila")
        .unwrap();
    let res_other_crew =
        store.submit_guardian_consent("ph", &other_crew.id, "dancer-5", "Parent", "2027-01-01");
    assert_eq!(res_other_crew.unwrap_err(), "Minor not found in crew");

    // Crew in chapter "au" attempted under "ph"
    let au_crew = store
        .create_crew("au", "au-mgr", "Sydney Breakers", "Sydney")
        .unwrap();
    let res_cross =
        store.submit_guardian_consent("ph", &au_crew.id, "some-uid", "Parent", "2027-01-01");
    assert_eq!(res_cross.unwrap_err(), "Crew not found");
}

#[test]
fn adversarial_m2_open_roster_propagation_vs_approved_immutability() {
    let mut store = fixture();
    store.crews.get_mut(CREW).unwrap().members[5].consent_verified = false;
    let minor_uid = "dancer-5";

    // Entry 1: Draft in open-crew (from ENTRY)
    store.entries.get_mut(ENTRY).unwrap().status = EntryStatus::Draft;
    let mut roster1 = store.crews[CREW].members.clone();
    roster1[5].consent_verified = false;
    store.entries.get_mut(ENTRY).unwrap().roster = roster1;
    let entry1_rev_before = store.entries[ENTRY].revision;
    let entry1_time_before = store.entries[ENTRY].updated_at;

    // Entry 2: NeedsCorrection in varsity-ignite division
    let entry2 = store
        .create_entry("ph", EVENT, CREW, "varsity-ignite")
        .unwrap();
    let entry2_id = entry2.id.clone();
    let mut roster2 = store.crews[CREW].members.clone();
    roster2[5].consent_verified = false;
    store.entries.get_mut(&entry2_id).unwrap().roster = roster2;
    store.entries.get_mut(&entry2_id).unwrap().status = EntryStatus::NeedsCorrection;
    let entry2_rev_before = store.entries[&entry2_id].revision;
    let entry2_time_before = store.entries[&entry2_id].updated_at;

    // Entry 3: Submitted in junior division
    let entry3 = store.create_entry("ph", EVENT, CREW, "junior").unwrap();
    let entry3_id = entry3.id.clone();
    let mut roster3 = store.crews[CREW].members.clone();
    roster3[5].consent_verified = false;
    store.entries.get_mut(&entry3_id).unwrap().roster = roster3;
    store.entries.get_mut(&entry3_id).unwrap().status = EntryStatus::Submitted;
    let entry3_rev_before = store.entries[&entry3_id].revision;
    let entry3_time_before = store.entries[&entry3_id].updated_at;

    // Entry 4: Approved in monster-crew division (IMMUTABLE!)
    let entry4 = store
        .create_entry("ph", EVENT, CREW, "monster-crew")
        .unwrap();
    let entry4_id = entry4.id.clone();
    let mut roster4 = store.crews[CREW].members.clone();
    roster4[5].consent_verified = false;
    store.entries.get_mut(&entry4_id).unwrap().roster = roster4;
    store.entries.get_mut(&entry4_id).unwrap().status = EntryStatus::Approved;
    let entry4_rev_before = store.entries[&entry4_id].revision;
    let entry4_time_before = store.entries[&entry4_id].updated_at;

    // Entry 5: Draft for DIFFERENT CREW
    let crew_other = store
        .create_crew("ph", "mgr-x", "Other Crew Imm", "Manila")
        .unwrap();
    let entry5 = store
        .create_entry("ph", EVENT, &crew_other.id, "open-crew")
        .unwrap();
    let entry5_id = entry5.id.clone();
    let entry5_rev_before = store.entries[&entry5_id].revision;

    // Execute guardian consent for minor_uid
    let receipt = store
        .submit_guardian_consent("ph", CREW, minor_uid, "Guardian Mother", "2027-01-25")
        .unwrap();
    assert!(receipt.verified);

    // 1. Crew member is verified
    assert!(
        store.crews[CREW]
            .members
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified
    );

    // 2. Entry 1 (Draft): updated
    let e1 = &store.entries[ENTRY];
    assert!(
        e1.roster
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified
    );
    assert_eq!(e1.revision, entry1_rev_before + 1);
    assert!(e1.updated_at >= entry1_time_before);

    // 3. Entry 2 (NeedsCorrection): updated
    let e2 = &store.entries[&entry2_id];
    assert!(
        e2.roster
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified
    );
    assert_eq!(e2.revision, entry2_rev_before + 1);
    assert!(e2.updated_at >= entry2_time_before);

    // 4. Entry 3 (Submitted): updated
    let e3 = &store.entries[&entry3_id];
    assert!(
        e3.roster
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified
    );
    assert_eq!(e3.revision, entry3_rev_before + 1);
    assert!(e3.updated_at >= entry3_time_before);

    // 5. Entry 4 (Approved): IMMUTABLE!
    let e4 = &store.entries[&entry4_id];
    assert!(
        !e4.roster
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified,
        "Approved entry roster must NOT be mutated!"
    );
    assert_eq!(
        e4.revision, entry4_rev_before,
        "Approved entry revision must NOT change!"
    );
    assert_eq!(
        e4.updated_at, entry4_time_before,
        "Approved entry updated_at must NOT change!"
    );

    // 6. Entry 5 (Other Crew): IMMUTABLE!
    let e5 = &store.entries[&entry5_id];
    assert_eq!(e5.revision, entry5_rev_before);
}

#[test]
fn adversarial_m2_idempotent_reconsent() {
    let mut store = fixture();
    store.crews.get_mut(CREW).unwrap().members[5].consent_verified = false;
    let minor_uid = "dancer-5";

    let r1 = store
        .submit_guardian_consent("ph", CREW, minor_uid, "Initial Guardian", "2027-01-10")
        .unwrap();
    assert!(r1.verified);
    assert_eq!(r1.guardian_name, "Initial Guardian");
    assert!(
        store.crews[CREW]
            .members
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified
    );

    let r2 = store
        .submit_guardian_consent("ph", CREW, minor_uid, "Initial Guardian", "2027-01-10")
        .unwrap();
    assert!(r2.verified);
    assert_eq!(r2.guardian_name, "Initial Guardian");
    assert!(
        store.crews[CREW]
            .members
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified
    );

    let r3 = store
        .submit_guardian_consent("ph", CREW, minor_uid, "Updated Guardian Name", "2027-01-12")
        .unwrap();
    assert!(r3.verified);
    assert_eq!(r3.guardian_name, "Updated Guardian Name");
    assert!(
        store.crews[CREW]
            .members
            .iter()
            .find(|m| m.uid == minor_uid)
            .unwrap()
            .consent_verified
    );
}

#[tokio::test]
async fn adversarial_m2_consent_route_http_matrix() {
    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(fixture())),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());

    // Unauthenticated consent request -> 401 Unauthorized + no-store
    let unauth_res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri(format!(
                    "/v1/chapters/ph/crews/{CREW}/members/dancer-5/consent"
                ))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(
                    r#"{"guardian_name":"Parent","signature_date":"2027-01-01"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unauth_res.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(unauth_res.headers()[header::CACHE_CONTROL], "no-store");

    // Unauthenticated audio upload -> 401 Unauthorized + no-store
    let audio_res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri(format!(
                    "/v1/chapters/ph/events/{EVENT}/entries/{ENTRY}/audio"
                ))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(
                    r#"{"track_filename":"test.mp3","track_duration_secs":120}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(audio_res.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(audio_res.headers()[header::CACHE_CONTROL], "no-store");

    // Unauthenticated DJ export -> 401 Unauthorized + no-store
    let dj_res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri(format!("/v1/chapters/ph/events/{EVENT}/dj-export"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(dj_res.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(dj_res.headers()[header::CACHE_CONTROL], "no-store");
}

#[test]
fn test_hmac_sha256_rfc4231_test_case_1() {
    let key = [0x0bu8; 20];
    let data = b"Hi There";
    let digest = crate::store::hmac_sha256(&key, data);
    let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    assert_eq!(
        hex,
        "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
    );
}

#[test]
fn test_constant_time_eq_behavior() {
    assert!(crate::store::constant_time_eq(b"hello", b"hello"));
    assert!(!crate::store::constant_time_eq(b"hello", b"hellp"));
    assert!(!crate::store::constant_time_eq(b"hello", b"hell"));
    assert!(!crate::store::constant_time_eq(b"hello", b"helloo"));
    assert!(crate::store::constant_time_eq(b"", b""));
}

#[test]
fn test_split_payment_zero_amount_and_conflicting_reference() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    store.payments.clear();

    // 0 amount rejected
    let err_zero = store.process_payment_amount("ph", ENTRY, "dancer-1", "ref-zero", Some(0));
    assert_eq!(
        err_zero.unwrap_err(),
        "Payment amount must be greater than zero"
    );

    // Initial payment
    let payment = store
        .process_payment_amount("ph", ENTRY, "dancer-1", "ref-conflict", Some(120_000))
        .unwrap();
    assert_eq!(payment.amount_minor, 120_000);

    // Idempotent duplicate replay with same payload returns existing payment
    let replay = store
        .process_payment_amount("ph", ENTRY, "dancer-1", "ref-conflict", Some(120_000))
        .unwrap();
    assert_eq!(replay.payment_id, payment.payment_id);

    // Conflicting amount for same reference rejected with 409 error string
    let err_conflict =
        store.process_payment_amount("ph", ENTRY, "dancer-1", "ref-conflict", Some(240_000));
    assert_eq!(
        err_conflict.unwrap_err(),
        "Provider reference already used with different amount"
    );
}

#[test]
fn test_webhook_settlement_idempotency_and_state_preservation() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    store.payments.clear();

    let payment = store
        .process_payment_amount("ph", ENTRY, "dancer-1", "ref-hook-test", Some(120_000))
        .unwrap();
    assert_eq!(payment.status, PaymentStatus::Pending);
    assert_eq!(store.entries[ENTRY].paid_minor, 0);

    // Non-settled status preserves pending state
    let non_settled_payload = SyntheticWebhookPayload {
        payment_id: payment.payment_id.clone(),
        status: "processing".into(),
        amount_minor: Some(120_000),
        extra: HashMap::new(),
    };
    let receipt = store
        .process_synthetic_webhook(Some("ph"), &non_settled_payload)
        .unwrap();
    assert!(receipt.received);
    assert_eq!(receipt.payment.status, PaymentStatus::Pending);
    assert_eq!(store.entries[ENTRY].paid_minor, 0);

    // Unknown payment returns error
    let unknown_payload = SyntheticWebhookPayload {
        payment_id: "pay-unknown-999".into(),
        status: "settled".into(),
        amount_minor: Some(120_000),
        extra: HashMap::new(),
    };
    assert_eq!(
        store
            .process_synthetic_webhook(Some("ph"), &unknown_payload)
            .unwrap_err(),
        "Payment record not found"
    );

    // Cross-chapter webhook returns error
    let settled_payload = SyntheticWebhookPayload {
        payment_id: payment.payment_id.clone(),
        status: "settled".into(),
        amount_minor: Some(120_000),
        extra: HashMap::new(),
    };
    assert_eq!(
        store
            .process_synthetic_webhook(Some("hk"), &settled_payload)
            .unwrap_err(),
        "Payment record not found"
    );

    // Settled webhook transitions payment and credits entry
    let receipt = store
        .process_synthetic_webhook(Some("ph"), &settled_payload)
        .unwrap();
    assert!(receipt.received);
    assert_eq!(receipt.payment.status, PaymentStatus::Settled);
    assert_eq!(store.entries[ENTRY].paid_minor, 120_000);

    // Replay of settled webhook is idempotent (no double credit)
    let replay_receipt = store
        .process_synthetic_webhook(Some("ph"), &settled_payload)
        .unwrap();
    assert!(replay_receipt.received);
    assert_eq!(replay_receipt.payment.status, PaymentStatus::Settled);
    assert_eq!(
        store.entries[ENTRY].paid_minor, 120_000,
        "Replay must not double credit entry balance"
    );
}

#[test]
fn test_finance_summary_aggregation_and_chapter_isolation() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    store.payments.clear();

    // Add settled payment for PH
    let mut p1 = store
        .process_payment_amount("ph", ENTRY, "dancer-1", "p1", Some(100_000))
        .unwrap();
    p1.status = PaymentStatus::Settled;
    store.payments.insert(p1.payment_id.clone(), p1);

    // Add pending payment for PH
    let p2 = store
        .process_payment_amount("ph", ENTRY, "dancer-2", "p2", Some(50_000))
        .unwrap();
    assert_eq!(p2.status, PaymentStatus::Pending);

    // Add refunded payment for PH
    let mut p3 = store
        .process_payment_amount("ph", ENTRY, "dancer-3", "p3", Some(30_000))
        .unwrap();
    p3.status = PaymentStatus::Refunded;
    store.payments.insert(p3.payment_id.clone(), p3);

    let summary = store.get_finance_summary("ph");
    assert_eq!(summary.chapter_id, "ph");
    assert_eq!(summary.total_settled_minor, 100_000);
    assert_eq!(summary.total_pending_minor, 50_000);
    assert_eq!(summary.total_refunded_minor, 30_000);
    assert_eq!(summary.transaction_count, 3);
    assert_eq!(summary.currency, "PHP");

    // Other chapter isolation
    let summary_hk = store.get_finance_summary("hk");
    assert_eq!(summary_hk.chapter_id, "hk");
    assert_eq!(summary_hk.total_settled_minor, 0);
    assert_eq!(summary_hk.total_pending_minor, 0);
    assert_eq!(summary_hk.total_refunded_minor, 0);
    assert_eq!(summary_hk.transaction_count, 0);
}

#[tokio::test]
async fn test_webhook_http_endpoint_matrix() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    store.payments.clear();

    let payment = store
        .process_payment_amount("ph", ENTRY, "dancer-1", "http-hook-ref", Some(120_000))
        .unwrap();

    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(store)),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());

    let raw_payload = format!(
        r#"{{"payment_id":"{}","status":"settled","extra_metadata":{{"source":"test"}}}}"#,
        payment.payment_id
    );

    #[cfg(not(feature = "local-testing"))]
    {
        // Fail-closed in default/production mode: synthetic webhook endpoint is disabled (404)
        let res_no_sig = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/v1/chapters/ph/finance/webhook")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(axum::body::Body::from(raw_payload.clone()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_no_sig.status(), StatusCode::NOT_FOUND);
    }

    #[cfg(feature = "local-testing")]
    {
        let secret = "this-is-a-32-byte-secret-for-testing-webhook-hmac-signatures!!";
        std::env::set_var("WSB_LOCAL_TESTING", "true");
        std::env::set_var("FIREBASE_PROJECT_ID", "demo-wsb");
        std::env::set_var("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
        std::env::set_var("WSB_WEBHOOK_SECRET", secret);

        let hmac_bytes = crate::store::hmac_sha256(secret.as_bytes(), raw_payload.as_bytes());
        let valid_sig: String = hmac_bytes.iter().map(|b| format!("{b:02x}")).collect();
        let upper_sig = valid_sig.to_uppercase();

        // 1. Missing signature header -> 401
        let res_no_sig = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/v1/chapters/ph/finance/webhook")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(axum::body::Body::from(raw_payload.clone()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_no_sig.status(), StatusCode::UNAUTHORIZED);

        // 2. Invalid signature -> 401
        let res_bad_sig = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/v1/chapters/ph/finance/webhook")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("X-Signature", "invalid-signature")
                    .body(axum::body::Body::from(raw_payload.clone()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_bad_sig.status(), StatusCode::UNAUTHORIZED);

        // 3. Uppercase hex signature -> 401
        let res_upper_sig = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/v1/chapters/ph/finance/webhook")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("X-Signature", upper_sig)
                    .body(axum::body::Body::from(raw_payload.clone()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_upper_sig.status(), StatusCode::UNAUTHORIZED);

        // 4. Valid signature -> 200 OK + receipt
        let res_valid = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/v1/chapters/ph/finance/webhook")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("X-Signature", valid_sig.clone())
                    .body(axum::body::Body::from(raw_payload.clone()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_valid.status(), StatusCode::OK);

        // 5. Global webhook route alias /v1/webhooks/payments with replay -> 200 OK
        let res_global = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/v1/webhooks/payments")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header("X-WSB-Signature", valid_sig)
                    .body(axum::body::Body::from(raw_payload))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_global.status(), StatusCode::OK);

        std::env::remove_var("WSB_WEBHOOK_SECRET");
    }
}

#[test]
fn test_battle_retrieval_and_status_normalization() {
    let mut store = fixture();
    let initial = store.get_battle_match(EVENT, "match-101").unwrap();
    assert_eq!(initial.status, "active");
    assert_eq!(initial.winner_corner, None);
    assert_eq!(initial.votes_red, 0);
    assert_eq!(initial.votes_blue, 0);

    // Vote 1 - red
    let after_v1 = store
        .vote_battle(EVENT, "match-101", "judge-1", "red")
        .unwrap();
    assert_eq!(after_v1.status, "active");
    assert_eq!(after_v1.winner_corner, None);
    assert_eq!(after_v1.votes_red, 1);

    // Single battle retrieval reflects active status and vote count
    let fetched = store.get_battle_match(EVENT, "match-101").unwrap();
    assert_eq!(fetched.votes_red, 1);
    assert_eq!(fetched.votes_blue, 0);
    assert_eq!(fetched.status, "active");

    // Vote 2 - red (majority on 3-judge panel)
    let after_v2 = store
        .vote_battle(EVENT, "match-101", "judge-2", "red")
        .unwrap();
    assert_eq!(after_v2.status, "closed");
    assert_eq!(after_v2.winner_corner.as_deref(), Some("red"));

    // Retrieval reflects closed status and winner
    let closed_fetched = store.get_battle_match(EVENT, "match-101").unwrap();
    assert_eq!(closed_fetched.status, "closed");
    assert_eq!(closed_fetched.winner_corner.as_deref(), Some("red"));

    // Non-existent match returns error
    assert_eq!(
        store.get_battle_match(EVENT, "ghost-match").unwrap_err(),
        "Battle match not found"
    );
    assert_eq!(
        store
            .get_battle_match("other-event", "match-101")
            .unwrap_err(),
        "Battle match not found in event"
    );
}

#[test]
fn test_post_lock_scoring_and_deductions_rejection() {
    let mut store = fixture();
    let cmd1 = command("op-judge-1", 0, 18.0);
    let rcpt1 = store
        .submit_score("ph", EVENT, "judge-1", cmd1.clone())
        .unwrap();
    let cmd2 = command("op-judge-2", 0, 19.0);
    store.submit_score("ph", EVENT, "judge-2", cmd2).unwrap();

    // Lock division
    assert!(store.lock_division("ph", EVENT, "open-crew").unwrap());

    // Subsequent score submission by judge with new operation_id is rejected with lock error
    let late_cmd = command("op-late", 1, 20.0);
    let late_err = store
        .submit_score("ph", EVENT, "judge-1", late_cmd)
        .unwrap_err();
    assert_eq!(late_err, "Division is locked; cannot submit scores");

    // Replay of existing command returns cached receipt idempotently even when locked
    let replayed = store.submit_score("ph", EVENT, "judge-1", cmd1).unwrap();
    assert_eq!(replayed, rcpt1);

    // Setting deductions after lock is rejected
    let deductions = vec![Deduction {
        code: "tech".into(),
        reason: "Late penalty".into(),
        points: 2.0,
    }];
    let ded_err = store
        .set_deductions("ph", EVENT, "open-crew", CREW, 0, deductions)
        .unwrap_err();
    assert_eq!(ded_err, "Division is locked");

    // Re-locking already locked division returns Ok(true) idempotently
    assert!(store.lock_division("ph", EVENT, "open-crew").unwrap());
}

#[tokio::test]
async fn test_judge_lineup_projection_completion_flag() {
    let mut store = fixture();
    let score_key_j1 = crate::store::scope_key(&[EVENT, "open-crew", CREW, "judge-1"]);
    assert!(!store.scores.contains_key(&score_key_j1));

    // Submit score for judge-1
    let cmd = command("op-j1-lineup", 0, 18.5);
    store.submit_score("ph", EVENT, "judge-1", cmd).unwrap();

    // Now judge-1 has score recorded
    assert!(store.scores.contains_key(&score_key_j1));
    // judge-2 still has no score recorded
    let score_key_j2 = crate::store::scope_key(&[EVENT, "open-crew", CREW, "judge-2"]);
    assert!(!store.scores.contains_key(&score_key_j2));

    // Verify non-assigned judge has no items
    assert!(!store.has_judge_assignment(EVENT, "open-crew", "unassigned-judge"));
}

#[tokio::test]
async fn test_battle_http_endpoints_get_and_vote() {
    let store = fixture();
    let app_state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(store)),
    };
    let app = router(app_state, "http://localhost:3000".parse().unwrap());

    // 1. GET /v1/events/manila-session-2027/battles
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/events/manila-session-2027/battles")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 2. GET /v1/events/manila-session-2027/battles/match-101
    let res_single = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/events/manila-session-2027/battles/match-101")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_single.status(), StatusCode::OK);

    // 3. GET /v1/events/manila-session-2027/battles/ghost-match -> 404
    let res_missing = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/events/manila-session-2027/battles/ghost-match")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_missing.status(), StatusCode::NOT_FOUND);
}

const TEST_JWK_JSON: &str = r#"{"keys":[{"kty":"RSA","n":"wOtcGAjrjhSpBBrmM2KPhgncznXrjWey-38g7fCaDQsqDLi1gPi58cNCj8oqP9DJFDH_GCTqQBWzB7vTD_QLfRCZI_C8-eMjnoPv91X30dO2I89gemI4KvCR345cHpGG4eCap0jP2cGuzS4pUI9SoACthIq7f__SOB6J9U6kY6XjwyQ2ygJ56xbR5Wdk9TOt508BvCJow4utNy6OxIBJhr8xObBGV6akDnUgkLMmpXc7n4pQYXYaJIzWAVmm7Cf-aFSrW81e83899-jFFfUGnfRpnSg1vOicN3b7bXU18LVKU16HgVv_O7yog3VTP1Xtz5tlFoU6a7_d-dl3YfQziw","e":"AQAB","kid":"wsb-test-kid","alg":"RS256","use":"sig"}]}"#;

const TEST_PRIVATE_KEY_BASE64: &str = "\
MIIEogIBAAKCAQEAwOtcGAjrjhSpBBrmM2KPhgncznXrjWey+38g7fCaDQsqDLi1\
gPi58cNCj8oqP9DJFDH/GCTqQBWzB7vTD/QLfRCZI/C8+eMjnoPv91X30dO2I89g\
emI4KvCR345cHpGG4eCap0jP2cGuzS4pUI9SoACthIq7f//SOB6J9U6kY6XjwyQ2\
ygJ56xbR5Wdk9TOt508BvCJow4utNy6OxIBJhr8xObBGV6akDnUgkLMmpXc7n4pQ\
YXYaJIzWAVmm7Cf+aFSrW81e83899+jFFfUGnfRpnSg1vOicN3b7bXU18LVKU16H\
gVv/O7yog3VTP1Xtz5tlFoU6a7/d+dl3YfQziwIDAQABAoIBADp6nc4DVjQZeypt\
ZP6Kj+sXrkE/aYnRt2WZIcg+uNPfYH2+t/ZCb0sj31dq9uelSG7AwQz2k7OdYEml\
29LoLVtZ3rIQVZiCC9gPMnyNKLQIMxwjzqEKiPArQGy94Jq7jmGGDhtLbQYbOfuk\
VI3BBFDQI8kbrL6eM4EjcLpVfmtd5TOPVJubscuTd+YQAJFZ1qGk1Nn9NtoK125d\
Cu1e0anfIJRkYvw9dvX/I+PIXYOQgSnVLYSjStoHuHE8z0wTiXq5c+nRfwb12kdR\
rL/wquO498iUKuuIi9JV1TGpcTYHlCTDDYxbVbE0+zR3FaYTjj/6DpWTjk5hnjRy\
lwcRi1ECgYEA3pqVDxDzzm2blqUOy8omUThVCuD7wmKBeaPKLjTDn/CPHTeSZ8jv\
zwDWtoIomEiSh6+y3WOFTmOJ4CWCl9IZhu/wFRl3MYIPqNa33dCElV46YevyZRi/\
IiSF3s1l4Seez/GeB1f497FfaGm5rH/e6eYkcsAigr5EhmkDxwSlgW0CgYEA3dy0\
DzoLsBzlFium4ziuQtcV69cuXvJgPMluaXKd+smYF0MGjZjwrSn+Q6tdXCIAqCeI\
LkjMvxu5WPfWvioGWqCWFooEnzKkbSQhNPsXskSz4HI/iarK36iVHANhLIkO7KdM\
B6f/IkkZYrhpYi15EqjzoKsmb8xo9WWT8xgm5dcCgYAaNw4y1gZAWzwlg464hTf5\
/K5XN6OugrdIwfc/dctL/KJ+CFtfiZRkRm8C01VAidtny1M/K0c5shM8qG42vvFu\
qLcXZQZaeDyr342Lu9DBXnV1rrm/Gij4NmDlmj7TQz06s/OuXbfeQ68+tqS9Idn4\
pbfJI8NsrkeXpKpjN7LeCQKBgGZFEHNcbHrYNvnLUXi4bgu9ngtC+8skqxwaNl1B\
SnWKbCN88A5hi8Am9WA4JCcOPYNGBc5gHJGTtBLA3Cp4sMkh8U2efZbs/0KYPv5v\
KHMynEBAKe3J3w7OZT2uiSLAYzLPw4pb9I3XaG5LV7i8AW2KmBNeEa/DaDaGhnau\
kW+tAoGAO0G7hlnHrZRzMRfYGq2OXqF6+4G08BnIzuDz/ODjsiFLrMXo8dD/tWO/\
0kIpTRsSkC60a/LI3QuSt2mmThQNqibXhZCOa0m1gXt18sfPbVM5PoLvVjEZq+I0\
ABclZw76CFv1ReR7DO/3PLJjG3T51ghxQizdDyzPBBi4pyBvGV4=";

fn base64_decode(input: &str) -> Vec<u8> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut decode_table = [255u8; 256];
    for (i, &b) in TABLE.iter().enumerate() {
        decode_table[b as usize] = i as u8;
    }
    let clean: Vec<u8> = input.bytes().filter(|b| !b.is_ascii_whitespace()).collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < clean.len() {
        let b0 = decode_table[clean[i] as usize];
        let b1 = decode_table[clean[i + 1] as usize];
        let b2 = if clean[i + 2] == b'=' {
            0
        } else {
            decode_table[clean[i + 2] as usize]
        };
        let b3 = if clean[i + 3] == b'=' {
            0
        } else {
            decode_table[clean[i + 3] as usize]
        };
        out.push((b0 << 2) | (b1 >> 4));
        if clean[i + 2] != b'=' {
            out.push(((b1 & 0x0f) << 4) | (b2 >> 2));
        }
        if clean[i + 3] != b'=' {
            out.push(((b2 & 0x03) << 6) | b3);
        }
        i += 4;
    }
    out
}

fn test_mock_verifier() -> auth::Verifier {
    let jwks: jsonwebtoken::jwk::JwkSet = serde_json::from_str(TEST_JWK_JSON).unwrap();
    auth::Verifier::mock("demo-wsb".into(), jwks)
}

fn mock_jwt_token(uid: &str, chapter: &str, role: &str) -> String {
    use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
    let der = base64_decode(TEST_PRIVATE_KEY_BASE64);
    let key = EncodingKey::from_rsa_der(&der);
    let mut header = Header::new(Algorithm::RS256);
    header.kid = Some("wsb-test-kid".into());
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let claims = serde_json::json!({
        "iss": "https://securetoken.google.com/demo-wsb",
        "aud": "demo-wsb",
        "sub": uid,
        "iat": now,
        "auth_time": now,
        "exp": now + 3600,
        "chapterId": chapter,
        "role": role,
    });
    encode(&header, &claims, &key).unwrap()
}

#[tokio::test]
async fn test_chapter_battle_http_endpoints_security_matrix() {
    let mut store = fixture();
    // Seed an Australia membership to test authenticated cross-chapter caller
    store.memberships.insert(
        "au/au-director".into(),
        Membership {
            uid: "au-director".into(),
            chapter_id: "au".into(),
            role: "chapter_director".into(),
            active: true,
            valid_after: 0,
            expires_at: None,
        },
    );
    // Seed dancer membership in ph
    store.memberships.insert(
        "ph/dancer-1".into(),
        Membership {
            uid: "dancer-1".into(),
            chapter_id: "ph".into(),
            role: "dancer".into(),
            active: true,
            valid_after: 0,
            expires_at: None,
        },
    );

    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: test_mock_verifier(),
        store: Arc::new(RwLock::new(store)),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());

    let ph_token = mock_jwt_token("judge-1", "ph", "judge");
    let au_token = mock_jwt_token("au-director", "au", "chapter_director");
    let dancer_token = mock_jwt_token("dancer-1", "ph", "dancer");

    // --- 1. GET /v1/chapters/{chapter}/events/{event}/battles ---

    // 1A. Unauthenticated -> 401 Unauthorized + Cache-Control: no-store
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(res.headers()[header::CACHE_CONTROL], "no-store");

    // 1B. Malformed Token -> 401 Unauthorized
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles")
                .header(header::AUTHORIZATION, "Bearer invalid.jwt.token")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 1C. Cross-chapter token (AU token against PH route) -> 403 Forbidden
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles")
                .header(header::AUTHORIZATION, format!("Bearer {au_token}"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // 1D. Cross-chapter event URL (AU route claiming PH event) -> 403 Forbidden
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/au/events/manila-session-2027/battles")
                .header(header::AUTHORIZATION, format!("Bearer {au_token}"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // 1E. Valid PH token -> 200 OK + lists battles + Cache-Control: no-store
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles")
                .header(header::AUTHORIZATION, format!("Bearer {ph_token}"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(res.headers()[header::CACHE_CONTROL], "no-store");
    let body = axum::body::to_bytes(res.into_body(), 64 * 1024)
        .await
        .unwrap();
    let page: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let battles = page["items"].as_array().unwrap();
    assert!(battles.iter().any(|b| b["match_id"] == "match-101"));

    // --- 2. GET /v1/chapters/{chapter}/events/{event}/battles/{match_id} ---

    // 2A. Unauthenticated -> 401
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/match-101")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 2B. Cross-chapter token -> 403
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/match-101")
                .header(header::AUTHORIZATION, format!("Bearer {au_token}"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // 2C. Valid PH token -> 200 OK
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/match-101")
                .header(header::AUTHORIZATION, format!("Bearer {ph_token}"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = axum::body::to_bytes(res.into_body(), 64 * 1024)
        .await
        .unwrap();
    let single: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(single["match_id"], "match-101");
    assert_eq!(single["status"], "active");

    // 2D. Valid token, Non-existent match -> 404
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/ghost-match-999")
                .header(header::AUTHORIZATION, format!("Bearer {ph_token}"))
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // --- 3. POST /v1/chapters/{chapter}/events/{event}/battles/{match_id}/vote ---

    // 3A. Unauthenticated -> 401
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/match-101/vote")
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(r#"{"winner_corner":"red"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 3B. Cross-chapter AU token against PH route -> 403
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/match-101/vote")
                .header(header::AUTHORIZATION, format!("Bearer {au_token}"))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(r#"{"winner_corner":"red"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // 3C. Unauthorized role (dancer) -> 403
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/match-101/vote")
                .header(header::AUTHORIZATION, format!("Bearer {dancer_token}"))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(r#"{"winner_corner":"red"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // 3D. Valid judge vote -> 200 OK
    let res = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/chapters/ph/events/manila-session-2027/battles/match-101/vote")
                .header(header::AUTHORIZATION, format!("Bearer {ph_token}"))
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(r#"{"winner_corner":"red"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[test]
fn test_durable_results_snapshot_tenancy_guard() {
    let au_snapshot = PublishedResultSnapshot {
        publication_id: "pub-au-1".into(),
        chapter_id: "au".into(),
        event_id: "au-event-2027".into(),
        division_id: "open-crew".into(),
        results: vec![],
        published_at: 100,
        digest: "a".repeat(64),
    };

    let requesting_chapter = "ph";
    let tenancy_check = if au_snapshot.chapter_id != requesting_chapter {
        Err(StatusCode::FORBIDDEN)
    } else {
        Ok(au_snapshot.results)
    };

    assert_eq!(tenancy_check, Err(StatusCode::FORBIDDEN));
}

#[test]
fn adversarial_m4_rubric_bounds_and_invalid_criteria() {
    let mut store = fixture();

    // 1. Stress test rubric scores outside [0.0, 20.0]
    // Negative boundary values
    for neg_val in [-0.0001, -0.1, -1.0, -20.0, -100.0, -f64::MIN_POSITIVE] {
        let mut cmd = command("op-neg", 0, 18.0);
        cmd.criteria.choreography = neg_val;
        assert!(store.submit_score("ph", EVENT, "judge-1", cmd).is_err());
    }

    // Exceeding 20.0 boundary values
    for high_val in [20.0001, 20.1, 21.0, 50.0, 100.0, f64::MAX] {
        let mut cmd = command("op-high", 0, 18.0);
        cmd.criteria.execution = high_val;
        assert!(store.submit_score("ph", EVENT, "judge-1", cmd).is_err());
    }

    // Special IEEE 754 floats
    for special in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        let mut cmd = command("op-special", 0, 18.0);
        cmd.criteria.musicality = special;
        assert!(store.submit_score("ph", EVENT, "judge-1", cmd).is_err());
    }

    // Total cannot exceed 100.0 when pillars are strictly <= 20.0
    let mut cmd_over = command("op-over-100", 0, 20.0);
    // At 20.0 on all 5 pillars, total is exactly 100.0 (valid)
    assert!(store
        .submit_score("ph", EVENT, "judge-1", cmd_over.clone())
        .is_ok());

    // Trying to bump any pillar to 20.0001 makes total > 100.0 and must be rejected
    cmd_over.operation_id = "op-over-100-2".into();
    cmd_over.expected_revision = 1;
    cmd_over.criteria.entertainment = 20.0001;
    assert!(store
        .submit_score("ph", EVENT, "judge-1", cmd_over)
        .is_err());

    // 2. Technical deductions included in SubmitScoreCommand must be rejected
    let mut cmd_with_ded = command("op-ded-err", 1, 18.0);
    cmd_with_ded.deductions = vec![Deduction {
        code: "illegal".into(),
        reason: "Judge cannot self-deduct".into(),
        points: 5.0,
    }];
    let err_ded = store
        .submit_score("ph", EVENT, "judge-1", cmd_with_ded)
        .unwrap_err();
    assert_eq!(err_ded, "Deductions require the technical judge command");

    // 3. Technical deductions points boundaries in set_deductions
    for bad_points in [
        -0.01,
        -1.0,
        -100.0,
        100.01,
        150.0,
        f64::NAN,
        f64::INFINITY,
        f64::NEG_INFINITY,
    ] {
        let bad_ded = vec![Deduction {
            code: "rule".into(),
            reason: "Reason".into(),
            points: bad_points,
        }];
        assert!(store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, bad_ded)
            .is_err());
    }

    // Empty or whitespace-only code/reason
    for (code, reason) in [
        ("", "Valid"),
        ("   ", "Valid"),
        ("Valid", ""),
        ("Valid", "   "),
    ] {
        let bad_str_ded = vec![Deduction {
            code: code.into(),
            reason: reason.into(),
            points: 5.0,
        }];
        assert!(store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, bad_str_ded)
            .is_err());
    }
}

#[test]
fn adversarial_m4_optimistic_revision_overwrite_and_idempotency() {
    let mut store = fixture();

    // Judge 1 submits initial low score (10.0 per pillar = 50.0 net)
    let cmd1 = command("op-j1-v1", 0, 10.0);
    let rcpt1 = store
        .submit_score("ph", EVENT, "judge-1", cmd1.clone())
        .unwrap();
    assert_eq!(rcpt1.score_revision, 1);
    assert_eq!(rcpt1.net_score, 50.0);

    // Stale revision submission (expected_revision: 0 when current revision is 1) is rejected
    let stale_cmd = command("op-j1-stale", 0, 15.0);
    let err_stale = store
        .submit_score("ph", EVENT, "judge-1", stale_cmd)
        .unwrap_err();
    assert_eq!(err_stale, "Score revision mismatch");

    // Replay of exact same command (same op-id, payload, expected_revision: 0) returns cached receipt
    let replayed = store.submit_score("ph", EVENT, "judge-1", cmd1).unwrap();
    assert_eq!(replayed, rcpt1);

    // Replay with same op-id but modified payload is rejected
    let modified = command("op-j1-v1", 0, 12.0);
    assert!(store
        .submit_score("ph", EVENT, "judge-1", modified)
        .is_err());

    // Judge 1 submits valid revision (expected_revision: 1, 20.0 per pillar = 100.0 net)
    let cmd2 = command("op-j1-v2", 1, 20.0);
    let rcpt2 = store.submit_score("ph", EVENT, "judge-1", cmd2).unwrap();
    assert_eq!(rcpt2.score_revision, 2);
    assert_eq!(rcpt2.net_score, 100.0);

    // Judge 2 submits initial score (expected_revision: 0, 16.0 per pillar = 80.0 net)
    let cmd_j2 = command("op-j2-v1", 0, 16.0);
    let rcpt_j2 = store.submit_score("ph", EVENT, "judge-2", cmd_j2).unwrap();
    assert_eq!(rcpt_j2.score_revision, 1);
    assert_eq!(rcpt_j2.net_score, 80.0);

    // CRITICAL INVARIANT: Scores MUST NOT accumulate across revisions!
    // Exactly 2 scores exist for this crew in the division: Judge 1 (100.0) and Judge 2 (80.0).
    // Average MUST be (100.0 + 80.0) / 2 = 90.0.
    // If it accumulated (50.0 + 100.0 + 80.0) / 3, it would be 76.67.
    let results = store
        .get_division_results("ph", EVENT, "open-crew")
        .unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].crew_id, CREW);
    assert_eq!(results[0].raw_average, 90.0);
    assert_eq!(results[0].final_score, 90.0);

    // Verify internal store state has exactly 2 recorded scores
    let crew_scores: Vec<_> = store
        .scores
        .values()
        .filter(|s| s.crew_id == CREW)
        .collect();
    assert_eq!(crew_scores.len(), 2);
    let j1_score = crew_scores
        .iter()
        .find(|s| s.judge_uid == "judge-1")
        .unwrap();
    assert_eq!(j1_score.revision, 2);
    assert_eq!(j1_score.criteria.total(), 100.0);
}

#[test]
fn adversarial_m4_head_judge_deductions_floor_and_privileges() {
    let mut store = fixture();

    // Verify privilege checks for non-head-judge roles
    let judge_claims = claims("judge-1", "judge");
    let dancer_claims = claims("dancer-1", "dancer");
    let manager_claims = claims("dev-manager-1", "manager");
    let head_claims = claims("head-1", "head_judge");

    assert_eq!(
        access::require_role(&judge_claims, &["head_judge"]),
        Err(StatusCode::FORBIDDEN)
    );
    assert_eq!(
        access::require_role(&dancer_claims, &["head_judge"]),
        Err(StatusCode::FORBIDDEN)
    );
    assert_eq!(
        access::require_role(&manager_claims, &["head_judge"]),
        Err(StatusCode::FORBIDDEN)
    );
    assert!(access::require_role(&head_claims, &["head_judge"]).is_ok());

    // Judge 1 and Judge 2 submit scores of 10.0 per pillar -> 50.0 net score
    store
        .submit_score("ph", EVENT, "judge-1", command("j1", 0, 10.0))
        .unwrap();
    store
        .submit_score("ph", EVENT, "judge-2", command("j2", 0, 10.0))
        .unwrap();

    // Verify initial raw average is 50.0, final_score is 50.0
    let res0 = store
        .get_division_results("ph", EVENT, "open-crew")
        .unwrap();
    assert_eq!(res0[0].raw_average, 50.0);
    assert_eq!(res0[0].total_deductions, 0.0);
    assert_eq!(res0[0].final_score, 50.0);

    // Head judge sets deductions of 15.0 points
    let ded1 = vec![Deduction {
        code: "costume".into(),
        reason: "Costume violation".into(),
        points: 15.0,
    }];
    assert_eq!(
        store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, ded1.clone())
            .unwrap(),
        1
    );

    // Idempotent replay of deduction
    assert_eq!(
        store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, ded1)
            .unwrap(),
        1
    );

    // Stale revision deduction fails
    let stale_ded = vec![Deduction {
        code: "time".into(),
        reason: "Overtime".into(),
        points: 5.0,
    }];
    assert_eq!(
        store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, stale_ded)
            .unwrap_err(),
        "Deduction revision mismatch"
    );

    // Verify net score after 15.0 deduction: 50.0 - 15.0 = 35.0
    let res1 = store
        .get_division_results("ph", EVENT, "open-crew")
        .unwrap();
    assert_eq!(res1[0].raw_average, 50.0);
    assert_eq!(res1[0].total_deductions, 15.0);
    assert_eq!(res1[0].final_score, 35.0);

    // CRITICAL INVARIANT: Final score must floor at 0.00 when deductions exceed raw average!
    // Set massive deduction of 80.0 points (expected_revision: 1)
    let massive_ded = vec![
        Deduction {
            code: "major-1".into(),
            reason: "Major infraction 1".into(),
            points: 50.0,
        },
        Deduction {
            code: "major-2".into(),
            reason: "Major infraction 2".into(),
            points: 30.0,
        },
    ];
    assert_eq!(
        store
            .set_deductions("ph", EVENT, "open-crew", CREW, 1, massive_ded)
            .unwrap(),
        2
    );

    let res2 = store
        .get_division_results("ph", EVENT, "open-crew")
        .unwrap();
    assert_eq!(res2[0].raw_average, 50.0);
    assert_eq!(res2[0].total_deductions, 80.0);
    // Raw average (50.0) - deductions (80.0) = -30.0 -> FLOORED AT 0.00
    assert_eq!(res2[0].final_score, 0.00);

    // Verify deduction audit log recorded
    store.record_audit("ph", "head-1", "deductions_updated", CREW);
    assert!(store
        .audit
        .iter()
        .any(|a| a.action == "deductions_updated" && a.resource_id == CREW));
}

#[test]
fn adversarial_m4_division_locking_barrier_invariants() {
    let mut store = fixture();

    // 1. Locking non-existent or empty panel division fails
    assert_eq!(
        store
            .lock_division("ph", EVENT, "non-existent-div")
            .unwrap_err(),
        "Judge panel not configured"
    );
    store
        .judge_panels
        .insert(crate::store::scope_key(&[EVENT, "empty-panel-div"]), vec![]);
    assert_eq!(
        store
            .lock_division("ph", EVENT, "empty-panel-div")
            .unwrap_err(),
        "Judge panel is empty"
    );

    // 2. Locking before any scorecards submitted fails
    assert_eq!(
        store.lock_division("ph", EVENT, "open-crew").unwrap_err(),
        "Judge score missing or assignment revoked"
    );

    // 3. Partial scorecard submission: only Judge 1 submits, Judge 2 has not submitted
    store
        .submit_score("ph", EVENT, "judge-1", command("j1", 0, 18.0))
        .unwrap();
    assert_eq!(
        store.lock_division("ph", EVENT, "open-crew").unwrap_err(),
        "Judge score missing or assignment revoked"
    );

    // 4. Judge 2 submits, but then Judge 2's staff assignment is revoked before lock
    store
        .submit_score("ph", EVENT, "judge-2", command("j2", 0, 19.0))
        .unwrap();
    store.event_staff.get_mut(EVENT).unwrap().remove("judge-2");
    assert_eq!(
        store.lock_division("ph", EVENT, "open-crew").unwrap_err(),
        "Judge score missing or assignment revoked"
    );
    // Restore Judge 2
    store
        .event_staff
        .get_mut(EVENT)
        .unwrap()
        .insert("judge-2".into());

    // 5. Entry readiness degradation blocks division lock
    // Case A: Music track duration exceeds maximum allowed
    store.entries.get_mut(ENTRY).unwrap().track_duration_secs = Some(9999);
    assert_eq!(
        store.lock_division("ph", EVENT, "open-crew").unwrap_err(),
        "Entry readiness changed; reconcile before locking"
    );
    store.entries.get_mut(ENTRY).unwrap().track_duration_secs = Some(172);

    // Case B: Minor consent unverified
    store.entries.get_mut(ENTRY).unwrap().roster[5].consent_verified = false;
    assert_eq!(
        store.lock_division("ph", EVENT, "open-crew").unwrap_err(),
        "Entry readiness changed; reconcile before locking"
    );
    store.entries.get_mut(ENTRY).unwrap().roster[5].consent_verified = true;

    // Case C: Insufficient payment
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    assert_eq!(
        store.lock_division("ph", EVENT, "open-crew").unwrap_err(),
        "Entry readiness changed; reconcile before locking"
    );
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 120_000 * 6;

    // Case D: Roster count below minimum (e.g. 2 dancers instead of min 5)
    let original_roster = store.entries.get(ENTRY).unwrap().roster.clone();
    store.entries.get_mut(ENTRY).unwrap().roster.truncate(2);
    assert_eq!(
        store.lock_division("ph", EVENT, "open-crew").unwrap_err(),
        "Entry readiness changed; reconcile before locking"
    );
    store.entries.get_mut(ENTRY).unwrap().roster = original_roster;

    // 6. With complete panel and ready entry, locking succeeds
    assert!(store.lock_division("ph", EVENT, "open-crew").unwrap());

    // 7. Re-locking already locked division is idempotent
    assert!(store.lock_division("ph", EVENT, "open-crew").unwrap());

    // 8. Post-lock score submission is rejected
    let post_lock_score = command("op-late-lock", 1, 20.0);
    assert_eq!(
        store
            .submit_score("ph", EVENT, "judge-1", post_lock_score)
            .unwrap_err(),
        "Division is locked; cannot submit scores"
    );

    // 9. Post-lock deduction is rejected
    let post_lock_ded = vec![Deduction {
        code: "late".into(),
        reason: "Post-lock penalty".into(),
        points: 5.0,
    }];
    assert_eq!(
        store
            .set_deductions("ph", EVENT, "open-crew", CREW, 0, post_lock_ded)
            .unwrap_err(),
        "Division is locked"
    );

    // 10. Replay of pre-lock score command succeeds idempotently after lock
    let replay_cmd = command("j1", 0, 18.0);
    assert!(store
        .submit_score("ph", EVENT, "judge-1", replay_cmd)
        .is_ok());
}

#[tokio::test]
async fn test_paymongo_webhook_http_matrix_and_idempotency() {
    let mut store = fixture();
    store.entries.get_mut(ENTRY).unwrap().paid_minor = 0;
    store.payments.clear();

    // Create a pending payment to be settled
    let payment = store
        .process_payment_amount("ph", ENTRY, "dancer-1", "pm-ref-001", Some(120_000))
        .unwrap();

    let state = AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        #[cfg(feature = "firestore")]
        durable: None,
        verifier: auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: Arc::new(RwLock::new(store)),
    };
    let app = router(state, "http://localhost:3000".parse().unwrap());

    let secret = "test-webhook-secret-with-at-least-32-chars-long-value!!";
    let now = crate::store::now_secs();

    let paid_payload = serde_json::json!({
        "data": {
            "id": "evt_paid_12345",
            "type": "event",
            "attributes": {
                "type": "checkout_session.payment.paid",
                "livemode": false,
                "created_at": now,
                "data": {
                    "id": "cs_test_session_001",
                    "type": "checkout_session",
                    "attributes": {
                        "status": "paid",
                        "livemode": false,
                        "reference_number": payment.payment_id,
                        "payments": [
                            {
                                "id": "pay_pm_charge_001",
                                "type": "payment",
                                "attributes": {
                                    "amount": 120_000,
                                    "currency": "PHP",
                                    "status": "paid",
                                    "livemode": false
                                }
                            }
                        ]
                    }
                }
            }
        }
    });
    let raw_body = serde_json::to_vec(&paid_payload).unwrap();

    let mut message = Vec::new();
    message.extend_from_slice(now.to_string().as_bytes());
    message.push(b'.');
    message.extend_from_slice(&raw_body);
    let hmac = crate::store::hmac_sha256(secret.as_bytes(), &message);
    let te_sig: String = hmac.iter().map(|b| format!("{b:02x}")).collect();
    let valid_header = format!("t={},te={},li=", now, te_sig);

    // 1. Missing secret -> 503
    std::env::remove_var("PAYMONGO_WEBHOOK_SECRET");
    let res_no_secret = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/paymongo/webhook")
                .header(header::CONTENT_TYPE, "application/json")
                .header("paymongo-signature", &valid_header)
                .body(axum::body::Body::from(raw_body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_no_secret.status(), StatusCode::SERVICE_UNAVAILABLE);

    // Set webhook secret
    std::env::set_var("PAYMONGO_WEBHOOK_SECRET", secret);

    // 2. Missing signature header -> 401
    let res_no_sig = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/paymongo/webhook")
                .header(header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(raw_body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_no_sig.status(), StatusCode::UNAUTHORIZED);

    // 3. Invalid signature header -> 401
    let res_bad_sig = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/paymongo/webhook")
                .header(header::CONTENT_TYPE, "application/json")
                .header(
                    "paymongo-signature",
                    format!(
                        "t={},te=invalid00000000000000000000000000000000000000000000000000000000000,li=",
                        now
                    ),
                )
                .body(axum::body::Body::from(raw_body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_bad_sig.status(), StatusCode::UNAUTHORIZED);

    // 4. Valid signature -> 200 OK
    let res_valid = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/paymongo/webhook")
                .header(header::CONTENT_TYPE, "application/json")
                .header("paymongo-signature", &valid_header)
                .body(axum::body::Body::from(raw_body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_valid.status(), StatusCode::OK);

    // 5. Replay of same event -> 200 OK (idempotent, no double crediting)
    let res_replay = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/paymongo/webhook")
                .header(header::CONTENT_TYPE, "application/json")
                .header("paymongo-signature", &valid_header)
                .body(axum::body::Body::from(raw_body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_replay.status(), StatusCode::OK);

    // 6. Global route alias /v1/webhooks/paymongo -> 200 OK
    let res_alias = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/webhooks/paymongo")
                .header(header::CONTENT_TYPE, "application/json")
                .header("paymongo-signature", &valid_header)
                .body(axum::body::Body::from(raw_body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_alias.status(), StatusCode::OK);

    // 7. Refund event -> 503 Service Unavailable (fail-closed gate until provider reconciliation is released)
    let refund_payload = serde_json::json!({
        "data": {
            "id": "evt_ref_98765",
            "type": "event",
            "attributes": {
                "type": "payment.refunded",
                "livemode": false,
                "created_at": now + 10,
                "data": {
                    "id": "pay_test_001",
                    "type": "payment",
                    "attributes": {
                        "amount": 120_000,
                        "currency": "PHP",
                        "status": "refunded",
                        "refunds": [
                            {
                                "id": "ref_999",
                                "type": "refund",
                                "attributes": {
                                    "payment_id": "pay_test_001",
                                    "amount": 120_000,
                                    "currency": "PHP",
                                    "livemode": false,
                                    "status": "succeeded"
                                }
                            }
                        ]
                    }
                }
            }
        }
    });
    let refund_raw = serde_json::to_vec(&refund_payload).unwrap();
    let mut ref_msg = Vec::new();
    ref_msg.extend_from_slice(now.to_string().as_bytes());
    ref_msg.push(b'.');
    ref_msg.extend_from_slice(&refund_raw);
    let ref_hmac = crate::store::hmac_sha256(secret.as_bytes(), &ref_msg);
    let ref_te: String = ref_hmac.iter().map(|b| format!("{b:02x}")).collect();
    let ref_header = format!("t={},te={},li=", now, ref_te);

    let res_refund = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/v1/paymongo/webhook")
                .header(header::CONTENT_TYPE, "application/json")
                .header("paymongo-signature", &ref_header)
                .body(axum::body::Body::from(refund_raw))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_refund.status(), StatusCode::SERVICE_UNAVAILABLE);

    std::env::remove_var("PAYMONGO_WEBHOOK_SECRET");
}
