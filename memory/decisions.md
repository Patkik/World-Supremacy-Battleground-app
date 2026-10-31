# Decision log

## 2026-10-29 — Workspace knowledge
Decision: Keep durable knowledge in reviewable project files; use a generated
local vector index as a disposable retrieval aid. Rationale: portable, private,
and usable immediately without credentials. Source files remain authoritative.

## 2026-10-29 — Product scope
Decision: Treat the pasted blueprint as a proposed scope. Exact rules and
gateway capabilities require verification. Rationale: avoid turning unsupported
claims into eligibility, scoring, or payment behavior.

## 2026-10-29 — Actual application foundation
User requested Rust backend, an optimized frontend with broad community support,
and Firebase database, and supplied Firebase web configuration. Selected Next.js
App Router / React / TypeScript and Axum / Tokio. This supersedes the initial
proposal's Cloud Functions business-logic default. Keep Firebase Auth, Firestore
and Storage; defer Realtime Database until a measured need exists.
Sources and boundaries: docs/architecture.md. The supplied stack proposal's
throughput, latency and cold-start claims are not adopted as established facts.

Local development uses demo-wsb emulators. Supplied real project configuration
is in an ignored production environment file. No production mutation is part of
this setup. Framework setup proceeds independently of unresolved competition
rules; the task graph separates this work from domain feature implementation.

## 2026-10-29 — Rust development environment
User authorized Rust installation and started Docker. Installed Rust 1.99.1,
Cargo, rustfmt, Clippy, Microsoft C++ Build Tools and Windows SDK. Native compiler
smoke check passed. Docker backend tests and optional Firestore compilation
passed. Cargo.lock, rust-toolchain.toml and pinned builder digest make future
builds reproducible. No production credentials or cloud mutations were needed.

## 2026-10-30 — Comprehensive website plan
User requested all pages, roles, features, content and screen orientations, with
professional references and the supplied WSB logo. Created docs/website-plan as
the planning source of truth. Preserve the existing three-surface design system.
Portrait/landscape and accessible reflow override unconditional viewport locks
in generic judging layout recipes. Use event-versioned divisions: the current
official public site's list differs from the initial proposal. Proposed screen
and permission expansion does not constitute approval of unsourced business rules.

## 2026-10-30 — Route-scoped UI/UX skill set and frontend rules
User requested installing the curated 5-skill open-source UI/UX stack plus a
route-scoped WSB master UI/UX skill and frontend rules. Installed project-local
copies under `.agents/skills/` (tracked in `skills-lock.json`): `ui-ux-pro-max`
(`nextlevelbuilder/ui-ux-pro-max-skill`), `frontend-design` (`anthropics/skills`),
`build-awwwards-quality-sites` (`MengTo/Skills`), `gsap` (`Quegenx/agent-skills`),
and `ui-craft` (`educlopez/ui-craft`), alongside `.agents/skills/wsb-ui-ux-architect/SKILL.md`
and hierarchical frontend rules in `apps/web/AGENTS.md`.

Rationale: Isolate high-motion Awwwards choreography (`(marketing)`) and LED
projection typography (`(arena-live)`) from dark-auditorium judging and mobile
registration (`(console)`, `(portal)`), preventing Lenis scroll-jacking or heavy
shaders in operational views. Repaired `--text-titanium` token typo in the
supplied specification and aligned offline telemetry, bundle lazy-loading, Rust
authority boundaries, and parameterized competition thresholds with
`docs/architecture.md` and `docs/open-questions.md`.


## 2026-10-30 — Representative visual prototype
User authorized proceeding from the full plan to representative screens. Built
public, portal, judge and arena previews in the existing Next.js app. Kept
synthetic data and browser-local persistence explicit; no fake registrations,
payments, uploads, score receipts or public results. Used the original WSB logo,
local fonts, credited Solar icons and generated fictional dance concept art.
Scoped GSAP/Lenis to public marketing; no Three.js needed. Responsive and workflow
verification is recorded in docs/prototype-validation.md.


