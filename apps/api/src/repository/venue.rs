use super::*;
use crate::domain::{CheckInCandidate, CheckInDancerCandidate, CheckInRecord, EntryStatus};
use crate::repository::models::Page;

impl FirestoreRepository {
    /// Lists only approved, currently ready roster candidates for an assigned
    /// marshal. The check-in write still rechecks every condition transactionally.
    pub async fn check_in_candidates(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<CheckInCandidate>> {
        let record = event_access(
            &self.db,
            claims,
            chapter,
            event,
            &["marshal", "chapter_director"],
        )
        .await?;
        if record.chapter_id != chapter || record.id != event {
            return Err(forbidden());
        }
        let entries = self
            .page::<EntryDocument>(&event_path(chapter, event)?, "entries", cursor, limit)
            .await?;
        let mut items = Vec::new();
        for document in entries.items {
            let entry = document.entry;
            if entry.chapter_id != chapter
                || entry.event_id != event
                || entry.status != EntryStatus::Approved
            {
                continue;
            }
            let division: DivisionDocument = get(
                &self.db,
                &division_path(chapter, event, &entry.division_id)?,
            )
            .await?
            .ok_or_else(|| conflict("Entry division is unavailable"))?;
            if division.policy.id != entry.division_id
                || !readiness(
                    &EntryDocument {
                        entry: entry.clone(),
                        pending_minor: 0,
                        completed_scorecards: 0,
                    },
                    &division,
                )?
                .is_ready
            {
                continue;
            }
            items.push(CheckInCandidate {
                entry_id: entry.id,
                crew_id: entry.crew_id,
                division_id: entry.division_id,
                dancers: entry
                    .roster
                    .into_iter()
                    .map(|member| CheckInDancerCandidate {
                        uid: member.uid,
                        name: member.name,
                    })
                    .collect(),
            });
        }
        Ok(Page {
            items,
            next_page: entries.next_page,
        })
    }

    /// Return only the current participant's own recorded arrival, never a pass.
    pub async fn own_check_in(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
    ) -> Result<Option<u64>> {
        let input = (claims.clone(), chapter.to_owned(), event.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if !matches!(claims.role.as_deref(), Some("dancer" | "crew_manager")) {
                            return Err(forbidden());
                        }
                        let record: Event = required(&db, &event_path(&chapter, &event)?).await?;
                        if record.id != event || record.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        let path = format!(
                            "{}/checkIns/{}",
                            event_path(&chapter, &event)?,
                            key(&[&claims.sub])
                        );
                        let result = get::<CheckInRecord>(&db, &path).await?;
                        if let Some(value) = result {
                            if value.chapter_id != chapter
                                || value.event_id != event
                                || value.dancer_uid != claims.sub
                            {
                                return Err(conflict("Check-in record scope mismatch"));
                            }
                            Ok(Some(value.checked_in_at))
                        } else {
                            Ok(None)
                        }
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
    /// Lists only check-ins owned by the authorized event. The query is bounded
    /// and revalidates the current membership and event assignment first.
    pub async fn list_check_ins(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<CheckInRecord>> {
        let input = (claims.clone(), chapter.to_owned(), event.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event) = input.clone();
                Box::pin(async move {
                    async {
                        let record = event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["marshal", "registrar", "chapter_director"],
                        )
                        .await?;
                        Ok(record)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)?;
        let records = self
            .page::<CheckInRecord>(&event_path(chapter, event)?, "checkIns", cursor, limit)
            .await?;
        if records
            .items
            .iter()
            .any(|record| record.chapter_id != chapter || record.event_id != event)
        {
            return Err(forbidden());
        }
        Ok(records)
    }

    /// Online check-in is unique per event and dancer, even across eligible entries.
    pub async fn check_in(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry_id: &str,
        dancer: &str,
    ) -> Result<CheckInRecord> {
        segment(dancer)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry_id.to_owned(),
            dancer.to_owned(),
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event, entry_id, dancer) = input.clone();
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
                        let entry: EntryDocument =
                            required(&db, &entry_path(&chapter, &event, &entry_id)?).await?;
                        if entry.entry.id != entry_id
                            || entry.entry.chapter_id != chapter
                            || entry.entry.event_id != event
                        {
                            return Err(forbidden());
                        }
                        let division: DivisionDocument = required(
                            &db,
                            &division_path(&chapter, &event, &entry.entry.division_id)?,
                        )
                        .await?;
                        if division.policy.id != entry.entry.division_id
                            || entry.entry.status != EntryStatus::Approved
                            || !entry.entry.roster.iter().any(|member| member.uid == dancer)
                            || !readiness(&entry, &division)?.is_ready
                        {
                            return Err(conflict(
                                "An approved, ready entry containing the dancer is required",
                            ));
                        }
                        let path = format!(
                            "{}/checkIns/{}",
                            event_path(&chapter, &event)?,
                            key(&[&dancer])
                        );
                        if let Some(existing) = get::<CheckInRecord>(&db, &path).await? {
                            if existing.chapter_id != chapter
                                || existing.event_id != event
                                || existing.dancer_uid != dancer
                            {
                                return Err(conflict("Check-in record scope mismatch"));
                            }
                            return Ok(existing);
                        }
                        let record = CheckInRecord {
                            pass_id: new_id("checkin"),
                            chapter_id: chapter.clone(),
                            event_id: event.clone(),
                            dancer_uid: dancer,
                            checked_in_at: now_secs(),
                            scanner_uid: claims.sub.clone(),
                        };
                        let participant_membership: Option<MembershipRecord> = get(
                            &db,
                            &format!(
                                "chapters/{}/members/{}",
                                segment(&chapter)?,
                                segment(&record.dancer_uid)?
                            ),
                        )
                        .await?;
                        if participant_membership.as_ref().is_some_and(|member| {
                            member.active
                                && member.chapter_id == chapter
                                && member.expires_at.is_none_or(|expiry| expiry > record.checked_in_at)
                        }) {
                            super::notifications::enqueue(
                                &db,
                                tx,
                                &chapter,
                                &record.dancer_uid,
                                key(&["event-check-in", &event, &record.dancer_uid]),
                                "participant_checked_in",
                                "Arrival recorded",
                                "The event team recorded your arrival. Open your event-day workspace to check the saved status.",
                                &super::notifications::destination(&["app", "event-day", &event], &[])?,
                            )
                            .await?;
                        }
                        put(&db, tx, &path, &record)?;
                        audit(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "dancer_checked_in",
                            &record.pass_id,
                            &record.pass_id,
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
