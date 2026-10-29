---
name: wsb-ui-ux-architect
description: Master UI/UX Design System, Awwwards Motion Choreography, and Tactical PWA Ergonomics for World Supremacy Battlegrounds (Next.js App Router + React 19 + Tailwind v4 + GSAP + R3F). Use when building, styling, animating, reviewing, or refactoring any WSB frontend route, component, layout, or design token across marketing, portal, console, or arena-live surfaces.
---

# WSB "Street-Luxe Esports Arena" UI/UX Skill

## 0. Surface-Scoped Skill Stack Orchestration

Select companion skills strictly by active route group inside `apps/web/src/app/`:

| Surface Mode | Target Routes (`apps/web/src/app/...`) | Variance / Motion / Density | Companion Skills to Invoke | Strictly Forbidden |
| --- | --- | --- | --- | --- |
| **1. Spectacle Mode** | `(marketing)/**` (and public root landing) | `9/10` / `9/10` / `4/10` | `frontend-design`, `build-awwwards-quality-sites`, `gsap`, `ui-ux-pro-max` | Default SaaS card grids, un-reverted `ScrollTrigger`s, missing reduced-motion fallback |
| **2. Tactical Auditorium Mode** | `(console)/**`, `(portal)/**` | `3/10` / `2/10` / `8/10` | `wsb-design`, `ui-craft`, `ui-ux-pro-max` | Lenis smooth scroll, scroll-jacking, parallax, heavy WebGL shaders, bright light surfaces, `< 48px` controls |
| **3. Broadcast Arena HUD** | `(arena-live)/**` | `7/10` / `8/10` / `3/10` | `frontend-design`, `gsap`, `ui-ux-pro-max` | Scrollbars, `< 2.5vw` type, proportional numerals on scores/clocks, unpublished score projections |

---

## 1. Visual Thesis & Anti-Slop Guardrails

World Supremacy Battlegrounds (WSB) is an international street-dance championship platform. Every screen must feel like a hybrid of **Nike SNKRS, Red Bull BC One, and a Formula 1 Live Telemetry Console**.

### BANNED AI Slop Patterns (Hard Rejections)

- NEVER use default SaaS purple/indigo/blue-to-pink linear gradients.
- NEVER use `Inter`, `Roboto`, or `Arial` as display headlines.
- NEVER build uniform 3-column `rounded-2xl` card grids with generic icon circles at the top.
- NEVER run Lenis smooth scrolling, parallax, or heavy WebGL shaders inside `(console)` (Judging/Marshal views) or `(portal)` (Registration/Checkout forms).
- NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`); only animate compositor-friendly properties (`transform: translate3d/scale`, `opacity`/`autoAlpha`, `clip-path`).

---

## 2. Semantic Design Tokens (CSS Variables / Tailwind v4)

All components must reference these semantic tokens rather than raw hex values:

```css
:root {
  /* Surfaces — Engineered for Dark Auditorium & OLED Battery Saving */
  --bg-obsidian: #070709;             /* Primary canvas */
  --bg-carbon: #101115;               /* Elevated cards & drawers */
  --bg-tungsten: #181A20;             /* Interactive inputs & slider tracks */
  --bg-glass: rgba(16, 17, 21, 0.72); /* HUD & sticky navigation with backdrop-blur-md */

  /* Typography & Hierarchy */
  --text-chrome: #F4F5F8;             /* Primary headlines & active scores */
  --text-titanium: #9BA1B0;           /* Secondary labels & metadata */
  --text-muted: #5E6472;              /* Disabled / locked states */

  /* Championship Accents */
  --accent-volt: #D4FF00;             /* Primary CTA, Live on Stage, Qualified badge */
  --accent-crimson: #FF2A00;          /* Penalty deduction, Red Corner, Late Audio lock */
  --accent-cobalt: #0066FF;           /* Blue Corner (BG.ONE Battles), Verified ID */
  --accent-gold: #FFB800;             /* 1st Place / Defending Champion Seed */

  /* Borders & Hairlines */
  --border-subtle: rgba(244, 245, 248, 0.08);
  --border-active: rgba(212, 255, 0, 0.45);
}
```

---

## 3. Typography System & Scannability

Load via `next/font/google` or local variable fonts with `display: "swap"` and resilient system fallbacks for low-bandwidth venues:

- **Display / Kinetic Headlines (`--font-display`)**: `Syne` or `Archivo Black` — Uppercase, tight tracking (`-0.03em`), tight line-height (`0.92`), fluid sizing via `clamp(2.75rem, 7vw, 7.5rem)`.
- **UI & Functional Body (`--font-sans`)**: `Plus Jakarta Sans` or `Geist` — Clean legibility at `14px` to `16px` for registration forms, rulebook tooltips, and crew rosters.
- **Scores, Timers & Audio Metadata (`--font-mono`)**: `JetBrains Mono` — ALWAYS apply `tabular-nums` (`font-variant-numeric: tabular-nums`) on every score (`94.65`), countdown clock (`01:58.4`), currency amount (`₱1,500.00` / `$45.00 AUD`), and lineup seed (`#014`).

