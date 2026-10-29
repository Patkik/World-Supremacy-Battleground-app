# All screen sizes, orientations and input modes

## Non-negotiable layout behavior

Support portrait and landscape without forcing rotation. Size and available
height determine layout; device names are test fixtures, not detection rules.
Use content-driven media/container queries, dynamic viewport units where useful,
safe-area insets and keyboard-aware scrolling. Do not infer touch capability
from viewport width. Touch, mouse, pen and keyboard must coexist.

The WSB skill's fixed-height judge desk is a preferred layout on a sufficiently
large tablet. At small height, enlarged text or split screen, allow content
scroll and keep submission reachable. The user's all-orientations request and
accessible operation take precedence over a blanket overflow-hidden rule.
Only dedicated calibrated arena scenes should use strict viewport composition.

## Layout ranges

| Available width | Default layout | Navigation | Important adjustment |
|---|---|---|---|
| 320–479 CSS px | One content column, full-width fields, compact records | Public drawer; portal bottom navigation; console task header | Long crew names wrap; no clipped status or disabled zoom |
| 480–767 | One main column; optional paired short fields when labels fit | Same compact navigation | Short landscape uses smaller header, ordinary page scroll |
| 768–1023 | Optional list/detail or two-column form groups | Collapsible rail or drawer | Tablet portrait favors single task column; split view behaves by container width |
| 1024–1439 | Persistent sidebar where room exists; main/detail | Desktop navigation | Keep readable content width; avoid stretching forms |
| 1440–1919 | Wider operational workspace and editorial compositions | Persistent | Supplemental details can open alongside main task |
| 1920+ | Max-width ordinary app content; calibrated display scenes | No uncontrolled extra navigation | Do not inflate dashboard density merely because pixels are available |

Height modifiers: below 500 CSS px remove decorative hero pinning, collapse
nonessential header chrome and make action bars static if they obstruct content.
Below 700px available judge height, use scrolling criterion groups while retaining
event identity and accessible status. Keyboard appearance must scroll the focused
field into view and avoid a sticky footer covering errors.

## Representative viewport test matrix

| Fixture | Portrait | Landscape | Required checks |
|---|---|---|---|
| Small phone | 320×568 | 568×320 | Header/menu, long labels, checkout, score input, keyboard-safe actions |
| Common phone | 390×844 | 844×390 | Registration stepper, pass QR, camera controls, short-height hero |
| Large phone | 430×932 | 932×430 | No accidental desktop-only interaction; full roster details |
| Small tablet | 768×1024 | 1024×768 | Judge desk reflow, two-pane review, forms |
| Large tablet | 834×1194 | 1194×834 | Five or variable criteria without clipping; stylus/touch |
| Large professional tablet | 1024×1366 | 1366×1024 | High-density console with readable context |
| Split-screen tablet/window | 375×1024 and 600×900 | Resize continuously | Draft preservation, no mistaken fixed desktop layout |
| Laptop | 1280×720 and 1366×768 | Window resized | Tables, dialogs, keyboard navigation and zoom |
| Desktop | 1440×900 and 1920×1080 | Window resized | Maximum content width, full management workflow |
| Ultrawide | 2560×1080 | 21:9 | Broadcast safe composition; app max width |
| Arena display | 1920×1080 and 3840×2160 | 16:9 | Viewing-distance readability, overscan-safe area, no private data |
| Portrait signage | 1080×1920 | 9:16 | Restacked result scene, readable names and next-up layout |
| Alternate LED | 1920×1200 | 16:10 | Letterbox or approved preset without stretched logo |
| Accessibility reflow | 1280-wide at 400% zoom | Effective 320 CSS px | Reach all content/actions; no whole-page two-axis scroll |

Also test browser chrome expansion/collapse, iOS standalone mode, Android install
mode, display cutouts, virtual keyboard, 200% text enlargement, user text-spacing
overrides, Windows high contrast, dark surroundings and bright outdoor check-in.
Minimum supported browser versions must be chosen against actual pilot devices;
test current and previous major Safari/iOS, Chrome/Android, Edge/Windows and
Firefox releases rather than declaring support solely from framework defaults.

## Page-family transformation rules

