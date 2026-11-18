"use client";

/* /partner → Careers, for the StudentOS team:
   Roles        post, edit, pause and delete roles for /careers, with their rounds on
                StudentOS: online test, AI interview, AI HR interview, live interview
   Applications everyone who applied, each round's score, screening (score cut-off,
                top N), moving people to the next round, booking live interviews,
                contact buttons and the team's decision. Offer letters are written
                and sent by the team themselves. */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { CAREER_TEAMS, DECISION_LABEL, STEP_LABEL, careersApi, careersErrorText, fmtWhen, loadCareers, nextStep, stageOf, stepOf, stepsOf, type CareerApp, type CareerDecision, type CareerReport, type CareerRole, type CareerStage, type CareerStep, type CareerTeam, type CareersDoc } from "@/lib/careers";
import { breachLabel } from "@/components/live/live-student";
import { partnerApi, partnerErrorText, type CompanyTest } from "@/lib/partner";
import { TestEditor } from "@/components/company/company-test";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** An uploaded resume PDF, opened in a new tab. The tab is opened first so the browser doesn't block it. */
async function openResume(token: string) {
  const w = window.open("", "_blank");
  try {
    const r = await careersApi<{ name: string; data: string }>("resume-get", { token }, true);
    const bin = atob(r.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    w?.close();
    window.alert(careersErrorText(e));
  }
}

const blank = (): CareerRole => ({ id: `r${Date.now().toString(36)}`, title: "", team: "Engineering", where: "Remote", pay: "Unpaid", length: "3 months", tags: [], does: [], wants: [], postedAt: Date.now(), ai: true, within: 3, questions: 6 });
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const toLocal = (ms?: number) => (ms ? new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).getTime() : 0);
const STAGE: Record<CareerStage, { label: string; cls: string }> = {
  invited: { label: "Link sent", cls: "bg-cyan-400/10 text-cyan-200" },
  "in-progress": { label: "Taking it", cls: "bg-violet-400/15 text-violet-200" },
  completed: { label: "Done", cls: "bg-emerald-400/12 text-emerald-300" },
  missed: { label: "Missed", cls: "bg-white/[0.06] text-white/50" },
};
const scoreCls = (v: number) => (v >= 75 ? "text-emerald-300" : v >= 55 ? "text-cyan-200" : "text-amber-300");