## 2026-10-30 — Energetic public WSB website
User requested official organization highlights, more motion and a real public
presentation. Embed three performances from the official WSBstreet channel;
retain attribution, controls and fallbacks rather than downloading footage.
Use verified Hong Kong 2027 event content and the current official registration
form. Keep development workspaces honest and outside public navigation until
Rust/Firebase operations are implemented. Motion and verification: docs/public-site-media.md.

## 2026-10-30 — White dark-mode logo and decorative autoplay
User explicitly requested a white logo for the dark theme and automatic video
with no interactions. This supersedes the earlier hero control treatment and
authorizes the white brand variant. Preserve the exact original logo alpha in
a raster-backed SVG; render existing optimized site marks white via a dark-theme
filter. Do not ship the generated edits that altered the artwork texture.

Keep the official highlight footage always muted, remove hero controls and
click/focus actions, and retain page motion preferences in the footer. Respect
device motion/data-saving preferences and recover to a poster on playback error.
Rationale, provenance and passed browser/build evidence are recorded in
docs/dark-logo-and-background-video.md.

## 2026-10-30 — Pilot scope and rule provenance specification
Produced `docs/pilot-scope.md` separating verified rules (official WSB divisions,
multi-chapter tenancy) from proposed policies (50% roster retention, Jan 1 cutoff,
5 scoring pillars, audio duration limits) and open questions (deduction catalog,
tie-breaking formula). Updated `docs/open-questions.md` and completed `scope`,
`architecture`, and `foundation` tasks in the dependency DAG with evidence.

## 2026-10-30 — Registration domain and offline judging protocol implementation
Implemented authoritative Rust backend service for crew onboarding, invitations,
division constraints, entry lifecycle, computed readiness evaluation, and offline
judging command protocol:
1. Multi-factor readiness vector: roster bounds, audio compliance, minor guardian
   consent verification, and payment coverage. Submitting an incomplete entry
   transitions status to `needs_correction`.
2. Offline judging command protocol: 100-point 5-pillar scoring model with deduction
   subtractions, `operation_id` idempotency returning cached `ScoreReceipt`,
   `expected_revision` conflict handling, and division lock authorization.
3. Unit and integration tests in `apps/api`: 6/6 tests passed including cross-chapter
   denial paths, clippy zero warnings, rustfmt compliance, and Next.js production build.


## 2026-10-30 — Full goal retained; prior completion claims superseded

Source: user's renewed full-implementation request and pasted proposal; code audit
of `apps/api/src/store.rs`, route handlers and browser pages. All 116 route files
do not establish complete business features. Reopen the registration/payment/
judging/venue/results/pilot tasks and retain the full brief as the intended goal.
Historical status is preserved but superseded; capability and evidence details
are in `docs/implementation-audit-2026-10-30.md`.

Authority remains Rust. Membership, object ownership and current assignment are
checked server-side; score revisions are per judge/entry, retries bind their full
payload and technical deductions apply once. Require complete panel locks and a
separate published projection. Pending payer references are not payment evidence.
Only authorized finance reconciliation can settle the manual ledger. Provider
webhooks and actual money movement remain separate, unimplemented integrations.

Trusted-device judging uses IndexedDB commands with immutable IDs and explicit
receipts/conflicts. Web Locks serialize browser tabs; sign-in ownership is checked
before sending. Cache only the generic offline shell and public static/brand
assets. Avoid storing credentials, peer scores or private server responses.

Because business repositories are volatile, refuse non-demo project startup and
report not-ready. This prevents the foundation being mistaken for a durable live
competition service. The unsigned-emulator-token restriction is retained. Next
implementation priority is transactional Firestore and persistent signed identity,
not bypassing authentication or relabeling synthetic screens as complete.


## 2026-10-30 — Transactional Firestore core and migration boundary

