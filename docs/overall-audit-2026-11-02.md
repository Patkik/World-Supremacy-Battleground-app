# WSB overall implementation and professional-readiness audit

Date: 2 November 2026 (Asia/Manila)

Scope: current working checkout, including uncommitted implementation changes.
Deliverable: assessment, prioritized work plan and recorded implementation follow-up; no deployment performed.

## 1. Executive assessment

### Implementation follow-up — 3 November 2026

This continuation supersedes earlier “next” items where local implementation
and verification are now recorded. It does not change the audit's live-release
verdict or imply that external policy, provider, privacy, ownership or
production gates have passed.

Verified on the current working checkout:

- `npm run typecheck` and `npm run build` passed; the build generated all 66
  static pages and compiled the dynamic routes.
- `npm run measure:public-performance` passed its standalone production-browser
  checks: serious/critical axe scan, keyboard skip-link focus, sign-in labels,
  narrow reflow, unpublished projection isolation, video/motion lifecycle and
  data-saving fallbacks. The synthetic public-stage outage/recovery scenario
  passed at 390px and 1365px, and the service-worker A-to-B upgrade retained
  queued IndexedDB work.
- A temporary production-build failure probe also passed for both the route
  error boundary and root global boundary at phone/desktop sizes. Retry kept the
  safe fallback visible, hid synthetic exception details, and preserved a
  synthetic queued IndexedDB record across retry/reload. The probe route and
  root failure hook have been removed; actual authenticated score rehydration
  through a render failure remains a role-rehearsal item.
- `npm run demo:roles` passed against the isolated `demo-wsb` stack: 18/18
  synthetic roles, 47 page checks, no desktop/mobile overflow, and recorded
  authorization denials returned 401/403 as expected. This is a role-route
  smoke demonstration, not proof that every business task or recovery flow is
  complete.
- `./tools/test-rehearsal.ps1` passed on `demo-wsb`: API role isolation,
  payment replay/refund, stage progression, locked-score/publication recovery,
  synthetic music upload/review/export, draft-policy denial/replay, content
  integrity, outbox and the local accessibility/public-projection browser gate.
  Its own completion notice correctly keeps actual music compliance, guardian
  authority and a complete event rehearsal open.
- The same 390px Chrome 148 session loaded 384,386 encoded script bytes when
  motion was allowed and 333,847 with reduced motion, a 50,539-byte motion
  chunk omitted. The test also confirms a saved “motion off” preference omits
  that chunk. This is homepage lab evidence, not field performance.
- In the reduced-motion profile, the final clean-build cold loopback capture
  measured 580ms LCP, 0.00017 CLS and 497,057 encoded bytes. A synthetic 150ms /
  1.6Mbps down / 0.6Mbps up / 4x CPU profile measured 1,244ms LCP, 0.00017 CLS
  and 496,696 bytes; warm runs were 36ms/608ms LCP with 12,962 bytes. Results
  vary between local runs; use these as lab observations, not service-level
  claims.
- The parser worker integration suite passed 3/3 synthetic PDF/PNG/size cases;
  Rust formatting and prior all-feature checks passed. This machine is Windows,
  so the Linux-only `rlimit` branch and deployed-container exhaustion behavior
  still require the Linux CI/release environment.

The browser checks ran locally against the production standalone output. A
hosted CI result, complete end-to-end business journeys, actual
assistive-technology or browser-zoom session, Linux
parser resource-exhaustion test, real device, and production deployment were
not performed. The open work at the end of this file is limited to those
verification gaps, unfinished product workflows and external release gates;
the numbered findings remain tracked until their stated acceptance is met.

### Implementation follow-up — 2 November 2026

Checkpoint commit: `7b573d2` (audit, serialized/validated public display refresh,
root/global error boundaries, CI unit checks, scoped marketing motion CSS and
crew workspace copy/navigation). Continued afterward with serialized marshal
status polling and a reproducible synthetic display browser regression.

Verified: production web build and typecheck passed; four stage recovery unit
tests and eight existing outbox tests passed. `tests/public-stage-browser.cjs`
passed at 390px and 1365px against the production build, retaining a confirmed
crew through malformed JSON shape and recovering on the next valid response
without page exceptions. No real Firebase or payment request was involved.
The later marshal polling change passed typecheck; its signed interaction was
not browser-tested. Error boundaries compile, but deliberate render exceptions
and offline command recovery through those boundaries still need verification.

F04/F05 have implemented public-display fixes and direct regression evidence;
F06 has implementation/build evidence; F08/F10/F11 are partial improvements.
The numbered findings below remain the original baseline. F01–F03, parser
isolation, complete browser CI, performance baselines, asset/cache lifecycle,
public metadata and full accessibility/release verification remain open.

### Continued audit — 2 November 2026

This follow-up examined the current frontend source, bundled checks and the
running local production server. It did not alter application code. The audit
uses the confirmed WSB design context: street-dance participants and operations
staff work on phones, venue tablets and desktop consoles; the intended character
is defiant, collective and precise. That supports the existing charcoal/chrome/
volt system and does not support generic dashboard restyling.

The source review confirms that skip links, visible focus styling, semantic
labels and screen-reader status/alert output are widespread. The current
role/viewport suite also has meaningful coverage. However, neither an automated
accessibility scan nor a keyboard/screen-reader test is part of CI, so this is
evidence of implementation effort rather than WCAG conformance.

The public, sign-in and stage-display routes served successfully from the local
production server during the review. A real browser performance capture could
not be added in the current runtime, so this report continues to avoid LCP,
INP, CLS and transferred-byte claims. The static asset observations below are
file sizes or source behavior, not network-performance measurements.

### Accessibility and projection-boundary implementation follow-up — 2 November 2026

