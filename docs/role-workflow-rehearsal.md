# Role-by-role workflow rehearsal

The [2 November local demonstration](role-demo-2026-11-02.md) records executed
browser coverage for 18 visitor/account cases and 47 pages, plus separate action
scenarios. Remaining adversarial cases and planned roles below are not implied
complete by those results.

This runbook defines synthetic rehearsal paths for implemented public,
participant, chapter, event-duty and Global HQ workflows, and tracks role families
awaiting their own implementation. It is preparation, not evidence that workflows
passed; run implemented paths only after the implementation phase is complete.

## Safety and prerequisites

- Use only the isolated `demo-wsb` Docker emulators and generated synthetic files.
  Never use real dancer records, identity documents, payment credentials or live
  provider accounts.
- Use the shared synthetic password in the ignored `.env.docker` file. Do not put
  it in notes, screenshots or evidence reports.
- Keep each role in a separate browser profile or sign out through `/workspaces`
  before switching accounts. Record the account, chapter, event, operation ID,
  result and recovery evidence without recording private document contents.
- When an account has more than one chapter membership, choose the target chapter
  from `/workspaces` first; the API must return the role from current membership
  and deny revoked or expired chapter access regardless of the saved selection.
- Confirm that the API, web app and emulators are healthy. A `release_ready=false`
  response is expected; this is a local rehearsal, not a production approval.
- Do not treat a seed fixture, user-supplied rules reference, clean malware scan,
  or successful UI action as proof of official eligibility or consent.

Local startup and seeded account details are maintained in
[`local-docker.md`](local-docker.md). The current automated runner,
[`test-rehearsal.ps1`](../tools/test-rehearsal.ps1), covers a subset of synthetic
workflows and explicitly does not cover the complete authenticated event journey.

## Seeded accounts

| Rehearsal role | Local account |
| --- | --- |
| Crew manager / payer | `manager@ph.wsb.test` |
| Dancer | `dancer1@ph.wsb.test`, `dancer2@ph.wsb.test` |
| Guardian request participant | `guardian1@ph.wsb.test` |
| Registrar | `registrar@ph.wsb.test` |
| Identity reviewer | `verifier@ph.wsb.test` |
| Finance administrator | `finance@ph.wsb.test` |
| Chapter director | `director@ph.wsb.test` |
| Judge panel | `judge1@ph.wsb.test`, `judge2@ph.wsb.test` |
| Head judge | `head@ph.wsb.test` |
| Marshal / check-in operator | `marshal@ph.wsb.test` |
| Audio operator | `audio@ph.wsb.test` |
| Support agent | `support@ph.wsb.test` |
| Auditor | `auditor@ph.wsb.test` |
| Other chapter manager | `manager@hk.wsb.test` |
| Multi-chapter manager | `multichapter@ph.wsb.test` (one UID, `ph` and `hk` memberships) |
| Global HQ administrator | `hq.admin@wsb.test` |

The account-holder onboarding case uses a newly created unique synthetic email
address (for example, `wsb-rehearsal-<run-id>@example.test`) rather than a seeded
account, because seeded users are already email-verified. Retrieve its action
code only from the isolated Auth emulator; never use a real mailbox or provider.

The rehearsal-only `verifier` and `auditor` memberships are added by an additive
seed migration. Existing fixture edits and revocations are preserved. `up` does
not reset emulator volumes or account passwords.

## Role workflows and expected boundaries

Complete each implemented path as both the authorized role and a denied role.
Capture server responses/receipts and persisted state after reload; UI appearance
alone is insufficient.

