use crate::{auth::Claims, domain::Entry, store::RegistrationStore};
use axum::http::StatusCode;

pub fn require_role(claims: &Claims, roles: &[&str]) -> Result<(), StatusCode> {
    if roles
        .iter()
        .any(|role| claims.role.as_deref() == Some(role))
    {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn require_membership(
    store: &RegistrationStore,
    claims: &Claims,
    chapter: &str,
) -> Result<(), StatusCode> {
    let member = store
        .memberships
        .get(&format!("{chapter}/{}", claims.sub))
        .ok_or(StatusCode::FORBIDDEN)?;
    if member.active
        && member.chapter_id == chapter
        && member.uid == claims.sub
        && claims.role.as_deref() == Some(&member.role)
        && claims.auth_time >= member.valid_after
        && member
            .expires_at
            .is_none_or(|expiry| expiry > crate::store::now_secs())
    {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

/// Resolve the actor's current chapter role from server-managed membership state.
/// Signed token role and chapter claims are intentionally not authorization inputs.
pub fn current_membership_role(
    store: &RegistrationStore,
    claims: &Claims,
    chapter: &str,
) -> Result<String, StatusCode> {
    let member = store
        .memberships
        .get(&format!("{chapter}/{}", claims.sub))
        .ok_or(StatusCode::FORBIDDEN)?;
    if member.active
        && member.chapter_id == chapter
        && member.uid == claims.sub
        && claims.auth_time >= member.valid_after
        && member
            .expires_at
            .is_none_or(|expiry| expiry > crate::store::now_secs())
    {
        Ok(member.role.clone())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn require_event(
    store: &RegistrationStore,
    claims: &Claims,
    chapter: &str,
    event: &str,
) -> Result<(), StatusCode> {
    store
        .assert_event(chapter, event)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    if claims.role.as_deref() == Some("chapter_director")
        || store.has_event_assignment(event, &claims.sub)
    {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn crew_access(
    store: &RegistrationStore,
    claims: &Claims,
    chapter: &str,
    crew_id: &str,
    edit: bool,
) -> Result<(), StatusCode> {
    let crew = store
        .crews
        .get(crew_id)
        .filter(|c| c.chapter_id == chapter)
        .ok_or(StatusCode::NOT_FOUND)?;
    let allowed = if edit {
        crew.manager_uid == claims.sub
    } else {
        claims.role.as_deref() == Some("chapter_director")
            || crew.manager_uid == claims.sub
            || crew.members.iter().any(|m| m.uid == claims.sub)
    };
    if allowed {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn entry_access(
    store: &RegistrationStore,
    claims: &Claims,
    chapter: &str,
    event: &str,
    entry_id: &str,
    edit: bool,
) -> Result<Entry, StatusCode> {
    let entry = store
        .assert_entry(chapter, event, entry_id)
        .map_err(|_| StatusCode::NOT_FOUND)?;
    if !edit
        && matches!(
            claims.role.as_deref(),
            Some("chapter_director" | "registrar")
        )
    {
        require_event(store, claims, chapter, event)?;
    } else {
        crew_access(store, claims, chapter, &entry.crew_id, edit)?;
    }
    Ok(entry.clone())
}
