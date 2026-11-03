use crate::domain::{Deduction, Division, Entry, ScoreReplay};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct DeductionUpdate {
    pub division_id: String,
    pub crew_id: String,
    pub expected_revision: u64,
    pub deductions: Vec<Deduction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Assignment {
    pub uid: String,
    pub event_id: String,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventStaffAssignment {
    pub uid: String,
    pub event_id: String,
    pub active: bool,
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub changed_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MembershipRecord {
    pub uid: String,
    pub chapter_id: String,
    pub role: String,
    pub active: bool,
    pub valid_after: u64,
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub expires_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MembershipPage {
    pub items: Vec<MembershipRecord>,
    pub next_page: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChapterMembershipSummary {
    pub chapter_id: String,
    pub chapter_name: String,
    pub role: String,
}

/// Money and readiness state change atomically with the relevant ledger row.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryDocument {
    pub entry: Entry,
    pub pending_minor: u64,
    pub completed_scorecards: u64,
}

/// A transactional lock barrier, not an eventually consistent query cache.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DivisionDocument {
    pub policy: Division,
    pub panel: Vec<String>,
    pub locked: bool,
    pub generation: u64,
    pub approved_entries: u64,
    pub completed_scorecards: u64,
    pub unready_entries: u64,
    pub publication_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryIndex {
    pub entry_id: String,
    pub crew_id: String,
    pub division_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentReference {
    pub payment_id: String,
    pub entry_id: String,
    pub event_id: String,
    pub payer_uid: String,
    pub amount_minor: u64,
    pub reference: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentLocation {
    pub event_id: String,
    pub entry_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreOperation {
    pub replay: ScoreReplay,
    pub entry_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TechnicalDeductions {
    pub chapter_id: String,
    pub event_id: String,
    pub division_id: String,
    pub crew_id: String,
    pub revision: u64,
    pub deductions: Vec<Deduction>,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PublicEventIndex {
    pub event_id: String,
    pub chapter_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub next_page: Option<String>,
}
