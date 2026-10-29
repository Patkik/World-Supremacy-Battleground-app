# Current status

2026-10-29: Actual application foundation added. Next.js 16.4.3, React 19.3.1,
TypeScript and Firebase 13.1.0 are installed with an npm lockfile. Rust Axum/Tokio
source includes liveness, Firebase JWT verification and a chapter-scoped session
endpoint. The optional Firestore gRPC adapter initializes via ADC; no business
repositories exist yet.

Supplied project: model-palace-346207. Local development uses demo-wsb emulators.
Production web config is in an ignored local environment file. No real Firebase
data/rules or hosted app have been changed.

Verified: production web build, TypeScript, two Firestore emulator tests, three
Rust backend tests in Docker, all-features Rust compilation including Firestore,
and Rust formatting. See docs/validation.md.

Rust 1.99.1, Cargo, rustfmt and Clippy are installed; Docker is running.
Cargo.lock is generated, the toolchain and builder image are pinned.
Microsoft Visual Studio 2022 C++ Build Tools and Windows SDK are installed.
A native Windows Rust compile-and-run smoke check passed.
CI definitions exist but have not run remotely. The UI is a public development
landing page, not a functional event app.

2026-10-30: Installed route-scoped UI/UX skill set and `apps/web/AGENTS.md`
frontend rules (`wsb-ui-ux-architect`, `ui-ux-pro-max`, `frontend-design`,
`build-awwwards-quality-sites`, `gsap`, `ui-craft`; hashes in `skills-lock.json`).
Updated `docs/skill-library.md`, `memory/decisions.md` and local retrieval index;
verified `workspace.py check`, retrieval queries and unit tests.

2026-10-30: Created docs/website-plan/README.md and seven linked planning chapters,
116 route/screen specifications in pages.json and the generated page catalogue,
roles/permissions, reference research, landing storyboard, all-orientation matrix,
content inventory and delivery gates. Original supplied logo preserved under
docs/website-plan/assets. This is a proposed complete-product plan; business
approval, official rules and UI implementation remain outstanding.

2026-10-30: Implemented representative visual prototype: campaign home, event
directory/detail, chapter/help/result-preview pages, crew workspace, four-step
sample registration, local judge desk and arena display. Uses intact user logo,
bundled fonts, Solar icons and original generated concept art. Sample entries
and judge drafts persist locally; no real submission occurs. Production build
and browser checks passed across 54 route/viewport cases plus workflow tests.
See docs/prototype-validation.md and docs/prototype-assets.md.

2026-10-30: User requested an energetic public site presented as the actual WSB
organization. Added three official WSBstreet performance excerpts, headline and
scroll choreography, moving slogan band and pause/sound controls. Removed public
prototype copy and fictional promotions; public registration now links to the
official Hong Kong 2027 form. Real three-clip playback, controlled motion/fallback
tests, 54 responsive cases and production build passed. See docs/public-site-media.md.
Internal sample workspaces retain accurate labels and are not exposed as live tools.

2026-10-30: User requested white dark-mode branding and inert autoplay footage.
Created a white SVG variant using the original logo alpha, applied exact white
rendering across dark layouts, removed the hero's controls/links and floating
motion button, and moved page motion preferences to the footer. Hero playback
is always muted, automatic and non-interactive, with still-image fallbacks.
See docs/dark-logo-and-background-video.md.
Controlled browser checks and a real-media desktop/mobile check passed. The final
production build passed with TypeScript validation and all 14 pages generated.

2026-10-30: Completed `scope`, `architecture`, `foundation`, `registration`, and
`judging` in the task DAG. Created `docs/pilot-scope.md` with rule provenance and
acceptance gates. Implemented authoritative Rust domain layer in `apps/api`
(`domain.rs`, `store.rs`, `registration.rs`, `judging.rs`, `main.rs`):
- Crew creation, invitations, division constraints, and entry lifecycle.
- Computed multi-factor readiness (roster bounds, audio compliance, minor guardian
  consent verification, payment coverage) preventing unverified submission.
- Offline judging command protocol with `operationId` idempotency, revision conflict
  handling, head judge division locking, and calculated score aggregation.
- 6/6 Rust unit and integration tests passed, formatting verified with rustfmt,
  clippy passed with zero warnings under `-D warnings`, and Next.js production build
  passed with 14 static pages generated.

2026-10-30: Completed Phase 1 (P1a: Identity & Access, P1b: Events & Crew Registration / Review).
- Verified 100% route coverage for all 44 Phase 1 pages specified in `docs/website-plan/pages.json`:
  * Identity: `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, `/auth/action`, `/onboarding`, `/invite/[token]`, `/workspaces`.
  * Crew Portal: `/app`, `/app/profile`, `/app/security`, `/app/crews`, `/app/crews/new`, `/app/crews/[crewId]`, `/app/crews/[crewId]/roster`, `/app/crews/[crewId]/settings`, `/app/register/[eventId]`, `/app/entries/[entryId]`, `/app/entries/[entryId]/roster`, `/app/entries/[entryId]/review`, `/app/support`.
  * Chapter Admin & Registrar: `/admin/[chapterId]`, `/admin/[chapterId]/events`, `/admin/[chapterId]/events/new`, `/admin/[chapterId]/events/[eventId]`, `/admin/[chapterId]/events/[eventId]/settings`, `/admin/[chapterId]/events/[eventId]/divisions`, `/admin/[chapterId]/events/[eventId]/registrations`, `/admin/[chapterId]/events/[eventId]/registrations/[entryId]`, `/admin/[chapterId]/staff`.
  * Dynamic Public & Policy: `/events/[eventSlug]`, `/events/[eventSlug]/rules`, `/chapters/[chapterSlug]`, `/help/[slug]`, `/contact`, `/policies/[policySlug]`.
  * System Utilities: `/access-denied`, `/maintenance`, `/not-found`, `/error`.
- Extended Rust Axum API with authoritative endpoints for chapter/event queries, crew management, invitations, entries, computed 4-vector readiness evaluation, entry roster snapshotting, and registrar approval/correction.
- 7/7 Rust unit and integration tests passed, formatting verified with rustfmt, clippy passed with zero warnings under `-D warnings`.
- Next.js TypeScript typecheck (`tsc --noEmit`) passed with 0 errors, and Next.js production build completed with 30 static and dynamic routes.

Next: Phase 2 (P2a: Verification & Consent file uploads, P2b: Financial Payments & Invoicing Ledger, P2c: Audio/Music file validation & processing).
