"use client";

/* “Project ideas for you”: picked by AI from the student's skills, past
   projects, interests and level (kept until those change), with the built-in
   list as a fallback. */

import { useEffect, useMemo, useRef, useState } from "react";
import { BulbIcon, RefreshIcon, SparkleIcon } from "@/components/ui/icons";
import { Card, Pill } from "@/components/ui/primitives";
import { fallbackIdeas, ideasKey, ideasProfile, suggestIdeas, type ProjectIdea } from "@/lib/projects-ai";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function IdeasCard({ onStart, onBuild }: { onStart: (i: ProjectIdea) => void; onBuild: (i: ProjectIdea) => void }) {
  const { state, actions } = useStore();
  const entries = useMemo(() => state.entries ?? [], [state.entries]);
  const profile = useMemo(() => ideasProfile(state.setup, entries, (state.resume?.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean)), [state.setup, entries, state.resume]);
  const key = ideasKey(profile);
  const saved = state.projectIdeas;
  const [busy, setBusy] = useState(false);
  const tried = useRef("");

  const load = async () => {
    setBusy(true);
    try {
      const ideas = await suggestIdeas(profile);
      if (ideas.length) actions.patch({ projectIdeas: { key, ideas } });
    } catch {
      /* keep what we have; the built-in ideas show meanwhile */
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (saved?.key === key || tried.current === key) return;
    tried.current = key;
    void load();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromAi = !!saved?.ideas.length;
  const ideas = fromAi ? saved!.ideas : fallbackIdeas(state.setup);
  const done = new Set(entries.map((e) => e.title.toLowerCase()));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <BulbIcon size={15} className="text-amber-400" /> Project ideas for you
          </p>
          <p className="mt-0.5 text-[12px] text-white/50">{fromAi ? "Picked from your skills and what you’ve already built." : "Based on your interests and level."}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} aria-label="Suggest new ideas" title="Suggest new ideas" className="rounded-md p-1.5 text-white/45 hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
          <RefreshIcon size={14} className={cn(busy && "animate-spin")} />
        </button>
      </div>
      <ul className="mt-3 space-y-2.5">
        {busy && !fromAi
          ? Array.from({ length: 3 }, (_, i) => <li key={i} className="h-[104px] animate-pulse rounded-xl bg-white/[0.04]" />)
          : ideas.map((p) => (
              <li key={p.title} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 transition-colors hover:border-white/15">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold text-white">{p.title}</p>
                  <Pill tone={p.level === "beginner" ? "green" : p.level === "intermediate" ? "cyan" : "violet"}>{p.level}</Pill>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-white/60">{p.sub}</p>
                {p.why && <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--cyan)]">{p.why}</p>}
                {p.skills.length > 0 && <p className="mt-1.5 text-[11px] text-white/40">{p.skills.join(" · ")}</p>}
                {done.has(p.title.toLowerCase()) ? (
                  <p className="mt-2 text-[12px] text-emerald-400">Added to your projects</p>
                ) : (
                  <div className="mt-2.5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => onBuild(p)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline">
                      <SparkleIcon size={11} /> Build it with AI
                    </button>
                    <button type="button" onClick={() => onStart(p)} className="text-[12px] text-white/55 hover:text-white">
                      Just add it
                    </button>
                  </div>
                )}
              </li>
            ))}
      </ul>
    </Card>
  );
}
