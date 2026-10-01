import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';
import type { Exam, Subject, Task } from '../domain/types';
import type { PlanProposal } from '../ai/planner';
import { canAddExam } from '../config/plans';
import { recommendNextAction } from '../engine/academic';
import { reminderTime, studyStreak, type StudyTime } from '../engine/habits';
import { newCard, review as reviewCard, type Card, type Grade } from '../engine/recall';
import { DEFAULT_DAILY_MIN, type RescuePlan } from '../engine/rescue';
import { track } from '../services/analytics';
import { entitlementFromServer, purchase, purchasesAvailable, restore, type Period } from '../services/billing';
import * as Sync from '../services/sync';
import { COPY, type Copy, type Lang } from './copy';
import { addDays, daysBetween, newId, planExam, rate, readiness, rollForward, todayKey, type Confidence, type StudySession } from './exams';
import { askForReview, REVIEW_AFTER_SESSIONS, sessionDone, setHaptics, tapDone } from './feedback';
import { cancelFocusEnd, DEFAULT_REMINDERS, requestPermission, scheduleFocusEnd, syncReminders, type ReminderSettings } from './reminders';
import { makeAccent, normalizeAccent, paletteFor, type Accent, type AccentKey, type Palette, type Scheme } from './theme';

const STORAGE_KEY = 'nazzim.v2';
const SCHEMA = 4;

type Persisted = {
  schema: number;
  lang: Lang; ticks: Record<string, boolean>;
  xp: number; preset: number; plan: 'month' | 'year';
  sessions: number; reviewAsked: boolean;
  appearance: Appearance;
  reminders: ReminderSettings;
  profile: Profile;
  tier: Tier;
  haptics: boolean; rewards: boolean; aiTips: boolean; accentKey: AccentKey;
  // Academic context. `study` is the revision plan; `sessions` above counts finished focus sessions.
  subjects: Subject[]; tasks: Task[]; exams: Exam[]; study: StudySession[]; examsSeeded: boolean;
  cards: Card[]; // retrieval-practice cards the student wrote; the evidence behind the recall part of readiness
  dailyMinutes: number; // usual study capacity per day; Rescue Mode plans within it
  focusLog: Record<string, number>; // focused minutes per day, for consistency and weekly study time
  onboarded: boolean;
  studyTime: StudyTime; // implementation intention: when the student studies (schedule + reminders follow)
  recapSeen: string | null; // week key of the last dismissed weekly recap
  checklistHidden: boolean;
};

export type Tier = 'free' | 'plus' | 'pro';
// Empty fields fall back to the sample student in the current language.
export type Profile = { name: string; uni: string; major: string; year: string };
export type Onboarding = {
  profile: Partial<Profile>;
  subjects: { name: string; targetGrade: string }[];
  exam?: { subject: number; inDays: number; chapters: number }; // index into subjects
  studyTime?: StudyTime;
};

export type Appearance = 'system' | 'light' | 'dark';

// First run follows the device language (Arabic or English).
const deviceLang = (): Lang => {
  try { return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('ar') ? 'ar' : 'en'; } catch { return 'en'; }
};

const INITIAL: Persisted = { schema: SCHEMA, lang: deviceLang(), ticks: {}, xp: 0, preset: 25, plan: 'year', sessions: 0, reviewAsked: false, appearance: 'system', reminders: DEFAULT_REMINDERS,
  profile: { name: '', uni: '', major: '', year: '' }, tier: 'free', haptics: true, rewards: true, aiTips: true, accentKey: 'indigo',
  subjects: [], tasks: [], exams: [], study: [], cards: [], examsSeeded: false, dailyMinutes: DEFAULT_DAILY_MIN, focusLog: {}, onboarded: false, studyTime: 'afternoon', recapSeen: null, checklistHidden: false };

