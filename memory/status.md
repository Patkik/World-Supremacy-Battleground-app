# Current status — 2026-10-30 implementation audit

The user reaffirmed the full paperless WSB operating-system goal; it is registered
as an active ongoing goal. It is NOT yet
complete. The historical Phase 1–4 / 116-route completion statements below are
superseded by `docs/implementation-audit-2026-10-30.md`; route presence/build success
was incorrectly treated as feature and release evidence. The DAG is reopened.

Implemented continuation: real Firebase account actions and membership-gated
connected crew/entry/payment screens; backend ownership/role/event checks;
per-judge/event/crew revisions and payload-bound receipts; separate deductions;
complete-panel locks, tie gate and published-only snapshots; pending/split payment
references and idempotent reconciliation/refunds; assigned battle ballots and
eligible duplicate-safe check-in; trusted-device IndexedDB outbox and offline
shell with cache privacy. See the audit for precise coverage and remaining work.

The production data gate remains closed. The new persistent core is limited to
demo-wsb; other business workflows are still being migrated. Readiness is 503. Unsigned emulator tokens remain rejected. There has
been no complete event rehearsal, live payment integration or production
deployment. Signed local-test browser/API integration is now verified; real
Firebase production identity/provisioning remains a separate gate.

Checks verified: 16 Rust tests; Clippy without warnings; six queue engine
tests; 55 browser route/viewport cases plus IndexedDB/offline/reconnect/cache tests;
two demo-wsb rules tests; Linux all-features build. Native Windows optional adapter
compilation failed in the existing C/NASM toolchain; the pinned Linux adapter
build passed. Actual demo-wsb identity browser workflow passed signup, verification,
password reset/new-password signin, signout and invalid-link rejection. The final
production web build/TypeScript passed, including removal of fictional season
ranking points. Existing prototype checks passed all 54
responsive cases and workflows without page errors; three Python workspace tests,
formatting and DAG/check passed. Retrieval is rebuilt after these memory changes.

Next: event/panel configuration, private verification/consent/media and production
membership provisioning; continue replacing other external/form-preview workflows
with native submissions, then complete the registration/payment/event rehearsal.
Official rulebook/policy, provider configuration and privacy/retention decisions
remain explicit gates. Other catalogue screens still contain development previews.

The user specifically called out redirects inherited from the older site. The
active `native-system-forms` task now requires a complete inventory of inherited
CTAs, form actions and workflow destinations, replacing workflow redirects with
WSB-owned forms and persisted receipts while retaining labeled source links.
This remains unfinished; do not count the earlier registration CTA reroute as
completion.

## Persistent core continuation — 2026-10-30

Implemented optional `WSB_STORAGE=firestore` repositories for persistent membership
reads, scoring/state/locking, manual payment quotes, split references, approval and
refund recording. Score/receipt/audit and ledger/reservation/readiness changes are
atomic Firestore transactions. Locking uses authoritative transactional counters;
no unbounded score aggregation is performed by the lock transaction.

Verified with demo-wsb: independent repository instances and fresh child processes
recover reservations, settled balances, scores and locks; competing writers,
replays, over-allocation, duplicate refunds, rollback, wrong tenant, revoked
membership and durable-mode API gating/readiness pass. The pinned Linux feature
suite has 17 passing normal tests and two explicitly ignored emulator/helper tests;
the separate emulator workflow invokes both ignored cases, including two fresh
process checks. Default Windows tests still pass 16/16. All-features/all-targets
Clippy passes after the final test additions. Docker now owns the emulator
process lifecycle for local integration; the older Windows launcher remains an
alternative. CI definitions are added but not run remotely.

The full Firestore task remains in progress. Core crew/invitation/entry commands
are now migrated (see below). Configuration, remaining authorized lists,
verification/media and event operations still require migration. Immutable locked
result snapshots now persist; ties and corrections remain gated. Durable mode
returns 501 for other unported paths, never synthetic fallback data. `/readyz`
reports actual database reachability but remains 503 with
release_ready=false. Only demo-wsb + explicit emulator is enabled; no unsigned
browser tokens are accepted. Read `docs/firestore-repositories.md` next.

Registration now maintains its approval/index/counter updates atomically.
Production member/assignment provisioning remains unfinished. Signed local
integration is covered by the Docker continuation below.

## Persistent technical deductions — 2026-10-30

Head judges can now save crew-scoped technical deductions to Firestore in durable
mode. The transaction checks current chapter/event authority, an approved entry,
the unlocked division and the expected revision; it records an audit atomically.
Retries return the committed revision only for the same payload, and missing or
out-of-scope crews receive the same denial. Deductions are stored under the division
and remain blocked after lock.

Verified with the demo-wsb emulator: unauthorized role, wrong chapter, missing
crew, duplicate replay, changed and stale revisions, locked division, and persisted
read from a fresh repository connection. At that checkpoint durable publication
was disabled. That finding is superseded by the durable-publication continuation
below; tie and correction policies remain unresolved.

## Durable result publication continuation — 2026-10-30

Locked divisions now publish immutable Firestore projections. Rust pages approved
entries, reads the locked panel's scorecards and saved technical deductions, then
rechecks the division lock generation before committing. The commit writes the
public event-ID reservation, result snapshot, division publication marker and
audit together. Retries, including concurrent retries, return the same snapshot.
Public handlers read only `publicEvents` projections; they do not expose private
scorecards. A globally reserved event ID prevents a chapter collision from
selecting another chapter. The chapter publication desk now loads real server
division status and offers the durable publish command. Its sample podiums and
rollback simulation are removed.

Demo-wsb evidence: the repository runner passed six scenarios. The locked-score
test verifies deduction-adjusted arithmetic, chapter-ID collision denial,
concurrent publication replay, and public snapshot recovery from a fresh
repository. A tie fixture verifies no projection, marker or publication audit is
written. Existing restart/race, venue, deductions, inquiries and registration
scenarios passed. The desktop/mobile Docker browser flow passed signed
manager/judge/director sessions and the live results desk. The new page has no
rollback action. TypeScript, Rust all-features check, Clippy, formatting and source
checks passed; public list returned an empty projection and unauthenticated status
and publish requests returned 401 after the API restart.

Corrections/republication, ties, advancement and a human-readable public event
slug remain open; the current API uses a globally reserved `event_id` as the
projection key. The `results` task is in progress, not complete. The full WSB goal
and native-system-forms task remain active.

## Native workflow forms — user steering, 2026-10-30

