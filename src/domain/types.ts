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

// A graded component of a course: a quiz, midterm, lab, assignment, final. The grade engine reads these.
// `weight` is a PERCENT of the final course grade (25 means 25%), never a fraction — one convention everywhere.
// `source` keeps honest provenance: data the student confirmed from the official syllabus vs. entered vs. unconfirmed.
export type AssessmentStatus = 'upcoming' | 'inProgress' | 'submitted' | 'graded' | 'deferred';
export type AssessmentSource = 'official' | 'student' | 'unconfirmed';
export type Assessment = {
  id: string;
  subjectId: string;
  name: string;
  weight: number;        // percent of the final course grade, 0–100
  maxScore?: number;     // raw maximum of this assessment (e.g. 15)
  score?: number;        // raw achieved (e.g. 8); present only once graded
  due?: DateKey;
  status: AssessmentStatus;
  source: AssessmentSource;
  topicIds?: string[];   // topics this assessment covers, if known
  note?: string;
};

// One recorded mistake. The point is not to collect errors but to classify them: the same wrong answer for a
// different reason needs a different fix. `kind` is the spec's taxonomy; `retryOn` schedules the re-test.
export type ErrorKind = 'concept' | 'formula' | 'calculation' | 'interpretation' | 'rushing';
export type StudyError = {
  id: string;
  subjectId: string;
  topicId?: string;
  question: string;      // the question, or a description of the problem
  myAnswer?: string;
  correctAnswer?: string;
  kind: ErrorKind;
  cause?: string;        // why it happened, in the student's words
  fix?: string;          // the corrective action they chose
  retryOn?: DateKey;     // when to re-test it
  repeats: number;       // how many times this same mistake has come back
  resolved: boolean;
  createdAt: DateKey;
};

// A unit of content inside a course, tracked for mastery and spaced review — separate from task completion.
export type TopicStatus = 'new' | 'learning' | 'reviewed' | 'mastered';
export type Topic = {
  id: string;
  subjectId: string;
  name: string;
  status: TopicStatus;
  lastStudied?: DateKey;
  nextReview?: DateKey;
  reps: number;          // successful recalls in a row
  correct: number;       // lifetime correct answers
  wrong: number;         // lifetime wrong answers
  confidence?: 1 | 2 | 3;
  lastScore?: number;    // 0–1 on the last self-test
};

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