| Role | Workflow to rehearse | Required denial or limitation |
| --- | --- | --- |
| Visitor / spectator | Open the homepage chapter section and `/chapters`; confirm neither page presents unverified countries as active chapters; follow the clearly labeled official country-directory reference; open the WSB-owned chapter proposal form; browse sourced event information; open an unlisted synthetic event slug and confirm it reports no published details; revisit the public result projection after the judging phase publishes it. | The external country directory remains a source reference, not a WSB-app workflow; proposal submission does not grant affiliation. Unpublished entries, private scores, identity cases and payment records stay inaccessible; unknown slugs do not imply an event, price, date or open registration. |
| Account holder | Start account creation from an invitation or registration link; create a synthetic account with an unverified email, sign out/in before confirming and verify it returns to `/verify-email` with the original allowed destination intact. Apply the emulator verification action and confirm it returns to that WSB destination. Return to `/verify-email` and refresh status, then request a change to a second synthetic address and confirm the old address remains active until its action link is applied. Sign out/in with the confirmed address, update the account display name, inspect security state, submit a support request and recover its thread after reload. For an account with multiple chapter memberships, load the paginated chapter list, switch chapters, and confirm each workspace shows the selected chapter's current server-verified role; switch accounts while a page is loading and confirm old membership results are discarded. Change active chapter in another tab and confirm the mounted workspace clears old chapter state while the new membership session is checked. | An unverified account cannot enter connected workspaces; verified email still grants no chapter membership. An external or disallowed `next` destination is rejected. A wrong password, stale authentication, duplicate address or expired/used action code must not change the account email; each failed link offers the correct recovery route. The profile display name is not a legal or roster name. Support authority grants no crew, finance or staff permissions; other device sessions are not claimed as revoked. Chapter memberships from a previous UID must never appear in the active selector. |
| Crew manager / payer | Create or open an owned crew, invite dancers, assemble a roster, create an event entry, submit a payment reference, and upload/submit a synthetic music file. Where the local test checkout is enabled, start one test checkout, retry the same operation, simulate settlement, reload, and confirm the saved record remains labeled simulated. Reopen the records after reload; accept a dancer invitation, receive entry-review, manual music-review, payment-transition, and stage-position updates. When another rostered member pays, confirm the manager gets a status summary through the owned entry workspace while payer details remain private. Open the payer's saved record and compare its displayed currency, reference and status with the authorized API response. Refresh the event-day call sheet and confirm it reports each loaded owned entry's current stage position. Confirm each notice increments unread count once; repeated read acknowledgement decrements it once and survives reload. | Cannot review its own eligibility evidence or settle a payment; another manager's crew, entry and payment record are denied. A saved ledger record is not an external payment receipt. The local checkout does not call PayMongo or move money. A music review notice reports a manual outcome only and does not establish compliance/readiness. A call sheet and recorded online check-in are not venue passes. Division change, substitution and withdrawal requests are not self-service; the entry changes screen records nothing and points to account support. |
| Dancer | Accept an invitation, inspect own crew/entry state, create a private identity/residency case using a generated synthetic file, and recover its saved state. While invitation acceptance is pending, switch accounts and confirm the old response cannot show a successful join; reject a response for another crew/chapter or one that omits the dancer's membership. During venue rehearsal, confirm an eligible online check-in creates a private in-app arrival notice; refresh the event-day call sheet and confirm only entries containing the dancer are returned. | Cannot read another dancer's private object or sign as that dancer's guardian. The call sheet and online check-in are not venue passes. |
| Guardian | Respond to a dancer's relationship request, then verify generic notices for creation, response and withdrawal, plus exact-retry/reload recovery. Open a new notice for a request outside the first list page; check chapter switching and expired sign-in recovery. After a counterpart becomes unavailable, reload and withdraw the redacted pending request; check both participant roles and exact withdrawal replay. Page through more than 100 synthetic requests, including an empty filtered page, and refresh after adding another request. | Expired counterpart access prevents new requests and responses; the unavailable account reference is redacted in the list, linked view and withdrawal response. Other accounts' request links and cursors must not grant access. `awaiting_verification` grants no guardian authority, event consent or readiness. Notices contain no identity details. Do not test or imply approved waiver signing. |
| Registrar / registration reviewer | Read the assigned registration queue and review a newly submitted synthetic entry, including a correction/review cycle where the current workflow permits it. Confirm an approval queues notices for current roster members, including across worker restart and exact review retry. | Cannot reconcile money, inspect judge scorecards or access a different chapter; removed or inactive roster members receive no new notice. |
| Identity reviewer | Open a pending, clean-scanned synthetic verification case, record an audited decision, then confirm owner-visible status and one generic owner inbox notice after an exact retry. Exercise malformed JPEG/PNG, oversized dimensions, parser timeout and over-limit PDF streams using generated files; none may become a pending reviewer case. While a document preview is open, switch the signed-in account or chapter and confirm the preview, loaded cases, selected files and notes clear; return as the reviewer and confirm the old UID-bound request cannot repopulate state. | Uploading, unscanned, malformed-raster/PDF and cross-chapter cases remain unreadable. The notice contains no review note or document details. Account/chapter changes clear reviewer state and late responses must be ignored. Review does not establish age, guardian authority, waiver consent or readiness. |
| Finance administrator | Reconcile a synthetic manual payment reference with a reason, inspect the balance, exercise exact replay, and record a full manual ledger refund only after a synthetic external reversal is confirmed. Use local provider simulation only where implemented. | No real charge or refund is initiated; the refund action changes only the ledger. Provider-linked refunds, eligibility policy and separate approver authority remain gated; finance cannot change entry eligibility or scores. |
| Chapter director | Create/edit a private event draft, save registration-window and division-policy drafts with a human reason, save private chapter content as a plain-text draft and reopen its revision rail, load an earlier revision into the editor and save it as a new revision, invite an existing account into a chapter role, revoke a pending invitation, manage event assignments and division judge panels, create/configure stages, page the eligible marshal picker and change marshal access with reasons, verify stale eligibility is rejected at save and added/removed marshal notices and exact-retry deduplication, publish/unpublish one active held stage to the public display, and inspect chapter audit history. On event creation, deliberately lose the response, reload and retry; confirm the same operation recovers the same event. Verify assigned staff and added/removed judges receive durable notices. Create and activate a synthetic battle draft, then verify one private close notice reaches its saved creator while that creator's membership is active. Page the battle list past one page with load-more, reload the screen, recover a saved draft's panel and server revision through edit/load, and activate that recovered draft only after its revision loads. | Draft rules do not become official or activate registration; content drafts are not reviewed or published; invite links are UID-bound and single-use; cannot access another chapter or silently alter a locked result. Public display contains no dancer IDs, rosters, scores, payments or draft lineup; an inactive/performing stage and a second concurrent public-stage selection are rejected. A battle notice does not mean a bracket advanced, and a revoked/expired creator receives no notice. Event advancement/quota, scrutineer report export, event broadcasts and music-cutoff/currency/auto-lock settings screens report unavailable rather than accepting input. |
| Invited staff member | Open the one-time link while signed into the target account, accept the invitation, then sign in again and verify the new chapter workspace and access expiry. | A different UID, expired/revoked link, duplicate acceptance, cross-chapter resource, or API access after membership expiry must fail. |
| Judge / battle judge | Receive and inspect notices when added to or removed from a panel; vote only in an assigned active battle and inspect the stored closure outcome; while online, opt to save the assigned-entry lookup list and save each scorecard draft on the trusted device; disconnect, reopen the saved lookup and scorecard, reconnect, and inspect receipt/conflict state. With a scorecard open and a sync or save pending, switch account or active chapter and confirm the workspace clears, requires trusted-device confirmation again, and late activity does not overwrite the new scope. | Cannot read peer drafts, an unassigned entry, or submit after lock. Queued is not accepted; cached entry IDs do not prove current assignment, a closed match does not prove this judge voted, and no bracket advancement is inferred. A stale response from the previous account or chapter must not alter the active scorecard. |
| Head judge | Open the connected head-judge console: review per-division panel completeness (approved entries, recorded scorecards against approved × panel size, unready entries), open a division review, record and revise technical deductions per entry with revision-conflict recovery, and lock a fully complete synthetic division. Confirm the lock button stays disabled while the panel is incomplete or entries are unready, lock requires a second explicit confirmation, an expired panel membership is rejected by the lock transaction, and an ambiguous response reloads saved state before retry. Confirm deductions are rejected after lock and a lost deduction response is recovered by retrying the same save. Publish only through the authorized desk if no unresolved policy gate applies. | No score edit on behalf of a judge; unresolved ties/corrections do not get invented or silently published. Completion counts do not flag discrepancies because no approved discrepancy threshold is configured. Deduction values are recorded as entered; no official deduction catalog is implied. A director reviewing the same division cannot enter deductions. |
| Backstage marshal / check-in operator | Use the bounded candidate lookup to select an approved, ready synthetic entry and roster member; verify the person separately, record arrival online, retry the action, load bounded history, and move a stage entry through allowed states. Confirm the eligible dancer receives an arrival notice, the crew manager receives each stage-position update, and current roster members receive queued stage updates after worker delivery. When a different assigned marshal changes a stage hold, confirm one in-app notice reaches each other active stage marshal and the exact retry does not duplicate it. Restart the API and retry delivery; check duplicate, revoked-member and removed-roster behavior. Change eligibility after loading a candidate and confirm the save is rejected by the authoritative recheck. | No identity-file, finance-history or offline pass access. Candidate lookup data can be stale and is not a pass or proof of identity. Hold notices do not reach audio/lighting staff or external channels. |
| DJ / audio operator | Read the assigned event's current lineup and download the local synthetic export with manifest. | Other events and unreviewed/non-clean media are excluded; local export is not production Storage access or proof of compliance. |
| Support agent | Read and reply to chapter support conversations, and confirm requester recovery. For an account request, confirm the requester receives one generic inbox notice after an exact retry and can open the referenced conversation. | Cannot impersonate a requester, read verification documents, change a payment, or grant business roles. Anonymous contact requests have no account inbox; a different chapter or account cannot open the conversation. |
| Auditor | Read bounded, newest-first chapter audit pages, filter loaded records by action, actor and resource, scan multiple batches including legacy rows and verify continuation and revoked-access handling, export the matching loaded rows, revoke audit access and refresh or load another page to confirm saved rows and export access clear, and confirm audit data is read-only. | Cannot create, change or delete business records; exports are limited to records actually loaded. |
| Other chapter manager | Repeat allowed manager reads in `hk`, then attempt `ph` resources and commands. | Cross-chapter access must fail even with a valid sign-in and guessed IDs. |
| Global HQ administrator | Read chapter directory, integration indicators and the bounded notification-queue sample, manage chapter staff, and review indexed proposal conversations. Run the demo-only historical application-index backfill against the local emulator first so historic synthetic proposals appear, and confirm it prints aggregate counts only. During the later queue rehearsal, confirm a recorded failed attempt appears in the sample and a recovered completed job leaves it. | Chapter membership does not imply HQ membership; non-HQ accounts cannot read queue status. Samples do not prove total failure history, and configuration presence does not prove connectivity or release readiness. No affiliation decision or unsupported HQ preview action is implied. The backfill is a demo-wsb migration, not a production provisioning step. |