| Family | Phone portrait | Short landscape | Tablet | Desktop / large display |
|---|---|---|---|---|
| Landing | Stacked hero, small poster, two clear actions | Compact side-by-side or normal flow; no pin | Editorial media/copy balance | Large headline with framed media; lazy enhancement |
| Event directory | Filter sheet plus event rows | Compact filters, preserve results scroll | Filter row and two-column events where justified | Persistent filter controls; meaningful editorial hierarchy |
| Event detail | Sticky single action only if it does not obscure text | Static action after summary | Event facts alongside overview | Readable content with facts/registration sidebar |
| Forms | Single column; step title and progress | Keyboard-safe scrolling, static submit if necessary | Related short fields may pair | Constrained form width, contextual help beside it |
| Rosters | Each dancer as a concise record with details disclosure | Same record layout if height constrained | List/detail | Table with sticky identifier and deliberate columns |
| Finance | Currency-grouped summaries and transaction records | Full transaction detail remains available | Filter/list/detail | Ledger table with totals and export by scope |
| Judging | Criteria stack with numeric alternatives and visible saved state | Scrollable score area; no forced rotation | Landscape multi-zone desk; portrait criterion stack | Optional review pane; primary interaction remains touch-friendly |
| Head judge | Completion summaries and per-entry drilldown | Sequential review | Matrix with accessible row details | Full matrix with bounded table scrolling |
| Check-in | Camera above compact outcome; manual lookup | Camera beside outcome if height permits | Scanner plus recent checks | External scanner/keyboard input plus queue |
| Marshal | One stage lane at a time with explicit state changes | Horizontal space used without hiding actions | Selected lane plus next stage | Multiple lanes; keyboard-accessible move actions |
| Bracket | Round selector and match list | Focused match pair | Scrollable bracket with list alternative | Larger bracket; never shrink labels below readable size |
| Broadcast | Dedicated portrait preset or readable spectator view | Landscape scene | Match-focused layout | Calibrated viewport scene; safe margins and scene-specific type |

Column hiding never removes the only access to data. Essential fields move to
record details. Horizontal scrolling is limited to genuine two-dimensional data
such as a bracket/matrix; provide a linear alternative. Names wrap rather than
shrinking indefinitely; show full text via accessible details when truncation is
necessary. Rotation keeps selected event, active input, scroll intent and drafts.

## Touch, keyboard and assistive technology

Public primary controls aim for at least 44×44px. Portal/console controls use at
least 48px; judge primary controls at least 56px and slider tracks at least 64px.
Provide around 8px separation where accidental activation is likely. No hover-only
menus, drag-only reordering or swipe-only actions. Sliders have labeled numeric
inputs and step buttons. Confirm destructive/irreversible actions with consequence
and scope; routine save does not require repetitive confirmation.

Semantic headings, landmarks, skip link, explicit field labels, instructions and
error associations are required. Dialogs trap focus appropriately and return it
on close; nonmodal drawers must not trap unrelated navigation. Focus remains
visible and unobscured by sticky bars. Status updates use restrained live regions;
do not announce every slider movement or every stage feed update automatically.
Validation summary links to fields. Authentication permits paste and password
managers. Captions/transcripts accompany meaningful video/audio. User-generated
names and messages must be escaped and language direction considered.

Target WCAG 2.2 AA, with normal-text contrast 4.5:1, large text 3:1 and applicable
non-text controls 3:1. Verify actual token pairs in every state, especially muted
text, cobalt and crimson. Disabled controls still explain why unavailable.
Contrast ratios are targets until measured on implemented components.

## Broadcast specifics

Calibrate against physical screen and viewing distance, not resolution alone.
Start with 5% safe margins on each edge and verify with the venue. Use one primary
message per scene; full names take precedence over animation. Names may wrap to
two lines; fallback to agreed short display name only with an accessible/full-name
source. Never horizontally stretch the mark. For long brackets show current round
and adjacent context. Pause or skip reveal motion on reduced-motion displays.
Display credentials must not be embedded in a public URL. Public scenes receive
only data approved for spectators, even if the controller has broader access.

## Performance and resilience targets

Planning targets: public LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 at the 75th percentile
after sufficient field data; strive for LCP under 2s where media/network allow.
These are budgets, not measured outcomes. Initial public route JavaScript target
≤200KB compressed excluding optional media/late enhancements; console target
≤250KB compressed, to be measured and revised explicitly if Firebase costs exceed
the budget. Initial hero poster target ≤200KB; responsive video loads only after
essential content and respects data-saving/reduced-motion preferences.

Measure on a named mid-range phone and actual venue tablet. No remote font or
media request may block scoring readiness after the offline shell is installed.
Scope Firestore listeners to current event/view; bound query windows; pause unused
media/render loops; cleanup on route transitions. Test low storage, slow CPU,
network loss, reconnection, quota failure and service-worker version mismatch.
PWA upgrades must not discard pending scores or mix incompatible schema versions.

## Verification evidence

For each implemented page family save viewport screenshots, keyboard walkthrough,
screen-reader notes, contrast measurements and relevant network/recovery test
results. Rotate during active input and pending submission. Test representative
actual phones/tablets before a live event; browser emulation alone cannot establish
camera, keyboard, safe-area or venue behavior.

Sources: [W3C orientation guidance](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html)
supports preserving operation in both orientations; [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
explains the 320 CSS-pixel target and limited two-dimensional content exceptions.
