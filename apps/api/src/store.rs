use crate::domain::{AuditRecord, DivisionState, Membership, RecordedScore, ScoreReplay};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::domain::{
    AudioUploadReceipt, BattleMatch, Chapter, CheckInCandidate, CheckInCandidatePage,
    CheckInDancerCandidate, CheckInRecord, Crew, CrewInvitation, CrewMember, CrewResult,
    DJExportManifest, DJExportTrack, Deduction, Division, Entry, EntryReadiness, EntryStatus,
    Event, FinanceSummary, GuardianConsentReceipt, MemberRole, PaymentQuote, PaymentRecord,
    PaymentStatus, PublishedResultSnapshot, ScoreReceipt, SubmitScoreCommand,
    SyntheticWebhookPayload, WebhookReceipt,
};

pub(crate) fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub(crate) fn new_id(prefix: &str) -> String {
    let mut bytes = [0u8; 24];
    getrandom::fill(&mut bytes).expect("operating system randomness unavailable");
    format!(
        "{}-{}",
        prefix,
        bytes.iter().map(|b| format!("{b:02x}")).collect::<String>()
    )
}

pub(crate) fn scope_key(parts: &[&str]) -> String {
    // JSON tuples avoid ambiguous user-controlled delimiter concatenation.
    serde_json::to_string(parts).expect("string tuple serializes")
}

pub fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; 32] {
    let mut k = [0u8; 64];
    if key.len() > 64 {
        let hash = Sha256::digest(key);
        k[..32].copy_from_slice(&hash);
    } else {
        k[..key.len()].copy_from_slice(key);
    }
    let mut ipad = [0x36u8; 64];
    let mut opad = [0x5cu8; 64];
    for i in 0..64 {
        ipad[i] ^= k[i];
        opad[i] ^= k[i];
    }
    let mut inner = Sha256::new();
    inner.update(ipad);
    inner.update(message);
    let inner_hash = inner.finalize();

    let mut outer = Sha256::new();
    outer.update(opad);
    outer.update(inner_hash);
    outer.finalize().into()
}

pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter()
        .zip(b.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

pub struct RegistrationStore {
    pub memberships: HashMap<String, Membership>,
    pub event_staff: HashMap<String, HashSet<String>>,
    pub judge_panels: HashMap<String, Vec<String>>,
    pub battle_panels: HashMap<String, Vec<String>>,
    pub battle_votes: HashMap<String, String>,
    pub technical_deductions: HashMap<String, Vec<Deduction>>,
    pub deduction_revisions: HashMap<String, u64>,
    pub audit: Vec<AuditRecord>,
    pub chapters: HashMap<String, Chapter>,
    pub events: HashMap<String, Event>,
    pub divisions: HashMap<String, Vec<Division>>,
    pub crews: HashMap<String, Crew>,
    pub invitations: HashMap<String, CrewInvitation>,
    pub entries: HashMap<String, Entry>,
    pub division_locks: HashMap<String, bool>,
    pub scores: HashMap<String, RecordedScore>,
    pub receipts: HashMap<String, ScoreReplay>,
    pub division_revisions: HashMap<String, u64>,
    pub payments: HashMap<String, PaymentRecord>,
    payment_decisions: HashMap<String, PaymentDecisionReceipt>,
    pub check_ins: HashMap<String, CheckInRecord>,
    pub battle_matches: HashMap<String, BattleMatch>,
    pub published_results: HashMap<String, PublishedResultSnapshot>,
    pub paymongo_events: HashSet<String>,
}

#[derive(Clone)]
struct PaymentDecisionReceipt {
    command_hash: String,
    payment: PaymentRecord,
}

impl Default for RegistrationStore {
    fn default() -> Self {
        Self::new()
    }
}

impl RegistrationStore {
    pub fn empty() -> Self {
        Self {
            memberships: HashMap::new(),
            event_staff: HashMap::new(),
            judge_panels: HashMap::new(),
            battle_panels: HashMap::new(),
            battle_votes: HashMap::new(),
            technical_deductions: HashMap::new(),
            deduction_revisions: HashMap::new(),
            audit: Vec::new(),
            chapters: HashMap::new(),
            events: HashMap::new(),
            divisions: HashMap::new(),
            crews: HashMap::new(),
            invitations: HashMap::new(),
            entries: HashMap::new(),
            division_locks: HashMap::new(),
            scores: HashMap::new(),
            receipts: HashMap::new(),
            division_revisions: HashMap::new(),
            payments: HashMap::new(),
            payment_decisions: HashMap::new(),
            check_ins: HashMap::new(),
            battle_matches: HashMap::new(),
            published_results: HashMap::new(),
            paymongo_events: HashSet::new(),
        }
    }

    pub fn new() -> Self {
        let mut store = Self::empty();
        store.seed_defaults();
        store
    }

    fn seed_defaults(&mut self) {
        self.chapters.insert(
            "ph".into(),
            Chapter {
                id: "ph".into(),
                name: "WSB Philippines".into(),
                currency: "PHP".into(),
            },
        );
        self.chapters.insert(
            "hk".into(),
            Chapter {
                id: "hk".into(),
                name: "WSB Hong Kong".into(),
                currency: "HKD".into(),
            },
        );
        self.chapters.insert(
            "au".into(),
            Chapter {
                id: "au".into(),
                name: "WSB Australia".into(),
                currency: "AUD".into(),
            },
        );

        let event_ph = Event {
            registration_closes_at: None,
            registration_opens_at: None,
            id: "manila-session-2027".into(),
            chapter_id: "ph".into(),
            name: "Manila Session 2027".into(),
            status: "active".into(),
            rules_version: "2027.1".into(),
            event_date: None,
            timezone: None,
            venue: None,
            created_by: None,
            created_at: 0,
            updated_at: 0,
            revision: 0,
        };
        self.events.insert(event_ph.id.clone(), event_ph);

        let event_hk = Event {
            registration_closes_at: None,
            registration_opens_at: None,
            id: "hk-championship-2027".into(),
            chapter_id: "hk".into(),
            name: "Hong Kong World Championship 2027".into(),
            status: "active".into(),
            rules_version: "2027.1".into(),
            event_date: None,
            timezone: None,
            venue: None,
            created_by: None,
            created_at: 0,
            updated_at: 0,
            revision: 0,
        };
        self.events.insert(event_hk.id.clone(), event_hk);

        let standard_divisions = vec![
            Division {
                id: "open-crew".into(),
                name: "Open Crew".into(),
                min_members: 5,
                max_members: 14,
                max_duration_secs: 180,
                max_age: None,
                fee_minor: 120_000, // 1200.00 PHP in minor units
            },
            Division {
                id: "monster-crew".into(),
                name: "Monster Crew".into(),
                min_members: 20,
                max_members: 40,
                max_duration_secs: 240,
                max_age: None,
                fee_minor: 100_000,
            },
            Division {
                id: "varsity-ignite".into(),
                name: "Varsity Ignite (14&U)".into(),
                min_members: 5,
                max_members: 18,
                max_duration_secs: 150,
                max_age: Some(14),
                fee_minor: 110_000,
            },
            Division {
                id: "monster-varsity".into(),
                name: "Monster Varsity (18&U)".into(),
                min_members: 10,
                max_members: 30,
                max_duration_secs: 180,
                max_age: Some(18),
                fee_minor: 110_000,
            },
            Division {
                id: "junior".into(),
                name: "Junior (12&U)".into(),
                min_members: 5,
                max_members: 14,
                max_duration_secs: 150,
                max_age: Some(12),
                fee_minor: 100_000,
            },
        ];

        self.divisions
            .insert("manila-session-2027".into(), standard_divisions.clone());
        self.divisions
            .insert("hk-championship-2027".into(), standard_divisions);

        let sample_crew = Crew {
            revision: 1,
            id: "crew-afterhours".into(),
            chapter_id: "ph".into(),
            name: "Afterhours Collective".into(),
            city: "Manila".into(),
            manager_uid: "dev-manager-1".into(),
            members: vec![
                CrewMember {
                    uid: "dev-manager-1".into(),
                    name: "Kenji Ramos (Manager)".into(),
                    role: MemberRole::Manager,
                    is_minor: false,
                    consent_verified: true,
                },
                CrewMember {
                    uid: "dancer-1".into(),
                    name: "Jolo Santos".into(),
                    role: MemberRole::Dancer,
                    is_minor: false,
                    consent_verified: true,
                },
                CrewMember {
                    uid: "dancer-2".into(),
                    name: "Bea dela Cruz".into(),
                    role: MemberRole::Dancer,
                    is_minor: false,
                    consent_verified: true,
                },
                CrewMember {
                    uid: "dancer-3".into(),
                    name: "Mateo Tan".into(),
                    role: MemberRole::Dancer,
                    is_minor: false,
                    consent_verified: true,
                },
                CrewMember {
                    uid: "dancer-4".into(),
                    name: "Ria Reyes".into(),
                    role: MemberRole::Dancer,
                    is_minor: false,
                    consent_verified: true,
                },
                CrewMember {
                    uid: "dancer-5".into(),
                    name: "Carlo Lim".into(),
                    role: MemberRole::Dancer,
                    is_minor: true,
                    consent_verified: true,
                },
            ],
            created_at: 1700000000,
        };
        self.crews
            .insert(sample_crew.id.clone(), sample_crew.clone());

        let sample_entry = Entry {
            rules_version: "synthetic-legacy-v1".into(),
            revision: 1,
            id: "entry-manila-open-1".into(),
            chapter_id: "ph".into(),
            event_id: "manila-session-2027".into(),
            crew_id: "crew-afterhours".into(),
            division_id: "open-crew".into(),
            roster: sample_crew.members.clone(),
            track_filename: Some("afterhours_manila_cut_v2.mp3".into()),
            track_duration_secs: Some(172),
            paid_minor: 120_000 * 6,
            status: EntryStatus::Submitted,
            created_at: 1700000000,
            updated_at: 1700000000,
        };
        self.entries.insert(sample_entry.id.clone(), sample_entry);

        let sample_payment = PaymentRecord {
            payment_id: "pay-1001".into(),
            chapter_id: "ph".into(),
            entry_id: "entry-manila-open-1".into(),
            payer_uid: "dev-manager-1".into(),
            amount_minor: 120_000 * 6,
            currency: "PHP".into(),
            status: PaymentStatus::Settled,
            provider_reference: "ref-pay-afterhours-1".into(),
            created_at: 1700000000,
            settled_at: Some(1700000000),
        };
        self.payments
            .insert(sample_payment.payment_id.clone(), sample_payment);

        let sample_battle = BattleMatch {
            match_id: "match-101".into(),
            event_id: "manila-session-2027".into(),
            category: "1v1 B-Boy Battle".into(),
            round: "Final".into(),
            red_corner_name: "B-Boy Sonic".into(),
            blue_corner_name: "B-Boy Kidlock".into(),
            votes_red: 0,
            votes_blue: 0,
            winner_corner: None,
            status: "active".into(),
        };
        self.battle_matches
            .insert(sample_battle.match_id.clone(), sample_battle);
        self.battle_panels.insert(
            "match-101".into(),
            vec![
                "staff-judge-1".into(),
                "staff-judge-2".into(),
                "staff-judge-3".into(),
            ],
        );
        self.event_staff.insert(
            "manila-session-2027".into(),
            [
                "staff-judge-1",
                "staff-judge-2",
                "staff-judge-3",
                "staff-head-judge",
            ]
            .map(String::from)
            .into(),
        );
        for uid in ["staff-judge-1", "staff-judge-2", "staff-judge-3"] {
            self.memberships.insert(
                format!("ph/{uid}"),
                Membership {
                    uid: uid.into(),
                    chapter_id: "ph".into(),
                    role: "judge".into(),
                    active: true,
                    valid_after: 0,
                    expires_at: None,
                },
            );
        }
        self.memberships.insert(
            "ph/staff-head-judge".into(),
            Membership {
                uid: "staff-head-judge".into(),
                chapter_id: "ph".into(),
                role: "head_judge".into(),
                active: true,
                valid_after: 0,
                expires_at: None,
            },
        );
    }

    pub fn get_divisions(
        &self,
        chapter_id: &str,
        event_id: &str,
    ) -> Result<Vec<Division>, &'static str> {
        let event = self.events.get(event_id).ok_or("Event not found")?;
        if event.chapter_id != chapter_id {
            return Err("Cross-chapter event query denied");
        }
        Ok(self.divisions.get(event_id).cloned().unwrap_or_default())
    }

    pub fn create_crew(
        &mut self,
        chapter_id: &str,
        manager_uid: &str,
        name: &str,
        city: &str,
    ) -> Result<Crew, &'static str> {
        if name.trim().is_empty() {
            return Err("Crew name cannot be blank");
        }
        if !self.chapters.contains_key(chapter_id) {
            return Err("Chapter not found");
        }
        if self
            .crews
            .values()
            .any(|c| c.chapter_id == chapter_id && c.name.eq_ignore_ascii_case(name.trim()))
        {
            return Err("Crew name already exists in chapter");
        }
        let crew_id = new_id("crew");
        let crew = Crew {
            revision: 1,
            id: crew_id.clone(),
            chapter_id: chapter_id.into(),
            name: name.trim().into(),
            city: city.trim().into(),
            manager_uid: manager_uid.into(),
            members: vec![CrewMember {
                uid: manager_uid.into(),
                name: "Manager".into(),
                role: MemberRole::Manager,
                is_minor: false,
                consent_verified: true,
            }],
            created_at: now_secs(),
        };
        self.crews.insert(crew_id, crew.clone());
        Ok(crew)
    }

    pub fn get_crew(&self, chapter_id: &str, crew_id: &str) -> Result<Crew, &'static str> {
        let crew = self.crews.get(crew_id).ok_or("Crew not found")?;
        if crew.chapter_id != chapter_id {
            return Err("Cross-chapter crew access denied");
        }
        Ok(crew.clone())
    }

    pub fn list_crews_by_chapter(&self, chapter_id: &str) -> Vec<Crew> {
        self.crews
            .values()
            .filter(|c| c.chapter_id == chapter_id)
            .cloned()
            .collect()
    }

    pub fn update_crew(
        &mut self,
        chapter_id: &str,
        crew_id: &str,
        name: &str,
        city: &str,
    ) -> Result<Crew, &'static str> {
        let crew = self.crews.get_mut(crew_id).ok_or("Crew not found")?;
        if crew.chapter_id != chapter_id {
            return Err("Cross-chapter crew update denied");
        }
        if name.trim().is_empty() {
            return Err("Crew name cannot be blank");
        }
        crew.name = name.trim().into();
        crew.city = city.trim().into();
        Ok(crew.clone())
    }

    pub fn create_invitation(
        &mut self,
        chapter_id: &str,
        crew_id: &str,
        inviter_uid: &str,
        role: MemberRole,
    ) -> Result<CrewInvitation, &'static str> {
        let crew = self.crews.get(crew_id).ok_or("Crew not found")?;
        if crew.chapter_id != chapter_id {
            return Err("Cross-chapter invitation denied");
        }
        if crew.manager_uid != inviter_uid {
            return Err("Only the crew manager can issue invitations");
        }
        let token = new_id("inv");
        let invitation = CrewInvitation {
            token: token.clone(),
            crew_id: crew_id.into(),
            chapter_id: chapter_id.into(),
            inviter_uid: inviter_uid.into(),
            role,
            expires_at: now_secs() + 7 * 86400, // 7 days validity
            used: false,
        };
        self.invitations.insert(token, invitation.clone());
        Ok(invitation)
    }

    pub fn accept_invitation(
        &mut self,
        chapter_id: &str,
        token: &str,
        dancer_uid: &str,
        dancer_name: &str,
        is_minor: bool,
    ) -> Result<Crew, &'static str> {
        let inv = self
            .invitations
            .get_mut(token)
            .ok_or("Invitation token not found")?;
        if inv.used {
            return Err("Invitation token already used");
        }
        if inv.expires_at < now_secs() {
            return Err("Invitation has expired");
        }
        if inv.chapter_id != chapter_id {
            return Err("Cross-chapter invitation acceptance denied");
        }

        let crew_id = inv.crew_id.clone();
        let role = inv.role.clone();
        let crew = self.crews.get_mut(&crew_id).ok_or("Crew not found")?;
        if crew.members.iter().any(|m| m.uid == dancer_uid) {
            return Err("Dancer is already a member of this crew");
        }
        if dancer_name.trim().is_empty() {
            return Err("Dancer name cannot be blank");
        }
        inv.used = true;
        crew.members.push(CrewMember {
            uid: dancer_uid.into(),
            name: dancer_name.into(),
            role,
            is_minor,
            consent_verified: !is_minor, // Adults are self-verified; minors require guardian consent
        });
        Ok(crew.clone())
    }

    pub fn create_entry(
        &mut self,
        chapter_id: &str,
        event_id: &str,
        crew_id: &str,
        division_id: &str,
    ) -> Result<Entry, &'static str> {
        let event = self.events.get(event_id).ok_or("Event not found")?;
        if event.chapter_id != chapter_id {
            return Err("Cross-chapter entry creation denied");
        }
        if !matches!(event.status.as_str(), "active" | "registration_open") {
            return Err("Event is not accepting registrations");
        }
        let crew = self.crews.get(crew_id).ok_or("Crew not found")?;
        if crew.chapter_id != chapter_id {
            return Err("Cross-chapter crew entry denied");
        }
        let divisions = self
            .divisions
            .get(event_id)
            .ok_or("Event divisions not configured")?;
        if !divisions.iter().any(|d| d.id == division_id) {
            return Err("Invalid division for event");
        }

        let entry_id = format!("entry-{}-{}-{}", event_id, crew_id, division_id);
        if let Some(existing) = self.entries.get(&entry_id) {
            return Ok(existing.clone());
        }
        let entry = Entry {
            rules_version: event.rules_version.clone(),
            revision: 1,
            id: entry_id.clone(),
            chapter_id: chapter_id.into(),
            event_id: event_id.into(),
            crew_id: crew_id.into(),
            division_id: division_id.into(),
            roster: crew.members.clone(),
            track_filename: None,
            track_duration_secs: None,
            paid_minor: 0,
            status: EntryStatus::Draft,
            created_at: now_secs(),
            updated_at: now_secs(),
        };
        self.entries.insert(entry_id, entry.clone());
        Ok(entry)
    }

    pub fn evaluate_readiness(&self, entry: &Entry) -> Result<EntryReadiness, &'static str> {
        let divisions = self
            .divisions
            .get(&entry.event_id)
            .ok_or("Division configuration missing")?;
        let division = divisions
            .iter()
            .find(|d| d.id == entry.division_id)
            .ok_or("Division not found")?;

        let mut diagnostics = Vec::new();

        // 1. Roster bounds check
        let roster_count = entry.roster.len();
        let roster_ready = if roster_count < division.min_members {
            diagnostics.push(format!(
                "Roster has {} dancers; minimum required for {} is {}",
                roster_count, division.name, division.min_members
            ));
            false
        } else if roster_count > division.max_members {
            diagnostics.push(format!(
                "Roster has {} dancers; maximum allowed for {} is {}",
                roster_count, division.name, division.max_members
            ));
            false
        } else {
            true
        };

        // 2. Audio track check
        let music_ready = match (&entry.track_filename, entry.track_duration_secs) {
            (Some(name), Some(duration)) => {
                let max_allowed = division.max_duration_secs;
                if name.trim().is_empty() || duration == 0 || duration > max_allowed {
                    diagnostics.push(format!(
                        "Track '{}' is {}s; exceeds configured division maximum {}s",
                        name, duration, division.max_duration_secs
                    ));
                    false
                } else {
                    true
                }
            }
            _ => {
                diagnostics.push("Performance track not yet uploaded".into());
                false
            }
        };

        // 3. Consent check
        let unverified_minors: Vec<_> = entry
            .roster
            .iter()
            .filter(|m| m.is_minor && !m.consent_verified)
            .collect();
        let consent_ready = if !unverified_minors.is_empty() {
            diagnostics.push(format!(
                "{} minor dancer(s) pending verified parental/guardian consent",
                unverified_minors.len()
            ));
            false
        } else {
            true
        };

        // 4. Payment check
        let expected_fee = division
            .fee_minor
            .checked_mul(roster_count as u64)
            .ok_or("Fee overflow")?;
        let payment_ready = if entry.paid_minor < expected_fee {
            diagnostics.push(format!(
                "Paid {} minor units out of expected {} minor units",
                entry.paid_minor, expected_fee
            ));
            false
        } else {
            true
        };

        let is_ready = roster_ready && music_ready && consent_ready && payment_ready;

        Ok(EntryReadiness {
            roster_ready,
            roster_count,
            min_required: division.min_members,
            max_allowed: division.max_members,
            music_ready,
            consent_ready,
            payment_ready,
            is_ready,
            diagnostics,
        })
    }

    pub fn submit_entry(
        &mut self,
        chapter_id: &str,
        entry_id: &str,
    ) -> Result<Entry, &'static str> {
        let entry_snapshot = self.entries.get(entry_id).ok_or("Entry not found")?.clone();
        if entry_snapshot.chapter_id != chapter_id {
            return Err("Cross-chapter entry submission denied");
        }
        if !matches!(
            entry_snapshot.status,
            EntryStatus::Draft | EntryStatus::NeedsCorrection | EntryStatus::Submitted
        ) {
            return Err("Entry cannot be resubmitted in its current state");
        }
        let readiness = self.evaluate_readiness(&entry_snapshot)?;
        let entry = self.entries.get_mut(entry_id).ok_or("Entry not found")?;
        if readiness.is_ready {
            entry.status = EntryStatus::Submitted;
        } else {
            entry.status = EntryStatus::NeedsCorrection;
        }
        entry.updated_at = now_secs();
        Ok(entry.clone())
    }

    pub fn list_entries_by_event(&self, chapter_id: &str, event_id: &str) -> Vec<Entry> {
        self.entries
            .values()
            .filter(|e| e.chapter_id == chapter_id && e.event_id == event_id)
            .cloned()
            .collect()
    }

    pub fn check_in_candidates(
        &self,
        chapter_id: &str,
        event_id: &str,
        cursor: Option<&str>,
        limit: usize,
    ) -> Result<CheckInCandidatePage, &'static str> {
        if !(1..=100).contains(&limit) || cursor.is_some_and(|value| value.len() > 20) {
            return Err("Invalid page request");
        }
        let offset = cursor
            .map(str::parse::<usize>)
            .transpose()
            .map_err(|_| "Invalid page cursor")?
            .unwrap_or(0);
        let mut items = self
            .list_entries_by_event(chapter_id, event_id)
            .into_iter()
            .filter(|entry| {
                entry.status == EntryStatus::Approved
                    && self
                        .evaluate_readiness(entry)
                        .is_ok_and(|readiness| readiness.is_ready)
            })
            .map(|entry| CheckInCandidate {
                entry_id: entry.id,
                crew_id: entry.crew_id,
                division_id: entry.division_id,
                dancers: entry
                    .roster
                    .into_iter()
                    .map(|member| CheckInDancerCandidate {
                        uid: member.uid,
                        name: member.name,
                    })
                    .collect(),
            })
            .collect::<Vec<_>>();
        items.sort_by(|left, right| left.entry_id.cmp(&right.entry_id));
        if offset > items.len() {
            return Err("Invalid page cursor");
        }
        let end = offset.saturating_add(limit).min(items.len());
        let page = items[offset..end].to_vec();
        Ok(CheckInCandidatePage {
            items: page,
            next_page: (end < items.len()).then(|| end.to_string()),
        })
    }

    pub fn update_entry_roster(
        &mut self,
        chapter_id: &str,
        entry_id: &str,
        roster: Vec<CrewMember>,
    ) -> Result<Entry, &'static str> {
        let entry = self.entries.get_mut(entry_id).ok_or("Entry not found")?;
        if entry.chapter_id != chapter_id {
            return Err("Cross-chapter entry update denied");
        }
        if entry.status == EntryStatus::Approved {
            return Err("Cannot modify roster of approved entry");
        }
        let crew = self.crews.get(&entry.crew_id).ok_or("Crew not found")?;
        let mut seen = HashSet::new();
        let mut canonical_roster = Vec::new();
        for member in roster {
            if !seen.insert(member.uid.clone()) {
                return Err("Duplicate dancer in roster");
            }
            // Accept selection only. Never trust client-supplied identity or consent flags.
            canonical_roster.push(
                crew.members
                    .iter()
                    .find(|m| m.uid == member.uid)
                    .ok_or("Dancer is not a crew member")?
                    .clone(),
            );
        }
        entry.roster = canonical_roster;
        entry.status = EntryStatus::Draft;
        entry.updated_at = now_secs();
        Ok(entry.clone())
    }

    pub fn review_entry(
        &mut self,
        chapter_id: &str,
        entry_id: &str,
        status: EntryStatus,
    ) -> Result<Entry, &'static str> {
        let snapshot = self.entries.get(entry_id).ok_or("Entry not found")?;
        if snapshot.chapter_id != chapter_id {
            return Err("Cross-chapter review denied");
        }
        if self
            .division_locks
            .get(&scope_key(&[&snapshot.event_id, &snapshot.division_id]))
            == Some(&true)
        {
            return Err("Cannot review entries in a locked division");
        }
        if !matches!(status, EntryStatus::Approved | EntryStatus::NeedsCorrection) {
            return Err("Invalid review decision");
        }
        if status == EntryStatus::Approved && !self.evaluate_readiness(snapshot)?.is_ready {
            return Err("Entry prerequisites are incomplete");
        }
        let entry = self.entries.get_mut(entry_id).ok_or("Entry not found")?;
        entry.status = status;
        entry.updated_at = now_secs();
        Ok(entry.clone())
    }

    pub fn submit_guardian_consent(
        &mut self,
        chapter_id: &str,
        crew_id: &str,
        minor_uid: &str,
        guardian_name: &str,
        signature_date: &str,
    ) -> Result<GuardianConsentReceipt, &'static str> {
        let crew = self.crews.get_mut(crew_id).ok_or("Crew not found")?;
        if crew.chapter_id != chapter_id {
            return Err("Crew not found");
        }
        let member = crew
            .members
            .iter_mut()
            .find(|m| m.uid == minor_uid)
            .ok_or("Minor not found in crew")?;
        if !member.is_minor {
            return Err("Member is not a minor");
        }
        let trimmed = guardian_name.trim();
        if trimmed.is_empty() {
            return Err("Guardian name required");
        }
        if trimmed.chars().count() > 200 || trimmed.chars().any(char::is_control) {
            return Err("Guardian name invalid or exceeds 200 characters");
        }

        member.consent_verified = true;
        crew.revision = crew.revision.saturating_add(1);

        // Propagate to all open entries for this crew in the chapter
        for entry in self.entries.values_mut() {
            if entry.chapter_id == chapter_id
                && entry.crew_id == crew_id
                && entry.status != EntryStatus::Approved
            {
                if let Some(entry_member) = entry.roster.iter_mut().find(|m| m.uid == minor_uid) {
                    entry_member.consent_verified = true;
                    entry.revision = entry.revision.saturating_add(1);
                    entry.updated_at = now_secs();
                }
            }
        }

        Ok(GuardianConsentReceipt {
            verified: true,
            minor_uid: minor_uid.to_string(),
            guardian_name: trimmed.to_string(),
            signature_date: signature_date.to_string(),
        })
    }

    pub fn update_entry_audio(
        &mut self,
        chapter_id: &str,
        event_id: &str,
        entry_id: &str,
        track_filename: &str,
        track_duration_secs: u32,
    ) -> Result<AudioUploadReceipt, &'static str> {
        let trimmed = track_filename.trim();
        if trimmed.is_empty() || track_duration_secs == 0 {
            return Err("Invalid track parameters");
        }
        let entry = self.entries.get_mut(entry_id).ok_or("Entry not found")?;
        if entry.chapter_id != chapter_id || entry.event_id != event_id {
            return Err("Entry not found in chapter/event");
        }
        if entry.status == EntryStatus::Approved {
            return Err("Cannot modify audio of approved entry");
        }

        let divisions = self
            .divisions
            .get(event_id)
            .ok_or("Division configuration missing")?;
        let division = divisions
            .iter()
            .find(|d| d.id == entry.division_id)
            .ok_or("Division not found")?;

        let max_allowed = division.max_duration_secs;
        let compliant = track_duration_secs <= max_allowed;
        let excess_secs = if compliant {
            0
        } else {
            track_duration_secs.saturating_sub(max_allowed)
        };

        entry.track_filename = Some(trimmed.to_string());
        entry.track_duration_secs = Some(track_duration_secs);
        entry.revision = entry.revision.saturating_add(1);
        entry.updated_at = now_secs();

        Ok(AudioUploadReceipt {
            entry_id: entry.id.clone(),
            track_filename: trimmed.to_string(),
            track_duration_secs,
            compliant,
            excess_secs,
        })
    }

    pub fn export_dj_playlist(
        &self,
        chapter_id: &str,
        event_id: &str,
        division_id: &str,
    ) -> Result<DJExportManifest, &'static str> {
        self.assert_event(chapter_id, event_id)?;
        let mut approved_entries: Vec<&Entry> = self
            .entries
            .values()
            .filter(|e| {
                e.chapter_id == chapter_id
                    && e.event_id == event_id
                    && e.division_id == division_id
                    && e.status == EntryStatus::Approved
            })
            .collect();

        // Sort deterministically by created_at then entry id
        approved_entries.sort_by(|a, b| {
            a.created_at
                .cmp(&b.created_at)
                .then_with(|| a.id.cmp(&b.id))
        });

        let tracks: Vec<DJExportTrack> = approved_entries
            .iter()
            .enumerate()
            .map(|(idx, entry)| {
                let order = idx + 1;
                let order_str = format!("{:02}", order);
                let crew = self.crews.get(&entry.crew_id);
                let crew_name = crew.map(|c| c.name.as_str()).unwrap_or("Crew");
                let clean_crew: String = crew_name
                    .chars()
                    .map(|c| {
                        if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                            c
                        } else {
                            '_'
                        }
                    })
                    .collect();
                let export_filename = format!("{}_{}_{}.mp3", order_str, division_id, clean_crew);
                DJExportTrack {
                    order,
                    entry_id: entry.id.clone(),
                    crew_name: crew_name.to_string(),
                    original_track: entry.track_filename.clone().unwrap_or_default(),
                    duration_secs: entry.track_duration_secs.unwrap_or(0),
                    export_filename,
                }
            })
            .collect();

        Ok(DJExportManifest {
            event_id: event_id.to_string(),
            division_id: division_id.to_string(),
            total_tracks: tracks.len(),
            manifest: tracks,
        })
    }

    pub fn assert_event(&self, chapter: &str, event: &str) -> Result<(), &'static str> {
        self.events
            .get(event)
            .filter(|e| e.chapter_id == chapter)
            .map(|_| ())
            .ok_or("Event not found in chapter")
    }

    pub fn assert_entry(
        &self,
        chapter: &str,
        event: &str,
        entry: &str,
    ) -> Result<&Entry, &'static str> {
        self.assert_event(chapter, event)?;
        self.entries
            .get(entry)
            .filter(|e| e.chapter_id == chapter && e.event_id == event)
            .ok_or("Entry not found in event")
    }

    pub fn has_event_assignment(&self, event: &str, uid: &str) -> bool {
        self.event_staff
            .get(event)
            .is_some_and(|staff| staff.contains(uid))
            && self.events.get(event).is_some_and(|e| {
                self.memberships
                    .get(&format!("{}/{}", e.chapter_id, uid))
                    .is_some_and(|m| {
                        m.active
                            && m.chapter_id == e.chapter_id
                            && m.uid == uid
                            && m.expires_at.is_none_or(|expiry| expiry > now_secs())
                    })
            })
    }

    pub fn has_judge_assignment(&self, event: &str, division: &str, uid: &str) -> bool {
        self.has_event_assignment(event, uid)
            && self.events.get(event).is_some_and(|e| {
                self.memberships
                    .get(&format!("{}/{}", e.chapter_id, uid))
                    .is_some_and(|m| matches!(m.role.as_str(), "judge" | "head_judge"))
            })
            && self
                .judge_panels
                .get(&scope_key(&[event, division]))
                .is_some_and(|panel| panel.iter().any(|id| id == uid))
    }

    pub fn set_judge_panel(
        &mut self,
        event: &str,
        division: &str,
        panel: Vec<String>,
    ) -> Result<(), &'static str> {
        let chapter = self
            .events
            .get(event)
            .ok_or("Event not found")?
            .chapter_id
            .clone();
        if !self
            .get_divisions(&chapter, event)?
            .iter()
            .any(|d| d.id == division)
        {
            return Err("Division not found");
        }
        let key = scope_key(&[event, division]);
        if self.division_locks.get(&key) == Some(&true)
            || self
                .scores
                .values()
                .any(|s| s.event_id == event && s.division_id == division)
        {
            return Err("Cannot change panel after scoring begins");
        }
        if panel.is_empty() || panel.iter().collect::<HashSet<_>>().len() != panel.len() {
            return Err("Invalid judge panel");
        }
        for uid in &panel {
            if !self.has_event_assignment(event, uid) {
                return Err("Judge has no event assignment");
            }
        }
        self.judge_panels.insert(key, panel);
        Ok(())
    }

    pub fn division_state(
        &self,
        chapter: &str,
        event: &str,
        division: &str,
        crew: &str,
        judge: &str,
    ) -> Result<DivisionState, &'static str> {
        self.assert_event(chapter, event)?;
        if !self.has_judge_assignment(event, division, judge) {
            return Err("Judge not assigned to division");
        }
        if !self.entries.values().any(|e| {
            e.event_id == event
                && e.division_id == division
                && e.crew_id == crew
                && e.status == EntryStatus::Approved
        }) {
            return Err("Approved crew entry not found");
        }
        let score = self.scores.get(&scope_key(&[event, division, crew, judge]));
        Ok(DivisionState {
            schema_version: 1,
            locked: self.division_locks.get(&scope_key(&[event, division])) == Some(&true),
            revision: score.map_or(0, |s| s.revision),
            criteria: score.map(|s| s.criteria.clone()),
        })
    }

    pub fn submit_score(
        &mut self,
        chapter: &str,
        event: &str,
        judge: &str,
        cmd: SubmitScoreCommand,
    ) -> Result<ScoreReceipt, &'static str> {
        // Revalidate tenant and current assignment even for receipt replays.
        self.division_state(chapter, event, &cmd.division_id, &cmd.crew_id, judge)?;
        if cmd.schema_version != 1 || cmd.operation_id.is_empty() || cmd.operation_id.len() > 128 {
            return Err("Unsupported command version or operation ID");
        }
        let replay_key = scope_key(&[judge, &cmd.operation_id]);
        if let Some(existing) = self.receipts.get(&replay_key) {
            if existing.chapter_id != chapter
                || existing.receipt.event_id != event
                || existing.command != cmd
            {
                return Err("Operation ID payload mismatch");
            }
            return Ok(existing.receipt.clone());
        }
        let state = self.division_state(chapter, event, &cmd.division_id, &cmd.crew_id, judge)?;
        if state.locked {
            return Err("Division is locked; cannot submit scores");
        }
        if !cmd.criteria.is_valid() {
            return Err("Invalid criteria scores");
        }
        if !cmd.deductions.is_empty() {
            return Err("Deductions require the technical judge command");
        }
        if cmd.expected_revision != state.revision {
            return Err("Score revision mismatch");
        }
        let revision = state.revision + 1;
        let key = scope_key(&[event, &cmd.division_id, &cmd.crew_id, judge]);
        self.scores.insert(
            key,
            RecordedScore {
                chapter_id: chapter.into(),
                event_id: event.into(),
                division_id: cmd.division_id.clone(),
                crew_id: cmd.crew_id.clone(),
                judge_uid: judge.into(),
                revision,
                criteria: cmd.criteria.clone(),
            },
        );
        let receipt = ScoreReceipt {
            operation_id: cmd.operation_id.clone(),
            receipt_id: new_id("receipt"),
            event_id: event.into(),
            division_id: cmd.division_id.clone(),
            crew_id: cmd.crew_id.clone(),
            judge_uid: judge.into(),
            score_revision: revision,
            net_score: cmd.criteria.total(),
            recorded_at: now_secs(),
        };
        self.receipts.insert(
            replay_key,
            ScoreReplay {
                chapter_id: chapter.into(),
                command: cmd,
                receipt: receipt.clone(),
            },
        );
        Ok(receipt)
    }

    pub fn set_deductions(
        &mut self,
        chapter: &str,
        event: &str,
        division: &str,
        crew: &str,
        expected_revision: u64,
        deductions: Vec<Deduction>,
    ) -> Result<u64, &'static str> {
        self.assert_event(chapter, event)?;
        if self.division_locks.get(&scope_key(&[event, division])) == Some(&true) {
            return Err("Division is locked");
        }
        if !self.entries.values().any(|e| {
            e.event_id == event
                && e.division_id == division
                && e.crew_id == crew
                && e.status == EntryStatus::Approved
        }) {
            return Err("Approved entry not found");
        }
        if deductions.iter().any(|d| {
            !d.points.is_finite()
                || !(0.0..=100.0).contains(&d.points)
                || d.code.trim().is_empty()
                || d.reason.trim().is_empty()
        }) {
            return Err("Invalid deduction");
        }
        let key = scope_key(&[event, division, crew]);
        let revision = *self.deduction_revisions.get(&key).unwrap_or(&0);
        // Exact replay succeeds; changed stale commands never overwrite newer deductions.
        if expected_revision.checked_add(1) == Some(revision)
            && self.technical_deductions.get(&key) == Some(&deductions)
        {
            return Ok(revision);
        }
        if expected_revision != revision {
            return Err("Deduction revision mismatch");
        }
        self.technical_deductions.insert(key.clone(), deductions);
        self.deduction_revisions.insert(key, revision + 1);
        Ok(revision + 1)
    }

    pub fn lock_division(
        &mut self,
        chapter: &str,
        event: &str,
        division: &str,
    ) -> Result<bool, &'static str> {
        self.assert_event(chapter, event)?;
        let key = scope_key(&[event, division]);
        let panel = self
            .judge_panels
            .get(&key)
            .ok_or("Judge panel not configured")?;
        if panel.is_empty() {
            return Err("Judge panel is empty");
        }
        let entries: Vec<_> = self
            .entries
            .values()
            .filter(|e| {
                e.event_id == event
                    && e.division_id == division
                    && e.status == EntryStatus::Approved
            })
            .collect();
        if entries.is_empty() {
            return Err("No approved entries to lock");
        }
        for entry in entries {
            if !self.evaluate_readiness(entry)?.is_ready {
                return Err("Entry readiness changed; reconcile before locking");
            }
            for judge in panel {
                if !self.has_judge_assignment(event, division, judge)
                    || !self.scores.contains_key(&scope_key(&[
                        event,
                        division,
                        &entry.crew_id,
                        judge,
                    ]))
                {
                    return Err("Judge score missing or assignment revoked");
                }
            }
        }
        self.division_locks.insert(key, true);
        Ok(true)
    }

    pub fn get_division_results(
        &self,
        chapter: &str,
        event: &str,
        division: &str,
    ) -> Result<Vec<CrewResult>, &'static str> {
        self.assert_event(chapter, event)?;
        let mut grouped: HashMap<String, Vec<f64>> = HashMap::new();
        for score in self
            .scores
            .values()
            .filter(|s| s.event_id == event && s.division_id == division && s.chapter_id == chapter)
        {
            if !self.entries.values().any(|e| {
                e.event_id == event
                    && e.division_id == division
                    && e.crew_id == score.crew_id
                    && e.status == EntryStatus::Approved
            }) {
                continue;
            }
            grouped
                .entry(score.crew_id.clone())
                .or_default()
                .push(score.criteria.total());
        }
        let mut results: Vec<_> = grouped
            .into_iter()
            .map(|(crew_id, totals)| {
                let raw_average = totals.iter().sum::<f64>() / totals.len() as f64;
                let deductions = self
                    .technical_deductions
                    .get(&scope_key(&[event, division, &crew_id]))
                    .map_or(0.0, |v| v.iter().map(|d| d.points).sum());
                CrewResult {
                    entry_id: self
                        .entries
                        .values()
                        .find(|e| {
                            e.event_id == event && e.division_id == division && e.crew_id == crew_id
                        })
                        .map(|e| e.id.clone())
                        .unwrap_or_default(),
                    crew_id,
                    raw_average,
                    total_deductions: deductions,
                    final_score: ((raw_average - deductions).max(0.0) * 100.0).round() / 100.0,
                    rank: 0,
                }
            })
            .collect();
        results.sort_by(|a, b| {
            b.final_score
                .total_cmp(&a.final_score)
                .then_with(|| a.crew_id.cmp(&b.crew_id))
        });
        for i in 0..results.len() {
            results[i].rank = if i > 0 && results[i].final_score == results[i - 1].final_score {
                results[i - 1].rank
            } else {
                i + 1
            };
        }
        Ok(results)
    }

    // Phase 2: Financial Ledger & Payment Reconciliation
    pub fn get_payment_quote(
        &self,
        chapter_id: &str,
        event_id: &str,
        entry_id: &str,
    ) -> Result<PaymentQuote, &'static str> {
        let entry = self.entries.get(entry_id).ok_or("Entry not found")?;
        if entry.chapter_id != chapter_id || entry.event_id != event_id {
            return Err("Cross-chapter entry quote access denied");
        }
        let divisions = self
            .divisions
            .get(event_id)
            .ok_or("Divisions not configured")?;
        let division = divisions
            .iter()
            .find(|d| d.id == entry.division_id)
            .ok_or("Division not found")?;
        let chapter = self.chapters.get(chapter_id).ok_or("Chapter not found")?;

        let dancer_count = entry.roster.len();
        let total_amount_minor = division
            .fee_minor
            .checked_mul(dancer_count as u64)
            .ok_or("Fee overflow")?;

        let pending = self
            .payments
            .values()
            .filter(|p| {
                p.chapter_id == chapter_id
                    && p.entry_id == entry_id
                    && p.status == PaymentStatus::Pending
            })
            .try_fold(0u64, |sum, p| sum.checked_add(p.amount_minor))
            .ok_or("Payment overflow")?;
        let outstanding = total_amount_minor.saturating_sub(entry.paid_minor);
        Ok(PaymentQuote {
            entry_id: entry_id.into(),
            division_name: division.name.clone(),
            dancer_count,
            rate_per_dancer_minor: division.fee_minor,
            total_amount_minor,
            currency: chapter.currency.clone(),
            paid_amount_minor: entry.paid_minor,
            pending_amount_minor: pending,
            outstanding_amount_minor: outstanding,
            available_amount_minor: outstanding.saturating_sub(pending),
        })
    }

    pub fn process_payment(
        &mut self,
        chapter_id: &str,
        entry_id: &str,
        payer_uid: &str,
        provider_ref: &str,
    ) -> Result<PaymentRecord, &'static str> {
        self.process_payment_amount(chapter_id, entry_id, payer_uid, provider_ref, None)
    }

    pub fn process_payment_amount(
        &mut self,
        chapter_id: &str,
        entry_id: &str,
        payer_uid: &str,
        provider_ref: &str,
        requested_amount: Option<u64>,
    ) -> Result<PaymentRecord, &'static str> {
        let entry = self.entries.get(entry_id).ok_or("Entry not found")?.clone();
        if entry.chapter_id != chapter_id {
            return Err("Cross-chapter payment denied");
        }
        let provider_ref = provider_ref.trim();
        if provider_ref.is_empty() || provider_ref.len() > 200 {
            return Err("Invalid payment reference");
        }
        if let Some(existing) = self
            .payments
            .values()
            .find(|p| p.chapter_id == chapter_id && p.provider_reference == provider_ref)
        {
            if existing.entry_id != entry_id
                || existing.payer_uid != payer_uid
                || requested_amount.is_some_and(|amount| amount != existing.amount_minor)
            {
                return Err("Provider reference already used with different amount");
            }
            return Ok(existing.clone());
        }
        let quote = self.get_payment_quote(chapter_id, &entry.event_id, entry_id)?;
        let reserved = self
            .payments
            .values()
            .filter(|p| p.entry_id == entry_id && p.status == PaymentStatus::Pending)
            .try_fold(0u64, |sum, p| sum.checked_add(p.amount_minor))
            .ok_or("Payment overflow")?;
        let amount = quote
            .total_amount_minor
            .saturating_sub(entry.paid_minor)
            .saturating_sub(reserved);
        if requested_amount == Some(0) {
            return Err("Payment amount must be greater than zero");
        }
        if amount == 0 {
            return Err("No outstanding balance available for payment");
        }
        let amount = requested_amount.unwrap_or(amount);
        if amount == 0 || amount > quote.available_amount_minor {
            return Err("Payment amount exceeds available balance");
        }
        let payment_id = new_id("pay");
        let payment = PaymentRecord {
            payment_id: payment_id.clone(),
            chapter_id: chapter_id.into(),
            entry_id: entry_id.into(),
            payer_uid: payer_uid.into(),
            amount_minor: amount,
            currency: quote.currency,
            status: PaymentStatus::Pending,
            provider_reference: provider_ref.into(),
            created_at: now_secs(),
            settled_at: None,
        };
        // A payer's reference is a reconciliation request, never evidence of settlement.
        self.payments.insert(payment_id, payment.clone());
        Ok(payment)
    }

    pub fn reconcile_payment(
        &mut self,
        chapter: &str,
        payment_id: &str,
        approve: bool,
        actor: &str,
        operation_id: &str,
        reason: &str,
    ) -> Result<PaymentRecord, &'static str> {
        let reason = reason.trim();
        if operation_id.is_empty()
            || operation_id.len() > 128
            || reason.chars().count() < 8
            || reason.chars().count() > 1000
            || reason.chars().any(char::is_control)
        {
            return Err("A valid operation ID and an 8–1000 character reason are required");
        }
        let receipt_key = scope_key(&[chapter, actor, operation_id]);
        let command_hash = Sha256::digest(
            serde_json::to_vec(&(payment_id, approve, reason)).expect("command serializes"),
        )
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
        if let Some(receipt) = self.payment_decisions.get(&receipt_key) {
            return if receipt.command_hash == command_hash {
                Ok(receipt.payment.clone())
            } else {
                Err("Payment operation ID already used with different input")
            };
        }
        let snapshot = self
            .payments
            .get(payment_id)
            .filter(|p| p.chapter_id == chapter)
            .ok_or("Payment not found")?
            .clone();
        let target = if approve {
            PaymentStatus::Settled
        } else {
            PaymentStatus::Failed
        };
        if snapshot.status != PaymentStatus::Pending {
            return Err("Only pending payments may be reconciled");
        }
        let entry = self
            .entries
            .get_mut(&snapshot.entry_id)
            .filter(|e| e.chapter_id == chapter)
            .ok_or("Entry not found")?;
        if approve {
            entry.paid_minor = entry
                .paid_minor
                .checked_add(snapshot.amount_minor)
                .ok_or("Payment overflow")?;
        }
        entry.updated_at = now_secs();
        let payment = self
            .payments
            .get_mut(payment_id)
            .ok_or("Payment not found")?;
        payment.status = target;
        payment.settled_at = if approve { Some(now_secs()) } else { None };
        let result = payment.clone();
        let audit_id = new_id("audit");
        self.record_audit_with_reason(
            chapter,
            actor,
            "payment_reconciled",
            payment_id,
            reason,
            audit_id.clone(),
        );
        self.payment_decisions.insert(
            receipt_key,
            PaymentDecisionReceipt {
                command_hash,
                payment: result.clone(),
            },
        );
        Ok(result)
    }

    pub fn refund_payment(
        &mut self,
        chapter_id: &str,
        payment_id: &str,
        actor: &str,
        operation_id: &str,
        reason: &str,
    ) -> Result<PaymentRecord, &'static str> {
        let reason = reason.trim();
        if operation_id.is_empty()
            || operation_id.len() > 128
            || reason.chars().count() < 8
            || reason.chars().count() > 1000
            || reason.chars().any(char::is_control)
        {
            return Err("A valid operation ID and an 8–1000 character reason are required");
        }
        let receipt_key = scope_key(&[chapter_id, actor, operation_id]);
        let command_hash = Sha256::digest(
            serde_json::to_vec(&(payment_id, "refunded", reason)).expect("command serializes"),
        )
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
        if let Some(receipt) = self.payment_decisions.get(&receipt_key) {
            return if receipt.command_hash == command_hash {
                Ok(receipt.payment.clone())
            } else {
                Err("Payment operation ID already used with different input")
            };
        }
        let payment = self
            .payments
            .get_mut(payment_id)
            .ok_or("Payment not found")?;
        if payment.chapter_id != chapter_id {
            return Err("Cross-chapter refund denied");
        }
        if crate::domain::is_provider_payment_reference(&payment.provider_reference) {
            return Err("Provider refunds require reconciliation");
        }
        if payment.status != PaymentStatus::Settled {
            return Err("Only settled payments can be refunded");
        }
        payment.status = PaymentStatus::Refunded;
        let entry_id = payment.entry_id.clone();
        let amount = payment.amount_minor;

        if let Some(entry) = self.entries.get_mut(&entry_id) {
            entry.paid_minor = entry.paid_minor.saturating_sub(amount);
            entry.updated_at = now_secs();
        }

        let result = payment.clone();
        let audit_id = new_id("audit");
        self.record_audit_with_reason(
            chapter_id,
            actor,
            "payment_refund_recorded",
            payment_id,
            reason,
            audit_id.clone(),
        );
        self.payment_decisions.insert(
            receipt_key,
            PaymentDecisionReceipt {
                command_hash,
                payment: result.clone(),
            },
        );
        Ok(result)
    }

    pub fn list_payments(&self, chapter_id: &str) -> Vec<PaymentRecord> {
        self.payments
            .values()
            .filter(|p| p.chapter_id == chapter_id)
            .cloned()
            .collect()
    }

    pub fn get_finance_summary(&self, chapter_id: &str) -> FinanceSummary {
        let chapter_payments: Vec<_> = self
            .payments
            .values()
            .filter(|p| p.chapter_id == chapter_id)
            .collect();
        let currency = self
            .chapters
            .get(chapter_id)
            .map(|c| c.currency.clone())
            .unwrap_or_else(|| "PHP".into());

        let mut total_settled_minor = 0;
        let mut total_pending_minor = 0;
        let mut total_refunded_minor = 0;

        for p in &chapter_payments {
            match p.status {
                PaymentStatus::Settled => total_settled_minor += p.amount_minor,
                PaymentStatus::Pending => total_pending_minor += p.amount_minor,
                PaymentStatus::Refunded => total_refunded_minor += p.amount_minor,
                PaymentStatus::Failed => {}
            }
        }

        FinanceSummary {
            chapter_id: chapter_id.into(),
            total_settled_minor,
            total_pending_minor,
            total_refunded_minor,
            currency,
            transaction_count: chapter_payments.len(),
        }
    }

    pub fn process_synthetic_webhook(
        &mut self,
        chapter_id: Option<&str>,
        payload: &SyntheticWebhookPayload,
    ) -> Result<WebhookReceipt, &'static str> {
        let payment_id = payload.payment_id.trim();
        if payment_id.is_empty() {
            return Err("Payment id required");
        }
        let payment = self
            .payments
            .get(payment_id)
            .ok_or("Payment record not found")?
            .clone();

        if let Some(chapter) = chapter_id {
            if payment.chapter_id != chapter {
                return Err("Payment record not found");
            }
        }

        if payload.status == "settled" {
            if payment.status == PaymentStatus::Pending {
                let entry = self
                    .entries
                    .get_mut(&payment.entry_id)
                    .ok_or("Entry not found")?;
                entry.paid_minor = entry
                    .paid_minor
                    .checked_add(payment.amount_minor)
                    .ok_or("Payment overflow")?;
                entry.updated_at = now_secs();

                let payment_mut = self
                    .payments
                    .get_mut(payment_id)
                    .ok_or("Payment record not found")?;
                payment_mut.status = PaymentStatus::Settled;
                payment_mut.settled_at = Some(now_secs());
                return Ok(WebhookReceipt {
                    received: true,
                    payment: payment_mut.clone(),
                });
            } else if payment.status == PaymentStatus::Settled {
                return Ok(WebhookReceipt {
                    received: true,
                    payment,
                });
            }
        }

        Ok(WebhookReceipt {
            received: true,
            payment,
        })
    }

    pub fn settle_paymongo_event(
        &mut self,
        event: &crate::paymongo::PaymongoEvent,
    ) -> Result<PaymentRecord, &'static str> {
        if matches!(
            event.event_type,
            crate::paymongo::PaymongoEventType::PaymentRefunded
        ) {
            return Err("Provider refund reconciliation is unavailable");
        }
        match &event.event_type {
            crate::paymongo::PaymongoEventType::CheckoutSessionPaid => {
                let session_id = event.session_id.as_deref().unwrap_or_default();
                if self.paymongo_events.contains(&event.event_id) {
                    if let Some(p) = self.payments.values().find(|p| {
                        p.provider_reference == session_id
                            || p.payment_id == event.reference_number.as_deref().unwrap_or("")
                    }) {
                        return Ok(p.clone());
                    }
                }
                let amount = event.payment.as_ref().map(|p| p.amount_minor).unwrap_or(0);
                let currency = event
                    .payment
                    .as_ref()
                    .map(|p| p.currency.as_str())
                    .unwrap_or("PHP");
                let ref_num = event.reference_number.as_deref().unwrap_or("");

                let target_id = if let Some(p) = self
                    .payments
                    .values()
                    .find(|p| p.payment_id == ref_num || p.provider_reference == session_id)
                {
                    p.payment_id.clone()
                } else if let Some(entry) = self.entries.get(ref_num) {
                    let pay_id = format!("pay_pm_{}", event.event_id);
                    let new_pay = PaymentRecord {
                        payment_id: pay_id.clone(),
                        chapter_id: entry.chapter_id.clone(),
                        entry_id: entry.id.clone(),
                        payer_uid: "paymongo_customer".to_string(),
                        amount_minor: amount,
                        currency: currency.to_string(),
                        status: PaymentStatus::Pending,
                        provider_reference: session_id.to_string(),
                        created_at: now_secs(),
                        settled_at: None,
                    };
                    self.payments.insert(pay_id.clone(), new_pay);
                    pay_id
                } else {
                    return Err("No matching payment or entry found");
                };

                let payment = self
                    .payments
                    .get_mut(&target_id)
                    .ok_or("Payment record not found")?;
                if payment.status == PaymentStatus::Pending {
                    let entry = self
                        .entries
                        .get_mut(&payment.entry_id)
                        .ok_or("Entry not found")?;
                    entry.paid_minor = entry
                        .paid_minor
                        .checked_add(payment.amount_minor)
                        .ok_or("Payment overflow")?;
                    entry.updated_at = now_secs();
                    payment.status = PaymentStatus::Settled;
                    payment.settled_at = Some(now_secs());
                    payment.provider_reference = session_id.to_string();
                }
                self.paymongo_events.insert(event.event_id.clone());
                Ok(payment.clone())
            }
            crate::paymongo::PaymongoEventType::PaymentRefunded => {
                let p_id = event
                    .payment
                    .as_ref()
                    .map(|p| p.payment_id.as_str())
                    .unwrap_or_default();
                if self.paymongo_events.contains(&event.event_id) {
                    if let Some(p) = self
                        .payments
                        .values()
                        .find(|p| p.payment_id == p_id || p.provider_reference == p_id)
                    {
                        return Ok(p.clone());
                    }
                }
                let target_id = self
                    .payments
                    .values()
                    .find(|p| p.payment_id == p_id || p.provider_reference == p_id)
                    .map(|p| p.payment_id.clone())
                    .ok_or("Payment not found for refund")?;

                let payment = self
                    .payments
                    .get_mut(&target_id)
                    .ok_or("Payment not found")?;
                if payment.status == PaymentStatus::Settled {
                    let entry = self
                        .entries
                        .get_mut(&payment.entry_id)
                        .ok_or("Entry not found")?;
                    entry.paid_minor = entry.paid_minor.saturating_sub(payment.amount_minor);
                    entry.updated_at = now_secs();
                    payment.status = PaymentStatus::Refunded;
                }
                self.paymongo_events.insert(event.event_id.clone());
                Ok(payment.clone())
            }
            _ => {
                self.paymongo_events.insert(event.event_id.clone());
                let ack = PaymentRecord {
                    payment_id: "evt_ack".to_string(),
                    chapter_id: "global".to_string(),
                    entry_id: String::new(),
                    payer_uid: String::new(),
                    amount_minor: 0,
                    currency: "PHP".to_string(),
                    status: PaymentStatus::Settled,
                    provider_reference: String::new(),
                    created_at: now_secs(),
                    settled_at: Some(now_secs()),
                };
                Ok(ack)
            }
        }
    }

    // Phase 3: Venue Operations, Battles & Public Publication
    pub fn check_in_dancer(
        &mut self,
        chapter: &str,
        event: &str,
        dancer: &str,
        scanner: &str,
    ) -> Result<CheckInRecord, &'static str> {
        self.assert_event(chapter, event)?;
        let entry = self
            .entries
            .values()
            .find(|e| {
                e.chapter_id == chapter
                    && e.event_id == event
                    && e.status == EntryStatus::Approved
                    && e.roster.iter().any(|m| m.uid == dancer)
            })
            .ok_or("No approved dancer entry")?;
        if !self.evaluate_readiness(entry)?.is_ready {
            return Err("Dancer entry is not ready for check-in");
        }
        let key = scope_key(&[chapter, event, dancer]);
        if let Some(existing) = self.check_ins.get(&key) {
            return Ok(existing.clone());
        }
        let record = CheckInRecord {
            pass_id: new_id("pass"),
            chapter_id: chapter.into(),
            event_id: event.into(),
            dancer_uid: dancer.into(),
            checked_in_at: now_secs(),
            scanner_uid: scanner.into(),
        };
        self.check_ins.insert(key, record.clone());
        Ok(record)
    }

    pub fn list_check_ins(&self, chapter_id: &str, event_id: &str) -> Vec<CheckInRecord> {
        self.check_ins
            .values()
            .filter(|c| c.chapter_id == chapter_id && c.event_id == event_id)
            .cloned()
            .collect()
    }

    pub fn list_battle_matches(&self, event_id: &str) -> Vec<BattleMatch> {
        self.battle_matches
            .values()
            .filter(|m| m.event_id == event_id)
            .cloned()
            .collect()
    }

    pub fn get_battle_match(
        &self,
        event_id: &str,
        match_id: &str,
    ) -> Result<BattleMatch, &'static str> {
        let m = self
            .battle_matches
            .get(match_id)
            .ok_or("Battle match not found")?;
        if m.event_id != event_id {
            return Err("Battle match not found in event");
        }
        Ok(m.clone())
    }

    pub fn vote_battle(
        &mut self,
        event: &str,
        match_id: &str,
        judge: &str,
        corner: &str,
    ) -> Result<BattleMatch, &'static str> {
        if !matches!(corner, "red" | "blue") {
            return Err("Invalid corner");
        }
        let panel = self
            .battle_panels
            .get(match_id)
            .ok_or("Battle panel not configured")?;
        if !self.has_event_assignment(event, judge)
            || !panel.iter().any(|id| id == judge)
            || !matches!(panel.len(), 3 | 5)
        {
            return Err("Judge not assigned to battle");
        }
        let record = self
            .battle_matches
            .get(match_id)
            .filter(|m| m.event_id == event)
            .ok_or("Match not found in event")?;
        let key = scope_key(&[event, match_id, judge]);
        if let Some(existing) = self.battle_votes.get(&key) {
            return if existing == corner {
                Ok(record.clone())
            } else {
                Err("Battle ballot already cast")
            };
        }
        if record.status != "active" && record.status != "live" {
            return Err("Battle voting is closed");
        }
        self.battle_votes.insert(key, corner.into());
        let record = self
            .battle_matches
            .get_mut(match_id)
            .ok_or("Match not found")?;
        if corner == "red" {
            record.votes_red += 1;
        } else {
            record.votes_blue += 1;
        }
        let majority = panel.len() / 2 + 1;
        if record.votes_red >= majority || record.votes_blue >= majority {
            record.winner_corner = Some(
                if record.votes_red >= majority {
                    "red"
                } else {
                    "blue"
                }
                .into(),
            );
            record.status = "closed".into();
        }
        Ok(record.clone())
    }

    pub fn publish_division_results(
        &mut self,
        chapter: &str,
        event: &str,
        division: &str,
    ) -> Result<PublishedResultSnapshot, &'static str> {
        self.publish_division_results_with_payload(chapter, event, division, None)
    }

    pub fn publish_division_results_with_policy(
        &mut self,
        chapter: &str,
        event: &str,
        division: &str,
        allow_ties: Option<bool>,
    ) -> Result<PublishedResultSnapshot, &'static str> {
        let payload = crate::event_ops::PublishDivisionPayload { allow_ties };
        self.publish_division_results_with_payload(chapter, event, division, Some(&payload))
    }

    pub fn publish_division_results_with_payload(
        &mut self,
        chapter: &str,
        event: &str,
        division: &str,
        payload: Option<&crate::event_ops::PublishDivisionPayload>,
    ) -> Result<PublishedResultSnapshot, &'static str> {
        self.assert_event(chapter, event)?;
        let key = scope_key(&[event, division]);
        if self.division_locks.get(&key) != Some(&true) {
            return Err("Division must be locked before publication");
        }
        if let Some(existing) = self.published_results.get(&key) {
            return Ok(existing.clone());
        }
        let results = self.get_division_results(chapter, event, division)?;
        if results.is_empty() {
            return Err("No results to publish");
        }
        let allow_ties = payload.and_then(|p| p.allow_ties).unwrap_or(false);
        if !allow_ties && results.windows(2).any(|pair| pair[0].rank == pair[1].rank) {
            return Err("Tied results require an approved tie policy before publication");
        }
        let digest = Sha256::digest(
            serde_json::to_vec(&results).map_err(|_| "Result serialization failed")?,
        )
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();
        let snapshot = PublishedResultSnapshot {
            publication_id: new_id("pub"),
            chapter_id: chapter.into(),
            event_id: event.into(),
            division_id: division.into(),
            results,
            published_at: now_secs(),
            digest,
        };
        self.published_results.insert(key, snapshot.clone());
        Ok(snapshot)
    }

    pub fn get_published_snapshot(
        &self,
        event: &str,
        division: &str,
    ) -> Option<PublishedResultSnapshot> {
        self.published_results
            .get(&scope_key(&[event, division]))
            .cloned()
    }

    pub fn record_audit(&mut self, chapter: &str, actor: &str, action: &str, resource: &str) {
        let id = new_id("audit");
        self.record_audit_with_reason(chapter, actor, action, resource, "", id);
    }

    fn record_audit_with_reason(
        &mut self,
        chapter: &str,
        actor: &str,
        action: &str,
        resource: &str,
        reason: &str,
        id: String,
    ) {
        self.audit.push(AuditRecord {
            id: id.clone(),
            actor_uid: actor.into(),
            chapter_id: chapter.into(),
            action: action.into(),
            resource_id: resource.into(),
            recorded_at: now_secs(),
            reason: (!reason.is_empty()).then(|| reason.to_owned()),
            correlation_id: Some(id),
        });
    }
}