## Role families awaiting their own workflows

These duties are in the product role catalogue but do not yet have a distinct,
authorized workflow. Do not impersonate them through another role during the
implemented-role rehearsal. Add their listed path to the later all-role run only
after the feature and its authority are implemented.

| Role | Planned rehearsal path | Required before rehearsal |
| --- | --- | --- |
| Consent reviewer | Review an event's versioned waiver, confirm the authorized signer and guardian relationship, and verify how the consent decision affects readiness. | Approved event-specific waiver references, minor signer/guardian-verification policy, signer authority, consent readiness and retention/deletion rules. |
| Attendee / ticket buyer | Review an event's organizer-configured offer, complete native checkout, retrieve the issued entitlement, and check entry or refund status. | Confirm pilot scope, event-owned price/inventory/admission terms, refund/transfer policy, provider settlement and the relationship between a spectator entitlement and venue credentials. |
| Studio coordinator | Switch among only explicitly delegated crews, coordinate allowed roster tasks and compare summarized readiness without opening personal evidence. | Implement server-managed delegation, expiry/revocation, scoped crew reads and the private-evidence boundary. |
| Refund approver | Review a separate refund request, approve or deny with reason, and confirm the provider result and ledger receipt remain linked and idempotent. | Approve separation-of-duties authority, refund eligibility, evidence requirements and PayMongo cancellation/refund reconciliation. |
| Event manager | Coordinate assigned-event schedule, announcements, incidents and operational readiness without gaining director or judging powers. | Define the role and assignment authority, timetable publisher/source, broadcast audience/channels and incident schema/access/retention. |
| Technical judge | Record a sourced violation and deduction against the assigned entry, then confirm the authorized review and audit trail. | Approve the deduction catalog, rule versions, role assignment and correction/review authority. |
| Battle operator | Create a bracket from approved inputs, progress winners and handle byes, withdrawals and corrections under the event rule version. | Approve bracket size/seeding, round construction, byes, withdrawal/disqualification, correction and advancement rules. |
| Broadcast operator | Preview an authorized scene, take it live, handle a stale feed and retract a scene without exposing private scores or personal data. | Implement the separate role and production display/video delivery; confirm event activation, content rights, allowed public fields and takedown authority. |
| Content editor | Create and revise scoped chapter/global content, preview it, and submit it for review without publishing. | Implement editor grants and content revision/media rights, privacy and retention rules. |
| Content / result publisher | Publish approved content or an authorized locked result, then exercise the approved correction/retraction path and verify public projections/notices. | Implement separate publication grants, content review policy and result correction/republication authority. Current director/head-judge publication controls do not establish this separate role. |
| Global rules administrator | Create a sourced, versioned rule proposal, obtain approval, set applicability/effective dates and confirm event drafts retain their original rule version. | Identify rule authorities and approval roles; provide applicable event sources and correction/withdrawal process. |
| Global administrator | Appoint or revoke chapter leadership and perform exceptional access governance with a reason and durable audit. | Implement audited global provisioning, authority limits, recent-authentication requirements and appeal/recovery policy. |
| Platform operator | Inspect service and queue health, recover an operational failure, and confirm technical access alone never grants business-record access. | Implement least-privilege operator identity, safe recovery/maintenance controls, alerting and audit without exposing business content. |

