# WSB overall implementation and professional-readiness audit

Date: 2 November 2026 (Asia/Manila)  
Scope: current working checkout, including uncommitted implementation changes.  
Deliverable: assessment and prioritized work plan; no application fixes or deployments performed.

## 1. Executive assessment

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
| `npm run typecheck` | Passed | Current web TypeScript consistency |
| `npm run test:outbox` | 8/8 passed | Queue/retry/account/receipt behavior covered by the isolated tests |
| `python tools/workspace.py check` | Passed | Workspace/task structure and skill checks; not business completeness |
| `python tools/workspace.py dag` | No ready tasks | Current dependency representation only |
| Source inspection | Completed | Runtime gate, unavailable pages, CI, stage polling, error handling, assets, navigation and offline cache behavior |

### Existing evidence reviewed, not rerun here

[Local role demonstration](role-demo-2026-11-02.md) records 18 visitor/account cases across 47 pages at 1365px and 390px, plus separate registration, valid-PDF verification, support, synthetic checkout and offline judging actions. It records API/recovery/music/policy/content checks and PDF regressions. Later entries in [status](../memory/status.md) record homepage and account-entry responsive checks, production web builds and hero-video recovery checks.

These are useful historical results, not a fresh full regression run of this dirty checkout. Some registration approval scenarios inject synthetic audio/consent metadata. They do not prove real eligibility, signing or provider settlement.

This audit did **not** rerun the full browser or Rust suites, build the application, contact a real Firebase project, move money, run a load test, measure field Web Vitals, perform a complete keyboard/screen-reader review or certify WCAG conformance. Performance opportunities below are source-based unless explicitly measured. Repository asset sizes are not browser transfer sizes.

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

Inventory: **3 P0, 5 P1, 5 P2, 1 P3** findings.

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

- **Location:** [public-stage-display.tsx](../apps/web/src/components/public-stage-display.tsx), lines 16–31.
- **Evidence:** `setInterval` starts a fetch every 5 seconds, while each request can run for 8 seconds. `alive` prevents writes after effect cleanup but does not order responses within the same event. There is no visibility pause or single-flight guard.
- **Impact:** On a slow connection a later request can finish first, then an older response can replace it. Every viewer also generates up to 12 refreshes/minute before failures; 1,000 continuously open displays would imply about 200 requests/second, not necessarily 200 database reads/second.
- **Adjustment:** Schedule the next poll after completion, cancel on event change/unmount, reject obsolete responses, pause hidden views where appropriate and apply failure backoff/jitter. Preserve an accurately timestamped last-confirmed state.
- **Acceptance:** Controlled reverse-order responses never regress the display; one in-flight request per view; hidden-tab and outage tests show bounded traffic. Review similar five-second polling in `stage-workspace.tsx`.

### F05 — P1: Live display payloads are cast, not validated

- **Location:** [public-stage-display.tsx](../apps/web/src/components/public-stage-display.tsx), lines 9, 22 and 42–43.
- **Evidence:** JSON is asserted as `Projection`, then `performers.length` and `performers.map` are used. TypeScript assertions do not validate network data.
- **Impact:** A malformed response can crash the public display or render invalid event/performer labels. This is a resilience defect, not evidence of a private-data leak.
- **Adjustment:** Validate published state, allowed fields, label types/lengths, array shape and timestamp; retain the last valid projection on rejection. Follow the existing published-result validation pattern.
- **Acceptance:** Null, wrong-type performer arrays, malformed rows and invalid timestamps produce a useful unavailable/stale state with no render exception.

### F06 — P1: Custom error page is not a route error boundary

- **Location:** [error/page.tsx](../apps/web/src/app/error/page.tsx); no `error.tsx` or `global-error.tsx` was found in the app inventory.
- **Impact:** Visiting `/error` works, but this page does not itself catch rendering exceptions elsewhere. Its blanket assertion that offline data remains preserved is not verified by the page.
- **Adjustment:** Add framework error boundaries with safe retry/navigation, distinguish request failures from rendering failures, and only describe saved local data when its presence is known. Preserve queued commands during recovery.
- **Acceptance:** Deliberate exceptions in public, participant and console routes show the intended recovery UI; reload/account switching does not discard pending scores; no sensitive payload reaches diagnostic logs.

### F07 — P1: File parsing has capacity limits but not process isolation

