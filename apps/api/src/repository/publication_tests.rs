use super::*;
use crate::domain::{EntryStatus, RecordedScore, ScoreCriteria};

#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator and WSB_RUN_PERSISTENCE_TESTS=demo-wsb"]
async fn unresolved_tie_is_never_written_to_public_projection() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    assert!(std::env::var("FIRESTORE_EMULATOR_HOST").is_ok());

    let repo = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("tie-chapter");
    let event = new_id("tie-event");
    let head = actor(&chapter, "head", "head_judge");
    let event_doc = crate::domain::Event {
        registration_closes_at: None,
        id: event.clone(),
        chapter_id: chapter.clone(),
        name: "Synthetic tie event".into(),
        status: "active".into(),
        rules_version: "synthetic-policy-1".into(),
    };
    let source = crate::store::RegistrationStore::new();
    let division = DivisionDocument {
        policy: source.divisions["manila-session-2027"][0].clone(),
        panel: vec!["judge-1".into(), "judge-2".into()],
        locked: true,
        generation: 7,
        approved_entries: 2,
        completed_scorecards: 4,
        unready_entries: 0,
        publication_id: None,
    };
    let mut entries = Vec::new();
    for index in 1..=2 {
        let mut entry = source.entries["entry-manila-open-1"].clone();
        entry.id = format!("synthetic-tied-entry-{index}");
        entry.chapter_id = chapter.clone();
        entry.event_id = event.clone();
        entry.crew_id = format!("synthetic-tied-crew-{index}");
        entry.status = EntryStatus::Approved;
        entries.push(EntryDocument {
            entry,
            pending_minor: 0,
            completed_scorecards: 2,
        });
    }

    let division_doc_path = division_path(&chapter, &event, "open-crew")?;
    let input = (
        chapter.clone(),
        event.clone(),
        division,
        entries.clone(),
        division_doc_path,
        event_doc,
    );
    repo.db
        .run_transaction(|db, tx| {
            let (chapter, event, division, entries, division_doc_path, event_doc) = input.clone();
            Box::pin(async move {
                async {
                    put(
                        &db,
                        tx,
                        &format!("chapters/{chapter}"),
                        &Chapter {
                            id: chapter.clone(),
                            name: "Synthetic tie chapter".into(),
                            currency: "PHP".into(),
                        },
                    )?;
                    put(&db, tx, &event_path(&chapter, &event)?, &event_doc)?;
                    for (uid, role) in [
                        ("head", "head_judge"),
                        ("judge-1", "judge"),
                        ("judge-2", "judge"),
                    ] {
                        put(
                            &db,
                            tx,
                            &format!("chapters/{chapter}/members/{uid}"),
                            &Membership {
                                uid: uid.into(),
                                chapter_id: chapter.clone(),
                                role: role.into(),
                                active: true,
                                valid_after: 0,
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &format!("chapters/{chapter}/events/{event}/assignments/{uid}"),
                            &Assignment {
                                uid: uid.into(),
                                event_id: event.clone(),
                                active: true,
                            },
                        )?;
                    }
                    put(&db, tx, &division_doc_path, &division)?;
                    for document in entries {
                        let entry = &document.entry;
                        put(
                            &db,
                            tx,
                            &entry_path(&chapter, &event, &entry.id)?,
                            &document,
                        )?;
                        for judge_uid in ["judge-1", "judge-2"] {
                            put(
                                &db,
                                tx,
                                &format!(
                                    "{}/scorecards/{}",
                                    entry_path(&chapter, &event, &entry.id)?,
                                    key(&[judge_uid])
                                ),
                                &RecordedScore {
                                    chapter_id: chapter.clone(),
                                    event_id: event.clone(),
                                    division_id: "open-crew".into(),
                                    crew_id: entry.crew_id.clone(),
                                    judge_uid: judge_uid.into(),
                                    revision: 1,
                                    criteria: ScoreCriteria {
                                        choreography: 18.0,
                                        musicality: 18.0,
                                        execution: 18.0,
                                        stage_presence: 18.0,
                                        entertainment: 18.0,
                                    },
                                },
                            )?;
                        }
                    }
                    Ok(())
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .map_err(transaction_error)?;

    assert!(matches!(
        repo.publish_division_results(&head, &chapter, &event, "open-crew")
            .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(repo.published_event_results(&event).await?.is_empty());
    let division: DivisionDocument =
        required(&repo.db, &division_path(&chapter, &event, "open-crew")?).await?;
    assert_eq!(division.publication_id, None);
    let audits = repo
        .page::<AuditRecord>(&format!("chapters/{chapter}"), "audit", None, 100)
        .await?;
    assert!(!audits
        .items
        .iter()
        .any(|record| record.action == "division_published"));
    Ok(())
}
