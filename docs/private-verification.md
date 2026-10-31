# Private identity and residency evidence

## Current local workflow

Signed-in dancers and crew managers can create a subject-owned case for identity
or residency evidence. Rust creates the case and fixed private object path under
the active chapter, then the browser uploads directly to Firebase Storage. The
submit command asks Storage for the object metadata using a Firebase ID token;
Rust checks the object path, bucket, declared content type and size before it
records a pending submission. The Firebase token is forwarded only to Storage
for this metadata check and is never persisted or logged by the application.

Only PDF, JPEG and PNG metadata up to 10 MiB are accepted. This limit is a local
technical bound, not an approved list of valid identity evidence. A declared MIME
type does not prove the byte-level format or scan for malware. Current review is
human and chapter-scoped. Reviewers must have current active membership in the
same chapter. The interface requires opening the private object before a decision;
the Rust command independently checks the object's metadata and reviewer access,
but does not prove that a person inspected its contents. Staff notes are
length-limited and audited.

Storage objects are immutable and are not cached in the browser's persistent
stores. Participant reads are restricted to the subject UID; reviewer reads use
the active chapter membership document and reviewer role. Cross-chapter access,
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
- Approve malware scanning and content inspection before private reviewer access.
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
state after reload at desktop and mobile widths. The Firestore repository
coverage runs through `node tests/run-firestore-repository.cjs` with
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8188` and `WSB_PERSISTENCE_RUNNER=docker`.
The API and browser integration use demo-wsb only. These checks verify workflow
plumbing and authorization boundaries, not evidence validity, age/guardian policy,
event consent, malware detection, retention compliance or production identity.