For a synthetic event identifier containing URL-reserved characters, include
notification links in the later rehearsal and confirm they open the intended
event while cross-chapter access remains denied. Earlier notices are not rewritten.
During queue recovery rehearsal, include a malformed synthetic job alongside a
valid job and confirm the valid job still progresses; verify the recorded-failure
sample is not treated as a complete count of malformed or failed jobs.
After publishing a division, confirm each eligible crew manager and current
roster member receives one generic result notice, opens the correct participant
results workspace, and cannot read another chapter's entry. Include publication
retry, worker restart, duplicate delivery and membership revocation in this case.
While an inbox request is delayed, switch accounts or chapter workspaces and
confirm the new workspace never displays the previous account's notices or unread
count; check that a stale acknowledgement cannot affect the new account. Revoke
membership and refresh or acknowledge a notice; a 401/403 must clear the displayed
inbox and unread count. Return an empty continuation cursor, duplicate IDs within
or across pages, a negative/non-integer unread count, and an acknowledgement whose
record remains unread; verify each malformed response is rejected and never shown
as a successful read. Also seed malformed stored destinations (protocol-relative,
backslash-based, control-character, and overlong values) and confirm the API
fails the page closed; attempt to enqueue an invalid destination and confirm no
inbox write or unread-count change commits. During concurrent acknowledgements, allow the separately
read page and unread summary to reflect adjacent snapshots without dropping valid
notices.
For the participant call sheet, leave the page visible through a synthetic stage
change, then hide and reopen it, disconnect and reconnect, and simulate a partial
entry failure. Check the last complete check, offline message, read-only batches
of at most four entries, account switch and membership-revocation behavior. Submit
an unrelated entry alongside an owned entry and confirm only the owned entry's
stage data is returned; reject empty, duplicate and oversized batches.
For crew management, leave a paged crew list or crew detail load pending, switch
the active account or chapter, and confirm old roster data is cleared and a late
response cannot repopulate it. Confirm crew creation and invitation responses are
bound to the current UID, and malformed or wrong-chapter API responses do not
produce a navigation or shareable invitation link.
For performer selection, keep an entry/crew read or roster save pending while
switching accounts or chapters. Confirm the old roster and consent indicators
clear, a late response cannot restore them, and only a response matching the
active chapter, event and entry can show a successful save.
For entry registration and review, keep detail reads, paginated crew/division
choices, create, submit and review requests pending during an account or chapter
switch. Confirm old entry/readiness data stays cleared, stale responses cannot
navigate or acknowledge success, and only chapter/event-matching responses are
shown.
For payment records, keep a finance page or reconciliation/refund response
pending while switching account or chapter. Confirm prior payment rows and
review reasons are cleared, the payer view contains only the active payer's
records, late results cannot update the new workspace, and any changed payment
matches the requested payment ID and chapter.
For support conversations, keep chapter queues, conversation reads or a reply
pending while changing account or chapter. Confirm old requester details and
messages clear, requests are bound to the active UID, and only a response for
the selected chapter and conversation can update the inbox or acknowledge a
reply.
For identity evidence, confirm a returned case with a mismatched chapter, owner,
case identifier or canonical private Storage path is rejected before it appears
or is opened. After upload and review, confirm each receipt matches the active
case and owner/chapter scope before the UI reports success.
For the judge lineup, keep a paginated assignment request pending while switching
account or chapter. Confirm old entry links clear and a late or malformed response
cannot create scorecard links outside the current event and membership scope.
On the saved-score screen, use a synthetic malformed local outbox row with a
missing command or invalid state. Confirm sync does not send it, marks it for
review where possible, and the list still renders the other valid commands.
For music review, keep a queue page pending while switching reviewer accounts or
chapters. Confirm old entry references clear, the request uses the active UID, and
malformed or late queue responses cannot expose another reviewer's entries.

