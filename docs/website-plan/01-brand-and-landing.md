# Brand direction, references and landing page

## Design thesis

Brand words: **defiant, collective, precise**. The public site should feel like
a championship poster brought to life. Operational pages should feel like the
same championship's control desk. Culture is expressed through real dancers,
the WSB mark, disciplined typography and composition, not decorative dashboard
widgets or invented achievements.

The supplied logo has a crown, hand-drawn WSB lettering, a STREET signature,
strong rectangular framing and black/white contrast. Preserve that artwork.
Use the frame as inspiration for editorial image boundaries and the crown as a
brand story cue. Do not replace the mark with typeset initials or extract a crown
as a new official submark without approval. The original is preserved at
[assets/wsb-logo-original.png](assets/wsb-logo-original.png).

The image includes substantial white surrounding space in the supplied view.
For production, obtain an approved vector or transparent original; retain the
current image intact in planning. Define visible-mark bounds before measuring
header size. Preliminary clear space: at least one crown-tip diameter around the
visible mark; final minimum reproduction size must pass an actual small-screen
legibility test. Do not stretch, redraw, recolor or animate the logo's geometry.
Use a neutral plaque where necessary to preserve its original background.
Provide descriptive alt text on a linked logo, and empty alt on repeated decoration.

## Reference board and application

