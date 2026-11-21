"use client";

/* Company-wise coding practice (/code/company).
   Pick a company from the dropdown → our practice set for its level, new AI problems
   in its style, and questions students were really asked there (shown only after the
   StudentOS team checks them). We never present AI or bank problems as past questions. */

import { FaceNotice } from "@/components/interview/face-notice";
import { useStrictRules } from "@/components/interview/strict-rules";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CompanyMock, loadMocks, mockPlan, type MockResult } from "@/components/coding/company-mock";
import { MAX_WARNINGS, enterFullscreen } from "@/components/interview/proctor";
import { CompanyLogo } from "@/components/company/company-logo";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, ClockIcon, InfoIcon, SearchIcon, SparkleIcon, TrashIcon } from "@/components/ui/icons";
import { CODING_COMPANIES, ROUNDS, companySet, customCompany, type CodingCompany, type CompanyKind, type ReportedQuestion } from "@/lib/coding/companies";
import { generateProblem, useMyProblems } from "@/lib/coding/personal";
import { LEVEL_TONE, type Level } from "@/lib/coding/types";
import { useCoding } from "@/lib/coding/use-coding";
import { auth } from "@/lib/firebase";
import { studentLine } from "@/lib/setup";
import { cn } from "@/lib/utils";

const KEY = "sos.code-company";
const OTHER_KEY = "sos.code-company-other";
const LEVELS: Level[] = ["Easy", "Medium", "Hard"];
const NOW = new Date().getFullYear();
const YEARS = Array.from({ length: 21 }, (_, i) => NOW - i);

const ERR: Record<string, string> = {
  "signed-out": "Please sign in again.",
  "not-configured": "This isn’t switched on yet. Try again later.",
  "too-short": "Write the question in a little more detail (at least 20 characters).",
  "too-many": "You can add 5 questions a day. Thank you, try again tomorrow.",
  "bad-year": "Pick the year you were asked.",
};

async function pyq<T>(body: Record<string, unknown>): Promise<T> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (!token) throw new Error(ERR["signed-out"]);
  const res = await fetch("/api/pyq", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(ERR[j.error ?? ""] ?? "Something went wrong. Try again.");
  return j;
}