Sources: Firestore transaction/isolation documentation and lockfile-pinned
firestore 0.58.0 source; implementation/test evidence in
`docs/firestore-repositories.md`. Implement per-document entry/score/receipt/ledger
records, not a whole-chapter JSON snapshot or post-response write-behind cache.
Authorization is re-read through the transaction-bound client; effects and audits
commit together. Store pending reservation totals and score completion as
transactional ledgers. A first judge score increments completion once; a revision
replaces it. A division lock checks the ledger and current panel authority without
reading an unbounded division. Future approval/readiness paths must maintain the
same ledgers atomically before their migration gate opens.

Keep `WSB_STORAGE=firestore` opt-in and limited to demo-wsb + explicit emulator.
Unmigrated paths return 501 instead of mixing durable and volatile records. Real
readiness distinguishes reachable storage from a complete release; release_ready
stays false. Direct emulator repository tests and fresh child processes verify
persistence without introducing a production browser-token authentication bypass.
CI definitions exist but remote execution is not claimed. Registration, publication,
provisioning and full signed identity remain required work.

## 2026-10-30 — Docker local runtime and signed test identity

User requested Dockerizing the full local test environment and adding production
configuration later. Use Compose for web, Rust API and demo-wsb Auth/Firestore/
Storage/UI, with generated local settings, persistent emulator/key/cache volumes
and an atomic idempotent synthetic bootstrap. Production configuration stays
separate; public web settings require an image rebuild. Do not copy existing
ignored production settings into images. Source: docs/local-docker.md and
docs/docker-validation-2026-10-30.md.

Reject unsigned emulator tokens. A separately compiled `local-testing` feature
checks the password directly with the Auth emulator, loads current persistent
membership and issues an RS256 local session. The regular Firebase verifier keeps
its issuer; the production API image excludes the feature. This permits actual
local browser/API rehearsal without changing production authentication. Keys and
passwords live outside source/retrieval; outbox records contain no credentials.
Scoped persistent crew/entry reads and bounded authorized list pages enable
testing the migrated core. This supersedes only the historical local integration
blocker, not the remaining production identity/provisioning and workflow gates.


## 2026-10-30 — Own the forms and workflow experience

The user explicitly rejected redirecting users to the older site or external
forms for core functions. Build system-owned registration, verification/consent,
media, payment, support and application forms with Rust-authorized state and
real receipts. External sites/documents remain evidence, not workflow substitutes.
The audit in docs/native-workflows.md identifies Jotform registration, external
contact/chapter links and local forms that still fabricate success. The active
native-system-forms task tracks their replacements. Registration CTAs now point
to the internal event form; this URL change alone does not complete the task.


## 2026-10-30 — Registration receipts, explicit performers and lock barrier

Use chapter/actor-bound operation receipts for registration and explicit crew /
entry revisions for edits. Recheck current membership, ownership and assignment
before replay. Invitations store digests and bind the first successful redemption
to an actor and payload. New manager-owned crews and event entries begin with no
assumed performers. Select only canonical member IDs; registration bodies cannot
set identity or consent authority. Keep money-reserved/settled rosters read-only
until a separate change process is implemented. Payment changes advance entry
versions as well as balances.

Registrar decisions and head judge locks write the same division ledger, so a
concurrent approval cannot silently add an unscored entry behind a completed
lock. Support configured registration deadlines and pin the event rule version
without assuming an official cutoff. Source/contracts and verified races,
browser workflows and full Docker restart recovery: docs/persistent-registration.md.
The old roster page's demo-token and fake-save fallback were replaced with a
native authenticated form. This completes the durable command slice, not private
identity/consent/media processing or the complete platform.

## 2026-10-30 — Native inquiries with scoped visitor access and chapter review

Source: the user's system-owned-forms requirement; contracts, implementation and
verified checks in docs/native-inquiries.md. Visitors must be able to ask for help
without approved chapter membership. Use a cryptographically random per-request
capability whose chapter/request-bound hash is stored server-side; send it in an
authorization header, never a URL. It authorizes only that anonymous conversation,
not an account session or business command. Account requests require current
membership and owner UID, or chapter support/director authority. Recheck authority
inside transactions before reads, changes and receipt replay. The support role
does not inherit registrar, finance or judging powers.

