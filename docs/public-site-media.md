# Public website: official media and motion

30 October 2026. User approved the concept and requested an energetic public
website using organization footage, presented as the actual organization.

## Sources

- [WSB homepage](https://worldsupremacybattlegrounds.com/): Hong Kong World
  Championship, 15–18 April 2027, Queen Elizabeth Stadium; registration,
  official rules/guide, contact and linked WSBstreet channel.
- [Championship announcement](https://worldsupremacybattlegrounds.com/wsb-world-championship-2027-save-the-dates-april-15-18/).
- [Official WSBstreet channel](https://www.youtube.com/maspresentshd).
- [AMK Rocknation, WSB Asia 2024](https://www.youtube.com/watch?v=fP2RcSnRYMo).
- [Kenyo Street Fam, WSB 2019](https://www.youtube.com/watch?v=JmN8I9OJjYk).
- [FMD Xtreme, WSB 2014](https://www.youtube.com/watch?v=Vf3TSVLV0pQ).
- [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
  and [player parameters](https://developers.google.com/youtube/player_parameters).

Hero performances are embedded through YouTube's privacy-enhanced player. No
footage was downloaded or re-encoded. Corresponding video thumbnails provide
posters. Crew, event and channel credits accompany links to full performances.
The generated concept image remains a development asset; it no longer represents
WSB footage on the homepage.

The existing WordPress event-detail endpoint returned an error during retrieval;
the new event page uses the functioning homepage and announcement. Linked 2026
rules are not claimed to be final 2027 rules; applicability requires confirmation.

## Public experience

Removed the public prototype banner, development-index footer link, fictional
Manila promotion and links into sample workspaces. Homepage, events, chapters,
help and results use public-facing copy and official destinations. Added
`/events/world-championship-2027`. Registration goes to the existing official
WSB form; it does not imply the new Rust/Firebase registration backend is complete.
Internal development tools retain accurate sample labels and remain unlinked
from marketing navigation.

## Motion and recovery

Scoped GSAP reveals headline lines and hero content, animates section/row
entrances, and gives the large wordmark bounded scroll movement. A moving WSB
slogan band and subtle stamp motion add continuous energy. Lenis remains the
only smooth-scroll engine, on public desktop layouts. Operational pages import
none of these motion components.

Official excerpts cycle as an always-muted decorative background. The hero has
no playback, sound or click controls. Reduced motion, data saving and slow-2G
connections use a still poster. Preference changes disable automatic playback.
Offscreen/background video and the slogan band pause when unused. The footer
motion preference stops video and page animation. See the later behavior update
in `docs/dark-logo-and-background-video.md`.

Video/API failures preserve the poster and primary CTA; the channel link remains
in the footer. Reduced-motion
and no-JavaScript modes keep readable content and navigation. Media loading is
independent of registration/event discovery. No WebGL is necessary.

## Verification

- Production build and TypeScript passed.
- Real browser playback verified all three official clips, automatic advancement,
  pause and resume, with no page-level errors.
- `tests/public-motion-browser.cjs` verifies controls, mute, global pause,
  rotation, preference changes, player destruction on navigation, reduced motion,
  data saving and blocked-video fallback with a controlled player fixture.
  Real YouTube playback was tested separately.
- Existing integration suite passed 54 responsive route/viewport cases, now
  including the real championship page. Public event/chapter/help/results pages
  have no prototype copy or horizontal overflow at 320px.
- Visually reviewed desktop/mobile screenshots and corrected narrow poster type.

Screenshots are in `.workspace/screenshots/`: wsb-motion-desktop.png,
wsb-motion-mobile.png and world-event-mobile.png. Full-page snapshots taken
before scrolling can capture offscreen entrance starting states; those complete
when the section enters view.

YouTube/browser availability, autoplay restrictions and platform branding remain
external constraints and are not bypassed. Physical-device, full accessibility
and field-performance audits remain release work. No cloud deployment or real
backend transaction was performed for this presentation change.
