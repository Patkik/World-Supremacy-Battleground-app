use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Chapter {
    pub id: String,
    pub name: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Event {
    #[serde(default)]
    pub registration_closes_at: Option<u64>,
    pub id: String,
    pub chapter_id: String,
    pub name: String,
    pub status: String,
    pub rules_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Division {
    pub id: String,
    pub name: String,
    pub min_members: usize,
    pub max_members: usize,
    pub max_duration_secs: u32,
    pub max_age: Option<u8>,
    pub fee_minor: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum MemberRole {
    Manager,
    Dancer,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CrewMember {
    pub uid: String,
    pub name: String,
    pub role: MemberRole,
    pub is_minor: bool,
    pub consent_verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Crew {
    #[serde(default)]
    pub revision: u64,
    pub id: String,
    pub chapter_id: String,
    pub name: String,
    pub city: String,
    pub manager_uid: String,
    pub members: Vec<CrewMember>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CrewInvitation {
    pub token: String,
    pub crew_id: String,
    pub chapter_id: String,
    pub inviter_uid: String,
    pub role: MemberRole,
    pub expires_at: u64,
    pub used: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EntryStatus {
    Draft,
    Submitted,
    NeedsCorrection,
    Approved,
    Withdrawn,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EntryReadiness {
    pub roster_ready: bool,
    pub roster_count: usize,
    pub min_required: usize,
    pub max_allowed: usize,
    pub music_ready: bool,
    pub consent_ready: bool,
    pub payment_ready: bool,
    pub is_ready: bool,
    pub diagnostics: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Entry {
    #[serde(default)]
    pub rules_version: String,
    #[serde(default)]
    pub revision: u64,
    pub id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub crew_id: String,
    pub division_id: String,
    pub roster: Vec<CrewMember>,
    pub track_filename: Option<String>,
    pub track_duration_secs: Option<u32>,
    pub paid_minor: u64,
    pub status: EntryStatus,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScoreCriteria {
    pub choreography: f64,
    pub musicality: f64,
    pub execution: f64,
    pub stage_presence: f64,
    pub entertainment: f64,
}

impl ScoreCriteria {
    pub fn is_valid(&self) -> bool {
        let in_range = |v: f64| (0.0..=20.0).contains(&v) && !v.is_nan();
        in_range(self.choreography)
            && in_range(self.musicality)
            && in_range(self.execution)
            && in_range(self.stage_presence)
            && in_range(self.entertainment)
    }

    pub fn total(&self) -> f64 {
        self.choreography
            + self.musicality
            + self.execution
            + self.stage_presence
            + self.entertainment
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Deduction {
    pub code: String,
    pub reason: String,
    pub points: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SubmitScoreCommand {
    pub schema_version: u32,
    pub operation_id: String,
    pub division_id: String,
    pub crew_id: String,
    pub expected_revision: u64,
    pub criteria: ScoreCriteria,
    pub deductions: Vec<Deduction>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScoreReceipt {
    pub operation_id: String,
    pub receipt_id: String,
    pub event_id: String,
    pub division_id: String,
    pub crew_id: String,
    pub judge_uid: String,
    pub score_revision: u64,
    pub net_score: f64,
    pub recorded_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CrewResult {
    pub entry_id: String,
    pub crew_id: String,
    pub raw_average: f64,
    pub total_deductions: f64,
    pub final_score: f64,
    pub rank: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    Pending,
    Settled,
    Failed,
    Refunded,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PaymentQuote {
    pub entry_id: String,
    pub division_name: String,
    pub dancer_count: usize,
    pub rate_per_dancer_minor: u64,
    pub total_amount_minor: u64,
    pub currency: String,
    pub paid_amount_minor: u64,
    pub pending_amount_minor: u64,
    pub outstanding_amount_minor: u64,
    pub available_amount_minor: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PaymentRecord {
    pub payment_id: String,
    pub chapter_id: String,
    pub entry_id: String,
    pub payer_uid: String,
    pub amount_minor: u64,
    pub currency: String,
    pub status: PaymentStatus,
    pub provider_reference: String,
    pub created_at: u64,
    pub settled_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyntheticWebhookPayload {
    pub payment_id: String,
    pub status: String,
    #[serde(default)]
    pub amount_minor: Option<u64>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WebhookReceipt {
    pub received: bool,
    pub payment: PaymentRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VerificationStatus {
    Uploading,
    Pending,
    Approved,
    NeedsCorrection,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VerificationPurpose {
    Identity,
    Residency,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VerificationCase {
    pub case_id: String,
    pub chapter_id: String,
    pub dancer_uid: String,
    pub purpose: VerificationPurpose,
    pub status: VerificationStatus,
    pub storage_path: String,
    pub content_type: Option<String>,
    pub size_bytes: Option<u64>,
    pub created_at: u64,
    pub submitted_at: Option<u64>,
    pub reviewed_at: Option<u64>,
    pub reviewer_uid: Option<String>,
    pub reviewer_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FinanceSummary {
    pub chapter_id: String,
    pub total_settled_minor: u64,
    pub total_pending_minor: u64,
    pub total_refunded_minor: u64,
    pub currency: String,
    pub transaction_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CheckInRecord {
    pub pass_id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub dancer_uid: String,
    pub checked_in_at: u64,
    pub scanner_uid: String,
}

/// Operational progression for an entry on a stage. Exceptional outcomes
/// require a separately configured policy and are intentionally not inferred.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StagePosition {
    Holding,
    OnDeck,
    Performing,
    Completed,
}

impl StagePosition {
    pub fn may_advance_to(self, next: Self) -> bool {
        matches!(
            (self, next),
            (Self::Holding, Self::OnDeck)
                | (Self::OnDeck, Self::Performing)
                | (Self::Performing, Self::Completed)
        )
    }
}

#[cfg(test)]
mod stage_position_tests {
    use super::StagePosition::*;

    #[test]
    fn stage_progression_cannot_skip_repeat_or_reverse() {
        let positions = [Holding, OnDeck, Performing, Completed];
        for (from_index, from) in positions.iter().enumerate() {
            for (to_index, to) in positions.iter().enumerate() {
                assert_eq!(from.may_advance_to(*to), to_index == from_index + 1);
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BattleMatch {
    pub match_id: String,
    pub event_id: String,
    pub category: String,
    pub round: String,
    pub red_corner_name: String,
    pub blue_corner_name: String,
    pub votes_red: usize,
    pub votes_blue: usize,
    pub winner_corner: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BattleVotePayload {
    pub winner_corner: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PublishedResultSnapshot {
    pub publication_id: String,
    pub chapter_id: String,
    pub event_id: String,
    pub division_id: String,
    pub results: Vec<CrewResult>,
    pub published_at: u64,
    pub digest: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RecordedScore {
    pub chapter_id: String,
    pub event_id: String,
    pub division_id: String,
    pub crew_id: String,
    pub judge_uid: String,
    pub revision: u64,
    pub criteria: ScoreCriteria,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScoreReplay {
    pub chapter_id: String,
    pub command: SubmitScoreCommand,
    pub receipt: ScoreReceipt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Membership {
    pub uid: String,
    pub chapter_id: String,
    pub role: String,
    pub active: bool,
    pub valid_after: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AuditRecord {
    pub id: String,
    pub actor_uid: String,
    pub chapter_id: String,
    pub action: String,
    pub resource_id: String,
    pub recorded_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DivisionState {
    pub schema_version: u32,
    pub locked: bool,
    pub revision: u64,
    pub criteria: Option<ScoreCriteria>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitGuardianConsentPayload {
    pub operation_id: Option<String>,
    pub guardian_name: String,
    pub signature_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GuardianConsentReceipt {
    pub verified: bool,
    pub minor_uid: String,
    pub guardian_name: String,
    pub signature_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadAudioPayload {
    pub operation_id: Option<String>,
    pub track_filename: String,
    pub track_duration_secs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AudioUploadReceipt {
    pub entry_id: String,
    pub track_filename: String,
    pub track_duration_secs: u32,
    pub compliant: bool,
    pub excess_secs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DJExportTrack {
    pub order: usize,
    pub entry_id: String,
    pub crew_name: String,
    pub original_track: String,
    pub duration_secs: u32,
    pub export_filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DJExportManifest {
    pub event_id: String,
    pub division_id: String,
    pub total_tracks: usize,
    pub manifest: Vec<DJExportTrack>,
}
