"use client";

/* A company's online test for a partner drive, run on StudentOS in strict mode
   (full screen, camera, voice and tab checks). The recruiter writes questions or
   adds them from StudentOS's aptitude bank, picks the round, and opens the test
   when it's time. Answers stay on the server; students never see them. */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, PencilIcon, PlusIcon, ShieldIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { SECTION_LABEL, TOPICS, makeQuestion, type Section } from "@/lib/aptitude";
import { partnerApi, partnerErrorText, type CompanyTest, type TestQuestion, type TestSummary } from "@/lib/partner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Problem } from "@/lib/coding/types";
import { LEVEL_TONE } from "@/lib/coding/types";

const blankQ = (): TestQuestion => ({ q: "", options: ["", "", "", ""], answer: 0 });

/** Questions from the aptitude bank, spread evenly over the section's topics. */
function fromBank(section: Section | "mixed", n: number): TestQuestion[] {
  const topics = TOPICS.filter((t) => section === "mixed" || t.section === section);
  return Array.from({ length: n }, (_, i) => {
    const q = makeQuestion(topics[i % topics.length].id);
    return { q: q.q, options: q.options, answer: q.answer };
  });
}

export function TestCard({ pid, rounds, summary, onSaved }: { pid: string; rounds: string[]; summary: TestSummary | null; onSaved: () => void }) {
  const { actions } = useStore();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const r = await partnerApi<{ test: CompanyTest | null }>("company-test-get", { pid });
      if (!r.test) return;
      await partnerApi("company-test-save", { pid, test: { ...r.test, open: !r.test.open } });
      actions.toast(r.test.open ? "Test closed. Students can’t start it now." : "Test is open. Students in that round can start it.");
      onSaved();
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent"><ShieldIcon size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-white">{summary ? summary.title : "Online test on StudentOS"}</p>
          <p className="text-[12.5px] text-white/55">
            {summary
              ? `${summary.count} MCQ${summary.coding ? ` + ${summary.coding} coding` : ""} · ${summary.minutes} min · for “${rounds[summary.round] ?? `Round ${summary.round + 1}`}” · strict mode`
              : "Run your aptitude or MCQ round here: full screen, camera, voice and tab checks, scored for you."}
          </p>
        </div>
        {summary && (
          <span className={cn("rounded-md px-2 py-0.5 text-[11.5px] font-semibold", summary.open ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-white/55")}>{summary.open ? "Open" : "Closed"}</span>
        )}
        {summary && <Button size="sm" loading={busy} onClick={() => void toggle()}>{summary.open ? "Close test" : "Open test"}</Button>}
        <Button size="sm" variant={summary ? "ghost" : "primary"} icon={summary ? <PencilIcon size={13} /> : <PlusIcon size={13} />} onClick={() => setEdit(true)}>{summary ? "Edit" : "Create test"}</Button>
      </div>
      {summary && <p className="mt-3 text-[11.5px] text-white/40">Move shortlisted students to “{rounds[summary.round] ?? `Round ${summary.round + 1}`}”, then open the test. Each student gets one attempt; scores show in the Test column below.</p>}
      {edit && <TestEditor pid={pid} rounds={rounds} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); onSaved(); }} />}
    </section>
  );
}

/** Where the editor loads and saves the test: a company drive by default, or a StudentOS careers role. */
export type TestEditorIO = { get: () => Promise<{ test: CompanyTest | null }>; save: (test: CompanyTest) => Promise<{ count: number }>; errorText: (e: unknown) => string };

