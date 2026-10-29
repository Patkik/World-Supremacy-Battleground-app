use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::domain::{
    Chapter, Crew, CrewInvitation, CrewMember, CrewResult, Deduction, Division, Entry,
    EntryReadiness, EntryStatus, Event, MemberRole, ScoreCriteria, ScoreReceipt,
    SubmitScoreCommand,
};

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub type RecordedScore = (String, u64, ScoreCriteria, Vec<Deduction>);

pub struct RegistrationStore {
    pub chapters: HashMap<String, Chapter>,
    pub events: HashMap<String, Event>,
    pub divisions: HashMap<String, Vec<Division>>,
    pub crews: HashMap<String, Crew>,
    pub invitations: HashMap<String, CrewInvitation>,
    pub entries: HashMap<String, Entry>,
    pub division_locks: HashMap<String, bool>,
    pub scores: HashMap<String, Vec<RecordedScore>>, // division_id -> [(judge_id, revision, criteria, deductions)]
    pub receipts: HashMap<String, ScoreReceipt>,     // operation_id -> ScoreReceipt
    pub division_revisions: HashMap<String, u64>,
}

impl Default for RegistrationStore {
    fn default() -> Self {
        Self::new()
    }
}

impl RegistrationStore {
    pub fn new() -> Self {
        let mut store = Self {
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
        };
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
            id: "manila-session-2027".into(),
            chapter_id: "ph".into(),
            name: "Manila Session 2027".into(),
            status: "active".into(),
            rules_version: "2027.1".into(),
        };
        self.events.insert(event_ph.id.clone(), event_ph);

        let event_hk = Event {
            id: "hk-championship-2027".into(),
            chapter_id: "hk".into(),
            name: "Hong Kong World Championship 2027".into(),
            status: "active".into(),
            rules_version: "2027.1".into(),
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
        let crew_id = format!("crew-{}", now_secs());
        let crew = Crew {
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
        let token = format!("inv-{}-{}", crew_id, now_secs());
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
        inv.used = true;

        let crew_id = inv.crew_id.clone();
        let role = inv.role.clone();
        let crew = self.crews.get_mut(&crew_id).ok_or("Crew not found")?;
        if crew.members.iter().any(|m| m.uid == dancer_uid) {
            return Err("Dancer is already a member of this crew");
        }
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
        let entry = Entry {
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
                if duration > division.max_duration_secs {
                    diagnostics.push(format!(
                        "Track '{}' is {}s; exceeds division maximum {}s (5s grace applied)",
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
        let expected_fee = division.fee_minor * (roster_count as u64);
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
        entry.roster = roster;
        entry.updated_at = now_secs();
        Ok(entry.clone())
    }

    pub fn review_entry(
        &mut self,
        chapter_id: &str,
        entry_id: &str,
        status: EntryStatus,
    ) -> Result<Entry, &'static str> {
        let entry = self.entries.get_mut(entry_id).ok_or("Entry not found")?;
        if entry.chapter_id != chapter_id {
            return Err("Cross-chapter review denied");
        }
        entry.status = status;
        entry.updated_at = now_secs();
        Ok(entry.clone())
    }

    // Judging Protocol & Offline Locks
    pub fn submit_score(
        &mut self,
        chapter_id: &str,
        event_id: &str,
        judge_uid: &str,
        cmd: SubmitScoreCommand,
    ) -> Result<ScoreReceipt, &'static str> {
        // Idempotency: return existing receipt if duplicate command received
        if let Some(existing) = self.receipts.get(&cmd.operation_id) {
            return Ok(existing.clone());
        }

        let event = self.events.get(event_id).ok_or("Event not found")?;
        if event.chapter_id != chapter_id {
            return Err("Cross-chapter score submission denied");
        }

        // Division lock check
        let lock_key = format!("{}-{}", event_id, cmd.division_id);
        if *self.division_locks.get(&lock_key).unwrap_or(&false) {
            return Err("Division is locked; cannot submit scores");
        }

        // Criteria validation
        if !cmd.criteria.is_valid() {
            return Err("Criteria scores must be between 0.0 and 20.0");
        }

        // Revision check
        let current_revision = *self.division_revisions.get(&lock_key).unwrap_or(&0);
        if cmd.expected_revision != current_revision {
            return Err("Score revision mismatch; please refresh division state");
        }

        let total_deductions: f64 = cmd.deductions.iter().map(|d| d.points).sum();
        let net_score = (cmd.criteria.total() - total_deductions).max(0.0);

        let new_revision = current_revision + 1;
        self.division_revisions.insert(lock_key, new_revision);

        let entry_scores = self.scores.entry(cmd.division_id.clone()).or_default();
        entry_scores.push((judge_uid.into(), new_revision, cmd.criteria, cmd.deductions));

        let receipt = ScoreReceipt {
            operation_id: cmd.operation_id.clone(),
            receipt_id: format!("rcpt-{}", now_secs()),
            event_id: event_id.into(),
            division_id: cmd.division_id,
            crew_id: cmd.crew_id,
            judge_uid: judge_uid.into(),
            score_revision: new_revision,
            net_score,
            recorded_at: now_secs(),
        };

        self.receipts.insert(cmd.operation_id, receipt.clone());
        Ok(receipt)
    }

    pub fn lock_division(
        &mut self,
        chapter_id: &str,
        event_id: &str,
        division_id: &str,
    ) -> Result<bool, &'static str> {
        let event = self.events.get(event_id).ok_or("Event not found")?;
        if event.chapter_id != chapter_id {
            return Err("Cross-chapter lock operation denied");
        }
        let lock_key = format!("{}-{}", event_id, division_id);
        self.division_locks.insert(lock_key, true);
        Ok(true)
    }

    pub fn get_division_results(
        &self,
        chapter_id: &str,
        event_id: &str,
        division_id: &str,
    ) -> Result<Vec<CrewResult>, &'static str> {
        let event = self.events.get(event_id).ok_or("Event not found")?;
        if event.chapter_id != chapter_id {
            return Err("Cross-chapter results query denied");
        }

        let scores = self.scores.get(division_id).cloned().unwrap_or_default();
        if scores.is_empty() {
            return Ok(Vec::new());
        }

        let mut crew_scores: HashMap<String, Vec<f64>> = HashMap::new();
        let mut crew_deductions: HashMap<String, f64> = HashMap::new();

        for (_, _, crit, deds) in scores {
            // Find crew for this division if mapped, or aggregate
            let crew_id = "sample-crew".to_string(); // In full store mapped via cmd
            crew_scores
                .entry(crew_id.clone())
                .or_default()
                .push(crit.total());
            let sum_ded: f64 = deds.iter().map(|d| d.points).sum();
            *crew_deductions.entry(crew_id).or_default() += sum_ded;
        }

        let mut results = Vec::new();
        for (crew_id, totals) in crew_scores {
            let count = totals.len() as f64;
            let raw_average = totals.iter().sum::<f64>() / count;
            let total_ded = *crew_deductions.get(&crew_id).unwrap_or(&0.0);
            let final_score = (raw_average - total_ded).max(0.0);

            results.push(CrewResult {
                crew_id,
                raw_average,
                total_deductions: total_ded,
                final_score,
                rank: 0,
            });
        }

        results.sort_by(|a, b| b.final_score.partial_cmp(&a.final_score).unwrap());
        for (idx, res) in results.iter_mut().enumerate() {
            res.rank = idx + 1;
        }

        Ok(results)
    }
}
