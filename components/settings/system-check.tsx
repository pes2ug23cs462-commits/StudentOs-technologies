"use client";

/* Settings → System check (/settings/system). Calls /api/health and shows whether
   each key in .env.local works. Meant for the team; not linked in the menu. */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, RefreshIcon, XIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type Check = { id: string; label: string; ok: boolean; optional?: boolean; detail: string };

const MANUAL = [
  "AI assistant: open Assistant, ask “Explain recursion in Hindi”. The reply should come in Hindi.",
  "Files: attach a PDF and ask “Summarise this”. Then attach a photo of notes and ask about it.",
  "Voice: click the mic, pick ಕನ್ನಡ / हिन्दी / English, speak, stop. The text should appear in the box.",
  "YouTube: open Learning → Popular videos. Videos with views should load; open one and it should play inside StudentOS.",
  "Course: start a course lesson, skip to the end — it must NOT mark done. Watch normally and it should.",
  "Study plan: Settings → Account & privacy → Start my plan over. Finish the chat and check the sessions have real topics of your course.",
  "Study materials: upload a PDF, click Quick revision — a 5-question quiz should appear.",
];

export function SystemCheck() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please log in again.");
      const res = await fetch("/api/health", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.status === 404) throw new Error("The /api/health route isn’t running. Restart npm run dev.");
      const j = (await res.json().catch(() => ({}))) as { checks?: Check[]; error?: string };
      if (!res.ok || !j.checks) throw new Error(j.error === "signed-out" ? "Please log in again." : `Check failed (${res.status}).`);
      setChecks(j.checks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  };

  const required = checks?.filter((c) => !c.optional) ?? [];
  const allOk = checks && required.every((c) => c.ok);

  return (
    <>
      <Card glow className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[14.5px] font-semibold text-white">System check</h2>
            <p className="mt-1.5 text-[11.5px] text-white/50">Tests the AI, voice and YouTube keys from .env.local with tiny real calls. Keys are never shown.</p>
          </div>
          <Button size="sm" onClick={run} disabled={busy} icon={<RefreshIcon size={13} className={busy ? "animate-spin" : ""} />}>
            {busy ? "Checking…" : checks ? "Run again" : "Run check"}
          </Button>
        </div>
        {error && <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">{error}</p>}
        {checks && (
          <>
            <p className={cn("mt-4 text-[12.5px] font-medium", allOk ? "text-emerald-300" : "text-amber-200")}>
              {allOk ? "Everything needed is working." : "Something needs fixing — see the red rows."}
            </p>
            <ul className="mt-3 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-3.5 py-3">
                  {c.ok ? (
                    <CheckCircleIcon size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  ) : (
                    <XIcon size={16} className={cn("mt-0.5 shrink-0", c.optional ? "text-white/40" : "text-rose-400")} />
                  )}
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-white">
                      {c.label}
                      {c.optional && <span className="ml-2 text-[10.5px] font-normal text-white/40">optional</span>}
                    </p>
                    <p className={cn("mt-0.5 text-[11.5px] break-words", c.ok ? "text-white/50" : c.optional ? "text-white/45" : "text-rose-200/90")}>{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <Card glow className="p-5">
        <h2 className="text-[14.5px] font-semibold text-white">Test by hand</h2>
        <p className="mt-1.5 text-[11.5px] text-white/50">After the check is green, try these once in the app.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[12.5px] text-white/75">
          {MANUAL.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ol>
      </Card>
    </>
  );
}
