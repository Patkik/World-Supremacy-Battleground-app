use super::*;
use crate::domain::EntryStatus;
use crate::repository::{lineup::StageLineup, stage::StageControl};
use serde::Deserialize;

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct MusicUploadIntent {
    pub intent_id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub entry_id: String,
    pub owner_uid: String,
    pub entry_revision: u64,
    pub storage_path: String,
    pub status: String,
    pub created_at: u64,
    #[serde(default)]
    pub expires_at: u64,
    #[serde(default)]
    pub malware_scan_status: Option<String>,
    #[serde(default)]
    pub review_status: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct DJExportItem {
    pub stage_id: String,
    pub lineup_revision: u64,
    pub order: usize,
    pub division_id: String,
    pub entry_id: String,
    pub crew_name: String,
    pub intent_id: String,
    pub storage_path: String,
    pub sha256: String,
    pub size_bytes: u64,
    pub duration_ms: u64,
    pub format: String,
    pub content_type: String,
    pub export_path: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct DJExportOmittedItem {
    pub stage_id: String,
    pub lineup_revision: u64,
    pub order: usize,
    pub division_id: String,
    pub entry_id: String,
    pub crew_name: String,
    pub status: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct DJExportPlan {
    pub chapter_id: String,
    pub event_id: String,
    pub items: Vec<DJExportItem>,
    pub omitted: Vec<DJExportOmittedItem>,
    pub uncompressed_bytes: u64,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct MusicInspectionReceipt {
    pub intent_id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub entry_id: String,
    pub owner_uid: String,
    pub entry_revision: u64,
    pub sha256: String,
    pub size_bytes: u64,
    #[serde(default = "default_music_format")]
    pub format: String,
    #[serde(default = "default_music_content_type")]
    pub content_type: String,
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub channels: u16,
    #[serde(default)]
    pub bits_per_sample: Option<u16>,
    #[serde(default)]
    pub malware_scan_status: Option<String>,
}

fn default_music_format() -> String {
    "wav".into()
}

fn default_music_content_type() -> String {
    "audio/wav".into()
}

fn safe_export_component(value: &str) -> String {
    let cleaned: String = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .take(48)
        .collect();
    let trimmed = cleaned.trim_matches('_');
    if trimmed.is_empty() {
        "item".into()
    } else {
        trimmed.to_owned()
    }
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct MusicSubmission {
    pub chapter_id: String,
    pub event_id: String,
    pub entry_id: String,
    pub intent_id: String,
    pub owner_uid: String,
    pub entry_revision: u64,
    pub version: u64,
    pub sha256: String,
    pub duration_ms: u64,
    #[serde(default = "default_music_format")]
    pub format: String,
    #[serde(default = "default_music_content_type")]
    pub content_type: String,
    #[serde(default)]
    pub malware_scan_status: Option<String>,
    pub status: String,
    pub submitted_at: u64,
    #[serde(default)]
    pub reviewed_by: Option<String>,
    #[serde(default)]
    pub reviewed_at: Option<u64>,
    #[serde(default)]
    pub review_note: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct MusicQueueItem {
    pub entry_id: String,
    pub version: u64,
    pub duration_ms: u64,
    pub submitted_at: u64,
}

#[derive(Clone, Serialize, Deserialize)]
struct MusicSubmissionOperation {
    command_hash: String,
    response: MusicSubmission,
}

#[cfg(feature = "local-testing")]
#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct DraftMusicPolicy {
    pub chapter_id: String,
    pub event_id: String,
    pub division_id: String,
    pub revision: u64,
    pub rules_version: String,
    pub max_duration_ms: u64,
    pub grace_ms: u64,
    pub source: String,
    pub status: String,
}

#[cfg(feature = "local-testing")]
#[derive(Clone, Serialize, Deserialize)]
struct MusicPolicyOperation {
    command_hash: String,
    response: DraftMusicPolicy,
}

impl FirestoreRepository {
    pub async fn dj_export_plan(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
    ) -> Result<DJExportPlan> {
        event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["audio_operator", "chapter_director"],
        )
        .await?;
        let mut plan = DJExportPlan {
            chapter_id: chapter.to_owned(),
            event_id: event.to_owned(),
            items: Vec::new(),
            omitted: Vec::new(),
            uncompressed_bytes: 0,
        };
        let mut cursor = None;
        let mut stage_pages = 0_usize;
        let mut known_divisions = std::collections::HashSet::new();
        loop {
            let page = self
                .page::<StageControl>(&event_path(chapter, event)?, "stages", cursor, 100)
                .await?;
            stage_pages += 1;
            if stage_pages > 100 {
                return Err(invalid("Event has too many stages to export"));
            }
            for stage in page.items {
                segment(&stage.stage_id)?;
                if stage.stage_id.is_empty()
                    || stage.chapter_id != chapter
                    || stage.event_id != event
                {
                    return Err(forbidden());
                }
                let lineup_path = format!(
                    "{}/stages/{}/planning/current",
                    event_path(chapter, event)?,
                    segment(&stage.stage_id)?
                );
                let Some(lineup) = get::<StageLineup>(&self.db, &lineup_path).await? else {
                    continue;
                };
                if lineup.stage_id != stage.stage_id
                    || lineup.chapter_id != chapter
                    || lineup.event_id != event
                    || lineup.entry_ids.len() > 200
                {
                    return Err(forbidden());
                }

                for (offset, entry_id) in lineup.entry_ids.iter().enumerate() {
                    segment(entry_id)?;
                    let order = offset + 1;
                    let entry: EntryDocument =
                        required(&self.db, &entry_path(chapter, event, entry_id)?).await?;
                    if entry.entry.id != *entry_id
                        || entry.entry.chapter_id != chapter
                        || entry.entry.event_id != event
                    {
                        return Err(forbidden());
                    }
                    segment(&entry.entry.division_id)?;
                    if known_divisions.insert(entry.entry.division_id.clone()) {
                        let division: DivisionDocument = required(
                            &self.db,
                            &division_path(chapter, event, &entry.entry.division_id)?,
                        )
                        .await?;
                        if division.policy.id != entry.entry.division_id {
                            return Err(forbidden());
                        }
                    }
                    let crew: Crew = required(
                        &self.db,
                        &format!(
                            "chapters/{}/crews/{}",
                            segment(chapter)?,
                            segment(&entry.entry.crew_id)?
                        ),
                    )
                    .await?;
                    if crew.id != entry.entry.crew_id || crew.chapter_id != chapter {
                        return Err(forbidden());
                    }
                    let omitted = |status: &str| DJExportOmittedItem {
                        stage_id: stage.stage_id.clone(),
                        lineup_revision: lineup.revision,
                        order,
                        division_id: entry.entry.division_id.clone(),
                        entry_id: entry_id.clone(),
                        crew_name: crew.name.clone(),
                        status: status.to_owned(),
                    };
                    if entry.entry.status != EntryStatus::Approved {
                        plan.omitted.push(omitted("entry_not_approved"));
                        continue;
                    }
                    let submission_path = format!(
                        "chapters/{}/musicSubmissions/{}",
                        segment(chapter)?,
                        key(&[event, entry_id])
                    );
                    let Some(submission) =
                        get::<MusicSubmission>(&self.db, &submission_path).await?
                    else {
                        plan.omitted.push(omitted("no_submission"));
                        continue;
                    };
                    if submission.chapter_id != chapter
                        || submission.event_id != event
                        || submission.entry_id != *entry_id
                    {
                        return Err(forbidden());
                    }
                    if submission.status != "reviewed" {
                        plan.omitted.push(omitted(&submission.status));
                        continue;
                    }
                    if submission.malware_scan_status.as_deref() != Some("clean") {
                        plan.omitted.push(omitted("scan_required"));
                        continue;
                    }
                    let intent: MusicUploadIntent = required(
                        &self.db,
                        &format!(
                            "chapters/{}/musicIntents/{}",
                            segment(chapter)?,
                            segment(&submission.intent_id)?
                        ),
                    )
                    .await?;
                    let receipt: MusicInspectionReceipt = required(
                        &self.db,
                        &format!(
                            "chapters/{}/musicInspections/{}",
                            segment(chapter)?,
                            segment(&submission.intent_id)?
                        ),
                    )
                    .await?;
                    let expected_storage_path = format!(
                        "chapters/{}/music/{}/{}/track",
                        segment(chapter)?,
                        segment(&submission.owner_uid)?,
                        segment(&submission.intent_id)?
                    );
                    if intent.chapter_id != chapter
                        || intent.event_id != event
                        || intent.entry_id != *entry_id
                        || intent.owner_uid != submission.owner_uid
                        || intent.intent_id != submission.intent_id
                        || intent.storage_path != expected_storage_path
                        || intent.review_status.as_deref() != Some("reviewed")
                        || intent.malware_scan_status.as_deref() != Some("clean")
                        || receipt.intent_id != submission.intent_id
                        || receipt.chapter_id != chapter
                        || receipt.event_id != event
                        || receipt.entry_id != *entry_id
                        || receipt.owner_uid != submission.owner_uid
                        || receipt.entry_revision != submission.entry_revision
                        || receipt.sha256 != submission.sha256
                        || receipt.size_bytes == 0
                        || receipt.size_bytes > 25 * 1024 * 1024
                        || receipt.duration_ms != submission.duration_ms
                        || receipt.format != submission.format
                        || receipt.content_type != submission.content_type
                        || receipt.malware_scan_status.as_deref() != Some("clean")
                    {
                        return Err(conflict(
                            "Reviewed music does not match clean inspected media",
                        ));
                    }
                    let extension =
                        match (submission.format.as_str(), submission.content_type.as_str()) {
                            ("wav", "audio/wav") => "wav",
                            ("mp3", "audio/mpeg") => "mp3",
                            _ => return Err(conflict("Unsupported reviewed music format")),
                        };
                    plan.uncompressed_bytes = plan
                        .uncompressed_bytes
                        .checked_add(receipt.size_bytes)
                        .ok_or_else(|| invalid("DJ export size overflow"))?;
                    if plan.items.len() >= 2_000 {
                        return Err(invalid("DJ export exceeds the 2,000 track limit"));
                    }
                    let crew_component = safe_export_component(&crew.name);
                    let stage_component = safe_export_component(&stage.stage_id);
                    let division_component = safe_export_component(&entry.entry.division_id);
                    let entry_component = safe_export_component(entry_id);
                    plan.items.push(DJExportItem {
                        stage_id: stage.stage_id.clone(),
                        lineup_revision: lineup.revision,
                        order,
                        division_id: entry.entry.division_id.clone(),
                        entry_id: entry_id.clone(),
                        crew_name: crew.name.clone(),
                        intent_id: intent.intent_id,
                        storage_path: intent.storage_path,
                        sha256: submission.sha256,
                        size_bytes: receipt.size_bytes,
                        duration_ms: submission.duration_ms,
                        format: submission.format,
                        content_type: submission.content_type,
                        export_path: format!(
                            "{stage_component}/{order:03}_{}_{}_{entry_component}.{extension}",
                            division_component, crew_component
                        ),
                    });
                }
            }
            match page.next_page {
                Some(next) => cursor = Some(next),
                None => break,
            }
        }
        if plan.items.is_empty() && plan.omitted.is_empty() {
            return Err(conflict(
                "No current stage lineup is available for this event",
            ));
        }
        Ok(plan)
    }

    pub async fn music_review_queue(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<MusicQueueItem>> {
        let input = (claims.clone(), chapter.to_owned(), event.to_owned(), cursor);
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, cursor) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["registrar", "chapter_director"],
                        )
                        .await?;
                        let values = super::reads::page::<MusicSubmission>(
                            &db,
                            &format!("chapters/{}", segment(&chapter)?),
                            "musicSubmissions",
                            cursor,
                            limit,
                        )
                        .await?;
                        let items = values
                            .items
                            .into_iter()
                            .filter(|submission| {
                                submission.chapter_id == chapter
                                    && submission.event_id == event
                                    && submission.status == "pending_review"
                                    && submission.malware_scan_status.as_deref() == Some("clean")
                            })
                            .map(|submission| MusicQueueItem {
                                entry_id: submission.entry_id,
                                version: submission.version,
                                duration_ms: submission.duration_ms,
                                submitted_at: submission.submitted_at,
                            })
                            .collect();
                        Ok(Page {
                            items,
                            next_page: values.next_page,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    #[cfg(feature = "local-testing")]
    pub async fn draft_music_advisory(
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
                let staff = matches!(claims.role.as_deref(), Some("registrar" | "chapter_director"));
                if !staff && claims.role.as_deref() != Some("crew_manager") { return Err(forbidden()); }
                let entry = entry_access(&db, &claims, &chapter, &event, &entry_id, staff).await?;
                if !staff {
                    let crew: Crew = required(&db, &format!("chapters/{}/crews/{}", segment(&chapter)?, segment(&entry.entry.crew_id)?)).await?;
                    if crew.id != entry.entry.crew_id || crew.chapter_id != chapter || crew.manager_uid != claims.sub { return Err(forbidden()); }
                }
                let event_record: Event = required(&db, &event_path(&chapter, &event)?).await?;
                if event_record.id != event || event_record.chapter_id != chapter { return Err(forbidden()); }
                let division = &entry.entry.division_id;
                let division_path = division_path(&chapter, &event, division)?;
                let division_record: DivisionDocument = required(&db, &division_path).await?;
                if division_record.policy.id != *division { return Err(forbidden()); }
                let policy = get::<DraftMusicPolicy>(&db, &format!("{division_path}/musicPolicies/current")).await?;
                let submission = get::<MusicSubmission>(&db, &format!("chapters/{}/musicSubmissions/{}", segment(&chapter)?, key(&[&event, &entry_id]))).await?;
                let Some(submission) = submission else { return Ok(serde_json::json!({"state":"no_submission","advisory":true})); };
                if submission.chapter_id != chapter || submission.event_id != event || submission.entry_id != entry_id { return Err(forbidden()); }
                let receipt: MusicInspectionReceipt = required(&db, &format!("chapters/{}/musicInspections/{}", segment(&chapter)?, segment(&submission.intent_id)?)).await?;
                if receipt.chapter_id != chapter || receipt.event_id != event || receipt.entry_id != entry_id || receipt.owner_uid != submission.owner_uid || receipt.intent_id != submission.intent_id || receipt.entry_revision != submission.entry_revision || receipt.sha256 != submission.sha256 || receipt.duration_ms != submission.duration_ms || receipt.format != submission.format || receipt.content_type != submission.content_type { return Err(conflict("Music inspection does not match submission")); }
                let Some(policy) = policy else { return Ok(serde_json::json!({"state":"no_draft_policy","advisory":true,"submission_version":submission.version,"duration_ms":receipt.duration_ms})); };
                if policy.chapter_id != chapter || policy.event_id != event || policy.division_id != *division || policy.status != "draft" || policy.max_duration_ms == 0 || policy.source.trim().is_empty() { return Err(conflict("Invalid draft music policy")); }
                let limit = policy.max_duration_ms.checked_add(policy.grace_ms).filter(|v| *v <= 86_400_000).ok_or_else(|| conflict("Invalid draft music policy"))?;
                let state = if event_record.rules_version.is_empty() || policy.rules_version != event_record.rules_version { "stale_draft" } else if receipt.duration_ms <= limit { "within_draft" } else { "exceeds_draft" };
                Ok(serde_json::json!({"state":state,"advisory":true,"duration_ms":receipt.duration_ms,"max_duration_ms":policy.max_duration_ms,"grace_ms":policy.grace_ms,"policy_revision":policy.revision,"submission_version":submission.version,"rules_version":policy.rules_version}))
            }.await.map_err(backoff) })
        }).await.map_err(transaction_error)
    }
    #[cfg(feature = "local-testing")]
    pub async fn current_draft_music_policy(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division: &str,
    ) -> Result<Option<DraftMusicPolicy>> {
        event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["registrar", "chapter_director"],
        )
        .await?;
        let record: DivisionDocument =
            required(&self.db, &division_path(chapter, event, division)?).await?;
        if record.policy.id != division {
            return Err(forbidden());
        }
        get(
            &self.db,
            &format!(
                "{}/musicPolicies/current",
                division_path(chapter, event, division)?
            ),
        )
        .await
    }

    #[cfg(feature = "local-testing")]
    pub async fn save_draft_music_policy(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division: &str,
        operation: &str,
        expected_revision: u64,
        max_duration_ms: u64,
        grace_ms: u64,
        source: &str,
    ) -> Result<DraftMusicPolicy> {
        segment(operation)?;
        let source = source.trim();
        if source.is_empty()
            || source.chars().count() > 500
            || max_duration_ms == 0
            || max_duration_ms
                .checked_add(grace_ms)
                .is_none_or(|v| v > 86_400_000)
        {
            return Err(invalid("Invalid draft music policy"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            division.to_owned(),
            operation.to_owned(),
            source.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, division, operation, source) = input.clone();
                Box::pin(async move {
                    async {
                        let event_record =
                            event_access(&db, &claims, &chapter, &event, &["chapter_director"])
                                .await?;
                        let hash = key(&[
                            &event,
                            &division,
                            &expected_revision.to_string(),
                            &max_duration_ms.to_string(),
                            &grace_ms.to_string(),
                            &source,
                        ]);
                        let operation_path = format!(
                            "chapters/{}/musicPolicyOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation])
                        );
                        if let Some(existing) =
                            get::<MusicPolicyOperation>(&db, &operation_path).await?
                        {
                            if existing.command_hash != hash {
                                return Err(conflict("Policy operation ID already used"));
                            }
                            return Ok(existing.response);
                        }
                        let division_path = division_path(&chapter, &event, &division)?;
                        let record: DivisionDocument = required(&db, &division_path).await?;
                        if record.policy.id != division {
                            return Err(forbidden());
                        }
                        if record.locked {
                            return Err(conflict("Division is locked"));
                        }
                        let path = format!("{division_path}/musicPolicies/current");
                        let current = get::<DraftMusicPolicy>(&db, &path).await?;
                        if current.as_ref().map_or(0, |value| value.revision) != expected_revision {
                            return Err(conflict("Music policy changed"));
                        }
                        let response = DraftMusicPolicy {
                            chapter_id: chapter.clone(),
                            event_id: event,
                            division_id: division,
                            revision: expected_revision
                                .checked_add(1)
                                .ok_or_else(|| invalid("Policy revision overflow"))?,
                            rules_version: event_record.rules_version,
                            max_duration_ms,
                            grace_ms,
                            source,
                            status: "draft".into(),
                        };
                        put(&db, tx, &path, &response)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &MusicPolicyOperation {
                                command_hash: hash,
                                response: response.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "music_policy_draft_saved",
                            &response.division_id,
                            &key(&["music-policy", &claims.sub, &operation]),
                        )?;
                        Ok(response)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
    #[cfg(feature = "local-testing")]
    pub async fn review_music(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        operation: &str,
        expected_version: u64,
        decision: &str,
        note: &str,
    ) -> Result<MusicSubmission> {
        segment(operation)?;
        if !matches!(decision, "reviewed" | "needs_correction")
            || note.chars().count() > 500
            || (decision == "needs_correction" && note.trim().is_empty())
        {
            return Err(invalid("Invalid music review"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
            operation.to_owned(),
            decision.to_owned(),
            note.trim().to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, entry_id, operation, decision, note) = input.clone();
                Box::pin(async move {
                    async {
                        if !matches!(
                            claims.role.as_deref(),
                            Some("registrar" | "chapter_director")
                        ) {
                            return Err(forbidden());
                        }
                        let entry =
                            entry_access(&db, &claims, &chapter, &event, &entry_id, true).await?;
                        let hash = key(&[
                            &event,
                            &entry_id,
                            &expected_version.to_string(),
                            &decision,
                            &note,
                        ]);
                        let op_path = format!(
                            "chapters/{}/musicReviewOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation])
                        );
                        if let Some(existing) =
                            get::<MusicSubmissionOperation>(&db, &op_path).await?
                        {
                            if existing.command_hash != hash {
                                return Err(conflict("Music review operation already used"));
                            }
                            return Ok(existing.response);
                        }
                        let path = format!(
                            "chapters/{}/musicSubmissions/{}",
                            segment(&chapter)?,
                            key(&[&event, &entry_id])
                        );
                        let mut submission: MusicSubmission = required(&db, &path).await?;
                        if submission.chapter_id != chapter
                            || submission.event_id != event
                            || submission.entry_id != entry_id
                            || submission.version != expected_version
                            || submission.status != "pending_review"
                            || submission.malware_scan_status.as_deref() != Some("clean")
                        {
                            return Err(conflict("Music submission changed"));
                        }
                        submission.version = submission
                            .version
                            .checked_add(1)
                            .ok_or_else(|| invalid("Music version overflow"))?;
                        submission.status = decision.clone();
                        submission.reviewed_by = Some(claims.sub.clone());
                        submission.reviewed_at = Some(now_secs());
                        submission.review_note = if note.is_empty() { None } else { Some(note) };
                        let mut intent: MusicUploadIntent = required(
                            &db,
                            &format!(
                                "chapters/{}/musicIntents/{}",
                                segment(&chapter)?,
                                segment(&submission.intent_id)?
                            ),
                        )
                        .await?;
                        if intent.chapter_id != chapter
                            || intent.event_id != event
                            || intent.entry_id != entry_id
                            || intent.owner_uid != submission.owner_uid
                            || intent.intent_id != submission.intent_id
                        {
                            return Err(forbidden());
                        }
                        let crew: Crew = required(
                            &db,
                            &format!(
                                "chapters/{}/crews/{}",
                                segment(&chapter)?,
                                segment(&entry.entry.crew_id)?
                            ),
                        )
                        .await?;
                        if crew.chapter_id != chapter
                            || crew.id != entry.entry.crew_id
                            || crew.manager_uid.is_empty()
                        {
                            return Err(forbidden());
                        }
                        intent.review_status = Some(decision.to_owned());
                        let (title, message, kind) = if decision == "reviewed" {
                            (
                                "Music review recorded",
                                "The submitted track received a manual review outcome. This does not establish event compliance or change entry readiness.",
                                "music_review_recorded",
                            )
                        } else {
                            (
                                "Music correction requested",
                                "The submitted track needs an update. Open the entry workspace to read the reviewer note. This does not change entry readiness.",
                                "music_correction_requested",
                            )
                        };
                        super::notifications::enqueue(
                            &db,
                            tx,
                            &chapter,
                            &crew.manager_uid,
                            key(&[
                                "music-review",
                                &entry_id,
                                &submission.version.to_string(),
                            ]),
                            kind,
                            title,
                            message,
                            &super::notifications::destination(&["app", "entries", &entry_id, "music"], &[("event", &event)])?,
                        )
                        .await?;
                        put(
                            &db,
                            tx,
                            &format!(
                                "chapters/{}/musicIntents/{}",
                                segment(&chapter)?,
                                segment(&intent.intent_id)?
                            ),
                            &intent,
                        )?;
                        put(&db, tx, &path, &submission)?;
                        put(
                            &db,
                            tx,
                            &op_path,
                            &MusicSubmissionOperation {
                                command_hash: hash,
                                response: submission.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "music_review_recorded",
                            &submission.intent_id,
                            &key(&["music-review", &claims.sub, &operation]),
                        )?;
                        Ok(submission)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    #[cfg(feature = "local-testing")]
    pub async fn music_for_review(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
    ) -> Result<(MusicSubmission, MusicUploadIntent)> {
        let audio_operator = claims.role.as_deref() == Some("audio_operator");
        event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["registrar", "chapter_director", "audio_operator"],
        )
        .await?;
        let entry: EntryDocument =
            required(&self.db, &entry_path(chapter, event, entry_id)?).await?;
        if entry.entry.id != entry_id
            || entry.entry.chapter_id != chapter
            || entry.entry.event_id != event
        {
            return Err(forbidden());
        }
        let submission: MusicSubmission = get(
            &self.db,
            &format!(
                "chapters/{}/musicSubmissions/{}",
                segment(chapter)?,
                key(&[event, entry_id])
            ),
        )
        .await?
        .ok_or_else(|| {
            RepositoryError::Denied(StatusCode::NOT_FOUND, "No music submission".into())
        })?;
        if submission.malware_scan_status.as_deref() != Some("clean") {
            return Err(conflict("Music submission has no clean scan receipt"));
        }
        if audio_operator && submission.status != "reviewed" {
            return Err(forbidden());
        }
        let intent: MusicUploadIntent = required(
            &self.db,
            &format!(
                "chapters/{}/musicIntents/{}",
                segment(chapter)?,
                segment(&submission.intent_id)?
            ),
        )
        .await?;
        let receipt: MusicInspectionReceipt = required(
            &self.db,
            &format!(
                "chapters/{}/musicInspections/{}",
                segment(chapter)?,
                segment(&submission.intent_id)?
            ),
        )
        .await?;
        let path = format!(
            "chapters/{}/music/{}/{}/track",
            segment(chapter)?,
            segment(&submission.owner_uid)?,
            segment(&submission.intent_id)?
        );
        if submission.chapter_id != chapter
            || submission.event_id != event
            || submission.entry_id != entry_id
            || intent.intent_id != submission.intent_id
            || intent.chapter_id != chapter
            || intent.event_id != event
            || intent.entry_id != entry_id
            || intent.owner_uid != submission.owner_uid
            || intent.storage_path != path
            || receipt.intent_id != submission.intent_id
            || receipt.chapter_id != chapter
            || receipt.event_id != event
            || receipt.entry_id != entry_id
            || receipt.owner_uid != submission.owner_uid
            || receipt.sha256 != submission.sha256
            || receipt.malware_scan_status.as_deref() != Some("clean")
            || receipt.format != submission.format
            || receipt.content_type != submission.content_type
        {
            return Err(conflict(
                "Music submission does not match its inspected object",
            ));
        }
        Ok((submission, intent))
    }

    pub async fn current_music_submission(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
    ) -> Result<Option<MusicSubmission>> {
        membership(&self.db, claims, chapter).await?;
        let staff = matches!(
            claims.role.as_deref(),
            Some("registrar" | "chapter_director")
        );
        if !staff && claims.role.as_deref() != Some("crew_manager") {
            return Err(forbidden());
        }
        let entry = entry_access(&self.db, claims, chapter, event, entry_id, staff).await?;
        if !staff {
            let crew: Crew = required(
                &self.db,
                &format!(
                    "chapters/{}/crews/{}",
                    segment(chapter)?,
                    segment(&entry.entry.crew_id)?
                ),
            )
            .await?;
            if crew.chapter_id != chapter
                || crew.id != entry.entry.crew_id
                || crew.manager_uid != claims.sub
            {
                return Err(forbidden());
            }
        }
        let submission: Option<MusicSubmission> = get(
            &self.db,
            &format!(
                "chapters/{}/musicSubmissions/{}",
                segment(chapter)?,
                key(&[event, entry_id])
            ),
        )
        .await?;
        Ok(submission.filter(|value| value.malware_scan_status.as_deref() == Some("clean")))
    }

    pub async fn submit_music(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        intent_id: &str,
        operation_id: &str,
        expected_revision: u64,
        expected_version: u64,
        inspected_digest: &str,
    ) -> Result<MusicSubmission> {
        segment(operation_id)?;
        segment(intent_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
            intent_id.to_owned(),
            operation_id.to_owned(),
            inspected_digest.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, entry_id, intent_id, operation_id, inspected_digest) =
                    input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("crew_manager") {
                            return Err(forbidden());
                        }
                        let entry =
                            entry_access(&db, &claims, &chapter, &event, &entry_id, false).await?;
                        let crew: Crew = required(
                            &db,
                            &format!(
                                "chapters/{}/crews/{}",
                                segment(&chapter)?,
                                segment(&entry.entry.crew_id)?
                            ),
                        )
                        .await?;
                        if crew.chapter_id != chapter
                            || crew.id != entry.entry.crew_id
                            || crew.manager_uid != claims.sub
                        {
                            return Err(forbidden());
                        }
                        let command_hash = key(&[
                            &event,
                            &entry_id,
                            &intent_id,
                            &expected_revision.to_string(),
                            &expected_version.to_string(),
                        ]);
                        let operation_path = format!(
                            "chapters/{}/musicSubmissionOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation_id])
                        );
                        if let Some(existing) =
                            get::<MusicSubmissionOperation>(&db, &operation_path).await?
                        {
                            if existing.command_hash != command_hash {
                                return Err(conflict(
                                    "Music operation ID already used for different input",
                                ));
                            }
                            return Ok(existing.response);
                        }
                        if entry.entry.revision != expected_revision
                            || !matches!(
                                entry.entry.status,
                                EntryStatus::Draft | EntryStatus::NeedsCorrection
                            )
                        {
                            return Err(conflict("Entry changed or is not editable"));
                        }
                        let mut intent: MusicUploadIntent = required(
                            &db,
                            &format!(
                                "chapters/{}/musicIntents/{}",
                                segment(&chapter)?,
                                segment(&intent_id)?
                            ),
                        )
                        .await?;
                        let receipt: MusicInspectionReceipt = required(
                            &db,
                            &format!(
                                "chapters/{}/musicInspections/{}",
                                segment(&chapter)?,
                                segment(&intent_id)?
                            ),
                        )
                        .await?;
                        if intent.chapter_id != chapter
                            || intent.event_id != event
                            || intent.entry_id != entry_id
                            || intent.owner_uid != claims.sub
                            || intent.intent_id != intent_id
                            || intent.entry_revision != expected_revision
                            || intent.status != "awaiting_upload"
                            || receipt.chapter_id != chapter
                            || receipt.event_id != event
                            || receipt.entry_id != entry_id
                            || receipt.owner_uid != claims.sub
                            || receipt.intent_id != intent_id
                            || receipt.entry_revision != expected_revision
                            || receipt.sha256 != inspected_digest
                            || receipt.malware_scan_status.as_deref() != Some("clean")
                            || !matches!(
                                (receipt.format.as_str(), receipt.content_type.as_str()),
                                ("wav", "audio/wav") | ("mp3", "audio/mpeg")
                            )
                        {
                            return Err(conflict("Inspected music no longer matches the entry"));
                        }
                        intent.status = "submitted".into();
                        intent.malware_scan_status = Some("clean".into());
                        let path = format!(
                            "chapters/{}/musicSubmissions/{}",
                            segment(&chapter)?,
                            key(&[&event, &entry_id])
                        );
                        let current = get::<MusicSubmission>(&db, &path).await?;
                        if current.as_ref().map_or(0, |s| s.version) != expected_version {
                            return Err(conflict("Music submission changed"));
                        }
                        let response = MusicSubmission {
                            chapter_id: chapter.clone(),
                            event_id: event,
                            entry_id,
                            intent_id: intent_id.clone(),
                            owner_uid: claims.sub.clone(),
                            entry_revision: expected_revision,
                            version: expected_version
                                .checked_add(1)
                                .ok_or_else(|| invalid("Music version overflow"))?,
                            sha256: receipt.sha256,
                            duration_ms: receipt.duration_ms,
                            format: receipt.format,
                            content_type: receipt.content_type,
                            malware_scan_status: receipt.malware_scan_status,
                            status: "pending_review".into(),
                            submitted_at: now_secs(),
                            reviewed_by: None,
                            reviewed_at: None,
                            review_note: None,
                        };
                        put(&db, tx, &path, &response)?;
                        put(
                            &db,
                            tx,
                            &format!(
                                "chapters/{}/musicIntents/{}",
                                segment(&chapter)?,
                                segment(&intent_id)?
                            ),
                            &intent,
                        )?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &MusicSubmissionOperation {
                                command_hash,
                                response: response.clone(),
                            },
                        )?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "music_submitted_for_review",
                            &response.intent_id,
                            &key(&["music-submission", &claims.sub, &operation_id]),
                        )?;
                        Ok(response)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn music_intent_for_inspection(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        intent_id: &str,
    ) -> Result<MusicUploadIntent> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
            intent_id.to_owned(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, entry_id, intent_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("crew_manager") {
                            return Err(forbidden());
                        }
                        let entry =
                            entry_access(&db, &claims, &chapter, &event, &entry_id, false).await?;
                        let crew: Crew = required(
                            &db,
                            &format!(
                                "chapters/{}/crews/{}",
                                segment(&chapter)?,
                                segment(&entry.entry.crew_id)?
                            ),
                        )
                        .await?;
                        if crew.chapter_id != chapter
                            || crew.id != entry.entry.crew_id
                            || crew.manager_uid != claims.sub
                        {
                            return Err(forbidden());
                        }
                        let intent: MusicUploadIntent = required(
                            &db,
                            &format!(
                                "chapters/{}/musicIntents/{}",
                                segment(&chapter)?,
                                segment(&intent_id)?
                            ),
                        )
                        .await?;
                        let expected_path = format!(
                            "chapters/{}/music/{}/{}/track",
                            segment(&chapter)?,
                            segment(&claims.sub)?,
                            segment(&intent_id)?
                        );
                        if intent.intent_id != intent_id
                            || intent.chapter_id != chapter
                            || intent.event_id != event
                            || intent.entry_id != entry_id
                            || intent.owner_uid != claims.sub
                            || intent.storage_path != expected_path
                        {
                            return Err(forbidden());
                        }
                        if intent.status != "awaiting_upload"
                            || entry.entry.revision != intent.entry_revision
                            || !matches!(
                                entry.entry.status,
                                EntryStatus::Draft | EntryStatus::NeedsCorrection
                            )
                        {
                            return Err(conflict("Entry or music intent changed"));
                        }
                        Ok(intent)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn record_music_inspection(
        &self,
        claims: &Claims,
        receipt: &MusicInspectionReceipt,
    ) -> Result<MusicInspectionReceipt> {
        if receipt.size_bytes == 0
            || receipt.size_bytes > crate::audio_inspection::MAX_WAV_BYTES as u64
            || receipt.duration_ms == 0
            || receipt.sample_rate == 0
            || receipt.channels == 0
            || receipt.malware_scan_status.as_deref() != Some("clean")
            || !matches!(
                (receipt.format.as_str(), receipt.content_type.as_str()),
                ("wav", "audio/wav") | ("mp3", "audio/mpeg")
            )
            || (receipt.format == "wav") != receipt.bits_per_sample.is_some()
        {
            return Err(invalid("Invalid music inspection receipt"));
        }
        let input = (claims.clone(), receipt.clone());
        self.db
            .run_transaction(|db, tx| {
                let (claims, receipt) = input.clone();
                Box::pin(async move {
                    async {
                        let chapter = &receipt.chapter_id;
                        membership(&db, &claims, chapter).await?;
                        if claims.role.as_deref() != Some("crew_manager")
                            || claims.sub != receipt.owner_uid
                        {
                            return Err(forbidden());
                        }
                        let entry = entry_access(
                            &db,
                            &claims,
                            chapter,
                            &receipt.event_id,
                            &receipt.entry_id,
                            false,
                        )
                        .await?;
                        let crew: Crew = required(
                            &db,
                            &format!(
                                "chapters/{}/crews/{}",
                                segment(chapter)?,
                                segment(&entry.entry.crew_id)?
                            ),
                        )
                        .await?;
                        if crew.chapter_id != *chapter
                            || crew.id != entry.entry.crew_id
                            || crew.manager_uid != claims.sub
                        {
                            return Err(forbidden());
                        }
                        let intent_path = format!(
                            "chapters/{}/musicIntents/{}",
                            segment(chapter)?,
                            segment(&receipt.intent_id)?
                        );
                        let intent: MusicUploadIntent = required(&db, &intent_path).await?;
                        let expected_path = format!(
                            "chapters/{}/music/{}/{}/track",
                            segment(chapter)?,
                            segment(&claims.sub)?,
                            segment(&receipt.intent_id)?
                        );
                        if intent.chapter_id != *chapter
                            || intent.owner_uid != claims.sub
                            || intent.intent_id != receipt.intent_id
                            || intent.event_id != receipt.event_id
                            || intent.entry_id != receipt.entry_id
                            || intent.entry_revision != receipt.entry_revision
                            || intent.storage_path != expected_path
                        {
                            return Err(forbidden());
                        }
                        if entry.entry.revision != receipt.entry_revision
                            || !matches!(
                                entry.entry.status,
                                EntryStatus::Draft | EntryStatus::NeedsCorrection
                            )
                        {
                            return Err(conflict("Entry changed during music inspection"));
                        }
                        let receipt_path = format!(
                            "chapters/{}/musicInspections/{}",
                            segment(chapter)?,
                            segment(&receipt.intent_id)?
                        );
                        if let Some(existing) =
                            get::<MusicInspectionReceipt>(&db, &receipt_path).await?
                        {
                            if existing != receipt || intent.status != "awaiting_upload" {
                                return Err(conflict(
                                    "Music inspection differs from saved receipt",
                                ));
                            }
                            return Ok(existing);
                        }
                        if intent.status != "awaiting_upload" {
                            return Err(conflict("Music intent changed"));
                        }
                        put(&db, tx, &receipt_path, &receipt)?;
                        audit(
                            &db,
                            tx,
                            chapter,
                            &claims.sub,
                            "music_inspected",
                            &receipt.intent_id,
                            &key(&["music-inspection", &receipt.intent_id]),
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
    pub async fn create_music_intent(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        operation_id: &str,
        expected_revision: u64,
    ) -> Result<MusicUploadIntent> {
        segment(operation_id)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
            operation_id.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, entry_id, operation_id) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("crew_manager") {
                            return Err(forbidden());
                        }
                        let entry =
                            entry_access(&db, &claims, &chapter, &event, &entry_id, false).await?;
                        let crew: Crew = required(
                            &db,
                            &format!(
                                "chapters/{}/crews/{}",
                                segment(&chapter)?,
                                segment(&entry.entry.crew_id)?
                            ),
                        )
                        .await?;
                        if crew.id != entry.entry.crew_id
                            || crew.chapter_id != chapter
                            || crew.manager_uid != claims.sub
                        {
                            return Err(forbidden());
                        }
                        let path = format!(
                            "chapters/{}/musicIntents/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &operation_id])
                        );
                        if let Some(existing) = get::<MusicUploadIntent>(&db, &path).await? {
                            if existing.chapter_id != chapter
                                || existing.owner_uid != claims.sub
                                || existing.event_id != event
                                || existing.entry_id != entry_id
                                || existing.entry_revision != expected_revision
                            {
                                return Err(conflict(
                                    "Music operation ID already used for different input",
                                ));
                            }
                            return Ok(existing);
                        }
                        if entry.entry.revision != expected_revision
                            || !matches!(
                                entry.entry.status,
                                EntryStatus::Draft | EntryStatus::NeedsCorrection
                            )
                        {
                            return Err(conflict("Entry changed or is not editable"));
                        }
                        let intent_id = key(&[&claims.sub, &operation_id]);
                        let created_at = now_secs();
                        let intent = MusicUploadIntent {
                            storage_path: format!(
                                "chapters/{}/music/{}/{}/track",
                                segment(&chapter)?,
                                segment(&claims.sub)?,
                                segment(&intent_id)?
                            ),
                            intent_id,
                            chapter_id: chapter.clone(),
                            event_id: event,
                            entry_id,
                            owner_uid: claims.sub.clone(),
                            entry_revision: expected_revision,
                            status: "awaiting_upload".into(),
                            created_at,
                            expires_at: created_at + 3600,
                            malware_scan_status: None,
                            review_status: None,
                        };
                        put(&db, tx, &path, &intent)?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "music_upload_intent_created",
                            &intent.intent_id,
                            &key(&["music-intent", &claims.sub, &operation_id]),
                        )?;
                        Ok(intent)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
