# Private chapter content drafts

Chapter directors can prepare plain-text content at `/admin/{chapter}/content`.
The connected API exposes a bounded newest-first page of drafts, revisioned save
commands, and bounded revision history under `/v1/chapters/{chapter}/content/drafts`.

Each save rechecks active chapter membership and the current `chapter_director`
role. A payload-bound operation receipt makes exact retries recover the original
saved version; reusing an operation ID with changed input conflicts. The current
draft, immutable version, operation receipt and audit record are written in one
Firestore transaction. An expected revision prevents stale edits from silently
overwriting newer text. Draft and version reads are chapter-scoped and paginated.

The editor stores a title and plain text only. React renders the text as text;
HTML, media, links, rights attestations and audience settings are not processed.
There is no delete, review, approval, publish or public projection operation.
The page does not claim distribution or notification delivery. Retention for
unpublished user content still needs a policy before production use.

This private preparation slice does not decide who may review or publish public
content. The editor/publisher matrix, rights checks, audience, corrections,
removal and notification behavior remain tracked in `docs/open-questions.md`.
Only the demo-wsb Firestore emulator is supported by the current API runtime.
