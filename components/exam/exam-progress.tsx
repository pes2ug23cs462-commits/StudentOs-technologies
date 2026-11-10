"use client";

/* Where a school student stands: how ready each subject is, and the next
   2–3 things to do (weak chapters first). Used on Exam Prep and the dashboard. */

import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { EXAMS, chapterKey, nextUp, readiness, type ExamPrepState } from "@/lib/exam-prep";
import { cn } from "@/lib/utils";

const tone = (p: number) => (p >= 80 ? "bg-emerald-400" : p >= 60 ? "bg-amber-400" : p > 0 ? "bg-rose-400" : "bg-white/20");

export function ExamProgress({ st, compact = false }: { st: ExamPrepState; compact?: boolean }) {
  const exam = EXAMS.find((e) => e.id === st.exam) ?? EXAMS[0];
  const todo = nextUp(exam.id, st, compact ? 2 : 3);
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold text-white">{compact ? `Exam Prep · ${exam.label}` : "How ready you are"}</p>
        {compact && (
          <Link href="/exam-prep" className="text-[12px] font-medium text-accent hover:underline">
            Open
          </Link>
        )}
      </div>
      <ul className="mt-3.5 space-y-3">
        {exam.subjects.map((s) => {
          const r = readiness(s, st.scores);
          return (
            <li key={s}>
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="font-medium text-white/85">{s}</span>
                <span className="text-white/50 tabular-nums">
                  <span className="font-semibold text-white">{r.pct}%</span> · {r.tested}/{r.total} tested{r.weak ? ` · ${r.weak} weak` : ""}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className={cn("h-full rounded-full", tone(r.pct))} style={{ width: `${Math.max(r.pct, r.tested ? 3 : 0)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {todo.length > 0 && (
        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <p className="text-[12px] font-semibold tracking-wide text-[var(--cyan)] uppercase">Do next</p>
          <ul className="mt-2 space-y-1">
            {todo.map((t) => (
              <li key={chapterKey(t.subject, t.chapter)}>
                <Link href={`/exam-prep?open=${encodeURIComponent(chapterKey(t.subject, t.chapter))}&tab=${t.tab}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-white">{t.chapter}</span>
                    <span className="block text-[11.5px] text-white/50">
                      {t.subject} · {t.why}
                    </span>
                  </span>
                  <ArrowRightIcon size={13} className="shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-snug text-white/35">Ready % = average of your last 3 test scores in each chapter; chapters not tested count as 0.</p>
    </Card>
  );
}
