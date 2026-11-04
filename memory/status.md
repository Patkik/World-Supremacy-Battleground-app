# Current status — 2026-10-30 implementation audit

## Urban street-art landing redesign — 2026-11-03

Implemented the user's asphalt/concrete, acid lime, orange and cyan landing brief.
Self-hosted Anton and Space Grotesk complement existing JetBrains Mono. Scoped
campaign CSS adds a tiled inline SVG fractal texture, halftones, stencil/marker
headline, rotated stickers/video poster, hard bordered cards/shadows, clipped
corner decoration, angled marquee directly below the hero, and torn SVG edges.
The event date uses tabular numerals. Existing links, event binding and walkthrough
behavior are retained; operational surface tokens are untouched.
Fixed narrow header spacing and contained rotated tape overflow. Typecheck and
final production build passed (68 static pages), as did workspace validation.
Rebuilt/recreated only the local web container for its new font dependencies;
its homepage returned 200 with the new campaign markup. Browser verification
covers four screen widths, contrast/axe, controls, stable walkthrough panels,
decorative pointer behavior and reduced motion. Final built-page checks passed at
320/390/768/1440: no horizontal overflow, no axe WCAG A/AA findings in the landing
surface, stable walkthrough panels, keyboard FAQ, valid share PNG, no page exceptions.
Existing public-motion browser regression passed autoplay, preference/cleanup, lazy
motion loading, data saving and poster fallbacks. Final previews: .workspace/street-
320.png and street-1440.png; log: .workspace/street-review.log.
No production deployment or business-rule change.

## Focused landing-page follow-up — 2026-11-03

Removed overlapping role/culture/chapter sections and the duplicate event promotion.
Added a clearly labeled synthetic interactive entry walkthrough, stable panel space,
keyboard controls, live announcements and an official announcement source link.
Desktop full-page height fell from 6121 to 4295px (about 30%); 320px height fell
from 6650 to 4988px (25%). Existing destinations remain available independently.
Build with TypeScript passed. Local walkthrough checks passed each of three states
at 320/390/768/1440 widths, stable component height, overflow, keyboard interaction,
component axe scan, FAQ operation, share PNG and no browser exceptions. Desktop
and narrow screenshots were reviewed. Initial narrow-state resizing was found and
fixed. An overlapping build interrupted an earlier browser run; verification was
restarted sequentially. Final full browser suite passed accessibility, stage recovery,
muted footage/motion fallbacks and service-worker upgrade preservation. Fresh local
lab: simulated-mobile cold LCP 1160ms, CLS 0.00798, transfer 500971 bytes;
warm LCP 312ms and CLS 0. Motion-allowed loopback cold LCP 1060ms, CLS
0.00827. These are not field Web Vitals or Lighthouse scores. Report in
.workspace/landing-performance.log. Release, policy and external evidence gates remain open.

## Landing-page critique fixes — 2026-11-03

Implemented the requested conversion pass: explicit street-dance event headline,
dominant event-discovery CTA, focused homepage navigation, browse-before-account
reassurance, sourced community-history strip, three onboarding stages with native
detail disclosures, six-question FAQ and generated OpenGraph/Twitter image routes.
Privacy FAQ explicitly points out policy availability rather than implying approved
policy text exists. Indexing remains disabled pending release approval.

Fresh typecheck and final production build passed (68 static pages). Initial
restricted Windows builds hit generated-directory EPERM errors; the authorized
build succeeded. A temporary local browser review passed single heading, three
steps, reassurance, 320/390/768/1440 overflow, keyboard FAQ opening, rendered share
PNG and no page exceptions. Desktop and 320px screenshots were visually inspected
under .workspace. Existing browser audit passed its keyboard, serious/critical
WCAG scan, form-label, reflow and published-projection checks. The motion test now navigates via the primary event CTA after removal of the
old homepage Events nav link; its autoplay, cleanup, reduced-motion, lazy chunk,
data-saving and poster-fallback checks passed. Static output includes both share
image URLs using the explicitly synthetic local build base. No new hosted
Lighthouse, conversion-rate or live policy/provider evidence is claimed.

## Overall audit implementation continuation — 2026-11-03

Continued `docs/overall-audit-2026-11-02.md` through the current code-addressable
optimization slice. The homepage motion engine is now dynamically loaded only
when the visitor allows motion; the browser regression confirms both reduced
motion and a saved “motion off” preference omit the engine chunk. The same
production browser pass covers serious/critical axe findings on selected public
routes, keyboard skip focus, sign-in labels, 320/390px reflow, effective-width
zoom proxy, unpublished public projections, muted-video fallback, data saving
and service-worker A-to-B cache cleanup while retaining queued IndexedDB work.

Fresh evidence: `npm run typecheck`, `npm run build` (66 generated static
pages), `npm run measure:public-performance`, and the three parser-process
integration cases passed. Homepage script transfer was 384,386 bytes with motion
allowed and 333,847 with reduced motion; the lazy motion chunk measured 50,539
bytes. Final clean-build reduced-motion cold LCP/CLS/transfer measured
580ms/0.00017/497,057 bytes on loopback and 1,244ms/0.00017/496,696 bytes under
the synthetic 150ms, 1.6Mbps/0.6Mbps and 4x CPU profile. Warm LCP measured 36ms
and 608ms across the cache/network profiles. These are local lab numbers only.
The audit
task remains in progress: full authenticated journeys, signed-score rehydration
through an error boundary, Linux parser resource limits, actual screen-reader/
zoom and venue devices, hosted CI evidence, and all event/provider/privacy/
production approvals remain open. The fresh local role demo passed 18/18
synthetic roles and 47 pages at desktop/phone widths with expected authorization
denials. This does not confirm full task comprehension or unavailable business
workflows. A temporary production-build probe forced
route and root render failures and passed fallback, retry and synthetic queued
IndexedDB record persistence at phone/desktop sizes; its route and hook were
removed after the check. The broader `tools/test-rehearsal.ps1` then passed its
synthetic API role isolation, recovery, payment replay/refund, stage publication,
music, draft-policy, content, outbox and local browser checks against demo-wsb.
Its documented exclusions remain actual policy/compliance and full event operation.
Rebuild retrieval after editing this memory entry.

## Audit accessibility and projection enforcement — 2026-11-02

Implemented the next audit slice. The document skip link now uses a native
fragment target and the marketing main landmark accepts focus. A CI contract checks shared accessibility/recovery
invariants and prevents the published arena route from importing the fictional
preview. Added a local Playwright audit for skip navigation, sign-in labels,
narrow reflow and public-projection boundaries, and wired it into the rehearsal.
The global error boundary is now a self-contained WSB recovery surface with an
alert landmark and 56px retry control. The moving campaign tape now clips its
paint overflow at narrow widths. Build, typecheck, the two contract tests, four
stage tests and eight outbox tests passed. The live browser audit exposed and
then repaired the skip-link defect, and passed at 390px/320px against the rebuilt
standalone app. Docker-stack and assistive-technology rehearsals remain required.
No event policy, provider, privacy or production gate changed.

## Continued professional-readiness audit — 2026-11-02

Extended `docs/overall-audit-2026-11-02.md` without changing application code.
The follow-up confirmed accessibility foundations (skip link, focus, labels and
status/alert states) but found no CI accessibility, keyboard, zoom or
screen-reader gate. It also records the unoptimized priority YouTube highlight
poster, preview/production proximity and minimal generic root-error styling as
tracked audit findings. Local public/sign-in/stage URLs served successfully;
no browser performance metrics were claimed because a reliable capture was not
available. The report now tracks 3 P0, 6 P1, 7 P2 and 2 P3 findings. Next:
add accessibility/recovery regression evidence, measure media delivery, then
continue the approved policy/provider/privacy/production release work.

## Audit implementation checkpoint — 2026-11-02

Committed first as requested: `7b573d2`. Public stage polling now serializes,
validates, cancels on cleanup, pauses hidden views and backs off failures while
retaining confirmed state. Added root/global error boundaries with Next.js retry,
stage/outbox CI checks, marketing-only hero CSS and clearer demo workspace copy.
Continued with serialized marshal status polling and a synthetic browser test.
Production build, typecheck, four stage unit tests and eight outbox tests passed.
Browser malformed-response/recovery checks passed at 390px and 1365px without
page exceptions. Marshal interaction, deliberate boundary exceptions and full
role workflows were not exercised. Audit task remains in progress; next work is
broader browser CI, parser isolation, measured performance/accessibility and the
remaining audit findings. Event/provider/privacy/production decisions stay gated.

## Overall audit and professional-readiness plan — 2026-11-02

Added `docs/overall-audit-2026-11-02.md` at the user's request. It distinguishes
implemented local slices, recorded verification, unavailable workflows and live
release gates across the platform. Fresh web typecheck, eight outbox tests and
workspace checks passed. Existing role-demo evidence was reviewed, not rerun;
no full browser/Rust/build/load/accessibility or production verification is claimed.
Source findings include overlapping/unvalidated public-stage polling, the missing
route error boundary, in-process parser limits, CI coverage gaps and targeted
asset/navigation/cache improvements. No application fixes or domain completion
changes were made. Next: fix display/recovery defects, automate critical journey
checks, measure performance and resolve event/provider/privacy release dependencies.

## Strict PayMongo webhook resource parsing — 2026-11-02

PayMongo event parsing now rejects malformed event/resource types, mismatched
payment mode/status, missing payment IDs/amounts/currency, and malformed
`evt_`, `cs_`, `pay_`, or `ref_` identifiers instead of manufacturing defaults.
This does not enable provider settlement or establish live account behavior.
All-feature Rust compilation, formatting and workspace checks passed. Existing
synthetic fixtures were inspected for compatibility; no tests or role workflows
were run.

## Global HQ platform totals — 2026-11-02

Added signed `/v1/hq/overview` with current global-membership verification and
Firestore exact aggregates for root chapter documents and nested event documents.
The HQ overview validates and displays these counts while preserving the bounded
queue sample semantics. The two queries may observe adjacent database states;
they do not establish chapter health, event readiness, affiliation or approved
global publishing. Rust all-feature compile, web typecheck, formatting and
workspace checks passed. No tests or role workflows were run.

## Public chapter directory provenance — 2026-11-02

Removed four hardcoded country rows that read as verified WSB chapter
representations without linked records. The public page now sends visitors to
the official country directory for current listings and retains the WSB-owned
private chapter proposal form. First-party public chapter publishing remains
gated by verified records and an approved publisher. Web typecheck and workspace
checks passed; no tests or role workflows were run.

The homepage's duplicate country selector and now-invalid chapter anchors have
also been removed. Visitors can open WSB's current country directory or submit a
private chapter partnership proposal from that section. Web typecheck and
workspace checks passed. The Visitor role rehearsal now includes both routes and
their proposal/reference boundary. No tests or role workflows were run.

## Shared private-document validation capacity — 2026-11-02

PDF structural parsing and JPEG/PNG decoding now use one per-process worker
permit, preventing their separate peak costs from overlapping. This reduces
concurrent memory pressure but does not bound aggregate decompression for one
PDF, terminate a stuck parser, or provide OS isolation. All-feature Rust compile,
formatting and workspace checks passed. No tests or role workflows were run.

## HQ overview live platform signals — 2026-11-02

Replaced the HQ overview's navigation-only landing page with current
server-authorized API/Firestore/release signals and the bounded notification
queue exception sample. The UI validates response shape and remounts by HQ UID.
Queue counts are labeled as samples; chapter/event totals and approved global
publication data are marked unavailable because there is no authoritative feed.
Web typecheck and workspace checks passed. No tests or role workflows were run;
the signed HQ experience remains for the later role rehearsal. The subsequent
2026-11-02 aggregate endpoint work supersedes the unavailable-total statement.

## Bounded structural PDF validation — 2026-11-02

Private PDF uploads now pass strict structural parsing in a single-slot blocking
worker before malware scanning and submission. Each decompressed stream is
limited to 8 MiB per stream, and the 30-second deadline includes waiting for the
single worker slot. It validates the catalog and root page tree without
materializing all pages. The locked all-feature Rust compile, web typecheck and
formatting check passed after adding `lopdf` 0.46. No tests or role workflows
were run. The deadline cannot stop a stuck worker; parsing is not OS-isolated
and does not bound aggregate document memory or inspect every embedded
resource. Approved evidence policy, scanner operation and production use remain
gated.

## Event assignment notice chapter recovery — 2026-11-02

Assignment-granted notices now carry chapter and event references into the
event-duty selector. The chapter chooser preserves that validated console
destination when staff selects the assigned chapter, so a notice can recover
from a different saved chapter. Event access and each duty remain server
authorized. The handoff accepts only one chapter/event pair and rejects extra or
duplicate query values. Web typecheck, Rust all-feature compile, formatting,
whitespace and workspace checks passed. No role workflow was run. Cross-chapter
browser recovery and revoked-assignment behavior remain for the deferred role
rehearsal.

## Account discovery and notification recovery — 2026-11-01

The synthetic local suite passed unsigned account-discovery denial and paged
discovery of a manager's active chapter memberships. After an API restart, a
guardian's previously read notification remained read. Notification pagination,
browser interaction and emulator recreation are not covered by these checks.

## Account and notification routing — 2026-11-01

The durable gate now routes account chapter discovery and notification list/read
methods to their existing handlers. Demo-wsb integration passed a guardian
notice delivery, recipient isolation and repeated mark-read check. Account
chapter discovery, notification pagination and restart recovery were not tested
in this addition. The API rebuilt and the local integration suite passed.

## DJ export workspace changes — 2026-11-01

The audio desk now aborts an in-flight export when the selected account, chapter
or event changes, clears messages for the new scope and prevents late results
from reporting success there. The stream receives the abort signal. Web
typecheck passed; account-switch races and partial-file browser behavior remain
to be tested interactively.

## DJ export interrupted-download message — 2026-11-01

The audio desk now explains an interrupted or rejected archive stream and asks
the operator to create a new export instead of showing an opaque browser error.
The interface still reports success only after stream completion. Web typecheck
passed; browser handling of partial saved files and role switching remains
unverified.

## DJ export changed-object check — 2026-11-01

The local synthetic music test now replaces the reviewed emulator object with
same-length different bytes while preserving its inspection record. The export
starts with HTTP 200 but the stream fails before producing a complete ZIP; the
test passed by rejecting the incomplete archive. This is not a preflight HTTP
error and browser download behavior, scanner outage and production remain open.

## DJ export inspection mismatch — 2026-11-01

The synthetic music workflow test passed an added negative case: changing the
stored inspection digest causes DJ export to return 409 before streaming. The
test restores the inspection fixture afterward. This verifies metadata mismatch,
not changed object bytes during streaming, scanner outage or browser recovery.

## Synthetic audio DJ archive — 2026-11-01

The local music integration test now uploads and reviews synthetic WAV bytes,
uses an isolated synthetic approval and stage lineup fixture, downloads the DJ
ZIP, checks its manifest and compares the archived track bytes to the original.
The test passed and removes its temporary fixture. Approval was injected for the
test and does not establish real eligibility, audio policy or browser download.

## DJ export omission manifest — 2026-11-01

The demo-wsb integration suite now reads the generated ZIP central directory
and checks `manifest.csv` for the synthetic stage, lineup order, division,
entry and `no_submission` omission. The suite passed. Export containing real
synthetic audio bytes, integrity failures and browser download remain unverified.

## Local DJ omission archive — 2026-11-01

The synthetic integration suite now reaches a successful local DJ export with a
stage lineup containing an entry with no submitted music. The response reports
zero tracks and begins with a ZIP header. The test does not inspect the archive
contents or verify a successful audio track export; both remain outstanding.

## Local DJ export routing — 2026-11-01

The durable gate now allows the existing DJ export GET route only in the
local-testing build. Synthetic integration checks passed unsigned, wrong-role
and cross-chapter denial and a director's empty-lineup conflict. A successful
audio ZIP and production export remain unverified; the route remains disabled
outside local testing.

## Audit cursor tie and insertion checks — 2026-11-01

The local integration suite passed explicit same-timestamp pagination across
three synthetic audit records, invalid-cursor rejection, and continuation after
a newer record was inserted between page requests. This is not a consistent
snapshot or complete concurrency/load test. Missing timestamp migration and
production index validation remain open.

## Audit query pagination — 2026-11-01

Replaced the unsupported ordered list page token with an ordered query cursor
using timestamp and document reference as a deterministic tie-breaker. The
demo-wsb integration suite now passes auditor pagination, role revocation and
chapter isolation. Records missing `recorded_at` remain excluded and require
migration; concurrent inserts and production indexes are not verified here.
Earlier audit pagination failure is superseded for the tested local scenario.

## Audit pagination failure — 2026-11-01

The new auditor-role integration check found that the first audit page succeeds
but the next page returns 503. The demo Firestore emulator reports that
`ListDocuments` with both a page token and `orderBy` is unsupported. The added
pagination assertion currently makes `tools/local.ps1 test` fail. Replace this
with a stable ordered query cursor and verify equal timestamps, chapter scope,
legacy records and concurrent writes before claiming pagination works. No
production Firestore behavior was inferred from the emulator limitation.

## Chapter audit routing — 2026-11-01

The durable API gate now routes chapter audit reads to the existing authorized
repository. The demo-wsb integration suite passed director read, manager and
cross-chapter denial, and chapter scope checks. The API rebuilt successfully.
Auditor-role and pagination behavior were not exercised in this addition.

## Event setup restart recovery — 2026-11-01

The local integration and API-restart recovery checks passed for a synthetic
registration window and division policy draft. Identical commands returned
their saved receipts after restart, and draft history remained readable. This
does not approve policy or verify full emulator recreation.

## Division policy and invitation listing checks — 2026-11-01

The demo-wsb integration suite passed policy draft create, replay, stale
revision, version history and unauthorized/cross-chapter read checks. It also
checked that a director can list an issued staff invitation and a manager cannot.
These are draft records and do not approve or enforce competition policy.

## Event setup routing — 2026-11-01

The durable runtime gate now routes event draft updates, registration windows,
division-policy draft operations, managed-event lists and invitation lists to
their existing handlers. Synthetic integration passed draft edit and window
authorization, replay and stale revisions, plus managed-event listing. The
division-policy and invitation list routes were not exercised by these added
checks. The API rebuilt successfully; activation and approved policies remain open.

## Event draft creation routing — 2026-11-01

The Firestore migration gate now lets chapter event creation reach its existing
durable handler. The synthetic integration suite passed director creation,
manager and cross-chapter denial, identical retry, changed-input and duplicate
identifier conflicts, and confirmed the draft has no public result. API rebuild
passed. Event activation and complete event configuration remain unfinished.

## Public event results list — 2026-11-01

The demo-wsb integration suite passed added checks for an empty event results
list before publication, the published snapshot appearing afterward, and denial
by both public endpoints when a synthetic snapshot's chapter scope is corrupted.
The fixture restores the original projection after corruption. This does not
establish correction or republishing policy.

## Public results boundary — 2026-11-01

The demo-wsb integration suite passed added checks that an unpublished
division's anonymous snapshot returns 404 and that published result rows expose
only the aggregate projection fields, without individual judge scorecards.
This does not verify publication correction policy or every public endpoint.

## Staff access command restart recovery — 2026-11-01

Following the synthetic integration suite and an API restart, the recovery
check replayed staff membership revocation and event-assignment removal and
received their original receipts. It also observed the inactive membership.
The Firebase emulators remained running; this is not full-stack recreation.

## Staff membership revocation — 2026-11-01

The demo-wsb integration suite passed new checks for director-only membership
revocation, identical replay, changed-input conflict and immediate denial of
the revoked account's chapter session. The fresh recovery process also observed
the inactive membership; this run did not restart the API or emulators.

## Event staff assignment checks — 2026-11-01

The demo-wsb integration suite passed new event assignment checks for director
authority, cross-chapter and manager denial, creation, identical retry,
changed-payload and stale-revision conflicts, and removal. This does not cover
browser interaction, assignment recovery after restart or all staff roles.

## Staff invitation API restart recovery — 2026-11-01

After the synthetic integration suite and a local API restart, the recovery
check confirmed an accepted staff membership remains active and an identical
invitation revocation retry returns its saved receipt. No invitation code was
stored in the recovery fixture. This does not verify acceptance replay across
restart, browser behavior or emulator recreation.

## Staff invitation revocation checks — 2026-11-01

The demo-wsb integration suite passed new checks for director-only pending
invitation revocation, identical retry, changed-payload conflict and denial of
acceptance after revocation. Browser interaction, restart recovery and production
identity-provider behavior are not covered by these additions.

## Staff invitation routing and acceptance — 2026-11-01

The Firestore migration gate blocked implemented staff invitation POST routes
with 501 before their authorization handlers. It now permits only the specific
create, revoke and accept routes through to their existing server checks. The
local integration suite passed create/replay, changed-payload conflict, wrong
director/account denial and intended-account acceptance/replay in a synthetic
chapter. Revocation, browser behavior and production identity checks remain
unverified by this run. Rust formatting and local API rebuild passed.

## Chapter staff directory isolation — 2026-11-01

The demo-wsb integration suite passed with additional staff-directory checks:
the current director can list chapter staff, while an unsigned caller, crew
manager and director from another chapter are denied. Returned synthetic records
were restricted to the selected chapter and excluded participant roles. Staff
invitation and mutation workflows were not exercised by these added checks.

## Guardian withdrawal recovery — 2026-11-01

The synthetic integration and API-restart recovery checks passed with a
withdrawn guardian request. Both participants recovered its withdrawn state,
and the original withdrawal operation replayed the same receipt. This local
request is not verified guardian authority or event consent, and this check
does not cover browser recovery or emulator recreation.

