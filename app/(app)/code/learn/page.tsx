"use client";

/* Learn to code from zero (/code/learn): 12 short Python lessons for students who
   have never coded. Read → run the example → do the exercise → checked right here. */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CodeEditor } from "@/components/coding/code-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, BotIcon, BulbIcon, CheckIcon, EyeIcon, PlayIcon, RefreshIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { warmPython } from "@/lib/coding/runner";
import { LESSONS, checkLesson, loadDone, runProgram, saveDone, type CheckResult } from "@/lib/learn-code";
import { cn } from "@/lib/utils";

function Console({ text, error, empty }: { text: string; error?: string; empty: string }) {
  return (
    <pre className="max-h-56 min-h-[64px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-[13px] leading-relaxed text-emerald-200/90">
      {text || (!error && <span className="text-white/35">{empty}</span>)}
      {error && <span className="block text-rose-300">{error}</span>}
    </pre>
  );
}

function Learn() {
  const router = useRouter();
  const params = useSearchParams();
  const idx = Math.max(0, LESSONS.findIndex((l) => l.id === params.get("l")));
  const lesson = LESSONS[idx];
  const [done, setDone] = useState<string[]>([]);
  const [code, setCode] = useState(lesson.starter);
  const [stdin, setStdin] = useState("");
  const [ex, setEx] = useState<{ out: string; err: string } | null>(null);
  const [run, setRun] = useState<{ out: string; err: string } | null>(null);
  const [checks, setChecks] = useState<CheckResult[] | null>(null);
  const [busy, setBusy] = useState<"" | "example" | "run" | "check">("");
  const [py, setPy] = useState<"loading" | "ready" | "failed">("loading");
  const [hint, setHint] = useState(false);
  const [tries, setTries] = useState(0);

  useEffect(() => setDone(loadDone()), []);
  useEffect(() => {
    warmPython().then(
      () => setPy("ready"),
      () => setPy("failed"),
    );
  }, []);
  // a fresh start on every lesson (the student's code for each lesson is kept on this device)
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(`sos.learn-code.${lesson.id}`);
    } catch {
      /* ignore */
    }
    setCode(saved ?? lesson.starter);
    setStdin(lesson.checks[0]?.input ?? "");
    setEx(null);
    setRun(null);
    setChecks(null);
    setHint(false);
    setTries(0);
  }, [lesson]);
  const edit = (v: string) => {
    setCode(v);
    setRun(null);
    try {
      localStorage.setItem(`sos.learn-code.${lesson.id}`, v);
    } catch {
      /* ignore */
    }
  };

  const go = (i: number) => router.push(`/code/learn?l=${LESSONS[i].id}`);
  const runExample = async () => {
    setBusy("example");
    const r = await runProgram(lesson.example, lesson.exampleInput ?? "", true);
    setEx({ out: r.output, err: r.error });
    setBusy("");
  };
  const runMine = async () => {
    setBusy("run");
    const r = await runProgram(code, stdin, true);
    setRun({ out: r.output, err: r.error });
    setBusy("");
  };
  const check = async () => {
    setBusy("check");
    const res = await checkLesson(lesson, code);
    setChecks(res);
    setTries((t) => t + 1);
    if (res.every((c) => c.ok) && !done.includes(lesson.id)) {
      const next = [...done, lesson.id];
      setDone(next);
      saveDone(next);
    }
    setBusy("");
  };

  const passed = !!checks && checks.every((c) => c.ok);
  const usesInput = lesson.checks.some((c) => c.input);
  const pct = Math.round((done.length / LESSONS.length) * 100);
  const askAsha = `I'm learning Python from zero (lesson: ${lesson.title}). The task: ${lesson.task}\nMy code:\n${code}\nExplain simply where I went wrong, in Hinglish, without giving the full answer.`;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/code" className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white">
            <ArrowLeftIcon size={13} /> Practice problems
          </Link>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight text-white">Learn to code · Python from zero</h1>
          <p className="text-[13.5px] text-white/55">For anyone who has never coded. 12 short lessons, about an hour in all. Your code runs right here.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[13px] font-semibold text-white">
              {done.length}/{LESSONS.length} done
            </p>
            <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* lesson list */}
        <Card className="h-fit p-2">
          <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {LESSONS.map((l, i) => {
              const ok = done.includes(l.id);
              return (
                <li key={l.id} className="shrink-0">
                  <button type="button" onClick={() => go(i)} aria-current={i === idx ? "step" : undefined} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition", i === idx ? "bg-accent/12 text-white ring-1 ring-accent/50" : "text-white/65 hover:bg-white/[0.05] hover:text-white")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", ok ? "bg-emerald-400/20 text-emerald-400" : i === idx ? "bg-accent text-black" : "bg-white/[0.07] text-white/60")}>{ok ? <CheckIcon size={12} /> : i + 1}</span>
                    <span className="whitespace-nowrap lg:whitespace-normal">{l.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="min-w-0 space-y-5">
          {/* learn */}
          <Card className="p-5 sm:p-6">
            <p className="text-[11.5px] font-semibold uppercase tracking-widest text-accent">
              Lesson {idx + 1} · about {lesson.mins} min
            </p>
            <h2 className="mt-1 text-[20px] font-semibold text-white">{lesson.title}</h2>
            <ul className="mt-3 space-y-2">
              {lesson.learn.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-white/80">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-white/50">Example</p>
                <pre className="overflow-auto rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 font-mono text-[13px] leading-relaxed text-sky-100">{lesson.example}</pre>
              </div>
              <div>
                <p className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-white/50">
                  Output
                  <Button size="xs" icon={<PlayIcon size={12} />} loading={busy === "example"} disabled={py !== "ready"} onClick={runExample}>
                    Run example
                  </Button>
                </p>
                <Console text={ex?.out ?? ""} error={ex?.err} empty={py === "loading" ? "Loading Python (first time only, ~10 MB)…" : py === "failed" ? "Couldn’t load Python. Check your internet and reload." : "Press Run example"} />
                {lesson.exampleInput && <p className="mt-1 text-[11.5px] text-white/40">Typed in for you: {lesson.exampleInput}</p>}
              </div>
            </div>
          </Card>

          {/* exercise */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-white/45">Your turn</p>
                <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-white">{lesson.task}</p>
              </div>
              {done.includes(lesson.id) && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[12px] font-semibold text-emerald-400">
                  <CheckIcon size={12} /> Done
                </span>
              )}
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
              <CodeEditor value={code} lang="python" onChange={(v) => edit(v)} className="min-h-[200px]" label="Your Python code" />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {usesInput && (
                <div>
                  <label htmlFor="lc-in" className="mb-1.5 block text-[12px] font-medium text-white/50">
                    Input for Run (one value per line)
                  </label>
                  <textarea id="lc-in" value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[13px] text-white focus:border-accent/60 focus:outline-none" />
                </div>
              )}
              <div className={cn(!usesInput && "md:col-span-2")}>
                <p className="mb-1.5 text-[12px] font-medium text-white/50">Output</p>
                <Console text={run?.out ?? ""} error={run?.err} empty="Press Run to see what your program prints" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button icon={<PlayIcon size={14} />} loading={busy === "run"} disabled={py !== "ready" || !!busy} onClick={runMine}>
                Run
              </Button>
              <Button variant="primary" icon={<CheckIcon size={14} />} loading={busy === "check"} disabled={py !== "ready" || !!busy} onClick={check}>
                Check my answer
              </Button>
              <Button variant="ghost" size="sm" icon={<BulbIcon size={14} />} onClick={() => setHint((v) => !v)}>
                Hint
              </Button>
              <Link href={`/assistant?ask=${encodeURIComponent(askAsha)}`} className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] text-white/75 hover:bg-white/[0.06] hover:text-white">
                <BotIcon size={14} /> Ask Asha
              </Link>
              {tries >= 2 && !passed && (
                <Button variant="ghost" size="sm" icon={<EyeIcon size={14} />} onClick={() => edit(lesson.answer)}>
                  Show answer
                </Button>
              )}
              <Button variant="ghost" size="sm" icon={<RefreshIcon size={14} />} onClick={() => edit(lesson.starter)}>
                Start over
              </Button>
            </div>
            {hint && <p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-2.5 text-[13.5px] text-amber-100">💡 {lesson.hint}</p>}

            {checks && (
              <div className={cn("mt-4 rounded-xl border px-4 py-3", passed ? "border-emerald-400/40 bg-emerald-400/[0.08]" : "border-rose-400/30 bg-rose-400/[0.06]")}>
                <p className={cn("text-[14px] font-semibold", passed ? "text-emerald-300" : "text-rose-300")}>{passed ? "Correct! Well done 🎉" : `Not yet: ${checks.filter((c) => c.ok).length} of ${checks.length} checks passed`}</p>
                {!passed && (
                  <div className="mt-2 space-y-2">
                    {checks
                      .filter((c) => !c.ok)
                      .slice(0, 1)
                      .map((c, i) => (
                        <div key={i} className="grid gap-2 text-[12.5px] sm:grid-cols-3">
                          {c.input !== undefined && (
                            <div>
                              <p className="text-white/45">Input</p>
                              <pre className="mt-0.5 font-mono text-white/80">{c.input}</pre>
                            </div>
                          )}
                          <div>
                            <p className="text-white/45">Expected</p>
                            <pre className="mt-0.5 font-mono text-emerald-200">{c.want}</pre>
                          </div>
                          <div>
                            <p className="text-white/45">Your program printed</p>
                            <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-rose-200">{c.error || c.got || "(nothing)"}</pre>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {passed && idx < LESSONS.length - 1 && (
                  <Button className="mt-3" variant="primary" size="sm" icon={<ArrowRightIcon size={14} />} onClick={() => go(idx + 1)}>
                    Next: {LESSONS[idx + 1].title}
                  </Button>
                )}
                {passed && idx === LESSONS.length - 1 && (
                  <div className="mt-2 text-[13.5px] text-white/80">
                    You finished all 12 lessons. Try real problems next:{" "}
                    <Link href="/code" className="font-semibold text-accent hover:underline">
                      Practice problems →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LearnCodePage() {
  return (
    <Suspense fallback={null}>
      <Learn />
    </Suspense>
  );
}
