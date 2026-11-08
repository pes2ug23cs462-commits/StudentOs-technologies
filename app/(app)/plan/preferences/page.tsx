"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CommitmentList, targetHint } from "@/components/onboarding/steps";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ArrowLeftIcon, RefreshIcon } from "@/components/ui/icons";
import { Card, Checkbox, RadioDot, Segmented, Switch } from "@/components/ui/primitives";
import { HOURS_OPTIONS, SESSION_OPTIONS } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { Commitment, StudyPrefs, StudyTime } from "@/lib/types";
import { TODAY, cn, wait } from "@/lib/utils";

const TIMES: { value: StudyTime; label: string }[] = [
  { value: "evenings", label: "Weekday evenings (after 6 PM)" },
  { value: "weekends", label: "Saturday mornings" },
  { value: "afternoons", label: "Saturday afternoons" },
  { value: "early-mornings", label: "Early mornings" },
];
const SPREAD = [
  { value: "even", label: "Evenly across the week" },
  { value: "weekends", label: "More on weekends" },
  { value: "front-load", label: "Front-load, lighter near exams" },
] as const;

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <Card glow className="p-5">
      <h2 className="text-[13.5px] font-semibold text-white">{title}</h2>
      {sub && <p className="mt-0.5 text-[11.5px] text-white/45">{sub}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default function PlanPreferencesPage() {
  const router = useRouter();
  const { state, actions } = useStore();
  const goal = state.goals[0];
  const initial = { prefs: { spread: "even" as const, ...state.prefs }, target: goal?.target ?? "", commitments: state.commitments };

  const [prefs, setPrefs] = useState<StudyPrefs>(initial.prefs);
  const [target, setTarget] = useState(initial.target);
  const [commitments, setCommitments] = useState<Commitment[]>(initial.commitments);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<StudyPrefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const toggleTime = (t: StudyTime) => set({ times: prefs.times.includes(t) ? prefs.times.filter((x) => x !== t) : [...prefs.times, t] });

  const changes: string[] = [];
  if (prefs.hours !== initial.prefs.hours) changes.push("hours per week");
  if (prefs.sessionLength !== initial.prefs.sessionLength) changes.push(`session length ${prefs.sessionLength} min`);
  TIMES.forEach((t) => {
    const was = initial.prefs.times.includes(t.value);
    const now = prefs.times.includes(t.value);
    if (was !== now) changes.push(`${t.label.replace(/ \(.*\)/, "")} ${now ? "on" : "off"}`);
  });
  if (prefs.restDay !== initial.prefs.restDay) changes.push(prefs.restDay === "none" ? "no rest day" : "Sunday rest");
  if (prefs.spread !== initial.prefs.spread) changes.push("spread");
  if (target !== initial.target) changes.push("target date");
  if (JSON.stringify(commitments) !== JSON.stringify(initial.commitments)) changes.push("commitments");

  const regenerate = async () => {
    setBusy(true);
    await wait(2200);
    actions.setPrefs(prefs);
    if (goal && target) actions.updateGoal(goal.id, { target });
    actions.setCommitments(commitments);
    actions.setPlanStatus("suggested");
    actions.toast("New plan ready — review it before it’s saved.");
    router.push("/plan/review");
  };

  const hint = targetHint(target);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-[720px] flex-1 px-6 py-6">
        <Link href="/plan/review" className="inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-white">
          <ArrowLeftIcon size={12} /> Back to suggested plan
        </Link>
        <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-white">Edit plan preferences</h1>
        <p className="mt-1 text-[13px] text-white/55">Change what the plan is built around. Your current suggestion stays until you accept a new one.</p>

        <div className="mt-5 space-y-3.5">
          <Section title="Time and pace" sub="How much you can realistically give each week.">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="mb-2 text-[11.5px] text-white/50">Hours per week</p>
                <Segmented size="sm" value={prefs.hours} onChange={(hours) => set({ hours })} options={HOURS_OPTIONS} />
              </div>
              <div>
                <p className="mb-2 text-[11.5px] text-white/50">Session length</p>
                <Segmented
                  size="sm"
                  value={String(prefs.sessionLength)}
                  onChange={(v) => set({ sessionLength: Number(v) as StudyPrefs["sessionLength"] })}
                  options={SESSION_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                />
              </div>
            </div>
          </Section>

          <Section title="When you like to study">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {TIMES.map((t) => (
                <Checkbox key={t.value} checked={prefs.times.includes(t.value)} onChange={() => toggleTime(t.value)} label={t.label} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[12.5px] font-medium text-white">Keep Sunday as a rest day</p>
                <p className="text-[11px] text-white/45">Missed sessions can still move here if you allow it.</p>
              </div>
              <Switch label="Keep Sunday as a rest day" checked={prefs.restDay === "sunday"} onChange={(v) => set({ restDay: v ? "sunday" : "none" })} />
            </div>
          </Section>

          <Section title="Target and distribution">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[12.5px] font-medium text-white/90">Target date</p>
                <DatePicker value={target} onChange={setTarget} min={TODAY} />
                <p className={cn("mt-1.5 text-[11px]", hint && hint.tone !== "ok" ? "text-amber-300" : "text-white/45")}>
                  {hint && hint.tone !== "ok" ? hint.text : "Course access on edX stays open; this is your own deadline."}
                </p>
              </div>
              <div role="radiogroup" aria-label="Spread sessions">
                <p className="mb-2 text-[11.5px] text-white/50">Spread sessions</p>
                <div className="space-y-2.5">
                  {SPREAD.map((o) => (
                    <button key={o.value} type="button" role="radio" aria-checked={prefs.spread === o.value} onClick={() => set({ spread: o.value })} className="flex items-center gap-2.5 text-[12.5px] text-white/85">
                      <RadioDot checked={prefs.spread === o.value} /> {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Fixed commitments" sub="The plan never schedules over these.">
            <CommitmentList list={commitments} onChange={setCommitments} />
          </Section>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-white/[0.07] bg-ink/90 px-6 py-3.5 backdrop-blur">
        <p className="min-w-0 truncate text-[12px] text-white/55">
          {changes.length ? `${changes.length} change${changes.length > 1 ? "s" : ""} · ${changes.join(", ")}` : "No changes yet"}
        </p>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => router.push("/plan/review")}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={<RefreshIcon size={13} />} disabled={!changes.length} loading={busy} onClick={regenerate}>
            {busy ? "Regenerating…" : "Regenerate plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
