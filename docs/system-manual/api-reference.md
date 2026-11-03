# Reference: API and consistency contracts

Rust is the authoritative business API. This reference indexes implemented route families and cross-cutting rules; request structs and repository tests remain the exact schema sources while migration continues.

Local base URL: `http://localhost:8189`. Private requests use `Authorization: Bearer <SIGNED_LOCAL_SESSION_TOKEN>`; production Firebase identity is a separate integration gate. Never treat unsigned emulator ID tokens as valid API sessions.

## Route families

In this table `C = /v1/chapters/{chapter}`, `E = C/events/{event}` and `N = E/entries/{entry}`. A route being registered does not prove its durable workflow is complete; non-migrated paths can return 501.

| Area | Methods and paths | Access / important boundary |
| --- | --- | --- |
| Health | `GET /healthz`, `GET /readyz` | Liveness differs from release readiness; current readiness is 503 |
| Discovery | `GET /v1/chapters`, `GET C/events`, `GET E`, `GET E/divisions` | Public configuration reads; no entitlement grant |
| Account chapter selection | `GET /v1/account/chapters?limit=30&cursor=...` | Signed Firebase identity; returns only current memberships after server checks; bounded pages and no-store response |
| Chapter staff invitations | `GET/POST C/staff/invitations`, `POST C/staff/invitations/{id}/revoke`, `POST /v1/account/staff-invitations/accept` | Current chapter director creates/revokes with reasons; one-time 256-bit link is UID-bound, expires after 7 days, and stores only a digest; recipient acceptance requires recent sign-in and grants only the selected expiring chapter role |
| Chapter event drafts and setup | `POST C/events`, `GET C/staff/events`, `PUT C/events/{event}`, `PUT C/events/{event}/registration-window`, `GET C/events/{event}/division-policy-drafts`, `PUT C/events/{event}/division-policy-drafts/{division}`, `GET .../{division}/versions` | Recent-auth chapter director; revisioned draft edits use replay receipts, immutable policy snapshots and audit; drafts do not affect registration; demo Firestore only |
| Private chapter content drafts | `GET/POST C/content/drafts`, `PUT C/content/drafts/{id}`, `GET .../{id}/versions` | Active chapter director; bounded reads, expected revisions, immutable history and atomic replay/audit; no review, publish, or public projection |
| Duty events | `GET C/staff/duty-events?cursor=...`, `GET E/duty-access` | Current event-duty membership; bounded pages filtered by active assignment (director oversight); each selected event and destination rechecks access |
| Session | `GET C/session` | Signed chapter identity and membership |
| Notifications | `GET C/notifications?limit=30&cursor=...`, `PUT C/notifications/{id}/read` | Current chapter member reads only their own bounded inbox; page includes an atomic unread count; read acknowledgement is idempotent; producers recheck active, unexpired recipient membership transactionally; invitation, entry, panel, manual music review, battle ballot closure, finance, event assignment, check-in, stage-position/hold/access and local PayMongo test-mode events are connected |
| Crews | `GET/POST C/crews`, `GET/PUT C/crews/{crew}` | Owner/current chapter scope; bounded listing |
| Invitations | `POST C/crews/{crew}/invitations`, `POST C/crews/{crew}/join` | Payload-bound redemption and current membership |
| Crew invitation recovery | `POST C/crews/{crew}/join/recover` | Signed accepted dancer and current crew membership; checks issuer authority and returns current crew, without requiring original form values |
| Entries | `GET/POST E/entries`, `GET N`, `PUT N/roster`, `POST N/submit`, `POST N/review` | Manager mutations; registrar/director review; versions/readiness |
| Quote / manual payment | `GET N/quote`, `POST N/pay`, `POST N/payments` | Integer minor units, entry owner and available balance |
| Finance | `GET C/finance/payments`, `GET C/finance/payments/{id}`, `GET C/finance/summary`, `POST C/finance/payments/{id}/reconcile`, `POST .../{id}/refund` | A payment detail is visible to its recorded payer or current finance/director; decisions require `operation_id` and an 8–1000 character reason; durable replay receipt and audit commit together; manual full ledger reversals only, never provider execution |
| Local checkout | `GET/POST N/local-checkout`, `POST N/local-checkout-simulate`, `POST N/local-checkout-cancel` | Explicit local-testing identity and emulator restrictions |
| Provider checkout | `POST N/paymongo/checkout`, `POST N/paymongo/cancel` | Credential gates and authoritative reservation |
| Provider callbacks | `POST /v1/paymongo/webhook`, alias `/v1/webhooks/paymongo` | Raw-body signature, timestamp and trusted event mapping |
| Verification | `GET/POST C/verification`, `POST C/verification/{case}/submit`, `POST .../{case}/review` | Subject ownership or authorized chapter reviewer |
| Judging | `POST E/scores`, `GET N/scorecard`, `GET E/judge-lineup` | Current assigned judge and server-authorized state |
| Judge panel | `GET/PUT E/divisions/{division}/judge-panel` | Director-only; recent-auth reason, expected revision, assignment checks, and transactional notices to judges added or removed from the panel |
| Head judge | `GET E/divisions/{division}/score-state`, `GET .../review`, `PUT .../deductions`, `POST .../lock`, `GET .../results` | Head/director policy and full-panel lock checks; the review read returns panel, completeness counters and per-entry deduction revisions without individual judge scores |
| Arrival | `GET E/check-in/candidates?limit=30&cursor=...`, `POST E/check-in`, `GET E/check-ins` | Assigned marshal/director; bounded list of approved, currently ready roster candidates; save rechecks eligibility; online only |
| Stage reads | `GET E/stages`, `GET E/stages/{stage}`, `GET .../entries`, `GET .../history` | Current stage assignment; bounded pages |
| Eligible stage marshals | `GET E/staff/eligible-stage-marshals?cursor=...` | Chapter director only; bounded event-assignment pages filtered to active, unexpired chapter marshals; selection is advisory and stage saves recheck eligibility |
| Technical deductions | `PUT E/divisions/{division}/deductions` | Current head judge; optional operation ID binds payload to an atomic revision receipt and audit; legacy requests retain revision/value retry behavior |
| Division review | `GET E/divisions/{division}/review?cursor=...` | Current head judge/director; server aggregate totals with bounded division-scoped entry pages; pages filtered by approval can carry an empty continuation; lock rechecks authoritative state |
| Own battle ballot | `GET E/battles/{match}/my-ballot` | Assigned judge/head judge reads only their own saved corner; current chapter, event and panel access required |
| Stage commands | `POST E/stage-commands`, `POST E/stage-holds` | Expected revision, operation receipt and safe transition |
| Director stage controls | `POST E/stage-create`, `POST E/stage-configure`, `POST E/stage-marshals` | Current director authority; each command requires an 8–1000 character reason and writes it transactionally with its receipt and audit record |
| Draft lineup | `POST E/stage-lineup`, `GET E/stages/{stage}/lineup`, `GET .../lineup-history` | Private draft and immutable history; no publication |
| Publication | `POST E/divisions/{division}/publish`, `GET E/division-status` | Authorized publication after lock |
| Public results | `GET /v1/events/{event}/published`, `GET /v1/events/{event}/divisions/{division}/published` | Published projection only |
| Public inquiry routing | `GET /v1/contact/chapters`, `POST C/contact`, `GET/POST C/contact/{inquiry}` | Capability access to one anonymous thread; proposals reuse the inquiry domain |
| Account / staff support | `GET/POST C/support`, `GET/POST C/support/{inquiry}` | Requester ownership or authorized chapter support access |
| Chapter audit | `GET C/audit?limit=30&cursor=...` | Current chapter director or auditor; bounded newest-first page, read only |
| Global HQ integrations | `GET /v1/hq/integrations` | Signed `hq_admin` with current global membership; safe config indicators and Firestore reachability, no secret values |
| Global HQ overview | `GET /v1/hq/overview` | Signed `hq_admin`; exact chapter and nested event document counts from separate aggregate queries, no consistent snapshot or inferred readiness |
| Global HQ chapters | `GET /v1/hq/chapters?limit=30&cursor=...` | Signed `hq_admin`; bounded read-only chapter documents, no licensing or affiliation changes |

