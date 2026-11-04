# Decision log

## 2026-11-03 — Load marketing motion only when it can be used

Source: `apps/web/src/components/marketing-motion.tsx`, the WSB motion and
performance guidance, and the 390px production-browser comparison recorded in
`docs/overall-audit-2026-11-02.md`. Keep the visible marketing page and poster
usable without its GSAP/ScrollTrigger/Lenis engine. Dynamically mount the
engine only after the reduced-motion preference and saved session preference
are known; clean up its scoped animations and load Lenis only for fine-pointer
desktop use. Reduced-motion transfer dropped the 50,539-byte motion chunk in
the local comparison. Do not equate this homepage lab result with field
performance or change the branded visual direction.

## 2026-11-03 — Bound document parser work in a child process

Source: `apps/api/src/verification.rs`,
`apps/api/tests/document_parser_process.rs`, and the F07 release limits in the
overall audit. Run bounded PDF/JPEG/PNG parsing in a disposable child with
environment clearing, bounded input, a killable wall deadline, and Linux
address-space/CPU limits. This prevents a stuck parser from retaining a Tokio
blocking worker. The Linux limits were not exercised on this Windows machine;
best-effort image allocation accounting, estimated PDF retained-object budgets,
and shared-container privileges remain limitations. Preserve fail-closed
scanning and keep production-container exhaustion/responsiveness tests open.

## 2026-11-03 — Keep public discovery disabled until publication is established

Source: root and marketing metadata, route publication state and F14 in the
overall audit. Default to noindex, make only known public marketing routes
indexable, and keep dynamic event/content pages out until publication exists.
Generate the sitemap only when an approved HTTP(S) public base URL is configured.
Indexing directives do not protect data; server authorization and published
projections remain authoritative. Production domain and approved sharing art
are not available in the workspace.

## 2026-11-02 — Use native skip-target navigation for first-render accessibility

Source: the production browser audit in `tests/audit-browser.cjs` and the
marketing main landmark in `apps/web/src/app/(marketing)/page.tsx`. A
client-side skip-link handler can run after a keyboard user has already
activated the link during hydration. Keep the shared skip link as a native
fragment link, and make the initial public main landmark programmatically
focusable with `tabIndex={-1}`. This preserves useful navigation before React
hydrates. Other route groups still need the same landmark audit before claiming
application-wide keyboard conformance.

## 2026-11-02 — Show only sourced platform signals on the HQ overview

Source: PAGE-086 in `docs/website-plan/pages.json`, the existing authorized
status and notification-queue handlers in `apps/api/src/hq.rs`, and the data
limits recorded in `docs/global-hq-session.md`. Combine those current signals on
`/hq` with bounded-response validation and account-scoped state. Label queue
counts as sampled. Do not invent chapter/event totals or global publication
counts while their authoritative aggregate and publishing feeds are absent.

## 2026-11-02 — Structurally parse private PDF evidence before review

