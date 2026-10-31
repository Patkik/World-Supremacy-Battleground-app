use super::*;
use crate::domain::{CrewInvitation, CrewMember, Entry, EntryStatus, MemberRole};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RegistrationCommand {
    CreateCrew {
        name: String,
        city: String,
    },
    UpdateCrew {
        crew_id: String,
        name: String,
        city: String,
        expected_revision: u64,
    },
    Invite {
        crew_id: String,
    },
    CreateEntry {
        event_id: String,
        crew_id: String,
        division_id: String,
    },
    Roster {
        event_id: String,
        entry_id: String,
        uids: Vec<String>,
        expected_revision: u64,
    },
    Submit {
        event_id: String,
        entry_id: String,
        expected_revision: u64,
    },
    Review {
        event_id: String,
        entry_id: String,
        status: EntryStatus,
        expected_revision: u64,
    },
}
#[derive(Clone, Serialize, Deserialize)]
struct RegistrationOperation {
    command_hash: String,
    response: Value,
}
#[derive(Clone, Serialize, Deserialize)]
struct InvitationDocument {
    crew_id: String,
    inviter_uid: String,
    issued_at: u64,
    expires_at: u64,
    accepted_by: Option<String>,
    acceptance_hash: Option<String>,
    response: Option<Crew>,
}
fn crew_path(chapter: &str, crew: &str) -> Result<String> {
    Ok(format!(
        "chapters/{}/crews/{}",
        segment(chapter)?,
        segment(crew)?
    ))
}
fn require_role(claims: &Claims, roles: &[&str]) -> Result<()> {
    if roles.iter().any(|r| claims.role.as_deref() == Some(r)) {
        Ok(())
    } else {
        Err(forbidden())
    }
}
fn text(value: &str, maximum: usize, required: bool) -> Result<String> {
    let value = value.trim();
    if value.chars().count() > maximum
        || (required && value.is_empty())
        || value.chars().any(char::is_control)
    {
        return Err(invalid("Invalid registration text"));
    }
    Ok(value.into())
}
fn next_revision(revision: u64) -> Result<u64> {
    revision
        .checked_add(1)
        .ok_or_else(|| conflict("Revision overflow"))
}
async fn manager(db: &FirestoreDb, claims: &Claims, chapter: &str, crew_id: &str) -> Result<Crew> {
    require_role(claims, &["crew_manager"])?;
    let crew: Crew = required(db, &crew_path(chapter, crew_id)?).await?;
    if crew.id != crew_id || crew.chapter_id != chapter || crew.manager_uid != claims.sub {
        return Err(forbidden());
    }
    Ok(crew)
}
async fn registration_event(db: &FirestoreDb, chapter: &str, event: &str) -> Result<Event> {
    let record: Event = required(db, &event_path(chapter, event)?).await?;
    if record.chapter_id != chapter || record.id != event {
        return Err(forbidden());
    }
    Ok(record)
}
fn open(event: &Event) -> Result<()> {
    if event
        .registration_closes_at
        .is_some_and(|deadline| deadline <= now_secs())
    {
        return Err(conflict("Registration deadline passed"));
    }
    if matches!(event.status.as_str(), "active" | "registration_open") {
        Ok(())
    } else {
        Err(conflict("Registration is closed"))
    }
}
async fn authorize(
    db: &FirestoreDb,
    claims: &Claims,
    chapter: &str,
    command: &RegistrationCommand,
) -> Result<()> {
    membership(db, claims, chapter).await?;
    match command {
        RegistrationCommand::CreateCrew { .. } => {
            require_role(claims, &["crew_manager"])?;
            let _: Chapter = required(db, &format!("chapters/{}", segment(chapter)?)).await?;
        }
        RegistrationCommand::UpdateCrew { crew_id, .. }
        | RegistrationCommand::Invite { crew_id } => {
            manager(db, claims, chapter, crew_id).await?;
        }
        RegistrationCommand::CreateEntry {
            event_id, crew_id, ..
        } => {
            manager(db, claims, chapter, crew_id).await?;
            registration_event(db, chapter, event_id).await?;
        }
        RegistrationCommand::Roster {
            event_id, entry_id, ..
        }
        | RegistrationCommand::Submit {
            event_id, entry_id, ..
        } => {
            let entry = entry_access(db, claims, chapter, event_id, entry_id, false).await?;
            manager(db, claims, chapter, &entry.entry.crew_id).await?;
        }
        RegistrationCommand::Review {
            event_id, entry_id, ..
        } => {
            require_role(claims, &["registrar", "chapter_director"])?;
            entry_access(db, claims, chapter, event_id, entry_id, true).await?;
        }
    }
    Ok(())
}

