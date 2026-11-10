"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import {
  buildDemoSessions,
  demoAnswers,
  demoAssistant,
  demoCommitments,
  demoCourses,
  demoGoals,
  demoMilestones,
  demoNotifications,
  demoPrefs,
  demoProfile,
  emptyAnswers,
  shiftedMilestones,
} from "./mock-data";
import type {
  AssistantSettings,
  Commitment,
  Course,
  Goal,
  Milestone,
  NotificationSettings,
  OnboardingAnswers,
  OnboardingStep,
  PlanStatus,
  Profile,
  StudyPrefs,
  StudySession,
  Toast,
} from "./types";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ThemeSync } from "@/components/ui/theme-toggle";
import { takePendingName } from "./auth";
import { auth, db } from "./firebase";
import { isPast } from "./selectors";
import { emptySetup, type SetupData } from "./setup";
import type { Entry, Library, ResumeData, TimelineEvent } from "./free";
import type { Learning } from "./learn";
import type { MaterialMeta } from "./materials";
import type { ChatLock, ChatMeta } from "./chats";
import type { InterviewRecord } from "./interview";
import type { NoteSet } from "./notes";
import type { ProjectIdea } from "./project-shared";
import type { CodingState } from "./coding/types";
import type { TestRecord } from "./tests";
import { TODAY, addDays, uid, weekStart } from "./utils";

/* ------------------------------------------------------------------
   App state. Everything lives in the browser for now (mock data +
   localStorage). When the backend is added, each action below becomes
   an API call and the reducer just stores what the server returns.
------------------------------------------------------------------ */

export interface AppState {
  version: number;
  profile: Profile;
  prefs: StudyPrefs;
  notifications: NotificationSettings;
  assistant: AssistantSettings;
  commitments: Commitment[];
  goals: Goal[];
  courses: Course[];
  milestones: Milestone[];
  sessions: StudySession[];
  planStatus: PlanStatus;
  planAcceptedOn?: string;
  /** Monday of week 1 of the plan */
  planStart?: string;
  onboarding: { step: OnboardingStep; answers: OnboardingAnswers; done: boolean };
  /** Profile setup (academic, goals, skills, assessment). Missing on older accounts. */
  setup?: SetupData;
  /** Free-version features */
  library?: Library;
  entries?: Entry[];
  timeline?: TimelineEvent[];
  resume?: ResumeData;
  /** Video courses: module progress, notes, quiz results, certificates */
  learning?: Learning;
  /** Uploaded study materials (names only; text is stored separately) */
  materials?: MaterialMeta[];
  /** Saved AI Assistant chats (titles only; messages are stored separately) */
  chats?: ChatMeta[];
  /** PIN for locked chats (salted hash) */
  chatLock?: ChatLock;
  /** Premium: past mock interviews (newest first) */
  interviews?: InterviewRecord[];
  /** Premium: past mock tests (newest first) */
  tests?: TestRecord[];
  /** Premium: AI notes and flashcards (newest first) */
  notes?: NoteSet[];
  /** Coding practice: solved problems, attempts and drafts */
  coding?: CodingState;
  /** project ideas suggested for this student (AI), and the profile they were made for */
  projectIdeas?: { key: string; ideas: ProjectIdea[] };
  /** asked to be told when Placement opportunities opens (ms) */
  placementNotify?: number;
  toasts: Toast[];
  chatMinimized: boolean;
  theme: "dark" | "light";
}

const VERSION = 2;

export function demoState(): AppState {
  return {
    version: VERSION,
    profile: demoProfile,
    prefs: demoPrefs,
    notifications: demoNotifications,
    assistant: demoAssistant,
    commitments: demoCommitments,
    goals: demoGoals,
    courses: demoCourses,
    milestones: demoMilestones,
    sessions: buildDemoSessions(),
    planStatus: "accepted",
    planAcceptedOn: "2026-10-26",
    planStart: "2026-10-26",
    onboarding: { step: 5, answers: demoAnswers, done: true },
    toasts: [],
    chatMinimized: false,
    theme: "dark",
  };
}

