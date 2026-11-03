# Decisions requiring evidence

## Resolved / Classified in Pilot Scope (2026-10-30)
- **Divisions & Chapters**: Official WSB divisions (Monster Crew, Mega Crew, Open Crew,
  Monster Varsity 18&U, Varsity Ignite 14&U, Junior, BG.ONE) and multi-chapter tenancy
  are verified from the official WSB website and Hong Kong 2027 event specifications.
- **Pilot Scope**: Scoped to WSB Philippines (Manila Session) and WSB Hong Kong
  (2027 World Championship) with focus on Identity, Crew Registration, Multi-Factor
  Readiness, Offline Judging Protocol, and Published Results Projections.
  See `docs/pilot-scope.md`.
- **Source-scoped rules vs pilot approval**: the WSB Rules 2026 PDF linked from
  the Dubai 2026 page includes retention into finals, a January 1 age cutoff for
  listed divisions, a five-second performance grace, one-week submission timing
  when no deadline is stated, and an eight-criterion weighted judging rubric.
  These facts are scoped to that 2026 rules document. Its rubric differs from the
  product brief's five equal pillars, and it does not define a seven-day music
  lock. None of these provisions have been confirmed for the Manila or Hong Kong
  2027 pilot; current scoring remains synthetic and no advancement retention is
  enforced. Any saved music-policy grace is advisory only, not an upload or
  readiness rule. See the source lead below.

## Outstanding Decisions Requiring Official Rulebook Approval
- For each event, provide the approved division eligibility rules, roster bounds,
  age cutoffs, performance limits, scoring criteria, fee schedule, effective dates,
  and the authorized role that approves those settings. The presence of a named
  division or a director-authored draft does not establish its current policy.
  The WSB Rules 2026 Dubai document is a source candidate for that event edition,
  not evidence of applicability to this pilot.
- Final deduction points catalog and specific violation penalties (e.g. stage debris,
  late audio submission point deductions).
