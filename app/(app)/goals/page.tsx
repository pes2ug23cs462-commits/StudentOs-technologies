"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* My goals now lives in Learning, as its own tab. Old links land there. */
export default function GoalsRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/learn?tab=goals"), [router]);
  return null;
}
