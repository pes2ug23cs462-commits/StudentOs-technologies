"use client";

/* The company's AI technical interview for a partner drive: topics and (optional)
   own questions, the round, open/close; the result column; and the full report with
   every question and answer. */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, MicIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { BREACH_TEXT, type Breach } from "@/components/interview/proctor";
import { partnerApi, partnerErrorText, type Applicant, type IvAttemptFull, type IvKind, type IvResult, type IvSetup, type IvSummary } from "@/lib/partner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const verdictTone = (v: string) => (v === "Strong yes" ? "text-emerald-300" : v === "Yes" ? "text-cyan-200" : v === "Maybe" ? "text-amber-200" : "text-rose-300");

const KIND = {
  technical: { name: "AI technical interview", title: "Technical interview", blurb: "StudentOS’s AI interviewer asks every shortlisted student your technical questions, by voice, and gives you a scored report.", focus: "e.g. Java, OOP, DBMS joins, one project they built", own: "e.g. Explain the difference between an abstract class and an interface.", hint: "The AI writes questions on these topics for the role.", round: /tech|interview/i },
  hr: { name: "AI HR interview", title: "HR interview", blurb: "Asha runs a first HR round: about them, why your company, strengths, teamwork and fit. Use it to screen, then meet the best live.", focus: "e.g. communication, why our company, relocation to Bangalore, night shifts, joining in July", own: "e.g. Are you open to working in any of our cities?", hint: "The AI writes HR questions on these points. It never asks about religion, caste, marriage, health or family plans.", round: /hr/i },
} as const;

export function IvCard({ pid, kind = "technical", rounds, summary, onSaved }: { pid: string; kind?: IvKind; rounds: string[]; summary: IvSummary | null; onSaved: () => void }) {
  const K = KIND[kind];
  const { actions } = useStore();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const r = await partnerApi<{ iv: IvSetup | null }>("company-iv-get", { pid, kind });
      if (!r.iv) return;
      await partnerApi("company-iv-save", { pid, kind, iv: { ...r.iv, open: !r.iv.open } });
      actions.toast(r.iv.open ? `${K.name} closed.` : `${K.name} is open. Students in that round can start it.`);
      onSaved();
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  const round = summary ? rounds[summary.round] ?? `Round ${summary.round + 1}` : "";
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0f0f11] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", kind === "hr" ? "bg-cyan-400/15 text-cyan-200" : "bg-violet-400/15 text-violet-200")}><MicIcon size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-white">{summary ? summary.title : K.name}</p>
          <p className="text-[12.5px] text-white/55">{summary ? `${kind === "hr" ? "HR · " : ""}${summary.count} questions · for “${round}”${summary.focus ? ` · ${summary.focus}` : ""} · strict mode` : K.blurb}</p>
        </div>
        {summary && <span className={cn("rounded-md px-2 py-0.5 text-[11.5px] font-semibold", summary.open ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-white/55")}>{summary.open ? "Open" : "Closed"}</span>}
        {summary && <Button size="sm" loading={busy} onClick={() => void toggle()}>{summary.open ? "Close" : "Open"}</Button>}
        <Button size="sm" variant={summary ? "ghost" : "primary"} icon={summary ? <PencilIcon size={13} /> : <PlusIcon size={13} />} onClick={() => setEdit(true)}>{summary ? "Edit" : "Set up"}</Button>
      </div>
      {edit && <IvEditor pid={pid} kind={kind} rounds={rounds} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); onSaved(); }} />}
    </section>
  );
}