export function CareersEditor({ openApp }: { openApp?: string | null }) {
  const [view, setView] = useState<"roles" | "apps">(openApp ? "apps" : "roles");
  return (
    <div className="mt-6">
      <div className="flex gap-2">
        {([["roles", "Roles"], ["apps", "Applications"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setView(k)} className={cn("h-9 rounded-full border px-4 text-[13px] font-medium transition", view === k ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-white/60 hover:text-white")}>{l}</button>
        ))}
      </div>
      {view === "roles" ? <Roles /> : <Apps openApp={openApp} />}
    </div>
  );
}

/* ================= roles ================= */
function Roles() {
  const { actions } = useStore();
  const [data, setData] = useState<CareersDoc | null>(null);
  const [edit, setEdit] = useState<CareerRole | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadCareers().then(setData);
  }, []);

  const save = async (next: CareersDoc, msg: string) => {
    setBusy(true);
    try {
      await partnerApi("team-careers", { open: next.open, roles: next.roles });
      setData(next);
      setEdit(null);
      actions.toast(msg);
    } catch (e) {
      actions.toast(partnerErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="mt-5 h-64 animate-pulse rounded-2xl bg-white/[0.04]" />;
  if (edit)
    return (
      <RoleForm
        initial={edit}
        isNew={!data.roles.some((r) => r.id === edit.id)}
        busy={busy}
        onCancel={() => setEdit(null)}
        onSave={(r) => {
          const exists = data.roles.some((x) => x.id === r.id);
          void save({ ...data, roles: exists ? data.roles.map((x) => (x.id === r.id ? r : x)) : [r, ...data.roles] }, exists ? "Role updated on the careers page." : "Role posted on the careers page.");
        }}
      />
    );

  const live = data.roles.filter((r) => !r.paused).length;
  return (
    <div className="mt-5 space-y-5">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0d152a] p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Hiring on the careers page</p>
          <p className="mt-0.5 text-[12.5px] text-white/55">{data.open ? `On · ${live} role${live === 1 ? "" : "s"} showing at /careers` : "Off · the page says there are no open roles"}</p>
        </div>
        <button type="button" role="switch" aria-checked={data.open} aria-label="Hiring on or off" disabled={busy} onClick={() => void save({ ...data, open: !data.open }, data.open ? "Hiring paused." : "Hiring is on.")} className={cn("relative h-7 w-12 rounded-full transition", data.open ? "bg-emerald-500" : "bg-white/15")}>
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-all", data.open ? "left-6" : "left-1")} />
        </button>
        <a href="/careers" target="_blank" rel="noreferrer" className="text-[12.5px] text-accent hover:underline">Open /careers ↗</a>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#0d152a] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Roles ({data.roles.length})</h2>
          <Button size="sm" variant="primary" icon={<PlusIcon size={14} />} onClick={() => setEdit(blank())}>Post a role</Button>
        </div>
        {data.roles.length ? (
          <div className="mt-4 space-y-2.5">
            {data.roles.map((r) => (
              <div key={r.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4", r.paused && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-[12px] text-white/50">
                    {[r.team, r.where, r.pay, r.length].join(" · ")} ·{" "}
                    {[r.test && "Test", r.ai !== false && "AI interview", r.hr && "AI HR", "Live"].filter(Boolean).join(" → ")}{r.windowEnd ? ` · first round ${fmtWhen(r.windowStart || Date.now())} – ${fmtWhen(r.windowEnd)}` : ` · ${r.within || 3} day${(r.within || 3) === 1 ? "" : "s"} per round`}
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", r.paused ? "bg-white/[0.06] text-white/50" : "bg-emerald-400/12 text-emerald-300")}>{r.paused ? "Paused" : "Live"}</span>
                <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>Edit</Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save({ ...data, roles: data.roles.map((x) => (x.id === r.id ? { ...x, paused: !x.paused } : x)) }, r.paused ? "Role is live again." : "Role paused.")}>{r.paused ? "Resume" : "Pause"}</Button>
                <button type="button" disabled={busy} onClick={() => window.confirm(`Delete “${r.title}”?`) && void save({ ...data, roles: data.roles.filter((x) => x.id !== r.id) }, "Role deleted.")} className="h-8 rounded-lg border border-rose-400/30 px-3 text-[12.5px] font-medium text-rose-300 hover:bg-rose-400/10">Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 mb-3 text-center text-[13px] text-white/45">No roles yet. Post the first one.</p>
        )}
      </section>
    </div>
  );
}

function RoundRow({ n, on, title, text, onToggle, children }: { n: number; on: boolean; title: string; text: string; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border p-3.5", on ? "border-violet-400/35 bg-white/[0.03]" : "border-white/[0.07] bg-white/[0.02]")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", on ? "bg-violet-500/30 text-violet-100" : "bg-white/[0.06] text-white/50")}>{n}</span>
        <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">{title}</p><p className="text-[12.5px] text-white/55">{text}</p></div>
        <button type="button" role="switch" aria-checked={on} aria-label={`${title} on or off`} onClick={onToggle} className={cn("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-emerald-500" : "bg-white/15")}>
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-all", on ? "left-6" : "left-1")} />
        </button>
      </div>
      {children}
    </div>
  );
}

function RoleForm({ initial, isNew, busy, onSave, onCancel }: { initial: CareerRole; isNew: boolean; busy: boolean; onSave: (r: CareerRole) => void; onCancel: () => void }) {
  const [r, setR] = useState<CareerRole>({ ai: true, within: 3, questions: 6, ...initial });
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [does, setDoes] = useState(initial.does.join("\n"));
  const [wants, setWants] = useState(initial.wants.join("\n"));
  const [fixed, setFixed] = useState(!!initial.windowEnd);
  const winBad = fixed && (!r.windowEnd || r.windowEnd <= (r.windowStart || 0) || r.windowEnd < Date.now());
  const [test, setTest] = useState<CompanyTest | null | undefined>(undefined);
  const [testOpen, setTestOpen] = useState(false);
  const loadTest = () => void careersApi<{ test: CompanyTest | null }>("test-get", { roleId: r.id }, true).then((x) => setTest(x.test)).catch(() => setTest(null));
  useEffect(() => {
    if (r.test && test === undefined) loadTest();
  }, [r.test]); // eslint-disable-line react-hooks/exhaustive-deps
  const ok = r.title.trim().length > 2 && !winBad;
  const sel = "h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white";
  return (
    <section className="mx-auto mt-5 max-w-[820px] rounded-2xl border border-white/[0.08] bg-[#0d152a] p-6">
      <h2 className="text-[18px] font-semibold">{isNew ? "Post a role" : "Edit role"}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="rt">Role title</Label><Input id="rt" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} placeholder="e.g. Full-stack Developer Intern" /></div>
        <div>
          <Label htmlFor="rteam">Team</Label>
          <select id="rteam" value={r.team} onChange={(e) => setR({ ...r, team: e.target.value as CareerTeam })} className={sel}>
            {CAREER_TEAMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><Label htmlFor="rw">Where</Label><Input id="rw" value={r.where} onChange={(e) => setR({ ...r, where: e.target.value })} placeholder="Remote / Bengaluru / Hybrid" /></div>
        <div><Label htmlFor="rp">Pay</Label><Input id="rp" value={r.pay} onChange={(e) => setR({ ...r, pay: e.target.value })} placeholder="Unpaid / ₹5,000 a month" /></div>
        <div><Label htmlFor="rl">Duration</Label><Input id="rl" value={r.length} onChange={(e) => setR({ ...r, length: e.target.value })} placeholder="3 months / Full-time" /></div>
        <div className="sm:col-span-2"><Label htmlFor="rg">Skills (comma separated)</Label><Input id="rg" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="React, Firebase, Figma" /></div>
        <div><Label htmlFor="rd">What you’ll do (one per line)</Label><Textarea id="rd" rows={5} value={does} onChange={(e) => setDoes(e.target.value)} /></div>
        <div><Label htmlFor="rwnt">What we look for (one per line)</Label><Textarea id="rwnt" rows={5} value={wants} onChange={(e) => setWants(e.target.value)} /></div>
      </div>

      <div className="mt-6 rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-5">
        <p className="text-[15px] font-semibold">Rounds on StudentOS</p>
        <p className="text-[12.5px] text-white/55">All in strict mode (full screen, camera, voice and tab checks). The first round opens when they apply; you screen by score and move people on from Applications.</p>
        <div className="mt-4 space-y-2.5">
          <RoundRow n={1} on={!!r.test} title="Online test" text="MCQ from the aptitude bank or your own, plus coding problems. Scored for you." onToggle={() => setR({ ...r, test: !r.test })}>
            {r.test && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="flex-1 text-[12.5px] text-white/60">{test === undefined ? "Loading…" : test ? `${test.title}: ${test.questions.length} MCQ${test.coding?.length ? ` + ${test.coding.length} coding` : ""} · ${test.minutes} min` : "No questions yet. Applicants skip the test until you add them."}</p>
                <Button size="sm" onClick={() => setTestOpen(true)}>{test ? "Edit questions" : "Add questions"}</Button>
              </div>
            )}
          </RoundRow>
          <RoundRow n={2} on={r.ai !== false} title="AI interview" text="Asha asks about them and the role; you get a score, a verdict and every answer." onToggle={() => setR({ ...r, ai: r.ai === false })}>
            {r.ai !== false && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                <div>
                  <Label htmlFor="wq">Questions</Label>
                  <select id="wq" value={r.questions ?? 6} onChange={(e) => setR({ ...r, questions: Number(e.target.value) })} className={sel}>
                    {[4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} (~{n * 2 + 3} min)</option>)}
                  </select>
                </div>
                <div><Label htmlFor="wf">What should the AI check? (optional)</Label><Input id="wf" value={r.ivFocus ?? ""} onChange={(e) => setR({ ...r, ivFocus: e.target.value })} placeholder="e.g. React basics, how they debug, if they can work 15 hours a week" /></div>
              </div>
            )}
          </RoundRow>
          <RoundRow n={3} on={!!r.hr} title="AI HR interview" text="About them, why StudentOS, teamwork and fit. Never personal questions." onToggle={() => setR({ ...r, hr: !r.hr })}>
            {r.hr && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                <div>
                  <Label htmlFor="hq">Questions</Label>
                  <select id="hq" value={r.hrQuestions ?? 5} onChange={(e) => setR({ ...r, hrQuestions: Number(e.target.value) })} className={sel}>
                    {[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} (~{n * 2 + 2} min)</option>)}
                  </select>
                </div>
                <div><Label htmlFor="hf">What should HR check? (optional)</Label><Input id="hf" value={r.hrFocus ?? ""} onChange={(e) => setR({ ...r, hrFocus: e.target.value })} placeholder="e.g. time for 15 hours a week, ownership, communication" /></div>
              </div>
            )}
          </RoundRow>
          <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[12px] font-semibold text-white/60">4</span>
            <div><p className="text-[14px] font-semibold">Live interview</p><p className="text-[12.5px] text-white/55">A video call with the people you pick, on StudentOS. Book slots from Applications.</p></div>
          </div>
        </div>

        {(r.test || r.ai !== false || r.hr) && (
          <div className="mt-5 space-y-3">
            <p className="text-[13px] font-semibold">Time to finish each round</p>
            <div className="flex flex-wrap gap-2">
              {([[false, "Some days after it opens"], [true, "Fixed date for the first round"]] as const).map(([v, l]) => (
                <button key={l} type="button" onClick={() => { setFixed(v); if (!v) setR({ ...r, windowStart: 0, windowEnd: 0 }); }} className={cn("h-9 rounded-lg border px-3.5 text-[13px] transition", fixed === v ? "border-violet-400/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60 hover:text-white")}>{l}</button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {fixed && (
                <>
                  <div><Label htmlFor="ws">Opens</Label><Input id="ws" type="datetime-local" value={toLocal(r.windowStart)} onChange={(e) => setR({ ...r, windowStart: fromLocal(e.target.value) })} /></div>
                  <div><Label htmlFor="we">Closes</Label><Input id="we" type="datetime-local" value={toLocal(r.windowEnd)} onChange={(e) => setR({ ...r, windowEnd: fromLocal(e.target.value) })} /></div>
                </>
              )}
              <div>
                <Label htmlFor="wd">{fixed ? "Later rounds: within" : "Finish within"}</Label>
                <select id="wd" value={r.within ?? 3} onChange={(e) => setR({ ...r, within: Number(e.target.value) })} className={sel}>
                  {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} day{d === 1 ? "" : "s"}</option>)}
                </select>
              </div>
            </div>
            {winBad && <p className="text-[12.5px] text-rose-300">Pick when it opens and a later closing time that hasn’t passed.</p>}
          </div>
        )}
      </div>
      {testOpen && (
        <TestEditor
          pid=""
          rounds={["Online test"]}
          onClose={() => setTestOpen(false)}
          onSaved={() => { setTestOpen(false); loadTest(); }}
          io={{ get: () => careersApi<{ test: CompanyTest | null }>("test-get", { roleId: r.id }, true), save: (t) => careersApi<{ count: number }>("test-save", { roleId: r.id, test: t }, true), errorText: careersErrorText }}
        />
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={busy} disabled={!ok} onClick={() => onSave({ ...r, title: r.title.trim(), tags: tags.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6), does: lines(does), wants: lines(wants), ...(fixed ? {} : { windowStart: 0, windowEnd: 0 }) })}>{isNew ? "Post role" : "Save"}</Button>
      </div>
    </section>
  );
}

