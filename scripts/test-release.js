// Release guards: fails the build if the app config would be rejected at review, or points at the wrong backend.
// Run: npm test  (and in CI before `eas build --profile production`)
require('./register-ts');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const app = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8')).expo;
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const eas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'eas.json'), 'utf8'));

// ── Store identity: both stores reject a build without a stable, reverse-DNS id ──
const ID = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
assert(ID.test(app.ios?.bundleIdentifier ?? ''), 'ios.bundleIdentifier must be reverse-DNS, e.g. com.nazzim.app');
assert(ID.test(app.android?.package ?? ''), 'android.package must be reverse-DNS');
assert(app.version && /^\d+\.\d+\.\d+$/.test(app.version), 'expo.version must be semver');
assert(Number.isInteger(app.android?.versionCode), 'android.versionCode must be an integer');

// ── Permissions: every iOS permission the app can trigger needs a purpose string ──
assert(app.ios?.infoPlist?.NSUserNotificationsUsageDescription, 'Missing NSUserNotificationsUsageDescription');
assert(
  (app.ios.infoPlist.NSUserNotificationsUsageDescription || '').length > 40,
  'Permission description must explain *why*, not just restate the permission',
);
// Nazzim asks for notifications only. Anything else here is an unnecessary permission that invites rejection.
const allowed = new Set(['VIBRATE', 'POST_NOTIFICATIONS', 'RECEIVE_BOOT_COMPLETED', 'SCHEDULE_EXACT_ALARM']);
for (const perm of app.android?.permissions ?? []) {
  assert(allowed.has(perm), `Unexpected Android permission: ${perm}. Remove it or justify it in the Data Safety form.`);
}

// ── Legal: both stores require a reachable privacy policy for an app with accounts ──
for (const key of ['privacyPolicyUrl', 'termsUrl', 'supportUrl']) {
  const url = app.extra?.[key];
  assert(url && /^https:\/\//.test(url), `expo.extra.${key} must be an https URL`);
}

// ── Build profiles: production must not reuse the dev channel ──
const profiles = eas.build ?? {};
for (const name of ['development', 'preview', 'production']) {
  assert(profiles[name], `eas.json is missing the "${name}" build profile`);
}
assert(profiles.production.channel !== profiles.development.channel, 'production and development must use different update channels');

// ── Secrets: nothing but the publishable key may be bundled ──
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  assert(!/service_role/i.test(env), '.env contains a service-role key; it must never reach the client');
  assert(!/SUPABASE_SERVICE/i.test(env), '.env contains a service key; move it to Supabase Edge Function secrets');
  for (const line of env.split('\n')) {
    const name = line.split('=')[0].trim();
    if (!name || name.startsWith('#')) continue;
    assert(name.startsWith('EXPO_PUBLIC_'), `.env var "${name}" is bundled into the client; only EXPO_PUBLIC_* values may ship`);
  }
}

// ── No dev endpoints in any shipped source ──
const srcDir = path.join(__dirname, '..', 'src');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(f =>
  f.isDirectory() ? walk(path.join(d, f.name)) : [path.join(d, f.name)]);
for (const file of walk(srcDir).filter(f => /\.tsx?$/.test(f))) {
  const body = fs.readFileSync(file, 'utf8');
  const rel = path.relative(srcDir, file);
  assert(!/https?:\/\/localhost|https?:\/\/127\.0\.0\.1|ngrok\.io/.test(body), `${rel} references a development URL`);
  // console.* is allowed only behind an isDev / __DEV__ guard.
  for (const [i, line] of body.split('\n').entries()) {
    if (/console\.(log|debug|info|warn)\(/.test(line) && !/isDev|__DEV__/.test(line)) {
      assert.fail(`${rel}:${i + 1} has an ungated console statement`);
    }
  }
}

// ── Version strategy: package.json and app.json must agree ──
assert.equal(pkg.version ?? app.version, app.version, 'package.json and app.json versions disagree');

console.log('all release guards passed');
