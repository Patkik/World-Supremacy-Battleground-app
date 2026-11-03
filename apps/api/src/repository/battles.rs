//! Private durable battle state. No public projection is read or written here.
use super::*;
use crate::domain::BattleMatch;
use crate::repository::models::Page;
use serde::Deserialize;

#[derive(Clone, Serialize, Deserialize)]
struct BattleDocument {
    chapter_id: String,
    panel: Vec<String>,
    #[serde(default)]
    created_by_uid: String,
    #[serde(default)]
    revision: u64,
    record: BattleMatch,
}
#[derive(Serialize)]
pub struct BattleConfiguration {
    pub revision: u64,
    pub panel: Vec<String>,
    pub record: BattleMatch,
}
#[derive(Clone, Deserialize)]
pub struct SaveBattleDraft {
    pub operation_id: String,
    pub expected_revision: u64,
    pub panel: Vec<String>,
    pub category: String,
    pub round: String,
    pub red_corner_name: String,
    pub blue_corner_name: String,
}
#[derive(Serialize, Deserialize)]
struct BattleOperation {
    hash: String,
    response: BattleMatch,
}
#[derive(Clone, Deserialize)]
pub struct ActivateBattle {
    pub operation_id: String,
    pub expected_revision: u64,
}
#[derive(Serialize, Deserialize)]
struct Ballot {
    judge_uid: String,
    corner: String,
    response: BattleMatch,
}