## Battle ballot recovery — 2026-11-01

The synthetic local suite now checks the judge's own ballot before and after
voting, distinguishes another judge's empty ballot and denies a manager. After
an API restart, the recovery check verified the saved ballot and identical vote
replay. The local integration and recovery commands passed. This is online API
restart evidence, not offline battle or full emulator recreation evidence.

## Battle authorization checks — 2026-11-01

The synthetic local integration suite passed with added checks that a different
chapter cannot read or vote on a match, and an expired judge membership cannot
read, list or replay a ballot. Existing checks include duplicate ballots and
revoked event assignments. This does not verify offline battles, bracket
advancement policy or a complete judge role rehearsal.

## Scoring and publication repository checks — 2026-11-01

The demo-wsb repository tests for competing writers, rollback, division lock
races and fresh-process persisted-state reads passed. The separate unresolved-tie
test also passed: it does not write the unresolved tie into the public projection.
These synthetic repository tests do not establish official tie policy, browser
offline recovery or full emulator recreation.

## Online check-in repository test — 2026-11-01

The explicitly enabled `online_checkin_is_scoped_idempotent_and_recovers` Rust
repository test passed against the demo-wsb emulator, using generated chapter
and event identifiers. This is an online repository test; signed passes,
offline check-in, full container recreation and production policy remain open.

## Reopened dependency tracking — 2026-11-01

Workspace DAG validation now permits an in-progress task to retain a reopened
unfinished dependency; it still rejects marking that task done until its
dependencies are done. Four workspace tests, DAG and workspace check passed.
The ready list is empty because remaining todo tasks have unfinished dependencies;
existing in-progress work remains available.

## Isolated Firestore rule checks — 2026-11-01

`npm run test:rules` passed in a separate demo-wsb emulator. Its two tests
cover published-only public projections, a cross-chapter membership read, and
denials of direct role promotion and score writes. This is limited rule-level
evidence and does not replace authenticated API or all-role isolation testing.

## Local storage access checks — 2026-11-01

Four demo-wsb Firebase Storage rule tests passed against the running emulators.
They cover private evidence ownership and chapter isolation, active reviewer
access, upload restrictions, and immutable music objects with active intents.
These are synthetic rule checks; they do not prove identity validity, approved
consent policy, full upload recovery or production Firebase configuration.

## Synthetic PayMongo integration checks — 2026-11-01

The local checkout API and signed webhook integration checks passed against
demo-wsb. They exercised reservation, replay, access denial, cancellation,
synthetic settlement and refund reconciliation. These are emulator checks;
they do not establish real PayMongo connectivity, provider configuration or
complete payment recovery across emulator recreation.

## Synthetic music checks and offline retry integrity — 2026-11-01

Local synthetic music workflow and policy integration checks passed, including
upload/replacement, correction, authorization, replay and unchanged readiness.
These do not establish approved audio policy. Offline score queue validation now
checks malformed retry times before honoring backoff, retaining invalid commands
for review without sending them. Eight outbox unit tests and web typecheck passed;
browser offline/reconnection evidence remains outstanding.

## Offline score null receipt handling — 2026-11-01

An empty server score receipt now puts the saved command in conflict for review
instead of treating a null dereference as a transient error and retrying. The
seven outbox unit tests and web typecheck passed. These use an in-memory store
and simulated responses, not a browser offline/reconnection rehearsal.

## Local API restart recovery — 2026-11-01

After the synthetic integration run, restarted the local API and ran
`tools/local.ps1 test-recovery`. Registration, own check-in, locked score
receipt, refunded balance, stage and published projection were recovered from
the running emulator stack. This checks API-process restart only: emulator or
volume recreation, offline reconnection and complete role journeys remain
unverified by this run.

## Synthetic integration check — 2026-11-01

The Docker local integration script passed after correcting its stale expectation:
a dancer who is not a crew member receives 403 when trying to redeem an already
used invitation. The run covers signed role isolation, guardian request/replay,
payment replay/refund, stage progression, judge locking and publication in a
synthetic chapter. Its audio and consent readiness use fixtures; it is not an
all-role rehearsal or proof of production readiness.

## Guardian request receipt verification — 2026-11-01

The participant relationship screen now checks successful create, response and
withdrawal receipts against the current chapter, actor, request, expected revision
and resulting status before reporting success or clearing its same-tab retry.
Withdrawal also checks the owner-scoped redaction projection. A malformed receipt
retains the recovery reference; it does not prove whether the operation committed.
Added malformed-receipt cases to the deferred role rehearsal. Web typecheck and
Rust formatting passed; no browser receipt-injection or role rehearsal was run.
Docker Desktop was started and the local Compose services reached healthy status;
the web sign-in page and API health endpoint both returned HTTP 200. No role
workflow or receipt-injection tests were run.

## Duty event access check — 2026-11-01

Selecting or entering an event now checks current chapter role and event
assignment before enabling event-duty links; input changes invalidate the check.
The local device-sync view remains accessible without this online check. Each
destination rechecks authority. Rust all-feature and no-default compiles, web
typecheck, formatting and diff checks passed. No tests or role workflows ran.

## Event-duty sign-in returns — 2026-11-01

The shared sign-in return validator now retains same-origin event-duty console
paths, matching links already offered by those screens. Destinations still check
role and assignment. Web typecheck and diff checks passed; no tests or role
workflows were run.

## Role-specific duty choices — 2026-11-01

The event-duty selector now shows desks matching the verified chapter role and
explains that destination assignments are checked separately. Web typecheck
and diff checks passed; no tests or role workflows were run.

## Assigned event duty selection — 2026-11-01

The duty selector now loads bounded event pages filtered by current staff
assignment (or director oversight), preserves empty-page continuation and
retains manual reference entry. Destination authorization remains authoritative.
Rust all-feature and no-default compiles, web typecheck, formatting and diff
checks passed. No tests or role workflows were run.

## Staff console navigation — 2026-11-01

The chapter admin event-duty link now opens the connected console selector
instead of the fictional demo judge desk. Web typecheck and diff checks passed;
no tests or role workflows were run.

## Deduction operation receipts — 2026-11-01

The connected deduction form now uses stable operation IDs with transactional,
payload-bound receipts. Exact authorized retries can recover the original
revision after later changes or lock; legacy requests retain their prior retry
behavior. The browser validates the receipt before clearing its retry key and
requires refresh after confirmation. Rust all-feature and no-default compiles,
web typecheck, formatting and diff checks passed. No tests or role workflows
were run.

## Paged deduction save recovery — 2026-11-01

A validated deduction save now updates its loaded row and leaves a visible
receipt notice, including on later pages. Uncertain saves freeze their values
for retry and block competing page/lock actions; a saved-state refresh remains
available with a warning. Web typecheck and diff checks passed. No tests or role
workflows were run.

## Division-scoped review query — 2026-11-01

Head-judge entry pages now query only the selected division, validate document
identity and preserve a continuation when no approved rows appear. Rust
all-feature compile, web typecheck, formatting and diff checks passed. No tests,
index deployment or role workflows were run; Firestore query behavior remains open.

## Bounded head-judge review pages — 2026-11-01

Division review no longer scans every event entry or fails at 500 event entries.
It returns bounded filtered pages with continuation and separate server totals;
the UI loads further pages and keeps lock authority on the server. Rust
all-feature and no-default compiles, web typecheck, formatting and diff checks
passed. No tests or role workflows were run; large-event, empty-page and lock
races remain for rehearsal.

## Head-judge completeness and receipt checks — 2026-11-01

Head-judge views no longer treat an empty panel as complete. Division responses
and deduction revision receipts are validated before enabling or confirming
actions, and denied access clears the affected view. Web typecheck and diff
checks passed. No tests or role workflows were run.

## Judge battle desk pagination — 2026-11-01

The judge battle desk now loads continuation pages, validates event-scoped
responses, resets on account/chapter changes and clears on access denial. It
labels loaded-only counts and manual refresh without claiming a live bracket.
Web typecheck and diff checks passed; no tests or role workflows were run.

## Battle vote workspace scope — 2026-11-01

The ballot workspace now remounts on account, chapter, event, match or session
loading changes so prior judge data clears during scope switches. Web typecheck
and diff checks passed; no tests or role workflows were run.

## Battle ballot reload recovery — 2026-11-01

Added a current-judge ballot read with chapter, event and panel checks, and
connected it to the vote screen before voting controls appear. A saved corner
can be recognized after reload without exposing peer ballots. Rust all-feature
and no-default compiles, web typecheck, formatting and diff checks passed. No
tests or role workflows were run.

## Battle ballot acknowledgement validation — 2026-11-01

The battle vote screen validates match and tally responses, prevents voting
without an active loaded match, and preserves the selected corner for retry
after an uncertain result. Definitive denials require refresh. Reload recovery
remains unfinished. Web typecheck and diff checks passed; no tests or role
workflows were run.

## Connected account onboarding — 2026-11-01

Removed the onboarding page’s simulated dancer-profile success and connected
account display-name saving to Firebase. The sign-in return allowlist includes
onboarding, and the screen states the separate verification and chapter gates.
Additional profile fields remain unfinished. Web typecheck and diff checks
passed; no tests or role workflows were run.

## Crew invitation handoff lifecycle — 2026-11-01

Confirmed acceptance and recovery clear the tab-scoped token; uncertain outcomes
retain it. Repeated legacy initialization reuses the matching handoff. Web
typecheck and diff checks passed; runtime and role workflows remain unverified.

## Fragment-based crew invitation transport — 2026-11-01

New crew invitation links place the bearer token in a fragment. The landing page
stores it under a random tab-scoped handle and removes it from the address before
sign-in; older path links migrate after opening. A different tab requires reopening
the original link. Web typecheck passed; runtime and role workflows remain
unverified. Legacy first-request log redaction remains a release gate.

## Invitation referrer protection — 2026-11-01

Invitation and identity pages now request no referrer and no shared caching.
The invitation token still appears in its path and authentication return query;
log redaction and safer token transport remain open. Web typecheck and diff checks
passed; no tests or role workflows were run, and runtime headers remain unverified.

## Current crew on invitation replay — 2026-11-01

An exact invitation acceptance retry now validates its saved receipt and returns
the current crew after current membership checks, avoiding stale roster
disclosure. Rust all-feature compile, formatting and diff checks passed; no tests
or role workflows were run.

## Invitation acceptance reload recovery — 2026-11-01

Added a signed recovery action for an existing invitation acceptance. It checks
the accepting account, current crew membership and issuer authority, then
returns the current crew. Redemption/recovery also enforce issuer expiry. Rust
all-feature and no-default compiles, web typecheck, formatting and diff checks
passed. No tests or role workflows were run.

## Invitation acceptance retry payload — 2026-11-01

An uncertain dancer invitation acceptance now preserves the submitted values
for an exact retry in the mounted form; definitive denials give recovery
guidance. Reload recovery remains unfinished. Web typecheck and diff checks
passed; no tests or role workflows were run.

## Invitation history recovery states — 2026-11-01

The browser now validates ordered, advancing invitation history pages and
continuations, distinguishes empty results from failures, and guides refresh
after a revocation conflict. Web typecheck and diff checks passed; no tests or
role workflows were run.

## Crew-scoped invitation history query — 2026-11-01

Invitation history now queries the current crew directly and pages by the
hashed Firestore document reference, retaining legacy records without scanning
other crews. Rust all-feature compile, web typecheck, formatting and diff checks
passed. No database tests, index deployment or role workflows were run.

## Crew invitation access recovery — 2026-11-01

Authorization failures in the crew workspace now clear loaded crew data and
the displayed invitation; history revocation also clears its records on denial.
Inspected Firestore 0.58 transaction source: transaction callback reads use the
transaction consistency selector. Web typecheck and diff checks passed; no tests
or role workflows were run.

## Historical crew invitation management — 2026-11-01

Crew managers can page invitation history and revoke unused records after reload.
The API filters bounded chapter pages to the current crew and returns a hashed
reference, dates and status without bearer links or dancer identities. Rust
all-feature/no-default compiles, web typecheck, formatting and diff checks passed.
No tests or role workflows were run; authorization and races remain unverified.

## Revoke displayed crew invitation — 2026-11-01

Added a crew-manager action to revoke the invitation currently
displayed as link/QR. The Firestore command and redemption share the invitation
record, with payload-bound replay and redacted audit. Historical invitation
management remains unimplemented. Rust all-feature and no-default compiles, web
typecheck, formatting and diff checks passed. No tests or role workflows were run.

## Crew invitation display scope — 2026-11-01

The crew workspace now resets its one-use link and QR when changing crew,
account, chapter or create mode, and displays the saved expiry time after
validating it. Web typecheck and diff checks passed; no tests or role workflows
were run.

## Crew invitation QR — 2026-11-01

The crew manager workspace now renders the existing one-use invitation link as
a QR code locally in the browser. The code shares the link’s expiry and bearer
capability. Web typecheck and diff checks passed; no tests or role workflows were run. The
package install reported four high-severity dependency audit findings. npm audit
traces them to grpc-js 1.9.16 through Firebase Firestore and rules-unit-testing;
the suggested fix is a major Firebase downgrade. QRCode React is not listed.
No dependency override or downgrade has been applied; remediation remains open.

## Stop notification acknowledgement batch — 2026-11-01

The inbox offers a stop control during batch acknowledgement and explains that
an in-flight update can still finish. Refresh reconciles the current count before
retry. Web typecheck and diff checks passed; no tests or role workflows were run.

## Bounded notification acknowledgements — 2026-11-01

The inbox now offers a sequential action for up to 30 loaded unread notices,
validates each server receipt/count, and stops on failure or lost access. Web
typecheck and diff checks passed; no tests or role workflows were run.

## Audit continuation cycle recovery — 2026-11-01

The audit explorer now tracks consumed continuation cursors across both single
pages and scan batches, rejects cycles, and resets tracking on refresh or scope
change. Failed page requests remain retryable. Web typecheck and diff checks
passed; no tests or role workflows were run.

## Audit archive page scan — 2026-11-01

The audit explorer can scan up to ten more authorized pages per action for
loaded-record filters, including normalized legacy records. It preserves
continuation and rejects repeated cursors within a batch. This does not create
an indexed query or snapshot export. Web typecheck and diff checks passed; no
tests or role workflows were run.

## Audit access revocation recovery — 2026-11-01

Audit refresh or pagination now clears loaded rows and the cursor on 401/403,
including the loaded-record export. Other errors preserve loaded data. Web
typecheck and diff checks passed; no tests or role workflows were run.

## Audit explorer actor and resource filters — 2026-11-01

The audit explorer can filter loaded records by actor and resource ID in
addition to action, and exports the filtered loaded set. Full archive search
remains unavailable. Web typecheck and diff checks passed; no tests or role
workflows were run.

## Stage lineup history scope — 2026-11-01

History pages now reject snapshot records with mismatched chapter, event or stage
fields, and lineup forms/history remount on event scope changes. Locked Rust
all-feature compile, web typecheck, formatting and diff checks passed; no tests
or role workflows were run.

## Stage assignment form scope recovery — 2026-11-01

The form now resets on chapter/event changes as well as account/stage changes,
and a failed marshal-directory refresh clears its old list. Repaired an invalid
UTF-8 loading label. Web typecheck and diff checks passed; role workflows
remain deferred.

## Stage marshal picker — 2026-11-01

Added a chapter-director, event-scoped paged lookup of active assigned marshals
and connected it to the stage access form. The save transaction remains the
authority and manual ID entry remains available. Locked Rust all-feature and no-default compile checks, web typecheck, formatting
and diff checks passed; no role workflows or tests were run. Authorization,
pagination and stale eligibility behavior remain for the later rehearsal.

## Stage assignment change notices — 2026-11-01

Director stage-access revisions now atomically enqueue a generic durable inbox
notice for each added or removed marshal, excluding the actor. Notices share a
stage/revision key for replay deduplication, and delivery rechecks active,
unexpired membership. Updated the stage guide, API/native manuals, role rehearsal
and task acceptance. Locked all-feature Rust compile, web TypeScript check, formatting, task-manifest
parse, retrieval indexing and diff checks passed. No tests or role workflows were
run; the stage assignment notice behavior remains for later rehearsal.

## Stage-hold notices for other assigned marshals — 2026-11-01

Stage hold set/release commands now atomically create a generic, revision-keyed
in-app notice for other marshal accounts assigned to that stage. Current active,
unexpired chapter membership is rechecked by the notification writer, and an
exact command replay returns the saved receipt without duplicate notices. The
marshal desk copy and role rehearsal now describe this delivery accurately; no
external push or audio/lighting delivery is claimed. Rust all-feature compile,
web TypeScript, formatting and diff checks passed. No tests, emulator or role
workflows were run; multi-instance and authorization scenarios remain deferred.

## Marshal candidate cursor URL correction — 2026-11-01

The candidate lookup now passes a query-free endpoint path to `connectedPage`,
which appends its cursor as the sole query string. The route uses the API's
bounded default page size of 30. This fixes the load-more request shape without
changing candidate scope or eligibility. Web typecheck and diff checks passed;
no API, emulator, or role workflow was run.

## Bounded raster parsing for private verification uploads — 2026-11-01

The private upload pipeline now decodes declared JPEG and PNG files before
scanning, using image 0.25.10 in a blocking worker. A process-wide semaphore
limits concurrent decode to one; width/height are capped at 4096, total pixels
at 16,777,216, and the request fails closed after 30 seconds. The decoder
allocation ceiling is best-effort, so docs explicitly retain that limit; PDF
still has signature/header/EOF checks but no structural parser. All-feature Rust
compile, formatting and diff checks passed. No tests, emulator or role workflows
were run; malformed-image behavior, scanner operations, PDF parsing and policy
gates remain for later implementation/rehearsal.

## Marshal check-in candidate lookup — 2026-11-01

Added a bounded chapter/event-scoped candidate endpoint for currently assigned
marshals and chapter directors. It returns only approved, currently ready
entries and roster names/account IDs; the general entry endpoint was not widened.
The marshal desk can select a candidate or retain manual ID entry when lookup is
unavailable. The check-in transaction still rechecks assignment, roster,
approval and readiness, and the UI tells staff to verify identity separately.
Rust all-feature compile, web TypeScript check, formatting and diff checks passed.
No tests, emulator or role workflows were run; online authorization and stale
candidate conflict scenarios remain for the deferred role rehearsal.

## Server-side notification destination validation — 2026-11-01

The durable inbox writer now bounds notification kind/title/message fields and
accepts only bounded same-origin relative destinations. The paged read applies
the same destination and text checks, so malformed saved links fail closed
before reaching clients. This aligns server storage with the existing browser
validation. `cargo fmt --all --check`, a Rust compile check, task metadata parse,
retrieval indexing and diff checks passed. No tests, emulator or role workflows
were run; worker recovery and role-level notification isolation remain open.

## PayMongo response validation and refund retry key — 2026-11-01

The v2 checkout adapter now requires the provider's returned reference, active
status and nonempty line items, and derives amount/currency from those returned
items instead of substituting requested values when response fields are absent.
The v1 refund adapter now requires a stable WSB operation ID and PHP currency,
validates bounded prefixed provider IDs, and sends a deterministic
`Idempotency-Key` on refund creation. Official PayMongo v2 resource and
idempotency docs record the response/header basis. Rust no-default compile and
`cargo fmt --all --check` plus diff check passed. No account calls, tests or real
money movement were run; controlled provider validation and production enablement
remain gated.

## Offline score outbox integrity checks — 2026-11-01

Before sending queued IndexedDB data, the score outbox now validates owner/key
binding, command version and identity, revision bounds, score ranges, deduction
shape and retry metadata. Corrupt local commands are kept as rejected for review
without reaching the API. A receipt is acknowledged only when operation, judge,
event, division, crew, next revision, finite 0–100 net score, timestamp and
bounded receipt ID all match. Web TypeScript typecheck and diff check passed. No
tests, emulator or role rehearsal were run.

## PayMongo uncertain-outcome recovery copy — 2026-11-01

The payer checkout screen now distinguishes checkout conflicts from uncertain
provider/gateway outcomes. It tells payers not to start another payment while a
reservation needs reconciliation, and preserves the existing operation ID for
same-amount retries after ambiguous provider results. Added the case to the later
payment rehearsal. Web TypeScript typecheck and diff check passed; no provider
call, test or role workflow was run.

## Live chapter-session scope invalidation — 2026-11-01

`useWorkspaceSession` now suppresses a cached session whenever its UID or chapter
does not match the current account and selected chapter. `selectChapterFor`
announces same-tab changes; the hook also watches cross-tab storage events and
rechecks membership with the server. Updated the membership contract and
account-holder rehearsal. Web TypeScript check and diff check passed. No tests or
role workflows were run.

## Trusted-device assigned-lineup cache — 2026-11-01

Offline judging can now save the current judge's assigned entry IDs and
crew/division labels in the existing owner/chapter/event-keyed IndexedDB store
after an explicit device opt-in, then restore that lookup list without a
network. Unchecking removes the current event's cached lineup. Cached entries
are labeled as lookup only and never authorize submission; the scorecard can
restore an existing local draft offline, while new online state and score
acceptance still require the current server session/receipt. Updated user and
system manuals plus judge rehearsal. Web TypeScript check and diff check passed;
no tests, emulator or role workflow were run.

## Assigned-lineup cache opt-in lifecycle — 2026-11-01

The lineup-cache opt-in now resets on account or chapter changes. Unchecking it
deletes all cached assignment lists for that UID through one IndexedDB
transaction, while leaving saved score commands intact. Updated the user manual
to clarify the opt-in lifecycle. Web TypeScript check passed; no tests, emulator
or role workflow were run.

