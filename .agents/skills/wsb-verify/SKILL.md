---
name: wsb-verify
description: Review WSB authorization, scoring, payments and offline recovery behavior.
---

# wsb-verify

Derive expected outcomes from verified requirements. Exercise cross-chapter
reads/writes, role escalation, duplicate payment events, score edits after lock,
offline reconnect conflicts, and unpublished result exposure where relevant.
Use emulator or isolated fixtures once the app exists; never use live dancer
records. Check rounding and tie handling against sourced rules. Return findings
with severity, reproduction, expected behavior and evidence. State coverage
gaps; passing checks must not be represented as a production certification.