export function newUserState(name: string, email: string): AppState {
  return {
    ...demoState(),
    profile: { ...demoProfile, name, email, college: "", year: "", degree: "" },
    prefs: { hours: "5-8", times: [], sessionLength: 60, restDay: "sunday" },
    commitments: [],
    goals: [],
    courses: [],
    milestones: [],
    sessions: [],
    planStatus: "none",
    planAcceptedOn: undefined,
    planStart: undefined,
    onboarding: { step: 0, answers: emptyAnswers(name), done: false },
  };
}

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "plan/restart" }
  | { type: "reset"; state: AppState }
  | { type: "profile"; patch: Partial<Profile> }
  | { type: "prefs"; patch: Partial<StudyPrefs> }
  | { type: "notifications"; patch: Partial<NotificationSettings> }
  | { type: "assistant"; patch: Partial<AssistantSettings> }
  | { type: "theme"; theme: AppState["theme"] }
  | { type: "onboarding/answers"; patch: Partial<OnboardingAnswers> }
  | { type: "onboarding/step"; step: OnboardingStep }
  | { type: "plan/suggest"; plan?: { sessions: StudySession[]; milestones: Milestone[] } }
  | { type: "plan/accept" }
  | { type: "plan/status"; status: PlanStatus }
  | { type: "session/update"; id: string; patch: Partial<StudySession> }
  | { type: "session/add"; session: StudySession }
  | { type: "session/remove"; id: string }
  | { type: "session/toggleTask"; id: string; taskId: string }
  | { type: "goal/add"; goal: Goal; course?: Course }
  | { type: "goal/update"; id: string; patch: Partial<Goal> }
  | { type: "goal/remove"; id: string }
  | { type: "commitments"; commitments: Commitment[] }
  | { type: "toast/push"; toast: Toast }
  | { type: "toast/dismiss"; id: string }
  | { type: "chat/minimized"; value: boolean }
  | { type: "setup"; patch: Partial<SetupData> }
  | { type: "patch"; patch: Partial<AppState> };

