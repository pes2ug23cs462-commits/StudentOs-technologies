"use client";

/* Practice Problems: opens the workspace on this student's first unsolved problem. */

import { Workspace } from "@/components/coding/workspace";
import { useMyProblems } from "@/lib/coding/personal";
import { useCoding } from "@/lib/coding/use-coding";

export default function CodePage() {
  const { coding } = useCoding();
  const mine = useMyProblems();
  const first = (mine.find((p) => !coding.solved[p.id]) ?? mine[0]).id;
  return <Workspace key={first} id={first} />;
}