Keep request/message/receipt/audit changes atomic, bind retry IDs to full input,
require expected revisions and bound queues, timelines and creation rates. Preserve
unsent replies on conflicts. Audits omit requester text/contact/access-key data.
Replace fabricated receipts, phone numbers, queue statistics and response promises
with actual server state. Requester-supplied email is unverified contact data,
not identity evidence. Conversations remain in-app; email delivery is separate.
Record live retention, key lifecycle/recovery and abuse decisions as unresolved
release gates rather than inventing policies. Anonymous capability access leaves
signed Firebase and separately compiled local identity verification unchanged.

## 2026-10-30 — Avoid simulated sensitive submissions

Source: native workflow audit and the actual participant/staff pages. The old
identity upload and staff review claimed success even on API failure; music and
application screens fabricated outcomes, while guardian/waiver pages displayed
unverified local records. Show explicit unavailable states until authoritative
private upload, consent/relationship verification, audio inspection and HQ
application workflows exist. A support inquiry is only a question, never an
application, upload, approval or signature. This is an interim integrity fix;
the original implementation and release criteria remain unchanged.

## 2026-10-30 — Private identity evidence workflow boundary

Source: user goal in `memory/project.md`, `docs/private-verification.md`,
demo-wsb Storage/Firestore rules and browser/repository evidence. Implement the
native identity/residency upload and chapter-scoped human review as a private,
durable workflow. The subject owns the case and object path; current chapter
membership and reviewer role are checked server-side; Storage objects are
immutable; the API checks Firebase Storage metadata before accepting submission
or review. Do not infer age eligibility, guardian relationship, event consent,
readiness, valid document types or retention from identity review. These remain
separate policy and privacy gates, and MIME metadata does not establish byte
format or malware safety. Verification is local to demo-wsb; production storage
and membership are not enabled.

## 2026-10-30 — Durable online check-in before signed passes

Source: docs/product-brief.txt, docs/firestore-repositories.md and
docs/online-checkin.md. A marshal supplies a specific approved entry and dancer;
the server rechecks chapter membership, event assignment, entry scope, roster and
readiness transactionally. One event/dancer key makes retries and concurrent
check-ins converge on the same record with one audit. Revalidate eligibility and
authority on replay. The identifiers do not authenticate the dancer: manual
identity confirmation is still required, and this is neither a signed QR pass nor
an offline scanner. Synthetic readiness is not evidence of real ID/consent/audio
processing. All associated policy, verification and venue release gates remain.

## 2026-10-30 — Persist head-judge technical deductions

Source: the current head-judge deduction command, Firestore repository access
contract and demo-wsb integration evidence. Store deductions separately from judge
scorecards under the event division and crew hash. Require current head-judge
authority, an approved crew entry, an unlocked division and an explicit expected
revision. Bind replay to the full deduction payload, commit the audit with the
change, and return the same denial for missing and out-of-scope crew references.
Do not allow edits after lock. This preserves current behavior while avoiding
invented deduction categories or sanction rules. The contemporaneous publication
gate was lifted by the later `Publish immutable locked result projections`
decision below. Tie policy and correction behavior remain open.

## 2026-10-30 — Publish immutable locked result projections

Source: current event routes, durable score/lock contracts, public-result pages and
demo-wsb publication integration. Only publish after a server lock; aggregate one
current scorecard per configured panel judge and apply separately saved technical
deductions. Recheck the lock generation before an atomic snapshot, marker and audit
commit. Public readers use only immutable `publicEvents` documents. Since the
existing API addresses public results by `event_id` without `chapter_id`, reserve
that identifier globally on first publication and deny a cross-chapter collision
rather than choosing an arbitrary event. Retry returns the same committed snapshot.
Keep tied results unpublished and do not enable correction/republication until
those rules are approved. This is an API implementation boundary; a user-facing
event slug remains open for event configuration.

## 2026-10-31 — Chapter, studio and partner proposals stay requests until HQ governance exists

