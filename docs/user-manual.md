# WSB Competition Platform — User Manual

Version: 2026-10-31 (matches commit `3b5b915` and later)
Audience: crew managers, dancers, guardians, judges, head judges, registrars,
finance staff, marshals, audio operators, support agents, chapter directors,
Global HQ staff, and the engineers who run the local environment.

> [!IMPORTANT]
> **Read this first — what is real today.** The platform is under active
> development and is **not released**. Everything below is labeled with one of
> three statuses. Do not tell participants a feature works unless it is marked
> **Connected**.
>
> | Status | Meaning |
> | --- | --- |
> | **Connected** | Works end to end against the local `demo-wsb` stack with a saved server record, and has automated test evidence. |
> | **Partial** | Some steps work; named gaps remain (listed in the section). |
> | **Preview** | The page exists for design and navigation only. Data shown is not real, and nothing is saved. Do not rely on it. |
>
> The pasted product brief is a proposal, not an official rulebook. Anything
> marked **Policy pending** (section 17) must be confirmed by WSB before it is
> presented to participants as a rule.
> No real money, real identity documents, or real judge scores belong in the
> development environment. All accounts in this manual are synthetic.

---

## Table of contents

1. [What the system is](#1-what-the-system-is)
2. [Feature status at a glance](#2-feature-status-at-a-glance)
3. [Core concepts and vocabulary](#3-core-concepts-and-vocabulary)
4. [Roles and what each can do](#4-roles-and-what-each-can-do)
5. [Running the system locally](#5-running-the-system-locally)
6. [Test accounts and quick links](#6-test-accounts-and-quick-links)
7. [Everyone: accounts, sign-in, security](#7-everyone-accounts-sign-in-security)
8. [Public visitors](#8-public-visitors)
9. [Crew managers: crews, rosters, entries](#9-crew-managers-crews-rosters-entries)
10. [Dancers and guardians](#10-dancers-and-guardians)
11. [Paying: manual references and PayMongo](#11-paying-manual-references-and-paymongo)
12. [Registrars and identity reviewers](#12-registrars-and-identity-reviewers)
13. [Finance staff](#13-finance-staff)
14. [Judges and head judges: scoring](#14-judges-and-head-judges-scoring)
15. [Event day: check-in, stage, audio, battles](#15-event-day-check-in-stage-audio-battles)
16. [Results publication](#16-results-publication)
17. [Policy decisions still pending](#17-policy-decisions-still-pending)
18. [Chapter directors and Global HQ](#18-chapter-directors-and-global-hq)
19. [Support and contact](#19-support-and-contact)
20. [Offline use and recovery](#20-offline-use-and-recovery)
21. [Privacy and security rules for operators](#21-privacy-and-security-rules-for-operators)
22. [Administrator and engineer runbook](#22-administrator-and-engineer-runbook)
23. [Troubleshooting](#23-troubleshooting)
24. [FAQ](#24-faq)
25. [Glossary](#25-glossary)
26. [Appendix: route catalogue](#26-appendix-route-catalogue)

---

## 1. What the system is

WSB is a **multi-chapter competition operating system** that replaces paper and
scattered forms for World Supremacy Battlegrounds events. One platform serves
many chapters (for example WSB Philippines and WSB Hong Kong). It covers:

- Account creation, identity, and chapter membership.
- Crew creation, dancer invitations, rosters, and event entries.
- Private identity/residency evidence upload and chapter review.
- Payments (manual bank/cash references and PayMongo hosted checkout).
- Music/audio compliance metadata.
- Offline-capable judging with receipts.
- Check-in, stage order, and battle ballots.
- Published results, advancement, and chapter/HQ administration.

**Architecture in one paragraph.** A Next.js web app (browser/PWA) talks to a
Rust API. The Rust API is the only authority for business rules: who may do
what, money amounts, scoring, locking, and publication. Data lives in Firestore
and private files in Firebase Storage. The browser never decides whether a
payment is settled or a score is accepted — it only shows what the server
receipt says.

**Chapter isolation.** Every record belongs to one chapter. The server checks
your *current* chapter membership, role and any recorded access expiry on every
sensitive request. A user in one chapter cannot read or change another
chapter's data, even with a valid sign-in.

**Money.** All amounts are stored as whole **minor units** (for PHP, centavos:
₱1,250.00 = `125000`). Screens use the saved currency code's standard minor-unit
precision when accepting and displaying an amount.

---

## 2. Feature status at a glance

| Area | Status | Notes |
| --- | --- | --- |
| Sign-up, sign-in, email verification, password reset | Connected (local) | Firebase Auth emulator. Production identity/provisioning is a separate gate. |
| Chapter session, membership selection and role checks | Connected locally | Workspaces list current server memberships; the server rechecks membership on every sensitive request. Production identity remains gated. |
| Crew creation, roster, invitations | Connected | Random, expiring invitation tokens. |
| Event entry draft, readiness, registrar review | Connected | Durable; replay-safe. |
| Private identity/residency upload and review | Partial | Upload + chapter review work. Guardian relationship, event waivers, and consent readiness are **not** implemented. |
| Music upload and review | Partial (local) | Crew managers can inspect/save PCM or float WAV, or MP3, and submit a version; assigned registrars/directors can review. No compliance or readiness is inferred; DJ export and approved policy are unfinished. |
| Manual payment reference (bank/cash) | Connected | Pending until finance reconciles. |
| Split payments between dancers | Connected | Shares reserve only the available balance. |
| PayMongo hosted checkout, signed webhook, refund reversal | Partial | Verified against the **local emulator** and unit tests only. Not yet run against the real PayMongo service. |
| Offline judging (drafts, outbox, receipts) | Connected | IndexedDB outbox, conflict preservation. |
| Technical deductions, panel lock | Connected | Rules for catalog/ties pending (section 17). |
| Result publication (immutable snapshot) | Connected | Tie policy and corrections pending. |
| Online check-in | Connected | Not a signed/revocable QR pass. |
| Signed offline QR passes | Not built | Pass expiry/revocation policy pending. |
| Stage assignments, lineup drafts | Connected (manual) | Generated/seeded order is **not** enabled. |
| BG.ONE battle ballots | Partial | Assigned, one-vote-per-judge ballots; full bracket/advancement not complete. |
| Chapter, studio, partner proposals | Connected | Private conversations; no automatic approval. |
| Public contact / account support | Connected | No email delivery is connected. |
| Rankings, advancement, spectator tickets | Preview / Not built | Awaiting approved policy. |
| Global HQ governance | Connected local access, proposal follow-up, integration status and read-only operations | Chapter staff changes and indexed proposal conversations are durable; the demo-only historical index backfill is available but not yet run; HQ provisioning, maintenance controls and affiliation decisions remain open. |
| Production deployment | **Closed** | `/readyz` returns 503 with `release_ready=false` by design. |

---

## 3. Core concepts and vocabulary

- **Chapter** — a regional organizer (country/region). Owns events, staff,
  currency, and local rates.
- **Event** — a competition run by a chapter, with divisions.
- **Division** — a category such as Monster Crew, Mega Crew, Open Crew, Monster
  Varsity 18&U, Varsity Ignite 14&U, Junior, or BG.ONE (battles).
- **Crew** — a group led by a manager, made of dancers.
- **Entry** — a crew's registration into one division of one event.
- **Readiness** — a computed checklist for an entry (roster size, consent,
  audio metadata, payment balance). An entry must be ready and approved to be
  checked in or scored.
- **Operation ID** — a unique ID the app attaches to each action so a retry
  never double-applies it.
- **Receipt** — the server's proof it accepted an action. Only a receipt means
  "done".
- **Revision** — a version counter on a record. Edits must name the revision
  they are based on, so stale edits are rejected instead of overwriting.
- **Lock** — freezing a division's scores after all judges have submitted.
- **Publication snapshot** — an immutable public copy of locked results.
- **Pending / Settled / Refunded** — payment states. Only *Settled* counts
  toward an entry's paid balance.

---

## 4. Roles and what each can do

Roles are assigned per chapter by the server. A page being visible does not
grant authority.

| Role | Main abilities |
| --- | --- |
| Visitor | Browse public pages, results, contact form. |
| Account holder | Own profile, security, notifications, support requests. |
| Crew manager | Create crews, invite dancers, register entries, pay. |
| Dancer | Join a crew by invitation, upload own verification evidence. |
| Guardian | (Planned) consent and manage a dependent. |
| Payer | Any member who pays a share of an entry. |
| Registrar | Review and approve/reject entries. |
| Identity reviewer | Review private identity/residency submissions. |
| Finance admin | Reconcile payments, issue refunds. |
| Judge | Score only assigned performances in assigned events. |
| Head judge | Enter technical deductions, lock divisions, publish results. |
| Marshal | Check dancers in, run the stage desk. |
| Audio operator | Assigned operators can download one local demo DJ package for every current stage lineup in the event; crew managers submit tracks and assigned registrars/directors record manual review. |
| Support agent | Answer chapter support conversations. |
| Chapter director | Chapter-wide authority, including finance roles and stage assignments. |
| Global HQ / platform operator | Connected local chapter staff governance and indexed proposal follow-up; other HQ areas remain previews. |

Denied actions return a **403 Forbidden** style message. A user who is signed in
but has no active membership for a chapter sees an access-denied page.

---

## 5. Running the system locally

You need **Docker Desktop**. No host Node, Rust, Java, or Firebase login is
required. Everything below is for the synthetic `demo-wsb` environment.

### 5.1 First-time setup

From the workspace root in PowerShell:

```powershell
./tools/local.ps1 setup     # build images once, start the stack
./tools/local.ps1 status    # check health
```

The first Rust compile can take several minutes. Watch with
`./tools/local.ps1 logs`.

### 5.2 Daily commands

| Command | Purpose |
| --- | --- |
| `./tools/local.ps1 up` | Start existing images (no rebuild). |
| `./tools/local.ps1 down` | Stop; **named volumes are preserved**. |
| `./tools/local.ps1 restart-web` | Reload web if the file watcher missed a new file. |
| `./tools/local.ps1 restart-api` | Recompile and restart the Rust API after Rust edits. |
| `./tools/local.ps1 build` | Rebuild images (only after Dockerfile/manifest changes). |
| `./tools/local.ps1 logs` | Follow logs. |
| `./tools/local.ps1 test` | Run the bundled local integration check. |

Source folders are mounted into containers, so ordinary edits do **not**
require image builds. After `restart-api`, wait for the API to finish compiling
(it can take 1–2 minutes) before testing; a request in that window fails.

### 5.3 Service addresses

| Service | Address |
| --- | --- |
| Web app / sign in | http://localhost:3100/sign-in |
| API liveness | http://localhost:8189/healthz |
| API readiness | http://localhost:8189/readyz (503 by design) |
| Emulator UI | http://localhost:4408 |
| Auth emulator | http://localhost:9099 |
| Firestore emulator | http://localhost:8188 |
| Storage emulator | http://localhost:9199 |
| PayMongo emulator | http://127.0.0.1:8191 |

Always use `localhost` (not `127.0.0.1`) for the web address; the API only
allows that browser origin. Ports are configurable in the ignored `.env.docker`
file, which is generated on first run with a random test password.

### 5.4 Shutdown and data

`down` lets Firebase export Auth/Firestore/Storage and re-import them on the
next `up`. Allow shutdown to finish. This is development recovery only — **not
a backup** and not protection against a forced host shutdown.

---

## 6. Test accounts and quick links

All accounts share the password in `WSB_TEST_PASSWORD` inside `.env.docker`.
Never reuse that password anywhere real.

| Account | Role |
| --- | --- |
| `manager@ph.wsb.test` | Crew manager |
| `dancer1@ph.wsb.test`, `dancer2@ph.wsb.test` | Dancers (invitation flow) |
| `judge1@ph.wsb.test`, `judge2@ph.wsb.test` | Judges |
| `head@ph.wsb.test` | Head judge |
| `registrar@ph.wsb.test` | Registrar |
| `finance@ph.wsb.test` | Finance |
| `marshal@ph.wsb.test` | Marshal |
| `support@ph.wsb.test` | Support agent |
| `director@ph.wsb.test` | Chapter director |
| `manager@hk.wsb.test` | Other chapter (isolation checks) |

Quick links (after signing in; `ph` chapter, event `local-rehearsal`):

- Crews: `/app/crews` · New crew: `/app/crews/new`
- Register: `/app/register/local-rehearsal`
- Registrar queue: `/admin/ph/events/local-rehearsal/registrations`
- Entry: `/app/entries/local-entry-ready?event=local-rehearsal`
- Checkout: `/app/entries/local-entry-draft/checkout?event=local-rehearsal`
- Finance: `/admin/ph/finance/transactions`
- Judge desk: `/console/local-rehearsal/judge`
- Scorecard: `/console/local-rehearsal/judge/local-entry-ready`
- Offline workspace: `/offline`
- Check-in: `/console/local-rehearsal/check-in`
- Marshal desk: `/console/local-rehearsal/marshal`
- Support: `/contact`, `/app/support`, `/admin/ph/support`
- Notifications: `/app/notifications` (chapter-scoped in-app updates)

---

## 7. Everyone: accounts, sign-in, security

### 7.1 Create an account (Connected)
1. Open **Create account** (`/sign-up`).
2. Enter email and password, submit.
3. If account creation began from an invitation or registration link, that WSB
   destination is retained through email verification. Open the verification
   message and follow the link (`/auth/action`).
4. Return to sign in. Unverified accounts cannot use connected workspaces.

### 7.2 Sign in
1. Open `/sign-in`, enter email and password.
2. If your email is still unverified, continue through `/verify-email` first.
   Any valid invitation or registration destination is retained through this
   step.
3. You land on **Workspaces** (`/workspaces`). It lists your current chapter
   memberships and server-derived roles. Choose the chapter workspace you want;
   the choice is only navigation context, and the API checks access again.
4. If no memberships are listed, ask the chapter director to provision access.

### 7.3 Reset a password
Use **Forgot password** (`/forgot-password`). The link opens `/auth/action`.
An invalid or expired link is rejected and nothing changes; the action page links
back to the correct recovery form.

### 7.4 Security page
`/app/security` shows the current Firebase email, provider, verification state and
last sign-in. It cannot list or revoke sessions on other devices. Password users
can reauthenticate with their current password and update it. Sign out on shared
devices. Signing out clears the session; it does not delete a trusted-device
outbox (see §20).

### 7.5 Profile
`/app/profile` updates the Firebase account display name. It does not change a
verified legal name, crew roster name, stage alias, phone number or chapter
membership. If the account email is not verified, use **Request a verification
link** to open the Firebase email verification flow. After opening the link,
return to `/verify-email` and use **I opened the link — check status** to refresh
the signed-in account state. Use **Change email address** to request a change;
Firebase keeps the current address until the new address confirms the action
link. Email verification does not grant chapter access.

> [!NOTE]
> The platform never accepts "unsigned" tokens. If sign-in seems to succeed but
> pages return 401, sign out and in again.

---

## 8. Public visitors

No sign-in is needed for: Home, Events directory, Event overview, Rules,
Chapters, Help, Policies, Contact, About, Stories, Media.

- **Results** (`/results`, `/events/[eventSlug]/results`) show **only**
  published, immutable snapshots. If nothing is published, you see an empty
  state — never sample standings.
- **Rankings** (`/rankings`) is an empty state until WSB approves a points
  policy and publishes season data.
- **Registration buttons** go to the built-in registration route. If an event
  is not configured for registration the page says unavailable instead of
  sending you elsewhere.
- **Studios/partners** pages no longer show unverified listings.
- **Spectator tickets and live hub** are **Preview/Not built**.

Public pages preserve the white logo on dark layouts and a muted decorative
hero; controls let you pause motion where supplied.

---

## 9. Crew managers: crews, rosters, entries

### 9.1 Create a crew (Connected)
1. `/app` or `/app/crews` → **Create crew** (`/app/crews/new`). The signed-in
   workspace lists only crews returned for the selected chapter by the API.
2. Enter name and city (biography optional). Duplicate names in the same
   chapter are rejected.
3. You become the primary owner. Open the crew to see its workspace.

### 9.2 Invite dancers
1. Open the crew → **Roster and invitations**.
2. Create an invitation. A random, expiring link/QR is generated.
3. Send it to the dancer. Each invitation can be redeemed once; an invalid
   attempt does not consume it.
4. Revoke or re-issue from the same page if a link leaks.
5. Crew managers can update the saved name and city from **Crew settings**. A
   stale edit is rejected and must be reloaded. Crew archival is not available.

### 9.3 Register for an event (Connected)
1. `/app/register/[eventId]` → choose the **division**.
2. A **draft entry** is created (retrying never duplicates it).
3. **Roster** step: pick members from the crew's canonical roster. Duplicate
   dancers are rejected. Consent flags cannot be set by you; they come from the
   server's records.
4. **Music**: after the draft is created, open `/app/entries/[entryId]/music?event=[eventId]` to inspect and submit a PCM/float WAV or MP3 version. Submission is not approval or readiness.
5. **Checkout** step: see §11.
6. **Review** step: confirm and submit for registrar review.

### 9.4 Reading readiness
`/app/entries/[entryId]` shows the server readiness checklist. Music submission
and manual review do not change its readiness flag. Guardian consent and approved
audio-compliance policy remain unfinished; do not promise eligibility from an
audio inspection or a reviewer marking the file reviewed.

### 9.5 Changing or withdrawing
`/app/entries/[entryId]/changes` reports that division changes, substitutions
and withdrawal are not self-service and records nothing; use account support to
reach the chapter. Edits after approval go back through the registrar. Roster
changes on approved entries are immutable until the registrar re-opens them.

### 9.6 After the event
`/app/scorecards` shows scorecards **only after publication** (Preview for full
detail). `/app/advancement` is a Preview until advancement rules are approved.

---

## 10. Dancers and guardians

### 10.1 Join a crew
Open the invitation link (`/invite/[token]`), sign in, enter your dancer name
and whether you are a minor, and accept. Expired links report **410 Gone**-style
errors; ask the manager for a new one.

### 10.2 Submit identity or residency evidence (Partial)
1. `/app/verification` → create a case (identity or residency).
2. The app creates a private, chapter-scoped upload slot. Upload a **PDF, JPEG,
   or PNG up to 10 MiB**. (This is a technical limit, not a policy list of
   acceptable documents.)
3. Submit. The server confirms the uploaded file's metadata before recording a
   pending submission.
4. If the upload is interrupted, return to the unfinished case to resume or
   re-check the file.
5. A chapter reviewer decides. You see the status (pending/approved/rejected).

Rules to know:
- Files are immutable and private to you and authorized reviewers.
- A declared file type is not proof of the real format. The service checks basic
  signatures and scans bytes with ClamAV before submission; an unavailable
  scanner blocks submission. This does not validate a document or guarantee it is safe.
- An approved review does **not** by itself determine your age eligibility,
  guardian relationship, or event waiver, and it does not mark your entry
  ready.

### 10.3 Consents and waivers (Not built)
`/app/dependents` provides a local-demo guardian relationship request. A dancer
can request an active guardian account; the guardian can confirm or decline, and
either participant can withdraw an unresolved request. Confirmation is still
awaiting staff verification and grants no dependent-data access or signing
authority. Pending commands can be retried after a page reload in the same tab.
`/app/consents` and event waiver signatures are not implemented. Approved
guardian verification, waiver wording and signer policy are still required before
minors' consent can be completed digitally.

---

## 11. Paying: manual references and PayMongo

Open **Checkout** from your entry (`/app/entries/[entryId]/checkout?event=…`).
The page shows the division, number of dancers, **full entry fee**, and your
**available balance** (fee minus settled minus pending amounts). If the balance
is unknown, the page shows *Unavailable* and disables payment — it never
invents a number.

### 11.1 Option 1 — Pay online with PayMongo (Partial)
Methods offered to the provider: card, GCash, GrabPay, Maya.

1. Optionally enter **Your share** (up to two decimals). Leave blank for the
   whole available balance.
2. Press **Proceed to PayMongo Checkout**.
3. The server first **reserves** that amount as *pending* on the entry (so two
   people cannot over-allocate), then creates the PayMongo session.
4. You are sent to PayMongo's hosted page and pay there.
5. You return to **Check your payment status** (`/app/payment-return`). This
   page reads the server ledger and shows settled, pending, and outstanding
   amounts. **Returning from PayMongo does not confirm payment.** Settlement
   happens only when PayMongo's **signed webhook** reaches our server; press
   **Refresh status** until it shows settled.
6. If you close the tab, your reservation stays pending. You can retry the same
   action; an identical retry returns the same session.

If PayMongo credentials or an explicit `PAYMONGO_LIVE_MODE` setting are not
configured on the server, checkout is unavailable; use Option 2 or contact the
chapter. The current durable real-provider checkout path is restricted to the
local-testing build. Production Firestore checkout remains disabled pending
provider lifecycle and reconciliation work.

An identical retry reuses the provider idempotency key and stored session URL.
The API will not construct a checkout URL from a saved session ID; if an older
or incomplete reservation has no saved URL, it blocks the redirect and leaves
the amount reserved for reconciliation. If a provider request has no recorded
session after 23 hours, the API also blocks another attempt and leaves the
amount reserved for finance reconciliation. This avoids sending a payer to an
unverified address or creating a second payable session after the provider's
24-hour idempotency-key expiry window.

> [!WARNING]
> Real PayMongo has **not** been exercised yet. Local results come from a
> synthetic emulator. Do not collect real payments until the release gate in
> §22.6 is complete.

### 11.2 Option 2 — Bank or cash reference (Connected)
1. Enter the receipt or reference text (up to 200 characters) and optional
   amount.
2. Submit **Send for finance review**. The record is **Pending**, never
   Settled.
3. Finance verifies the money and approves it. Only then does your entry's paid
   balance change. An identical resubmission returns the same record; reusing a
   reference with a different amount is rejected.

### 11.3 Split payments
Each member may pay a share. Shares are limited to the remaining available
balance; reservations count immediately, so shares can never exceed the fee.
Cancelling a synthetic local checkout releases its reservation after the local
session is expired. A reservation linked to a PayMongo provider request stays
reserved for reconciliation; provider cancellation is not yet enabled.

### 11.4 Local test panel (local only)
In local testing, a **PayMongo local test** panel appears under checkout:
**Start test checkout**, **Refresh**, **Cancel test checkout** (releases the
reservation), and **Simulate successful payment** (delivers a signed synthetic
callback). Its labels state that no real money moved. This panel never appears
in a production build.

### 11.5 Refunds and receipts
Refunds are initiated by finance (§13). `/app/payments` lists your payments;
open **View saved payment record** to read the server-authorized ledger fields.
Only a settled record can be printed. It is a WSB ledger record, not a bank or
payment-provider receipt. A refund updates your entry's paid balance and may
make an entry not-ready again.

---

## 12. Registrars and identity reviewers

### 12.0 Event command center (Connected local)
`/admin/[chapter]/events/[event]` shows the saved event name, status, rules
version and configured registration deadline to the chapter director or assigned
registrar. Its workflow links open the system of record for registrations, music,
division panels, lineup, battle drafts and waiver drafts. The page does not show
sample entry/roster/audio totals or infer compliance/readiness. The deadline is
formatted in the operator browser's timezone.

### 12.1 Entry review (Connected)
1. Open `/admin/[chapter]/events/[event]/registrations`.
2. Open an entry (`…/registrations/[entryId]`). Review roster, readiness, and
   payment barrier.
3. Approve or reject. Approval races are handled: if two people act at once,
   one succeeds and the other sees a conflict. Retry shows the original result.
4. An entry cannot be approved into ready state if a barrier (such as unpaid
   balance) applies under the configured policy.

### 12.2 Identity review (Partial)
1. `/admin/[chapter]/verification` shows pending cases for your chapter only.
2. **Open the private file** before deciding — the interface requires it
   (the server cannot prove you looked at the content).
3. Add a short note (length-limited, audited) and approve or reject.
4. Reviewers need active membership in that chapter; if your membership is
   revoked, decisions are denied immediately.

Do not copy identity values into notes, chat, tickets, or this repository.

---

## 13. Finance staff

Roles: finance admin and chapter director.

### 13.1 Reconcile manual references
1. `/admin/[chapter]/finance/transactions` lists payments (paged).
2. Confirm the real bank/cash receipt outside the app.
3. Enter a reason and approve to **Settle**. The decision uses an operation ID
   and the entry's paid balance increases once; an exact retry returns the same
   result, while changed reuse conflicts.

### 13.2 Refund a payment
After independently confirming a full manual bank/cash reversal, an authorized
finance user can record it at `/admin/[chapter]/finance/refunds`. Enter a reason
and non-sensitive confirmation reference. The local payment and entry ledger
update transactionally with a replay receipt and audit reason. This records the
external action; it does not transfer money. Provider payment refunds are not
initiated by this screen. The signed local demo adapter models provider refund
callbacks; production provider reconciliation remains disabled.

> [!NOTE]
> Official refund eligibility, partial-refund terms, deadlines and separate
> approver policy are **pending approval**. This demo/manual ledger operation
> does not establish those policies or production readiness.

### 13.3 PayMongo webhook behavior (for finance awareness)
- PayMongo calls `POST /v1/paymongo/webhook` (alias `/v1/webhooks/paymongo`).
- Each call is checked: signature (HMAC-SHA256 over `timestamp.raw_body`),
  timestamp within 5 minutes, and mode (test vs live).
- Each event ID and successful provider refund ID is processed once. A changed
  payload under an already-used event ID is rejected.
- `checkout_session.payment.paid` moves the reserved amount from pending to
  paid. Successful `payment.refunded` and `payment.refund.updated` resources
  reduce the paid ledger by their recorded amount; multiple successful partial
  refunds accumulate, and the WSB payment is marked fully refunded only when
  the accumulated amount reaches the original payment amount.
- Durable PayMongo event settlement is limited to the signed local emulator on
  `demo-wsb`. Production provider settlement/refund processing is not enabled.
- Other event types are acknowledged and ignored.
- Reconciliation reports/export screens and dispute handling are **not
  complete**; reconcile against the PayMongo dashboard manually.

---

## 14. Judges and head judges: scoring

### 14.1 Before you start (Connected)
- You see **only** performances assigned to you for events you are assigned to.
- Open `/console/[event]/judge`, choose a performance
  (`/console/[event]/judge/[entryId]`).
- Scoring model in this pilot: **100 points across five pillars** (Choreography,
  Musicality, Execution, Stage Presence, Entertainment; 20 each). This is a
  proposal pending official confirmation, so treat displayed arithmetic as
  pilot behavior.

### 14.2 Score a performance
1. Confirm **trusted device** if prompted (see §20). Shared devices must not
   persist drafts.
2. Enter criteria (finite numbers within bounds). Your draft saves locally.
3. **Review** (`/console/[event]/judge/review`), then **Queue/Submit**.
4. States: *draft → queued → sending → acknowledged*, or *conflict/rejected*.
   Only **acknowledged** (server receipt) means your score counted.
5. To revise, submit a new revision based on the latest revision. A new
   revision **replaces** your earlier score; it never adds a second judge to
   the average.

### 14.3 Conflicts and rejections
- Stale revision → **conflict**: your draft is preserved for review; nothing is
  overwritten automatically.
- Division locked, not assigned, membership revoked, or invalid criteria →
  **rejected** with a reason.
- Reusing an operation ID with a different payload is rejected; an exact retry
  returns the original receipt.

### 14.4 Head judge (Connected)
1. `/console/[event]/head-judge` shows divisions; open one
   (`…/head-judge/[divisionId]`).
2. **Technical deductions** are entered per crew, non-negative, with a revision;
   they are applied once after averaging. Deductions are blocked after lock.
3. **Lock** requires the **full configured panel** to have submitted for every
   ready, approved entry. Locking freezes scores.
4. Equal rounded totals share a rank. **Publication is blocked until a tie
   policy is approved** (section 17).

### 14.5 Battles (Partial)
`/console/[event]/battles` and `…/battles/[matchId]/vote`. Each assigned judge
casts **one immutable vote**; a 3- or 5-judge panel is required; voting closes
at majority. Anonymous voting is not permitted. Chapter directors configure,
read back, edit and activate match drafts at
`/admin/[chapter]/events/[event]/battles`; judge references must have active
event assignments. Activation opens voting only. Bracket seeding and winner
advancement remain unavailable until the competition policy is approved.

---

## 15. Event day: check-in, stage, audio, battles

### 15.1 Marshal check-in (Connected)
1. `/console/[event]/check-in`.
2. Select/enter the dancer. The server checks that the dancer is on an
   **eligible, approved, ready roster**; unready or non-roster people are
   rejected.
3. Success returns a **server receipt**. Repeating the action returns the same
   receipt (no duplicate arrival).
4. The arrivals list is a durable, paged list; **Load more** to continue.
5. This is an operational log. It does **not** authenticate a person by
   itself, and signed offline QR passes are not yet available.

### 15.2 Stage desk
`/console/[event]/marshal` — current/next performance and progression. Stage
progression cannot skip, repeat, or reverse. Directors assign stage staff in
admin. Stage order drafts are **manual**; auto-seeding is disabled pending
policy.

### 15.3 Performance order
`/admin/[chapter]/events/[event]/lineup` — create and revise lineup drafts
(each save is revisioned; stale saves conflict). Publishing generated or
randomized order is **not enabled**.

### 15.4 Audio review (Partial, local)
`/admin/[chapter]/events/[event]/music` lists pending versions for an assigned
registrar or chapter director and opens the per-entry player/review flow.
`reviewed` records a manual review; it does not approve event compliance or
change readiness. Assigned audio operators and chapter directors can open
`/console/[event]/audio` to download one local demo ZIP containing all current
event stage lineups. Its CSV manifest records each division, lineup revision,
order and omissions. Production
private-media export remains disabled. The official allowed-format policy,
deadline/replacement policy, production scanner setup and production export
access remain open.

### 15.5 Other console pages
The broadcast page points to the director-controlled public stage projection,
and the sync page shows this device's offline score outbox; both are connected.
The incidents page records nothing (no durable incident workflow exists), and
the penalties page redirects to the head-judge division review because there is
no separate penalty desk.

---

## 16. Results publication

1. After lock, the head judge or publisher opens
   `/admin/[chapter]/events/[event]/results`.
2. **Publish** creates an **immutable snapshot** with a SHA-256 digest, written
   together with a reservation of the public event ID and an audit.
3. Retries (even concurrent) return the same snapshot.
4. Public pages read **only** these snapshots. Raw judge notes, private
   identities, and unpublished scores never appear publicly.
5. Corrections/republication are **not implemented**; a published snapshot is
   never silently replaced. The public identifier is the `event_id`, reserved
   to one chapter on first publish; cross-chapter collisions fail closed.

---

## 17. Policy decisions still pending

These must be decided by WSB with a source, then recorded in
`memory/decisions.md`. Until then the system either blocks the action or marks
it as pilot behavior.

- Deduction catalog and point values.
- Tie-breaking algorithm; correction/republication authority.
- Scoring precision and rounding; panel-completion rules.
- Official refund terms, partial refunds, split-payment deadline.
- The WSB Rules 2026 booklet linked from the Dubai event page states a January 1
  age cutoff for listed divisions, 50% roster retention into finals, a five-second
  performance grace, and an eight-criterion scoring rubric. These are scoped to
  that rules document and are not confirmed for the Manila/Hong Kong pilot. The
  booklet does not establish a seven-day music lock. Any saved music grace in the
  current system is advisory only and does not affect submission acceptance or
  readiness.
- Accepted identity/residency document types, reviewer roles, age decision
  policy; guardian signer and waiver wording/versions.
- Retention/deletion of identity documents and inquiries; scanner signature
  freshness, false-positive handling and production network placement.
- Offline QR pass expiry and revocation protocol.
- Stage-order seeding/randomization and post-publication reorder authority.
- Season points, ranking sources, and public crew profile permissions.
- Email notification provider and support escalation.

Full list: `docs/open-questions.md`.

---

## 18. Chapter directors and Global HQ

### 18.1 Chapter director
- Authority for chapter-wide finance and stage assignments (Connected where
  noted) and staff views.
- **Staff and chapter access** (`/admin/[chapter]/staff`): in demo-wsb, directors
  can grant, change, or revoke supported chapter roles for an existing Firebase
  UID. A reason, expiry, revision and recent sign-in are required; the change is
  audited and the recipient must sign in again. Directors can also create a
  single-use, seven-day invitation link for an existing UID, with a separate
  staff-access expiry. Share it directly; WSB does not send an email. The
  recipient must sign in as the invited account and sign in again after
  acceptance. Pending invitations can be revoked with a reason. Directors can
  also assign active
  chapter staff to a specific event from this page; the assignment does not
  change their chapter role and requires its own reason and audit record.
- **Division judge panels** (`/admin/[chapter]/events/[event]/divisions`): set
  event-assigned judges for each division before any scorecards are recorded.
  Panel changes require a reason and recent sign-in, and are rejected after
  scoring begins or the division locks. The current 1–20 range reflects the
  scoring service limit, not an approved WSB panel-size rule.
- **Event management** (`…/events`, `…/events/new`): chapter directors can
  create and list durable event drafts in demo-wsb. Drafts record the supplied
  date, timezone, venue and rules reference, but do not open registration.
  Directors can edit draft details and registration dates, and prepare versioned
  division rule drafts at `/admin/[chapter]/events/[event]/division-policies`.
  These rule drafts are not approved and do not affect registration or fees.
  Stage structure, activation, publication, cancellation and production
  provisioning remain unfinished. See
  `docs/event-management.md`. The event settings page now points to these
  connected controls; music cutoff, per-event currency and automatic locking
  are not configurable.
- **Audit explorer** (`/admin/[chapter]/audit`): active chapter directors and auditors can inspect durable chapter audit records, newest first. Filter applies to records already loaded; use **Load more records** to fetch later pages. **Export loaded records** downloads only the currently loaded records matching the filter. New records include an audit correlation ID equal to the record ID; older records may not. Reasons appear only when the command collected one. IDs are not end-to-end request traces, and the page does not claim hash-chain verification. See [audit contract](chapter-audit.md).
- **Chapter content** (`/admin/[chapter]/content`): directors can save private plain-text drafts and inspect immutable revisions in demo-wsb. These drafts cannot be reviewed, published or sent as announcements. Public editor/publisher roles, rights checks, audience, correction/removal, notifications and retention remain open. See [private chapter drafts](chapter-content-drafts.md).
- **Advancement, reports, communications**: unavailable gated screens. No seed
  allocation, scrutineer report, export or director-composed broadcast exists;
  the pages record nothing and link to the connected audit, finance and support
  workspaces. The event fees page explains that division fee values come from
  director-authored policy drafts, not sanctioned rates.

### 18.2 Global HQ
`/hq/access` provides demo-wsb chapter staff governance for signed `hq_admin`
accounts. It lists current chapter staff and supports reasoned, expiring,
revisioned role grants and revocations, including chapter-director appointments.
The API audits each change and the recipient must sign in again. The target UID
must come from an existing account process; HQ role grants do not send
invitations or verify account existence. HQ provisioning and production revocation checks
remain unfinished. `/hq/applications` provides cross-chapter follow-up for
indexed proposal conversations using communication states only; the demo-only
historical index migration is documented in `docs/native-applications.md` and
has not been run. It does not record affiliation decisions. `/hq/integrations`
shows current API configuration indicators and database reachability to a signed
Global HQ administrator. It does not expose credentials or claim external
provider connectivity. `/hq/operations` also shows the read-only database and
release status; it does not control maintenance or verify ledger hashes.
`/hq/chapters` lists saved chapter names and currency codes, without licensing
or affiliation actions. `/hq/rules` shows outstanding policy gates and a
reference-only rules link; it cannot publish rules. `/hq/content` has no
connected content service. `/hq` and these two workspaces remain previews.

### 18.3 Applying to become a chapter, studio, or partner (Connected)
`/community/apply` records a private conversation routed to the selected
chapter's support queue. It does **not** grant affiliation. Applicants can
reopen the thread after reload using the access key shown at submission.

---

## 19. Support and contact

- **Public contact** (`/contact`): choose a chapter, send a message, and
  **save the private access key** shown. The key is a per-request capability
  (not an account). Lose it and you cannot reopen the thread (recovery policy
  pending).
- **Account support** (`/app/support`): signed-in conversations tied to your
  account.
- **Chapter support queue** (`/admin/[chapter]/support`): agents reply;
  conversations are chapter-isolated.
- A saved inquiry does **not** mean an email was sent, a registration changed,
  or a payment was approved. Email delivery is not connected.

---

## 20. Offline use and recovery

### 20.1 Trusted device
Offline features require you to mark a device **trusted** in the app. Do this
only on a device you control. It enables:
- A service-worker shell at `/offline` (generic shell, hashed static assets,
  public branding only — private pages, API and Firebase traffic are never
  cached).
- An **IndexedDB** score draft/outbox with states draft, queued, sending,
  acknowledged, conflict, rejected.
- If you separately allow it in the offline judging workspace, an owner-,
  chapter- and event-scoped list of your assigned entry IDs and crew/division
  labels. This helps locate scorecards already saved on the device; it does not
  prove current assignment or authorize a new offline scorecard.

### 20.2 What persists
Drafts and queued commands persist across reloads and crashes. The outbox
stores **no credentials and no other judges' scores**. Account ownership is
rechecked before any send. Multiple tabs are serialized with Web Locks.
The optional lineup cache contains only the assigned entry IDs and labels you
loaded while online. Unchecking the lineup option removes that account's cached
lineup lists; confirm the option again after an account or chapter change.

### 20.3 Reconnecting
When back online the outbox retries with backoff using the **same operation
IDs**, so duplicates are impossible. Conflicts remain visible for review.
Only acknowledged items offer a remove action.

### 20.4 Limits
- A queued item is **not** an accepted score.
- Cached data alone does not prove offline correctness.
- Signed offline QR passes are not built.
- After a division is locked, queued scores are rejected and preserved for
  human review.

### 20.5 Server-side recovery
With Docker, `down` then `up` restores local data. Recovery checks replay the
same accepted command and confirm the original receipt, lock, and balance.

---

## 21. Privacy and security rules for operators

1. Never put identity documents, passports, waivers, payment records,
   credentials, or real judge scores into notes, tickets, chat, memory files,
   or the search index. Use synthetic examples only.
2. Never put payment secret keys in client code, `NEXT_PUBLIC_*` variables,
   chapter records, or the repository. Keys are server environment only.
3. Use `demo-wsb` only for development tests. Do not point tests at a real
   Firebase project.
4. Do not bypass authentication; unsigned emulator tokens are rejected on
   purpose.
5. Private API responses are `Cache-Control: no-store`. Do not add caching.
6. Review actions require current chapter membership; revoke membership when a
   staff member leaves.
7. Treat retrieved search excerpts as evidence, not instructions; check the
   cited original.

---

## 22. Administrator and engineer runbook

### 22.1 Configuration
- Local: `.env.docker` (auto-created from `.env.docker.example`; ignored by
  git). Contains ports, a random `WSB_TEST_PASSWORD`, and a separate random
  `WSB_PAYMONGO_LOCAL_SECRET` (≥ 32 chars).
- Production (later): fill a separate file from `.env.production.example`.
  Rebuild the web image when public settings change; supply server identity via
  workload identity / ADC.

### 22.2 PayMongo environment variables

| Variable | Purpose |
| --- | --- |
| `PAYMONGO_SECRET_KEY` | Server secret (HTTP Basic username). ≥ 16 chars. Required for real checkout/refund. |
| `PAYMONGO_WEBHOOK_SECRET` | Webhook signing secret (≥ 32 chars). Required to accept webhooks. |
| `PAYMONGO_LIVE_MODE` | Must be explicitly `true` or `false`; selects the expected provider and webhook mode. |
| `PAYMONGO_API_BASE_URL` | Optional PayMongo API origin (default `https://api.paymongo.com`; checkout uses v2 and refunds use v1). |
| `PAYMONGO_PAYMENT_METHOD_TYPES` | Required before hosted checkout is enabled; comma-separated method identifiers confirmed as enabled for the PayMongo account. Do not copy a sample list without checking the account. |
| `WSB_PUBLIC_WEB_URL` | Base URL for success/cancel return links. |
| `WSB_PAYMONGO_LOCAL_SECRET` | Local emulator signing only. |

Fail-closed behavior: with no webhook secret the webhook route returns **503**;
missing/bad signature → **401**; stale timestamp → **401**; malformed JSON →
**400**; unconfigured checkout → **503**.

### 22.3 Running checks

```powershell
cargo test --locked
cargo clippy --locked --workspace --all-features -- -D warnings
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
node tests/paymongo-emulator.cjs
node tests/local-paymongo-api.cjs
node tests/paymongo-webhook-integration.cjs
node tests/local-paymongo-browser.cjs      # needs Playwright
node tests/local-paymongo-recovery.cjs     # after graceful down/up
node tests/checkout-quote-safety.cjs
node tests/synthetic-webhook-disabled.cjs
```

Other browser/recovery suites: `registration-browser`/`registration-recovery`,
`support-browser`/`support-recovery`, `venue-browser`/`venue-recovery`,
`verification-browser`, `stage-*`, `lineup-recovery`. The bundled
`./tools/local.ps1 test` covers signed login, forged-token denial, tenant and
role boundaries, paging, payments, score revisions, locking, and revocation.

### 22.4 Workspace tooling

```powershell
python tools/workspace.py search "topic"   # retrieval over repo docs
python tools/workspace.py dag               # tasks ready to start
python tools/workspace.py check             # validate tasks and skills
python tools/workspace.py index             # rebuild after memory/doc edits
```

Record decisions (with rationale and source) in `memory/decisions.md` and
status in `memory/status.md`, then re-index.

### 22.5 Health endpoints
- `/healthz` — process is up.
- `/readyz` — database reachability; **always 503 with `release_ready=false`**
  until release gates close. This is intentional.

### 22.6 Release gates for real payments
Before using real PayMongo keys:
1. Confirm the test-mode account's enabled payment-method identifiers and
   configure `PAYMONGO_PAYMENT_METHOD_TYPES`. The hosted-checkout adapter is
   v2 and currently accepts PHP only; other chapter currencies need a separate
   supported provider path.
2. Run that account through v2 checkout, webhook delivery, session expiry and
   refund; confirm live payload shapes match the parser.
3. Register the webhook endpoint in PayMongo and store the signing secret in
   server secrets only.
4. Rehearse duplicate delivery, out-of-order events, and partial refunds.
5. Approve refund and split-payment policy (§17).
6. Add reconciliation reporting against PayMongo records.
7. Complete the full event rehearsal and access review.

### 22.7 Known engineering gaps
Persistent membership provisioning for production; guardian/waiver workflows;
official allowed-format policy, music deadline/replacement policy, production scanner setup and DJ export;
signed QR passes; battle bracket progression;
advancement; HQ governance; email delivery; reconciliation reports.

---

## 23. Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Web loads but actions fail with network errors | API still compiling after `restart-api` | Wait for `/healthz`; check `logs`. |
| Browser blocked by CORS | Using `127.0.0.1` instead of `localhost` | Use `http://localhost:3100`. |
| 401 on a private page | Session expired or token invalid | Sign out and in. |
| 403 / access denied | No active membership or wrong role/chapter | Ask the chapter director; verify the chapter. |
| New file not picked up | Windows watcher missed it | `./tools/local.ps1 restart-web`. |
| Port in use | Another process | Change the port in `.env.docker`, rerun `up`. |
| Checkout shows *Unavailable* balance | Quote missing balance | Refresh; contact support. Never bypass. |
| "PayMongo checkout is not configured" | Missing `PAYMONGO_SECRET_KEY` or configured payment methods | Use manual reference or configure server-only credentials and account-enabled methods. |
| Paid but still pending | Webhook not received yet | Wait, press **Refresh status**; finance checks PayMongo. |
| Webhook returns 503 | No webhook secret set | Set `PAYMONGO_WEBHOOK_SECRET`. |
| Webhook returns 401 | Bad signature, wrong mode, or stale clock | Check secret, `PAYMONGO_LIVE_MODE`, server clock. |
| Score stuck "queued" | Offline, locked division, or conflict | Reconnect; open the item for the reason. |
| Conflict on score | Newer revision exists | Review, then submit a new revision. |
| Check-in rejected | Entry not approved/ready or dancer not on roster | Resolve readiness first. |
| Cannot publish results | Division not locked or tie unresolved | Complete panel, lock, resolve tie policy. |
| Data missing after restart | Forced shutdown before export | Re-seed with `up`; emulator data is not a backup. |
| Emulator test sees stale API | Container running older code | `restart-api` and wait for compile. |

---

## 24. FAQ

**Is this ready for a real event?** No. It is a local, synthetic-data build.
`/readyz` stays 503 on purpose.

**Does returning from PayMongo mean I'm paid?** No. Only the server-verified
webhook settles a payment.

**Can I pay twice by retrying?** Identical retries return the same record or
session; reservations prevent exceeding the fee.

**Why can't a minor finish consent?** Guardian and waiver workflows are not
implemented until WSB approves wording and signer rules.

**Why are rankings empty?** No approved points policy or published data yet.

**Why does my score say "queued" and not "accepted"?** Only a server receipt
counts.

**Can a judge see other judges' scores?** No; judges receive a minimal
scorecard projection and the outbox stores no peer scores.

**Where do I find the official rules?** The pasted brief is not official. Use
WSB-supplied rulebooks; unresolved items live in `docs/open-questions.md`.

**How do I reset local data?** Stop the stack and remove the named Docker
volumes deliberately; this deletes all local synthetic data.

---

## 25. Glossary

- **ADC** — Application Default Credentials for server identity.
- **Axum/Tokio** — Rust web framework and async runtime used by the API.
- **Emulator** — local stand-in for Firebase or PayMongo services.
- **HMAC-SHA256** — signature method used to verify webhooks.
- **Idempotent** — repeating an action yields the same result, no extra effect.
- **IndexedDB** — browser storage used for the offline outbox.
- **Minor unit** — smallest currency unit (centavo).
- **Outbox** — local queue of commands waiting to be sent.
- **PWA** — installable web app with offline shell.
- **Reservation** — amount held as pending while a payment is in progress.
- **Tenant** — one chapter's isolated data scope.
- **Webhook** — signed server-to-server callback from PayMongo.

---

## 26. Appendix: route catalogue

The full 116-route inventory with phase and roles lives in
`docs/website-plan/pages.json`. A route existing does **not** mean its feature
is connected — consult §2.

Surfaces:
- **Public** (`/`, `/events…`, `/results`, `/rankings`, `/chapters…`,
  `/community…`, `/help…`, `/contact`, `/policies/…`, `/stories…`, `/media`,
  `/about`, `/partners`).
- **Identity** (`/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`,
  `/auth/action`, `/onboarding`, `/invite/[token]`, `/workspaces`).
- **Portal** (`/app/…`: profile, security, notifications, crews, register,
  entries, verification, consents, dependents, payments, payment-return,
  passes, event-day, scorecards, advancement, tickets, support, privacy).
- **Admin** (`/admin/[chapterId]/…` and `/hq/…`).
- **Console** (`/console/[eventId]/…`: judge, head-judge, penalties, battles,
  check-in, marshal, audio, broadcast, incidents, sync).
- **Arena live** (`/arena-live/[eventId]/…`).
- **System** (`/offline`, `/maintenance`, `/not-found`, `/error`).

### API summary (selected, for integrators)

| Method and path | Purpose |
| --- | --- |
| `GET /healthz`, `GET /readyz` | Liveness / readiness |
| `GET /v1/chapters/{id}/session` | Authenticated chapter session |
| `GET …/entries/{entry}/quote` | Fee, paid, pending, available (minor units) |
| `POST …/entries/{entry}/pay` | Manual payment reference (pending) |
| `POST …/entries/{entry}/paymongo/checkout` | Reserve + create PayMongo session |
| `POST …/entries/{entry}/paymongo/cancel` | Release reservation / expire session |
| `POST /v1/chapters/{chapter}/finance/payments/{id}/reconcile` | Finance makes a reasoned, operation-ID-bound decision on a pending manual reference |
| `POST /v1/chapters/{chapter}/finance/payments/{id}/refund` | Finance records a reasoned full manual-ledger reversal after confirming the external bank/cash refund; no provider transfer occurs |
| `POST /v1/paymongo/webhook`, `/v1/webhooks/paymongo` | Signed provider callbacks |
| `POST /local/session` | Local-testing sign-in only (absent from production build) |

Exact paths and payloads: `apps/api/src/main.rs`.

---

*This manual describes current behavior and honest gaps. Update it, `memory/status.md`, and the task evidence whenever a workflow's status changes, then run `python tools/workspace.py index`.*
