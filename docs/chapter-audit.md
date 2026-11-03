# Chapter audit feed

The chapter audit page at `/admin/[chapter]/audit` reads durable `AuditRecord`s
from `chapters/{chapter}/audit`. The API rechecks active membership and permits
only the current `chapter_director` or `auditor` role. It returns at most 100
records per request, ordered by recorded timestamp and document ID descending,
with a query cursor. Existing page tokens from before this change must be
discarded by refreshing. Records missing `recorded_at` are excluded by the
ordered query and require a separate migration before they can appear. The browser requests 30 records per page and offers an
explicit load-more action. A search-next action scans up to ten pages per batch
through the same authorized reader, adding records for the existing filters.
Continue until no cursor remains to inspect the available archive. This scan is
not a consistent point-in-time snapshot; refresh starts again at the newest page.

The normalized feed exposes `id`, `actor_uid`, `chapter_id`, `action`,
`resource_id`, and `recorded_at`; `reason` and `correlation_id` are optional.
The browser shows those fields only when a producer persisted them and never
infers either value. Legacy panel-change records are normalized from their
event/division fields. Some audit producers may leave `resource_id` empty.
New records from the shared writer and the membership/panel writers now persist
`correlation_id` equal to the immutable audit document ID. For command-backed
membership and panel changes, that ID is derived from the operation ID and stays
stable on exact replay. Other audit IDs identify only the audit event; this is
not an end-to-end HTTP trace identifier. Legacy records remain without this
field. Event creation, core event-draft edits, registration-window changes,
versioned division-policy draft saves, and director stage creation/configuration/
marshal-access changes require a human reason of 8–1000 characters. The API
writes it with the mutation, replay receipt and stable audit correlation ID in
one transaction. Manual payment reconciliation and ledger refund decisions also
require reasons and payload-bound receipts. Routine stage position and hold
commands remain reasonless for venue speed. This is an initial rule for
high-impact configuration and finance actions; it does not yet cover every
mutation.
Exports are JSON and contain only the records
currently loaded in the browser that match the selected action, actor and resource filters; they
are not a complete archive export.

Audit reads are read only. Chapter client rules deny direct Firestore access to
the collection. The API uses the server repository and scopes the collection
under the validated chapter path. Do not describe current storage as a verified
hash chain or claim tamper-evident export; neither capability is implemented.

## Remaining audit contract work

The product page calls for an audit reason and correlation ID. New audit IDs are
now persisted as correlation identifiers, but they are not end-to-end request
traces and older documents remain unchanged. Reasons are still absent from
other generic commands; continue defining which actions require a human
rationale and migrate those command forms before claiming full PAGE-085
coverage. Review retention,
immutability administration, export format, and auditor grant policy before
production activation. The `auditor` role is currently read-only in API
authorization and can be assigned through the existing chapter/HQ role grant
flows; role rehearsal remains outstanding.
