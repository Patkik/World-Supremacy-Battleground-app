# Private identity and residency evidence

## Current local workflow

Signed-in dancers and crew managers can create a subject-owned case for identity
or residency evidence. Rust creates the case and fixed private object path under
the active chapter, then the browser uploads directly to Firebase Storage. The
submit command asks Storage for the object metadata and bytes using a
Firebase ID token. Rust checks the object path, bucket, declared content type
and size, then checks that the byte stream has the corresponding basic PDF,
JPEG or PNG signature before it records a pending submission. The Firebase
token is forwarded only to Storage and is never persisted or logged by the
application. Bytes are held only in a bounded request buffer and are not written
to Firestore, logs or development memory.

Only files declaring PDF, JPEG or PNG content types and measuring at most 10 MiB
are accepted after the corresponding signature check and a ClamAV scan. JPEG and
PNG bytes are decoded in a separate worker process before the scan. Each image
dimension is at most 4096 pixels, total pixels are at most 16,777,216, and the
decoder's 96 MiB allocation limit is best-effort. PDFs receive a bounded header
and EOF-marker check followed by strict structural parsing in a separate worker
process. The parser checks the catalog and root page-tree shape without walking
all pages into a second in-memory map; it limits each decompressed stream to
8 MiB and stops retaining objects after a 24 MiB estimated object budget or
100,000-object ceiling.

One validation process runs at a time. The API sends only the bounded file bytes
and format through stdin; the child inherits no environment variables and its
output streams are discarded. On Linux, the parent sets a 512 MiB virtual
address-space limit and a 20-second soft / 25-second hard CPU limit before
starting the worker. A 30-second wall-clock deadline covers queueing, startup,
transfer and parsing; timeout or cancellation kills the child. Other development
platforms retain the child-process and wall-clock cancellation boundary but do
not receive those Linux resource limits. This is process isolation with resource
limits, not a full OS sandbox: the worker shares the API container and user and
does not have namespace or syscall filtering. The local API requires a
configured private `WSB_CLAMD_ADDRESS`.

Raster allocation limits remain best-effort; PDF object accounting is an estimate,
and parsing does not decode every embedded page resource. Scanner errors fail
closed, and detected or undecodable files are not submitted. These are technical
checks, not an approved list of valid identity evidence or a guarantee that a
clean file is safe. Image/PDF parsing does not validate document claims. Current
review is human and chapter-scoped. Firebase Storage also requires the signed token's authentication
time to be at least the current membership `valid_after` value, matching the API
membership check after role reactivation, and denies direct reads or uploads once
the membership's optional `expires_at` has passed. The interface requires opening
the private object before a decision;
These are technical checks, not an
approved list of valid identity evidence or a guarantee that a clean file is
safe. Image/PDF parsing does not validate document claims. Current
review is human and chapter-scoped. Reviewers must have current active membership in the
same chapter. Firebase Storage also requires the signed token's authentication
time to be at least the current membership `valid_after` value, matching the API
membership check after role reactivation, and denies direct reads or uploads once
the membership's optional `expires_at` has passed. The interface requires opening
the private object before a decision;
the Rust command independently checks the object's metadata and reviewer access,
but does not prove that a person inspected its contents. Staff notes are
length-limited and audited.

Recording a review also creates a generic private inbox notice for the case
owner in the same transaction, subject to current chapter membership. The
notice links to verification and does not include the decision, reviewer note,
or document details. An exact review retry does not create another notice.

The participant browser checks that the extension and declared browser MIME type
agree, rejects empty or over-10-MiB files, and checks connectivity before creating
an upload reference. These checks improve error recovery only; API byte-signature,
size and scanner checks remain authoritative.

