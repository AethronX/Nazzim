// Smart Planner: one sentence in (English or Arabic) → a structured plan proposal out.
// The parser is deterministic and local, so it is instant and works offline; a remote model can later replace
// `parsePlanRequest` alone (same output shape) for messier input, with this one as the fallback.
import type { AcademicContext, DateKey, Exam } from '../domain/types';
import { addDays, daysBetween, fromKey, planExam, type StudySession } from '../lib/exams';
import { DEFAULT_DAILY_MIN } from '../engine/rescue';

export type PlanRequest = {
  subjectId?: string; // an existing subject
  subjectName: string;
  inDays: number;
  chapters: number;
  replacesExamId?: string; // an upcoming exam of the same subject this plan replaces
};
export type ParseResult = { ok: true; req: PlanRequest } | { ok: false; missing: ('subject' | 'date')[]; partial: Partial<PlanRequest> };

export type PlanReason =
  | { code: 'start'; days: number }
  | { code: 'spacing' }
  | { code: 'mock' }
  | { code: 'perDay'; minutes: number; capacity: number; over: boolean }
  | { code: 'around'; items: number };

export type PlanProposal = {
  req: PlanRequest;
  examDate: DateKey;
  chapters: string[];
  sessions: StudySession[];
  days: { date: DateKey; sessions: StudySession[]; minutes: number }[];
  reasons: PlanReason[];
};

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const normalize = (t: string) => t.replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d))).replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

const WEEKDAYS: [RegExp, number][] = [
  [/\b(sunday|sun)\b|الاحد/, 0], [/\b(monday|mon)\b|الاثنين|الاتنين/, 1], [/\b(tuesday|tue)\b|الثلاثاء/, 2],
  [/\b(wednesday|wed)\b|الاربعاء/, 3], [/\b(thursday|thu)\b|الخميس/, 4], [/\b(friday|fri)\b|الجمعه/, 5], [/\b(saturday|sat)\b|السبت/, 6],
];
const EXAM_WORDS = /\b(exam|test|quiz|final|finals|midterm)\b|اختبار|امتحان|كويز|نهائي|ميدترم/;
const STOP = new Set(['i', 'my', 'a', 'an', 'the', 'have', 'next', 'in', 'on', 'for', 'and', 'exam', 'test', 'quiz', 'final', 'midterm', 'عندي', 'لدي', 'مادة', 'ماده', 'في', 'يوم', 'بعد']);

function parseDays(t: string, today: DateKey): number | undefined {
  let m = t.match(/(\d+)\s*(days?|d\b|ايام|يوم|يوما)/);
  if (m) return Number(m[1]);
  if (/\b(two|2)\s*weeks?\b|اسبوعين/.test(t)) return 14;
  if (/\bnext week\b|\bin a week\b|الاسبوع القادم|الاسبوع الجاي|الاسبوع المقبل|بعد اسبوع/.test(t)) return 7;
  if (/\btomorrow\b|غدا|بكره|بكرا/.test(t)) return 1;
  if (/\btoday\b|اليوم/.test(t) && EXAM_WORDS.test(t)) return 0;
  for (const [re, dow] of WEEKDAYS) {
    if (re.test(t)) {
      const diff = (dow - fromKey(today).getDay() + 7) % 7;
      return diff === 0 ? 7 : diff;
    }
  }
  m = t.match(/(\d+)\s*(weeks?|اسابيع)/);
  if (m) return Number(m[1]) * 7;
  return undefined;
}

function parseChapters(t: string): number | undefined {
  const m = t.match(/(\d+)\s*(chapters?|units?|topics?|lectures?|فصول|فصل|وحدات|وحده|دروس|محاضرات)/);
  return m ? Math.min(20, Math.max(1, Number(m[1]))) : undefined;
}