export function TestEditor({ pid, rounds, onClose, onSaved, io }: { pid: string; rounds: string[]; onClose: () => void; onSaved: () => void; io?: TestEditorIO }) {
  const api: TestEditorIO = io ?? {
    get: () => partnerApi<{ test: CompanyTest | null }>("company-test-get", { pid }),
    save: (test) => partnerApi<{ count: number }>("company-test-save", { pid, test }),
    errorText: partnerErrorText,
  };
  const { actions } = useStore();
  const [t, setT] = useState<CompanyTest | null>(null);
  const [busy, setBusy] = useState(false);
  const [bank, setBank] = useState<{ section: Section | "mixed"; n: number }>({ section: "mixed", n: 20 });
  // StudentOS coding problems: loaded only when the editor opens (it's a big list)
  const [problems, setProblems] = useState<Problem[] | null>(null);
  useEffect(() => {
    void import("@/lib/coding/problems").then((m) => setProblems(m.PROBLEMS));
  }, []);
  const coding = t?.coding ?? [];
  const toggleCode = (id: string) => setT((x) => x && { ...x, coding: coding.includes(id) ? coding.filter((c) => c !== id) : [...coding, id].slice(0, 3) });
  useEffect(() => {
    api
      .get()
      .then((r) => setT(r.test ? { ...r.test, round: r.test.round ?? 0, open: r.test.open ?? false } : { round: Math.max(0, rounds.findIndex((r) => /test|assess|aptitude|online/i.test(r))), title: "Online assessment", minutes: 30, open: false, questions: [] }))
      .catch((e) => {
        actions.toast(api.errorText(e));
        onClose();
      });
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps

  const setQ = (i: number, q: Partial<TestQuestion>) => setT((x) => x && { ...x, questions: x.questions.map((y, k) => (k === i ? { ...y, ...q } : y)) });
  const save = async () => {
    if (!t) return;
    const qs = t.questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()) })).filter((q) => q.q.trim() && q.options.filter(Boolean).length >= 2);
    if (!qs.length && !(t.coding ?? []).length) return actions.toast("Add at least one question or coding problem.");
    if (qs.some((q) => !q.options[q.answer])) return actions.toast("Mark the right answer on every question.");
    setBusy(true);
    try {
      // drop empty options, keeping the right answer pointing at the same text
      const clean = qs.map((q) => {
        const right = q.options[q.answer];
        const options = q.options.filter(Boolean);
        return { q: q.q.trim(), options, answer: options.indexOf(right) };
      });
      const r = await api.save({ ...t, questions: clean });
      actions.toast(`Test saved: ${r.count} MCQ${(t.coding ?? []).length ? ` + ${(t.coding ?? []).length} coding` : ""}.`);
      onSaved();
    } catch (e) {
      actions.toast(api.errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label="Online test" className="relative flex h-full w-full max-w-[720px] flex-col border-l border-white/10 bg-[#121118]">
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-6 py-4">
          <h2 className="flex-1 text-[17px] font-semibold">Online test</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><XIcon size={16} /></button>
        </header>
        {!t ? (
          <div className="m-6 h-40 animate-pulse rounded-xl bg-white/[0.04]" />
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className={cn("grid gap-3", rounds.length > 1 ? "sm:grid-cols-[1fr_110px_1fr]" : "sm:grid-cols-[1fr_110px]")}>
              <div><Label htmlFor="tt">Title</Label><Input id="tt" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} /></div>
              <div><Label htmlFor="tm">Minutes</Label><Input id="tm" type="number" min={5} max={180} value={t.minutes} onChange={(e) => setT({ ...t, minutes: Number(e.target.value) || 0 })} /></div>
              {rounds.length > 1 && <div>
                <Label htmlFor="tr">For round</Label>
                <select id="tr" value={t.round} onChange={(e) => setT({ ...t, round: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white">
                  {rounds.map((r, i) => <option key={i} value={i}>{r}</option>)}
                </select>
              </div>}
            </div>

            <div className="rounded-xl border border-accent/25 bg-accent/[0.05] p-4">
              <p className="text-[13px] font-semibold text-white">Add from the StudentOS question bank</p>
              <p className="mt-0.5 text-[12px] text-white/55">Aptitude questions made fresh for your test: numbers change every time, so answers can’t be copied from the internet.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select value={bank.section} onChange={(e) => setBank({ ...bank, section: e.target.value as Section | "mixed" })} className="h-9 rounded-lg border border-white/10 bg-field px-2 text-[13px] text-white">
                  <option value="mixed">Mixed (quant, logical, verbal)</option>
                  {(Object.keys(SECTION_LABEL) as Section[]).map((s) => <option key={s} value={s}>{SECTION_LABEL[s]}</option>)}
                </select>
                <select value={bank.n} onChange={(e) => setBank({ ...bank, n: Number(e.target.value) })} className="h-9 rounded-lg border border-white/10 bg-field px-2 text-[13px] text-white">
                  {[10, 20, 30, 40].map((n) => <option key={n} value={n}>{n} questions</option>)}
                </select>
                <Button size="sm" variant="primary" icon={<PlusIcon size={13} />} onClick={() => setT({ ...t, questions: [...t.questions, ...fromBank(bank.section, bank.n)].slice(0, 100) })}>Add</Button>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold text-white">Coding problems <span className="text-white/45">{coding.length}/3</span></p>
                <p className="text-[11.5px] text-white/45">Python or JavaScript · checked on hidden tests</p>
              </div>
              <p className="mt-0.5 text-[12px] text-white/55">Pick up to 3 from StudentOS’s problems. Students see the examples; the hidden test answers stay on our server.</p>
              {!problems ? (
                <div className="mt-3 h-24 animate-pulse rounded-lg bg-white/[0.04]" />
              ) : (
                <div className="mt-3 grid max-h-[220px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {problems.map((pr) => {
                    const on = coding.includes(pr.id);
                    return (
                      <label key={pr.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12.5px]", on ? "border-accent/60 bg-accent/10" : "border-white/10 hover:border-white/25", !on && coding.length >= 3 && "opacity-45")}>
                        <input type="checkbox" checked={on} disabled={!on && coding.length >= 3} onChange={() => toggleCode(pr.id)} className="accent-[#a78bfa]" />
                        <span className="min-w-0 flex-1 truncate text-white">{pr.title}</span>
                        <span className={cn("text-[11px] font-semibold", LEVEL_TONE[pr.level])}>{pr.level}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">Questions <span className="text-white/45">{t.questions.length}</span></p>
                <Button size="sm" icon={<PlusIcon size={13} />} onClick={() => setT({ ...t, questions: [...t.questions, blankQ()].slice(0, 100) })}>Write a question</Button>
              </div>
              {t.questions.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-[13px] text-white/50">No MCQs yet. Add from the bank or write your own{coding.length ? ", or keep it coding only" : ""}.</p>}
              {t.questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 w-6 text-[12px] font-semibold text-white/45">{i + 1}.</span>
                    <Textarea value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} rows={2} placeholder="Question" className="flex-1" />
                    <button type="button" onClick={() => setT({ ...t, questions: t.questions.filter((_, k) => k !== i) })} aria-label={`Remove question ${i + 1}`} className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-rose-300"><TrashIcon size={14} /></button>
                  </div>
                  <div className="mt-2 grid gap-2 pl-8 sm:grid-cols-2">
                    {q.options.map((o, k) => (
                      <label key={k} className={cn("flex items-center gap-2 rounded-lg border px-2.5", q.answer === k ? "border-emerald-400/50 bg-emerald-400/[0.06]" : "border-white/10")}>
                        <input type="radio" name={`ans-${i}`} checked={q.answer === k} onChange={() => setQ(i, { answer: k })} className="accent-[#34d399]" aria-label={`Option ${k + 1} is right`} />
                        <input value={o} onChange={(e) => setQ(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} placeholder={`Option ${k + 1}`} className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none" />
                        {q.answer === k && <CheckIcon size={13} className="text-emerald-300" />}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <footer className="flex items-center gap-3 border-t border-white/[0.07] px-6 py-4">
          <p className="flex-1 text-[11.5px] text-white/45">The green option is the right answer. Students never see answers; StudentOS scores the test on the server.</p>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!t} onClick={() => void save()}>Save test</Button>
        </footer>
      </aside>
    </div>
  );
}

/** The Test column: score, warnings, or where the student is. */
export function TestCell({ r }: { r: import("@/lib/partner").TestResult | null | undefined }) {
  if (!r) return <span className="text-white/35">—</span>;
  if ("started" in r) return <span className="text-[12px] text-amber-200">In progress</span>;
  const pct = r.total ? Math.round((r.correct / r.total) * 100) : r.coding?.length ? Math.round((r.coding.filter((c) => c.passed === c.total).length / r.coding.length) * 100) : 0;
  return (
    <span className="inline-flex flex-col">
      <span className={cn("font-semibold tabular-nums", pct >= 70 ? "text-emerald-300" : pct >= 50 ? "text-cyan-200" : "text-amber-300")}>
        {r.total ? <>{r.correct}/{r.total} <span className="text-[11px] font-normal text-white/45">{pct}%</span></> : null}
      </span>
      {!!r.coding?.length && (
        <span className="text-[11.5px] text-white/70" title={r.coding.map((c) => `${c.title}: ${c.passed}/${c.total} tests (${c.lang})`).join("\n")}>
          Coding {r.coding.filter((c) => c.passed === c.total).length}/{r.coding.length} solved
        </span>
      )}
      {(r.warnings.length > 0 || r.ended || r.late) && (
        <span className={cn("text-[11px]", r.ended ? "text-rose-300" : "text-amber-200")} title={r.warnings.join(", ")}>
          {r.ended ? "Ended: too many warnings" : `${r.warnings.length} warning${r.warnings.length === 1 ? "" : "s"}`}{r.late ? " · late" : ""}
        </span>
      )}
    </span>
  );
}