function IvEditor({ pid, kind, rounds, onClose, onSaved }: { pid: string; kind: IvKind; rounds: string[]; onClose: () => void; onSaved: () => void }) {
  const K = KIND[kind];
  const { actions } = useStore();
  const [iv, setIv] = useState<IvSetup | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    partnerApi<{ iv: IvSetup | null }>("company-iv-get", { pid, kind })
      .then((r) => setIv(r.iv ?? { kind, round: Math.max(0, rounds.findIndex((x) => K.round.test(x))), title: K.title, focus: "", questions: [], count: kind === "hr" ? 5 : 6, open: false }))
      .catch((e) => {
        actions.toast(partnerErrorText(e));
        onClose();
      });
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!iv) return;
    setBusy(true);
    try {
      await partnerApi("company-iv-save", { pid, kind, iv: { ...iv, questions: iv.questions.map((q) => q.trim()).filter(Boolean) } });
      actions.toast(`${K.name} saved.`);
      onSaved();
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label={K.name} className="relative flex h-full w-full max-w-[620px] flex-col border-l border-white/10 bg-[#121118]">
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-6 py-4">
          <h2 className="flex-1 text-[17px] font-semibold">{K.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><XIcon size={16} /></button>
        </header>
        {!iv ? (
          <div className="m-6 h-40 animate-pulse rounded-xl bg-white/[0.04]" />
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_110px]">
              <div><Label htmlFor="it">Title</Label><Input id="it" value={iv.title} onChange={(e) => setIv({ ...iv, title: e.target.value })} /></div>
              <div>
                <Label htmlFor="ir">For round</Label>
                <select id="ir" value={iv.round} onChange={(e) => setIv({ ...iv, round: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white">
                  {rounds.map((r, i) => <option key={i} value={i}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="ic">Questions</Label>
                <select id="ic" value={iv.count} onChange={(e) => setIv({ ...iv, count: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white">
                  {[3, 4, 5, 6, 7, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="if">{kind === "hr" ? "What to check" : "Topics to check"}</Label>
              <Textarea id="if" rows={2} value={iv.focus} onChange={(e) => setIv({ ...iv, focus: e.target.value })} placeholder={K.focus} />
              <p className="mt-1 text-[11.5px] text-white/45">{K.hint} Each student gets their own set, so answers can’t be passed around.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">Your own questions <span className="font-normal text-white/45">(optional, asked first)</span></p>
                <Button size="sm" icon={<PlusIcon size={13} />} disabled={iv.questions.length >= iv.count} onClick={() => setIv({ ...iv, questions: [...iv.questions, ""] })}>Add</Button>
              </div>
              {iv.questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2.5 w-5 text-[12px] text-white/45">{i + 1}.</span>
                  <Textarea rows={2} value={q} onChange={(e) => setIv({ ...iv, questions: iv.questions.map((x, k) => (k === i ? e.target.value : x)) })} placeholder={K.own} className="flex-1" />
                  <button type="button" onClick={() => setIv({ ...iv, questions: iv.questions.filter((_, k) => k !== i) })} aria-label={`Remove question ${i + 1}`} className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-rose-300"><TrashIcon size={14} /></button>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-[12.5px] text-white/60">
              Students take it in strict mode: full screen, camera on, a check that the voice heard is theirs, and no one else in view. You get a score out of 100, a verdict, strengths, concerns and every answer.{kind === "hr" ? " The final HR call stays with your team: schedule a live interview for the students you pick." : ""}
            </div>
          </div>
        )}
        <footer className="flex justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!iv} onClick={() => void save()}>Save</Button>
        </footer>
      </aside>
    </div>
  );
}

export function IvCell({ r, onOpen }: { r: IvResult | null | undefined; onOpen: () => void }) {
  if (!r) return <span className="text-white/35">—</span>;
  if ("started" in r) return <span className="text-[12px] text-amber-200">In progress · {r.index}/{r.total}</span>;
  return (
    <button type="button" onClick={onOpen} className="inline-flex flex-col text-left hover:opacity-80">
      <span className="font-semibold tabular-nums text-white">{r.overall ?? "…"}<span className="text-[11px] font-normal text-white/45">/100</span> <span className={cn("text-[11.5px] font-medium", verdictTone(r.verdict))}>{r.verdict}</span></span>
      {(r.warnings.length > 0 || r.ended) && <span className={cn("text-[11px]", r.ended ? "text-rose-300" : "text-amber-200")}>{r.ended ? "Ended: too many warnings" : `${r.warnings.length} warning${r.warnings.length === 1 ? "" : "s"}`}</span>}
      <span className="text-[11px] text-accent">View report</span>
    </button>
  );
}

/** Every question, answer and score, plus the AI's summary. */
export function IvReportDrawer({ pid, a, kind = "technical", onClose }: { pid: string; a: Applicant; kind?: IvKind; onClose: () => void }) {
  const { actions } = useStore();
  const [x, setX] = useState<IvAttemptFull | null>(null);
  const [busy, setBusy] = useState(false);
  const load = (retry = false) =>
    partnerApi<{ attempt: IvAttemptFull }>("company-iv-report", { pid, kind, cid: a.cid, uid: a.uid, retry })
      .then((r) => setX(r.attempt))
      .catch((e) => actions.toast(partnerErrorText(e)));
  useEffect(() => {
    void load();
  }, [pid, a.cid, a.uid, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const rep = x?.report;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label={`${KIND[kind].name} report for ${a.name}`} className="relative h-full w-full max-w-[560px] overflow-y-auto border-l border-white/10 bg-[#121118] p-6">
        <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"><ArrowLeftIcon size={13} /> Back</button>
        <h2 className="mt-4 text-[22px] font-semibold">{a.name}</h2>
        <p className="text-[13px] text-white/55">{KIND[kind].name} · {a.college}</p>
        {!x ? (
          <div className="mt-6 h-40 animate-pulse rounded-xl bg-white/[0.04]" />
        ) : (
          <>
            {rep ? (
              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-[34px] font-bold tabular-nums">{rep.overall}</span>
                  <span className="text-white/45">/100</span>
                  <span className={cn("ml-auto text-[14px] font-semibold", verdictTone(rep.verdict))}>{rep.verdict}</span>
                </div>
                <p className="mt-2 text-[13.5px] text-white/80">{rep.summary}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[12.5px]">
                  <div><p className="font-semibold text-emerald-300">Strengths</p><ul className="mt-1 list-disc pl-4 text-white/70">{rep.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
                  <div><p className="font-semibold text-amber-200">Concerns</p><ul className="mt-1 list-disc pl-4 text-white/70">{rep.concerns.map((s) => <li key={s}>{s}</li>)}</ul></div>
                </div>
              </div>
            ) : x.done ? (
              <div className="mt-5 rounded-xl bg-white/[0.04] p-4 text-[13px] text-white/70">
                The report couldn’t be made yet.
                <Button size="sm" className="ml-3" loading={busy} onClick={async () => { setBusy(true); await load(true); setBusy(false); }}>Make the report</Button>
              </div>
            ) : (
              <p className="mt-5 text-[13px] text-amber-200">Still in progress: {x.answers.length} of {x.questions.length} answered.</p>
            )}
            {(x.warnings?.length ?? 0) > 0 && (
              <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3 text-[12.5px]">
                <p className="font-semibold text-amber-100">{x.ended ? "Ended by strict mode" : "Strict-mode warnings"}</p>
                <ul className="mt-1 list-disc pl-4 text-white/70">{x.warnings!.map((w, i) => <li key={i}>{BREACH_TEXT[w as Breach] ?? w}</li>)}</ul>
              </div>
            )}
            <div className="mt-5 space-y-3">
              {x.questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-white/[0.07] p-3.5">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-[13px] font-semibold text-white">Q{i + 1}. {q}</p>
                    {rep?.items[i] && <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums", rep.items[i].score >= 7 ? "bg-emerald-400/15 text-emerald-300" : rep.items[i].score >= 4 ? "bg-amber-400/15 text-amber-200" : "bg-rose-500/15 text-rose-300")}>{rep.items[i].score}/10</span>}
                  </div>
                  <p className="mt-1.5 text-[13px] whitespace-pre-wrap text-white/75">{x.answers[i]?.a || <span className="text-white/35">No answer</span>}</p>
                  {rep?.items[i]?.note && <p className="mt-1.5 text-[12px] text-white/50">{rep.items[i].note}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
