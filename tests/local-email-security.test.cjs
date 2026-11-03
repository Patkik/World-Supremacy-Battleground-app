const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "apps", "web", "src");
const { localEmailOrigin } = require(path.join(root, "lib", "local-email-origin.ts"));
const { buildPasswordResetEmailHtml } = require(path.join(root, "lib", "email.ts"));

test("emulator account links use only a valid configured origin", () => {
  assert.equal(localEmailOrigin(undefined), "http://localhost:3100");
  assert.equal(localEmailOrigin("https://rehearsal.example.test/"), "https://rehearsal.example.test");
  for (const invalid of ["javascript:alert(1)", "https://user:pass@example.test", "https://example.test/path", "https://example.test/?token=x", "https://example.test/#x"]) {
    assert.equal(localEmailOrigin(invalid), null);
  }
  for (const route of ["send-reset-email", "send-verification-email"]) {
    const source = fs.readFileSync(path.join(root, "app", "api", "auth", route, "route.ts"), "utf8");
    assert.match(source, /localEmailOrigin\(process\.env\.WEB_ORIGIN\)/);
    assert.doesNotMatch(source, /req\.headers\.get\(["'](?:host|origin|x-forwarded-host|x-forwarded-proto)["']\)/i);
  }
});

test("password reset HTML escapes email and link text and attributes", () => {
  const html = buildPasswordResetEmailHtml('https://example.test/?a=1&b="x"', '<img src=x onerror="alert(1)">');
  assert.ok(!html.includes('<img src=x onerror="alert(1)">'));
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /a=1&amp;b=&quot;x&quot;/);
});
