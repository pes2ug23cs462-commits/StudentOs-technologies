"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FilterPills } from "@/components/free/parts";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer } from "@/components/ui/drawer";
import { CheckIcon, FlagIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { Card, ChipGroup, FieldError, Input, Label, Pill, Textarea } from "@/components/ui/primitives";
import { TIMELINE_KINDS, suggestedTimeline, yearNumber, type TimelineEvent, type TimelineKind } from "@/lib/free";
import { useStore } from "@/lib/store";
import { TODAY, cn, daysBetween, fmt, uid } from "@/lib/utils";

const DOT: Record<string, string> = {
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  amber: "bg-amber-400",
  emerald: "bg-emerald-500",
  gray: "bg-white/40",
};
const PILL: Record<string, "violet" | "red" | "cyan" | "amber" | "green" | "gray"> = { violet: "violet", rose: "red", sky: "cyan", amber: "amber", emerald: "green", gray: "gray" };
const kindInfo = (k: TimelineKind) => TIMELINE_KINDS.find((x) => x.value === k)!;

/** Academic year label for a date: July–June. */
function academicYear(date: string, currentYear: number) {
  const [y, m] = date.split("-").map(Number);
  const start = m >= 7 ? y : y - 1;
  const [ty, tm] = TODAY.split("-").map(Number);
  const thisStart = tm >= 7 ? ty : ty - 1;
  return { n: currentYear + (start - thisStart), label: `${start}–${String(start + 1).slice(2)}` };
}

/** College timeline (semesters, exams, internships…). Shown as a tab in Schedule. */
export function TimelineSection() {
  const { state, actions } = useStore();
  const currentYear = yearNumber(state.setup?.academic.year || state.profile.year);
  const events = state.timeline;
  const [filter, setFilter] = useState<"all" | TimelineKind>("all");
  const [editing, setEditing] = useState<TimelineEvent | null>(null);

  // First visit: fill in the suggested 4-year roadmap.
  useEffect(() => {
    if (!events) actions.patch({ timeline: suggestedTimeline(currentYear) });
  }, [events, currentYear, actions]);

  const list = useMemo(() => [...(events ?? [])].sort((a, b) => a.date.localeCompare(b.date)), [events]);
  const shown = list.filter((e) => filter === "all" || e.kind === filter);
  const groups = useMemo(() => {
    const map = new Map<number, { label: string; items: TimelineEvent[] }>();
    shown.forEach((e) => {
      const ay = academicYear(e.date, currentYear);
      if (!map.has(ay.n)) map.set(ay.n, { label: ay.label, items: [] });
      map.get(ay.n)!.items.push(e);
    });
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [shown, currentYear]);

  const upcoming = list.filter((e) => !e.done && e.date >= TODAY).slice(0, 3);
  const doneCount = list.filter((e) => e.done).length;

  const update = (next: TimelineEvent[]) => actions.patch({ timeline: next });
  const save = (e: TimelineEvent) => {
    const exists = list.some((x) => x.id === e.id);
    update(exists ? list.map((x) => (x.id === e.id ? e : x)) : [...list, { ...e, id: uid("t") }]);
    setEditing(null);
    actions.toast(exists ? "Event updated." : `Added “${e.title}”.`);
  };

  return (
    <div>
      <SectionHeader
        title="College timeline"
        sub={`Your path through college, year by year. You’re in year ${currentYear}.`}
        actions={
          <>
            <Button
              onClick={() => {
                const custom = list.filter((e) => !e.suggested);
                update([...suggestedTimeline(currentYear), ...custom]);
                actions.toast("Suggested roadmap refreshed. Your own events are kept.");
              }}
            >
              Reset suggestions
            </Button>
            <Button variant="primary" icon={<PlusIcon size={14} />} onClick={() => setEditing({ id: "", kind: "milestone", title: "", date: TODAY, note: "", done: false })}>
              Add event
            </Button>
          </>
        }
      />

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
        <Card className="p-4">
          <p className="text-[11.5px] text-white/50">Year of study</p>
          <p className="mt-1 text-[20px] font-semibold text-white">
            {currentYear} <span className="text-[13px] font-normal text-white/45">of 4</span>
          </p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4].map((y) => (
              <span key={y} className={cn("h-1.5 flex-1 rounded-full", y < currentYear ? "bg-accent" : y === currentYear ? "bg-accent/50" : "bg-white/10")} />
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[11.5px] text-white/50">Milestones done</p>
          <p className="mt-1 text-[20px] font-semibold text-white">
            {doneCount} <span className="text-[13px] font-normal text-white/45">/ {list.length}</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11.5px] text-white/50">Coming up</p>
          {upcoming.length ? (
            <ul className="mt-1.5 space-y-1">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className={cn("h-2 w-2 rounded-full", DOT[kindInfo(e.kind).tone])} />
                  <span className="min-w-0 flex-1 truncate text-white">{e.title}</span>
                  <span className="shrink-0 text-white/50">{fmt.dayMonth(e.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-white/50">Nothing planned yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <FilterPills value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, ...TIMELINE_KINDS.map((k) => ({ value: k.value, label: k.label }))]} />
      </div>

      <div className="mt-5 space-y-8">
        {groups.map(([n, g]) => (
          <section key={n}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-[15px] font-semibold text-white">{n >= 1 && n <= 5 ? `Year ${n}` : n < 1 ? "Before college" : "After college"}</h2>
              <span className="text-[12px] text-white/45">{g.label}</span>
              {n === currentYear && <Pill tone="green" dot>You are here</Pill>}
            </div>
            <ol className="relative ml-2 border-l border-white/10 pl-6">
              {g.items.map((e) => {
                const k = kindInfo(e.kind);
                const days = daysBetween(TODAY, e.date);
                const soon = !e.done && days >= 0 && days <= 30;
                const past = !e.done && days < 0;
                return (
                  <li key={e.id} className="relative pb-4 last:pb-0">
                    <span className={cn("absolute top-4 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-ink", e.done ? "bg-accent" : DOT[k.tone])}>
                      {e.done && <CheckIcon size={9} strokeWidth={3.5} className="text-black" />}
                    </span>
                    <Card className={cn("flex items-start gap-3 p-4", (e.done || past) && "opacity-60", soon && "border-amber-400/40")}>
                      <div className="w-[64px] shrink-0">
                        <p className="text-[12.5px] font-semibold text-white">{fmt.dayMonth(e.date)}</p>
                        <p className="text-[11px] text-white/45">{e.date.slice(0, 4)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn("text-[14px] font-semibold text-white", e.done && "line-through")}>{e.title}</p>
                          <Pill tone={PILL[k.tone]}>{k.label}</Pill>
                          {soon && <Pill tone="amber">In {days} day{days === 1 ? "" : "s"}</Pill>}
                          {past && <Pill>Past</Pill>}
                        </div>
                        {e.note && <p className="mt-1 text-[12.5px] text-white/55">{e.note}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => update(list.map((x) => (x.id === e.id ? { ...x, done: !x.done } : x)))} className={cn("rounded-lg border px-2.5 py-1 text-[11.5px] font-medium", e.done ? "border-accent/40 text-accent" : "border-white/10 text-white/60 hover:text-white")}>
                          {e.done ? "Done" : "Mark done"}
                        </button>
                        <button type="button" aria-label="Edit" onClick={() => setEditing(e)} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white">
                          <PencilIcon size={13} />
                        </button>
                        <button type="button" aria-label="Delete" onClick={() => update(list.filter((x) => x.id !== e.id))} className="rounded-lg p-2 text-white/50 hover:bg-rose-500/10 hover:text-rose-400">
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        {!groups.length && (
          <Card className="flex flex-col items-center p-10 text-center">
            <FlagIcon size={18} className="text-white/40" />
            <p className="mt-2 text-[13px] text-white/55">No events in this category.</p>
          </Card>
        )}
      </div>

      {editing && <EventDrawer initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function EventDrawer({ initial, onClose, onSave }: { initial: TimelineEvent; onClose: () => void; onSave: (e: TimelineEvent) => void }) {
  const [e, setE] = useState(initial);
  const [tried, setTried] = useState(false);
  const err = !e.title.trim() ? "Give the event a name." : "";
  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="College timeline"
      title={initial.id ? "Edit event" : "Add event"}
      footer={
        <>
          <span className="mr-auto" />
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setTried(true);
              if (!err) onSave({ ...e, title: e.title.trim(), suggested: initial.id ? e.suggested : false });
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label>Type</Label>
          <ChipGroup options={TIMELINE_KINDS.map((k) => ({ value: k.value, label: k.label }))} value={e.kind} onChange={(kind) => setE({ ...e, kind })} />
        </div>
        <div>
          <Label htmlFor="ev-title">Event</Label>
          <Input id="ev-title" value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} placeholder="e.g. Smart India Hackathon" invalid={tried && !!err} />
          {tried && <FieldError>{err}</FieldError>}
        </div>
        <div>
          <Label>Date</Label>
          <DatePicker value={e.date} onChange={(date) => setE({ ...e, date })} display={fmt.medium} />
        </div>
        <div>
          <Label htmlFor="ev-note">Note (optional)</Label>
          <Textarea id="ev-note" rows={3} value={e.note} onChange={(x) => setE({ ...e, note: x.target.value })} />
        </div>
      </div>
    </Drawer>
  );
}

function SectionHeader({ title, sub, actions }: { title: string; sub: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-white/55">{sub}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
