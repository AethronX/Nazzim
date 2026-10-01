// AI orchestration layer. Screens never build prompts or call a model directly: they call these operations
// and get structured data back. Today every operation runs on the local, deterministic engine (instant,
// offline, free). A remote provider (an LLM behind a Supabase Edge Function, so no API key ships in the app)
// can replace any single operation later without touching the UI, and can fall back to the local one on error.
import type { AcademicContext, Exam } from '../domain/types';
import { analyzeAcademicLoad, recommendNextAction, type AcademicLoad, type NextAction } from '../engine/academic';
import { parsePlanRequest, proposePlan, type ParseResult, type PlanProposal, type PlanRequest } from './planner';
import { assessBehind, generateRescuePlan, type BehindStatus, type RescuePlan } from '../engine/rescue';
import { planExam, readiness, type ExamItem, type StudySession } from '../lib/exams';

export type StudyPlanRequest = { exam: ExamItem; today: string };
export type StudyPlan = { sessions: StudySession[]; source: 'local' | 'remote' };
export type ExamReadiness = { examId: string; score: number };

export interface AcademicAI {
  recommendNextAction(ctx: AcademicContext, chapterTitle: (s: StudySession, e?: Exam) => string): NextAction;
  analyzeAcademicLoad(ctx: AcademicContext, from: string, span?: number): AcademicLoad;
  generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlan>;
  analyzeExamReadiness(exam: Exam, sessions: StudySession[]): ExamReadiness;
  assessBehind(ctx: AcademicContext): BehindStatus;
  generateRescuePlan(ctx: AcademicContext, horizon?: number): RescuePlan;
  parsePlanRequest(text: string, ctx: AcademicContext): ParseResult;
  proposePlan(req: PlanRequest, ctx: AcademicContext, chapterLabel: (n: number) => string): PlanProposal;
}

export const localAI: AcademicAI = {
  recommendNextAction,
  analyzeAcademicLoad,
  async generateStudyPlan({ exam, today }) {
    return { sessions: planExam(exam, today), source: 'local' };
  },
  analyzeExamReadiness(exam, sessions) {
    return { examId: exam.id, score: readiness(exam, sessions) };
  },
  assessBehind: ctx => assessBehind(ctx),
  generateRescuePlan,
  parsePlanRequest,
  proposePlan,
};

// Single switch point for the provider.
export const ai: AcademicAI = localAI;
