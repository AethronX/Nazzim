// Sync core: pure functions, no network. Local state is the source of truth while offline; the server keeps
// one JSON document per entity, stamped with server time. A sync is: push local changes (diff against the last
// synced snapshot), then pull rows changed on the server since the last cursor. Same id → last write wins.
import type { Exam, Subject, Task } from '../../domain/types';
import { checkCard, checkExam, checkSession, checkSubject, checkTask, type Check } from '../../domain/validate';
import type { Card } from '../../engine/recall';
import type { StudySession } from '../../lib/exams';

export const COLLECTIONS = ['subjects', 'tasks', 'exams', 'study_sessions', 'cards'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export type LocalAcademic = {
  subjects: Subject[]; tasks: Task[]; exams: Exam[]; study: StudySession[]; cards: Card[]; focusLog: Record<string, number>;
};
export type RemoteRow = { id: string; data: unknown; deleted: boolean; updated_at: string };
export type RemoteFocus = { day: string; minutes: number; updated_at: string };

// What was last agreed with the server: id → JSON text, per collection; and minutes per focus day.
export type Snapshot = Record<Collection, Record<string, string>> & { focus: Record<string, number> };
export const emptySnapshot = (): Snapshot => ({ subjects: {}, tasks: {}, exams: {}, study_sessions: {}, cards: {}, focus: {} });

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

const CHECKS: Record<Collection, (v: unknown) => Check<{ id: string }>> = {
  subjects: checkSubject, tasks: checkTask, exams: checkExam, study_sessions: checkSession, cards: checkCard,
};

export type Quarantined = { collection: Collection; id?: string; reason: string };

// Apply rows pulled from the server: deleted rows leave, others replace or join local ones.
//
// Every incoming row is validated first. A row that can be repaired (minutes stored as a string, a focus
// total above what the block planned) is repaired and applied; a row that cannot (no usable exam date, no
// chapters at all) is QUARANTINED — set aside with a reason, so one corrupt row cannot take the rest of the
// sync down with it, and nothing unvalidated is cast into state. It stays on the server untouched and is
// re-examined on the next pull, so a later app version can rescue it.
export function applyPull(local: LocalAcademic, snap: Snapshot, rows: Record<Collection, RemoteRow[]>, focus: RemoteFocus[]):
  { local: LocalAcademic; snap: Snapshot; changed: boolean; quarantined: Quarantined[] } {
  const next = structuredCloneSafe(snap);
  const quarantined: Quarantined[] = [];
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
        const checked = CHECKS[c](r.data);
        if (!checked.ok) {
          quarantined.push({ collection: c, ...(typeof r.id === 'string' ? { id: r.id } : {}), reason: checked.reason });
          continue; // leave the cursor to re-offer it; never record it as agreed with the server
        }
        const text = JSON.stringify(checked.value);
        if (JSON.stringify(map.get(r.id)) !== text) { map.set(r.id, checked.value); changed = true; }
        next[c][r.id] = text;
      }
    }
    const list = [...map.values()];
    // One branch per collection. `cards` used to fall through to the task list, which replaced a student's
    // tasks with their flashcards the first time a second device pulled cards down.
    if (c === 'study_sessions') out.study = (list as StudySession[]).sort((a, b) => a.date.localeCompare(b.date));
    else if (c === 'exams') out.exams = (list as Exam[]).sort((a, b) => a.date.localeCompare(b.date));
    else if (c === 'subjects') out.subjects = list as Subject[];
    else if (c === 'tasks') out.tasks = list as Task[];
    else if (c === 'cards') out.cards = list as Card[];
  }
  for (const f of focus) {
    // Focus minutes only grow on a device; keep the larger value so two devices never lose time.
    const m = Math.max(f.minutes, out.focusLog[f.day] ?? 0);
    if (out.focusLog[f.day] !== m) { out.focusLog[f.day] = m; changed = true; }
    next.focus[f.day] = f.minutes;
  }
  return { local: out, snap: next, changed, quarantined };
}

// Newest server timestamp seen; the next pull asks for rows after it (minus a small overlap).
export function nextCursor(prev: string | null, rows: Record<Collection, RemoteRow[]>, focus: RemoteFocus[]): string | null {
  let max = prev;
  for (const c of COLLECTIONS) for (const r of rows[c] ?? []) if (!max || r.updated_at > max) max = r.updated_at;
  for (const f of focus) if (!max || f.updated_at > max) max = f.updated_at;
  return max;
}

const structuredCloneSafe = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