/* ================= applications ================= */
type Metric = "test" | "ai" | "hr" | "live";
const METRIC: Record<Metric, string> = { test: "Test score", ai: "AI interview", hr: "AI HR", live: "Live interview" };
/** 0–100 for a round, or null when there's no score yet */
const scoreOf = (a: CareerApp, m: Metric): number | null => {
  if (m === "test") {
    const t = a.testResult;
    if (!t) return null;
    const parts = t.total + t.coding.length;
    return parts ? Math.round(((t.correct + t.coding.reduce((s, c) => s + c.passed / (c.total || 1), 0)) / parts) * 100) : null;
  }
  if (m === "ai") return a.report?.overall ?? null;
  if (m === "hr") return a.hr?.report?.overall ?? null;
  return a.live?.feedback ? a.live.feedback.score * 10 : null;
};
const ScoreCell = ({ v, warn }: { v: number | null; warn?: number }) =>
  v === null ? <span className="text-white/30">—</span> : <span className={cn("font-semibold tabular-nums", scoreCls(v))}>{v}{warn ? <span className="ml-1 text-[11px] font-normal text-amber-300" title={`${warn} strict-mode warning${warn === 1 ? "" : "s"}`}>⚠{warn}</span> : null}</span>;

function Apps({ openApp }: { openApp?: string | null }) {
  const { actions } = useStore();
  const [apps, setApps] = useState<CareerApp[] | null>(null);
  const [role, setRole] = useState("all");
  const [round, setRound] = useState<"all" | CareerStep>("all");
  const [stage, setStage] = useState<"all" | CareerStage>("all");
  const [open, setOpen] = useState<string | null>(openApp ?? null);
  const [metric, setMetric] = useState<Metric>("ai");
  const [cut, setCut] = useState(0);
  const [topN, setTopN] = useState(10);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [booking, setBooking] = useState(false);

  const load = () =>
    careersApi<{ apps: CareerApp[] }>("apps", {}, true)
      .then((r) => setApps(r.apps))
      .catch((e) => actions.toast(careersErrorText(e)));
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const roles = useMemo(() => [...new Set((apps ?? []).map((a) => a.role))].sort(), [apps]);
  if (!apps) return <div className="mt-5 h-64 animate-pulse rounded-2xl bg-white/[0.04]" />;
  const list = apps
    .filter((a) => role === "all" || a.role === role)
    .filter((a) => round === "all" || stepOf(a) === round)
    .filter((a) => stage === "all" || stageOf(a) === stage)
    .filter((a) => !cut || (scoreOf(a, metric) ?? -1) >= cut)
    .sort((x, y) => (scoreOf(y, metric) ?? -1) - (scoreOf(x, metric) ?? -1) || y.appliedAt - x.appliedAt);
  const count = (s: CareerStage) => apps.filter((a) => stageOf(a) === s).length;
  const cur = apps.find((a) => a.token === open) ?? null;
  const put = (a: CareerApp) => setApps((xs) => (xs ?? []).map((x) => (x.token === a.token ? a : x)));
  const picked = list.filter((a) => sel.has(a.token));
  const toggle = (t: string) => setSel((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; });

  const advance = async (tokens: string[]) => {
    setBusy("advance");
    try {
      const r = await careersApi<{ moved: number }>("app-advance", { tokens }, true);
      actions.toast(r.moved ? `${r.moved} moved to the next round and emailed.` : "No one moved. People already in the live round are booked with “Book live interviews”.");
      setSel(new Set());
      await load();
    } catch (e) {
      actions.toast(careersErrorText(e));
    } finally {
      setBusy("");
    }
  };
  const reject = async (tokens: string[]) => {
    setBusy("reject");
    try {
      for (const token of tokens) await careersApi("app-update", { token, decision: "rejected" }, true);
      actions.toast(`${tokens.length} marked not selected.`);
      setSel(new Set());
      await load();
    } catch (e) {
      actions.toast(careersErrorText(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Applied", apps.length], ["Round done", count("completed")], ["Waiting", count("invited") + count("in-progress")], ["Live booked", apps.filter((a) => a.live).length]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-white/[0.08] bg-[#0d152a] p-4">
            <p className="text-[26px] leading-none font-semibold tabular-nums">{v}</p>
            <p className="mt-1.5 text-[12px] text-white/50">{l}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-white/[0.08] bg-[#0d152a] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "completed", "in-progress", "invited", "missed"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setStage(k)} className={cn("h-8 rounded-lg border px-3 text-[12.5px] transition", stage === k ? "border-accent/60 bg-[var(--color-plum)] text-white" : "border-white/10 text-white/60 hover:text-white")}>
              {k === "all" ? "All" : STAGE[k].label} <span className="text-white/40">{k === "all" ? apps.length : count(k)}</span>
            </button>
          ))}
          <select value={round} onChange={(e) => setRound(e.target.value as "all" | CareerStep)} aria-label="Round" className="ml-auto h-8 rounded-lg border border-white/10 bg-field px-2 text-[12.5px] text-white">
            <option value="all">All rounds</option>
            {(Object.keys(STEP_LABEL) as CareerStep[]).map((k) => <option key={k} value={k}>In: {STEP_LABEL[k]}</option>)}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className="h-8 rounded-lg border border-white/10 bg-field px-2 text-[12.5px] text-white">
            <option value="all">All roles</option>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <Button size="sm" variant="ghost" onClick={() => void load()}>Refresh</Button>
        </div>

        {/* screening: sort by a round's score, keep those above a cut-off, pick the top N */}
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[12.5px]">
          <span className="font-semibold text-white">Screen by</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)} aria-label="Screen by" className="h-8 rounded-lg border border-white/10 bg-field px-2 text-white">
            {(Object.keys(METRIC) as Metric[]).map((m) => <option key={m} value={m}>{METRIC[m]}</option>)}
          </select>
          <span className="text-white/50">at least</span>
          {[0, 50, 60, 70, 80].map((c) => (
            <button key={c} type="button" onClick={() => setCut(c)} className={cn("h-8 rounded-lg border px-2.5", cut === c ? "border-accent/60 bg-accent/10 text-white" : "border-white/10 text-white/60 hover:text-white")}>{c ? `${c}+` : "Any"}</button>
          ))}
          <span className="ml-auto text-white/50">Pick top</span>
          <input type="number" min={1} max={300} value={topN} onChange={(e) => setTopN(Math.max(1, Number(e.target.value) || 1))} aria-label="How many" className="h-8 w-16 rounded-lg border border-white/10 bg-field px-2 text-white" />
          <Button size="sm" onClick={() => setSel(new Set(list.filter((a) => scoreOf(a, metric) !== null).slice(0, topN).map((a) => a.token)))}>Pick</Button>
        </div>
        {picked.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] p-3">
            <p className="flex-1 text-[13px] text-white"><b>{picked.length}</b> selected</p>
            <Button size="sm" variant="primary" loading={busy === "advance"} onClick={() => void advance(picked.map((a) => a.token))}>Move to next round</Button>
            <Button size="sm" onClick={() => setBooking(true)}>Book live interviews</Button>
            <Button size="sm" variant="ghost" loading={busy === "reject"} onClick={() => window.confirm(`Mark ${picked.length} as not selected?`) && void reject(picked.map((a) => a.token))}>Not selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
          </div>
        )}

        {list.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] text-white/45">
                  <th className="w-8 pb-2"><input type="checkbox" aria-label="Select all" checked={list.length > 0 && list.every((a) => sel.has(a.token))} onChange={(e) => setSel(e.target.checked ? new Set(list.map((a) => a.token)) : new Set())} className="accent-[#fbbf24]" /></th>
                  <th className="pb-2 font-medium">Applicant</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Now in</th>
                  <th className="pb-2 font-medium">Test</th>
                  <th className="pb-2 font-medium">AI</th>
                  <th className="pb-2 font-medium">HR</th>
                  <th className="pb-2 font-medium">Live</th>
                  <th className="pb-2 font-medium">Decision</th>
                  <th className="pb-2"><span className="sr-only">Resume</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const st = stageOf(a);
                  const step = stepOf(a);
                  return (
                    <tr key={a.token} onClick={() => setOpen(a.token)} className={cn("cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.02]", sel.has(a.token) && "bg-accent/[0.05]")}>
                      <td className="py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${a.name}`} checked={sel.has(a.token)} onChange={() => toggle(a.token)} className="accent-[#fbbf24]" /></td>
                      <td className="py-2.5"><p className="font-medium text-white">{a.name}</p><p className="text-[11.5px] text-white/45">{a.college}</p></td>
                      <td className="py-2.5 text-white/70">{a.role}</td>
                      <td className="py-2.5">{step ? <span className="flex flex-col gap-0.5"><span className="text-[12px] text-white/80">{STEP_LABEL[step]}</span><span className={cn("w-fit rounded-md px-1.5 py-0.5 text-[10.5px]", STAGE[st].cls)}>{step === "live" ? (a.live?.feedback ? "Feedback in" : `${fmtWhen(a.live?.at ?? 0)}`) : STAGE[st].label}</span></span> : <span className="text-white/40">—</span>}</td>
                      <td className="py-2.5"><ScoreCell v={scoreOf(a, "test")} warn={a.testResult?.warnings.length} /></td>
                      <td className="py-2.5"><ScoreCell v={scoreOf(a, "ai")} warn={a.aiWarn?.length} /></td>
                      <td className="py-2.5"><ScoreCell v={scoreOf(a, "hr")} warn={a.hr?.warnings?.length} /></td>
                      <td className="py-2.5">{a.live?.feedback ? <span className={cn("font-semibold tabular-nums", scoreCls(a.live.feedback.score * 10))}>{a.live.feedback.score}/10</span> : a.live ? <a href={`/partner/live?t=${a.token}`} onClick={(e) => e.stopPropagation()} className="text-[12px] text-accent hover:underline">Join</a> : <span className="text-white/30">—</span>}</td>
                      <td className="py-2.5">{a.decision ? <span className={cn("rounded-md px-2 py-0.5 text-[11.5px]", a.decision === "rejected" ? "bg-white/[0.06] text-white/50" : "bg-emerald-400/12 text-emerald-300")}>{DECISION_LABEL[a.decision]}</span> : <span className="text-white/35">New</span>}</td>
                      <td className="py-2.5 text-right">{a.resumeFile ? <button type="button" onClick={(e) => { e.stopPropagation(); void openResume(a.token); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12px] text-white/70 hover:border-violet-400/50 hover:text-white"><FileIcon size={13} /> Resume</button> : a.resume && <a href={a.resume} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12px] text-white/70 hover:border-violet-400/50 hover:text-white"><FileIcon size={13} /> Resume</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-8 mb-6 text-center text-[13px] text-white/45">{apps.length ? "No one matches these filters." : "No applications yet. Share /careers to get some."}</p>
        )}
      </section>
      {cur && <AppDrawer a={cur} onClose={() => setOpen(null)} onChange={put} onAdvance={() => void advance([cur.token])} onDelete={() => { setApps((xs) => (xs ?? []).filter((x) => x.token !== cur.token)); setOpen(null); }} />}
      {booking && <BookLive people={picked} onClose={() => setBooking(false)} onDone={() => { setBooking(false); setSel(new Set()); void load(); }} />}
    </div>
  );
}

