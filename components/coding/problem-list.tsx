"use client";

/* Practice Problems → the list (LeetCode-style problem table).
   Topic chips, search and level filter on top; a table of this student's own problems
   with status, topic, difficulty and AI use; on the right their progress, a month
   calendar of solved days, and “New problem for me”. Opening a problem goes to the
   full-screen workspace at /code/[id]. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FancyIcon } from "@/components/site/fancy-icon";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, BookmarkIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, FlameIcon, SearchIcon, ShuffleIcon, SparkleIcon } from "@/components/ui/icons";
import { generateProblem, useMyProblems } from "@/lib/coding/personal";
import { AI_LIMIT, LEVEL_TONE, type Level } from "@/lib/coding/types";
import { codingStreak, useCoding } from "@/lib/coding/use-coding";
import { studentLine } from "@/lib/setup";
import { cn } from "@/lib/utils";

const LEVELS: Level[] = ["Easy", "Medium", "Hard"];
const BAR: Record<Level, string> = { Easy: "bg-emerald-400", Medium: "bg-amber-300", Hard: "bg-rose-400" };

export function ProblemList() {
  const router = useRouter();
  const mine = useMyProblems();
  const { coding, toggleSave, addCustom, state } = useCoding();
  const [q, setQ] = useState("");
  const [lvl, setLvl] = useState<Level | "">("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<"" | "todo" | "solved" | "saved">("");
  const [gen, setGen] = useState<{ open: boolean; level: Level; topic: string; busy: boolean; error: string }>({ open: false, level: "Easy", topic: "", busy: false, error: "" });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const topics = [...new Set(mine.flatMap((x) => x.topics))].sort();
  const topicCount = (t: string) => mine.filter((x) => x.topics.includes(t)).length;
  const list = mine.filter(
    (x) =>
      (!q.trim() || `${x.num} ${x.title} ${x.topics.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())) &&
      (!lvl || x.level === lvl) &&
      (!topic || x.topics.includes(topic)) &&
      (status === "" || (status === "solved" ? !!coding.solved[x.id] : status === "todo" ? !coding.solved[x.id] : (coding.saved ?? []).includes(x.id))),
  );
  const count = (l?: Level) => mine.filter((x) => !l || x.level === l).length;
  const solvedOf = (l?: Level) => mine.filter((x) => (!l || x.level === l) && coding.solved[x.id]).length;
  const streak = codingStreak(coding);
  const total = solvedOf();
  const pct = mine.length ? total / mine.length : 0;

  const pickRandom = () => {
    const pool = mine.filter((x) => !coding.solved[x.id]);
    const from = pool.length ? pool : mine;
    router.push(`/code/${from[Math.floor(Math.random() * from.length)].id}`);
  };

  const makeNew = async () => {
    setGen((g) => ({ ...g, busy: true, error: "" }));
    try {
      const np = await generateProblem({ level: gen.level, topic: gen.topic, profile: studentLine(state.setup?.academic) || [state.setup?.academic.course, state.setup?.skills.level].filter(Boolean).join(" · "), avoid: mine.map((x) => x.title) });
      addCustom(np);
      setGen((g) => ({ ...g, busy: false, open: false }));
      router.push(`/code/${np.id}`);
    } catch (e) {
      setGen((g) => ({ ...g, busy: false, error: e instanceof Error ? e.message : "Couldn’t make a problem. Try again." }));
    }
  };

  // calendar of the shown month: which days had a solve
  const solvedDays = new Set(Object.values(coding.solved).map((s) => new Date(s.at).toDateString()));
  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Date().toDateString();

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <FancyIcon name="code" tone="violet" size={54} />
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-white">Practice Problems</h1>
            <p className="text-[13.5px] text-white/60">Your own set — every student gets different problems. Use AI for up to {AI_LIMIT}% of your code.</p>
          </div>
        </div>
        <Link href="/tests" className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-[12.5px] text-white/70 hover:text-white">
          <ArrowLeftIcon size={13} /> Practice Arena
        </Link>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* topic chips */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTopic("")} aria-pressed={!topic} className={cn("h-8 rounded-full px-3.5 text-[12.5px] font-medium transition", !topic ? "bg-white text-black" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]")}>
              All Topics
            </button>
            {topics.map((t) => (
              <button key={t} type="button" onClick={() => setTopic(topic === t ? "" : t)} aria-pressed={topic === t} className={cn("h-8 rounded-full px-3.5 text-[12.5px] transition", topic === t ? "bg-white text-black" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]")}>
                {t} <span className={topic === t ? "text-black/50" : "text-white/40"}>{topicCount(t)}</span>
              </button>
            ))}
          </div>

          {/* search + filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
              <span className="sr-only">Search problems</span>
              <SearchIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] pr-3 pl-9 text-[13px] text-white outline-none focus:border-accent" />
            </label>
            <select value={lvl} onChange={(e) => setLvl(e.target.value as Level | "")} aria-label="Difficulty" className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[12.5px] text-white/80 outline-none [&>option]:bg-[#1a1a1f]">
              <option value="">Difficulty</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status" className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[12.5px] text-white/80 outline-none [&>option]:bg-[#1a1a1f]">
              <option value="">Status</option>
              <option value="todo">To do</option>
              <option value="solved">Solved</option>
              <option value="saved">Bookmarked</option>
            </select>
            <button type="button" onClick={pickRandom} title="Pick a random unsolved problem" aria-label="Random problem" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white">
              <ShuffleIcon size={15} />
            </button>
            <span className="ml-auto text-[12.5px] text-white/50">
              <b className="text-white">{total}</b>/{mine.length} solved
            </span>
          </div>

          {/* table */}
          <div className="depth mt-3 overflow-hidden rounded-xl border border-white/[0.07]">
            <div className="hidden grid-cols-[44px_minmax(0,1fr)_150px_90px_80px_40px] items-center border-b border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11.5px] font-medium text-white/45 sm:grid">
              <span>Status</span>
              <span>Title</span>
              <span>Topic</span>
              <span>Difficulty</span>
              <span title="Share of the accepted code that came from AI">AI used</span>
              <span className="sr-only">Bookmark</span>
            </div>
            <ul>
              {list.map((x, i) => {
                const s = coding.solved[x.id];
                const tried = !s && coding.attempts[x.id];
                const saved = (coding.saved ?? []).includes(x.id);
                return (
                  <li key={x.id} className={cn("group relative grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2.5 transition hover:bg-white/[0.05] sm:grid-cols-[44px_minmax(0,1fr)_150px_90px_80px_40px] sm:gap-x-0", i % 2 === 1 && "bg-white/[0.022]")}>
                    <span title={s ? "Solved" : tried ? "Tried" : "To do"}>
                      {s ? (
                        <CheckIcon size={16} className="text-emerald-400" />
                      ) : tried ? (
                        <span className="block h-3.5 w-3.5 rounded-full border-2 border-amber-300" />
                      ) : (
                        <span className="block h-3.5 w-3.5" />
                      )}
                    </span>
                    <Link href={`/code/${x.id}`} className="min-w-0 truncate text-[13.5px] text-white/90 after:absolute after:inset-0 group-hover:text-white">
                      {x.num}. {x.title}
                      {x.ai && <span className="ml-2 rounded bg-violet-500/20 px-1.5 py-px text-[10.5px] font-semibold text-violet-300">For you</span>}
                    </Link>
                    <span className="hidden truncate pr-2 text-[12px] text-white/50 sm:block">{x.topics.slice(0, 2).join(", ")}</span>
                    <span className={cn("text-[12.5px] font-medium", LEVEL_TONE[x.level])}>{x.level === "Medium" ? "Med." : x.level}</span>
                    <span className="hidden text-[12.5px] text-white/55 tabular-nums sm:block">{s ? `${s.ai}%` : "—"}</span>
                    <button
                      type="button"
                      onClick={() => toggleSave(x.id)}
                      aria-label={saved ? `Remove bookmark: ${x.title}` : `Bookmark ${x.title}`}
                      aria-pressed={saved}
                      className={cn("relative z-10 hidden justify-self-center text-white/35 hover:text-accent sm:block", !saved && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
                    >
                      <BookmarkIcon size={15} className={saved ? "fill-current text-accent" : ""} />
                    </button>
                  </li>
                );
              })}
              {list.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-white/50">No problems match these filters.</li>}
            </ul>
          </div>
        </div>

        {/* right column */}
        <aside className="space-y-4">
          <div className="depth rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
            <p className="text-[13.5px] font-semibold text-white">Progress</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-[92px] w-[92px] shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/[0.08]" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct * 97.4} 97.4`} />
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                  <b className="text-[20px] leading-none text-white">{total}</b>
                  <span className="text-[10.5px] text-white/45">/{mine.length} solved</span>
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {LEVELS.map((l) => (
                  <div key={l}>
                    <div className="flex justify-between text-[11.5px]">
                      <span className={LEVEL_TONE[l]}>{l}</span>
                      <span className="text-white/60 tabular-nums">
                        {solvedOf(l)}/{count(l)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className={cn("h-full rounded-full", BAR[l])} style={{ width: `${count(l) ? (solvedOf(l) / count(l)) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="depth rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-semibold text-white">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
              <div className="flex items-center gap-1">
                <span className={cn("mr-2 flex items-center gap-1 text-[12px] font-semibold", streak ? "text-amber-300" : "text-white/40")} title="Days in a row with a solved problem">
                  <FlameIcon size={13} /> {streak}
                </span>
                <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="rounded p-1 text-white/50 hover:bg-white/[0.06] hover:text-white">
                  <ChevronLeftIcon size={14} />
                </button>
                <button type="button" aria-label="Next month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="rounded p-1 text-white/50 hover:bg-white/[0.06] hover:text-white">
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px]">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="pb-1 text-white/35">
                  {d}
                </span>
              ))}
              {Array.from({ length: first }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const d = new Date(month.getFullYear(), month.getMonth(), i + 1).toDateString();
                const done = solvedDays.has(d);
                return (
                  <span
                    key={i}
                    title={done ? "Solved a problem" : undefined}
                    className={cn("flex h-7 items-center justify-center rounded-md tabular-nums", done ? "bg-emerald-400/20 font-semibold text-emerald-300" : "text-white/55", d === today && "ring-1 ring-accent")}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-violet-400/30 bg-violet-500/[0.08] p-4">
            {!gen.open ? (
              <button type="button" onClick={() => setGen((g) => ({ ...g, open: true }))} className="flex w-full items-center gap-3 text-left">
                <span className="tile-3d flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <SparkleIcon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-white">New problem for me</span>
                  <span className="block text-[12px] text-white/55">AI writes a fresh one, only for you</span>
                </span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[13.5px] font-semibold text-white">New problem for me</p>
                <div className="flex gap-1">
                  {LEVELS.map((l) => (
                    <button key={l} type="button" onClick={() => setGen((g) => ({ ...g, level: l }))} aria-pressed={gen.level === l} className={cn("h-8 flex-1 rounded-lg text-[12px] font-medium", gen.level === l ? "bg-accent text-black" : "bg-white/[0.05] text-white/70")}>
                      {l}
                    </button>
                  ))}
                </div>
                <input value={gen.topic} onChange={(e) => setGen((g) => ({ ...g, topic: e.target.value }))} list="code-topics" placeholder="Topic (optional), e.g. Strings" aria-label="Topic for the new problem" className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[12.5px] text-white outline-none focus:border-accent" />
                <datalist id="code-topics">
                  {topics.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
                {gen.error && <p className="text-[11.5px] text-rose-400">{gen.error}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1" disabled={gen.busy} onClick={() => setGen((g) => ({ ...g, open: false, error: "" }))}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" className="flex-1" loading={gen.busy} onClick={() => void makeNew()}>
                    {gen.busy ? "Writing…" : "Create"}
                  </Button>
                </div>
                {gen.busy && <p className="text-[11px] text-white/45">Writing and checking the problem (10–20 s)…</p>}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
