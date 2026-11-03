# Native contact and support conversations

The public `/contact`, participant `/app/support`, and chapter
`/admin/{chapter}/support` screens now use Rust/Firestore inquiry records. The
old forms' browser-only acknowledgements, invented references, response-time
promises and fabricated contact numbers/queue statistics are removed.
`WSB.contact` points to `/contact`; the old contact website is no longer the
workflow destination. This is part of the user's system-owned forms requirement.

## Actors and privacy

Visitors can create a contact request without an approved chapter account. A
cryptographically generated 256-bit access key authorizes that one anonymous
conversation only. The browser sends it in an `Authorization: Contact` header,
never in a URL. Firestore stores only its chapter/request-bound hash. The key
cannot read account support cases, list inquiries, authenticate an account or
authorize any registration, finance, verification or judging operation. Incorrect
or missing keys return 404. The page offers private key/reference recovery after
the browser session ends; a reference alone grants no access.

Signed-in support requests are bound to the verified account UID and current
chapter membership. They cannot be accessed using contact keys. Members see only
their own account requests. The `support` role and chapter director can review
their chapter's queue and reply/change support status; those privileges do not
grant access to another chapter or authority to alter payments, entries or scores.
All membership checks are re-read inside the transaction, including before replay.

Requester names/contact addresses are supplied by the requester, not verified
identity claims. Staff views include them, while the requester thread projection
omits email, owner UID and capability hashes. All conversation responses are
`no-store`. Requests/replies stay in the app: email delivery is not connected, and
the interface says to check replies here. No external mail or notifications were
sent by this implementation.

## Storage and consistency

- `chapters/{chapter}/inquiries/{id}` holds the private requester metadata,
  account/capability binding and a safe conversation summary.
- `messages/{sequence}` is an ordered timeline of requester/support text and
  status changes. Numeric sequence IDs are padded for stable document ordering.
  Thread and queue reads are bounded/paginated; they never load an unbounded
  chapter into a response.
- Chapter inquiry intent receipts and per-conversation operation receipts bind
  the complete input to the original response. Retrying the same operation has
  one effect; changing its payload returns 409.
- Replies and status changes carry an explicit expected revision. Simultaneous
  replies on the same revision cannot silently overwrite each other. The losing
  request receives 409 and keeps its unsaved text for review/retry.
- Inquiry, timeline item, receipt and redacted audit commit atomically. Audits
  contain actor/action/reference, not names, messages, email or access keys.
- Server validation bounds fields and message bytes. Transactional per-sender
  and chapter/hour creation quotas reject excess requests with 429; an exact
  retry consumes no additional quota. Contact email is not an authorization key.

Opening an inquiry does not approve a registration, consent or financial change.
Requester replies reopen the conversation; chapter support explicitly chooses
open, in progress, waiting on requester or resolved. Replies/status are visible
to the requester. There is no hidden internal-note field masquerading as a reply.
New staff updates to a signed-in member's inquiry also create a generic private inbox
notice in the same transaction. The notice contains no conversation text and
links to the account support conversation in its chapter. Opening the link
rechecks the account's access; a different selected chapter prompts the member
to switch chapters. Earlier notices may still link to the general support page.
Replays do not create another notice, and current
chapter membership is checked before delivery. Anonymous contact requests have
no account inbox and continue to use their private recovery key.

## Local checks and remaining release gates

The explicit emulator case
`repository::tests::support::inquiry_capabilities_account_scope_replay_staff_races_quota_and_recovery`
passes against demo-wsb. It covers exact replay, altered input, wrong keys,
account/anonymous isolation, chapter scope, paginated ordered messages, reply
races, revocation, support-role financial denial, quota accounting, exact audit
effects and independent repository recovery. It is intentionally ignored in an
ordinary unit run; the persistence runner invokes it explicitly.

Use the Docker test account `support@ph.wsb.test` for the chapter queue. Its password
stays in the ignored local configuration, as with the other synthetic accounts.
`tests/support-browser.cjs` passed at 1365px and 390px: native visitor/account
submission, a deliberately lost successful response followed by reload/retry,
private-key recovery in a new browser context, staff replies/status, account and
chapter isolation, support-role finance denial, and no page errors or horizontal
overflow. Screenshots and synthetic recovery handles stay in ignored local files;
access keys never enter development memory or retrieval.

After a graceful full Docker `down` / `up`, `tests/support-recovery.cjs` passed
against those exact conversations, checking ordered replies, revisions, status
and access boundaries. The production web image build and non-root runtime
HTML/script/branding/no-environment-file smoke passed. TypeScript, default Rust
tests (16), Linux all-features tests (17, with explicit emulator cases separately
invoked), all-target Clippy and workspace tests passed. This completes the bounded
native conversation slice, not the live release or every support feature.

Only demo-wsb has been used for local verification. The explicitly gated
non-demo Firestore runtime is not a release approval. Before live public contact
activation, verify deployment abuse controls, retention/deletion, access-key
expiry/rotation and secure recovery policy. Email delivery and specialized
escalation/assignment are separate work.
Private identity/media, other native forms and the full platform goal remain
unfinished; this feature does not establish release readiness.