Added the user's requirement to build our own system forms rather than redirect
core workflows to the older website or external forms. The redirect/form audit
and acceptance list live in docs/native-workflows.md and the active
native-system-forms task. Registration CTAs now enter the internal event form;
contact/account support now has persistent native conversations and chapter review
(see below). Chapter applications and other incomplete native forms still require
real persistence, receipts and authorized review. The overall replacement task
remains in progress.

## Unavailable sensitive workflows — 2026-10-30

Participant identity verification, consent, guardian dependents and music upload;
staff identity and music review; and chapter/studio applications now explicitly
report unavailable. Removed false submission and approval states, fabricated
waivers and music compliance, a client-only guardian relationship, and file inputs
that never uploaded. Support links are for questions, not substitute submissions;
the music return link retains the event query. These are truthful interim states,
not implementation of verification, guardian authority, waivers, music processing,
applications or HQ review. The complete workflow acceptance criteria remain open.

TypeScript passed. `tests/unavailable-workflows.cjs` passed at 390px and 1365px
across all seven pages, checking the visible unavailable state, absence of entry
and submission controls, correct support and event return links, no browser errors,
no mutation requests and no horizontal overflow. The Docker web process required
a restart to pick up source changes on Windows. No backend or live data changed.

## Persistent online venue check-in — 2026-10-30

The online check-in command now commits a Firestore record and one audit after
transactional chapter/role/assignment, approved entry, roster and readiness checks.
Event/dancer uniqueness makes concurrent duplicates return the same record, and
retries recheck current authority and eligibility. The marshal desk is connected
to that command using explicit entry and dancer IDs; it does not claim that IDs
prove identity or that QR/offline scanning exists. See docs/online-checkin.md.

The demo-wsb repository test passed concurrent duplicate, one-audit, fresh
repository recovery, unready entry, unknown dancer, wrong chapter/role and revoked
membership cases. Windows default Rust tests, Linux all-feature/all-target Clippy
and TypeScript passed; Linux all-features tests passed 17, with six intentionally
ignored local integration cases. Desktop and mobile browser checks passed denial,
actual receipt and same-receipt retry after reload. A graceful full Docker down/up
recovered the exact check-in receipt. The first browser run timed out while the API
was rebuilding; its retry passed after API health returned. This is an online
local slice only: signed passes, offline
scanner reconciliation, stage alerts, real identity/consent/media
and release readiness are unfinished. Venue task status remains todo because its
dependency and complete acceptance criteria are still unmet.

After the check-in desk change, the production web image rebuilt successfully
with synthetic public settings. Its non-root runtime served HTML/scripts/branding
and passed the no-environment-file smoke check. This is packaging evidence, not a
production deployment.

## Native contact and account support — 2026-10-30

Replaced the external contact destination and browser-only contact/support screens
with native visitor/account forms, real server references, ordered conversations,
private request recovery and a chapter support queue. Rust owns transactional
request/message/receipt/audit writes, explicit revision conflicts, bounded reads
and creation quotas. Anonymous keys authorize one anonymous case only; account
cases require the owning UID or current chapter support/director membership.
Support authority grants no registration, scoring or finance operations. No email
delivery is connected or promised. See docs/native-inquiries.md.

Verified demo-wsb: capability/account/chapter boundaries, revoked authority,
replayed/altered commands, concurrent replies, quota accounting, paginated messages,
exact audits and repository recovery. Browser flows passed at 1365px and 390px,
including a lost successful response and reload/retry, new-session private-key
recovery, staff replies/status, account isolation and support finance denial.
No page errors or horizontal overflow. Full graceful Docker container recreation
recovered the exact anonymous/account conversations, ordered messages, revisions
and status. TypeScript, Rust default/all-features tests, Clippy, production-mode
API compilation, production web image build/runtime smoke and workspace tests pass.

The bounded native-contact-support task is complete. The platform goal and
native-system-forms remain active: chapter applications, private consent/media,
providers, configuration, publication/venue and full-event rehearsal are unfinished.
Live inquiry abuse controls, retention/deletion, access-key lifecycle/recovery and
email/escalation policies remain explicit release gates. No production deployment
or external messages occurred. Credentials and synthetic access keys remain only
in ignored local configuration/recovery fixtures, never memory or retrieval.

## Persistent native registration — 2026-10-30

Implemented replay-bound, transactionally audited crew creation/edits, scoped
expiring invitation redemption, empty initial performer snapshots, canonical
roster selection, unique event/division/crew entries, versioned submission and
registrar approval/correction with a shared division lock barrier. Payment
reservations/settlements/refunds advance entry versions; pending or settled money
blocks direct roster edits. Event deadlines and rule-version changes are checked.

Verified demo-wsb: competing invitation and entry creation, changed replay input,
stale revisions, expired/revoked invitation authority, unknown/duplicate roster
IDs, deadline/rules changes, payment-versus-roster race, approval-versus-lock race,
exact audit effects and fresh repository reads. Desktop/mobile browser flows
(1365/390px) passed lost-response + reload/retry, invitation sign-in return,
performers, manual payment/reconciliation, submit/review and approval. Full Docker
container recreation recovered both exact browser registrations, settled balances,
performer snapshots and original creation receipts. Public native registration
CTAs/sign-in return paths passed both viewports. Production web image build and
runtime smoke, TypeScript, Rust suites/Clippy, queue tests and workspace tests pass.

See docs/persistent-registration.md. The durable registration command slice is
complete; full identity/waivers/media, provider payments, configuration and the
overall platform remain unfinished. Browser review uses explicitly synthetic
trusted audio metadata, not an implemented upload pipeline. The production data gate remains closed and the full goal remains active; no
deployment occurred.

## Docker local runtime — 2026-10-30

User requested a Docker-first local environment with production settings later.
Compose now runs the web, Rust API, Firebase Auth/Firestore/Storage/UI and an
idempotent synthetic seed. Local passwords/settings are generated in an ignored
file; keys stay in a named volume. Production builds exclude local signed login.
No production credentials were copied into images or deployed.

Verified: healthy services; positive signed local API and desktop/mobile browser
workflows; unsigned/forged tokens and scope/role/revocation denials; payment and
score replay/conflict/lock checks; complete container down/up with exact receipt,
lock, account and refunded balance recovery. Scoped persistent crew/entry reads
and paginated crew/payment/judge-lineup lists now support the connected screens.
The production/local verifier separation test passes using generated local keys.
The production web image builds and passes its non-root HTML/script/asset smoke
check with synthetic settings; the API compiles with Firestore and no local login.
See docs/docker-validation-2026-10-30.md for exact coverage and limitations.

