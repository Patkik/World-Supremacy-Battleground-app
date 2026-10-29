# Decision log

## 2026-10-29 — Workspace knowledge
Decision: Keep durable knowledge in reviewable project files; use a generated
local vector index as a disposable retrieval aid. Rationale: portable, private,
and usable immediately without credentials. Source files remain authoritative.

## 2026-10-29 — Product scope
Decision: Treat the pasted blueprint as a proposed scope. Exact rules and
gateway capabilities require verification. Rationale: avoid turning unsupported
claims into eligibility, scoring, or payment behavior.

## 2026-10-29 — Actual application foundation
User requested Rust backend, an optimized frontend with broad community support,
and Firebase database, and supplied Firebase web configuration. Selected Next.js
App Router / React / TypeScript and Axum / Tokio. This supersedes the initial
proposal's Cloud Functions business-logic default. Keep Firebase Auth, Firestore
and Storage; defer Realtime Database until a measured need exists.
Sources and boundaries: docs/architecture.md. The supplied stack proposal's
throughput, latency and cold-start claims are not adopted as established facts.

Local development uses demo-wsb emulators. Supplied real project configuration
is in an ignored production environment file. No production mutation is part of
this setup. Framework setup proceeds independently of unresolved competition
rules; the task graph separates this work from domain feature implementation.

## 2026-10-29 — Rust development environment
User authorized Rust installation and started Docker. Installed Rust 1.99.1,
Cargo, rustfmt, Clippy, Microsoft C++ Build Tools and Windows SDK. Native compiler
smoke check passed. Docker backend tests and optional Firestore compilation
passed. Cargo.lock, rust-toolchain.toml and pinned builder digest make future
builds reproducible. No production credentials or cloud mutations were needed.

## 2026-10-30 — Comprehensive website plan
User requested all pages, roles, features, content and screen orientations, with
professional references and the supplied WSB logo. Created docs/website-plan as
the planning source of truth. Preserve the existing three-surface design system.
Portrait/landscape and accessible reflow override unconditional viewport locks
in generic judging layout recipes. Use event-versioned divisions: the current
official public site's list differs from the initial proposal. Proposed screen
and permission expansion does not constitute approval of unsourced business rules.

## 2026-10-30 — Route-scoped UI/UX skill set and frontend rules
User requested installing the curated 5-skill open-source UI/UX stack plus a
route-scoped WSB master UI/UX skill and frontend rules. Installed project-local
copies under `.agents/skills/` (tracked in `skills-lock.json`): `ui-ux-pro-max`
(`nextlevelbuilder/ui-ux-pro-max-skill`), `frontend-design` (`anthropics/skills`),
`build-awwwards-quality-sites` (`MengTo/Skills`), `gsap` (`Quegenx/agent-skills`),
and `ui-craft` (`educlopez/ui-craft`), alongside `.agents/skills/wsb-ui-ux-architect/SKILL.md`
and hierarchical frontend rules in `apps/web/AGENTS.md`.

Rationale: Isolate high-motion Awwwards choreography (`(marketing)`) and LED
projection typography (`(arena-live)`) from dark-auditorium judging and mobile
registration (`(console)`, `(portal)`), preventing Lenis scroll-jacking or heavy
shaders in operational views. Repaired `--text-titanium` token typo in the
supplied specification and aligned offline telemetry, bundle lazy-loading, Rust
authority boundaries, and parameterized competition thresholds with
`docs/architecture.md` and `docs/open-questions.md`.


## 2026-10-30 — Representative visual prototype
User authorized proceeding from the full plan to representative screens. Built
public, portal, judge and arena previews in the existing Next.js app. Kept
synthetic data and browser-local persistence explicit; no fake registrations,
payments, uploads, score receipts or public results. Used the original WSB logo,
local fonts, credited Solar icons and generated fictional dance concept art.
Scoped GSAP/Lenis to public marketing; no Three.js needed. Responsive and workflow
verification is recorded in docs/prototype-validation.md.


## 2026-10-30 — Energetic public WSB website
User requested official organization highlights, more motion and a real public
presentation. Embed three performances from the official WSBstreet channel;
retain attribution, controls and fallbacks rather than downloading footage.
Use verified Hong Kong 2027 event content and the current official registration
form. Keep development workspaces honest and outside public navigation until
Rust/Firebase operations are implemented. Motion and verification: docs/public-site-media.md.