---

## 4. Route-Specific UX & Motion Rules

### A. Public Landing & Chapter Portals (`apps/web/src/app/(marketing)/**`)

- **Single Scroll Authority**: Initialize Lenis once inside the `(marketing)` client boundary and sync to `gsap.ticker`. Set `gsap.ticker.lagSmoothing(0)`. Never attach native CSS `scroll-behavior: smooth` alongside Lenis.
- **Animated Hero Banner Choreography**:
  - **Intro Timeline (`useGSAP`)**: Reveal the stacked `WORLD SUPREMACY BATTLEGROUNDS` display title using a clipped line-by-line vertical stagger (`yPercent: 110 -> 0`, `duration: 0.9`, `ease: "power4.out"`).
  - **Video-in-Text & Shader Portal**: Mask a compressed `.mp4`/`.webm` slow-motion street-dance reel inside the central display typography or central portal frame. On scroll, use `ScrollTrigger` (`scrub: 0.6`, `pin: true`) to expand the central mask to full viewport while revealing the Global Chapter Selector (Philippines, Australia, New Zealand, South Africa, Asia).
  - **Bottom Telemetry Dock**: Pin a glassmorphic status bar (`--bg-glass`) at the bottom of the viewport displaying the active live event, audio beat toggle, and a magnetic `--accent-volt` CTA button (`[ REGISTER CREW ↗ ]`).
  - **Reduced Motion Fallback**: Wrap all scroll pins and WebGL distortion inside `gsap.matchMedia()`. When `(prefers-reduced-motion: reduce)` is active, skip scroll pinning and render a static high-contrast hero frame with instant fade transitions.

### B. Offline-First Judges' iPad Console (`apps/web/src/app/(console)/judge/**`)

- **Zero Scroll-Jacking**: Disable Lenis and window scrolling. Lock layout to `h-dvh overflow-hidden` grid so all judging criteria pillars fit on a single iPad screen without vertical scrolling.
- **True Auditorium Dark Surface**: Anchor primary background to `--bg-obsidian` (`#070709`) so tablet screens do not cast glare in dark venues.
- **Blind-Touch Slider Ergonomics**:
  - Interactive touch targets must be at least `56px × 56px` (absolute minimum `48px × 48px` on auxiliary controls) so judges can score without looking away from the stage.
  - Each judging criterion pillar (e.g., proposed 5 × 20pt pillars: Choreography, Musicality, Execution, Stage Presence, Entertainment Value — parameterize labels/max points pending official rulebook verification) must use a horizontal track at least `64px` tall with a high-contrast thumb (`>= 48px` width) and quick-tap preset pills (`10`, `14`, `16`, `18`, `20`) above the track for instant coarse selection followed by `.25` or `.5` fine-tuning.
  - Isolate high-frequency drag state (via refs/transient store; add `zustand` only when interaction profiling confirms need per `docs/architecture.md`) so 120Hz iPad Pro dragging never triggers full-page React re-renders.
