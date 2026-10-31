# Decisions requiring evidence

## Resolved / Classified in Pilot Scope (2026-10-30)
- **Divisions & Chapters**: Official WSB divisions (Monster Crew, Mega Crew, Open Crew,
  Monster Varsity 18&U, Varsity Ignite 14&U, Junior, BG.ONE) and multi-chapter tenancy
  are verified from the official WSB website and Hong Kong 2027 event specifications.
- **Pilot Scope**: Scoped to WSB Philippines (Manila Session) and WSB Hong Kong
  (2027 World Championship) with focus on Identity, Crew Registration, Multi-Factor
  Readiness, Offline Judging Protocol, and Published Results Projections.
  See `docs/pilot-scope.md`.
- **Proposed Policies vs Verified Rules**: 50% roster retention, January 1 cutoff,
  5 scoring pillars (20% each), and a 5-second audio grace need official evidence.
  No fixed audio grace is applied; a configurable grace policy remains unfinished.
  Other policy implementations also require verification against approved rules.

## Outstanding Decisions Requiring Official Rulebook Approval
- Final deduction points catalog and specific violation penalties (e.g. stage debris,
  late audio submission point deductions).
- Formal tie-breaking algorithm (highest execution score vs head judge tie-break vote).
- Official refund terms, partial refund processing policy, and split-payment deadline window.
- Retention and deletion period for uploaded government/school identity documents and waivers.
- Approved identity and residency document types, age determination/cutoff, accepted reviewer roles, and event-specific consent/guardian signer requirements (including applicable language and policy version).
- Private upload malware scanning and actual file-format inspection requirements before reviewer access; Firebase Storage content-type metadata alone does not establish the file's true format.
- Venue credential policy: exact offline QR pass expiry window and revocation reconciliation protocol.

Record answers with sources and dates in `memory/decisions.md`.

- Public inquiry retention/deletion, access-key expiry/rotation and secure lost-key
  recovery policy must be approved before live contact activation. Current local
  conversation keys are per-request capabilities, not account authentication.
- Email notification/delivery and specialized support escalation/assignment need
  provider configuration and audience/permission verification; saved inquiries do
  not imply an email was sent or a registration/payment change was approved.


## Implementation audit additions — 2026-10-30

- Provide approved seasonal points, eligible event sources and public crew/profile
  publishing permissions before replacing the rankings empty state with standings.
- Confirm approved scoring precision/rounding, score-correction/republication and
  panel-completion policy. Current arithmetic is synthetic pilot behavior only.
- Define human-readable public event slugs and correction/republication authority.
  Current API publication uses `event_id` as the public identifier and reserves it
  globally to one chapter on first publish; cross-chapter collisions fail closed.
  A rename or correction must not silently replace an immutable snapshot.
- Persistent membership provisioning and signed-token browser/API rehearsal are
  still implementation work, not a reason to permit unsigned emulator tokens.

## Stage order policy and publication

The proposal mentions rule-based seeds/randomized remainder, but no verified
policy or randomization audit requirement has been supplied. Confirm seeding
inputs, random draw procedure, division/stage grouping, late replacements,
post-publication reorder authority and notification requirements before enabling
generated/published performance order. Internal revisioned stage drafts are
manual planning only and do not resolve these questions.
