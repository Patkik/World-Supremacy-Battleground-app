use super::*;
use crate::domain::{VerificationPurpose, VerificationStatus};

#[tokio::test]
#[ignore = "requires the demo-wsb Firestore emulator"]
async fn verification_uploads_are_private_scoped_versioned_and_reviewed() {
    if std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref() != Ok("demo-wsb") {
        panic!("this test only uses the demo-wsb emulator");
    }
    let repo = FirestoreRepository::connect("demo-wsb").await.unwrap();
    let chapter = format!("verification-{}", crate::store::new_id("test"));
    let dancer = actor(&chapter, "synthetic-dancer", "dancer");
    let manager = actor(&chapter, "synthetic-manager", "crew_manager");
    let reviewer = actor(&chapter, "synthetic-verifier", "verifier");
    let judge = actor(&chapter, "synthetic-judge", "judge");
    let records = [
        (dancer.sub.clone(), "dancer".to_owned()),
        (manager.sub.clone(), "crew_manager".to_owned()),
        (reviewer.sub.clone(), "verifier".to_owned()),
        (judge.sub.clone(), "judge".to_owned()),
    ];
    repo.db
        .run_transaction(|db, tx| {
            let chapter = chapter.clone();
            let records = records.to_vec();
            Box::pin(async move {
                async {
                    for (uid, role) in records {
                        put(
                            &db,
                            tx,
                            &format!("chapters/{chapter}/members/{uid}"),
                            &Membership {
                                uid,
                                chapter_id: chapter.clone(),
                                role,
                                active: true,
                                valid_after: 0,
                                expires_at: None,
                            },
                        )?;
                    }
                    Ok::<(), RepositoryError>(())
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .unwrap();

    let empty = repo
        .verification_cases(&dancer, &chapter, None, 30)
        .await
        .unwrap();
    assert!(empty.items.is_empty());

    let (first, duplicate) = tokio::join!(
        repo.create_verification_case(&dancer, &chapter, VerificationPurpose::Identity, "create-1"),
        repo.create_verification_case(&dancer, &chapter, VerificationPurpose::Identity, "create-1")
    );
    let case = first.unwrap();
    assert_eq!(case, duplicate.unwrap());
    assert!(matches!(
        repo.create_verification_case(
            &dancer,
            &chapter,
            VerificationPurpose::Residency,
            "create-1"
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert_eq!(case.dancer_uid, dancer.sub);
    assert_eq!(case.status, VerificationStatus::Uploading);
    assert_eq!(
        case.storage_path,
        format!(
            "chapters/{chapter}/verification/{}/{}/document",
            dancer.sub, case.case_id
        )
    );
    assert!(repo
        .verification_upload_case(&manager, &chapter, &case.case_id)
        .await
        .is_err());
    let file_hash = "a".repeat(64);
    assert!(repo
        .submit_verification_case(
            &dancer,
            &chapter,
            &case.case_id,
            "text/plain",
            4,
            &file_hash
        )
        .await
        .is_err());
    assert!(repo
        .submit_verification_case(
            &dancer,
            &chapter,
            &case.case_id,
            "application/pdf",
            10 * 1024 * 1024 + 1,
            &file_hash
        )
        .await
        .is_err());
    assert!(repo
        .create_verification_case(
            &judge,
            &chapter,
            VerificationPurpose::Identity,
            "create-judge"
        )
        .await
        .is_err());

    let pending = repo
        .submit_verification_case(
            &dancer,
            &chapter,
            &case.case_id,
            "application/pdf",
            128,
            &file_hash,
        )
        .await
        .unwrap();
    let replay = repo
        .submit_verification_case(
            &dancer,
            &chapter,
            &case.case_id,
            "application/pdf",
            128,
            &file_hash,
        )
        .await
        .unwrap();
    assert_eq!(pending, replay);
    assert_eq!(pending.status, VerificationStatus::Pending);
    assert_eq!(
        repo.verification_upload_case(&dancer, &chapter, &case.case_id)
            .await
            .unwrap(),
        pending
    );
    assert_eq!(
        repo.create_verification_case(&dancer, &chapter, VerificationPurpose::Identity, "create-1")
            .await
            .unwrap(),
        pending
    );
    assert!(repo
        .verification_upload_case(&manager, &chapter, &case.case_id)
        .await
        .is_err());

    let own = repo
        .verification_cases(&dancer, &chapter, None, 30)
        .await
        .unwrap();
    assert_eq!(own.items.len(), 1);
    assert_eq!(own.items[0].case_id, case.case_id);
    assert!(repo
        .verification_cases(&judge, &chapter, None, 30)
        .await
        .is_err());
    let queue = repo
        .verification_cases(&reviewer, &chapter, None, 30)
        .await
        .unwrap();
    assert_eq!(queue.items.len(), 1);

    let (first, concurrent) = tokio::join!(
        repo.review_verification_case(
            &reviewer,
            &chapter,
            &case.case_id,
            VerificationStatus::Approved,
            None,
            "review-1"
        ),
        repo.review_verification_case(
            &reviewer,
            &chapter,
            &case.case_id,
            VerificationStatus::Approved,
            None,
            "review-1"
        )
    );
    let reviewed = first.unwrap();
    assert_eq!(reviewed, concurrent.unwrap());
    assert_eq!(
        reviewed.reviewer_uid.as_deref(),
        Some(reviewer.sub.as_str())
    );
    assert_eq!(reviewed.status, VerificationStatus::Approved);
    let replay = repo
        .review_verification_case(
            &reviewer,
            &chapter,
            &case.case_id,
            VerificationStatus::Approved,
            None,
            "review-1",
        )
        .await
        .unwrap();
    assert_eq!(replay, reviewed);
    assert!(matches!(
        repo.review_verification_case(
            &reviewer,
            &chapter,
            &case.case_id,
            VerificationStatus::NeedsCorrection,
            None,
            "review-1"
        )
        .await,
        Err(RepositoryError::Denied(StatusCode::CONFLICT, _))
    ));
    assert!(repo
        .review_verification_case(
            &judge,
            &chapter,
            &case.case_id,
            VerificationStatus::Approved,
            None,
            "review-1"
        )
        .await
        .is_err());
    assert!(repo
        .review_verification_case(
            &reviewer,
            &chapter,
            &case.case_id,
            VerificationStatus::NeedsCorrection,
            Some("retry".into()),
            "review-2"
        )
        .await
        .is_err());

    let other_chapter = format!("another-{}", crate::store::new_id("test"));
    let wrong_scope = actor(&other_chapter, "synthetic-verifier", "verifier");
    assert!(repo
        .verification_cases(&wrong_scope, &chapter, None, 30)
        .await
        .is_err());
    repo.db
        .run_transaction(|db, tx| {
            let chapter = chapter.clone();
            let uid = reviewer.sub.clone();
            Box::pin(async move {
                async {
                    put(
                        &db,
                        tx,
                        &format!("chapters/{chapter}/members/{uid}"),
                        &Membership {
                            uid,
                            chapter_id: chapter,
                            role: "verifier".into(),
                            active: false,
                            valid_after: 0,
                            expires_at: None,
                        },
                    )?;
                    Ok::<(), RepositoryError>(())
                }
                .await
                .map_err(backoff)
            })
        })
        .await
        .unwrap();
    assert!(repo
        .review_verification_case(
            &reviewer,
            &chapter,
            &case.case_id,
            VerificationStatus::Approved,
            None,
            "review-1"
        )
        .await
        .is_err());
}
