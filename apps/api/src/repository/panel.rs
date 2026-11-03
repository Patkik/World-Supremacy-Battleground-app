use super::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JudgePanelConfiguration {
    pub division_id: String,
    pub revision: u64,
    pub panel: Vec<String>,
    pub locked: bool,
    pub completed_scorecards: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeJudgePanel {
    pub operation_id: String,
    pub expected_revision: u64,
    pub panel: Vec<String>,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PanelState {
    division_id: String,
    revision: u64,
    panel: Vec<String>,
    reason: String,
    changed_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PanelReceipt {
    command_hash: String,
    result: JudgePanelConfiguration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PanelAudit {
    id: String,
    correlation_id: String,
    actor_uid: String,
    chapter_id: String,
    event_id: String,
    division_id: String,
    panel: Vec<String>,
    reason: String,
    recorded_at: u64,
}

impl FirestoreRepository {
    pub async fn judge_panel_configuration(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division_id: &str,
    ) -> Result<JudgePanelConfiguration> {
        segment(chapter)?;
        segment(event)?;
        segment(division_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            division_id.to_owned(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, division_id) = input.clone();
                Box::pin(async move {
                    async {
                        let actor = membership(&db, &claims, &chapter).await?;
                        if actor.role != "chapter_director" {
                            return Err(forbidden());
                        }
                        let event_record: Event =
                            required(&db, &event_path(&chapter, &event)?).await?;
                        if event_record.id != event || event_record.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        let path = division_path(&chapter, &event, &division_id)?;
                        let division: DivisionDocument = required(&db, &path).await?;
                        if division.policy.id != division_id {
                            return Err(forbidden());
                        }
                        let saved =
                            get::<PanelState>(&db, &format!("{path}/panelConfiguration/current"))
                                .await?;
                        if saved
                            .as_ref()
                            .is_some_and(|state| state.division_id != division_id)
                        {
                            return Err(forbidden());
                        }
                        let (revision, panel) = saved
                            .map(|state| (state.revision, state.panel))
                            .unwrap_or((0, division.panel.clone()));
                        if panel != division.panel {
                            return Err(conflict(
                                "Panel configuration is inconsistent; reload from the server",
                            ));
                        }
                        Ok(JudgePanelConfiguration {
                            division_id,
                            revision,
                            panel,
                            locked: division.locked,
                            completed_scorecards: division.completed_scorecards,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn change_judge_panel(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division_id: &str,
        command: ChangeJudgePanel,
    ) -> Result<JudgePanelConfiguration> {
        segment(chapter)?;
        segment(event)?;
        segment(division_id)?;
        segment(&command.operation_id)?;
        if command.panel.is_empty()
            || command.panel.len() > 20
            || command.reason.trim().len() < 8
            || command.reason.trim().len() > 1000
        {
            return Err(invalid(
                "Panel size must be 1–20 and a reason of 8–1000 characters is required",
            ));
        }
        for uid in &command.panel {
            segment(uid)?;
        }
        let mut panel = command.panel.clone();
        panel.sort();
        if panel.windows(2).any(|pair| pair[0] == pair[1]) {
            return Err(invalid("Judge panel contains a duplicate account"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            division_id.to_owned(),
            command,
            panel,
        );
        self.db.run_transaction(|db, tx| {
            let (claims, chapter, event, division_id, command, panel) = input.clone();
            Box::pin(async move {
                async {
                    let actor = membership(&db, &claims, &chapter).await?;
                    if actor.role != "chapter_director" { return Err(forbidden()); }
                    let now = now_secs();
                    let path = division_path(&chapter, &event, &division_id)?;
                    let mut division: DivisionDocument = required(&db, &path).await?;
                    if division.policy.id != division_id { return Err(forbidden()); }
                    let event_record: Event = required(&db, &event_path(&chapter, &event)?).await?;
                    if event_record.id != event || event_record.chapter_id != chapter { return Err(forbidden()); }
                    let receipt_path = format!("{path}/panelOperations/{}", key(&[&claims.sub, &command.operation_id]));
                    let command_hash = key(&[&serde_json::to_string(&(
                        &command.expected_revision, &panel, command.reason.trim()
                    )).map_err(|_| invalid("Invalid judge panel command"))?]);
                    if let Some(receipt) = get::<PanelReceipt>(&db, &receipt_path).await? {
                        return if receipt.command_hash == command_hash { Ok(receipt.result) } else { Err(conflict("Operation ID already used for different input")) };
                    }
                    if now.saturating_sub(claims.auth_time) > 300 || claims.auth_time > now.saturating_add(30) {
                        return Err(deny(StatusCode::UNAUTHORIZED, "Sign in again before changing a judge panel"));
                    }
                    if division.locked || division.completed_scorecards > 0 {
                        return Err(conflict("Judge panel cannot change after scoring starts or the division locks"));
                    }
                    let state_path = format!("{path}/panelConfiguration/current");
                    let saved = get::<PanelState>(&db, &state_path).await?;
                    if saved.as_ref().is_some_and(|state| state.division_id != division_id) {
                        return Err(forbidden());
                    }
                    let (revision, prior_panel) = saved.as_ref().map_or((0, division.panel.clone()), |state| (state.revision, state.panel.clone()));
                    if prior_panel != division.panel { return Err(conflict("Panel configuration is inconsistent")); }
                    if revision != command.expected_revision { return Err(conflict("Judge panel changed; reload before retrying")); }
                    for uid in &panel {
                        let member: MembershipRecord = required(&db, &format!("chapters/{}/members/{}", segment(&chapter)?, segment(uid)?)).await?;
                        let assignment: Assignment = required(&db, &format!("{}/assignments/{}", event_path(&chapter, &event)?, segment(uid)?)).await?;
                        if member.uid != *uid || member.chapter_id != chapter || !member.active
                            || member.expires_at.is_some_and(|expiry| expiry <= now)
                            || !matches!(member.role.as_str(), "judge" | "head_judge")
                            || assignment.uid != *uid || assignment.event_id != event || !assignment.active {
                            return Err(forbidden());
                        }
                    }
                    let next_revision = revision.checked_add(1).ok_or_else(|| conflict("Panel revision is exhausted"))?;
                    division.panel = panel.clone();
                    let result = JudgePanelConfiguration { division_id: division_id.clone(), revision: next_revision, panel: panel.clone(), locked: division.locked, completed_scorecards: division.completed_scorecards };
                    let judge_workspace = super::notifications::destination(&["console", &event, "judge"], &[])?;
                    let mut notices = Vec::new();
                    for uid in panel.iter().filter(|uid| !prior_panel.contains(*uid)) {
                        notices.push(super::notifications::NotificationRequest {
                            recipient_uid: uid.clone(),
                            id: key(&[
                                "judge-panel-assigned",
                                &event,
                                &division_id,
                                uid,
                                &next_revision.to_string(),
                            ]),
                            kind: "judge_panel_assigned".into(),
                            title: "Judge panel assignment added".into(),
                            message: "You were added to this event division's judge panel. Open the judge workspace to view assigned scorecards.".into(),
                            href: judge_workspace.clone(),
                        });
                    }
                    for uid in prior_panel.iter().filter(|uid| !panel.contains(*uid)) {
                        notices.push(super::notifications::NotificationRequest {
                            recipient_uid: uid.clone(),
                            id: key(&[
                                "judge-panel-removed",
                                &event,
                                &division_id,
                                uid,
                                &next_revision.to_string(),
                            ]),
                            kind: "judge_panel_removed".into(),
                            title: "Judge panel assignment removed".into(),
                            message: "You were removed from this event division's judge panel.".into(),
                            href: "/workspaces".into(),
                        });
                    }
                    super::notifications::enqueue_many(&db, tx, &chapter, notices).await?;
                    put(&db, tx, &path, &division)?;
                    put(&db, tx, &state_path, &PanelState {
                        division_id: division_id.clone(), revision: next_revision, panel: panel.clone(),
                        reason: command.reason.trim().to_owned(), changed_at: now,
                    })?;
                    put(&db, tx, &receipt_path, &PanelReceipt { command_hash, result: result.clone() })?;
                    let audit_id = key(&["judge-panel", &claims.sub, &command.operation_id]);
                    put(&db, tx, &format!("chapters/{}/audit/{audit_id}", segment(&chapter)?), &PanelAudit {
                        id: audit_id.clone(), correlation_id: audit_id,
                        actor_uid: claims.sub.clone(), chapter_id: chapter.clone(), event_id: event.clone(),
                        division_id: division_id.clone(), panel, reason: command.reason.trim().to_owned(), recorded_at: now,
                    })?;
                    Ok(result)
                }.await.map_err(backoff)
            })
        }).await.map_err(transaction_error)
    }
}
