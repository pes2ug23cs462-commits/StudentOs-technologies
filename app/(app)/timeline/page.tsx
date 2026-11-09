"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* College timeline now lives in Schedule, as its own tab. Old links land there. */
export default function TimelineRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/schedule?tab=timeline"), [router]);
  return null;
}
