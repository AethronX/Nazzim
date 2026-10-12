// Export and restore. A backup is the student's own academic record — it must round-trip exactly, and a
// malformed paste must be refused rather than half-applied over working data.

export const BACKUP_VERSION = 1;
export const BACKUP_TAG = 'nazzim-backup';

/** Only the student's own records travel. Settings, language and UI state stay with the device. */
export const BACKUP_KEYS = ['subjects', 'tasks', 'exams', 'study', 'cards', 'assessments', 'topics', 'errors', 'gradeTargets', 'dayLogs', 'focusLog'] as const;
export type BackupKey = (typeof BACKUP_KEYS)[number];

export type Backup = { tag: string; version: number; exportedAt: string; data: Record<string, unknown> };

export function exportBackup(state: Record<string, unknown>, now: string): Backup {
  const data: Record<string, unknown> = {};
  for (const k of BACKUP_KEYS) if (state[k] !== undefined) data[k] = state[k];
  return { tag: BACKUP_TAG, version: BACKUP_VERSION, exportedAt: now, data };
}

export type ParseResult = { ok: true; backup: Backup; records: number } | { ok: false; reason: 'json' | 'tag' | 'version' | 'shape' };

/** Parse a pasted backup. Anything that is not clearly ours is refused — never partially applied. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, reason: 'json' }; }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'shape' };
  const b = raw as Partial<Backup>;
  if (b.tag !== BACKUP_TAG) return { ok: false, reason: 'tag' };
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) return { ok: false, reason: 'version' };
  if (!b.data || typeof b.data !== 'object') return { ok: false, reason: 'shape' };

  // Every key we accept must have the right container type, or the whole restore is refused.
  for (const k of BACKUP_KEYS) {
    const v = (b.data as Record<string, unknown>)[k];
    if (v === undefined) continue;
    const wantsObject = k === 'gradeTargets' || k === 'dayLogs' || k === 'focusLog';
    const isObject = typeof v === 'object' && v !== null && !Array.isArray(v);
    if (wantsObject ? !isObject : !Array.isArray(v)) return { ok: false, reason: 'shape' };
  }
  return { ok: true, backup: b as Backup, records: countRecords(b.data as Record<string, unknown>) };
}

export function countRecords(data: Record<string, unknown>): number {
  let n = 0;
  for (const k of BACKUP_KEYS) {
    const v = data[k];
    if (Array.isArray(v)) n += v.length;
    else if (v && typeof v === 'object') n += Object.keys(v).length;
  }
  return n;
}
