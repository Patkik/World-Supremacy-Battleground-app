// Adversarial Challenge Test Harness for Milestone 5
// Results Tabulation Arithmetic, Immutable Publication & Tie Policy Gate,
// Zero-PII Public Standings Projections, Brand Mark Filter & Inert Hero Video
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} — ${detail}`);
}

async function runAdversarialM5Suite() {
  console.log('='.repeat(80));
  console.log('  MILESTONE 5: ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGE SUITE');
  console.log('  Results Tabulation, Tie Gate, Publication Immutability & Brand UX');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target Workspace: ${projectRoot}`);
  console.log('-'.repeat(80));

  const harness = new SystemHarness();

  // Helper to setup multi-crew division with customizable scores and deductions
  function setupTestDivision(crewConfigs) {
    harness.reset();
    const eventId = 'manila-session-2027';
    const divisionId = 'open-crew';
    const panel = ['staff-judge-1', 'staff-judge-2', 'staff-judge-3'];

    const createdCrews = [];
    const createdEntries = [];

    crewConfigs.forEach((cfg, idx) => {
      const crew = harness.createCrew('ph', `mgr-${idx + 1}`, cfg.name || `Crew ${idx + 1}`, cfg.city || 'Manila');
      for (let i = 1; i <= 5; i++) {
        crew.members.push({
          uid: `dancer-${crew.id}-${i}`,
          name: `Dancer ${i}`,
          role: 'Dancer',
          is_minor: false,
          consent_verified: true,
        });
      }
      const entry = harness.createEntryDraft('ph', eventId, crew.id, divisionId);
      entry.status = 'approved';

      // Submit judge scores
      panel.forEach((jUid, jIdx) => {
        const scoreVal = Array.isArray(cfg.judgeScores) ? cfg.judgeScores[jIdx] : cfg.score || 90;
        const perPillar = scoreVal / 5;
        harness.submitScore('ph', eventId, jUid, {
          schema_version: 1,
          operation_id: `op-${crew.id}-${jUid}`,
          division_id: divisionId,
          crew_id: crew.id,
          expected_revision: 0,
          criteria: {
            choreography: perPillar,
            musicality: perPillar,
            execution: perPillar,
            stage_presence: perPillar,
            entertainment: perPillar,
          },
          deductions: [],
        });
      });

      // Submit deductions if configured
      if (cfg.deductions && cfg.deductions.length > 0) {
        harness.setDeductions('ph', eventId, divisionId, crew.id, 'head_judge', cfg.deductions);
      }

      createdCrews.push(crew);
      createdEntries.push(entry);
    });

    return { eventId, divisionId, crews: createdCrews, entries: createdEntries };
  }

  // =========================================================================
  // SECTION 1: DIVISION RESULTS TABULATION ARITHMETIC & RANKING MATRIX (F31)
  // =========================================================================
  console.log('\n[SECTION 1] Division Results Tabulation Arithmetic & Ranking Invariants');

  // 1.1 Zero deduction clamp when deductions exceed raw score
  {
    setupTestDivision([
      { name: 'Clamped Crew', score: 75.0, deductions: [{ code: 'severe', reason: 'Disqualification level', points: 120.0 }] },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const c1 = res[0];
    const pass = c1.raw_average === 75.0 && c1.total_deductions === 120.0 && c1.final_score === 0.0 && !Object.is(c1.final_score, -0);
    record(
      'S1.1: Deductions exceeding raw score are clamped strictly to 0.0 (never negative)',
      pass,
      `raw=${c1.raw_average}, deductions=${c1.total_deductions}, final_score=${c1.final_score}`
    );
  }

  // 1.2 Deductions exactly equal raw score
  {
    setupTestDivision([
      { name: 'Zero Crew', score: 50.0, deductions: [{ code: 'ded-exact', reason: 'Exact offset', points: 50.0 }] },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const c1 = res[0];
    const pass = c1.final_score === 0.0;
    record(
      'S1.2: Deductions exactly equaling raw score yield 0.0 final score',
      pass,
      `final_score=${c1.final_score}`
    );
  }

  // 1.3 Multi-tier deductions from head judge
  {
    setupTestDivision([
      {
        name: 'Multi-Deduction Crew',
        score: 95.0,
        deductions: [
          { code: 'time', reason: 'Overtime', points: 2.5 },
          { code: 'apparel', reason: 'Costume violation', points: 3.0 },
          { code: 'fall', reason: 'Stunt drop', points: 1.25 },
        ],
      },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const c1 = res[0];
    // 95.0 - 6.75 = 88.25
    const pass = c1.total_deductions === 6.75 && c1.final_score === 88.25;
    record(
      'S1.3: Multi-tier technical deductions accumulate accurately and subtract from raw score',
      pass,
      `total_deductions=${c1.total_deductions}, final_score=${c1.final_score}`
    );
  }

  // 1.4 Repeating decimal rounding to 2 decimal places
  {
    // Panel scores: 88, 89, 89 -> sum 266 / 3 = 88.666666... -> rounded to 88.67
    setupTestDivision([
      { name: 'Repeating Crew', judgeScores: [88.0, 89.0, 89.0] },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const c1 = res[0];
    const pass = c1.raw_average === 88.67 && c1.final_score === 88.67;
    record(
      'S1.4: Raw score average with repeating decimals rounds mathematically to 2 decimal places',
      pass,
      `raw_average=${c1.raw_average}, final_score=${c1.final_score}`
    );
  }

  // 1.5 Standard 1224 Competition Ranking: Dense Unique Scores [95, 92, 88, 85] -> [1, 2, 3, 4]
  {
    setupTestDivision([
      { name: 'Crew 1', score: 95.0 },
      { name: 'Crew 2', score: 92.0 },
      { name: 'Crew 3', score: 88.0 },
      { name: 'Crew 4', score: 85.0 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const ranks = res.map(r => r.rank);
    const pass = JSON.stringify(ranks) === JSON.stringify([1, 2, 3, 4]);
    record(
      'S1.5: Distinct scores assign sequential 1, 2, 3, 4 competition ranks in descending order',
      pass,
      `ranks=${JSON.stringify(ranks)}`
    );
  }

  // 1.6 Standard 1224 Ranking: Two-Way Tie at 1st Place [90, 90, 80] -> [1, 1, 3] (Rank 2 skipped)
  {
    setupTestDivision([
      { name: 'Alpha', score: 90.0 },
      { name: 'Beta', score: 90.0 },
      { name: 'Gamma', score: 80.0 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const ranks = res.map(r => r.rank);
    const pass = JSON.stringify(ranks) === JSON.stringify([1, 1, 3]);
    record(
      'S1.6: Two-way tie at 1st place assigns ranks [1, 1, 3] (rank 2 is skipped)',
      pass,
      `ranks=${JSON.stringify(ranks)}`
    );
  }

  // 1.7 Standard 1224 Ranking: Three-Way Tie at 1st Place [90, 90, 90, 80] -> [1, 1, 1, 4] (Ranks 2, 3 skipped)
  {
    setupTestDivision([
      { name: 'Crew A', score: 90.0 },
      { name: 'Crew B', score: 90.0 },
      { name: 'Crew C', score: 90.0 },
      { name: 'Crew D', score: 80.0 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const ranks = res.map(r => r.rank);
    const pass = JSON.stringify(ranks) === JSON.stringify([1, 1, 1, 4]);
    record(
      'S1.7: Three-way tie at 1st place assigns ranks [1, 1, 1, 4] (ranks 2 & 3 skipped)',
      pass,
      `ranks=${JSON.stringify(ranks)}`
    );
  }

  // 1.8 Standard 1224 Ranking: Two-Way Tie at 2nd Place [95, 90, 90, 85] -> [1, 2, 2, 4] (Rank 3 skipped)
  {
    setupTestDivision([
      { name: 'First Crew', score: 95.0 },
      { name: 'Tied Crew 1', score: 90.0 },
      { name: 'Tied Crew 2', score: 90.0 },
      { name: 'Fourth Crew', score: 85.0 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const ranks = res.map(r => r.rank);
    const pass = JSON.stringify(ranks) === JSON.stringify([1, 2, 2, 4]);
    record(
      'S1.8: Two-way tie at 2nd place assigns ranks [1, 2, 2, 4] (rank 3 is skipped)',
      pass,
      `ranks=${JSON.stringify(ranks)}`
    );
  }

  // 1.9 Standard 1224 Ranking: Consecutive Multi-Tier Ties [95, 95, 90, 90, 80] -> [1, 1, 3, 3, 5]
  {
    setupTestDivision([
      { name: 'Top 1', score: 95.0 },
      { name: 'Top 2', score: 95.0 },
      { name: 'Mid 1', score: 90.0 },
      { name: 'Mid 2', score: 90.0 },
      { name: 'Bottom', score: 80.0 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const ranks = res.map(r => r.rank);
    const pass = JSON.stringify(ranks) === JSON.stringify([1, 1, 3, 3, 5]);
    record(
      'S1.9: Consecutive pairs of ties assign ranks [1, 1, 3, 3, 5] (ranks 2 & 4 skipped)',
      pass,
      `ranks=${JSON.stringify(ranks)}`
    );
  }

  // 1.10 All Crews Tied Across Division -> All Rank 1
  {
    setupTestDivision([
      { name: 'C1', score: 85.0 },
      { name: 'C2', score: 85.0 },
      { name: 'C3', score: 85.0 },
      { name: 'C4', score: 85.0 },
      { name: 'C5', score: 85.0 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const ranks = res.map(r => r.rank);
    const pass = ranks.length === 5 && ranks.every(r => r === 1);
    record(
      'S1.10: Division where all crews achieve identical final score assigns rank 1 to all',
      pass,
      `ranks=${JSON.stringify(ranks)}`
    );
  }

  // 1.11 Single Crew Division -> Rank 1
  {
    setupTestDivision([
      { name: 'Solo Champion', score: 91.5 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const pass = res.length === 1 && res[0].rank === 1 && res[0].final_score === 91.5;
    record(
      'S1.11: Single crew division is tabulated with exact score and rank 1',
      pass,
      `count=${res.length}, rank=${res[0]?.rank}`
    );
  }

  // 1.12 Empty Division -> Empty Array
  {
    harness.reset();
    harness.divisions.set('manila-session-2027:empty-div', {
      id: 'empty-div',
      name: 'Empty Div',
      min_members: 1,
      max_members: 5,
      max_duration_secs: 180,
      fee_minor: 100000,
    });
    harness.judgePanels.set('manila-session-2027:empty-div', ['staff-judge-1']);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'empty-div');
    const pass = Array.isArray(res) && res.length === 0;
    record(
      'S1.12: Division with zero entries tabulates an empty results array without error',
      pass,
      `length=${res.length}`
    );
  }

  // 1.13 Floating Point Precision Stress Test: Fractional Deduction Rounding
  {
    setupTestDivision([
      { name: 'Precision Crew', score: 90.0, deductions: [{ code: 'fraction', reason: 'Small fractional penalty', points: 0.125 }] },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    // Deduction 0.125 rounds to 0.13, and 90.00 - 0.13 = 89.87
    const c1 = res[0];
    const pass = c1.final_score === 89.87 && c1.total_deductions === 0.13;
    record(
      'S1.13: Floating point precision fractional deductions (0.125) round cleanly to 2 decimal places',
      pass,
      `total_deductions=${c1.total_deductions}, final_score=${c1.final_score}`
    );
  }

  // 1.14 Standard 1224 Ranking: Two-Way Tie at 3rd Place [95, 92, 88, 88, 80] -> [1, 2, 3, 3, 5]
  {
    setupTestDivision([
      { name: 'Rank 1 Crew', score: 95.0 },
      { name: 'Rank 2 Crew', score: 92.0 },
      { name: 'Tied 3A', score: 88.0 },
      { name: 'Tied 3B', score: 88.0 },
      { name: 'Rank 5 Crew', score: 80.0 },
    ]);
    const res = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const ranks = res.map(r => r.rank);
    const pass = JSON.stringify(ranks) === JSON.stringify([1, 2, 3, 3, 5]);
    record(
      'S1.14: Two-way tie at 3rd place assigns ranks [1, 2, 3, 3, 5] (rank 4 skipped)',
      pass,
      `ranks=${JSON.stringify(ranks)}`
    );
  }

  // =========================================================================
  // SECTION 2: IMMUTABLE PUBLICATION & CONFIGURABLE TIE POLICY GATE (F32)
  // =========================================================================
  console.log('\n[SECTION 2] Immutable Publication & Configurable Tie Policy Gate');

  // 2.1 Unlocked Division Publication Failure (409 Conflict)
  {
    setupTestDivision([
      { name: 'Crew 1', score: 90.0 },
      { name: 'Crew 2', score: 85.0 },
    ]);
    // Do NOT lock division
    let threw = false;
    let errCode = null;
    let errMsg = '';
    try {
      harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    } catch (e) {
      threw = true;
      errCode = e.status;
      errMsg = e.message;
    }
    const pass = threw && errCode === 409 && /must be locked/.test(errMsg);
    record(
      'S2.1: Publishing an un-locked division fails closed with 409 Conflict',
      pass,
      `status=${errCode}, message="${errMsg}"`
    );
  }

  // 2.2 Unapproved Tie Fails Closed by Default (409 Conflict)
  {
    setupTestDivision([
      { name: 'Tied Alpha', score: 90.0 },
      { name: 'Tied Beta', score: 90.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    let threw = false;
    let errCode = null;
    let errMsg = '';
    try {
      // Default: allowTies = false
      harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    } catch (e) {
      threw = true;
      errCode = e.status;
      errMsg = e.message;
    }
    const pass = threw && errCode === 409 && /ties/.test(errMsg);
    record(
      'S2.2: Publishing tied results without explicit tie policy approval unconditionally returns 409 Conflict',
      pass,
      `status=${errCode}, message="${errMsg}"`
    );
  }

  // 2.3 Explicit allow_ties = false Fails Closed (409 Conflict)
  {
    setupTestDivision([
      { name: 'Tied Alpha', score: 90.0 },
      { name: 'Tied Beta', score: 90.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    let threw = false;
    let errCode = null;
    let errMsg = '';
    try {
      harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', false);
    } catch (e) {
      threw = true;
      errCode = e.status;
      errMsg = e.message;
    }
    const pass = threw && errCode === 409 && /ties/.test(errMsg);
    record(
      'S2.3: Explicit allow_ties = false fails closed with 409 Conflict when tied rankings exist',
      pass,
      `status=${errCode}, message="${errMsg}"`
    );
  }

  // 2.4 Explicit allow_ties = true Succeeds, Assigns Shared Ranks, Computes SHA-256 Digest
  {
    setupTestDivision([
      { name: 'Tied Alpha', score: 90.0 },
      { name: 'Tied Beta', score: 90.0 },
      { name: 'Third Place', score: 85.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', true);
    const r1 = snapshot.results[0];
    const r2 = snapshot.results[1];
    const r3 = snapshot.results[2];
    const validDigest = typeof snapshot.digest === 'string' && snapshot.digest.length === 64 && /^[0-9a-f]{64}$/.test(snapshot.digest);
    const pass = snapshot.results.length === 3 &&
      r1.rank === 1 && r2.rank === 1 && r3.rank === 3 &&
      validDigest && snapshot.publication_id.startsWith('pub-');
    record(
      'S2.4: Explicit allow_ties = true successfully publishes tied division with shared ranks and 64-char SHA-256 digest',
      pass,
      `r1_rank=${r1.rank}, r2_rank=${r2.rank}, r3_rank=${r3.rank}, digest=${snapshot.digest.substring(0, 16)}...`
    );
  }

  // 2.5 Publication Immutability: Recomputing SHA-256 Digest on Tampered Data Fails Verification
  {
    setupTestDivision([
      { name: 'Crew 1', score: 92.0 },
      { name: 'Crew 2', score: 88.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    // Canonical digest calculation as performed by publisher
    const canonicalData = JSON.stringify(pub.results.map(r => ({ crew_id: r.crew_id, final_score: r.final_score, rank: r.rank })));
    const computedDigest = crypto.createHash('sha256').update(canonicalData).digest('hex');
    assert.equal(pub.digest, computedDigest, 'Original published digest must match canonical recalculation');

    // Attack 1: Alter final_score by +0.01
    const tamperedScoreData = JSON.stringify(pub.results.map((r, i) => ({
      crew_id: r.crew_id,
      final_score: i === 0 ? r.final_score + 0.01 : r.final_score,
      rank: r.rank,
    })));
    const tamperedScoreDigest = crypto.createHash('sha256').update(tamperedScoreData).digest('hex');

    // Attack 2: Alter crew_id
    const tamperedCrewData = JSON.stringify(pub.results.map((r, i) => ({
      crew_id: i === 0 ? 'forged-crew-attacker' : r.crew_id,
      final_score: r.final_score,
      rank: r.rank,
    })));
    const tamperedCrewDigest = crypto.createHash('sha256').update(tamperedCrewData).digest('hex');

    // Attack 3: Alter rank
    const tamperedRankData = JSON.stringify(pub.results.map((r, i) => ({
      crew_id: r.crew_id,
      final_score: r.final_score,
      rank: i === 1 ? 1 : r.rank,
    })));
    const tamperedRankDigest = crypto.createHash('sha256').update(tamperedRankData).digest('hex');

    const pass = tamperedScoreDigest !== pub.digest &&
      tamperedCrewDigest !== pub.digest &&
      tamperedRankDigest !== pub.digest;
    record(
      'S2.5: Cryptographic avalanche effect: any mutation to score, crew, or rank alters SHA-256 digest',
      pass,
      `original=${pub.digest.substring(0, 12)}..., score_tampered=${tamperedScoreDigest.substring(0, 12)}...`
    );
  }

  // 2.6 Idempotent Re-Publication Invariant (Cryptographic Digest & Standings Consistency)
  {
    setupTestDivision([
      { name: 'Crew 1', score: 94.0 },
      { name: 'Crew 2', score: 89.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pubFirst = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    let allIdentical = true;
    for (let i = 0; i < 10; i++) {
      const pubSubsequent = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
      if (
        pubSubsequent.digest !== pubFirst.digest ||
        JSON.stringify(pubSubsequent.results) !== JSON.stringify(pubFirst.results)
      ) {
        allIdentical = false;
        break;
      }
    }
    record(
      'S2.6: Repeated publication invocations (10x) return identical idempotent SHA-256 digest and ranked results without drift',
      allIdentical,
      `idempotent_digest=${pubFirst.digest.substring(0, 16)}..., results_length=${pubFirst.results.length}`
    );
  }

  // 2.7 Mid-Field Tie Gate: Tied 2nd Place Fails Closed Without Approval Flag
  {
    setupTestDivision([
      { name: 'Winner Crew', score: 95.0 },
      { name: 'Tied Runner 1', score: 88.0 },
      { name: 'Tied Runner 2', score: 88.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    let threw = false;
    let errCode = null;
    try {
      harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', false);
    } catch (e) {
      threw = true;
      errCode = e.status;
    }
    const pass = threw && errCode === 409;
    record(
      'S2.7: Ties in runner-up positions (ranks 2, 2) fail closed with 409 Conflict without approved policy',
      pass,
      `status=${errCode}`
    );
  }

  // 2.8 Single-Crew Division Publishes Successfully Without Needing Tie Policy Flag
  {
    setupTestDivision([
      { name: 'Sole Competitor', score: 92.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const pass = pub.results.length === 1 && pub.results[0].rank === 1 && pub.digest.length === 64;
    record(
      'S2.8: Single crew division publishes cleanly without requiring tie policy override',
      pass,
      `rank=${pub.results[0].rank}, digest=${pub.digest.substring(0, 16)}...`
    );
  }

  // =========================================================================
  // SECTION 3: ZERO-PII PUBLIC RESULTS & ARENA HUD PROJECTIONS (F33 & F34)
  // =========================================================================
  console.log('\n[SECTION 3] Zero-PII Public Standings & Arena HUD Projection Invariants');

  // 3.1 Public Standings Projection Returns Clean Standings
  {
    setupTestDivision([
      { name: 'Royal Crew', city: 'Manila', score: 93.0 },
      { name: 'Ace Crew', city: 'Quezon City', score: 87.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const proj = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    const s1 = proj.standings[0];
    const s2 = proj.standings[1];
    const pass = proj.standings.length === 2 &&
      s1.rank === 1 && s1.crew_name === 'Royal Crew' && s1.city === 'Manila' && s1.final_score === 93.0 &&
      s2.rank === 2 && s2.crew_name === 'Ace Crew' && s2.city === 'Quezon City' && s2.final_score === 87.0;
    record(
      'S3.1: Public standings projection returns clean crew standings with rank, name, city, and final score',
      pass,
      `standings_count=${proj.standings.length}, winner="${s1.crew_name}"`
    );
  }

  // 3.2 Exhaustive Zero-PII Verification across Public Projection
  {
    setupTestDivision([
      { name: 'Secret Dancers Crew', score: 90.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const proj = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    const jsonStr = JSON.stringify(proj);

    const forbiddenFields = [
      'judge_uid',
      'staff-judge-1',
      'staff-judge-2',
      'staff-judge-3',
      'head_judge',
      'dancer_uid',
      'dancer-',
      'roster',
      'members',
      'is_minor',
      'consent_verified',
      'provider_reference',
      'paid_minor',
      'fee_minor',
      'amount_minor',
      'payment_id',
      'choreography',
      'musicality',
      'execution',
      'stage_presence',
      'entertainment',
    ];

    const leakedFields = forbiddenFields.filter(f => jsonStr.toLowerCase().includes(f.toLowerCase()));
    const pass = leakedFields.length === 0;
    record(
      'S3.2: Exhaustive Zero-PII audit confirms zero judge UIDs, dancer UIDs, rosters, payments, or raw criteria',
      pass,
      leakedFields.length === 0 ? 'Zero private/PII tokens detected' : `LEAKED: [${leakedFields.join(', ')}]`
    );
  }

  // 3.3 Querying Un-Published Division in Public Projection Returns 404
  {
    let threw = false;
    let errCode = null;
    try {
      harness.getPublicResultsProjection('manila-session-2027', 'un-published-div-xyz');
    } catch (e) {
      threw = true;
      errCode = e.status;
    }
    const pass = threw && errCode === 404;
    record(
      'S3.3: Querying un-published division in public results projection returns 404 NOT_FOUND',
      pass,
      `status=${errCode}`
    );
  }

  // 3.4 Arena Broadcast HUD Projection Integrity
  {
    setupTestDivision([
      { name: 'Arena Winner', city: 'Cebu City', score: 96.5 },
      { name: 'Arena Runner-up', city: 'Davao City', score: 91.0 },
    ]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    const pass = hud.digest === pub.digest &&
      hud.standings[0].rank === 1 &&
      hud.standings[0].crew_name === 'Arena Winner' &&
      hud.standings[0].final_score === 96.5 &&
      hud.standings[1].rank === 2;
    record(
      'S3.4: Arena Broadcast HUD returns identical verified standings and cryptographic digest',
      pass,
      `digest_match=${hud.digest === pub.digest}, top_rank=${hud.standings[0].rank}`
    );
  }

  // =========================================================================
  // SECTION 4: BRAND MARK SVG FILTER & DECORATIVE HERO VIDEO (F39 & F40)
  // =========================================================================
  console.log('\n[SECTION 4] Brand Mark SVG Filter & Hero Video Decorative Inert Verification');

  // 4.1 Theme Stylesheet Brand Mark Pure White Filter
  {
    const themeCssPath = path.join(projectRoot, 'apps/web/src/app/theme.css');
    const themeCss = fs.readFileSync(themeCssPath, 'utf8');
    const hasBrandMarkRule = themeCss.includes('html[data-theme="dark"] .brand-mark-white');
    const hasTransparentBg = themeCss.includes('background:transparent') || themeCss.includes('background: transparent');
    const hasInvertFilter = themeCss.includes('filter:brightness(0) invert(1)') || themeCss.includes('filter: brightness(0) invert(1)');

    const pass = hasBrandMarkRule && hasTransparentBg && hasInvertFilter;
    record(
      'S4.1: theme.css declares dark-mode pure white alpha geometry rule (background:transparent;filter:brightness(0) invert(1))',
      pass,
      `hasRule=${hasBrandMarkRule}, hasTransparent=${hasTransparentBg}, hasFilter=${hasInvertFilter}`
    );
  }

  // 4.2 Hero Motion Stylesheet Brand Mark Filter Alignment
  {
    const heroCssPath = path.join(projectRoot, 'apps/web/src/app/hero-motion.css');
    const heroCss = fs.readFileSync(heroCssPath, 'utf8');
    const hasBrandMarkWhite = heroCss.includes('html[data-theme="dark"] .brand-mark-white');
    const pass = hasBrandMarkWhite;
    record(
      'S4.2: hero-motion.css aligns with dark-mode white brand mark styling',
      pass,
      `hasBrandMarkWhite=${hasBrandMarkWhite}`
    );
  }

  // 4.3 Brand Mark SVG Geometry & Fill Validation
  {
    const validWhiteSvg = '<svg viewBox="0 0 100 100"><rect fill="none" width="100" height="100"/><path fill="#ffffff" d="M10 10h80v80H10z"/></svg>';
    const validCurrentColorSvg = '<svg viewBox="0 0 100 100"><path fill="currentColor" d="M10 10h80v80H10z"/></svg>';
    const invalidColorSvg = '<svg viewBox="0 0 100 100"><path fill="#ff0055" d="M10 10h80v80H10z"/></svg>';

    const c1 = harness.validateBrandMark(validWhiteSvg);
    const c2 = harness.validateBrandMark(validCurrentColorSvg);
    const c3 = harness.validateBrandMark(invalidColorSvg);

    const pass = c1.compliant === true && c2.compliant === true && c3.compliant === false;
    record(
      'S4.3: Brand mark validator accepts pure white (#ffffff, currentColor, none) and rejects colored fills',
      pass,
      `white_compliant=${c1.compliant}, currentColor_compliant=${c2.compliant}, colored_rejected=${!c3.compliant}`
    );
  }

  // 4.4 Hero Video Decorative Inert & Accessibility Contract
  {
    const heroTsxPath = path.join(projectRoot, 'apps/web/src/components/hero-highlights.tsx');
    const heroTsx = fs.readFileSync(heroTsxPath, 'utf8');

    // 1. Iframe inert styling and pointer-events: none in CSS
    const heroCssPath = path.join(projectRoot, 'apps/web/src/app/hero-motion.css');
    const heroCss = fs.readFileSync(heroCssPath, 'utf8');
    const hasPointerEventsNone = heroCss.includes('.hero-player iframe{pointer-events:none!important}');
    const hasVideoSurface = heroCss.includes('.hero-video-surface');

    // 2. Muted playback & aria-hidden in component
    const hasMuteCall = heroTsx.includes('target.mute()');
    const hasPlayerMuteVar = heroTsx.includes('mute:1') || heroTsx.includes('mute: 1');
    const hasPlaysinlineVar = heroTsx.includes('playsinline:1') || heroTsx.includes('playsinline: 1');
    const hasAriaHidden = heroTsx.includes('aria-hidden="true"');
    const hasTabIndexMinus1 = heroTsx.includes('setAttribute("tabindex","-1")') || heroTsx.includes('setAttribute("tabindex", "-1")');

    // 3. Motion safety and data-saver static fallback
    const hasReducedMotionCheck = heroTsx.includes('prefers-reduced-motion: reduce');
    const hasSaveDataCheck = heroTsx.includes('saveData');
    const hasPosterFallback = heroTsx.includes('highlights-poster');

    const pass = hasPointerEventsNone && hasVideoSurface &&
      hasMuteCall && (hasPlayerMuteVar || hasPlaysinlineVar) &&
      hasAriaHidden && hasTabIndexMinus1 &&
      hasReducedMotionCheck && hasSaveDataCheck && hasPosterFallback;

    record(
      'S4.4: Hero video enforces inert, muted, pointer-events:none, tabindex:-1, aria-hidden, reduced-motion & poster fallback',
      pass,
      `pointerEventsNone=${hasPointerEventsNone}, muted=${hasMuteCall}, ariaHidden=${hasAriaHidden}, motionFallback=${hasReducedMotionCheck}`
    );
  }

  // =========================================================================
  // SECTION 5: LIVE RUST AXUM API SERVER INTEGRATION & ATTACK MATRIX
  // =========================================================================
  console.log('\n[SECTION 5] Live Rust Axum API Server Empirical Attack Matrix');
  const PORT = 8097;
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  const exePath = path.join(projectRoot, 'target', 'debug', 'wsb-api.exe');

  console.log(`Spawning ${exePath} on port ${PORT}...`);
  const serverProcess = spawn(exePath, [], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      WSB_STORAGE: 'memory',
      FIREBASE_PROJECT_ID: 'demo-wsb',
    },
    stdio: 'ignore',
  });

  try {
    let online = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch(`${BASE_URL}/readyz`);
        if (res.status === 503) { // /readyz returns 503 synthetic-only
          online = true;
          break;
        }
      } catch {}
    }

    if (!online) {
      throw new Error(`Rust Axum API failed to respond on port ${PORT}`);
    }
    console.log(`Live Rust Axum API server is responsive at ${BASE_URL}\n`);

    // 5.1 Unauthenticated POST /publish Returns 401 Unauthorized + Cache-Control: no-store
    {
      const res = await fetch(`${BASE_URL}/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/publish`, {
        method: 'POST',
      });
      const cc = res.headers.get('cache-control');
      const pass = res.status === 401 && cc === 'no-store';
      record(
        'S5.1: Unauthenticated POST /publish fails closed with 401 Unauthorized and Cache-Control: no-store',
        pass,
        `status=${res.status}, cache-control="${cc}"`
      );
    }

    // 5.2 Forged Bearer Token on POST /publish Returns 401 Unauthorized
    {
      const res = await fetch(`${BASE_URL}/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/publish`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid.forged.signature',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allow_ties: true }),
      });
      const pass = res.status === 401;
      record(
        'S5.2: Forged/unsigned Bearer token on POST /publish fails closed with 401 Unauthorized',
        pass,
        `status=${res.status}`
      );
    }

    // 5.3 Cross-Chapter Attack: Token from HK Chapter Attempting PH Publication Returns 401/403
    {
      const res = await fetch(`${BASE_URL}/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/publish`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJhdHRhY2tlciIsImNoYXB0ZXJfaWQiOiJoayIsInJvbGUiOiJoZWFkX2p1ZGdlIn0.',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allow_ties: true }),
      });
      const pass = res.status === 401 || res.status === 403;
      record(
        'S5.3: Cross-chapter forged token attempting division publication rejected with 401/403',
        pass,
        `status=${res.status}`
      );
    }

    // 5.4 Live Public Standings Projection Endpoint (Zero Auth Required, 200 OK)
    {
      const res = await fetch(`${BASE_URL}/v1/events/manila-session-2027/published`);
      const pass = res.status === 200;
      const text = await res.text();
      const noPii = !text.includes('judge_uid') && !text.includes('dancer_uid') && !text.includes('roster');
      record(
        'S5.4: Live public standings route GET /v1/events/manila-session-2027/published is public (200 OK) with zero PII',
        pass && noPii,
        `status=${res.status}, no_pii=${noPii}`
      );
    }

    // 5.5 Live Non-Existent Division Public Lookup Returns 404
    {
      const res = await fetch(`${BASE_URL}/v1/events/manila-session-2027/divisions/ghost-division-xyz/published`);
      const pass = res.status === 404;
      record(
        'S5.5: Live public query for un-published division returns 404 NOT_FOUND',
        pass,
        `status=${res.status}`
      );
    }

    // 5.6 Universal Cache-Control: no-store Verification Across Private Endpoints
    {
      const resResults = await fetch(`${BASE_URL}/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/results`);
      const cc = resResults.headers.get('cache-control');
      const pass = cc === 'no-store';
      record(
        'S5.6: Private results endpoints strictly include "Cache-Control: no-store"',
        pass,
        `cache-control="${cc}"`
      );
    }

    // 5.7 Sandbox Release Gate: /readyz Returns 503 Service Unavailable (Synthetic-Only)
    {
      const res = await fetch(`${BASE_URL}/readyz`);
      const cc = res.headers.get('cache-control');
      const json = await res.json();
      const pass = res.status === 503 && cc === 'no-store' && json.release_ready === false;
      record(
        'S5.7: Synthetic sandbox release gate /readyz strictly returns 503 Service Unavailable with release_ready: false',
        pass,
        `status=${res.status}, release_ready=${json.release_ready}`
      );
    }

    // 5.8 Private Division Results Route Rejects Unauthenticated Call with 401 Unauthorized
    {
      const res = await fetch(`${BASE_URL}/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/results`);
      const pass = res.status === 401;
      record(
        'S5.8: Unauthenticated access to private results route GET /divisions/{div}/results rejected with 401 Unauthorized',
        pass,
        `status=${res.status}`
      );
    }

  } finally {
    console.log('\nShutting down live Rust Axum server process...');
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        serverProcess.kill();
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('  MILESTONE 5 ADVERSARIAL CHALLENGE EXECUTION SUMMARY');
  console.log('='.repeat(80));
  const failed = results.filter(r => !r.passed);
  console.log(`Total Attack Scenarios: ${results.length}`);
  console.log(`Passed (Repelled):       ${results.length - failed.length}`);
  console.log(`Failed (Vulnerabilities): ${failed.length}`);
  console.log('='.repeat(80));

  if (failed.length > 0) {
    console.error('\nVULNERABILITIES CONFIRMED:');
    for (const f of failed) {
      console.error(`  - ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL ADVERSARIAL ATTACKS REPELLED CLEANLY! Deterministic exit code: 0\n');
    process.exit(0);
  }
}

runAdversarialM5Suite().catch((err) => {
  console.error('Fatal adversarial runner error:', err);
  process.exit(1);
});
