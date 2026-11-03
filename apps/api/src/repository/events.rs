use super::*;
use crate::domain::{Chapter, Division, DivisionPolicyDraft, DivisionPolicyDraftVersion, Event};
use crate::registration::{
    CreateEventPayload, SaveDivisionPolicyDraftPayload, UpdateEventDraftPayload,
    UpdateRegistrationWindowPayload,
};
use chrono::{NaiveDateTime, TimeZone};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(super) struct EventDirectoryEntry {
    pub(super) event_id: String,
    pub(super) chapter_id: String,
    pub(super) created_at: u64,
}

#[derive(Clone, Serialize, Deserialize)]
struct EventCreateReceipt {
    command_hash: String,
    event: Event,
}

#[derive(Clone, Serialize, Deserialize)]
struct RegistrationWindowReceipt {
    command_hash: String,
    event: Event,
}

#[derive(Clone, Serialize, Deserialize)]
struct EventDraftUpdateReceipt {
    command_hash: String,
    event: Event,
}

#[derive(Clone, Serialize, Deserialize)]
struct DivisionDraftReceipt {
    command_hash: String,
    draft: DivisionPolicyDraft,
}

fn local_timestamp(value: Option<&str>, timezone: Tz) -> Result<Option<u64>> {
    let Some(value) = value else {
        return Ok(None);
    };
    let local = NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M")
        .map_err(|_| invalid("Enter a valid local date and time"))?;
    let instant = timezone
        .from_local_datetime(&local)
        .single()
        .ok_or_else(|| {
            invalid("This local time is ambiguous or does not exist in the event timezone")
        })?;
    u64::try_from(instant.timestamp())
        .map(Some)
        .map_err(|_| invalid("Registration times must be after 1970"))
}

fn text(value: &str, max: usize) -> Result<String> {
    let value = value.trim();
    if value.is_empty() || value.len() > max || value.chars().any(char::is_control) {
        return Err(invalid("Invalid event field"));
    }
    Ok(value.to_owned())
}

fn audit_reason(value: &str) -> Result<&str> {
    let value = value.trim();
    if value.chars().count() < 8
        || value.chars().count() > 1000
        || value.chars().any(char::is_control)
    {
        return Err(invalid("Enter an audit reason of 8–1000 characters"));
    }
    Ok(value)
}

fn valid_slug(value: &str) -> bool {
    value.len() >= 3
        && value.len() <= 64
        && value.as_bytes().first().is_some_and(u8::is_ascii_lowercase)
        && value.as_bytes().last().is_some_and(u8::is_ascii_lowercase)
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
        && !value.contains("--")
}

fn valid_date(value: &str) -> bool {
    let mut parts = value.split('-');
    let (Some(year), Some(month), Some(day), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return false;
    };
    if year.len() != 4 || month.len() != 2 || day.len() != 2 {
        return false;
    }
    let (Ok(year), Ok(month), Ok(day)) =
        (year.parse::<u16>(), month.parse::<u8>(), day.parse::<u8>())
    else {
        return false;
    };
    if year == 0 {
        return false;
    }
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    (1..=days).contains(&day)
}

fn valid_timezone(value: &str) -> bool {
    value.parse::<chrono_tz::Tz>().is_ok()
}

