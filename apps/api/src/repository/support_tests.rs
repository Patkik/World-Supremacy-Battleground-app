use super::*;
use crate::inquiries::*;
use crate::repository::support::InquiryActor;

fn input(operation: &str, email: &str) -> CreateInquiry {
    CreateInquiry {
        operation_id: operation.into(),
        subject: "Synthetic support question".into(),
        category: "registration".into(),
        requester_name: "Synthetic requester".into(),
        email: email.into(),
        message: "Synthetic question without private attachments.".into(),
    }
}
fn update(
    operation: &str,
    revision: u64,
    message: &str,
    status: Option<InquiryStatus>,
) -> InquiryUpdate {
    InquiryUpdate {
        operation_id: operation.into(),
        expected_revision: revision,
        message: message.into(),
        status,
    }
}
fn status<T>(result: Result<T>, expected: StatusCode) {
    assert!(matches!(result,Err(RepositoryError::Denied(value,_)) if value==expected));
}

#[tokio::test]
#[ignore = "requires demo-wsb Firestore emulator and WSB_RUN_PERSISTENCE_TESTS=demo-wsb"]
async fn inquiry_capabilities_account_scope_replay_staff_races_quota_and_recovery() -> Result<()> {
    assert_eq!(
        std::env::var("WSB_RUN_PERSISTENCE_TESTS").as_deref(),
        Ok("demo-wsb")
    );
    let a = FirestoreRepository::connect("demo-wsb").await?;
    let b = FirestoreRepository::connect("demo-wsb").await?;
    let chapter = new_id("support");
    let event = new_id("event");
    let (entry_id, _) = seed(&a, &chapter, &event).await?;
    let input_chapter = chapter.clone();
    a.db.run_transaction(|db, tx| {
        let chapter = input_chapter.clone();
        Box::pin(async move {
            async {
                put(
                    &db,
                    tx,
                    &format!("chapters/{chapter}/members/support"),
                    &Membership {
                        uid: "support".into(),
                        chapter_id: chapter,
                        role: "support".into(),
                        active: true,
                        valid_after: 0,
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
    let support = actor(&chapter, "support", "support");
    let manager = actor(&chapter, "manager", "crew_manager");
    let contact = InquiryActor::Contact("a".repeat(64));
    let body = input("public-create", "synthetic-contact@example.test");
    let (one, two) = tokio::join!(
        a.create_inquiry(&chapter, contact.clone(), body.clone()),
        b.create_inquiry(&chapter, contact.clone(), body.clone())
    );
    let receipt = one?;
    assert_eq!(receipt, two?);
    let mut changed = body.clone();
    changed.message = "Changed input".into();
    status(
        a.create_inquiry(&chapter, contact.clone(), changed).await,
        StatusCode::CONFLICT,
    );
    let record: Inquiry = required(
        &a.db,
        &format!("chapters/{chapter}/inquiries/{}", receipt.id),
    )
    .await?;
    assert_ne!(
        record.capability_hash.as_deref(),
        Some("a".repeat(64).as_str())
    );
    assert!(record.requester_uid.is_none());
    status(
        a.inquiry_thread(
            &chapter,
            &receipt.id,
            InquiryActor::Contact("b".repeat(64)),
            None,
            30,
        )
        .await,
        StatusCode::NOT_FOUND,
    );
    status(
        a.inquiry_thread(
            &chapter,
            &receipt.id,
            InquiryActor::Member(manager.clone()),
            None,
            30,
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    status(
        a.inquiry_thread("other-chapter", &receipt.id, contact.clone(), None, 30)
            .await,
        StatusCode::NOT_FOUND,
    );
    assert!(a
        .list_inquiries(&manager, &chapter, None, 30)
        .await?
        .items
        .is_empty());
    let list = a.list_inquiries(&support, &chapter, None, 30).await?;
    assert_eq!(list.items.len(), 1);
    assert_eq!(list.items[0].email, body.email);
    let thread = a
        .inquiry_thread(&chapter, &receipt.id, contact.clone(), None, 1)
        .await?;
    assert_eq!(thread.messages.items.len(), 1);
    assert_eq!(thread.messages.items[0].body, body.message);
    status(
        a.update_inquiry(
            &chapter,
            &receipt.id,
            contact.clone(),
            update("fake-resolution", 1, "", Some(InquiryStatus::Resolved)),
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    let member_case = a
        .create_inquiry(
            &chapter,
            InquiryActor::Member(manager.clone()),
            input("member-create", "synthetic-member@example.test"),
        )
        .await?;
    status(
        a.inquiry_thread(&chapter, &member_case.id, contact.clone(), None, 30)
            .await,
        StatusCode::NOT_FOUND,
    );
    let own = a.list_inquiries(&manager, &chapter, None, 30).await?;
    assert_eq!(own.items.len(), 1);
    assert_eq!(own.items[0].summary.id, member_case.id);
    let reply = update(
        "support-reply",
        1,
        "Synthetic chapter reply.",
        Some(InquiryStatus::WaitingOnRequester),
    );
    let replied = a
        .update_inquiry(
            &chapter,
            &receipt.id,
            InquiryActor::Member(support.clone()),
            reply.clone(),
        )
        .await?;
    assert_eq!(replied.revision, 2);
    assert_eq!(
        replied,
        b.update_inquiry(
            &chapter,
            &receipt.id,
            InquiryActor::Member(support.clone()),
            reply.clone()
        )
        .await?
    );
    let mut altered = reply.clone();
    altered.message = "Different reply".into();
    status(
        a.update_inquiry(
            &chapter,
            &receipt.id,
            InquiryActor::Member(support.clone()),
            altered,
        )
        .await,
        StatusCode::CONFLICT,
    );
    let page = a
        .inquiry_thread(&chapter, &receipt.id, contact.clone(), None, 1)
        .await?;
    let next = page
        .messages
        .next_page
        .expect("bounded conversation cursor");
    let page = a
        .inquiry_thread(&chapter, &receipt.id, contact.clone(), Some(next), 1)
        .await?;
    assert_eq!(page.messages.items[0].source, "chapter_support");
    let (one, two) = tokio::join!(
        a.update_inquiry(
            &chapter,
            &receipt.id,
            contact.clone(),
            update("requester-race", 2, "Synthetic requester reply", None)
        ),
        b.update_inquiry(
            &chapter,
            &receipt.id,
            InquiryActor::Member(support.clone()),
            update(
                "staff-race",
                2,
                "Synthetic resolution",
                Some(InquiryStatus::Resolved)
            )
        )
    );
    assert_eq!(usize::from(one.is_ok()) + usize::from(two.is_ok()), 1);
    if let Err(error) = one {
        assert_eq!(StatusCode::from(error), StatusCode::CONFLICT);
    }
    if let Err(error) = two {
        assert_eq!(StatusCode::from(error), StatusCode::CONFLICT);
    }
    set_member_active(&a, &chapter, "support", false).await?;
    status(
        a.update_inquiry(
            &chapter,
            &receipt.id,
            InquiryActor::Member(support.clone()),
            reply,
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    set_member_active(&a, &chapter, "support", true).await?;
    status(
        a.request_payment(
            &support,
            &chapter,
            &event,
            &entry_id,
            "support-cannot-finance",
            Some(100),
        )
        .await,
        StatusCode::FORBIDDEN,
    );
    for index in 1..5 {
        a.create_inquiry(
            &chapter,
            InquiryActor::Contact(format!("{index:064x}")),
            input(&format!("quota-{index}"), &body.email),
        )
        .await?;
    }
    status(
        a.create_inquiry(
            &chapter,
            InquiryActor::Contact("f".repeat(64)),
            input("quota-overflow", &body.email),
        )
        .await,
        StatusCode::TOO_MANY_REQUESTS,
    );
    let restarted = FirestoreRepository::connect("demo-wsb").await?;
    let recovered = restarted
        .inquiry_thread(&chapter, &receipt.id, contact, None, 30)
        .await?;
    assert_eq!(recovered.inquiry.revision, 3);
    assert_eq!(recovered.messages.items.len(), 3);
    let audits = restarted
        .page::<crate::domain::AuditRecord>(&format!("chapters/{chapter}"), "audit", None, 100)
        .await?;
    assert_eq!(
        audits
            .items
            .iter()
            .filter(|row| row.resource_id == receipt.id && row.action == "inquiry_created")
            .count(),
        1
    );
    assert_eq!(
        audits
            .items
            .iter()
            .filter(|row| row.resource_id == receipt.id && row.action == "inquiry_updated")
            .count(),
        2
    );
    let chapters = restarted.contact_chapters(None, 1).await?;
    assert_eq!(chapters.items.len(), 1);
    Ok(())
}
