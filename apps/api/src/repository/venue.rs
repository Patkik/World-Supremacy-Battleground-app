use super::*;
use crate::domain::{CheckInRecord, EntryStatus};
use crate::repository::models::Page;

impl FirestoreRepository {
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