## Policy-gated and unimplemented roles

These roles must be reported as not ready, not represented as passing workflows:

- Guardian authority, event-specific waiver signatures and consent readiness wait
  for the approved rule text and verification policy references.
- Attendee ticketing and signed/offline QR passes wait for ticket, expiry and
  revocation/reconciliation policy and implementation.
- Studio coordinator, separate refund approver, broadcast operator, content
  editor/publisher, global rules administrator, event manager and platform
  operator do not yet have complete authoritative workflows.
- Battle judge ballots can be rehearsed only as the implemented isolated voting
  primitive. Bracket seeding, round construction and advancement require approved
  competition rules.
- Ranking, advancement, tie handling and result correction/republication remain
  gated by authoritative policy. The event advancement/quota screen, scrutineer
  report exports, director-composed event broadcasts, entry change/withdrawal
  self-service, venue incident logging and a separate penalty desk all report
  unavailable; technical deductions live only in the head-judge division review
  and accept values as entered until an official deduction catalog is approved.
- Production PayMongo, Firebase Auth/Firestore/Storage, scanner connectivity,
  deployment controls and live email delivery are outside the local rehearsal.

## Synthetic provider callback case

Keep this technical check distinct from the payer's in-app local checkout
simulation. After the feature phase, use only the local PayMongo emulator to
create a v2-shaped synthetic session, expire an unpaid session, generate a
synthetic paid callback, deliver it twice, and verify one ledger settlement after
reload. Confirm the callback is signed with the local-only secret, the session
and reservation match, and a duplicate event does not credit the entry twice.
The API/browser `local-checkout-simulate` action alone does not prove the signed
provider callback path. `tests/paymongo-emulator.cjs` covers the emulator's
session/idempotency/expiry behavior; signed WSB settlement/recovery evidence is
recorded separately in [local Docker](local-docker.md). This is local contract
evidence only; the real PayMongo v2 adapter, account payment methods, webhook
fixtures, provider refund behavior, and failure reconciliation remain release
gates.