impl FirestoreRepository {
    pub async fn create_event(
        &self,
        claims: &Claims,
        chapter: &str,
        command: CreateEventPayload,
    ) -> Result<Event> {
        segment(&command.operation_id)?;
        audit_reason(&command.reason)?;
        if !valid_slug(&command.id) {
            return Err(invalid("Event identifier must be a lowercase URL slug"));
        }
        let input = (claims.clone(), chapter.to_owned(), command);
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, command) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        if now_secs().saturating_sub(claims.auth_time) > 300 {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Reauthenticate before creating an event",
                            ));
                        }
                        let chapter_record: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        if chapter_record.id != chapter {
                            return Err(forbidden());
                        }
                        let event = Event {
                            registration_opens_at: None,
                            registration_closes_at: None,
                            id: command.id.clone(),
                            chapter_id: chapter.clone(),
                            name: text(&command.name, 120)?,
                            status: "draft".into(),
                            rules_version: text(&command.rules_version, 160)?,
                            event_date: Some({
                                let date = text(&command.event_date, 10)?;
                                if !valid_date(&date) {
                                    return Err(invalid(
                                        "Event date must be a valid YYYY-MM-DD date",
                                    ));
                                }
                                date
                            }),
                            timezone: Some({
                                let timezone = text(&command.timezone, 64)?;
                                if !valid_timezone(&timezone) {
                                    return Err(invalid(
                                        "Enter a timezone such as Asia/Manila or UTC",
                                    ));
                                }
                                timezone
                            }),
                            venue: Some(text(&command.venue, 240)?),
                            created_by: Some(claims.sub.clone()),
                            created_at: now_secs(),
                            updated_at: now_secs(),
                            revision: 1,
                        };
                        let command_hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid event command"))?]);
                        let receipt_path = format!(
                            "chapters/{}/eventCreateOperations/{}",
                            segment(&chapter)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        if let Some(receipt) = get::<EventCreateReceipt>(&db, &receipt_path).await?
                        {
                            if receipt.command_hash != command_hash {
                                return Err(conflict("Event creation request changed"));
                            }
                            return Ok(receipt.event);
                        }
                        let directory_path = format!("eventDirectory/{}", segment(&event.id)?);
                        if get::<EventDirectoryEntry>(&db, &directory_path)
                            .await?
                            .is_some()
                            || get::<serde_json::Value>(
                                &db,
                                &format!("publicEvents/{}", segment(&event.id)?),
                            )
                            .await?
                            .is_some()
                            || get::<Event>(&db, &event_path(&chapter, &event.id)?)
                                .await?
                                .is_some()
                        {
                            return Err(conflict("This event identifier is already in use"));
                        }
                        put(&db, tx, &event_path(&chapter, &event.id)?, &event)?;
                        put(
                            &db,
                            tx,
                            &directory_path,
                            &EventDirectoryEntry {
                                event_id: event.id.clone(),
                                chapter_id: chapter.clone(),
                                created_at: event.created_at,
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &receipt_path,
                            &EventCreateReceipt {
                                command_hash,
                                event: event.clone(),
                            },
                        )?;
                        audit_with_reason(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "event_created",
                            &event.id,
                            &key(&[
                                &claims.sub,
                                &event.id,
                                &command.operation_id,
                                "event-created",
                            ]),
                            Some(command.reason.trim()),
                        )?;
                        Ok(event)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn update_event_draft(
        &self,
        claims: &Claims,
        chapter: &str,
        event_id: &str,
        command: UpdateEventDraftPayload,
    ) -> Result<Event> {
        segment(&command.operation_id)?;
        audit_reason(&command.reason)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event_id.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event_id, command) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        if now_secs().saturating_sub(claims.auth_time) > 300 {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Reauthenticate before editing an event",
                            ));
                        }
                        let path = event_path(&chapter, &event_id)?;
                        let operation_path = format!(
                            "chapters/{}/events/{}/draftUpdateOperations/{}",
                            segment(&chapter)?,
                            segment(&event_id)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let receipt = get::<EventDraftUpdateReceipt>(&db, &operation_path).await?;
                        let mut event: Event = required(&db, &path).await?;
                        if event.id != event_id || event.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        let command_hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid event update command"))?]);
                        if let Some(receipt) = receipt {
                            if receipt.command_hash != command_hash {
                                return Err(conflict("Event update request changed"));
                            }
                            return Ok(receipt.event);
                        }
                        if event.status != "draft" {
                            return Err(conflict("Only draft events can be edited"));
                        }
                        if event.revision != command.expected_revision {
                            return Err(conflict("Event revision mismatch; refresh before saving"));
                        }
                        let name = text(&command.name, 120)?;
                        let date = text(&command.event_date, 10)?;
                        if !valid_date(&date) {
                            return Err(invalid("Event date must be a valid YYYY-MM-DD date"));
                        }
                        let timezone = text(&command.timezone, 64)?;
                        if !valid_timezone(&timezone) {
                            return Err(invalid("Enter a timezone such as Asia/Manila or UTC"));
                        }
                        if event.timezone.as_deref() != Some(&timezone)
                            && (event.registration_opens_at.is_some()
                                || event.registration_closes_at.is_some())
                        {
                            return Err(conflict(
                                "Clear the registration window before changing the event timezone",
                            ));
                        }
                        event.name = name;
                        event.event_date = Some(date);
                        event.timezone = Some(timezone);
                        event.venue = Some(text(&command.venue, 240)?);
                        event.rules_version = text(&command.rules_version, 160)?;
                        event.revision = event
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Event revision overflow"))?;
                        event.updated_at = now_secs();
                        put(&db, tx, &path, &event)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &EventDraftUpdateReceipt {
                                command_hash,
                                event: event.clone(),
                            },
                        )?;
                        audit_with_reason(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "event_draft_updated",
                            &event.id,
                            &key(&[
                                &claims.sub,
                                &event.id,
                                &command.operation_id,
                                "event-draft-updated",
                            ]),
                            Some(command.reason.trim()),
                        )?;
                        Ok(event)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn update_registration_window(
        &self,
        claims: &Claims,
        chapter: &str,
        event_id: &str,
        command: UpdateRegistrationWindowPayload,
    ) -> Result<Event> {
        segment(&command.operation_id)?;
        audit_reason(&command.reason)?;
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event_id.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event_id, command) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        if now_secs().saturating_sub(claims.auth_time) > 300 {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Reauthenticate before changing registration dates",
                            ));
                        }
                        let event_path = event_path(&chapter, &event_id)?;
                        let operation_path = format!(
                            "chapters/{}/events/{}/registrationWindowOperations/{}",
                            segment(&chapter)?,
                            segment(&event_id)?,
                            key(&[&claims.sub, &command.operation_id])
                        );
                        let receipt =
                            get::<RegistrationWindowReceipt>(&db, &operation_path).await?;
                        let mut event: Event = required(&db, &event_path).await?;
                        if event.id != event_id || event.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        let command_hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid registration window command"))?]);
                        if let Some(receipt) = receipt {
                            if receipt.command_hash != command_hash {
                                return Err(conflict("Registration window request changed"));
                            }
                            return Ok(receipt.event);
                        }
                        if event.status != "draft" {
                            return Err(conflict(
                                "Registration dates can only be changed while the event is a draft",
                            ));
                        }
                        if event.revision != command.expected_revision {
                            return Err(conflict("Event revision mismatch; refresh before saving"));
                        }
                        if command.opens_at_local.is_some() != command.closes_at_local.is_some() {
                            return Err(invalid("Set both registration dates, or clear both"));
                        }
                        let timezone: Tz = event
                            .timezone
                            .as_deref()
                            .ok_or_else(|| {
                                invalid("Set the event timezone before registration dates")
                            })?
                            .parse()
                            .map_err(|_| invalid("The saved event timezone is invalid"))?;
                        let opens_at =
                            local_timestamp(command.opens_at_local.as_deref(), timezone)?;
                        let closes_at =
                            local_timestamp(command.closes_at_local.as_deref(), timezone)?;
                        if opens_at
                            .zip(closes_at)
                            .is_some_and(|(opens, closes)| closes <= opens)
                        {
                            return Err(invalid(
                                "Registration close must be after registration open",
                            ));
                        }
                        event.registration_opens_at = opens_at;
                        event.registration_closes_at = closes_at;
                        event.revision = event
                            .revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Event revision overflow"))?;
                        event.updated_at = now_secs();
                        put(&db, tx, &event_path, &event)?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &RegistrationWindowReceipt {
                                command_hash,
                                event: event.clone(),
                            },
                        )?;
                        audit_with_reason(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "registration_window_updated",
                            &event.id,
                            &key(&[
                                &claims.sub,
                                &event.id,
                                &command.operation_id,
                                "registration-window-updated",
                            ]),
                            Some(command.reason.trim()),
                        )?;
                        Ok(event)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn duty_event_access(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
    ) -> Result<serde_json::Value> {
        let input = (claims.clone(), chapter.to_owned(), event.to_owned());
        self.db.run_transaction(|db, _tx| {
            let (claims, chapter, event) = input.clone();
            Box::pin(async move {
                async {
                    let record = event_access(&db, &claims, &chapter, &event, &["chapter_director", "registrar", "head_judge", "judge", "marshal", "audio_operator"]).await?;
                    Ok(serde_json::json!({"id": record.id, "chapter_id": record.chapter_id, "name": record.name, "status": record.status}))
                }.await.map_err(backoff)
            })
        }).await.map_err(transaction_error)
    }

    pub async fn list_duty_events(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<serde_json::Value>> {
        let input = (claims.clone(), chapter.to_owned(), cursor);
        self.db.run_transaction(|db, _tx| {
            let (claims, chapter, cursor) = input.clone();
            Box::pin(async move {
                async {
                    membership(&db, &claims, &chapter).await?;
                    if !matches!(claims.role.as_deref(), Some("chapter_director" | "registrar" | "head_judge" | "judge" | "marshal" | "audio_operator")) { return Err(forbidden()); }
                    let events = super::reads::page::<Event>(&db, &format!("chapters/{}", segment(&chapter)?), "events", cursor, limit).await?;
                    let mut items = Vec::new();
                    for event in events.items {
                        if event.chapter_id != chapter || segment(&event.id).is_err() { return Err(forbidden()); }
                        let allowed = if claims.role.as_deref() == Some("chapter_director") { true } else {
                            let assignment: Option<Assignment> = get(&db, &format!("{}/assignments/{}", event_path(&chapter, &event.id)?, segment(&claims.sub)?)).await?;
                            assignment.is_some_and(|a| a.active && a.uid == claims.sub && a.event_id == event.id)
                        };
                        if allowed { items.push(serde_json::json!({"id": event.id, "chapter_id": chapter, "name": event.name, "status": event.status})); }
                    }
                    Ok(Page { items, next_page: events.next_page })
                }.await.map_err(backoff)
            })
        }).await.map_err(transaction_error)
    }

    pub async fn list_managed_events(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<Event>> {
        self.db
            .run_transaction(|db, _tx| {
                let claims = claims.clone();
                let chapter = chapter.to_owned();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        Ok(())
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)?;
        let page = self
            .page::<Event>(
                &format!("chapters/{}", segment(chapter)?),
                "events",
                cursor,
                limit,
            )
            .await?;
        if page
            .items
            .iter()
            .any(|event| event.chapter_id != chapter || event.id.is_empty())
        {
            return Err(forbidden());
        }
        Ok(page)
    }

    pub async fn list_division_policy_drafts(
        &self,
        claims: &Claims,
        chapter: &str,
        event_id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<DivisionPolicyDraft>> {
        let event =
            event_access(&self.db, claims, chapter, event_id, &["chapter_director"]).await?;
        if event.id != event_id || event.chapter_id != chapter {
            return Err(forbidden());
        }
        let page = self
            .page::<DivisionPolicyDraft>(
                &event_path(chapter, event_id)?,
                "divisionPolicyDrafts",
                cursor,
                limit,
            )
            .await?;
        if page.items.iter().any(|draft| {
            draft.chapter_id != chapter
                || draft.event_id != event_id
                || draft.status != "draft"
                || draft.policy.id != draft.division_id
        }) {
            return Err(forbidden());
        }
        Ok(page)
    }

    pub async fn division_policy_draft_versions(
        &self,
        claims: &Claims,
        chapter: &str,
        event_id: &str,
        division_id: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<DivisionPolicyDraftVersion>> {
        let event =
            event_access(&self.db, claims, chapter, event_id, &["chapter_director"]).await?;
        if event.id != event_id || event.chapter_id != chapter {
            return Err(forbidden());
        }
        let draft_path = format!(
            "{}/divisionPolicyDrafts/{}",
            event_path(chapter, event_id)?,
            segment(division_id)?
        );
        let current: DivisionPolicyDraft = required(&self.db, &draft_path).await?;
        if current.chapter_id != chapter
            || current.event_id != event_id
            || current.division_id != division_id
        {
            return Err(forbidden());
        }
        let page = self
            .page::<DivisionPolicyDraftVersion>(&draft_path, "versions", cursor, limit)
            .await?;
        if page.items.iter().any(|version| {
            version.version != version.snapshot.version
                || version.snapshot.chapter_id != chapter
                || version.snapshot.event_id != event_id
                || version.snapshot.division_id != division_id
        }) {
            return Err(forbidden());
        }
        Ok(page)
    }

    pub async fn save_division_policy_draft(
        &self,
        claims: &Claims,
        chapter: &str,
        event_id: &str,
        division_id: &str,
        command: SaveDivisionPolicyDraftPayload,
    ) -> Result<DivisionPolicyDraft> {
        segment(&command.operation_id)?;
        audit_reason(&command.reason)?;
        if !valid_slug(division_id)
            || command.min_members == 0
            || command.max_members < command.min_members
            || command.max_members > 1000
            || command.max_duration_secs == 0
            || command.max_duration_secs > 3600
            || command.max_age == Some(0)
            || command.fee_minor > 9_007_199_254_740_991
        {
            return Err(invalid("Invalid division limits or fee amount"));
        }
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event_id.to_owned(),
            division_id.to_owned(),
            command,
        );
        self.db
            .run_transaction(|db, tx| {
                let (claims, chapter, event_id, division_id, command) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if claims.role.as_deref() != Some("chapter_director") {
                            return Err(forbidden());
                        }
                        if now_secs().saturating_sub(claims.auth_time) > 300 {
                            return Err(deny(
                                StatusCode::UNAUTHORIZED,
                                "Reauthenticate before editing division policy",
                            ));
                        }
                        let event_path = event_path(&chapter, &event_id)?;
                        let record: Event = required(&db, &event_path).await?;
                        if record.id != event_id || record.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        if record.status != "draft" {
                            return Err(conflict(
                                "Division policy drafts can only change before event activation",
                            ));
                        }
                        let draft_path = format!(
                            "{event_path}/divisionPolicyDrafts/{}",
                            segment(&division_id)?
                        );
                        let operation_id = key(&[&claims.sub, &command.operation_id]);
                        let operation_path = format!("{draft_path}/operations/{operation_id}");
                        let old = get::<DivisionPolicyDraft>(&db, &draft_path).await?;
                        let receipt = get::<DivisionDraftReceipt>(&db, &operation_path).await?;
                        let command_hash = key(&[&serde_json::to_string(&command)
                            .map_err(|_| invalid("Invalid division draft command"))?]);
                        if let Some(receipt) = receipt {
                            if receipt.command_hash != command_hash {
                                return Err(conflict("Division draft operation payload changed"));
                            }
                            return Ok(receipt.draft);
                        }
                        let old_revision = old.as_ref().map_or(0, |value| value.revision);
                        if old_revision != command.expected_revision {
                            return Err(conflict(
                                "Division draft revision mismatch; refresh before saving",
                            ));
                        }
                        if old.as_ref().is_some_and(|value| {
                            value.chapter_id != chapter
                                || value.event_id != event_id
                                || value.division_id != division_id
                                || value.status != "draft"
                        }) {
                            return Err(forbidden());
                        }
                        let chapter_record: Chapter =
                            required(&db, &format!("chapters/{}", segment(&chapter)?)).await?;
                        if chapter_record.id != chapter
                            || chapter_record.currency.len() != 3
                            || !chapter_record
                                .currency
                                .bytes()
                                .all(|byte| byte.is_ascii_uppercase())
                        {
                            return Err(invalid(
                                "Chapter currency is not configured as an ISO code",
                            ));
                        }
                        if old
                            .as_ref()
                            .is_some_and(|value| value.currency != chapter_record.currency)
                        {
                            return Err(conflict(
                                "Chapter currency changed; create a new division draft",
                            ));
                        }
                        let name = text(&command.name, 120)?;
                        let rules_source = text(&command.rules_source, 500)?;
                        let rules_version = text(&command.rules_version, 160)?;
                        let effective_date = text(&command.effective_date, 10)?;
                        if !valid_date(&effective_date) {
                            return Err(invalid("Effective date must be a valid YYYY-MM-DD date"));
                        }
                        let now = now_secs();
                        let version = match old.as_ref() {
                            Some(value) => value
                                .version
                                .checked_add(1)
                                .ok_or_else(|| conflict("Division policy version overflow"))?,
                            None => 1,
                        };
                        let revision = old_revision
                            .checked_add(1)
                            .ok_or_else(|| conflict("Division draft revision overflow"))?;
                        let draft = DivisionPolicyDraft {
                            chapter_id: chapter.clone(),
                            event_id: event_id.clone(),
                            division_id: division_id.clone(),
                            currency: chapter_record.currency,
                            version,
                            revision,
                            status: "draft".into(),
                            policy: Division {
                                id: division_id.clone(),
                                name,
                                min_members: command.min_members,
                                max_members: command.max_members,
                                max_duration_secs: command.max_duration_secs,
                                max_age: command.max_age,
                                fee_minor: command.fee_minor,
                            },
                            rules_source,
                            rules_version,
                            effective_date,
                            created_by: old.as_ref().map_or_else(
                                || claims.sub.clone(),
                                |value| value.created_by.clone(),
                            ),
                            created_at: old.as_ref().map_or(now, |value| value.created_at),
                            updated_at: now,
                        };
                        let version_path = format!("{draft_path}/versions/{version:020}");
                        if get::<DivisionPolicyDraftVersion>(&db, &version_path)
                            .await?
                            .is_some()
                        {
                            return Err(conflict("Division policy version already exists"));
                        }
                        put(&db, tx, &draft_path, &draft)?;
                        put(
                            &db,
                            tx,
                            &version_path,
                            &DivisionPolicyDraftVersion {
                                version,
                                actor_uid: claims.sub.clone(),
                                operation_id_digest: operation_id.clone(),
                                saved_at: now,
                                snapshot: draft.clone(),
                            },
                        )?;
                        put(
                            &db,
                            tx,
                            &operation_path,
                            &DivisionDraftReceipt {
                                command_hash,
                                draft: draft.clone(),
                            },
                        )?;
                        audit_with_reason(
                            &db,
                            tx,
                            &chapter,
                            &claims.sub,
                            "division_policy_draft_saved",
                            &division_id,
                            &key(&[&claims.sub, &command.operation_id, "division-policy-draft"]),
                            Some(command.reason.trim()),
                        )?;
                        Ok(draft)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
