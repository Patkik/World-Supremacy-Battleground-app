use super::*;
use crate::domain::{EntryStatus, MemberRole};
use std::collections::HashSet;
#[path = "deductions_tests.rs"]
mod deductions;
#[path = "publication_tests.rs"]
mod publication;
#[path = "registration_tests.rs"]
mod registration;
#[path = "stage_tests.rs"]
mod stage;
#[path = "support_tests.rs"]
mod support;
#[path = "venue_tests.rs"]
mod venue;
#[path = "verification_tests.rs"]
mod verification;

fn actor(chapter: &str, uid: &str, role: &str) -> Claims {
    Claims {
        sub: uid.into(),
        iat: 1,
        auth_time: 1,
        chapter_id: Some(chapter.into()),
        role: Some(role.into()),
    }
}
fn command(id: &str, crew: &str, revision: u64) -> crate::domain::SubmitScoreCommand {
    crate::domain::SubmitScoreCommand {
        schema_version: 1,
        operation_id: id.into(),
        division_id: "open-crew".into(),
        crew_id: crew.into(),
        expected_revision: revision,
        criteria: crate::domain::ScoreCriteria {
            choreography: 18.0,
            musicality: 18.0,
            execution: 18.0,
            stage_presence: 18.0,
            entertainment: 18.0,
        },
        deductions: vec![],
    }
}
async fn seed(repo: &FirestoreRepository, chapter: &str, event: &str) -> Result<(String, String)> {
    let sample = crate::store::RegistrationStore::new();
    let mut crew = sample.crews["crew-afterhours"].clone();
    crew.id = "synthetic-crew".into();
    crew.chapter_id = chapter.into();
    crew.manager_uid = "manager".into();
    crew.members[0].uid = "manager".into();
    crew.members[0].role = MemberRole::Manager;
    for (index, member) in crew.members.iter_mut().enumerate() {
        member.name = format!("Synthetic participant {index}");
    }
    let mut entry = sample.entries["entry-manila-open-1"].clone();
    entry.id = "synthetic-entry".into();
    entry.chapter_id = chapter.into();
    entry.event_id = event.into();
    entry.crew_id = crew.id.clone();
    entry.roster = crew.members.clone();
    entry.paid_minor = 0;
    entry.status = EntryStatus::Approved;
    let division = DivisionDocument {
        policy: sample.divisions["manila-session-2027"][0].clone(),
        panel: vec!["judge-1".into(), "judge-2".into()],
        locked: false,
        generation: 0,
        approved_entries: 1,
        completed_scorecards: 0,
        unready_entries: 1,
        publication_id: None,
    };
    let input = (chapter.to_owned(), event.to_owned());
    repo.db
        .run_transaction(|db, tx| {
            let (chapter, event) = input.clone();
            let crew = crew.clone();
            let entry = entry.clone();
            let division = division.clone();
            Box::pin(async move {
                let chapter = chapter.as_str();
                let event = event.as_str();
                async {
                    put(
                        &db,
                        tx,
                        &format!("chapters/{chapter}"),
                        &Chapter {
                            id: chapter.into(),
                            name: "Synthetic test chapter".into(),
                            currency: "PHP".into(),
                        },
                    )?;
                    put(
                        &db,
                        tx,
                        &event_path(chapter, event)?,
                        &Event {
                            registration_closes_at: None,
                            id: event.into(),
                            chapter_id: chapter.into(),
                            name: "Synthetic event".into(),
                            status: "active".into(),
                            rules_version: "synthetic-policy-1".into(),
                        },
                    )?;
                    for (uid, role) in [
                        ("manager", "crew_manager"),
                        ("judge-1", "judge"),
                        ("judge-2", "judge"),
                        ("head", "head_judge"),
                        ("finance", "finance"),
                    ] {
                        put(
                            &db,
                            tx,
                            &format!("chapters/{chapter}/members/{uid}"),
                            &Membership {
                                uid: uid.into(),
                                chapter_id: chapter.into(),
                                role: role.into(),
                                active: true,
                                valid_after: 0,
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &format!("{}/assignments/{uid}", event_path(chapter, event)?),
                            &Assignment {
                                uid: uid.into(),
                                event_id: event.into(),
                                active: true,
                            },
                        )?;
                    }
                    put(
                        &db,
                        tx,
                        &format!("chapters/{chapter}/crews/{}", crew.id),
                        &crew,
                    )?;
                    put(
                        &db,
                        tx,
                        &entry_path(chapter, event, &entry.id)?,
                        &EntryDocument {
                            entry: entry.clone(),
                            pending_minor: 0,
                            completed_scorecards: 0,
                        },
                    )?;
                    put(
                        &db,
                        tx,
                        &division_path(chapter, event, "open-crew")?,
                        &division,
                    )?;
                    put(
                        &db,
                        tx,
                        &format!(
                            "{}/entryIndex/{}",
                            event_path(chapter, event)?,
                            key(&["open-crew", &crew.id])
                        ),
                        &EntryIndex {
                            entry_id: entry.id.clone(),
                            crew_id: crew.id.clone(),
                            division_id: "open-crew".into(),
                        },
                    )?;
                    Ok((entry.id, crew.id))
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .map_err(transaction_error)
}

#[test]
fn tuple_keys_and_identifiers_cannot_alias_or_escape_tenants() {
    assert_ne!(key(&["a-b", "c"]), key(&["a", "b-c"]));
    for invalid in ["", "..", "ph/events/foreign"] {
        assert!(segment(invalid).is_err());
    }
}

#[cfg(feature = "local-testing")]
#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator"]
async fn local_checkout_reservations_are_scoped_and_replay_safe() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("checkout");
    let event = new_id("event");
    let (entry, _) = seed(&a, &chapter, &event).await?;
    let manager = actor(&chapter, "manager", "crew_manager");
    let (first, retry) = tokio::join!(
        a.reserve_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "operation",
            Some(600_000)
        ),
        b.reserve_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "operation",
            Some(600_000)
        )
    );
    let first = first?;
    assert_eq!(first, retry?);
    assert_eq!(first.amount_minor, 600_000);
    let (started, repeated) = tokio::join!(
        a.start_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "operation",
            Some(600_000)
        ),
        b.start_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "operation",
            Some(600_000)
        )
    );
    let started = started?;
    assert_eq!(started, repeated?);
    assert!(started
        .session_id
        .as_deref()
        .is_some_and(|id| id.starts_with("cs_")));
    let recovered = FirestoreRepository::connect("demo-wsb")
        .await?
        .start_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "operation",
            Some(600_000),
        )
        .await?;
    assert_eq!(started, recovered);

    assert!(matches!(
        a.reserve_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "operation",
            Some(500_000)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(a
        .reserve_local_checkout(&manager, "foreign", &event, &entry, "operation2", Some(1))
        .await
        .is_err());
    assert!(matches!(
        b.request_payment(
            &manager,
            &chapter,
            &event,
            &entry,
            "synthetic-overallocation",
            Some(200_000)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let quote = b.payment_quote(&manager, &chapter, &event, &entry).await?;
    assert_eq!(quote.pending_amount_minor, 600_000);
    assert_eq!(quote.paid_amount_minor, 0);
    let chapter2 = new_id("checkout-other");
    let event2 = new_id("event");
    let (entry2, _) = seed(&a, &chapter2, &event2).await?;
    let manager2 = actor(&chapter2, "manager", "crew_manager");
    let other = a
        .start_local_checkout(
            &manager2,
            &chapter2,
            &event2,
            &entry2,
            "operation",
            Some(600_000),
        )
        .await?;
    assert_ne!(started.id, other.id);
    assert_ne!(started.session_id, other.session_id);
    let (cancelled, retry_cancel) = tokio::join!(
        a.cancel_local_checkout(&manager, &chapter, &event, &entry, "operation"),
        b.cancel_local_checkout(&manager, &chapter, &event, &entry, "operation")
    );
    let cancelled = cancelled?;
    assert_eq!(cancelled, retry_cancel?);
    assert!(cancelled.cancelled);
    assert_eq!(
        b.payment_quote(&manager, &chapter, &event, &entry)
            .await?
            .pending_amount_minor,
        0
    );
    assert!(a
        .start_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "operation",
            Some(600_000)
        )
        .await
        .is_err());
    let paid = a
        .start_local_checkout(
            &manager,
            &chapter,
            &event,
            &entry,
            "paid-operation",
            Some(100),
        )
        .await?;
    let url = format!(
        "http://paymongo-emulator:8191/test/checkout_sessions/{}/pay",
        paid.session_id.as_deref().unwrap()
    );
    assert!(reqwest::Client::new()
        .post(url)
        .send()
        .await
        .unwrap()
        .status()
        .is_success());
    assert!(a
        .cancel_local_checkout(&manager, &chapter, &event, &entry, "paid-operation")
        .await
        .is_err());
    assert_eq!(
        b.payment_quote(&manager, &chapter, &event, &entry)
            .await?
            .pending_amount_minor,
        100
    );

    let paid_event = crate::repository::paymongo_local::LocalPaidEvent {
        event_id: format!("evt_{}", new_id("event")),
        session_id: paid.session_id.clone().unwrap(),
        reference: paid.id.clone(),
        amount_minor: 100,
        currency: "PHP".into(),
    };
    let wrong = crate::repository::paymongo_local::LocalPaidEvent {
        amount_minor: 101,
        ..paid_event.clone()
    };
    assert!(a.settle_local_checkout(&wrong).await.is_err());
    let (one, two) = tokio::join!(
        a.settle_local_checkout(&paid_event),
        b.settle_local_checkout(&paid_event)
    );
    let receipt = one?;
    assert_eq!(receipt, two?);
    assert!(a.settle_local_checkout(&wrong).await.is_err());
    let duplicate = crate::repository::paymongo_local::LocalPaidEvent {
        event_id: format!("evt_{}", new_id("event")),
        ..paid_event.clone()
    };
    assert!(a.settle_local_checkout(&duplicate).await.is_err());
    let quote = b.payment_quote(&manager, &chapter, &event, &entry).await?;
    assert_eq!(quote.paid_amount_minor, 100);
    assert_eq!(quote.pending_amount_minor, 0);
    Ok(())
}

#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator"]
async fn synthetic_webhook_rejects_inconsistent_reservations_and_amounts() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("webhook-test");
    let event = new_id("event");
    let (entry_id, _) = seed(&a, &chapter, &event).await?;
    let manager = actor(&chapter, "manager", "crew_manager");
    let payment = a
        .request_payment(
            &manager,
            &chapter,
            &event,
            &entry_id,
            "synthetic-only-webhook",
            Some(100),
        )
        .await?;
    let finance = actor(&chapter, "finance", "finance");
    let payment_path = format!("chapters/{chapter}/payments/{}", payment.payment_id);
    a.db.run_transaction(|db, tx| {
        let path = payment_path.clone();
        Box::pin(async move {
            async {
                let mut record: crate::domain::PaymentRecord = required(&db, &path).await?;
                record.payment_id = "wrong-payment".into();
                put(&db, tx, &path, &record)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.reconcile_payment(&finance, &chapter, &payment.payment_id, true)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    a.db.run_transaction(|db, tx| {
        let path = payment_path.clone();
        let id = payment.payment_id.clone();
        Box::pin(async move {
            async {
                let mut record: crate::domain::PaymentRecord = required(&db, &path).await?;
                record.payment_id = id;
                put(&db, tx, &path, &record)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let payload = crate::domain::SyntheticWebhookPayload {
        payment_id: payment.payment_id.clone(),
        status: "settled".into(),
        amount_minor: Some(100),
        extra: Default::default(),
    };
    assert!(matches!(
        a.process_synthetic_webhook(None, &payload).await,
        Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
    ));
    assert!(matches!(
        a.process_synthetic_webhook(Some("foreign-chapter"), &payload)
            .await,
        Err(RepositoryError::Denied(StatusCode::NOT_FOUND, _))
    ));
    let wrong = crate::domain::SyntheticWebhookPayload {
        amount_minor: Some(101),
        ..payload.clone()
    };
    assert!(matches!(
        a.process_synthetic_webhook(Some(&chapter), &wrong).await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let bad_status = crate::domain::SyntheticWebhookPayload {
        status: "unknown".into(),
        ..payload.clone()
    };
    assert!(matches!(
        a.process_synthetic_webhook(Some(&chapter), &bad_status)
            .await,
        Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
    ));
    let path = entry_path(&chapter, &event, &entry_id)?;
    let original_entry: EntryDocument = required(&a.db, &path).await?;
    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        Box::pin(async move {
            async {
                let mut entry: EntryDocument = required(&db, &path).await?;
                entry.entry.paid_minor = 1_000_000;
                put(&db, tx, &path, &entry)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.payment_quote(&manager, &chapter, &event, &entry_id).await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        let entry = original_entry.clone();
        Box::pin(async move { put(&db, tx, &path, &entry).map_err(backoff) })
    })
    .await
    .map_err(transaction_error)?;

    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        Box::pin(async move {
            async {
                let mut entry: EntryDocument = required(&db, &path).await?;
                entry.pending_minor = 1_000_000;
                put(&db, tx, &path, &entry)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.payment_quote(&manager, &chapter, &event, &entry_id).await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        let entry = original_entry.clone();
        Box::pin(async move { put(&db, tx, &path, &entry).map_err(backoff) })
    })
    .await
    .map_err(transaction_error)?;
    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        Box::pin(async move {
            async {
                let mut entry: EntryDocument = required(&db, &path).await?;
                entry.pending_minor = 0;
                put(&db, tx, &path, &entry)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.process_synthetic_webhook(Some(&chapter), &payload).await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let quote = a
        .payment_quote(&manager, &chapter, &event, &entry_id)
        .await?;
    assert_eq!(quote.paid_amount_minor, 0);
    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        Box::pin(async move {
            async {
                let mut entry: EntryDocument = required(&db, &path).await?;
                entry.pending_minor = 100;
                put(&db, tx, &path, &entry)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let (first, second) = tokio::join!(
        a.process_synthetic_webhook(Some(&chapter), &payload),
        b.process_synthetic_webhook(Some(&chapter), &payload)
    );
    assert_eq!(first?, second?);
    assert!(matches!(
        b.process_synthetic_webhook(Some(&chapter), &wrong).await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let quote = b
        .payment_quote(&manager, &chapter, &event, &entry_id)
        .await?;
    assert_eq!(quote.paid_amount_minor, 100);
    assert_eq!(quote.pending_amount_minor, 0);
    let finance = actor(&chapter, "finance", "finance");
    a.refund_payment(&finance, &chapter, &payment.payment_id)
        .await?;
    assert!(matches!(
        b.process_synthetic_webhook(Some(&chapter), &payload).await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert_eq!(
        b.payment_quote(&manager, &chapter, &event, &entry_id)
            .await?
            .paid_amount_minor,
        0
    );

    Ok(())
}

#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator and WSB_RUN_PERSISTENCE_TESTS=demo-wsb"]
async fn firestore_restart_competing_writers_rollback_and_lock_races() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    assert!(std::env::var("FIRESTORE_EMULATOR_HOST").is_ok());
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("test");
    let event = new_id("event");
    let (entry_id, crew_id) = seed(&a, &chapter, &event).await?;
    let manager = actor(&chapter, "manager", "crew_manager");
    let finance = actor(&chapter, "finance", "finance");
    let first = a.request_payment(
        &manager,
        &chapter,
        &event,
        &entry_id,
        "bank-synthetic-1",
        Some(360_000),
    );
    let second = b.request_payment(
        &manager,
        &chapter,
        &event,
        &entry_id,
        "bank-synthetic-2",
        Some(360_000),
    );
    let (one, two) = tokio::join!(first, second);
    let one = one?;
    let two = two?;
    assert_ne!(one.payment_id, two.payment_id);
    let repeated = b
        .request_payment(
            &manager,
            &chapter,
            &event,
            &entry_id,
            "bank-synthetic-1",
            Some(360_000),
        )
        .await?;
    assert_eq!(one, repeated);
    assert!(a
        .request_payment(
            &manager,
            &chapter,
            &event,
            &entry_id,
            "overallocated",
            Some(1)
        )
        .await
        .is_err());
    let restarted = FirestoreRepository::connect("demo-wsb").await?;
    let quote = restarted
        .payment_quote(&manager, &chapter, &event, &entry_id)
        .await?;
    assert_eq!(quote.pending_amount_minor, 720_000);
    assert_eq!(quote.paid_amount_minor, 0);
    independent_process_check(&chapter, &event, &entry_id, &crew_id, "pending");
    let (settled_one, settled_two) = tokio::join!(
        a.reconcile_payment(&finance, &chapter, &one.payment_id, true),
        b.reconcile_payment(&finance, &chapter, &two.payment_id, true)
    );
    let settled_one = settled_one?;
    settled_two?;
    assert_eq!(
        settled_one,
        b.reconcile_payment(&finance, &chapter, &one.payment_id, true)
            .await?
    );
    assert_eq!(
        restarted
            .payment_quote(&manager, &chapter, &event, &entry_id)
            .await?
            .paid_amount_minor,
        720_000
    );
    let (refund_a, refund_b) = tokio::join!(
        a.refund_payment(&finance, &chapter, &one.payment_id),
        b.refund_payment(&finance, &chapter, &one.payment_id)
    );
    assert_eq!(refund_a?, refund_b?);
    assert_eq!(
        restarted
            .payment_quote(&manager, &chapter, &event, &entry_id)
            .await?
            .paid_amount_minor,
        360_000
    );
    let third = a
        .request_payment(
            &manager,
            &chapter,
            &event,
            &entry_id,
            "bank-synthetic-3",
            None,
        )
        .await?;
    a.reconcile_payment(&finance, &chapter, &third.payment_id, true)
        .await?;
    assert!(a
        .refund_payment(&manager, &chapter, &two.payment_id)
        .await
        .is_err());
    let judge_one = actor(&chapter, "judge-1", "judge");
    let judge_two = actor(&chapter, "judge-2", "judge");
    let head = actor(&chapter, "head", "head_judge");
    let cmd = command("offline-synthetic-op", &crew_id, 0);
    let (score_a, score_b) = tokio::join!(
        a.submit_score(&judge_one, &chapter, &event, &cmd),
        b.submit_score(&judge_one, &chapter, &event, &cmd)
    );
    let receipt = score_a?;
    assert_eq!(receipt, score_b?);
    let mut changed = cmd.clone();
    changed.criteria.execution = 19.0;
    assert!(matches!(
        b.submit_score(&judge_one, &chapter, &event, &changed).await,
        Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
    ));
    let mut correction = cmd.clone();
    correction.operation_id = "judge-one-correction".into();
    correction.expected_revision = 1;
    correction.criteria.entertainment = 19.0;
    let corrected = a
        .submit_score(&judge_one, &chapter, &event, &correction)
        .await?;
    assert_eq!(corrected.score_revision, 2);
    assert_eq!(
        restarted
            .score_state(&judge_one, &chapter, &event, "open-crew", &crew_id)
            .await?
            .revision,
        2
    );
    assert!(matches!(
        a.submit_score(
            &judge_one,
            &chapter,
            &event,
            &command("stale-correction", &crew_id, 0)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(a
        .lock_division(&head, &chapter, &event, "open-crew")
        .await
        .is_err());
    let technical = vec![crate::domain::Deduction {
        code: "synthetic-stage-review".into(),
        reason: "Synthetic publication fixture".into(),
        points: 1.25,
    }];
    assert_eq!(
        a.set_deductions(
            &head,
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew_id.clone(),
                expected_revision: 0,
                deductions: technical,
            }
        )
        .await?,
        1
    );
    let second_cmd = command("judge-two-op", &crew_id, 0);
    let (lock_result, last_score) = tokio::join!(
        a.lock_division(&head, &chapter, &event, "open-crew"),
        b.submit_score(&judge_two, &chapter, &event, &second_cmd)
    );
    last_score?;
    if lock_result.is_err() {
        a.lock_division(&head, &chapter, &event, "open-crew")
            .await?;
    }
    assert!(
        restarted
            .score_state(&judge_one, &chapter, &event, "open-crew", &crew_id)
            .await?
            .locked
    );
    assert_eq!(
        receipt,
        restarted
            .submit_score(&judge_one, &chapter, &event, &cmd)
            .await?
    );
    assert!(matches!(
        a.publish_division_results(&judge_one, &chapter, &event, "open-crew")
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));

    let public_path = format!("publicEvents/{event}");
    let foreign_index = PublicEventIndex {
        event_id: event.clone(),
        chapter_id: "another-chapter".into(),
    };
    let input = (public_path.clone(), foreign_index);
    a.db.run_transaction(|db, tx| {
        let (path, index) = input.clone();
        Box::pin(async move {
            async {
                put(&db, tx, &path, &index)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.publish_division_results(&head, &chapter, &event, "open-crew")
            .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let correct_index = PublicEventIndex {
        event_id: event.clone(),
        chapter_id: chapter.clone(),
    };
    let input = (public_path, correct_index);
    a.db.run_transaction(|db, tx| {
        let (path, index) = input.clone();
        Box::pin(async move {
            async {
                put(&db, tx, &path, &index)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let (snapshot, replay) = tokio::join!(
        a.publish_division_results(&head, &chapter, &event, "open-crew"),
        b.publish_division_results(&head, &chapter, &event, "open-crew")
    );
    let snapshot = snapshot?;
    assert_eq!(snapshot, replay?);
    assert_eq!(snapshot.results.len(), 1);
    assert_eq!(snapshot.results[0].raw_average, 90.5);
    assert_eq!(snapshot.results[0].total_deductions, 1.25);
    assert_eq!(snapshot.results[0].final_score, 89.25);
    assert_eq!(snapshot.digest.len(), 64);
    assert_eq!(
        restarted.published_snapshot(&event, "open-crew").await?,
        snapshot
    );
    assert_eq!(
        restarted.published_event_results(&event).await?,
        vec![snapshot]
    );
    assert!(matches!(
        a.submit_score(
            &judge_one,
            &chapter,
            &event,
            &command("after-lock", &crew_id, 2)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(a
        .submit_score(
            &actor("foreign", "judge-1", "judge"),
            &chapter,
            &event,
            &cmd
        )
        .await
        .is_err());
    let division: DivisionDocument =
        required(&a.db, &division_path(&chapter, &event, "open-crew")?).await?;
    assert_eq!(division.completed_scorecards, 2);
    assert_eq!(division.unready_entries, 0);
    independent_process_check(&chapter, &event, &entry_id, &crew_id, "locked");
    let audits = a
        .page::<AuditRecord>(&format!("chapters/{chapter}"), "audit", None, 100)
        .await?;
    let score_audits: Vec<_> = audits
        .items
        .iter()
        .filter(|r| r.action == "score_submitted")
        .collect();
    assert_eq!(score_audits.len(), 3);
    assert_eq!(
        score_audits
            .iter()
            .map(|r| &r.id)
            .collect::<HashSet<_>>()
            .len(),
        3
    );
    let probe = format!("chapters/{chapter}/testRollback/probe");
    let failed: a_result::Result<()> = a_result::rollback(&a, &probe).await;
    assert!(failed.is_err());
    assert!(get::<serde_json::Value>(&a.db, &probe).await?.is_none());

    // A new repository instance must observe revocation immediately, even when
    // the caller asks only to replay an already acknowledged command.
    set_member_active(&a, &chapter, "judge-1", false).await?;
    assert!(matches!(
        restarted
            .submit_score(&judge_one, &chapter, &event, &cmd)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    set_member_active(&a, &chapter, "judge-1", true).await?;
    assert_eq!(
        receipt,
        restarted
            .submit_score(&judge_one, &chapter, &event, &cmd)
            .await?
    );

    // Database mode never falls back to the seeded in-memory demo workflows.
    use tower::ServiceExt;
    let state = crate::registration::AppState {
        #[cfg(feature = "local-testing")]
        local_identity: None,
        verifier: crate::auth::Verifier::new("demo-wsb".into()).unwrap(),
        store: std::sync::Arc::new(tokio::sync::RwLock::new(
            crate::store::RegistrationStore::new(),
        )),
        durable: Some(std::sync::Arc::new(restarted)),
    };
    let app = crate::router(state, "http://localhost:3000".parse().unwrap());
    for (path, status) in [
        (
            format!("/v1/chapters/{chapter}/events"),
            StatusCode::NOT_IMPLEMENTED,
        ),
        (
            format!("/v1/chapters/{chapter}/session"),
            StatusCode::UNAUTHORIZED,
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
        assert_eq!(
            response.headers()[axum::http::header::CACHE_CONTROL],
            "no-store"
        );
    }
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
    let body = axum::body::to_bytes(response.into_body(), 4096)
        .await
        .unwrap();
    let status: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(status["durable_storage"], true);
    assert_eq!(status["database_reachable"], true);
    assert_eq!(status["release_ready"], false);
    Ok(())
}

fn independent_process_check(chapter: &str, event: &str, entry: &str, crew: &str, phase: &str) {
    let status = std::process::Command::new(std::env::current_exe().unwrap())
        .arg("repository::tests::verify_persisted_state_in_fresh_process")
        .arg("--exact")
        .arg("--ignored")
        .env("WSB_FIXTURE_CHAPTER", chapter)
        .env("WSB_FIXTURE_EVENT", event)
        .env("WSB_FIXTURE_ENTRY", entry)
        .env("WSB_FIXTURE_CREW", crew)
        .env("WSB_FIXTURE_PHASE", phase)
        .status()
        .expect("launch independent repository process");
    assert!(
        status.success(),
        "Independent process could not recover committed business state"
    );
}

#[tokio::test]
#[ignore = "invoked only by the orchestrating persistence test in an independent process"]
async fn verify_persisted_state_in_fresh_process() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    let chapter = std::env::var("WSB_FIXTURE_CHAPTER").expect("orchestrator chapter");
    let event = std::env::var("WSB_FIXTURE_EVENT").expect("orchestrator event");
    let entry = std::env::var("WSB_FIXTURE_ENTRY").expect("orchestrator entry");
    let crew = std::env::var("WSB_FIXTURE_CREW").expect("orchestrator crew");
    let phase = std::env::var("WSB_FIXTURE_PHASE").expect("orchestrator phase");
    let repo = FirestoreRepository::connect("demo-wsb").await?;
    let quote = repo
        .payment_quote(
            &actor(&chapter, "manager", "crew_manager"),
            &chapter,
            &event,
            &entry,
        )
        .await?;
    match phase.as_str() {
        "pending" => {
            assert_eq!(quote.pending_amount_minor, 720_000);
            assert_eq!(quote.paid_amount_minor, 0);
        }
        "locked" => {
            assert_eq!(quote.pending_amount_minor, 0);
            assert_eq!(quote.paid_amount_minor, 720_000);
            let state = repo
                .score_state(
                    &actor(&chapter, "judge-1", "judge"),
                    &chapter,
                    &event,
                    "open-crew",
                    &crew,
                )
                .await?;
            assert!(state.locked);
            assert_eq!(state.revision, 2);
        }
        _ => panic!("Unknown synthetic fixture phase"),
    }
    Ok(())
}

async fn set_member_active(
    repo: &FirestoreRepository,
    chapter: &str,
    uid: &str,
    active: bool,
) -> Result<()> {
    let path = format!("chapters/{chapter}/members/{uid}");
    repo.db
        .run_transaction(|db, tx| {
            let path = path.clone();
            Box::pin(async move {
                async {
                    let mut member: Membership = required(&db, &path).await?;
                    member.active = active;
                    put(&db, tx, &path, &member)?;
                    Ok(())
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .map_err(transaction_error)
}

mod a_result {
    use super::*;
    pub type Result<T> = std::result::Result<T, FirestoreError>;
    pub async fn rollback(repo: &FirestoreRepository, path: &str) -> Result<()> {
        let path = path.to_owned();
        repo.db
            .run_transaction(|db, tx| {
                let path = path.clone();
                Box::pin(async move {
                    put(&db, tx, &path, &serde_json::json!({"synthetic":true})).map_err(backoff)?;
                    Err(BackoffError::permanent(invalid(
                        "Synthetic fault after staging a write",
                    )))
                })
            })
            .await
    }
}

#[tokio::test]
async fn repository_connect_rejects_non_demo_project_and_missing_emulator() {
    let result = FirestoreRepository::connect("wsb-prod-live").await;
    assert!(result.is_err());
    assert!(matches!(
        result.err().unwrap(),
        RepositoryError::Denied(
            StatusCode::BAD_REQUEST,
            "Only demo-wsb with an explicit Firestore emulator is enabled"
        )
    ));

    let staging_result = FirestoreRepository::connect("demo-other").await;
    assert!(staging_result.is_err());
    assert!(matches!(
        staging_result.err().unwrap(),
        RepositoryError::Denied(
            StatusCode::BAD_REQUEST,
            "Only demo-wsb with an explicit Firestore emulator is enabled"
        )
    ));

    if std::env::var("FIRESTORE_EMULATOR_HOST")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .is_none()
    {
        let missing_host_result = FirestoreRepository::connect("demo-wsb").await;
        assert!(missing_host_result.is_err());
        assert!(matches!(
            missing_host_result.err().unwrap(),
            RepositoryError::Denied(
                StatusCode::BAD_REQUEST,
                "Only demo-wsb with an explicit Firestore emulator is enabled"
            )
        ));
    }
}

#[tokio::test]
async fn adversarial_repository_connect_env_boundary_stress() {
    for bad_project in [
        "",
        "wsb-prod-live",
        "demo-other",
        "demo-wsb ",
        " demo-wsb",
        "DEMO-WSB",
        "demo-wsb\0",
        "demo-wsb-staging",
    ] {
        let result = FirestoreRepository::connect(bad_project).await;
        assert!(
            result.is_err(),
            "Project '{bad_project}' should be rejected"
        );
        assert!(
            matches!(
                result.err().unwrap(),
                RepositoryError::Denied(
                    StatusCode::BAD_REQUEST,
                    "Only demo-wsb with an explicit Firestore emulator is enabled"
                )
            ),
            "Project '{bad_project}' should yield Denied(BAD_REQUEST)"
        );
    }

    let orig = std::env::var("FIRESTORE_EMULATOR_HOST").ok();

    std::env::set_var("FIRESTORE_EMULATOR_HOST", "");
    let res = FirestoreRepository::connect("demo-wsb").await;
    assert!(res.is_err(), "Empty emulator host should fail");
    assert!(matches!(
        res.err().unwrap(),
        RepositoryError::Denied(StatusCode::BAD_REQUEST, _)
    ));

    for whitespace in [" ", "   ", "\t", "\r\n", "  \t \n "] {
        std::env::set_var("FIRESTORE_EMULATOR_HOST", whitespace);
        let res = FirestoreRepository::connect("demo-wsb").await;
        assert!(
            res.is_err(),
            "Whitespace '{whitespace}' emulator host should fail"
        );
        assert!(matches!(
            res.err().unwrap(),
            RepositoryError::Denied(StatusCode::BAD_REQUEST, _)
        ));
    }

    std::env::remove_var("FIRESTORE_EMULATOR_HOST");
    let res = FirestoreRepository::connect("demo-wsb").await;
    assert!(res.is_err(), "Unset emulator host should fail");
    assert!(matches!(
        res.err().unwrap(),
        RepositoryError::Denied(StatusCode::BAD_REQUEST, _)
    ));

    match orig {
        Some(val) => std::env::set_var("FIRESTORE_EMULATOR_HOST", val),
        None => std::env::remove_var("FIRESTORE_EMULATOR_HOST"),
    }
}