Source: user direction to keep workflow forms inside WSB, `docs/native-workflows.md`,
and the current chapter support authorization model. Route public chapter,
studio and partner proposals into durable, private conversations assigned to an existing
regional chapter support queue, where current support/director membership can
reply. Give the requester a scoped capability key and durable reference. Do not
claim that a proposal is an approved application or creates an affiliation; the
global HQ queue, reviewer membership, decision policy and retention lifecycle are
not yet in place. An external country directory remains optional, labeled
reference material; primary proposal calls stay in WSB.

## 2026-10-31 — Recover interrupted evidence submissions

Source: `docs/private-verification.md` and demo-wsb repository/browser checks.
Bind case creation retries to the subject, chapter, operation ID and purpose;
recheck membership before replay. Allow a pending submission retry only after
the same owner and Storage metadata checks. An unsubmitted case can resume an
upload without replacing an existing object. Review decision replay remains an
open recovery task; no age, consent or evidence validity policy is inferred.

## 2026-10-31 — Recover evidence review decisions

Source: `docs/private-verification.md` and demo-wsb browser/repository checks.
Supersede the review-replay gap above: commit a reviewer- and case-scoped,
payload-bound receipt atomically with the decision and audit. Recheck active
chapter authority and Storage metadata before replay. Reject a changed payload
or a new decision after review. The UI's document-open step is an interaction
guard; the server cannot establish that a reviewer read the document.

## 2026-10-31 — Gate unverified consent and audio shortcuts

Source: `apps/api/src/registration.rs`, `apps/api/src/store.rs`,
`tests/e2e_tiers/harness/system_harness.mjs`, and `docs/open-questions.md`.
The interim endpoints cannot establish guardian authority or inspect media and
the export reads volatile synthetic state. Return 501 until durable, authorized
workflows exist. Remove the fixed five-second addition from readiness; use the
configured maximum while the grace policy remains unresolved. A standalone
JavaScript model test is not proof that actual API or recovery behavior works.

## 2026-10-31 — Read venue arrivals from the authoritative store

Source: `docs/online-checkin.md` and the Firestore check-in transaction contract.
The durable marshal desk must display arrivals committed to Firestore, not its
volatile test store. Add a bounded cursor list scoped to the event and recheck
current chapter membership, role and assignment before returning it. Validate
record chapter/event IDs and reject invalid page bounds. The list is operational
only; it does not authenticate identity or imply QR/offline pass support.

## 2026-10-31 — Keep ordinary Docker iteration image-free

Source: user request for faster local testing and `compose.yaml` workspace mounts.
Build images once with `tools/local.ps1 setup`; ordinary `up` uses `--no-build`.
Restart mounted-source services without rebuilding via `restart-api` or
`restart-web`, retaining Docker's Cargo and Next build volumes. Use explicit
`build` only for image inputs such as Dockerfiles, dependency lockfiles or
emulator/seed contents. This keeps emulators containerized while source editing
and incremental compilation use the workspace.

## 2026-10-31 — Do not present simulated stage commands as live

Source: marshal route and `docs/website-plan/04-feature-workflows.md`. The former
local queue and hold button had no server effect or operator notification. Show
an unavailable state until an authorized, durable and conflict-aware stage
workflow exists. Existing online check-in remains a separate action.

## 2026-10-31 — Stage progression groundwork

Source: `docs/website-plan/04-feature-workflows.md` section 7, a proposed
workflow rather than an official rulebook. Model the ordinary sequential stage
positions in Rust; do not infer skipped, delayed or withdrawn policies. This
predicate alone does not authorize a command or establish a queue, stage lock,
readiness, notification or durable receipt. Keep the operator UI unavailable
until those contracts are implemented and verified.

## 2026-10-31 — Transactional stage progression in demo-wsb

