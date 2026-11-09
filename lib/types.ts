/* Shared data shapes. The mock store and (later) the Firebase backend both use these. */

export type HoursRange = "under-3" | "3-5" | "5-8" | "8-plus";
export type StudyTime = "early-mornings" | "afternoons" | "evenings" | "weekends";
export type RestDay = "sunday" | "saturday" | "none";
export type AcademicYear = "1st year" | "2nd year" | "3rd year" | "4th year" | "Other";
export type GoalType = "course" | "exam" | "skill" | "project";

export interface Profile {
  name: string;
  email: string;
  college: string;
  year: AcademicYear | "";
  degree: string;
  timezone: string;
  language: string;
  /** small JPEG data URL (about 200×200), stored with the profile */
  photo?: string;
}

export interface Commitment {
  id: string;
  name: string;
  /** 0 = Monday … 6 = Sunday */
  days: number[];
  start: string; // "09:00"
  end: string; // "16:30"
}

export interface Task {
  id: string;
  label: string;
  detail?: string;
  done: boolean;
}

export type SessionStatus = "planned" | "completed" | "missed" | "suggested" | "buffer";
export type Priority = "Core" | "High" | "Buffer";

export interface StudySession {
  id: string;
  goalId: string;
  /** e.g. "Lecture 1 · Functions, variables" */
  title: string;
  /** Short label used in the calendar + tables, e.g. "Lecture 1 · Functions" */
  short: string;
  /** e.g. "Watch lecture · take notes" */
  summary: string;
  objective: string;
  week: number;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  minutes: number;
  priority: Priority;
  status: SessionStatus;
  tasks: Task[];
  notes: string;
  countsToward: string;
  rescheduled?: boolean;
  /** Minutes actually studied (set when a session is finished). */
  studiedMinutes?: number;
  feeling?: "too-easy" | "about-right" | "too-hard";
  /** StudentOS video course to open when the session starts */
  courseId?: string;
  /** uploaded study material to open when the session starts */
  materialId?: string;
}

export interface Milestone {
  id: string;
  label: string; // "Weeks 0–2"
  title: string; // "Functions → Loops"
  due: string; // YYYY-MM-DD
}

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  shortTitle: string;
  course: string;
  platform: string;
  target: string; // YYYY-MM-DD
  /** Set once a plan is accepted for this goal */
  planEnds?: string;
  hasPlan: boolean;
  totalWeeks?: number;
  currentWeek?: number;
  progressPct?: number;
  hoursPerWeek?: string;
  sessionsPerWeek?: number;
  examDate?: string;
  revisionHours?: number;
  topics?: { label: string; selected: boolean }[];
  /** StudentOS video course this goal is learned with */
  courseId?: string;
}

export interface Course {
  id: string;
  name: string;
  meta: string;
  goalId?: string;
}

export interface StudyPrefs {
  hours: HoursRange;
  times: StudyTime[];
  sessionLength: 45 | 60 | 90;
  restDay: RestDay;
  spread?: "even" | "weekends" | "front-load";
}

export interface NotificationSettings {
  beforeSession: boolean;
  howEarly: 10 | 30 | 60;
  missedSuggestions: boolean;
  morningPlan: boolean;
  weeklySummary: boolean;
  push: boolean;
  email: boolean;
}

export interface AssistantSettings {
  tone: "encouraging" | "direct" | "detailed";
  openOnLogin: boolean;
  autoReschedule: boolean;
  askBeforeChanging: boolean;
  useSchedule: boolean;
  useProgress: boolean;
  useCalendar: boolean;
}

export interface OnboardingAnswers {
  name: string;
  college: string;
  year: AcademicYear | "";
  degree: string;
  goalType: GoalType | "";
  goal: string;
  course: string;
  progress: string;
  target: string; // YYYY-MM-DD or ""
  hours: HoursRange | "";
  commitments: Commitment[];
  times: StudyTime[];
  sessionLength: 45 | 60 | 90;
  restDay: RestDay;
}

/** 0 = welcome, 1–4 = form steps, 5 = summary / plan */
export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export type PlanStatus = "none" | "suggested" | "accepted";

export interface Toast {
  id: string;
  message: string;
}
