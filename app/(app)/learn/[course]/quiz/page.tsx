"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PremiumNote } from "@/components/free/parts";
import { useLearning } from "@/components/learn/use-learning";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, BulbIcon, CheckCircleIcon, ClockIcon, PlayIcon, SparkleIcon, TrophyIcon, XCircleIcon } from "@/components/ui/icons";
import { Card, EmptyState } from "@/components/ui/primitives";
import { FREE_CERT_LIMIT, QUIZ_HINTS, QUIZ_PASS, QUIZ_SECONDS, QUIZ_SIZE, certCount, courseStats, drawQuiz, findCourse, newCertId, quizPool, type QuizQuestion } from "@/lib/learn";
import { quizHints, quizReview, writeCourseQuiz, type QuizReview } from "@/lib/assistant";
import { usePremium } from "@/lib/premium";
import { cn } from "@/lib/utils";

type Phase = "intro" | "running" | "result";

export default function QuizPage() {
  const { course: courseId } = useParams<{ course: string }>();
  const { learning, setCourse } = useLearning();
  const { premium } = usePremium();
  const course = findCourse(courseId, learning);
  const [phase, setPhase] = useState<Phase>("intro");
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(QUIZ_SECONDS);
  const [result, setResult] = useState<{ score: number; cert: "new" | "limit" | "none"; timedOut: boolean } | null>(null);
  const finished = useRef(false);
  // hints: one per question (from the quiz or written on start); a few can be opened per attempt
  const [hints, setHints] = useState<string[]>([]);
  const [opened, setOpened] = useState<number[]>([]);
  const [review, setReview] = useState<QuizReview | "busy" | "failed" | null>(null);

  const finish = useCallback(
    (final: (number | null)[], timedOut: boolean) => {
      if (!course || finished.current) return;
      finished.current = true;
      const score = final.filter((a, k) => a === qs[k]?.answer).length;
      const cp = learning.courses[course.id];
      const passed = score >= QUIZ_PASS;
      let cert: "new" | "limit" | "none" = "none";
      const patch: Parameters<typeof setCourse>[1] = { attempts: (cp?.attempts ?? 0) + 1, best: Math.max(cp?.best ?? 0, score) };
      if (passed) {
        patch.passedAt = cp?.passedAt ?? new Date().toISOString();
        if (!cp?.published) patch.passProof = qs.map((q, k) => ({ q: q.q, a: q.options[final[k] ?? -1] ?? "" }));
        if (cp?.certId || premium || certCount(learning) < FREE_CERT_LIMIT) {
          patch.certId = cp?.certId ?? newCertId();
          cert = "new";
        } else cert = "limit";
      }
      setCourse(course.id, patch);
      setResult({ score, cert, timedOut });
      setPhase("result");
      setReview("busy");
      quizReview({
        course: course.title,
        modules: course.modules.map((m) => m.title),
        score,
        total: qs.length,
        missed: qs.flatMap((q, k) => (final[k] === q.answer ? [] : [{ q: q.q, ...(q.module !== undefined ? { module: q.module } : {}) }])),
      }).then(setReview, () => setReview("failed"));
    },
    [course, qs, learning, setCourse, premium],
  );

  // countdown
  useEffect(() => {
    if (phase !== "running") return;
    if (left <= 0) {
      finish(answers, true);
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left, answers, finish]);

  const choose = useCallback(
    (opt: number) => {
      if (phase !== "running") return;
      const next = [...answers];
      next[i] = opt;
      setAnswers(next);
      if (i < qs.length - 1) setTimeout(() => setI((k) => k + 1), 220);
      else if (next.every((a) => a !== null)) setTimeout(() => finish(next, false), 220);
    },
    [phase, answers, i, qs.length, finish],
  );

  // keyboard 1–4
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= (qs[i]?.options.length ?? 0)) choose(n - 1);
      if (e.key === "ArrowLeft" && i > 0) setI(i - 1);
      if (e.key === "ArrowRight" && i < qs.length - 1) setI(i + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, i, qs, choose]);

  // Personalised courses get their quiz written once, from the modules and the videos watched.
  // a personalised pool from before pools were signed is written again, so a certificate can be checked
  const cpNow = course ? learning.courses[course.id] : undefined;
  const pool = course && (course.quiz.length || cpNow?.quizSig || !cpNow?.quizPool) ? quizPool(course, learning) : [];
  const ready = course ? courseStats(course, learning).ready : false;
  const [writing, setWriting] = useState<"idle" | "busy" | "failed">("idle");
  const writeQuiz = useCallback(async () => {
    if (!course) return;
    setWriting("busy");
    try {
      const w = await writeCourseQuiz(course, learning);
      if (w.questions.length < QUIZ_SIZE) throw new Error("short");
      setCourse(course.id, { quizPool: w.questions, ...(w.sig ? { quizSig: w.sig } : {}) });
      setWriting("idle");
    } catch {
      setWriting("failed");
    }
  }, [course, learning, setCourse]);
  useEffect(() => {
    if (course && ready && pool.length < QUIZ_SIZE && writing === "idle") void writeQuiz();
  }, [course?.id, ready, pool.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!course) {
    return (
      <div className="px-6 py-7 lg:px-8">
        <EmptyState title="Course not found" className="py-16">
          <Link href="/learn" className="text-accent hover:underline">Back to Learning</Link>
        </EmptyState>
      </div>
    );
  }

  const stats = courseStats(course, learning);
  const start = () => {
    finished.current = false;
    const drawn = drawQuiz(quizPool(course, learning));
    setQs(drawn);
    setAnswers(drawn.map(() => null));
    setI(0);
    setLeft(QUIZ_SECONDS);
    setResult(null);
    setReview(null);
    setOpened([]);
    setHints(drawn.map((q) => q.hint ?? ""));
    setPhase("running");
    if (drawn.some((q) => !q.hint))
      quizHints(course.title, drawn).then(
        (h) => setHints((cur) => cur.map((x, k) => x || h[k] || "")),
        () => setHints((cur) => cur.map((x) => x || "Think about the main idea of the module this question comes from.")),
      );
  };

  const back = (
    <Link href={`/learn/${course.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white">
      <ArrowLeftIcon size={13} /> {course.title}
    </Link>
  );

  if (!stats.ready) {
    return (
      <div className="px-6 py-7 lg:px-8">
        {back}
        <EmptyState title="The quiz is locked" className="mt-6 py-16">
          Finish all {stats.total} modules first ({stats.done} done so far).
        </EmptyState>
      </div>
    );
  }

  const q = qs[i];
  const urgent = left <= 15;

  return (
    <div className="px-6 py-7 lg:px-8">
      {back}
      <div className="mx-auto mt-4 max-w-[640px]">
        {phase === "intro" && (
          <Card className="p-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <TrophyIcon size={22} />
            </span>
            <h1 className="mt-4 text-[22px] font-semibold text-white">{course.title} · final quiz</h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-white/60">
              {QUIZ_SIZE} questions from this course. You have <b className="text-white">{QUIZ_SECONDS} seconds</b> for all of them. Get{" "}
              {QUIZ_PASS === QUIZ_SIZE ? "every answer" : `${QUIZ_PASS} answers`} right to unlock your certificate. You can use {QUIZ_HINTS} hints, and retry with new questions.
            </p>
            <p className="mt-3 text-[11.5px] text-white/45">Tip: press 1–4 to answer.</p>
            {pool.length >= QUIZ_SIZE ? (
              <Button variant="primary" size="lg" className="mt-5" onClick={start}>
                Start the quiz
              </Button>
            ) : writing === "failed" ? (
              <div className="mt-5">
                <p className="text-[12.5px] text-rose-300">Couldn’t prepare the questions. Check your internet and try again.</p>
                <Button size="sm" className="mt-3" onClick={() => void writeQuiz()}>
                  Try again
                </Button>
              </div>
            ) : (
              <p className="mt-5 text-[12.5px] text-white/55">Preparing questions from what you watched…</p>
            )}
          </Card>
        )}

        {phase === "running" && q && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="grid flex-1 grid-cols-5 gap-1.5">
                {qs.map((_, k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={`Question ${k + 1}`}
                    onClick={() => setI(k)}
                    className={cn("h-1.5 rounded-full transition", k === i ? "bg-accent" : answers[k] !== null ? "bg-accent/50" : "bg-white/10")}
                  />
                ))}
              </div>
              <span
                role="timer"
                aria-live="off"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold tabular-nums",
                  urgent ? "animate-pulse border-rose-400/40 bg-rose-500/10 text-rose-400" : "border-white/10 bg-white/[0.04] text-white",
                )}
              >
                <ClockIcon size={13} /> {Math.floor(Math.max(left, 0) / 60)}:{String(Math.max(left, 0) % 60).padStart(2, "0")}
              </span>
            </div>
            <Card className="mt-4 p-6">
              <p className="text-[11.5px] font-medium tracking-wide text-accent uppercase">
                Question {i + 1} of {qs.length}
              </p>
              <h2 className="mt-2 text-[17px] leading-snug font-semibold text-white">{q.q}</h2>
              <p className="mt-1 text-[12px] text-white/50">Click an answer or press 1–{q.options.length}.</p>
              <div className="mt-4 space-y-2">
                {q.options.map((o, k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => choose(k)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-[13.5px] transition",
                      answers[i] === k ? "border-accent bg-accent/[0.12] text-white" : "cursor-pointer border-white/10 bg-white/[0.02] text-white/85 hover:border-accent/50 hover:bg-white/[0.05]",
                    )}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11.5px] font-semibold", answers[i] === k ? "bg-accent text-black" : "bg-white/[0.06] text-white/60")}>
                      {k + 1}
                    </span>
                    {o}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                {opened.includes(i) ? (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2.5 text-[12.5px] leading-relaxed text-white/80">
                    <BulbIcon size={14} className="mt-0.5 shrink-0 text-amber-300" />
                    {hints[i] || "Getting your hint…"}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={opened.length >= QUIZ_HINTS}
                    onClick={() => setOpened((o) => [...o, i])}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-amber-300 hover:underline disabled:cursor-not-allowed disabled:text-white/35 disabled:no-underline"
                  >
                    <BulbIcon size={13} /> {opened.length >= QUIZ_HINTS ? "No hints left" : `Show a hint (${QUIZ_HINTS - opened.length} left)`}
                  </button>
                )}
              </div>
              <div className="mt-5 flex justify-between">
                <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
                  Previous
                </Button>
                {answers.every((a) => a !== null) ? (
                  <Button size="sm" variant="primary" onClick={() => finish(answers, false)}>
                    Submit
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" disabled={i === qs.length - 1 || answers[i] === null} title={answers[i] === null ? "Pick an answer first" : undefined} onClick={() => setI(i + 1)}>
                    Next
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {phase === "result" && result && (
          <Card className="p-7 text-center">
            {result.score >= QUIZ_PASS ? (
              <CheckCircleIcon size={40} className="mx-auto text-accent" />
            ) : (
              <XCircleIcon size={40} className="mx-auto text-rose-400" />
            )}
            <h1 className="mt-3 text-[22px] font-semibold text-white">
              {result.score >= QUIZ_PASS ? "You passed!" : result.timedOut ? "Time’s up" : "Not quite yet"}
            </h1>
            <p className="mt-1 text-[28px] font-semibold text-white tabular-nums">
              {result.score}/{qs.length}
            </p>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-5 gap-1.5">
              {qs.map((qq, k) => (
                <span key={k} className={cn("h-2 rounded-full", answers[k] === qq.answer ? "bg-accent" : "bg-rose-400/70")} title={`Question ${k + 1}`} />
              ))}
            </div>
            {result.score >= QUIZ_PASS ? (
              result.cert === "new" ? (
                <>
                  <p className="mt-4 text-[13px] text-white/60">Your StudentOS certificate is unlocked.</p>
                  <Link href={`/learn/${course.id}/certificate`} className="mt-5 inline-flex h-11 items-center rounded-lg bg-accent px-5 text-[14px] font-semibold text-black">
                    View my certificate
                  </Link>
                </>
              ) : (
                <PremiumNote title={`You’ve used your ${FREE_CERT_LIMIT} free certificates`} className="mt-5 text-left" href="/premium">
                  Your pass is saved. With Premium you get a certificate for this course and every course after it, no retest needed.
                </PremiumNote>
              )
            ) : (
              <>
                <p className="mx-auto mt-4 max-w-sm text-[13px] text-white/60">
                  You need {QUIZ_PASS === QUIZ_SIZE ? "all" : QUIZ_PASS} {QUIZ_SIZE} right. Rewatch the modules and try again; you’ll get a new set of questions.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <Link href={`/learn/${course.id}`} className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.05] px-4 text-[13.5px] text-white">
                    Review modules
                  </Link>
                  <Button variant="primary" onClick={start}>
                    Try again
                  </Button>
                </div>
              </>
            )}
            {review && (
              <div className="mt-6 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-4 text-left">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-white">
                  <SparkleIcon size={14} className="text-violet-300" /> AI recommendation
                </p>
                {review === "busy" ? (
                  <p className="mt-2 text-[12.5px] text-white/55">Looking at your answers…</p>
                ) : review === "failed" ? (
                  <p className="mt-2 text-[12.5px] text-white/55">Couldn’t get advice right now. {result.score >= QUIZ_PASS ? "" : "Rewatch the modules you found hard and try again."}</p>
                ) : (
                  <>
                    {review.summary && <p className="mt-2 text-[13px] leading-relaxed text-white/75">{review.summary}</p>}
                    {review.rewatch.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11.5px] font-semibold tracking-wide text-white/45 uppercase">Rewatch</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {review.rewatch.map((m) => (
                            <Link key={m} href={`/learn/${course.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] text-white/80 hover:border-violet-400/50">
                              <PlayIcon size={11} /> {m}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {review.tips.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {review.tips.map((tip) => (
                          <li key={tip} className="flex gap-2 text-[12.5px] leading-relaxed text-white/70">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" /> {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