Source: `docs/stage-operations.md`, the proposed stage workflow and Firebase
transaction documentation linked there. Require a configured active stage,
current marshal assignment, approved ready entry and roster check-ins through
performance start. Allow a previously started performance to be completed even
if readiness later changes, so the stage claim can be released; this action does
not restore eligibility. Commit
the stage position, revision, actor-scoped payload-bound receipt and audit in one
transaction. A configured single-performer stage has a shared barrier, and an
event-scoped entry claim prevents simultaneous performance on two stages. The
normal progression remains proposed and local; exceptional states, configuration,
operator reads, notices and full workflow recovery remain open.

## 2026-10-31 — Connect the marshal desk to bounded stage reads

Source: `docs/stage-operations.md`, the demo-wsb repository and browser checks.
Expose stage and stage-entry pages only after current chapter/event authority is
checked; paginate with bounded cursors and filter entries to the requested
stage. Display the returned positions and explicit revisions, not an invented
lineup. Submit changes through Rust with session-bound, payload-bound operation
IDs; an interrupted response can be retried. Stage holds, calls, ordering and
notifications are separate unimplemented workflows. The Docker seed script is
workspace-mounted and provisions the synthetic local stage once, with a marker
that preserves later fixture changes and deletions. This supersedes the earlier
instruction to rebuild the image when only `seed.cjs` changes.

## 2026-10-31 — Persist an in-app stage hold

Source: stage workflow and `docs/stage-operations.md`. Set/release a hold using
explicit revisions, replay receipts and a redacted audit in one transaction.
Read the same stage document when starting a performance to serialize holds and
starts. Allow completion while held. Periodic browser status is supplementary;
venue communications remain necessary because alerts are not delivered yet.

## 2026-10-31 — Commit ordered stage history with stage effects

Source: stage call-history requirements and `docs/stage-operations.md`. Increment
one shared stage history revision in each new stage-move or hold transaction;
write its history row with state, receipt and audit. Use padded sequence document
IDs for deterministic paging. Start existing documents at zero without inventing
past events. Keep history private pending an authorized staff timeline.

## 2026-10-31 — Authorize each stage history page

Source: `docs/stage-operations.md`. Require current event marshal/director
access and active matching stage before reading its history subcollection.
Keep cursor pages bounded and private. The history endpoint does not publish
staff actor IDs or operational records through public results.

## 2026-10-31 — Verify stage history through the recovered staff view

Source: `tests/stage-browser-recovery.cjs` and the completed local Docker
recreation. Require the saved stage state and all seven history sequence labels
in order through the signed browser view. Repository persistence alone was not
used as evidence for the connected timeline's recovery.

## 2026-10-31 — Require explicit stage marshal lists

Source: assigned event/stage authority in the page/workflow contracts. Default
missing stage marshal lists to empty, denying marshal access. Require current
event assignment plus membership in the server-owned list on each operation,
including replay; retain chapter-director oversight. Migrate only the known
synthetic local stage once, preserving explicit lists and later revocations.

## 2026-10-31 — Director-controlled stage marshal lists

Source: stage authority contract and `docs/stage-operations.md`. Require current
chapter-director authority, explicit access revision and active chapter/event
marshal membership before granting stage access. Permit empty lists for revoke.
Persist assignment effect, receipt and audit in one transaction. Keep the command
internal until API and native director controls are verified.

## Director stage assignment form — 2026-10-31

Use the existing tactical marshal desk for director-only stage access management,
with explicit account IDs and a saved access revision. Rust validates every
proposed marshal against current chapter and event membership; UI visibility is
not authority. Reload current access after an accepted command because a replay
receipt may describe an older revision. Source: native forms requirement,
repository stage assignment contract and signed API/browser checks.

## Stage provisioning starts held — 2026-10-31

Use a create-only director command with stage ID uniqueness, payload-bound
receipts and atomic audit. New stages start on hold with an empty marshal list,
so creation cannot immediately start performances or grant staff access. Explicit
initial hold is not a historical hold change. Source: stage authorization and
hold invariants in docs/stage-operations.md; native forms requirement. Existing
stage capacity and ID cannot be mutated through creation.

## Held and unoccupied stage lifecycle — 2026-10-31