// What the focus timer is working on, so a finished session can update that item's progress.
export type FocusTarget = { kind: 'session' | 'task'; id: string } | null;
// The focus timer stores only when it ends (running) or what was left (paused): it never changes every second,
// so the store does not re-render the app while a session runs. Screens read the live countdown with
// useTimerSecs() (src/lib/timer.ts), which re-renders just the clock.
export type Timer = { secs: number; total: number; running: boolean; endAt: number; task: string | null; target: FocusTarget };
// A focus block that just ended, waiting for the student to say how it went.
export type FocusReview = { target: FocusTarget; title: string; minutes: number } | null;

type Store = Persisted & {
  ready: boolean;
  L: Copy; ar: boolean; accent: Accent; gamification: boolean;
  C: Palette; scheme: Scheme;
  level: number; xpIn: number;
  toast: { msg: string; key: number } | null;
  timer: Timer; review: FocusReview; clearReview: () => void;
  today: string; day: string; sound: number; lock: boolean;
  del: boolean;
  quick: boolean; setQuick: (on: boolean) => void;
  onboard: (o: Onboarding) => void; loadSample: () => void;
  // Account and sync (optional: the app is fully usable signed out)
  account: Sync.Account | null; syncState: 'off' | 'syncing' | 'synced' | 'error'; lastSync: number | null;
  signIn: (email: string, password: string) => ReturnType<typeof Sync.signIn>;
  signUp: (email: string, password: string) => ReturnType<typeof Sync.signUp>;
  signOut: () => Promise<void>; deleteAccount: () => Promise<boolean>; syncNow: () => void;
  atExamLimit: boolean; // the plan's active-exam limit is reached (Free: 2)
  hitLimit: () => void; // explain the limit kindly and open Plans
  me: Profile; // profile with sample fallbacks filled in
  set: (patch: Partial<Persisted>) => void;
  award: (n: number, msg: string) => void;
  toggleTick: (key: string, on: boolean) => void;
  setDay: (key: string) => void; setSound: (n: number) => void; toggleLock: () => void;
  addExam: (e: Omit<Exam, 'id'>, source?: 'manual' | 'planner') => string; deleteExam: (id: string) => void; rateSession: (id: string, c: Confidence) => void;
  addCard: (examId: string, chapter: number, q: string, a: string) => string; deleteCard: (id: string) => void; gradeCard: (id: string, g: Grade) => void;
  addSubject: (s: Omit<Subject, 'id'>) => string; updateSubject: (id: string, patch: Partial<Subject>) => void; deleteSubject: (id: string) => void;
  addTask: (t: Omit<Task, 'id' | 'done'>) => string; toggleTask: (id: string) => void; deleteTask: (id: string) => void;
  setPreset: (m: number) => void;
  startFocusOn: (title: string, target?: FocusTarget, minutes?: number) => void;
  applyRescue: (plan: RescuePlan) => void;
  toggleTimer: () => void; resetTimer: () => void; finishNow: () => void;
  applyPlan: (p: PlanProposal) => void;
  setDel: (on: boolean) => void; confirmDel: () => Promise<void>;
  purchasesAvailable: boolean;
  subscribe: (tier: Tier, period?: Period) => Promise<string>;
  restorePurchase: () => Promise<string>;
  saveProfile: (profile: Profile) => void;
  remDenied: boolean; setReminders: (patch: Partial<ReminderSettings>) => void;
};

const Ctx = createContext<Store | null>(null);

export function useNazzim() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useNazzim outside NazzimProvider');
  return s;
}

const SUBJECT_ORDER: Subject['color'][] = ['indigo', 'green', 'amber', 'sky', 'rose', 'teal', 'violet'];

// Earlier builds stored exams with a subject name only. Give every exam a Subject entity.
function migrate(p: Persisted): Persisted {
  let subjects = [...(p.subjects ?? [])];
  const exams = (p.exams ?? []).map(e => {
    if (e.subjectId && subjects.some(x => x.id === e.subjectId)) return e;
    let subj = subjects.find(x => x.name.trim().toLowerCase() === e.subject.trim().toLowerCase());
    if (!subj) {
      subj = { id: newId('sub'), name: e.subject, color: SUBJECT_ORDER[subjects.length % SUBJECT_ORDER.length], icon: 'book', targetGrade: 'A' };
      subjects = [...subjects, subj];
    }
    return { ...e, subjectId: subj.id };
  });
  return { ...p, schema: SCHEMA, subjects, exams, tasks: p.tasks ?? [], cards: p.cards ?? [], accentKey: normalizeAccent(p.accentKey) };
}

