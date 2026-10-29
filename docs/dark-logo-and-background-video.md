# Dark-mode brand and decorative hero video

30 October 2026. User requested a white logo for dark mode and autoplay footage
that behaves like an image, with no video interactions.

## Logo

- Original retained unchanged: `apps/web/public/brand/wsb-logo.png`.
- White variant: `apps/web/public/brand/wsb-logo-white.svg`.
- The white SVG embeds the original PNG and maps its original alpha to white
  with an SVG filter. It is a raster-backed SVG container, not a newly traced
  vector logo. The crown, lettering, frame and edge transparency remain exact.
- Site logos use the original optimized image with a white rendering filter
  under `html[data-theme="dark"]`. This avoids serving a second large source
  image for every navigation mark. No white backing rectangle is used.
- Applied to shared public/portal/console branding and the arena mark. The app
  explicitly declares its current dark theme on the HTML root.

Two built-in image-generation edits were tried with the original as reference,
requesting pure white on transparent alpha, unchanged geometry, clean edges and
no texture. Both introduced unwanted texture and were rejected. The final
code-native SVG/filter treatment uses the original alpha without redrawing any
artwork; no generated logo bitmap is shipped.

## Hero behavior

The official WSBstreet excerpts continue automatically, always muted, and rotate
without a play action. Removed play/pause, sound, counters, captions and links
from the hero frame. Footage has no pointer interaction or keyboard focus target;
the underlying YouTube player has controls disabled and is excluded from the
accessibility tree as decorative background. WSBstreet attribution remains in
the footer and the media source notes.

Reduced-motion, data-saving, playback-denied and media/network-error cases show
the corresponding still image without an interaction prompt. Offscreen and
background playback pauses to conserve resources. Browser/platform restrictions
can prevent autoplay; the page still works with the poster in that case.

The floating page-motion control was removed. A site preference is available in
the footer, outside the hero, to reduce page motion. Its setting persists within
the browser session; the device's reduced-motion preference remains respected.
No audio can be enabled through the decorative hero.

## Verification

The updated browser test checks no hero buttons or links, inert pointer behavior,
muted startup, footer motion preference, clip rotation, cleanup, reduced motion,
data saving and still-image failure recovery. It also checks the dark-theme
attribute and transparent logo backing. Real-media playback and desktop/mobile
screenshots are checked separately, along with the production build.

Source footage and content provenance remain in `docs/public-site-media.md`.