Permit director deactivation/reactivation and performer-capacity edits with a
separate config revision. Require a hold and query performing stage entries,
not only the single-performer pointer, before a new effect. Preserve history and
assignments; inactive stages remain visible to directors for recovery while
marshal reads/writes fail closed. Source: stage safety/access contracts and
multiple-performer state in apps/api/src/repository/stage.rs. No competition
rule or offline capability is inferred from these operational settings.

## Keep stage planning separate from published order — 2026-10-31

Persist revisioned internal stage lineup drafts with ordered approved event entry
IDs and a required edit reason. Current director authority, held/unoccupied stage,
expected revision and transactionally committed snapshot/receipt/audit prevent
silent overwrite. Authorized marshals can read the draft. Do not treat it as a
published schedule, judge assignment, eligibility grant or enforced call order.
Source: performance-order page requirements and proposal-only rules provenance.
Seeding/randomization, publication and crew notifications remain distinct work.

## Private lineup revision history — 2026-10-31

Expose immutable draft snapshots through bounded paginated stage-authorized reads,
showing order, actor, timestamp and reason to staff. Current stage authority is
checked on every page; draft history is not a published event schedule. Source:
docs/stage-operations.md and native stage lineup draft requirements.

## Restrict synthetic payment webhook — 2026-10-31

Synthetic settlement is limited to explicitly enabled local-testing demo-wsb
with an emulator and a configured secret of at least 32 bytes. Remove the known
fallback secret. This test adapter is not a real payment provider integration.
Source: apps/api/src/finance.rs and signed local fail-closed checks.

## Fail closed on inconsistent synthetic settlements — 2026-10-31

For the local-only synthetic webhook, reject unsupported statuses and mismatched
reported amounts, check payment/location/entry scope and subtract the reserved
amount with checked arithmetic. These preserve ledger integrity and do not
define real provider event contracts. Source: existing finance reconciliation
contract and demo-wsb repository tests.

## Reject late synthetic settlements — 2026-10-31

Do not acknowledge a synthetic settled event when the payment is already failed
or refunded; return a conflict without modifying balances. Exact settled retries
remain idempotent. Source: finance repository and demo-wsb refund/replay test.

## Require explicit synthetic settlement scope — 2026-10-31

Payment IDs are chapter scoped; the durable synthetic webhook must receive an
explicit chapter rather than guessing among fixed chapter names. The global
synthetic endpoint has no durable settlement scope and cannot settle a payment.
Source: finance repository tenant boundary and demo-wsb denial tests.

## Validate payment record identity — 2026-10-31

Reconciliation and refund must reject a payment record whose stored ID differs
from its requested chapter-scoped document ID. Source: finance ledger scope
contract and demo-wsb corrupted-record test.

## Surface inconsistent payment quotes — 2026-10-31

Use checked minor-unit arithmetic for payment quotes. If paid or reserved
amounts exceed their available balance, return a conflict for reconciliation
instead of presenting a misleading zero. Source: finance ledger integrity
contract and synthetic demo-wsb over-reservation test.

## PayMongo provider and local emulation — 2026-10-31

The user selected PayMongo and authorized local emulation until keys are
available. Use PayMongo hosted checkout documentation and signed webhook event
contracts as implementation evidence; preserve private server credentials,
chapter-scoped reservations and event-id idempotency. User requirement for
native WSB forms remains: collect WSB details in our own system; a provider
hosted payment step can complete the payment itself. Source: user instruction
and https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start
and https://docs.paymongo.com/docs/developer-tools-webhooks-events. No live
provider integration is claimed yet.

## Local PayMongo emulator groundwork — 2026-10-31

Provide a separately identified local-only synthetic service with no credentials
and no real payment side effects. Its initial in-memory session/event prototype
is not provider integration or durability evidence; connect through a server
adapter and durable WSB ledger before claiming checkout works. Source: user
provider choice and PayMongo checkout/event documentation.

## Persist synthetic PayMongo sessions — 2026-10-31

Persist local emulator session, event and emulator-specific operation receipt
together using atomic local file replacement on a named Docker volume. Do not
claim this implements PayMongo provider idempotency or WSB ledger recovery.
Source: user request for local emulation and restart recovery goal.

