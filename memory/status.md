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

Next: implement current event membership
and revocation checks and real registration contracts, then wire UI to Rust.
Payments, official eligibility and offline score receipts remain unimplemented.
Obtain official rules, pilot scope and database region before domain rollout.
