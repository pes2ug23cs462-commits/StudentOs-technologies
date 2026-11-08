"use client";

/* Practice Problems → one problem (the three-pane workspace). */

import { useParams } from "next/navigation";
import { Workspace } from "@/components/coding/workspace";

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  // a fresh workspace per problem, so drafts and results never mix
  return <Workspace key={id} id={id} />;
}
