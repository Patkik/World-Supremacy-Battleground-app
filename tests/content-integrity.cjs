// Server-rendered smoke checks for misleading sample state. This is not a browser test.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const settings = readFileSync('.env.docker', 'utf8');
const port = settings.match(/^WSB_WEB_PORT=(\d+)\s*$/m)?.[1] || '3100';
const base = `http://127.0.0.1:${port}`;
const checks = [
  ['/app/notifications', 'Notifications', ['Guardian Consent Verified', 'Payment Reconciled']],
  ['/app/passes', 'not connected yet', ['Verified &amp; Issued', 'PASS-2027-014-01']],
  ['/app/tickets', 'not connected yet', ['TKT-2027-MNL-001', 'Active &amp; Valid']],
  ['/app/privacy', 'not connected here yet', ['download link for your data archive', 'All requests fulfilled']],
  ['/app/advancement', 'not connected yet', ['INV-WORLDS-2027-014', 'Seed confirmed']],
  ['/app/scorecards', 'Your published results', ['sc-manila-2027', '88.33']],
  ['/app/event-day/local-rehearsal', 'Event day', ['Report to Stage Left Wings', '12 / 12 In Venue']],
  ['/policies/guardian', 'Policy not published here yet', ['WSB-POL-2027.1', 'No minor may perform']],
  ['/help/registration', 'Guidance is being prepared', ['Official guidance on competition entry']],
  ['/results', 'Published results', ['Afterhours Collective', 'Official Published']],
  ['/stories', 'No stories published here yet', ['The Anatomy of 88.33']],
  ['/stories/example', 'Story not published here', ['Afterhours Collective']],
  ['/media', 'not published in this system yet', ['Wins Manila Session 2027']],
];
async function main() {
  for (const [path, expected, forbidden] of checks) {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes(expected), `${path} missing expected state`);
    for (const phrase of forbidden) assert.ok(!html.includes(phrase), `${path} contains sample state`);
  }
  console.log('PASS: participant and public pages do not render the removed sample claims (server response only).');
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