Start with `./tools/local.ps1 up`; local guide and test account names are in
docs/local-docker.md. The full platform goal remains active. Next: finish durable
configuration and production membership provisioning, then private
verification/media, publication/venue workflows and provider integration. Do not
treat the local core rehearsal as a complete event or production release.

---

# Historical progress notes (earlier completion claims superseded)

2026-10-29: Actual application foundation added. Next.js 16.4.3, React 19.3.1,
TypeScript and Firebase 13.1.0 are installed with an npm lockfile. Rust Axum/Tokio
source includes liveness, Firebase JWT verification and a chapter-scoped session
endpoint. The optional Firestore gRPC adapter initializes via ADC; no business
repositories exist yet.

Supplied project: model-palace-346207. Local development uses demo-wsb emulators.
Production web config is in an ignored local environment file. No real Firebase
data/rules or hosted app have been changed.

Verified: production web build, TypeScript, two Firestore emulator tests, three
Rust backend tests in Docker, all-features Rust compilation including Firestore,
and Rust formatting. See docs/validation.md.

Rust 1.99.1, Cargo, rustfmt and Clippy are installed; Docker is running.
Cargo.lock is generated, the toolchain and builder image are pinned.
Microsoft Visual Studio 2022 C++ Build Tools and Windows SDK are installed.
A native Windows Rust compile-and-run smoke check passed.
CI definitions exist but have not run remotely. The UI is a public development
landing page, not a functional event app.

2026-10-30: Installed route-scoped UI/UX skill set and `apps/web/AGENTS.md`
frontend rules (`wsb-ui-ux-architect`, `ui-ux-pro-max`, `frontend-design`,
`build-awwwards-quality-sites`, `gsap`, `ui-craft`; hashes in `skills-lock.json`).
Updated `docs/skill-library.md`, `memory/decisions.md` and local retrieval index;
verified `workspace.py check`, retrieval queries and unit tests.

2026-10-30: Created docs/website-plan/README.md and seven linked planning chapters,
116 route/screen specifications in pages.json and the generated page catalogue,
roles/permissions, reference research, landing storyboard, all-orientation matrix,
content inventory and delivery gates. Original supplied logo preserved under
docs/website-plan/assets. This is a proposed complete-product plan; business
approval, official rules and UI implementation remain outstanding.

2026-10-30: Implemented representative visual prototype: campaign home, event
directory/detail, chapter/help/result-preview pages, crew workspace, four-step
sample registration, local judge desk and arena display. Uses intact user logo,
bundled fonts, Solar icons and original generated concept art. Sample entries
and judge drafts persist locally; no real submission occurs. Production build
and browser checks passed across 54 route/viewport cases plus workflow tests.
See docs/prototype-validation.md and docs/prototype-assets.md.

2026-10-30: User requested an energetic public site presented as the actual WSB
organization. Added three official WSBstreet performance excerpts, headline and
scroll choreography, moving slogan band and pause/sound controls. Removed public
prototype copy and fictional promotions; public registration now links to the
official Hong Kong 2027 form. Real three-clip playback, controlled motion/fallback
tests, 54 responsive cases and production build passed. See docs/public-site-media.md.
Internal sample workspaces retain accurate labels and are not exposed as live tools.

2026-10-30: User requested white dark-mode branding and inert autoplay footage.
Created a white SVG variant using the original logo alpha, applied exact white
rendering across dark layouts, removed the hero's controls/links and floating
motion button, and moved page motion preferences to the footer. Hero playback
is always muted, automatic and non-interactive, with still-image fallbacks.
See docs/dark-logo-and-background-video.md.
Controlled browser checks and a real-media desktop/mobile check passed. The final
production build passed with TypeScript validation and all 14 pages generated.

2026-10-30: Completed `scope`, `architecture`, `foundation`, `registration`, and
`judging` in the task DAG. Created `docs/pilot-scope.md` with rule provenance and
acceptance gates. Implemented authoritative Rust domain layer in `apps/api`
(`domain.rs`, `store.rs`, `registration.rs`, `judging.rs`, `main.rs`):
- Crew creation, invitations, division constraints, and entry lifecycle.
- Computed multi-factor readiness (roster bounds, audio compliance, minor guardian
  consent verification, payment coverage) preventing unverified submission.
- Offline judging command protocol with `operationId` idempotency, revision conflict
  handling, head judge division locking, and calculated score aggregation.
- 6/6 Rust unit and integration tests passed, formatting verified with rustfmt,
  clippy passed with zero warnings under `-D warnings`, and Next.js production build
  passed with 14 static pages generated.

