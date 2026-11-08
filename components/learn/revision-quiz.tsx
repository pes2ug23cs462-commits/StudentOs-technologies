"use client";

/* Quick revision: a short multiple-choice quiz the AI makes from one of the
   student's materials. Practice mode: each answer is marked right away with a
   one-line reason, and there's no timer or certificate. */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon, XIcon } from "@/components/ui/icons";
import { AssistantError, makeRevisionQuiz, type RevisionQuestion } from "@/lib/assistant";
import { loadMaterialText, type MaterialMeta } from "@/lib/materials";
import { cn } from "@/lib/utils";

export function RevisionQuiz({ material, onClose }: { material: MaterialMeta; onClose: () => void }) {
  const [qs, setQs] = useState<RevisionQuestion[] | null>(null);
  const [error, setError] = useState("");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    setQs(null);
    setError("");
    setI(0);
    (async () => {
      try {
        const text = await loadMaterialText(material.id);
        // a different part of long notes each round
        const size = 12_000;
        const parts = Math.max(1, Math.ceil(text.length / size));
        const start = (round % parts) * size;
        const list = await makeRevisionQuiz(text.slice(start, start + size), material.name.replace(/\.[^.]+$/, ""));
        if (!alive) return;
        if (!list.length) throw new AssistantError("Couldn’t make questions from this file. Try again.");
        setQs(list);
        setPicked(list.map(() => null));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Couldn’t make the quiz.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [material.id, material.name, round]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = qs?.[i];
  const done = !!qs && i >= qs.length;
  const score = qs ? picked.filter((p, k) => p === qs[k].answer).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/70" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Quick revision" className="relative w-full max-w-[560px] rounded-2xl border border-white/10 bg-raised p-6 shadow-2xl">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-4 right-4 rounded-md p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white">
          <XIcon size={15} />
        </button>
        <p className="text-[11px] font-medium tracking-wide text-accent uppercase">Quick revision</p>
        <p className="mt-0.5 truncate pr-8 text-[15px] font-semibold text-white">{material.name}</p>

        {error ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-rose-300">{error}</p>
            <Button className="mt-4" onClick={() => setRound((r) => r + 1)}>
              Try again
            </Button>
          </div>
        ) : !qs ? (
          <div className="py-12 text-center">
            <p className="animate-pulse text-[13px] text-white/60">Making questions from your notes…</p>
          </div>
        ) : done ? (
          <div className="py-6 text-center">
            <p className="text-[30px] font-semibold text-white tabular-nums">
              {score}/{qs.length}
            </p>
            <p className="mt-1 text-[13px] text-white/60">{score === qs.length ? "Perfect! You know this well." : score >= qs.length / 2 ? "Good work. Revise the ones you missed." : "Worth another read of these notes."}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Done
              </Button>
              <Button variant="primary" onClick={() => setRound((r) => r + 1)}>
                New questions
              </Button>
            </div>
          </div>
        ) : (
          q && (
            <div className="mt-4">
              <div className="flex gap-1.5">
                {qs.map((_, k) => (
                  <span key={k} className={cn("h-1.5 flex-1 rounded-full", k < i ? (picked[k] === qs[k].answer ? "bg-accent" : "bg-rose-400/70") : k === i ? "bg-white/40" : "bg-white/10")} />
                ))}
              </div>
              <p className="mt-4 text-[11.5px] text-white/50">
                Question {i + 1} of {qs.length}
              </p>
              <p className="mt-1 text-[15px] leading-snug font-semibold text-white">{q.q}</p>
              <div className="mt-3 space-y-2">
                {q.options.map((o, k) => {
                  const chosen = picked[i];
                  const answered = chosen !== null;
                  const right = k === q.answer;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={answered}
                      onClick={() => setPicked((p) => p.map((x, n) => (n === i ? k : x)))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-[13px] transition",
                        !answered && "border-white/10 bg-white/[0.02] text-white/85 hover:border-accent/50 hover:bg-white/[0.05]",
                        answered && right && "border-emerald-400/50 bg-emerald-400/[0.1] text-white",
                        answered && !right && chosen === k && "border-rose-400/50 bg-rose-500/[0.1] text-white",
                        answered && !right && chosen !== k && "border-white/[0.06] text-white/45",
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[11.5px] font-semibold text-white/60">{k + 1}</span>
                      <span className="flex-1">{o}</span>
                      {answered && right && <CheckCircleIcon size={15} className="text-emerald-400" />}
                      {answered && !right && chosen === k && <XCircleIcon size={15} className="text-rose-400" />}
                    </button>
                  );
                })}
              </div>
              {picked[i] !== null && (
                <div className="mt-3 flex items-start justify-between gap-3">
                  <p className="text-[12.5px] text-white/65">{q.why}</p>
                  <Button size="sm" variant="primary" onClick={() => setI(i + 1)}>
                    {i === qs.length - 1 ? "See score" : "Next"}
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