function sortSessions(list: StudySession[]) {
  return [...list].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
    case "reset":
      return action.state;
    case "profile":
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case "prefs":
      return { ...state, prefs: { ...state.prefs, ...action.patch } };
    case "notifications":
      return { ...state, notifications: { ...state.notifications, ...action.patch } };
    case "assistant":
      return { ...state, assistant: { ...state.assistant, ...action.patch } };
    case "theme":
      return { ...state, theme: action.theme };
    case "onboarding/answers":
      return { ...state, onboarding: { ...state.onboarding, answers: { ...state.onboarding.answers, ...action.patch } } };
    case "onboarding/step":
      return { ...state, onboarding: { ...state.onboarding, step: action.step } };
    case "plan/suggest": {
      // The plan comes from the AI planner (lib/planner.ts); the demo plan is only a last resort.
      const a = state.onboarding.answers;
      const start = weekStart(TODAY);
      const [courseName, platform = ""] = (a.course || "Your course").split(" — ");
      const goalId = state.goals.find((g) => g.hasPlan)?.id ?? uid("g");
      const sessions = action.plan
        ? action.plan.sessions.map((s) => ({ ...s, goalId, id: uid("s") }))
        : buildDemoSessions(goalId, start)
            .filter((s) => !isPast(s) && s.status !== "suggested")
            .map((s) => ({ ...s, status: s.status === "buffer" ? ("buffer" as const) : ("planned" as const), studiedMinutes: undefined, tasks: s.tasks.map((t) => ({ ...t, done: false })), notes: "" }));
      const weeks = action.plan ? Math.max(1, ...sessions.map((s) => s.week)) : undefined;
      const planStart = action.plan && sessions.length ? addDays(weekStart(sessions[0].date), -(sessions[0].week - 1) * 7) : start;
      const last = sessions[sessions.length - 1]?.date ?? a.target;
      const goal: Goal = {
        ...demoGoals[0],
        id: goalId,
        type: a.goalType || "course",
        title: a.goal || `Finish ${courseName}`,
        shortTitle: a.goal || courseName,
        course: courseName.trim(),
        platform: platform.replace(/^on /i, "").trim() || "Self-paced",
        target: a.target || last,
        planEnds: last,
        currentWeek: 1,
        progressPct: 0,
        ...(weeks ? { totalWeeks: weeks, sessionsPerWeek: Math.round(sessions.length / weeks), hoursPerWeek: `~${((sessions.length / weeks) * a.sessionLength / 60).toFixed(1).replace(".0", "")} h` } : {}),
      };
      return {
        ...state,
        profile: {
          ...state.profile,
          name: a.name || state.profile.name,
          college: a.college || state.profile.college,
          year: a.year || state.profile.year,
          degree: a.degree || state.profile.degree,
        },
        prefs: {
          hours: a.hours || state.prefs.hours,
          times: a.times.length ? a.times : state.prefs.times,
          sessionLength: a.sessionLength,
          restDay: a.restDay,
        },
        commitments: a.commitments.length ? a.commitments : state.commitments,
        goals: [goal, ...state.goals.filter((g) => g.id !== goal.id)],
        courses: [{ id: uid("co"), name: courseName.trim(), meta: platform || "Self-paced", goalId }, ...state.courses.filter((c) => c.goalId !== goalId)],
        milestones: action.plan ? action.plan.milestones : shiftedMilestones(start),
        sessions,
        planStatus: "suggested",
        planStart,
        onboarding: { ...state.onboarding, step: 5, done: true },
      };
    }
    case "plan/restart":
      return {
        ...state,
        goals: state.goals.filter((g) => !g.hasPlan),
        sessions: [],
        milestones: [],
        planStatus: "none",
        planStart: undefined,
        planAcceptedOn: undefined,
        onboarding: { step: 0, answers: emptyAnswers(state.profile.name), done: false },
      };
    case "plan/accept":
      return { ...state, planStatus: "accepted", planAcceptedOn: TODAY };
    case "plan/status":
      return { ...state, planStatus: action.status };
    case "session/update":
      return {
        ...state,
        sessions: sortSessions(state.sessions.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s))),
      };
    case "session/add":
      return { ...state, sessions: sortSessions([...state.sessions, action.session]) };
    case "session/remove":
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };
    case "session/toggleTask":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id
            ? { ...s, tasks: s.tasks.map((t) => (t.id === action.taskId ? { ...t, done: !t.done } : t)) }
            : s,
        ),
      };
    case "goal/add":
      return {
        ...state,
        goals: [...state.goals, action.goal],
        courses: action.course ? [...state.courses, action.course] : state.courses,
      };
    case "goal/update":
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case "goal/remove":
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        courses: state.courses.filter((c) => c.goalId !== action.id),
      };
    case "commitments":
      return { ...state, commitments: action.commitments };
    case "toast/push":
      return { ...state, toasts: [...state.toasts.slice(-2), action.toast] };
    case "toast/dismiss":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    case "patch":
      return { ...state, ...action.patch };
    case "setup":
      return { ...state, setup: { ...(state.setup ?? emptySetup()), ...action.patch } };
    case "chat/minimized":
      return { ...state, chatMinimized: action.value };
    default:
      return state;
  }
}

