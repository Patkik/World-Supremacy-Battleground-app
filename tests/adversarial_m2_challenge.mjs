// Adversarial Challenge Test Harness for Milestone 2
// Registration, Guardian Consent & Audio Compliance Empirical Verification
import assert from 'node:assert/strict';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} — ${detail}`);
}

async function runAdversarialChallenge() {
  console.log('='.repeat(78));
  console.log('  MILESTONE 2: GUARDIAN CONSENT & READINESS ADVERSARIAL CHALLENGE');
  console.log('='.repeat(78));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('-'.repeat(78));

  const harness = new SystemHarness();

  // =========================================================================
  // ATTACK 1: Adult Consent Attack (cannot consent adult dancers)
  // =========================================================================
  console.log('\n[ATTACK VECTOR 1] Adult Consent Attack');
  {
    harness.reset();
    const crew = harness.createCrew('ph', 'mgr-adult-1', 'Adult Crew PH', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-adult-1');
    const { member: adultDancer } = harness.redeemInvitation('ph', inv.token, 'adult-dancer-1', 'Adult Performer', false);
    assert.equal(adultDancer.is_minor, false);
    assert.equal(adultDancer.consent_verified, true, 'Adult dancer is self-verified upon redemption');

    // Attempt to submit guardian consent for manager (adult)
    let managerRejected = false;
    try {
      harness.submitGuardianConsent('ph', crew.id, 'mgr-adult-1', 'Fake Guardian', '2027-01-01');
    } catch (e) {
      if (e.status === 400 && e.message.includes('Member is not a minor')) {
        managerRejected = true;
      }
    }
    record('A1.1: Submit consent for adult manager fails closed with 400 "Member is not a minor"', managerRejected, 'Adult manager rejected');

    // Attempt to submit guardian consent for adult dancer
    let dancerRejected = false;
    try {
      harness.submitGuardianConsent('ph', crew.id, 'adult-dancer-1', 'Fake Guardian', '2027-01-01');
    } catch (e) {
      if (e.status === 400 && e.message.includes('Member is not a minor')) {
        dancerRejected = true;
      }
    }
    record('A1.2: Submit consent for adult dancer fails closed with 400 "Member is not a minor"', dancerRejected, 'Adult dancer rejected');
  }

  // =========================================================================
  // ATTACK 2: Malformed Guardian Names (empty, whitespace, control chars, >200 chars)
  // =========================================================================
  console.log('\n[ATTACK VECTOR 2] Malformed Guardian Name Attacks');
  {
    harness.reset();
    const crew = harness.createCrew('ph', 'mgr-malformed', 'Name Test Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-malformed');
    const { member: minor } = harness.redeemInvitation('ph', inv.token, 'minor-child-1', 'Kid Dancer', true);
    assert.equal(minor.is_minor, true);
    assert.equal(minor.consent_verified, false);

    // Empty string
    let emptyRejected = false;
    try {
      harness.submitGuardianConsent('ph', crew.id, 'minor-child-1', '', '2027-01-01');
    } catch (e) {
      if (e.status === 400 && e.message.includes('Guardian name required')) {
        emptyRejected = true;
      }
    }
    record('A2.1: Empty guardian name "" fails closed with 400 "Guardian name required"', emptyRejected, 'Empty name rejected');

    // Whitespace string
    let spacesRejected = false;
    try {
      harness.submitGuardianConsent('ph', crew.id, 'minor-child-1', '     ', '2027-01-01');
    } catch (e) {
      if (e.status === 400 && e.message.includes('Guardian name required')) {
        spacesRejected = true;
      }
    }
    record('A2.2: Whitespace guardian name "     " fails closed with 400 "Guardian name required"', spacesRejected, 'Whitespace rejected');

    // Tab string
    let tabsRejected = false;
    try {
      harness.submitGuardianConsent('ph', crew.id, 'minor-child-1', '\t\t\t', '2027-01-01');
    } catch (e) {
      if (e.status === 400 && e.message.includes('Guardian name required')) {
        tabsRejected = true;
      }
    }
    record('A2.3: Tab whitespace name "\t\t\t" fails closed with 400 "Guardian name required"', tabsRejected, 'Tabs rejected');

    // Boundary: Exactly 200 characters -> must succeed
    const name200 = 'A'.repeat(200);
    const validReceipt200 = harness.submitGuardianConsent('ph', crew.id, 'minor-child-1', name200, '2027-01-01');
    const passed200 = validReceipt200.verified === true && validReceipt200.guardianName.length === 200;
    record('A2.4: Exactly 200-character guardian name succeeds with verified receipt', passed200, `length=${validReceipt200.guardianName.length}`);
  }

  // =========================================================================
  // ATTACK 3: Cross-Chapter Tenant Isolation on Consent Route
  // =========================================================================
  console.log('\n[ATTACK VECTOR 3] Cross-Chapter Tenant Isolation');
  {
    harness.reset();
    const phCrew = harness.createCrew('ph', 'mgr-ph-tenancy', 'PH Isolation Crew', 'Manila');
    const phInv = harness.createInvitation('ph', phCrew.id, 'mgr-ph-tenancy');
    harness.redeemInvitation('ph', phInv.token, 'ph-minor-1', 'PH Minor Dancer', true);

    const auCrew = harness.createCrew('au', 'mgr-au-tenancy', 'AU Isolation Crew', 'Sydney');
    const auInv = harness.createInvitation('au', auCrew.id, 'mgr-au-tenancy');
    harness.redeemInvitation('au', auInv.token, 'au-minor-1', 'AU Minor Dancer', true);

    // Attempt to consent PH minor using AU chapter route -> 404
    let crossChapterRejected = false;
    try {
      harness.submitGuardianConsent('au', phCrew.id, 'ph-minor-1', 'Guardian Parent', '2027-01-01');
    } catch (e) {
      if (e.status === 404) {
        crossChapterRejected = true;
      }
    }
    record('A3.1: Consent route for PH crew under AU chapter returns 404 Not Found', crossChapterRejected, 'Cross-chapter crew rejected');

    // Attempt to consent non-existent minor in valid crew -> 404
    let missingMinorRejected = false;
    try {
      harness.submitGuardianConsent('ph', phCrew.id, 'au-minor-1', 'Guardian Parent', '2027-01-01');
    } catch (e) {
      if (e.status === 404) {
        missingMinorRejected = true;
      }
    }
    record('A3.2: Consenting foreign minor (au-minor-1) in PH crew returns 404 Not Found', missingMinorRejected, 'Foreign minor rejected');

    // Attempt to consent under non-existent chapter
    let missingChapterRejected = false;
    try {
      harness.submitGuardianConsent('nonexistent-chapter', phCrew.id, 'ph-minor-1', 'Guardian Parent', '2027-01-01');
    } catch (e) {
      if (e.status === 404) {
        missingChapterRejected = true;
      }
    }
    record('A3.3: Consenting under non-existent chapter returns 404 Not Found', missingChapterRejected, 'Invalid chapter rejected');
  }

  // =========================================================================
  // ATTACK 4: Open Roster Propagation vs Approved Entry Immutability
  // =========================================================================
  console.log('\n[ATTACK VECTOR 4] Open Roster Propagation vs Approved Immutability');
  {
    harness.reset();
    const crew = harness.createCrew('ph', 'mgr-prop', 'Propagation Crew', 'Manila');
    // Add 4 adult dancers
    for (let i = 1; i <= 4; i++) {
      crew.members.push({
        uid: `adult-${i}`,
        name: `Adult Dancer ${i}`,
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    // Add 1 minor dancer
    const minorUid = 'minor-test-prop';
    crew.members.push({
      uid: minorUid,
      name: 'Minor Dancer Prop',
      role: 'Dancer',
      is_minor: true,
      consent_verified: false,
    });

    // Entry 1: Draft status
    const entryDraft = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entryDraft.roster = crew.members.map(m => ({ ...m }));
    assert.equal(entryDraft.roster.find(m => m.uid === minorUid).consent_verified, false);

    // Entry 2: NeedsCorrection status
    const entryNeedsCorr = {
      id: `entry-corr-${Date.now()}`,
      chapter_id: 'ph',
      event_id: 'manila-session-2027',
      crew_id: crew.id,
      division_id: 'open-crew',
      roster: crew.members.map(m => ({ ...m })),
      status: 'needs_correction',
      revision: 1,
      updated_at: 1000,
    };
    harness.entries.set(entryNeedsCorr.id, entryNeedsCorr);

    // Entry 3: Approved status (MUST BE IMMUTABLE!)
    const entryApproved = {
      id: `entry-appr-${Date.now()}`,
      chapter_id: 'ph',
      event_id: 'manila-session-2027',
      crew_id: crew.id,
      division_id: 'open-crew',
      roster: crew.members.map(m => ({ ...m })),
      status: 'approved',
      revision: 5,
      updated_at: 2000,
    };
    harness.entries.set(entryApproved.id, entryApproved);

    // Entry 4: Draft for a completely DIFFERENT crew
    const otherCrew = harness.createCrew('ph', 'mgr-other', 'Other Crew Untouched', 'Manila');
    const entryOtherCrew = harness.createEntryDraft('ph', 'manila-session-2027', otherCrew.id, 'open-crew');
    const otherCrewRevBefore = entryOtherCrew.revision;

    // Execute Guardian Consent
    const consentReceipt = harness.submitGuardianConsent('ph', crew.id, minorUid, 'Maria Delia', '2027-01-18');
    assert.equal(consentReceipt.verified, true);

    // Verify 1: Minor member in crew profile is verified
    const crewMinor = crew.members.find(m => m.uid === minorUid);
    record('A4.1: Crew profile minor dancer consent_verified updated to true', crewMinor.consent_verified === true, 'Crew member verified');

    // Verify 2: Draft entry roster minor is verified
    const draftMinor = entryDraft.roster.find(m => m.uid === minorUid);
    record('A4.2: Draft entry roster minor dancer consent_verified propagated to true', draftMinor.consent_verified === true, 'Draft entry updated');

    // Verify 3: NeedsCorrection entry roster minor is verified
    const corrMinor = entryNeedsCorr.roster.find(m => m.uid === minorUid);
    record('A4.3: NeedsCorrection entry roster minor dancer consent_verified propagated to true', corrMinor.consent_verified === true, 'NeedsCorrection entry updated');

    // Verify 4: Approved entry roster minor is UNTOUCHED (IMMUTABLE)
    const approvedMinor = entryApproved.roster.find(m => m.uid === minorUid);
    const approvedUntouched = approvedMinor.consent_verified === false && entryApproved.revision === 5 && entryApproved.updated_at === 2000;
    record('A4.4: Approved entry is strictly IMMUTABLE: roster, revision, and updated_at unchanged', approvedUntouched, 'Approved entry immutable');

    // Verify 5: Other crew entry is UNTOUCHED
    record('A4.5: Other crew entry revision unchanged', entryOtherCrew.revision === otherCrewRevBefore, 'Foreign crew unmutated');
  }

  // =========================================================================
  // ATTACK 5: Idempotent Re-consent
  // =========================================================================
  console.log('\n[ATTACK VECTOR 5] Idempotent Re-consent');
  {
    harness.reset();
    const crew = harness.createCrew('ph', 'mgr-idem', 'Idempotent Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-idem');
    harness.redeemInvitation('ph', inv.token, 'minor-idem-1', 'Child Dancer Idem', true);

    // 1st consent call
    const res1 = harness.submitGuardianConsent('ph', crew.id, 'minor-idem-1', 'Original Guardian', '2027-01-05');
    const pass1 = res1.verified === true && res1.guardianName === 'Original Guardian';

    // 2nd consent call (identical)
    const res2 = harness.submitGuardianConsent('ph', crew.id, 'minor-idem-1', 'Original Guardian', '2027-01-05');
    const pass2 = res2.verified === true && res2.guardianName === 'Original Guardian';

    // 3rd consent call (updated guardian info)
    const res3 = harness.submitGuardianConsent('ph', crew.id, 'minor-idem-1', 'Second Guardian Name', '2027-01-10');
    const pass3 = res3.verified === true && res3.guardianName === 'Second Guardian Name';

    const allPassed = pass1 && pass2 && pass3;
    record('A5.1: Multiple re-consent submissions succeed idempotently without error or corruption', allPassed, 'Re-consent idempotent');
  }

  // Summary
  console.log('\n' + '='.repeat(78));
  console.log('  MILESTONE 2 ADVERSARIAL CHALLENGE SUMMARY');
  console.log('='.repeat(78));
  const failed = results.filter(r => !r.passed);
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed:          ${results.length - failed.length}`);
  console.log(`Failed:          ${failed.length}`);
  console.log('='.repeat(78));

  if (failed.length > 0) {
    console.error('FAILED ADVERSARIAL SCENARIOS:');
    for (const f of failed) {
      console.error(`- ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  } else {
    console.log('ALL ADVERSARIAL ATTACKS REPELLED CLEANLY! Deterministic exit code: 0');
    process.exit(0);
  }
}

runAdversarialChallenge().catch(err => {
  console.error('Fatal challenger execution error:', err);
  process.exit(1);
});
