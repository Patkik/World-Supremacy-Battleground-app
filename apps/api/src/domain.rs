use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Chapter {
    pub id: String,
    pub name: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Event {
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
    pub crew_id: String,
    pub raw_average: f64,
    pub total_deductions: f64,
    pub final_score: f64,
    pub rank: usize,
}
