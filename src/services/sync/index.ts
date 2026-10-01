// Accounts and sync over Supabase. Screens never call Supabase directly; they use these functions via the store.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyRemotePlanConfig, type PlanConfig } from '../../config/plans';
import { addSink, type AnalyticsEvent } from '../analytics';
import { supabase } from '../supabase';
import { COLLECTIONS, afterPush, applyPull, diffForPush, emptySnapshot, isEmptyPush, nextCursor, type Collection, type LocalAcademic, type RemoteFocus, type RemoteRow, type Snapshot } from './core';

export const syncAvailable = !!supabase;

export type Account = { userId: string; email: string };
export type ServerProfile = { name: string; university: string; major: string; year: string; lang: 'en' | 'ar'; daily_minutes: number; tier: 'free' | 'plus' | 'pro' };
type Meta = { userId: string | null; snap: Snapshot; cursor: string | null; profile: string | null; at: number | null };

const META_KEY = 'nazzim.sync.v1';
const OVERLAP_MS = 10_000; // re-read the last 10 s each pull so rows committed out of order are never missed
const PAGE = 500;

let meta: Meta = { userId: null, snap: emptySnapshot(), cursor: null, profile: null, at: null };
let loaded = false;
async function loadMeta() {
  if (loaded) return;
  loaded = true;
  try { const raw = await AsyncStorage.getItem(META_KEY); if (raw) meta = { ...meta, ...JSON.parse(raw) }; } catch { /* first run */ }
}
const saveMeta = () => AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => {});
export const lastSyncedAt = () => meta.at;

// ── Auth ───────────────────────────────────────────────────────────────────────────────────────
export type AuthError = 'invalid' | 'unconfirmed' | 'weak' | 'exists' | 'network' | 'unavailable' | 'unknown';
const mapError = (e: { message?: string; status?: number; code?: string } | null): AuthError => {
  const m = (e?.code ?? e?.message ?? '').toLowerCase();
  if (m.includes('invalid') && m.includes('credential')) return 'invalid';
  if (m.includes('not_confirmed') || m.includes('not confirmed')) return 'unconfirmed';
  if (m.includes('weak') || m.includes('password should')) return 'weak';
  if (m.includes('already') || m.includes('exists')) return 'exists';
  if (m.includes('fetch') || m.includes('network')) return 'network';
  return 'unknown';
};

export async function currentAccount(): Promise<Account | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { userId: u.id, email: u.email ?? '' } : null;
}

export function onAccountChange(cb: (a: Account | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => {
    const u = session?.user;
    cb(u ? { userId: u.id, email: u.email ?? '' } : null);
  });
  return () => data.subscription.unsubscribe();
}

// Sign up. If the project requires email confirmation there is no session yet: the UI asks to confirm.
export async function signUp(email: string, password: string): Promise<{ ok: true; needsConfirm: boolean } | { ok: false; error: AuthError }> {
  if (!supabase) return { ok: false, error: 'unavailable' };
  try {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { ok: false, error: mapError(error) };
    return { ok: true, needsConfirm: !data.session };
  } catch { return { ok: false, error: 'network' }; }
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: AuthError }> {
  if (!supabase) return { ok: false, error: 'unavailable' };
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: mapError(error) } : { ok: true };
  } catch { return { ok: false, error: 'network' }; }
}

// Signing out keeps this device's data but forgets the sync state, so the next account starts clean.
export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut().catch(() => {});
  meta = { userId: null, snap: emptySnapshot(), cursor: null, profile: null, at: null };
  await saveMeta();
}

export async function deleteAccount(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return false;
    await signOut();
    return true;
  } catch { return false; }
}

// ── Remote config (plans, prices, limits) ─────────────────────────────────────────────────────
export async function refreshConfig() {
  if (!supabase) return;
  try {
    const { data } = await supabase.from('app_config').select('key, value').eq('key', 'plans').maybeSingle();
    const v = data?.value as (Omit<PlanConfig, 'limits'> & { limits: Record<string, { activeExams: number | null; insights: number }> }) | undefined;
    if (!v) return;
    // JSON has no Infinity: null means unlimited.
    const limits = Object.fromEntries(Object.entries(v.limits).map(([k, l]) => [k, { ...l, activeExams: l.activeExams ?? Infinity }])) as PlanConfig['limits'];
    applyRemotePlanConfig({ ...v, limits });
  } catch { /* keep defaults */ }
}