// "Explore with a sample semester" on the welcome screen: three subjects, one exam with its plan, three tasks.
function seed(p: Persisted): Persisted {
  if (p.examsSeeded) return p;
  const today = todayKey(), L = COPY[p.lang], S = L.seed;
  const subjects: Subject[] = [
    { id: newId('sub'), name: S.subjects[0], color: 'indigo', icon: 'chart', targetGrade: 'A' },
    { id: newId('sub'), name: S.subjects[1], color: 'green', icon: 'function', targetGrade: 'B+' },
    { id: newId('sub'), name: S.subjects[2], color: 'amber', icon: 'atom', targetGrade: 'A-' },
  ];
  const exam: Exam = { id: newId('e'), subjectId: subjects[0].id, subject: S.examName, date: addDays(today, 6), chapters: S.chapters };
  const study = planExam(exam, today).map((x, i) => (i === 0 ? { ...x, done: true, confidence: 2 as Confidence } : x));
  const tasks: Task[] = [
    { id: newId('t'), subjectId: subjects[0].id, title: S.tasks[0], due: today, estimateMin: 45, done: false },
    { id: newId('t'), subjectId: subjects[2].id, title: S.tasks[1], due: addDays(today, 1), estimateMin: 60, done: false },
    { id: newId('t'), subjectId: subjects[1].id, title: S.tasks[2], due: addDays(today, 3), estimateMin: 50, done: false },
  ];
  return { ...p, examsSeeded: true, subjects: [...p.subjects, ...subjects], exams: [...p.exams, exam], study: [...p.study, ...study], tasks: [...p.tasks, ...tasks] };
}