Support/contact routes and request schemas are defined in [inquiries](../../apps/api/src/inquiries.rs). They use either an account identity or `Authorization: Contact <PRIVATE_CONVERSATION_KEY>` for one anonymous thread; these credentials cannot authorize business commands. Music, guardian-consent and battle routes exist as incomplete domain/migration work, as described in [feature coverage](features.md).

The notification page response is `{ "items": [...], "next_page": null, "unread_count": 2 }`.
`PUT C/notifications/{id}/read` accepts no business fields and returns
`{ "notification": {...}, "unread_count": 1 }`. Repeating the same read
acknowledgement returns the saved read state without decrementing the counter
again. Both endpoints require a current chapter session and scope records to its
subject UID. Notification creation and reads enforce bounded text and same-origin
relative destinations; malformed saved destinations fail closed.

## Request examples

`GET /healthz` currently returns HTTP 200 with this response:

```json
{"service":"wsb-api","status":"ok"}
```

The examples use synthetic values and explicit placeholders; they are not captured private responses. `$token` must contain a currently authorized signed local session acquired through the application's local sign-in flow.

```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
  operation_id = 'docs-demo-crew-001'
  name = 'Synthetic Rehearsal Crew'
  city = 'Demo City'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8189/v1/chapters/ph/crews' `
  -Headers $headers -ContentType 'application/json' -Body $body
