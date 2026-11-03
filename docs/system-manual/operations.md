# How-to: operate the connected workflows

Use these procedures for synthetic local training and workflow review. Every accepted change needs an authoritative response; a browser message, queued command or payment redirect alone cannot establish completion.

## Register and review an entry

1. As a manager, create a crew at `/app/crews/new`, invite dancers and have them accept through their own accounts.
2. Open `/app/register/local-rehearsal`, choose the crew/division and explicitly select canonical performers.
3. Inspect readiness and submit. An incomplete entry should show correction requirements rather than automatic approval.
4. As registrar, open `/admin/ph/events/local-rehearsal/registrations`, review the entry and return a correction or approve only when the server permits it.
5. Reload and confirm the saved state. If a response was lost, retry identical input through the form's recovery path; do not create a second record to resolve uncertainty.

Paid/pending/submitted/scored states restrict direct roster edits. A stale rule version or deadline can also reject submission. Use an approved correction process when available; the current system does not supply every post-payment correction workflow.

## Review private evidence

The subject uses `/app/verification` to create and upload identity or residency evidence. Authorized chapter staff use `/admin/ph/verification` to open and review the private object. The local technical bounds are PDF/JPEG/PNG metadata and 10 MiB, not an official evidence acceptance policy.

Do not infer guardian consent, eligibility, residency approval under an official rulebook or entry readiness solely from this case. Do not put real evidence into rehearsal or project documentation. Retention and scanning requirements remain release work.

## Track and reconcile payment

1. Read the entry checkout quote before requesting a payment; available funds exclude pending reservations.
2. Use a synthetic manual reference or explicitly labeled local PayMongo checkout.
3. Finance reviews manual references in `/admin/ph/finance/transactions`; a reference stays pending until an authorized decision with an 8–1000 character reason is saved.
4. In local PayMongo rehearsal, simulate settlement through the authorized local action and wait for the authoritative paid status.
5. Reload and verify the balance. A duplicate callback or retry must preserve one credit.

Cancel a local checkout through the system so expiration precedes reservation release. A paid checkout cannot be cancelled as if unpaid. `/admin/{chapter}/finance/refunds` records a reasoned, idempotent full reversal only for a manually reconciled payment, after the external bank/cash reversal has already been confirmed. It changes the WSB ledger and does not move money. Provider-linked refunds remain unavailable pending the approved refund policy and controlled PayMongo validation; partial refunds and separate approver authority are not implemented.

PayMongo keys belong in server configuration only. Switching a local `.env` value does not complete production readiness: production identity, storage, approved rules, provider callbacks, refund recovery and deployment gates still apply. Keep local and production configuration separate using [the example template](../../.env.production.example).

## Judge and recover after disconnection

1. Sign in as an assigned judge and open `/console/local-rehearsal/judge`.
2. Confirm the trusted-device workflow before saving a local draft. Use synthetic scores only.
3. Review the scorecard, queue the command and distinguish queued/sending from the accepted server receipt.
4. For rehearsal, disconnect after loading the assigned workspace, edit a draft, then reconnect and observe acknowledgement.
5. If the server reports a stale revision, lost assignment or lock, read current state and resolve the conflict explicitly. Do not force a cached draft over a later accepted score.

The head judge reviews panel completeness and deductions before locking. The lock transaction shares a consistency barrier with registration approval so concurrent entry changes cannot silently omit required scores. Local draft survival alone does not prove successful submission.

## Check in dancers and operate a stage

Use the assigned marshal account at `/console/local-rehearsal/check-in`. Confirm identity separately, select the exact entry/dancer and verify a saved arrival in the bounded list. This is an online check-in procedure; typed identifiers are not signed admission credentials.

At `/console/local-rehearsal/marshal`, select an authorized stage and refresh its current revision. Normal progression is holding, on deck, performing, then completed. Approval/readiness and roster check-ins apply at the configured transitions; a hold blocks new starts while completion remains available to release a performance.

Directors can create a held stage, assign eligible marshals and deliberately release the hold. Configuration changes require a held, unoccupied stage and matching config revision. Inactive stages remain visible to directors for oversight while marshal access fails closed.

Directors may save an ordered internal draft with approved entry IDs, a reason and the expected revision. Staff can inspect its revision history. Saving this draft does not publish a schedule, enforce start order, notify crews or override entry eligibility.

## Publish results deliberately

Use the chapter publication desk after authorized division locking. Confirm the server's lock/publication state and inspect the publication receipt/digest. Spectator results read the separate published projection rather than private score records.

Stop when a tie/correction outcome needs policy that has not been approved. Do not edit private scores to manufacture a desired public ordering or promise automatic advancement. The published snapshot is immutable; approved correction/republication remains separate release work.

## Handle inquiries and proposals

Visitors use `/contact`; members use `/app/support`; applicants use `/community/apply`. Chapter support reads `/admin/ph/support` and replies with an explicit current revision. A reply is visible to the requester and is not a hidden staff note.

Anonymous requesters must privately retain their reference and access key to reopen a conversation; the reference alone grants no access. Replies stay inside WSB because email delivery is not connected. A proposal receipt proves intake, not chapter/studio/partnership approval.
