"use client";

/* /notes moved into Learning → My materials → AI Notes. Kept so old links still work. */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotesRedirect() {
  const router = useRouter();
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic");
    router.replace(`/learn?tab=materials&m=notes${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`);
  }, [router]);
  return null;
}
