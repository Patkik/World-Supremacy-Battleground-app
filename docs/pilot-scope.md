# WSB Pilot Scope and Acceptance Criteria

## 1. Executive Summary & Boundaries

This document defines the pilot release scope and requirements provenance for the
World Supremacy Battlegrounds (WSB) competition platform. In accordance with the
WSB knowledge architecture, requirements are strictly partitioned into **verified
facts**, **proposed design policies**, and **unresolved questions**.

The pilot release targets a functional multi-tenant competition vertical:
**WSB Philippines (Manila Session)** and **WSB Hong Kong (2027 World Championship)**.

### In Scope for Pilot
1. **Identity & Access**: Firebase Auth integration with server-side chapter claims,
   session retrieval, role-based access control (RBAC), and membership revocation.
2. **Crew & Entry Registration**: Crew profile creation, scoped dancer invitations,
   division selection, roster validation, entry submission, and computed readiness status.
3. **Readiness Tracking**: Computed multi-factor readiness (roster thresholds,
   audio compliance metadata, guardian consent status, payment ledger balance).
4. **Offline-Capable Judging Protocol**: 100-point 5-pillar scoring model,
   `operationId` idempotency, revision-controlled lock transitions, and score receipts.
5. **Published Results Projection**: Authoritative results finalization in Rust with
   isolated `publicEvents` / `publicResults` read-only projections.

### Deferred Beyond Initial Pilot
- Direct third-party payment gateway callbacks (Stripe, PayMongo, GCash); synthetic
  ledger entries and invoice reconciliation are used during initial pilot validation.
- Live DJ zip packaging and automated audio transcoding pipelines.
- Native spectator ticketing and seat reservation systems.
- Spectator public voting and global seasonal point aggregation.

---

## 2. Rule Provenance and Classification

| Requirement | Source | Classification | Treatment in System |
|---|---|---|---|
| **Divisions** (Monster, Mega, Open, Monster Varsity, Varsity Ignite, Junior, BG.ONE) | Official WSB Website & Hong Kong 2027 Event Spec | **Verified** | Parameterized per event with minimum/maximum roster limits and age brackets. |
| **Chapter Multi-Tenancy** | WSB Organization Structure | **Verified** | Strict server-side chapter isolation across all mutations and Firestore records. |
| **50% Roster Retention Rule** | Client Proposal Brief | **Proposed Policy** | Configurable validation rule on championship advancement entries; flagged if unverified. |
| **January 1 Age Cutoff** | Client Proposal Brief | **Proposed Policy** | Configurable cutoff date in `divisionConfigs`; validates dancer DOB against event year. |
| **5 Scoring Pillars (20 pts each)** | Client Proposal Brief | **Proposed Policy** | Pre-configured in judging suite: Choreography, Musicality, Execution, Stage Presence, Entertainment. |
| **5-Second Audio Grace Period & 7-Day Lock** | Client Proposal Brief | **Proposed Policy** | Metadata validation check on audio submission; flags overtime routines for head judge review. |
| **Deduction Catalog & Points** | Client Proposal Brief | **Unresolved** | Tracked in `docs/open-questions.md`; technical judge applies generic penalty points with violation tags. |
| **Tie-Breaking Formula** | Client Proposal Brief | **Unresolved** | Tracked in `docs/open-questions.md`; flagged for head judge manual determination if tied. |

---

## 3. Core Pilot Feature Specifications

### F1: Identity & Chapter Session
- **Actor**: All authenticated users (Crew Manager, Dancer, Judge, Head Judge, Director).
- **Chapter Scope**: Explicitly verified in token claims (`chapterId`) and server membership lookup.
- **Trigger**: Client requests `GET /v1/chapters/{chapter_id}/session` with Bearer token.
- **Success State**: Server returns authenticated actor identity (`uid`), verified chapter, and assigned role.
- **Failure State**:
  - Missing/malformed token -> `401 Unauthorized`.
  - Token issuer/audience mismatch -> `401 Unauthorized`.
  - Chapter claim mismatch -> `403 Forbidden`.
  - Revoked or expired token -> `401 Unauthorized`.
- **Acceptance Criteria**:
  - Rejects emulator unsigned tokens in production mode.
  - Denies cross-chapter access attempts with `403 Forbidden`.
  - Emits `Cache-Control: no-store` on session responses.