When checkout returns an uncertain 502/503, confirm the payer sees that the
reservation may remain pending and the same amount/operation must be retried;
when it returns 409, confirm the payer is told not to start another payment and
to refresh status or contact finance. Never present either response as paid.
Also confirm a missing or mismatched URL/session/amount response does not redirect
or claim a synthetic session initialized, and leaves the saved operation ID in
place for recovery. While a checkout response is pending, change accounts or
chapters and confirm the old response cannot redirect or alter the new payer
workspace.

## Public stage display case (deferred)

During the later director rehearsal, publish the held active stage with a reason,
confirm the public view shows current crew/division labels, then unpublish it and
confirm the display returns to its waiting state. Exercise exact retry and changed
operation conflict, a second stage selection conflict, and attempts to publish an
inactive or performing stage. Inspect the public response for absence of dancer
identity, roster, entry ID, score, payment and draft lineup; disconnect polling
and confirm the last factual state is marked stale. This case has not been run.

## End-to-end order

1. **Public and account entry:** visitor reads only public content and submits a
   synthetic chapter proposal through the native form; account holder completes
   unverified-email onboarding and confirms the membership gate; a multi-chapter
   account selects a membership in `/workspaces`; crew manager creates/opens a
   crew and issues an invitation.
2. **Roster and readiness inputs:** dancer accepts the invitation; manager
   creates an entry, submits synthetic evidence/music and a pending payment
   reference; guardian request stays explicitly unverified.
3. **Independent review:** registrar reviews the entry; verifier reviews only a
   clean-scanned pending case; finance reconciles a synthetic reference. Confirm
   each action is durable and does not update unrelated readiness fields.
4. **Judging and publication:** director confirms draft configuration; judges
   submit their own cards and one reconnect scenario; head judge verifies
   completeness, locks and publishes only when policy permits.
5. **Event day:** marshal checks in and advances stage state online; audio
   operator exports the assigned synthetic event package; repeat a lost-response
   retry and reload each saved state.
6. **Oversight:** auditor pages read-only history; support agent answers a
   separate support thread; HQ administrator checks global-only functions; HK
   manager attempts a PH resource and is denied.
7. **Closeout:** confirm the public projection contains only published fields,
   exact replays do not duplicate money/scores/audits, revoked or expired roles
   lose access, and incomplete policy-gated workflows remain unavailable.

During step 1, sign in as `multichapter@ph.wsb.test`, verify both `ph` and `hk`
appear in the current-membership selector even though the token's sample
`chapterId` claim names only `ph`, choose each chapter, and confirm the returned
role is resolved from that chapter's server membership.

## Evidence and exit criteria

For every row above, record the role and scope, action, expected and observed
result, operation/revision or receipt reference, persisted reload/restart result,
denial result, and relevant browser/API evidence. Keep screenshots free of real
personal data and do not record document contents, secrets or unpublished score
values in workspace memory.

The rehearsal is complete only when all implemented-role rows have positive,
negative, replay and recovery evidence; unimplemented/policy-gated rows are
explicitly documented as blockers; cross-chapter and role-escalation checks pass;
and a release reviewer records the remaining provider, policy, backup/restore,
accessibility, performance and deployment gates. A passing local rehearsal does
not certify production readiness.

## Event timezone display case

