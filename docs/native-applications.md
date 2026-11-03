# Native chapter and studio proposal intake

The public `/community/apply` page accepts chapter, studio hub and brand/event
partnership proposals inside WSB. It collects the organization name and region,
the requester's role and contact, an optional public URL, and a short proposal.
The applicant selects a regional chapter; the Rust inquiry command stores a
chapter-scoped private conversation and returns its durable reference. A
capability key allows the requester to continue the conversation without a
chapter account. Exact retries keep the original receipt.

The selected chapter's support or chapter-director role can read the request,
reply, and update the conversation status using the existing server-authorized
support queue. Global HQ users with a current `globalMembers/{uid}` grant can
also use `/hq/applications` to read private application threads across
chapters, reply, and update communication status. Application indexes are
written in the same transaction as new proposal intake and updated with each
reply. The index contains only the inquiry ID, chapter, category and timestamps;
the private conversation remains in its chapter scope. Incorrect keys,
cross-chapter access and unauthorized staff actions continue to use the inquiry
access checks. Request text does not enter a public chapter or studio directory.

This is a **proposal intake and follow-up**, not an affiliation approval. It
does not create a chapter, studio listing or partner agreement, issue a license,
promise a response time, or assert that WSB accepted the proposal. Formal
affiliation approval, refusal, licensing or partnership decisions are not part
of this queue. It uses existing communication states only; the review rubric,
decision states and approved privacy/retention lifecycle remain unfinished.
Global HQ membership provisioning remains separate. The form routes requests
to an existing selected chapter's support team and says so before submission.
Proposals received before the global index was introduced can be added through
the idempotent `backfill-global-applications` migration. It reads each chapter's
inquiry records, writes only the metadata index, and refreshes stale index
revisions transactionally without replacing records owned by another chapter.
The command requires explicit `demo-wsb` confirmation and a local Firestore
emulator; it cannot target a production project. From the running Docker stack:

```powershell
docker compose --env-file .env.docker exec -e WSB_MIGRATION_CONFIRM=demo-wsb api cargo run --locked -p wsb-api --features local-testing -- backfill-global-applications
```

The command reports aggregate counts only. It does not print requester names,
email addresses, proposal text or capability keys. Global HQ's queue remains
based on index records, while chapter queues continue to read chapter-local
inquiries.

Only demo-wsb data is used for local verification. Browser fixtures use
synthetic organizations, names, emails and messages. `tests/applications-browser.cjs`
checks chapter, studio and partner proposals, chapter reviewer replies,
wrong-key denial, and requester recovery after reload at desktop and mobile
widths.