function makeActions(dispatch: React.Dispatch<Action>) {
  const toast = (message: string) => {
    const id = uid("toast");
    dispatch({ type: "toast/push", toast: { id, message } });
    setTimeout(() => dispatch({ type: "toast/dismiss", id }), 6000);
  };
  return {
    toast,
    dismissToast: (id: string) => dispatch({ type: "toast/dismiss", id }),
    restartPlan: () => dispatch({ type: "plan/restart" }),
    setProfile: (patch: Partial<Profile>) => dispatch({ type: "profile", patch }),
    setPrefs: (patch: Partial<StudyPrefs>) => dispatch({ type: "prefs", patch }),
    setNotifications: (patch: Partial<NotificationSettings>) => dispatch({ type: "notifications", patch }),
    setAssistant: (patch: Partial<AssistantSettings>) => dispatch({ type: "assistant", patch }),
    setTheme: (theme: AppState["theme"]) => dispatch({ type: "theme", theme }),
    setAnswers: (patch: Partial<OnboardingAnswers>) => dispatch({ type: "onboarding/answers", patch }),
    setStep: (step: OnboardingStep) => dispatch({ type: "onboarding/step", step }),
    suggestPlan: (plan?: { sessions: StudySession[]; milestones: Milestone[] }) => dispatch({ type: "plan/suggest", plan }),
    acceptPlan: () => dispatch({ type: "plan/accept" }),
    setPlanStatus: (status: PlanStatus) => dispatch({ type: "plan/status", status }),
    updateSession: (id: string, patch: Partial<StudySession>) => dispatch({ type: "session/update", id, patch }),
    addSession: (session: StudySession) => dispatch({ type: "session/add", session }),
    removeSession: (id: string) => dispatch({ type: "session/remove", id }),
    toggleTask: (id: string, taskId: string) => dispatch({ type: "session/toggleTask", id, taskId }),
    addGoal: (goal: Goal, course?: Course) => dispatch({ type: "goal/add", goal, course }),
    updateGoal: (id: string, patch: Partial<Goal>) => dispatch({ type: "goal/update", id, patch }),
    removeGoal: (id: string) => dispatch({ type: "goal/remove", id }),
    setCommitments: (commitments: Commitment[]) => dispatch({ type: "commitments", commitments }),
    setChatMinimized: (value: boolean) => dispatch({ type: "chat/minimized", value }),
    setSetup: (patch: Partial<SetupData>) => dispatch({ type: "setup", patch }),
    /** Replace top-level parts of the state (library, entries, timeline, resume). */
    patch: (patch: Partial<AppState>) => dispatch({ type: "patch", patch }),
  };
}

export type Actions = ReturnType<typeof makeActions>;

export type SyncStatus = "loading" | "signed-out" | "ready";

const StoreContext = createContext<{ state: AppState; actions: Actions; status: SyncStatus; uid: string | null } | null>(null);

/** Theme chosen on this device before logging in (see ThemeSync). */
function savedTheme(): AppState["theme"] {
  try {
    return localStorage.getItem("studentos:theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Firestore rejects `undefined`; a JSON round-trip drops those fields. */
const clean = (s: AppState) => JSON.parse(JSON.stringify({ ...s, toasts: [] })) as AppState;

/** Sessions whose time has passed without being finished become “missed”. */
function markMissed(s: AppState): AppState {
  return { ...s, toasts: [], sessions: s.sessions.map((x) => (x.status === "planned" && isPast(x) ? { ...x, status: "missed" as const } : x)) };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ ...newUserState("", ""), theme: savedTheme() }));
  const actions = useMemo(() => makeActions(dispatch), []);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [uid, setUid] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Follow the signed-in user and load their data from users/{uid}.
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      loadedFor.current = null;
      if (!user) {
        setUid(null);
        dispatch({ type: "reset", state: { ...newUserState("", ""), theme: savedTheme() } });
        setStatus("signed-out");
        return;
      }
      setStatus("loading");
      setUid(user.uid);
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        let data: AppState;
        if (snap.exists() && (snap.data() as AppState).version === VERSION) {
          data = markMissed(snap.data() as AppState);
        } else {
          data = { ...newUserState(user.displayName || takePendingName(), user.email ?? ""), theme: savedTheme() };
          await setDoc(ref, clean(data));
        }
        dispatch({ type: "hydrate", state: data });
        loadedFor.current = user.uid;
        setStatus("ready");
      } catch (err) {
        console.error("Couldn’t load your data", err);
        dispatch({ type: "hydrate", state: newUserState(user.displayName ?? "", user.email ?? "") });
        setStatus("ready");
        actions.toast("Couldn’t load your saved data. Check your connection and refresh.");
      }
    });
  }, [actions]);

  // Save changes to Firestore, at most about once a second.
  useEffect(() => {
    if (status !== "ready" || !uid || loadedFor.current !== uid) return;
    const t = setTimeout(() => {
      setDoc(doc(db, "users", uid), clean(state)).catch((err) => {
        console.error("Save failed", err);
        actions.toast("Couldn’t save your last change. Check your connection.");
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [state, status, uid, actions]);

  const value = useMemo(() => ({ state, actions, status, uid }), [state, actions, status, uid]);
  return (
    <StoreContext.Provider value={value}>
      <ThemeSync />
      {status === "loading" ? (
        <div className="flex min-h-screen items-center justify-center bg-ink">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" aria-label="Loading" />
        </div>
      ) : (
        children
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
