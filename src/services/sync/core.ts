// Sync core: pure functions, no network. Local state is the source of truth while offline; the server keeps
// one JSON document per entity, stamped with server time. A sync is: push local changes (diff against the last
// synced snapshot), then pull rows changed on the server since the last cursor. Same id → last write wins.
import type { Exam, Subject, Task } from '../../domain/types';
import type { StudySession } from '../../lib/exams';

export const COLLECTIONS = ['subjects', 'tasks', 'exams', 'study_sessions'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export type LocalAcademic = {
  subjects: Subject[]; tasks: Task[]; exams: Exam[]; study: StudySession[]; focusLog: Record<string, number>;
};
export type RemoteRow = { id: string; data: unknown; deleted: boolean; updated_at: string };
export type RemoteFocus = { day: string; minutes: number; updated_at: string };

// What was last agreed with the server: id → JSON text, per collection; and minutes per focus day.
export type Snapshot = Record<Collection, Record<string, string>> & { focus: Record<string, number> };
export const emptySnapshot = (): Snapshot => ({ subjects: {}, tasks: {}, exams: {}, study_sessions: {}, focus: {} });

const listOf = (s: LocalAcademic, c: Collection): { id: string }[] =>
  c === 'study_sessions' ? s.study : (s[c] as { id: string }[]);

export type Push = {
  upserts: Record<Collection, { id: string; data: unknown }[]>;
  deletes: Record<Collection, string[]>;
  focus: { day: string; minutes: number }[];
};

export function diffForPush(local: LocalAcademic, snap: Snapshot): Push {
  const upserts = {} as Push['upserts'], deletes = {} as Push['deletes'];
  for (const c of COLLECTIONS) {
    const rows = listOf(local, c);
    const ids = new Set(rows.map(r => r.id));
    upserts[c] = rows.filter(r => snap[c][r.id] !== JSON.stringify(r)).map(r => ({ id: r.id, data: r }));
    deletes[c] = Object.keys(snap[c]).filter(id => !ids.has(id));
  }
  const focus = Object.entries(local.focusLog).filter(([d, m]) => snap.focus[d] !== m).map(([day, minutes]) => ({ day, minutes }));
  return { upserts, deletes, focus };
}

export const isEmptyPush = (p: Push) =>
  !p.focus.length && COLLECTIONS.every(c => !p.upserts[c].length && !p.deletes[c].length);

// Record a successful push in the snapshot.
export function afterPush(snap: Snapshot, p: Push): Snapshot {
  const next = structuredCloneSafe(snap);
  for (const c of COLLECTIONS) {
    for (const r of p.upserts[c]) next[c][r.id] = JSON.stringify(r.data);
    for (const id of p.deletes[c]) delete next[c][id];
  }
  for (const f of p.focus) next.focus[f.day] = f.minutes;
  return next;
}

// Apply rows pulled from the server: deleted rows leave, others replace or join local ones.
export function applyPull(local: LocalAcademic, snap: Snapshot, rows: Record<Collection, RemoteRow[]>, focus: RemoteFocus[]):
  { local: LocalAcademic; snap: Snapshot; changed: boolean } {
  const next = structuredCloneSafe(snap);
  let changed = false;
  const out: LocalAcademic = { ...local, focusLog: { ...local.focusLog } };
  for (const c of COLLECTIONS) {
    const incoming = rows[c] ?? [];
    if (!incoming.length) continue;
    const map = new Map(listOf(local, c).map(r => [r.id, r]));
    for (const r of incoming) {
      if (r.deleted) {
        if (map.delete(r.id)) changed = true;
        delete next[c][r.id];
      } else {
        const text = JSON.stringify(r.data);
        if (JSON.stringify(map.get(r.id)) !== text) { map.set(r.id, r.data as { id: string }); changed = true; }
        next[c][r.id] = text;
      }
    }
    const list = [...map.values()];
    if (c === 'study_sessions') out.study = (list as StudySession[]).sort((a, b) => a.date.localeCompare(b.date));
    else if (c === 'exams') out.exams = (list as Exam[]).sort((a, b) => a.date.localeCompare(b.date));
    else if (c === 'subjects') out.subjects = list as Subject[];
    else out.tasks = list as Task[];
  }
  for (const f of focus) {
    // Focus minutes only grow on a device; keep the larger value so two devices never lose time.
    const m = Math.max(f.minutes, out.focusLog[f.day] ?? 0);
    if (out.focusLog[f.day] !== m) { out.focusLog[f.day] = m; changed = true; }
    next.focus[f.day] = f.minutes;
  }
  return { local: out, snap: next, changed };
}

// Newest server timestamp seen; the next pull asks for rows after it (minus a small overlap).
export function nextCursor(prev: string | null, rows: Record<Collection, RemoteRow[]>, focus: RemoteFocus[]): string | null {
  let max = prev;
  for (const c of COLLECTIONS) for (const r of rows[c] ?? []) if (!max || r.updated_at > max) max = r.updated_at;
  for (const f of focus) if (!max || f.updated_at > max) max = f.updated_at;
  return max;
}

const structuredCloneSafe = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