/** Back-to-back live interview slots for the selected people. */
function BookLive({ people, onClose, onDone }: { people: CareerApp[]; onClose: () => void; onDone: () => void }) {
  const { actions } = useStore();
  const [start, setStart] = useState(() => toLocal(Math.ceil((Date.now() + 86400000) / 1800000) * 1800000));
  const [minutes, setMinutes] = useState(30);
  const [gap, setGap] = useState(5);
  const [busy, setBusy] = useState(false);
  const t0 = fromLocal(start);
  const slots = people.map((p, i) => ({ p, at: t0 + i * (minutes + gap) * 60000 }));
  const book = async () => {
    setBusy(true);
    try {
      const r = await careersApi<{ changed: number }>("live-schedule", { items: slots.map((x) => ({ token: x.p.token, at: x.at, minutes })) }, true);
      actions.toast(`${r.changed} live interview${r.changed === 1 ? "" : "s"} booked. Each person got an email with the time and link.`);
      onDone();
    } catch (e) {
      actions.toast(careersErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#000000]/60" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="Book live interviews" className="relative w-full max-w-[560px] rounded-2xl border border-white/10 bg-[#121118] p-6">
        <h2 className="text-[18px] font-semibold">Book live interviews</h2>
        <p className="mt-1 text-[12.5px] text-white/55">One after another. Each person gets an email with their time and the link to join on StudentOS.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div><Label htmlFor="ls">First slot</Label><Input id="ls" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div>
            <Label htmlFor="lm">Each</Label>
            <select id="lm" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white">
              {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="lg">Gap</Label>
            <select id="lg" value={gap} onChange={(e) => setGap(Number(e.target.value))} className="h-10 w-full rounded-lg border border-white/10 bg-field px-3 text-[13.5px] text-white">
              {[0, 5, 10, 15].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 max-h-[240px] space-y-1.5 overflow-y-auto">
          {slots.map(({ p, at }) => (
            <div key={p.token} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-[13px]"><span>{p.name}</span><span className="text-white/60 tabular-nums">{t0 ? fmtWhen(at) : "—"}</span></div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!t0 || t0 < Date.now()} onClick={() => void book()}>Book {people.length} and email them</Button>
        </div>
      </div>
    </div>
  );
}

function QA({ questions, answers, items, asks }: { questions: string[]; answers: { a: string; secs: number; f?: { q: string; a: string } }[]; items?: { score: number; note: string }[]; asks?: { i: number; m: string; r: string }[] }) {
  return (
    <div className="mt-3 space-y-2.5">
      {questions.map((q, i) =>
        answers[i] ? (
          <div key={i} className="rounded-xl border border-white/[0.07] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-medium text-white">{i + 1}. {q}</p>
              {items?.[i] && <span className={cn("shrink-0 text-[13px] font-semibold tabular-nums", scoreCls(items[i].score * 10))}>{items[i].score}/10</span>}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-white/70">{answers[i].a}</p>
            {answers[i].f && (
              <div className="mt-2 border-l-2 border-violet-400/40 pl-3">
                <p className="text-[12.5px] font-medium text-violet-200">Follow-up: {answers[i].f!.q}</p>
                <p className="mt-1 text-[13px] whitespace-pre-line text-white/70">{answers[i].f!.a || "No answer"}</p>
              </div>
            )}
            <p className="mt-2 text-[11.5px] text-white/40">{Math.round(answers[i].secs / 60)} min{items?.[i]?.note ? ` · ${items[i].note}` : ""}</p>
          </div>
        ) : null,
      )}
      {asks?.length ? (
        <div className="rounded-xl border border-white/[0.07] p-3.5">
          <p className="text-[12.5px] font-semibold text-white">Asked the interviewer ({asks.length})</p>
          {asks.map((k, j) => <p key={j} className="mt-1.5 text-[12.5px] text-white/65">On Q{Math.min(k.i + 1, questions.length)}: “{k.m}” <span className="text-white/40">→ {k.r}</span></p>)}
        </div>
      ) : null}
    </div>
  );
}

function Report({ r }: { r: CareerReport }) {
  return (
    <>
      <div className="mt-3 flex items-end gap-3">
        <p className={cn("text-[40px] leading-none font-bold tabular-nums", scoreCls(r.overall))}>{r.overall}</p>
        <p className="pb-1 text-[13px] text-white/60">/ 100 · <b className="text-white">{r.verdict}</b></p>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-white/75">{r.summary}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><p className="text-[11.5px] font-semibold text-emerald-300 uppercase">Strengths</p>{r.strengths.map((x) => <p key={x} className="mt-1 text-[12.5px] text-white/70">+ {x}</p>)}</div>
        <div><p className="text-[11.5px] font-semibold text-amber-300 uppercase">Concerns</p>{r.concerns.map((x) => <p key={x} className="mt-1 text-[12.5px] text-white/70">– {x}</p>)}</div>
      </div>
    </>
  );
}

const Warns = ({ list, ended }: { list?: string[]; ended?: boolean }) =>
  list?.length || ended ? <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">Strict mode: {list?.length ? list.map(breachLabel).join(", ") : "no warnings"}{ended ? " · ended after too many warnings" : ""}</p> : <p className="mt-3 text-[12px] text-emerald-300/80">Strict mode: no warnings</p>;

function Box({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2"><p className="text-[14px] font-semibold">{title}</p>{badge}</div>
      {children}
    </div>
  );
}

function AppDrawer({ a, onClose, onChange, onDelete, onAdvance }: { a: CareerApp; onClose: () => void; onChange: (a: CareerApp) => void; onDelete: () => void; onAdvance: () => void }) {
  const { actions } = useStore();
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState(a.note);
  const st = stageOf(a);
  const step = stepOf(a);
  const steps = stepsOf(a);
  const nxt = nextStep(a);
  const phone = a.phone.replace(/\D/g, "");
  const wa = `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(`Hi ${a.name.split(" ")[0]}, this is the StudentOS team about your application for ${a.role}.`)}`;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/careers/interview/${a.token}`;
  const run = async (action: string, body: Record<string, unknown>, msg: string) => {
    setBusy(action + String(body.decision ?? body.kind ?? ""));
    try {
      const r = await careersApi<{ app?: CareerApp }>(action, { token: a.token, ...body }, true);
      if (r.app) onChange(r.app);
      actions.toast(msg);
    } catch (e) {
      actions.toast(careersErrorText(e));
    } finally {
      setBusy("");
    }
  };
  const urls = a.links.match(/https?:\/\/\S+/g) ?? [];
  const t = a.testResult;
  const badge = (s: CareerStep) => (step === s ? <span className={cn("rounded-md px-2 py-0.5 text-[11.5px]", STAGE[st].cls)}>Now · {STAGE[st].label}</span> : null);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#000000]/50" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label={a.name} className="relative h-full w-full max-w-[600px] overflow-y-auto border-l border-white/10 bg-[#121118] p-6">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/55 hover:bg-white/[0.06] hover:text-white"><XIcon size={16} /></button>
        <p className="text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">{a.role}</p>
        <h2 className="mt-1 text-[24px] font-semibold">{a.name}</h2>
        <p className="mt-0.5 text-[13px] text-white/55">{a.college} · applied {fmtWhen(a.appliedAt)}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a href={`mailto:${a.email}?subject=${encodeURIComponent(`StudentOS · ${a.role}`)}`} className="flex h-11 items-center justify-center rounded-xl border border-white/10 text-[13px] font-medium text-white/85 hover:border-violet-400/50">Email</a>
          <a href={wa} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] text-[13px] font-medium text-emerald-300 hover:bg-emerald-400/15">WhatsApp</a>
          <a href={`tel:${phone.length === 10 ? `+91${phone}` : `+${phone}`}`} className="flex h-11 items-center justify-center rounded-xl border border-white/10 text-[13px] font-medium text-white/85 hover:border-violet-400/50">Call</a>
        </div>
        {a.resumeFile ? <button type="button" onClick={() => void openResume(a.token)} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-black"><FileIcon size={15} /> Open resume (PDF)</button> : a.resume && <a href={a.resume} target="_blank" rel="noreferrer" className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-black"><FileIcon size={15} /> Open resume</a>}
        <div className="mt-4 space-y-1.5 text-[13px]">
          <p className="text-white/70"><span className="text-white/40">Email:</span> {a.email}</p>
          <p className="text-white/70"><span className="text-white/40">Phone:</span> {a.phone}</p>
          <p className="break-all text-white/70"><span className="text-white/40">Links:</span> {urls.length ? urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 text-accent hover:underline">{u.replace(/^https?:\/\//, "")}</a>) : a.links}</p>
          {a.why && <p className="whitespace-pre-line text-white/70"><span className="text-white/40">Why StudentOS:</span> {a.why}</p>}
        </div>

        {/* where they are now, and moving them on */}
        <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/[0.05] p-4">
          <p className="text-[13px] text-white/80">{step ? <>Now in <b className="text-white">{STEP_LABEL[step]}</b> · {step === "live" ? (a.live ? fmtWhen(a.live.at) : "") : `${STAGE[st].label} · window ${fmtWhen(a.start)} – ${fmtWhen(a.end)}`}</> : "No rounds on StudentOS for this role."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nxt && nxt !== "live" && <Button size="sm" variant="primary" onClick={onAdvance}>Move to {STEP_LABEL[nxt]}</Button>}
            {step && step !== "live" && st !== "completed" && <Button size="sm" loading={busy === "app-update"} onClick={() => void run("app-update", { extendDays: 2 }, "2 more days given.")}>Give 2 more days</Button>}
            {step && <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(link).then(() => actions.toast("Their link copied. Send it on WhatsApp or email."))}>Copy their link</Button>}
          </div>
          {nxt === "live" && <p className="mt-2 text-[12px] text-white/50">Next is the live interview: select them in the list and use “Book live interviews”.</p>}
        </div>

        {steps.includes("test") && (
          <Box title="Online test" badge={badge("test")}>
            {t ? (
              <>
                <div className="mt-3 flex items-end gap-3">
                  <p className={cn("text-[36px] leading-none font-bold tabular-nums", scoreCls(scoreOf(a, "test") ?? 0))}>{scoreOf(a, "test")}</p>
                  <p className="pb-1 text-[13px] text-white/60">/ 100 · MCQ {t.correct}/{t.total}{t.late ? " · submitted late" : ""}</p>
                </div>
                {t.coding.length > 0 && <div className="mt-2 space-y-1">{t.coding.map((c) => <p key={c.title} className="text-[12.5px] text-white/70">{"</>"} {c.title}: <b className={c.passed === c.total ? "text-emerald-300" : "text-amber-200"}>{c.passed}/{c.total}</b> tests · {c.lang}</p>)}</div>}
                <Warns list={t.warnings} ended={t.ended} />
              </>
            ) : <p className="mt-2 text-[13px] text-white/55">Not taken yet.</p>}
          </Box>
        )}

        {steps.includes("ai") && (
          <Box title="AI interview" badge={badge("ai")}>
            {a.completedAt ? (
              a.report ? <Report r={a.report} /> : (
                <div className="mt-2 flex items-center gap-3">
                  <p className="flex-1 text-[13px] text-white/55">Answers are in, but the report couldn’t be made.</p>
                  <Button size="sm" loading={busy === "app-evaluateai"} onClick={() => void run("app-evaluate", { kind: "ai" }, "Report ready.")}>Make report</Button>
                </div>
              )
            ) : <p className="mt-2 text-[13px] text-white/55">{a.questions.length ? `Answered ${a.answers.length} of ${a.questions.length} so far.` : "Not started yet."}</p>}
            {(a.completedAt || a.aiWarn) && <Warns list={a.aiWarn} ended={a.aiEnded} />}
            {(a.flags.tabs > 0 || a.flags.pastes > 0) && <p className="mt-2 rounded-lg bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">Left the tab {a.flags.tabs}× · pasted {a.flags.pastes}×.</p>}
            {a.answers.length > 0 && <QA questions={a.questions} answers={a.answers} items={a.report?.items} asks={a.aiAsks} />}
          </Box>
        )}

        {steps.includes("hr") && (
          <Box title="AI HR interview" badge={badge("hr")}>
            {a.hr?.done ? (
              a.hr.report ? <Report r={a.hr.report} /> : (
                <div className="mt-2 flex items-center gap-3">
                  <p className="flex-1 text-[13px] text-white/55">Answers are in, but the report couldn’t be made.</p>
                  <Button size="sm" loading={busy === "app-evaluatehr"} onClick={() => void run("app-evaluate", { kind: "hr" }, "Report ready.")}>Make report</Button>
                </div>
              )
            ) : <p className="mt-2 text-[13px] text-white/55">{a.hr ? `Answered ${a.hr.answers.length} of ${a.hr.questions.length} so far.` : "Not started yet."}</p>}
            {a.hr?.done && <Warns list={a.hr.warnings} ended={a.hr.ended} />}
            {a.hr && a.hr.answers.length > 0 && <QA questions={a.hr.questions} answers={a.hr.answers} items={a.hr.report?.items} asks={a.hr.asks} />}
          </Box>
        )}

        {a.live && (
          <Box title="Live interview" badge={badge("live")}>
            <p className="mt-2 text-[13px] text-white/65">{fmtWhen(a.live.at)} (IST) · {a.live.minutes} min</p>
            {a.live.feedback ? (
              <p className="mt-2 text-[13px] text-white/75"><b className={scoreCls(a.live.feedback.score * 10)}>{a.live.feedback.score}/10</b> · {a.live.feedback.verdict}{a.live.feedback.notes ? ` · ${a.live.feedback.notes}` : ""}</p>
            ) : null}
            <a href={`/partner/live?t=${a.token}`} className="mt-3 inline-flex h-9 items-center rounded-lg bg-accent px-4 text-[13px] font-semibold text-black">{a.live.feedback ? "Open the call page" : "Join the call"}</a>
          </Box>
        )}

        <div className="mt-6">
          <p className="text-[14px] font-semibold">Your decision</p>
          <p className="text-[12px] text-white/45">The AI only helps. Write and send the offer letter yourselves, then mark it here.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["shortlisted", "rejected", "offer-sent", "hired"] as Exclude<CareerDecision, "">[]).map((d) => (
              <button key={d} type="button" disabled={!!busy} onClick={() => void run("app-update", { decision: a.decision === d ? "" : d }, a.decision === d ? "Decision cleared." : `Marked: ${DECISION_LABEL[d]}.`)} className={cn("h-9 rounded-lg border px-3.5 text-[13px] font-medium transition", a.decision === d ? (d === "rejected" ? "border-white/30 bg-white/10 text-white" : "border-emerald-400/60 bg-emerald-400/15 text-emerald-200") : "border-white/10 text-white/65 hover:text-white")}>
                {DECISION_LABEL[d]}
              </button>
            ))}
          </div>
          <Label htmlFor="cn">Team notes</Label>
          <Textarea id="cn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== a.note && void run("app-update", { note }, "Note saved.")} placeholder="Only the team sees this" />
        </div>
        <button type="button" onClick={() => window.confirm(`Delete ${a.name}’s application? This can’t be undone.`) && void careersApi("app-delete", { token: a.token }, true).then(() => { onDelete(); actions.toast("Application deleted."); }).catch((e) => actions.toast(careersErrorText(e)))} className="mt-6 text-[12.5px] text-rose-300 hover:underline">Delete application</button>
      </aside>
    </div>
  );
}
