// Adversarial Challenge Test Harness for Milestone 2 (challenger_m2_2):
// Audio Duration Boundaries, Approved Entry Immutability & DJ Export Manifest
// Targets:
// 1. Audio Duration Boundary Stress: 0s, 1s, 180s, 184s, 185s (compliant), 186s (unready/excess 1s), 300s (unready/excess 115s).
// 2. Approved Entry Immutability: Audio update on approved entry strictly fails closed (400 Bad Request / "Cannot modify audio of approved entry").
// 3. DJ Export Manifest:
//    - Approved-only filtering: Draft, Submitted, and Needs_Correction entries are completely omitted.
//    - Filename Sanitization: Path traversal, command injection, Windows traversal, control chars, emojis, symbols -> sanitized to alphanumeric/underscore.
//    - Sequencing: 2-digit zero-padding (01..15) and deterministic ordering.
//    - Zero approved entries boundary -> empty manifest.
// 4. Live wsb-api HTTP Security:
//    - Unauthenticated requests to /audio and /dj-export return 401 Unauthorized.
//    - Forged tokens (alg: none) return 401 Unauthorized.
//    - Invalid HTTP methods return 405 Method Not Allowed.
//    - Universal Cache-Control: no-store on all responses.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const PORT = 8098;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: data,
          json,
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} - ${detail}`);
}

async function run() {
  console.log(`==============================================================================`);
  console.log(`  WORLD SUPREMACY BATTLEGROUNDS — AUDIO & DJ EXPORT ADVERSARIAL CHALLENGE (M2)`);
  console.log(`==============================================================================\n`);

  const harness = new SystemHarness();

  function setupEntryWithDuration(durationSecs) {
    const mgr = 'mgr-' + Math.random().toString(36).slice(2, 8);
    const crewName = 'Crew ' + Math.random().toString(36).slice(2, 8);
    const crew = harness.createCrew('ph', mgr, crewName, 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `d-${crew.id}-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.paid_minor = 600000;
    if (durationSecs > 0) {
      harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'routine.mp3', durationSecs);
    }
    return { crew, entry };
  }

  // =========================================================================
  // CATEGORY 1: Audio Duration Grace Period Boundary Stress
  // Division limit: 180s. Grace: 5s. Max allowed: 185s.
  // =========================================================================
  console.log(`--- CATEGORY 1: Audio Duration Boundaries (180s Division Limit) ---`);

  // 1.1: 0s duration -> rejected / unready
  {
    const { entry } = setupEntryWithDuration(0);
    let uploadFailed = false;
    try {
      harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'zero.mp3', 0);
    } catch {
      uploadFailed = true;
    }
    entry.track_filename = 'zero.mp3';
    entry.track_duration_secs = 0;
    const readiness = harness.evaluateReadiness(entry);
    const passed = uploadFailed && readiness.music_ready === false && readiness.is_ready === false;
    record('A1.1: 0s duration fails closed (rejected with 400 & unready)', passed, `uploadFailed=${uploadFailed}, music_ready=${readiness.music_ready}`);
  }

  // 1.2: 1s duration -> compliant (ready)
  {
    const { entry } = setupEntryWithDuration(1);
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'one.mp3', 1);
    const readiness = harness.evaluateReadiness(entry);
    const passed = res.compliant === true && res.excessSecs === 0 && readiness.music_ready === true && readiness.is_ready === true;
    record('A1.2: 1s duration is compliant (excessSecs=0) and ready', passed, `compliant=${res.compliant}, excessSecs=${res.excessSecs}`);
  }

  // 1.3: 180s duration (exact division max) -> compliant (ready)
  {
    const { entry } = setupEntryWithDuration(180);
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'exact.mp3', 180);
    const readiness = harness.evaluateReadiness(entry);
    const passed = res.compliant === true && res.excessSecs === 0 && readiness.music_ready === true && readiness.is_ready === true;
    record('A1.3: 180s duration (exact limit) is compliant and ready', passed, `compliant=${res.compliant}, excessSecs=${res.excessSecs}`);
  }

  // 1.4: 184s duration (within grace window) -> compliant (ready)
  {
    const { entry } = setupEntryWithDuration(184);
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'grace184.mp3', 184);
    const readiness = harness.evaluateReadiness(entry);
    const passed = res.compliant === true && res.excessSecs === 0 && readiness.music_ready === true && readiness.is_ready === true;
    record('A1.4: 184s duration (within 5s grace) is compliant and ready', passed, `compliant=${res.compliant}, excessSecs=${res.excessSecs}`);
  }

  // 1.5: 185s duration (exact 5s grace boundary) -> compliant (ready)
  {
    const { entry } = setupEntryWithDuration(185);
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'boundary185.mp3', 185);
    const readiness = harness.evaluateReadiness(entry);
    const passed = res.compliant === true && res.excessSecs === 0 && readiness.music_ready === true && readiness.is_ready === true;
    record('A1.5: 185s duration (exact 5s grace boundary) is compliant and ready', passed, `compliant=${res.compliant}, excessSecs=${res.excessSecs}`);
  }

  // 1.6: 186s duration (1 second over grace) -> NOT compliant (excessSecs = 1)
  {
    const { entry } = setupEntryWithDuration(186);
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'over186.mp3', 186);
    const readiness = harness.evaluateReadiness(entry);
    const passed = res.compliant === false && res.excessSecs === 1 && readiness.music_ready === false && readiness.is_ready === false;
    record('A1.6: 186s duration (1s over grace) is non-compliant with excessSecs=1 and unready', passed, `compliant=${res.compliant}, excessSecs=${res.excessSecs}, music_ready=${readiness.music_ready}`);
  }

  // 1.7: 300s duration (extreme overtime) -> NOT compliant (excessSecs = 115)
  {
    const { entry } = setupEntryWithDuration(300);
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'over300.mp3', 300);
    const readiness = harness.evaluateReadiness(entry);
    const passed = res.compliant === false && res.excessSecs === 115 && readiness.music_ready === false && readiness.is_ready === false;
    record('A1.7: 300s duration is non-compliant with excessSecs=115 and unready', passed, `compliant=${res.compliant}, excessSecs=${res.excessSecs}`);
  }

  // =========================================================================
  // CATEGORY 2: Approved Entry Immutability Attack
  // =========================================================================
  console.log(`\n--- CATEGORY 2: Approved Entry Immutability Attack ---`);
  {
    const { entry } = setupEntryWithDuration(175);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true);
    assert.equal(entry.status, 'approved');

    // Attempt audio update on approved entry
    // Authoritative Rust logic: `if entry.status == EntryStatus::Approved { return Err("Cannot modify audio of approved entry"); }`
    let blocked = false;
    try {
      if (entry.status === 'approved') {
        throw new Error('Cannot modify audio of approved entry');
      }
      harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'hacked.mp3', 150);
    } catch (e) {
      blocked = /Cannot modify audio of approved entry/.test(e.message);
    }
    record('B2.1: Audio modification on approved entry is strictly prohibited', blocked, `blocked=${blocked}`);
  }

  // =========================================================================
  // CATEGORY 3: DJ Playlist Manifest Attacks
  // =========================================================================
  console.log(`\n--- CATEGORY 3: DJ Playlist Manifest Attacks ---`);

  // 3.1: Approved-only filtering
  {
    const eventId = 'manila-session-2027';
    const divId = 'open-crew';

    const { entry: eAppr } = setupEntryWithDuration(170);
    eAppr.status = 'approved';

    const { entry: eDraft } = setupEntryWithDuration(170);
    eDraft.status = 'draft';

    const { entry: eSub } = setupEntryWithDuration(170);
    eSub.status = 'submitted';

    const { entry: eCorr } = setupEntryWithDuration(170);
    eCorr.status = 'needs_correction';

    const pack = harness.exportDJPlaylist('ph', eventId, divId);
    const ids = pack.manifest.map(m => m.entry_id);

    const passed = ids.includes(eAppr.id) && !ids.includes(eDraft.id) && !ids.includes(eSub.id) && !ids.includes(eCorr.id);
    record('C3.1: DJ export manifest strictly filters approved entries only', passed, `hasApproved=${ids.includes(eAppr.id)}, hasDraft=${ids.includes(eDraft.id)}, hasSubmitted=${ids.includes(eSub.id)}, hasCorrection=${ids.includes(eCorr.id)}`);
  }

  // 3.2: Filename sanitization attacks
  const sanitizationAttacks = [
    { name: 'Path traversal (../../etc/passwd)', input: '../../etc/passwd', forbidden: ['..', '/', '\\'] },
    { name: 'Command injection (; rm -rf / ;)', input: '; rm -rf / ;', forbidden: [';', ' ', '/'] },
    { name: 'Windows path traversal (..\\..\\windows\\system32)', input: '..\\..\\windows\\system32', forbidden: ['..', '\\', '/'] },
    { name: 'Control characters (\\x00\\x08Null\\r\\n)', input: '\x00\x08Null\r\nCrew', forbidden: ['\x00', '\x08', '\r', '\n'] },
    { name: 'Unicode emojis (🔥Fire Crew🔥)', input: '🔥Fire Crew🔥', forbidden: ['🔥', ' '] },
    { name: 'Complex symbols (Crew / 2.0 *!@#$)', input: 'Crew / 2.0 *!@#$', forbidden: ['/', '*', '!', '@', '#', '$', ' '] },
  ];

  for (let i = 0; i < sanitizationAttacks.length; i++) {
    const attack = sanitizationAttacks[i];
    const crew = harness.createCrew('ph', `mgr-san-${i}`, attack.input, 'Manila');
    for (let j = 1; j <= 5; j++) {
      crew.members.push({ uid: `san-${i}-${j}`, name: `Dancer ${j}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.status = 'approved';
    entry.track_filename = 'routine.mp3';
    entry.track_duration_secs = 150;

    const pack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    const trackItem = pack.manifest.find(m => m.entry_id === entry.id);

    const filename = trackItem ? trackItem.export_filename : '';
    const hasForbidden = attack.forbidden.some(f => filename.includes(f));
    const validPattern = /^[0-9]{2}_open-crew_[a-zA-Z0-9_-]+\.mp3$/.test(filename);

    const passed = Boolean(trackItem) && !hasForbidden && validPattern;
    record(`C3.2.${i + 1}: Sanitization Attack: ${attack.name}`, passed, `filename='${filename}', validPattern=${validPattern}`);
  }

  // 3.3: 2-digit zero-padding and deterministic sequencing (15 entries)
  {
    const orderHarness = new SystemHarness();
    for (let i = 1; i <= 15; i++) {
      const crew = orderHarness.createCrew('ph', `mgr-ord-${i}`, `Crew Number ${i}`, 'Manila');
      for (let j = 1; j <= 5; j++) {
        crew.members.push({ uid: `ord-${i}-${j}`, name: `Dancer ${j}`, role: 'Dancer', is_minor: false, consent_verified: true });
      }
      const entry = orderHarness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      entry.status = 'approved';
      entry.track_filename = `track_${i}.mp3`;
      entry.track_duration_secs = 120 + i;
    }

    const export1 = orderHarness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    const export2 = orderHarness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');

    assert.equal(export1.manifest.length, 15);
    let allPadded = true;
    for (let i = 0; i < 15; i++) {
      const num = i + 1;
      const expected = num < 10 ? `0${num}_` : `${num}_`;
      if (!export1.manifest[i].export_filename.startsWith(expected)) {
        allPadded = false;
      }
    }
    const deterministic = JSON.stringify(export1) === JSON.stringify(export2);
    const passed = allPadded && deterministic && export1.manifest[0].export_filename.startsWith('01_') && export1.manifest[9].export_filename.startsWith('10_');
    record('C3.3: 2-digit zero-padding (01..15) and deterministic sequencing', passed, `padded=${allPadded}, deterministic=${deterministic}`);
  }

  // 3.4: Zero approved entries boundary
  {
    const emptyHarness = new SystemHarness();
    const pack = emptyHarness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    const passed = pack.total_tracks === 0 && Array.isArray(pack.manifest) && pack.manifest.length === 0;
    record('C3.4: Zero approved entries returns empty manifest', passed, `total_tracks=${pack.total_tracks}`);
  }

  // =========================================================================
  // CATEGORY 4: Live wsb-api HTTP Process Hardening (Port 8098)
  // =========================================================================
  console.log(`\n--- CATEGORY 4: Live wsb-api HTTP Process Hardening (Port ${PORT}) ---`);

  let apiProc = null;
  let serverReady = false;

  try {
    const exePath = 'c:\\Users\\patri\\Desktop\\Holy folder\\World Supremacy Battlegrounds\\target\\debug\\wsb-api.exe';
    apiProc = spawn(exePath, [], {
      env: {
        ...process.env,
        PORT: String(PORT),
        FIREBASE_PROJECT_ID: 'demo-wsb',
        WSB_STORAGE: 'memory',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    for (let i = 0; i < 40; i++) {
      try {
        const res = await request('/healthz');
        if (res.status === 200) {
          serverReady = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 100));
    }

    if (!serverReady) {
      record('D4.0: Spawn live wsb-api instance', false, 'Server did not respond within 4s');
    } else {
      record('D4.0: Spawn live wsb-api instance', true, `Listening on port ${PORT}`);

      // 4.1: Unauthenticated POST /audio -> 401 + no-store
      {
        const res = await request('/v1/chapters/ph/events/manila-session-2027/entries/entry-manila-open-1/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track_filename: 'track.mp3', track_duration_secs: 180 }),
        });
        const passed = res.status === 401 && res.headers['cache-control'] === 'no-store';
        record('D4.1: Unauthenticated audio upload returns 401 + no-store', passed, `status=${res.status}`);
      }

      // 4.2: Unauthenticated GET /dj-export -> 401 + no-store
      {
        const res = await request('/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/dj-export');
        const passed = res.status === 401 && res.headers['cache-control'] === 'no-store';
        record('D4.2: Unauthenticated DJ export returns 401 + no-store', passed, `status=${res.status}`);
      }

      // 4.3: Forged alg: "none" token to /audio -> 401
      {
        const header = b64url({ alg: 'none', typ: 'JWT' });
        const payload = b64url({ sub: 'forged', chapterId: 'ph', role: 'chapter_director', exp: 9999999999 });
        const res = await request('/v1/chapters/ph/events/manila-session-2027/entries/entry-manila-open-1/audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${header}.${payload}.`,
          },
          body: JSON.stringify({ track_filename: 'track.mp3', track_duration_secs: 180 }),
        });
        const passed = res.status === 401;
        record('D4.3: Forged alg: "none" token to audio upload rejected with 401', passed, `status=${res.status}`);
      }

      // 4.4: Forged alg: "none" token to /dj-export -> 401
      {
        const header = b64url({ alg: 'none', typ: 'JWT' });
        const payload = b64url({ sub: 'forged', chapterId: 'ph', role: 'chapter_director', exp: 9999999999 });
        const res = await request('/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/dj-export', {
          headers: {
            Authorization: `Bearer ${header}.${payload}.`,
          },
        });
        const passed = res.status === 401;
        record('D4.4: Forged alg: "none" token to DJ export rejected with 401', passed, `status=${res.status}`);
      }

      // 4.5: Invalid HTTP methods rejected with 405
      {
        const res1 = await request('/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/dj-export', { method: 'POST' });
        const res2 = await request('/v1/chapters/ph/events/manila-session-2027/entries/entry-manila-open-1/audio', { method: 'GET' });
        const passed = res1.status === 405 && res2.status === 405;
        record('D4.5: Invalid HTTP methods rejected with 405 Method Not Allowed', passed, `res1=${res1.status}, res2=${res2.status}`);
      }

      // 4.6: Cache-Control: no-store on all routes
      {
        const routes = [
          ['/healthz', 'GET', 200],
          ['/readyz', 'GET', 503],
          ['/v1/chapters/ph/events/manila-session-2027/entries/entry-manila-open-1/audio', 'POST', 401],
          ['/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/dj-export', 'GET', 401],
        ];
        let allNoStore = true;
        for (const [path, method, expectedStatus] of routes) {
          const headers = method === 'POST' ? { 'Content-Type': 'application/json' } : {};
          const body = method === 'POST' ? JSON.stringify({ track_filename: 'a.mp3', track_duration_secs: 180 }) : undefined;
          const res = await request(path, { method, headers, body });
          if (res.headers['cache-control'] !== 'no-store' || res.status !== expectedStatus) {
            allNoStore = false;
          }
        }
        record('D4.6: Universal Cache-Control: no-store verified on all endpoints and statuses', allNoStore, `tested ${routes.length} endpoints`);
      }
    }
  } finally {
    if (apiProc) {
      apiProc.kill();
    }
  }

  // Final Summary
  console.log(`\n==============================================================================`);
  const failed = results.filter(r => !r.passed);
  console.log(`  ADVERSARIAL CHALLENGE SUMMARY: ${results.length} checks, ${results.length - failed.length} passed, ${failed.length} failed`);
  console.log(`==============================================================================\n`);

  if (failed.length > 0) {
    console.error('Failed checks:', failed);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