### F2: Crew Onboarding & Member Invitations
- **Actor**: Crew Manager.
- **Chapter Scope**: Chapter to which the crew manager belongs.
- **Trigger**: Manager submits crew details (`name`, `city`, `biography`) and generates dancer invitation.
- **Success State**:
  - Crew record created with manager as primary owner.
  - Unique, expiring invitation token generated for dancer onboarding.
- **Failure State**:
  - Blank crew name or duplicate crew name within chapter -> `400 Bad Request`.
  - Expired invitation token on acceptance -> `410 Gone`.
  - Unauthenticated dancer acceptance -> `401 Unauthorized`.
- **Acceptance Criteria**:
  - Crew ownership is immutable through client requests.
  - Invitations carry a cryptographic token, expiry timestamp, and chapter/crew scope.
  - Adding dancers updates the crew roster snapshot without rewriting historical competition entries.

### F3: Event Entry & Division Selection
- **Actor**: Crew Manager.
- **Chapter Scope**: Chapter hosting the event.
- **Trigger**: Manager creates an entry for a specific event and division (`POST /v1/chapters/{chapter_id}/events/{event_id}/entries`).
- **Success State**:
  - Entry created in `draft` status.
  - Entry captures current roster snapshot and checks division min/max dancer bounds.
- **Failure State**:
  - Event not open or in different chapter -> `403 Forbidden` / `404 Not Found`.
  - Roster count outside division configuration (e.g. Monster Crew < 20 dancers) -> `422 Unprocessable Entity` with specific violation details.
- **Acceptance Criteria**:
  - Division constraints are evaluated against the event's configured rule version.
  - Entry ID is idempotent for retry attempts.

### F4: Computed Entry Readiness
- **Actor**: Crew Manager, Event Registrar.
- **Chapter Scope**: Chapter hosting the event.
- **Trigger**: Client queries entry readiness (`GET /v1/chapters/{chapter_id}/events/{event_id}/entries/{entry_id}`).
- **Success State**:
  - Server evaluates independent prerequisite vectors:
    1. `roster_ready`: Minimum/maximum dancer count satisfied.
    2. `music_ready`: Audio track submitted, non-empty, and within duration limits.
    3. `consent_ready`: Minor dancers have verified guardian consent records.
    4. `payment_ready`: Invoiced amount covered by recorded payment allocations.
  - `is_ready` evaluates to `true` if and only if all four vectors are satisfied.
- **Failure State**:
  - Any failed vector reports clear, non-blocking diagnostic explanations.
- **Acceptance Criteria**:
  - Readiness is never a client-controlled boolean; it is computed authoritatively by the Rust backend.
  - Submitting an entry with unmet prerequisites transitions status to `needs_correction` or remains `draft`.

### F5: Offline Judging Command & Receipts
- **Actor**: Judge, Head Judge.
- **Chapter Scope**: Event and division assigned to judge.
- **Trigger**: Judge submits score via offline outbox command (`POST /v1/chapters/{chapter_id}/events/{event_id}/scores`).
- **Success State**:
  - Server verifies judge assignment, division lock status, and `expectedRevision`.
  - Server records score breakdown (5 criteria values, 0-20 points each).
  - Server returns an immutable `ScoreReceipt` with timestamp and revision.
- **Failure State**:
  - Division locked -> `409 Conflict` (Score preserved in outbox for manual dispute review; never overwritten).
  - Idempotent resubmission with same `operationId` and identical payload -> returns original receipt.
  - Modified payload with existing `operationId` -> `400 Bad Request`.
- **Acceptance Criteria**:
  - Scores cannot be submitted after the division is locked by the Head Judge.
  - Replays of identical commands return the cached receipt without updating score revisions.

---

## 4. Acceptance Gates and Pilot Milestones

1. **Gate 1 (Scope & Contract Approval)**:
   - This requirements specification is logged with evidence in `workflows/tasks.json`.
   - Open questions in `docs/open-questions.md` reflect verified items versus assumptions.
2. **Gate 2 (Foundation & Authoritative Service Slice)**:
   - Rust domain models and registration service pass chapter isolation and boundary tests.
   - Emulator Firestore security rules pass unit verification.
3. **Gate 3 (End-to-End Synthetic Pilot)**:
   - Crew Manager registers crew and roster -> generates entry -> checks computed readiness.
   - Staff user inspects and approves valid entry.