Implemented the audit's first frontend enforcement slice:

- The skip link now transfers keyboard focus to `#main-content`, rather than
  only moving the viewport.
- A CI contract verifies skip-link/focus styling, minimum primary-control size,
  both error boundaries and the separation of the published arena route from the
  fictional arena preview.
- A local Playwright audit script covers keyboard skip navigation, labelled sign-in
  controls, 390px/320px reflow and the public arena projection boundary. It is
  invoked by the local rehearsal script where Playwright is available.
- The root error boundary now provides a self-contained dark WSB recovery surface
  with an alert landmark and 56px retry control, so it remains usable if the
  regular theme fails to load.

`npm run build`, `npm run typecheck`, the new two-case contract test, the
existing four public-stage tests and eight outbox tests passed. The live-browser
audit first identified the skip-link focus defect and drove its repair. It then
passed against the rebuilt standalone app at 390px and 320px, including keyboard
focus transfer, labelled sign-in fields, overflow checks and an unpublished
public-arena projection. The standalone check copied its static assets before
serving; it does not replace a Docker-stack or assistive-technology rehearsal.

**WSB is a substantial, working local competition platform, but it is not ready to operate a real competition end to end.** Registration, private evidence review, manual finance, synthetic checkout, judging/outbox recovery, stage operations, support and published results have meaningful local implementation and recorded tests. Several critical workflows remain unavailable, and official policy, provider and production evidence is incomplete.

The most valuable next investment is completing and proving one approved event journey, supported by targeted reliability and interface improvements. Additional decorative effects will not resolve the current release blockers.

Three different claims must remain separate:

1. **Implemented:** code exists and is reachable in its supported runtime.
2. **Verified locally:** a named synthetic scenario passed; this does not establish every edge case.
3. **Ready for live use:** approved rules, real identity/provider integration, deployment, privacy operations and event rehearsal all pass. This claim is not currently supported.

There are **128 `page.tsx` files** and **31 tracked tasks: 14 done, 14 in progress, 3 todo**. These are inventory counts, not a completion percentage. The `registration` task's “done” acceptance covers synthetic eligibility/consent states, while its title says “Crew onboarding and consent”; actual consent signing remains unavailable. The task graph reports no ready tasks, which does not mean no work remains.

The API explicitly returns HTTP 503 and `release_ready: false` from `readiness`, including when durable storage is reachable. Preserve that honest release gate until its criteria are met. The separately deployed guided role explainer is not a deployment of this application.

## 2. Evidence and limitations

