# Prototype assets and visual implementation

## Brand

`apps/web/public/brand/wsb-logo.png` is an unchanged copy of the user-supplied
WSB-Logo-with-outline-3715651208.png. It is displayed intact with a neutral
background where required. The WSB name and logo identify the user's project.
Fictional crews are labeled as samples, not actual entrants or endorsers.

## Original concept photograph

`apps/web/public/images/dance-hero.png` was generated with the built-in image
generation tool for this prototype. It depicts fictional adults and is not a
photograph of a real WSB event. The homepage caption identifies it as an original
concept image. Original dimensions: 1672 × 941. Next.js provides responsive
optimized delivery. The repository keeps the selected original output.

Generation prompt:

> Create a photorealistic editorial street dance campaign photograph for a championship website, landscape 16:9. A fictional adult male breakdancer in oversized charcoal streetwear and pale sneakers, captured in an athletic low airborne freeze / floorwork transition center-right, with three adult crew members in the deep background. Realistic human anatomy, cinematic warm tungsten stage side lighting, strong shadows, dusty black concrete underground rehearsal space, subtle film grain. Black, bone white and warm amber photographic palette. Dynamic camera near floor, dramatic composition, subject stays fully within right two-thirds, dark negative space left for website copy. Raw credible street dance culture, not glossy fitness advertising. No text, no logos, no watermarks, no brand marks, no trophy, no neon effects. This is fictional concept imagery, not a documented real WSB event.

No external website photographs, endorsements or sponsor assets were copied.

## Type and interface icons

Archivo Black, Geist and JetBrains Mono are bundled locally through Fontsource
packages. Their package distributions include font-license notices. Runtime
pages do not depend on Google Fonts connections.

Interface navigation icons are Solar Linear by **480 Design**, via the Iconify
Solar collection, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Source: [Solar icon set](https://www.figma.com/community/file/1166831539721848736).
The selected paths are copied without geometric changes into
`apps/web/src/lib/preview/solar-icons.ts`; only size and inherited UI color change.
This attribution is linked from the prototype help page.

## Public-site update — 30 October 2026

The public hero now uses official WSBstreet video excerpts and their poster
frames, superseding the original concept-image treatment described above.
The generated image remains in the repository for development screens.
See [current media and motion notes](public-site-media.md) for sources and checks.

## Original prototype motion and scope

The homepage uses scoped GSAP/useGSAP plus a single Lenis instance on fine-pointer
desktop layouts. Reduced-motion users get native scrolling and no entry sequence.
Unsubscription and instance destruction occur on route change. Portal, judge and
arena pages import no marketing motion module. No Three.js or decorative shader
is included; the original photograph provides the intended focal depth.

The site currently implements representative browser-local previews. Firebase
authentication, uploads, payment and official score submission remain separate
backend-dependent work. No official result is fabricated or published.
