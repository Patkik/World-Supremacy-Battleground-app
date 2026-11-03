const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

const read = file => readFileSync(file, 'utf8');
const rootLayout = read('apps/web/src/app/layout.tsx');
const skipLink = read('apps/web/src/components/skip-link.tsx');
const theme = read('apps/web/src/app/theme.css');
const fallback = read('apps/web/src/app/global-error.tsx');
const routeError = read('apps/web/src/app/error.tsx');
const marketingLayout = read('apps/web/src/app/(marketing)/layout.tsx');
const manifest = read('apps/web/src/app/manifest.ts');
const robots = read('apps/web/src/app/robots.ts');
const publicArena = read('apps/web/src/app/(arena-live)/arena-live/[eventId]/page.tsx');
const previewArena = read('apps/web/src/app/(arena-live)/arena-live/demo/page.tsx');

test('shared accessibility and recovery contracts remain present', () => {
  assert.match(rootLayout, /<SkipLink\s*\/>/);
  assert.match(skipLink, /href="#main-content"/);
  assert.doesNotMatch(skipLink, /"use client"/);
  assert.match(read('apps/web/src/app/(marketing)/page.tsx'), /id="main-content"\s+tabIndex=\{-1\}/);
  assert.match(theme, /:focus-visible\{outline:2px solid var\(--accent-volt\)/);
  assert.match(theme, /\.skip-link:focus\{transform:translateY\(0\)/);
  assert.match(theme, /\.button\{[^}]*min-height:56px/);
  assert.match(routeError, /role="alert"/);
  assert.match(routeError, /onClick=\{retry\}/);
  assert.match(routeError, /saved or queued status/);
  assert.match(marketingLayout, /robots: \{ index: true/);
  assert.match(rootLayout, /robots: \{ index: false/);
  assert.match(robots, /"\/app"/);
  assert.match(manifest, /wsb-icon-192\.png/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.match(fallback, /role="alert"/);
  assert.match(fallback, /aria-labelledby="fatal-error-title"/);
  assert.match(fallback, /minHeight: 56/);
});

test('published arena route does not import the fictional preview display', () => {
  assert.match(publicArena, /PublicStageDisplay/);
  assert.doesNotMatch(publicArena, /ArenaDisplay|Afterhours Collective|fictional/i);
  assert.match(previewArena, /ArenaDisplay/);
});