Storage objects are immutable and are not cached in the browser's persistent
stores. The durable case records the content SHA-256 and clean-scan status beside
the private path and format/size metadata; it does not store document bytes,
names, birth dates or extracted identity values. Participant reads are restricted
to the subject UID. Direct reviewer reads require current reviewer membership,
the canonical `document` object, a pending case and a clean-scan receipt. Records
created before the scan gate that have no clean-scan receipt are hidden from
reviewer lists and cannot be approved; an owner can start a new case and upload
the file again.
Cross-chapter access,
inactive membership, unrelated UID access, non-member upload, oversized files,
unsupported MIME metadata and unknown storage paths are denied. The durable case
stores a private object path and file metadata, not the document bytes, names,
birth dates or extracted identity values.

Identity/residency review does not imply an age decision, guardian relationship,
event waiver signature or entry readiness. The existing roster consent bit is
not updated by these reviews. Guardian and event consent remain separate,
unimplemented workflows pending approved rule text and signer policy.

## Release gates

- Approve accepted evidence types and age/residency decision policy per event and
  jurisdiction; identify authorized reviewer roles and escalation path.
- Approve guardian relationship verification, event-specific waiver text and
  versioning, signer capacity, language, audit and correction rules.
- Approve malware-scanner operation, signature freshness, false-positive
  handling, production network placement, and any additional content inspection
  before private reviewer access.
- Approve object/document retention, deletion, correction and user request policy.
- Add readiness transitions only through the approved event policy and durable
  transaction, with conflict/race tests against entry approval and check-in.
- Configure production Storage/Firestore integration and identity membership;
  local workflows are restricted to the demo-wsb emulators.

## Verification

Case creation now uses an owner-scoped operation ID and returns the existing
case on an identical retry; a changed purpose conflicts. The submit endpoint
accepts a repeat for a pending case after rechecking ownership, membership and
Storage metadata. An unfinished case lets its owner check an already uploaded
file or select a document to resume an upload. Files remain immutable. Review
decisions also use an actor-scoped operation ID and payload-bound transactional
receipt; membership and the private object are checked again on retry.

The demo-wsb repository scenario passes concurrent create and review replay,
changed payload rejection, pending submission replay, owner isolation, and
denial after reviewer membership revocation. Signed
browser runs at desktop and mobile widths passed deliberately lost create,
submit and review responses, interrupted upload resume, review and reload.