```

The exact successful crew representation is defined in the [registration handler](../../apps/api/src/registration.rs). Replay the same operation and payload to recover the same logical crew; changing its payload must conflict. Do not reuse this operation ID across unrelated demonstrations.

```json
{
  "operation_id": "docs-demo-checkout-001",
  "amount_minor": 10000
}
```

This body applies to `POST N/local-checkout` or `POST N/paymongo/checkout`. Amounts are integers in the entry currency's minor unit; 10000 is a synthetic example, not an event fee. The amount is optional in the current handler and must fit the authoritative available balance.

```json
{
  "operation_id": "docs-demo-stage-001",
  "stage_id": "local-main",
  "entry_id": "local-entry-ready",
  "expected_revision": 0,
  "position": "holding"
}
```

This stage-command example assumes a new stage-entry state and all current access/readiness prerequisites. Existing state requires its actual revision; copying zero into an established workflow should conflict.

## Concurrency, privacy and failures

- Transactional commands bind an operation identity to its payload and original receipt where implemented. Replaying an accepted operation rechecks current authority; revocation is not bypassed by an old receipt.
- Stage and score updates use explicit versions; inquiry replies and lineup/configuration edits also check revisions. A 409 requires reading current state and resolving the conflict, rather than blindly changing the operation ID.
- Paginated reads return bounded lists and continuation state. Each page rechecks current access; an older cursor does not preserve revoked permission.
- Private responses use no-store behavior. Public results expose deliberately published fields rather than private scoring, identity or payment records.

| HTTP outcome | Typical interpretation |
| --- | --- |
| 400 | Invalid payload, format or unsupported transition |
| 401 / 403 | Authentication or authorization failed; exact response varies by endpoint |
| 404 | Missing/inaccessible object; anonymous inquiry wrong-key cases deliberately conceal existence |
| 409 | Stale revision, altered replay, occupied stage or balance/state conflict |
| 429 | Inquiry creation quota exceeded |
| 501 | Durable workflow migration is incomplete |
| 503 | Dependency/configuration unavailable or deliberate readiness gate |

Some handlers return a status without a JSON error body; clients must not assume one universal error envelope. Hosted checkout uses PayMongo `/v2/checkout_sessions`; provider refunds remain `/v1/refunds`. PayMongo callbacks verify raw body, HMAC-SHA256, mode-specific signature and a 300-second timestamp tolerance, then check reservation/session/amount/currency/event consistency. See [payment code](../../apps/api/src/paymongo.rs) and [finance handlers](../../apps/api/src/finance.rs) for the exact adapter boundary.
