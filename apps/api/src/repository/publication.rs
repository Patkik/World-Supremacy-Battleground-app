use super::*;
use crate::domain::{CrewResult, EntryStatus, PublishedResultSnapshot, RecordedScore};
use crate::event_ops::PublishDivisionPayload;
use sha2::{Digest, Sha256};

impl FirestoreRepository {
    pub async fn publish_division_results(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division_id: &str,
    ) -> Result<PublishedResultSnapshot> {
        self.publish_division_results_with_payload(claims, chapter, event, division_id, None)
            .await
    }

    pub async fn publish_division_results_with_policy(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division_id: &str,
        allow_ties: Option<bool>,
    ) -> Result<PublishedResultSnapshot> {
        let payload = PublishDivisionPayload { allow_ties };
        self.publish_division_results_with_payload(
            claims,
            chapter,
            event,
            division_id,
            Some(&payload),
        )
        .await
    }

    pub async fn publish_division_results_with_payload(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        division_id: &str,
        payload: Option<&PublishDivisionPayload>,
    ) -> Result<PublishedResultSnapshot> {
        let (event_record, locked_division) = self
            .db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, division_id) = (
                    claims.clone(),
                    chapter.to_owned(),
                    event.to_owned(),
                    division_id.to_owned(),
                );
                Box::pin(async move {
                    async {
                        let event_record = event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["head_judge", "chapter_director"],
                        )
                        .await?;
                        let division: DivisionDocument =
                            required(&db, &division_path(&chapter, &event, &division_id)?).await?;
                        if division.policy.id != division_id {
                            return Err(forbidden());
                        }
                        if !division.locked {
                            return Err(conflict("Division must be locked before publication"));
                        }
                        Ok((event_record, division))
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)?;

        let results = self
            .locked_results(chapter, event, division_id, &event_record, &locked_division)
            .await?;
        if results.is_empty() {
            return Err(conflict("No approved results are available to publish"));
        }
        let allow_ties = payload.and_then(|p| p.allow_ties).unwrap_or(false);
        if !allow_ties && results.windows(2).any(|pair| pair[0].rank == pair[1].rank) {
            return Err(conflict(
                "Tied results require an approved tie policy before publication",
            ));
        }
        let digest = Sha256::digest(
            serde_json::to_vec(&results).map_err(|_| invalid("Result serialization failed"))?,
        )
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
        let candidate = PublishedResultSnapshot {
            publication_id: new_id("pub"),
            chapter_id: chapter.to_owned(),
            event_id: event.to_owned(),
            division_id: division_id.to_owned(),
            results,
            published_at: now_secs(),
            digest,
        };
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            division_id.to_owned(),
            locked_division.generation,
            candidate,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, division_id, generation, candidate) = input.clone();
                Box::pin(async move {
                    async {
                        event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["head_judge", "chapter_director"],
                        )
                        .await?;
                        let path = division_path(&chapter, &event, &division_id)?;
                        let mut division: DivisionDocument = required(&db, &path).await?;
                        if division.policy.id != division_id || !division.locked {
                            return Err(conflict("Division lock changed during publication"));
                        }
                        if division.generation != generation {
                            return Err(conflict("Division changed during publication"));
                        }
                        let snapshot_path = snapshot_path(&event, &division_id)?;
                        if let Some(publication_id) = division.publication_id.as_deref() {
                            let existing: PublishedResultSnapshot =
                                required(&db, &snapshot_path).await?;
                            if existing.publication_id != publication_id
                                || existing.chapter_id != chapter
                                || existing.event_id != event
                                || existing.division_id != division_id
                            {
                                return Err(conflict("Published result record is inconsistent"));
                            }
                            return Ok(existing);
                        }
                        if get::<PublishedResultSnapshot>(&db, &snapshot_path)
                            .await?
                            .is_some()
                        {
                            return Err(conflict("Published result already exists"));
                        }

                        // The public API addresses events by event_id. Reserve that ID
                        // globally on first publication so chapter-scoped IDs cannot alias.
                        let index_path = public_event_path(&event)?;
                        let index = get::<PublicEventIndex>(&db, &index_path).await?;
                        if index.as_ref().is_some_and(|value| {
                            value.event_id != event || value.chapter_id != chapter
                        }) {
                            return Err(conflict(
                                "This public event ID is already used by another chapter",
                            ));
                        }
                        if index.is_none() {
                            put(
                                &db,
                                tx,
                                &index_path,
                                &PublicEventIndex {
                                    event_id: event.clone(),
                                    chapter_id: chapter.clone(),
                                },
                            )?;
                        }
                        put(&db, tx, &snapshot_path, &candidate)?;
                        division.publication_id = Some(candidate.publication_id.clone());
                        put(&db, tx, &path, &division)?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "division_published",
                            &candidate.publication_id,
                            &new_id("audit"),
                        )?;
                        Ok(candidate)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    async fn locked_results(
        &self,
        chapter: &str,
        event: &str,
        division_id: &str,
        event_record: &crate::domain::Event,
        division: &DivisionDocument,
    ) -> Result<Vec<CrewResult>> {
        if !division.locked
            || division.panel.is_empty()
            || division.panel.len() > 20
            || division
                .panel
                .iter()
                .collect::<std::collections::HashSet<_>>()
                .len()
                != division.panel.len()
        {
            return Err(conflict("A locked division with a valid panel is required"));
        }
        if event_record.id != event || event_record.chapter_id != chapter {
            return Err(forbidden());
        }

        // A lock freezes scorecards, readiness and deductions. Reads can therefore
        // be paged outside the final transaction; the commit rechecks lock generation.
        let parent = event_path(chapter, event)?;
        let mut token = None;
        let mut entries = Vec::new();
        loop {
            let page = self
                .page::<EntryDocument>(&parent, "entries", token, 100)
                .await?;
            entries.extend(page.items.into_iter().map(|document| document.entry));
            token = page.next_page;
            if token.is_none() {
                break;
            }
        }
        let approved: Vec<_> = entries
            .into_iter()
            .filter(|entry| {
                entry.chapter_id == chapter
                    && entry.event_id == event
                    && entry.division_id == division_id
                    && entry.status == EntryStatus::Approved
            })
            .collect();
        if approved.len() as u64 != division.approved_entries || division.unready_entries != 0 {
            return Err(conflict(
                "Locked division counters do not match approved entries",
            ));
        }

        let mut results = Vec::with_capacity(approved.len());
        for entry in approved {
            let entry_document: EntryDocument =
                required(&self.db, &entry_path(chapter, event, &entry.id)?).await?;
            if entry_document.entry != entry
                || entry_document.completed_scorecards != division.panel.len() as u64
            {
                return Err(conflict("Entry scorecard count changed after lock"));
            }
            let mut totals = Vec::with_capacity(division.panel.len());
            for judge_uid in &division.panel {
                let score: RecordedScore = required(
                    &self.db,
                    &format!(
                        "{}/scorecards/{}",
                        entry_path(chapter, event, &entry.id)?,
                        key(&[judge_uid])
                    ),
                )
                .await?;
                if score.chapter_id != chapter
                    || score.event_id != event
                    || score.division_id != division_id
                    || score.crew_id != entry.crew_id
                    || score.judge_uid != *judge_uid
                    || score.revision == 0
                    || !score.criteria.is_valid()
                {
                    return Err(conflict("Scorecard scope or value changed after lock"));
                }
                totals.push(score.criteria.total());
            }
            let raw_average = totals.iter().sum::<f64>() / totals.len() as f64;
            let deductions: Option<TechnicalDeductions> = get(
                &self.db,
                &format!(
                    "{}/deductions/{}",
                    division_path(chapter, event, division_id)?,
                    key(&[&entry.crew_id])
                ),
            )
            .await?;
            if deductions.as_ref().is_some_and(|value| {
                value.chapter_id != chapter
                    || value.event_id != event
                    || value.division_id != division_id
                    || value.crew_id != entry.crew_id
                    || value.deductions.iter().any(|item| {
                        !item.points.is_finite() || !(0.0..=100.0).contains(&item.points)
                    })
            }) {
                return Err(conflict("Deduction scope changed after lock"));
            }
            let total_deductions = deductions.as_ref().map_or(0.0, |value| {
                value.deductions.iter().map(|item| item.points).sum()
            });
            results.push(CrewResult {
                entry_id: entry.id,
                crew_id: entry.crew_id,
                raw_average,
                total_deductions,
                final_score: ((raw_average - total_deductions).max(0.0) * 100.0).round() / 100.0,
                rank: 0,
            });
        }
        results.sort_by(|left, right| {
            right
                .final_score
                .total_cmp(&left.final_score)
                .then_with(|| left.crew_id.cmp(&right.crew_id))
        });
        for index in 0..results.len() {
            results[index].rank =
                if index > 0 && results[index].final_score == results[index - 1].final_score {
                    results[index - 1].rank
                } else {
                    index + 1
                };
        }
        Ok(results)
    }

    pub async fn published_snapshot(
        &self,
        event: &str,
        division: &str,
    ) -> Result<PublishedResultSnapshot> {
        let index: PublicEventIndex = required(&self.db, &public_event_path(event)?).await?;
        if index.event_id != event {
            return Err(forbidden());
        }
        let snapshot: PublishedResultSnapshot =
            required(&self.db, &snapshot_path(event, division)?).await?;
        if snapshot.event_id != event
            || snapshot.chapter_id != index.chapter_id
            || snapshot.division_id != division
        {
            return Err(forbidden());
        }
        Ok(snapshot)
    }

    pub async fn published_event_results(
        &self,
        event: &str,
    ) -> Result<Vec<PublishedResultSnapshot>> {
        let Some(index) = get::<PublicEventIndex>(&self.db, &public_event_path(event)?).await?
        else {
            return Ok(Vec::new());
        };
        if index.event_id != event {
            return Err(forbidden());
        }
        let parent = public_event_path(event)?;
        let mut token = None;
        let mut snapshots = Vec::new();
        loop {
            let page = self
                .page::<PublishedResultSnapshot>(&parent, "divisions", token, 100)
                .await?;
            for snapshot in page.items {
                if snapshot.chapter_id != index.chapter_id || snapshot.event_id != event {
                    return Err(forbidden());
                }
                snapshots.push(snapshot);
            }
            token = page.next_page;
            if token.is_none() {
                break;
            }
        }
        snapshots.sort_by(|left, right| left.division_id.cmp(&right.division_id));
        Ok(snapshots)
    }
}

fn public_event_path(event: &str) -> Result<String> {
    Ok(format!("publicEvents/{}", segment(event)?))
}

fn snapshot_path(event: &str, division: &str) -> Result<String> {
    Ok(format!(
        "{}/divisions/{}",
        public_event_path(event)?,
        key(&[division])
    ))
}
