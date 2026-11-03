# WSB competition operating system

WSB brings registration, payment tracking, judging and results publication into one chapter-scoped system. The current implementation supports a synthetic local rehearsal; completing the original paperless-operation goal still requires the release work listed below.

Documentation baseline: **31 October 2026**. Audience: competition organizers, operators, developers and project-defense reviewers.

## The original problem

The [user's original brief](../product-brief.txt) asks to remove manual work in registration, payments, judging and monitoring winners across regional and international chapters. Separate forms, receipts, rosters and score sheets require staff to transfer information between steps; WSB replaces those handoffs with linked records, explicit statuses and server receipts. This is the problem described by the brief, rather than a measured finding from an organizer study.

The user also requires WSB-owned forms, Docker-based local testing and PayMongo as the eventual payment medium. These directions supersede the brief's suggested external form destinations and alternative gateways.

| Manual task | Introduced system response | Practical outcome |
| --- | --- | --- |
| Re-enter a crew roster | Crew invitations, canonical member selection, native event registration | Entry review uses the same roster record |
| Match a receipt to an entry | Integer currency amounts, reservations, reconciliation and payment records | Staff can distinguish pending funds from settled funds |
| Collect and transcribe score sheets | Assigned digital scorecards, offline drafts, versioned submission receipts | Judges can see whether the server accepted a score |
| Coordinate arrivals and stage calls | Online check-in, authorized stage positions, holds and history | Staff share persisted event state |
| Copy provisional rankings into public announcements | Division locking and an immutable published projection | Public readers receive only deliberately published results |
| Follow up through unrelated forms | Native contact, account support and proposal conversations | Requesters recover a saved conversation inside WSB |

These are intended operational benefits. Time saved, error reduction, cost and venue capacity have **not** been measured.

## Read the documentation

| Reader goal | Document |
| --- | --- |
| Run the first local rehearsal | [Tutorial](tutorial.md) |
| Operate registration, finance, judging and stage desks | [Operator how-to](operations.md) |
| Check every feature and its actual readiness | [Feature coverage and remaining scope](features.md) |
| Look up API families, access and command behavior | [API reference](api-reference.md) |
| Understand architecture and decisions | [Architecture explanation](architecture.md) |
| Present and demonstrate the project | [Speaker script and 90-second demo](../../presentations/wsb-system/speaker-guide.md) |

## Current readiness

Connected local workflows include durable registration, support, private evidence review, manual finance, PayMongo emulation, judging/outbox recovery, stage operations and controlled publication. A provider client and signed PayMongo webhook handlers also exist, but real provider compatibility and live financial operation have not been established by local emulation.

Guardian authority and event consent, actual music processing, signed offline passes, durable battle progression, advancement, formal Global HQ affiliation decisions and a complete operational pilot remain open. A demo-only historical proposal-index backfill is available but not yet run. Official competition rules, privacy policies and production identity/infrastructure also need approval and verification. `/readyz` deliberately returns HTTP 503 with `release_ready: false` even when the local database is reachable.

## Evidence and interpretation

The current source, [local Docker guide](../local-docker.md), [registration contract](../persistent-registration.md), [verification contract](../private-verification.md), [stage contract](../stage-operations.md) and [implementation audit](../implementation-audit-2026-10-30.md) support this package. Older architecture and audit sections contain historical snapshots; the newer implemented capabilities are identified explicitly here.

During this documentation task, Docker reported API, web, Firebase and PayMongo emulator healthy; the web root returned HTTP 200 and API `/healthz` returned `status: ok`. Existing workflow documents and [status history](../../memory/status.md) record broader tests; those suites were not all rerun for this documentation-only change. No production deployment, real transaction or complete event rehearsal is claimed.
