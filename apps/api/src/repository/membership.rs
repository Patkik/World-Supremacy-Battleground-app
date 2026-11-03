use super::*;
use serde::{Deserialize, Serialize};

const RECENT_AUTH_SECONDS: u64 = 300;
const STAFF_INVITATION_TTL_SECONDS: u64 = 7 * 24 * 60 * 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeMembership {
    pub operation_id: String,
    pub expected_revision: u64,
    pub role: String,
    pub active: bool,
    pub expires_at: Option<u64>,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEventAssignment {
    pub operation_id: String,
    pub expected_revision: u64,
    pub active: bool,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStaffInvitation {
    pub operation_id: String,
    pub target_uid: String,
    pub role: String,
    pub reason: String,
    pub access_expires_at: u64,
    /// 32 random bytes, hex encoded. Only the digest is persisted.
    pub invite_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevokeStaffInvitation {
    pub operation_id: String,
    pub expected_revision: u64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcceptStaffInvitation {
    pub operation_id: String,
    pub invite_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffInvitation {
    pub id: String,
    pub chapter_id: String,
    pub target_uid: String,
    pub role: String,
    pub created_by: String,
    pub created_at: u64,
    /// Time until which the invitation may be accepted.
    pub expires_at: u64,
    /// Time until which the resulting staff membership remains active.
    pub access_expires_at: u64,
    pub active: bool,
    pub revision: u64,
    pub reason: String,
    pub accepted_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffInvitationPage {
    pub items: Vec<StaffInvitation>,
    pub next_page: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StaffInvitationLookup {
    chapter_id: String,
    invitation_id: String,
    target_uid: String,
    active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StaffInvitationReceipt {
    command_hash: String,
    response: StaffInvitation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StaffInvitationAcceptanceReceipt {
    command_hash: String,
    response: MembershipRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventAssignmentPage {
    pub items: Vec<EventStaffAssignment>,
    pub next_page: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MembershipReceipt {
    command_hash: String,
    response: MembershipRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AssignmentReceipt {
    command_hash: String,
    response: EventStaffAssignment,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StaffMembershipAudit {
    id: String,
    correlation_id: String,
    actor_uid: String,
    chapter_id: String,
    action: String,
    resource_id: String,
    reason: String,
    recorded_at: u64,
}

fn assignable_role(role: &str) -> bool {
    matches!(
        role,
        "registrar"
            | "finance"
            | "verifier"
            | "support"
            | "head_judge"
            | "judge"
            | "marshal"
            | "audio_operator"
            | "auditor"
    )
}

fn valid_invite_code(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn staff_role(role: &str) -> bool {
    role == "chapter_director" || assignable_role(role)
}

fn hq_assignable_role(role: &str) -> bool {
    staff_role(role)
}

fn membership_command_hash(uid: &str, command: &ChangeMembership) -> Result<String> {
    Ok(key(&[&serde_json::to_string(&(
        uid,
        &command.expected_revision,
        &command.role,
        &command.active,
        &command.expires_at,
        command.reason.trim(),
    ))
    .map_err(|_| invalid("Invalid membership command"))?]))
}

impl FirestoreRepository {
    /// Enumerates chapter memberships from server records, not Firebase claims.
    /// Chapter documents are paged first; each candidate is then revalidated
    /// against the current membership record and token authentication time.
    pub async fn list_account_chapters(
        &self,
        claims: &Claims,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<ChapterMembershipSummary>> {
        if !(1..=100).contains(&limit) || cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        let chapters = self.page::<Chapter>("", "chapters", cursor, limit).await?;
        let mut items = Vec::new();
        for chapter in chapters.items {
            if segment(&chapter.id).is_err() || chapter.name.trim().is_empty() {
                return Err(forbidden());
            }
            match self.session_membership(claims, &chapter.id).await {
                Ok(member) => items.push(ChapterMembershipSummary {
                    chapter_id: chapter.id,
                    chapter_name: chapter.name,
                    role: member.role,
                }),
                Err(RepositoryError::Denied(status, _))
                    if status == StatusCode::FORBIDDEN || status == StatusCode::NOT_FOUND => {}
                Err(error) => return Err(error),
            }
        }
        Ok(Page {
            items,
            next_page: chapters.next_page,
        })
    }

    pub async fn list_chapter_staff_invitations(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<StaffInvitationPage> {
        segment(chapter)?;
        let actor = membership(&self.db, claims, chapter).await?;
        if actor.role != "chapter_director" {
            return Err(forbidden());
        }
        let chapter_record: Chapter = required(&self.db, &format!("chapters/{chapter}")).await?;
        if chapter_record.id != chapter {
            return Err(forbidden());
        }
        let page = self
            .page::<StaffInvitation>(
                &format!("chapters/{chapter}"),
                "staffInvitations",
                cursor,
                limit,
            )
            .await?;
        if page.items.iter().any(|invite| {
            invite.chapter_id != chapter
                || segment(&invite.id).is_err()
                || segment(&invite.target_uid).is_err()
                || !assignable_role(&invite.role)
        }) {
            return Err(forbidden());
        }
        Ok(StaffInvitationPage {
            items: page.items,
            next_page: page.next_page,
        })
    }

    pub async fn chapter_staff_invitation_create_replay(
        &self,
        claims: &Claims,
        chapter: &str,
        command: &CreateStaffInvitation,
    ) -> Result<Option<StaffInvitation>> {
        segment(chapter)?;
        segment(&command.operation_id)?;
        segment(&command.target_uid)?;
        if claims.sub == command.target_uid
            || !assignable_role(&command.role)
            || command.reason.trim().chars().count() < 8
            || command.reason.trim().chars().count() > 1000
            || command.reason.chars().any(char::is_control)
            || !valid_invite_code(&command.invite_code)
        {
            return Err(invalid("Invalid staff invitation"));
        }
        let invite_id = key(&["staff-invitation-code", &command.invite_code]);
        let input = (claims.clone(), chapter.to_owned(), command.clone());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, command) = input.clone();
                let invite_id = invite_id.clone();
                Box::pin(async move {
                    async {
                        let actor = membership(&db, &claims, &chapter).await?;
                        if actor.role != "chapter_director" {
                            return Err(forbidden());
                        }
                        let receipt_path = format!(
                            "chapters/{}/staffInvitationOperations/{}",
                            segment(&chapter)?,
                            key(&["create", &claims.sub, &command.operation_id])
                        );
                        let command_hash = key(&[
                            &command.target_uid,
                            &command.role,
                            command.reason.trim(),
                            &command.access_expires_at.to_string(),
                            &invite_id,
                        ]);
                        if let Some(receipt) =
                            get::<StaffInvitationReceipt>(&db, &receipt_path).await?
                        {
                            return if receipt.command_hash == command_hash {
                                Ok(Some(receipt.response))
                            } else {
                                Err(conflict("Operation ID already used for different input"))
                            };
                        }
                        let now = now_secs();
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before inviting chapter staff",
                            ));
                        }
                        Ok(None)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn create_chapter_staff_invitation(
        &self,
        claims: &Claims,
        chapter: &str,
        command: CreateStaffInvitation,
    ) -> Result<StaffInvitation> {
        segment(chapter)?;
        segment(&command.operation_id)?;
        segment(&command.target_uid)?;
        if claims.sub == command.target_uid
            || !assignable_role(&command.role)
            || command.reason.trim().chars().count() < 8
            || command.reason.trim().chars().count() > 1000
            || command.reason.chars().any(char::is_control)
            || !valid_invite_code(&command.invite_code)
        {
            return Err(invalid("Invalid staff invitation"));
        }
        let invite_id = key(&["staff-invitation-code", &command.invite_code]);
        let input = (claims.clone(), chapter.to_owned(), command);
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, command) = input.clone();
                let invite_id = invite_id.clone();
                Box::pin(async move {
                    async {
                        let actor = membership(&db, &claims, &chapter).await?;
                        if actor.role != "chapter_director" {
                            return Err(forbidden());
                        }
                        let now = now_secs();
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before inviting chapter staff",
                            ));
                        }
                        if command.access_expires_at <= now {
                            return Err(invalid("Staff access expiry must be in the future"));
                        }
                        let chapter_record: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        if chapter_record.id != chapter {
                            return Err(forbidden());
                        }
                        let invite_path = format!(
                            "chapters/{}/staffInvitations/{}",
                            segment(&chapter)?,
                            segment(&invite_id)?
                        );
                        let lookup_path = format!("staffInviteLookups/{}", segment(&invite_id)?);
                        let receipt_path = format!(
                            "chapters/{}/staffInvitationOperations/{}",
                            segment(&chapter)?,
                            key(&["create", &claims.sub, &command.operation_id])
                        );
                        let command_hash = key(&[
                            &command.target_uid,
                            &command.role,
                            command.reason.trim(),
                            &command.access_expires_at.to_string(),
                            &invite_id,
                        ]);
                        if let Some(receipt) =
                            get::<StaffInvitationReceipt>(&db, &receipt_path).await?
                        {
                            return if receipt.command_hash == command_hash {
                                Ok(receipt.response)
                            } else {
                                Err(conflict("Operation ID already used for different input"))
                            };
                        }
                        if get::<StaffInvitation>(&db, &invite_path).await?.is_some()
                            || get::<StaffInvitationLookup>(&db, &lookup_path)
                                .await?
                                .is_some()
                        {
                            return Err(conflict("Invitation code has already been used"));
                        }
                        let invite = StaffInvitation {
                            id: invite_id.clone(),
                            chapter_id: chapter.clone(),
                            target_uid: command.target_uid.clone(),
                            role: command.role.clone(),
                            created_by: claims.sub.clone(),
                            created_at: now,
                            expires_at: now.saturating_add(STAFF_INVITATION_TTL_SECONDS),
                            access_expires_at: command.access_expires_at,
                            active: true,
                            revision: 1,
                            reason: command.reason.trim().to_owned(),
                            accepted_at: None,
                        };
                        put(&db, tx, &invite_path, &invite)?;
                        put(
                            &db,
                            tx,
                            &lookup_path,
                            &StaffInvitationLookup {
                                chapter_id: chapter.clone(),
                                invitation_id: invite_id.clone(),
                                target_uid: command.target_uid.clone(),
                                active: true,
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &StaffInvitationReceipt {
                                command_hash,
                                response: invite.clone(),
                            },
                        )?;
                        let audit_id = key(&["staff-invited", &claims.sub, &command.operation_id]);
                        audit_with_reason(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "chapter_staff_invited",
                            &command.target_uid,
                            &audit_id,
                            Some(command.reason.trim()),
                        )?;
                        Ok(invite)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn revoke_chapter_staff_invitation(
        &self,
        claims: &Claims,
        chapter: &str,
        invitation_id: &str,
        command: RevokeStaffInvitation,
    ) -> Result<StaffInvitation> {
        segment(chapter)?;
        segment(invitation_id)?;
        segment(&command.operation_id)?;
        if command.reason.trim().chars().count() < 8
            || command.reason.trim().chars().count() > 1000
            || command.reason.chars().any(char::is_control)
        {
            return Err(invalid("Enter a reason of 8–1000 characters"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            invitation_id.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, invitation_id, command) = input.clone();
                Box::pin(async move {
                    async {
                        let actor = membership(&db, &claims, &chapter).await?;
                        if actor.role != "chapter_director" {
                            return Err(forbidden());
                        }
                        let invite_path = format!(
                            "chapters/{}/staffInvitations/{}",
                            segment(&chapter)?,
                            segment(&invitation_id)?
                        );
                        let lookup_path = format!("staffInviteLookups/{invitation_id}");
                        let receipt_path = format!(
                            "chapters/{}/staffInvitationOperations/{}",
                            segment(&chapter)?,
                            key(&["revoke", &claims.sub, &command.operation_id])
                        );
                        let command_hash = key(&[
                            &invitation_id,
                            &command.expected_revision.to_string(),
                            command.reason.trim(),
                        ]);
                        if let Some(receipt) =
                            get::<StaffInvitationReceipt>(&db, &receipt_path).await?
                        {
                            return if receipt.command_hash == command_hash {
                                Ok(receipt.response)
                            } else {
                                Err(conflict("Operation ID already used for different input"))
                            };
                        }
                        let now = now_secs();
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before revoking a staff invitation",
                            ));
                        }
                        let mut invite: StaffInvitation = required(&db, &invite_path).await?;
                        if invite.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        if invite.revision != command.expected_revision {
                            return Err(conflict("Invitation changed; reload before retrying"));
                        }
                        if !invite.active || invite.accepted_at.is_some() {
                            return Err(conflict("Only a pending invitation can be revoked"));
                        }
                        invite.active = false;
                        invite.revision = invite
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Invitation revision is exhausted"))?;
                        let mut lookup: StaffInvitationLookup = required(&db, &lookup_path).await?;
                        if lookup.chapter_id != chapter
                            || lookup.invitation_id != invitation_id
                            || lookup.target_uid != invite.target_uid
                            || !lookup.active
                        {
                            return Err(forbidden());
                        }
                        lookup.active = false;
                        put(&db, tx, &invite_path, &invite)?;
                        put(&db, tx, &lookup_path, &lookup)?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &StaffInvitationReceipt {
                                command_hash,
                                response: invite.clone(),
                            },
                        )?;
                        let audit_id = key(&[
                            "staff-invitation-revoked",
                            &claims.sub,
                            &command.operation_id,
                        ]);
                        audit_with_reason(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "chapter_staff_invitation_revoked",
                            &invite.target_uid,
                            &audit_id,
                            Some(command.reason.trim()),
                        )?;
                        Ok(invite)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn accept_chapter_staff_invitation(
        &self,
        claims: &Claims,
        command: AcceptStaffInvitation,
    ) -> Result<MembershipRecord> {
        segment(&command.operation_id)?;
        if !valid_invite_code(&command.invite_code) {
            return Err(invalid("Invalid staff invitation code"));
        }
        let invite_id = key(&["staff-invitation-code", &command.invite_code]);
        let input = (claims.clone(), command);
        self.db
            .run_transaction(|db, tx| {
                let (claims, command) = input.clone();
                let invite_id = invite_id.clone();
                Box::pin(async move {
                    async {
                        let lookup_path = format!("staffInviteLookups/{invite_id}");
                        let lookup: StaffInvitationLookup = required(&db, &lookup_path).await?;
                        if lookup.target_uid != claims.sub || lookup.invitation_id != invite_id {
                            return Err(forbidden());
                        }
                        let chapter = lookup.chapter_id.clone();
                        let invite_path = format!(
                            "chapters/{}/staffInvitations/{}",
                            segment(&chapter)?,
                            segment(&invite_id)?
                        );
                        let operation_path = format!(
                            "chapters/{}/staffInvitationOperations/{}",
                            segment(&chapter)?,
                            key(&["accept", &claims.sub, &command.operation_id])
                        );
                        let command_hash = key(&[&claims.sub, &invite_id]);
                        if let Some(receipt) =
                            get::<StaffInvitationAcceptanceReceipt>(&db, &operation_path).await?
                        {
                            if receipt.command_hash != command_hash {
                                return Err(conflict(
                                    "Operation ID already used for different input",
                                ));
                            }
                            let current_path =
                                format!("chapters/{chapter}/members/{}", segment(&claims.sub)?);
                            let current: MembershipRecord = required(&db, &current_path).await?;
                            if current != receipt.response
                                || !current.active
                                || current
                                    .expires_at
                                    .is_some_and(|expiry| expiry <= now_secs())
                            {
                                return Err(conflict(
                                    "Chapter access changed after this invitation was accepted",
                                ));
                            }
                            return Ok(receipt.response);
                        }
                        let now = now_secs();
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before accepting a staff invitation",
                            ));
                        }
                        let mut invite: StaffInvitation = required(&db, &invite_path).await?;
                        if !lookup.active
                            || !invite.active
                            || invite.chapter_id != chapter
                            || invite.target_uid != claims.sub
                            || invite.expires_at <= now
                            || invite.access_expires_at <= now
                            || invite.accepted_at.is_some()
                        {
                            return Err(conflict(
                                "This staff invitation is expired, revoked, or already used",
                            ));
                        }
                        let chapter_record: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        if chapter_record.id != chapter {
                            return Err(forbidden());
                        }
                        let member_path =
                            format!("chapters/{chapter}/members/{}", segment(&claims.sub)?);
                        let previous = get::<MembershipRecord>(&db, &member_path).await?;
                        if previous.as_ref().is_some_and(|member| {
                            member.active && member.expires_at.is_none_or(|expiry| expiry > now)
                        }) {
                            return Err(conflict("This account already has active chapter access"));
                        }
                        let revision = previous.as_ref().map_or(0, |member| member.revision);
                        let member = MembershipRecord {
                            uid: claims.sub.clone(),
                            chapter_id: chapter.clone(),
                            role: invite.role.clone(),
                            active: true,
                            valid_after: now,
                            revision: revision
                                .checked_add(1)
                                .ok_or_else(|| conflict("Membership revision is exhausted"))?,
                            expires_at: Some(invite.access_expires_at),
                        };
                        invite.active = false;
                        invite.accepted_at = Some(now);
                        invite.revision = invite
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Invitation revision is exhausted"))?;
                        let mut consumed_lookup = lookup;
                        consumed_lookup.active = false;
                        put(&db, tx, &member_path, &member)?;
                        put(&db, tx, &invite_path, &invite)?;
                        put(&db, tx, &lookup_path, &consumed_lookup)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &StaffInvitationAcceptanceReceipt {
                                command_hash,
                                response: member.clone(),
                            },
                        )?;
                        let audit_id = key(&["staff-invitation-accepted", &claims.sub, &invite_id]);
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "chapter_staff_invitation_accepted",
                            &claims.sub,
                            &audit_id,
                        )?;
                        Ok(member)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    /// Resolves an exact prior chapter-director membership command before any
    /// external Auth preflight is attempted. Replays still recheck current authority.
    pub async fn chapter_staff_change_replay(
        &self,
        claims: &Claims,
        chapter: &str,
        uid: &str,
        command: &ChangeMembership,
    ) -> Result<Option<MembershipRecord>> {
        segment(chapter)?;
        segment(uid)?;
        segment(&command.operation_id)?;
        if claims.sub == uid
            || command.reason.trim().len() < 8
            || command.reason.trim().len() > 1000
            || (command.active && !assignable_role(&command.role))
        {
            return Err(invalid("Invalid chapter staff membership command"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            uid.to_owned(),
            command.clone(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, uid, command) = input.clone();
                Box::pin(async move {
                    async {
                        let actor = membership(&db, &claims, &chapter).await?;
                        if actor.role != "chapter_director" {
                            return Err(forbidden());
                        }
                        let operation_path = format!(
                            "chapters/{}/membershipOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let command_hash = membership_command_hash(&uid, &command)?;
                        if let Some(receipt) =
                            get::<MembershipReceipt>(&db, &operation_path).await?
                        {
                            if receipt.command_hash != command_hash {
                                return Err(conflict(
                                    "Operation ID already used for different input",
                                ));
                            }
                            return Ok(Some(receipt.response));
                        }
                        let now = now_secs();
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before changing staff access",
                            ));
                        }
                        Ok(None)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    /// Same replay lookup for Global HQ grants, under current HQ authority.
    pub async fn hq_staff_change_replay(
        &self,
        claims: &Claims,
        chapter: &str,
        uid: &str,
        command: &ChangeMembership,
    ) -> Result<Option<MembershipRecord>> {
        segment(chapter)?;
        segment(uid)?;
        segment(&command.operation_id)?;
        if claims.sub == uid
            || command.reason.trim().len() < 8
            || command.reason.trim().len() > 1000
            || (command.active && !hq_assignable_role(&command.role))
        {
            return Err(invalid("Invalid HQ staff membership command"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            uid.to_owned(),
            command.clone(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, uid, command) = input.clone();
                Box::pin(async move {
                    async {
                        super::hq::global_membership(&db, &claims).await?;
                        let chapter_record: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        if chapter_record.id != chapter {
                            return Err(forbidden());
                        }
                        let operation_path = format!(
                            "chapters/{}/membershipOperations/hq_{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let command_hash = membership_command_hash(&uid, &command)?;
                        if let Some(receipt) =
                            get::<MembershipReceipt>(&db, &operation_path).await?
                        {
                            if receipt.command_hash != command_hash {
                                return Err(conflict(
                                    "Operation ID already used for different input",
                                ));
                            }
                            return Ok(Some(receipt.response));
                        }
                        let now = now_secs();
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before changing chapter access",
                            ));
                        }
                        Ok(None)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn list_chapter_staff_as_hq(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<MembershipPage> {
        segment(chapter)?;
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        super::hq::global_membership(&self.db, claims).await?;
        let chapter_record: Chapter =
            required(&self.db, &format!("chapters/{}", segment(chapter)?)).await?;
        if chapter_record.id != chapter {
            return Err(forbidden());
        }
        let mut page = self
            .page::<MembershipRecord>(
                &format!("chapters/{}", segment(chapter)?),
                "members",
                cursor,
                limit,
            )
            .await?;
        if page.items.iter().any(|member| {
            member.chapter_id != chapter
                || segment(&member.uid).is_err()
                || !crate::auth::is_chapter_role(&member.role)
        }) {
            return Err(forbidden());
        }
        page.items.retain(|member| staff_role(&member.role));
        Ok(MembershipPage {
            items: page.items,
            next_page: page.next_page,
        })
    }

    pub async fn change_chapter_staff_as_hq(
        &self,
        claims: &Claims,
        chapter: &str,
        uid: &str,
        command: ChangeMembership,
    ) -> Result<MembershipRecord> {
        segment(chapter)?;
        segment(uid)?;
        segment(&command.operation_id)?;
        if claims.sub == uid
            || command.reason.trim().len() < 8
            || command.reason.trim().len() > 1000
        {
            return Err(invalid(
                "A different account and an 8–1000 character reason are required",
            ));
        }
        if command.active && !hq_assignable_role(&command.role) {
            return Err(invalid("This chapter role cannot be granted by HQ"));
        }
        let input = (claims.clone(), chapter.to_owned(), uid.to_owned(), command);
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, uid, command) = input.clone();
                Box::pin(async move {
                    async {
                        super::hq::global_membership(&db, &claims).await?;
                        let now = now_secs();
                        let chapter_record: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        if chapter_record.id != chapter {
                            return Err(forbidden());
                        }
                        let path =
                            format!("chapters/{}/members/{}", segment(&chapter)?, segment(&uid)?);
                        let operation_path = format!(
                            "chapters/{}/membershipOperations/hq_{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let command_hash = membership_command_hash(&uid, &command)?;
                        if let Some(receipt) =
                            get::<MembershipReceipt>(&db, &operation_path).await?
                        {
                            return if receipt.command_hash == command_hash {
                                Ok(receipt.response)
                            } else {
                                Err(conflict("Operation ID already used for different input"))
                            };
                        }
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before changing chapter access",
                            ));
                        }
                        if command.active && command.expires_at.is_none_or(|expiry| expiry <= now) {
                            return Err(invalid("Active chapter access requires a future expiry"));
                        }
                        let previous = get::<MembershipRecord>(&db, &path).await?;
                        let revision = previous.as_ref().map_or(0, |member| member.revision);
                        if revision != command.expected_revision {
                            return Err(conflict(
                                "Staff membership changed; reload before retrying",
                            ));
                        }
                        if !command.active && previous.is_none() {
                            return Err(missing());
                        }
                        if !command.active
                            && previous
                                .as_ref()
                                .is_some_and(|member| member.role != command.role)
                        {
                            return Err(conflict("Reload the current role before revoking access"));
                        }
                        let record = MembershipRecord {
                            uid: uid.clone(),
                            chapter_id: chapter.clone(),
                            role: if command.active {
                                command.role.clone()
                            } else {
                                previous.as_ref().ok_or_else(missing)?.role.clone()
                            },
                            active: command.active,
                            valid_after: now,
                            revision: revision.checked_add(1).ok_or_else(|| {
                                conflict("Staff membership revision is exhausted")
                            })?,
                            expires_at: if command.active {
                                command.expires_at
                            } else {
                                Some(now)
                            },
                        };
                        put(&db, tx, &path, &record)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &MembershipReceipt {
                                command_hash,
                                response: record.clone(),
                            },
                        )?;
                        let audit_id = key(&["hq-membership", &claims.sub, &command.operation_id]);
                        put(
                            &db,
                            tx,
                            &format!("chapters/{}/audit/{}", segment(&chapter)?, audit_id),
                            &StaffMembershipAudit {
                                id: audit_id.clone(),
                                correlation_id: audit_id,
                                actor_uid: claims.sub.clone(),
                                chapter_id: chapter.clone(),
                                action: if command.active {
                                    "hq_chapter_staff_granted"
                                } else {
                                    "hq_chapter_staff_revoked"
                                }
                                .into(),
                                resource_id: uid.clone(),
                                reason: command.reason.trim().to_owned(),
                                recorded_at: now,
                            },
                        )?;
                        Ok(record)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn list_event_staff_assignments(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<EventAssignmentPage> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        let actor = membership(&self.db, claims, chapter).await?;
        if actor.role != "chapter_director" {
            return Err(forbidden());
        }
        let event_record: Event = required(&self.db, &event_path(chapter, event)?).await?;
        if event_record.id != event || event_record.chapter_id != chapter {
            return Err(forbidden());
        }
        let page = self
            .page::<EventStaffAssignment>(
                &event_path(chapter, event)?,
                "assignments",
                cursor,
                limit,
            )
            .await?;
        if page
            .items
            .iter()
            .any(|item| item.event_id != event || segment(&item.uid).is_err())
        {
            return Err(forbidden());
        }
        Ok(EventAssignmentPage {
            items: page.items,
            next_page: page.next_page,
        })
    }

    /// Bounded advisory list; the stage mutation rechecks every selection.
    pub async fn list_eligible_stage_marshals(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<String>> {
        let page = self
            .list_event_staff_assignments(claims, chapter, event, cursor, limit)
            .await?;
        let mut items = Vec::new();
        for assignment in page.items {
            if !assignment.active {
                continue;
            }
            let path = format!(
                "chapters/{}/members/{}",
                segment(chapter)?,
                segment(&assignment.uid)?
            );
            if let Some(member) = get::<MembershipRecord>(&self.db, &path).await? {
                if member.uid == assignment.uid
                    && member.chapter_id == chapter
                    && member.role == "marshal"
                    && member.active
                    && !member.expires_at.is_some_and(|expiry| expiry <= now_secs())
                {
                    items.push(assignment.uid);
                }
            }
        }
        Ok(Page {
            items,
            next_page: page.next_page,
        })
    }

    pub async fn change_event_staff_assignment(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        uid: &str,
        command: ChangeEventAssignment,
    ) -> Result<EventStaffAssignment> {
        segment(chapter)?;
        segment(event)?;
        segment(uid)?;
        segment(&command.operation_id)?;
        if claims.sub == uid
            || command.reason.trim().len() < 8
            || command.reason.trim().len() > 1000
        {
            return Err(invalid(
                "A different account and an 8–1000 character reason are required",
            ));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            uid.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, uid, command) = input.clone();
                Box::pin(async move {
                    async {
                        let actor = membership(&db, &claims, &chapter).await?;
                        if actor.role != "chapter_director" {
                            return Err(forbidden());
                        }
                        let now = now_secs();
                        let parent = event_path(&chapter, &event)?;
                        let event_record: Event = required(&db, &parent).await?;
                        if event_record.id != event || event_record.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        let operation_path = format!(
                            "{parent}/assignmentOperations/{}",
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let command_hash = key(&[&serde_json::to_string(&(
                            &uid,
                            &command.expected_revision,
                            &command.active,
                            command.reason.trim(),
                        ))
                        .map_err(|_| invalid("Invalid assignment command"))?]);
                        if let Some(receipt) =
                            get::<AssignmentReceipt>(&db, &operation_path).await?
                        {
                            return if receipt.command_hash == command_hash {
                                Ok(receipt.response)
                            } else {
                                Err(conflict("Operation ID already used for different input"))
                            };
                        }
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before changing event staff",
                            ));
                        }
                        let path = format!("{parent}/assignments/{}", segment(&uid)?);
                        let previous = get::<EventStaffAssignment>(&db, &path).await?;
                        if command.active {
                            let member: MembershipRecord = required(
                                &db,
                                &format!(
                                    "chapters/{}/members/{}",
                                    segment(&chapter)?,
                                    segment(&uid)?
                                ),
                            )
                            .await?;
                            if member.uid != uid
                                || member.chapter_id != chapter
                                || !member.active
                                || member.expires_at.is_some_and(|expiry| expiry <= now)
                                || !assignable_role(&member.role)
                            {
                                return Err(forbidden());
                            }
                        } else if previous.is_none() {
                            return Err(missing());
                        }
                        let revision = previous.as_ref().map_or(0, |row| row.revision);
                        if revision != command.expected_revision {
                            return Err(conflict(
                                "Event assignment changed; reload before retrying",
                            ));
                        }
                        let row = EventStaffAssignment {
                            uid: uid.clone(),
                            event_id: event.clone(),
                            active: command.active,
                            revision: revision
                                .checked_add(1)
                                .ok_or_else(|| conflict("Assignment revision is exhausted"))?,
                            reason: command.reason.trim().to_owned(),
                            changed_at: now,
                        };
                        let audit_id = key(&["event-staff", &claims.sub, &command.operation_id]);
                        let audit_record = StaffMembershipAudit {
                            id: audit_id.clone(),
                            correlation_id: audit_id.clone(),
                            actor_uid: claims.sub.clone(),
                            chapter_id: chapter.clone(),
                            action: if command.active {
                                "event_staff_assigned"
                            } else {
                                "event_staff_unassigned"
                            }
                            .into(),
                            resource_id: format!("{event}:{uid}"),
                            reason: command.reason.trim().to_owned(),
                            recorded_at: now,
                        };
                        let notice_href = if command.active {
                            super::notifications::destination(
                                &["console"],
                                &[("chapter", &chapter), ("event", &event)],
                            )?
                        } else {
                            "/workspaces".to_owned()
                        };
                        super::notifications::enqueue(
                            &db,
                            tx,
                            &chapter,
                            &uid,
                            key(&[
                                "event-staff-assignment",
                                &event,
                                &uid,
                                &command.operation_id,
                            ]),
                            if command.active {
                                "event_assignment_granted"
                            } else {
                                "event_assignment_revoked"
                            },
                            if command.active {
                                "Event access assigned"
                            } else {
                                "Event access removed"
                            },
                            if command.active {
                                "A chapter director assigned you to an event workspace."
                            } else {
                                "A chapter director removed your event assignment."
                            },
                            &notice_href,
                        )
                        .await?;
                        put(&db, tx, &path, &row)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &AssignmentReceipt {
                                command_hash,
                                response: row.clone(),
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &format!("chapters/{chapter}/audit/{audit_id}"),
                            &audit_record,
                        )?;
                        Ok(row)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn list_chapter_staff(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<MembershipPage> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        let actor = membership(&self.db, claims, chapter).await?;
        if actor.role != "chapter_director" {
            return Err(forbidden());
        }
        let mut page = self
            .page::<MembershipRecord>(
                &format!("chapters/{}", segment(chapter)?),
                "members",
                cursor,
                limit,
            )
            .await?;
        if page.items.iter().any(|member| {
            member.chapter_id != chapter
                || segment(&member.uid).is_err()
                || !crate::auth::is_chapter_role(&member.role)
        }) {
            return Err(forbidden());
        }
        page.items.retain(|member| staff_role(&member.role));
        Ok(MembershipPage {
            items: page.items,
            next_page: page.next_page,
        })
    }

    pub async fn change_chapter_staff(
        &self,
        claims: &Claims,
        chapter: &str,
        uid: &str,
        command: ChangeMembership,
    ) -> Result<MembershipRecord> {
        segment(chapter)?;
        segment(uid)?;
        segment(&command.operation_id)?;
        if claims.sub == uid
            || command.reason.trim().len() < 8
            || command.reason.trim().len() > 1000
        {
            return Err(invalid(
                "A different account and an 8–1000 character reason are required",
            ));
        }
        if command.active && !assignable_role(&command.role) {
            return Err(invalid("This role cannot be granted by a chapter director"));
        }
        let input = (claims.clone(), chapter.to_owned(), uid.to_owned(), command);
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, uid, command) = input.clone();
                Box::pin(async move {
                    async {
                        let actor = membership(&db, &claims, &chapter).await?;
                        if actor.role != "chapter_director" {
                            return Err(forbidden());
                        }
                        let now = now_secs();
                        let operation_path = format!(
                            "chapters/{}/membershipOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let command_hash = membership_command_hash(&uid, &command)?;
                        if let Some(receipt) =
                            get::<MembershipReceipt>(&db, &operation_path).await?
                        {
                            if receipt.command_hash != command_hash {
                                return Err(conflict(
                                    "Operation ID already used for different input",
                                ));
                            }
                            return Ok(receipt.response);
                        }
                        if now.saturating_sub(claims.auth_time) > RECENT_AUTH_SECONDS
                            || claims.auth_time > now.saturating_add(30)
                        {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Sign in again before changing staff access",
                            ));
                        }
                        if command.active && command.expires_at.is_none_or(|expiry| expiry <= now) {
                            return Err(invalid("Active staff access requires a future expiry"));
                        }
                        let path =
                            format!("chapters/{}/members/{}", segment(&chapter)?, segment(&uid)?);
                        let previous = get::<MembershipRecord>(&db, &path).await?;
                        let revision = previous.as_ref().map_or(0, |member| member.revision);
                        if revision != command.expected_revision {
                            return Err(conflict(
                                "Staff membership changed; reload before retrying",
                            ));
                        }
                        if previous
                            .as_ref()
                            .is_some_and(|member| member.role == "chapter_director")
                        {
                            return Err(forbidden());
                        }
                        if !command.active && previous.is_none() {
                            return Err(missing());
                        }
                        if !command.active
                            && previous
                                .as_ref()
                                .is_some_and(|member| member.role != command.role)
                        {
                            return Err(conflict("Reload the current role before revoking access"));
                        }
                        let record = MembershipRecord {
                            uid: uid.clone(),
                            chapter_id: chapter.clone(),
                            role: if command.active {
                                command.role.clone()
                            } else {
                                previous.as_ref().ok_or_else(missing)?.role.clone()
                            },
                            active: command.active,
                            valid_after: now,
                            revision: revision.checked_add(1).ok_or_else(|| {
                                conflict("Staff membership revision is exhausted")
                            })?,
                            expires_at: if command.active {
                                command.expires_at
                            } else {
                                Some(now)
                            },
                        };
                        put(&db, tx, &path, &record)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &MembershipReceipt {
                                command_hash,
                                response: record.clone(),
                            },
                        )?;
                        let audit_id = key(&["membership", &claims.sub, &command.operation_id]);
                        let reason_record = StaffMembershipAudit {
                            id: audit_id.clone(),
                            correlation_id: audit_id.clone(),
                            actor_uid: claims.sub.clone(),
                            chapter_id: chapter.clone(),
                            action: if command.active {
                                "chapter_staff_granted"
                            } else {
                                "chapter_staff_revoked"
                            }
                            .into(),
                            resource_id: uid.clone(),
                            reason: command.reason.trim().to_owned(),
                            recorded_at: now,
                        };
                        put(
                            &db,
                            tx,
                            &format!("chapters/{}/audit/{}", segment(&chapter)?, audit_id),
                            &reason_record,
                        )?;
                        Ok(record)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
