use super::*;
use crate::domain::{EntryStatus, PaymentRecord};
use serde_json::{json, Value};

#[derive(Clone)]
pub enum ReadScope {
    Crews,
    Payments,
    JudgeLineup(String),
    Entries(String),
    Divisions(String),
    DivisionStatus(String),
}

pub(super) async fn page<T: DeserializeOwned>(
    db: &FirestoreDb,
    parent: &str,
    collection: &str,
    token: Option<String>,
    limit: usize,
) -> Result<Page<T>> {
    if !(1..=100).contains(&limit) || token.as_ref().is_some_and(|v| v.len() > 4096) {
        return Err(invalid("Invalid page request"));
    }
    let builder = db
        .fluent()
        .list()
        .from(collection)
        .parent(if parent.is_empty() {
            db.get_documents_path().to_owned()
        } else {
            format!("{}/{parent}", db.get_documents_path())
        })
        .page_size(limit);
    let builder = if let Some(token) = token {
        builder.page_token(token)
    } else {
        builder
    };
    let response = builder.get_page().await?;
    Ok(Page {
        items: response
            .documents
            .iter()
            .map(FirestoreDb::deserialize_doc_to)
            .collect::<std::result::Result<Vec<T>, _>>()?,
        next_page: response.page_token,
    })
}

impl FirestoreRepository {
    pub async fn authorized_page(
        &self,
        claims: &Claims,
        chapter: &str,
        scope: ReadScope,
        token: Option<String>,
        limit: usize,
    ) -> Result<Page<Value>> {
        let input = (claims.clone(), chapter.to_owned(), scope, token);
        self.db.run_transaction(|db, _tx| {
            let (claims, chapter, scope, token) = input.clone();
            Box::pin(async move { async {
                membership(&db, &claims, &chapter).await?;
                let parent = format!("chapters/{}", segment(&chapter)?);
                let result = match scope {
                    ReadScope::Crews => {
                        let values = page::<Crew>(&db, &parent, "crews", token, limit).await?;
                        let items = values.items.into_iter().filter(|crew| crew.chapter_id == chapter && (claims.role.as_deref() == Some("chapter_director") || crew.manager_uid == claims.sub || crew.members.iter().any(|m| m.uid == claims.sub))).map(|v| json!(v)).collect();
                        Page { items, next_page: values.next_page }
                    }
                    ReadScope::Payments => {
                        let values = page::<PaymentRecord>(&db, &parent, "payments", token, limit).await?;
                        let items = values.items.into_iter().filter(|p| p.chapter_id == chapter && (matches!(claims.role.as_deref(), Some("finance" | "chapter_director")) || p.payer_uid == claims.sub)).map(|v| json!(v)).collect();
                        Page { items, next_page: values.next_page }
                    }
                    ReadScope::JudgeLineup(event) => {
                        event_access(&db, &claims, &chapter, &event, &["judge", "head_judge"]).await?;
                        let values = page::<EntryDocument>(&db, &event_path(&chapter, &event)?, "entries", token, limit).await?;
                        let mut items = vec![];
                        for value in values.items {
                            let entry = value.entry;
                            if entry.chapter_id != chapter || entry.event_id != event || entry.status != EntryStatus::Approved { continue; }
                            let division: DivisionDocument = required(&db, &division_path(&chapter, &event, &entry.division_id)?).await?;
                            if division.policy.id == entry.division_id && division.panel.contains(&claims.sub) { items.push(json!({"entry_id":entry.id,"crew_id":entry.crew_id,"division_id":entry.division_id})); }
                        }
                        Page { items, next_page: values.next_page }
                    }
                    ReadScope::Divisions(event) => {
                        let record: Event =
                            required(&db, &event_path(&chapter, &event)?).await?;
                        if record.id != event || record.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        let values=page::<DivisionDocument>(&db,&event_path(&chapter,&event)?,"divisionState",token,limit).await?;
                        Page {
                            items: values.items.into_iter().map(|value| json!(value.policy)).collect(),
                            next_page: values.next_page,
                        }
                    }
                    ReadScope::DivisionStatus(event) => {
                        let record = event_access(
                            &db,
                            &claims,
                            &chapter,
                            &event,
                            &["head_judge", "chapter_director"],
                        )
                        .await?;
                        if record.id != event || record.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        let values=page::<DivisionDocument>(&db,&event_path(&chapter,&event)?,"divisionState",token,limit).await?;
                        if record.id != event || record.chapter_id != chapter {
                            return Err(forbidden());
                        }
                        Page {
                            items: values.items.into_iter().map(|value| json!({
                                "id": value.policy.id,
                                "name": value.policy.name,
                                "min_members": value.policy.min_members,
                                "max_members": value.policy.max_members,
                                "max_duration_secs": value.policy.max_duration_secs,
                                "locked": value.locked,
                                "publication_id": value.publication_id,
                                "approved_entries": value.approved_entries,
                                "unready_entries": value.unready_entries,
                                "completed_scorecards": value.completed_scorecards,
                                "panel_count": value.panel.len(),
                            })).collect(),
                            next_page: values.next_page,
                        }
                    }
                    ReadScope::Entries(event) => {
                        let record:Event=required(&db,&event_path(&chapter,&event)?).await?;
                        if record.chapter_id!=chapter || record.id!=event {return Err(forbidden());}
                        let staff=matches!(claims.role.as_deref(),Some("registrar"|"chapter_director"));
                        if staff {event_access(&db,&claims,&chapter,&event,&["registrar","chapter_director"]).await?;}
                        let values=page::<EntryDocument>(&db,&event_path(&chapter,&event)?,"entries",token,limit).await?;
                        let mut items=vec![];
                        for value in values.items {
                            let entry=value.entry;
                            if entry.chapter_id!=chapter || entry.event_id!=event {continue;}
                            if staff {items.push(json!(entry));continue;}
                            let crew:Crew=required(&db,&format!("{parent}/crews/{}",segment(&entry.crew_id)?)).await?;
                            if crew.id==entry.crew_id && crew.chapter_id==chapter && (crew.manager_uid==claims.sub || crew.members.iter().any(|m|m.uid==claims.sub)) {items.push(json!(entry));}
                        }
                        Page{items,next_page:values.next_page}
                    }
                };
                Ok(result)
            }.await.map_err(backoff) })
        }).await.map_err(transaction_error)
    }

