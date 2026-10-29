# WSB Frontend UI/UX Rules (`apps/web`)

Always load and follow `.agents/skills/wsb-ui-ux-architect/SKILL.md` before designing, styling, animating, or refactoring any route, layout, component, or stylesheet in `apps/web`.

## Route-Scoped Surface Architecture

Switch design intensity, motion, and companion skills strictly by Next.js App Router route group under `apps/web/src/app/`:

1. **Surface 1 — Spectacle Mode (`src/app/(marketing)/**` and public landing)**
   - **Targets**: `DESIGN_VARIANCE: 9/10`, `MOTION_INTENSITY: 9/10`, `VISUAL_DENSITY: 4/10`.
   - **Companion Skills**: `wsb-ui-ux-architect`, `frontend-design`, `build-awwwards-quality-sites`, `gsap`, `ui-ux-pro-max`.
   - **Mechanics**: Single Lenis smooth-scroll instance wired to `gsap.ticker` (`lagSmoothing(0)`, no CSS `scroll-behavior: smooth`), `useGSAP` scoped timelines, `gsap.matchMedia()` reduced-motion fallbacks, kinetic display typography, and lazy-loaded media/WebGL portals.

2. **Surface 2 — Tactical Auditorium Mode (`src/app/(console)/**` & `src/app/(portal)/**`)**
   - **Targets**: `DESIGN_VARIANCE: 3/10`, `MOTION_INTENSITY: 2/10`, `VISUAL_DENSITY: 8/10`.
   - **Companion Skills**: `wsb-ui-ux-architect`, `wsb-design`, `ui-craft`, `ui-ux-pro-max`.
   - **Mechanics**: Strictly NO Lenis, NO scroll-jacking, NO parallax, and NO heavy WebGL shaders. Anchor surfaces to `--bg-obsidian` (`#070709`) to eliminate auditorium iPad glare. Lock judging console layouts to `h-dvh overflow-hidden` with `>= 56px × 56px` primary touch targets (`>= 64px` slider tracks, `>= 48px` thumbs/buttons). Show honest offline outbox states (`draft`, `queued`, `sending`, `acknowledged`, `conflict`/`rejected`)—never display queued local scores as cloud-submitted.

3. **Surface 3 — Broadcast Arena HUD (`src/app/(arena-live)/**`)**
   - **Targets**: `DESIGN_VARIANCE: 7/10`, `MOTION_INTENSITY: 8/10`, `VISUAL_DENSITY: 3/10`.
   - **Companion Skills**: `wsb-ui-ux-architect`, `frontend-design`, `gsap`, `ui-ux-pro-max`.
   - **Mechanics**: Viewport-locked (`100dvh`, zero scrollbars), minimum `2.5vw` font sizing for 10ft–100ft stadium LED legibility, high-contrast `--accent-crimson` vs `--accent-cobalt` battle corners, and published-only result projections (`publicEvents` with `published == true`).

## Hard Guardrails ("Prove It" Gate)

- **Current user direction**: use the exact white logo treatment on dark layouts
  (`brand-mark-white`, dark root theme). The hero is decorative autoplay video:
  always muted, no playback/sound buttons, no click links, no focusable player.
  Keep motion preferences in the footer; honor reduced-motion and poster fallbacks.

- **Anti-Slop Bans**: Reject purple/indigo/blue-to-pink SaaS gradients; reject `Inter`, `Roboto`, or `Arial` for display headlines; reject uniform 3-column `rounded-2xl` icon-circle card grids; never animate layout properties (`width`, `height`, `top`, `left`, `margin`)—animate only `transform`, `opacity`/`autoAlpha`, and `clip-path`.
- **Semantic Tokens Only**: Reference semantic CSS variables (`--bg-obsidian`, `--bg-carbon`, `--bg-tungsten`, `--bg-glass`, `--text-chrome`, `--text-titanium`, `--text-muted`, `--accent-volt`, `--accent-crimson`, `--accent-cobalt`, `--accent-gold`, `--border-subtle`, `--border-active`) instead of raw hex literals in components.
- **Tabular Numerals**: Apply `--font-mono` with `font-variant-numeric: tabular-nums` to every score, timer, seed number, and minor-unit currency display.
- **Architecture & Provenance**: Keep authoritative scoring, lock validation, eligibility, and payment logic in `apps/api` (Rust). Parameterize unverified competition rules tracked in `docs/open-questions.md`, lazy-load motion packages per route, and use synthetic data only.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