## Assigned-lineup cache key validation — 2026-11-01

Cached lineup keys now encode the owner/chapter/event tuple without delimiter
ambiguity. Reads verify that stored metadata matches the requested scope and
that every cached entry has the required identifiers before displaying it.
Malformed or mismatched local records are ignored. Web TypeScript and diff
checks passed; no tests or role workflow were run.

## Checkout response and redirect validation — 2026-11-01

The payer UI now requires a complete response whose amount and currency match
the current reservation quote, and classifies only the exact local emulator URL
as synthetic. Provider redirects require the documented checkout hostname,
safe session URL path shape and fragment. The Rust provider adapter now parses
the URL and validates HTTPS, exact host, path characters and fragment rather
than prefix-matching a string. Invalid responses preserve the same operation ID
and show a recovery error instead of a synthetic-success message. Web typecheck,
Rust no-default compile, formatting and diff checks passed; no provider call or
workflow test was run.

## Checkout action account/chapter isolation — 2026-11-01

Manual-reference and hosted-checkout actions now capture the active
account/chapter/event/entry generation. A scope change clears the new page's
busy/error state, and late responses/finalizers cannot update it or redirect the
new payer to an earlier account's checkout. The action also checks the current
Firebase UID and selected chapter immediately before applying the response.
Added this race to the payment rehearsal. Web TypeScript and diff checks passed;
no provider call, test or role workflow was run.

## Assigned offline scorecard picker — 2026-11-01

The offline judging entry screen now loads the signed-in judge's assigned lineup
from the chapter/event-scoped API, binds the read to the current UID, and offers
direct scorecard opening with cursor pagination. The server scorecard endpoint
still rechecks assignment before returning score state; cached lineup data is
not authority to submit. Web TypeScript typecheck passed. No test, emulator or
role workflow was run. Offline reconnect/conflict and the full role rehearsal
remain unverified.

## Verification workspace scope cleanup — 2026-11-01

The private verification workspace now clears loaded cases, selected/resume files,
review notes, and any open document Blob URL when its signed-in UID, chapter, or
workspace mode changes. This reduces cross-account residue in a still-mounted
page; server membership and Storage rules remain authoritative. Web TypeScript
typecheck passed. No tests, emulator, scanner, or role workflow was run. Evidence
retention/deletion, production scanner operations, approved decision policy,
readiness effects, guardian verification and consent signing remain gated; full
role rehearsal remains deferred until implementation is complete.

## Verification workspace async scope safety — 2026-11-01

Follow-up: changing account, chapter or workspace mode now cancels the active
Firebase resumable upload, resets upload progress and busy state, and ignores
late progress, errors and finalizers from superseded operations. This prevents an
old request from clearing the new workspace's busy indicator or continuing an
evidence transfer after a scope change. Web TypeScript typecheck passed. No
workflow tests, emulator or role rehearsal were run.

## Judge scorecard scope isolation — 2026-11-01

The connected scorecard now clears cached score, queue, context and trusted-device
confirmation when its account, event or entry changes. Background sync, queue
refresh, correction reads, save responses and busy-state cleanup are guarded by
the active scope generation. Extended the judge rehearsal case to verify account
switch during pending sync/save. Web TypeScript typecheck and diff check passed.
No tests, emulator or role workflow were run; offline recovery and scoring rules
remain pending verification and approved policy.

## Guardian request action lifecycle — 2026-11-01

Guardian request actions now release their busy state before reloading the list,
and only clear busy state from the same request generation. This keeps the
action lifecycle correct without weakening the saved operation-ID retry or
account-scoped recovery behavior. Web TypeScript check and diff check passed; no
tests, emulator or role rehearsal were run. Guardian relationship verification
and consent authority remain unimplemented pending approved policy/source.

## Offline saved-score queue account isolation — 2026-11-01

The saved-score outbox now clears its records, trusted-device confirmation,
errors and busy state when UID or event scope changes. Queue refresh, sync and
accepted-copy removal guard late state updates by scope generation. Trust checks
are reset synchronously so a new account cannot inherit an earlier account's
device confirmation. Web TypeScript check and diff check passed. No workflow test,
emulator or role rehearsal was run.

## Scorecard active chapter authority — 2026-11-01

The connected scorecard now selects its chapter from the verified workspace
session rather than directly reading a chapter claim, binds scorecard/state reads
to the expected UID, and includes chapter in its local reset scope. Correction
reads require the same active chapter and UID. The judging role rehearsal now
covers switching chapter during pending sync/save. Web TypeScript check and diff
check passed; no tests, emulator or role workflow were run.

## Workspace chapter-list account isolation — 2026-11-01

The chapter membership picker binds each paginated request to the initiating
UID, discards late pages after account/session changes, resets its list while
the account changes, and de-duplicates chapter rows across pages. The membership
API helper checks the active Firebase UID before and after the request. Updated
the future account-holder rehearsal for multi-chapter selection and switching
accounts during loading. Web TypeScript check and diff check passed; no role
workflow was run.

## Head-judge lock boundary follow-up — 2026-11-01

The live head-judge division review retains server-backed completeness counters,
revisioned technical-deduction editing, and server-authorized locking. Tightened
the durable lock transaction to reject expired judge-panel memberships, and made
the browser lock action require explicit confirmation, validate the event and
division in the returned receipt, and reload saved state after ambiguous outcomes
or server conflicts. The UI states that no official discrepancy threshold is
configured and does not infer outliers, ties, placement or qualification. Updated
the role rehearsal, open question, decision record and judging task evidence.
`cargo fmt --all --check`, Firestore, local-testing and no-default Rust compile
checks, web TypeScript typecheck, task-manifest parse and `git diff --check` pass.
No tests, emulator or role workflow were run. The user's approved waiver and guardian-verification sources
are still pending, and full feature work and role-by-role rehearsal remain open.

## Account profile email-verification handoff — 2026-11-01

Connected the profile's unverified-email state to the existing Firebase
verification request and action-code flow. The verification page now refreshes
the current Firebase account after the user opens a link and shows whether email
verification succeeded; this remains separate from chapter access. The profile
still treats display name as an account label and does not conflate it with legal
or roster identity. Updated the user manual and account-workflow evidence. Web
TypeScript typecheck, task-manifest parse, retrieval rebuild and diff check passed.
No workflow tests or role rehearsal were run; account workflows and full role
rehearsal remain open.

## Account-holder rehearsal sequence — 2026-11-01

Updated the role runbook to cover a newly created synthetic, unverified account:
emulator-only verification action, refreshed status, sign-in recovery, profile
display-name update, security review, and support-thread reload. The expected
denial is explicit: email verification does not grant chapter membership. Added
the existing identity browser scenario to account-workflow evidence. This is
rehearsal preparation only; no emulator or browser workflow was run.

## Preserve registration intent through account verification — 2026-11-01

Added a shared same-origin allowlist for invitation, registration and entry
destinations. Sign-in/signup links retain only those paths; unverified sign-in
returns to verification, and the allowed destination passes through Firebase
email action settings, the demo-only mail route and the verification/action
screens. External or unsupported targets are discarded. Updated the manual,
role rehearsal cases, task evidence, native workflow doc and decision record.
Web TypeScript passed. No workflow tests or emulator email delivery were run;
the flow remains queued for the later all-role rehearsal.

## Verified account email change — 2026-11-01

Added `/change-email` using Firebase `verifyBeforeUpdateEmail`: password
accounts reauthenticate before the request, and the current address stays active
until the new-address action code is applied. Extended the existing action page
for `verifyAndChangeEmail`, linked the form from profile and verification pages,
and added local action-code email delivery only for demo-wsb Auth emulator mode.
The local mail routes reject non-demo/non-emulator use. Added wrong-password,
stale-login and already-in-use recovery copy; expired or used links now offer the
matching retry route. Manual guidance and rehearsal steps include duplicate and
stale-action denial cases.
Verification mail now says email confirmation does not grant chapter access; the
email-change template names the requested change and preserves the old-address
boundary. Web TypeScript, task-manifest parsing, retrieval rebuild and diff
checks passed. No email was sent, emulator was started, or workflow test was run.

## Public marketing provenance cleanup — 2026-11-01

Replaced unsupported WSB history and scale claims on About with a link to WSB's
current community source; corrected the launch city to Melbourne and removed
invented judge-credential, scoring-rubric and stadium-production claims.
Replaced hard-coded event scoring, penalties and eligibility on event rules pages
with an explicit note that linked WSB PDFs are source documents, not an
event-attached approved policy version. Public crew and chapter pages no longer
show fictional roster names, honors, contact details, affiliations or counts.
Added source provenance and open decisions for public chapter/crew/rules content.
Web TypeScript typecheck, task-manifest parse and stale-claim scan passed; no
workflow tests or database activity were run.

## Public timetable and livestream claims removed — 2026-11-01

Replaced the fabricated schedule timetable, stage metrics, running order, video
stream telemetry, audience counts and browser-only cheer action with explicit
unavailable states and links to the factual director-published stage view and
published results. Private lineup drafts remain private. Added open decisions for
schedule publication/time-zone/revision authority and stream rights, moderation
and audience interaction. Web TypeScript, seed syntax, task-manifest parsing and
source scan passed. No workflow tests or database activity were run. Timetable
publication and video delivery remain unfinished features.

## Public timetable and livestream claims removed — 2026-11-01

Replaced the fabricated schedule timetable, stage metrics, running order, video
stream telemetry, audience counts and browser-only cheer action with explicit
unavailable states and links to the factual director-published stage view and
published results. Private lineup drafts remain private. Added open decisions for
schedule publication/time-zone/revision authority and stream rights, moderation
and audience interaction. Web typecheck and formatting remain queued below; no
workflow tests or database activity were run. Timetable publication and video
delivery remain unfinished features.

## Director-controlled public stage projection — 2026-11-01

Added reasoned publish/unpublish for one active stage per event to the existing
director stage-configuration transaction. The public `/v1/events/{event}/live`
projection validates the reserved event-to-chapter mapping and returns only
event/chapter names, current crew/division labels, held state and latest stage
position time; it excludes dancer identities, entry IDs, roster, scores, payment
data and draft lineup. The arena and holding screens now poll factual state and
show connection loss honestly; the bracket, sponsor ticker and LED hardware UI
no longer invent match outcomes, sponsor claims or successful hardware pushes.
Added deferred director rehearsal cases and the remaining publicity/content-rights
and production-delivery questions. Web TypeScript typecheck and Firestore-feature
Rust compile check passed; no tests or role workflows were run. Event activation,
approved rules, offline passes, production display delivery and full role rehearsal
remain open.

The additive `demo-wsb` seed migration now creates the global directory mapping
for the existing synthetic rehearsal event only after verifying its chapter and
does not overwrite a conflicting mapping. Fresh fixtures include the mapping.
Rust all-target compile, formatting, web typecheck, seed syntax, task-manifest
parse and diff checks passed; no emulator or database was started or modified.

## Participant event-day stage call sheet — 2026-11-01

Replaced the stale event-day claim that personal stage calls were unconnected
with a participant call sheet backed by the existing stage-status API. Crew
managers and dancers can refresh stage positions for entries on the currently
loaded page; requests run in groups of four, response shapes are checked, and
per-entry failures do not hide successful results. Rust still limits each read
to entries the manager owns or the dancer performs in, within the current
chapter/event. Digital passes remain unavailable and are explicitly distinguished
from stage status and online check-in. Updated `docs/online-checkin.md`, the role
rehearsal cases and `event-ops` evidence. Web TypeScript typecheck, task-manifest
JSON parse and `git diff --check` passed. No browser or role workflow was run;
the participant call sheet remains pending later UI/API rehearsal.

## Native workflow destination audit — 2026-11-01

Static review of `apps/web/src` found no external form action or external WSB
registration, support, payment, consent or administration workflow destination.
Remaining external links are labeled event/rule sources, public WSB pages, video
media and icon attribution/license links. The five remaining unavailable account
routes (consent, advancement, tickets, passes and privacy) are documented with
their activation gates in `docs/native-workflows.md`. PAGE-062 privacy export and
deletion ownership, identity recheck, request status and audit/financial retention
exceptions were added to `docs/open-questions.md`. Prior homepage/help/championship
registration CTA browser evidence remains recorded in the workflow document.
No application behavior or external workflow destination changed. No tests or
role workflows were run. Continue implementing unblocked features; wait for the
user's approved consent and guardian-verification source references before
activating consent signing.

## Durable in-app workflow notifications and unread count — 2026-11-01

Replaced the unavailable Notifications page with a chapter-authorized durable
inbox, bounded pagination, and idempotent read acknowledgement. Notifications
now commit atomically for crew-invitation acceptance, entry review decisions,
finance payment transitions, event staff assignment changes, and local PayMongo
test-mode settlement/refund events. Eligible online check-in also notifies the
rostered dancer when an active chapter membership exists. Revisioned stage
position transitions notify the affected crew manager from holding through
completion. Each write targets the affected manager, original payer, assigned
staff member, or dancer with a deterministic event key. The role rehearsal guide
now includes these deliveries.
The per-member unread total is maintained transactionally and returned apart
from the bounded notification page; marking read updates the count exactly once.
Firestore/local-testing/no-default Rust builds, web typecheck, formatting, task
manifest parsing and diff checks passed. Retrieval was rebuilt. No tests or role
workflows were run. Other event triggers, delivery preferences, and external
push/email delivery remain unfinished.

## Connected participant landing — 2026-11-01

Replaced the signed-in `/app` fictional sample dashboard with the existing
authenticated, chapter-scoped crew workspace and removed its orphaned sample
component. The default participant landing now reads crew records through the
server-authorized API; preview registration remains explicitly separate. Updated
the user manual and account-workflow evidence. Web TypeScript typecheck,
`workflows/tasks.json` parsing and `git diff --check` passed. The retrieval index
was rebuilt. No tests or role workflows were run. Full account/entry
implementation and role-by-role rehearsal remain open.

## Reasoned director stage configuration — 2026-11-01

Stage creation, configuration changes and marshal-access changes now require
an 8–1000 character reason. Rust validates it and writes it transactionally with
the state change, replay receipt and audit correlation ID; proposed marshals
must have current unexpired chapter membership and active event assignment.
The native director forms collect the reason. Position and hold commands remain
reasonless for venue speed. Docs, API reference, rehearsal guide and PAGE-085
decision are updated. Firestore and no-default Rust builds, web typecheck,
formatting, task-manifest parsing and `git diff --check` passed. No tests or
database writes were run; broad audit reason policy and role rehearsal remain
open.

## Reasoned manual finance decisions and connected refund ledger — 2026-11-01

Replaced the synthetic local-only refund form with the finance-scoped payment
ledger view. Manual reconciliation and full manual-payment refund decisions now
require an operation ID and human reason; durable Firestore transitions, receipts
and audits commit atomically, and exact retry returns the saved payment. The
refund action only reverses WSB's ledger after an independent bank/cash reversal;
it never moves money, and provider-linked payments remain excluded. Default and
Firestore `cargo check --all-targets`, web typecheck, formatting, task JSON parse
and diff checks passed. Test targets compiled but no test was executed and no
emulator was written. `workspace.py check` still reports the unfinished
`firestore-repositories` dependency of `persistent-membership`. Approved refund
eligibility, separate approver, provider dispatch/failure recovery and payment
workflow rehearsal remain open.

## Enforce chapter membership expiry in both API adapters — 2026-11-01

Added optional `expires_at` to the shared membership projection and enforce it
in in-memory `authenticate`, direct membership checks and event-assignment
reads. The Firestore session projection carries its stored expiry after the
existing durable membership check. Missing/null expiry remains compatible with
legacy records. Default and `local-testing` Rust all-target checks passed,
including test-target compilation; formatting and diff checks passed. No tests or
emulator writes were run. A later role rehearsal still needs positive access
before expiry and denial after expiry in both adapters.

## UID-bound chapter staff invitations — 2026-11-01

Added director-created, seven-day, one-use invitations for existing account UIDs.
The browser creates a 256-bit code and keeps a pending request in tab storage for
retry; Firestore stores only the code digest, a server-only account lookup, and
the chapter invitation. The invited UID must sign in recently to accept.
Acceptance creates the separately expiring membership and consumes the invite in
one transaction; directors can revoke unused invites with a reason. The recipient
link carries its code in a URL fragment, and WSB does not send email or create
accounts. Rust Firestore/no-default builds and web typecheck passed. No tests or
database writes were run. Invitation-record retention, production Identity
Platform/runtime setup, and the role-by-role rehearsal remain open.

## Human reasons for event configuration writes — 2026-11-01

Chapter directors must now give an 8–1000 character rationale to create an event,
edit its core draft details, change its registration dates, or save a versioned
division-policy draft. Rust validates the reason and records it atomically with
the mutation, replay receipt and stable audit correlation identifier. Updated
the native forms, API contract, event management guide, audit guide and task
evidence. `cargo check --locked -p wsb-api --features firestore`, the no-default
Rust build, and web typecheck passed. No tests or database writes were run;
workflow rehearsal remains deferred, and broader audit reason/retention policy
is still open.

## Bounded private verification history — 2026-11-01

Changed participant evidence history and the reviewer queue from eager loading
up to 100 API pages to one bounded cursor page per request. Reviewers can load
the next page explicitly; an empty page produced by server-side role filtering
still exposes its continuation cursor. Refresh replaces the loaded view, while
upload and review updates remain reflected locally. This reduces eager transfer
of private record metadata and avoids a hard 3,000-record page ceiling. The web
TypeScript typecheck passed. No tests or database writes were run.
Age/residency decisions, retention, reviewer policy and consent remain gated.

## Event-scoped division policy drafts — 2026-11-01

Added director-only division policy authoring for draft events. Fields include
roster bounds, performance duration, optional age limit, minor-unit fee, source
and version reference, and effective date. Each save writes a revisioned current
draft, immutable version snapshot, payload-bound receipt and audit transactionally.
The draft collection is separate from live divisions and cannot affect
registration, quotes, readiness or judging; there is no approval/publish action.
This preserves the rulebook gate while making setup reviewable. Firestore,
local-testing and no-default Rust builds, web typecheck, task-manifest parsing
and `git diff --check` passed. No tests or database writes were run.

## Editable event draft details — 2026-11-01

Added revisioned director edits for a draft's name, date, timezone, venue and
supplied rules source/version reference. The Firestore command checks current
director membership, recent authentication, draft status and expected revision;
it writes the event, payload-bound replay receipt and audit atomically. Timezone
cannot change while a registration window exists, preserving its absolute
instants. The source reference remains unverified input. Firestore,
local-testing and no-default Rust builds, web typecheck, task-manifest parsing
and `git diff --check` passed. No tests or database writes were run.

## Revisioned registration windows — 2026-11-01

Added a director editor for event registration opening and closing times. Inputs
are interpreted in the event's saved IANA timezone; ambiguous/nonexistent DST
wall times, partial windows, close-before-open, stale event revisions and
non-draft edits are rejected. The Firestore transaction requires current
director membership and recent authentication and stores the updated event,
payload-bound retry receipt and audit record. Saving dates does not activate
registration. Rust Firestore build and web TypeScript typecheck passed. No tests
or database writes were run. `event-ops` remains in progress for activation,
complete event configuration, offline passes and recovery; role rehearsal is
deferred until feature implementation is complete.

## Durable chapter event drafts — 2026-11-01

Replaced the sample-only chapter event list and delayed-success create form with
Firestore-backed, director-only draft creation and bounded chapter listing.
Creation requires current director membership and recent sign-in; the event,
global ID reservation, payload-bound retry receipt and audit are written in one
transaction. Event IDs share a reservation document with publication so new
drafts and legacy events cannot concurrently claim the same global identifier.
The form records the supplied date, IANA timezone, venue and rules source/version
reference, then always saves as a private draft. It does not make rules official,
open registration, or configure divisions, fees, stages or publication. Rust
checks with `firestore`, `local-testing` and no default features, web typecheck,
task JSON parsing and `git diff --check` passed. No tests or database writes were
run. `event-ops` remains in progress for full event setup, offline passes,
recovery and deferred role rehearsal.

## Historical Global HQ application-index backfill — 2026-11-01

Added an offline, paginated Firestore migration that scans chapter-local inquiry
records and transactionally inserts or refreshes only metadata indexes for
chapter, studio and partner proposals. Existing indexes must match the inquiry
and chapter; cross-chapter collisions fail closed. The command requires explicit
demo-wsb confirmation and a local emulator, and prints aggregate counts only.
It has not been run against the emulator and no tests were run. Rust compile
checks passed with `firestore`, `local-testing`, and no default features;
`workflows/tasks.json` parses and `git diff --check` passed. Formal affiliation
decisions and privacy/retention policy remain open, so native application intake
remains in progress.

## Local demo DJ export and audio operator workspace — 2026-11-01

Replaced the synthetic audio console with a chapter-scoped operator export
workspace, assignable `audio_operator` role, and synthetic rehearsal account
with event assignment. The local-testing Rust route validates current event
assignment, snapshots current stage lineups and reviews, then streams a ZIP with
inspection-matched scanned media and `manifest.csv` revision/hash/omission
records. The interface explicitly limits the package to demo use and separates
manual review from compliance. `cargo check --locked -p wsb-api --features
local-testing`, `cargo check --locked -p wsb-api --no-default-features`, and
`npm run typecheck --workspace @wsb/web`, `node --check infra/docker/seed.cjs`,
and `git diff --check` passed. `python tools/workspace.py index` and a focused
retrieval search completed. The workspace DAG check still reports the existing
unfinished `firestore-repositories` dependency of `persistent-membership`. No
workflow tests or live storage calls were run. `event-ops` remains in progress for all-role rehearsal, recovery checks,
production media access/scanner operations, and unresolved format/deadline
policy. Approved music and consent references remain pending from the user.