// The subject: an existing one named in the text, else the word next to "exam".
function parseSubject(raw: string, t: string, ctx: AcademicContext): { id?: string; name?: string } {
  const hit = [...ctx.subjects].sort((a, b) => b.name.length - a.name.length).find(s => t.includes(normalize(s.name)));
  if (hit) return { id: hit.id, name: hit.name };
  const words = raw.split(/[\s,.،؟?!]+/).filter(Boolean);
  const isExam = (w: string) => EXAM_WORDS.test(normalize(w));
  const dateish = (w: string) => /^(tomorrow|today|tonight|week|weeks|days?|غدا|بكره|بكرا|اليوم|الاسبوع|اسبوع|اسبوعين|ايام)$/.test(w) || WEEKDAYS.some(([re]) => re.test(w));
  for (let i = 0; i < words.length; i++) {
    if (!isExam(words[i])) continue;
    // English puts the subject first ("Physics quiz"); Arabic after ("امتحان فيزياء").
    const order = /[\u0600-\u06FF]/.test(words[i]) ? [i + 1, i + 2, i - 1] : [i - 1, i + 1, i + 2];
    for (const j of order) {
      const w = words[j], n = w ? normalize(w) : '';
      if (w && !STOP.has(n) && !/\d/.test(w) && !isExam(w) && !dateish(n) && !/^(in|on|after|بعد|يوم)$/.test(n)) {
        return { name: w.charAt(0).toUpperCase() + w.slice(1) };
      }
    }
  }
  return {};
}

export function parsePlanRequest(text: string, ctx: AcademicContext): ParseResult {
  const t = normalize(text);
  const subj = parseSubject(text, t, ctx);
  const existing: Exam | undefined = subj.id
    ? ctx.exams.filter(e => e.subjectId === subj.id && e.date > ctx.today).sort((a, b) => a.date.localeCompare(b.date))[0]
    : undefined;
  let inDays = parseDays(t, ctx.today);
  if (inDays === undefined && existing) inDays = daysBetween(ctx.today, existing.date);
  const quiz = /\bquiz\b|كويز/.test(t);
  const chapters = parseChapters(t) ?? existing?.chapters.length ?? (quiz ? 2 : 4);
  const partial: Partial<PlanRequest> = { subjectId: subj.id, subjectName: subj.name, inDays, chapters };
  const missing: ('subject' | 'date')[] = [];
  if (!subj.name) missing.push('subject');
  if (inDays === undefined || inDays < 1) missing.push('date');
  if (missing.length) return { ok: false, missing, partial };
  return { ok: true, req: { subjectId: subj.id, subjectName: subj.name!, inDays: inDays!, chapters, replacesExamId: existing?.id } };
}

// Turn a request into the exact sessions that will be added, plus the reasons behind the shape of the plan.
export function proposePlan(req: PlanRequest, ctx: AcademicContext, chapterLabel: (n: number) => string): PlanProposal {
  const examDate = addDays(ctx.today, req.inDays);
  const prior = req.replacesExamId ? ctx.exams.find(e => e.id === req.replacesExamId) : undefined;
  const chapters = prior && prior.chapters.length === req.chapters ? prior.chapters : Array.from({ length: req.chapters }, (_, i) => chapterLabel(i + 1));
  const sessions = planExam({ id: 'draft', subject: req.subjectName, date: examDate, chapters }, ctx.today);
  const dates = Array.from(new Set(sessions.map(s => s.date))).sort();
  const days = dates.map(date => {
    const list = sessions.filter(s => s.date === date);
    return { date, sessions: list, minutes: list.reduce((a, s) => a + s.minutes, 0) };
  });

  // Existing work in the same window (excluding the plan being replaced).
  const window = (d: DateKey) => d >= ctx.today && d < examDate;
  const others = ctx.sessions.filter(s => !s.done && window(s.date) && s.examId !== req.replacesExamId);
  const otherTasks = ctx.tasks.filter(t => !t.done && window(t.plannedFor ?? t.due));
  const otherMin = others.reduce((a, s) => a + s.minutes, 0) + otherTasks.reduce((a, t) => a + t.estimateMin, 0);
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  const span = Math.max(1, req.inDays);
  const perDay = Math.round((total + otherMin) / span / 5) * 5;
  const capacity = ctx.dailyMinutes ?? DEFAULT_DAILY_MIN;

  const reasons: PlanReason[] = [{ code: 'start', days: req.inDays }];
  if (sessions.some(s => s.kind === 'review')) reasons.push({ code: 'spacing' });
  if (sessions.some(s => s.kind === 'mock')) reasons.push({ code: 'mock' });
  reasons.push({ code: 'perDay', minutes: perDay, capacity, over: perDay > capacity });
  if (others.length + otherTasks.length) reasons.push({ code: 'around', items: others.length + otherTasks.length });

  return { req, examDate, chapters, sessions, days, reasons };
}