| Reference and evidence | What it establishes | WSB application | Boundary |
|---|---|---|---|
| [Nike SNKRS](https://www.nike.com/snkrs-app) | Launch discovery, reminders, stories, event access and a repeated primary CTA are visible in the retrieved content | Event discovery followed by crew stories and a clear registration action | Borrow content prioritization, not Nike's logo, photography or shopping pressure |
| [Red Bull Dance Your Style](https://www.redbull.com/int-en/event-series/dance-your-style/red-bull-dance-your-style-winners) | Dance event context connects competition, champions and event coverage | Put dancers and performance media at the center of public storytelling | WSB voting and scoring must follow WSB rules, not this event's format |
| [Formula 1 results](https://www.formula1.com/en/results/2026/races) | Year, competition and event filtering lead to structured result tables | Consistent season/event/division selectors and tabular score presentation | Do not infer WSB ranking rules from motorsport |
| [M-Sport Raptor case study by Ryze](https://www.ryzeagency.co.uk/news/ryze-wins-site-of-the-day-at-awwwards-for-m-sport-raptor-website/) | The creating agency reports an Awwwards Site of the Day and describes motion-led motorsport storytelling | One memorable, media-led hero with performance controls and a usable static first frame | Agency-reported recognition; complete live motion was not audited |
| [Current WSB website](https://worldsupremacybattlegrounds.com/) | Existing navigation includes rules, registration, countries, events, studios, sponsors and contact | Preserve recognizable destinations and plan redirects from existing content | Event marketing content is not a verified scoring specification |

Direct Awwwards and ONFORM pages could not be reliably retrieved; ONFORM is
excluded from the verified reference board. Firecrawl CLI was unavailable, so
built-in web retrieval supplied the research. This is a research limitation,
not a reason to invent a screenshot-level analysis.

## Skills and precedence

- [WSB UI/UX architect](../../.agents/skills/wsb-ui-ux-architect/SKILL.md): surface modes, tokens, brand continuity and venue ergonomics.
- [WSB design](../../.agents/skills/wsb-design/SKILL.md) and [analysis](../../.agents/skills/wsb-analyze/SKILL.md): real workflows, provenance and recovery states.
- [Frontend design](../../.agents/skills/frontend-design/SKILL.md): subject-specific composition and intentional hierarchy.
- [Awwwards-quality workflow](../../.agents/skills/build-awwwards-quality-sites/SKILL.md): coherent hero narrative, functional first frame, motion fallbacks.
- [GSAP](../../.agents/skills/gsap/SKILL.md): scoped timelines, lifecycle cleanup and interruption behavior at implementation time.
- [UI Craft](../../.agents/skills/ui-craft/SKILL.md): operational forms, tables and complete state coverage.
- [UI/UX Pro Max](../../.agents/skills/ui-ux-pro-max/SKILL.md): targeted reflow and interaction guidance; local orientation/reflow query returned text and chip reflow guidance.
- Adapt and Impeccable provide supporting layout/accessibility principles. Existing user-supplied product and audience context grounds this plan; no new discovery interview is needed to repeat it.

Resolve generic skill disagreements using the established WSB brief and the
user's all-orientations requirement. Choose Archivo Black instead of conflicting
generic Syne recommendations. Keep the requested dark/volt identity despite
generic anti-neon guidance. A no-scroll judge layout is a roomy-tablet target,
not permission to clip content at small sizes or zoom. Broadcast type uses
viewport sizing only inside calibrated displays, with a readable rem floor in
ordinary browsers. These exceptions must be carried into implementation.

## Shared design system

| Token family | Planned definition and usage |
|---|---|
| Canvas | Obsidian #070709; carbon #101115 for elevated regions; tungsten #181A20 for inputs |
| Text | Chrome #F4F5F8; titanium #9BA1B0 for secondary text; #5E6472 only for nonessential/disabled treatment after contrast review |
| Actions | Volt #D4FF00 with dark label for main actions; do not use volt for every border |
| Status | Crimson #FF2A00 for destructive/penalty accents; amber for queued/warning; cobalt #0066FF for blue competitor framing; use accessible foreground pairs and text labels |
| Awards | Gold #FFB800 only where a rank or champion status is sourced |
| Display | Archivo Black; candidate source: [Google Fonts](https://fonts.google.com/specimen/Archivo+Black); verify license and language subset before packaging |
| Body | Geist; sentence case, 16px equivalent default, 1.5–1.6 line height; long-form width 65–75ch |
| Numeric | JetBrains Mono or tabular numerals; consistent decimal precision per scoring policy; currency code when symbols are ambiguous |
| Scale | 4/8/12/16/24/32/48/64/96 spacing; app headings 20/24/32rem-equivalent px; marketing headings fluid within tested bounds |
| Geometry | Mostly square editorial edges, restrained 4–8px controls, pills reserved for concise state labels |
| Focus | Visible high-contrast outline with offset, never substituted only by a glow |
| Elevation | Solid surfaces and borders first; blur only on limited public HUD elements with opaque fallback |

All values become semantic CSS tokens. Components reference tokens; they do not
introduce per-page colors. Map roles to a single icon family with labels. Red
and blue competitors must also have names and corner labels. Error, warning,
pending and success always have distinct text and icons.

## Landing page storyboard — top to bottom

### 1. Navigation and event notice
Desktop: approved logo left; Events, Chapters, Results, Stories, About; utilities
Help and Sign in; primary Register crew. Mobile: logo, menu, one registration
action. Menu contains the same destinations and returns focus to its trigger.
Optional single event notice includes an actual sourced date and destination;
hide it when no notice is active. Registration sends users to event selection,
or directly to a specific event only when the campaign is explicitly event-bound.

### 2. Hero: Own the stage
Draft headline: **Own the stage. Represent your world.** Supporting copy:
“Find your next WSB event, bring your crew together, and follow the competition
from the first call to the final results.” Primary action: Find an event.
Secondary: Explore WSB. Returning users get a clearly labeled Sign in utility.
Use an authentic licensed dance image as the first render. Optional muted loop
shows a freeze, formation and crowd response; do not imply unidentified dancers
are WSB champions. Stage lighting and the logo's framing inspire the composition.

Wide screens: asymmetric headline and framed performance media, with generous
negative space. Portrait phones: concise headline, cropped media below or behind
a solid readable text area, stacked actions. Short landscape: compact header,
headline beside poster, ordinary vertical flow. Keep navigation and buttons usable
before animation completes. The first meaningful frame is also the no-JS design.

### 3. Featured event / live event strip
Show one prioritized event with chapter, local date/time zone, venue, registration
state and action. If live, say “Live now” only from an active publication source.
Otherwise show “Registration open,” “Coming soon” or “Results available.” No fake
countdowns. Countdown expiry changes to a factual status, not negative numbers.
Stale live feeds show last update rather than pretending the show is current.

### 4. Find your battleground
Chapter list plus featured event rows. Filters: country/chapter, month and event
type; location detection is optional and never required. Country text accompanies
flags. Map or 3D chapter treatment is optional progressive enhancement; the full
list remains usable by touch, keyboard and screen reader.

### 5. From your crew to the stage
Three genuine journey steps: Choose your event; Bring your crew; Get stage-ready.
Each has one sentence and a related help link. Explain dancer self-onboarding
and readiness tracking; avoid promising automatic approval or guaranteed entry.
Primary action returns to event discovery without losing chapter filters.

### 6. The movement, through its people
One major crew story plus two smaller editorial stories, varied image proportions,
real titles and verified credits. Use consented media, especially for minors.
No invented testimonials, country counts, prize amounts or “trusted by” claims.

### 7. Results with context
Latest published event results and optional champion feature with event/division
labels. Separate event placement from season ranking. Ranking module remains
disabled until an approved points policy exists. “View results” always opens the
correct event and division, with publication timestamp and revision where relevant.

### 8. Join the community
Distinct entry paths for studios/chapter organizers and sponsors. Short explanation
of each opportunity; contact/inquiry form rather than fabricated partner logos.
Display actual approved sponsors with term, event scope and supplied asset rights.

### 9. Helpful answers and final action
Questions: How do I register? Can dancers join through an invitation? Where are
event rules? How do I find payment status? Where can I get help? Answers describe
confirmed platform behavior and link to event-specific policy. Final action:
“Find your next event.” Footer includes policy, accessibility, safeguarding,
support, official social accounts and chapter selector.

## Motion choreography and fallbacks

Initial sequence: restrained mark appearance, headline line reveal, poster/media
reveal; target 0.8–1.2 seconds with immediate usable content. Do not put a loader
between users and navigation. Optional desktop scroll transition frames the
chapter section; cap pin duration and skip on short screens, coarse-pointer
devices with performance problems, reduced motion and data-saving mode.
One scroll authority only, scoped to marketing. Optional WebGL must explain a
visual transition, pause offscreen and recover to a poster on context loss.
No autoplay audio. Playback control is visible; ongoing motion can be paused.
Do not split accessible text into separately announced letters.

Operational motion: 120–180ms state feedback with immediate text updates. Broadcast
reveals: deliberate 400–800ms sequence only after authorized publication. Never
animate intermediate fabricated score values as if they were results.

## Component library to design before page production

Brand mark container; public header/footer; chapter/event switcher; public event
row; event state badge; article feature; portal shell; console shell; breadcrumb;
role switcher; form field; stepper; validation summary; upload field; roster row;
data table and compact record; money summary; receipt; progress checklist; offline
status; outbox drawer; judge criterion control; deduction record; timeline;
bracket match; result row; confirmation dialog; toast/live region; empty/error
state; privacy redaction; broadcast title/score frame. Each receives keyboard,
touch, reduced-motion, pending, error, disabled and long-label variants.