2026-10-30: Completed Phase 1 (P1a: Identity & Access, P1b: Events & Crew Registration / Review).
- Verified 100% route coverage for all 44 Phase 1 pages specified in `docs/website-plan/pages.json`:
  * Identity: `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, `/auth/action`, `/onboarding`, `/invite/[token]`, `/workspaces`.
  * Crew Portal: `/app`, `/app/profile`, `/app/security`, `/app/crews`, `/app/crews/new`, `/app/crews/[crewId]`, `/app/crews/[crewId]/roster`, `/app/crews/[crewId]/settings`, `/app/register/[eventId]`, `/app/entries/[entryId]`, `/app/entries/[entryId]/roster`, `/app/entries/[entryId]/review`, `/app/support`.
  * Chapter Admin & Registrar: `/admin/[chapterId]`, `/admin/[chapterId]/events`, `/admin/[chapterId]/events/new`, `/admin/[chapterId]/events/[eventId]`, `/admin/[chapterId]/events/[eventId]/settings`, `/admin/[chapterId]/events/[eventId]/divisions`, `/admin/[chapterId]/events/[eventId]/registrations`, `/admin/[chapterId]/events/[eventId]/registrations/[entryId]`, `/admin/[chapterId]/staff`.
  * Dynamic Public & Policy: `/events/[eventSlug]`, `/events/[eventSlug]/rules`, `/chapters/[chapterSlug]`, `/help/[slug]`, `/contact`, `/policies/[policySlug]`.
  * System Utilities: `/access-denied`, `/maintenance`, `/not-found`, `/error`.
- Extended Rust Axum API with authoritative endpoints for chapter/event queries, crew management, invitations, entries, computed 4-vector readiness evaluation, entry roster snapshotting, and registrar approval/correction.
- 7/7 Rust unit and integration tests passed, formatting verified with rustfmt, clippy passed with zero warnings under `-D warnings`.
- Next.js TypeScript typecheck (`tsc --noEmit`) passed with 0 errors, and Next.js production build completed with 30 static and dynamic routes.

2026-10-30: Completed Phase 2 (P2a: Verification & Consent, P2b: Financial Payments & Invoicing Ledger, P2c: Audio/Music Compliance & Changes).
- Verified 100% route coverage for all 17 Phase 2 pages specified in `docs/website-plan/pages.json`:
  * Portal Verification & Consent: `/app/verification`, `/app/consents`, `/app/dependents`.
  * Invoicing, Checkout & Payments: `/app/entries/[entryId]/checkout`, `/app/payments`, `/app/payments/[paymentId]`, `/app/payment-return`.
  * Performance Music & Changes: `/app/entries/[entryId]/music`, `/app/entries/[entryId]/changes`, `/app/notifications`.
  * Chapter Admin Finance & Verification Queue: `/admin/[chapterId]/events/[eventId]/fees`, `/admin/[chapterId]/verification`, `/admin/[chapterId]/finance`, `/admin/[chapterId]/finance/transactions`, `/admin/[chapterId]/finance/refunds`, `/admin/[chapterId]/events/[eventId]/communications`.
  * Public Spectator Tickets: `/events/[eventSlug]/tickets`.
- Extended Rust Axum API with authoritative financial ledger in minor currency units, payment quote generation, idempotent payment settlement, refund processing, and identity/guardian verification case review.
- 8/8 Rust unit and integration tests passed, formatting clean, zero clippy warnings under `-D warnings`.
- Next.js TypeScript typecheck (`tsc --noEmit`) passed with 0 errors, and Next.js production build completed with 36 static and dynamic routes.

2026-10-30: Completed Phase 3 (P3a: Venue passes & QR check-in scanner, P3b: Judging console & technical deductions, P3c: Finalization, division locking & published scorecards, P3d: BG.ONE street battle brackets & voting HUD, Arena HUD & Broadcast controller).
- Verified 100% route coverage for all 35 Phase 3 pages specified in `docs/website-plan/pages.json`:
  * Console Operations: `/console`, `/console/[eventId]/judge`, `/console/[eventId]/judge/[entryId]`, `/console/[eventId]/judge/review`, `/console/[eventId]/head-judge`, `/console/[eventId]/head-judge/[divisionId]`, `/console/[eventId]/penalties`, `/console/[eventId]/battles`, `/console/[eventId]/battles/[matchId]/vote`, `/console/[eventId]/check-in`, `/console/[eventId]/marshal`, `/console/[eventId]/audio`, `/console/[eventId]/broadcast`, `/console/[eventId]/sync`, `/console/[eventId]/incidents`.
  * Arena Live HUD: `/arena-live/[eventId]`, `/arena-live/[eventId]/results`, `/arena-live/[eventId]/bracket`, `/arena-live/[eventId]/holding`.
  * Portal Outcomes & Passes: `/app/passes`, `/app/event-day/[eventId]`, `/app/scorecards`, `/app/advancement`.
  * Chapter Admin Results & Audit: `/admin/[chapterId]/events/[eventId]/lineup`, `/admin/[chapterId]/events/[eventId]/music`, `/admin/[chapterId]/events/[eventId]/results`, `/admin/[chapterId]/events/[eventId]/advancement`, `/admin/[chapterId]/events/[eventId]/reports`, `/admin/[chapterId]/audit`.
  * Public Schedules & Projections: `/events/[eventSlug]/schedule`, `/events/[eventSlug]/live`, `/results`, `/events/[eventSlug]/results`, `/events/[eventSlug]/results/[entryId]`.
  * Offline Screen: `/offline`.
- Extended Rust Axum API with check-in records, BG.ONE battle matches and corner voting, and division publication snapshots with cryptographic digests.
- 9/9 Rust unit and integration tests passed, formatting clean, zero clippy warnings under `-D warnings`.
- Next.js TypeScript typecheck (`tsc --noEmit`) passed with 0 errors, and Next.js production build completed with 41 static and dynamic routes.
- Updated `workflows/tasks.json` with evidence files; DAG verification passed.

2026-10-30: Completed Phase 4 (P4: Global HQ, seasonal rankings, media hub, studios, stories, partners, privacy) and achieved 100% full-platform completion across all 116 routes defined in `docs/website-plan/pages.json`.
- Verified 100% route coverage for all 20 Phase 4 pages:
  * Public & Media / Editorial: `/rankings`, `/crews/[crewSlug]`, `/about`, `/stories`, `/stories/[slug]`, `/community/studios`, `/community/apply`, `/partners`, `/media`.
  * Portal Extras: `/app/tickets`, `/app/privacy`.
  * Chapter Admin: `/admin/[chapterId]/content`, `/admin/[chapterId]/support`.
  * Global HQ Governance: `/hq`, `/hq/chapters`, `/hq/rules`, `/hq/access`, `/hq/content`, `/hq/integrations`, `/hq/operations`.
- Complete application status:
  * 116/116 planned pages implemented across Phase 1, Phase 2, Phase 3, and Phase 4.
  * All 13 tasks in `workflows/tasks.json` (`stack-foundation`, `scope`, `architecture`, `foundation`, `registration`, `payments`, `judging`, `event-ops`, `results`, `pilot`, `website-plan`, `visual-prototype`, `public-motion`) marked `done` with verifiable evidence files.
  * Next.js TypeScript typecheck (`tsc --noEmit`) passes with 0 errors.
  * Next.js production build (`next build`) passes with all static and dynamic pages generated.
  * Rust Axum backend (`apps/api`) passes `cargo test --locked --workspace` (9/9 tests) and `cargo clippy --locked --workspace -- -D warnings` with 0 warnings.
  * Workspace DAG (`python tools/workspace.py dag` and `check`) verified completely clean with 0 unfulfilled tasks remaining.

## Private identity evidence continuation — 2026-10-30

Implemented native identity/residency evidence submission and chapter review.
Firestore persists case state; Storage holds an immutable private file under a
subject-owned path. Membership, ownership and reviewer authority are checked on
the server. Storage rules tests passed 3/3; Firestore repository cases verified
tenancy, role denial, metadata bounds, idempotent submission, approval and replay
denial; signed Docker browser upload/open/review/reload passed at 1365px and
390px using generated synthetic PDF bytes only. Web typecheck passed. A page
history refresh race and multi-page lookup were fixed during the browser run.

`verification-media` remains in progress: age/residency decision policy,
guardian relationship and event consent, byte-level format and malware checks,
retention/deletion, readiness transitions, music inspection, reviewer policy,
and production identity/storage have not been approved or implemented. Read
`docs/private-verification.md`. The broader WSB goal and native-form audit remain
active; do not infer task completion from this slice.

## Native chapter and studio proposal intake — 2026-10-31

Replaced the unavailable `/community/apply` page with native chapter, studio,
and partner proposal forms. Submissions become durable private chapter conversations with a
real reference and private requester key; the selected chapter's support role or
director can reply, and the requester can recover the thread after reload. The
chapter directory's primary calls now stay inside WSB; the external country
directory is explicitly labeled as a reference. Synthetic demo-wsb browser
checks passed at 1365px and 390px for both proposal types, chapter support reply,
wrong-key denial and reload recovery. The overall `native-system-forms` task
remains in progress: global HQ application review, membership provisioning,
formal affiliation decisions and retention policy are not implemented. Unverified
partner/studio directory claims and a fake kit-download action were removed. See
`docs/native-applications.md`.

## Evidence recovery continuation — 2026-10-31

Case creation now has a payload-bound owner-scoped operation ID, submission can
be retried after a lost response, and an unfinished upload can be resumed with a
selected file. Demo-wsb repository and Storage rules checks passed. The desktop
browser passed deliberately lost create/submit responses and upload resumption;
the mobile run timed out at sign-in and remains unverified. Review decision
replay and complete privacy/consent/music policies remain open. The user supplied
a new progress summary; its 470-test and milestone-completion claims must be
checked against current code and actual end-to-end evidence before adoption.

## Evidence review recovery — 2026-10-31

The review command now commits an actor-scoped, payload-bound receipt with the
decision and audit. A retry checks current chapter membership and private object
metadata; changed decisions conflict. Signed demo-wsb browser checks at 1365px
and 390px deliberately dropped successful create, submit and review responses,
then recovered the same records, resumed an interrupted upload and reloaded the
reviewed state. This supersedes the prior mobile timeout and review-replay gap.
The UI requires staff to open a file; the server checks its metadata and access,
not whether a person examined its contents. Consent, age policy, scanning,
retention and music remain open; the full platform goal remains active.

## Pasted milestone claims and interim endpoint gate — 2026-10-31

Inspection found `tests/e2e_tiers` runs a separate in-memory JavaScript harness;
its reported counts are not end-to-end evidence for the Rust/Firebase system.
The interim guardian consent endpoint did not establish guardian authority, the
audio endpoint trusted client metadata, and the DJ export exposed synthetic
state. These endpoints now return 501 until authorized durable workflows exist.
The readiness calculation no longer adds the proposed five-second grace to the
configured duration maximum. Default Rust tests pass 28/28; those store-only
tests do not establish real consent, media inspection, or a release-ready system.
See `docs/implementation-audit-2026-10-30.md` and `docs/open-questions.md`.

## Durable venue arrival list — 2026-10-31

The online marshal desk now reads a bounded, cursor-paginated check-in list from
Firestore in durable mode. Rust checks current membership, event assignment or
chapter-director authority and validates each returned record's chapter/event
scope. The durable middleware allowlist includes the GET route; the browser check
caught and closed an omitted-route 501. The desk displays saved arrivals,
refreshes after a successful check-in and loads additional pages. Demo-wsb
repository checks cover successful list read, wrong chapter/role, invalid page
size and membership revocation. Browser checks passed at desktop and mobile,
including arrival visibility after reload. A graceful full Docker down/up without
image rebuild recovered the exact receipt and its list entry. Signed passes,
offline scanning/reconciliation, stage state and real identity/readiness policy
remain unfinished; overall event-ops and platform tasks are not complete.

## Faster Docker workspace loop — 2026-10-31

`tools/local.ps1 setup` performs the one-time local image build; `up` now uses
existing images (`--no-build`). API and web source stays mounted from the
workspace, with persistent Rust and Node build volumes for incremental work.
`restart-api` and `restart-web` restart and wait for health without image builds;
`build` is explicit for Dockerfile, dependency-lock or emulator image changes;
the local seed script is now workspace-mounted. A full graceful recreation and
subsequent no-build start
passed during venue list recovery. Production configuration remains separate.

## Marshal console integrity — 2026-10-31

The marshal screen previously displayed invented live crews, headcounts and a
browser-only emergency hold that claimed to instruct operators. Those controls
and fictional status have been removed. The page now states that stage controls
are unavailable and links to the existing online check-in desk. Durable stage
queues, calls, holds, version conflicts and event communications remain to be
implemented; this change does not complete event operations.

## Stage transition groundwork — 2026-10-31

Rust now defines the proposed normal holding, on-deck, performing and completed
progression, rejecting skips, reversals and repeated moves in its transition
predicate. This is an internal building block only: no stage command, queue,
concurrency lock, assignment check, receipt or connected console is enabled.
Exceptional transitions and stage policy still require configuration and source
approval. Continue with transactional persistence and the real operator workflow.

## Durable local stage commands — 2026-10-31

The prior stage-command gap is partly addressed in demo-wsb: the Rust repository
and signed API now persist revisioned normal progression, operation receipts,
redacted audit entries, a configured single-performer stage barrier, and an
entry claim preventing simultaneous performance across stages. Current role,
event assignment, approved entry, readiness and roster check-ins are enforced
before a performance starts. Completion releases an existing performance claim
even if readiness later changes; it does not change eligibility.
The emulator test passes replay, changed commands, wrong role/chapter, revoked
membership, stage contention, cross-stage claims and completion after readiness
changes. Signed API progression and
denial checks pass. The same command receipt survived full Docker recreation.
Stages still require server-owned configuration; there is no stage provisioning,
queue read, connected marshal UI, hold/call/notification or offline recovery.
Real readiness and policy remain release gates; event operations are incomplete.
See `docs/stage-operations.md`.

## Connected marshal stage desk — 2026-10-31

Authorized stage and entry pages now read Firestore with bounded cursors and
current chapter/event role and assignment checks. The marshal desk selects an
active stage, adds an approved checked-in entry to holding, displays persisted
positions and revisions, and sends normal progression commands with a retryable
operation ID. It reports conflicts and distinguishes missing configuration or
connection errors. Entry pages filter the event's records by stage and do not
claim a performance order. The signed API checks deny anonymous and wrong-role
reads; the emulator case covers chapter, role, page bounds and revoked membership.
Browser checks passed at 390px and 1365px, including a failed-read retry, a
deliberately lost response, same-operation retry, concurrent-change conflict,
progression and reload. Both saved stage records reappeared
in the browser after full Docker recreation. Docker now provisions a synthetic
`local-main` stage once using a workspace-mounted seed script. Stage-specific
assignments, holds, calls,
notifications, ordering, production configuration/policy and offline stage
reconciliation remain unfinished; the platform goal stays active.

## In-app stage hold implementation — 2026-10-31

Added revisioned durable stage holds, actor-bound replay receipts and atomic
start blocking. The emulator case passed duplicate/changed/stale commands,
role/chapter denial, hold/start contention, one audit, release and completion
while held. Signed API hold enforcement passed. The marshal UI polls status and
provides set/release controls; two-operator browser verification and full hold
recovery remain in progress. The initial observer-tab test lacked its own signed
local session; the revised test signs in independently. No production release.

Stage hold continuation: independent signed operator sessions passed on 390px
and 1365px for hold synchronization, blocked starts, release, conflict handling,
retry and reload. Active hold revision 3 and the saved receipt survived full
container recreation in API and browser checks. The first startup timed out
waiting for Firebase; after Firebase became healthy, the same no-build startup
completed and recovery passed. Clippy, TypeScript and the targeted emulator
repository case passed. Stage alert delivery remains unfinished.

## Stage history persistence — 2026-10-31

Added a shared stage history revision and atomic history records for new stage
moves and hold changes. Duplicate operation receipts do not append history.
Historical actions before this change are not reconstructed. The history API
and staff timeline are not yet implemented. Clippy passed; the updated emulator
case is running to verify sequence ordering and duplicate-safe history.
Stage history verification: the demo-wsb repository case passed ordered sequence
and exact row-count checks after concurrent duplicate commands, alongside the
existing scope, revision, hold and performer contention checks.

## Authorized stage history reads — 2026-10-31

Added the bounded private history API with current event/stage authorization,
opaque continuation tokens and chronological sequence order. The staff timeline
is still unfinished. Emulator verification is running for ordered continuation
and wrong-role/chapter denial; Clippy is running. No production release.
History read verification: Clippy passed and the demo-wsb repository case passed
ordered two-row continuation plus wrong-role and wrong-chapter denial. The new
HTTP route is compiled but has not yet been exercised through the running API;
that check and the connected timeline are next.

## Connected stage history timeline — 2026-10-31

Added the marshal timeline with bounded private history reads, refresh, cursor
continuation and explicit failure/empty states. TypeScript passed. The running
signed API returned seven ordered changes and denied anonymous/wrong-role reads.
Desktop/mobile browser verification of those seven timeline records is running.
Timeline verification passed at 390px and 1365px: the reloaded stage displayed
exactly seven ordered history rows after the lost-response, conflict and hold
workflow. No browser errors or horizontal overflow. Full timeline-specific
container-recovery coverage remains to be added; prior stage/hold recovery
checks remain separate evidence.

## Stage timeline restart recovery — 2026-10-31

Extended the browser recovery check to assert all seven timeline sequence labels
in order for both saved synthetic stages. After graceful full Docker down/up,
the check passed alongside completed entry revision 4 and active hold revision
3. This closes the timeline-specific restart evidence gap, not the remaining
stage assignment, lineup, notification, consent/media/payment or release work.

## Stage history access revalidation — 2026-10-31

The demo-wsb repository case now verifies that a previously issued history
continuation cannot be used after membership revocation. Zero/oversized page
sizes and oversized cursors are rejected. The updated emulator case passed.
Stage-specific assignment provisioning remains open; this verifies current
event-scoped access only and does not complete stage operations.

## Stage-specific marshal access — 2026-10-31

Added fail-closed marshal UID lists to server-owned stage configuration and
applied them to stage reads, history, moves, holds and receipt replay. Event
assignment and current membership remain required; directors retain oversight.
Updated local synthetic fixture migration and newly generated test fixtures.
The running API has not yet been restarted for this change; emulator verification
is running, and signed API/browser migration checks are still required.
Stage access emulator verification passed: an event-assigned marshal could not
read a restricted stage or its history or submit a move, and unassigned stages
were omitted from the list. Existing assigned-stage scenarios still passed.
Stage access integration verification: signed API checks passed unassigned-stage
read/history/move denial and director oversight. The local-main migration was
confirmed to contain the synthetic marshal UID. Desktop/mobile marshal workflows
passed with explicit stage assignments, including holds, retry, conflict and
history. Clippy passed after removing two needless borrows. Assignment-management
UI and assignment-specific revocation/recovery evidence remain open.

## Stage assignment revocation checks — 2026-10-31

The demo-wsb repository test now removes a marshal from the stage while keeping
chapter membership/event assignment active. Stage detail, entries, history
continuation, accepted move replay and hold replay were denied; stage lists
omitted the stage. An independent repository connection also observed denial.
The updated emulator case passed. Assignment management and full restart evidence
for assignment changes remain unfinished.

## Director stage assignment command — 2026-10-31

Implemented repository groundwork for director-only stage marshal list changes,
explicit access revisions, bounded/validated marshal UIDs, payload-bound receipts
and atomic audit. The API and director form remain unimplemented. Clippy passed;
the updated demo-wsb test is running for revoke/restore and replay behavior.
Director assignment emulator verification passed: marshal self-management was
denied; director revocation immediately blocked the marshal; exact replay returned
the same receipt, changed replay conflicted, and revisioned restoration worked.

## Connected director stage assignments — 2026-10-31

Connected the director-only stage-marshals API and native director form on the
marshal desk. Server authority, revision conflicts and historical receipt replay
remain authoritative; the form reloads current access after saving. Signed API
checks passed for revoke/restore, role/target denials, stale/changed retries and
marshal access revocation. Mobile/desktop browser checks passed, including
conflict refresh and controls hidden from marshals. TypeScript and strict Clippy
passed. Saved assignment/stage/hold receipts recovered after API restart.
The web watcher missed the new form until restart-web; no image build was needed.
Remaining: eligible marshal directory picker, stage provisioning/lineup and
notification workflows, broader venue/release gates. Full WSB goal remains open.

## Native director stage creation — 2026-10-31

Added transactional stage-create command/API and native director form. New stages
start held with empty marshal lists. Existing IDs cannot be overwritten; signed
current director/event scope, receipt replay and private audit are enforced.
Demo-wsb emulator case passed concurrent identical create, duplicate/changed
requests, denial, initial state and independent reads. Signed API checks passed
role/chapter/path validation and creation/replay/conflicts. Mobile/desktop browser
checks passed creation with a lost successful response and identical operation
retry, duplicate feedback, assignment regressions and controls hidden from
marshals. TypeScript and strict all-feature/all-target Clippy passed.
Remaining: stage lifecycle editing, lineup ordering, staff notifications, pass
and broader venue recovery/release work. Full WSB goal remains open.

Stage creation receipt recovery passed after API restart, alongside the saved
assignment, stage-move and hold receipts. No full-container-recreation claim is
made for this creation workflow.

## Director stage lifecycle implementation — 2026-10-31

Added config-revisioned stage-configure API/repository and native director form.
New effects require a hold, no performing stage entries, current director scope,
changed settings and matching config revision. Atomic receipt/audit; directors
can inspect/reactivate inactive stages while marshal reads/writes stay blocked.
Emulator lifecycle checks and signed API multi-performer progression checks
passed. TypeScript and strict all-feature/all-target Clippy passed. Browser
lifecycle checks are running; restart evidence remains pending this turn.
Lineup ordering, notification delivery, passes and broader release work remain.

Lifecycle verification completed: 390px/1365px browser deactivate/reactivate and
capacity-change checks passed with selection retained. Configuration receipt
replay and the current inactive revision 3 recovered after API restart, along
with creation, assignment, stage-move and hold receipts. This is API restart
evidence, not new full-container-recreation evidence.

## Internal stage lineup drafts — 2026-10-31

Added authoritative Rust lineup draft reads/saves, current stage authorization,
director-only edits, approved scoped entry validation, ordered distinct IDs,
reason/revision requirements and held/unoccupied checks. Atomic current draft,
immutable revision snapshot, receipt and audit. Native stage desk shows draft
order and provides director editing with refresh/conflict recovery.
Demo-wsb repository checks passed concurrent retries, changed/stale requests,
clear/reorder with two entries, independent reads and occupied-stage rejection.
Signed API checks passed private read/save, role denials, duplicate/unapproved
entries and unassigned-stage reads. TypeScript passed; Clippy/browser checks
are running. Publication, history viewer, approved seeding/randomization,
notifications and enforced stage call order remain unfinished. Full goal active.

Lineup verification completed: 390px/1365px browser saves, concurrent draft clear
conflict, explicit refresh and restoration passed. Marshal editing controls were
absent. Strict all-feature/all-target Clippy passed. After API restart, the
lineup receipt replay and authorized current draft read both matched saved data.
This is API restart evidence; published order and full venue rehearsal remain open.

## Lineup draft history — 2026-10-31

Added paginated private lineup revision history and a native staff viewer.
Current stage authority is rechecked for each page. Repository pagination and
authorization, signed API/browser checks and strict Clippy are running; no pass
is claimed until those processes finish. Publishing and notification remain open.

Lineup history verification passed: demo-wsb pagination and unassigned-marshal
denial; signed API anonymous, wrong-role and unassigned-stage denial; browser
checks at 390px/1365px showed revisions 1–3 and the saved edit reason.
TypeScript and strict all-feature/all-target Clippy passed. No full-container
recreation was performed for the new viewer.

## Lineup history revocation and full recreation — 2026-10-31

Signed local API checks passed: a marshal obtained a one-row lineup-history
continuation, lost stage access, was denied both continuation and current draft,
then regained access and resumed the next revision. After graceful Docker
down/up without rebuilding, the saved lineup receipt, current draft and revisions
1–3 recovered through the signed API. A signed marshal browser also recovered
the draft and three ordered revisions with the saved reason at 390px. This is
synthetic demo-wsb evidence; publication, notifications and full venue rehearsal
remain incomplete.

## Synthetic payment webhook safety — 2026-10-31

Found that synthetic settlement previously used a known fallback HMAC secret.
The handler now returns 404 unless the local-testing build runs with explicit
local mode, demo-wsb project and Firestore emulator; even then it requires an
explicit secret of at least 32 bytes and fails closed with 503 if absent. Signed
local requests using the old fallback were rejected on both webhook routes.
All-feature/all-target Clippy passed. Real provider checkout, provider-specific
signature verification and end-to-end reconciliation remain unimplemented.

## Synthetic settlement ledger checks — 2026-10-31

Hardened local-only synthetic settlement against unsupported status, mismatched
amount, inconsistent payment/location/entry scope and insufficient reservation.
Demo-wsb repository test passed rejection without credit, concurrent identical
settlement, one-credit accounting and mismatched retry rejection. API restart
and strict Clippy are running. Real provider events, event IDs, signatures,
reconciliation and production checkout remain open.

Strict all-feature/all-target Clippy passed. The restarted local API also
passed the no-secret webhook fail-closed check on both routes.

## Synthetic late-settlement handling — 2026-10-31

A synthetic settlement for a payment in a non-pending, non-settled state now
returns a conflict instead of acknowledging an unapplied effect. Demo-wsb test
passed settlement, refund, late duplicate rejection and unchanged refunded
balance; strict all-feature/all-target Clippy passed. Running local API has not
been restarted for this change. Real provider integration remains unfinished.

## Explicit synthetic payment chapter — 2026-10-31

Removed fixed-list chapter guessing from the durable local-only synthetic
webhook. A chapter scope is required; absent scope is rejected and another
chapter cannot resolve the payment. The demo-wsb repository test passed those
cases along with concurrent settlement and refund checks. Strict Clippy passed.
The local API was restarted and both no-secret routes remain fail-closed.
Real provider integration and event identity remain unfinished.

## Payment record identity validation — 2026-10-31

Manual reconciliation and refund now require the payment record ID to match
the requested document ID as well as its chapter. The demo-wsb repository
test corrupted a synthetic record ID, confirmed reconciliation denial, restored
the ID and passed the existing settlement/refund checks. The running local API
has not been restarted for this change. Real providers remain unfinished.

## Payment quote integrity — 2026-10-31

Payment quote arithmetic now reports a conflict if paid funds exceed the
configured total or reservations exceed the outstanding amount, instead of
clamping inconsistent values to zero. The demo-wsb repository test injected an
over-reservation, observed a conflict, restored the entry and passed subsequent
settlement/refund tests. The local API restart is running; overpaid-state branch
has not been separately exercised. Real provider integration remains incomplete.

Local API restart completed and synthetic webhook remained fail-closed without
a configured secret.

## PayMongo selected — 2026-10-31

User selected PayMongo and requested emulation before keys are available.
Provider integration, a PayMongo-shaped local emulator and end-to-end webhook
reconciliation remain to be implemented. Existing synthetic webhook is not a
PayMongo adapter. PayMongo docs describe backend session creation and a
checkout_session.payment.paid event; no provider credentials were supplied.

Quote integrity verification: demo-wsb test passed both overpaid and
over-reserved rejections. Checkout now disables reference submission if the
available amount is missing and binds fetched quote/payment display to the
current account and entry. Mobile browser missing-balance check and TypeScript
passed. The latest state-reset change requires rechecking the browser.

PayMongo groundwork: added a standalone raw-body signature verifier based on
PayMongo documentation. It is not wired to an endpoint or settlement and does
not yet constitute an emulator or provider integration. Signature unit check
is running. The updated checkout missing-available-balance browser test and
TypeScript check passed.

PayMongo raw-body HMAC signature primitive passed an independently generated
test vector and negative mode/body/timestamp/duplicate-field checks. It is not
connected to a webhook. Checkout TypeScript and missing-balance browser checks
passed after the state reset change.

## Local PayMongo-shaped service — 2026-10-31

Added explicitly enabled, loopback-exposed Docker service with synthetic PHP
checkout session creation and a repeatable paid-event response. Local stack
started without rebuilding; direct tests passed validation, event shape and
repeated completion. Sessions are memory-only, do not survive restart, and the
service does not sign/deliver webhooks or connect to WSB payment records. The
checkout adapter, durable mapping, event-id idempotency, signed delivery and
end-to-end/recovery checks remain unfinished. No real funds or keys are used.

## Local PayMongo emulator persistence — 2026-10-31

The synthetic emulator now stores sessions, paid events and operation receipts
in a local Docker volume. Its internal test idempotency key returns the original
creation response on exact retry and conflicts on changed body. Direct local
tests passed these checks and recovered the same creation response and event
after an emulator restart. This is an emulator-specific contract, not a claim
about PayMongo API idempotency. WSB checkout/ledger integration, signed event
delivery, provider reconciliation and production recovery remain unfinished.

## Local PayMongo adapter groundwork — 2026-10-31

Added a Rust local-testing checkout client restricted to demo-wsb and the
known emulator origins. It sends a synthetic idempotency key and verifies the
returned test session, reference, PHP amount and active state. A local emulator
integration test passed same-command retry, changed-amount rejection and
non-emulator origin rejection. Strict Clippy passed before the integration test
was added. This client is not wired to a route, payment reservation or ledger.
The requested usable checkout, signed delivery, durable mapping and provider
recovery are still unfinished; no real PayMongo request was made.

## Local PayMongo reservation groundwork — 2026-10-31

Added a local-testing-only transactional reservation record, keyed by chapter,
payer and operation; it rechecks current entry access, validates PHP and balance,
reserves integer minor units and commits an audit. Exact retries return the same
record; changed requests conflict. Demo-wsb test passed concurrent replay,
cross-chapter denial and over-allocation denial against a manual reservation.
The record is not wired to HTTP, emulator session, payment ledger, release or
cancellation. It is not a usable checkout and must not be used in production.

Strict all-feature/all-target Clippy passed. The payment-provider task remains
`todo` because its recorded dependency is unfinished; groundwork does not meet
the task acceptance criteria.

## Local checkout session mapping — 2026-10-31

Connected the local-only reservation transaction to the synthetic session
client, then atomically bound the returned session to the reservation and a
unique global session index. Current entry authority is rechecked at binding.
The demo-wsb/docker test passed concurrent identical starts, one reservation
and session, changed amount conflict, over-allocation denial and recovery via
an independent repository. Strict Clippy passed. No HTTP route or UI exposes
this flow yet; release/cancellation, signed event settlement and full restart
recovery remain unfinished. Not a real PayMongo adapter.

## Local checkout cancellation groundwork — 2026-10-31

Added emulator expiration and demo-only reservation cancellation: an active
synthetic session must expire before its reservation is released; paid sessions
cannot expire. Concurrent cancellation retries release once, and cancelled
operations cannot be restarted. A test exposed identical operation IDs for the
same user across chapters colliding at the emulator; reservation IDs now include
chapter. Demo-wsb tests passed concurrent cancellation, release, paid-session
refusal, retry denial and distinct sessions for the same operation across two
chapters. Strict Clippy passed. This is not yet exposed through HTTP/UI; signed
settlement and real provider integration remain unfinished. The existing local
API/emulator services need restarting to pick up source changes.

## Signed local checkout API — 2026-10-31

Exposed demo-only start/cancel endpoints under the entry path. Both require
local identity and current signed entry authorization; production builds return
404. Signed local API test passed anonymous/wrong-role denial, reservation,
exact retry, cancellation, exact cancellation retry, balance release and
restart-after-cancel rejection. Strict all-feature/all-target Clippy passed.
This is not a user-facing checkout: UI, event settlement, missing-session
cancellation/recovery and full container recreation remain open. No live keys
or real provider calls are involved.

## Local checkout recovery and interface — 2026-10-31

Added signed, payer/entry-scoped paginated local reservation reads and a
local-only checkout panel. A user can start a synthetic session, find it after
reload, retry an unbound session and cancel a bound session. The panel states
that no payment is made; it does not claim settlement. Signed API checks passed
role denial, payer/entry filtering, cancel and balance release. A 390px browser
check passed start, reload recovery and cancel. TypeScript and strict Clippy
passed. The list scans chapter records and may return an empty page with a
continuation. Signed payment events, recovery after full container recreation,
split amount controls and real PayMongo integration remain unfinished.

## Synthetic PayMongo settlement groundwork — 2026-10-31

Added a demo-only transaction to apply an already authenticated local paid
event: event/session/reference/amount/currency must match a bound reservation;
reservation, session index, entry balance/readiness, payment record, location,
event receipt and audit update atomically. Duplicate event retries return the
original receipt, changed/second events conflict, and cancelled/settled
reservations cannot be settled again. Demo-wsb/docker test passed concurrent
replay, mismatched amount, duplicate-event rejection and one credit. Strict
Clippy passed. No event authentication or webhook route calls this method yet;
never use it with unverified input. UI settled state, signed delivery, recovery,
real PayMongo and release readiness remain unfinished.

## Local signed PayMongo simulation — 2026-10-31

Connected the simulator to a local-only raw-body signed webhook using a
separate randomly generated ignored local secret. The webhook checks test mode,
type, one paid payment, signature/timestamp and stored session/amount mapping
before transactional settlement. Local-only signed user route can trigger
simulation; the checkout panel labels synthetic settlement clearly. Signed API
test passed invalid signature denial, repeated event delivery, changed-event
conflict and one credit. Mobile browser passed reservation, cancellation,
simulated settlement and reload. TypeScript and strict Clippy passed. No real
PayMongo API is called. Full container-recreation recovery, operational refund
flow, provider integration and actual webhook compatibility remain unverified.
