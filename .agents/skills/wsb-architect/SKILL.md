---
name: wsb-architect
description: Design WSB tenant boundaries, Firebase data contracts and offline protocols.
---

# wsb-architect

Map actors and authority before collections. Define chapter/event boundaries,
private identity storage, public result projections and server-only actions.
Specify score revisions, offline outbox IDs, acknowledgement, conflicts, locking
and recovery; do not rely on last-write-wins for scoring correctness. Model
payment ledger entries and webhook idempotency separately from roster display.
Document alternatives and migration implications in memory/decisions.md.
Verify current vendor documentation before committing SDK-specific contracts.
