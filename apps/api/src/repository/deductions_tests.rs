use super::*;
use crate::domain::Deduction;

#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator and WSB_RUN_PERSISTENCE_TESTS=demo-wsb"]
async fn technical_deductions_are_versioned_scoped_and_persistent() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    assert!(std::env::var("FIRESTORE_EMULATOR_HOST").is_ok());
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("deductions");
    let event = new_id("event");
    let (entry, crew) = seed(&a, &chapter, &event).await?;
    let head = actor(&chapter, "head", "head_judge");
    let values = vec![Deduction {
        code: "synthetic-test".into(),
        reason: "Synthetic test fixture only".into(),
        points: 1.25,
    }];
    assert!(matches!(
        a.set_deductions(
            &actor(&chapter, "judge-1", "judge"),
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew.clone(),
                expected_revision: 0,
                deductions: values.clone(),
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.set_deductions(
            &head,
            "other-chapter",
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew.clone(),
                expected_revision: 0,
                deductions: values.clone(),
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert!(matches!(
        a.set_deductions(
            &head,
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: "missing-crew".into(),
                expected_revision: 0,
                deductions: values.clone(),
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::FORBIDDEN, _))
    ));
    assert_eq!(
        a.set_deductions(
            &head,
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew.clone(),
                expected_revision: 0,
                deductions: values.clone()
            }
        )
        .await?,
        1
    );
    assert_eq!(
        b.set_deductions(
            &head,
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew.clone(),
                expected_revision: 0,
                deductions: values.clone()
            }
        )
        .await?,
        1
    );
    let changed = vec![Deduction {
        code: "synthetic-test".into(),
        reason: "Changed input".into(),
        points: 2.0,
    }];
    assert!(matches!(
        a.set_deductions(
            &head,
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew.clone(),
                expected_revision: 0,
                deductions: changed
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(matches!(
        a.set_deductions(
            &head,
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew.clone(),
                expected_revision: 2,
                deductions: values.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let state: DivisionDocument =
        required(&a.db, &division_path(&chapter, &event, "open-crew")?).await?;
    let path = division_path(&chapter, &event, "open-crew")?;
    a.db.run_transaction(|db, tx| {
        let path = path.clone();
        Box::pin(async move {
            async {
                let mut state: DivisionDocument = required(&db, &path).await?;
                state.locked = true;
                put(&db, tx, &path, &state)?;
                Ok(())
            }
            .await
            .map_err(backoff)
        })
    })
    .await
    .map_err(transaction_error)?;
    assert!(matches!(
        a.set_deductions(
            &head,
            &chapter,
            &event,
            DeductionUpdate {
                division_id: "open-crew".into(),
                crew_id: crew.clone(),
                expected_revision: 1,
                deductions: values.clone()
            }
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    let stored: TechnicalDeductions = required(
        &FirestoreRepository::connect("demo-wsb").await?.db,
        &format!(
            "{}/deductions/{}",
            division_path(&chapter, &event, "open-crew")?,
            key(&[&crew])
        ),
    )
    .await?;
    assert_eq!(stored.revision, 1);
    assert_eq!(stored.deductions, values);
    let _ = entry;
    let _ = state;
    Ok(())
}