- Formal tie-breaking algorithm (highest execution score vs head judge tie-break vote).
- Official refund terms, partial refund processing policy, and split-payment deadline window.
- Refund authority and eligibility: evidence requirements, dispute/chargeback handling, separate requester/approver rules, and the relationship between a WSB ledger reversal and confirmed external money movement. The current manual refund action only changes a synthetic/manual ledger after the external reversal is confirmed.
- Retention and deletion period for uploaded government/school identity documents and waivers.
- Approved identity and residency document types, age determination/cutoff, accepted reviewer roles, and event-specific consent/guardian signer requirements (including applicable language and policy version).
  Source lead: the [official WSB Dubai 2026 page](https://worldsupremacybattlegrounds.com/dubai/) links [“WSB RULES 2026.pdf”](https://drive.google.com/file/d/1GOiDfFZCZN62S6h6owPCa64Cq-6TVB4F/view?usp=sharing), dated 31 March 2026 in the PDF. Its age criteria and general liability/likeness waiver provisions are visible, and it permits a competitor or crew manager/leader to sign. It does not define guardian verification or event-specific signer authority, and it does not establish applicability to Manila or Hong Kong 2027. Do not activate consent from this source lead alone; obtain the approved pilot-event references and guardian policy.
- Private upload scanner/signature freshness, false-positive handling, deployed resource verification, full embedded-resource inspection, and production network placement. PDF/JPEG/PNG parsing now runs in a separate worker process with bounded stdin, no inherited environment, and—on Linux—512 MiB address-space and 20/25-second CPU limits plus a 30-second killable wall deadline. This is not a full OS sandbox: it shares the API container/user and has no namespace or syscall filtering; validate the limits against hostile synthetic files in the deployed runtime. Raster allocation limits remain best-effort, PDF object accounting is estimated, and every embedded page resource is not inspected. Parsing does not validate document claims; Firebase Storage MIME metadata alone does not establish the true format. Neither parser nor clean scan establishes valid evidence.
- Venue credential policy: exact offline QR pass expiry window and revocation reconciliation protocol.
- Attendee ticketing policy and pilot scope: event ticket products, inventory and capacity,
  prices/currency/fees/taxes, admission terms, refunds/transfers and the ticket-to-venue
  credential relationship. The product brief only proposes ticket/VIP extensions; no
  event offer or sale may be shown until the organizer configures these terms.
- PayMongo controlled test-account verification: validate the implemented v2 Checkout Session request/response against the deployed account and configured payment-method list; capture payment/refund webhook fixtures; verify provider-payment-to-WSB mapping and duplicate/out-of-order partial-refund recovery; and define operator reconciliation for unknown provider outcomes and failed cancellation/refund calls before production enablement. PayMongo currently documents PHP as the only supported hosted-checkout currency; non-PHP chapters must use manual payment references or another approved provider path until support is confirmed.
- Browser push delivery: configure the Firebase messaging service, HTTPS origin and
  public web-push key; implement explicit opt-in and device registration with
  account/chapter isolation, sign-out and revocation cleanup, invalid-registration
  recovery, safe payloads and provider failure handling. Firebase's current web
  guidance uses installation-based registration; verify the selected SDK and
  server protocol against the configured account before enabling delivery. Foreground
  call-sheet refresh is not evidence of push delivery.

Record answers with sources and dates in `memory/decisions.md`.

- PAGE-085 requests an audit reason and correlation ID. New shared, membership,
  and panel audit writes persist a stable audit identifier in `correlation_id`;
  this is not an end-to-end HTTP trace and legacy rows remain unchanged. Define
  which remaining commands require human reasons, then migrate those forms and
  all audit producers before claiming full coverage. Event and division draft
  configuration, staff membership/invitation changes, director stage
  creation/configuration/marshal-access changes, and manual finance decisions
  require transactional reasons.
  Routine stage position/hold commands remain reasonless for venue speed. Also
  define retention, immutability administration, and approved full-archive
  export behavior.

- Public inquiry retention/deletion, access-key expiry/rotation and secure lost-key
  recovery policy must be approved before live contact activation. Current local
  conversation keys are per-request capabilities, not account authentication.
- PAGE-062 account privacy requests need an identified account-wide owner, identity
  recheck, request status and retention exceptions before export or deletion can
  be offered. In particular, deletion must not silently erase required audit or
  financial history. This is separate from public inquiry retention and the
  still-unavailable page records no request today.
- Define retention/deletion for expired, accepted, and revoked chapter staff
  invitations and their server-only lookup records. Current records retain the
  target UID, role, reason, and code digest; expiry blocks acceptance but does not
  automatically delete the records.
- Email notification/delivery and specialized support escalation/assignment need
  provider configuration and audience/permission verification; saved inquiries do
  not imply an email was sent or a registration/payment change was approved.
- PAGE-083 public chapter publishing needs an approved editor/publisher role
  matrix, separate draft/review/publish authority, content-rights checks,
  correction and removal rules, and audience/notification behavior. The current
  private draft workspace is director-only and has no review, publish, or public
  projection action; this provisional authoring boundary does not resolve the
  policy for public publishing.
- Event broadcast/announcement delivery: define the authorized audience,
  composition, delivery channels and record-keeping before a director-composed
  event announcement workflow can replace the gated screen. The notification
  system currently delivers only record-linked notices.
- Venue incident logging: define the incident record schema, severity/owner
  model, access and retention before an in-system log is offered.
- Scrutineer/compliance report generation and export: define which aggregates
  may be computed from private scores and ledger records, who may read them, and
  the export/retention policy. The chapter audit feed and finance ledger remain
  the only authoritative reads.
- Entry division change, substitution and withdrawal: define the authorized
  request/review workflow and its fee, readiness and roster effects before
  self-service changes are offered.


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

## BG.ONE battle progression

No approved source currently defines bracket size and seeding inputs, round
construction, byes, withdrawals, disqualifications, corrections after a ballot,
or how a winner advances. The current 3/5 judge majority vote only closes one
match; it does not establish a tournament format or advancement policy. Keep
match activation and ballots available as local operational primitives, but do
not generate a bracket or advance participants until the competition authority
provides a dated rulebook/source and the responsible roles are identified.

## Stage order policy and publication

The proposal mentions rule-based seeds/randomized remainder, but no verified
policy or randomization audit requirement has been supplied. Confirm seeding
inputs, random draw procedure, division/stage grouping, late replacements,
post-publication reorder authority and notification requirements before enabling
generated/published performance order. Internal revisioned stage drafts are
manual planning only and do not resolve these questions.

## Public event display authority

The current local implementation lets a chapter director explicitly publish
one active stage and projects only event/chapter names, current crew/division
labels and held state. Before live activation, confirm whether a separate event
activation/publicity approval is required, the permitted public event fields and
privacy notice, who may publish or take down a projection, and required audit
retention. Sponsor names, logos, tickers, scene controls, physical LED/stream
delivery, and public bracket/next-up data remain unavailable until content rights,
production integration, and bracket/stage-order authority are confirmed.

Define the public event timetable publication workflow, including the authorized
publisher, source of event-time/timezone data, revision and cancellation behavior,
and how late schedule changes reach participants. No timetable is currently
published from lineup drafts. Decide whether WSB will host video streams or link
to organizer-owned streams, and define rights, moderation, audience interaction,
and availability indicators before adding player, viewer counts or cheers.

## Public chapter, crew and rules content

Define who may publish public chapter affiliation/contact records and event rule
versions, including source, effective date, applicability, corrections and
withdrawal. Public crew profiles require an explicit publishing workflow, crew
manager authority, dancer consent (including minors), permitted honors/results
fields and takedown handling. Until these are implemented and approved, keep
chapter and crew records private and treat linked rule PDFs as source documents,
not as an event-attached policy. Do not infer an official chapter from a URL slug.
# Judging discrepancy alerts

No approved judge-score discrepancy threshold, comparison method, alert recipient,
or required response is currently sourced. The head-judge completion console
therefore reports factual scorecard counts only; it must not label an entry an
outlier or infer a tie, placement, or qualification. Obtain an approved event
policy and versioned source before enabling discrepancy alerts.

- Crew invitation bearer URLs: confirm edge/server access-log redaction and migrate
  legacy token-in-path requests before live activation. New links use a fragment
  and tab-scoped handoff, but old links still send the token in the first request.
  Confirm live referrer/cache headers and cross-tab verification behavior.
