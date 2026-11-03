# WSB presentation and demonstration guide

This guide accompanies the editable 14-slide deck: ten core slides and four Q&A backups. The core script runs about seven minutes, plus a 90-second demonstration; allow roughly nine minutes with transitions. All examples are synthetic and the baseline is 31 October 2026.

## Core speaker script

### 1. WSB connects the competition workflow

Target duration: 35 seconds.

The original goal is to remove manual work in registration, payments, judging and tracking winners across WSB chapters. We now have connected local workflows for those tasks, with records and receipts instead of isolated form acknowledgements. This presentation shows what the implementation does today and where it still needs work. All demonstration data is synthetic. We are presenting a local implementation, not a production launch or a claim that every proposed feature is finished.

Transition: The design starts with the handoffs that create the paperwork.

Sources: [docs/product-brief.txt](../../docs/product-brief.txt), [memory/project.md](../../memory/project.md), [docs/system-manual/features.md](../../docs/system-manual/features.md)

### 2. Paperwork fragments the event workflow

Target duration: 40 seconds.

The brief describes four administrative burdens: registering crews, tracking payment, collecting judging information and monitoring winners. When those live in separate records, staff have to carry information from one step to the next. The diagram represents that proposed problem, rather than a measured study of current WSB operations. Our response is to link the entry to its roster, payment state, score acceptance and deliberate publication. We still need an organizer pilot to measure the effect on workload and errors.

Transition: The first replacement is a registration workflow owned by WSB.

Sources: [docs/product-brief.txt](../../docs/product-brief.txt), [docs/native-workflows.md](../../docs/native-workflows.md)

### 3. Native registration keeps the roster connected

Target duration: 45 seconds.

Managers create a crew and invite dancers through our own forms. The entry selects canonical crew members, so the registrar reviews the same roster instead of a retyped copy. Commands preserve their original receipt when a response is lost. Submission can request corrections, and only authorized staff can approve an eligible entry. The app also owns contact, account support and chapter, studio or partner proposal conversations. A proposal receipt records intake; it does not grant affiliation. Guardian consent and actual music processing remain separate unfinished workflows.

Transition: Keeping forms inside the system also requires a private evidence boundary.

Sources: [docs/persistent-registration.md](../../docs/persistent-registration.md), [docs/native-inquiries.md](../../docs/native-inquiries.md), [docs/native-applications.md](../../docs/native-applications.md), [docs/native-workflows.md](../../docs/native-workflows.md)

### 4. Private evidence stays with authorized reviewers

Target duration: 40 seconds.

Identity and residency cases now have subject-owned upload paths and chapter-authorized human review. The backend checks object metadata and current authority, while private documents stay out of public results and development memory. This replaces an untracked document handoff with a recoverable case. It does not prove automated age eligibility, guardian authority or event waiver consent. Those need approved policy and additional implementation. File metadata checks also do not establish byte-level content safety or malware scanning.

Transition: Payment has the same principle: a request must not masquerade as a completed outcome.

Sources: [docs/private-verification.md](../../docs/private-verification.md), [apps/api/src/verification.rs](../../apps/api/src/verification.rs)

### 5. PayMongo simulation separates pending and paid

Target duration: 50 seconds.

PayMongo is the selected payment medium. Locally, the system reserves the available balance, creates or recovers a synthetic checkout, and waits for a signed synthetic event before crediting the ledger. Duplicate delivery must preserve one credit. Manual payment references and staff reconciliation also exist. Provider checkout, expiration, refund and signed webhook code has been introduced, but emulator tests do not prove live compatibility. The browser return page reads authoritative status. We still need controlled provider testing, including cancellation, refund dispatch failures and accounting recovery.

Transition: Judging likewise distinguishes a saved intention from server acceptance.

Sources: [apps/api/src/finance.rs](../../apps/api/src/finance.rs), [apps/api/src/paymongo.rs](../../apps/api/src/paymongo.rs), [tests/local-paymongo-api.cjs](../../tests/local-paymongo-api.cjs), [tests/local-paymongo-recovery.cjs](../../tests/local-paymongo-recovery.cjs), [tests/paymongo-webhook-integration.cjs](../../tests/paymongo-webhook-integration.cjs)

### 6. Offline drafts wait for server acceptance

Target duration: 50 seconds.

An assigned judge can save a draft on a trusted device, review it and queue a versioned command. Reconnection sends the command to Rust, where current membership, assignment, version and division lock still apply. A receipt confirms acceptance; a conflict needs explicit resolution. This addresses lost connectivity without silently overwriting a newer score. Head-judge controls manage deductions, panel completeness and locking. The configured scoring policy used for local tests is synthetic. Offline judging does not imply that payments, stage commands or check-in work offline.

Transition: Accepted records then support event-day coordination.