## Event-wide one-click DJ export — 2026-11-01

Aligned the DJ desk to the product requirement: one request now snapshots every
current stage lineup for the event, rather than requiring the operator to select
one division. Track and omission manifest rows identify the division, stage,
lineup revision and order. The same server role/event assignment, inspected-byte
integrity checks, scan requirement, streaming behavior and local-only boundary
continue to apply. Rust local-testing and no-default compile checks, web
typecheck and `git diff --check` passed. No workflow tests were run. The task
remains in progress for durable production media access, recovery checks, policy
approval and the deferred role rehearsal.

## Demo PayMongo refund webhook reconciliation — 2026-11-01

Hardened refund parsing against PayMongo's current payment/refund resource
shapes. Local Firestore settlement now records the provider `pay_` identity
when checkout succeeds, maps it to the chapter ledger, and transactionally
applies only successful refunds with unique refund-ID receipts and raw-payload
event replay checks. Partial amounts accumulate; the paid ledger and readiness
counters change once, and the WSB payment is marked Refunded only when the
provider refund total equals the original payment amount. Provider settlement
is restricted to the demo emulator and test mode; production Firestore remains
503 and provider refund initiation remains disabled. Locked Rust local-testing/
no-default checks, web typecheck, scoped rustfmt, seed syntax check and
`git diff --check` passed after the final edits. No tests or provider calls were
run. Refund terms/eligibility remain pending approval; `payment-providers` is
now accurately marked in progress, not complete.

## PayMongo checkout retry and response integrity — 2026-11-01

Added a deterministic provider `Idempotency-Key` from the checkout reference.
Durable reservations now record the exact checkout URL, returned provider mode,
and the start time before the network request. The server requires an explicit
`PAYMONGO_LIVE_MODE` setting and validates the session reference, amount,
currency, mode, ID and active state before binding. Unknown provider outcomes
older than 23 hours are blocked for reconciliation before PayMongo's documented
24-hour key expiry. No provider credentials were used and no workflow tests
were run. The checkout page now preserves the operation ID per payer, entry and
amount across request errors/reloads, clearing it after a successful session
response. `cargo check --locked -p wsb-api --no-default-features`,
`cargo check --locked -p wsb-api --features local-testing` passed. Production Firestore checkout,
web TypeScript typecheck and scoped rustfmt passed. Production Firestore checkout,
provider cancellation and refund reconciliation remain gated. `payment-providers`
remains incomplete and its DAG dependency `firestore-repositories` is unfinished.

## MP3 inspection and persisted submission support — 2026-11-01

Added bounded MP3 decoding via Symphonia to the existing WAV inspector and
connected content-type-aware inspection, durable inspection receipts, upload,
submission and reviewer playback for PCM/float WAV and MP3. Decode work runs in
`spawn_blocking`; saved-object bytes remain subject to the existing size cap.
Reviewer response checks validate the format/MIME pairing. Updated user and
system manuals: this technical support does not establish official allowed
formats, compliance or readiness. Rust no-default/local-testing compile checks
and web TypeScript passed before the final documentation/UI consistency edits;
those checks will be repeated after this pass. No workflow tests were run.
`verification-media` remains in progress for policy, malware scan, guardian and
consent, export and production persistence/rehearsal gaps.

## Fail-closed private-media scanning — 2026-11-01

Added a bounded Tokio clamd `INSTREAM` client and local ClamAV service on a
dedicated API-to-scanner network with no host port. Identity submissions and
temporary/stored music inspections now require a clean scan; scanner outages
fail closed and detections are rejected. Music inspection/submission records
carry scan status with the content digest, and reviewer queues, playback and
decisions filter out legacy records without clean-scan evidence. Verification
cases store the scan state and content digest; reviewers only list/decide
clean-scanned cases. User-facing errors identify scanner outage or rejection.
Rust no-default and local-testing compile checks, scoped rustfmt, web TypeScript
and Compose configuration validation passed. No workflow tests or Docker service
startup were run. Production scanner placement,
signature freshness, false-positive policy and current user consent/guardian
sources remain gates; a clean scan does not prove file safety or document
validity. `verification-media` remains in progress.

## Demo chapter staff membership management — 2026-11-01

Connected the chapter staff page to director-only Firestore membership and event
assignment routes. Chapter role changes require a reason, expected revision,
operation ID and five-minute recent authentication; active membership grants
require a future expiry. Event assignment changes also require a reason,
expected revision and recent authentication, and validate the target's active,
unexpired chapter role. Each command writes its state, replay receipt and audit
record in one transaction. Self-change and director-role grants are denied.
Rust checks passed with no default features and with the local-testing Firestore
feature; web TypeScript passed. `cargo fmt --all -- --check` still reports
formatting differences in the broader modified API tree. No tests were run per
the deferred all-role rehearsal. This is demo-wsb access management only: the
Firebase UID is not verified and no invitation, account-disable operation or
production revocation check is included. `persistent-membership` stays in
progress, and `firestore-repositories` remains an unfinished dependency.

## Division judge panel configuration — 2026-11-01

Replaced the fabricated division settings page with live chapter divisions and
director-managed judge panels. Rust requires active, unexpired judge/head-judge
membership and active event assignment, a reason, recent authentication, and an
expected revision. Panels are limited to 1–20 to match the scoring service and
cannot change after scorecards are recorded or the division locks. Panel state,
receipt and reasoned audit commit transactionally; scoring and panel writes share
the division document for conflict serialization. No official panel size is
asserted. No tests were run while the requested all-role rehearsal is deferred.
Rust no-default and local-testing builds, scoped rustfmt, and web TypeScript
passed. The full workspace formatting check still reports unrelated formatting
differences in the larger modified API tree. Next: continue remaining policy
independent features; keep panel behavior in the later role rehearsal.

## Global HQ chapter staff governance — 2026-11-01

Replaced `/hq/access` sample identities and simulated revocation with a live
demo-wsb workspace. New global routes list and change chapter staff only after
checking the signed token and current `globalMembers/{uid}` authority. HQ can
appoint chapter directors and other supported chapter roles; the transaction
requires a reason, current revision, recent sign-in and finite expiry, then
commits membership, replay receipt and audit. Responses are no-store. The HQ
workspace uses current server memberships and explicit confirmation for revoke.
It does not create/verify Firebase accounts, invite recipients, provision HQ
users or check production token revocation. No tests were run during the
implementation-first pass. Rust no-default/local-testing builds, scoped rustfmt
and web TypeScript passed; full HQ/access role rehearsal remains deferred.
`hq-expansion` stays in progress.

## Global HQ signed-session gate and workspace integration — 2026-11-01

Added `GET /v1/hq/session`: it verifies a signed Firebase token and requires a
separate active `globalMembers/{uid}` record with `hq_admin` role and a valid
after boundary. Chapter roles or client claims do not grant HQ authority. The
session returns only UID/role with no-store headers; the HQ routes now check
that session and present sign-in, denied, retry and authorized states. The shell
is labeled Global HQ and marks its existing content as illustrative. Local-only
sign-in supports a separate synthetic `hq.admin@wsb.test` identity, authorized
from the global membership record, and the seed preserves future edits using a
migration marker. `npm run typecheck --workspace @wsb/web` and the local-testing
Firestore `cargo check` passed. No role API/browser scenarios were run; global
account provisioning, real HQ queues/actions and full role rehearsal remain
unfinished. `hq-expansion` stays in progress because its dependency and broader
acceptance are not complete.

## Chapter roles derive from current membership — 2026-11-01

The signed identity now resolves chapter membership by UID and requested route
scope, then Rust derives the role from the current server record. `chapterId`
and `role` token claims are no longer authority inputs. Firestore-backed
operations still compare the derived role against current membership, and
`auth_time >= valid_after` protects changes requiring reauthentication. This
supports independent memberships across chapters without custom-claim sync.
Local-testing Firestore and no-default-feature Rust compile checks passed. The
no-default check initially exposed a feature-gated Page type in battle listing;
the response now uses the shared JSON page shape. No tests were run. Production
membership/assignment commands and Firebase disabled-user/revocation checks are
unfinished, so `persistent-membership` is now in progress, not complete.

## Participant published aggregates — 2026-11-01

Managers and rostered dancers can look up their own entry's published aggregate
by event reference. Rust checks current membership and entry scope and reads only
the separate public projection; locked but unpublished results return no row.
The screen shows rank, average, deductions and final score, not judge-level
scores or notes. Synthetic role tests passed publication boundaries, isolation,
membership revocation, duplicate-row rejection and API-restart recovery.
TypeScript and no-default-feature Rust checks passed; interactive browser checks,
detailed scorecards, corrections and advancement remain unfinished.

## Participant stage position — 2026-10-31

Crew managers and rostered dancers can request their entry's recorded stage
positions on the event-day screen. Rust checks current membership and ownership
or roster scope, reads only positions for that entry, and includes held/inactive
stage state. Synthetic tests passed stage progression, held/inactive status,
unrelated dancer, staff and cross-chapter denial, and API-restart recovery.
Updates require manual refresh; browser interaction, push notifications, signed
passes and the full event-day workflow remain unfinished.

## Participant check-in status — 2026-10-31

The event-day screen can show the signed-in dancer or manager's own recorded
online arrival. Rust derives the subject from the session, verifies current
chapter membership and event scope, and returns only status and timestamp.
Synthetic tests passed absent/recorded state, another-account isolation, wrong
role/chapter, revoked membership, malformed scope and recovery after an API
restart. TypeScript and Rust checks passed. This is not a venue pass, identity
verification or eligibility decision; browser interaction, offline credentials
and the full event-day workflow remain unfinished.

## Participant and public content integrity — 2026-10-31

The event-day page now reads chapter-scoped entries instead of showing fabricated
stage calls and readiness. Removed invented notification approvals, personal
passes, tickets, privacy request confirmations, invitations and scorecards;
those unfinished functions now state their actual availability. The public
results directory opens a supplied event reference through the published-results
projection, while unpublished policy, help, story and media content no longer
claims fabricated rules or outcomes. Server-rendered smoke checks passed for 13
pages and TypeScript passed. Browser interaction and the actual unavailable
workflows remain unfinished; other legacy prototype pages still need audit.

## Repeatable synthetic rehearsal — 2026-10-31

`tools/test-rehearsal.ps1` now runs the existing local role workflow checks, a
new real SDK/API manager-director-registrar music correction and replacement
flow, draft-policy tests and six judging-outbox tests. The new music test creates
its own synthetic division and entry, uploads generated WAV bytes, checks the
reviewer note and advisory boundary on the replacement, and cleans its fixtures.
The combined command passed. It does not establish browser interaction, real
provider payments, guardian authority, official music compliance or a complete
all-role event; the larger goal remains open.

## Draft music duration advisory — 2026-10-31

The local-demo API now compares a submitted inspection's duration with the
division's unapproved draft maximum and grace, in an authorized transaction.
It checks entry, submission, receipt, policy and rules-version scope and reports
missing or stale data without asserting compliance. The manager and assigned
review staff can refresh the advisory on the entry screen. Synthetic tests cover
the exact boundary, above-boundary duration, stale draft, receipt mismatch,
denial and unchanged readiness. TypeScript and no-default-feature Rust checks
passed. Browser interaction, official policy approval and readiness integration
remain unverified or unfinished.

## Draft music guidance and review access — 2026-10-31

Chapter directors can save a versioned local-demo draft of a division's music
duration and grace with a required source; assigned registrars and directors can
read it. Drafts are deliberately not applied to review or readiness. Synthetic
tests passed role and chapter isolation, replay, changed input, locked division
and unchanged readiness for an entry in that division. The alternate entry review
route now opens staff review and checks the staff role. Browser interaction and
official policy approval/enforcement remain unverified; the larger goal remains
open.

## Local manual music review — 2026-10-31

Authorized registrars and chapter directors can mark a submitted WAV reviewed or
request correction with a note. The local-testing API verifies the current file,
checks event assignment inside the review transaction, and records an audit and
payload-bound operation receipt with a version change. The manager sees the
outcome and may resubmit. Synthetic API coverage includes concurrent replay,
changed payload, stale version, role/chapter and revoked-assignment denial,
correction, resubmission and review. Entry readiness stays unchanged. These are
manual outcomes, not verified music-policy compliance. Production playback and
review, browser interaction, MP3, event policy and complete role rehearsal
remain unfinished.

## Local submitted-music listening — 2026-10-31

An assigned registrar or chapter director can request the current submitted WAV
through a local-demo-only API and entry review panel. The server checks chapter
membership and event authorization before and after reading, verifies the stored
object against the recorded digest, and returns no-store audio. It uses privileged
Storage emulator access only after those checks, is compiled for local testing,
and fails closed outside demo-wsb. Synthetic API tests passed director/registrar
access, other-role and cross-chapter denial, assignment revocation and digest
conflict. TypeScript and no-default-feature Rust checks passed. Reviewer browser
interaction, production storage access, review decisions and readiness remain open.

## Versioned music submission — 2026-10-31

The entry manager can submit an inspected private WAV for later review. The
API re-inspects stored bytes, rechecks current manager, chapter and editable
entry revision, and transactionally records a versioned pending submission,
operation receipt and audit. Assigned registrars and chapter directors can read
the current submission; the review interface, approval and readiness changes
are not implemented. Synthetic API checks passed concurrent replay, changed
operation input, stale version, role and chapter denial, and recovery after an
API container restart. TypeScript and Rust checks passed. Full Docker recreation,
browser interaction, MP3, event policy and review remain unverified or unfinished.

## Music SDK integration and recovery fixes — 2026-10-31

The demo-wsb integration suite now exercises the Firebase client SDK with a
synthetic WAV above the small-upload threshold. It verifies absent-object
handling, resumable upload, immutable overwrite denial, exact intent/inspection
replay and anonymous/unrelated-user denial. The native screen clears stale
inspection messages and discards an unusable recovery reference on a detected
size mismatch. The SDK test and signed storage API test passed; browser UI
interaction remains unverified because local browser control is disabled.

## Entry music save action — 2026-10-31

The manager entry screen now offers private WAV upload and stored-byte
inspection alongside the existing temporary check. A tab-scoped operation and
digest support retry after interruption; the API returns the server-computed
digest for comparison. The screen distinguishes saved from submitted or
approved, and saving does not change readiness. Synthetic signed emulator
upload, immutable-object denial, inspection replay and digest tests passed;
the local role workflow test passed within its stated fixture limits. Frontend
TypeScript and Rust formatting checks passed. Interactive browser verification
of the new action and a complete all-role rehearsal remain outstanding; music
submission, review, MP3 and event-specific policy are unfinished.

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

## Local PayMongo container-recreation recovery — 2026-10-31

A signed API and mobile browser recovery check (`tests/local-paymongo-recovery.cjs`)
passed after full Docker container recreation (`down` followed by `up`):
the synthetic settled payment and mobile checkout UI state recovered cleanly
from Docker volume persistence, and re-delivering the signed paid event did
not credit the entry balance a second time. This evidence confirms local
emulation and restart persistence only; real PayMongo API compatibility,
production checkout, provider refunds and complete platform readiness remain
unverified.

## PayMongo provider integration and webhook reconciliation — 2026-10-31

Implemented official PayMongo integration, security gates, and durable webhook reconciliation:
- Rust PayMongo client (pps/api/src/paymongo.rs): HTTP Basic Auth, typed checkout sessions (/v1/checkout_sessions), session expiration, and refunds (/v1/refunds). Fail-closed when credentials are not configured in production (503 Service Unavailable).
- Durable session/event mapping (pps/api/src/repository/paymongo_local.rs and pps/api/src/finance.rs): atomic entry balance reservation in pending_minor before session dispatch; atomic binding of session ID to reservation index (localCheckoutSessionIndex/{session_id}).
- Webhook signature and event reconciliation (/v1/paymongo/webhook and /v1/webhooks/paymongo): HMAC-SHA256 signature verification with 300s timestamp tolerance; deduplication in localCheckoutEvents/{event_id}; atomic transition from pending_minor to paid_minor, division readiness recalculation, payment recording, and audit logging. Replayed events return 200 OK without duplicate crediting.
- Refund reconciliation: 
efund_payment executes local transactional refund and dispatches provider refund when provider_reference is a PayMongo transaction (pay_...). Signed payment.refunded webhooks reverse paid amounts and recalculate division readiness transactionally.
- Frontend portal checkout & return view: added PayMongo online checkout trigger in pps/web/src/components/connected-checkout.tsx and authoritative payment verification status view at pps/web/src/app/(portal)/app/payment-return/page.tsx reinforcing server webhook reconciliation.
- Local Docker emulator enhancements (infra/docker/paymongo-emulator.cjs): added /v1/checkout_sessions, /v1/refunds, and /v1/checkout_sessions/:id/expire compatibility for offline fast-loop testing.
- Verified test evidence:
  - 50/50 Rust tests passed (cargo test --locked).
  - Zero Clippy warnings (cargo clippy --locked --workspace --all-features -- -D warnings).
  - Next.js typecheck (
pm run typecheck) and full production build (
pm run build) passed all 58 routes.
  - End-to-end webhook integration suite (	ests/paymongo-webhook-integration.cjs): missing/tampered signature denial, timestamp skew rejection, global route alias verification, transactional balance settlement, duplicate event idempotency, signed refund reversal, and duplicate refund idempotency passed.
  - Container recreation recovery (	ests/local-paymongo-recovery.cjs), mobile browser flows (	ests/local-paymongo-browser.cjs), and quote safety (	ests/checkout-quote-safety.cjs) all passed.

## Documentation and presentation skills — 2026-10-31

Created workspace skills tech-docs-architect and pitch-deck-architect with
automatic invocation enabled and registered them in docs/skill-library.md.
Preserved the supplied Diataxis/ADR workflow and completed the pitch workflow
around 8–10 core slides, under-20-word visual layouts, speaker notes, 90-second
demo and Q&A backups. Both passed the skill-creator structural validator.

## System documentation and defense presentation — 2026-10-31

Created docs/system-manual with problem-to-feature mapping, local tutorial,
operator how-to, feature/readiness inventory, API reference and architecture
explanation. README links the package. Created presentations/wsb-system with
an editable 14-slide PowerPoint, content manifest, seven-minute core script,
four Q&A backups and a 90-second synthetic demo with prerequisites/fallback.
Live deck: artifact_PUfPGF3Nw1egxAkNfr05dasFyjdd05qf.

Checks: eight Markdown files have resolving local links; all 14 slides have
speaker notes/source references; every core slide contains fewer than 20 visible
words. All slides were rendered and visually inspected; connector direction,
typography and a wrapped label were corrected. PPTX integrity and geometry/font
checks passed with zero findings. Native PowerPoint execution was not tested.
Docker reported four running services healthy; web returned HTTP 200 and API
health returned ok. Broader implementation suites were not rerun for this
documentation-only task. No production readiness or completed original system
goal is claimed. Continue the remaining feature inventory and task DAG before
a complete organizer pilot.

## Real API stage and publication rehearsal — 2026-10-31

Extended infra/docker/test-local.cjs against the running Rust API and demo-wsb
Firestore to cover marshal check-in and replay, four stage positions and replay,
manager publication denial, director publication and the public projection.
Each run uses an isolated chapter/event. Mounted the test script into the seed
container so Docker runs current source without a rebuild. Two fresh runs passed.
Synthetic audio and consent metadata are fixture setup, not proof of actual
upload or guardian workflows. Complete manager/dancer/registrar handoff, other
roles and real external integrations remain unfinished. A graceful Docker
down/up and the recovery command passed for the same locked score receipt,
refunded balance, stage and published projection.

## Real API registration role handoff — 2026-10-31

The isolated Docker API check now creates a crew, redeems a dancer invitation,
selects the canonical roster, submits an incomplete entry and exercises
registrar correction. It verifies exact retries, changed crew-operation
conflict, second-actor invitation denial, dancer roster-edit denial, manager
review denial and registrar denial of premature approval. Filtered pagination
now follows empty pages until its cursor ends. Fresh signed API test passed;
the receipt and roster also recovered after graceful full Docker recreation.
Actual media and guardian
flows remain incomplete and the full role workflow remains open.

## Provider refund safety gate — 2026-10-31

Removed the unsafe automatic provider refund dispatch after the local ledger
transition. The finance refund command now rejects provider checkout reservation
records and pay_/cs_ references inside the durable transaction before mutation;
the in-memory store rejects those references too. Manual-reference refunds remain
available. This is a temporary fail-closed gate, not a complete provider refund
workflow; durable idempotent dispatch, unknown outcomes and verified provider
reconciliation are still required. Signed demo-wsb tests passed manual refund,
wrong-role denial, repeated provider-reference rejection, unchanged paid balance,
and rejection for an actual locally simulated checkout. Cargo fmt check passed.
No live provider or production data was used.

## Provider refund webhook safety gate — 2026-10-31

Review found the refund event handler could fall back to a hard-coded chapter,
accept an unmatched payment and mark a partial refund fully refunded; event
receipt replay also lacked payload binding. Refund events now fail closed before
the handler in durable and in-memory stores, and HTTP returns retryable 503 after
signature verification. Webhook live/test mode must match configuration. Signed
local integration passed full and partial refund rejection, repeated delivery,
unchanged paid balance, wrong-mode denial, ordinary settlement/replay and invalid
signature checks; local checkout suite and cargo fmt check passed. No live service
was contacted. Prior claims of completed provider refund reconciliation are
superseded; durable mapping, partial-refund model, idempotent dispatch and verified
provider reconciliation remain necessary before enabling this path.

