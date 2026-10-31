use super::*;
use crate::domain::{
    DivisionState, EntryStatus, RecordedScore, ScoreReceipt, ScoreReplay, SubmitScoreCommand,
};

async fn score_context(
    db: &FirestoreDb,
    claims: &Claims,
    chapter: &str,
    event: &str,
    division_id: &str,
    crew_id: &str,
) -> Result<(EntryDocument, DivisionDocument)> {
    event_access(db, claims, chapter, event, &["judge", "head_judge"]).await?;
    let division: DivisionDocument =
        required(db, &division_path(chapter, event, division_id)?).await?;
    if division.policy.id != division_id || !division.panel.contains(&claims.sub) {
        return Err(forbidden());
    }
    let index: EntryIndex = required(
        db,
        &format!(
            "{}/entryIndex/{}",
            event_path(chapter, event)?,
            key(&[division_id, crew_id])
        ),
    )
    .await?;
    if index.crew_id != crew_id || index.division_id != division_id {
        return Err(forbidden());
    }
    let entry: EntryDocument = required(db, &entry_path(chapter, event, &index.entry_id)?).await?;
    if entry.entry.chapter_id != chapter
        || entry.entry.event_id != event
        || entry.entry.division_id != division_id
        || entry.entry.crew_id != crew_id
        || entry.entry.status != EntryStatus::Approved
    {
        return Err(forbidden());
    }
    Ok((entry, division))
}

