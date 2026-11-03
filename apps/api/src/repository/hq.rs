use super::*;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Serialize)]
struct CountAggregate {
    total: usize,
}

/// Separately provisioned platform authority. Chapter claims never imply this membership.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalMembership {
    pub uid: String,
    pub role: String,
    pub active: bool,
    pub valid_after: u64,
}

pub(super) async fn global_membership(
    db: &FirestoreDb,
    claims: &Claims,
) -> Result<GlobalMembership> {
    let member: GlobalMembership =
        required(db, &format!("globalMembers/{}", segment(&claims.sub)?))
            .await
            .map_err(|error| match error {
                RepositoryError::Denied(StatusCode::NOT_FOUND, _) => forbidden(),
                other => other,
            })?;
    if member.uid != claims.sub
        || !member.active
        || claims.auth_time < member.valid_after
        || member.role != "hq_admin"
    {
        return Err(forbidden());
    }
    Ok(member)
}

impl FirestoreRepository {
    /// Returns platform-wide exact document counts after checking current global authority.
    /// Chapter health and global publication status are deliberately not inferred here.
    pub async fn hq_overview_counts(&self, claims: &Claims) -> Result<(usize, usize)> {
        global_membership(&self.db, claims).await?;
        let chapters: Vec<CountAggregate> = self
            .db
            .fluent()
            .select()
            .from("chapters")
            .aggregate(|a| a.fields([a.field("total").count()]))
            .obj()
            .query()
            .await?;
        let events: Vec<CountAggregate> = self
            .db
            .fluent()
            .select()
            .from("events")
            .all_descendants()
            .aggregate(|a| a.fields([a.field("total").count()]))
            .obj()
            .query()
            .await?;
        let chapter_count = chapters.first().map_or(0, |result| result.total);
        let event_count = events.first().map_or(0, |result| result.total);
        Ok((chapter_count, event_count))
    }

    pub async fn list_hq_chapters(
        &self,
        claims: &Claims,
        cursor: Option<String>,
        limit: usize,
    ) -> Result<Page<crate::domain::Chapter>> {
        if !(1..=100).contains(&limit) || cursor.as_ref().is_some_and(|value| value.len() > 4096) {
            return Err(invalid("Invalid page request"));
        }
        let input = (claims.clone(), cursor);
        self.db
            .run_transaction(|db, _tx| {
                let (claims, cursor) = input.clone();
                Box::pin(async move {
                    async {
                        global_membership(&db, &claims).await?;
                        let page = super::reads::page::<crate::domain::Chapter>(
                            &db, "", "chapters", cursor, limit,
                        )
                        .await?;
                        if page.items.iter().any(|chapter| {
                            segment(&chapter.id).is_err()
                                || chapter.name.trim().is_empty()
                                || chapter.currency.len() != 3
                                || !chapter
                                    .currency
                                    .bytes()
                                    .all(|byte| byte.is_ascii_uppercase())
                        }) {
                            return Err(forbidden());
                        }
                        Ok(page)
                    }
                    .await
                    .map_err(backoff)
                })
            })
            .await
            .map_err(transaction_error)
    }
}
