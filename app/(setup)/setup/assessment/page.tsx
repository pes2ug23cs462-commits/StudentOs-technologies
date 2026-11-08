"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackButton, Icon, NextButton, ToneIcon } from "@/components/setup/fields";
import { AnimatedMark, Brand, Illustration, StepDot } from "@/components/setup/shell";
import { useSetup, useStepGuard } from "@/components/setup/use-setup";
import { BellIcon, BotIcon, CheckIcon, ChevronDownIcon, ClockIcon, SearchIcon, SparkleIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ASSESSMENT_SECONDS, QUESTIONS, computeLevel } from "@/lib/setup";
import { cn } from "@/lib/utils";

const NAV = ["Academic Details", "Goals & Interests", "Skills & Experience", "Review & Continue", "Assessment"];

export default function AssessmentPage() {
  const router = useRouter();
  const { setup, setAnswer, profileName, actions } = useSetup();
  const allowed = useStepGuard(5);
  const firstOpen = QUESTIONS.findIndex((q) => !setup.assessment[q.id]);
  const [i, setI] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [missing, setMissing] = useState(false);

  // 5-minute countdown. The start time is saved, so refreshing doesn’t reset it.
  const startedAt = setup.assessmentStartedAt;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (allowed && !startedAt && !setup.assessmentDone) actions.setSetup({ assessmentStartedAt: Date.now() });
  }, [allowed, startedAt, setup.assessmentDone, actions]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, ASSESSMENT_SECONDS - Math.floor((now - (startedAt ?? now)) / 1000));
  const timeUp = !!startedAt && left === 0;

  const finish = () => {
    const { level } = computeLevel(setup);
    actions.setSetup({ assessmentDone: true, level, reached: 6 });
    router.push("/setup/plan");
  };

  // Time’s up: finish with the answers given so far.
  useEffect(() => {
    if (!timeUp || setup.assessmentDone) return;
    actions.toast("Time’s up — we used the answers you gave.");
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  // Keyboard: 1–4 picks an option, arrows move between questions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const q = QUESTIONS[i];
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) setAnswer(q.id, q.options[n - 1].id);
      if (e.key === "ArrowRight" && i < QUESTIONS.length - 1) setI(i + 1);
      if (e.key === "ArrowLeft" && i > 0) setI(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, setAnswer]);

  if (!allowed) return null;

  const q = QUESTIONS[i];
  const answered = QUESTIONS.filter((x) => setup.assessment[x.id]).length;
  const pct = Math.round((answered / QUESTIONS.length) * 100);
  const last = i === QUESTIONS.length - 1;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const urgent = left <= 60;
  const first = profileName.split(" ")[0] || "You";

  const next = () => {
    if (!setup.assessment[q.id]) {
      setMissing(true);
      return;
    }
    setMissing(false);
    if (!last) return setI(i + 1);
    const open = QUESTIONS.findIndex((x) => !setup.assessment[x.id]);
    if (open !== -1) {
      setI(open);
      setMissing(true);
      return;
    }
    finish();
  };

  return (
    <div className="setup-bg min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[minmax(300px,360px)_1fr]">
        {/* Left */}
        <aside className="setup-left hidden flex-col gap-6 border-r border-white/[0.06] px-7 pt-9 pb-6 lg:flex">
          <Brand />
          <ol className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
            {NAV.map((label, n) => {
              const active = n === 4;
              return (
                <li key={label} className={cn("flex items-center gap-3.5 px-4 py-3.5", active && "bg-accent/[0.08]")}>
                  <StepDot n={n + 1} state={active ? "active" : "done"} size={30} />
                  <span className={cn("flex-1 text-[14.5px]", active ? "font-semibold text-white" : "text-white/85")}>{label}</span>
                  <span className={cn("text-[12.5px]", active ? "font-medium text-accent" : "text-white/50")}>{active ? "In Progress" : "Completed"}</span>
                </li>
              );
            })}
          </ol>
          <div className="rounded-2xl bg-indigo-500/[0.08] p-5">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
              <SparkleIcon size={17} className="text-violet-500" /> Personalized for You
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/65">
              This assessment is tailored based on your goals, background and interests. It helps us recommend the best learning path, projects and opportunities for you.
            </p>
          </div>
          <Illustration variant="assessment" className="my-auto" />
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-col bg-panel/60">
          {/* Top bar */}
          <header className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-3.5 sm:px-8">
            <div className="lg:hidden">
              <AnimatedMark size={34} />
            </div>
            <label className="relative hidden max-w-[560px] flex-1 md:block">
              <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/50" />
              <input placeholder="Search for courses, projects, internships…" aria-label="Search" className="h-11 w-full rounded-xl bg-white/[0.05] pr-4 pl-11 text-[14px] text-white placeholder:text-white/45 outline-none focus:ring-2 focus:ring-accent/30" />
            </label>
            <div className="ml-auto flex items-center gap-4">
              <ThemeToggle />
              <button type="button" aria-label="Notifications" className="relative rounded-lg p-2 text-white/70 hover:bg-white/[0.06]">
                <BellIcon size={20} />
                <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-rose-500" />
              </button>
              <span className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#818cf8] to-[#6366f1] text-[15px] font-semibold text-white">{first.charAt(0).toUpperCase()}</span>
                <span className="hidden text-[14.5px] font-medium text-white sm:inline">{first}</span>
                <ChevronDownIcon size={16} className="text-white/55" />
              </span>
            </div>
          </header>

          <div className="grid flex-1 gap-6 px-5 py-7 sm:px-8 xl:grid-cols-[1fr_380px]">
            <div className="min-w-0">
              <p className="text-[14px] text-white/60">
                Assessment · {i + 1} of {QUESTIONS.length}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-[36px] leading-tight font-bold tracking-[-0.02em] text-white">Let’s understand you better</h1>
                <div
                  role="timer"
                  aria-label={`${mm} minutes ${ss} seconds left`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-4 py-2 font-semibold tabular-nums transition-colors",
                    urgent ? "animate-pulse border-rose-500/40 bg-rose-500/10 text-rose-500" : "border-accent/30 bg-accent/[0.08] text-accent",
                  )}
                >
                  <ClockIcon size={20} />
                  <span className="text-[24px] leading-none">
                    {mm}:{ss}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-[15px] text-white/65">Answer a few questions so we can create a personalized learning plan and recommendations.</p>
              <div className="mt-5 flex items-center gap-4">
                <ProgressBar value={Math.max(pct, 4)} className="h-2.5 flex-1" />
                <span className="text-[14px] font-medium text-white/70">{pct}% complete</span>
              </div>

              <section key={q.id} className="setup-enter mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-accent/[0.1] px-3 py-1.5 text-[14px] font-semibold text-accent">
                    <Icon name={q.icon} size={17} /> {q.category}
                  </span>
                  <span className="rounded-lg bg-white/[0.06] px-3 py-1 text-[13px] text-white/60">
                    Question {i + 1} of {QUESTIONS.length}
                  </span>
                </div>
                <h2 className="mt-5 text-[22px] leading-snug font-bold text-white">{q.prompt}</h2>
                <p className="mt-1 text-[14.5px] text-white/60">{q.help}</p>

                <div className="mt-5 space-y-3" role="radiogroup" aria-label={q.prompt}>
                  {q.options.map((op, n) => {
                    const on = setup.assessment[q.id] === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          setAnswer(q.id, op.id);
                          setMissing(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-5 rounded-2xl border px-5 py-4 text-left transition",
                          on ? "border-accent bg-accent/[0.06] shadow-[0_0_0_1px_var(--color-accent)]" : "border-white/10 bg-white/[0.02] hover:border-white/20",
                        )}
                      >
                        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", on ? "border-accent" : "border-white/25")}>
                          {on && <span className="h-3 w-3 rounded-full bg-accent" />}
                        </span>
                        <ToneIcon name={op.icon} tone={op.tone} size={52} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[17px] font-semibold text-white">{op.title}</span>
                          <span className="block text-[14px] text-white/60">{op.sub}</span>
                        </span>
                        <kbd className="hidden rounded-md border border-white/10 px-1.5 text-[11px] text-white/40 sm:block">{n + 1}</kbd>
                      </button>
                    );
                  })}
                </div>
                {missing && <p className="mt-3 text-[13px] text-rose-500">Pick an answer to continue.</p>}

                <div className="mt-6 flex items-center justify-between">
                  {i > 0 ? <BackButton onClick={() => setI(i - 1)}>Previous</BackButton> : <BackButton onClick={() => router.push("/setup/review")}>Back to review</BackButton>}
                  <NextButton onClick={next}>{last ? "Finish assessment" : "Next Question"}</NextButton>
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="flex gap-4 rounded-2xl bg-emerald-500/[0.08] p-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-emerald-500 ring-1 ring-emerald-500/20">
                  <BotIcon size={28} />
                </span>
                <div>
                  <p className="text-[16px] font-semibold text-white">We’re building this for you</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-white/65">Your answers help us give personalized recommendations based on your goals and background.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="mb-3.5 flex items-center justify-between">
                  <p className="text-[16px] font-semibold text-white">Question Progress</p>
                  <p className="text-[14px] font-medium text-white">
                    {answered} / {QUESTIONS.length}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {QUESTIONS.map((x, n) => {
                    const done = !!setup.assessment[x.id];
                    const cur = n === i;
                    return (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setI(n)}
                        aria-label={`Question ${n + 1}${done ? ", answered" : ""}`}
                        aria-current={cur ? "step" : undefined}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-lg border text-[14px] font-medium transition",
                          cur ? "border-accent bg-accent/[0.08] text-white shadow-[0_0_0_1px_var(--color-accent)]" : done ? "border-accent/30 bg-accent/[0.12] text-accent" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20",
                        )}
                      >
                        {done && !cur ? <CheckIcon size={14} strokeWidth={3} /> : n + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-500/[0.07] p-5">
                <p className="flex items-center gap-2 text-[17px] font-semibold text-white">
                  <Icon name="bulb" size={20} className="text-sky-500" /> Tips
                </p>
                <ul className="mt-3 space-y-2.5 text-[14.5px] text-white/75">
                  {["There are no right or wrong answers.", "Be honest about your current level.", "Your answers help us personalize your learning experience.", "You can change your responses later from your profile settings."].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <CheckIcon size={16} className="mt-0.5 shrink-0 text-white/60" /> {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] text-white/45">Tip: press 1–4 to answer, ← → to move.</p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[16px] font-semibold text-white">
                    <ClockIcon size={19} /> Time left
                  </p>
                  <p className={cn("text-[15px] font-semibold tabular-nums", urgent ? "text-rose-500" : "text-white")}>
                    {mm}:{ss}
                  </p>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full transition-all duration-1000 ease-linear", urgent ? "bg-rose-500" : "bg-accent")} style={{ width: `${(left / ASSESSMENT_SECONDS) * 100}%` }} />
                </div>
                <p className="mt-3 text-[13.5px] text-white/55">You have 5 minutes. When time runs out, we use the answers you’ve given so far.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
