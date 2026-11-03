use super::*;
use crate::domain::AuditRecord;
use serde_json::Value;

fn string_field(value: &Value, name: &str) -> Option<String> {
    value.get(name).and_then(Value::as_str).map(str::to_owned)
}

impl FirestoreRepository {
    pub async fn chapter_audit_page(
        &self,
        claims: &Claims,
        chapter: &str,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<AuditRecord>> {
        segment(chapter)?;
        if !(1..=100).contains(&limit) || cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        self.db
            .run_transaction(|db, _tx| {
                let claims = claims.clone();
                let chapter = chapter.to_owned();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        if !matches!(claims.role.as_deref(), Some("chapter_director" | "auditor")) {
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

        let parent = format!(
            "{}/chapters/{}",
            self.db.get_documents_path(),
            segment(chapter)?
        );
        let cursor = cursor
            .map(|value| {
                let (timestamp, id) = value
                    .split_once(':')
                    .ok_or_else(|| invalid("Invalid audit cursor"))?;
                let timestamp: i64 = timestamp
                    .parse()
                    .map_err(|_| invalid("Invalid audit cursor"))?;
                if timestamp < 0 {
                    return Err(invalid("Invalid audit cursor"));
                }
                segment(id)?;
                Ok((timestamp, id.to_owned()))
            })
            .transpose()?;
        let builder = self
            .db
            .fluent()
            .select()
            .from("audit")
            .parent(&parent)
            .order(|order| {
                order.fields([
                    order.field("recorded_at").desc(),
                    order.field("__name__").desc(),
                ])
            })
            .limit((limit + 1) as u32);
        let builder = if let Some((timestamp, id)) = cursor {
            builder.start_at(firestore::FirestoreQueryCursor::AfterValue(vec![
                timestamp.into(),
                firestore::FirestoreReference::new(format!("{parent}/audit/{id}")).into(),
            ]))
        } else {
            builder
        };
        let mut documents = builder.query().await?;
        let has_more = documents.len() > limit;
        if has_more {
            documents.pop();
        }
        let next_page = if has_more {
            let document = documents
                .last()
                .ok_or_else(|| invalid("Invalid audit page"))?;
            let value: Value = FirestoreDb::deserialize_doc_to(document)?;
            let timestamp = value
                .get("recorded_at")
                .and_then(Value::as_u64)
                .ok_or_else(|| invalid("Invalid audit timestamp"))?;
            let id = document
                .name
                .rsplit('/')
                .next()
                .ok_or_else(|| invalid("Invalid audit document"))?;
            segment(id)?;
            Some(format!("{timestamp}:{id}"))
        } else {
            None
        };
        let items = documents
            .iter()
            .map(|document| {
                let value: Value = FirestoreDb::deserialize_doc_to(document)?;
                let id = string_field(&value, "id")
                    .or_else(|| document.name.rsplit('/').next().map(str::to_owned))
                    .unwrap_or_default();
                let event_id = string_field(&value, "event_id");
                let division_id = string_field(&value, "division_id");
                let action = string_field(&value, "action")
                    .or_else(|| {
                        (event_id.is_some() && division_id.is_some())
                            .then(|| "judge_panel_changed".to_owned())
                    })
                    .unwrap_or_else(|| "unknown_audit_action".to_owned());
                let resource_id = string_field(&value, "resource_id")
                    .or_else(|| {
                        event_id
                            .zip(division_id)
                            .map(|(event, division)| format!("{event}:{division}"))
                    })
                    .unwrap_or_default();
                let recorded_at = value
                    .get("recorded_at")
                    .and_then(Value::as_u64)
                    .unwrap_or_default();
                Ok::<_, RepositoryError>(AuditRecord {
                    id,
                    actor_uid: string_field(&value, "actor_uid").unwrap_or_default(),
                    chapter_id: string_field(&value, "chapter_id").unwrap_or_default(),
                    action,
                    resource_id,
                    recorded_at,
                    reason: string_field(&value, "reason"),
                    correlation_id: string_field(&value, "correlation_id"),
                })
            })
            .collect::<Result<Vec<_>>>()?;
        if items.iter().any(|record| {
            record.chapter_id != chapter
                || record.id.is_empty()
                || record.actor_uid.is_empty()
                || record.action.is_empty()
        }) {
            return Err(forbidden());
        }
        Ok(Page { items, next_page })
    }
}
