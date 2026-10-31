# World Supremacy Battlegrounds: End-to-End Test Infrastructure Specification

## 1. Architectural Overview & Design Philosophy

The testing infrastructure for World Supremacy Battlegrounds (WSB) follows a strict **opaque-box, requirement-driven** model. Tests treat the system as a bounded black box, interacting only through authoritative external interfaces, published protocol contracts, HTTP endpoints, and public projections. 

### Core Principles
1. **Authoritative Specification Grounding**: Expected outputs are derived exclusively from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and official rulebook interface contracts. Tests never mirror implementation trivia or internal helper layouts.
2. **Deterministic & Self-Contained**: Every test manages its own state, generates fresh synthetic tenants, identifiers, or isolated execution contexts, and cleans up after itself. Execution order independence is strictly enforced.
3. **Multi-Tenant Chapter Isolation**: Tests enforce that cross-chapter boundary crossings (`ph`, `au`, `hk`) are universally rejected at the API and database levels.
4. **Offline Durability & Idempotent Replays**: Outbox operations, payment reconciliations, judge score submissions, and venue check-ins are verified for replay safety, idempotent receipt return, and conflict detection.
5. **Zero-PII Public Projections**: Results published to public channels (`/v1/events/{id}/published` and `/arena-live/...`) are rigorously tested to ensure complete omission of private PII (such as dancer UIDs, criteria breakdowns, provider references, and guardian consent records).

---

## 2. 4-Tier Test Suite Hierarchy

The test suite is structured into four distinct verification tiers, encompassing a minimum of 460 executable test cases:

```
tests/e2e_tiers/
├── harness/
│   └── system_harness.mjs             # Authoritative opaque-box domain and protocol simulation harness
├── tier1_features/                    # Tier 1: Feature Coverage (>=200 tests; >=5 per feature)
│   ├── t1_f01_to_f10.test.mjs         # Features 1-10 (50 tests)
│   ├── t1_f11_to_f20.test.mjs         # Features 11-20 (50 tests)
│   ├── t1_f21_to_f30.test.mjs         # Features 21-30 (50 tests)
│   └── t1_f31_to_f40.test.mjs         # Features 31-40 (50 tests)
├── tier2_boundaries/                  # Tier 2: Boundary & Corner Cases (>=200 tests; >=5 per feature)
│   ├── t2_f01_to_f10.test.mjs         # Boundary tests for Features 1-10 (50 tests)
│   ├── t2_f11_to_f20.test.mjs         # Boundary tests for Features 11-20 (50 tests)
│   ├── t2_f21_to_f30.test.mjs         # Boundary tests for Features 21-30 (50 tests)
│   └── t2_f31_to_f40.test.mjs         # Boundary tests for Features 31-40 (50 tests)
├── tier3_interactions/                # Tier 3: Cross-Feature Interactions (>=40 tests)
│   ├── t3_registration_finance.test.mjs # Cross-module registration, readiness & payments (15 tests)
│   ├── t3_judging_publication.test.mjs  # Scoring, deductions, locks & publication (15 tests)
│   └── t3_ops_auth_brand.test.mjs       # Venue check-in, battles, inquiries & brand HUD (15 tests)
├── tier4_scenarios/                   # Tier 4: Real-World Scenarios (>=20 tests)
│   ├── t4_competition_lifecycle.test.mjs    # Full end-to-end chapter championships (12 scenarios)
│   └── t4_offline_disruption_recovery.test.mjs # Network drops, offline replay & edge recoveries (13 scenarios)
└── run-all-tiers.mjs                  # Master test runner with audit reporting and deterministic exit codes
```

### Summary of Minimum Quantities
| Tier | Description | Minimum Required | Implemented Count |
|---|---|---|---|
| **Tier 1** | Feature Coverage (>=5 tests across all 40 features) | 200 | 200 |
| **Tier 2** | Boundary & Corner Cases (>=5 tests across all 40 features) | 200 | 200 |
| **Tier 3** | Cross-Feature Interactions (pairwise & multi-module) | 40 | 45 |
| **Tier 4** | Real-World Scenarios (complete end-to-end competition workflows) | 20 | 25 |
| **Total** | **Comprehensive E2E Suite** | **>=460** | **470** |

---

## 3. Feature Mapping Matrix (All 40 Features)

