"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnswerChip, AssistantMessage, Composer, Disclaimer, Thinking, UserBubble, clockTime } from "@/components/chat/parts";
import { BuildFailed, BuildProgress } from "@/components/onboarding/build-progress";
import { DetailsPanel } from "@/components/onboarding/details-panel";
import {
  AboutYouStep,
  CourseStep,
  GoalStep,
  MissingCard,
  SummaryCard,
  WeekStep,
  missingFields,
  profileSummary,
} from "@/components/onboarding/steps";
import { Button, IconButton } from "@/components/ui/button";
import { ArrowLeftIcon, ChatIcon, HomeIcon, MaximizeIcon, MinimizeIcon, PlanIcon, XIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { Stepper } from "@/components/ui/stepper";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AssistantError, OfflineError, askAssistant, generatePlan } from "@/lib/assistant";
import { buildContext } from "@/lib/ai-context";
import { hoursLabel, shortGoal, timesLabel } from "@/lib/labels";
import { answersFromSetup, planShape, profileKnown } from "@/lib/planner";
import { useStore } from "@/lib/store";
import type { OnboardingStep } from "@/lib/types";
import { cn, fmt } from "@/lib/utils";

const STEPS = ["Profile", "Goal", "Course & date", "Availability", "Plan"];
const STEP_TIMES = ["9:41 AM", "9:42 AM", "9:43 AM", "9:44 AM", "9:46 AM", "9:49 AM"];

type ChatMsg = { id: number; role: "user" | "assistant"; text: string; time: string; failed?: boolean };