function Picker({ value, onPick }: { value: CodingCompany | null; onPick: (c: CodingCompany) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [other, setOther] = useState<{ open: boolean; name: string; kind: CompanyKind }>({ open: false, name: "", kind: "Service" });
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);
  const list = CODING_COMPANIES.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div ref={box} className="relative w-full max-w-md">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} className="flex h-14 w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-3 text-left transition hover:border-accent/60">
        {value ? <CompanyLogo name={value.name} website={value.website} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" letterClassName="bg-white/10 text-white" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/50">?</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-[11.5px] text-white/45">Company</span>
          <span className="block truncate text-[15px] font-semibold text-white">{value?.name ?? "Choose a company"}</span>
        </span>
        <ChevronDownIcon size={16} className={cn("text-white/50 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#14141a] shadow-2xl">
          <label className="relative block border-b border-white/10 p-2">
            <span className="sr-only">Search companies</span>
            <SearchIcon size={14} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-white/40" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company" className="h-9 w-full rounded-lg bg-white/[0.05] pr-3 pl-9 text-[13px] text-white outline-none" />
          </label>
          <ul role="listbox" className="max-h-80 overflow-auto p-1.5">
            {(["Service", "Product"] as const).map((k) => {
              const items = list.filter((c) => c.kind === k);
              if (!items.length) return null;
              return (
                <li key={k}>
                  <p className="px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-white/40 uppercase">{k === "Service" ? "Service companies" : "Product companies"}</p>
                  <ul>
                    {items.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={value?.id === c.id}
                          onClick={() => {
                            onPick(c);
                            setOpen(false);
                            setQ("");
                          }}
                          className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-white/[0.06]", value?.id === c.id ? "text-accent" : "text-white/85")}
                        >
                          <CompanyLogo name={c.name} website={c.website} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" letterClassName="bg-white/10 text-white text-[12px]" />
                          <span className="flex-1">{c.name}</span>
                          {value?.id === c.id && <CheckIcon size={14} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            {!list.length && <li className="px-3 pt-3 pb-1 text-[13px] text-white/50">Not in our list yet. Add it as another company below.</li>}
          </ul>
          <div className="border-t border-white/10 p-2.5">
            {!other.open ? (
              <button type="button" onClick={() => setOther((o) => ({ ...o, open: true, name: o.name || q.trim() }))} className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-accent hover:bg-white/[0.06]">
                + Other company{q.trim() && !list.length ? `: “${q.trim()}”` : "…"}
              </button>
            ) : (
              <div className="space-y-2">
                <input autoFocus value={other.name} onChange={(e) => setOther((o) => ({ ...o, name: e.target.value }))} placeholder="Company name, e.g. Mu Sigma" aria-label="Company name" className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-[13px] text-white outline-none focus:border-accent" />
                <div className="flex gap-1">
                  {(["Service", "Product"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setOther((o) => ({ ...o, kind: k }))} aria-pressed={other.kind === k} className={cn("h-8 flex-1 rounded-lg text-[12px] font-medium", other.kind === k ? "bg-accent text-black" : "bg-white/[0.05] text-white/70")}>
                      {k === "Service" ? "Service / IT company" : "Product / tech company"}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  disabled={other.name.trim().length < 2}
                  onClick={() => {
                    onPick(customCompany(other.name, other.kind));
                    setOpen(false);
                    setQ("");
                    setOther({ open: false, name: "", kind: "Service" });
                  }}
                >
                  Practise for {other.name.trim() || "this company"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanyCoding() {
  const router = useRouter();
  const mine = useMyProblems();
  const { coding, addCustom, state } = useCoding();
  const [co, setCo] = useState<CodingCompany | null>(null);
  const [asked, setAsked] = useState<{ list: ReportedQuestion[]; loading: boolean; error: string; team: boolean }>({ list: [], loading: false, error: "", team: false });
  const [pending, setPending] = useState<ReportedQuestion[]>([]);
  const [gen, setGen] = useState<{ level: Level; busy: string; error: string }>({ level: "Easy", busy: "", error: "" });
  const [mock, setMock] = useState(false);
  const [strict, setStrict] = useState(true);
  const rules = useStrictRules("coding round");
  const [mocks, setMocks] = useState<MockResult[]>([]);
  const [form, setForm] = useState({ open: false, year: NOW, round: "Coding round", role: "", question: "", busy: false, msg: "", error: "" });

  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("c") || localStorage.getItem(KEY) || "";
      const c = CODING_COMPANIES.find((x) => x.id === id);
      if (c) setCo(c);
      else if (id.startsWith("x-")) {
        const o = JSON.parse(localStorage.getItem(OTHER_KEY) || "null") as { name?: string; kind?: CompanyKind } | null;
        if (o?.name) setCo(customCompany(o.name, o.kind === "Product" ? "Product" : "Service"));
      }
    } catch {}
  }, []);

  useEffect(() => setMocks(loadMocks()), [mock]);

  useEffect(() => {
    if (!co) return;
    setMock(false);
    try {
      localStorage.setItem(KEY, co.id);
      if (co.id.startsWith("x-")) localStorage.setItem(OTHER_KEY, JSON.stringify({ name: co.name, kind: co.kind }));
    } catch {}
    setGen((g) => ({ ...g, level: co.kind === "Service" ? "Easy" : "Medium", error: "" }));
    setForm((f) => ({ ...f, open: false, msg: "", error: "" }));
    setAsked((a) => ({ ...a, list: [], loading: true, error: "" }));
    let live = true;
    pyq<{ questions: ReportedQuestion[]; team: boolean }>({ action: "list", company: co.id })
      .then((j) => {
        if (!live) return;
        setAsked({ list: j.questions, loading: false, error: "", team: j.team });
        if (j.team) pyq<{ questions: ReportedQuestion[] }>({ action: "pending" }).then((p) => live && setPending(p.questions)).catch(() => {});
      })
      .catch((e) => live && setAsked((a) => ({ ...a, loading: false, error: e instanceof Error ? e.message : "" })));
    return () => {
      live = false;
    };
  }, [co]);

  const make = async (key: string, like?: string) => {
    if (!co) return;
    setGen((g) => ({ ...g, busy: key, error: "" }));
    try {
      const np = await generateProblem({
        level: gen.level,
        company: co.name,
        like,
        profile: studentLine(state.setup?.academic) || [state.setup?.academic.course, state.setup?.skills.level].filter(Boolean).join(" · "),
        avoid: mine.map((x) => x.title),
      });
      const p = { ...np, topics: [`${co.name} style`, ...np.topics].slice(0, 3) };
      addCustom(p);
      router.push(`/code/${p.id}`);
    } catch (e) {
      setGen((g) => ({ ...g, busy: "", error: e instanceof Error ? e.message : "Couldn’t make a problem. Try again." }));
    }
  };

  const submit = async () => {
    if (!co) return;
    setForm((f) => ({ ...f, busy: true, error: "", msg: "" }));
    try {
      await pyq({ action: "add", company: co.id, companyName: co.name, year: form.year, round: form.round, role: form.role, question: form.question });
      setForm((f) => ({ ...f, busy: false, open: false, question: "", role: "", msg: "Thank you! Our team will check it and add it here for every student." }));
    } catch (e) {
      setForm((f) => ({ ...f, busy: false, error: e instanceof Error ? e.message : "" }));
    }
  };

  const review = async (id: string, approve: boolean) => {
    try {
      await pyq({ action: "review", id, approve });
      setPending((p) => p.filter((x) => x.id !== id));
    } catch {}
  };

  const set = co ? companySet(co) : [];
  const solved = set.filter((p) => coding.solved[p.id]).length;
  const nameOf = (q: ReportedQuestion) => CODING_COMPANIES.find((c) => c.id === q.company)?.name ?? q.companyName ?? q.company;

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-white">Company-wise practice</h1>
          <p className="text-[13.5px] text-white/60">Choose a company and practise for its coding round.</p>
        </div>
        <Link href="/code" className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-[12.5px] text-white/70 hover:text-white">
          <ArrowLeftIcon size={13} /> Practice Problems
        </Link>
      </div>

      {co && mock && <CompanyMock company={co} strict={strict} onExit={() => setMock(false)} profile={studentLine(state.setup?.academic) || [state.setup?.academic.course, state.setup?.skills.level].filter(Boolean).join(" · ")} avoid={mine.map((x) => x.title)} />}

      {!mock && (
      <>
      <div className="mt-6">
        <Picker value={co} onPick={setCo} />
      </div>

      {!co && (
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {CODING_COMPANIES.map((c) => (
            <button key={c.id} type="button" onClick={() => setCo(c)} className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-[12px] text-white/75 transition hover:border-accent/50 hover:text-white">
              <CompanyLogo name={c.name} website={c.website} className="flex h-10 w-10 items-center justify-center rounded-lg" letterClassName="bg-white/10 text-white" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {co && (
        <>
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-sky-100/80">
            <InfoIcon size={15} className="mt-0.5 shrink-0 text-sky-300" />
            <p>
              We don’t show “previous year papers” we can’t verify. The practice set and AI problems are <b>our picks for {co.name}’s level</b>, not past questions. Real questions appear in “Asked at {co.name}” only after a student reports them and our team checks them.
            </p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-6">
              {/* practice set */}
              <section>
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold text-white">Practice set for {co.name}</h2>
                    <p className="text-[12.5px] text-white/50">
                      {co.kind === "Service" ? "Mostly Easy, some Medium" : "Mostly Medium, some Hard"}
                      {co.id.startsWith("x-") && ` (picked for a ${co.kind.toLowerCase()} company)`} · focus: {co.focus.join(", ")}
                    </p>
                  </div>
                  <span className="text-[12.5px] text-white/50">
                    <b className="text-white">{solved}</b>/{set.length} solved
                  </span>
                </div>
                <ul className="depth mt-3 overflow-hidden rounded-xl border border-white/[0.07]">
                  {set.map((p, i) => (
                    <li key={p.id} className={cn("group relative grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 hover:bg-white/[0.05] sm:grid-cols-[28px_minmax(0,1fr)_170px_70px]", i % 2 === 1 && "bg-white/[0.022]")}>
                      <span>{coding.solved[p.id] ? <CheckIcon size={15} className="text-emerald-400" /> : <span className="block h-3.5 w-3.5" />}</span>
                      <Link href={`/code/${p.id}`} className="truncate text-[13.5px] text-white/90 after:absolute after:inset-0 group-hover:text-white">
                        {p.title}
                      </Link>
                      <span className="hidden truncate text-[12px] text-white/50 sm:block">{p.topics.join(", ")}</span>
                      <span className={cn("text-[12.5px] font-medium", LEVEL_TONE[p.level])}>{p.level === "Medium" ? "Med." : p.level}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* reported questions */}
              <section>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-[16px] font-semibold text-white">Asked at {co.name}</h2>
                    <p className="text-[12.5px] text-white/50">Reported by students from their own interviews · checked by StudentOS</p>
                  </div>
                  {!form.open && (
                    <Button size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, open: true, msg: "" }))}>
                      + I was asked a question here
                    </Button>
                  )}
                </div>

                {form.msg && <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-[12.5px] text-emerald-300">{form.msg}</p>}

                {form.open && (
                  <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[13.5px] font-semibold text-white">Add a question you were asked at {co.name}</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="text-[11.5px] text-white/50">
                        Year
                        <select value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[13px] text-white [&>option]:bg-[#1a1a1f]">
                          {YEARS.map((y) => (
                            <option key={y}>{y}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11.5px] text-white/50">
                        Round
                        <select value={form.round} onChange={(e) => setForm((f) => ({ ...f, round: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[13px] text-white [&>option]:bg-[#1a1a1f]">
                          {ROUNDS.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11.5px] text-white/50">
                        Role (optional)
                        <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="e.g. Ninja, Digital" className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[13px] text-white outline-none focus:border-accent" />
                      </label>
                    </div>
                    <label className="block text-[11.5px] text-white/50">
                      The question, as you remember it
                      <textarea value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} rows={4} placeholder="e.g. Given a string, print the first character that does not repeat…" className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-accent" />
                    </label>
                    {form.error && <p className="text-[12px] text-rose-400">{form.error}</p>}
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" disabled={form.busy} onClick={() => setForm((f) => ({ ...f, open: false, error: "" }))}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="primary" loading={form.busy} onClick={() => void submit()}>
                        Send for checking
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-3 space-y-2.5">
                  {asked.loading && <p className="text-[12.5px] text-white/45">Loading…</p>}
                  {asked.error && <p className="text-[12.5px] text-rose-400">{asked.error}</p>}
                  {!asked.loading && !asked.error && !asked.list.length && (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/50">No checked questions for {co.name} yet. Were you asked one? Add it, and help your juniors.</p>
                  )}
                  {asked.list.map((q) => (
                    <div key={q.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <p className="text-[11.5px] text-white/45">
                        {q.year} · {q.round}
                        {q.role && ` · ${q.role}`} · reported by a student
                      </p>
                      <p className="mt-1.5 text-[13.5px] whitespace-pre-wrap text-white/90">{q.question}</p>
                      <Button size="sm" variant="ghost" className="mt-2" loading={gen.busy === q.id} disabled={!!gen.busy} onClick={() => void make(q.id, q.question)}>
                        <SparkleIcon size={13} /> Practise a problem like this
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              {asked.team && pending.length > 0 && (
                <section className="rounded-xl border border-amber-300/30 bg-amber-300/[0.05] p-4">
                  <h2 className="text-[14px] font-semibold text-amber-200">Team: waiting for your check ({pending.length})</h2>
                  <ul className="mt-3 space-y-2.5">
                    {pending.map((q) => (
                      <li key={q.id} className="rounded-lg bg-black/20 p-3">
                        <p className="text-[11.5px] text-white/50">
                          {nameOf(q)} · {q.year} · {q.round}
                          {q.role && ` · ${q.role}`}
                        </p>
                        <p className="mt-1 text-[13px] whitespace-pre-wrap text-white/85">{q.question}</p>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="primary" onClick={() => void review(q.id, true)}>
                            <CheckIcon size={13} /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void review(q.id, false)}>
                            <TrashIcon size={13} /> Remove
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* new AI problem in this company's style */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-accent/40 bg-accent/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-black">
                    <ClockIcon size={18} />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{co.name} mock coding round</p>
                    <p className="text-[12px] text-white/55">
                      2 fresh problems in {co.name}’s style ({mockPlan(co).levels.join(" + ")}) · {mockPlan(co).mins} minutes · new ones every round
                    </p>
                  </div>
                </div>
                {(() => {
                  const last = mocks.find((m) => m.company === co.id);
                  return last ? (
                    <p className="mt-3 text-[12px] text-white/60">
                      Last try: <b className="text-white">{last.score}%</b> · {new Date(last.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  ) : null;
                })()}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-[12.5px] text-white/75">
                  Strict mode
                  <button type="button" role="switch" aria-checked={strict} aria-label="Strict mode" onClick={() => setStrict(!strict)} className={cn("relative h-5 w-9 rounded-full transition", strict ? "bg-cyan-400" : "bg-white/15")}>
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", strict ? "left-[18px]" : "left-0.5")} />
                  </button>
                </div>
                {strict && <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">Full screen, no other tabs, no copy or paste. The camera checks you look at the screen, are alone and have no phone in view; the mic checks for talking. {MAX_WARNINGS} warnings and the round closes. Nothing is recorded.</p>}
                {strict && <FaceNotice className="mt-2" />}
                {rules.modal}
                <Button
                  variant="primary"
                  className="mt-3 w-full"
                  onClick={() => {
                    const go = () => {
                      if (strict) enterFullscreen();
                      setMock(true);
                    };
                    if (strict) rules.ask(go);
                    else go();
                  }}
                >
                  Start mock round
                </Button>
              </div>
              <div className="rounded-xl border border-violet-400/30 bg-violet-500/[0.08] p-4">
                <div className="flex items-center gap-3">
                  <CompanyLogo name={co.name} website={co.website} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" letterClassName="bg-white/10 text-white" />
                  <div>
                    <p className="text-[14px] font-semibold text-white">New {co.name}-style problem</p>
                    <p className="text-[12px] text-white/55">AI writes a fresh one at this level. Practice, not a past question.</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-1">
                  {LEVELS.map((l) => (
                    <button key={l} type="button" onClick={() => setGen((g) => ({ ...g, level: l }))} aria-pressed={gen.level === l} className={cn("h-8 flex-1 rounded-lg text-[12px] font-medium", gen.level === l ? "bg-accent text-black" : "bg-white/[0.05] text-white/70")}>
                      {l}
                    </button>
                  ))}
                </div>
                <Button variant="primary" className="mt-3 w-full" loading={gen.busy === "new"} disabled={!!gen.busy} onClick={() => void make("new")}>
                  {gen.busy === "new" ? "Writing…" : "Create problem"}
                </Button>
                {gen.busy && <p className="mt-2 text-[11px] text-white/45">Writing and checking the problem (10–20 s)…</p>}
                {gen.error && <p className="mt-2 text-[11.5px] text-rose-400">{gen.error}</p>}
              </div>
            </aside>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
