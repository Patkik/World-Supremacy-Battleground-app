use crate::{
    registration::{authenticate, authenticate_identity, AppState, PageQuery},
    repository::{
        AcceptStaffInvitation, ChangeEventAssignment, ChangeJudgePanel, ChangeMembership,
        CreateStaffInvitation, EventAssignmentPage, EventStaffAssignment, JudgePanelConfiguration,
        MembershipPage, MembershipRecord, RevokeStaffInvitation, StaffInvitation,
        StaffInvitationPage,
    },
};

pub async fn list_invitations(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    Query(query): Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<StaffInvitationPage>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_chapter_staff_invitations(
                &claims,
                &chapter,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn create_invitation(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    headers: HeaderMap,
    Json(command): Json<CreateStaffInvitation>,
) -> Result<Json<StaffInvitation>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        if let Some(invitation) = repository
            .chapter_staff_invitation_create_replay(&claims, &chapter, &command)
            .await
            .map_err(StatusCode::from)?
        {
            return Ok(Json(invitation));
        }
        state
            .verifier
            .verify_target_account_active(&command.target_uid)
            .await
            .map_err(crate::auth::VerifyError::status_code)?;
        return repository
            .create_chapter_staff_invitation(&claims, &chapter, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = command;
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn revoke_invitation(
    State(state): State<AppState>,
    Path((chapter, invitation_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(command): Json<RevokeStaffInvitation>,
) -> Result<Json<StaffInvitation>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .revoke_chapter_staff_invitation(&claims, &chapter, &invitation_id, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (invitation_id, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn accept_invitation(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(command): Json<AcceptStaffInvitation>,
) -> Result<Json<MembershipRecord>, StatusCode> {
    let claims = authenticate_identity(&state, &headers).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .accept_chapter_staff_invitation(&claims, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};

pub async fn list_members(
    State(state): State<AppState>,
    Path(chapter): Path<String>,
    Query(query): Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<MembershipPage>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_chapter_staff(&claims, &chapter, query.cursor, query.limit.unwrap_or(30))
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    #[cfg(not(feature = "firestore"))]
    let _ = query;
    let _ = (claims, chapter);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn change_member(
    State(state): State<AppState>,
    Path((chapter, uid)): Path<(String, String)>,
    headers: HeaderMap,
    Json(command): Json<ChangeMembership>,
) -> Result<Json<MembershipRecord>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        if let Some(record) = repository
            .chapter_staff_change_replay(&claims, &chapter, &uid, &command)
            .await
            .map_err(StatusCode::from)?
        {
            return Ok(Json(record));
        }
        if command.active {
            state
                .verifier
                .verify_target_account_active(&uid)
                .await
                .map_err(crate::auth::VerifyError::status_code)?;
        }
        return repository
            .change_chapter_staff(&claims, &chapter, &uid, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, uid, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_event_assignments(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    Query(query): Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<EventAssignmentPage>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_event_staff_assignments(
                &claims,
                &chapter,
                &event,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, event, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn list_stage_marshals(
    State(state): State<AppState>,
    Path((chapter, event)): Path<(String, String)>,
    Query(query): Query<PageQuery>,
    headers: HeaderMap,
) -> Result<Json<crate::repository::models::Page<String>>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .list_eligible_stage_marshals(
                &claims,
                &chapter,
                &event,
                query.cursor,
                query.limit.unwrap_or(30),
            )
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, event, query);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn change_event_assignment(
    State(state): State<AppState>,
    Path((chapter, event, uid)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(command): Json<ChangeEventAssignment>,
) -> Result<Json<EventStaffAssignment>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .change_event_staff_assignment(&claims, &chapter, &event, &uid, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, event, uid, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_judge_panel(
    State(state): State<AppState>,
    Path((chapter, event, division)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Result<Json<JudgePanelConfiguration>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .judge_panel_configuration(&claims, &chapter, &event, &division)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, event, division);
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn change_judge_panel(
    State(state): State<AppState>,
    Path((chapter, event, division)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(command): Json<ChangeJudgePanel>,
) -> Result<Json<JudgePanelConfiguration>, StatusCode> {
    let claims = authenticate(&state, &headers, &chapter).await?;
    #[cfg(feature = "firestore")]
    if let Some(repository) = &state.durable {
        return repository
            .change_judge_panel(&claims, &chapter, &event, &division, command)
            .await
            .map(Json)
            .map_err(StatusCode::from);
    }
    let _ = (claims, chapter, event, division, command);
    Err(StatusCode::NOT_IMPLEMENTED)
}
