# WSB architecture — 2026-10-29

## Selected stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Web | Next.js App Router, React, TypeScript | React ecosystem plus server-rendered public event pages and isolated interactive consoles |
| API | Rust, Axum, Tokio, Tower | Typed domain boundaries, asynchronous I/O, explicit resource control |
| Database | Cloud Firestore | Firebase client subscriptions and server transactions |
| Identity / files | Firebase Auth / Storage | Existing Firebase project integration |
| Hosting target | Cloud Run API; Next.js Node hosting | Separate scaling and deployment boundaries |
| Local development | Firebase Emulator Suite, demo-wsb | Synthetic data isolated from the supplied real project |
| Offline roadmap | IndexedDB command outbox plus service-worker shell | Explicit submission acknowledgement, revisions and conflict recovery |

Next.js is selected for the mix of public event pages and private consoles. A
React/Vite SPA would be simpler for a console-only app, but would require another
approach for public server-rendered pages. No benchmark in the pasted proposal
has been established for this application. Rust does not eliminate cold starts,
network/database latency, or the need for load testing.

Initial versions are pinned in package.json and package-lock.json. The Rust
manifest uses compatible crate ranges resolved in Cargo.lock; rust-toolchain.toml
pins Rust 1.99.1 and the container builder image is pinned by digest. The community firestore
crate is an optional gRPC adapter, not an official Firebase Admin Rust SDK.

## Runtime boundaries

```mermaid
flowchart LR
  Browser[Next.js browser consoles] --> Auth[Firebase Auth]
  Browser -->|ID token + command| API[Rust API]
  Browser -->|authorized subscriptions| DB[Firestore]
  API -->|ADC / service identity| DB
  Browser -->|scoped media flow, future| Storage[Firebase Storage]
  Public[Next.js public pages] --> Published[Published event projections]
```

Next.js owns rendering, routing and browser interaction. It does not duplicate
scoring/payment business logic. Rust owns authoritative validation, tabulation,
payments, result publication and advancement. Firestore client rules deny writes
until a narrowly scoped client-owned operation is intentionally introduced.
Privileged server access bypasses rules: every repository operation must enforce
the authenticated actor's chapter and event assignment.

The initial API exposes GET /healthz and GET
/v1/chapters/{chapter_id}/session. The latter verifies RS256 signatures against
Google's keys, issuer, audience, expiry, issued-at, auth-time, subject, role and
chapter. It rejects emulator unsigned tokens. This means emulator client auth
is usable for rules tests but cannot yet authenticate to this Rust API.
There is no mutation endpoint and no claim that business authorization is done.
Add revocation/disabled-user checks and authoritative event membership lookup
before enabling sensitive commands. Current custom claims can remain stale until
token expiry. Unknown signing keys fail closed until the five-minute cache refresh.

The optional `firestore` feature initializes a client through Application Default
Credentials at startup; business repositories are not implemented. The default
API can run without credentials. `/healthz` is liveness only, not database readiness.

## Data and authority contract

- `chapters/{chapter}/members/{uid}`: server-managed roles and membership;
  current client rules allow only same-chapter self reads.
- `chapters/{chapter}/events/{event}/...`: event-local crews, assignments,
  submissions, deductions and payment ledger; denied to clients initially.
- `publicEvents/{event}`: explicit publication projection with `published=true`;
  never include private identity data or raw judge notes. Public list queries
  must filter on published; rules are not filters.
- Private identity objects and consent records: isolated from public crew data;
  retention, reviewer access and upload validation must be decided first.
- Payment amounts: integer minor units plus currency; provider event IDs are
  unique ledger keys. Replayed webhooks must produce no duplicate effects.

## Offline judging contract (designed, not implemented)

Each command includes operationId, event/crew scope, expectedRevision and a
versioned criteria payload. The server derives actor identity from the token.
Persist drafts/outbox locally only on a trusted device with an explicit lifecycle.
States: draft -> queued -> sending -> acknowledged, or conflict/rejected.
Never show queued data as submitted. Retry the same operationId with backoff;
the server must return the original receipt for identical retries and reject a
changed payload under the same ID. Transactions check current assignment,
division lock and expected revision before mutation, receipt and audit write.
After lock, reject queued submissions and preserve a conflict for human review.
No automatic overwrite of newer scores. Lock/finalization design must account
for transaction limits: do not aggregate an unbounded division in one transaction.

Firestore persistent cache is not enabled by default on shared devices. The
service worker and outbox will be implemented together with the first judging
slice; the present landing page is not an offline-capable PWA.

## Performance decisions

Server Components by default; Firebase only in browser modules and analytics
only after consent. Use CSS/system fonts initially. Add GSAP, Three.js or other
motion packages only per route, behind lazy loading and reduced-motion fallbacks.
Do not add Zustand until interaction profiling shows a need. Bound database
queries and live listeners; unsubscribe when routes close. CPU-heavy media work
belongs in bounded blocking workers or a separate job service, not Tokio handlers.
Choose a Cloud Run region after inspecting the actual Firestore location.

## Sources checked

- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/getting-started/installation
- https://docs.rs/axum/latest/axum/
- https://docs.rs/firestore/latest/firestore/
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://firebase.google.com/docs/firestore/manage-data/enable-offline

The pasted stack proposal is supporting input, not verified documentation.