impl FirestoreRepository {
    pub async fn set_deductions(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        command: DeductionUpdate,
    ) -> Result<u64> {
        if command.deductions.len() > 50
            || command.deductions.iter().any(|d| {
                !d.points.is_finite()
                    || !(0.0..=100.0).contains(&d.points)
                    || d.code.trim().is_empty()
                    || d.code.len() > 80
                    || d.reason.trim().is_empty()
                    || d.reason.len() > 500
            })
        {
            return Err(invalid("Invalid technical deduction"));
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
                let DeductionUpdate {
                    division_id: division,
                    crew_id: crew,
                    expected_revision: expected,
                    deductions,
                } = command;
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["head_judge"]).await?;
                        let division_path = division_path(&chapter, &event, &division)?;
                        let state: DivisionDocument = required(&db, &division_path).await?;
                        if state.policy.id != division {
                            return Err(forbidden());
                        }
                        if state.locked {
                            return Err(conflict("Division is locked"));
                        }
                        let index: EntryIndex = get(
                            &db,
                            &format!(
                                "{}/entryIndex/{}",
                                event_path(&chapter, &event)?,
                                key(&[&division, &crew])
                            ),
                        )
                        .await?
                        .ok_or_else(forbidden)?;
                        if index.division_id != division || index.crew_id != crew {
                            return Err(forbidden());
                        }
                        let entry: EntryDocument =
                            required(&db, &entry_path(&chapter, &event, &index.entry_id)?).await?;
                        if entry.entry.chapter_id != chapter
                            || entry.entry.event_id != event
                            || entry.entry.division_id != division
                            || entry.entry.crew_id != crew
                            || entry.entry.status != EntryStatus::Approved
                        {
                            return Err(forbidden());
                        }
                        let path = format!("{division_path}/deductions/{}", key(&[&crew]));
                        let existing = get::<TechnicalDeductions>(&db, &path).await?;
                        let revision = existing.as_ref().map_or(0, |v| v.revision);
                        if expected.checked_add(1) == Some(revision)
                            && existing
                                .as_ref()
                                .is_some_and(|v| v.deductions == deductions)
                        {
                            return Ok(revision);
                        }
                        if expected != revision {
                            return Err(conflict("Deduction revision mismatch"));
                        }
                        let next = revision
                            .checked_add(1)
                            .ok_or_else(|| invalid("Deduction revision overflow"))?;
                        let value = TechnicalDeductions {
                            chapter_id: chapter.clone(),
                            event_id: event.clone(),
                            division_id: division.clone(),
                            crew_id: crew.clone(),
                            revision: next,
                            deductions,
                            updated_at: now_secs(),
                        };
                        put(&db, tx, &path, &value)?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "deductions_updated",
                            &crew,
                            &new_id("audit"),
                        )?;
                        Ok(next)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn score_assignment(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
    ) -> Result<serde_json::Value> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
        );
        self.db.run_transaction(|db, _tx| {
            let (claims, chapter, event, entry_id) = input.clone();
            Box::pin(async move { async {
                // Authorize before reading the private entry; only identifiers leave this method.
                event_access(&db, &claims, &chapter, &event, &["judge", "head_judge"]).await?;
                let document: EntryDocument = required(&db, &entry_path(&chapter, &event, &entry_id)?).await?;
                let (entry, _) = score_context(&db, &claims, &chapter, &event, &document.entry.division_id, &document.entry.crew_id).await?;
                if entry.entry.id != entry_id { return Err(forbidden()); }
                Ok(serde_json::json!({"entry_id":entry.entry.id,"crew_id":entry.entry.crew_id,"division_id":entry.entry.division_id}))
            }.await.map_err(backoff) })
        }).await.map_err(transaction_error)
    }
    pub async fn score_state(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division: &str,
        crew: &str,
    ) -> Result<DivisionState> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            division.to_owned(),
            crew.to_owned(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, division, crew) = input.clone();
                Box::pin(async move {
                    let claims = &claims;
                    let chapter = chapter.as_str();
                    let event = event.as_str();
                    let division = division.as_str();
                    let crew = crew.as_str();
                    async {
                        let (entry, division_doc) =
                            score_context(&db, claims, chapter, event, division, crew).await?;
                        let score: Option<RecordedScore> = get(
                            &db,
                            &format!(
                                "{}/scorecards/{}",
                                entry_path(chapter, event, &entry.entry.id)?,
                                key(&[&claims.sub])
                            ),
                        )
                        .await?;
                        Ok(DivisionState {
                            schema_version: 1,
                            locked: division_doc.locked,
                            revision: score.as_ref().map_or(0, |s| s.revision),
                            criteria: score.map(|s| s.criteria),
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn submit_score(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        command: &SubmitScoreCommand,
    ) -> Result<ScoreReceipt> {
        if command.schema_version != 1
            || command.operation_id.is_empty()
            || command.operation_id.len() > 128
            || !command.criteria.is_valid()
            || !command.deductions.is_empty()
        {
            return Err(invalid(
                "Invalid version, score, operation ID or deduction payload",
            ));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            command.clone(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, command) = input.clone();
                Box::pin(async move {
                    let claims = &claims;
                    let chapter = chapter.as_str();
                    let event = event.as_str();
                    let command = &command;
                    async {
                        let (mut entry, mut division) = score_context(
                            &db,
                            claims,
                            chapter,
                            event,
                            &command.division_id,
                            &command.crew_id,
                        )
                        .await?;
                        let operation_path = format!(
                            "chapters/{}/scoreOperations/{}",
                            segment(chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        if let Some(existing) = get::<ScoreOperation>(&db, &operation_path).await? {
                            if existing.replay.command != *command
                                || existing.replay.chapter_id != chapter
                                || existing.replay.receipt.event_id != event
                                || existing.replay.receipt.judge_uid != claims.sub
                                || existing.entry_id != entry.entry.id
                            {
                                return Err(invalid("Operation ID payload mismatch"));
                            }
                            return Ok(existing.replay.receipt);
                        }
                        if division.locked {
                            return Err(conflict("Division is locked"));
                        }
                        if !readiness(&entry, &division)?.is_ready {
                            return Err(conflict("Entry is no longer ready"));
                        }
                        let entry_doc_path = entry_path(chapter, event, &entry.entry.id)?;
                        let score_path =
                            format!("{entry_doc_path}/scorecards/{}", key(&[&claims.sub]));
                        let previous: Option<RecordedScore> = get(&db, &score_path).await?;
                        let revision = previous.as_ref().map_or(0, |s| s.revision);
                        if previous.as_ref().is_some_and(|s| {
                            s.judge_uid != claims.sub
                                || s.chapter_id != chapter
                                || s.event_id != event
                                || s.crew_id != command.crew_id
                                || s.division_id != command.division_id
                        }) {
                            return Err(forbidden());
                        }
                        if command.expected_revision != revision {
                            return Err(conflict("Score revision mismatch"));
                        }
                        let next_revision = revision
                            .checked_add(1)
                            .ok_or_else(|| invalid("Revision overflow"))?;
                        let receipt = ScoreReceipt {
                            operation_id: command.operation_id.clone(),
                            receipt_id: new_id("receipt"),
                            event_id: event.into(),
                            division_id: command.division_id.clone(),
                            crew_id: command.crew_id.clone(),
                            judge_uid: claims.sub.clone(),
                            score_revision: next_revision,
                            net_score: command.criteria.total(),
                            recorded_at: now_secs(),
                        };
                        let score = RecordedScore {
                            chapter_id: chapter.into(),
                            event_id: event.into(),
                            division_id: command.division_id.clone(),
                            crew_id: command.crew_id.clone(),
                            judge_uid: claims.sub.clone(),
                            revision: next_revision,
                            criteria: command.criteria.clone(),
                        };
                        if previous.is_none() {
                            entry.completed_scorecards = entry
                                .completed_scorecards
                                .checked_add(1)
                                .ok_or_else(|| invalid("Completion counter overflow"))?;
                            division.completed_scorecards = division
                                .completed_scorecards
                                .checked_add(1)
                                .ok_or_else(|| invalid("Completion counter overflow"))?;
                            if entry.completed_scorecards > division.panel.len() as u64 {
                                return Err(conflict(
                                    "Panel completion ledger needs reconciliation",
                                ));
                            }
                        }
                        division.generation += 1;
                        // No reads below this point. These writes commit or fail together.
                        put(&db, tx, &score_path, &score)?;
                        put(&db, tx, &entry_doc_path, &entry)?;
                        put(
                            &db,
                            tx,
                            &division_path(chapter, event, &command.division_id)?,
                            &division,
                        )?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &ScoreOperation {
                                replay: ScoreReplay {
                                    chapter_id: chapter.into(),
                                    command: command.clone(),
                                    receipt: receipt.clone(),
                                },
                                entry_id: entry.entry.id.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            chapter,
                            &claims.sub,
                            "score_submitted",
                            &entry.entry.id,
                            &receipt.receipt_id,
                        )?;
                        Ok(receipt)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn lock_division(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division_id: &str,
    ) -> Result<bool> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            division_id.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, division_id) = input.clone();
                Box::pin(async move {
                    let claims = &claims;
                    let chapter = chapter.as_str();
                    let event = event.as_str();
                    let division_id = division_id.as_str();
                    async {
                        event_access(
                            &db,
                            claims,
                            chapter,
                            event,
                            &["head_judge", "chapter_director"],
                        )
                        .await?;
                        let path = division_path(chapter, event, division_id)?;
                        let mut division: DivisionDocument = required(&db, &path).await?;
                        if division.locked {
                            return Ok(true);
                        }
                        if division.panel.is_empty()
                            || division.panel.len() > 20
                            || division
                                .panel
                                .iter()
                                .collect::<std::collections::HashSet<_>>()
                                .len()
                                != division.panel.len()
                        {
                            return Err(conflict("A valid judge panel must be configured"));
                        }
                        let required_scores = division
                            .approved_entries
                            .checked_mul(division.panel.len() as u64)
                            .ok_or_else(|| invalid("Completion counter overflow"))?;
                        if division.approved_entries == 0
                            || division.unready_entries != 0
                            || division.completed_scorecards != required_scores
                        {
                            return Err(conflict(
                                "Ready entries and complete judge scorecards are required",
                            ));
                        }
                        for uid in &division.panel {
                            let member: Membership = required(
                                &db,
                                &format!(
                                    "chapters/{}/members/{}",
                                    segment(chapter)?,
                                    segment(uid)?
                                ),
                            )
                            .await?;
                            let assignment: Assignment = required(
                                &db,
                                &format!(
                                    "{}/assignments/{}",
                                    event_path(chapter, event)?,
                                    segment(uid)?
                                ),
                            )
                            .await?;
                            if !member.active
                                || member.uid != *uid
                                || member.chapter_id != chapter
                                || !matches!(member.role.as_str(), "judge" | "head_judge")
                                || !assignment.active
                                || assignment.uid != *uid
                                || assignment.event_id != event
                            {
                                return Err(forbidden());
                            }
                        }
                        division.locked = true;
                        division.generation += 1;
                        put(&db, tx, &path, &division)?;
                        audit(
                            &db,
                            tx,
                            chapter,
                            &claims.sub,
                            "division_locked",
                            division_id,
                            &new_id("lock"),
                        )?;
                        Ok(true)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