fn path(chapter: &str, event: &str, battle: &str) -> Result<String> {
    Ok(format!(
        "{}/battles/{}",
        event_path(chapter, event)?,
        segment(battle)?
    ))
}
fn validate(value: &BattleDocument, chapter: &str, event: &str, battle: &str) -> Result<()> {
    if value.chapter_id != chapter
        || value.record.event_id != event
        || value.record.match_id != battle
    {
        return Err(forbidden());
    }
    let unique: std::collections::HashSet<_> = value.panel.iter().collect();
    if !matches!(value.panel.len(), 3 | 5) || unique.len() != value.panel.len() {
        return Err(conflict("Invalid battle panel"));
    }
    Ok(())
}
impl FirestoreRepository {
    pub async fn battle_configuration(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        battle: &str,
    ) -> Result<BattleConfiguration> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            battle.to_owned(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, battle) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["chapter_director"]).await?;
                        let value: BattleDocument =
                            required(&db, &path(&chapter, &event, &battle)?).await?;
                        validate(&value, &chapter, &event, &battle)?;
                        Ok(BattleConfiguration {
                            revision: value.revision,
                            panel: value.panel,
                            record: value.record,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn activate_battle(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        battle: &str,
        command: ActivateBattle,
    ) -> Result<BattleMatch> {
        segment(&command.operation_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            battle.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, battle, command) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["chapter_director"]).await?;
                        let battle_path = path(&chapter, &event, &battle)?;
                        let mut value: BattleDocument = required(&db, &battle_path).await?;
                        validate(&value, &chapter, &event, &battle)?;
                        let op_path = format!(
                            "chapters/{}/battleOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let hash = key(&[
                            "activate",
                            &event,
                            &battle,
                            &command.expected_revision.to_string(),
                        ]);
                        if let Some(receipt) = get::<BattleOperation>(&db, &op_path).await? {
                            if receipt.hash != hash {
                                return Err(conflict("Battle operation already used"));
                            }
                            return Ok(receipt.response);
                        }
                        if value.revision != command.expected_revision
                            || value.record.status != "draft"
                            || value.record.votes_red != 0
                            || value.record.votes_blue != 0
                        {
                            return Err(conflict("Battle draft changed or already started"));
                        }
                        let parent = event_path(&chapter, &event)?;
                        for judge in &value.panel {
                            let member: Membership = required(
                                &db,
                                &format!(
                                    "chapters/{}/members/{}",
                                    segment(&chapter)?,
                                    segment(judge)?
                                ),
                            )
                            .await?;
                            let assignment: Assignment =
                                required(&db, &format!("{parent}/assignments/{}", segment(judge)?))
                                    .await?;
                            if member.uid != *judge
                                || member.chapter_id != chapter
                                || member.role != "judge"
                                || !member.active
                                || member.expires_at.is_some_and(|expiry| expiry <= now_secs())
                                || assignment.uid != *judge
                                || assignment.event_id != event
                                || !assignment.active
                            {
                                return Err(forbidden());
                            }
                        }
                        value.record.status = "active".into();
                        value.revision = value
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| invalid("Battle revision overflow"))?;
                        put(&db, tx, &battle_path, &value)?;
                        put(
                            &db,
                            tx,
                            &op_path,
                            &BattleOperation {
                                hash,
                                response: value.record.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "battle_activated",
                            &battle,
                            &key(&["battle-activate", &claims.sub, &command.operation_id]),
                        )?;
                        Ok(value.record)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn save_battle_draft(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        id: &str,
        command: SaveBattleDraft,
    ) -> Result<BattleMatch> {
        segment(&command.operation_id)?;
        segment(id)?;
        let valid_text = |v: &str| !v.trim().is_empty() && v.chars().count() <= 120;
        if !valid_text(&command.category)
            || !valid_text(&command.round)
            || !valid_text(&command.red_corner_name)
            || !valid_text(&command.blue_corner_name)
            || command.red_corner_name == command.blue_corner_name
        {
            return Err(invalid("Invalid battle draft"));
        }
        let unique: std::collections::HashSet<_> = command.panel.iter().collect();
        if !matches!(command.panel.len(), 3 | 5) || unique.len() != command.panel.len() {
            return Err(invalid(
                "Battle panel must contain three or five unique judges",
            ));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            id.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, id, command) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["chapter_director"]).await?;
                        let event_parent = event_path(&chapter, &event)?;
                        for judge in &command.panel {
                            let member: Membership = required(
                                &db,
                                &format!(
                                    "chapters/{}/members/{}",
                                    segment(&chapter)?,
                                    segment(judge)?
                                ),
                            )
                            .await?;
                            if member.uid != *judge
                                || member.chapter_id != chapter
                                || member.role != "judge"
                                || !member.active
                                || member.expires_at.is_some_and(|expiry| expiry <= now_secs())
                            {
                                return Err(forbidden());
                            }
                            let assignment: Assignment = required(
                                &db,
                                &format!("{event_parent}/assignments/{}", segment(judge)?),
                            )
                            .await?;
                            if assignment.uid != *judge
                                || assignment.event_id != event
                                || !assignment.active
                            {
                                return Err(forbidden());
                            }
                        }
                        let hash = key(&[
                            &event,
                            &id,
                            &command.expected_revision.to_string(),
                            &command.category,
                            &command.round,
                            &command.red_corner_name,
                            &command.blue_corner_name,
                            &command.panel.join(","),
                        ]);
                        let operation_path = format!(
                            "chapters/{}/battleOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        if let Some(receipt) = get::<BattleOperation>(&db, &operation_path).await? {
                            if receipt.hash != hash {
                                return Err(conflict("Battle operation already used"));
                            }
                            return Ok(receipt.response);
                        }
                        let record_path = path(&chapter, &event, &id)?;
                        let current: Option<BattleDocument> = get(&db, &record_path).await?;
                        if current.as_ref().is_some_and(|v| {
                            v.chapter_id != chapter
                                || v.record.match_id != id
                                || v.record.event_id != event
                        }) {
                            return Err(forbidden());
                        }
                        if current.as_ref().is_some_and(|v| {
                            v.record.status != "draft"
                                || v.record.votes_red != 0
                                || v.record.votes_blue != 0
                        }) {
                            return Err(conflict("Battle has started and can no longer be edited"));
                        }
                        let revision = current.as_ref().map_or(0, |v| v.revision);
                        if revision != command.expected_revision {
                            return Err(conflict("Battle draft changed"));
                        }
                        let record = BattleMatch {
                            match_id: id.clone(),
                            event_id: event.clone(),
                            category: command.category,
                            round: command.round,
                            red_corner_name: command.red_corner_name,
                            blue_corner_name: command.blue_corner_name,
                            votes_red: 0,
                            votes_blue: 0,
                            winner_corner: None,
                            status: "draft".into(),
                        };
                        let document = BattleDocument {
                            chapter_id: chapter.clone(),
                            panel: command.panel,
                            created_by_uid: current
                                .as_ref()
                                .map(|value| value.created_by_uid.clone())
                                .unwrap_or_else(|| claims.sub.clone()),
                            revision: revision
                                .checked_add(1)
                                .ok_or_else(|| invalid("Battle revision overflow"))?,
                            record: record.clone(),
                        };
                        put(&db, tx, &record_path, &document)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &BattleOperation {
                                hash,
                                response: record.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "battle_draft_saved",
                            &id,
                            &key(&["battle-draft", &claims.sub, &command.operation_id]),
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

    pub async fn battles(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<BattleMatch>> {
        if cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["chapter_director", "head_judge", "judge"],
        )
        .await?;
        let mut page = self
            .page::<BattleDocument>(&event_path(chapter, event)?, "battles", cursor, limit)
            .await?;
        if page
            .items
            .iter()
            .any(|value| validate(value, chapter, event, &value.record.match_id).is_err())
        {
            return Err(forbidden());
        }
        page.items.retain(|value| {
            claims.role.as_deref() != Some("judge") || value.panel.contains(&claims.sub)
        });
        page.items
            .sort_by(|a, b| a.record.match_id.cmp(&b.record.match_id));
        Ok(Page {
            items: page.items.into_iter().map(|value| value.record).collect(),
            next_page: page.next_page,
        })
    }

    pub async fn battle(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        battle: &str,
    ) -> Result<BattleMatch> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            battle.to_owned(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, battle) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["chapter_director", "head_judge", "judge"],
                        )
                        .await?;
                        let value: BattleDocument =
                            required(&db, &path(&chapter, &event, &battle)?).await?;
                        validate(&value, &chapter, &event, &battle)?;
                        if claims.role.as_deref() == Some("judge")
                            && !value.panel.contains(&claims.sub)
                        {
                            return Err(forbidden());
                        }
                        Ok(value.record)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn own_battle_ballot(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        battle: &str,
    ) -> Result<serde_json::Value> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            battle.to_owned(),
        );
        self.db.run_transaction(|db, _tx| {
            let (claims, chapter, event, battle) = input.clone();
            Box::pin(async move {
                async {
                    event_access(&db, &claims, &chapter, &event, &["head_judge", "judge"]).await?;
                    let path = path(&chapter, &event, &battle)?;
                    let value: BattleDocument = required(&db, &path).await?;
                    validate(&value, &chapter, &event, &battle)?;
                    if !value.panel.contains(&claims.sub) { return Err(forbidden()); }
                    let ballot: Option<Ballot> = get(&db, &format!("{path}/ballots/{}", segment(&claims.sub)?)).await?;
                    let corner = if let Some(ballot) = ballot {
                        if ballot.judge_uid != claims.sub || !matches!(ballot.corner.as_str(), "red" | "blue") || ballot.response.event_id != event || ballot.response.match_id != battle { return Err(forbidden()); }
                        Some(ballot.corner)
                    } else { None };
                    Ok(serde_json::json!({"event_id": event, "match_id": battle, "judge_uid": claims.sub, "corner": corner}))
                }.await.map_err(backoff)
            })
        }).await.map_err(transaction_error)
    }

    pub async fn battle_vote(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        battle: &str,
        corner: &str,
    ) -> Result<BattleMatch> {
        if !matches!(corner, "red" | "blue") {
            return Err(invalid("Invalid corner"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            battle.to_owned(),
            corner.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, battle, corner) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(&db, &claims, &chapter, &event, &["head_judge", "judge"])
                            .await?;
                        let path = path(&chapter, &event, &battle)?;
                        let mut value: BattleDocument = required(&db, &path).await?;
                        validate(&value, &chapter, &event, &battle)?;
                        if !value.panel.contains(&claims.sub) {
                            return Err(forbidden());
                        }
                        let ballot_path = format!("{path}/ballots/{}", segment(&claims.sub)?);
                        if let Some(existing) = get::<Ballot>(&db, &ballot_path).await? {
                            if existing.judge_uid != claims.sub || existing.corner != corner {
                                return Err(conflict("Battle ballot already cast"));
                            }
                            return Ok(existing.response);
                        }
                        if !matches!(value.record.status.as_str(), "active" | "live")
                            || value.record.winner_corner.is_some()
                        {
                            return Err(conflict("Battle voting is closed"));
                        }
                        if value
                            .record
                            .votes_red
                            .checked_add(value.record.votes_blue)
                            .is_none_or(|total| total >= value.panel.len())
                        {
                            return Err(conflict("Invalid battle vote count"));
                        }
                        if corner == "red" {
                            value.record.votes_red += 1;
                        } else {
                            value.record.votes_blue += 1;
                        }
                        let majority = value.panel.len() / 2 + 1;
                        if value.record.votes_red >= majority || value.record.votes_blue >= majority
                        {
                            value.record.winner_corner = Some(corner.clone());
                            value.record.status = "closed".into();
                            if !value.created_by_uid.is_empty() {
                                let creator: Option<Membership> = get(
                                    &db,
                                    &format!(
                                        "chapters/{}/members/{}",
                                        segment(&chapter)?,
                                        segment(&value.created_by_uid)?
                                    ),
                                )
                                .await?;
                                if creator.as_ref().is_some_and(|member| {
                                    member.uid == value.created_by_uid
                                        && member.chapter_id == chapter
                                        && member.active
                                        && member
                                            .expires_at
                                            .is_none_or(|expiry| expiry > now_secs())
                                }) {
                                    super::notifications::enqueue(
                                        &db,
                                        tx,
                                        &chapter,
                                        &value.created_by_uid,
                                        key(&["battle-closed", &event, &battle]),
                                        "battle_closed",
                                        "Battle ballot closed",
                                        &format!(
                                            "The assigned judge panel closed {}. The stored outcome is {} corner; this notice does not advance a bracket.",
                                            value.record.match_id,
                                            corner
                                        ),
                                        &super::notifications::destination(&["console", &event, "battles", &battle, "vote"], &[])?,
                                    )
                                    .await?;
                                }
                            }
                        }
                        put(&db, tx, &path, &value)?;
                        put(
                            &db,
                            tx,
                            &ballot_path,
                            &Ballot {
                                judge_uid: claims.sub.clone(),
                                corner,
                                response: value.record.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "battle_ballot_cast",
                            &battle,
                            &key(&["battle-ballot", &event, &battle, &claims.sub]),
                        )?;
                        Ok(value.record)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