During the later chapter-director rehearsal, configure a synthetic registration
window in the saved event timezone, then open the event command center from
browsers configured for different device timezones. Confirm both displays show
the same event-local cutoff and timezone label, and compare the displayed instant
with the saved registration-window response. Also confirm a missing or invalid
event timezone is reported as a configuration issue rather than shown in the
viewer timezone. This case has not been run.
For registration queue pagination, keep the registrar list request pending while switching accounts or chapters. Confirm the queue remounts empty, reads are bound to the current UID, and late or malformed chapter/event pages cannot restore prior entries or create review links.
For chapter content and division-policy draft history, keep a page request pending while changing accounts or chapters. Confirm revision lists use the current UID, old draft/history data clears, and late responses cannot repopulate a different chapter's editor.
For personal results, keep the event-entry page request pending while switching the active account or chapter. Confirm the list is UID-bound and rejects malformed or mismatched chapter/event entries before showing published-result controls.
For guardian requests, confirm malformed list or owner-scoped link responses (wrong chapter, actor, ID, lifecycle status, revision, or unavailable-counterpart redaction) are rejected before request actions appear. Inject repeated or out-of-order request IDs, a duplicate from an earlier page, malformed cursors, and a cursor that does not advance; the browser must reject the page without duplicating rows or entering a pagination loop. Check both dancer and guardian views and verify a guardian confirmation remains “Awaiting relationship verification” without changing dependent access, waiver consent, or readiness.

Also inject malformed success receipts for create, response and withdrawal: wrong chapter, actor, request ID, decision status or revision must retain the saved retry and must not show a success message. Retry the same operation with a valid receipt and confirm the recovery reference clears. Include a withdrawal receipt with an unavailable counterpart and properly redacted reference.
For staff access management, keep membership, invitation and event-assignment pages pending while switching accounts or chapters. Confirm director-only state remounts by UID/chapter, all paged reads carry the current UID, and malformed rows or wrong-chapter/event responses cannot populate grant, revoke or assignment controls.
For director staff mutations, return malformed or mismatched membership, invitation, or assignment receipts (wrong chapter, target UID, role, invitation ID, event, or resulting active state). Confirm the UI keeps retryable invitation state and never reports a change as saved from a receipt for another target.
For judge-panel configuration and results publication, keep division/panel reads or publish responses pending while changing accounts or chapters. Confirm private requests carry the current UID, old state unmounts, malformed division/panel/publication receipts are rejected, and only a current head judge or chapter director can reach the publication controls.
For Global HQ, keep chapter access, chapter directory, platform status, and proposal queue/thread reads pending while switching HQ accounts. Confirm each request is tied to the verified HQ UID, old state is cleared/unmounted, and late proposal threads or chapter-staff responses cannot appear in the new account or selected chapter. Submit a deliberately mismatched HQ mutation receipt and confirm it is not reported as applied.
For director event management, keep an event-list page, event-draft save, or registration-window save pending while changing account or chapter. Confirm old rows and form state do not cross scopes, malformed or wrong-chapter event rows and receipts are rejected, and stale page/save responses cannot update the new workspace or report a save for another event.
For chapter audit history, return a page with a wrong chapter, malformed record, invalid timestamp or oversized cursor and confirm it is rejected without rendering or exporting. Confirm legacy records with omitted optional reason/correlation fields remain readable. During load-more, return duplicate IDs within the page and IDs already present on a prior page; confirm the feed remains deduplicated. Confirm the export label and downloaded scope cover only loaded records and never imply a complete archive.

For public results, return a non-array payload and snapshots with a mismatched event, missing chapter/publication metadata, invalid digest, duplicate entry, non-finite/out-of-range score, or invalid rank. Confirm the page shows a temporary unavailable state and never renders partial or malformed standings. Also open a valid published projection and confirm only its public fields appear. This case has not been run.
For public standings, also return duplicate valid division snapshots or repeat one entry across snapshots; confirm the entire response is withheld instead of showing duplicate placements. This case has not been run.
For the chapter publication desk, return duplicate valid division snapshots, duplicate publication IDs or an entry repeated in multiple divisions; confirm the receipt list is rejected and no stale or duplicate publication appears. This case has not been run.
For notification worker recovery, corrupt the synthetic job's `next` field while leaving its document ID and failure metadata readable. Confirm the worker records a retry cooldown, stops repeatedly attempting that job during the cooldown, and continues valid jobs on the same page. Repeat with multiple worker instances; no duplicate inbox notices or lost progress should occur. This case has not been run.

During notification rehearsal, mark more than one loaded notice read, stop a batch while a request is pending, refresh and retry remaining notices, and verify unread counts and account/chapter isolation. Include access revocation during a batch.

During the crew manager and dancer rehearsal, scan a newly created one-use crew invitation QR, complete the intended account flow, and confirm reuse and expiration are rejected. Check that the QR represents the displayed link and stays within the current crew/account workspace.

For crew invitations, revoke the displayed link and QR, confirm redemption is denied, exercise a concurrent redemption/revocation race and retry the exact revoked command after a lost response. Confirm a used invitation cannot be revoked as unused and another crew manager cannot revoke it.