Sources: [tests/judging-outbox.test.cjs](../../tests/judging-outbox.test.cjs), [apps/api/src/judging.rs](../../apps/api/src/judging.rs), [apps/api/src/repository/judging.rs](../../apps/api/src/repository/judging.rs), [docs/local-docker.md](../../docs/local-docker.md)

### 7. Versioned stage commands coordinate event staff

Target duration: 45 seconds.

Marshals use online roster check-in and a shared stage desk. Stage moves carry revisions, and the server checks approval, readiness, arrivals and stage assignment. Holds block new performance starts, while completion can release a running performance. Directors can create stages, assign marshals and change held, unoccupied configuration. Internal ordered drafts and their history make planning traceable. These drafts do not publish a schedule or enforce call order. The desk polls; it does not send push calls. Signed passes and offline arrival reconciliation remain unfinished.

Transition: The last handoff is the decision to make results public.

Sources: [docs/online-checkin.md](../../docs/online-checkin.md), [docs/stage-operations.md](../../docs/stage-operations.md), [apps/api/src/repository/stage.rs](../../apps/api/src/repository/stage.rs)

### 8. Only published results reach spectators

Target duration: 40 seconds.

Private judging state and public results use different records. An authorized publication command requires the division lock and writes an immutable snapshot with a receipt. Spectators read that projection, so a provisional score is not automatically an announcement. This addresses the original winner-monitoring problem with an explicit release boundary. Tie handling, corrections, republication and advancement need approved rules and remaining workflow work. We should not infer that publishing results automatically qualifies crews for another event or issues certificates.

Transition: These workflows share one server authority and chapter boundary.

Sources: [apps/api/src/repository/publication.rs](../../apps/api/src/repository/publication.rs), [docs/native-workflows.md](../../docs/native-workflows.md), [docs/open-questions.md](../../docs/open-questions.md)

### 9. Rust enforces the chapter boundary

Target duration: 40 seconds.

Next.js renders the website and operator workspaces. Rust owns business validation and chapter, event and stage authorization. Firestore transactions commit state with receipts and redacted audit in migrated workflows. Auth and Storage support identity and private files. Docker runs synthetic local services with mounted source and cached builds. Current business persistence is restricted to demo-wsb, and readiness deliberately remains closed. This architecture supports consistent recovery, but it is not evidence of production capacity, completed migrations or a deployed cloud system.

Transition: The release decision therefore depends on the work still to prove.

Sources: [docs/system-manual/architecture.md](../../docs/system-manual/architecture.md), [apps/api/src/main.rs](../../apps/api/src/main.rs), [compose.yaml](../../compose.yaml), [docs/local-docker.md](../../docs/local-docker.md)

### 10. The next milestone is an organizer pilot

Target duration: 35 seconds.

The implementation now demonstrates connected replacements for key paperwork tasks, but the full goal remains unfinished. The next milestone needs approved event and privacy rules, production identity and provider validation, guardian consent and music processing, passes, durable battles, advancement and HQ decisions. Then we can rehearse an entire event with organizers and measure completion time, reconciliation exceptions, score recovery and publication correctness. The appropriate conclusion today is a working local foundation with explicit release gates and a concrete pilot path.

Transition: The backup slides explain coverage, controls, evidence and the demonstration.

Sources: [docs/system-manual/features.md](../../docs/system-manual/features.md), [workflows/tasks.json](../../workflows/tasks.json), [docs/open-questions.md](../../docs/open-questions.md), [apps/api/src/main.rs](../../apps/api/src/main.rs)

### 11. Coverage extends beyond the main journey

Q&A backup; use as needed.

The core story focuses on the original administrative chain. The complete documentation also inventories public destinations, account workspaces, proposal intake, support recovery, private evidence, split-payment reservations, director stage controls and draft history. The open column is intentional: interface or route presence does not complete those domains.

Transition: For an exact boundary, consult the feature inventory.

Sources: [docs/system-manual/features.md](../../docs/system-manual/features.md), [docs/native-workflows.md](../../docs/native-workflows.md), [workflows/tasks.json](../../workflows/tasks.json)

### 12. Retries preserve one authorized effect

Q&A backup; use as needed.

Authorization is checked again on retries and continuation pages. An old receipt or cursor does not restore revoked permission. An identical accepted operation recovers its original response, while altered payloads and stale versions conflict. The transaction commits the record, receipt and audit together. These are implemented patterns in migrated workflows, not a claim that every registered route has completed migration.

Transition: The evidence distinguishes these checks from production validation.

Sources: [apps/api/src/repository/registration.rs](../../apps/api/src/repository/registration.rs), [apps/api/src/repository/stage.rs](../../apps/api/src/repository/stage.rs), [apps/api/src/repository/publication.rs](../../apps/api/src/repository/publication.rs), [docs/firestore-repositories.md](../../docs/firestore-repositories.md)

### 13. Local evidence defines the current confidence

Q&A backup; use as needed.

