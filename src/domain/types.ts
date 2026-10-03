// NAZZIM academic domain. Everything the product knows about a student's semester lives in these types;
// UI, engine, AI and sync layers all read and write the same shapes.
import type { ExamItem, StudySession } from '../lib/exams';

export type DateKey = string; // 'YYYY-MM-DD', local calendar day

export type SubjectColor = 'indigo' | 'green' | 'amber' | 'sky' | 'rose' | 'teal' | 'violet';
export type SubjectIcon = 'chart' | 'function' | 'atom' | 'code' | 'book' | 'flask' | 'globe' | 'pen';

export type Subject = {
  id: string;
  name: string;
  color: SubjectColor;
  icon: SubjectIcon;
  targetGrade: string; // 'A', 'A-', 'B+'…
  difficulty?: 1 | 2 | 3; // how hard the student finds it (weights planning)
};

export type Task = {
  id: string;
  subjectId?: string;
  title: string;
  due: DateKey;
  estimateMin: number;
  done: boolean;
  doneAt?: DateKey;
  plannedFor?: DateKey; // the day the student (or Rescue Mode) chose to work on it; `due` stays the real deadline
  priority?: TaskPriority; // the student's own judgement; absent = normal
  notes?: string; // free text the student wrote. Stays on the device and in their own sync rows — never in analytics.
};

export type TaskPriority = 'high' | 'normal' | 'low';

// The day a task sits on the schedule: where it was planned, else its due date.
export const workDay = (t: Task): DateKey => t.plannedFor ?? t.due;

// Exams keep the engine's shape (subject name, date, chapters) and point at their subject.
export type Exam = ExamItem & { subjectId?: string };
export type Session = StudySession;

export type AcademicContext = {
  today: DateKey;
  subjects: Subject[];
  tasks: Task[];
  exams: Exam[];
  sessions: Session[];
  dailyMinutes?: number; // how much the student can study on a normal day (default 120)
};