    pub async fn crew_detail(&self, claims: &Claims, chapter: &str, crew: &str) -> Result<Crew> {
        let input = (claims.clone(), chapter.to_owned(), crew.to_owned());
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, crew) = input.clone();
                Box::pin(async move {
                    async {
                        membership(&db, &claims, &chapter).await?;
                        let document: Crew = required(
                            &db,
                            &format!("chapters/{}/crews/{}", segment(&chapter)?, segment(&crew)?),
                        )
                        .await?;
                        if document.id != crew
                            || document.chapter_id != chapter
                            || !(claims.role.as_deref() == Some("chapter_director")
                                || document.manager_uid == claims.sub
                                || document.members.iter().any(|m| m.uid == claims.sub))
                        {
                            return Err(forbidden());
                        }
                        Ok(document)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }

    pub async fn entry_detail(
        &self,
        claims: &Claims,
        chapter: &str,
        event: &str,
        entry: &str,
    ) -> Result<crate::registration::EntryDetailResponse> {
        let input = (
            claims.clone(),
            chapter.to_owned(),
            event.to_owned(),
            entry.to_owned(),
        );
        self.db
            .run_transaction(|db, _tx| {
                let (claims, chapter, event, entry) = input.clone();
                Box::pin(async move {
                    async {
                        let staff = matches!(
                            claims.role.as_deref(),
                            Some("registrar" | "chapter_director")
                        );
                        let entry =
                            entry_access(&db, &claims, &chapter, &event, &entry, staff).await?;
                        let division = required(
                            &db,
                            &division_path(&chapter, &event, &entry.entry.division_id)?,
                        )
                        .await?;
                        Ok(crate::registration::EntryDetailResponse {
                            pending_minor: entry.pending_minor,
                            readiness: readiness(&entry, &division)?,
                            entry: entry.entry,
                        })
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