| Feature # | Feature Name | Tier 1 Suite | Tier 2 Suite | Tier 3 Suite | Tier 4 Suite |
|---|---|---|---|---|---|
| **F01** | Chapter Session & Token Verification | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_ops_auth_brand` | `t4_competition_lifecycle` |
| **F02** | Chapter & Event Discovery | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F03** | Division Configuration Read | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F04** | Synthetic Sandbox & Release Gates | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_ops_auth_brand` | `t4_offline_disruption_recovery` |
| **F05** | Clippy & Build Hygiene | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_ops_auth_brand` | `t4_offline_disruption_recovery` |
| **F06** | Crew Profile Creation | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F07** | Crew Invitation Generation | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F08** | Dancer Invitation Redemption | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F09** | Event Entry Draft Creation | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F10** | Canonical Performer Selection | `t1_f01_to_f10` | `t2_f01_to_f10` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F11** | Computed 4-Vector Entry Readiness | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F12** | Entry Submission & Corrections | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F13** | Registrar Review & Approval | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F14** | Guardian Consent & Minor Waivers | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_offline_disruption_recovery` |
| **F15** | Identity Evidence Vault & Storage | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_offline_disruption_recovery` |
| **F16** | Audio Upload & Duration Compliance | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F17** | DJ Playlist Auto-Renaming & Export | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_ops_auth_brand` | `t4_competition_lifecycle` |
| **F18** | Fee Quote Generation | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F19** | Payment Request & Split Share | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F20** | Synthetic Payment Webhook Mock | `t1_f11_to_f20` | `t2_f11_to_f20` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F21** | Finance Reconciliation & Credit | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F22** | Payment Refund Recording | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_registration_finance` | `t4_offline_disruption_recovery` |
| **F23** | Finance Summary & Ledger Reporting | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_registration_finance` | `t4_competition_lifecycle` |
| **F24** | Judge Score Submission | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_judging_publication` | `t4_competition_lifecycle` |
| **F25** | Head Judge Technical Deductions | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_judging_publication` | `t4_competition_lifecycle` |
| **F26** | Division Locking Barrier | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_judging_publication` | `t4_competition_lifecycle` |
| **F27** | Judge Lineup Projection | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_judging_publication` | `t4_competition_lifecycle` |
| **F28** | Offline Outbox & Web Locks Sync | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_judging_publication` | `t4_offline_disruption_recovery` |
| **F29** | BG.ONE Battle Corner Voting | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_ops_auth_brand` | `t4_offline_disruption_recovery` |
| **F30** | Battle Progression & Durability | `t1_f21_to_f30` | `t2_f21_to_f30` | `t3_ops_auth_brand` | `t4_offline_disruption_recovery` |
| **F31** | Division Results Tabulation | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_judging_publication` | `t4_competition_lifecycle` |
| **F32** | Immutable Results Publication | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_judging_publication` | `t4_competition_lifecycle` |
| **F33** | Public Event Results Projection | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_judging_publication` | `t4_competition_lifecycle` |
| **F34** | Arena Broadcast HUD | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_ops_auth_brand` | `t4_competition_lifecycle` |
| **F35** | Dancer Venue Check-In | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_ops_auth_brand` | `t4_competition_lifecycle` |
| **F36** | Stage Marshal Queue | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_ops_auth_brand` | `t4_competition_lifecycle` |
| **F37** | Native Contact Inquiries | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_ops_auth_brand` | `t4_offline_disruption_recovery` |
| **F38** | Chapter Support Queue & Proposals | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_ops_auth_brand` | `t4_offline_disruption_recovery` |
| **F39** | White Dark-Mode Brand Mark | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_ops_auth_brand` | `t4_competition_lifecycle` |
| **F40** | Decorative Muted Hero Video | `t1_f31_to_f40` | `t2_f31_to_f40` | `t3_ops_auth_brand` | `t4_competition_lifecycle` |

---

## 4. Execution Commands

### Unified Master Runner (All Tiers)
```bash
node tests/e2e_tiers/run-all-tiers.mjs
```
The master runner executes all suites across Tier 1, 2, 3, and 4 in succession, summarizes passed/failed tests per tier and per feature, and returns exit code `0` on 100% success or `1` on any failure.

### Running Individual Tiers via Native `node --test`
```bash
# Tier 1: Feature Coverage
node --test tests/e2e_tiers/tier1_features/*.test.mjs

# Tier 2: Boundary & Corner Cases
node --test tests/e2e_tiers/tier2_boundaries/*.test.mjs

# Tier 3: Cross-Feature Interactions
node --test tests/e2e_tiers/tier3_interactions/*.test.mjs

# Tier 4: Real-World Scenarios
node --test tests/e2e_tiers/tier4_scenarios/*.test.mjs
```

### Running Specific Feature Test Groups
```bash
node --test tests/e2e_tiers/tier1_features/t1_f01_to_f10.test.mjs
node --test tests/e2e_tiers/tier2_boundaries/t2_f21_to_f30.test.mjs
```

---

## 5. Verification Contracts & Invariants

### 1. Token Verification & Tenancy (`F01`)
- RS256 algorithm enforcement.
- Audience matches `demo-wsb`.
- Issuer matches `https://securetoken.google.com/demo-wsb` or `urn:wsb:local-testing`.
- Claims `chapterId` must match the URL path chapter `{chapter_id}`.
- Active membership check in Chapter store. Revocation or `active: false` immediately blocks requests with `403 Forbidden`.

### 2. Readiness Evaluation (`F11`)
The 4 readiness vectors must all evaluate to `true` before entry approval (`F13`), division locking (`F26`), or dancer check-in (`F35`):
- `roster_ready`: `min_members <= roster.length <= max_members`.
- `music_ready`: `track_filename.is_some() && 0 < track_duration_secs <= max_duration_secs + 5`.
- `consent_ready`: For all members where `is_minor == true`, `consent_verified == true`.
- `payment_ready`: `paid_amount_minor >= fee_minor * roster_count`.

### 3. Idempotent State Replays (`F20`, `F21`, `F24`, `F35`)
- Payments, score submissions, and QR check-ins require idempotent handling.
- Replaying a command with identical payload and `operation_id` returns the existing receipt without duplicate side-effects.
- Replaying a command with changed payload or mismatched expected revision fails with `409 Conflict`.

### 4. Technical Deductions & Locking Barrier (`F25`, `F26`)
- Technical deductions can only be submitted by an authorized `head_judge`.
- Deductions must be non-negative (`points >= 0`).
- Division lock requires all assigned panel scorecards to be completed and all division entries approved and ready.
- Once locked, no new score submissions or deduction alterations are accepted.

### 5. Results Tabulation & Publication (`F31`, `F32`, `F33`)
- `raw_average` = sum of panel net scores divided by judge count.
- `final_score` = `max(0, raw_average - total_deductions)`.
- Tied ranks block publication unless an explicit tie-breaking policy flag is activated.
- Published snapshots include a cryptographic SHA-256 digest calculated across canonical sorted results.
- Public projections strictly strip all confidential notes, criteria breakdowns, judge UIDs, and participant PII.
