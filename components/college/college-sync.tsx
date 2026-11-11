"use client";

/* Keeps the summary a student shares with their college up to date.
   Runs quietly inside the app: when scores or activity change it writes the
   new summary (at most every 30 seconds), and once a day marks them active. */

import { useEffect, useRef } from "react";
import { buildSummary, pushSummary } from "@/lib/college";
import { useStore } from "@/lib/store";

export function CollegeSync() {
  const { state, uid } = useStore();
  const last = useRef<{ sig: string; at: number }>({ sig: "", at: 0 });
  const link = state.college;

  // what the college sees, without the timestamps
  const sig = link && uid ? JSON.stringify({ ...buildSummary(state, link, uid), updatedAt: 0, lastActive: 0 }) : "";

  useEffect(() => {
    if (!link || !uid || !sig) return;
    const day = new Date().toDateString();
    const fresh = sig !== last.current.sig || new Date(last.current.at).toDateString() !== day;
    if (!fresh) return;
    const wait = Math.max(3000, 30000 - (Date.now() - last.current.at));
    const t = setTimeout(() => {
      last.current = { sig, at: Date.now() };
      void pushSummary(state, uid, link).catch(() => {});
    }, last.current.at ? wait : 3000);
    return () => clearTimeout(t);
  }, [sig, link, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