- **Location:** [verification.rs](../apps/api/src/verification.rs), `DOCUMENT_SUBMISSION_SEMAPHORE`, parser worker and PDF budget filter; [private verification](private-verification.md).
- **Evidence:** Single-slot submission/parser controls and estimated object budgets exist. Parsing uses `spawn_blocking`; timeout of the awaiting future does not terminate already running parser work. Per-stream limits do not prove an exact whole-document heap limit.
- **Impact:** A pathological file can monopolize local capacity or pressure the API process. Increasing concurrency without isolation could worsen it.
- **Adjustment:** Isolate inspection in a constrained worker/process with enforceable CPU/memory/deadline limits, bounded queue and safe cancellation; measure throughput before selecting worker count.
- **Acceptance:** Oversized/decompression-heavy/stalled synthetic inputs are terminated within configured bounds; ordinary API commands remain responsive; scanner failure stays fail-closed.

### F08 — P1: CI does not enforce the full demonstrated user journey

- **Location:** [ci.yml](../.github/workflows/ci.yml), [test-rehearsal.ps1](../tools/test-rehearsal.ps1), [package.json](../package.json).
- **Evidence:** CI runs typecheck/build/rules, Rust and persistence/local-stack checks. It does not explicitly run the outbox test script, role-browser runner, verification/support/registration browser flows or an accessibility/performance job.
- **Impact:** A source build or API test can pass while a production-critical screen or recovery action regresses.
- **Adjustment:** Add a short deterministic browser gate for the primary journey, outbox and critical denial cases; put broader role, recovery and device coverage in scheduled/release runs. Retain synthetic-only fixtures and useful failure artifacts.
- **Acceptance:** An intentional UI authorization/navigation/outbox regression fails CI. Record tested commit/build and environment for each release candidate.

### F09 — P2: Branding/media need a measured delivery budget

- **Evidence:** `dance-hero.png` is 2,035,125 bytes, `wsb-logo.png` 556,191 bytes, `wsb-logo-white.svg` 742,169 bytes on disk. [Identity form](../apps/web/src/components/identity-form.tsx) and arena use Next Image; [hero highlights](../apps/web/src/components/hero-highlights.tsx) uses an external unoptimized poster. The SVG was not found referenced in web source, so do not count it as current page transfer.
- **Impact:** Source size creates optimization opportunities, but optimized transfer and image cache behavior must be measured before asserting a load bottleneck.
- **Adjustment:** Inspect actual image requests at phone/tablet widths, supply appropriately sized modern derivatives, optimize the logo while preserving its exact white treatment, reserve dimensions and preload only critical artwork. Keep the hero muted, decorative and non-interactive with motion/data preference fallbacks.
- **Acceptance:** Record cold/warm transferred bytes and LCP before/after; retain visual quality and stable layout at 320px through desktop. A proposed starting budget is <=200 KB for the delivered phone hero/poster, subject to visual review.

### F10 — P2: Operational UI still exposes development history

- **Location:** [workspace-shell.tsx](../apps/web/src/components/workspace-shell.tsx); communications, incidents, reports and advancement pages.
- **Evidence:** Shared navigation includes “Explore preview screens”; shell text says “Server-verified chapter access” and “Synthetic services”; several pages explain that former fabricated tables/forms were removed.
- **Impact:** Participants need their next action, event and support contact. Internal implementation history makes the product feel unfinished and obscures useful instructions.
- **Adjustment:** Keep an unmistakable local/demo banner, but move repair history to documentation. For real-mode navigation, show role-appropriate available work and contextual blocked actions with a reason/next step. Derive actual chapter/event context from verified session data. Do not hide readiness blockers behind reassuring copy.
- **Acceptance:** Each primary role identifies current event, next action and help in a short task walkthrough; unavailable actions never imply submission or payment success.

### F11 — P2: Styles and loading resources need surface separation

- **Location:** [root layout](../apps/web/src/app/layout.tsx), [theme.css](../apps/web/src/app/theme.css).
- **Evidence:** Root layout imports hero motion CSS and three font families for all routes. Theme CSS concentrates many unrelated surfaces into dense global selectors. Shared defaults include 54px buttons and 44px text links; some operational selectors override these, so this is not proof that every console target is undersized.
- **Impact:** Global coupling increases review/regression cost; marketing resources may add unnecessary operational work. Venue targets need verification against the project's 56px primary/48px auxiliary standard.
- **Adjustment:** Profile route bundles and computed controls, move marketing-only styling to its layout, subset/fonts by actual need, and consolidate operational control/state tokens. Avoid speculative memoization or adding a state library without profiling.
- **Acceptance:** Console/portal dependency traces contain no marketing motion engine; all measured operational targets meet the project standard; route CSS/JS bytes do not increase and visual regressions pass.