## Strict checkout event validation — 2026-10-31

Removed missing-field defaults and first-match selection for checkout-paid
events. The parser requires matching explicit event/session/payment modes,
object types, identifiers, currency, positive amount and exactly one paid
payment before the reservation transaction. Signed local integration passed
six malformed/ambiguous event variants without changing pending or paid balance,
then passed valid settlement and replay; local checkout checks passed. This does
not prove live-provider compatibility. Existing event receipts bind normalized
settlement fields rather than every raw webhook field; full payload binding and
provider payment-ID mapping remain open. Refund events remain fail-closed.

## WAV inspection groundwork — 2026-10-31

Added a bounded Rust RIFF/WAVE inspector that derives frame count and rounded-up
duration from actual PCM or IEEE-float bytes, rejecting inconsistent headers,
truncated chunks, unsupported formats, duplicate data chunks and invalid frame
lengths. The initial three synthetic unit tests passed in the local Docker Rust
environment. This is an internal inspector, not an upload endpoint, verified
music submission or readiness decision. MP3, Storage integration, authorization,
media versioning, scanning and approved event policy remain unfinished.

## Authorized WAV inspection endpoint — 2026-10-31

Connected the byte inspector to a signed, chapter- and entry-scoped manager
endpoint. Rust rechecks current membership and crew ownership before consuming
the bounded body and returns measured metadata with saved=false. It does not
write entry state or establish compliance. The real demo-wsb Docker API test
passed valid PCM inspection, malformed input, 25 MiB limit, anonymous and dancer
denial, cross-chapter denial, membership revocation and unchanged entry revision
and music readiness. Full audio upload/storage, MP3, review, retention and approved
event policy remain unfinished. No real audio files were used.

## Durable music upload intent — 2026-10-31

Added a chapter/actor-scoped, transactionally audited music intent command for
editable entries. It binds operation ID to event, entry and expected revision;
exact concurrent retries return one stable server-owned path, while changed or
stale requests conflict. Current membership and manager ownership are rechecked
even on replay. The signed demo-wsb API test passed anonymous/dancer/cross-chapter
denial, concurrent replay, changed/stale requests, revocation and recovery from
a fresh test process. Firestore-only cargo check passed. No Storage rule permits
upload to this path yet; no file, inspection, review or readiness is implied.
Full container recreation for this intent and the complete music workflow remain
unverified. MP3 and event rules remain open.

## Private WAV upload groundwork — 2026-10-31

Added owner-scoped immutable WAV Storage rules using current chapter membership
and a server-created, one-hour music intent; paths without an expiry fail closed.
Rules use at most two Firestore documents. They check membership and the intent,
not current entry/crew state; a future submission command must recheck those and
inspect the actual stored bytes. Declared MIME is not content validation. The
first emulator test exposed overwrite via create; `resource == null` fixed it.
Four demo-wsb Storage rules tests passed, including expiry, session revocation,
wrong actor/chapter, limits, status, overwrite and deletion. A signed local API
intent plus synthetic WAV upload/read/replay passed, and the same intent/object
recovered after graceful Docker down/up. Mounted Firebase rules into the emulator
container so new rules survive recreation; a fresh upload passed afterward.
Firestore-only check and cargo fmt check passed. This is not a submitted,
inspected or approved track. Browser upload, owner reauthorization at acceptance,
stored-byte inspection, recovery decisions, MP3, review and readiness remain open.

## Durable stored WAV inspection receipt — 2026-10-31

Stored-object inspection now commits a SHA-256 digest and byte-derived WAV
metadata with an audit record in a transaction that rechecks membership, manager
ownership, entry revision and intent scope. Exact concurrent inspections recover
the same receipt; mismatched stored receipts conflict. The entry and its readiness
are not changed. Synthetic demo-wsb tests passed concurrent replay, one unchanged
audit, invalid content without a receipt, altered digest conflict, wrong token and
receipt/object recovery after full Docker recreation. Firestore-only cargo check
passed. MP3, submission/review, race testing during transfer, production storage
and approved music policy remain unfinished.

## Inspect stored private WAV bytes — 2026-10-31

Added a signed demo-wsb endpoint that rechecks manager membership, crew ownership,
intent scope and matching editable entry revision before and after reading the
private Storage object using the caller's Firebase ID token. The response is a
transient byte-derived inspection marked saved=true and approved=false; it does
not update entry readiness or record approval. The Storage read is bounded to
25 MiB and has a request timeout. Synthetic local integration passed missing
object, missing identity/session, wrong Firebase identity, invalid stored bytes,
valid metadata, repeat inspection and unchanged entry revision. Reinspection of
a previously recovered object passed in a new process; Firestore-only cargo check
passed. Concurrent revocation/stale revision during transfer and full recreation
after this new endpoint have not been separately exercised. Browser upload,
durable submission/inspection receipt, MP3, review and readiness remain open.

## Native WAV inspection control — 2026-10-31

Added a manager-only control to entry readiness that sends selected WAV bytes
to the authorized inspector, handles unavailable/offline/oversized/invalid and
session-change states, and states that the file is not saved or approved. It
clears stale results on file change and cancels work when its scope unmounts.
TypeScript and signed Docker API checks passed. The initial web request failed
because the development watcher missed the new component; restarting the web
container fixed it and the entry route returned HTTP 200. Interactive browser
and responsive checks were not performed; no visual verification is claimed.
Durable media upload, MP3 inspection, review and readiness remain unfinished.

## Firestore-only build boundary repair — 2026-10-31

The provider refund guard referenced a local-testing-only reservation type, and
provider handlers referenced local-only repository methods under the broader
Firestore feature. The Firestore-only build failed. Changed the guard to inspect
the stored reservation generically and restricted the local provider methods to
their actual feature; the durable non-local provider path returns unavailable.
Docker cargo check passed for both default and Firestore-only features; local
signed webhook and role-rehearsal checks passed after API restart. Provider
settlement and checkout are not production enabled. The unrelated music storage
workflow still needs implementation and verification.

## Checkout callback payload binding — 2026-10-31

Durable checkout receipts now store a SHA-256 digest of the exact verified
callback body alongside normalized settlement fields. Both local and general
webhook routes compute the digest, so an exact replay across aliases returns the
original receipt while a changed payment ID or other body field conflicts without
another credit. Existing receipts lacking a digest fail closed on replay; they
require reconciliation rather than assuming equivalence. Signed local webhook
integration passed both changed-body cases, cross-alias exact replay and balance
preservation. Local checkout suite and cargo fmt check passed. Production/provider
compatibility, payment-ID mapping, refund reconciliation and non-durable mode
remain outside this evidence.

## Rehearsal recovery entry point — 2026-11-01

Added tools/local.ps1 test-recovery and included the existing persisted-state
assertions in tools/test-rehearsal.ps1. This checks saved state in a fresh process;
it does not restart containers or prove full recreation recovery. The attempted
rehearsal stopped at a synthetic account login returning 401 in test-local.cjs
(Promise.all index 10); recovery and subsequent checks did not run. Next: reconcile
local seed accounts with current fixtures and rerun the rehearsal. Goal remains open.


## Guardian relationship portal — 2026-11-01

Connected /app/dependents to the existing local-only guardian request API.
Dancers request an active chapter guardian; guardians confirm or decline using
versioned commands. Network retries retain operation IDs within the mounted page;
no persistent browser recovery is claimed. Unknown outcomes remain retryable;
definitive denials clear the pending action. Current account/chapter keys isolate
component state. TypeScript passed. Interactive browser checks remain outstanding.
Confirmation stays awaiting_verification and grants no dependent access or event
consent. Guardian verification/waivers, provider refunds, offline passes, battle
progression, advancement and HQ administration remain unfinished. User directed
finishing features before the full role rehearsal; focused implementation checks
continue. Full implementation goal is active in the goal tracker.


Guardian route initially returned 500 because the development watcher missed the
new component. After restarting the web container, the route returned HTTP 200.
This is a rendering smoke check, not an interactive workflow pass.


## Guardian request withdrawal — 2026-11-01

Added versioned, actor-owned withdrawal for pending guardian requests, with
transactional payload-bound receipts and audit, plus the portal action. Neither
verified relationships nor consent are modified. Local-feature Rust cargo check
and web TypeScript passed; test-local syntax passed. Removed a duplicate guardian
module declaration that prevented local-feature compilation. Signed integration
then exposed the missing guardian role in chapter_access (403 at login); added
the role and cross-chapter unit assertions. API rebuild is in progress; live
restart command session 78484 was still running at last poll. New withdrawal
integration assertions have not yet executed. Next: wait for that process, rerun
focused signed API checks, then continue consent/configuration and other feature
gaps. Full role rehearsal remains deferred and the complete goal stays active.


Follow-up: API restart completed healthy and tools/local.ps1 test passed, including
new withdrawal denial, cross-chapter, stale-version, concurrent replay, changed
payload and terminal-state assertions. Guardian login now succeeds through the
shared chapter gate. These synthetic API checks do not establish guardian
authority or actual consent; fixture readiness remains explicitly synthetic.


## Event waiver drafting — 2026-11-01

Added local-only staff API and event waiver editor, with chapter/event authority,
version conflicts, immutable history, payload-bound retry receipts and audit.
Directors edit and assigned registrars read; participants cannot read drafts.
Rust local-feature cargo check and TypeScript passed. Added signed API assertions
for denial, concurrent replay, changed payload, stale revision and original
receipt replay after a later draft. API restart session 73540 is still compiling
at last observation; integration assertions have not yet run. Drafts remain
unsigned and do not change readiness. Consent publication/signing and approved
guardian/signer/retention policies remain unfinished. Prior guardian chapter
access unit test passed in the completed session 77562.


Follow-up: waiver API restart completed healthy. Signed API integration passed
initial waiver draft authorization/revision/replay assertions. Added explicit
cross-chapter and revoked registrar-assignment assertions; final rerun is session
90030. Staff editor has TypeScript evidence only; browser interaction remains
unverified. Existing event dashboard/settings still contain prototype content
and need replacement; the new waiver editor itself records real local drafts.


Final waiver API rerun passed including cross-chapter denial and revoked
registrar assignment. Session 90030 exited successfully. These are synthetic
local API assertions, not signed waivers or a complete role rehearsal.


## Waiver version lookup — 2026-11-01

Added exact immutable draft-version reads and a staff history lookup in the
waiver editor. Rust rechecks current event access and validates stored scope,
revision and draft status. Draft text renders as text. Local-feature cargo check,
TypeScript and test syntax passed. Added signed assertions for old/current
versions, invalid/missing version, participant/cross-chapter denial and revoked
assignment. API restart session 16997 remains live compiling at last poll;
these new assertions have not run yet. Wait for it, then tools/local.ps1 test.
The source-policy question is optional/pending; no publication or consent
authority is inferred. Next independent implementation target: durable battles
(event_ops.rs battle routes currently have no repository implementation).


## Durable battle ballot groundwork — 2026-11-01

Added private chapter/event-scoped battle reads and transactional ballots in
Firestore mode. Current event membership/assignment and panel membership are
rechecked, including on replay. One actor ballot has an immutable corner and
stable response; panel majority closes voting. Match/ballot/audit commit together.
Local-feature cargo check passed before the final bounded-count guard adjustment;
new signed battle assertions are added but not yet run. API restart session
60326 is live compiling. Next: await it and run tools/local.ps1 test, then add
authorized match setup/listing and durable progression with approved policy.
Current battle fixtures are synthetic and seeded directly by the integration
script. No battle configuration UI or public projection is claimed.

Waiver-history signed API assertions passed in session 15306 (including exact
versions, invalid/missing revision, participant/cross-chapter denial and revoked
assignment). Full role rehearsal remains deferred.


User confirmed they will provide approved waiver and guardian-policy source
references. References have not been supplied yet; consent signing and guardian
authority remain pending. Continue independent implementation.


Durable battle follow-up: API rebuild completed healthy and signed API suite
passed new ballot assertions: concurrent exact replay, changed corner conflict,
majority closure, original receipt after closure, late ballot denial and revoked
judge-assignment denial. Participant/director voting and anonymous access were
denied. Current synthetic fixtures do not prove setup, browser voting, bracket
progression or production readiness. Next: native configuration/listing and
chapter-scoped browser migration; preserve explicit policy/publication gates.


## Durable battle list and chapter browser migration — 2026-11-01

Added a private durable battle list with current event authority, scope/panel
validation, judge-panel filtering and deterministic match-reference ordering.
The current response fails closed above 100 records; cursor pagination remains
unfinished. Migrated battle desk/vote browser calls to current chapter context
and bound requests to current UID. Match closure no longer fabricates the
judge's own vote confirmation or replaces it with the winning corner. Added
stale-response guards for session/event changes. Interactive browser verification
is outstanding. Rust local-feature cargo check passed; final TypeScript session
50074 and signed list API session 70383 are running. No native match setup or
progression completion is claimed. Next: complete those checks and implement
versioned authorized match configuration/progression.


Follow-up: final TypeScript and signed API checks passed. List checks covered
empty/nonempty results, anonymous/participant/cross-chapter denial and revoked
judge assignment. Browser interaction and cold-reload personal ballot recovery
remain unverified/unfinished.


## Authorized battle draft configuration — 2026-11-01

Added director-only versioned match drafts with active event-assigned judge panel
validation, unique 3/5 panel bounds, corner/category/round validation, immutable
operation receipts, replay conflict handling and audit. Drafts begin with zero
votes, and any started match is locked against configuration changes. Existing
battle docs now include the draft operation. Local-feature cargo check is running
in session 78947. No match activation or bracket advancement yet. API fixtures
still directly seed matches; configuration needs new signed integration coverage
after the requested all-feature implementation pass. Full rehearsal is deferred.


The first compile caught that the transactional closure requires its draft command
to implement Clone; added the derive. Recheck session 58091 is still compiling at
last poll. The previous session 78947 exited with that compile error. Re-poll
58091 before relying on configuration compilation.


## Battle draft director screen — 2026-11-01

Added /admin/{chapter}/events/{event}/battles with chapter-director gating,
new match reference/category/round/corner/panel fields, connected save, refresh,
error and empty states. Linked it from the event command center. Writes use the
existing operation-ID recovery helper and Rust rejects unauthorized/inactive
judges. The list displays match summaries; edit controls are intentionally not
shown because the API list omits panel and configuration revision. TypeScript
check running in session 8041. No browser test or signed API check requested/run
in this implementation pass. Match activation, edit readback, bracket progression
and full rehearsal remain open.


## Battle draft activation command — 2026-11-01

Added director-only, revisioned activation with current panel membership and
event assignment revalidation, idempotent operation receipt and audit. Draft
becomes active only if unchanged and no votes exist. Exposed chapter-scoped
endpoint. Rust formatting completed. This late change has not been compiled or
verified yet. The battle draft screen still lacks the activate control, and
editing/readback/progression remain open. Continue by wiring that control and
compiling before broader rehearsal.


Battle director workspace now offers activation immediately after creating a
fresh draft, using its returned initial revision and the operation recovery
helper. Existing drafts loaded after navigation cannot yet be activated from
this screen because the list endpoint does not expose configuration revision.


Director activation control is present only for a draft created in the current
screen session; it sends the known initial revision through the session-scoped
recovery helper. Existing drafts still need server configuration readback to
restore panel/revision. TypeScript passed. Rust feature check session 82297 is
still running at last poll; do not claim activation compiles until it exits.


## Battle configuration readback — 2026-11-01

Added director-only configuration detail reads returning panel and revision,
then connected edit and activation for previously saved drafts. Activation uses
the loaded revision; draft edits retain operation receipt safety. Web TypeScript
and Rust local-feature cargo check passed after correcting a JSX grouping error.
The screen supports edit/load and activate; browser interaction and signed
configuration/activation API scenarios remain unverified. Bracket progression,
seed rules, byes, withdrawals and public battle projections remain unfinished.


Battle policy review: current scope explicitly classifies roster-retention
advancement as proposed and pilot scope defers final policy decisions. No official
bracket seed/bye/withdrawal behavior was found. These operations remain gated;
continue with operator workflow and durable features independent of those rules.


Corrected docs/system-manual/features.md and docs/durable-battles.md: durable
battle ballots, chapter-scoped browser pages, director setup/edit/activation
now have current evidence. Remaining limits are bracket progression, byes/
withdrawal policy, pagination past 100, public arena output and full recovery.
This documentation correction records current capabilities; it does not close
the battle task or full platform goal.


## Battle list cursor paging — 2026-11-01

Replaced the hard 100-match ceiling with the shared cursor reader (bounded to
100/page), current event authorization, per-document scope validation and
assigned-panel filtering. The browser desk consumes next_page and appends records.
Rust local-feature check and web typecheck passed. Cursor behavior hasn't had a
large synthetic dataset/API scenario yet; the role rehearsal remains deferred.

## Global HQ proposal conversation queue — 2026-11-01

Added `/hq/applications` for a current signed Global HQ member to read, reply to,
and change the communication state of chapter, studio and partner proposal
threads. Access is guarded by `globalMembers/{uid}`; application indexes and
thread updates stay separate from public projections. Each reply updates the
chapter inquiry, index revision, operation receipt and audit in one transaction.
The existing conversation status vocabulary is used; no affiliation decision is
recorded. The queue currently indexes new submissions only. Historic proposals
need a demo-only backfill, while the chapter support queue remains available.
No tests were run during the implementation-first pass. No-default Rust build,
local-testing Rust build, scoped rustfmt and web TypeScript check passed. Role
workflow rehearsal remains deferred. `hq-expansion` and `native-system-forms`
stay in progress; `firestore-repositories` remains an unfinished dependency.

## Bounded verification document signature inspection — 2026-11-01

Before marking an uploaded identity/residency file pending, the Rust API now
reads at most 10 MiB from the chapter-scoped immutable Storage object through the
requester's Firebase Storage authorization and compares basic PDF/JPEG/PNG
signatures with the declared type. It confirms the downloaded length matches
Storage metadata and does not persist the bytes. This rejects common mislabeled
uploads but is not full file parsing, malware scanning, legal evidence approval,
or an age/residency decision. The reviewer workflow and retention remain gated
by policy. No tests or web checks were run; Rust no-default and local-testing
builds plus scoped rustfmt passed. `verification-media` stays in progress.


## Music submission and assigned review queue follow-up - 2026-11-01

The participant entry music route now renders the existing durable WAV inspection,
private upload and versioned submission workspace. A new paginated event queue
returns only pending submission ID/version/duration/time to current registrar or
chapter director membership with event assignment; it omits owner UID, file hash
and object path. The per-entry player/review route reuses its existing server
role checks and removes a submission from the pending list after a saved review.
Manual review still does not determine compliance or readiness. Rust checks with
and without local-testing, scoped rustfmt and web TypeScript passed after fixing
a missing Axum Query import. No workflow tests were run; role rehearsal remains
deferred. WAV-only support, event deadline/replacement policy, malware scanning,
DJ export and production identity remain open.

## Durable event command center read - 2026-11-01

Replaced the static `/admin/[chapter]/events/[event]` sample dashboard with a
current Firestore event record for a chapter director or event-assigned registrar.
It displays saved name/status/rules version/registration deadline and provides
links to the connected operational workspaces. Removed sample entry counts,
roster totals, fake audio-compliance totals, fictional division fees and demo-only
shortcuts. The endpoint checks current chapter role and, for registrars, current
event assignment. This is a record view, not a readiness or aggregate KPI claim.
The no-default and local-testing Rust builds passed, scoped rustfmt passed, web
TypeScript typecheck passed, and `git diff --check` reported no whitespace errors
(only repository line-ending warnings). No workflow tests were run; role rehearsal
remains deferred. The local-only waiver draft route is now hidden in standard web
builds. `event-ops` remains in progress.


## Battle desk pagination and draft recovery - 2026-11-01

Fixed the director battle workspace to consume the API's paginated response,
load additional match pages, recover an existing draft's panel/revision, and
only offer activation after it has a current revision. Saving a draft now reads
back its server revision instead of assuming every edit is revision one. The
previous screen expected a flat array and hid draft recovery actions after reload.
Advancement, bracket seeding, byes and withdrawals remain gated by approved
competition policy. No tests were run; role rehearsal remains deferred.

## Chapter audit feed connected — 2026-11-01

Replaced the fabricated `/admin/[chapter]/audit` screen with a read-only feed
backed by the chapter-scoped Firestore audit collection. The API rechecks current
chapter membership and permits only chapter directors and auditors, returns
bounded newest-first pages, and validates each record's chapter ownership. The
browser supports pagination, loaded-record action filtering, refresh, and an
explicitly partial JSON export. It displays only persisted fields; audit reasons
and correlation IDs are not consistently stored, so PAGE-085 remains incomplete.
Added the read-only `auditor` role to chapter/HQ assignment choices. Added
`docs/chapter-audit.md` and tracked `chapter-audit-explorer` as in progress pending
schema completeness, role rehearsal and broader production gates. Rust Firestore,
local-testing and no-default feature checks passed; web TypeScript typecheck,
workflow JSON parsing and `git diff --check` passed. No tests were run. Consent,
guardian policy and production provider/reference decisions remain gated on the
approved sources the user said they will provide; full role-by-role rehearsal
remains the next phase after implementation gaps are closed.

## Global HQ integrations status connected — 2026-11-01

