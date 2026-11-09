"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* Learning Resources was merged into Learning (/learn). Old links land there. */
export default function ResourcesRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/learn"), [router]);
  return null;
}
