use super::*;

#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator and WSB_RUN_PERSISTENCE_TESTS=demo-wsb"]
async fn online_checkin_is_scoped_idempotent_and_recovers() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    assert!(std::env::var("FIRESTORE_EMULATOR_HOST").is_ok());
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("venue");
    let event = new_id("event");
    let (entry_id, _) = seed(&a, &chapter, &event).await?;
    let setup = (chapter.clone(), event.clone());
    a.db.run_transaction(|db, tx| {
        let (chapter, event) = setup.clone();
        Box::pin(async move {
            async {
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
                    &format!("{}/assignments/marshal", event_path(&chapter, &event)?),
                    &Assignment {
                        uid: "marshal".into(),
                        event_id: event,
                        active: true,
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
    let marshal = actor(&chapter, "marshal", "marshal");
    let entry_path = entry_path(&chapter, &event, &entry_id)?;
    let entry: EntryDocument = required(&a.db, &entry_path).await?;
    let dancer = entry.entry.roster[0].uid.clone();
    assert!(matches!(
        a.check_in(&marshal, &chapter, &event, &entry_id, &dancer)
            .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let input = entry_path.clone();
    a.db.run_transaction(|db, tx| {
        let path = input.clone();
        Box::pin(async move {
            async {
                let mut entry: EntryDocument = required(&db, &path).await?;
                entry.entry.paid_minor = u64::from(u32::MAX);
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
        a.check_in(
            &actor(&chapter, "manager", "crew_manager"),
            &chapter,
            &event,
            &entry_id,
            &dancer
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.check_in(&marshal, "wrong-chapter", &event, &entry_id, &dancer)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.check_in(&marshal, &chapter, &event, &entry_id, "unknown")
            .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let (first, second) = tokio::join!(
        a.check_in(&marshal, &chapter, &event, &entry_id, &dancer),
        b.check_in(&marshal, &chapter, &event, &entry_id, &dancer)
    );
    let receipt = first?;
    assert_eq!(receipt, second?);
    let recovered = FirestoreRepository::connect("demo-wsb").await?;
    assert_eq!(
        receipt,
        recovered
            .check_in(&marshal, &chapter, &event, &entry_id, &dancer)
            .await?
    );
    let check_ins = recovered
        .list_check_ins(&marshal, &chapter, &event, None, 1)
        .await?;
    assert_eq!(check_ins.items, vec![receipt.clone()]);
    assert!(matches!(
        recovered
            .list_check_ins(
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
        recovered
            .list_check_ins(&marshal, "wrong-chapter", &event, None, 30)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        recovered
            .list_check_ins(&marshal, &chapter, &event, None, 101)
            .await,
        Err(RepositoryError::Denied(StatusCode::BAD_REQUEST, _))
    ));
    let audit_rows = recovered
        .page::<AuditRecord>(&format!("chapters/{chapter}"), "audit", None, 100)
        .await?;
    assert_eq!(
        audit_rows
            .items
            .iter()
            .filter(|item| item.action == "dancer_checked_in")
            .count(),
        1
    );
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
        a.check_in(&marshal, &chapter, &event, &entry_id, &dancer)
            .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.list_check_ins(&marshal, &chapter, &event, None, 30).await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    Ok(())
}
