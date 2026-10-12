// Backup guard: exact round-trip, and a bad paste is refused rather than half-applied.
require('./register-ts.js');
const assert = require('node:assert');
const B = require('../src/engine/backup.ts');

const state = {
  subjects: [{ id: 's', name: 'Stats' }], tasks: [{ id: 't' }], exams: [], study: [], cards: [],
  assessments: [{ id: 'a', weight: 25 }], topics: [{ id: 'p' }], errors: [],
  gradeTargets: { s: 92 }, dayLogs: { '2026-10-12': { date: '2026-10-12', sleepHours: 7 } }, focusLog: { '2026-10-12': 50 },
  lang: 'ar', appearance: 'dark', xp: 400, // device-only state that must NOT travel
};

// ── Round-trip: everything academic survives, device settings do not ─────────────────────────────
{
  const b = B.exportBackup(state, '2026-10-12T10:00:00Z');
  assert.equal(b.tag, 'nazzim-backup');
  assert.equal(b.version, B.BACKUP_VERSION);
  assert.deepEqual(b.data.subjects, state.subjects);
  assert.deepEqual(b.data.gradeTargets, { s: 92 });
  for (const k of ['lang', 'appearance', 'xp']) assert.equal(k in b.data, false, `${k} must stay on the device`);

  const parsed = B.parseBackup(JSON.stringify(b));
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.backup.data, b.data, 'exact round-trip');
  assert.equal(parsed.records, 1 + 1 + 1 + 1 + 1 + 1 + 1, 'counts every record across arrays and maps');
}

// ── Bad input is refused with a reason, never partially accepted ─────────────────────────────────
{
  assert.deepEqual(B.parseBackup('not json'), { ok: false, reason: 'json' });
  assert.deepEqual(B.parseBackup('"a string"'), { ok: false, reason: 'shape' });
  assert.deepEqual(B.parseBackup(JSON.stringify({ tag: 'something-else', version: 1, data: {} })), { ok: false, reason: 'tag' });
  assert.deepEqual(B.parseBackup(JSON.stringify({ tag: 'nazzim-backup', version: 99, data: {} })), { ok: false, reason: 'version' });
  assert.deepEqual(B.parseBackup(JSON.stringify({ tag: 'nazzim-backup', version: 1 })), { ok: false, reason: 'shape' });
  // Right tag, wrong container types: an array where a map belongs, and vice versa.
  assert.deepEqual(B.parseBackup(JSON.stringify({ tag: 'nazzim-backup', version: 1, data: { subjects: {} } })), { ok: false, reason: 'shape' });
  assert.deepEqual(B.parseBackup(JSON.stringify({ tag: 'nazzim-backup', version: 1, data: { gradeTargets: [] } })), { ok: false, reason: 'shape' });
}

// ── An older backup is accepted; an empty one is valid and simply empty ──────────────────────────
{
  const old = B.parseBackup(JSON.stringify({ tag: 'nazzim-backup', version: 1, data: { subjects: [] } }));
  assert.ok(old.ok);
  assert.equal(old.records, 0);
  assert.equal(B.countRecords({}), 0);
}

console.log('all backup checks passed');