## Local PayMongo checkout client — 2026-10-31

Separate the local-only emulator client from real PayMongo transport; validate
its returned mode, reference, amount, currency and session identity. Never
interpret creation as payment. Source: local emulator contract and user choice.
This is not a production provider adapter.

## Reserve before local PayMongo session — 2026-10-31

Use a demo-only chapter/payer/operation-scoped transactional reservation before
any simulated external checkout. Share the entry pending balance with manual
requests to prevent over-allocation. This preliminary record needs session
mapping, settlement, cancellation and recovery before exposure. Source: WSB
split-payment invariants and user-selected local PayMongo emulation.

## Bind local checkout sessions transactionally — 2026-10-31

Reserve first, call only the synthetic emulator with the durable reservation ID
as its synthetic operation/reference, then atomically attach the verified
session and unique index after rechecking current entry authority. Retry uses
the same reservation and emulator operation. Session creation never settles a
payment. Source: local emulator contract and demo-wsb concurrent retry test.

## Synthetic checkout cancellation — 2026-10-31

For local-only checkout, expire a bound synthetic session before transactionally
releasing its reservation. Refuse release when session status is paid or unknown;
recheck entry authority and use checked accounting. Include chapter in reservation
operation keys so the same user/operation across chapters cannot collide in the
shared emulator. Source: demo-wsb cancellation and cross-chapter tests.

## Local checkout API isolation — 2026-10-31

Expose synthetic start/cancel only when the local-testing build has an active
signed local identity and durable demo-wsb storage. Each operation rechecks
entry authorization; creation alone never settles payment. Source: local
PayMongo reservation/cancellation contract and signed demo API test.

## Local checkout recovery view — 2026-10-31

Expose bounded local reservation pages only to the current authorized entry
payer, rechecking authorization per page. Show explicit simulation status and
allow retry or safe cancellation; do not present a created session as paid.
Source: local PayMongo contract and signed API/browser checks.

## Synthetic checkout settlement transaction — 2026-10-31

Keep settlement authority in a demo-only transaction with unique event receipt,
session/reservation mapping, exact amount/currency validation and atomic balance,
readiness, ledger and audit. This internal method requires a separately verified
event; it is not a public webhook and does not implement the real provider.
Source: payment idempotency and local PayMongo emulator requirements.

## Signed local PayMongo callback — 2026-10-31

Use a separately generated local-only secret and PayMongo-shaped raw-body
HMAC header for synthetic delivery. Verify test mode and event/payment shape,
then match the saved session and commit the event receipt and balance together.
Synthetic simulation never enables the production provider. Source: user
request and https://docs.paymongo.com/docs/developer-tools-webhook-setup-management.

## PayMongo provider integration and durable reconciliation — 2026-10-31

Implement official PayMongo API client (pps/api/src/paymongo.rs) with HTTP Basic Auth,
hosted checkout creation (/v1/checkout_sessions), session expiration, and refunds
(/v1/refunds). Enforce strict fail-closed security: missing credentials return 503
Service Unavailable in production; keys are never stored in client or chapter records.
Before checkout session dispatch, transactionally reserve entry balance in pending_minor;
on creation, bind the session ID to the reservation index (localCheckoutSessionIndex/{session_id}).
Webhook endpoints at /v1/paymongo/webhook and /v1/webhooks/paymongo verify HMAC-SHA256
signature with 300s timestamp tolerance, enforce event deduplication (localCheckoutEvents/{event_id}),
and execute atomic settlement (moving pending_minor to paid_minor, updating readiness,
and recording audits). Refund events reverse paid amounts and update readiness transactionally.
Portal UI provides direct PayMongo checkout initiation and an authoritative return status page
at /app/payment-return emphasizing server webhook reconciliation.
Source: user prompt, official PayMongo docs (https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start,
https://docs.paymongo.com/docs/developer-tools-webhooks-events, https://docs.paymongo.com/docs/developer-tools-webhook-setup-management).