`npm run test:storage-rules` exercises Storage and Firestore rules in the
demo-wsb emulators. The persistent repository tests exercise case ownership,
submission metadata, status transitions, review authority and chapter isolation.
Browser checks use synthetic files only and must not use real identity evidence.
The signed Docker browser path is `npm run test:verification-browser`; it uploads
a generated synthetic PDF, checks the API metadata receipt, opens and approves
the document as a chapter reviewer, then confirms the participant sees the saved
state after reload at desktop and mobile widths. The participant history and
review queue now load one bounded API page at a time; an explicit load-more
action advances the cursor instead of eagerly fetching the whole chapter. An
empty filtered page can still offer another page when the server cursor exists.
The Firestore repository
coverage runs through `node tests/run-firestore-repository.cjs` with
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8188` and `WSB_PERSISTENCE_RUNNER=docker`.
The API and browser integration use demo-wsb only. These checks verify workflow
plumbing and authorization boundaries, including format-signature rejection, not
evidence validity, age/guardian policy, event consent, malware detection,
retention compliance or production identity.

JPEG and PNG decoding uses the documented strict width/height limits and sets an
allocation ceiling; the image crate notes that allocation ceilings are
best-effort and may not be supported by every decoder. A single child process
per API instance now performs either raster or PDF parsing. Its Linux address
space, CPU and wall-clock limits constrain aggregate parser work, while the
per-file format limits remain defense in depth. The 24 MiB PDF object budget is
an estimate rather than an allocator-enforced heap measure, and embedded page
resources are not fully inspected. Validate these limits under the deployed
container runtime with hostile synthetic files before enabling real evidence
collection. Scanner operations, production network placement and reviewer access
remain open release work. See the
versioned [`image::Limits`](https://docs.rs/image/0.25.10/image/struct.Limits.html)
and [`ImageReader`](https://docs.rs/image/0.25.10/image/struct.ImageReader.html)
references.

## Guardian relationship requests (local demo)

The participant /app/dependents workspace connects dancers and guardians to
chapter-scoped requests. Dancers create requests; only the named guardian can
confirm or decline. Confirmation records awaiting_verification. It grants no
dependent data access, signing authority, or entry-readiness change.
Creating a request, responding, or withdrawing it also writes a generic notice
for the other named account when that account still has the expected, active,
unexpired chapter role. New notices contain no identity details and link to the
specific request in the relationship workspace. The single-request API rechecks
current chapter membership, role and ownership, and applies the same counterpart
redaction and closed-request visibility as the paged list. Links from older notices
may still open the general workspace. Request and response actions reject an expired
counterpart; an authorized withdrawal remains possible if the counterpart is
inactive or expired. Exact operation retries do not add another notice.

Either named participant can POST guardian-requests/{request_id}/withdraw with
operation_id and expected_revision while awaiting a response or verification.
Rust rechecks current actor membership and ownership in the transaction. Withdrawal
records a terminal withdrawn status, increments the revision, and atomically writes
a payload-bound operation receipt and audit. Concurrent identical retries recover
the same saved withdrawal; the response rechecks counterpart availability and may
redact its identifier after access changes. Changed input, stale revisions and reopening conflict.
Counterpart inactivity does not prevent an otherwise authorized withdrawal.
This endpoint withdraws a request, not a verified relationship or signed waiver.
When the counterpart is inactive, expired, missing, or no longer has the expected
role, the list keeps pending requests visible with that account reference redacted
so the current actor can withdraw after reload. Confirmation and decline are not
offered in that state. Closed requests with an unavailable counterpart stay hidden.
The list is paged by request reference within the signed-in account's chapter
scope, fetching at most 101 records and processing at most 100 per page. A page can be empty
after unavailable closed requests are filtered; a continuation still allows the
member to load more. Ordering is by request reference rather than creation time,
so refresh from the first page to pick up newly created requests. Composite index
definitions for both participant roles are in `infra/firebase/firestore.indexes.json`;
index deployment and pagination/recovery verification remain release work.

The browser keeps the pending command and operation ID in tab-scoped session
storage so an unknown response can be retried after reload. A successful exact
replay clears it; definitive command failures clear it, while authentication or
transient errors keep it available. The user can explicitly clear the local retry
reference, which does not cancel a request already saved by the server. The API
checks the original operation receipt before rechecking counterpart activity, so
an exact retry still recovers if the counterpart later becomes inactive. Staff
relationship verification, revocation, approved waiver versions and event consent
remain unfinished. These local endpoints are disabled outside the separately
compiled demo testing mode.


## Event waiver preparation (local demo)

Chapter directors can prepare versioned waiver drafts at the event's waivers
workspace; assigned registrars have read access. Rust stores title, language,
document text, source, event rules reference and author, with immutable version
history, a current draft, operation receipt and audit in one transaction.
Saves require the current expected revision; exact replay returns the original
version even after later revisions. Changed operation payloads conflict.

The API is /v1/chapters/{chapter}/events/{event}/waiver-draft (GET and POST).
The POST command includes operation_id, expected_revision, title, language,
text and source. Technical bounds are 200 title characters, 500 source characters,
100000 UTF-8 bytes of document text and a 35-byte alphanumeric/hyphen language
reference. These bounds do not approve document content or signer policy.

Drafts are staff-only, status=draft, and are never signed or applied to readiness.
Publication approval, signer capacity and verified guardian authority, immutable
signature receipts, withdrawal and retention remain required for actual consent.
No document text or signature belongs in development memory or retrieval.


Staff may inspect a specific saved draft using GET waiver-draft/versions/{revision}.
Each lookup checks current chapter/event authority and validates the returned
record's chapter, event, revision and draft status. Version zero is invalid;
missing versions return not found. This reads immutable draft history and does
not restore, publish or sign a document. The editor provides a numeric version
lookup and renders document content as text rather than HTML.