impl FirestoreRepository {
    pub async fn registration_command<T: DeserializeOwned>(
        &self,
        claims: &Claims,
        chapter: &str,
        operation: &str,
        command: RegistrationCommand,
    ) -> Result<T> {
        segment(operation)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            operation.to_owned(),
            command,
        );
        let response = self
            .db
            .run_transaction(|db, tx| {
                let (claims, chapter, operation, command) = input.clone();
                Box::pin(async move {
                    async {
                        authorize(&db, &claims, &chapter, &command).await?;
                        let path = format!(
                            "chapters/{}/registrationOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation])
                        );
                        let hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid command"))?]);
                        if let Some(receipt) = get::<RegistrationOperation>(&db, &path).await? {
                            if receipt.command_hash != hash {
                                return Err(conflict(
                                    "Operation ID was already used for different input",
                                ));
                            }
                            return Ok(receipt.response);
                        }
                        let action = match &command {
                            RegistrationCommand::CreateCrew { .. } => "crew_created",
                            RegistrationCommand::UpdateCrew { .. } => "crew_updated",
                            RegistrationCommand::Invite { .. } => "crew_invitation_issued",
                            RegistrationCommand::CreateEntry { .. } => "entry_created_or_recovered",
                            RegistrationCommand::Roster { .. } => "entry_roster_updated",
                            RegistrationCommand::Submit { .. } => "entry_submitted_for_review",
                            RegistrationCommand::Review { .. } => "entry_reviewed",
                        };
                        let response = apply(&db, tx, &claims, &chapter, command).await?;
                        put(
                            &db,
                            tx,
                            &path,
                            &RegistrationOperation {
                                command_hash: hash,
                                response: response.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            action,
                            response
                                .get("id")
                                .or_else(|| response.get("crew_id"))
                                .and_then(Value::as_str)
                                .unwrap_or(&operation),
                            &key(&["registration", &claims.sub, &operation]),
                        )?;
                        Ok(response)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)?;
        serde_json::from_value(response).map_err(|_| {
            deny(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Stored registration receipt is invalid",
            )
        })
    }

    pub async fn redeem_invitation(
        &self,
        claims: &Claims,
        chapter: &str,
        crew_id: &str,
        token: &str,
        name: &str,
        is_minor: bool,
    ) -> Result<Crew> {
        segment(token)?;
        let name = text(name, 100, true)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            crew_id.to_owned(),
            token.to_owned(),
            name,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, crew_id, token, name) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        require_role(&claims, &["dancer", "crew_manager"])?;
                        let path = format!(
                            "chapters/{}/invitations/{}",
                            segment(&chapter)?,
                            key(&[&token])
                        );
                        let mut invitation: InvitationDocument = required(&db, &path).await?;
                        if invitation.crew_id != crew_id {
                            return Err(forbidden());
                        }
                        let mut crew: Crew = required(&db, &crew_path(&chapter, &crew_id)?).await?;
                        let inviter: Membership = required(
                            &db,
                            &format!(
                                "chapters/{}/members/{}",
                                segment(&chapter)?,
                                segment(&invitation.inviter_uid)?
                            ),
                        )
                        .await?;
                        if crew.id != crew_id
                            || crew.chapter_id != chapter
                            || crew.manager_uid != invitation.inviter_uid
                            || !inviter.active
                            || inviter.role != "crew_manager"
                            || inviter.uid != invitation.inviter_uid
                            || inviter.chapter_id != chapter
                            || inviter.valid_after > invitation.issued_at
                        {
                            return Err(forbidden());
                        }
                        let fingerprint =
                            key(&[&claims.sub, &name, if is_minor { "minor" } else { "adult" }]);
                        if let Some(uid) = &invitation.accepted_by {
                            if uid != &claims.sub
                                || invitation.acceptance_hash.as_deref() != Some(&fingerprint)
                            {
                                return Err(conflict("Invitation already redeemed"));
                            }
                            return invitation
                                .response
                                .ok_or_else(|| conflict("Invitation receipt needs review"));
                        }
                        if invitation.expires_at <= now_secs() {
                            return Err(conflict("Invitation expired"));
                        }
                        if crew.members.len() >= 500
                            || crew.members.iter().any(|m| m.uid == claims.sub)
                        {
                            return Err(conflict(
                                "Membership already exists or crew storage limit reached",
                            ));
                        }
                        crew.members.push(CrewMember {
                            uid: claims.sub.clone(),
                            name,
                            role: MemberRole::Dancer,
                            is_minor,
                            consent_verified: !is_minor,
                        });
                        crew.revision = next_revision(crew.revision)?;
                        invitation.accepted_by = Some(claims.sub.clone());
                        invitation.acceptance_hash = Some(fingerprint);
                        invitation.response = Some(crew.clone());
                        put(&db, tx, &crew_path(&chapter, &crew_id)?, &crew)?;
                        put(&db, tx, &path, &invitation)?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "crew_invitation_redeemed",
                            &crew_id,
                            &key(&["invitation", &token]),
                        )?;
                        Ok(crew)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}

async fn apply(
    db: &FirestoreDb,
    tx: &mut FirestoreTransaction<'_>,
    claims: &Claims,
    chapter: &str,
    command: RegistrationCommand,
) -> Result<Value> {
    match command {
        RegistrationCommand::CreateCrew { name, city } => {
            let crew = Crew {
                revision: 1,
                id: new_id("crew"),
                chapter_id: chapter.into(),
                name: text(&name, 120, true)?,
                city: text(&city, 120, false)?,
                manager_uid: claims.sub.clone(),
                members: vec![],
                created_at: now_secs(),
            };
            put(db, tx, &crew_path(chapter, &crew.id)?, &crew)?;
            Ok(json!(crew))
        }
        RegistrationCommand::UpdateCrew {
            crew_id,
            name,
            city,
            expected_revision,
        } => {
            let mut crew = manager(db, claims, chapter, &crew_id).await?;
            if crew.revision != expected_revision {
                return Err(conflict("Crew changed; reload before editing"));
            }
            crew.name = text(&name, 120, true)?;
            crew.city = text(&city, 120, false)?;
            crew.revision = next_revision(crew.revision)?;
            put(db, tx, &crew_path(chapter, &crew_id)?, &crew)?;
            Ok(json!(crew))
        }
        RegistrationCommand::Invite { crew_id } => {
            let token = new_id("inv");
            let now = now_secs();
            let expires_at = now + 7 * 86400;
            let invitation = InvitationDocument {
                crew_id: crew_id.clone(),
                inviter_uid: claims.sub.clone(),
                issued_at: now,
                expires_at,
                accepted_by: None,
                acceptance_hash: None,
                response: None,
            };
            put(
                db,
                tx,
                &format!(
                    "chapters/{}/invitations/{}",
                    segment(chapter)?,
                    key(&[&token])
                ),
                &invitation,
            )?;
            Ok(json!(CrewInvitation {
                token,
                crew_id,
                chapter_id: chapter.into(),
                inviter_uid: claims.sub.clone(),
                role: MemberRole::Dancer,
                expires_at,
                used: false
            }))
        }
        RegistrationCommand::CreateEntry {
            event_id,
            crew_id,
            division_id,
        } => {
            let path = format!(
                "{}/entryIndex/{}",
                event_path(chapter, &event_id)?,
                key(&[&division_id, &crew_id])
            );
            if let Some(index) = get::<EntryIndex>(db, &path).await? {
                if index.crew_id != crew_id || index.division_id != division_id {
                    return Err(conflict("Entry index mismatch"));
                }
                let existing: EntryDocument =
                    required(db, &entry_path(chapter, &event_id, &index.entry_id)?).await?;
                if existing.entry.chapter_id != chapter
                    || existing.entry.id != index.entry_id
                    || existing.entry.event_id != event_id
                    || existing.entry.crew_id != crew_id
                    || existing.entry.division_id != division_id
                {
                    return Err(forbidden());
                }
                return Ok(json!(existing.entry));
            }
            let event = registration_event(db, chapter, &event_id).await?;
            open(&event)?;
            let mut division: DivisionDocument =
                required(db, &division_path(chapter, &event_id, &division_id)?).await?;
            if division.locked || division.policy.id != division_id {
                return Err(conflict("Division is locked or invalid"));
            }
            let now = now_secs();
            let entry = Entry {
                rules_version: event.rules_version,
                revision: 1,
                id: new_id("entry"),
                chapter_id: chapter.into(),
                event_id: event_id.clone(),
                crew_id: crew_id.clone(),
                division_id: division_id.clone(),
                roster: vec![],
                track_filename: None,
                track_duration_secs: None,
                paid_minor: 0,
                status: EntryStatus::Draft,
                created_at: now,
                updated_at: now,
            };
            division.generation = next_revision(division.generation)?;
            put(
                db,
                tx,
                &entry_path(chapter, &event_id, &entry.id)?,
                &EntryDocument {
                    entry: entry.clone(),
                    pending_minor: 0,
                    completed_scorecards: 0,
                },
            )?;
            put(
                db,
                tx,
                &path,
                &EntryIndex {
                    entry_id: entry.id.clone(),
                    crew_id,
                    division_id: division_id.clone(),
                },
            )?;
            put(
                db,
                tx,
                &division_path(chapter, &event_id, &division_id)?,
                &division,
            )?;
            Ok(json!(entry))
        }
        action => {
            let (event_id, entry_id, expected_revision) = match &action {
                RegistrationCommand::Roster {
                    event_id,
                    entry_id,
                    expected_revision,
                    ..
                }
                | RegistrationCommand::Submit {
                    event_id,
                    entry_id,
                    expected_revision,
                }
                | RegistrationCommand::Review {
                    event_id,
                    entry_id,
                    expected_revision,
                    ..
                } => (event_id, entry_id, *expected_revision),
                _ => unreachable!(),
            };
            let mut document: EntryDocument =
                required(db, &entry_path(chapter, event_id, entry_id)?).await?;
            let mut division: DivisionDocument = required(
                db,
                &division_path(chapter, event_id, &document.entry.division_id)?,
            )
            .await?;
            let event = registration_event(db, chapter, event_id).await?;
            if !document.entry.rules_version.is_empty()
                && document.entry.rules_version != event.rules_version
            {
                return Err(conflict(
                    "Event rules changed; registration requires review",
                ));
            }
            if division.locked || document.entry.revision != expected_revision {
                return Err(conflict("Entry changed or division is locked"));
            }
            let before_ready = readiness(&document, &division)?.is_ready;
            let was_approved = document.entry.status == EntryStatus::Approved;
            match &action {
                RegistrationCommand::Roster { uids, .. } => {
                    open(&event)?;
                    if !matches!(
                        document.entry.status,
                        EntryStatus::Draft | EntryStatus::NeedsCorrection
                    ) || document.entry.paid_minor != 0
                        || document.pending_minor != 0
                        || document.completed_scorecards != 0
                    {
                        return Err(conflict("Roster changes require an unpaid editable entry"));
                    }
                    if uids.len() > 500
                        || uids.iter().collect::<std::collections::HashSet<_>>().len() != uids.len()
                    {
                        return Err(invalid("Invalid roster selection"));
                    }
                    let crew = manager(db, claims, chapter, &document.entry.crew_id).await?;
                    document.entry.roster = uids
                        .iter()
                        .map(|uid| {
                            crew.members
                                .iter()
                                .find(|m| &m.uid == uid)
                                .cloned()
                                .ok_or_else(|| invalid("Selected dancer is not a crew member"))
                        })
                        .collect::<Result<Vec<_>>>()?;
                    document.entry.status = EntryStatus::Draft;
                }
                RegistrationCommand::Submit { .. } => {
                    open(&event)?;
                    if !matches!(
                        document.entry.status,
                        EntryStatus::Draft | EntryStatus::NeedsCorrection | EntryStatus::Submitted
                    ) {
                        return Err(conflict("Entry cannot be submitted in this state"));
                    }
                    document.entry.status = if before_ready {
                        EntryStatus::Submitted
                    } else {
                        EntryStatus::NeedsCorrection
                    };
                }
                RegistrationCommand::Review { status, .. } => {
                    if !matches!(status, EntryStatus::Approved | EntryStatus::NeedsCorrection)
                        || !matches!(
                            document.entry.status,
                            EntryStatus::Submitted
                                | EntryStatus::Approved
                                | EntryStatus::NeedsCorrection
                        )
                    {
                        return Err(conflict("Invalid review transition"));
                    }
                    if document.completed_scorecards != 0 && document.entry.status != *status {
                        return Err(conflict(
                            "Scored entries require a separate correction review",
                        ));
                    }
                    if *status == EntryStatus::Approved
                        && (!before_ready || document.entry.status == EntryStatus::NeedsCorrection)
                    {
                        return Err(conflict("A ready submitted entry is required"));
                    }
                    document.entry.status = status.clone();
                }
                _ => unreachable!(),
            }
            let approved = document.entry.status == EntryStatus::Approved;
            if !was_approved && approved {
                division.approved_entries = next_revision(division.approved_entries)?;
            }
            if was_approved && !approved {
                division.approved_entries = division
                    .approved_entries
                    .checked_sub(1)
                    .ok_or_else(|| conflict("Approval ledger mismatch"))?;
                if !before_ready {
                    division.unready_entries = division
                        .unready_entries
                        .checked_sub(1)
                        .ok_or_else(|| conflict("Readiness ledger mismatch"))?;
                }
            }
            document.entry.revision = next_revision(document.entry.revision)?;
            document.entry.updated_at = now_secs();
            division.generation = next_revision(division.generation)?;
            put(db, tx, &entry_path(chapter, event_id, entry_id)?, &document)?;
            put(
                db,
                tx,
                &division_path(chapter, event_id, &document.entry.division_id)?,
                &division,
            )?;
            Ok(json!(document.entry))
        }
    }
}