Replaced the fabricated `/hq/integrations` claims (Stripe, Xendit, Twilio,
SendGrid, secret-manager storage and fake HTTP pings) with a current HQ-authorized
API status view. `GET /v1/hq/integrations` rechecks signed identity against the
active global membership, probes Firestore reachability, and reports safe
configuration-presence booleans for PayMongo and private media without exposing
credential values. The page does not ping third-party providers and explicitly
keeps release readiness closed. Firestore, local-testing and no-default Rust
checks passed; web TypeScript passed. No workflow tests were run; HQ account
provisioning, real provider checks and the full role rehearsal remain open.

Replaced the fabricated `/hq/operations` dashboard with the same authorized,
read-only server status. Removed synthetic latency, route-count and ledger-hash
claims, plus the browser-only maintenance toggle that had no effect outside the
page. Updated the HQ overview and operator docs to mark integrations and
operations as read-only while other HQ workspaces remain previews. No workflow
tests were run; the durable API and web checks cover the new status work above.

The Global HQ chapter directory is now a bounded, read-only Firestore view. The
API rechecks active HQ membership and validates chapter ID, name and currency
fields before returning records. The UI no longer invents director contacts,
license expiry, seed quotas or renewal status, and no longer offers a
nonfunctional licensing wizard. Firestore, local-testing and no-default Rust
checks plus web typecheck passed; no workflow tests were run. Licensing and
affiliation actions remain gated on authoritative policies and stored records.

Removed fabricated Global HQ rulebook claims: the previous page asserted
unapproved division limits, scoring weights, edition versions and an Olympic
trimmed mean, and offered a fake download. `/hq/rules` now lists sourced open
policy decisions, labels the external rule link reference-only and exposes no
publish action. Replaced the fake global-content releases, partner claims, CDN
metrics and browser-only edit buttons with an explicit unavailable state.
Corrected the shared HQ banner so it no longer says all global actions are
disconnected. Web TypeScript passed; no workflow tests were run. Policy approval
and a durable content service are still missing.

Connected crew profile settings to the active workspace session and current
chapter. Managers load the real chapter-scoped crew and save name/city using
the current revision and a payload-bound operation receipt. Removed the
demo-token request, fabricated crew fallback, false success on API errors and
browser-only disband alert. Archive remains explicitly unavailable because no
server command or retention/cancellation contract exists. Web TypeScript passed;
no workflow tests were run. `account-workflows` remains active pending the
complete account/role workflow and rehearsal.

Removed invented published notices, author names, audience figures and
browser-only publish/edit actions from chapter content. PAGE-083 specifies
separate editor and publisher roles; those roles, durable content revisions,
review/publication authority, public projection and notification behavior are
not implemented, so the screen now states that publishing is unavailable. Added
this to `docs/open-questions.md` and native workflow coverage. Web typecheck
passed; no workflow tests were run.

## Private evidence upload preflight — 2026-11-01

Participant uploads now validate PDF/JPEG/PNG extension and browser MIME agreement,
reject empty or over-10-MiB files before creating a durable upload case, and show an
offline-specific message before starting. The API's byte signatures, size limit and
fail-closed malware scan remain authoritative. `npm run typecheck --workspace
@wsb/web` passed. No tests were run; role rehearsal remains deferred. Approved
evidence policy, retention, guardian authority and consent source references remain
open.

## Private media reactivation gate — 2026-11-01

Aligned Firebase Storage chapter access with the API membership lifecycle by
requiring the signed token auth_time to meet the current member valid_after value.
This closes stale-token reads/uploads after a membership reactivation while
retaining current membership, chapter and role checks. Updated the private
verification guide. No workflow tests were run; full role rehearsal remains
deferred. This rules change still needs emulator verification in the later test
phase.

## Guardian request reload recovery — 2026-11-01

The guardian relationship request workspace now stores one pending command in
actor/chapter/role-scoped session storage before sending. Unknown outcomes can be
retried after reload with the same operation ID; exact success clears the record,
auth/transient failures keep it, and users can explicitly clear the local retry
reference after checking its limitation. Rust now returns an exact prior receipt
after rechecking the current actor membership and request ownership, but before
requiring counterpart activity; new commands still require an active counterpart.
No authority, dependent access, consent or readiness is granted. Updated the
manual, workflow guide, task evidence and decision memory. Web typecheck and Rust
local-testing cargo check passed. No tests were run; role rehearsal remains
explicitly deferred until implementation gaps are closed.

## Audit correlation fields on new writes — 2026-11-01

New audit writes through the shared Firestore helper, in-memory record helper,
chapter membership/assignment writers and judge-panel writer now persist a stable
correlation identifier equal to the immutable audit record ID. Operation-backed
membership and panel IDs remain replay-stable. The field is an audit-event key,
not an end-to-end HTTP trace. Existing records are not migrated; generic human
reasons are still absent unless the command already requires one. Updated PAGE-085
docs and task acceptance to reflect this remaining gap. Rust local-testing cargo
check passed. No tests or migrations were run; chapter-audit-explorer remains in
progress pending reason-policy, legacy/export/retention decisions and role
rehearsal.

## Firebase Auth disabled/revoked identity check path — 2026-11-01

The Rust verifier now has a non-demo Firestore path that obtains a Google OAuth
credential via ADC and calls Identity Platform account lookup after validating
the Firebase JWT. It rejects missing accounts, disabled users and tokens whose
auth_time precedes validSince. Auth/IAM/network failures fail closed with 503;
invalid identities receive 401. No account fields beyond UID/status timestamps are
retained. Startup and FirestoreRepository still restrict runtime to demo-wsb, so
this path is compiled but inactive and untested against live Auth. Existing staff
UID grants, invites, account-disable administration, IAM setup and signed
production API rehearsal remain unfinished. Local-testing and no-default Rust
checks plus web typecheck passed; no workflow tests were run. `persistent-membership`
remains in progress.

## Firebase Storage membership expiry enforcement — 2026-11-01

Closed a direct-storage authorization gap: Firebase Storage rules now reject
private-media reads and uploads after the current member's optional `expires_at`,
in addition to active membership and `auth_time >= valid_after`. The common
membership rule protects verification and manager music paths; assigned reviewer
music access now reuses it. Expiry is evaluated against Firebase request time and
missing/null expiry remains compatible with older records. Updated the membership,
private-verification and local Docker docs. This mirrors the API's existing
membership expiry check. No rules tests were run, per implementation-first
sequencing; emulator verification remains queued for the role/test phase.

## Verification media direct-read scan gate — 2026-11-01

Firebase Storage reviewer reads now require the canonical `document` object,
current chapter reviewer access, a path-consistent existing case, pending case
status and a clean malware-scan receipt. This closes the direct-object path that
could otherwise bypass the API's clean-scan review gate while an upload was still
in progress. Participant access remains owner-scoped. The storage-rules emulator
suite remains deferred until the requested feature-first implementation pass is
complete; no tests were run for this change.
## Firebase Auth target validation before membership grants — 2026-11-01

Chapter-director and Global HQ grant handlers now validate a production target
UID against Identity Platform before a new grant's Firestore write transaction.
An exact prior command receipt is resolved first under the actor's current role,
so later target-account changes do not break idempotent retries.
Missing/disabled target accounts are rejected with 422; lookup/IAM/network
failures return 503. The demo-wsb path remains local and does not query production
Auth. This reuses the verifier's cached ADC credential and keeps network effects
outside the transactional callback. Updated membership docs and grant error copy.
Rust Firestore compilation and web typecheck passed. No real Auth call or tests
were run. The non-demo path remains inactive because
startup and Firestore connection still enforce demo-wsb; invites, account-disable
administration, IAM setup and signed production rehearsal remain open.

## Role workflow rehearsal preparation — 2026-11-01

Added `docs/role-workflow-rehearsal.md` as a non-executed role-by-role runbook.
It maps current synthetic accounts to implemented workflows, positive/negative
authorization checks, replay/recovery evidence, and policy/provider-gated roles.
Added local `verifier` and `auditor` accounts with an additive Firestore fixture
migration, and documented them in `docs/local-docker.md`; existing fixture edits
are preserved. Linked the runbook from local setup docs and the pilot task. No
workflow tests or database writes were run; pilot remains todo until complete
implementation and actual all-role evidence exist.

## Multi-chapter workspace discovery — 2026-11-01

Added signed-in `GET /v1/account/chapters` with bounded pagination over chapter
documents and current membership checks per candidate; the response excludes
inactive, expired, stale-auth and unrelated memberships. `/workspaces` now lists
the caller's server-verified chapter roles and stores the chosen chapter only as
an account-scoped navigation preference. `useWorkspaceSession` accepts an
explicit route chapter or uses the saved context before a legacy claim; session
authorization remains server-side. Updated membership/architecture/API docs and
the rehearsal runbook; added task evidence. Added a synthetic `multichapter`
account with the `ph` sample claim and an independent `hk` crew-manager membership,
so the role rehearsal can exercise real same-UID chapter switching. Updated local
account and rehearsal docs. Firestore and no-default Rust checks, web typecheck,
seed syntax, task JSON parse and diff check passed. No tests or database writes
were run; persistent membership remains in progress.

## Private chapter content drafts — 2026-11-01

Replaced the chapter content unavailable state with a private director workspace.
It saves plain-text title/body drafts as immutable revisions using chapter-scoped
Firestore records, expected-revision conflicts, payload-bound retry receipts,
transactional audit entries, and bounded newest-first draft/history reads. The
editor renders plain text and can load a prior revision into the editor for a
new save. There is no review, publish, public projection, media, or notification
path. The current director-only authoring boundary is provisional; editor and
publisher authority, rights, audience, correction/removal and retention remain
open before production activation. Updated the manual, feature inventory, API
reference, task evidence, decision log and chapter-director rehearsal steps.
Firestore Rust compile, no-default Rust compile, web TypeScript and formatting
checks passed; no tests or database writes were run. Role workflow rehearsal
remains deferred.

## Music review outcome notifications — 2026-11-01

The manual music review transaction now notifies the entry's crew manager for
both a recorded review and a correction request. The notice is keyed by entry
and resulting submission version and commits with the review, intent status,
operation receipt and audit. It links to the participant's music screen, omits
the reviewer note from the notification body, and says manual review does not
establish compliance or readiness. Updated the notification acceptance, API and
repository docs, and crew-manager rehearsal steps. Rust Firestore plus
local-testing compile, no-default compile and formatting checks passed. No tests
or workflows were run; role rehearsal remains deferred.

## Judge panel assignment notifications — 2026-11-01

Panel revisions now notify judges added or removed by a director, atomically
with the panel, receipt and audit. The panel is bounded to 20 accounts. A new
batch notification helper reads every recipient record and unread summary before
staging any writes, then updates each recipient's inbox and counter once. The
role runbook and notification acceptance now include panel changes. Rust
Firestore/local-testing and no-default compiles and formatting checks passed.
No tests or role workflows were run; all-role rehearsal remains deferred.


## Battle ballot closure notification — 2026-11-01

Private battle documents now retain the director UID that first saved the draft.
The existing ballot transaction notifies that creator atomically when its
configured closure condition is reached. The deterministic notice includes the
stored outcome and links to the private vote/match view; it does not imply
bracket advancement. Older synthetic records without a creator are compatible
and skip the notice. Updated battle, notification, API, feature, native workflow
and role rehearsal docs plus task evidence and decision log. `cargo fmt --all
--check`, Rust Firestore/local-testing and no-default compiles, task-manifest
JSON parse, `git diff --check` and retrieval index passed. `workspace.py dag`
and `workspace.py check` still report the unfinished `persistent-membership`
dependency. No tests or role workflows were run; all-role rehearsal remains
deferred until feature completion.


## Payer-authorized payment record and currency precision — 2026-11-01

Replaced the hardcoded `/app/payments/[paymentId]` sample receipt—which showed
fictional chapter, crew, amount, date and paid status—with a live read of the
saved payment ledger record. The new chapter-scoped API allows only the recorded
payer or current finance/director roles. The page labels it as a WSB ledger
record, prints only settled records, and states that it is not an external
provider/bank receipt. Payment amount display and manual share parsing now use
the currency code's minor-unit precision, including zero- and three-digit
currencies, across checkout, return, payment history and local test checkout.
The payment history links to its record page, and pending status copy no longer
claims every payment is waiting for a provider webhook. Updated the API manual,
feature inventory, user manual, role rehearsal, task acceptance/evidence and
decision log. `cargo fmt --all --check`, Firestore/local-testing and no-default
Rust compiles, web TypeScript typecheck, task-manifest JSON parse and
`git diff --check` passed. No tests or role workflows were run; provider,
refund-policy and production-payment gates remain open. Current
`workspace.py dag` and `workspace.py check` still stop at the unfinished
`persistent-membership` dependency. Next: continue the remaining implementation
that does not require invented policy/provider behavior, then begin the prepared
role-by-role rehearsal only after implementation is complete.


## Public event ticket page policy gate — 2026-11-01

Removed the marketing ticket page's slug-based Hong Kong/Manila event names,
fixed ticket tiers, fabricated prices/benefits and “Book Tickets” links. The
public route now states that there is no connected offer, checkout or admission
record, gives the event reference, and links only to a general availability
question form. `/app/tickets` remains unavailable. Added the unresolved ticket
pilot scope, inventory, pricing, admission, refund/transfer and credential terms
to `docs/open-questions.md`, updated system/native workflow inventories and task
evidence, and recorded the decision. Web TypeScript typecheck, task JSON parse,
`git diff --check` and memory indexing passed. No tests or role workflows were
run; ticket pricing and sale remain policy-gated.


## Unpublished event slug fallback — 2026-11-01

Replaced the generic event-page slug heuristics that invented event title/date,
venue, divisions, entry requirements, and open status. Unknown references now
show an unpublished-event state with no registration action, and link to the
event directory and official calendar. The official Hong Kong 2027 static page
and explicitly labeled Manila preview are unaffected. Updated the native
workflow/feature inventories, task evidence and visitor role rehearsal step;
recorded the decision.
Web TypeScript typecheck, task manifest parse and `git diff --check` passed.
The retrieval index was rebuilt. No tests or role workflows were run. Public
event publication and slug correction remain open gates.


Battle ballot closure now writes a creator notice only while that creator has
active, unexpired chapter membership; revoked or expired creators receive no
new inbox record. Updated the battle contract, decision log and director
rehearsal expectations. `cargo fmt --all --check`, Rust Firestore/local-testing
and no-default compiles passed. No tests or role workflows were run.

## Notification recipient membership gate — 2026-11-01

Centralized current recipient membership checks in the transactional inbox
writer. A source command that races with a membership revocation can still
complete, but does not create a new notice for missing, inactive, or expired
members; malformed cross-chapter records fail closed. Updated repository,
workflow, API, and task acceptance documentation. `cargo fmt --all --check`, Rust
Firestore/local-testing and no-default compiles passed. No tests or role workflows
were run.

## PayMongo Hosted Checkout v2 update — 2026-11-01

Updated the official provider adapter to PayMongo's documented recommended
`/v2/checkout_sessions` API for create and expire; refunds continue through
`/v1/refunds`. The API base setting is now an origin and accepts legacy values
ending in `/v1` or `/v2`. The adapter enforces nonzero PHP line items, checks
returned session ID/checkout host/reference/amount/currency/mode, and handles
aggregate fields omitted by the current create response using the original
server-side reservation values. Hosted checkout requires an explicit
`PAYMONGO_PAYMENT_METHOD_TYPES` allowlist configured from the actual PayMongo
account; no method list is assumed. Updated environment examples, architecture,
user manual, task acceptance and release questions. `cargo fmt --all --check`,
Firestore/local-testing and no-default Rust compiles passed. The task manifest
parses and `git diff --check` passed; retrieval was rebuilt. No tests or provider
requests were run. Account test-mode, webhook/refund reconciliation and
production validation remain open.

## PayMongo role-rehearsal separation — 2026-11-01

Prepared the role runbook to distinguish the payer-facing `local-checkout-simulate`
flow from the signed, synthetic PayMongo callback path. The future rehearsal now
covers same-operation checkout retry, simulated settlement/reload, and separately
verifies emulator session expiry, a signed paid callback, duplicate delivery and
single ledger settlement. It labels the local emulator evidence separately from
real PayMongo v2 account compatibility and refund/failure validation. No
workflow, emulator or provider request was run.

## PayMongo emulator response-shape alignment — 2026-11-01

Updated the synthetic v2 checkout response to include the documented hosted
`checkout_url`, so the later adapter rehearsal can exercise the required redirect
field rather than an incomplete fixture. Updated the local Docker guide. `node --check infra/docker/paymongo-emulator.cjs`,
retrieval indexing and `git diff --check` passed. No emulator, provider, or role
workflow was run.

## Crew-manager payment status notices — 2026-11-01

Manual finance transitions now notify the recorded payer and, when different,
the entry crew's manager. The payer notice retains the payment detail link; the
manager receives a generic summary linked to their owned entry workspace, not a
payer-only payment page or payer details. Notices commit atomically with the
finance transition and use a stable operation-derived ID; current membership
checks and recipient deduplication apply. Updated the repository contract,
native workflow, task acceptance and role runbook. `cargo fmt --all --check` and
Firestore/local-testing plus no-default Rust compiles passed. The task manifest
parses, retrieval was rebuilt and `git diff --check` passed. No tests or role
workflows were run.


## Shared payment transition notice fan-out — 2026-11-01

Refined payment notifications into one transactional producer shared by manual
finance transitions and local PayMongo test-mode settlement/refund. The recorded
payer receives the payment detail link; a distinct crew manager receives a
generic entry-workspace summary. The helper deduplicates same-recipient cases,
rechecks current membership, and stages both inbox rows atomically with the
source mutation. The role rehearsal and native workflow docs now distinguish the
manager summary from payer-only details. Rust Firestore/local-testing and
no-default compiles plus formatting checks passed. The task manifest parses and
retrieval indexing and diff whitespace checks passed. No tests, emulator/provider
requests, or role workflows were run.


## PayMongo retry redirect integrity — 2026-11-01

Closed a provider recovery gap: retrying a durable reservation with a saved
PayMongo session ID but no saved hosted checkout URL no longer fabricates a
redirect from that ID. The API returns service unavailable and leaves the
reservation intact for reconciliation. The user manual now documents this case
alongside the existing idempotency expiry recovery. `cargo fmt --all --check`
and Firestore/local-testing plus no-default Rust compiles passed. No tests,
provider calls, emulator requests or role workflows were run.


## PayMongo resource ID validation — 2026-11-01

Hardened the provider adapter's checkout-session and refund boundaries. Session
IDs used to build the expiration URL must have the expected prefix and safe
path-segment characters; refund requests require a valid payment ID, and refund
response IDs and payment IDs receive the same boundary validation. Updated the
payment-provider task acceptance. `cargo fmt --all --check` and Firestore/local-testing
plus no-default Rust compiles passed. No tests or provider calls were run.


## PayMongo checkout expiration endpoint correction — 2026-11-01

Corrected checkout expiration to use `/v2/checkout_sessions/{id}/expire`; the previous status incorrectly described this endpoint as already migrated, while the code still omitted the version. Rust formatting and Firestore/local-testing and no-default compiles passed. Provider validation and role workflows remain pending; no tests or provider requests were run.


## Provider-backed cancellation gate — 2026-11-01

The synthetic cancellation transaction now refuses reservations with a provider request or provider mode recorded, including a provider request racing with cancellation. It retains the balance for reconciliation instead of treating synthetic expiry as proof of provider expiry. Removed the ignored provider expiration call and corrected the user manual. Rust formatting and Firestore/local-testing and no-default compiles passed. No tests, provider requests or role workflows were run. Controlled provider cancellation and reconciliation remain open.


## Account support update notifications — 2026-11-01

Staff replies and status changes on signed-in account inquiries now atomically create a generic requester inbox notice with a revision-derived ID. Current membership and exact replay behavior use the shared inbox writer; anonymous contact conversations and self-updates do not generate a notice. Updated native inquiry documentation, task acceptance and the role rehearsal. Rust formatting and Firestore/local-testing and no-default compiles passed. No tests or role workflows were run.


## Support notice conversation links — 2026-11-01

New account support notices include an encoded chapter and inquiry reference. Account support opens that conversation when the selected chapter matches, and explains how to recover when another chapter is active. The existing inquiry API enforces current membership and requester/staff authority; old notices retain their original general link. Rust formatting and Firestore/local-testing and no-default compiles, web TypeScript checking, task JSON parsing, retrieval indexing and diff whitespace checks passed. No tests or role workflows were run.


## Verification review notices — 2026-11-01

A verification review now atomically enqueues a generic private notice for the case owner. The notice excludes the decision, reviewer note and document details, and links to the protected verification workspace. Existing inbox membership checks and review replay receipts apply. Updated private verification documentation, task acceptance and the role rehearsal. Rust formatting and Firestore/local-testing and no-default compiles passed. No tests or role workflows were run.


## Encoded notification destinations — 2026-11-01

Dynamic notification destinations now encode each path segment and query value through a shared URL builder for registration, payment, music, support, stage, check-in, judging and battle notices. Existing notices are unchanged. The role rehearsal includes a reserved-character identifier case. Roster-wide registration and stage notices remain unfinished: the allowed 500-person roster needs bounded durable fan-out rather than two inbox writes per recipient inside the source transaction. Rust formatting and Firestore/local-testing and no-default compiles passed; task JSON, indexing and diff whitespace checks passed. No tests or role workflows were run.


## Bounded roster notification delivery — 2026-11-01