### Fresh checks during this audit

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm run typecheck` | Passed again 3 Nov | Current web TypeScript consistency |
| `npm run build` | Passed 3 Nov | Production build; 66 static pages generated |
| `npm run test:outbox` | 8/8 passed 3 Nov | Queue/retry/account/receipt behavior covered by isolated tests |
| `node --test tests/accessibility-contract.test.cjs tests/public-stage.test.cjs` | 6/6 passed 3 Nov | Accessibility/source contracts plus stage schema, ordering, abort and hidden-view behavior |
| `npm run measure:public-performance` | Passed 3 Nov | Production-browser axe, keyboard, reflow, projection, motion, service-worker and local performance checks |
| Temporary production-build error-boundary probe | Passed 3 Nov | Synthetic route/root render failures, retry, safe fallback and queued IndexedDB record survival; fixture removed afterward |
| `npm run demo:roles` | 18/18 roles, 47 pages passed 3 Nov | Synthetic local role navigation, responsive overflow and authorization-denial checks against `demo-wsb` |
| `./tools/test-rehearsal.ps1` | Passed 3 Nov | Synthetic API/recovery, music, policy, content, outbox and local accessibility browser checks against `demo-wsb` |
| `node tests/audit-browser.cjs` | Passed 3 Nov after local web refresh | Axe, canonical/sitemap behavior for unconfigured local domain, keyboard focus, reflow and projection checks on the current local web source |
| `cargo test --locked -p wsb-api --all-features --test document_parser_process` | 3/3 passed in this continuation | Synthetic PDF/PNG parser worker acceptance, malformed input and size limit on Windows |
| `cargo fmt --all --check` | Passed 3 Nov | Rust source formatting |
| `python tools/workspace.py check` | Passed 3 Nov; retrieval index rebuilt | Workspace/task structure and skill checks; not business completeness |
| `python tools/workspace.py dag` | No ready tasks | Current dependency representation only |
| Source inspection | Completed | Runtime gate, unavailable pages, CI, stage polling, error handling, assets, navigation and offline cache behavior |

### Existing evidence reviewed, not rerun here

[Local role demonstration](role-demo-2026-11-02.md) records 18 visitor/account cases across 47 pages at 1365px and 390px, plus separate registration, valid-PDF verification, support, synthetic checkout and offline judging actions. It records API/recovery/music/policy/content checks and PDF regressions. Later entries in [status](../memory/status.md) record homepage and account-entry responsive checks, production web builds and hero-video recovery checks.

These are useful historical results, not a fresh full regression run of this dirty checkout. Some registration approval scenarios inject synthetic audio/consent metadata. They do not prove real eligibility, signing or provider settlement.

This continuation reran the web build, browser gate and homepage lab capture, plus the targeted parser-process test. It still did not run the full signed role suite, Linux resource-limit branch locally, production Firebase, real payments, load/venue-device rehearsal, field Web Vitals, a complete keyboard/screen-reader review or WCAG certification. Repository asset sizes are not browser transfer sizes.

Primary evidence: [architecture](architecture.md), [development](development.md), [open questions](open-questions.md), [prior implementation audit](implementation-audit-2026-10-30.md), [role rehearsal](role-workflow-rehearsal.md), [task manifest](../workflows/tasks.json), and the code linked below. Earlier audit sections are historical; later implementation supersedes their blanket “missing” statements.

## 3. What is done and what is not

“Local” below means a working implemented slice with recorded synthetic evidence, not complete production readiness.

| Area | Implemented / demonstrated | Still unfinished | Assessment |
| --- | --- | --- | --- |
| Foundation and storage | Next.js/TypeScript web, Rust API, Firestore repositories, Docker demo-wsb stack, transactions, receipts and recovery checks | Remaining durable route coverage, production provisioning, backup/restore and operational rehearsal | Strong local foundation |
| Accounts and chapter access | Account forms, chapter membership discovery, server-side current membership and assignment checks, HQ session boundary; local role denials | Live identity/revocation/email verification and complete provisioning/governance evidence | Local; production verification open |
| Crew registration | Native crew creation, invitations, roster membership, entry submission/review, lost-response recovery | Real policy-driven eligibility, entry substitutions/division changes/withdrawals and complete consent dependency | Core local journey works |
| Private evidence and guardians | Private upload/review, structural PDF and raster checks, scanning path, guardian request/response/withdrawal | Verified guardian authority, waiver signing, approved document policy, retention/deletion, parser isolation | Partial; sensitive-data release gated |
| Music | Upload, inspection, correction/review and DJ ZIP scenarios, draft policy controls | Approved event duration/deadline/lock rules, production media/scanner operation, live export readiness | Meaningful local slice |
| Payments | Integer minor units, split reservations, manual reconciliation/reversal, signed synthetic PayMongo settlement/replay | Controlled real provider validation, enabled account methods, unknown-outcome recovery, provider refunds/partial refunds, approved terms | Local only; no live-money certification |
| Event administration | Event drafts/windows/policy drafts, staff invitations/revocations/assignments, stage configuration, panel administration and lineup drafts | Approved event activation, fee/policy publication, generated/published order, remaining event settings | Partial administration |
| Judging | Assigned scorecards, versioned commands, durable locks/receipts, IndexedDB drafts/outbox, reconnect/conflict handling | Approved event rubric, precision, deductions, tie/correction rules and complete venue/device rehearsal | Strong local mechanics; policy gated |
| Venue operations | Online roster check-in, stage holding/on-deck/performing/completed flow, holds, persisted history and display projection | Signed QR credentials, scanner flow, offline admission/revocation reconciliation, incidents | Partial; not an offline venue system |
| Battles | Match drafts/configuration and authorized majority ballots | Approved bracket format/seeding/byes, tournament progression, corrections and advancement | Match primitives, not full tournament engine |
| Results | Locked immutable public projection, publication desk, public/participant result reads and scope checks | Corrections/republication, approved ties, detailed critiques/certificates, advancement and seasonal standings | Publication core works locally |
| Notifications and support | Native public/account inquiries, private conversation access, support replies, durable in-app record-linked notices | Push/email delivery, announcements, escalations, privacy/access-key lifecycle | Local inbox/support; delivery expansion open |
| HQ and publishing | HQ discovery, counts/read views, applications, integration/queue signals, private chapter content drafts | Global governance, separate editor/publisher roles, public chapter/rules/crew publishing and full content lifecycle | Partial HQ; not full global administration |
| Spectators and commerce | Public navigation, published results and limited stage display | Ticket/VIP products, inventory, digital tickets, timetable publication, authorized streams | Mostly deferred beyond public results/display |
| Privacy and operations | Fail-closed boundaries and explicit unavailable states | Account data-request workflow, approved retention, operational ownership, production restore/rollback and monitoring evidence | Release blocker |

Specific unavailable pages are explicit in source: [consents](../apps/web/src/app/(portal)/app/consents/page.tsx), [privacy](../apps/web/src/app/(portal)/app/privacy/page.tsx), [passes](../apps/web/src/app/(portal)/app/passes/page.tsx), [tickets](../apps/web/src/app/(portal)/app/tickets/page.tsx), [entry changes](../apps/web/src/app/(portal)/app/entries/[entryId]/changes/page.tsx), [incidents](../apps/web/src/app/(console)/console/[eventId]/incidents/page.tsx), [event reports](../apps/web/src/app/(admin)/admin/[chapterId]/events/[eventId]/reports/page.tsx) and [advancement](../apps/web/src/app/(admin)/admin/[chapterId]/events/[eventId]/advancement/page.tsx). Their presence in navigation is not implementation evidence.

## 4. Professional interface assessment

The source-level anti-pattern assessment is **provisionally positive**: the existing WSB brand, display typography and dark/volt system are intentional and grounded in the [design context](../.impeccable.md). They should be preserved. This audit does not make a fresh rendered-page aesthetic verdict.

The following are conservative review scores, not Lighthouse scores or compliance certifications. Untested interactions cap confidence.

| Dimension | Score / 4 | Basis and limitation |
| --- | --- | --- |
| Accessibility | 2 | Skip link, global focus indicators, semantic forms and status messages exist; comprehensive keyboard, zoom, assistive technology and contrast validation remains unproven |
| Performance | 2 | Next Image and preference-aware video fallbacks exist; large source assets, global styles/fonts and overlapping polling warrant measurement and adjustment |
| Responsive design | 3 | Recorded 320–1440px coverage for selected surfaces and phone/desktop role coverage; complete authenticated zoom/tablet/long-content coverage is not established |
| Theming | 3 | Strong semantic palette and typography; central stylesheet and shared defaults need surface-specific review |
| Visual consistency / anti-patterns | 3 | Distinct brand and restrained operational intent; preview links and development-history prose still appear in everyday workspaces |
| **Total** | **13/20** | **Provisional: substantial professionalization work remains** |

Do not replace this estimate with a higher number solely because a build passes. Re-score after rendered interaction and accessibility checks.

### Strengths to retain

- Server-derived authority, chapter isolation and published-only result reads.
- Idempotent commands and visible recovery/conflict states rather than fabricated success.
- Explicit distinction between locally queued scores and server acknowledgement.
- Narrow service-worker caching that avoids private API responses and participant documents.
- Branded account entry and event-focused homepage with recorded reduced-motion and narrow-screen coverage.
- Honest unavailable states instead of fictional metrics, tickets, rules or standings.

## 5. Prioritized findings

Severity describes impact on the intended full-system release: **P0 blocks live scope; P1 is major reliability/verification work; P2 is focused usability/efficiency work; P3 is polish.** Release blockers below are not claims of newly discovered exploits.

Current inventory: **3 P0, 6 P1, 7 P2, 2 P3** findings. F04/F05 now have an
implemented fix and direct regression evidence; they remain listed until their
broader production/display scenarios are tested.

### F01 — P0: Event policy and consent are not ready for live enforcement

- **Evidence:** [open questions](open-questions.md); consent unavailable page; [pilot scope](pilot-scope.md). The Dubai 2026 source is not approval for Manila/HK 2027, and the proposed five-part scoring model differs from that source.
- **Impact:** A technically successful entry or score can still be invalid under the actual event's rules. Guardian confirmation does not establish authority to sign.
- **Adjustment:** Obtain dated event-specific approvals, model effective policy versions, implement signer authority and consent records, and connect these to readiness checks. Never treat drafts or fixtures as approved policy.
- **Owner / acceptance:** Competition owner plus backend team; one approved event configuration passes eligible/ineligible, missing-consent, revoked-authority and policy-version scenarios.

### F02 — P0: Live commercial and production operation remain unverified

- **Evidence:** [architecture](architecture.md), [role demonstration](role-demo-2026-11-02.md), [API readiness](../apps/api/src/main.rs), provider questions.
- **Impact:** Simulated checkout and database reachability do not establish real settlement, refund recovery or safe operation during an event.
- **Adjustment:** Validate provider test-account contracts and recovery; configure production identity/IAM, storage, scanner, indexes and secrets; rehearse deployment/rollback and backup restoration. Make release criteria explicit before changing readiness.
- **Owner / acceptance:** Finance, backend and operations; evidence includes duplicate/out-of-order events, provider timeout/unknown outcome, revoked identity, restore consistency and rollback. Live funds remain disabled until sign-off.

### F03 — P0: Full paperless event scope has missing workflows

- **Evidence:** Capability inventory and explicit unavailable pages above; [battle rules](open-questions.md#bgone-battle-progression).
- **Impact:** Staff still need external/manual procedures for admission credentials, incidents, consent, advancement and other promised capabilities.
- **Adjustment:** Complete these as separately testable slices; record any organizer-approved pilot exclusions. A reduced pilot must not be described as the completed full platform.
- **Owner / acceptance:** Product/competition owner and engineering; every in-scope role completes its journey and exception recovery in a single event rehearsal with no silent manual substitute.

### F04 — P1: Public stage refreshes can overlap and roll back displayed state

- **Location:** [public-stage-display.tsx](../apps/web/src/components/public-stage-display.tsx) and [public-stage.ts](../apps/web/src/lib/public-stage.ts).
- **Evidence:** The original interval allowed overlapping requests. Polling now schedules only after completion, validates before publishing, retains last confirmed state on rejection, aborts on unmount/event change, skips hidden tabs and exponentially backs off failures. The four unit cases and a synthetic production-browser outage/recovery test cover invalid payloads, no overlap, cancellation, hidden views and return to valid data; the browser case is now part of the CI production-browser runner.
- **Impact:** The original stale-response regression is addressed for the public display. Similar operational routes and real display/API traffic have not had a full production profile.
- **Adjustment:** Keep one in-flight request, preserve confirmed data, and retain bounded retry behavior. Review polling on staff workspaces separately; do not add jitter without a measured need.
- **Acceptance:** Stage unit tests and the browser outage/recovery case pass at 390px and 1365px using synthetic event responses. Real published-event, multi-client outage/load and venue-device behavior remain open.

### F05 — P1: Live display payloads are cast, not validated

- **Location:** [public-stage-display.tsx](../apps/web/src/components/public-stage-display.tsx) and [public-stage.ts](../apps/web/src/lib/public-stage.ts).
- **Evidence:** Network JSON is parsed from `unknown` into an allow-listed published projection, with bounded label lengths, required flags/timestamp, row validation and a 100-performer limit. Null, wrong-type arrays, malformed rows, invalid timestamps, extra fields and unpublished responses are covered by unit/browser checks. The public display retains its last confirmed crew during invalid responses and recovers on the next valid response without a page exception.
- **Impact:** The reported cast/render failure is addressed for the public arena route. Other public dynamic projections still need equivalent schema and publication tests.
- **Adjustment:** Keep explicit allow-listed projection parsing at the network boundary and add schema tests whenever a public field changes.
- **Acceptance:** Contract and stage tests pass; synthetic outage/recovery passes in the production-browser gate. A genuinely published event and other projection routes remain to be exercised.

### F06 — P1: Custom error page is not a route error boundary

- **Location:** Root route [error boundary](../apps/web/src/app/error.tsx), [global error boundary](../apps/web/src/app/global-error.tsx), and the standalone `/error` page.
- **Evidence:** The root route boundary now catches render errors beneath the root layout; the global boundary covers root-layout failures. Both offer retry and offline-workspace/account navigation without printing error payloads. The copy asks users to check saved or queued status before retrying.
- **Impact:** A boundary can still regress or lose user context if retry and saved-work recovery are not exercised during real render failures.
- **Adjustment:** Keep route and root recovery independent of request error screens and verify queued-command survival through deliberate exceptions.
- **Acceptance:** A temporary production-build probe forced route and root render failures and verified both fallbacks, retry and synthetic queued-record persistence at phone/desktop sizes. The fixture was removed after verification. Rehydrating a real authenticated score operation after failure and deployment behavior remain open.

### F07 — P1: File parsing has capacity limits but not process isolation

- **Location:** [verification.rs](../apps/api/src/verification.rs), `DOCUMENT_SUBMISSION_SEMAPHORE`, parser worker and PDF budget filter; [private verification](private-verification.md).
- **Evidence:** The initial single-slot submission/parser controls and estimated object budgets were insufficient because `spawn_blocking` could outlive its timeout. PDF and JPEG/PNG parsing now runs in a separate child process with bounded stdin and no inherited environment. Linux workers receive a 512 MiB address-space limit and 20/25-second CPU soft/hard limits; the parent enforces a 30-second killable wall deadline. The PDF object's 24 MiB accounting is still estimated, image decoder allocation limits are best-effort, and this is not a namespace/seccomp sandbox.
- **Impact:** A pathological file can monopolize local capacity or pressure the API process. Increasing concurrency without isolation could worsen it.
- **Adjustment:** Keep parsing isolated and single-flight; exercise Linux resource limits with hostile synthetic input, measure API responsiveness and verify the production container's limit behavior before evidence collection.
- **Acceptance:** Child-process tests cover valid, malformed and oversized PDF/raster samples. Release closure still requires resource-exhaustion tests under the deployed Linux container and an ordinary-command responsiveness check; scanner failure stays fail-closed.

### F08 — P1: CI does not enforce the full demonstrated user journey

- **Location:** [ci.yml](../.github/workflows/ci.yml), [test-rehearsal.ps1](../tools/test-rehearsal.ps1), [package.json](../package.json).
- **Evidence:** CI now runs typecheck, outbox and stage unit tests, accessibility/public-projection contracts, a production Playwright browser gate with serious/critical axe checks, keyboard skip navigation, sign-in labels, responsive reflow, public-stage recovery, motion fallbacks and offline service-worker upgrade persistence. A fresh local `npm run demo:roles` passed 18 synthetic roles across 47 pages, with no desktop/mobile overflow and expected 401/403 permission denials. `./tools/test-rehearsal.ps1` also passed its demo-wsb API/recovery, music, policy, content, outbox and accessibility checks. These local suites are not part of hosted CI and do not complete approved policy, identity-evidence decisions, actual music compliance, guardian authority or a whole event across every role.
- **Impact:** A source build or API test can pass while a production-critical screen or recovery action regresses.
- **Adjustment:** Add a short deterministic browser gate for the primary journey, outbox and critical denial cases; put broader role, recovery and device coverage in scheduled/release runs. Retain synthetic-only fixtures and useful failure artifacts.
- **Acceptance:** An intentional UI authorization/navigation/outbox regression fails CI. Record tested commit/build and environment for each release candidate.

### F09 — P2: Branding/media need a measured delivery budget

- **Evidence:** `dance-hero.png` is 2,035,125 bytes, `wsb-logo.png` 556,191 bytes, `wsb-logo-white.svg` 742,169 bytes on disk. Production-browser captures identify the remote YouTube poster as the actual LCP element at 34,750 encoded bytes; the hero was visually stable. The standalone image optimizer initially omitted Sharp's native runtime files; tracing was corrected in `next.config.ts` before the accepted capture. The SVG was not found referenced in web source, so it is not counted as current page transfer.
- **Impact:** Source size creates optimization opportunities, but optimized transfer and image cache behavior must be measured before asserting a load bottleneck.
- **Adjustment:** Inspect actual image requests at phone/tablet widths, supply appropriately sized modern derivatives, optimize the logo while preserving its exact white treatment, reserve dimensions and preload only critical artwork. Keep the hero muted, decorative and non-interactive with motion/data preference fallbacks.
- **Acceptance:** Final clean-build 390px reduced-motion lab run: cold loopback 497,057 bytes, 580ms LCP and 0.00017 CLS; warm 12,962 bytes and 36ms LCP. Under synthetic 150ms/1.6Mbps/0.6Mbps/4x CPU conditions it measured 496,696 bytes, 1,244ms LCP and 0.00017 CLS; warm measured 12,962 bytes and 608ms LCP. Motion-enabled script transfer was 384,386 bytes versus 333,847 with reduced motion; the omitted dynamic chunk was 50,539 bytes. The actual poster was 34,750 bytes, below the proposed 200 KB phone budget. These are local lab results, not field Web Vitals or real-device evidence; tablet, route-wide and venue-device runs remain open.
- **Suggested command:** `/optimize`.

### F10 — P2: Operational UI still exposes development history

- **Location:** [workspace-shell.tsx](../apps/web/src/components/workspace-shell.tsx); communications, incidents, reports and advancement pages.
- **Evidence:** The crew workspace keeps preview navigation inside the explicit sample route and labels the regular shell as a development/demo environment. Repair-history copy was removed from incidents, penalties, reports, advancement, entry changes, HQ content, event communications/settings/fees. `WorkspaceAccess` fetches current server-backed chapter memberships, shows the selected chapter and assigned role, paginates other memberships, and routes to role-appropriate workspaces. The event-duty selector checks current access; an authorized assignment notice can return to its validated chapter/event context. A fresh `npm run demo:roles` passed 18 roles/47 pages at desktop and phone widths with expected denials. Ordinary workspaces still lack a verified current event and an event-specific next-action summary.
- **Impact:** Participants need their next action, event and support contact. Internal implementation history made the product feel unfinished; event context can still be hard to find after entering a generic role workspace.
- **Adjustment:** Keep an unmistakable local/demo banner and keep repair history in documentation. Add a verified event context and role-specific task summary where the selected assignment supports it, with clear blocked reasons. Do not hide readiness blockers behind reassuring copy.
- **Acceptance:** Chapter/role selection and server rechecks exist, and the route-level role demo passed. A task-completion walkthrough is still needed to check whether managers, reviewers, finance, judges and marshals can locate the correct event, next action and help without development explanations. Unavailable actions must never imply submission or payment success.

### F11 — P2: Styles and loading resources need surface separation

- **Location:** [root layout](../apps/web/src/app/layout.tsx), [theme.css](../apps/web/src/app/theme.css).
- **Evidence:** Hero motion CSS is imported from the marketing route-group layout, so console and portal routes do not import that stylesheet. The GSAP/ScrollTrigger/Lenis engine is dynamically loaded only after motion is allowed; reduced-motion and saved “motion off” browser profiles skip its 50,539-byte transferred chunk. Shared primary `.button` controls have a 56px minimum; text links remain 44px where they are secondary navigation. Theme CSS and font faces are still shared globally, and a route-by-route dependency trace has not been recorded.
- **Impact:** Global coupling increases review/regression cost; marketing resources may add unnecessary operational work. Venue targets need verification against the project's 56px primary/48px auxiliary standard.
- **Adjustment:** Profile route bundles and computed controls, move marketing-only styling to its layout, subset/fonts by actual need, and consolidate operational control/state tokens. Avoid speculative memoization or adding a state library without profiling.
- **Acceptance:** Console/portal dependency traces contain no marketing motion engine; all measured operational targets meet the project standard; route CSS/JS bytes do not increase and visual regressions pass.

### F12 — P2: Offline shell upgrade/cache lifecycle needs release testing

- **Location:** [sw.js](../apps/web/public/sw.js), [build id route](../apps/web/src/app/build-id/route.ts), and offline workspace preparation.
- **Evidence:** The worker now uses a build-specific cache, removes obsolete offline caches on activation, and gets its version from a no-store build-ID endpoint. A synthetic browser upgrade test activates A then B, verifies old-cache cleanup and retains a queued IndexedDB operation. Private traffic remains excluded.
- **Impact:** Over repeated releases, old chunks can accumulate; upgrade behavior while judges have queued work is not established by initial offline preparation alone.
- **Adjustment:** Use a controlled build/cache lifecycle, retain safe compatibility while commands are pending, and remove obsolete shell/assets after safe activation. Never cache private responses as a shortcut.
- **Acceptance:** Build A-to-B cache cleanup and queued-operation persistence pass synthetically. Actual offline reopen/reconnect with a server receipt, storage eviction and venue-device behavior remain release checks.

### F13 — P2: Completion reporting mixes prototype acceptance with full capabilities

- **Location:** [tasks.json](../workflows/tasks.json), task `registration`; historical sections of architecture/development/status.
- **Evidence:** The done task explicitly accepts synthetic consent states; the current actual consent route is unavailable. Older documents include superseded “not implemented” statements alongside later additions.
- **Impact:** Stakeholders can reasonably overestimate completeness or repeat already-finished work.
- **Adjustment:** Separate implemented slice, verified evidence and live approval in the task model; use one capability matrix as the current summary. Split large blocked domains into independently actionable work without bypassing policy dependencies.
- **Acceptance:** The active task now tracks F01-F18, with evidence and an explicit distinction between code completion and approvals. Consent signing stays open. The task remains in progress because it still depends on external policy, provider, privacy and release evidence; no historical task status is silently rewritten.

### F14 — P3: Public discovery and install metadata need a final pass

- **Evidence:** The app now generates a site-base-aware sitemap and robots file, uses noindex as the root default with public marketing pages explicitly indexable, adds static public canonical metadata, and keeps event/crew/policy/story/preview and private pages out of indexing until publication is established. The manifest now includes generated 192px, 512px and maskable WSB icons derived from the supplied logo. A real domain and approved social-share artwork are not configured.
- **Impact:** Public sharing/discovery and install presentation are less deliberate than the visual branding. Missing sitemap alone is not a functional failure.
- **Adjustment:** Supply route-specific metadata/canonical/share images for published public content, intentionally exclude private/preview routes from indexing, and provide verified install icon sizes/maskable treatment. Indexing controls are not access control.
- **Acceptance:** Local browser checks verify canonical URLs, crawler boundaries, sitemap routes and all install-icon assets. Real-domain link previews, brand-owner image approval and device installation still need release review; indexing controls do not replace server authorization.

### F15 — P1: Accessibility evidence is not part of the release gate

- **Location:** [CI workflow](../.github/workflows/ci.yml), browser suites under [tests](../tests), and global [theme styles](../apps/web/src/app/theme.css).
- **Evidence:** CI now scans the homepage, sign-in, registration preview and unpublished arena for serious/critical axe findings; it checks keyboard skip-link focus, sign-in labels, narrow reflow at 320/390px and a 683px effective-width proxy for a 200% zoom layout. It does not cover all authenticated roles, contrast calculations, actual browser zoom or a screen-reader session.
- **Impact:** Good foundations can still fail for a keyboard-only user, a screen-reader user or a judge using browser zoom in a dark venue. A typecheck cannot identify those failures.
- **Recommendation:** Extend the deterministic gate through signed registration, judging, marshal and error recovery, then record manual screen-reader and actual browser zoom sessions. Treat axe as a supplement to human review.
- **Acceptance:** Current CI blocks on serious/critical violations for its named public and synthetic routes. Full signed critical flows, screen-reader evidence and actual 200% zoom remain open.
- **Suggested command:** `/harden`.

### F16 — P2: Homepage media can bypass Next image optimization

- **Location:** [hero highlights](../apps/web/src/components/hero-highlights.tsx), line 88.
- **Evidence:** The highlight poster remains remote and unoptimized, but the browser capture identified it as the actual LCP element at 34,750 bytes. Latest reduced-motion cold transfer is 497,057 bytes loopback and 496,696 bytes under the synthetic constrained profile; warm transfer is 12,963 bytes. A motion-enabled/reduced-motion same-build comparison attributes a 50,539-byte script difference to the lazy motion chunk. INP and real network/device behavior are unknown.
- **Impact:** On constrained mobile connections, a remote external poster can become a significant early request without the resizing, caching and format control used for local Next Image assets. `priority` should be reserved for a confirmed first viewport LCP candidate.
- **Recommendation:** Measure public-page resource waterfalls first. Then choose an approved locally managed poster derivative or keep the remote poster only with explicit low-bandwidth behavior, accurate dimensions and an intentional preload decision. Do not replace the existing decorative, muted-video preference with a heavier visual effect.
- **Acceptance:** The local 390px run identified the LCP element and measured a 34,750-byte poster with CLS below 0.001 while reduced motion was enabled; browser regression checks confirm YouTube is not requested for reduced-motion or data-saving profiles and the poster fallback remains visible. A locally managed poster derivative, route-wide measurement and real-device evidence remain open.
- **Suggested command:** `/optimize`.

### F17 — P2: Preview components remain easy to confuse with production screens

- **Location:** [arena preview component](../apps/web/src/components/arena-display.tsx), [preview notice](../apps/web/src/components/ui.tsx), and public demo routes.
- **Evidence:** The preview component renders fictional Manila content and labels itself as a preview. This is appropriately disclosed in its own UI, but it sits beside real public-display components and shares visual primitives and media.
- **Impact:** Future route or navigation changes can expose fictional content where an organizer or spectator expects a published projection. Similar-looking surfaces increase review burden.
- **Recommendation:** Keep preview-only modules and routes visibly isolated, use a clear route-level development marker, and add regression assertions that production public routes never render fixture labels or fictional standings.
- **Acceptance:** CI now checks that unpublished event and results pages contain no preview crew, the live arena shows its unpublished state without fixtures, and the explicitly named `/arena-live/demo` route carries its fictional-data notice. A signed/published event regression remains in the broader release rehearsal.
- **Suggested command:** `/harden`.

### F18 — P3: Fatal-error presentation bypasses the design system

- **Location:** [global error boundary](../apps/web/src/app/global-error.tsx).
- **Evidence:** The dependency-light root fallback uses the WSB name, charcoal/volt treatment, high-contrast copy, a 56px retry target and recovery guidance without exposing exception details. Route-level `error.tsx` supplies the same honest saved/queued guidance. A temporary production-build probe forced both route and root-layout errors, checked the fallback copy/target and retry, and preserved a synthetic IndexedDB command through retry/reload. The test fixture was removed afterward.
- **Impact:** A failure during a high-stress operational moment presents a generic page instead of the same clear WSB recovery language seen elsewhere.
- **Recommendation:** Define a dependency-light fatal-error style with the same readable dark surface, contrast, control size and wording as the product. It must continue to render even if theme CSS fails.
- **Acceptance:** Synthetic route/root failure, retry, and queued IndexedDB record checks pass at 390px and 1365px. Authenticated score rehydration and hosted/deployed error recovery remain release checks.
- **Suggested command:** `/polish`.

## 6. Targeted optimization and adjustment plan

These are proposed acceptance targets, not measured results or guaranteed delivery dates.

| Order | Work package | Concrete output | Exit check | Current status |
| --- | --- | --- | --- | --- |
| 1 | Make readiness reviewable | Capability matrix; assign each blocker an owner; separate code work from external decisions | No ambiguous “done” claim for a partially implemented live capability | Matrix, gates and task evidence are present; named event/provider/privacy owners are not established in this workspace |
| 2 | Fix display/recovery defects | Serialized/validated public polling and actual route error boundaries | Out-of-order, malformed-data, timeout and render-error tests pass | Public-stage browser regression passes; route/root boundaries build, but forced-error and queued-score recovery rehearsal remains |
| 3 | Establish quality gates | Primary browser journey, outbox, authorization denials and accessible interaction checks in CI | Evidence is tied to a reproducible build | Local production browser, axe, contracts, outbox and stage checks pass/configured; hosted CI and complete authenticated role journeys remain |
| 4 | Measure and reduce startup cost | Route-by-route asset/CSS/JS and mobile performance baseline, optimized branding/posters | Compare cold and warm runs; no loss of fallback/navigation behavior | Homepage cold/warm/constrained lab and 50.5 KB motion split verified; other routes, field devices, poster ownership and INP remain |
| 5 | Professionalize daily workflows | Role-specific navigation, verified chapter/event context, concise state/recovery copy, consistent operational controls | Manager, reviewer, finance, judge and marshal complete representative tasks without development explanations | 18-role/47-page desktop and phone route demo passes; task comprehension and verified event/next-action summary remain |
| 6 | Complete approved event workflows | Versioned rules, authority/consent, provider recovery and remaining selected pilot features | Positive and negative end-to-end cases pass against approved configuration | Open: scope/rulebook, consent/guardian authority, real provider and incomplete workflows require authorized decisions and code |
| 7 | Prove venue and production operation | Realistic device/outage/load rehearsal; constrained parsing; monitoring, restore and rollback procedures | Named operators recover an interrupted event and reconcile commands/financial states | Synthetic parser isolation and cache/outbox checks pass; Linux/container limits, venue devices, monitoring, restore and production rehearsal remain |
| 8 | Final public/visual polish | Public metadata, install icons, typography/spacing and stale/unavailable messaging | Repeat browser/accessibility/performance audit and obtain release sign-off | Metadata, crawler boundaries, icons, reflow and motion fallbacks are locally checked; production domain/share art/installation and human accessibility review remain |

### Remaining work, in order

1. Run CI on the hosted runner and integrate the signed registration/judging/marshal, authorization-denial, and deliberate route/root error recovery journeys, including authenticated queued-score rehydration (F06, F08, F15, F18). Local synthetic route/root failure and IndexedDB persistence checks have passed.
2. Run Linux parser resource-exhaustion and API-responsiveness checks inside the intended container; verify scanner fail-closed behavior (F07).
3. Complete task-focused walkthroughs with approved chapter/event assignments and test actual device zoom, keyboard and screen-reader operation (F10, F15). The 18-role route demonstration passed, but it measures route availability and permission boundaries rather than task comprehension.
4. Capture route-by-route tablet/desktop/mobile waterfalls and field Web Vitals; decide whether the externally sourced poster should be replaced only after source/brand approval (F09, F11, F16).
5. Repeat published-versus-unpublished projection tests with a genuinely authorized published event (F17).
6. Assign accountable owners and close event rules, consent/guardian authority, payments, privacy, production hosting, backups, monitoring and venue operations before claiming live readiness (F01-F03 and F13).
7. Configure an approved production domain/share image and verify installation on target devices (F14).

Local implementation and repeatable browser evidence now cover several of the
original “next” items. The remaining list is intentionally explicit: changing
production rules, identity/payment behavior or indexing destinations without
approved values would create unsupported product claims or release risk.

### Performance baseline to capture

- Public homepage, event discovery, sign-in, crew/entry workspace, scorecard, marshal desk and public stage display.
- Cold/warm cache; mid-range phone and venue tablet; normal and degraded connections; reduced motion/data saving; foreground/background tabs.
- LCP, INP, CLS, transferred bytes by type, long tasks, route navigation duration, failed/overlapping requests and image cache behavior.
- Server request percentiles, Firestore reads/writes per operation, transaction contention/retries, notification queue age, parser queue wait/memory and interrupted export behavior.
- Increase users and concurrent score submissions to an organizer-agreed peak, then add headroom. No supported concurrency number can be claimed from the current evidence.

Use **LCP <=2.5 seconds, INP <=200 ms and CLS <=0.1 at the 75th percentile** as the published Web Vitals targets; keep lab and real-user measurements separate. Source: [Google Web Vitals guidance](https://web.dev/articles/vitals). For operational actions, agree an additional server-acknowledgement objective from measured venue conditions; visual feedback and durable acceptance are separate timings.

### Accessibility and usability acceptance

- Complete registration, evidence review, payment reconciliation, judging and stage actions using a keyboard; check focus after errors, pagination and modal transitions.
- Test screen-reader labels/errors/status announcements and validate computed text/control contrast. Do not infer accessibility from a dark palette or the existence of ARIA.
- Verify 200% zoom, narrow-screen reflow, long crew names, validation messages and translated labels without lost actions.
- Measure console targets against the project's 56px primary/48px auxiliary standard and score-slider ergonomics.
- Preserve reduced-motion behavior, visible focus, honest saved/queued/accepted states and safe recovery after account/chapter changes.

Suggested UI workflow sequence: `/harden` for F04–F06 and F12, `/optimize` for F09/F11, `/clarify` for F10, `/adapt` for measured venue/zoom issues, `/normalize` for shared controls, `/audit` to recheck, then `/polish`. These are optional implementation workflows; this report does not execute them. They can be requested individually or together.

## 7. Definition of a professional release

- [ ] Named event owner approves scope, event policy versions, commercial terms and responsible roles.
- [ ] All required participant, staff and spectator journeys work in the supported deployment; explicit exclusions are agreed rather than disguised as finished features.
- [ ] Identity revocation, tenant boundaries, duplicate commands, stale revisions, locks and unpublished-data denials pass on the release candidate.
- [ ] Consent/guardian authority and privacy/retention operations are implemented and approved for actual data collection.
- [ ] Provider settlement/refund/reconciliation and unknown-outcome recovery are verified before real money is enabled.
- [ ] Offline judging, multi-tab/account changes, reconnect conflicts and application upgrades preserve pending work; venue offline admission is separately verified if included.
- [ ] Public screens use only approved projections and withstand malformed responses, outages and delayed requests.
- [ ] Keyboard, screen reader, zoom, phone/tablet and reduced-motion checks pass for critical workflows.
- [ ] Performance/capacity budgets are measured against realistic users and data volumes.
- [ ] Monitoring, operator alerts, backup restore, deployment rollback and full event rehearsal have dated evidence.
- [ ] A final readiness decision references the exact tested build; the API release gate changes only after those requirements are satisfied.

No application domain is newly marked complete by this audit. The immediate engineering priorities are display correctness, error recovery and repeatable quality gates; official policy and production/provider approvals should progress alongside them.

### Additional continuation — 3 November

The workspace now offers server-verified event assignments and role-specific next actions; the local 18-role walkthrough passed with phone-width checks. A signed production browser rehearsal recovered a queued synthetic score after offline reload and obtained a server receipt. It then revealed stale session error text after reconnect; session verification now retries on the online event and typecheck passes. Repeat the complete production browser scenario before closing recovery acceptance. The CI configuration includes this signed browser path, pending a hosted run.

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
