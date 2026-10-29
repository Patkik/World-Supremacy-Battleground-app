# Representative UI prototype — validation and handoff

30 October 2026. This delivery implements the first representative visual
prototype in the actual Next.js application. Rust and Firebase business
operations are unchanged.

## Preview routes

| Screen | Route | Working interactions |
|---|---|---|
| Home | `/` | Navigation, chapter anchors, event links and reduced-motion fallback |
| Events | `/events`, `/events/manila-session` | Sample event discovery and registration entry |
| Registration | `/app/register/demo` | Name validation, roster add/remove, file metadata, four steps, local draft and saved preview |
| Crew dashboard | `/app`, `/app/crews` | Saved sample registration, roster/readiness concept and reset |
| Judge desk | `/console/demo/judge` | Sliders, numeric alternatives, review dialog, local save/restore |
| Arena | `/arena-live/demo` | Performing, on-deck and holding scenes |
| Supporting | `/chapters`, `/help`, `/results`, `/preview` | Discovery, help/privacy/credits, honest results empty state, screen index |

## Executed checks

- Production build and TypeScript compilation passed.
- `tests/prototype-browser.cjs`: 54 route/viewport combinations, covering six
  core routes at 1440×1000, 390×844, 844×390, 834×1194, 1194×834, 320×568,
  2560×1080, 1920×1080 and 1080×1920.
- Checked pages returned HTTP 200, had one main landmark and primary heading,
  and no document-level horizontal overflow.
- Mobile menu opens/closes; Escape restores focus to the menu button.
- Registration validates an empty name, adds a sample dancer, preserves state
  during rotation and restores a saved entry on the dashboard after reload.
- Judge input, review dialog, local save and reload restore passed.
- Arena scene switching and no-JavaScript public event navigation passed.
- No page-level JavaScript errors observed during the integration run.
- Homepage internal destinations returned successful responses.
- Visually inspected desktop/mobile screenshots; fixed arena logo contrast,
  wide-screen editorial grid, operational touch targets and landscape judge
  density. At 1194×834 the criteria panel and review button fit in the viewport.

Local screenshots are in `.workspace/screenshots/`, including hero-preview.png,
app-1440.png, console-demo-judge-1440.png and the 390px variants. Asset provenance
and generation prompt are in `docs/prototype-assets.md`.

## Re-run

With the local server running and an installed Playwright package:

```powershell
$env:WSB_PLAYWRIGHT_MODULE = 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node tests/prototype-browser.cjs
```

Use WSB_PREVIEW_URL for another local server. Tests use isolated browser contexts
and synthetic data.

## Limits

The prototype does not authenticate real users, create real registrations, upload
music, take payments or submit scores. Sample dates, criteria, fees and identities
are labeled. Local judge saving never claims a server receipt. Public results
remain empty rather than manufacturing an official outcome.

No full WCAG audit, screen-reader session, real-device venue test, field
performance measurement or production Firebase integration test was performed
for this UI delivery. Viewport emulation does not establish physical device
support. Next: current membership authorization and real registration contracts,
then connect the approved visual flow to Rust APIs.
