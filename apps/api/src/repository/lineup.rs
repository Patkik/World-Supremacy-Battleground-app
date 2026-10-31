use super::*;
use crate::domain::EntryStatus;
use crate::repository::stage::{StageControl, StageEntry};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StageLineup {
    pub stage_id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub revision: u64,
    pub entry_ids: Vec<String>,
    pub reason: String,
    pub updated_by: String,
    pub updated_at: u64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct StageLineupCommand {
    pub operation_id: String,
    pub stage_id: String,
    pub expected_revision: u64,
    pub entry_ids: Vec<String>,
    pub reason: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct LineupReceipt {
    command_hash: String,
    result: StageLineup,
}

impl FirestoreRepository {
    pub async fn stage_lineup_history(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        stage_id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<crate::repository::lineup::StageLineup>> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        self.stage_detail(claims, chapter, event, stage_id).await?;
        self.page::<crate::repository::lineup::StageLineup>(
            &format!(
                "{}/stages/{}",
                event_path(chapter, event)?,
                segment(stage_id)?
            ),
            "lineupRevisions",
            cursor,
            limit,
        )
        .await
    }

    pub async fn stage_lineup(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        stage: &str,
    ) -> Result<Option<StageLineup>> {
        self.stage_detail(claims, chapter, event, stage).await?;
        let value = get::<StageLineup>(
            &self.db,
            &format!(
                "{}/stages/{}/planning/current",
                event_path(chapter, event)?,
                segment(stage)?
            ),
        )
        .await?;
        if value.as_ref().is_some_and(|record| {
            record.chapter_id != chapter || record.event_id != event || record.stage_id != stage
        }) {
            return Err(forbidden());
        }
        Ok(value)
    }

    pub async fn stage_lineup_save(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        mut command: StageLineupCommand,
    ) -> Result<StageLineup> {
        segment(&command.operation_id)?;
        segment(&command.stage_id)?;
        command.reason = command.reason.trim().to_owned();
        if command.reason.is_empty() || command.reason.len() > 500 || command.entry_ids.len() > 200
        {
            return Err(invalid("Provide a reason and at most 200 lineup entries"));
        }
        let mut seen = HashSet::new();
        for id in &command.entry_ids {
            segment(id)?;
            if !seen.insert(id) {
                return Err(invalid("Duplicate lineup entry"));
            }
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
                        let stage_path = format!("{parent}/stages/{}", segment(&command.stage_id)?);
                        let stage: StageControl = required(&db, &stage_path).await?;
                        if !stage.active
                            || stage.stage_id != command.stage_id
                            || stage.chapter_id != chapter
                            || stage.event_id != event
                        {
                            return Err(forbidden());
                        }
                        let receipt_path = format!(
                            "{parent}/stageLineupOperations/{}",
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid lineup command"))?]);
                        if let Some(receipt) = get::<LineupReceipt>(&db, &receipt_path).await? {
                            return if receipt.command_hash == hash {
                                Ok(receipt.result)
                            } else {
                                Err(conflict("Operation ID already used"))
                            };
                        }
                        let path = format!("{stage_path}/planning/current");
                        let previous = get::<StageLineup>(&db, &path).await?;
                        if previous.as_ref().is_some_and(|v| {
                            v.stage_id != command.stage_id
                                || v.chapter_id != chapter
                                || v.event_id != event
                        }) {
                            return Err(forbidden());
                        }
                        let revision = previous.as_ref().map_or(0, |v| v.revision);
                        if revision != command.expected_revision
                            || !stage.held
                            || previous
                                .as_ref()
                                .is_some_and(|v| v.entry_ids == command.entry_ids)
                        {
                            return Err(conflict(
                                "Lineup changed, unchanged order, or stage is not held",
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
                                "Complete active performances before editing the lineup",
                            ));
                        }
                        for id in &command.entry_ids {
                            let entry: EntryDocument =
                                required(&db, &entry_path(&chapter, &event, id)?).await?;
                            if entry.entry.chapter_id != chapter
                                || entry.entry.event_id != event
                                || entry.entry.id != *id
                            {
                                return Err(forbidden());
                            }
                            if entry.entry.status != EntryStatus::Approved {
                                return Err(conflict("Only approved entries can be planned"));
                            }
                        }
                        let result = StageLineup {
                            stage_id: command.stage_id.clone(),
                            chapter_id: chapter.clone(),
                            event_id: event.clone(),
                            revision: revision
                                .checked_add(1)
                                .ok_or_else(|| conflict("Revision overflow"))?,
                            entry_ids: command.entry_ids,
                            reason: command.reason,
                            updated_by: claims.sub.clone(),
                            updated_at: now_secs(),
                        };
                        // Serialize planning with starts, hold changes and lifecycle commands.
                        put(&db, tx, &stage_path, &stage)?;
                        put(&db, tx, &path, &result)?;
                        put(
                            &db,
                            tx,
                            &format!("{stage_path}/lineupRevisions/{:020}", result.revision),
                            &result,
                        )?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &LineupReceipt {
                                command_hash: hash,
                                result: result.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "stage_lineup_draft_saved",
                            &command.stage_id,
                            &key(&["stage-lineup", &event, &claims.sub, &command.operation_id]),
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
