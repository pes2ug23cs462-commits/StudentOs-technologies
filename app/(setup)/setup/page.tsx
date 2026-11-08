"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

const PATHS = ["/setup/academic", "/setup/academic", "/setup/goals", "/setup/skills", "/setup/review", "/setup/assessment", "/setup/plan"];

/* /setup → the furthest step the student has reached. */
export default function SetupIndex() {
  const router = useRouter();
  const { state } = useStore();
  useEffect(() => {
    router.replace(PATHS[Math.min(state.setup?.reached ?? 1, 6)]);
  }, [router, state.setup?.reached]);
  return null;
}