Source: `apps/api/src/verification.rs`, the private evidence contract in
`docs/private-verification.md`, and the `lopdf` 0.46 API's strict loading and
per-stream decompression limit ([`LoadOptions`](https://docs.rs/lopdf/0.46.0/lopdf/struct.LoadOptions.html),
[`Document`](https://docs.rs/lopdf/0.46.0/lopdf/struct.Document.html)). Parse
PDFs in a single-slot blocking worker with a 30-second request deadline and an
8 MiB per-stream decompression limit before scanning and durable submission.
The parser checks the catalog and root page-tree shape without materializing all
pages into a second map.
The 30-second deadline includes waiting for the single worker slot; if a worker
gets stuck, later requests fail closed when their queue wait expires. This is
in-process parsing; the timeout does not stop a stuck worker, it does not bound
total document memory, and it does not inspect every embedded page resource.
Keep those limits visible as release work; this does not approve evidence types
or validate claims.

## 2026-11-02 — Preserve scoped event assignment notice handoff

Source: event assignment mutation and notice construction in
`apps/api/src/repository/membership.rs`, current role/assignment checks in
`apps/api/src/repository/events.rs`, and the event-duty selector and chapter
chooser in `apps/web/src/app/(console)/console/page.tsx` and
`apps/web/src/components/workspace-access.tsx`. Assignment-granted notices may
open the scoped event-duty selector; removal notices return to workspace
selection. Preserve only a validated same-origin `/console?chapter=…&event=…`
destination through chapter selection. The selector checks current server
access, so a notice or stale link does not authorize a duty. Cross-chapter
browser recovery remains to be rehearsed.

## 2026-11-01 — Route account discovery and notification operations

Source: account and notification handlers in `apps/api/src/registration.rs`,
`apps/api/src/notifications.rs` and the durable gate in `apps/api/src/main.rs`.
Permit only the implemented discovery, list and read methods; repository
membership and recipient checks continue to govern every request.

## 2026-11-01 — Cancel DJ exports on workspace changes

Source: current workspace session in `apps/web/src/lib/account.ts` and download
handling in `apps/web/src/app/(console)/console/[eventId]/audio/page.tsx`.
Abort a pending request and stream when account, chapter or event changes, and
avoid showing an earlier scope's result in the new workspace.

## 2026-11-01 — Explain interrupted DJ archive streams

Source: local DJ ZIP stream error handling in `apps/api/src/registration.rs` and
the audio desk in `apps/web/src/app/(console)/console/[eventId]/audio/page.tsx`.
When the response stream fails, report that the ZIP did not complete and offer a
new export. This does not assert browser cleanup of partial downloads.

## 2026-11-01 — Route local-only DJ export to existing authority checks

Source: local DJ export handler in `apps/api/src/registration.rs`, repository
event assignment checks and migration gate in `apps/api/src/main.rs`. Allow its
exact GET route only in local-testing; production export remains gated.

## 2026-11-01 — Use an ordered query cursor for audit pages

Source: `apps/api/src/repository/audit.rs` and the demo-wsb emulator error for
ordered ListDocuments page tokens. Order by timestamp and document ID descending
and resume after both values. Refresh discards old tokens; missing timestamps
remain a migration gap. Authorization is still checked on every page.

## 2026-11-01 — Route chapter audit reads to the durable repository

Source: chapter audit route and migration gate in `apps/api/src/main.rs` and
current membership checks in the audit repository. Allow this exact read route
through the gate without changing authorization or the stored audit content.

## 2026-11-01 — Route existing event setup handlers

Source: event setup and staff listing routes in `apps/api/src/main.rs` and
their authorization in the corresponding Rust repositories. Permit the exact
implemented methods through the durable migration gate; do not change draft
status, chapter authorization or policy approval requirements.

## 2026-11-01 — Route event draft creation to the durable handler

Source: event creation route and migration gate in `apps/api/src/main.rs` and
transactional chapter director checks in `apps/api/src/repository/events.rs`.
Permit the existing event creation route through the gate without changing its
authorization, private draft state, or rules-source requirements.

## 2026-11-01 — Route staff invitation commands to durable handlers

Source: staff invitation routes and migration gate in `apps/api/src/main.rs`,
and transactional authorization in `apps/api/src/repository/membership.rs`.
Allow only the existing create, revoke and accept endpoints through the durable
runtime gate; their current membership, identity and replay checks remain in
force. Synthetic integration evidence is in `infra/docker/test-local.cjs`.

## 2026-11-01 — Preserve partial work when dependencies reopen

Source: reopened task states in `workflows/tasks.json` and validation in
`tools/workspace.py`. Permit in-progress tasks to have unfinished prerequisites
so the tracker can represent partial work honestly. Completion still requires
evidence and completed dependencies; todo readiness remains dependency-gated.

## 2026-11-01 — Validate saved scores before applying retry timing

Source: `apps/web/src/lib/judging/outbox.ts` and
`tests/judging-outbox.test.cjs`. Invalid queued operations must be held for
review even when a corrupt retry timestamp appears to be in the future. Valid
operations continue to honor backoff and server-side scoring authority.

## 2026-11-01 — Retain null score receipts for review

Source: score receipt validation in `apps/web/src/lib/judging/outbox.ts` and
the malformed receipt test in `tests/judging-outbox.test.cjs`. Treat a null
receipt as an unverified response requiring review, preserving the operation
without automatic retry. The server remains authoritative for score state.

## 2026-11-01 — Match invitation replay test to current access boundary

Source: `redeem_invitation` in `apps/api/src/repository/registration.rs` checks
current crew membership before returning a redeemed invitation receipt. The
synthetic test expects 403 for a different non-member, preserving this boundary.

## 2026-11-01 — Verify guardian command receipts before clearing retries

Source: the create/response and redacted withdrawal contracts in
`apps/api/src/repository/guardian.rs` and the same-tab recovery flow in
`apps/web/src/components/guardian-requests.tsx`. Match command scope, actor,
request, resulting revision and lifecycle state before reporting success; retain
the operation reference when a response is malformed. This does not establish
guardian verification or consent.

## 2026-11-01 — Make PayMongo checkout retries bounded and reconcilable

Source: PayMongo's official [idempotency guidance](https://docs.paymongo.com/reference/idempotent-requests)
states that creation requests accept an `Idempotency-Key`, retries with changed
parameters are rejected, and keys expire after 24 hours. Use a stable SHA-256
key derived from the checkout reference, persist the provider's exact checkout
URL and mode with the session mapping, and require an explicit configured
test/live mode before provider checkout. Validate the session against the
reserved reference, amount, currency, mode and active status before binding.
Persist the attempt timestamp before network dispatch and stop retrying an
unknown outcome at 23 hours, leaving the reservation pending for reconciliation.
This avoids relying on provider idempotency past its documented lifetime. The
production Firestore checkout path remains disabled; no live provider call or
refund behavior is authorized by this change.

## 2026-11-01 — Fail closed on private-media scanning

Source: official ClamAV Docker and clamd protocol documentation
(https://docs.clamav.net/manual/Installing/Docker.html,
https://docs.clamav.net/manual/Usage/ClamdProtocol.html). Stream bounded file
bytes using `INSTREAM`; keep the unauthenticated, unencrypted clamd TCP socket
on a private API-to-scanner network with no host port. Require a clean response
before an identity case is marked pending or an audio inspection receipt is
stored. Scanner failure blocks those operations; a clean result is not a claim
that a file is safe or a valid identity document. Persist scan state alongside
the content digest so older records without evidence remain inaccessible to
reviewers until resubmitted. Production still needs private network placement,
signature-freshness monitoring and false-positive handling. The official guide
recommends 4 GiB RAM for the ClamAV container.

## 2026-11-01 — Add technical MP3 inspection without asserting format policy

Source: Symphonia's official repository, package documentation and getting
started guide (https://github.com/pdeljanov/Symphonia,
https://docs.rs/symphonia/latest/symphonia/index.html,
https://github.com/pdeljanov/Symphonia/blob/main/GETTING_STARTED.md). Use its
pure-Rust MP3 decoder to inspect uploaded MP3 bytes in a bounded blocking worker,
alongside the existing PCM/float WAV inspector. This is an implementation
capability only: no approved event rules have established whether MP3 is an
allowed submission format, nor deadline, malware scanning, DJ export or
compliance/readiness behavior. Keep all review outcomes manual and non-authoritative
until those rules are approved.

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

## Present implementation with explicit evidence boundaries — 2026-10-31

Use separate Diataxis documents and a ten-slide core deck with four Q&A backups
to explain how the introduced workflows replace the original paperwork chain.
Include working local behavior, emulation and unfinished scope explicitly;
neither route counts nor documentation existence proves production completion.
Retain synthetic-only demonstrations and avoid invented savings/capacity metrics.
Source: user's documentation/deck request, docs/product-brief.txt, the two
workspace architect skills, current API source and recorded workflow checks.
Rationale: operators and defense reviewers need useful procedures and a clear
account of the original problem without overstating the implementation.

## Exercise real role handoffs in the local stack — 2026-10-31

Extend the signed Docker API check with isolated synthetic marshal, stage and
publication operations, and preserve their recovery references through container
recreation. Mount the test source to avoid stale image copies. Source: user
request for role automation, infra/docker/test-local.cjs and docs/local-docker.md.
Model-only scenario tests cannot establish that the running application implements
the same behavior. Fixture consent/audio are explicitly not workflow evidence.

## Include the incomplete registration handoff in real API rehearsal — 2026-10-31

Create crew, invitation, roster and incomplete submission through signed Rust
commands in a separate synthetic division; verify registrar denial of approval
until readiness exists. Follow filtered pagination until its cursor ends. Source:
docs/persistent-registration.md and infra/docker/test-local.cjs. This keeps
actual media and guardian completion distinct from seeded event-day fixtures.

## Fail closed on provider-linked manual refunds — 2026-10-31

The prior handler committed a refunded ledger state before an untracked provider
request, allowing provider errors and ambiguous retries to diverge from finance
records. Reject provider checkout reservation records and known provider ID
prefixes in the manual refund transaction until durable idempotent provider
dispatch and reconciliation exist. Source: apps/api/src/finance.rs and the
payment repository; synthetic tests in infra/docker/test-local.cjs and
tests/local-paymongo-api.cjs. Manual reference refunds remain supported. The
prefix guard is conservative for ambiguous manual references, and is not a
replacement for an explicit provider classification/migration.

## Defer unsafe provider refund events — 2026-10-31

Reject signed refund events with retryable 503 until their provider payment can
be mapped without chapter fallback and the exact refund amount, status, currency,
identity and duplicate-event payload can be reconciled transactionally. Keep the
ledger unchanged, and reject live/test mode mismatches. Source: current refund
event parser and apps/api/src/repository/paymongo_local.rs. This protects ledger
integrity while leaving provider refund implementation explicitly unfinished.

## Reject ambiguous checkout settlement — 2026-10-31

Require explicit matching modes, object types, IDs, currency and one positive
paid payment before converting a signed checkout event into a ledger command.
Source: apps/api/src/paymongo.rs and tests/paymongo-webhook-integration.cjs.
Defaults or selecting one of several paid objects can misrepresent provider
state; reject rather than guessing. Real provider compatibility still requires
controlled integration evidence.

## Inspect audio bytes before event-policy decisions — 2026-10-31

Start music processing with a bounded server-side WAV byte inspector that derives
duration from validated sample frames; do not trust client-provided duration or
mark an entry ready from the inspector alone. Source: product brief, unresolved
audio policy in docs/open-questions.md, and apps/api/src/audio_inspection.rs.
Unsupported WAV variants and MP3 remain explicit follow-on work.

## Authorize inspection without granting readiness — 2026-10-31

Expose a bounded raw WAV inspection only after current chapter membership and
crew-manager ownership are checked. Return measured metadata and saved=false;
do not write the entry or infer policy compliance. Source: the WAV inspector,
registration authorization contracts and infra/docker/test-local.cjs. This
creates an end-to-end inspection primitive while private durable storage and
approved music rules remain separate, unfinished workflow requirements.

## Limit private music upload grants — 2026-10-31

Allow a one-time WAV object only for an active manager and a matching unexpired
server-created intent; deny overwrites explicitly with resource == null. The
one-hour expiry and 25 MiB cap are technical limits. Storage rules can access at
most two Firestore documents per evaluation, so they check membership and intent;
the future Rust acceptance transaction must independently recheck current crew,
entry state and the uploaded bytes before submission or readiness. Source:
https://firebase.google.com/docs/storage/security/rules-conditions and demo-wsb
tests/storage.test.mjs. This does not establish official media policy or scanning.

## Inspect the stored music object — 2026-10-31

Read the server-created private object using the caller's Storage token, bound
the byte stream, inspect the content and recheck current manager and entry scope
after the read. Report inspection without writing readiness or approval. Source:
apps/api/src/registration.rs, repository/music.rs and synthetic local storage
integration. Production Storage, durable inspection acceptance and policy remain
separate release requirements.

## Reserve music upload scope before granting storage — 2026-10-31

Create an actor/operation-scoped intent inside a Firestore transaction after
checking current manager ownership and entry revision. Derive its identifier
from the actor and operation and return a stable path; do not grant Storage access
or change entry readiness until immutable upload, object verification and review
exist. Source: registration transaction contracts and repository/music.rs.

## Preserve the Firestore-only provider boundary — 2026-10-31

Keep local PayMongo reservation/reconciliation helpers compiled only for local
testing. Durable non-local provider handlers return unavailable until a separate
production-safe provider repository exists. Refund protection checks reservation
existence without depending on a local-only Rust type. Source: Firestore-only
compile failure and apps/api/src/finance.rs; local synthetic checks pass but do
not establish production provider readiness.

## Expose inspection without implying submission — 2026-10-31

Provide the entry manager a native WAV check that displays server-measured
metadata and explicitly says the track is not saved or approved. Source:
apps/web/src/components/audio-inspection.tsx and the authorized inspector.
No readiness changes are inferred from a transient inspection response.

## Bind durable checkout receipts to signed body — 2026-10-31

Hash the exact verified body into the transactionally stored checkout event
receipt for both webhook routes. A changed payload using the same event ID
conflicts even when normalized amount and session match. Legacy receipts without
a digest do not silently upgrade; replay requires review. Source: checkout
receipt equality in apps/api/src/repository/paymongo_local.rs and signed local
tests/paymongo-webhook-integration.cjs. Full provider migration remains open.

## Persist measured music inspection without approval — 2026-10-31

After reading the immutable object, commit its digest and measured metadata in
an intent-scoped receipt with an audit. Recheck membership, manager, intent and
entry revision inside the same transaction; exact concurrent retries return the
same record and changed bytes conflict. Source: repository/music.rs and
tests/music-storage-integration.cjs. This receipt is not event compliance,
track submission or readiness; those require separate policy and implementation.
# Recover private music uploads without storing file bytes — 2026-10-31

Retain a tab-scoped operation ID, entry revision, size and SHA-256 fingerprint
before requesting an upload intent. On retry, inspect any existing immutable
object and compare the server-computed digest with the selected file before
reporting success. This prevents an interrupted upload from requiring an unsafe
overwrite or incorrectly identifying different bytes as the selected file.
No file contents or credentials are saved in browser recovery state. Source:
apps/web/src/components/audio-inspection.tsx, apps/api/src/registration.rs and
tests/music-storage-integration.cjs. Browser interaction verification remains open.

# Exercise client SDK storage paths — 2026-10-31

Test the actual Firebase SDK against demo-wsb with a synthetic file larger than
its small-upload threshold. REST-only upload tests cannot establish that the
client's missing-object handling, resumable upload and security-rule behavior
work together. Source: tests/music-storage-sdk-integration.cjs and
apps/web/src/components/audio-inspection.tsx. This is not a browser UI test or
proof of recovery from an interrupted network transfer.

# Record music submission separately from approval — 2026-10-31

Re-inspect the private object before a transactional manager submission, then
store a versioned pending-review record and payload-bound operation receipt.
Check the current entry revision and manager again inside the transaction, and
require the freshly measured digest to match the durable inspection receipt.
Submission leaves entry readiness unchanged because event rules and review are
not yet established. Sources: apps/api/src/registration.rs,
apps/api/src/repository/music.rs and tests/music-storage-integration.cjs.

# Restrict reviewer music playback to authorized local demo — 2026-10-31

The local-testing API may read a submitted immutable object from the demo-wsb
Storage emulator with its emulator-only privileged credential after current
reviewer membership and event assignment checks. Verify the actual bytes against
the submitted digest and repeat authorization and submission checks before a
no-store response. The endpoint is unavailable in production builds; production
storage access requires a separately designed trusted credential and authorization
path. Source: apps/api/src/registration.rs, repository/music.rs and synthetic
tests/music-storage-integration.cjs. Playback is not an approval decision.

# Record manual music review without inferring compliance — 2026-10-31

An authorized local-demo reviewer can record reviewed or needs-correction against
the current submission version, with a required note for correction. Verify the
stored track before the transaction, recheck event authorization inside it and
write a payload-bound idempotency receipt and audit. A resubmission advances the
version and returns to pending review. Neither outcome changes entry readiness or
asserts an unverified event policy. Sources: apps/api/src/repository/music.rs,
apps/api/src/registration.rs and tests/music-storage-integration.cjs.

# Store duration guidance only as a sourced draft — 2026-10-31

Allow a chapter director to version a local-demo duration and grace draft with a
required source and the current event rules version. It neither approves music
nor changes readiness, and a locked division rejects changes. A one-day combined
limit is a technical input bound, not a WSB rule. Approval, provenance verification,
policy activation, readiness recalculation and official grace values remain open.
Sources: docs/open-questions.md, apps/api/src/repository/music.rs and
tests/music-policy-integration.cjs.

# Compare music duration as a draft advisory — 2026-10-31

For local planning, compare the durable inspection duration against a division's
sourced draft maximum plus grace inside a chapter-authorized read transaction.
Require matching submission and receipt, validate the draft and event rules
version, and return explicit missing or stale states. The result is advisory only:
it does not approve a track, change a review outcome or update entry readiness.
Sources: apps/api/src/repository/music.rs, apps/web/src/components/music-advisory.tsx
and tests/music-policy-integration.cjs. Official music rules remain unresolved.

# Group synthetic role and music rehearsal checks — 2026-10-31

Run the existing local role workflow, an isolated multi-actor private music
upload/correction/resubmission flow, draft-policy checks and judging-outbox tests
under one repeatable PowerShell command. The music rehearsal creates and cleans
synthetic records and uses actual local Firebase SDK upload and Rust API commands.
This is targeted development evidence, not an all-role event certification.
Sources: tools/test-rehearsal.ps1 and tests/music-workflow-integration.cjs.

# Remove fabricated participant and public records — 2026-10-31

Do not show hard-coded passes, consent approvals, payment confirmations, stage
calls, scorecards, qualifications, legal policy or results as real user or event
state. Use chapter-scoped entry reads where available, published projections for
results, and explicit unavailable states for unfinished workflows. Sources:
apps/web/src/components/event-day-entries.tsx, affected portal/marketing routes
and tests/content-integrity.cjs. Remaining prototype surfaces require further audit.

# Expose only a participant's own recorded arrival — 2026-10-31

Resolve the event check-in key from the signed-in dancer or manager's UID after
current chapter membership and event checks. Return only a recorded flag and
timestamp, and treat a missing record as no recorded arrival. Do not interpret
the read as a credential or eligibility decision. Sources: apps/api/src/
repository/venue.rs, apps/api/src/event_ops.rs and infra/docker/test-local.cjs.

# Limit participant stage reads to their entry — 2026-10-31

Authorize a participant stage read against current chapter membership and the
entry's manager or dancer roster, then query only that entry's stage records.
Include held and active status, cap the result, and reject inconsistent stage
scope. The screen refreshes on request and does not imply a notification or
schedule. Sources: apps/api/src/repository/stage.rs,
apps/web/src/components/event-day-entries.tsx and infra/docker/test-local.cjs.

# Provide participant aggregates from published projections — 2026-11-01

For the signed-in crew manager or rostered dancer, return only the matching
entry's aggregate row from the chapter- and division-matched published snapshot.
Return no row before publication and reject inconsistent or duplicate entries.
Never read judge scorecards or expose unpublished scores through this path.
Sources: apps/api/src/repository/publication.rs,
apps/web/src/components/personal-results.tsx and infra/docker/test-local.cjs.


## 2026-11-01 — Repeat saved-state checks during rehearsal
Expose the existing test-local.cjs --recover branch through the local runner and
invoke it after role checks. Source: infra/docker/test-local.cjs recovery assertions.
This provides fresh-process evidence only, without claiming container recreation.


## 2026-11-01 — Guardian request UI preserves authority boundary
Connect the participant portal to existing versioned relationship requests while
keeping confirmation awaiting verification. Source: apps/api/src/repository/guardian.rs.
A relationship assertion alone cannot authorize dependent access or event consent.


## 2026-11-01 — Guardian request withdrawal before verification
Either named dancer or guardian may withdraw an unresolved relationship request.
Current actor authority is mandatory; counterpart inactivity must not prevent
withdrawal. Only awaiting_guardian and awaiting_verification are eligible; future
verified relationships require their own revocation workflow. Source: guardian
request contract and PAGE-052 relationship-revocation acceptance; no approved
signer/evidence policy is inferred. Withdrawal changes no roster consent bits.


## 2026-11-01 — Event waiver drafts preserve versions before approval
Use event-scoped, staff-only waiver drafts with separate immutable history and
actor/payload-bound receipts. Source: PAGE-051 document-version acceptance and
docs/open-questions.md signer/language/policy gates. Draft text is never consent
and does not set roster consent or readiness. Local drafting enables later
approved publication/signing without inventing legal terms or signer authority.


## 2026-11-01 — Inspect waiver history through current event authority
Expose exact saved draft versions to chapter directors and currently assigned
registrars. Source: PAGE-051 document version acceptance and waiver history
contract. Reauthorize each lookup; preserve draft-only status and render content
as text. Looking up history must never overwrite the current editor version.


## 2026-11-01 — Durable battle ballot receipt belongs to the judge
Use a single immutable corner per match/judge and return that ballot's original
response on exact retry, after rechecking current event and panel authority.
Source: existing battle store invariants and docs/durable-battles.md. Majority
closure remains synthetic configured behavior, without claiming rule approval.
Keep private matches separate from any future arena publication projection.


## 2026-11-01 — Battle outcome is separate from personal acknowledgement
Source: the connected battle vote screen and durable ballot receipt contract.
Use chapter-scoped APIs derived from current workspace identity. A closed match
can display its outcome without asserting the current judge cast a ballot.
An acknowledged corner remains that judge's own submitted corner, not the
winning corner. Current list bounds fail closed rather than silently truncate.


## 2026-11-01 — Battle bracket seeding and advancement stay policy-gated
Sources: docs/pilot-scope.md marks roster retention as proposed;
docs/open-questions.md tracks advancement and battle edge cases unresolved.
Keep match setup, panel ballots, revisioned activation, readback, manual result
visibility and bracket seeding/advancement distinct. Do not auto-seed, create
byes, treat a withdrawal as a win, or advance across divisions until event
policy supplies source, authority, correction behavior and audit requirements.


## 2026-11-01 — HQ identity requires separate platform membership
Global HQ session authorization reads `globalMembers/{uid}` after verifying the
Firebase ID token. Only an active `hq_admin` record with matching UID and
`auth_time >= valid_after` is accepted. Chapter membership and claims alone do
not grant global authority. Source: `docs/website-plan/02-roles-and-navigation.md`
defines Global Administrator as a separate Global Governance role; this schema
is an implementation boundary, not a claim that provisioning or HQ actions are
complete. Global records require trusted server-side provisioning. No
self-service grant, cross-chapter action, or break-glass access is enabled.

## 2026-11-01 — Local HQ sign-in uses global membership, not chapter claims
The synthetic HQ account has no chapter membership. Local session minting omits
chapter scope only when Firestore authorizes the account through
`globalMembers/{uid}`; normal chapter session behavior remains membership-bound.
Source: `apps/api/src/local_identity.rs`, `apps/api/src/repository/hq.rs`, and
the global administrator role boundary in `docs/website-plan/02-roles-and-navigation.md`.
This enables later HQ role rehearsal without creating a local-only authority
bypass or seeding a production credential.

## 2026-11-01 — Confirm a new account email before changing it

Use Firebase `verifyBeforeUpdateEmail` for account email changes, then apply the
Firebase action code through the existing identity action route. Password-based
accounts reauthenticate before requesting the change; the old address remains
current until the new address confirms. This follows Firebase's
[JavaScript Auth reference](https://firebase.google.com/docs/reference/js/auth#verifybeforeupdateemail)
and avoids activating an unconfirmed address. Local SMTP/action-link delivery is
restricted to the isolated demo-wsb Auth emulator. Email confirmation does not
grant WSB chapter access. No production email was sent or tested.

## 2026-11-01 — Preserve only approved WSB return destinations through identity

Use a same-origin path allowlist (`/invite/`, `/app/register/`, `/app/entries/`)
for post-sign-in and post-verification return context. This follows PAGE-026
and PAGE-027 in `docs/website-plan/03-page-catalogue.md`, which require safe
redirects and preservation of invitation/registration intent. Reject external
origins and all other routes. Carry the allowed path through sign-up, unverified
sign-in, email action links and the verification screen; Firebase/Rust remains
the authority for identity and chapter access. No route parameter grants a role
or bypasses authentication.

## 2026-11-01 — Resolve chapter role from current server membership
After validating the signed Firebase identity, resolve membership by the
requested chapter and UID, then derive role from that server record. Do not
authorize from Firebase `chapterId` or `role` claims; a UID may have separate
memberships in several chapters. Keep `auth_time >= valid_after` and recheck
current membership/role inside durable transactions. Source:
`docs/website-plan/02-roles-and-navigation.md` requires current membership and
denies implicit cross-chapter access; [Firebase's token revocation guidance](https://firebase.google.com/docs/auth/admin/manage-sessions)
notes ID tokens are stateless and revocation checking needs an Auth backend
round trip. This
change removes claim synchronization as a role-provisioning dependency, but
does not complete provisioning or disabled-user/revocation enforcement.
# 2026-11-01 — Demo chapter staff access command policy

Source: `docs/website-plan/02-roles-and-navigation.md` and the authorization
requirements in `docs/architecture.md`. The role matrix requires grantors to
stay within their authority, recent reauthentication, and an audit with actor,
recipient, scope, period and reason. Demo-wsb director changes therefore use
reasoned, revisioned transactions, finite expiry, and an operation receipt. The
five-minute recent-auth window and the assignable chapter-role list are explicit
application choices because the source does not define their exact values; keep
them configurable/reviewable before production. Do not infer that a UID is a
valid Firebase account or that an invitation was sent. Event assignments and
production disabled-user/revocation checks remain separate work.

## 2026-11-01 — Demo division panel configuration boundary

Source: existing scoring and lock implementation in `apps/api/src/repository/judging.rs`
and the director/head-judge role matrix. Panel changes are allowed only before
scorecards exist and before the division locks. The 1–20 range matches the
current score lock aggregation limit; it is not an approved WSB judging rule.
Each configured judge must have active, unexpired chapter membership and an
active event assignment. Updates are revisioned and audited, and share the
division document with scoring writes so a simultaneous judge submission forces
transaction conflict/retry. Supersede the numerical limit only after WSB
provides an approved panel policy and the aggregation path is designed for it.

## 2026-11-01 — HQ chapter appointment boundary

Source: `docs/website-plan/02-roles-and-navigation.md` high-risk permission
matrix. Global admins may appoint chapter roles within their authority, including
chapter directors; chapter directors cannot appoint another director through
their chapter workspace. Demo HQ changes therefore require an active, signed
`hq_admin` record, recent authentication, a finite access period, expected
revision, reason, replay receipt and chapter audit. HQ self-change is denied.
This path does not create Firebase accounts, deliver invitations or alter global
HQ membership. Firebase account validation and production disabled-user/token
revocation remain release gates.


## 2026-11-01 — Global HQ proposal follow-up boundary

Source: `docs/native-applications.md` defines proposal intake as a private
conversation, not approval, and leaves review criteria, decision states and
retention for WSB policy. Add a root index containing only application ID,
chapter, category and timestamps so authenticated Global HQ staff can locate
threads without making proposal content public. Index creation, thread update,
revision and audit are transactional. Reuse the support conversation states for
communication only. Do not encode acceptance, refusal, licensing or partnership
approval until the user supplies approved source references. Existing proposals
created before the index require a demo-only backfill; the chapter queue remains
available in the meantime.

## 2026-11-01 — Inspect verification file signatures before review

Source: `docs/private-verification.md` already defines PDF/JPEG/PNG as the local
technical upload formats, while explicitly leaving approved evidence types,
malware scanning, age/residency decisions and retention open. Before a submitted
case becomes pending, read the immutable Storage object through the authenticated
requester's Firebase token, cap transfer and buffer at 10 MiB, verify exact size
against metadata, and check a small format-specific signature. Hold bytes only
in transient memory; never store them in Firestore, logs or retrieval. This is
an integrity check against mislabeled uploads, not document validation or
malware safety, and it does not change readiness or review status policy.


## 2026-11-01 - Music queue returns only pending review metadata

Source: current `MusicSubmission` transaction stores a versioned, inspected WAV
and `review_submitted_music` accepts only current registrar/chapter-director
assignment plus expected version. Expose a paginated event queue using that same
role and assignment check. Return only entry ID, version, measured duration and
submission time; omit owner UID, SHA-256 and object path from the queue. A manual
`reviewed` or `needs_correction` result remains a communication/review outcome,
not event compliance or readiness. This does not choose approved file formats,
deadlines, late handling, malware-scanning policy or DJ export behavior.

## 2026-11-01 - Connect the native event music review queue

Source: current `MusicSubmission`, `review_submitted_music`, and the task role
matrix. A crew manager's WAV inspection and submission are already versioned and
persisted; the missing operator workflow was discovery of pending files. Add a
paginated chapter-scoped submission read that checks current registrar/director
membership and event assignment. Return only entry ID, version, measured duration
and submit time. Continue to require the existing per-entry audio read and review
commands for opening or changing a submission. A manual reviewed/correction
status is not a compliance or readiness decision. Do not infer MP3, late-submission,
malware, or DJ export rules.

## 2026-11-01 - Event command center reads saved configuration

Source: event command center acceptance in `docs/website-plan/03-page-catalogue.md`
and current `Event` aggregate. The dashboard must display stored event fields,
not illustrative metrics. Restrict its event detail route to current chapter
directors or assigned registrars; authorize again in the Firestore repository.
Display only event name, status, rules version and configured registration
closure. Do not infer totals from a single page, derive readiness, or show fake
division/fee values. Format the stored Unix deadline using the operator timezone
and label that timezone; no event timezone field exists on this schema.


## Event command center access and scope - 2026-11-01

The event record is served from the durable chapter repository and restricted to
chapter directors or event-assigned registrars. The dashboard intentionally shows
only persisted event fields and direct workflow links; it does not invent readiness
aggregates. Waiver drafting remains a separately compiled local-testing feature,
so the dashboard link is shown only when `NEXT_PUBLIC_WSB_LOCAL_TESTING=true`.
Consent and guardian rules remain pending the user-provided approved source
references.


## Battle desk uses paged durable summaries and revision readback - 2026-11-01

Source: `apps/api/src/repository/battles.rs` response contract and director UI.
The chapter match list returns `{items,next_page}` and caps each page at 100;
the desk must consume that contract and expose a continuation action. Draft
activation and editing require the current server revision, so load configuration
after save or reload before enabling activation. Do not infer bracket seeding,
bye, withdrawal, winner advancement or tie rules from the 3/5-panel majority
ballot implementation. These require approved competition policy.

## DJ export snapshots current lineups without claiming compliance - 2026-11-01

Source: `docs/native-workflows.md`, current revisioned `StageLineup` records,
private `MusicInspectionReceipt` records and the event-assigned audio role.
Generate a streamed ZIP only in the local demo build, using current stage order
and revision. Include media only when manual review is recorded, scanning is
clean and bytes match the inspection receipt; put excluded entries and their
states in `manifest.csv`. Preserve stage boundaries and avoid inventing a total
order across stages. Label `reviewed` as a human workflow outcome, never as
compliance, readiness or approval under a rulebook. Keep production media
credentials/access disabled until a service identity and scanner operations are
approved. User-provided official format and approval references remain pending.

## Reconcile provider refund facts without enabling WSB refund decisions — 2026-11-01

Source: PayMongo's official [refund resource](https://docs.paymongo.com/reference/refund-resource),
[refund guide](https://docs.paymongo.com/docs/payment-acceptance-refunds), and
[webhook event examples](https://docs.paymongo.com/docs/developer-tools-webhooks-events).
Persist the provider payment ID on a verified checkout-settlement event. Apply
only provider refund records with `status=succeeded`, keyed by the unique refund
ID and raw-body event digest, in the same transaction as the entry paid balance,
payment status, readiness counters and audit. Accumulate partial refunds as
provider facts and mark the WSB payment fully refunded only at the original
amount. Do not expose refund initiation or decide eligibility, reasons, or
deadlines until WSB approves those terms. Keep this webhook reconciliation in
demo-wsb/test mode; production provider settlement stays disabled pending
controlled account validation and recovery rehearsal.

## DJ export covers the full event in one download — 2026-11-01

Source: `docs/product-brief.txt` (DJ downloads the entire show's playlist in one
click) and `docs/website-plan/04-feature-workflows.md`. Build one archive from
all current event stage lineups while preserving each stage's own order/revision
and recording every entry's division in the manifest. Do not imply a cross-stage
total order. Keep the export demo-only, require current event assignment, and
include only manual-reviewed media that matches its clean inspection receipt.

## Historical HQ application indexing is a demo-only metadata migration — 2026-11-01

Source: `docs/native-applications.md` and the Global HQ application queue.
Older chapter-local inquiry threads need an index row to be discoverable in the
cross-chapter HQ queue. Rebuild those rows from the authoritative inquiry
summary, keeping request text and contact fields chapter-local. Run only against
the explicitly confirmed `demo-wsb` Firestore emulator until production HQ
provisioning and privacy/retention controls are approved. Use per-record
transactions, preserve matching rows, repair stale metadata, and fail closed on
cross-chapter ID collisions.

## Chapter event creation saves an unactivated draft — 2026-11-01

Source: `docs/website-plan/03-page-catalogue.md` (PAGE-064–067),
`docs/website-plan/04-feature-workflows.md`, and `docs/product-brief.txt`.
Create a private event shell from the chapter director's supplied date, valid
IANA timezone, venue and rules source/version reference. Store the reference as
input; do not claim it is an approved rulebook. Require current director
membership and recent authentication, and atomically persist the event,
payload-bound replay receipt, audit and global event-ID reservation. Keep the
new record in draft state; opening registration, event policies, division fees,
stage structure and publication are separate actions and remain unfinished.

## Registration dates stay on unactivated drafts — 2026-11-01

Source: `docs/website-plan/03-page-catalogue.md` (PAGE-065) and the current event
draft workflow. Allow a chapter director to configure both registration window
endpoints on a draft using local date/time values and the event's saved IANA
timezone. Reject daylight-saving ambiguous or nonexistent times, partial
windows, stale revisions and close-before-open. Persist UTC epoch seconds with
the revisioned event and a payload-bound receipt/audit in one transaction.
Saving these dates must not open registration: eligibility policy, division
configuration and activation are still separate and incomplete.

## Draft event details remain editable only before activation — 2026-11-01

Source: `docs/website-plan/03-page-catalogue.md` (PAGE-064–067) and current
event setup workflow. Permit the chapter director to correct the draft's name,
date, timezone, venue and supplied rule source/version using a revisioned,
payload-bound operation. Keep the record in draft and preserve the operator's
source text without claiming it is approved. A timezone change is refused while
registration instants exist; the director must clear the window first so the
same absolute timestamps are not silently reinterpreted.

## Division policy authoring remains separate from live registration — 2026-11-01

Source: `docs/website-plan/03-page-catalogue.md` (PAGE-068–069),
`docs/open-questions.md`, and `docs/product-brief.txt` (proposed requirements).
Let chapter directors prepare event-scoped division configuration drafts with
source/version/effective-date fields and integer minor-unit fees. Each save
creates an immutable version snapshot and an audited, payload-bound receipt.
Keep these drafts outside operational `divisionState`; do not expose them to
participant registration, pricing, readiness or judging. No approval or publish
transition is available until the official rule source, policy values and
authorized approving role are supplied.

## Chapter audit access stays read-only — 2026-11-01

Source: `docs/website-plan/pages.json` (PAGE-085), current `AuditRecord` schema,
and the server-side chapter membership model. Add a narrowly scoped `auditor`
chapter role so authorized reviewers can inspect chapter audit history. The API
rechecks active membership and limits reads to the caller's chapter; the role
does not authorize business mutations. Display and export only persisted fields
and explicitly mark browser exports as partial until an approved full-export
contract exists. At this decision's initial writing, reason and correlation
fields were incomplete. Subsequent implementation added correlation IDs to new
shared, membership and panel audit writes, and required reasons on event creation,
core draft edits, registration-window changes and division-policy draft saves.
Other producers remain incomplete; no tamper-evidence claim is made.

## Global HQ integration status reports configuration separately from connectivity — 2026-11-01

Source: `docs/global-hq-session.md`, the current Firestore readiness route,
PayMongo configuration and webhook handlers, and the previous `/hq/integrations`
page. Remove fictional Stripe/Xendit/Twilio/SendGrid claims and fake HTTP ping
results. Expose only HQ-authorized, no-store configuration-presence indicators
and the live Firestore reachability probe. Do not return secrets or represent
configuration as credential validation, external connectivity, delivery success
or release readiness. Controlled external-provider checks remain a separate gate.
Use the same authorized read-only response for `/hq/operations`; do not present
local UI state as maintenance control or claim ledger verification without a
server-backed verifier.

## Global HQ chapter directory shows only stored chapter metadata — 2026-11-01

Source: `docs/global-hq-session.md`, `Chapter` records and the existing
`globalMembers` authorization boundary. Provide Global HQ a bounded, current
Firestore directory of chapter ID, name and currency only. Licensing expiry,
seed quotas, director contacts and affiliation state do not exist in the
authoritative chapter record, so the UI must not infer or offer to edit them.
Future license management requires a sourced policy and a separate durable
record/approval workflow.

## Keep HQ rules and content preview claims behind their actual gates — 2026-11-01

Sources: `docs/open-questions.md`, PAGE-088 and PAGE-090 in
`docs/website-plan/03-page-catalogue.md`, and the proposal status in
`memory/project.md`. The product brief and event-authored policy drafts are not
approval evidence. Remove invented global divisions, rubric weights, edition
numbers and publication claims. Show open policy decisions with a reference-only
source link and no publish action. Until a durable CMS and publication authority
exist, show no sample global releases or pretend editing/publishing controls.

## Keep chapter publishing closed until editor and publisher authority exists — 2026-11-01

Source: PAGE-083 in `docs/website-plan/03-page-catalogue.md` and its acceptance
rule that an editor cannot publish without separately granted publishing
permission. The current role model has no editor/publisher roles and no content
repository, history, public projection or notification path. Do not infer that
the chapter director implicitly holds all of those permissions. Remove sample
published notices and browser-only publishing actions until the role matrix and
durable workflow are defined.

## Guardian request retries survive reload without expanding authority — 2026-11-01

Source: `apps/api/src/repository/guardian.rs`,
`apps/web/src/components/guardian-requests.tsx` and
`docs/private-verification.md`. Store only the pending command/operation ID in
tab-scoped session storage so an unknown response can be retried after reload.
On the server, recheck the current actor membership and request ownership, then
return an exact operation receipt before requiring counterpart activity. This
recovers an already committed operation if counterpart status later changes;
new operations still require an active counterpart. Clear recovered commands
on success or definitive conflict, but keep them on auth/transient failures.
This remains a local-demo relationship request, not verified guardian authority,
dependent access, event consent, or readiness.

## Persist stable audit correlation identifiers on new audit writes — 2026-11-01

Source: PAGE-085 (`docs/website-plan/pages.json`),
`apps/api/src/repository/mod.rs`, `apps/api/src/repository/membership.rs`, and
`apps/api/src/repository/panel.rs`. Persist the immutable audit document ID as
`correlation_id` for all writes through the shared helper and specialized
membership/panel writers. Operation-backed IDs are stable across exact replay.
This identifies the audit event but is not a request-wide trace across services.
Preserve nullable fields for legacy records. Do not synthesize a human reason:
make reasons available where the command collects one, and keep required-reason
policy, legacy migration, retention, and export gates open until specified.

## Check Firebase disabled and revoked-user status in the non-demo verifier — 2026-11-01

Source: Firebase Admin session guidance and the Identity Platform
`projects.accounts.lookup` / `UserInfo` references, plus
`apps/api/src/auth.rs`. After JWT signature/project validation, a non-demo
Firestore build uses ADC with the identitytoolkit scope and checks the resolved
UID, disabled flag and `validSince` against token `auth_time`. Invalid, disabled,
revoked or missing accounts are rejected; IAM, OAuth or service failures return
503 rather than granting access. This adds a network request and is intentionally
not activated while startup and Firestore connection still restrict the runtime
to the demo emulator. Account lookup at staff grant, invitations and disabled
user administration remain separate work.

## Enforce membership expiry in direct Firebase Storage rules — 2026-11-01

Source: `MembershipRecord.expires_at`, the API's `current_membership` expiry
check, `infra/firebase/storage.rules`, and PAGE-085/private-media access
boundaries. Storage clients upload/read directly and bypass the Rust resolver, so
Storage rules must enforce active membership, `auth_time >= valid_after`, and
unexpired `expires_at` themselves. Apply the check to private verification reads,
verification uploads, manager music access and assigned reviewer music reads.
Missing or null expiry preserves legacy/permanent records; configured expiry uses
Firebase server request time. This mirrors already-recorded membership access
terms and does not invent a new expiry policy.

### Private verification Storage read gate — 2026-11-01

Direct chapter-reviewer reads of verification objects require an existing,
path-consistent case in `pending` state with `malware_scan_status == clean`, and
the only readable object name is `document`. The API already rejects review
without a clean scan and reviewer lists omit unscanned legacy records, so Storage
must enforce the same boundary; otherwise a chapter reviewer could bypass the
API and read an in-progress upload. The subject retains access to their own
canonical object for upload recovery. No document bytes or sensitive values are
copied into development memory.
### Production staff grants validate the Auth target first — 2026-11-01

For non-demo Firestore builds, chapter and HQ membership grants must confirm the
target Firebase Auth account exists and is enabled before starting the Firestore
transaction. Perform the external lookup before the transaction; IAM, network or
Identity Platform errors fail closed, while missing/disabled accounts receive a
client-correctable response. Current membership and token status still govern
subsequent access. The local `demo-wsb` path remains isolated and does not call
production Auth. Runtime remains demo-only, so this code path is not a claim of
production verification or readiness. This fills the documented missing target
UID lookup without adding invitation, account-creation or disable-user authority.
### Resolve workspace chapter from current membership records — 2026-11-01

Do not use the Firebase `chapterId` claim as the membership directory or as
authorization. Add a signed-in, paginated `/v1/account/chapters` read that scans
the server-owned chapter directory and returns only current UID memberships
after active, expiry and `valid_after` checks. The browser stores the selected
chapter only as a navigation preference; the chapter session endpoint and every
durable command continue to recheck current authority. This avoids a new
denormalized membership index and its synchronization/backfill problem. The
accepted tradeoff is one direct membership read per chapter in each bounded page.


### Require reasons for event configuration changes — 2026-11-01

Require an 8–1000 character human reason when a chapter director creates an
event, edits core draft details, changes the registration window, or saves a
versioned division-policy draft. These are durable, high-impact configuration
actions identified in PAGE-085's audit-reason requirement. Persist the reason in
the same transaction as the mutation, receipt and stable audit correlation ID.
This provides a bounded initial policy without making a director-authored rule
draft official. Other mutations still need an explicit audit-reason decision;
retention, immutability administration and full archive export remain open.


### Require reasons for director stage configuration — 2026-11-01

For the initial PAGE-085 policy, require an 8–1000 character reason when a
chapter director creates a stage, changes its configuration, or changes marshal
access. Commit that reason with the state change, replay receipt and audit
correlation ID. Validate newly assigned marshals against current, unexpired
chapter membership and active event assignment. Keep stage position and hold
commands reasonless for venue speed while preserving their actor/action/resource
audit. This narrows the human-reason requirement to consequential configuration;
it is not full audit-reason coverage. Source: PAGE-085 in the product brief and
the documented stage-command workflow in `docs/stage-operations.md`.


### Require reasoned, replayable manual finance decisions — 2026-11-01

Require an 8–1000 character reason and operation ID for manual payment
reconciliation and full manual-ledger refund recording. Persist the decision,
payload-bound receipt and audit reason in one Firestore transaction; exact
retries return the receipt, and changed operation reuse conflicts. The native
refund screen may reverse the WSB ledger only after a bank/cash refund has been
independently confirmed; it must not imply or initiate a transfer. Keep
provider-linked refunds disabled until PayMongo validation, approved refund
terms, failure recovery and any separate-approver policy are provided. Source:
PAGE-075 in `docs/website-plan/pages.json`, PAGE-085 audit content and the open
PayMongo/refund-policy gates in `docs/open-questions.md`.


### Enforce optional chapter membership expiry across adapters — 2026-11-01

Treat a non-null membership `expires_at` as a hard access deadline for chapter
sessions, role checks and event-assignment access in both Firestore and
in-memory demo adapters. Preserve missing/null expiry as no recorded expiry for
legacy membership records, while `valid_after` continues to require a fresh
authentication after grants or changes. Source: the membership record contract
and expiry behavior in `docs/persistent-membership.md`; expiry already exists in
the durable membership schema and Firebase Storage rules.


### Use UID-bound single-use links for chapter staff invitations — 2026-11-01

Until a configured email sender exists, let directors share an invitation link
directly. The browser generates 256 random bits; only a SHA-256 digest is stored
in the chapter invitation and a server-only lookup. Put the code in the URL
fragment so it is not sent in the request or referrer. Bind it to a pre-existing
UID and an assignable chapter role, expire acceptance after seven days, and keep
the granted role's expiry separate. Acceptance requires that UID's signed,
recently authenticated session and transactionally consumes the invitation while
writing membership, receipt and audit. Director revocation is also reasoned and
transactional. Do not send email or create accounts. Production Firebase Auth,
account lifecycle operations, invitation-record retention, and signed API rehearsal
remain open gates.

## 2026-11-01 — Signed-in crew landing uses connected chapter data

Source: user goal to complete real role workflows, and the existing
chapter-authorized `GET /v1/chapters/{chapter}/crews` contract. The `/app` route
must not present the old fictional sample event, roster, or
browser-only registration state as the participant's real workspace. Reuse the
existing authenticated `/app/crews` view as the landing page; the API already
filters crew reads using current chapter membership and ownership. Keep explicitly
labeled preview registration and demo event shortcuts separate from the signed-in
workspace. This removes duplicate fake-dashboard UI without adding eligibility or
competition rules.

## 2026-11-01 — Director-controlled public stage projection

Source: the WSB proposed public arena screen and the implemented server-owned
stage operations. Replace sample dancers, sponsor claims, countdowns and fake
hardware success with a reasoned chapter-director action to publish one active
stage. Keep the public Rust projection intentionally small: event/chapter names,
current crew/division labels, held state and stage freshness only. Resolve public
event IDs through the reserved event directory and require chapter agreement;
commit stage state and event selection atomically. The browser display polls and
retains its last factual value on connection loss. Do not expose rosters, entry
IDs, scores, payments or draft lineup. Bracket, sponsor, event-publicity, and
physical display delivery policies remain open; local implementation is not a
claim of production LED or stream integration.

## 2026-11-01 — Remove synthetic public timetable and livestream claims

Source: static audit of `/events/[eventSlug]/schedule` and `/events/[eventSlug]/live`.
Both routes showed invented running order, stage names, dates/times, camera/bitrate
claims, viewer counts and a browser-only cheer action. Keep the existing public
routes useful by linking to the director-published stage display and published
results while stating that no public timetable or video stream is connected.
Do not expose private lineup drafts as a timetable. Schedule publication authority,
time-zone source/revision behavior, stream rights, audience interaction and
moderation need decisions before implementing those features.

## 2026-11-01 — Keep public marketing content sourced and permissioned

Source: [WSB community page](https://worldsupremacybattlegrounds.com/community/),
checked 2026-11-01, and static audit of WSB app routes. The source states that the
Battlegrounds Championship launched in Melbourne in July 2004 and describes the
Hong Kong 2027 event; prior app copy incorrectly claimed Sydney origins, made-up
audience/reach metrics, certified judge credentials, fixed scoring/penalty rules,
and named crew rosters/honors. About copy now links to WSB's source; rules pages
identify PDFs as source documents, not an event-attached approved version; public
crew and chapter pages do not expose sample identities, contacts or affiliation
claims. Keep those workflows gated by source approval, chapter publication
authority, and dancer/guardian consent where people are identified.

## 2026-11-01 — Store private in-app notifications under recipient membership

Source: the implementation audit requires idempotent event notifications, and
the user goal requires chapter-isolated role workflows. Keep inbox records under
the recipient's chapter membership so the API can enumerate only that account's
bounded page and recheck current membership on every read/acknowledgement. Write
the crew-invitation acceptance notice in the same Firestore transaction as crew
and invitation state, using a deterministic source-derived ID so exact retries
cannot duplicate it. Apply the same pattern to entry review, payment ledger
transitions, event staff assignments and division panel changes, targeting the
manager, payer or assigned staff/judge account. Eligible online check-in sends
the rostered dancer a minimal arrival notice only when a current active chapter
membership record exists. The
demo PayMongo adapter may notify only for test-mode settlement and refund events.
Revisioned stage-position changes notify the affected crew manager, including
holding, on-deck, performing, and completed transitions.
Manual music review decisions notify the entry's crew manager using the
submission version as the idempotency source; the message states that the manual
outcome does not establish event compliance or entry readiness.
Maintain one unread counter under the recipient chapter membership and update
it in the same transaction as notification creation/read acknowledgement. Recheck
the notification and counter together to keep retries and concurrent reads
idempotent. Return the unread total independently from the loaded page. External
push/email delivery, preferences and unconnected business-event notifications
are not implied or marked complete.

## 2026-11-01 — Keep chapter content drafts private until publication policy is approved

Source: PAGE-083 and the unresolved content-rights, editor/publisher, audience,
correction, removal, notification and retention decisions in
`docs/open-questions.md`. Implement private, plain-text, chapter-scoped
authoring for the current chapter director role so chapters can prepare content
without creating a public claim. Save each draft revision, payload-bound
operation receipt and audit record in one Firestore transaction; require the
expected revision and use bounded reads. Render draft text as text, with no HTML
or uploaded media. Do not add review, publish, public projection, or delivery
actions under this provisional boundary. This does not settle who may review or
publish content or the remaining rights, audience, correction/removal,
notification and retention questions; those remain open before production
activation.


## 2026-11-01 — Notify the saved battle draft creator when ballots close

Source: the durable battle transaction and current notification inbox contract.
Capture the creating director UID in the private battle document on first save
and preserve it through draft edits. When the existing configured ballot logic
transitions the match to closed, atomically enqueue one chapter-scoped notice
using a deterministic match-derived ID. The notice reports the stored outcome
and links to the private match view; it makes no bracket-progression claim.
Legacy synthetic documents without a creator remain readable and skip this
notification. Check current active, unexpired chapter membership before writing
to the creator's inbox; a revoked/expired creator receives no new notice. This
does not approve the existing synthetic majority policy.


## 2026-11-01 — Payment detail pages show authorized ledger records

Source: the product brief's chapter-specific currency requirement, the durable
`PaymentRecord` contract and review of the hardcoded `/app/payments/[paymentId]`
page. Read the record through a chapter-scoped API and allow only its recorded
payer or current finance/director roles. Render saved fields and status as a WSB
ledger record; do not label it an official provider receipt or invent event,
crew, settlement-date or customer details. Use `Intl` currency precision for
minor-unit formatting and exact decimal parsing so currencies with zero or three
fraction digits are represented correctly. This does not change fees, payment
settlement, provider support, refund policy or production readiness.


## 2026-11-01 — Do not show unconfigured spectator ticket offers

Source: `docs/product-brief.txt` proposes ticket/VIP extensions without an
event-specific offer, and `docs/open-questions.md` now records the missing pilot
scope, inventory, price, admission, refund/transfer and credential terms. Remove
the public event route's slug-based Manila/Hong Kong names, fixed prices and
invented tiers. State that ticket sales are not connected, show no offer or
checkout, and provide only a general question link. Keep `/app/tickets`
unavailable until an authoritative ticket workflow is defined.


## 2026-11-01 — Unknown event slugs do not imply an event configuration

Source: the public event audit, `docs/open-questions.md` (public event
publication authority and human-readable slug/correction policy), and the
existing sourced static Hong Kong 2027 and labeled Manila preview pages. Remove
slug heuristics that generated dates, venues, divisions, fees, eligibility or
registration availability. Unknown slugs now show an unpublished-event state
and link to the event directory and official calendar. This does not create a
public event projection or approve event activation/publication policy.

## 2026-11-01 - Require current membership for inbox delivery

Source: `apps/api/src/repository/notifications.rs` and the event/payment
notification transaction writers. Every notification producer reads the target
chapter membership before staging inbox writes. Missing, inactive, or expired
recipients are skipped; a malformed cross-chapter membership fails closed. This
keeps a source command valid when a revocation races with its notice and avoids
creating inaccessible inbox records. It does not change source mutation
authorization or claim push/email delivery.

## 2026-11-01 - Use PayMongo's recommended Hosted Checkout v2

Source: PayMongo's official Hosted Checkout guide at
https://docs.paymongo.com/docs/payment-channels-hosted-checkout (retrieved
2026-11-01), which identifies v2 as recommended for new integrations and states
that it defers Payment Intent creation. The v2 quick start and Checkout Session
resource document line items, checkout URLs and PHP as the currently supported
currency. The official idempotency reference documents stable retry keys.

Move checkout creation/expiry to `/v2`; keep refunds on `/v1`. Normalize the
configured API origin so older values ending in `/v1` or `/v2` remain usable.
Validate returned IDs, checkout host, mode and any returned amount/currency
against the reserved request; derive omitted aggregate response fields from the
server-submitted request. Restrict PayMongo hosted checkouts to PHP until
multi-currency support is verified. Require operators to configure payment
method identifiers from the actual account instead of using an assumed list.
This is an implementation update based on provider documentation, not proof of
account compatibility; controlled test-account validation remains required.

## 2026-11-01 - Notify both payer and crew manager of payment transitions

Source: `docs/website-plan/06-content-and-publishing.md` notification plan and
the durable finance transition transaction. The recorded payer receives the
payment-detail link. If a distinct manager owns the entry crew, that manager gets
a generic payment-status summary linked to the entry workspace; payer-specific
payment details are omitted. Both notices use the payment transition's stable
operation-derived ID and commit with the payment, entry, division, audit and
receipt. The batch deduplicates identical recipients and current membership
checks suppress inaccessible inbox writes. This does not grant the manager access
to the payer-only payment record or alter payment authority.


## 2026-11-01 - Share payment notice fan-out across local provider transitions

Source: `apps/api/src/repository/notifications.rs`, its finance and local
PayMongo callers, and the payer/manager audience documented in
`docs/website-plan/06-content-and-publishing.md`. Manual finance and local
test-mode settlement/refund transitions use the same transactional fan-out. The
payer gets the private payment detail link; a distinct crew manager gets a
generic entry-workspace summary. Both recipients are membership-gated and
notified atomically with the source change. This does not grant payment-record
access or prove real provider behavior.


## 2026-11-01 - Never synthesize a PayMongo checkout redirect

Source: `apps/api/src/finance.rs` reservation replay and the provider adapter's
validated Checkout Session response. A saved session ID is not enough to
construct a hosted URL. If the reservation lost its validated `checkout_url`,
return a recoverable service error and preserve the reservation for operator
reconciliation. This avoids directing a payer to a URL the provider never
returned; controlled PayMongo account validation remains a separate release gate.


## 2026-11-01 - Validate PayMongo resource IDs before URL construction

Source: `apps/api/src/paymongo.rs`. Validate session IDs before interpolating
them into the checkout-expiration path, validate payment IDs before refund
requests, and reject malformed provider refund/payment IDs. Require the known
resource prefix plus a restricted ASCII path-safe suffix. This prevents a
malformed ID from changing the provider request path. Controlled provider
account validation remains required before production enablement.


## 2026-11-01 - Correct checkout expiration endpoint version

Source: PayMongo Hosted Checkout v2 integration and `apps/api/src/paymongo.rs`. Expiration must use the same v2 endpoint family as session creation. Corrected the previously unversioned URL; account-level behavior remains unverified.


## 2026-11-01 - Retain provider-backed reservations on unverified cancellation

Source: `apps/api/src/repository/paymongo_local.rs`, `apps/api/src/finance.rs`, and the PayMongo failure-reconciliation gate in `docs/open-questions.md`. Synthetic expiry cannot establish the status of a provider session. Reject local cancellation if a provider request has begun or a provider mode is recorded, and recheck within the release transaction to cover races. Preserve the reserved amount until a validated provider cancellation and reconciliation workflow exists.


## 2026-11-01 - Notify account requesters of support updates

Source: `docs/native-inquiries.md` and `apps/api/src/repository/support.rs`. Staff replies or status updates to an account inquiry write a generic inbox notice for the current chapter member in the same transaction, using inquiry ID and revision for deduplication. Conversation text and contact details stay out of the notice. Anonymous contact requests have no member inbox; delivery and role rehearsal remain open.


## 2026-11-01 - Link support notices to their conversation

Source: `apps/api/src/repository/support.rs`, `apps/web/src/components/support-workspace.tsx`, and the native inquiry access contract. Encode the chapter and inquiry reference in new notice links and select the conversation only in the matching active chapter. The reference grants no access: the existing authenticated inquiry endpoint remains authoritative. Older saved notice links are not rewritten.


## 2026-11-01 - Notify verification case owners of reviews

Source: `docs/website-plan/06-content-and-publishing.md` correction notification plan and `apps/api/src/repository/verification.rs`. Enqueue a generic owner notice transactionally when a pending case is reviewed, using a case-derived ID. Do not include identity evidence, review notes or decisions in the inbox preview. Current membership and existing review receipts govern delivery and replay; this does not establish eligibility or consent.


## 2026-11-01 - Encode dynamic notification destinations

Source: `apps/api/src/repository/notifications.rs` and the existing chapter-scoped notification producers. Encode each dynamic path segment and query value when constructing new relative destinations so saved identifiers cannot alter route structure. Existing notices are not rewritten. Roster-wide delivery needs a separately implemented bounded durable fan-out and is not claimed by this change.


## 2026-11-01 - Queue roster notifications in bounded transactions

Source: `docs/website-plan/06-content-and-publishing.md` registration and stage notification plan, roster limit in `apps/api/src/repository/registration.rs`, and the inbox transaction contract. Save one server-only job with approval or stage mutation; a local API worker delivers 20 recipients per Firestore transaction and advances or removes the job atomically with inbox writes. Each batch rechecks entry scope, current roster and chapter membership. Use generic current-status language for delayed delivery. Retain the existing immediate manager notice. This is a demo-wsb implementation and requires later replay, crash, concurrent-worker, access and volume verification before release.


## 2026-11-01 - Expand published result notices from a durable job

Source: `docs/website-plan/06-content-and-publishing.md` result notification plan, `apps/api/src/repository/publication.rs` published-only projection, and the bounded roster queue. Commit one job with the immutable publication; expand one published entry per transaction into a manager notice and roster job. Recheck projection and entry/crew scope, then current roster and membership during delivery. Link to the authenticated participant results workspace with the event and chapter encoded. This adds no correction, follower or external-delivery policy and requires recovery, concurrency and authorization rehearsal before release.


## 2026-11-01 - Expose bounded HQ notification queue samples

Source: PAGE-092 in `docs/website-plan/03-page-catalogue.md`, the server-only notification queues and current global HQ authority. Record failure attempts on pending jobs when storage is available, apply a 30-second retry cooldown and clear the cooldown on progress. A no-store HQ-admin endpoint reads only failure-count projections for at most 100 jobs per queue and returns aggregate samples. Completed jobs, failures outside the sample and failures that could not be recorded during outages are not represented. This is not incident management, alert delivery or proof of successful delivery.


## 2026-11-01 - Isolate malformed notification jobs

Source: notification queue worker and operations sample in `apps/api/src/repository/notifications.rs`. List only job progress metadata and process records independently by server-generated document ID. Record a failed attempt using a transactionally checked progress value and field mask, preserving the rest of the job. Report unreadable failure metadata in the bounded HQ sample; a damaged progress field can still prevent persistent failure tracking. The implementation requires synthetic malformed-job, recovery and concurrency rehearsal.


## 2026-11-01 - Notify local guardian request participants

Source: the local-only relationship request transaction in `apps/api/src/repository/guardian.rs` and the chapter notification contract. Create generic, operation-stable notices for the named counterpart on request, response and withdrawal; omit identity details and do not imply verified guardian authority. Require current unexpired counterpart membership for request/response. For withdrawal, skip delivery when the counterpart is unavailable or no longer has the expected role, preserving the actor-owned withdrawal path. Approved verification and waiver policy remains pending.


## 2026-11-01 - Retain redacted pending guardian requests for withdrawal

Source: `docs/private-verification.md` actor-owned withdrawal contract and `apps/api/src/repository/guardian.rs`. Keep unresolved requests visible to their current authorized actor when the counterpart loses its expected chapter role or membership, while redacting that counterpart reference. Return the same withdrawal outcome on replay with a freshly checked redaction projection. This makes the existing withdrawal authority usable after reload without treating the relationship as verified or granting consent authority. Closed unavailable-counterpart requests stay hidden; release and access/replay rehearsal remain open.


## 2026-11-01 - Page guardian requests within actor scope

Source: `apps/api/src/repository/guardian.rs` and the local guardian withdrawal contract in `docs/private-verification.md`. Query only the current dancer or guardian account within its chapter, order by the unique generated request reference and return bounded pages with a cursor based on the last examined owned request. Filter unavailable closed counterparts after paging, preserving a continuation for empty visible pages. Refresh restarts pagination because new random references can sort before the current cursor. Declare both composite indexes and require later demo-wsb pagination, isolation and index rehearsal before release.


## 2026-11-01 - Open guardian notices through an owner-scoped read

Source: the local guardian relationship request and notification contracts in `apps/api/src/repository/guardian.rs` and `docs/private-verification.md`. New notices carry only an encoded chapter and request reference. The linked read rechecks current participant membership, role and request ownership and applies the same redaction and closed-request visibility as the list. The reference does not grant dependent access or consent authority. Keep old notices unchanged and require linked access, sign-in, chapter isolation and recovery rehearsal.


## 2026-11-01 - Isolate displayed notification state by account and chapter

Source: the chapter inbox contract in `apps/api/src/repository/notifications.rs` and the browser session handling in `apps/web/src/components/connected-notifications.tsx`. Key the inbox workspace by the signed-in UID and chapter, bind API requests to that UID, validate response scope, discard superseded responses and clear displayed records after authentication or authorization denial. Server membership and ownership checks remain authoritative. Account switch, delayed response and revocation behavior still require rehearsal; this does not enable browser push.


## 2026-11-01 - Refresh participant stage calls in the foreground

Source: event-day call-sheet contract in `docs/online-checkin.md` and the product brief request for timely stage updates. Refresh loaded participant-owned entries in bounded concurrent groups while the page is visible, with a non-overlapping 30-second interval and explicit last-complete/offline state. Server ownership and membership remain authoritative; the polling read volume grows with loaded entries and requires capacity rehearsal. Firebase current web messaging guidance at https://firebase.google.com/docs/cloud-messaging/web/get-started describes installation-based registration, while https://firebase.google.com/docs/cloud-messaging/web/receive-messages describes service-worker delivery. Provider configuration, explicit opt-in, device ownership and external delivery remain unfinished; foreground refresh does not claim push delivery.


## 2026-11-01 - Batch participant stage-call requests

Source: `docs/online-checkin.md` participant stage status contract and `apps/api/src/repository/stage.rs`. Accept up to four distinct entry references in a read-only event-scoped request; invoke the existing authoritative per-entry read for each and return null for unavailable entries without disclosing the reason. The browser validates returned entry IDs and renders partial failures. This reduces HTTP and token verification overhead without claiming fewer Firestore reads, external push, offline operation or verified capacity. Authorization, denial, reconnect and load rehearsal remain required.
## 2026-11-01 - Reject expired judge memberships at division lock

Source: `apps/api/src/repository/judging.rs` and the active membership-expiry
contract in `apps/api/src/repository/mod.rs`. A full-panel lock requires every
assigned judge membership to be active and unexpired at transaction time, in
addition to the existing judge role and event assignment checks. The head-judge
UI requires explicit confirmation and validates the saved lock response; after
an ambiguous network outcome it reloads authoritative state before offering a
retry. The completion view does not infer discrepancy alerts, ties, placements,
or qualification without approved event policy. Security and role rehearsal
remain pending.

## 2026-11-01 - Cancel verification work on scope change

Source: `apps/web/src/components/verification-workspace.tsx` and Firebase
Storage's resumable upload task API. A change in signed-in UID, chapter, or
workspace mode invalidates prior async work, cancels an active private evidence
upload, and resets local progress. Late progress and cleanup handlers are
generation-guarded so they cannot affect the newly selected scope. The server
and Storage authorization checks remain authoritative; this is client-side
residue and transfer control, not a substitute for authorization.

## 2026-11-01 - Clear scorecard state on judge scope change

Source: `apps/web/src/components/connected-scorecard.tsx`. A change in judge UID,
event or entry clears the displayed score, local receipt list, loaded context and
trusted-device confirmation. Sync, queue refresh, correction reads and save
cleanup are scoped so stale work cannot update the newly selected scorecard.
IndexedDB operations remain owner-keyed and server checks remain authoritative.

## 2026-11-01 - Keep guardian request busy state generation-local

Source: `apps/web/src/components/guardian-requests.tsx`. A successful command
ends its busy state before it starts a list reload; its finalizer can clear busy
only if no newer list generation superseded it. The same saved operation ID and
account-scoped retry reference remain in use, so uncertain command outcomes are
still recoverable.

## 2026-11-01 - Reset offline score outbox trust by account

Source: `apps/web/src/components/score-outbox.tsx` and the owner-keyed IndexedDB
score store. Changing account or event clears visible records and requires an
explicit trusted-device confirmation again. Queue reads, sync completion and
accepted-copy removal are guarded by the active UID/event scope. Pending commands
remain keyed to their original owner; this does not authorize them under a new
account.

## 2026-11-01 - Bind scorecard reads to verified chapter session

Source: `apps/web/src/lib/account.ts` and
`apps/web/src/components/connected-scorecard.tsx`. Use the active chapter session
resolved through the server's membership check to construct scorecard routes,
bind reads to the expected Firebase UID, and include chapter in the local state
scope. Token claims may suggest a default chapter but are not the authorization
source. The API still rechecks current membership, event assignment and panel
authority for every operation.

## 2026-11-01 - Bind chapter directory pages to the initiating account

Source: `apps/web/src/components/workspace-access.tsx` and
`apps/web/src/lib/api.ts`. Chapter membership pages are bound to the initiating
UID and discarded after account/session changes. The selector clears stale rows
while a new account loads and merges paginated records by chapter ID. The server
remains authoritative for membership and role at each selected chapter route.

## 2026-11-01 - Fail closed on incomplete PayMongo responses

Source: PayMongo's [Checkout Session resource](https://docs.paymongo.com/reference/checkout-session-resource)
and [idempotent requests reference](https://docs.paymongo.com/reference/idempotent-requests),
reviewed 2026-11-01. Require the v2 checkout response to carry its exact
reference, active status and line items; derive the reserved total and currency
from the returned items so omitted fields cannot be silently replaced with the
request values. Provider refunds use a stable WSB operation ID as input to a
deterministic idempotency key, and validate response payment, amount and currency
against the requested refund. These adapter checks do not enable real refunds or
replace controlled account verification.

## 2026-11-01 - Validate local score commands and receipts before acknowledgement

Source: `apps/web/src/lib/judging/outbox.ts` and the Rust score command/receipt
contract in `apps/api/src/repository/judging.rs`. Treat IndexedDB rows and API
receipts as runtime data: reject malformed owner/key scope, command version,
revision, criteria, deductions or retry fields before sending; keep corrupt rows
for review. Mark a row acknowledged only after the receipt identity, next
revision, score range, timestamp and bounded ID match. The server remains the
authority for accepting a score; local validation does not establish acceptance.

## 2026-11-01 - Preserve payer recovery guidance for uncertain checkout outcomes

Source: `apps/web/src/components/connected-checkout.tsx` and the durable
reservation behavior in `apps/api/src/repository/paymongo_local.rs`. For a
checkout conflict, tell the payer not to start another payment and to check
status or contact finance. For an uncertain gateway result, explain that the
reservation may remain pending and only retry with the saved operation/amount.
The browser already retains the operation ID on failure. This copy does not
settle the ledger or imply provider status; rehearsal remains required.

## 2026-11-01 - Invalidate mounted workspace session on chapter switch

Source: `apps/web/src/lib/account.ts` and
`docs/persistent-membership.md`. Hide a cached chapter session synchronously
when the signed-in UID or selected chapter differs, then re-resolve membership
with the server. Broadcast same-tab chapter selection and listen for cross-tab
storage changes so mounted feature workspaces cannot continue displaying the
previous chapter context. Server membership remains authoritative.

## 2026-11-01 - Cache only assigned-entry lookup for offline score recovery

Source: `apps/web/src/components/offline-workspace.tsx`,
`apps/web/src/components/connected-scorecard.tsx`, and the owner/chapter/event
keyed cache in `apps/web/src/lib/judging/indexed-store.ts`. With explicit device
opt-in, store only the current judge's assigned entry IDs and crew/division
labels. A cached list may locate an existing local scorecard draft offline but
does not prove current assignment or authorize a write. The lookup cache can be
removed from the workspace; score commands remain owner-scoped and require
server authorization and a matching receipt after reconnection.

## 2026-11-01 - Reset lineup cache consent and clear its owner records

Source: `apps/web/src/components/offline-workspace.tsx` and
`apps/web/src/lib/judging/indexed-store.ts`. The assigned-lineup cache opt-in is
session UI state and resets when UID or chapter changes. Unchecking deletes that
UID's cached lookup lists atomically while preserving score commands and
receipts. This keeps local assignment lookup consent separate from score-outbox
retention.

## 2026-11-01 - Validate offline lineup cache scope on read

Source: `apps/web/src/lib/judging/indexed-store.ts`. Serialize owner, chapter
and event as a tuple key instead of delimiter concatenation, then verify the
record's stored scope and entry identifiers on read. IndexedDB is mutable local
state; invalid or cross-scope records must not be treated as an assignment list.
The cached list remains a navigation hint and never grants server authority.

## 2026-11-01 - Validate PayMongo redirect before navigation

Source: PayMongo's [Checkout Session resource](https://docs.paymongo.com/reference/checkout-session-resource)
and `apps/api/src/paymongo.rs` / `apps/web/src/components/connected-checkout.tsx`.
Treat only the exact `/local?session=...` shape as a synthetic checkout. A
provider result must include a matching session, amount, currency and reference;
the URL must parse as HTTPS on the exact hosted-checkout domain with a safe
session/client-key path and nonempty fragment. Preserve the operation ID on
malformed responses; neither a missing URL nor a substring match may be called
a local session or trigger navigation. Controlled PayMongo account validation
remains a separate gate.

## 2026-11-01 - Bind checkout completion to the initiating payer scope

Source: `apps/web/src/components/connected-checkout.tsx`. Capture UID, chapter,
event and entry scope when submitting manual or hosted payment. Before applying
the result, verify both the current render scope and current Firebase UID/chapter;
discard stale errors and finalizers. A late successful provider response from
the previous payer must never navigate the active workspace to that checkout.
The server still owns reservation and payer authorization.

## 2026-11-01 - Validate notification response shape and destination

Source: the notification record/list/read contracts in `apps/api/src/repository/notifications.rs` and the browser inbox in `apps/web/src/components/connected-notifications.tsx`. Treat API data as untrusted at the rendering boundary: validate bounded fields, scope, timestamps, revisions, pagination and counts, and accept only same-origin relative destinations. Server-side membership and recipient checks remain authoritative; this client validation protects navigation and display integrity and does not replace authorization.

## 2026-11-01 - Display registration cutoffs in event timezone

Source: the persisted event timezone and registration cutoff contract in
`docs/event-management.md`, with rendering in
`apps/web/src/components/event-command-center.tsx`. Format the saved absolute
registration close instant in the event's configured IANA timezone so directors
see the same event-local cutoff regardless of device locale. Do not substitute
the viewer's timezone if event configuration is missing or invalid.

## 2026-11-01 - Isolate crew management state by account and chapter

Source: current membership/session behavior in `apps/web/src/lib/account.ts`,
chapter-scoped crew contracts in `apps/api/src/registration.rs`, and crew UI in
`apps/web/src/components/connected-crews.tsx`. Mount crew views under the active
UID and chapter, bind GET and mutation calls to that UID, reject late responses
and validate chapter/owner fields before display or navigation. Server membership,
ownership and transactional receipts remain authoritative.

## 2026-11-01 - Isolate performer roster workspace scope

Source: current membership session in `apps/web/src/lib/account.ts`, entry and
crew ownership contracts in `apps/api/src/repository/registration.rs`, and the
performer selector in `apps/web/src/components/connected-roster.tsx`. Key local
roster state by UID, chapter, event and entry; bind reads and writes to UID; and
ignore late responses after a scope transition. Check response identifiers and
chapter ownership before rendering or acknowledging a save. Server ownership,
canonical member selection and revision enforcement remain authoritative.

## 2026-11-01 - Isolate entry registration and review scope

Source: session validation in `apps/web/src/lib/account.ts`, chapter/event entry
contracts in `apps/api/src/repository/registration.rs`, and entry UI in
`apps/web/src/components/connected-entry.tsx`. Key entry workspaces by UID,
chapter, event, entry and review mode. Bind reads and mutations to the active UID,
discard superseded responses, and validate returned entry and crew scope before
rendering, navigation or acknowledging success. Server membership, ownership,
readiness and revision checks remain authoritative.

## 2026-11-01 - Isolate payment workspace scope

Source: current chapter-session resolution in `apps/web/src/lib/account.ts`,
server payment ownership/finance read scopes in `apps/api/src/finance.rs` and
`apps/api/src/repository/finance.rs`, and the browser page in
`apps/web/src/components/payment-records.tsx`. Mount saved payment state under
UID, chapter and mode; bind reads and commands to the active UID; clear rows on
authorization denial; and check chapter, payer and payment identifiers before
rendering updates. Server-side payer/finance authorization and ledger invariants
remain authoritative.

## 2026-11-01 - Isolate connected support conversations

Source: chapter-authorized support contracts in `apps/api/src/repository/support.rs`,
current account/chapter session handling in `apps/web/src/lib/account.ts`, and
support UI in `apps/web/src/components/support-workspace.tsx` and
`apps/web/src/components/inquiry-conversation.tsx`. Bind authenticated queue,
thread and reply calls to the active UID; verify chapter/conversation identifiers;
and discard superseded responses. Anonymous contact remains capability-keyed and
uses its separate contact command. Server membership and inquiry ownership remain
authoritative.

## 2026-11-01 - Validate private verification record scope and path

Source: the case path and ownership written by `apps/api/src/repository/verification.rs`,
Storage access in `apps/api/src/verification.rs`, and the browser workflow in
`apps/web/src/components/verification-workspace.tsx`. Validate chapter, subject,
case, canonical Storage object path, lifecycle fields, declared content type and
size before rendering or opening evidence. Mutation receipts must match the
current case and active scope. This complements server membership, Storage rules
and scan checks; it does not establish document-policy eligibility or consent.

## 2026-11-01 - Isolate assigned judge lineup

Source: server-side current judge panel/event assignment checks in
`apps/api/src/repository/judging.rs` and the browser workspace in
`apps/web/src/components/judge-lineup.tsx`. Mount assignments under UID, chapter
and event, bind pages to the active UID, discard stale responses, and validate
row shape before building scorecard links. Current panel assignment remains the
server's authority; cached or displayed assignment data is not authorization.

## 2026-11-01 - Isolate event music review queue

Source: event-assigned review authorization in `apps/api/src/repository/music.rs`
and the reviewer UI in `apps/web/src/components/music-review-queue.tsx`. Key queue
state by UID, chapter and event, bind pagination to the active UID, discard late
responses, and validate rows before displaying media entry references. Server
membership and event assignment remain authoritative.

## 2026-11-01 - Isolate registrar queue requests

Source: chapter-scoped entry listing in `apps/api/src/repository/registration.rs`
and registrar UI in `apps/web/src/components/registration-list.tsx`. Resolve the
workspace session for the requested chapter; bind paged reads to the current UID;
key visible state by UID, chapter and event; discard superseded results; and
validate returned row scope before linking to review. The server continues to
authorize current chapter role and entry access.

## 2026-11-01 - Bind private draft history reads to the workspace identity

Source: chapter-authorized content and division-policy APIs in
`apps/api/src/chapter_content.rs` and the connected editors in
`apps/web/src/components/chapter-content-drafts.tsx` and
`apps/web/src/components/division-policy-drafts.tsx`. Send the active UID on
paged draft and revision reads so token refresh/account changes cannot silently
rebind an old read; retain the existing scope guards and server authorization.

## 2026-11-01 - Validate personal-results entry pages

Source: chapter-scoped entry API and published-result projection in
`apps/api/src/repository/registration.rs` and `apps/api/src/repository/publication.rs`,
with the participant view in `apps/web/src/components/personal-results.tsx`.
Bind entry pagination to the active UID and validate chapter/event and row shape
before deriving dancer-visible records or result controls. Server ownership and
published projection remain authoritative.

## 2026-11-01 - Validate guardian request projections before rendering actions

Source: actor-owned and redacted response projections from
`apps/api/src/repository/guardian.rs` and the participant UI in
`apps/web/src/components/guardian-requests.tsx`. Check chapter, actor, generated
request ID, lifecycle status, revision and counterpart availability/redaction
before rendering relationship actions. A guardian confirmation remains
`awaiting_verification`; it never grants dependent access, signing authority or
entry readiness. Server membership and relationship state remain authoritative.

## 2026-11-01 - Scope staff access management to the current director session

Source: current account/chapter session in `apps/web/src/lib/account.ts`,
server-side chapter membership/invitation authority in
`apps/api/src/repository/membership.rs`, and the staff UI in
`apps/web/src/components/staff-membership-workspace.tsx`. Mount management state
under UID/chapter, bind paged member/invitation/assignment reads to the current
UID, and validate chapter/event record scope before showing mutation controls.
Server recent-auth, role and transaction checks remain authoritative.

## 2026-11-01 - Validate staff access mutation receipts

Source: transactional staff membership, invitation and assignment command
responses in `apps/api/src/repository/membership.rs` and
`apps/api/src/staff.rs`, plus `apps/web/src/components/staff-membership-workspace.tsx`.
Before the UI reports success, clear a pending invitation or changes displayed
state, verify each receipt's chapter, target, role, identifier, event and resulting
active state against the submitted command. Server-side role, recent-auth and
transaction checks remain authoritative.

## 2026-11-01 - Scope judge-panel and publication workspaces

Source: chapter/event membership enforcement in the judging and publication
repositories (`apps/api/src/repository/panel.rs` and
`apps/api/src/repository/publication.rs`) and the connected screens in
`apps/web/src/components/division-panel-workspace.tsx` and
`apps/web/src/components/connected-results-publication.tsx`. Require a fresh
chapter session, mount private state under UID/chapter/event, bind private reads
and publication commands to the active UID, and validate division/panel/receipt
scope before exposing actions or reporting success. The API remains authoritative
for role, event assignment, lock state and tie-policy checks.

## 2026-11-01 - Bind Global HQ workspaces to the verified operator

Source: `/v1/hq/session` verification in `apps/web/src/lib/api.ts`, HQ route guard
in `apps/web/src/components/hq-session-guard.tsx`, and HQ APIs/components for
chapters, member access, integration status, operations and proposal threads.
Bind each request to the verified UID and discard queued state when the account
or selected chapter changes. Validate member and conversation scope before showing
records or acknowledging access changes. The server's independent HQ membership,
transaction and audit checks remain authoritative.

## 2026-11-01 - Bind crew invitation redemption to its recipient session

Source: current chapter session from `apps/web/src/lib/account.ts`, invitation
redemption in `apps/api/src/registration.rs`, and
`apps/web/src/components/accept-crew-invite.tsx`. Key local success state to the
current UID and invitation scope, send the expected UID with redemption, and
confirm the receipt identifies the requested chapter/crew and includes the signed
in dancer before showing success. The API's single-use token and crew authority
checks remain authoritative.

## 2026-11-01 - Validate director event management scope and receipts

Source: chapter-scoped event list and revisioned event/window commands in
`apps/api/src/repository/events.rs` and the director UI in
`apps/web/src/app/(admin)/admin/[chapterId]/events/page.tsx`,
`apps/web/src/components/event-draft-form.tsx`, and
`apps/web/src/components/registration-window-form.tsx`. Ignore late list responses
outside the active UID/chapter; validate each record's chapter and core fields;
validate command receipts against the current event and expected response shape
before updating the event list or reporting success. Server role, revision and
reason checks remain authoritative.

## 2026-11-01 - Recover event creation with a tab-scoped immutable command

Source: the payload-bound Firestore create-event receipt in
`apps/api/src/repository/events.rs` and the director event form in
`apps/web/src/app/(admin)/admin/[chapterId]/events/new/page.tsx`. Save the exact
command and operation ID in session storage before sending, bind its key to the
signed UID/chapter, and retry it unchanged after reload when the result is
uncertain. Keep fields locked until the same result is recovered or a definitive
API rejection permits correction. Validate the returned chapter, slug and event
fields before navigation. This protects against duplicate event creation without
persisting secrets or treating a client draft as authoritative.

## 2026-11-01 - Scope the WSB 2026 rules source without assuming consent authority

Source: “WSB RULES 2026.pdf”, linked from the official WSB Dubai 2026 page,
https://worldsupremacybattlegrounds.com/dubai/ (PDF dated 31 March 2026).
The retrieved booklet includes age criteria and a general accident/injury and
likeness waiver provision, and says a competitor or crew manager/leader may sign.
It does not explain guardian verification or establish which signer may legally
act for a minor; it also does not establish applicability to the Manila or Hong
Kong 2027 pilot. Record these facts as a scoped source lead only. Keep consent
signing disabled until approved pilot-event references and guardian policy are
provided.

## 2026-11-01 - Scope 2026 Dubai rules evidence to its published edition

Source: “WSB RULES 2026.pdf”, linked from the official WSB Dubai 2026 page and
dated 31 March 2026. It states January 1 age thresholds for named youth
divisions, 50% roster retention into finals, a five-second performance grace,
one-week submission timing when a deadline is unstated, and an eight-criterion
weighted rubric. The rubric conflicts with the product proposal's five equal
pillars; the five-second allowance is for performance length, not audio upload.
The booklet does not establish these rules for Manila/Hong Kong 2027, define a
seven-day music lock, or resolve tie/correction/guardian authority. Record them
as edition-scoped facts, not pilot settings. Keep advancement, eligibility and
scoring activation gated on the applicable event policy.

## 2026-11-01 — Validate public result projection responses before rendering

Source: `docs/architecture.md` public-results boundary and the Rust
`PublishedResultSnapshot` response contract in `apps/api/src/domain.rs`. The public
results renderer must reject an entire malformed projection response before
rendering standings, including event/chapter scope, publication metadata, digest,
score fields and ranks. Public pages continue to read only immutable published
projections; validation does not infer tie, correction, score-publication or
advancement policy. This keeps corrupt/mismatched API data from being presented
as official results.

The collection validator also rejects duplicate division/publication IDs and
entries repeated across the returned snapshots, because the API contract yields
one immutable projection per division and an entry belongs to one division.

## 2026-11-01 — Gate production Firestore activation explicitly

Source: the current Firestore repository and Firebase Identity Platform verifier,
`docs/persistent-membership.md`, and the project's explicit demo-wsb-only local
test boundary. Allow a non-demo ADC-backed Firestore runtime only behind an
explicit environment opt-in, with `WSB_STORAGE=firestore`, a valid non-demo
project ID, and no emulator configured. Keep demo-wsb bound to an explicit
emulator and forbid the production opt-in on demo-wsb. This permits deployment
configuration work for the existing strict signed-identity path while preserving
unsigned-token rejection. It does not assert full migration, readiness, IAM
provisioning, or production validation; readiness remains closed pending those
gates. Do not access a real project during local work.

The repository connector independently checks the requested ID against
`FIREBASE_PROJECT_ID` and requires `WSB_STORAGE=firestore`, so non-demo use cannot
be reached by passing an arbitrary project string to the repository directly.

Rust test builds also reject all non-demo project IDs before evaluating production
opt-in, so test binaries cannot contact a configured real Firestore project. This
preserves the rule that local database tests target only demo-wsb.

## 2026-11-01 — Cool down malformed notification queue jobs

Source: the notification outbox worker in
`apps/api/src/repository/notifications.rs` and the active notification task's
requirement that malformed jobs be isolated and retried with cooldown. Parse
queue metadata independently instead of requiring the business cursor to decode
as an integer before reading retry metadata. After a processing error, update
only the failure counter and cooldown timestamp in a transaction that rechecks
progress. For a malformed progress value, compare the still-malformed value and
record cooldown without rewriting it. This prevents tight retry loops and keeps
valid sibling jobs processable; the transaction also serializes competing worker
updates. The operations sample remains bounded and is not a complete failure log.

## 2026-11-01 — Validate notification destinations at the server boundary

Source: `apps/web/src/components/connected-notifications.tsx` already rejects
cross-origin and malformed destinations, while `apps/api/src/repository/notifications.rs`
is authoritative for durable inbox writes and reads. Apply equivalent same-origin
relative URL validation before enqueueing and before returning saved rows, and
bound kind/title/message fields to the web contract. This prevents malformed
queue data or corrupted stored records from becoming durable clickable links;
it does not add external delivery or change notification audiences.

## 2026-11-01 — Provide a least-privilege online check-in roster lookup

Source: PAGE-071 and the manual lookup flow in
`docs/website-plan/04-feature-workflows.md`, plus the existing transaction in
`apps/api/src/repository/venue.rs`. Add a dedicated, bounded candidate endpoint
for currently assigned marshals and chapter directors rather than broadening the
general entry-list permission. Return only approved, currently ready entry and
roster selection fields. Treat the list as advisory because readiness or roster
membership can change after load; the existing check-in write remains the final
authority. Keep manual entry fallback and the separate human identity check.

## 2026-11-01 — Decode raster verification uploads within resource bounds

Source: `docs/open-questions.md` requires file parsing before reviewer access;
the existing API already limits object size and signature-checks PDF/JPEG/PNG.
Use image 0.25.10 only for declared JPEG/PNG, decode in a blocking worker, enforce
4096-pixel dimensions and a 16-megapixel ceiling, serialize work with one
process-local semaphore permit, set the decoder allocation ceiling, and fail
closed after 30 seconds. The official [`Limits`](https://docs.rs/image/0.25.10/image/struct.Limits.html)
docs say dimension limits are strict while allocation limits are best-effort.
This improves raster structure checking but does not validate evidence claims;
PDF parsing, scanner operations and production access remain gated.

## 2026-11-01 — Notify other assigned marshals when a stage hold changes

Source: PAGE-078 stage-hold workflow in `docs/website-plan/03-page-catalogue.md`,
`StageControl.marshal_uids`, and the existing durable stage-hold transaction.
Atomically enqueue a generic in-app notice to other assigned marshal accounts
when a hold revision changes; the actor receives no self-notice. Key the notice
by stage and hold revision so transaction replay cannot duplicate it. Recheck
current active/unexpired membership through the notification writer. This does
not reach audio/lighting staff outside the stage assignment or external channels.


## 2026-11-01 — Notify marshals when stage access changes

Source: the director-controlled stage marshal-list command and durable inbox
contract in `apps/api/src/repository/stage.rs`. For each committed access
revision, enqueue a generic notice only for UIDs present in exactly one of the
old/new marshal lists, excluding the actor. Reuse a stage/revision notice ID so
exact command replay cannot create duplicates; the inbox writer rechecks current
active, unexpired membership. Use the inbox destination so revoked marshals can
read removal notices. Do not claim external delivery. The current 100-marshal
list bound keeps fan-out below Firestore transaction write limits.


## 2026-11-01 — Directory for stage marshal assignment

Source: director stage assignment workflow in `docs/stage-operations.md` and
the existing chapter-director event staff assignment read. Page event staff
assignments and return only active, unexpired chapter marshal account IDs. The
picker is advisory: the stage save transaction revalidates each proposed UID.
Keep manual ID entry for lookup failures and preserve the cursor for sparse pages.


## 2026-11-01 — Reset stage assignment form on event scope changes

Source: `stage-workspace.tsx` and the director assignment form. Key the form by
the complete event API base, stage and account so switching chapter or event
discards its prior draft and lookup state. Clear the lookup on a failed refresh;
the server remains authoritative for each assignment save.


## 2026-11-01 — Validate stage lineup history scope

Source: the current lineup reader and private history contract in
`apps/api/src/repository/lineup.rs`. Reject a history page if any saved snapshot
identifies another chapter, event or stage. Remount lineup forms and histories
when their event scope changes so an earlier event cannot leave visible drafts.


## 2026-11-01 — Filter loaded audit records by actor and resource

Source: PAGE-085 in `docs/website-plan/pages.json` and the bounded audit
explorer. Add actor and resource ID filters to the existing action filter. They
operate on already loaded records and the export uses the same filtered set;
this is not a complete server-side archive search.


## 2026-11-01 — Clear audit records after authorization failure

Source: the chapter audit explorer and current-membership access contract in
`docs/chapter-audit.md`. A 401 or 403 during refresh or pagination clears
loaded records and the continuation cursor, so revoked audit access does not
leave records available to export in the mounted workspace. Preserve records on
transient service failures to allow recovery.


## 2026-11-01 — Scan older audit pages for filters

Source: PAGE-085 and the normalized bounded audit reader. Let the user load up
to ten additional pages per action, preserving the continuation between batches
and rechecking authorization on each request. Existing loaded-record filters
then include legacy normalized entries. This is not an indexed query, a complete
archive export or a consistent point-in-time snapshot.


## 2026-11-01 — Detect audit continuation cycles across batches

Source: bounded audit scan in the chapter audit explorer. Track consumed cursors
for the mounted chapter session, reject self-loops and cycles across load-more
and scan batches, and clear the tracking on refresh or scope change. Add a cursor
only after a valid response so interrupted requests can be retried.


## 2026-11-01 — Acknowledge loaded notifications in bounded batches

Source: the durable notification inbox and idempotent per-notice read endpoint.
Process at most 30 loaded unread notices sequentially, validate each receipt and
server count, and stop on failure. Completed acknowledgements remain saved; a
retry only processes notices still displayed unread. Current account and chapter
scope and the existing server membership check apply to every request.


## 2026-11-01 — Stop a notification acknowledgement batch

Source: the sequential loaded-notification acknowledgement workflow. Allow the
user to stop a batch, discard the pending response locally and refresh before
retrying because the in-flight server acknowledgement may still commit. The
idempotent read endpoint prevents a retry from decrementing the count twice.


## 2026-11-01 — Render crew invitation QR locally

Source: crew invitation link/QR requirement in `docs/product-brief.txt` and
the existing one-use invitation workflow. Render the existing invitation link
locally in the browser using qrcode.react rather than submitting its bearer
capability to a third-party QR service. The code inherits the existing link
expiry and one-use semantics; it does not add a delivery channel.


## 2026-11-01 — Bind crew invitation display to its crew

Source: `connected-crews.tsx` and the one-use invitation contract. Remount the
workspace on account, chapter, crew or create-mode changes so a previous crew
invitation cannot remain visible. Display the server-provided expiry instant
instead of a fixed relative duration.


## 2026-11-01 — Revoke displayed crew invitations

Source: crew invitation revocation requirement in `docs/website-plan/06-content-and-publishing.md`
and existing one-use invitation transaction. Permit the current crew manager to
revoke the displayed invitation through a payload-bound operation receipt; audit
the crew ID rather than the bearer token. Redemption and revocation read and
write the same invitation document so a used link cannot be revoked as unused
and a revoked link cannot be redeemed. Historical invitation listing remains open.


## 2026-11-01 — Manage earlier crew invitations without bearer tokens

Source: crew invitation revocation workflow in `docs/persistent-registration.md`.
Page bounded chapter invitation records, filter to the current manager’s crew,
and return only the hashed document reference, dates and used/revoked state.
Allow current crew managers to revoke an unused record by that reference with
the existing payload-bound receipt and audit. Empty filtered pages retain their
continuation. Links and accepted dancer identities are not returned.


## 2026-11-01 — Clear crew invitation data on access denial

Source: crew workspace and invitation management access contract. Clear loaded
crew data, bearer invitation and history when a current request receives 401 or
403. Keep normal transient errors recoverable. Firestore 0.58 transaction source
shows run_transaction supplies a transaction-bound consistency selector for
its read client, supporting the intended shared-record conflict boundary.


## 2026-11-01 — Query crew invitation history by crew

Source: the bounded invitation history in `apps/api/src/repository/registration.rs`.
Filter the chapter collection by crew ID and order by document reference, using
a validated hashed reference as the continuation. This includes older invitation
documents without a new index field and avoids scanning unrelated crews. Refresh
restarts traversal because new random document IDs can sort before the cursor.
Firestore query/index behavior and isolation remain for the deferred rehearsal.


## 2026-11-01 — Validate invitation history continuation

Source: crew-scoped history query and its browser projection. Check that IDs
are unique, strictly ordered and advance beyond the requested cursor; require a
returned continuation to equal the last row. Hide the empty state on errors and
direct managers to refresh when a revocation conflicts with a changed record.


## 2026-11-01 — Preserve invitation acceptance retry payload

Source: the payload-bound invitation acceptance receipt and native dancer form.
Keep the submitted name and minor flag fixed after an uncertain response so
the same mounted form can retry without creating a different fingerprint.
Definitive client denials release the draft and explain that the invitation may
need replacement. Reload-safe pending input remains a separate gap.


## 2026-11-01 — Recover invitation acceptance after reload

Source: payload-bound acceptance receipt in `apps/api/src/repository/registration.rs`.
An authenticated recovery action checks the invitation’s accepting UID, current
chapter/crew membership, issuer authority and saved receipt, then returns the
current crew rather than a stale roster snapshot. It stores no recovery details
in the browser. Apply issuer membership expiry to redemption and recovery, and
deny historical replay after the dancer is removed from the current crew.


## 2026-11-01 — Return current crew on invitation acceptance replay

Source: invitation acceptance receipt and current crew authorization in
`apps/api/src/repository/registration.rs`. Validate the saved receipt and exact
acceptance fingerprint, then return the current authorized crew on replay. This
preserves the single acceptance effect while avoiding disclosure of an outdated
roster snapshot. Deny replay when the dancer is no longer a crew member.


## 2026-11-01 — Limit invitation referrer propagation

Source: the crew invitation URL and native identity return flow. Apply no-referrer
and private no-store response headers to invitation and authentication pages.
Next.js local headers documentation specifies later matching headers override
earlier values. The existing token-bearing path and sign-in return query still
require log redaction and a safer transport before live activation.


## 2026-11-01 — Move new crew invitation tokens to fragments

Source: invitation bearer URL exposure recorded in `docs/open-questions.md` and
the existing same-origin sign-in return flow. New links carry the token only in
a fragment; the landing page stores it in current-tab session storage under a
random handle, replaces the address, and passes only that handle through sign-in.
The handoff binds chapter and crew. Old path links migrate after the first
request, which can still reach logs. Opening a different tab requires the original
link; expiry, revocation, role isolation and runtime transport need rehearsal.


## 2026-11-01 — Clear completed crew invitation handoff

Source: fragment-based crew invitation transport. Remove the tab-scoped bearer
handoff after a confirmed acceptance or recovery, but retain it after an
uncertain response for reload recovery. Reuse the existing handoff during
repeated legacy-link initialization to avoid duplicate stored capabilities.


## 2026-11-01 — Replace simulated onboarding success

Source: PAGE-031 and the existing account profile in `apps/web/src/app/(portal)/app/profile/page.tsx`.
Replace the browser-only dancer-profile claim with Firebase account display-name
saving and an account-scoped form. Preserve onboarding through the same-origin
authentication return allowlist. Membership, identity and eligibility remain
separate; additional profile fields need their own authoritative contracts.


## 2026-11-01 — Validate battle ballot acknowledgements

Source: the judge ballot endpoint and payload-bound per-judge ballot replay in
`apps/api/src/repository/battles.rs`. Validate the returned match identity,
status and tally before showing a recorded vote. Preserve the chosen corner
after uncertain outcomes for exact replay; remove active controls when match
loading fails or a definitive denial requires refresh. The mounted retry state
does not establish reload recovery or bracket advancement.


## 2026-11-01 — Recover the signed-in judge’s battle ballot

Source: the durable per-judge ballot record and replay contract in
`apps/api/src/repository/battles.rs`. Add a read of only the current judge’s
corner after current chapter, event and panel checks. The voting screen requires
that read before presenting controls and can recognize a saved ballot after
reload. It does not expose peer ballots or infer bracket advancement.


## 2026-11-01 — Bind battle voting workspace to account and event

Source: the battle judge vote page and current chapter-session contract. Remount
the vote workspace when verified account, chapter, event, match or session
loading state changes, so old ballot data is not rendered during a scope switch.
Existing generation checks discard responses from the previous workspace.


## 2026-11-01 — Page and scope the judge battle desk

Source: the assigned-judge battle list API and PAGE-072 battle workflow. Load
continuation pages even when a filtered page is empty, validate event and match
projections, bind requests to the current UID, and reset the view on scope
changes. Show counts and round filters only for loaded records and identify
manual refresh; the private ballot list does not establish a live bracket.


## 2026-11-01 — Correct head-judge completeness and review validation

Source: the division lock requirements in `apps/api/src/repository/judging.rs`.
Require a nonempty panel before labeling scorecards complete or enabling the
lock confirmation. Validate the review and division-page shapes before use,
verify deduction revision receipts, clear views after access denial and remount
when the active role changes. The server still decides lock eligibility.


## 2026-11-01 — Page head-judge division review entries

Source: the division-review 500-event-entry limit in
`apps/api/src/repository/judging.rs` and head-judge workflow. Return one bounded
event-entry page filtered to the division with its continuation, including empty
filtered pages, while retaining server-maintained division totals. The UI labels
rows as loaded pages and refreshes from the beginning after edits. Lock and
deduction writes recheck authoritative state; pages are not a frozen snapshot.


## 2026-11-01 — Scope head-judge review query to its division

Source: the paged head-judge review and existing nested entry division field.
Query entries by division and document reference, returning a cursor for the
last scanned entry even if approval filtering leaves no visible rows. Validate
chapter, event, division and document identity, and check advancing pages in
the browser. Aggregate totals and the lock transaction remain authoritative;
query/index behavior requires the later demo-wsb rehearsal.


## 2026-11-01 — Preserve paged deduction save state

Source: paged head-judge review and revision-based deduction replay. After a
validated receipt, update the loaded entry and keep the success notice in the
parent rather than returning to page one. During uncertain saves, freeze the
submitted values for an exact retry and block competing page/lock actions;
allow a deliberate reload with a warning that the previous save may finish.
The server remains authoritative for revision and lock conflicts.


## 2026-11-01 — Bind deduction retries to operation receipts

Source: deduction revision/replay contract in `apps/api/src/repository/judging.rs`.
The connected form supplies a stable operation ID; a hash of the full command
and resulting revision commit atomically with the deduction and audit. Exact
replay checks current authority and returns the original revision even after
later edits or locking; changed payload conflicts. Legacy requests without an
operation ID retain their earlier revision/value retry semantics. The browser
keeps the operation key until the receipt passes validation and requires a
refresh before further actions because a recovered receipt may be historical.


## 2026-11-01 — Route staff navigation to event-duty consoles

Source: chapter admin navigation and the connected `/console` event-duty
selector. Replace its unlabeled demo-judge destination with the operational
selector. The explicitly fictional public preview remains separately labeled.


## 2026-11-01 — List assigned events for duty selection

Source: PAGE-093 and existing chapter event assignments. Read bounded chapter
event pages inside a transaction, check the current staff membership and each
active event assignment, and return only event ID, chapter, name and status.
Directors retain chapter oversight. Empty filtered pages retain continuation;
each duty destination independently checks authority. The selector resets on
account/chapter/role changes and preserves manual reference entry.


## 2026-11-01 — Show duty choices for the active chapter role

Source: the existing duty desk role checks and PAGE-093. Filter the selector’s
links to the current verified chapter role so staff are guided to supported
workspaces. This is navigation only; each destination independently checks event,
role and finer assignment authority on the server.


## 2026-11-01 — Preserve event-duty sign-in return paths

Source: event-duty screens already pass their same-origin console path to
sign-in, while the shared return allowlist previously dropped it. Allow paths
under `/console/` through the existing same-origin parser; destination role and
event assignment checks remain authoritative, and fragments are still removed.


## 2026-11-01 — Recheck duty event before enabling links

Source: PAGE-093 assignment revocation case and the existing `event_access`
authority. A signed, role-scoped event check gates duty links when an event is
selected or entered. Input and scope changes invalidate the result; each
destination independently rechecks current access and finer assignments. The
selector check is a point-in-time observation, not a durable permission grant.
The device sync view remains available for local records without an online event
check; sending queued scores still requires server authorization.
## 2026-11-02 — Expose only exact HQ platform counts

Source: existing HQ overview gap in `docs/global-hq-session.md`, Firestore
aggregate query support in the locked `firestore` 0.58 client, and the user goal
to finish implementation before role workflow rehearsal. Add a signed HQ-only
overview endpoint for exact counts of root `chapters` and all nested `events`
documents. Verify current global membership before these platform-wide reads.
Keep the independent queries' non-snapshot behavior explicit. Do not infer
chapter health, event readiness, affiliation or publication approval from counts.
## 2026-11-02 — Do not present country rows as verified chapters

Source: `docs/open-questions.md` requires approved public chapter publishing and
warns against inferring official chapters from slugs; `docs/native-workflows.md`
requires public pages not to invent affiliations. Replace the public chapter
page's hardcoded country rows with the official directory reference and the
native chapter proposal form. Keep first-party listings gated until chapter
records and publication authority exist.
The homepage uses the same official directory and proposal destinations and
does not retain country rows or links to unverified listing anchors.
## 2026-11-02 — Serialize private image and PDF validation

Source: `docs/private-verification.md` and `docs/open-questions.md` identify
bounded image decoding and per-stream PDF limits while leaving PDF aggregate
memory, stuck-worker termination and OS isolation unresolved. Share one
single-slot per-process semaphore across raster decoding and PDF parsing so their
peak costs do not overlap. This is a concurrency bound only; retain the other
PDF limits as explicit release gates.
## 2026-11-02 — Reject incomplete PayMongo payment webhook resources

Source: `apps/api/src/paymongo.rs`, payment-provider acceptance in
`workflows/tasks.json`, and `docs/open-questions.md`. A signed callback must
still have a valid event envelope and resource IDs/shapes; never turn absent
payment IDs, amounts or currency into defaults. Validate known PayMongo resource
prefixes and path-safe suffixes in parsed event objects. This adds no live
settlement behavior; provider account validation, mapped payment/refund fixture
recovery and production enablement remain gated.

## 2026-11-02 — Serialize private verification submissions

Source: `docs/open-questions.md` identifies private-document parser isolation and
aggregate memory control as unresolved; the existing single parser semaphore was
acquired only after each request downloaded and buffered its Storage object. Add
a separate single-slot per-process permit before object download and hold it
through format validation, scanning and durable submission, with a bounded wait.
This reduces cross-request peak memory and I/O pressure. It does not cap total
per-document PDF decompression, make an in-process parser killable, validate the
claims in a document, or change evidence/consent decisions. Keep those limits
explicit.

## 2026-11-02 — Bound retained PDF object expansion

Source: the locked `lopdf` 0.46.0 `LoadOptions` contract limits each eager object
or cross-reference stream, not the total across a document. Use its object filter
to enforce an estimated 24 MiB retained-object budget, a 100,000-object ceiling,
and a nesting-depth limit while parsing; retain the existing 8 MiB per-stream
cap. This reduces expansion risk but is not an exact heap/decompression ceiling,
because a stream is decoded before its objects reach the filter. Keep PDF parser
process isolation and strict per-document CPU/memory bounds open; reject budget
exceedance as too large/complex and never use parsing as evidence validation.


## 2026-11-02 - Repair demo failures while preserving authority

Sources: user role-demo request; docs/role-demo-2026-11-02.md; lopdf 0.46 reader;
Storage reviewer rules. Preserve PDF callback input: ordinary object loading
ignores the returned replacement, while compressed loading uses it. Returning
a clone supports both; transient cloning adds allocation and is not a strict
heap ceiling. Valid and malformed PDF regressions passed. Completed review
retries recover only their actor-scoped saved receipt before file metadata
access, because completion intentionally removes reviewer Storage read access.
The repository still checks membership and rejects new/changed operations.
Desktop/phone lost-response checks passed. Distinguish the 16 current role or
audience types from 13 planned separate roles in the non-technical role map.


## 2026-11-02 - Homepage follows the actual entry journey

Source: user feedback that the landing page was confusing and must align with
the system flow; docs/native-workflows.md; executed role demonstration.
Lead with event discovery and returning-user workspace access, then role entry
points and six ordered steps (event, account/chapter, crew, preparation, review,
event day/results). Keep account verification separate from chapter approval,
submission separate from approval, and payment references separate from
settlement. Public navigation now offers event selection instead of a fixed
event registration shortcut or an ambiguously scoped external rulebook.
Preserve the existing hero video, branding and motion; place community content
after the operational journey. No business rules or approval powers changed.


## 2026-11-02 - Energetic identity screens, focused account form

Source: user request to retain the website's energetic aura on login and use
repository skills; existing semantic design tokens; local artwork inspected.
Use the existing decorative dance artwork, a restrained dark split layout and
large type around the form. Reuse the shared treatment for signup/reset so
account entry stays consistent. Keep native email/password auth, labels,
recovery, error messages and safe return routing intact. Prefer a compact
mobile poster and reduced-motion-aware CSS entrance over a video player,
smooth scrolling or additional animation dependencies on identity screens.


## 2026-11-02 - Gate hero playback commands on actual player readiness

Source: user-supplied pauseVideo TypeError; hero-highlights.tsx lifecycle; delayed
controlled player fixture and real playback check. A non-null YouTube player
reference is insufficient proof that playback methods have been installed.
Gate commands on onReady, preserve muted decorative playback and all motion/
data-saving fallbacks, and request playback synchronously from readiness.
Preconnect the embed origin while loading the API to reduce connection setup;
do not promise instant YouTube playback or defeat browser autoplay policy.
# 2026-11-02 — Audit display recovery and release scope

Source: `docs/overall-audit-2026-11-02.md` findings F04–F06/F08/F10/F11,
the user's implementation request, and Next.js bundled error-file documentation.
Serialize public display requests after completion, validate public payloads,
pause hidden-tab fetches and back off failures while retaining the last valid
projection. Cancel and ignore requests after leaving an event. Use real root
and global error boundaries with the installed Next.js `retry` prop; do not
claim offline data exists without reading it. Keep the local/demo notice while
removing preview navigation from the ordinary crew shell. Scope hero-motion CSS
to marketing. These changes do not approve event rules or release readiness.

## 2026-11-03 — Retain verified chapter context for offline score recovery

Source: synthetic signed production-browser offline recovery rehearsal and `docs/overall-audit-2026-11-02.md` F06/F18. Remember the account's chapter only after the API verifies its membership, so a saved score can be located after an offline reload. Cached chapter context grants no authority; queued submission still rechecks server authorization. Retry chapter-session verification when connectivity returns. A full repeat of the browser scenario remains required.

## 2026-11-03 — Preserve selected chapter across scoped routes

Source: `apps/web/src/lib/account.ts` chapter selection and offline recovery audit. Remember a verified default chapter for recovery, but do not replace the selected chapter when a route explicitly verifies another chapter. The scoped route still checks its own server membership.

## 2026-11-03 — Reap parser before releasing capacity

Source: parser timeout review and F07 of the overall audit. Keep the single parser permit until an internally timed-out or failed child has been killed and awaited, rather than relying only on asynchronous kill-on-drop. Preserve the same overall deadline and fail-closed results; cancellation still uses kill-on-drop.

## 2026-11-03 — Require the exact clean scanner response

Source: `apps/api/src/malware_scan.rs` and audit F07. Treat only the ClamAV INSTREAM clean response as clean; malformed or unexpected responses fail closed. No scanner availability or production operational approval is inferred.

## 2026-11-03 — Acquire parser capacity before owning cleanup

Source: cancellation review of `apps/api/src/verification.rs`. Acquire the bounded parser slot in the requesting future, then transfer it to the cleanup task. This avoids retaining cancelled queued requests while preserving the slot until any started worker is reaped. Linux cancellation verification remains pending.

## 2026-11-03 — Bound public-stage polling independently of transport

Source: F04 in `docs/overall-audit-2026-11-02.md` and `apps/web/src/lib/public-stage.ts`. Enforce a deadline in the poller itself so a stalled load cannot stop refresh indefinitely; abort on timeout, retain confirmed state, and ignore late completion. The transport's own timeout remains useful. Synthetic unit coverage does not replace venue testing.

## UI/UX polish planning — 3 November 2026
Preserve established WSB branding and three-surface separation; prioritize shared workspace context/navigation and complete user journeys before broad visual edits. Rationale: workspace-shell uses static account context and exact-route active states, while portal home directly renders ConnectedCrews; landing event discovery follows a long explanatory section. Source: current components and user request for an all-pages polish plan; see docs/ui-ux-polish-plan-2026-11-03.md. This is a proposed implementation order, not completion evidence.



## Landing-page conversion hierarchy — 2026-11-03
User requested fixes following the landing critique, then a 10/10 quality target.
Event discovery is the dominant new-visitor action; workspace access remains secondary.
Use a factual street-dance headline, three grouped onboarding stages with expandable
details, and native FAQ disclosures. Trust content cites WSB community history and
the official performance archive (docs/public-site-media.md), without invented metrics
or endorsements. Preserve the approved inert decorative hero and motion fallbacks.
Keep indexing disabled pending release approval; add a generated share image instead.
A local lab result cannot establish hosted performance or conversion effectiveness.


## Focused landing journey — 2026-11-03
User asked to close the remaining gaps after the 8/10 critique. Remove overlapping
role, culture, chapter and duplicate event promotional sections from the homepage;
the linked destination pages retain their purposes. Keep hero footage and campaign
tape per prior direction. Add a clearly labeled, synthetic three-stage entry
walkthrough with button controls, announced state changes and reserved panel space.
This demonstrates the sequence without implying real submissions or approval.
Link the existing sourced championship announcement beside the event.
No testimonial, adoption metric, privacy approval or production performance claim
is invented to satisfy a numerical rating.


## Urban street-art landing identity — 2026-11-03
User explicitly requested asphalt/concrete surfaces, acid lime/orange/cyan accents,
Anton/Space Grotesk/JetBrains typography, textures, stickers, stencil/marker hero,
hard shadows, angled marquee and torn SVG dividers. This supersedes prior landing
palette/typography guidance for this campaign only. Tokens and overrides are
scoped to .street-landing; authoritative data, links and operational surfaces
retain their existing contracts. Fonts are self-hosted npm assets. Noise uses a
small repeated SVG fractal tile, decorations ignore pointer events, and interactive
card outlines are kept outside clipped decorative corner details.


## Requirements traceability provenance — 2026-11-03
Use exact WSB-* identifiers from the user's 826-case spreadsheet. Do not rename
them to invented TC-* IDs or promote PAGE/ROLE/F coverage references into approved
SRS requirements. New REQ-DER IDs require governance approval. Preserve Not Run
status and distinguish structural link completeness from semantic/functional
coverage. Source: supplied Google Sheet and docs/specifications baseline.

## Landing entrance readiness and motion — 2026-11-04
User requested a minimal street-themed loading screen with an accurately shaped
human silhouette, truthful progress, a full dance phrase on fast loads and a
smooth handoff to the hero, optimized to avoid lag. Use an original filled inline
SVG with CSS transform choreography; no new dependencies or external media.
Show four actual completed checks (page, display fonts, poster and motion setup),
not an invented byte percentage. Failed assets are identified as fallbacks;
optional video never gates entry. A 1.2-second phrase boundary, 120ms settle and
500ms lift precede the paused hero timeline. Reduced/saved-off motion skips the
dance and uses an 80ms fade. Native dialog focus, Escape/Enter site, a 6.5-second
readiness deadline and a pre-hydration fail-open cover prevent a trapped page.
Source: current user request; landing-entrance.tsx; marketing-motion.tsx.

## Loader dance isolation — 2026-11-04
The loader must run independently while the underlying marketing surface is
paused. The landing entrance now sits beside the paused marketing wrapper so
its descendant pause rule cannot freeze the dancer. A 1.6-second two-step uses
coordinated hip, knee, ankle and arm transforms on the existing SVG. The hero
handoff uses the dancer's CSS animation clock to finish a phrase. No new package
or media is needed. Source: user request, browser regression, and loader code.