Registration approvals and stage-position transitions now create a durable server-only roster fan-out job in the source transaction. The local Firestore API worker reads jobs in bounded pages and delivers up to 20 recipients per transaction, rechecking the current entry roster and active, unexpired chapter membership; inbox writes, unread counts and job cursor commit together, and completed jobs are removed. Managers keep their immediate notices. Delayed dancer notices direct to current event-day status. Updated workflow/repository docs, task acceptance and the later rehearsal to cover replay, restart, multi-instance, membership and roster changes. Rust formatting plus Firestore/local-testing, Firestore-only and no-default compiles passed; task JSON and diff whitespace checks passed. No tests, emulator requests or role workflows were run. Recovery, concurrency, authorization and bounded-load behavior remain unverified.


## Published result notifications — 2026-11-01

Publishing a division snapshot now atomically records a server-only publication notification job. The local worker expands one published entry per transaction into a current crew-manager notice and a bounded roster fan-out job, rechecking published snapshot, chapter, event, entry and crew scope. Roster batches recheck current membership and entry roster. Notices link to the participant results workspace with chapter and event; the workspace checks the active chapter before loading authorized entries. Updated task acceptance, repository/workflow docs and the role rehearsal. Rust formatting, Firestore/local-testing, Firestore-only and no-default compiles, web TypeScript checking, task JSON, retrieval indexing and diff whitespace checks passed. No tests, emulator requests or role workflows were run. Result corrections, follower notices, external delivery and failure/restart/multi-instance verification remain open.


## HQ notification queue visibility — 2026-11-01

Added a no-store, current-HQ-admin endpoint and operations view for bounded samples of pending roster-delivery and publication-expansion jobs. The query projects only failure counts; the response exposes no recipients or conversation contents. Workers record failed attempts when possible, suppress repeated attempts for 30 seconds, and clear the cooldown after progress. The view explains sample, outage and completed-job limits. Updated HQ/repository/system docs, task acceptance and role rehearsal. Rust formatting, Firestore/local-testing, Firestore-only and no-default compiles, web TypeScript, task JSON, indexing and diff whitespace checks passed. No tests, provider calls or role workflows were run; authorization, failure recovery and concurrency remain unverified.


## Notification queue malformed-job isolation — 2026-11-01

Queue workers now list bounded pages using document IDs and projected progress fields, and process each job independently, so one malformed payload does not prevent later jobs on the page from being attempted. When progress and failure metadata remain readable, failed attempts update only failure count and cooldown fields without rewriting the job payload. The HQ sample reports unreadable failure metadata separately; malformed progress can still prevent durable failure recording. Updated repository documentation, task acceptance and the role rehearsal. Rust formatting, Firestore/local-testing, Firestore-only and no-default compiles, web TypeScript, task JSON, indexing and diff whitespace checks passed. No tests, emulator requests or role workflows were run; malformed-job, replay, failure and concurrent-worker behavior still need rehearsal.


## Local guardian-request notices and membership expiry — 2026-11-01

The local guardian relationship workflow now atomically notifies the named counterpart on request creation, response and withdrawal, using generic copy without identity details. Current membership and the expected role are checked; a missing, inactive, expired or role-changed counterpart is skipped on withdrawal so the authorized actor can still withdraw. Counterpart checks now reject expired membership for new requests and responses, and the list hides expired counterparts consistently with its existing inactive-member rule. Confirmation still means awaiting verification and grants no guardian authority or consent. Updated private verification documentation, task acceptance and the role rehearsal. Rust formatting plus Firestore/local-testing, Firestore-only and no-default compiles passed. No tests, emulator requests or role workflows were run; approved guardian/waiver policy and notification authorization/replay checks remain outstanding.


## Guardian withdrawal after counterpart access loss — 2026-11-01

The local relationship list now keeps pending requests visible to their current authorized actor when the counterpart is inactive, expired, missing or has changed role. It redacts the unavailable counterpart account reference and allows withdrawal after reload; the interface hides confirm/decline in that state. Withdrawal responses and exact retries recheck counterpart availability and use the same redacted view while preserving the saved operation receipt. Closed requests with an unavailable counterpart remain hidden. Updated native workflow and private verification docs, task acceptance and role rehearsal. Rust formatting, Firestore/local-testing, Firestore-only and no-default compiles, web TypeScript, task JSON, indexing and diff whitespace checks passed. No tests or role workflows were run; guardian verification and waiver source policy remain pending.


## Bounded guardian request pagination — 2026-11-01

Replaced the local guardian list hard failure above 100 requests with account-scoped Firestore cursor pages ordered by request reference. The API fetches at most limit plus one, validates returned chapter/actor scope and cursor shape, and returns a continuation even when visibility filtering leaves a page empty. The portal preserves loaded pages and offers load more; refreshing starts from the first page. Added both role-specific composite index definitions, task evidence, documentation and later rehearsal coverage for over 100 synthetic requests, empty filtered pages, redaction and cross-account denial. Rust formatting plus Firestore/local-testing, Firestore-only and no-default compiles and web TypeScript passed. No tests, emulator requests, index deployment or role workflows were run. Pagination, index availability and recovery remain unverified; guardian verification and waiver source policy remain pending.


## Guardian request notice links — 2026-11-01

Added a local-only single-request read that rechecks the signed account, chapter, participant role, request ownership and counterpart redaction. New guardian-request notices contain an encoded chapter and request reference and open that request even when it is outside the loaded list pages. The workspace checks the active chapter, verifies the returned scope, refreshes the linked record after actions, and preserves a valid local return path for sign-in. Older notices remain general links. Updated private verification docs, task acceptance and role rehearsal. Rust formatting and Firestore/local-testing, Firestore-only and no-default compiles, web TypeScript, task JSON, indexing and diff whitespace checks passed. No tests or role workflows were run; linked access, pagination, sign-in recovery, replay and policy gates remain unverified.


## Notification inbox account isolation — 2026-11-01

The web inbox now mounts its private state under an account-and-chapter key, waits for the authenticated user and matching chapter session, binds reads and acknowledgements to the expected UID, and checks returned chapter, recipient, notification ID and unread count before displaying them. Delayed responses are ignored after a workspace is replaced; a 401/403 clears visible notices and the unread count. The initial empty state no longer appears before the first load. Updated task acceptance, repository documentation and later account-switch/revocation rehearsal. Web TypeScript, task JSON, retrieval indexing and diff whitespace checks passed. No tests, push-provider calls or role workflows were run. Push consent, delivery and role-level isolation/recovery verification remain open.


## Foreground event-day call-sheet refresh — 2026-11-01

The participant call sheet now checks loaded entries on open, approximately every 30 seconds while visible and online, and on visibility return or reconnect. Checks remain grouped by four and do not overlap; superseded results are ignored, individual authorization denials remove that entry’s displayed status, and the interface shows the last complete check and browser-reported offline state. Event-day state is keyed to the current account, chapter and event. Updated the event-day contract, open push-delivery questions, task acceptance and later rehearsal. Web TypeScript, task JSON, indexing and diff whitespace checks passed. No tests, Firebase messaging calls or role workflows were run. Read load, partial failure, reconnection and account-switch behavior remain unverified; this is not background push or a venue credential.


## Bounded participant stage-call reads — 2026-11-01

Added a read-only participant stage-call batch endpoint accepting one to four distinct entry references. It authenticates the chapter actor, reuses the existing per-entry membership, crew ownership and roster checks, and returns no stage data for unavailable entries. The foreground call sheet now sends one request per four entries, validates returned IDs and shapes, preserves per-entry failures and uses the expected UID for paged entry reads. Loaded entries are deduplicated across pages. The single-entry endpoint remains available. Updated event-day documentation, task acceptance and later role rehearsal. Rust formatting, Firestore/local-testing, Firestore-only and no-default compiles, web TypeScript, task JSON, indexing and diff whitespace checks passed. No tests, emulator requests or role workflows were run. This reduces HTTP/authentication overhead; Firestore reads still grow per entry, and isolation, partial failure, load and recovery remain unverified.

## Notification response validation — 2026-11-01

The chapter inbox now validates notification record fields, timestamps, revisions, page bounds, cursor shape and unread count before displaying data. Destinations must be safe same-origin relative paths, preventing malformed response data from introducing an external or script URL. Read acknowledgements receive the same record validation. Web TypeScript typecheck and diff whitespace check passed. No tests, emulator or role workflows were run; server authorization and full inbox behavior still require the planned rehearsal.

## Event cutoff timezone display — 2026-11-01

The event command center now formats a saved registration cutoff in the event's
configured IANA timezone, rather than the current browser timezone. Missing and
invalid event timezones display an explicit configuration state. Added a later
cross-timezone director rehearsal case. Web TypeScript typecheck and diff check
passed; no tests or role workflows were run.

## HQ historical-application index backfill — 2026-11-01

The demo-only idempotent migration was started with explicit `FIREBASE_PROJECT_ID`
and `WSB_MIGRATION_CONFIRM` set to `demo-wsb`. Its container-side compile was
interrupted when Docker Desktop's Linux engine became unreachable, before any
aggregate result was reported. Whether it committed any batches is unknown; do
not claim completion. Recheck the local emulator and rerun the idempotent
migration only after confirming no prior process remains. No real requester data
was read or written outside demo-wsb. This is an environment interruption, not
migration evidence.

## Crew workspace scope isolation — 2026-11-01

The connected crew workspace now remounts under the active UID/chapter scope,
binds crew reads and create/invite commands to that UID, discards superseded
responses, and validates returned crew/invitation scope before displaying data,
navigating, or exposing a link. Added these account/chapter transition cases to
the later role rehearsal. Web TypeScript typecheck and diff whitespace check
passed. No tests, database calls or role workflows were run.

## Performer roster scope isolation — 2026-11-01

The performer selector now remounts under UID, chapter, event and entry scope;
binds its entry/crew reads and roster save to the active UID; ignores late
responses; and verifies returned entry/crew scope before display or confirmation.
Added a later account/chapter switch and malformed-response case to the role
rehearsal. Web TypeScript typecheck and diff whitespace check passed after the
scope change. No tests, database calls or role workflows were run.

## Entry workspace scope isolation — 2026-11-01

The entry workspace now mounts private state under the account, chapter, event,
entry and review scope. Detail and list reads plus create, submit and review
commands bind to the current UID. Generation guards discard late results; returned
entries and crew selections are checked against chapter/event/owner scope before
rendering, navigation or confirmation. Added a later role-rehearsal scenario for
scope switches during reads, pagination and commands. Web TypeScript typecheck
and diff whitespace check passed. No tests, emulator or role workflows were run.

## Payment-record workspace scope isolation — 2026-11-01

The payment workspace now mounts under UID, selected chapter and mode scope,
binds paged reads to the UID, checks chapter and payer ownership before display,
and ignores late list or reconciliation/refund responses. Unauthorized list
responses clear visible payment rows and cursors. Added finance account/chapter
switch coverage to the later rehearsal. Web TypeScript typecheck and diff check
passed. No tests, provider calls or role workflows were run.

## Support workspace scope isolation — 2026-11-01

The chapter support queue now binds paged reads and submissions to the active
UID, verifies each returned chapter, and ignores superseded requests. Connected
conversation reads and replies also bind to the UID and verify the requested
chapter/conversation before rendering messages or acknowledging a reply. Added a
later support account/chapter switch case to the role rehearsal. Web TypeScript
typecheck and diff whitespace check passed. No tests, database calls or role
workflows were run.

## Verification response and Storage path validation — 2026-11-01

The identity workspace now validates each case's chapter, participant owner,
case identifier, canonical private Storage path, status, purpose, timestamps,
size and allowed content type before display or document access. Upload, submit and
review receipts must match the current case and scope before the UI acknowledges
success. The role rehearsal now includes malformed path/receipt cases. Web
TypeScript typecheck and diff whitespace check passed. No tests, Storage access or
role workflows were run.

## Judge lineup account isolation — 2026-11-01

The assigned-performance list now remounts under the active UID, chapter and
event, binds its paged reads to that UID, discards superseded responses, and
checks assignment row shape before rendering scorecard links. Added a judge
lineup account/chapter switch case to the later rehearsal. Web TypeScript
typecheck and diff whitespace check passed. No tests, API workflows or role
rehearsal were run.

## Music review queue account isolation — 2026-11-01

The reviewer queue now remounts by UID, chapter and event, binds paged reads to
the active UID, discards stale responses, and validates entry reference, version,
duration and submission time before display. Authorization denial clears visible
rows and selection. Added a music queue account/chapter transition case to the
later rehearsal. Web TypeScript typecheck and diff whitespace check passed. No
tests, media access or role workflows were run.

## Registrar queue account and chapter isolation — 2026-11-01

The registration queue now resolves membership against its requested chapter,
remounts list state under UID/chapter/event scope, binds paginated reads to the
current UID, ignores stale responses, and validates each returned entry's chapter,
event and core shape before display. Authorization failures clear visible entries
and cursors. Added a registrar account/chapter switch case to the later role
rehearsal. Web TypeScript typecheck and diff whitespace check passed. No tests,
API workflows or role rehearsal were run.

## Chapter draft history request binding — 2026-11-01

Private chapter content and division-policy draft pagination now pass the active
workspace UID to every list and revision-history read. Existing generation/scope
guards discard superseded responses. Added the account/chapter transition case to
the later rehearsal. Web TypeScript typecheck and diff whitespace check passed.
No tests, API workflows or role rehearsal were run.

## Personal-results entry page validation — 2026-11-01

The private personal-results entry page now binds pagination to the active UID
and validates returned chapter, event, entry identity, roster shape and cursor
before filtering entries or exposing published-result controls. Added an
account/chapter switch case to the later role rehearsal. Web TypeScript typecheck
and diff whitespace check passed. No tests, API workflows or role rehearsal
were run.

## Guardian request response validation — 2026-11-01

The guardian relationship screen now validates returned list and notice-linked
requests for chapter, current actor, request identifier, lifecycle status,
revision, and counterpart redaction before rendering action controls. The UI
continues to label confirmation as awaiting relationship verification and gives
it no dependent-access, consent or readiness effect. Added malformed-response
and both-role checks to the later rehearsal. Web TypeScript typecheck passed; no
tests, emulator calls or role workflows were run. Approved verification policy
remains pending.

## Staff access workspace identity and response scope — 2026-11-01

Staff access management now uses the account/chapter-aware workspace session and
remounts private management state under the director UID and chapter. Membership,
invitation and event-assignment pages are bound to that UID; returned records and
cursors are validated against the requested chapter/event before controls render.
Added a director account/chapter switch and malformed-row case to the deferred
rehearsal. Web TypeScript typecheck passed. No tests or role workflows were run.

## Staff mutation receipt scope checks — 2026-11-01

Director staff grant/revoke, invitation create/revoke and event assignment actions
now validate response scope and resulting state before clearing recovery data,
updating rows or reporting success. A mismatched invitation create response keeps
the same pending operation available for recovery. Added malformed mutation
receipt cases to the deferred role rehearsal. Web TypeScript typecheck passed;
no tests or role workflows were run.

## Judge panel and results publication session scope — 2026-11-01

Division-panel management now resolves the current chapter session, remounts
state by UID/chapter/event, binds division pages to the active UID, and validates
division and panel response shape before rendering edits or acknowledging saves.
Results publication now requires a current head-judge or director membership,
keys its workspace by UID/chapter/event, binds status and publish calls to the
current UID, and validates returned division and publication receipt scope. Added
both workflows to the deferred role rehearsal. Web TypeScript typecheck passed;
no tests or role workflows were run. Scoring tie policy remains a publication gate.

## Global HQ account-bound reads and chapter switching — 2026-11-01

Global HQ chapter/member directories, operations/integration status, and proposal
queue/thread reads are now bound to the signed-in UID. HQ proposal list pages and
thread responses reject malformed records and late thread switches. HQ chapter
access clears its currently displayed membership list when the selected chapter
changes, ignores stale page responses, validates membership scope, and checks
grant/revoke receipts before reporting success. Added HQ account and chapter
switch cases to the deferred rehearsal. Web TypeScript typecheck passed; no tests
or role workflows were run. HQ provisioning/revocation production integration
remains gated.

## Crew invitation acceptance account scope — 2026-11-01

The native invitation acceptance screen now remounts state by signed-in UID and
invitation scope, binds the join command to the current UID, and verifies that the
returned crew belongs to the requested chapter/crew and includes the dancer
before showing success. Added account-switch and malformed receipt cases to the
Dancer rehearsal. Web TypeScript typecheck passed; no tests or role workflows were
run.

## Director event-list and configuration response scope — 2026-11-01

The event management list now discards stale account/chapter requests, validates
chapter ownership and required event fields before display, and resets pagination
on scope changes. Event draft and registration-window forms validate returned
record IDs, revisions and field shapes before reporting saves; page callbacks
apply updates only to the matching event and active UID/chapter. Added account,
chapter, malformed-row and receipt cases to the deferred director rehearsal.
Web TypeScript typecheck passed. No tests or role workflows were run.

## Event creation unknown-outcome recovery — 2026-11-01

The director event form now saves its event-create command and immutable operation
ID in tab-scoped storage before sending. After reload, the same UID/chapter can
restore and retry the exact command; edits are held until its outcome is recovered
or the API returns a definitive denial/conflict. The response must match the
requested chapter, slug and event fields before navigation. A switch of account or
chapter ignores the old response. Added lost-response/reload coverage to the later
Chapter director rehearsal. Web TypeScript typecheck passed. No tests, database
calls or role workflows were run.

## Chapter audit page response validation — 2026-11-01

The read-only chapter audit page now validates every returned record, chapter
scope, timestamp and continuation cursor before rendering or exporting the page.
Omitted optional reason/correlation fields remain compatible with legacy records,
matching the API's serialized shape. Duplicate IDs within a page are rejected and
load-more merges deduplicate against prior pages. Added malformed-page,
wrong-chapter, legacy-optional-field and duplicate-page scenarios to the deferred
director/auditor rehearsal. Web TypeScript typecheck and diff whitespace check
passed. No tests, database calls or role workflows were run. Archive export and
retention remain policy-gated.

## Notification inbox page and acknowledgement validation — 2026-11-01

The chapter notification inbox now rejects empty/oversized cursors, duplicate
IDs within a response page, malformed records, and invalid unread counts.
Cross-page duplicate notices are filtered. Read receipts
must match the selected notice, remain in the active chapter/account, contain a
read timestamp, and not regress its revision. Added malformed cursor/page and
read-receipt cases to the deferred all-role rehearsal. Web TypeScript typecheck
and diff whitespace check passed; no tests or role workflows were run.
List records and unread metadata are fetched separately; their values are not
cross-validated because concurrent acknowledgements can make those reads reflect
adjacent snapshots.

## Consent policy source lead — 2026-11-01

Superseded after direct retrieval: the 25-page “WSB RULES 2026.pdf” linked from
the official WSB Dubai page is dated 31 March 2026. Its text includes event age
criteria and a general accident/injury and likeness waiver provision that names
the competitor or crew manager/leader as a signer. It does not state guardian
verification or minor signer authority, nor establish applicability to the
Manila/Hong Kong 2027 pilot. Updated `docs/open-questions.md` and
`memory/decisions.md`; consent remains unavailable pending approved pilot-event
references and guardian policy. Retrieval index rebuilt. No code, tests or role
workflows changed.

## Scope WSB 2026 rules evidence to its edition — 2026-11-01

Corrected stale claims in `docs/pilot-scope.md`, `docs/open-questions.md` and
`docs/user-manual.md`. The retrieved Dubai 2026 booklet supports age thresholds
for listed youth divisions as of January 1, 50% roster retention into finals, a
five-second performance-duration grace, a general one-week submission deadline
when none is stated, and an eight-criterion weighted rubric. This differs from
the product brief's five equal scoring pillars and is not evidence of Manila/HK
2027 policy. The performance grace is not an audio-upload grace, and the booklet
does not establish a seven-day music lock. Current five-field scoring remains
synthetic; advancement/age enforcement and consent remain gated for the pilot.
Updated the decision log and retrieval index. Diff whitespace check passed. No
code, tests or role workflows changed.

## Malformed offline score row rendering — 2026-11-01

The outbox flush already rejects structurally invalid queued score commands, but
the saved-score page dereferenced the command and state without checking them.
The page now renders an unreadable record with a safe fallback label and message,
omits invalid revision/operation/receipt fields and does not create a scorecard
link without a valid entry ID. Added a malformed local-row recovery case to the
deferred judge rehearsal. Web TypeScript typecheck and diff whitespace check
passed. No tests or role workflows were run.

## Public results projection validation — 2026-11-01

The public event-results component now validates the entire published projection
payload before rendering. It checks event/chapter/publication scope, digest,
timestamp, unique entry IDs, score bounds and rank shape. Invalid or partial
payloads use the existing unavailable state; public results remain sourced only
from the API's published projection. Added malformed-projection scenarios to the
deferred visitor rehearsal. Web TypeScript typecheck and diff check passed. No
tests or role workflows were run.

## Public projection collection integrity — 2026-11-01

Extended the public results boundary to reject duplicate division/publication
snapshots and duplicate entry placements across a response. Added the collection
collision case to the deferred visitor rehearsal. Web typecheck and diff check
passed. No tests or role workflows were run.

## Publication desk collection integrity — 2026-11-01

The chapter publication desk now validates collection-level uniqueness for
published snapshots and entry placements, in addition to event/chapter scope,
receipt metadata and score shape. Individual publish receipts use the same
validator. Added duplicate-collection cases to the deferred director/head-judge
rehearsal. Web TypeScript typecheck and diff check passed. No tests or role
workflows were run.

## Explicit non-demo Firestore runtime gate — 2026-11-01

