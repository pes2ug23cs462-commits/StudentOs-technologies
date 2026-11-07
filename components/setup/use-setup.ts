"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { emptySetup, type SetupData } from "@/lib/setup";

/** Current setup answers plus typed setters for each section. */
export function useSetup() {
  const { state, actions } = useStore();
  const setup: SetupData = { ...emptySetup(), ...state.setup };
  return {
    setup,
    profileName: state.profile.name,
    setAcademic: (patch: Partial<SetupData["academic"]>) => actions.setSetup({ academic: { ...setup.academic, ...patch } }),
    setGoals: (patch: Partial<SetupData["goals"]>) => actions.setSetup({ goals: { ...setup.goals, ...patch } }),
    setSkills: (patch: Partial<SetupData["skills"]>) => actions.setSetup({ skills: { ...setup.skills, ...patch } }),
    setAnswer: (q: string, a: string) => actions.setSetup({ assessment: { ...setup.assessment, [q]: a } }),
    reach: (n: number) => n > setup.reached && actions.setSetup({ reached: n }),
    finish: () => actions.setSetup({ assessmentDone: true, reached: 5 }),
    actions,
  };
}

export const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const STEP_PATHS = ["", "/setup/academic", "/setup/goals", "/setup/skills", "/setup/review", "/setup/assessment", "/setup/plan"];

/** Sends the student back to the furthest step they’ve unlocked. Returns true when this step is allowed. */
export function useStepGuard(step: number) {
  const router = useRouter();
  const { state } = useStore();
  const reached = state.setup?.reached ?? 1;
  const allowed = step <= reached;
  useEffect(() => {
    if (!allowed) router.replace(STEP_PATHS[Math.min(reached, 6)]);
  }, [allowed, reached, router]);
  return allowed;
}