export function NazzimProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(INITIAL);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Store['toast']>(null);
  const [timer, setTimer] = useState<Timer>({ secs: 1500, total: 1500, running: false, endAt: 0, task: null, target: null });
  const [today, setToday] = useState(todayKey);
  const [day, setDay] = useState(todayKey);
  const [sound, setSound] = useState(0);
  const [lock, setLock] = useState(true);
  const [del, setDel] = useState(false);
  const [review, setReview] = useState<FocusReview>(null);
  const [quick, setQuick] = useState(false);
  const [account, setAccount] = useState<Sync.Account | null>(null);
  const [syncState, setSyncState] = useState<Store['syncState']>('off');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [remDenied, setRemDenied] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastKey = useRef(0);

  const L = COPY[p.lang];

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        const saved = raw ? JSON.parse(raw) : null;
        if (saved && typeof saved === 'object') {
          // Installs from before onboarding existed count as onboarded.
          const next = migrate({ ...INITIAL, ...saved, onboarded: saved.onboarded ?? true, reminders: { ...DEFAULT_REMINDERS, ...saved.reminders }, profile: { ...INITIAL.profile, ...saved.profile } } as Persisted);
          setP({ ...next, study: rollForward(next.study, next.exams, todayKey()) });
          setTimer(t => ({ ...t, secs: next.preset * 60, total: next.preset * 60 }));
        }
        track({ name: 'app_opened' });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(() => {});
  }, [p, ready]);

  // ── Account + sync ──
  useEffect(() => {
    if (!Sync.syncAvailable) return;
    Sync.currentAccount().then(setAccount).catch(() => {});
    Sync.refreshConfig();
    return Sync.onAccountChange(setAccount);
  }, []);

  const pRef = useRef(p);
  useEffect(() => { pRef.current = p; }, [p]);
  const syncing = useRef(false);
  const runSync = useCallback(async () => {
    if (syncing.current || !Sync.syncAvailable) return;
    syncing.current = true;
    setSyncState('syncing');
    const s0 = pRef.current;
    try {
      const pulled = await Sync.sync({
        local: { subjects: s0.subjects, tasks: s0.tasks, exams: s0.exams, study: s0.study, cards: s0.cards, focusLog: s0.focusLog },
        profile: { ...s0.profile, lang: s0.lang, dailyMinutes: s0.dailyMinutes },
      });
      setP(s => {
        const r = Sync.mergePulled({ subjects: s.subjects, tasks: s.tasks, exams: s.exams, study: s.study, cards: s.cards, focusLog: s.focusLog }, pulled);
        let next = r.changed ? { ...s, ...r.local, onboarded: true } : s;
        const sp = pulled.profile;
        if (sp) {
          // A new device fills empty profile fields from the account; the plan tier is decided by the server.
          const profile = { name: s.profile.name || sp.name, uni: s.profile.uni || sp.university, major: s.profile.major || sp.major, year: s.profile.year || sp.year };
          if (JSON.stringify(profile) !== JSON.stringify(s.profile)) next = { ...next, profile };
          // The server's answer wins outright, including a downgrade: a lapsed subscription must actually
          // lapse on the device, and a locally forged tier must not survive a sync.
          const granted = entitlementFromServer(sp.tier);
          if (granted !== s.tier) next = { ...next, tier: granted };
        }
        return next;
      });
      setLastSync(Date.now());
      setSyncState('synced');
    } catch {
      setSyncState('error');
    } finally {
      syncing.current = false;
    }
  }, []);

  // Sync shortly after any academic change, on sign-in, and when the app comes back to the foreground.
  useEffect(() => {
    if (!ready || !account) return;
    const t = setTimeout(runSync, 1500);
    return () => clearTimeout(t);
  }, [ready, account, runSync, p.subjects, p.tasks, p.exams, p.study, p.focusLog, p.profile, p.lang, p.dailyMinutes]);
  useEffect(() => {
    if (!account) return;
    const sub = AppState.addEventListener('change', st => { if (st === 'active') runSync(); });
    return () => sub.remove();
  }, [account, runSync]);

  const set = useCallback((patch: Partial<Persisted>) => setP(s => ({ ...s, ...patch })), []);

  const award = useCallback((n: number, msg: string) => {
    setP(s => ({ ...s, xp: s.xp + n }));
    toastKey.current += 1;
    setToast({ msg, key: toastKey.current });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 1900);
  }, []);

  // A finished focus session: XP, success haptic, and a one-time rating request after the 3rd one.
  const completeSession = useCallback((msg: string, done: { target: FocusTarget; title: string; minutes: number }) => {
    award(50, msg);
    sessionDone();
    track({ name: 'focus_completed', props: { minutes: done.minutes } });
    // Linked blocks ask how it went, so the task / exam readiness update from real work.
    if (done.target) setReview(done);
    setP(s => {
      const day = todayKey();
      const focusLog = { ...s.focusLog, [day]: (s.focusLog[day] ?? 0) + done.minutes };
      // Credit the minutes to the block they were spent on. Readiness is built from these, never from a tick,
      // so they are recorded here — the moment the time was actually spent — and not when the student rates it.
      const study = done.target?.kind === 'session'
        ? s.study.map(x => (x.id === done.target!.id ? { ...x, focusedMin: (x.focusedMin ?? 0) + done.minutes } : x))
        : s.study;
      const sessions = s.sessions + 1;
      if (!s.reviewAsked && sessions >= REVIEW_AFTER_SESSIONS) {
        setTimeout(askForReview, 2000);
        return { ...s, sessions, focusLog, study, reviewAsked: true };
      }
      return { ...s, sessions, focusLog, study };
    });
  }, [award]);

  // Wall-clock based so the countdown stays accurate when the app is backgrounded.
  const LRef = useRef(L);
  useEffect(() => { LRef.current = L; }, [L]);
  // One timeout at the end of the session instead of a tick every second.
  useEffect(() => {
    if (!timer.running) return;
    const done = { target: timer.target, title: timer.task ?? '', minutes: Math.round(timer.total / 60) };
    const t = setTimeout(() => {
      setTimer(x => ({ ...x, running: false, secs: x.total }));
      completeSession(LRef.current.toastFocus, done);
    }, Math.max(0, timer.endAt - Date.now()));
    return () => clearTimeout(t);
  }, [timer.running, timer.endAt, timer.total, timer.task, timer.target, completeSession]);

  useEffect(() => () => { clearTimeout(toastT.current); }, []);

  useEffect(() => { setHaptics(p.haptics); }, [p.haptics]);

  // A new day: pick it up when the app comes back to the foreground, and move missed sessions to today.
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return;
      const k = todayKey();
      setToday(k);
      setP(s => ({ ...s, study: rollForward(s.study, s.exams, k) }));
    });
    return () => sub.remove();
  }, []);

  // Keep scheduled reminders in step with the settings, the plan, the next move and the streak (debounced).
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const Lx = COPY[p.lang];
      const ctx = { today, subjects: p.subjects, tasks: p.tasks, exams: p.exams, sessions: p.study };
      const next = recommendNextAction(ctx, (s, e) => (s.chapter < 0 ? Lx.exAll : e?.chapters[s.chapter] ?? ''));
      const streak = studyStreak(ctx, p.focusLog);
      const list = p.exams.map(e => ({ id: e.id, name: e.subject, days: daysBetween(today, e.date) })).filter(e => e.days > 0);
      syncReminders(p.reminders, Lx, list, {
        ...reminderTime(p.studyTime),
        next: next.kind === 'session' || next.kind === 'task' ? `${next.title} · ${next.minutes} ${Lx.min}` : null,
        streakDays: streak.days, studiedToday: streak.studiedToday,
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [ready, p.reminders, p.lang, p.exams, p.study, p.tasks, p.subjects, p.focusLog, p.studyTime, today]);

  // Focus-session end notification follows the timer: scheduled while running, cancelled on pause or reset.
  useEffect(() => {
    if (timer.running && p.reminders.on && p.reminders.focus) scheduleFocusEnd(timer.endAt, timer.task || LRef.current.freeFocus, LRef.current).catch(() => {});
    else cancelFocusEnd().catch(() => {});
  }, [timer.running, timer.endAt, timer.task, p.reminders.on, p.reminders.focus]);

  const setReminders = useCallback(async (patch: Partial<ReminderSettings>) => {
    if (patch.on) {
      const ok = await requestPermission().catch(() => false);
      setRemDenied(!ok);
      if (!ok) return;
      track({ name: 'reminders_enabled' });
    }
    setP(s => ({ ...s, reminders: { ...s.reminders, ...patch } }));
  }, []);

  const toggleTick = useCallback((key: string, on: boolean) => {
    setP(s => ({ ...s, ticks: { ...s.ticks, [key]: !on } }));
    if (!on) { tapDone(); award(10, L.toastHabit); }
  }, [award, L]);


  const level = 1 + Math.floor(p.xp / 1000);
  // Follows the phone's Light/Dark setting unless the user picks one in Settings › Appearance.
  const system = useColorScheme();
  const scheme: Scheme = p.appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : p.appearance;
  const accent = useMemo(() => makeAccent(scheme, p.accentKey), [scheme, p.accentKey]);
  const C = useMemo(() => paletteFor(scheme, p.accentKey), [scheme, p.accentKey]);

  const value: Store = {
    ...p, ready, L, ar: p.lang === 'ar', accent, gamification: p.rewards, C, scheme,
    level, xpIn: p.xp % 1000,
    toast, timer, today, day, sound, lock, del, quick, setQuick,
    account, syncState: account ? syncState : 'off', lastSync,
    signIn: (email, password) => Sync.signIn(email, password),
    signUp: (email, password) => Sync.signUp(email, password),
    signOut: async () => { await Sync.signOut(); setAccount(null); },
    // Deleting the account also clears this device: the student starts fresh.
    deleteAccount: async () => {
      const ok = await Sync.deleteAccount();
      if (ok) { setAccount(null); setP({ ...INITIAL, lang: p.lang }); }
      return ok;
    },
    syncNow: () => { runSync(); },
    atExamLimit: !canAddExam(p.tier, p.exams.filter(e => e.date >= today).length),
    hitLimit: () => { award(0, L.limitExams); router.push('/subscription'); },
    // No invented persona: empty fields stay empty and screens leave them out.
    me: { name: p.profile.name.trim(), uni: p.profile.uni.trim(), major: p.profile.major.trim(), year: p.profile.year.trim() },
    onboard: o => {
      const subjects: Subject[] = o.subjects.map((x, i) => ({ id: newId('sub'), name: x.name, targetGrade: x.targetGrade, color: SUBJECT_ORDER[i % SUBJECT_ORDER.length], icon: (['chart', 'function', 'atom', 'code', 'book', 'flask', 'globe', 'pen'] as const)[i % 8] }));
      let exams: Exam[] = [], study: StudySession[] = [];
      if (o.exam && subjects[o.exam.subject]) {
        const subj = subjects[o.exam.subject];
        const exam: Exam = { id: newId('e'), subjectId: subj.id, subject: subj.name, date: addDays(today, o.exam.inDays), chapters: Array.from({ length: o.exam.chapters }, (_, i) => L.plChapterN.replace('{n}', String(i + 1))) };
        exams = [exam]; study = planExam(exam, today);
        track({ name: 'exam_created', props: { chapters: exam.chapters.length, daysAhead: o.exam.inDays, source: 'planner' } });
        track({ name: 'plan_generated', props: { sessions: study.length, source: 'local' } });
      }
      subjects.forEach(() => track({ name: 'subject_created' }));
      setP(s => ({ ...s, profile: { ...s.profile, ...o.profile }, subjects, exams, study, tasks: [], onboarded: true, examsSeeded: true, studyTime: o.studyTime ?? s.studyTime }));
      if (o.studyTime) track({ name: 'study_time_set', props: { time: o.studyTime } });
      track({ name: 'onboarding_completed' });
      tapDone();
    },
    loadSample: () => setP(s => ({ ...seed({ ...s, examsSeeded: false }), onboarded: true })),
    set, award, toggleTick,
    setDay, setSound, toggleLock: () => setLock(v => !v),
    addExam: (e, source = 'manual') => {
      // A typed subject name that isn't a subject yet becomes one, so every exam belongs to a subject.
      const known = p.subjects.find(x => x.id === e.subjectId) ?? p.subjects.find(x => x.name.toLowerCase() === e.subject.toLowerCase());
      const subj: Subject = known ?? { id: newId('sub'), name: e.subject, color: SUBJECT_ORDER[p.subjects.length % SUBJECT_ORDER.length], icon: 'book', targetGrade: 'A' };
      const exam: Exam = { ...e, subject: subj.name, subjectId: subj.id, id: newId('e') };
      const plan = planExam(exam, today);
      setP(s => ({ ...s, subjects: known ? s.subjects : [...s.subjects, subj], exams: [...s.exams, exam].sort((a, b) => a.date.localeCompare(b.date)), study: [...s.study, ...plan] }));
      tapDone();
      track({ name: 'exam_created', props: { chapters: exam.chapters.length, daysAhead: daysBetween(today, exam.date), source } });
      track({ name: 'plan_generated', props: { sessions: plan.length, source: 'local' } });
      return exam.id;
    },
    addSubject: sub => {
      const id = newId('sub');
      setP(s => ({ ...s, subjects: [...s.subjects, { ...sub, id }] }));
      track({ name: 'subject_created' });
      return id;
    },
    updateSubject: (id, patch) => setP(s => ({
      ...s,
      subjects: s.subjects.map(x => (x.id === id ? { ...x, ...patch } : x)),
      // Exams carry the subject name for display; keep it in step.
      exams: patch.name ? s.exams.map(e => (e.subjectId === id ? { ...e, subject: patch.name! } : e)) : s.exams,
    })),
    // Deleting a subject keeps its tasks and exams, unlinked.
    deleteSubject: id => setP(s => ({
      ...s,
      subjects: s.subjects.filter(x => x.id !== id),
      tasks: s.tasks.map(t => (t.subjectId === id ? { ...t, subjectId: undefined } : t)),
      exams: s.exams.map(e => (e.subjectId === id ? { ...e, subjectId: undefined } : e)),
    })),
    addTask: t => {
      const id = newId('t');
      setP(s => ({ ...s, tasks: [...s.tasks, { ...t, id, done: false }] }));
      track({ name: 'task_created', props: { hasSubject: !!t.subjectId } });
      return id;
    },
    toggleTask: id => {
      const t = p.tasks.find(x => x.id === id);
      if (!t) return;
      const done = !t.done;
      setP(s => ({ ...s, tasks: s.tasks.map(x => (x.id === id ? { ...x, done, doneAt: done ? today : undefined } : x)) }));
      if (done) { tapDone(); award(20, L.toastTask); track({ name: 'task_completed' }); }
    },
    deleteTask: id => setP(s => ({ ...s, tasks: s.tasks.filter(x => x.id !== id) })),
    deleteExam: id => setP(s => ({ ...s, exams: s.exams.filter(e => e.id !== id), study: s.study.filter(x => x.examId !== id), cards: s.cards.filter(c => c.examId !== id) })),

    // ── Retrieval practice ──────────────────────────────────────────────────────────────────
    addCard: (examId, chapter, q, a) => {
      const id = newId('c');
      setP(s => ({ ...s, cards: [...s.cards, newCard(examId, chapter, q.trim(), a.trim(), id, today)] }));
      track({ name: 'card_added' });
      return id;
    },
    deleteCard: id => setP(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) })),
    gradeCard: (id, g) => {
      setP(s => {
        const card = s.cards.find(c => c.id === id);
        const exam = card && s.exams.find(e => e.id === card.examId);
        return card ? { ...s, cards: s.cards.map(c => (c.id === id ? reviewCard(c, g, today, exam?.date) : c)) } : s;
      });
      tapDone();
      track({ name: 'card_graded', props: { grade: g } });
    },
    rateSession: (id, c) => {
      // Peak-end: close the session on visible progress ("Statistics readiness 34% → 41%").
      const ses = p.study.find(x => x.id === id), ex = p.exams.find(e => e.id === ses?.examId);
      const before = ex ? readiness(ex, p.study) : 0;
      const after = ex ? readiness(ex, rate(p.study, id, c, ex, today)) : 0;
      setP(s => {
        const ses2 = s.study.find(x => x.id === id), exam = s.exams.find(e => e.id === ses2?.examId);
        return exam ? { ...s, study: rate(s.study, id, c, exam, today) } : s;
      });
      tapDone();
      award(20, ex && after > before ? L.toastReady.replace('{exam}', ex.subject).replace('{a}', String(before)).replace('{b}', String(after)) : L.toastRated);
      track({ name: 'study_session_completed', props: { confidence: c } });
    },
    setPreset: m => { set({ preset: m }); setTimer(t => ({ ...t, total: m * 60, secs: m * 60, running: false })); },
    startFocusOn: (title, target = null, minutes) => {
      // A linked block runs for the planned length of that session or task; a free one uses the preset.
      setReview(null);
      setTimer(t => {
        const total = minutes ? minutes * 60 : p.preset * 60;
        return { ...t, task: title, target, running: true, total, secs: total, endAt: Date.now() + total * 1000 };
      });
      track({ name: 'study_session_started', props: { kind: target?.kind ?? 'free' } });
      router.navigate('/focus');
    },
    toggleTimer: () => setTimer(t => (t.running
      ? { ...t, running: false, secs: Math.max(1, Math.ceil((t.endAt - Date.now()) / 1000)) }
      : { ...t, running: true, endAt: Date.now() + t.secs * 1000 })),
    resetTimer: () => setTimer(t => ({ ...t, running: false, secs: t.total })),
    finishNow: () => {
      const left = timer.running ? Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000)) : timer.secs;
      const minutes = Math.max(1, Math.round((timer.total - left) / 60));
      setTimer(t => ({ ...t, running: false, secs: t.total }));
      completeSession(L.toastFocus, { target: timer.target, title: timer.task ?? '', minutes });
    },
    review, clearReview: () => setReview(null),
    // Rescue Mode: tasks get a planned day (their deadline stays), sessions move, redundant reviews go.
    applyRescue: plan => {
      const to = new Map(plan.days.flatMap(d => d.items).map(i => [i.id, i.to]));
      const drop = new Set(plan.dropped);
      setP(s => ({
        ...s,
        tasks: s.tasks.map(t => (to.has(t.id) ? { ...t, plannedFor: to.get(t.id) } : t)),
        study: s.study.filter(x => !drop.has(x.id)).map(x => (to.has(x.id) ? { ...x, date: to.get(x.id)! } : x)).sort((a, b) => a.date.localeCompare(b.date)),
      }));
      tapDone();
      track({ name: 'rescue_plan_created', props: { moves: plan.moves.length, dropped: plan.dropped.length, tight: plan.tight.length } });
      award(0, L.toastRescue);
    },
    // Smart Planner: a proposal becomes real sessions. Replacing an exam's plan keeps the work already done.
    applyPlan: prop => {
      const { req } = prop;
      if (req.replacesExamId && p.exams.some(e => e.id === req.replacesExamId)) {
        const id = req.replacesExamId;
        const learned = new Set(p.study.filter(x => x.examId === id && x.done && x.kind === 'learn').map(x => x.chapter));
        const fresh = prop.sessions.filter(x => !(x.kind === 'learn' && learned.has(x.chapter))).map(x => ({ ...x, examId: id }));
        setP(s => ({
          ...s,
          exams: s.exams.map(e => (e.id === id ? { ...e, date: prop.examDate, chapters: prop.chapters } : e)).sort((a, b) => a.date.localeCompare(b.date)),
          study: [...s.study.filter(x => x.examId !== id || (x.done && x.chapter < prop.chapters.length)), ...fresh].sort((a, b) => a.date.localeCompare(b.date)),
        }));
        track({ name: 'plan_generated', props: { sessions: fresh.length, source: 'local' } });
        tapDone(); award(30, L.plDone);
      } else {
        value.addExam({ subject: req.subjectName, subjectId: req.subjectId, date: prop.examDate, chapters: prop.chapters }, 'planner');
        award(30, L.plDone);
      }
    },
    setDel,
    // Demo only: no StoreKit yet, so choosing a plan just records it (the toast says so).
    purchasesAvailable: purchasesAvailable(),
    // Buying goes to the store and nowhere else. The tier arrives later, from the server, after it has
    // validated the receipt — this function deliberately has no way to set it.
    subscribe: async (tier, period) => {
      if (tier === 'free') { award(0, L.toastFree); return 'ok'; }
      const r = await purchase(tier, period ?? p.plan);
      if (r.ok) { tapDone(); award(0, L.toastPurchasePending); runSync(); return 'ok'; }
      award(0, r.reason === 'unavailable' ? L.toastPurchaseOff : r.reason === 'cancelled' ? L.toastPurchaseCancelled : L.toastPurchaseFailed);
      return r.reason;
    },
    restorePurchase: async () => {
      const r = await restore();
      if (r.ok) { runSync(); award(0, L.toastRestored); return 'ok'; }
      award(0, r.reason === 'unavailable' ? L.toastPurchaseOff : L.toastRestoreNone);
      return r.reason;
    },
    saveProfile: profile => { set({ profile }); award(0, L.toastSaved); },
    // Real deletion: the account on the server (and this device), or, signed out, this device's data.
    confirmDel: async () => {
      setDel(false);
      if (account) {
        const ok = await Sync.deleteAccount();
        if (!ok) { award(0, L.toastDelFail); return; }
        setAccount(null);
      }
      setP({ ...INITIAL, lang: p.lang });
      award(0, L.toastDel);
      router.replace('/welcome');
    },
    remDenied, setReminders: patch => { setReminders(patch); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