// ── Product events: buffered, sent with the next sync when signed in ───────────────────────────
const queue: AnalyticsEvent[] = [];
addSink(e => { if (queue.length < 500) queue.push(e); });

// ── Sync ───────────────────────────────────────────────────────────────────────────────────────
export type Pulled = { rows: Record<Collection, RemoteRow[]>; focus: RemoteFocus[]; profile: ServerProfile | null };
export type SyncInput = { local: LocalAcademic; profile: { name: string; uni: string; major: string; year: string; lang: 'en' | 'ar'; dailyMinutes: number } };

// Push local changes, then pull server changes. Returns what was pulled; the store merges it into the
// current state with `mergePulled` (so edits made while the request was in flight are not lost).
export async function sync(input: SyncInput): Promise<Pulled> {
  if (!supabase) throw new Error('unavailable');
  await loadMeta();
  const account = await currentAccount();
  if (!account) throw new Error('signed_out');
  const db = supabase;
  if (meta.userId !== account.userId) meta = { userId: account.userId, snap: emptySnapshot(), cursor: null, profile: null, at: null };
  const user_id = account.userId;

  // 1. Push.
  const push = diffForPush(input.local, meta.snap);
  if (!isEmptyPush(push)) {
    for (const c of COLLECTIONS) {
      const rows = [
        ...push.upserts[c].map(r => ({ user_id, id: r.id, data: r.data, deleted: false })),
        ...push.deletes[c].map(id => ({ user_id, id, data: {}, deleted: true })),
      ];
      for (let i = 0; i < rows.length; i += PAGE) {
        const { error } = await db.from(c).upsert(rows.slice(i, i + PAGE), { onConflict: 'user_id,id' });
        if (error) throw error;
      }
    }
    if (push.focus.length) {
      const { error } = await db.from('focus_days').upsert(push.focus.map(f => ({ user_id, ...f })), { onConflict: 'user_id,day' });
      if (error) throw error;
    }
    meta.snap = afterPush(meta.snap, push);
  }
  const p = input.profile;
  const profileJson = JSON.stringify(p);
  if (meta.profile !== null && meta.profile !== profileJson) {
    const { error } = await db.from('profiles').update({ name: p.name, university: p.uni, major: p.major, year: p.year, lang: p.lang, daily_minutes: p.dailyMinutes }).eq('id', user_id);
    if (error) throw error;
  }

  // 2. Pull.
  const since = meta.cursor ? new Date(new Date(meta.cursor).getTime() - OVERLAP_MS).toISOString() : null;
  const rows = {} as Pulled['rows'];
  for (const c of COLLECTIONS) {
    rows[c] = [];
    for (let from = 0; ; from += PAGE) {
      let q = db.from(c).select('id, data, deleted, updated_at').order('updated_at').range(from, from + PAGE - 1);
      if (since) q = q.gt('updated_at', since);
      const { data, error } = await q;
      if (error) throw error;
      rows[c].push(...((data ?? []) as RemoteRow[]));
      if (!data || data.length < PAGE) break;
    }
  }
  let fq = db.from('focus_days').select('day, minutes, updated_at');
  if (since) fq = fq.gt('updated_at', since);
  const { data: focus, error: fe } = await fq;
  if (fe) throw fe;
  const { data: profile } = await db.from('profiles').select('name, university, major, year, lang, daily_minutes, tier').eq('id', user_id).maybeSingle();

  // 3. Events (best effort).
  if (queue.length) {
    const batch = queue.splice(0, queue.length);
    const { error } = await db.from('events').insert(batch.map(e => ({ user_id, name: e.name, props: 'props' in e ? e.props : {} })));
    if (error) queue.unshift(...batch.slice(0, 500));
  }

  meta.cursor = nextCursor(meta.cursor, rows, (focus ?? []) as RemoteFocus[]);
  meta.profile = profileJson;
  meta.at = Date.now();
  await saveMeta();
  return { rows, focus: (focus ?? []) as RemoteFocus[], profile: (profile as ServerProfile | null) ?? null };
}

// Merge pulled rows into whatever the local state is now, and remember them as synced.
export function mergePulled(local: LocalAcademic, pulled: Pulled) {
  const r = applyPull(local, meta.snap, pulled.rows, pulled.focus);
  meta.snap = r.snap;
  saveMeta();
  return r;
}
