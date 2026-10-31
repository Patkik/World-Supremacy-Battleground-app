use super::*;
use crate::domain::{EntryStatus, StagePosition};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StageControl {
    pub stage_id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub active: bool,
    pub single_performer: bool,
    pub performing_entry: Option<String>,
    #[serde(default)]
    pub held: bool,
    #[serde(default)]
    pub hold_revision: u64,
    #[serde(default)]
    pub history_revision: u64,
    #[serde(default)]
    pub marshal_uids: Vec<String>,
    #[serde(default)]
    pub access_revision: u64,
    #[serde(default)]
    pub config_revision: u64,
}

fn stage_authorized(stage: &StageControl, claims: &Claims) -> bool {
    claims.role.as_deref() == Some("chapter_director") || stage.marshal_uids.contains(&claims.sub)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageHistory {
    pub revision: u64,
    pub actor_uid: String,
    pub entry_id: Option<String>,
    pub position: Option<StagePosition>,
    pub held: bool,
    pub recorded_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StageEntry {
    pub stage_id: String,
    pub entry_id: String,
    pub position: StagePosition,
    pub revision: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageCommand {
    pub operation_id: String,
    pub stage_id: String,
    pub entry_id: String,
    pub expected_revision: u64,
    pub position: StagePosition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageHoldCommand {
    pub operation_id: String,
    pub stage_id: String,
    pub expected_revision: u64,
    pub held: bool,
}

#[derive(Clone, Serialize, Deserialize)]
struct HoldReceipt {
    command_hash: String,
    result: StageControl,
}

#[derive(Clone, Serialize, Deserialize)]
struct StageReceipt {
    command_hash: String,
    result: StageEntry,
}

#[derive(Clone, Serialize, Deserialize)]
struct PerformanceClaim {
    stage_id: String,
    entry_id: String,
    active: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct StageMarshalCommand {
    pub operation_id: String,
    pub stage_id: String,
    pub expected_revision: u64,
    pub marshal_uids: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct StageCreateCommand {
    pub operation_id: String,
    pub stage_id: String,
    pub single_performer: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct StageConfigureCommand {
    pub operation_id: String,
    pub stage_id: String,
    pub expected_revision: u64,
    pub active: bool,
    pub single_performer: bool,
}

impl FirestoreRepository {
    pub async fn stage_configure(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        command: StageConfigureCommand,
    ) -> Result<StageControl> {
        segment(&command.operation_id)?;
        segment(&command.stage_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, command) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["chapter_director"]).await?;
                        let parent = event_path(&chapter, &event)?;
                        let path = format!("{parent}/stages/{}", segment(&command.stage_id)?);
                        let mut stage: StageControl = required(&db, &path).await?;
                        if stage.stage_id != command.stage_id
                            || stage.chapter_id != chapter
                            || stage.event_id != event
                        {
                            return Err(forbidden());
                        }
                        let receipt_path = format!(
                            "{parent}/stageConfigOperations/{}",
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid stage configuration"))?]);
                        if let Some(receipt) = get::<HoldReceipt>(&db, &receipt_path).await? {
                            return if receipt.command_hash == hash {
                                Ok(receipt.result)
                            } else {
                                Err(conflict("Operation ID already used"))
                            };
                        }
                        if stage.config_revision != command.expected_revision
                            || !stage.held
                            || (stage.active == command.active
                                && stage.single_performer == command.single_performer)
                        {
                            return Err(conflict(
                                "Stage configuration changed or stage is not held",
                            ));
                        }
                        let performing: Vec<StageEntry> = db
                            .fluent()
                            .select()
                            .from("stageEntries")
                            .parent(format!("{}/{parent}", db.get_documents_path()))
                            .filter(|q| {
                                q.for_all([
                                    q.field("stage_id").eq(&command.stage_id),
                                    q.field("position").eq("performing"),
                                ])
                            })
                            .limit(1)
                            .obj()
                            .query()
                            .await?;
                        if !performing.is_empty() || stage.performing_entry.is_some() {
                            return Err(conflict(
                                "Complete active performances before changing stage configuration",
                            ));
                        }
                        stage.active = command.active;
                        stage.single_performer = command.single_performer;
                        stage.config_revision = stage
                            .config_revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Revision overflow"))?;
                        put(&db, tx, &path, &stage)?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &HoldReceipt {
                                command_hash: hash,
                                result: stage.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "stage_configured",
                            &command.stage_id,
                            &key(&["stage-config", &event, &claims.sub, &command.operation_id]),
                        )?;
                        Ok(stage)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn stage_create(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        command: StageCreateCommand,
    ) -> Result<StageControl> {
        segment(&command.operation_id)?;
        segment(&command.stage_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, command) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["chapter_director"]).await?;
                        let parent = event_path(&chapter, &event)?;
                        let path = format!("{parent}/stages/{}", segment(&command.stage_id)?);
                        let receipt_path = format!(
                            "{parent}/stageCreateOperations/{}",
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid stage command"))?]);
                        if let Some(receipt) = get::<HoldReceipt>(&db, &receipt_path).await? {
                            return if receipt.command_hash == hash {
                                Ok(receipt.result)
                            } else {
                                Err(conflict("Operation ID already used"))
                            };
                        }
                        if get::<StageControl>(&db, &path).await?.is_some() {
                            return Err(conflict("Stage ID already exists"));
                        }
                        let stage = StageControl {
                            stage_id: command.stage_id.clone(),
                            chapter_id: chapter.clone(),
                            event_id: event.clone(),
                            active: true,
                            single_performer: command.single_performer,
                            performing_entry: None,
                            held: true,
                            hold_revision: 0,
                            history_revision: 0,
                            marshal_uids: vec![],
                            access_revision: 0,
                            config_revision: 0,
                        };
                        put(&db, tx, &path, &stage)?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &HoldReceipt {
                                command_hash: hash,
                                result: stage.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "stage_created",
                            &command.stage_id,
                            &key(&["stage-create", &event, &claims.sub, &command.operation_id]),
                        )?;
                        Ok(stage)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn stage_marshals(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        mut command: StageMarshalCommand,
    ) -> Result<StageControl> {
        segment(&command.operation_id)?;
        segment(&command.stage_id)?;
        if command.marshal_uids.len() > 100 {
            return Err(invalid("Too many stage marshals"));
        }
        for uid in &command.marshal_uids {
            segment(uid)?;
        }
        command.marshal_uids.sort();
        if command
            .marshal_uids
            .windows(2)
            .any(|pair| pair[0] == pair[1])
        {
            return Err(invalid("Duplicate stage marshal"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, command) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["chapter_director"]).await?;
                        let parent = event_path(&chapter, &event)?;
                        let path = format!("{parent}/stages/{}", segment(&command.stage_id)?);
                        let mut stage: StageControl = required(&db, &path).await?;
                        if !stage.active
                            || stage.chapter_id != chapter
                            || stage.event_id != event
                            || stage.stage_id != command.stage_id
                        {
                            return Err(forbidden());
                        }
                        let receipt_path = format!(
                            "{parent}/stageAccessOperations/{}",
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid assignment command"))?]);
                        if let Some(receipt) = get::<HoldReceipt>(&db, &receipt_path).await? {
                            return if receipt.command_hash == hash {
                                Ok(receipt.result)
                            } else {
                                Err(conflict("Operation ID already used"))
                            };
                        }
                        if stage.access_revision != command.expected_revision {
                            return Err(conflict("Stage assignments changed"));
                        }
                        for uid in &command.marshal_uids {
                            let member: Membership =
                                required(&db, &format!("chapters/{chapter}/members/{uid}")).await?;
                            let assignment: Assignment =
                                required(&db, &format!("{parent}/assignments/{uid}")).await?;
                            if !member.active
                                || member.role != "marshal"
                                || member.uid != *uid
                                || member.chapter_id != chapter
                                || !assignment.active
                                || assignment.uid != *uid
                                || assignment.event_id != event
                            {
                                return Err(forbidden());
                            }
                        }
                        stage.marshal_uids = command.marshal_uids;
                        stage.access_revision = stage
                            .access_revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Revision overflow"))?;
                        put(&db, tx, &path, &stage)?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &HoldReceipt {
                                command_hash: hash,
                                result: stage.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "stage_marshals_changed",
                            &command.stage_id,
                            &key(&["stage-access", &event, &claims.sub, &command.operation_id]),
                        )?;
                        Ok(stage)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn stage_history(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        stage_id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<StageHistory>> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        self.stage_detail(claims, chapter, event, stage_id).await?;
        self.page::<StageHistory>(
            &format!(
                "{}/stages/{}",
                event_path(chapter, event)?,
                segment(stage_id)?
            ),
            "history",
            cursor,
            limit,
        )
        .await
    }

    pub async fn stage_detail(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        stage_id: &str,
    ) -> Result<StageControl> {
        event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["marshal", "chapter_director"],
        )
        .await?;
        let stage: StageControl = required(
            &self.db,
            &format!(
                "{}/stages/{}",
                event_path(chapter, event)?,
                segment(stage_id)?
            ),
        )
        .await?;
        if !stage_authorized(&stage, claims)
            || (!stage.active && claims.role.as_deref() != Some("chapter_director"))
            || stage.stage_id != stage_id
            || stage.chapter_id != chapter
            || stage.event_id != event
        {
            return Err(forbidden());
        }
        Ok(stage)
    }

    pub async fn stage_hold(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        command: StageHoldCommand,
    ) -> Result<StageControl> {
        segment(&command.operation_id)?;
        segment(&command.stage_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, command) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["marshal", "chapter_director"],
                        )
                        .await?;
                        let parent = event_path(&chapter, &event)?;
                        let stage_path = format!("{parent}/stages/{}", segment(&command.stage_id)?);
                        let mut stage: StageControl = required(&db, &stage_path).await?;
                        if !stage_authorized(&stage, &claims)
                            || !stage.active
                            || stage.stage_id != command.stage_id
                            || stage.chapter_id != chapter
                            || stage.event_id != event
                        {
                            return Err(forbidden());
                        }
                        let receipt_path = format!(
                            "{parent}/stageHoldOperations/{}",
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid hold command"))?]);
                        if let Some(receipt) = get::<HoldReceipt>(&db, &receipt_path).await? {
                            return if receipt.command_hash == hash {
                                Ok(receipt.result)
                            } else {
                                Err(conflict("Operation ID already used for different input"))
                            };
                        }
                        if stage.hold_revision != command.expected_revision
                            || stage.held == command.held
                        {
                            return Err(conflict("Stage hold changed"));
                        }
                        stage.hold_revision = stage
                            .hold_revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Revision overflow"))?;
                        stage.held = command.held;
                        stage.history_revision = stage
                            .history_revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("History revision overflow"))?;
                        put(
                            &db,
                            tx,
                            &format!("{stage_path}/history/{:020}", stage.history_revision),
                            &StageHistory {
                                revision: stage.history_revision,
                                actor_uid: claims.sub.clone(),
                                entry_id: None,
                                position: None,
                                held: stage.held,
                                recorded_at: now_secs(),
                            },
                        )?;
                        put(&db, tx, &stage_path, &stage)?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &HoldReceipt {
                                command_hash: hash,
                                result: stage.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            if command.held {
                                "stage_hold_set"
                            } else {
                                "stage_hold_released"
                            },
                            &command.stage_id,
                            &key(&["stage-hold", &event, &claims.sub, &command.operation_id]),
                        )?;
                        Ok(stage)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn stage_list(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<StageControl>> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["marshal", "chapter_director"],
        )
        .await?;
        let mut page = self
            .page::<StageControl>(&event_path(chapter, event)?, "stages", cursor, limit)
            .await?;
        if page.items.iter().any(|stage| {
            stage.chapter_id != chapter
                || stage.event_id != event
                || segment(&stage.stage_id).is_err()
        }) {
            return Err(forbidden());
        }
        page.items.retain(|stage| {
            (stage.active || claims.role.as_deref() == Some("chapter_director"))
                && stage_authorized(stage, claims)
        });
        Ok(page)
    }

    pub async fn stage_entry_list(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        stage_id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<StageEntry>> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["marshal", "chapter_director"],
        )
        .await?;
        let parent = event_path(chapter, event)?;
        let stage: StageControl =
            required(&self.db, &format!("{parent}/stages/{}", segment(stage_id)?)).await?;
        if !stage_authorized(&stage, claims)
            || (!stage.active && claims.role.as_deref() != Some("chapter_director"))
            || stage.stage_id != stage_id
            || stage.chapter_id != chapter
            || stage.event_id != event
        {
            return Err(forbidden());
        }
        let mut page = self
            .page::<StageEntry>(&parent, "stageEntries", cursor, limit)
            .await?;
        page.items.retain(|entry| entry.stage_id == stage_id);
        Ok(page)
    }

    pub async fn stage_command(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        command: StageCommand,
    ) -> Result<StageEntry> {
        segment(&command.operation_id)?;
        segment(&command.stage_id)?;
        segment(&command.entry_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, command) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["marshal", "chapter_director"],
                        )
                        .await?;
                        let parent = event_path(&chapter, &event)?;
                        let stage_path = format!("{parent}/stages/{}", segment(&command.stage_id)?);
                        let mut stage: StageControl = required(&db, &stage_path).await?;
                        if !stage_authorized(&stage, &claims)
                            || !stage.active
                            || stage.chapter_id != chapter
                            || stage.event_id != event
                            || stage.stage_id != command.stage_id
                        {
                            return Err(forbidden());
                        }
                        let receipt_path = format!(
                            "{parent}/stageOperations/{}",
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid stage command"))?]);
                        if let Some(receipt) = get::<StageReceipt>(&db, &receipt_path).await? {
                            return if receipt.command_hash == hash {
                                Ok(receipt.result)
                            } else {
                                Err(conflict("Operation ID already used for different input"))
                            };
                        }
                        if stage.held && command.position == StagePosition::Performing {
                            return Err(conflict("Stage is on hold"));
                        }
                        let entry: EntryDocument =
                            required(&db, &entry_path(&chapter, &event, &command.entry_id)?)
                                .await?;
                        if entry.entry.id != command.entry_id
                            || entry.entry.chapter_id != chapter
                            || entry.entry.event_id != event
                        {
                            return Err(forbidden());
                        }
                        if command.position != StagePosition::Completed {
                            if entry.entry.status != EntryStatus::Approved {
                                return Err(conflict("Entry is not approved for stage"));
                            }
                            let division: DivisionDocument = required(
                                &db,
                                &division_path(&chapter, &event, &entry.entry.division_id)?,
                            )
                            .await?;
                            if division.policy.id != entry.entry.division_id
                                || !readiness(&entry, &division)?.is_ready
                            {
                                return Err(conflict("Entry is not ready for stage"));
                            }
                        }
                        if matches!(
                            command.position,
                            StagePosition::Holding | StagePosition::Performing
                        ) {
                            if entry.entry.roster.is_empty() || entry.entry.roster.len() > 100 {
                                return Err(conflict("Entry roster cannot be checked for stage"));
                            }
                            for dancer in &entry.entry.roster {
                                let checkin: crate::domain::CheckInRecord = required(
                                    &db,
                                    &format!("{parent}/checkIns/{}", key(&[&dancer.uid])),
                                )
                                .await
                                .map_err(|error| match error {
                                    RepositoryError::Denied(StatusCode::NOT_FOUND, _) => {
                                        conflict("Every roster dancer must be checked in")
                                    }
                                    other => other,
                                })?;
                                if checkin.chapter_id != chapter
                                    || checkin.event_id != event
                                    || checkin.dancer_uid != dancer.uid
                                {
                                    return Err(forbidden());
                                }
                            }
                        }
                        let entry_state_path = format!(
                            "{parent}/stageEntries/{}",
                            key(&[&command.stage_id, &command.entry_id])
                        );
                        let existing = get::<StageEntry>(&db, &entry_state_path).await?;
                        match existing {
                            None if command.expected_revision == 0
                                && command.position == StagePosition::Holding => {}
                            Some(ref value)
                                if value.stage_id == command.stage_id
                                    && value.entry_id == command.entry_id
                                    && value.revision == command.expected_revision
                                    && value.position.may_advance_to(command.position) => {}
                            _ => return Err(conflict("Stage position or revision changed")),
                        }
                        let claim_path = format!(
                            "{parent}/stagePerformanceClaims/{}",
                            key(&[&command.entry_id])
                        );
                        let claim = if matches!(
                            command.position,
                            StagePosition::Performing | StagePosition::Completed
                        ) {
                            let current = get::<PerformanceClaim>(&db, &claim_path).await?;
                            if command.position == StagePosition::Performing {
                                if current.as_ref().is_some_and(|value| value.active) {
                                    return Err(conflict("Entry is already performing on a stage"));
                                }
                                Some(PerformanceClaim {
                                    stage_id: command.stage_id.clone(),
                                    entry_id: command.entry_id.clone(),
                                    active: true,
                                })
                            } else {
                                let current = current.ok_or_else(|| {
                                    conflict("Entry performance claim is missing")
                                })?;
                                if !current.active
                                    || current.stage_id != command.stage_id
                                    || current.entry_id != command.entry_id
                                {
                                    return Err(conflict("Entry performance claim changed"));
                                }
                                Some(PerformanceClaim {
                                    active: false,
                                    ..current
                                })
                            }
                        } else {
                            None
                        };
                        if command.position == StagePosition::Performing && stage.single_performer {
                            if stage.performing_entry.is_some() {
                                return Err(conflict("Stage already has a performer"));
                            }
                            stage.performing_entry = Some(command.entry_id.clone());
                        }
                        if command.position == StagePosition::Completed && stage.single_performer {
                            if stage.performing_entry.as_deref() != Some(command.entry_id.as_str())
                            {
                                return Err(conflict("Stage performer changed"));
                            }
                            stage.performing_entry = None;
                        }
                        let result = StageEntry {
                            stage_id: command.stage_id.clone(),
                            entry_id: command.entry_id.clone(),
                            position: command.position,
                            revision: command
                                .expected_revision
                                .checked_add(1)
                                .ok_or_else(|| conflict("Revision overflow"))?,
                            updated_at: now_secs(),
                        };
                        stage.history_revision = stage
                            .history_revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("History revision overflow"))?;
                        put(
                            &db,
                            tx,
                            &format!("{stage_path}/history/{:020}", stage.history_revision),
                            &StageHistory {
                                revision: stage.history_revision,
                                actor_uid: claims.sub.clone(),
                                entry_id: Some(command.entry_id.clone()),
                                position: Some(command.position),
                                held: stage.held,
                                recorded_at: result.updated_at,
                            },
                        )?;
                        put(&db, tx, &stage_path, &stage)?;
                        put(&db, tx, &entry_state_path, &result)?;
                        if let Some(claim) = claim {
                            put(&db, tx, &claim_path, &claim)?;
                        }
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &StageReceipt {
                                command_hash: hash,
                                result: result.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "stage_position_changed",
                            &command.entry_id,
                            &key(&["stage", &event, &claims.sub, &command.operation_id]),
                        )?;
                        Ok(result)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