### F12 — P2: Offline shell upgrade/cache lifecycle needs release testing

- **Location:** [sw.js](../apps/web/public/sw.js), `VERSION = "wsb-offline-v1"` and hashed-asset caching.
- **Evidence:** Private traffic is deliberately excluded, which is good. A fixed cache name and cache-first hashed static assets have no visible per-build asset retirement within that cache.
- **Impact:** Over repeated releases, old chunks can accumulate; upgrade behavior while judges have queued work is not established by initial offline preparation alone.
- **Adjustment:** Use a controlled build/cache lifecycle, retain safe compatibility while commands are pending, and remove obsolete shell/assets after safe activation. Never cache private responses as a shortcut.
- **Acceptance:** Prepare version A, queue a score, upgrade to B, disconnect/reopen and reconnect; retain the command and receipt correctness while bounded cache cleanup occurs. Test unsupported storage/eviction recovery explicitly.

### F13 — P2: Completion reporting mixes prototype acceptance with full capabilities

- **Location:** [tasks.json](../workflows/tasks.json), task `registration`; historical sections of architecture/development/status.
- **Evidence:** The done task explicitly accepts synthetic consent states; the current actual consent route is unavailable. Older documents include superseded “not implemented” statements alongside later additions.
- **Impact:** Stakeholders can reasonably overestimate completeness or repeat already-finished work.
- **Adjustment:** Separate implemented slice, verified evidence and live approval in the task model; use one capability matrix as the current summary. Split large blocked domains into independently actionable work without bypassing policy dependencies.
- **Acceptance:** Every done item names its tested scope and evidence; consent signing stays visibly open; ready work can be selected without interpreting thousands of status-history lines. This audit does not silently rewrite existing task history.

### F14 — P3: Public discovery and install metadata need a final pass

- **Evidence:** Root metadata is generic; no sitemap/robots source appeared in the inspected app inventory. [Manifest](../apps/web/src/app/manifest.ts) uses one PNG icon with `sizes: "any"`.
- **Impact:** Public sharing/discovery and install presentation are less deliberate than the visual branding. Missing sitemap alone is not a functional failure.
- **Adjustment:** Supply route-specific metadata/canonical/share images for published public content, intentionally exclude private/preview routes from indexing, and provide verified install icon sizes/maskable treatment. Indexing controls are not access control.
- **Acceptance:** Public link previews and phone installation show approved branding; private content remains server-authorized and is not exposed through generated public metadata.

## 6. Targeted optimization and adjustment plan

These are proposed acceptance targets, not measured results or guaranteed delivery dates.

| Order | Work package | Concrete output | Exit check |
| --- | --- | --- | --- |
| 1 | Make readiness reviewable | This capability matrix linked from active planning; assign each blocker an owner and distinguish code work from external decisions | No ambiguous “done” claim for a partially implemented live capability |
| 2 | Fix display/recovery defects | Serialized/validated public polling and actual route error boundaries | Out-of-order, malformed-data, timeout and render-error tests pass |
| 3 | Establish quality gates | Primary browser journey, outbox, authorization denials and accessible interaction checks in CI | Evidence is tied to a reproducible build |
| 4 | Measure and reduce startup cost | Route-by-route asset/CSS/JS and mobile performance baseline, optimized branding/posters | Compare cold and warm runs; no loss of fallback/navigation behavior |
| 5 | Professionalize daily workflows | Role-specific navigation, verified chapter/event context, concise state/recovery copy, consistent operational controls | Manager, reviewer, finance, judge and marshal complete representative tasks without development explanations |
| 6 | Complete approved event workflows | Versioned rules, authority/consent, provider recovery and the remaining selected pilot features | Positive and negative end-to-end cases pass against approved configuration |
| 7 | Prove venue and production operation | Realistic device/outage/load rehearsal; constrained parsing; monitoring, restore and rollback procedures | Named operators can recover an interrupted event and reconcile all commands/financial states |
| 8 | Final public/visual polish | Public metadata, install icons, typography/spacing and stale/unavailable messaging | Repeat browser/accessibility/performance audit and obtain release sign-off |

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
