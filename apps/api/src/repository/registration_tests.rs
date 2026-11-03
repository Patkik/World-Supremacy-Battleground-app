use super::*;
use crate::domain::{CrewInvitation, Entry};
use crate::repository::RegistrationCommand as Command;

async fn member(
    repo: &FirestoreRepository,
    chapter: &str,
    uid: &str,
    role: &str,
    active: bool,
) -> Result<()> {
    let (chapter, uid, role) = (chapter.to_owned(), uid.to_owned(), role.to_owned());
    repo.db
        .run_transaction(|db, tx| {
            let (chapter, uid, role) = (chapter.clone(), uid.clone(), role.clone());
            Box::pin(async move {
                async {
                    put(
                        &db,
                        tx,
                        &format!("chapters/{chapter}/members/{uid}"),
                        &Membership {
                            uid,
                            chapter_id: chapter,
                            role,
                            active,
                            valid_after: 0,
                            expires_at: None,
                        },
                    )?;
                    Ok(())
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .map_err(transaction_error)
}
fn is_status<T>(result: Result<T>, status: StatusCode) {
    assert!(matches!(result,Err(RepositoryError::Denied(value,_)) if value==status));
}
async fn field(
    repo: &FirestoreRepository,
    path: &str,
    name: &str,
    value: serde_json::Value,
) -> Result<()> {
    let input = (path.to_owned(), name.to_owned(), value);
    repo.db
        .run_transaction(|db, tx| {
            let (path, name, value) = input.clone();
            Box::pin(async move {
                async {
                    let mut document: serde_json::Value = required(&db, &path).await?;
                    document[name] = value;
                    put(&db, tx, &path, &document)?;
                    Ok(())
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .map_err(transaction_error)
}
async fn decide(
    repo: &FirestoreRepository,
    claims: &Claims,
    chapter: &str,
    event: &str,
    entry: &Entry,
    status: EntryStatus,
    id: &str,
) -> Result<Entry> {
    repo.registration_command(
        claims,
        chapter,
        id,
        Command::Review {
            event_id: event.into(),
            entry_id: entry.id.clone(),
            status,
            expected_revision: entry.revision,
        },
    )
    .await
}

#[tokio::test]
#[ignore = "requires demo-wsb emulator and WSB_RUN_PERSISTENCE_TESTS=demo-wsb"]
async fn registration_replay_invitation_races_versions_and_approval_lock_barrier() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("registration");
    let event = new_id("event");
    seed(&a, &chapter, &event).await?;
    for (uid, role) in [
        ("dancer-a", "dancer"),
        ("dancer-b", "dancer"),
        ("other-manager", "crew_manager"),
        ("registrar", "registrar"),
    ] {
        member(&a, &chapter, uid, role, true).await?;
    }
    let input = (chapter.clone(), event.clone());
    a.db.run_transaction(|db, tx| {
        let (chapter, event) = input.clone();
        Box::pin(async move {
            async {
                put(
                    &db,
                    tx,
                    &format!("{}/assignments/registrar", event_path(&chapter, &event)?),
                    &Assignment {
                        uid: "registrar".into(),
                        event_id: event.clone(),
                        active: true,
                    },
                )?;
                put(
                    &db,
                    tx,
                    &division_path(&chapter, &event, "registration-open")?,
                    &DivisionDocument {
                        policy: crate::domain::Division {
                            id: "registration-open".into(),
                            name: "Synthetic registration policy".into(),
                            min_members: 1,
                            max_members: 4,
                            max_duration_secs: 180,
                            max_age: None,
                            fee_minor: 100,
                        },
                        panel: vec!["judge-1".into(), "judge-2".into()],
                        locked: false,
                        generation: 0,
                        approved_entries: 0,
                        completed_scorecards: 0,
                        unready_entries: 0,
                        publication_id: None,
                    },
                )?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let manager = actor(&chapter, "manager", "crew_manager");
    let registrar = actor(&chapter, "registrar", "registrar");
    let head = actor(&chapter, "head", "head_judge");
    let finance = actor(&chapter, "finance", "finance");
    let cmd = Command::CreateCrew {
        name: "Synthetic registration crew".into(),
        city: "Test city".into(),
    };
    let (one, two) = tokio::join!(
        a.registration_command::<Crew>(&manager, &chapter, "create", cmd.clone()),
        b.registration_command::<Crew>(&manager, &chapter, "create", cmd)
    );
    let crew = one?;
    assert_eq!(crew, two?);
    assert_eq!(crew.revision, 1);
    assert!(crew.members.is_empty());
    is_status(
        a.registration_command::<Crew>(
            &manager,
            &chapter,
            "create",
            Command::CreateCrew {
                name: "Changed payload".into(),
                city: "Test city".into(),
            },
        )
        .await,
        StatusCode::CONFLICT,
    );
    let update = Command::UpdateCrew {
        crew_id: crew.id.clone(),
        name: "Updated synthetic crew".into(),
        city: "Test city".into(),
        expected_revision: 1,
    };
    let updated: Crew = a
        .registration_command(&manager, &chapter, "update", update.clone())
        .await?;
    assert_eq!(updated.revision, 2);
    is_status(
        a.registration_command::<Crew>(&manager, &chapter, "stale-update", update.clone())
            .await,
        StatusCode::CONFLICT,
    );
    is_status(
        a.registration_command::<Crew>(
            &actor(&chapter, "other-manager", "crew_manager"),
            &chapter,
            "other-update",
            update,
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    let invitation: CrewInvitation = a
        .registration_command(
            &manager,
            &chapter,
            "invite",
            Command::Invite {
                crew_id: crew.id.clone(),
            },
        )
        .await?;
    let invitation2: CrewInvitation = b
        .registration_command(
            &manager,
            &chapter,
            "invite",
            Command::Invite {
                crew_id: crew.id.clone(),
            },
        )
        .await?;
    assert_eq!(invitation, invitation2);
    let dancer_a = actor(&chapter, "dancer-a", "dancer");
    let dancer_b = actor(&chapter, "dancer-b", "dancer");
    is_status(
        a.redeem_invitation(&dancer_a, &chapter, &crew.id, &invitation.token, " ", true)
            .await,
        StatusCode::BAD_REQUEST,
    );
    let (one, two) = tokio::join!(
        a.redeem_invitation(
            &dancer_a,
            &chapter,
            &crew.id,
            &invitation.token,
            "Synthetic performer",
            false
        ),
        b.redeem_invitation(
            &dancer_b,
            &chapter,
            &crew.id,
            &invitation.token,
            "Synthetic performer",
            false
        )
    );
    assert_eq!(usize::from(one.is_ok()) + usize::from(two.is_ok()), 1);
    let (winner, loser, accepted) = match (one, two) {
        (Ok(crew), Err(error)) => {
            assert_eq!(StatusCode::from(error), StatusCode::CONFLICT);
            (dancer_a.clone(), dancer_b.clone(), crew)
        }
        (Err(error), Ok(crew)) => {
            assert_eq!(StatusCode::from(error), StatusCode::CONFLICT);
            (dancer_b.clone(), dancer_a.clone(), crew)
        }
        _ => panic!("one invitation winner"),
    };
    assert_eq!(accepted.members.len(), 1);
    assert!(accepted.members[0].consent_verified);
    assert_eq!(
        accepted,
        b.redeem_invitation(
            &winner,
            &chapter,
            &crew.id,
            &invitation.token,
            "Synthetic performer",
            false
        )
        .await?
    );
    is_status(
        a.redeem_invitation(
            &winner,
            &chapter,
            &crew.id,
            &invitation.token,
            "Changed acceptance",
            false,
        )
        .await,
        StatusCode::CONFLICT,
    );
    let minor_inv: CrewInvitation = a
        .registration_command(
            &manager,
            &chapter,
            "minor-invite",
            Command::Invite {
                crew_id: crew.id.clone(),
            },
        )
        .await?;
    let roster = a
        .redeem_invitation(
            &loser,
            &chapter,
            &crew.id,
            &minor_inv.token,
            "Synthetic minor",
            true,
        )
        .await?;
    assert_eq!(roster.members.len(), 2);
    assert!(roster
        .members
        .iter()
        .any(|m| m.is_minor && !m.consent_verified));
    let create = Command::CreateEntry {
        event_id: event.clone(),
        crew_id: crew.id.clone(),
        division_id: "registration-open".into(),
    };
    let (one, two) = tokio::join!(
        a.registration_command::<Entry>(&manager, &chapter, "entry-a", create.clone()),
        b.registration_command::<Entry>(&manager, &chapter, "entry-b", create)
    );
    let entry = one?;
    assert_eq!(entry, two?);
    assert!(entry.roster.is_empty());
    assert_eq!(entry.revision, 1);
    is_status(
        a.redeem_invitation(
            &actor("wrong-chapter", "dancer-a", "dancer"),
            &chapter,
            &crew.id,
            &invitation.token,
            "Synthetic performer",
            false,
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    member(&a, &chapter, "manager", "crew_manager", false).await?;
    is_status(
        a.redeem_invitation(
            &winner,
            &chapter,
            &crew.id,
            &invitation.token,
            "Synthetic performer",
            false,
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    member(&a, &chapter, "manager", "crew_manager", true).await?;
    let expired: CrewInvitation = a
        .registration_command(
            &manager,
            &chapter,
            "expired-invite",
            Command::Invite {
                crew_id: crew.id.clone(),
            },
        )
        .await?;
    field(
        &a,
        &format!("chapters/{chapter}/invitations/{}", key(&[&expired.token])),
        "expires_at",
        serde_json::json!(1),
    )
    .await?;
    is_status(
        a.redeem_invitation(
            &manager,
            &chapter,
            &crew.id,
            &expired.token,
            "Synthetic manager performer",
            false,
        )
        .await,
        StatusCode::CONFLICT,
    );
    let select = Command::Roster {
        event_id: event.clone(),
        entry_id: entry.id.clone(),
        uids: vec![winner.sub.clone()],
        expected_revision: entry.revision,
    };
    field(
        &a,
        &event_path(&chapter, &event)?,
        "registration_closes_at",
        serde_json::json!(1),
    )
    .await?;
    is_status(
        a.registration_command::<Entry>(&manager, &chapter, "closed-roster", select.clone())
            .await,
        StatusCode::CONFLICT,
    );
    field(
        &a,
        &event_path(&chapter, &event)?,
        "registration_closes_at",
        serde_json::Value::Null,
    )
    .await?;
    field(
        &a,
        &event_path(&chapter, &event)?,
        "rules_version",
        serde_json::json!("changed-policy"),
    )
    .await?;
    is_status(
        a.registration_command::<Entry>(
            &manager,
            &chapter,
            "changed-policy-roster",
            select.clone(),
        )
        .await,
        StatusCode::CONFLICT,
    );
    field(
        &a,
        &event_path(&chapter, &event)?,
        "rules_version",
        serde_json::json!(entry.rules_version),
    )
    .await?;
    let selected: Entry = a
        .registration_command(&manager, &chapter, "roster", select.clone())
        .await?;
    assert_eq!(selected.roster.len(), 1);
    assert_eq!(selected.roster[0], accepted.members[0]);
    is_status(
        b.registration_command::<Entry>(&manager, &chapter, "stale-roster", select)
            .await,
        StatusCode::CONFLICT,
    );
    is_status(
        a.registration_command::<Entry>(
            &manager,
            &chapter,
            "duplicate-roster",
            Command::Roster {
                event_id: event.clone(),
                entry_id: entry.id.clone(),
                uids: vec![winner.sub.clone(), winner.sub.clone()],
                expected_revision: selected.revision,
            },
        )
        .await,
        StatusCode::BAD_REQUEST,
    );
    is_status(
        a.registration_command::<Entry>(
            &manager,
            &chapter,
            "unknown-roster",
            Command::Roster {
                event_id: event.clone(),
                entry_id: entry.id.clone(),
                uids: vec!["unknown".into()],
                expected_revision: selected.revision,
            },
        )
        .await,
        StatusCode::BAD_REQUEST,
    );
    let submit = Command::Submit {
        event_id: event.clone(),
        entry_id: entry.id.clone(),
        expected_revision: selected.revision,
    };
    let incomplete: Entry = a
        .registration_command(&manager, &chapter, "submit-incomplete", submit.clone())
        .await?;
    assert_eq!(incomplete.status, EntryStatus::NeedsCorrection);
    assert_eq!(
        incomplete,
        b.registration_command::<Entry>(&manager, &chapter, "submit-incomplete", submit)
            .await?
    );
    is_status(
        decide(
            &a,
            &registrar,
            &chapter,
            &event,
            &incomplete,
            EntryStatus::Approved,
            "early-approval",
        )
        .await,
        StatusCode::CONFLICT,
    );
    let roster_change = Command::Roster {
        event_id: event.clone(),
        entry_id: entry.id.clone(),
        uids: vec![],
        expected_revision: incomplete.revision,
    };
    let (one, two) = tokio::join!(
        a.registration_command::<Entry>(&manager, &chapter, "roster-payment-race", roster_change),
        b.request_payment(
            &manager,
            &chapter,
            &event,
            &entry.id,
            "registration-test-payment",
            Some(100)
        )
    );
    assert_eq!(usize::from(one.is_ok()) + usize::from(two.is_ok()), 1);
    let payment = match (one, two) {
        (Ok(changed), Err(error)) => {
            assert_eq!(StatusCode::from(error), StatusCode::CONFLICT);
            let _: Entry = a
                .registration_command(
                    &manager,
                    &chapter,
                    "restore-roster",
                    Command::Roster {
                        event_id: event.clone(),
                        entry_id: entry.id.clone(),
                        uids: vec![winner.sub.clone()],
                        expected_revision: changed.revision,
                    },
                )
                .await?;
            a.request_payment(
                &manager,
                &chapter,
                &event,
                &entry.id,
                "registration-test-payment",
                Some(100),
            )
            .await?
        }
        (Err(error), Ok(payment)) => {
            assert_eq!(StatusCode::from(error), StatusCode::CONFLICT);
            payment
        }
        _ => panic!("Only roster removal or payment reservation can succeed"),
    };
    let version = a
        .entry_detail(&manager, &chapter, &event, &entry.id)
        .await?
        .entry
        .revision;
    is_status(
        a.registration_command::<Entry>(
            &manager,
            &chapter,
            "pending-roster",
            Command::Roster {
                event_id: event.clone(),
                entry_id: entry.id.clone(),
                uids: vec![],
                expected_revision: version,
            },
        )
        .await,
        StatusCode::CONFLICT,
    );
    a.reconcile_payment(
        &finance,
        &chapter,
        &payment.payment_id,
        true,
        "registration-settle",
        "Receipt checked",
    )
    .await?;
    // Server-only synthetic audio fixture. There is no client duration/consent bypass.
    let input = (chapter.clone(), event.clone(), entry.id.clone());
    a.db.run_transaction(|db, tx| {
        let (chapter, event, id) = input.clone();
        Box::pin(async move {
            async {
                let mut record: EntryDocument =
                    required(&db, &entry_path(&chapter, &event, &id)?).await?;
                record.entry.track_filename = Some("synthetic.mp3".into());
                record.entry.track_duration_secs = Some(120);
                record.entry.revision += 1;
                put(&db, tx, &entry_path(&chapter, &event, &id)?, &record)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let ready = a
        .entry_detail(&manager, &chapter, &event, &entry.id)
        .await?;
    assert!(ready.readiness.is_ready);
    let submitted: Entry = a
        .registration_command(
            &manager,
            &chapter,
            "submit-ready",
            Command::Submit {
                event_id: event.clone(),
                entry_id: entry.id.clone(),
                expected_revision: ready.entry.revision,
            },
        )
        .await?;
    assert_eq!(submitted.status, EntryStatus::Submitted);
    is_status(
        decide(
            &a,
            &manager,
            &chapter,
            &event,
            &submitted,
            EntryStatus::Approved,
            "self-approval",
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    let approved = decide(
        &a,
        &registrar,
        &chapter,
        &event,
        &submitted,
        EntryStatus::Approved,
        "approve",
    )
    .await?;
    let division: DivisionDocument = required(
        &a.db,
        &division_path(&chapter, &event, "registration-open")?,
    )
    .await?;
    assert_eq!(division.approved_entries, 1);
    assert_eq!(division.unready_entries, 0);
    let replay = decide(
        &b,
        &registrar,
        &chapter,
        &event,
        &submitted,
        EntryStatus::Approved,
        "approve",
    )
    .await?;
    assert_eq!(approved, replay);
    let corrected = decide(
        &a,
        &registrar,
        &chapter,
        &event,
        &approved,
        EntryStatus::NeedsCorrection,
        "request-correction",
    )
    .await?;
    let division: DivisionDocument = required(
        &a.db,
        &division_path(&chapter, &event, "registration-open")?,
    )
    .await?;
    assert_eq!(division.approved_entries, 0);
    let resubmitted: Entry = a
        .registration_command(
            &manager,
            &chapter,
            "resubmit",
            Command::Submit {
                event_id: event.clone(),
                entry_id: entry.id.clone(),
                expected_revision: corrected.revision,
            },
        )
        .await?;
    let approved = decide(
        &a,
        &registrar,
        &chapter,
        &event,
        &resubmitted,
        EntryStatus::Approved,
        "approve-again",
    )
    .await?;
    let mut cmd = super::command("registration-score-1", &crew.id, 0);
    cmd.division_id = "registration-open".into();
    a.submit_score(&actor(&chapter, "judge-1", "judge"), &chapter, &event, &cmd)
        .await?;
    is_status(
        decide(
            &a,
            &registrar,
            &chapter,
            &event,
            &approved,
            EntryStatus::NeedsCorrection,
            "scored-correction",
        )
        .await,
        StatusCode::CONFLICT,
    );
    cmd.operation_id = "registration-score-2".into();
    a.submit_score(&actor(&chapter, "judge-2", "judge"), &chapter, &event, &cmd)
        .await?;
    // Late registrar approval races the complete-panel lock. The division write
    // barrier must allow only one outcome, without losing a newly approved entry.
    let mut late = approved.clone();
    late.id = "late-submitted".into();
    late.crew_id = "late-crew".into();
    late.status = EntryStatus::Submitted;
    late.revision = 1;
    let input = (chapter.clone(), event.clone(), late.clone());
    a.db.run_transaction(|db, tx| {
        let (chapter, event, late) = input.clone();
        Box::pin(async move {
            async {
                let mut late_crew =
                    crate::store::RegistrationStore::new().crews["crew-afterhours"].clone();
                late_crew.id = late.crew_id.clone();
                late_crew.chapter_id = chapter.clone();
                late_crew.manager_uid = "manager".into();
                put(
                    &db,
                    tx,
                    &format!("chapters/{chapter}/crews/{}", late_crew.id),
                    &late_crew,
                )?;
                put(
                    &db,
                    tx,
                    &entry_path(&chapter, &event, &late.id)?,
                    &EntryDocument {
                        entry: late,
                        pending_minor: 0,
                        completed_scorecards: 0,
                    },
                )?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let (one, two) = tokio::join!(
        decide(
            &a,
            &registrar,
            &chapter,
            &event,
            &late,
            EntryStatus::Approved,
            "racing-approval"
        ),
        b.lock_division(&head, &chapter, &event, "registration-open")
    );
    assert_eq!(usize::from(one.is_ok()) + usize::from(two.is_ok()), 1);
    match (one, two) {
        (Ok(late), Err(error)) => {
            assert_eq!(StatusCode::from(error), StatusCode::CONFLICT);
            decide(
                &a,
                &registrar,
                &chapter,
                &event,
                &late,
                EntryStatus::NeedsCorrection,
                "revert-late-approval",
            )
            .await?;
            a.lock_division(&head, &chapter, &event, "registration-open")
                .await?;
        }
        (Err(error), Ok(true)) => assert_eq!(StatusCode::from(error), StatusCode::CONFLICT),
        _ => panic!("Only approval or lock can succeed"),
    }
    is_status(
        decide(
            &a,
            &registrar,
            &chapter,
            &event,
            &approved,
            EntryStatus::NeedsCorrection,
            "locked-correction",
        )
        .await,
        StatusCode::CONFLICT,
    );
    member(&a, &chapter, "manager", "crew_manager", false).await?;
    is_status(
        a.registration_command::<Crew>(
            &manager,
            &chapter,
            "create",
            Command::CreateCrew {
                name: "Synthetic registration crew".into(),
                city: "Test city".into(),
            },
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    member(&a, &chapter, "manager", "crew_manager", true).await?;
    let restarted = FirestoreRepository::connect("demo-wsb").await?;
    let audit = restarted
        .page::<crate::domain::AuditRecord>(&format!("chapters/{chapter}"), "audit", None, 100)
        .await?;
    assert_eq!(
        audit
            .items
            .iter()
            .filter(|row| row.action == "crew_created" && row.resource_id == crew.id)
            .count(),
        1
    );
    assert_eq!(
        audit
            .items
            .iter()
            .filter(|row| row.action == "crew_invitation_redeemed" && row.resource_id == crew.id)
            .count(),
        2
    );
    assert!(audit
        .items
        .iter()
        .all(|row| row.resource_id != invitation.token));
    assert_eq!(
        restarted
            .entry_detail(&manager, &chapter, &event, &entry.id)
            .await?
            .entry,
        approved
    );
    assert_eq!(
        restarted
            .crew_detail(&manager, &chapter, &crew.id)
            .await?
            .members
            .len(),
        2
    );
    Ok(())
}