- **Offline Sync Telemetry Badge**: Permanently display a top-right connection and outbox pill reflecting the authoritative command outbox lifecycle (`draft -> queued -> sending -> acknowledged | conflict | rejected`):
  - `ONLINE — ACKNOWLEDGED BY SERVER` (`--accent-volt` dot, server receipt confirmed)
  - `OFFLINE — QUEUED ON DEVICE (3 SCORES PENDING)` (Amber pulsing dot backed by the IndexedDB command outbox; NEVER imply a queued score is cloud-submitted)
  - `CONFLICT / LOCKED — HEAD JUDGE REVIEW` (`--accent-crimson` alert when division lock or revision mismatch rejects a queued command)

### C. Crew Registration & Audio Booth (`apps/web/src/app/(portal)/**`)

- **Progressive Disclosure Stepper**: Break registration into 4 clean, mobile-first stages designed for mid-range phones on variable venue/mobile networks:
  1. **Chapter & Division Select** (parameterized age-cutoff and eligibility filters; track unverified rule assumptions in `docs/open-questions.md`).
  2. **Roster & Qualifier Retention Check** (generates shareable QR/invite flow for dancer onboarding and consent; never leak private IDs into public crew projections).
  3. **Audio Booth Validator** (client-side waveform preview + authoritative verification via Rust API `/v1/...` showing clear pass/overtime status).
  4. **Localized Split Checkout** (integer minor currency units; server-verified webhooks for regional gateways such as PayMongo/Stripe once confirmed; never expose secret/payment keys in client or chapter documents).

### D. Broadcast Arena HUD (`apps/web/src/app/(arena-live)/**`)

- **10ft-to-100ft Stadium Legibility**: Viewport-locked (`h-dvh w-screen overflow-hidden`, zero scrollbars) with minimum typography size `2.5vw`.
- **Jitter-Free Live Telemetry**: Enforce `--font-mono` with `font-variant-numeric: tabular-nums` on all animated score roll-ups, round clocks, and seed tags so digits never shift horizontally on LED walls.
- **Battle Corner Contrast**: High-contrast `--accent-crimson` (Red Corner) vs `--accent-cobalt` (Blue Corner) framing for 1v1 battle brackets, reading exclusively from published projections (`publicEvents/{event}` with `published == true`) for public results.

---

## 5. Architecture & Bundle Isolation Rules

- **Authority Boundary**: Next.js (`apps/web`) owns rendering, routing, and browser interaction only. Never duplicate scoring tabulation, eligibility enforcement, lock authority, or payment ledger logic in Next.js handlers—delegate authoritative commands to the Rust API (`apps/api`).
- **Route-Level Code Splitting**: Lazy-load `gsap`, `lenis`, and Three.js / React Three Fiber strictly inside `(marketing)` or `(arena-live)` client components so `(console)` and `(portal)` bundles stay lightweight and boot fast on venue Wi-Fi.
- **Rule Provenance**: Treat specific competition numbers from `docs/product-brief.txt` as configurable defaults until verified against the official WSB rulebook (`docs/open-questions.md`). Use synthetic fixture data only.

---

## 6. Pre-Delivery Verification Checklist ("Prove It" Gate)

Before completing any UI task, verify:

1. **No Raw Hex Leaks**: All colors reference semantic CSS variables (`--bg-obsidian`, `--accent-volt`, etc.).
2. **Tabular Numbers**: Every score, timer, seed, and currency amount uses `--font-mono` with `tabular-nums`.
3. **GSAP & Listener Cleanup**: Every animated component uses `useGSAP(() => {}, { scope: containerRef })` and `gsap.matchMedia()` with zero un-reverted `ScrollTrigger` instances or leaked Firestore listeners on route change.
4. **Touch Target Audit**: Interactive controls in `(console)` meet `>= 56px × 56px` primary / `>= 48px × 48px` auxiliary targets with `>= 64px` judging slider tracks; validate layouts with realistic long crew names and translated labels.
5. **Surface Isolation & Honest Sync State**: Zero Lenis/parallax/heavy WebGL imports in `(console)` or `(portal)`, and local/queued scores are visually distinct from server-acknowledged submissions.