export default function OnboardingPage() {
  const router = useRouter();
  const { state, actions } = useStore();
  const { answers, step } = state.onboarding;
  const first = answers.name.split(" ")[0] || "there";

  const [returnToSummary, setReturnToSummary] = useState(step === 5);
  const [showQuestions, setShowQuestions] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [build, setBuild] = useState<"idle" | "building" | "failed">("idle");
  const [full, setFull] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);

  const planExists = state.planStatus !== "none" && build === "idle";

  // Reuse what the student already told us in the profile setup, so we don't ask twice.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !state.setup) return;
    prefilled.current = true;
    const patch = answersFromSetup(state.setup, answers, state.profile.name);
    if (Object.keys(patch).length) actions.setAnswers(patch);
  }, [state.setup, answers, state.profile.name, actions]);
  const known = profileKnown(answers);
  const shape = planShape(answers);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step, messages.length, thinking, build, showQuestions]);

  const goTo = (s: OnboardingStep) => actions.setStep(s);
  const next = () => {
    if (returnToSummary) return goTo(5);
    const n = Math.min(5, step + 1) as OnboardingStep;
    if (n === 5) setReturnToSummary(true);
    goTo(n);
  };
  const back = () => goTo(Math.max(1, step - 1) as OnboardingStep);
  const edit = (s: 1 | 2 | 3 | 4) => {
    setBuild("idle");
    goTo(s);
  };

  const runBuild = async () => {
    if (missingFields(answers).length) return;
    setBuild("building");
    const res = await generatePlan(answers);
    if (!res.ok || !res.sessions.length) return setBuild("failed");
    actions.suggestPlan({ sessions: res.sessions, milestones: res.milestones });
    router.push("/plan/review");
  };

  const send = async (text: string, retryId?: number) => {
    const id = retryId ?? ++msgId.current;
    setMessages((m) => (retryId ? m.map((x) => (x.id === id ? { ...x, failed: false } : x)) : [...m, { id, role: "user", text, time: clockTime() }]));
    setThinking(true);
    try {
      const reply = await askAssistant(text, { context: buildContext(state), tone: state.assistant.tone });
      setMessages((m) => [...m, { id: ++msgId.current, role: "assistant", text: reply, time: clockTime() }]);
    } catch (e) {
      if (e instanceof OfflineError) setMessages((m) => m.map((x) => (x.id === id ? { ...x, failed: true } : x)));
      else if (e instanceof AssistantError) setMessages((m) => [...m, { id: ++msgId.current, role: "assistant", text: e.message, time: clockTime() }]);
    } finally {
      setThinking(false);
    }
  };

  const minimise = () => {
    actions.setChatMinimized(true);
    router.push("/dashboard");
  };

  /* ---------- chips for completed steps ---------- */
  const chips: { step: 1 | 2 | 3 | 4; text: string }[] = [];
  if (step > 1 && profileSummary(answers)) chips.push({ step: 1, text: [answers.college, answers.year, answers.degree.replace(/,?\s*Computer Science/i, " CSE")].filter(Boolean).join(" · ") });
  if (step > 2 && answers.goal) chips.push({ step: 2, text: `Goal: ${shortGoal(answers.goal)}` });
  if (step > 3 && (answers.course || answers.target))
    chips.push({ step: 3, text: [answers.course.split(" — ")[0], answers.course.includes("edX") ? "edX" : "", answers.target ? `finish by ${fmt.full(answers.target)}` : ""].filter(Boolean).join(" · ") });
  if (step > 4) chips.push({ step: 4, text: [answers.hours && `${hoursLabel(answers.hours)} a week`, timesLabel(answers.times).toLowerCase(), `${answers.sessionLength} min sessions`, answers.restDay !== "none" && `rest on ${answers.restDay === "sunday" ? "Sunday" : "Saturday"}`].filter(Boolean).join(" · ") });

  const missing = missingFields(answers);
  const stepperCurrent = build !== "idle" ? 4 : step === 0 ? 0 : step - 1;

  const prompts: Record<number, string> = {
    1: "Great. First, a bit about you — this helps me plan around your classes and term dates.",
    2: `Thanks, ${first}. What would you like to work towards? Pick the closest option, or describe it in your own words.`,
    3: "Good choice. Which course or platform is it on, and when do you want to finish? I’ll check the date is realistic before we go on.",
    4: "Now the important part — your week. Tell me what’s already fixed, and when you like to study. I never schedule over a commitment.",
  };

  const transcript = (
    <>
      <AssistantMessage time={STEP_TIMES[0]}>Hi {first} — to build a plan that fits, I need a few details. It takes about 3 minutes.</AssistantMessage>
      <UserBubble>Set up my study plan</UserBubble>
      {chips.map((c) => (
        <AnswerChip key={c.step} onEdit={() => edit(c.step)}>
          {c.text}
        </AnswerChip>
      ))}

      {step >= 1 && step <= 4 && (
        <AssistantMessage time={STEP_TIMES[step]}>
          {prompts[step]}
          {step === 1 && <AboutYouStep answers={answers} set={actions.setAnswers} onNext={next} />}
          {step === 2 && <GoalStep answers={answers} set={actions.setAnswers} onNext={next} onBack={back} />}
          {step === 3 && <CourseStep answers={answers} set={actions.setAnswers} onNext={next} onBack={back} />}
          {step === 4 && <WeekStep answers={answers} set={actions.setAnswers} onNext={next} onBack={back} />}
        </AssistantMessage>
      )}

      {step === 5 && build === "idle" && !planExists && (
        <AssistantMessage time={missing.length ? "9:48 AM" : STEP_TIMES[5]}>
          {missing.length ? (
            <>
              Almost there — I need {missing.length} more detail{missing.length > 1 ? "s" : ""} before I can build a plan. Everything else you’ve told me is saved.
              <MissingCard answers={answers} set={actions.setAnswers} onBuild={runBuild} />
            </>
          ) : (
            <>
              That’s everything I need. Here’s a summary — check it over, edit anything that’s off, and I’ll build your plan.
              <SummaryCard answers={answers} onEdit={edit} onBuild={runBuild} />
            </>
          )}
        </AssistantMessage>
      )}

      {planExists && step === 5 && (
        <AssistantMessage time={STEP_TIMES[5]}>
          Your plan is {state.planStatus === "accepted" ? "saved and on your schedule" : "ready to review"}. Want to change anything?
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => router.push(state.planStatus === "accepted" ? "/study-plan" : "/plan/review")} icon={<PlanIcon size={13} />}>
              {state.planStatus === "accepted" ? "View study plan" : "Review plan"}
            </Button>
            <Button size="sm" onClick={() => router.push("/plan/preferences")}>Change my target date</Button>
            <Button size="sm" onClick={() => edit(4)}>Add a commitment</Button>
          </div>
        </AssistantMessage>
      )}

      {messages.map((m) =>
        m.role === "user" ? (
          <UserBubble key={m.id} failed={m.failed} onRetry={() => send(m.text, m.id)}>
            {m.text}
          </UserBubble>
        ) : (
          <AssistantMessage key={m.id} time={m.time}>{m.text}</AssistantMessage>
        ),
      )}
      {thinking && <Thinking />}

      {build !== "idle" && (
        <>
          <UserBubble>Build my plan</UserBubble>
          <AssistantMessage time={clockTime()}>
            {build === "failed" ? (
              <>
                I couldn’t finish your plan this time. That’s on my side, not something you did — all your answers are still here.
                <BuildFailed answers={answers} onRetry={runBuild} onEdit={() => edit(4)} />
              </>
            ) : (
              <>
                Building your plan now — I’ll fit {shape.weeks} weeks of {answers.course.split(" — ")[0] || "your course"} around{" "}
                {answers.commitments.length ? answers.commitments.map((c) => (c.name === "College" ? "college" : `the ${c.name.toLowerCase()}`)).join(", ") : "your week"}
                {answers.restDay !== "none" ? ` and your ${answers.restDay === "sunday" ? "Sunday" : "Saturday"} rest` : ""}.
                <BuildProgress answers={answers} />
              </>
            )}
          </AssistantMessage>
        </>
      )}
      <div ref={bottomRef} />
    </>
  );

  const welcome = (
    <div className="mx-auto flex max-w-[640px] flex-col pt-[10vh]">
      <div className="mb-8 text-center">
        <LogoMark size={34} className="mx-auto" />
        <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-white">Welcome to StudentOS, {first}</h1>
        <p className="mt-2 text-[13.5px] text-white/55">{known ? "I already have your profile from setup — just a few questions about your goal and week." : "I’ll ask a few short questions, then build a study plan around your week."}</p>
      </div>
      <AssistantMessage time={STEP_TIMES[0]}>
        {known ? (
          <>
            Hi {first} — I’m your StudentOS assistant. I already know you’re in {answers.year} {answers.degree ? `(${answers.degree})` : ""} at {answers.college}, so I won’t ask that again. I just need your goal, a target date and when you’re free. About 2 minutes.
          </>
        ) : (
          <>Hi {first} — I’m your StudentOS assistant. To build a plan that actually fits, I need to know a little about your college, what you want to learn, and when you’re free. It takes about 3 minutes, and you can change any answer later.</>
        )}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {[
            { Icon: PlanIcon, title: "Set up my study plan", sub: known ? "3 quick steps left" : "Start the 5 quick steps", onClick: () => goTo(known ? 2 : 1) },
            { Icon: ChatIcon, title: "What will you ask me?", sub: "See the questions first", onClick: () => setShowQuestions(true) },
            { Icon: HomeIcon, title: "Look around first", sub: "Open the dashboard; resume any time", onClick: minimise },
          ].map(({ Icon, title, sub, onClick }) => (
            <button key={title} type="button" onClick={onClick} className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3.5 text-left transition hover:border-accent/40 hover:bg-white/[0.06]">
              <Icon size={15} className="text-accent" />
              <span className="mt-2.5 block text-[12.5px] font-semibold text-white">{title}</span>
              <span className="mt-1 block text-[11px] text-white/45">{sub}</span>
            </button>
          ))}
        </div>
      </AssistantMessage>
      {showQuestions && (
        <AssistantMessage className="mt-6" time={STEP_TIMES[0]}>
          Here’s what I’ll ask, in order:
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-white/75">
            <li>About you — college, year and degree</li>
            <li>Your goal — the course, exam or skill</li>
            <li>The course and when you want to finish</li>
            <li>Your week — free hours, commitments and preferred times</li>
            <li>A summary to check before I build the plan</li>
          </ol>
          <Button variant="primary" size="sm" className="mt-3" onClick={() => goTo(1)}>
            Start now
          </Button>
        </AssistantMessage>
      )}
      <div ref={bottomRef} />
    </div>
  );

  const header = (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-white/[0.06] px-5">
      {full && (
        <button type="button" onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/85 hover:text-white">
          <ArrowLeftIcon size={13} /> Back to dashboard
        </button>
      )}
      <div className="flex min-w-0 items-center gap-2.5">
        {full && <LogoMark size={22} />}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">Set up your study plan</p>
          <p className="truncate text-[11px] text-white/45">StudentOS Assistant</p>
        </div>
      </div>
      <Stepper steps={STEPS} current={stepperCurrent} className="mx-auto hidden md:flex" onStepClick={(i) => edit((i + 1) as 1 | 2 | 3 | 4)} />
      <div className="ml-auto flex items-center gap-2 md:ml-0">
        {full && <ThemeToggle className="hidden sm:flex" />}
        <IconButton label="Minimise to dashboard" onClick={minimise}>
          <MinimizeIcon size={13} />
        </IconButton>
        <IconButton label={full ? "Close" : "Full screen"} onClick={() => (full ? router.push("/dashboard") : setFull(true))}>
          {full ? <XIcon size={13} /> : <MaximizeIcon size={13} />}
        </IconButton>
      </div>
    </header>
  );

  const busy = build === "building";

  return (
    <div className={cn("flex flex-col", full ? "fixed inset-0 z-40 app-glow" : "h-[calc(100vh-56px)] lg:h-screen")}>
      {header}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5">
            {step === 0 ? welcome : <div className="mx-auto flex max-w-[640px] flex-col gap-6 py-8">{transcript}</div>}
          </div>
          <div className="mx-auto w-full max-w-[640px] px-5 pb-4">
            <Composer onSend={(t) => send(t)} disabled={busy} />
            <Disclaimer />
          </div>
        </div>
        {!full && step > 0 && <DetailsPanel answers={answers} step={build !== "idle" || planExists ? 6 : step} checked={step === 5} onEdit={edit} />}
      </div>
    </div>
  );
}