For historical crew invitations, reload the manager workspace, page through more than one page of the crew’s records, revoke an unused older invitation by its displayed record, and verify another crew cannot list or revoke it. Confirm no bearer token or dancer identity appears in the history response.

With a crew invitation QR and history displayed, revoke the manager’s chapter access and refresh or attempt revocation; confirm private crew data and the displayed link clear.

For dancer invitation acceptance, lose a successful response and retry the same frozen details; confirm the saved crew is recovered. Exercise unavailable and revoked links and account switches. Reload after a lost response and recover the acceptance without the original form values; deny recovery for another account or a removed dancer and after issuer expiry.

After invitation acceptance, change the crew roster and retry the original acceptance; verify the response reflects current authorized crew membership, excludes removed members, and denies recovery after the accepting dancer is removed.

During invitation rehearsal, inspect response headers for invitation and sign-in pages, verify no referrer is sent when following navigation, and verify the live deployment’s access logs redact invitation tokens and return parameters before activation.

For new crew invitation links, inspect the initial fragment, sign-in and verification return URLs to confirm no token is sent in a request path or query. Reopen the original link in another tab after verification, confirm a missing tab handoff fails safely, and exercise an old token-in-path link with deployment log redaction.

Check that a confirmed crew join clears the tab handoff, while a lost response retains it for reload recovery; verify repeated legacy-link initialization does not leave duplicate handoffs.

For account onboarding, sign in through the onboarding return path, save a synthetic display name, reload to confirm it persists, and switch accounts during a delayed save. Confirm that saving a name grants no chapter access or verified dancer identity.

For battle judging, interrupt a ballot response and retry the same corner, send a malformed or wrong-match response, and verify no acknowledgement is shown until the response matches. Confirm a failed match load or draft cannot expose active vote controls and a definitive denial requires refresh.

For battle ballots, reload after a lost response and recover only the signed-in judge’s saved corner. Check an uncast ballot, a closed match, another judge’s account, panel removal, expired membership and another chapter; no peer ballot may be returned.

With a battle match and ballot visible, switch account or selected chapter while a vote or recovery read is pending. Confirm the previous workspace clears immediately and its late responses cannot update the new judge’s screen.

On the judge battle desk, load an empty filtered page followed by an assigned match, verify loaded-only counts and dynamic round filters, and switch accounts or chapters while loading. Confirm access denial clears prior matches and no automatic bracket advancement or live synchronization is claimed.

For head-judge review, verify an empty judge panel stays incomplete even with approved entries, malformed division data does not enable lock controls, an invalid deduction receipt does not show success, and lost access clears the displayed review. Confirm the server rechecks panel membership on lock.

For division review, use an event with more than 500 synthetic entries across divisions, page through a division including a page containing only unapproved entries, verify other divisions are not scanned, and confirm aggregate completeness, deduction edits, refresh, access denial and lock conflict still reflect server authority.

Save deductions on a later division-review page; confirm the saved row and receipt notice remain visible. Interrupt a save, verify its values remain fixed for retry, check saved state, and exercise a stale revision and concurrent lock.

For deduction operations, lose a successful response, retry the same operation after a later edit and after lock, and verify the original revision receipt without another effect. Reject the same operation ID with changed data or another actor’s receipt, and confirm revoked authority cannot replay. Check that the screen requires a fresh review after a historical receipt.

From a chapter admin workspace, open the event-duty consoles link, enter the assigned event reference and open the appropriate judge or head-judge desk. Confirm it does not lead to the fictional demo scorecard and that each desk still enforces assignment.

For each event-duty role, open the console selector, page assigned events including a filtered empty page, select an event, and verify revoked assignments or expired membership are denied on refresh and at the destination. Switch accounts and chapters during a delayed page request and verify the previous list and selected event clear.

For director event assignments, assign a staff member and confirm the durable notice opens `/console` with the assigned chapter and event. Sign in from the notice, choose the target chapter when the saved chapter differs, and confirm the event selection resumes. Remove the assignment and confirm its notice returns to chapter selection; the event access check and each duty desk must deny the removed assignment even if an old event link remains open.

At duty selection, verify each signed-in role sees its supported desks and cannot enter another role’s desk by guessing a URL. Check director oversight, assigned judge/head judge, marshal, audio operator and registrar views; server checks remain authoritative.

Open an assigned event-duty URL while signed out, sign in, and confirm the same safe console path is restored; repeat with an external or malformed return target and verify it is rejected. The destination must still recheck role and assignment.

Load an assigned event in the duty selector, revoke that assignment before selecting it, then check the event: event-duty links must stay disabled (the local device-sync view remains available without this check). Also enter a revoked reference manually, change the reference while its check is pending, and verify an older response cannot authorize the new selection.
