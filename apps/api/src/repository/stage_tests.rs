use super::*;
use crate::domain::StagePosition;
use crate::repository::lineup::StageLineupCommand;
use crate::repository::stage::{
    StageCommand, StageConfigureCommand, StageControl, StageCreateCommand, StageEntry,
    StageHoldCommand, StageMarshalCommand,
};

async fn set_paid(
    repo: &FirestoreRepository,
    chapter: &str,
    event: &str,
    entry: &str,
    amount: u64,
) -> Result<()> {
    let path = entry_path(chapter, event, entry)?;
    repo.db
        .run_transaction(|db, tx| {
            let path = path.clone();
            Box::pin(async move {
                async {
                    let mut value: EntryDocument = required(&db, &path).await?;
                    value.entry.paid_minor = amount;
                    put(&db, tx, &path, &value)?;
                    Ok(())
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .map_err(transaction_error)
}

#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator"]
async fn stage_commands_are_authorized_replay_safe_and_serialize_performers() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("stage-test");
    let event = new_id("event");
    let (entry_id, _) = seed(&a, &chapter, &event).await?;
    let input = (chapter.clone(), event.clone(), entry_id.clone());
    a.db.run_transaction(|db, tx| {
        let (chapter, event, entry_id) = input.clone();
        Box::pin(async move {
            async {
                let parent = event_path(&chapter, &event)?;
                put(
                    &db,
                    tx,
                    &format!("chapters/{chapter}/members/director"),
                    &Membership {
                        uid: "director".into(),
                        chapter_id: chapter.clone(),
                        role: "chapter_director".into(),
                        active: true,
                        valid_after: 0,
                        expires_at: None,
                    },
                )?;
                put(
                    &db,
                    tx,
                    &format!("chapters/{chapter}/members/marshal"),
                    &Membership {
                        uid: "marshal".into(),
                        chapter_id: chapter.clone(),
                        role: "marshal".into(),
                        active: true,
                        valid_after: 0,
                        expires_at: None,
                    },
                )?;
                put(
                    &db,
                    tx,
                    &format!("{parent}/assignments/marshal"),
                    &Assignment {
                        uid: "marshal".into(),
                        event_id: event.clone(),
                        active: true,
                    },
                )?;
                put(
                    &db,
                    tx,
                    &format!("{parent}/stages/main"),
                    &StageControl {
                        stage_id: "main".into(),
                        chapter_id: chapter.clone(),
                        event_id: event.clone(),
                        active: true,
                        public_display: false,
                        single_performer: true,
                        performing_entry: None,
                        held: false,
                        hold_revision: 0,
                        history_revision: 0,
                        access_revision: 0,
                        config_revision: 0,
                        marshal_uids: vec!["marshal".into()],
                    },
                )?;
                put(
                    &db,
                    tx,
                    &format!("{parent}/stages/secondary"),
                    &StageControl {
                        stage_id: "secondary".into(),
                        chapter_id: chapter.clone(),
                        event_id: event.clone(),
                        active: true,
                        public_display: false,
                        single_performer: true,
                        performing_entry: None,
                        held: false,
                        hold_revision: 0,
                        history_revision: 0,
                        access_revision: 0,
                        config_revision: 0,
                        marshal_uids: vec!["marshal".into()],
                    },
                )?;
                put(
                    &db,
                    tx,
                    &format!("{parent}/stages/race"),
                    &StageControl {
                        stage_id: "race".into(),
                        chapter_id: chapter.clone(),
                        event_id: event.clone(),
                        active: true,
                        public_display: false,
                        single_performer: true,
                        performing_entry: None,
                        held: false,
                        hold_revision: 0,
                        history_revision: 0,
                        access_revision: 0,
                        config_revision: 0,
                        marshal_uids: vec!["marshal".into()],
                    },
                )?;
                let mut entry: EntryDocument =
                    required(&db, &entry_path(&chapter, &event, &entry_id)?).await?;
                put(
                    &db,
                    tx,
                    &format!("{parent}/stages/restricted"),
                    &StageControl {
                        stage_id: "restricted".into(),
                        chapter_id: chapter.clone(),
                        event_id: event.clone(),
                        active: true,
                        public_display: false,
                        single_performer: true,
                        performing_entry: None,
                        held: false,
                        hold_revision: 0,
                        history_revision: 0,
                        access_revision: 0,
                        config_revision: 0,
                        marshal_uids: vec![],
                    },
                )?;
                entry.entry.paid_minor = u64::from(u32::MAX);
                put(&db, tx, &entry_path(&chapter, &event, &entry_id)?, &entry)?;
                entry.entry.id = "second-entry".into();
                put(
                    &db,
                    tx,
                    &entry_path(&chapter, &event, "second-entry")?,
                    &entry,
                )?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let marshal = actor(&chapter, "marshal", "marshal");
    let entry: EntryDocument = required(&a.db, &entry_path(&chapter, &event, &entry_id)?).await?;
    let command = |id: &str, entry: &str, revision, position| StageCommand {
        operation_id: id.into(),
        stage_id: "main".into(),
        entry_id: entry.into(),
        expected_revision: revision,
        position,
    };
    assert!(matches!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            command("missing", &entry_id, 0, StagePosition::Holding)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    for dancer in &entry.entry.roster {
        a.check_in(&marshal, &chapter, &event, &entry_id, &dancer.uid)
            .await?;
    }
    assert!(matches!(
        a.stage_command(
            &actor(&chapter, "manager", "crew_manager"),
            &chapter,
            &event,
            command("denied", &entry_id, 0, StagePosition::Holding)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_command(
            &marshal,
            "other-chapter",
            &event,
            command("denied", &entry_id, 0, StagePosition::Holding)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    let first = command("first", &entry_id, 0, StagePosition::Holding);
    let (one, two) = tokio::join!(
        a.stage_command(&marshal, &chapter, &event, first.clone()),
        b.stage_command(&marshal, &chapter, &event, first.clone())
    );
    let receipt = one?;
    assert_eq!(receipt, two?);
    let stages = a.stage_list(&marshal, &chapter, &event, None, 30).await?;
    assert_eq!(stages.items.len(), 3);
    let access_command = |id: &str, revision, uids| StageMarshalCommand {
        operation_id: id.into(),
        stage_id: "main".into(),
        expected_revision: revision,
        marshal_uids: uids,
        reason: "Synthetic access change for rehearsal".into(),
    };
    let director = actor(&chapter, "director", "chapter_director");
    let create = StageCreateCommand {
        operation_id: "create-stage".into(),
        stage_id: "provisioned".into(),
        single_performer: true,
        reason: "Synthetic stage provisioning for rehearsal".into(),
    };
    assert!(matches!(
        a.stage_create(&marshal, &chapter, &event, create.clone())
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    let (created_a, created_b) = tokio::join!(
        a.stage_create(&director, &chapter, &event, create.clone()),
        b.stage_create(&director, &chapter, &event, create.clone())
    );
    let created = created_a?;
    assert_eq!(created, created_b?);
    let lineup = StageLineupCommand {
        operation_id: "plan".into(),
        stage_id: "provisioned".into(),
        expected_revision: 0,
        entry_ids: vec![entry_id.clone(), "second-entry".into()],
        reason: "Synthetic reviewed draft".into(),
    };
    assert!(a
        .stage_lineup(&director, &chapter, &event, "provisioned")
        .await?
        .is_none());
    assert!(matches!(
        a.stage_lineup_save(&marshal, &chapter, &event, lineup.clone())
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    let (plan_a, plan_b) = tokio::join!(
        a.stage_lineup_save(&director, &chapter, &event, lineup.clone()),
        b.stage_lineup_save(&director, &chapter, &event, lineup.clone())
    );
    let plan = plan_a?;
    assert_eq!(plan, plan_b?);
    assert_eq!(
        plan.entry_ids,
        vec![entry_id.clone(), "second-entry".into()]
    );
    assert_eq!(plan.revision, 1);
    assert_eq!(
        b.stage_lineup(&director, &chapter, &event, "provisioned")
            .await?,
        Some(plan.clone())
    );
    assert!(matches!(
        a.stage_lineup_save(
            &director,
            &chapter,
            &event,
            StageLineupCommand {
                entry_ids: vec![],
                ..lineup.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.stage_lineup_save(
            &director,
            &chapter,
            &event,
            StageLineupCommand {
                operation_id: "stale-plan".into(),
                entry_ids: vec![],
                ..lineup.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.stage_lineup_save(
            &director,
            &chapter,
            &event,
            StageLineupCommand {
                operation_id: "duplicate-plan".into(),
                entry_ids: vec![entry_id.clone(), entry_id.clone()],
                ..lineup.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
    ));
    let cleared = a
        .stage_lineup_save(
            &director,
            &chapter,
            &event,
            StageLineupCommand {
                operation_id: "clear-plan".into(),
                expected_revision: 1,
                entry_ids: vec![],
                ..lineup.clone()
            },
        )
        .await?;
    assert_eq!(cleared.revision, 2);
    let reordered = a
        .stage_lineup_save(
            &director,
            &chapter,
            &event,
            StageLineupCommand {
                operation_id: "reorder-plan".into(),
                expected_revision: 2,
                entry_ids: vec!["second-entry".into(), entry_id.clone()],
                ..lineup.clone()
            },
        )
        .await?;
    assert_eq!(
        reordered.entry_ids,
        vec!["second-entry".to_owned(), entry_id.clone()]
    );
    assert_eq!(reordered.revision, 3);
    let history = a
        .stage_lineup_history(&director, &chapter, &event, "provisioned", None, 2)
        .await?;
    assert_eq!(
        history.items.iter().map(|v| v.revision).collect::<Vec<_>>(),
        vec![1, 2]
    );
    let next = b
        .stage_lineup_history(
            &director,
            &chapter,
            &event,
            "provisioned",
            history.next_page,
            2,
        )
        .await?;
    assert_eq!(
        next.items.iter().map(|v| v.revision).collect::<Vec<_>>(),
        vec![3]
    );
    assert!(matches!(
        a.stage_lineup_history(&marshal, &chapter, &event, "provisioned", None, 2)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));

    let configure = StageConfigureCommand {
        operation_id: "deactivate".into(),
        stage_id: "provisioned".into(),
        expected_revision: 0,
        active: false,
        public_display: false,
        single_performer: true,
        reason: "Synthetic stage lifecycle update".into(),
    };
    assert!(matches!(
        a.stage_configure(&marshal, &chapter, &event, configure.clone())
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    let archived = a
        .stage_configure(&director, &chapter, &event, configure.clone())
        .await?;
    assert!(!archived.active && archived.held && archived.config_revision == 1);
    assert_eq!(
        b.stage_configure(&director, &chapter, &event, configure.clone())
            .await?,
        archived
    );
    assert_eq!(
        b.stage_detail(&director, &chapter, &event, "provisioned")
            .await?,
        archived
    );
    assert!(matches!(
        a.stage_configure(
            &director,
            &chapter,
            &event,
            StageConfigureCommand {
                active: true,
                ..configure.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let restored_config = a
        .stage_configure(
            &director,
            &chapter,
            &event,
            StageConfigureCommand {
                operation_id: "reactivate".into(),
                expected_revision: 1,
                active: true,
                single_performer: false,
                ..configure.clone()
            },
        )
        .await?;
    let occupied_path = format!(
        "{}/stageEntries/{}",
        event_path(&chapter, &event)?,
        key(&["provisioned", "occupant"])
    );
    a.db.run_transaction(|db, tx| {
        let path = occupied_path.clone();
        Box::pin(async move {
            put(
                &db,
                tx,
                &path,
                &StageEntry {
                    stage_id: "provisioned".into(),
                    entry_id: "occupant".into(),
                    position: StagePosition::Performing,
                    revision: 3,
                    updated_at: now_secs(),
                },
            )
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.stage_configure(
            &director,
            &chapter,
            &event,
            StageConfigureCommand {
                operation_id: "occupied".into(),
                expected_revision: 2,
                active: false,
                single_performer: false,
                ..configure.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.stage_lineup_save(
            &director,
            &chapter,
            &event,
            StageLineupCommand {
                operation_id: "occupied-plan".into(),
                expected_revision: 3,
                ..lineup.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(restored_config.active && restored_config.held && !restored_config.single_performer);
    assert!(created.held && created.marshal_uids.is_empty() && created.single_performer);
    assert!(matches!(
        a.stage_detail(&marshal, &chapter, &event, "provisioned")
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_create(
            &director,
            &chapter,
            &event,
            StageCreateCommand {
                single_performer: false,
                ..create.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.stage_create(
            &director,
            &chapter,
            &event,
            StageCreateCommand {
                operation_id: "another-create".into(),
                ..create.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert_eq!(
        b.stage_detail(&director, &chapter, &event, "provisioned")
            .await?,
        restored_config
    );

    assert!(matches!(
        a.stage_marshals(
            &marshal,
            &chapter,
            &event,
            access_command("denied", 0, vec![])
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    let removal = access_command("remove", 0, vec![]);
    let removed = a
        .stage_marshals(&director, &chapter, &event, removal.clone())
        .await?;
    assert_eq!(removed.access_revision, 1);
    assert!(removed.marshal_uids.is_empty());
    assert_eq!(
        removed,
        b.stage_marshals(&director, &chapter, &event, removal)
            .await?
    );
    assert!(matches!(
        a.stage_detail(&marshal, &chapter, &event, "main").await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_marshals(
            &director,
            &chapter,
            &event,
            access_command("remove", 0, vec!["marshal".into()])
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let restored = a
        .stage_marshals(
            &director,
            &chapter,
            &event,
            access_command("restore", 1, vec!["marshal".into()]),
        )
        .await?;
    assert_eq!(restored.access_revision, 2);
    assert!(matches!(
        a.stage_detail(&marshal, &chapter, &event, "restricted")
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_history(&marshal, &chapter, &event, "restricted", None, 30)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            StageCommand {
                operation_id: "restricted".into(),
                stage_id: "restricted".into(),
                entry_id: entry_id.clone(),
                expected_revision: 0,
                position: StagePosition::Holding
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    let visible = a
        .stage_entry_list(&marshal, &chapter, &event, "main", None, 30)
        .await?;
    assert_eq!(visible.items, vec![receipt.clone()]);
    assert!(matches!(
        a.stage_list(
            &actor(&chapter, "manager", "crew_manager"),
            &chapter,
            &event,
            None,
            30
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_entry_list(&marshal, "wrong-chapter", &event, "main", None, 30)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_entry_list(&marshal, &chapter, &event, "main", None, 101)
            .await,
        Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
    ));
    assert!(matches!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            command("first", &entry_id, 0, StagePosition::OnDeck)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            command("skip", &entry_id, 1, StagePosition::Performing)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    a.stage_command(
        &marshal,
        &chapter,
        &event,
        command("deck-one", &entry_id, 1, StagePosition::OnDeck),
    )
    .await?;
    a.stage_command(
        &marshal,
        &chapter,
        &event,
        command("hold-two", "second-entry", 0, StagePosition::Holding),
    )
    .await?;
    a.stage_command(
        &marshal,
        &chapter,
        &event,
        command("deck-two", "second-entry", 1, StagePosition::OnDeck),
    )
    .await?;
    let hold = |id: &str, revision, held| StageHoldCommand {
        operation_id: id.into(),
        stage_id: "main".into(),
        expected_revision: revision,
        held,
    };
    assert!(matches!(
        a.stage_hold(
            &actor(&chapter, "manager", "crew_manager"),
            &chapter,
            &event,
            hold("denied-hold", 0, true)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_hold(
            &marshal,
            "wrong-chapter",
            &event,
            hold("wrong-scope", 0, true)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    let (held_one, held_two) = tokio::join!(
        a.stage_hold(&marshal, &chapter, &event, hold("hold-one", 0, true)),
        b.stage_hold(&marshal, &chapter, &event, hold("hold-one", 0, true))
    );
    let held = held_one?;
    assert_eq!(held, held_two?);
    assert!(held.held);
    assert_eq!(held.hold_revision, 1);
    let history = a
        .page::<crate::repository::stage::StageHistory>(
            &format!("{}/stages/main", event_path(&chapter, &event)?),
            "history",
            None,
            100,
        )
        .await?;
    assert_eq!(history.items.len() as u64, held.history_revision);
    assert_eq!(history.items.len(), 5);
    let first_page = a
        .stage_history(&marshal, &chapter, &event, "main", None, 2)
        .await?;
    let saved_history_cursor = first_page.next_page.clone();
    for limit in [0, 101] {
        assert!(matches!(
            a.stage_history(&marshal, &chapter, &event, "main", None, limit)
                .await,
            Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
        ));
    }
    assert!(matches!(
        a.stage_history(
            &marshal,
            &chapter,
            &event,
            "main",
            Some("x".repeat(4097)),
            30
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
    ));
    assert_eq!(
        first_page
            .items
            .iter()
            .map(|row| row.revision)
            .collect::<Vec<_>>(),
        vec![1, 2]
    );
    let second_page = a
        .stage_history(&marshal, &chapter, &event, "main", first_page.next_page, 2)
        .await?;
    assert_eq!(
        second_page
            .items
            .iter()
            .map(|row| row.revision)
            .collect::<Vec<_>>(),
        vec![3, 4]
    );
    assert!(matches!(
        a.stage_history(
            &actor(&chapter, "manager", "crew_manager"),
            &chapter,
            &event,
            "main",
            None,
            30
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_history(&marshal, "other-chapter", &event, "main", None, 30)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    for (index, item) in history.items.iter().enumerate() {
        assert_eq!(item.revision, index as u64 + 1);
    }
    assert!(history.items.last().unwrap().held);
    let hold_audit = key(&["stage-hold", &event, &marshal.sub, "hold-one"]);
    let audits = a
        .page::<AuditRecord>(&format!("chapters/{chapter}"), "audit", None, 100)
        .await?;
    assert_eq!(
        audits
            .items
            .iter()
            .filter(|item| item.id == hold_audit && item.action == "stage_hold_set")
            .count(),
        1
    );
    assert_eq!(
        a.stage_detail(&marshal, &chapter, &event, "main").await?,
        held
    );
    assert!(matches!(
        a.stage_hold(&marshal, &chapter, &event, hold("hold-one", 0, false))
            .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.stage_hold(&marshal, &chapter, &event, hold("stale-hold", 0, false))
            .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            command("blocked-by-hold", &entry_id, 2, StagePosition::Performing)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let released = a
        .stage_hold(&marshal, &chapter, &event, hold("release-one", 1, false))
        .await?;
    assert!(!released.held);
    assert_eq!(released.hold_revision, 2);
    let race_command = |id: &str, revision, position| StageCommand {
        operation_id: id.into(),
        stage_id: "race".into(),
        entry_id: entry_id.clone(),
        expected_revision: revision,
        position,
    };
    let race_hold = |id: &str, revision, held| StageHoldCommand {
        operation_id: id.into(),
        stage_id: "race".into(),
        expected_revision: revision,
        held,
    };
    a.stage_command(
        &marshal,
        &chapter,
        &event,
        race_command("race-holding", 0, StagePosition::Holding),
    )
    .await?;
    a.stage_command(
        &marshal,
        &chapter,
        &event,
        race_command("race-deck", 1, StagePosition::OnDeck),
    )
    .await?;
    let (start, hold_race) = tokio::join!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            race_command("race-start", 2, StagePosition::Performing)
        ),
        b.stage_hold(&marshal, &chapter, &event, race_hold("race-hold", 0, true))
    );
    assert!(hold_race?.held);
    let race_state = a.stage_detail(&marshal, &chapter, &event, "race").await?;
    assert!(race_state.held);
    if start.is_ok() {
        assert_eq!(
            race_state.performing_entry.as_deref(),
            Some(entry_id.as_str())
        );
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            race_command("race-complete", 3, StagePosition::Completed),
        )
        .await?;
    } else {
        assert!(matches!(
            start,
            Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
        ));
        assert!(race_state.performing_entry.is_none());
    }
    a.stage_hold(
        &marshal,
        &chapter,
        &event,
        race_hold("race-release", 1, false),
    )
    .await?;
    let (one, two) = tokio::join!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            command("perform-one", &entry_id, 2, StagePosition::Performing)
        ),
        b.stage_command(
            &marshal,
            &chapter,
            &event,
            command("perform-two", "second-entry", 2, StagePosition::Performing)
        )
    );
    assert_ne!(one.is_ok(), two.is_ok());
    let loser = if let Err(error) = &one {
        error
    } else {
        two.as_ref().err().unwrap()
    };
    assert!(matches!(
        loser,
        RepositoryError::Denied(StatusCode::CONFLICT, _)
    ));
    let winner = if one.is_ok() {
        &entry_id
    } else {
        "second-entry"
    };
    let recovered = FirestoreRepository::connect("demo-wsb").await?;
    assert_eq!(
        receipt,
        recovered
            .stage_command(&marshal, &chapter, &event, first)
            .await?
    );
    let secondary = |id: &str, revision, position| StageCommand {
        operation_id: id.into(),
        stage_id: "secondary".into(),
        entry_id: winner.into(),
        expected_revision: revision,
        position,
    };
    recovered
        .stage_command(
            &marshal,
            &chapter,
            &event,
            secondary("second-holding", 0, StagePosition::Holding),
        )
        .await?;
    recovered
        .stage_command(
            &marshal,
            &chapter,
            &event,
            secondary("second-deck", 1, StagePosition::OnDeck),
        )
        .await?;
    assert!(matches!(
        recovered
            .stage_command(
                &marshal,
                &chapter,
                &event,
                secondary("second-performing", 2, StagePosition::Performing)
            )
            .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let held_during_performance = recovered
        .stage_hold(&marshal, &chapter, &event, hold("hold-during", 2, true))
        .await?;
    assert!(held_during_performance.held);
    set_paid(&a, &chapter, &event, winner, 0).await?;
    recovered
        .stage_command(
            &marshal,
            &chapter,
            &event,
            command("complete", winner, 3, StagePosition::Completed),
        )
        .await?;
    assert!(
        recovered
            .stage_detail(&marshal, &chapter, &event, "main")
            .await?
            .held
    );
    recovered
        .stage_hold(&marshal, &chapter, &event, hold("release-after", 3, false))
        .await?;
    set_paid(&a, &chapter, &event, winner, u64::from(u32::MAX)).await?;
    recovered
        .stage_command(
            &marshal,
            &chapter,
            &event,
            secondary("second-performing", 2, StagePosition::Performing),
        )
        .await?;
    recovered
        .stage_command(
            &marshal,
            &chapter,
            &event,
            secondary("second-completed", 3, StagePosition::Completed),
        )
        .await?;
    let stage_path = format!("{}/stages/main", event_path(&chapter, &event)?);
    a.db.run_transaction(|db, tx| {
        let path = stage_path.clone();
        Box::pin(async move {
            async {
                let mut stage: StageControl = required(&db, &path).await?;
                stage.marshal_uids.clear();
                put(&db, tx, &path, &stage)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.stage_detail(&marshal, &chapter, &event, "main").await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_entry_list(&marshal, &chapter, &event, "main", None, 30)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_history(
            &marshal,
            &chapter,
            &event,
            "main",
            saved_history_cursor.clone(),
            2
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            command("complete", winner, 3, StagePosition::Completed)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_hold(&marshal, &chapter, &event, hold("hold-one", 0, true))
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(!a
        .stage_list(&marshal, &chapter, &event, None, 100)
        .await?
        .items
        .iter()
        .any(|stage| stage.stage_id == "main"));
    let fresh = FirestoreRepository::connect("demo-wsb").await?;
    assert!(matches!(
        fresh.stage_detail(&marshal, &chapter, &event, "main").await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    a.db.run_transaction(|db, tx| {
        let path = stage_path.clone();
        Box::pin(async move {
            async {
                let mut stage: StageControl = required(&db, &path).await?;
                stage.marshal_uids = vec!["marshal".into()];
                put(&db, tx, &path, &stage)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    let path = format!("chapters/{chapter}/members/marshal");
    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        Box::pin(async move {
            async {
                let mut member: Membership = required(&db, &path).await?;
                member.active = false;
                put(&db, tx, &path, &member)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.stage_command(
            &marshal,
            &chapter,
            &event,
            command("complete", winner, 3, StagePosition::Completed)
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_list(&marshal, &chapter, &event, None, 30).await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_history(&marshal, &chapter, &event, "main", saved_history_cursor, 2)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.stage_hold(&marshal, &chapter, &event, hold("hold-one", 0, true))
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    Ok(())
}