The API can now start an ADC-backed, non-demo Firestore runtime only when
`WSB_ENABLE_PRODUCTION_STORAGE=true`, `WSB_STORAGE=firestore`, a syntactically
valid non-demo Firebase project ID is configured, and no Firestore emulator
endpoint is set. The demo project still requires an explicit emulator and rejects
the production opt-in. Local signed-test identities remain restricted to
demo-wsb. This enables the already-implemented signed Firebase token and
Identity Platform account-status path without enabling unsigned identity or
making unmigrated routes ready; `/readyz` remains 503 until release criteria pass.
No production project was contacted. Production IAM setup and signed-workflow
rehearsal remain unverified.

The connector additionally requires the project argument to match
`FIREBASE_PROJECT_ID` and requires `WSB_STORAGE=firestore` for non-demo projects;
non-demo-looking project IDs cannot fall through to ADC accidentally.

Repository calls compiled into Rust test targets now hard-reject every project ID
except `demo-wsb`, before considering production environment variables. This keeps
local tests isolated even if a developer shell contains production settings.

Validation for the production-runtime change: no-default, Firestore, and all-feature
Rust `cargo check` passed, including compilation of the all-feature test targets;
`cargo fmt --check`, task JSON parsing and diff whitespace checks passed. No test
binary was run and no Firebase project was contacted. `workspace.py check` still
reports the results dependency as unfinished.

## Notification malformed-progress cooldown — 2026-11-01

The Firestore notification worker previously decoded `next` as a required integer
before it could read `last_failed_at`. A malformed progress field therefore
prevented cooldown metadata from being seen or recorded, causing every worker
poll to retry the same job. Queue scans now read progress, cooldown and failure
metadata independently as JSON values; the failure transaction rechecks current
progress and updates only failure metadata. A corrupt/missing progress field can
be cooldown-marked without changing it, while transactional conflict/retry keeps
multi-instance workers from overwriting another worker's advancement. Added the
corrupt-progress, valid-sibling and multi-instance scenario to the deferred HQ
rehearsal. Rust all-feature checks and formatting passed; no tests or role
workflows were run.

## Rehearsal role-catalogue coverage — 2026-11-01

Compared the deferred workflow guide against `docs/website-plan/02-roles-and-navigation.md`.
The implemented-role table now has a separate deferred section for attendee,
studio coordinator, refund approver, event manager, technical judge, battle
operator, broadcast operator, content editor/publisher, global rules administrator,
global administrator and platform operator. Each row names the feature and
authority prerequisites; no unavailable role is simulated through another role.
The runbook now distinguishes preparation from evidence and retains the rule to
begin workflow execution only after implementation is complete. No workflows were
run.
The follow-up role-catalogue pass also separates consent reviewer from identity reviewer: evidence review remains testable, while waiver review/signing stays deferred until the approved source and guardian policy arrive.

## Guardian withdrawal compile handoff — 2026-11-02

Rechecked the current checkout after the prior signed guardian-withdrawal runner
handle was no longer available. The durable withdrawal route and rehearsal
scenarios are present. `cargo fmt --check`, `cargo check --locked --all-features`,
and `npm run typecheck` pass. The signed repository/API integration was not
rerun, so withdrawal replay, concurrent behavior, notice deduplication, role
revocation and recovery remain unverified. No tests or role workflows were run;
continue feature work before the deferred all-role rehearsal.

## Guardian request page-boundary validation — 2026-11-02

The guardian-request browser now rejects unordered or duplicate request IDs
within a page, duplicates already loaded from earlier pages, malformed cursors,
and cursors that do not advance. This prevents a malformed response from
creating duplicate actions or an endless load-more loop. Added the cases to the
deferred rehearsal and verification task acceptance. `npm run typecheck` and
`git diff --check` passed. No tests or role workflows were run; the signed
withdrawal integration remains unverified, and consent signing remains gated on
the user's approved sources.

## Serialized private-document submission pipeline — 2026-11-02

A second single-slot permit is now acquired before reading private verification
object bytes and held through decode, malware scan and durable submit. Its wait is
bounded at 30 seconds and returns service unavailable on timeout. This limits
concurrent 10 MiB buffers across simultaneous document submissions; the existing
shared parser slot still serializes PDF and raster decoder peaks. It does not
bound aggregate decompression within one PDF or isolate/terminate parser work.
The source and task notes preserve those limits. Rust formatting and all-feature
compile, web typecheck, workspace consistency, task JSON parse and diff checks
passed. No tests or role workflows were run.

## PDF retained-object budget — 2026-11-02

PDF loading now applies the lopdf object filter with a 24 MiB estimated retained
object budget, a 100,000-object ceiling and a nesting-depth limit, in addition to
its 8 MiB per-stream decompression cap. A budget rejection returns 413 and the
participant sees a clear too-large-or-complex message. Each object stream is
still decoded before the filter runs, so this is not an exact aggregate
heap/decompression bound and does not isolate or kill parser work. Updated the
verification docs, tracked acceptance, and decision log. Rust formatting and
all-feature compilation, web typecheck, task-manifest parsing, and diff checks
passed. No tests or role workflows were run.

## Full-system completion request — 2026-11-02

The user requested completion of every unfinished area in the ten-area capability
inventory. This remains the implementation objective; no domain is marked complete
by this verification pass. Event-policy approval, provider-account validation,
guardian authority, retention decisions and production provisioning remain external
dependencies documented in docs/open-questions.md.

Verified this pass: npm run typecheck; npm run test:outbox (8 passed);
python tools/workspace.py check; ./tools/local.ps1 test (passed its synthetic
registration handoff, signed role isolation, payment replay/refund, stage progression,
judge locking and publication scenario). The integration suite uses synthetic
audio/consent fixtures and does not establish actual readiness or all-role coverage.
A direct docker compose ps invocation failed configuration interpolation because
it did not load the wrapper-managed local settings; no secrets were displayed.

Next: implement the remaining policy-independent vertical slices and expand their
authorization, replay and recovery coverage; obtain event-specific decisions before
activating policy enforcement. The existing DAG reports no ready tasks, not that
all work is finished. No feature implementation was added in this pass.


## Executed local role demonstration and repairs - 2026-11-02

Real browser checks passed for 18 visitor/account cases and 47 pages at 1365px
and 390px. Guardian request/response/reload/withdrawal and HQ/staff/audit denials
were checked. Registration, valid-PDF upload/review lost-response recovery,
public/account support, and offline judging/reconnect/sign-out passed on both
widths. Simulated checkout reservation/cancellation/settlement/reload passed on
phone. The combined API/recovery/music/policy/content/outbox suite passed,
including new HQ root-list/count and check-in candidate-denial assertions.
Two Rust PDF regressions, formatting, web typecheck and diff checks passed.
See docs/role-demo-2026-11-02.md and tests/role-demo-browser.cjs; screenshots and
structured run evidence stay in ignored .workspace/role-demo.

Repairs: PDF object preservation; completed-review receipt recovery before a
now-forbidden file read; check-in candidate route; HQ root-list parent and count
rendering; director staff-list validation; missing synthetic primary membership;
HQ discovery/return links; fixed-event navigation; long-ID wrapping; sign-out
loading recovery. Stale local runtimes rebuilt. No production deployment.

The user's non-technical role map covers 16 current audience/role types and 13
planned separate roles; all 29 buttons and 736px/320px layout passed. Future
roles, approved event policy, verified guardian authority, signing, tickets,
offline admission, full brackets, publishing/privacy/governance and production
operations remain unfinished. No domain task was marked complete by this demo.


## Landing page aligned to the actual system journey - 2026-11-02

Homepage now leads with event discovery and returning-user workspace access,
then three audience paths and six ordered entry stages. It explains chapter
approval, roster invitations, evidence/music/payment preparation, review,
corrections and published-only results. Public navigation offers How it works,
sign-in and event selection instead of a fixed event shortcut and ambiguously
scoped global rules. Existing hero video and motion remain. Mobile workspace
link visibility is corrected; the local web server was restarted to load CSS.
Web typecheck and production build passed. Browser checks passed at 1365px,
390px and 320px, with six steps, no horizontal overflow, no browser exceptions
and usable content with JavaScript disabled. Native CTA navigation evidence is
tracked by the updated tests/native-cta.cjs. No business rule, production data,
backend behavior or feature-completion status changed.


## Branded account-entry screens - 2026-11-02

Applied the repository WSB UI/UX, frontend-design and ui-craft guidance to the
shared sign-in, sign-up and password-reset form. Added a branded header, dance
artwork poster, oversized display copy, volt accents and a separate focused
form surface. Phones use a compact poster; form fields retain 56px height and
16px input text. Password visibility is integrated into the field; account
creation, recovery and help links remain explicit. Entrance motion is limited
to opacity/transform and bypassed for reduced motion. No authentication logic,
chapter authority or return-target allowlist was changed.

The image reuses the existing generated dance-hero.png as decorative artwork,
not a real competitor or event photograph. Typecheck, production build and
scoped diff checks passed. Browser checks covered sign-in/signup/reset at
1440, 768, 390 and 320px with loaded artwork and no horizontal overflow or
browser errors, plus visibility toggle, wrong-password feedback, successful
signed manager login and a preserved native registration return destination.
No production identity or email-delivery verification is claimed.


## Guided-flow publication on Vercel - 2026-11-02

At the user's request, exported the existing interactive guided role flow and
published the standalone static page to https://wsb-guided-flow.vercel.app/.
Vercel project: patkiks-projects/wsb-guided-flow. Deployment:
dpl_DUTsZgUWiCHTNmHgRgvWiSUZiiiY, reported READY. The deploy package is
.workspace/guided-flow-vercel; editable inline source remains the thread's
wsb-guided-flow.html visualization. This deployment contains the role explainer
and embedded synthetic screenshots only; it does not deploy the WSB application
or backend. Removed local-service navigation from the exported copy. Package
checks found no local-service URLs or credential values. The static export
supports /wsb-guided-flow.html through a redirect to its root.


## Hero video ready-event race - 2026-11-02

Fixed pauseVideo/playVideo calls occurring between the YouTube player constructor
and its onReady event. Visibility, intersection and footer-motion commands now
wait for readiness and check method availability. onReady records its actual
target, mutes and immediately requests playback when visible and permitted.
Cleanup also tolerates incomplete player construction. Added a connection hint
for the privacy-enhanced embed origin while the API script loads, only after
motion/data preferences allow video. No deliberate playback timer was added.

The controlled browser test now supplies an incomplete player for 350 ms and
triggers visibility/motion events before methods exist; it passed immediate
ready-event playback, mute, footer pause/resume, rotation, cleanup, reduced-motion,
data-saving and error-poster checks. Updated obsolete test registration/slogan
assertions to current native links. Production build, typecheck and scoped diff
checks passed. Real YouTube playback was observed about 4.3 seconds after DOM
readiness with no page exceptions in one desktop run; external load/buffering
and browser autoplay restrictions remain. Local web restarted; no Vercel app or
backend deployment was made as part of this repair.

## 2026-11-03 — Audit continuation: event handoff and offline recovery

Added server-backed assigned-event next actions to the workspace for event-duty roles; the local 18-role demonstration passed, including phone-width checks of those links. A production browser rehearsal exposed missing remembered chapter context after an offline reload. The client now remembers a chapter after the server verifies membership and retries session verification on reconnect. A queued synthetic score was restored and received a server receipt; the run then exposed stale session error text. The reconnect retry has passed typecheck but still requires a fresh production browser rehearsal before the scenario is marked complete. CI configuration now prepares a production-mode signed browser rehearsal; hosted CI has not run it yet. External event rules, provider, privacy and production gates remain open.

### Signed reconnect rehearsal — 3 November

The production build passed and the 390px signed demo-wsb browser journey now passes: manager entry reads, queued judge score, offline shell reload and score rehydration, reconnect with a matching server receipt and cleared session error, director results desk, and marshal check-in receipt. The marshal check uses manual entry because eligible roster pages can be paginated. This is synthetic local evidence; hosted CI, render-error recovery with an authenticated score, and venue-device testing remain open.

### Chapter selection recovery safeguard — 3 November

A route-specific chapter verification no longer overwrites the account's selected chapter. A signed synthetic multi-chapter browser check selected PH, verified an HK route, and confirmed PH remained selected after returning to the workspace. Typecheck passed. This preserves offline recovery context; authorization still comes from current server membership. Authenticated render-error recovery remains open.

### Assignment refresh denial — 3 November

The assigned-event workspace clears its displayed event links and pagination when a refresh returns 401 or 403. A signed synthetic marshal browser check injected a denied refresh and confirmed the previously shown check-in link disappeared; normal route checks and typecheck passed. Server authorization remains authoritative. Authenticated score rehydration through a render failure remains open.

### Event-duty access race — 3 November

A denied assignment refresh now invalidates an in-flight event access check, clears the selected event and prevents a late response from restoring duty links. Typecheck and a signed synthetic marshal browser scenario passed with an intentionally delayed access response and injected 403 refresh. Actual render-error score recovery and hosted CI remain open.

### Linux parser worker smoke check — 3 November

The local Docker API container ran `cargo test --locked -p wsb-api --all-features --test document_parser_process`: all three synthetic PDF, PNG, malformed and oversized-input checks passed on Linux. These invoke the worker directly and do not exercise the parent's `setrlimit` launch path, exhaustion behavior, scanner failure or API responsiveness. Those remain open in the intended release container.

### Linux parser launch limits — 3 November

A local Linux container test now exercises the real parent launch path with a synthetic executable. It verified the 512 MiB address-space and 20-second CPU soft limits, a short test deadline terminating a busy worker, and a subsequent worker acquiring the semaphore. The test passed. This does not prove hostile document exhaustion, scanner fail-closed behavior, ordinary API responsiveness, or limits in the deployed release container; those remain open.

### Parser timeout cleanup — 3 November

The parser parent now explicitly kills and waits for a timed-out worker before releasing its single parser permit; the shared deadline still includes queue wait. The local Linux test passed and confirms the synthetic busy worker PID no longer exists after timeout, the limits are applied, and a subsequent worker runs. External cancellation still uses kill-on-drop; release-container hostile inputs, scanner failure and API responsiveness remain open.

### Parser cancellation cleanup — 3 November (verification pending)

The parser launch now runs cleanup in an owned task so request cancellation does not immediately release the single parser permit while its child is alive. A Linux synthetic cancellation test was added, but the local Docker test and Docker status requests stopped producing output during compilation. No pass is claimed; inspect the existing running test before retrying. Release-container resilience remains open.

### Parser cancellation host compilation — 3 November

`cargo check --locked -p wsb-api --all-features` passed on the Windows host after the cancellation cleanup change. The Linux cancellation and process-reaping test remains pending because the existing Docker test and engine requests have not returned. Host compilation does not validate Linux process behavior.

### Scanner reply validation — 3 November

The scanner now accepts only the exact ClamAV INSTREAM clean response `stream: OK`; malformed or unexpected success-like replies fail closed. A host unit test passed for clean, infected, malformed and invalid UTF-8 responses. This does not replace an end-to-end scanner outage test or validate the deployed scanner configuration. Linux parser cancellation verification remains pending.

### Scanner network failure check — 3 November

A host socket-level synthetic ClamAV test passed for clean and infected responses, malformed and truncated replies, connection refusal and timeout, while checking the INSTREAM framing. Failures return unavailable rather than clean. This exercises the scanner client, not end-to-end case submission or the deployed scanner. Linux parser cancellation verification remains pending.

### Parser queued cancellation — 3 November

The parser slot is now acquired before the owned worker task is spawned. Cancelling a request while it waits therefore removes that waiter instead of leaving a detached queued job; once a worker starts, its owned task retains the slot through cleanup. Windows all-features cargo check and formatting passed. Linux cancellation and reaping tests remain pending because Docker is unresponsive.

### Public stage stalled-request recovery — 3 November

The public-stage poller now enforces an eight-second deadline independently of the transport, aborts a stalled request, retains the last confirmed projection, and retries with the existing backoff. A late response from the timed-out request cannot replace the later state. Five synthetic stage unit tests passed, including the new timeout/late-response/retry case. This does not establish real venue network or published-event behavior.

## UI/UX polish planning — 3 November 2026
Added docs/ui-ux-polish-plan-2026-11-03.md covering landing, user journeys and all route families, delivery priorities and acceptance gates. Source/route review only; no new UI implementation or browser verification. Next: shared workspace navigation/context and role-aware overview, then connected registration journey.


## UI polish initial implementation — 3 November
Workspace navigation now puts Overview first and highlights nested sections; the shared shell displays server-verified chapter context when available. Landing event discovery moved directly after the hero. Web typecheck passed. No browser, role or full journey verification was performed. The role-aware overview, registration journey and remaining page families remain open.


## User workspace overview — 3 November
Added a role-sensitive starting section to /app above the existing server-backed crew list, with links for managers, dancers, guardians and event staff based on the verified chapter role. Typecheck passed before the final duplicate-link cleanup; browser and full role journeys remain pending. Registration journey and remaining polish work are not complete.

## Test specification review — 3 November
The connected WSB test specification was structurally checked across 826 entries: IDs are unique, the requested core fields are populated, all execution statuses are Not Run, and actual results are empty. Selected interface, identity, access, invitation and battle-ballot cases were revised against source; no application tests were executed. The source-to-test audit is not complete: generic setup and workflow instructions remain, and coverage references are not approved requirement IDs. The published ISO standard's complete normative text has not been reviewed. Continue the case-by-case source audit and maintain pending status for unimplemented roles and workflows.

## Production-readiness audit continuation — 3 November
The emulator-only email helpers no longer derive action-link origins from request headers; they validate the configured WEB_ORIGIN, escape password-reset HTML and return generic delivery errors. Two focused security tests passed. The web typecheck and production build passed; the build required access to an existing protected build-output directory. The 55 default-feature Rust tests and default-feature Clippy passed; the Rust build reported incremental-cache hard-link warnings. Fifteen outbox, public-stage and accessibility-contract tests and the built-site content smoke test passed. There is no configured web lint script. This is a partial audit: existing release readiness remains closed, and full production identity, infrastructure, business-policy, durable-workflow, responsive-browser and end-to-end verification remain open.


## User-story specification baseline — 2026-11-03
Read the supplied Test_Case_Specification Google Sheet (WSB Test Cases tab) without
editing it. Retrieved 826 exact WSB case IDs, all Not Run. Created
docs/specifications/user-story-specification.md plus JSON catalogue, source
inventory/facts, CSV bidirectional matrix, review issues and validation report.
208 source-coverage/actor groups map all cases with zero duplicate/orphan IDs.
Static inventory found 133 page/handler files, 137 Rust route registrations,
179 public Rust model declarations and 733 named test symbols across 375 sources.
Recorded 295 review issues; these are approval gaps, not 295 established defects.
All REQ-DER IDs are proposed, not approved SRS mappings. Broad source test oracles,
planned role identities and semantic correspondence remain unresolved; no complete
functional coverage or ISO conformity is claimed. No application tests executed.
Document-only uniqueness/link/fence checks passed. Supplied US-EVT-004 conflicts
(participant role, filter, login/API path, duplicate semantics and TC IDs) are
explicitly documented. Normative standards were not reviewed in full.


## GitHub workflow repair — 2026-11-03
Run 41635373010 failed in four jobs. Fixed attribute-order-sensitive main landmark
contract, generated WSB_PAYMONGO_LOCAL_SECRET in isolated CI settings, factored DJ
stream future type and corrected Clippy conversions/empty comparison. Scoped lint
expectations document existing explicit transaction/audit argument boundaries.
Invitation race assertion now expects forbidden for the losing nonmember, matching
existing authorization without weakening it. Fifteen focused web tests, all-feature
all-target strict Clippy, formatting and Compose configuration checks passed.
Local integration execution remains unavailable without the demo-wsb emulator;
Docker daemon is not running. Hosted verification required after push.

## Story walkthrough document — 2026-11-03
Created a local Word rehearsal guide with 16 narrative scenes, 20 seeded-account references and 123 exact scene test IDs from the saved 826-case catalog. Credential-bearing output stays in ignored local deliverables and is excluded from retrieval. Document links resolve to catalog IDs; 21 pages rendered via installed Word after packaged LibreOffice was unavailable. No application workflows or account logins executed for this document; catalog statuses remain Not Run. Pending policy and unavailable workflows are explicitly separated from the seeded operational path.

## Street poster hero entrance — 2026-11-04
Replaced the generic hero entrance with scoped GSAP headline masks (100ms stagger),
a separate skewed lime wipe, 1.4x sticker snaps and a 1.1x frame drop with an
orange backing kick 80ms after impact. Removed perpetual sticker floating.
Existing muted archive video/poster behavior remains; no new media or WebGL.
Typecheck, accessibility contract and public-motion browser suite passed.
Desktop 1440px and mobile 320px previews have no horizontal overflow; reduced
motion restores static transforms and no-JavaScript headline remains readable.
Final production build passed. Existing metadataBase fallback warning remains.
No deployment performed.

## Landing loading entrance — 2026-11-04
Implemented an original human silhouette loader with CSS-only dance transforms,
actual page/font/poster/motion completion checks, fallback messaging and a paused
hero handoff. Fast readiness completes a dance phrase before the screen lifts.
Server-rendered cover, native modal focus, explicit skip/Escape, readiness timeout,
no-JavaScript access and reduced/saved-off motion fallbacks are included.
Typecheck and production build passed; existing metadataBase warning remains.
Dedicated browser checks passed at 1440px and 320px for pending-image honesty,
held hero, minimum phrase, handoff, navigation cleanup, Escape, timeout, reduced
motion, saved motion off and no-JavaScript access. Existing accessibility contract
and public-motion browser checks passed. No low-end hardware frame-rate guarantee
or production deployment is claimed. New loader uses no added package or remote
media; screenshots are in ignored local entrance-checks evidence.
