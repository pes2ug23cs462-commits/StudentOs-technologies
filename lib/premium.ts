/* Premium plan: price, what it includes, and the student's status (decided by the server). */

import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { useStore } from "./store";

export const PREMIUM_PRICE = 99; // ₹ per month

export const PREMIUM_FEATURES: { title: string; text: string; ready: boolean; href: string }[] = [
  { title: "AI mock interviews", text: "Practise technical, behavioral and job-role interviews by typing or speaking, with scores and feedback.", ready: true, href: "/interview" },
  { title: "Unlimited certificates", text: "A certificate for every course you pass (Free includes 2).", ready: true, href: "/settings/certificates" },
  { title: "Mock tests and analytics", text: "Timed AI mock tests for your subjects and exams, with weak topics and progress reports.", ready: true, href: "/tests" },
  { title: "AI resume builder", text: "AI writes your summary and project points for a job description, with an ATS score and missing keywords.", ready: true, href: "/resume" },
  { title: "Placement opportunities", text: "Internships and jobs matched to your profile and skills, with an application tracker. Coming soon.", ready: false, href: "/placement" },
  { title: "AI notes and revision", text: "Short notes and flashcards from any topic or file, with a revision plan.", ready: true, href: "/learn?tab=materials&m=notes" },
];

let cached: { uid: string; premium: boolean } | null = null;

/** The signed-in student's Premium status. */
export function usePremium() {
  const { uid, status } = useStore();
  const [state, setState] = useState<{ loading: boolean; premium: boolean }>(() => (cached && cached.uid === uid ? { loading: false, premium: cached.premium } : { loading: true, premium: false }));
  useEffect(() => {
    if (status !== "ready" || !uid) return;
    if (cached?.uid === uid) return setState({ loading: false, premium: cached.premium });
    let alive = true;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/premium", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const j = (await res.json().catch(() => ({}))) as { premium?: boolean };
        cached = { uid, premium: !!j.premium };
      } catch {
        cached = { uid, premium: false };
      }
      if (alive) setState({ loading: false, premium: cached!.premium });
    })();
    return () => {
      alive = false;
    };
  }, [uid, status]);
  return state;
}
