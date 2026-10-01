// Checks for the sync core (pure, no network). Run: npm test
require('./register-ts');
const assert = require('assert');
const S = require('../src/services/sync/core.ts');

const sub = (id, name) => ({ id, name, color: 'indigo', icon: 'book', targetGrade: 'A' });
const task = (id, done = false) => ({ id, title: id, due: '2026-10-02', estimateMin: 30, done });
const local = { subjects: [sub('s1', 'Stats'), sub('s2', 'Calc')], tasks: [task('t1')], exams: [], study: [], cards: [], focusLog: { '2026-10-01': 25 } };

// 1. First sync pushes everything.
let snap = S.emptySnapshot();
let push = S.diffForPush(local, snap);
assert.equal(push.upserts.subjects.length, 2); assert.equal(push.upserts.tasks.length, 1); assert.equal(push.focus.length, 1);
snap = S.afterPush(snap, push);
// 2. Nothing changed → empty push.
assert(S.isEmptyPush(S.diffForPush(local, snap)));
// 3. Edit one, delete one → one upsert, one delete.
const edited = { ...local, subjects: [sub('s1', 'Statistics')], tasks: [task('t1', true)] };
push = S.diffForPush(edited, snap);
assert.deepEqual(push.upserts.subjects.map(r => r.data.name), ['Statistics']);
assert.deepEqual(push.deletes.subjects, ['s2']); assert.equal(push.upserts.tasks.length, 1);
snap = S.afterPush(snap, push);
assert(!('s2' in snap.subjects));

// 4. Pull from another device: new subject, server deletes t1, newer focus minutes.
const rows = {
  subjects: [{ id: 's3', data: sub('s3', 'Physics'), deleted: false, updated_at: '2026-10-01T10:00:00Z' }],
  tasks: [{ id: 't1', data: {}, deleted: true, updated_at: '2026-10-01T10:00:01Z' }],
  exams: [], study_sessions: [],
};
const focus = [{ day: '2026-10-01', minutes: 40, updated_at: '2026-10-01T10:00:02Z' }, { day: '2026-09-30', minutes: 15, updated_at: '2026-10-01T09:00:00Z' }];
const r = S.applyPull(edited, snap, rows, focus);
assert(r.changed);
assert.deepEqual(r.local.subjects.map(s => s.id).sort(), ['s1', 's3']);
assert.equal(r.local.tasks.length, 0);
assert.equal(r.local.focusLog['2026-10-01'], 40); assert.equal(r.local.focusLog['2026-09-30'], 15);
// Pulled rows are in the snapshot, so they are not pushed back.
assert(S.isEmptyPush(S.diffForPush(r.local, r.snap)));
// 5. Focus never goes down when the server has less than this device.
const r2 = S.applyPull({ ...r.local, focusLog: { '2026-10-01': 90 } }, r.snap, { subjects: [], tasks: [], exams: [], study_sessions: [], cards: [] }, [{ day: '2026-10-01', minutes: 40, updated_at: 'x' }]);
assert.equal(r2.local.focusLog['2026-10-01'], 90);
// 6. Re-applying the same pull is a no-op (overlapping cursor is safe).
assert(!S.applyPull(r.local, r.snap, rows, focus).changed);
// 7. Cursor = newest server timestamp.
assert.equal(S.nextCursor(null, rows, focus), '2026-10-01T10:00:02Z');
assert.equal(S.nextCursor('2026-12-01T00:00:00Z', rows, focus), '2026-12-01T00:00:00Z');

console.log('all sync checks passed');