For this documentation task, the running Docker services and HTTP liveness were checked directly. Workflow documents and memory record broader API, repository, browser, outbox and container-recovery checks. We did not rerun every suite while writing these materials. No measured time saving, live payment success or venue capacity is claimed. A 503 from readiness is deliberate: liveness and partial persistent operation do not imply release readiness.

Transition: The short demonstration stays inside that evidence boundary.

Sources: [docs/system-manual/README.md](../../docs/system-manual/README.md), [memory/status.md](../../memory/status.md), [docs/local-docker.md](../../docs/local-docker.md), [apps/api/src/main.rs](../../apps/api/src/main.rs)

### 14. A 90-second demo follows one entry

Q&A backup; use as needed.

Prepare a synthetic unpaid entry and sign in before starting. Show its native entry and quote, create and settle a labeled local checkout, reload and confirm its saved paid state. Do not switch roles or attempt a full event in ninety seconds. If local payment controls are unavailable, show a previously rehearsed saved synthetic receipt and explicitly call it a recorded result. The full guide contains exact actions, prerequisites and a fallback plan.

Transition: Open the system manual for the full operational procedures and remaining scope.

Sources: [presentations/wsb-system/speaker-guide.md](../../presentations/wsb-system/speaker-guide.md), [docs/local-docker.md](../../docs/local-docker.md), [tests/local-paymongo-browser.cjs](../../tests/local-paymongo-browser.cjs)

## 90-second demonstration

Demonstrate one entry and payment state rather than trying to perform an entire event. Prepare a unique synthetic unpaid entry owned by the manager, with enough available balance; do not use a fixture already settled by another test. Sign in and open the native entry and checkout in adjacent tabs before presenting.

| Time | Exact action | Expected result and narration |
| --- | --- | --- |
| 0–10s | Show the synthetic entry and explain the goal | “This crew needs one entry record and a traceable payment state.” |
| 10–25s | Show the native registration/entry details, then its checkout quote | Crew, event and entry stay linked; explain that this replaces a separate roster and receipt handoff. |
| 25–50s | Use the clearly labeled local checkout action; reserve an available amount and trigger local simulated settlement | Show pending before paid. Say “This is an emulator; no money moves.” Wait for server-confirmed settlement. |
| 50–70s | Reload the checkout and reopen its saved status | The same saved reservation/payment remains; do not create another operation to simulate recovery. |
| 70–85s | Compare the saved paid and available amounts with the original quote | Confirm one credit and a recovered status; explain that a redirect alone never proves payment. |
| 85–90s | Return to the deck conclusion | “The system links the entry and receipt; the next step is a complete organizer pilot.” |

### Rehearsal and fallback

1. Start Docker using `./tools/local.ps1 up`; confirm web/API health at localhost ports 3100/8189. Use the fixture password privately from the ignored `.env.docker`; never display it.
2. Rehearse the exact local payment controls once with a separate synthetic entry before the presentation. Check that the entry is unpaid and the amount remains available. Keep the local simulation label visible.
3. Capture approved, sanitized screenshots of the quote, pending and settled states during that rehearsal, or record that local sequence. Keep keys, tokens, names, IDs and private evidence out of the capture. No new screenshots or recording were captured during this documentation task.
4. If the current UI exposes an unavailable provider link or the simulation controls cannot be rehearsed, do not follow it or present it as working. Show the saved synthetic receipt and describe it as recorded evidence, or demonstrate native support intake and reload instead.
5. Do not depend on real PayMongo credentials, live transfers, external notification delivery, a completed rulebook or a full role switch during the 90-second critical path.

## Likely Q&A

**Does this eliminate all paperwork today?** It introduces connected digital replacements for the main administrative chain. Consent, music, signed passes, battles, advancement, HQ decisions and production work remain; the full original goal is not complete.

**Can we enable production just by replacing environment keys?** No. Keep local and production configuration separate; production identity, durable migrations, rules, provider reconciliation, privacy lifecycle and deployment readiness also require verification.

**What proves offline correctness?** Draft/outbox checks and recorded reconnect/conflict scenarios support the judging path. A queued command needs a server receipt; cached data alone is insufficient. Check-in, finance and stage operations do not inherit offline support.

**How does the system stop duplicate payments or conflicting scores?** Relevant migrated commands combine payload-bound receipts, explicit revisions, current authorization and transactional writes. Provider callbacks also check signatures and mapped event/session/amount/currency.

**Are the rules official?** The original brief is a proposal. Local configuration is synthetic; scoring, eligibility, ties, progression, waiver and residency policies require approved sources.

**What has been tested?** Service health was rechecked for this package. Broader repository, API, browser, outbox and selected graceful-restart checks are recorded in project documents and status history; every suite was not rerun for this documentation-only task. No production capacity or real payment result is claimed.

**Why Rust and Next.js?** Next.js handles rendering and interactions; Rust keeps one authoritative business implementation for scoped validation and transactions. The architecture trades a second runtime for an explicit business boundary, without asserting a performance benchmark.
