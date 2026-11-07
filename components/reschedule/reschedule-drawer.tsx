"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon, CalendarIcon, ChatIcon, CheckCircleIcon, CheckIcon, ChevronRightIcon, FlagIcon, InfoIcon, RepeatIcon } from "@/components/ui/icons";
import { Chip, Notice, OptionCard, Pill, Segmented, Switch } from "@/components/ui/primitives";
import { Stepper } from "@/components/ui/stepper";
import { commitmentsOn, findClash, freeSlots, sessionsOn } from "@/lib/selectors";
import { useStore, type AppState } from "@/lib/store";
import type { StudySession } from "@/lib/types";
import { TODAY, addDays, addMinutes, cn, daysBetween, fmt, weekStart } from "@/lib/utils";

type Slot = { date: string; start: string; minutes: number };
type Choice = Slot & { id: string; title: string; detail: string; badge?: ReactNode };

const REASONS = ["Class ran late", "Too tired tonight", "Something came up", "Need more time"];
const DAILY_LIMIT_H = 2.5;
const SHORT_DAY = (k: string) => fmt.dow(k);

/** First free slot on a day, trying preferred start times in order. */
function firstFree(state: AppState, date: string, minutes: number, prefs: string[], ignoreId: string) {
  return prefs.find((t) => !findClash(state, date, t, minutes, ignoreId));
}

function suggestions(state: AppState, s: StudySession): Choice[] {
  const out: Choice[] = [];
  const from = s.date < TODAY ? TODAY : s.date;
  const tomorrow = addDays(TODAY, 1);
  const sunday = addDays(weekStart(TODAY), 6);
  const t1 = firstFree(state, tomorrow, s.minutes, ["19:00", "20:00", "18:00"], s.id);
  if (t1 && tomorrow <= sunday)
    out.push({ id: "a", date: tomorrow, start: t1, minutes: s.minutes, title: `Tomorrow · ${fmt.short(tomorrow)}`, detail: `Your usual ${fmt.dowLong(tomorrow)} evening slot is free`, badge: <Pill tone="cyan" dot>Best fit</Pill> });
  const sat = addDays(weekStart(TODAY), 5);
  const t2 = sat > from ? firstFree(state, sat, s.minutes, ["10:00", "11:00", "12:00", "09:00", "16:00"], s.id) : undefined;
  if (t2) out.push({ id: "b", date: sat, start: t2, minutes: s.minutes, title: fmt.short(sat), detail: "Morning focus time — no classes" });
  const t3 = sunday > from ? firstFree(state, sunday, s.minutes, ["18:00", "16:00", "10:00"], s.id) : undefined;
  if (t3) out.push({ id: "c", date: sunday, start: t3, minutes: s.minutes, title: fmt.short(sunday), detail: `Uses ${s.minutes / 60} h of your weekly buffer`, badge: <Pill tone="amber" dot>Uses buffer</Pill> });
  return out;
}

function fallbacks(state: AppState, s: StudySession): Choice[] {
  const nextMon = addDays(weekStart(TODAY), 7);
  const mon = firstFree(state, nextMon, s.minutes, ["19:00", "20:00", "18:00"], s.id) ?? "19:00";
  const sunday = addDays(weekStart(TODAY), 6);
  return [
    { id: "x1", date: nextMon, start: mon, minutes: s.minutes, title: `Move to next week · ${fmt.short(nextMon).replace(/ \w+$/, "")}`, detail: "Shifts 2 later sessions by a day · finish date unchanged", badge: <Pill tone="cyan" dot>Recommended</Pill> },
    { id: "x2", date: addDays(TODAY, 1), start: "21:30", minutes: 30, title: "Split into two 30-min sessions", detail: "Fits the gaps around your commitments" },
    { id: "x3", date: sunday, start: "16:00", minutes: s.minutes, title: `Use buffer time · ${fmt.short(sunday).replace(/ \w+$/, "")}`, detail: "Leaves 6 days of buffer instead of 7", badge: <Pill tone="amber" dot>Uses buffer</Pill> },
  ];
}

export function RescheduleDrawer({ session, open, onClose }: { session: StudySession | null; open: boolean; onClose: () => void }) {
  if (!session || !open) return null;
  return <Flow key={session.id} session={session} onClose={onClose} />;
}

function Flow({ session, onClose }: { session: StudySession; onClose: () => void }) {
  const { state, actions } = useStore();
  const [step, setStep] = useState<"choose" | "custom" | "review">("choose");
  const [reason, setReason] = useState<string>("Too tired tonight");
  const options = useMemo(() => suggestions(state, session), [state, session]);
  const noSlots = options.length === 0;
  const alt = useMemo(() => (noSlots ? fallbacks(state, session) : []), [noSlots, state, session]);
  const [picked, setPicked] = useState<Choice | Slot | null>(noSlots ? alt[0] ?? null : options[0] ?? null);
  const [remind, setRemind] = useState(true);
  const [calendar, setCalendar] = useState(true);

  const isToday = session.date === TODAY;
  const title = step === "review" ? "Review before you confirm" : step === "custom" ? "Pick a different time" : isToday ? "Move tonight’s session" : `Move ${session.status === "missed" ? "your missed session" : session.short}`;
  const subtitle =
    step === "review" ? "Nothing is saved until you confirm" : step === "custom" ? `${session.short} · originally ${fmt.short(session.date)}, ${fmt.time(session.start)}` : `${session.short} · ${fmt.short(session.date)}, ${fmt.range(session.start, session.minutes)}`;

  const confirm = () => {
    if (!picked) return;
    actions.updateSession(session.id, { date: picked.date, start: picked.start, minutes: picked.minutes, status: "planned", rescheduled: true });
    // A missed session that takes the catch-up slot replaces the suggestion.
    const catchUp = state.sessions.find((s) => s.status === "suggested" && s.date === picked.date && s.start === picked.start);
    if (catchUp) actions.removeSession(catchUp.id);
    actions.toast(`${session.status === "missed" ? `${session.short} moved to` : "Moved to"} ${fmt.dow(picked.date)} ${fmt.dayMonth(picked.date)}, ${fmt.time(picked.start)}${remind ? " · reminder set" : ""}`);
    onClose();
  };

  const footerLeft = picked ? <span className="mr-auto text-[11.5px] text-white/55">{`${fmt.dow(picked.date)} ${fmt.dayMonth(picked.date)} · ${step === "custom" ? fmt.range(picked.start, picked.minutes) : fmt.time(picked.start)}${step === "choose" ? " selected" : ""}`}</span> : <span className="mr-auto" />;

  const footer =
    step === "choose" ? (
      <>
        {footerLeft}
        <Button size="sm" variant="ghost" onClick={onClose}>
          {noSlots ? "Keep tonight" : "Cancel"}
        </Button>
        <Button size="sm" variant="primary" disabled={!picked} icon={<ArrowRightIcon size={13} />} onClick={() => setStep("review")}>
          Continue
        </Button>
      </>
    ) : step === "custom" ? (
      <>
        {footerLeft}
        <Button size="sm" variant="ghost" icon={<ArrowLeftIcon size={13} />} onClick={() => setStep("choose")}>
          Back
        </Button>
        <Button size="sm" variant="primary" disabled={!picked} icon={<ArrowRightIcon size={13} />} onClick={() => setStep("review")}>
          Continue
        </Button>
      </>
    ) : (
      <>
        {footerLeft}
        <Button size="sm" variant="ghost" icon={<ArrowLeftIcon size={13} />} onClick={() => setStep("choose")}>
          Back
        </Button>
        <Button size="sm" variant="primary" icon={<CheckIcon size={13} />} onClick={confirm}>
          Confirm reschedule
        </Button>
      </>
    );

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="Reschedule session"
      title={title}
      subtitle={subtitle}
      header={<Stepper steps={["Choose a time", "Review changes", "Done"]} current={step === "review" ? 1 : 0} connector={false} className="gap-6" />}
      footer={footer}
    >
      {step === "choose" && (
        <div className="space-y-5">
          {noSlots ? (
            <Notice tone="warning" icon={<CalendarIcon size={15} />} title={`No free ${session.minutes}-min slots left this week`}>
              Your evenings until {fmt.short(addDays(weekStart(TODAY), 6))} are taken by classes, commitments and other sessions. Here’s how StudentOS can still make it work.
            </Notice>
          ) : (
            <div>
              <p className="mb-2.5 text-[13px] font-semibold text-white">What’s getting in the way?</p>
              <div className="flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                    {r}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-white">{noSlots ? "Other ways to fit it in" : "Suggested by StudentOS"}</p>
                {!noSlots && <p className="text-[11px] text-white/45">Based on your free hours and this week’s load</p>}
              </div>
              <Pill tone="violet" dot>
                AI pick
              </Pill>
            </div>
            <div className="space-y-2.5" role="radiogroup">
              {(noSlots ? alt : options).map((o) => (
                <OptionCard
                  key={o.id}
                  checked={!!picked && "id" in picked && picked.id === o.id}
                  onSelect={() => setPicked(o)}
                  title={o.title}
                  lines={[`${fmt.range(o.start, o.minutes)} · ${o.minutes} min`, o.detail]}
                  badge={o.badge}
                />
              ))}
              {noSlots ? (
                <Link href="/assistant" className="flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3.5 hover:bg-violet-500/15">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/25 text-violet-200">
                    <ChatIcon size={14} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold text-white">Ask StudentOS to rework this week</span>
                    <span className="block text-[11px] text-white/50">Chat through what changed and get a new plan</span>
                  </span>
                  <ChevronRightIcon size={14} className="text-white/50" />
                </Link>
              ) : (
                <button type="button" onClick={() => setStep("custom")} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left hover:bg-white/[0.06]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                    <CalendarIcon size={14} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold text-white">Pick a different day or time</span>
                    <span className="block text-[11px] text-white/50">See every free slot for the next 7 days</span>
                  </span>
                  <ChevronRightIcon size={14} className="text-white/50" />
                </button>
              )}
            </div>
          </div>

          {!noSlots && (
            <Notice tone="info" icon={<InfoIcon size={14} />}>
              Any of these keeps {session.short} on track for {fmt.short(addDays(weekStart(session.date), 6)).replace(/^\w+ /, "Sun ")}. Your finish date doesn’t change.
            </Notice>
          )}
        </div>
      )}

      {step === "custom" && <CustomPicker session={session} picked={picked} onPick={setPicked} />}

      {step === "review" && picked && (
        <ReviewChanges session={session} picked={picked} remind={remind} setRemind={setRemind} calendar={calendar} setCalendar={setCalendar} />
      )}
    </Drawer>
  );
}

/* ---------- Step 2 · custom day/time ---------- */
function CustomPicker({ session, picked, onPick }: { session: StudySession; picked: Slot | null; onPick: (s: Slot) => void }) {
  const { state } = useStore();
  const days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i + 1));
  const [day, setDay] = useState(picked?.date ?? days[1]);
  const [minutes, setMinutes] = useState(picked?.minutes ?? session.minutes);
  const sunday = (k: string) => fmt.dow(k) === "Sun";

  const freeCount = (k: string) => freeSlots(state, k, minutes, session.id).length;

  const slotsFor = (start: number, end: number) =>
    Array.from({ length: end - start }, (_, i) => `${String(start + i).padStart(2, "0")}:00`).map((t) => {
      const clash = findClash(state, day, t, minutes, session.id);
      const lunch = t === "12:00";
      return { t, label: clash ? clash.charAt(0).toUpperCase() + clash.slice(1) : lunch ? "Lunch" : "Free", free: !clash && !lunch };
    });

  const morning = slotsFor(9, 13);
  const evening = [14, 16, 19, 20].map((h) => `${h}:00`).map((t) => {
    const clash = findClash(state, day, t, minutes, session.id);
    return { t, label: clash ? clash.charAt(0).toUpperCase() + clash.slice(1) : "Free", free: !clash };
  });

  const dayStudyMin = sessionsOn(state.sessions, day)
    .filter((s) => s.id !== session.id && s.status !== "suggested" && s.status !== "buffer")
    .reduce((a, s) => a + s.minutes, 0);
  const willHave = sessionsOn(state.sessions, day).filter((s) => s.id !== session.id && s.status === "planned").length + 1;
  const totalH = (dayStudyMin + minutes) / 60;

  const SlotBtn = ({ t, label, free }: { t: string; label: string; free: boolean }) => {
    const sel = picked?.date === day && picked.start === t && picked.minutes === minutes;
    return (
      <button
        type="button"
        disabled={!free}
        onClick={() => onPick({ date: day, start: t, minutes })}
        className={cn(
          "rounded-lg border px-2 py-2 text-center transition",
          sel ? "border-cyan-400/70 bg-cyan-400/10" : free ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]" : "cursor-not-allowed border-dashed border-white/10 opacity-60",
        )}
      >
        <span className={cn("block text-[12.5px] font-semibold", sel ? "text-cyan-300" : "text-white")}>{fmt.time(t)}</span>
        <span className={cn("block text-[10px]", sel ? "text-cyan-300" : "text-white/45")}>{sel ? "Selected" : label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white">Day</p>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-white/60">
            {fmt.short(days[0])} – {fmt.short(days[6])}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const n = freeCount(d);
            const sel = d === day;
            return (
              <button
                key={d}
                type="button"
                disabled={n === 0}
                onClick={() => setDay(d)}
                className={cn(
                  "rounded-lg border py-2 text-center transition",
                  sel ? "border-cyan-400/70 bg-cyan-400/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]",
                  n === 0 && "cursor-not-allowed opacity-40",
                )}
              >
                <span className={cn("block text-[10.5px]", sel ? "text-cyan-300" : "text-white/50")}>{SHORT_DAY(d)}</span>
                <span className={cn("block text-[17px] font-semibold", sel ? "text-cyan-300" : "text-white")}>{fmt.dayNum(d)}</span>
                <span className={cn("block text-[9.5px]", sel ? "text-cyan-300" : "text-white/45")}>{n === 0 ? "Full" : sunday(d) ? "Buffer" : `${n} free`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-white">Duration</p>
        <p className="mb-2 text-[11px] text-white/45">{session.short} usually takes about {session.minutes >= 60 ? `${session.minutes / 60 === 1 ? "an hour" : `${session.minutes / 60} hours`}` : `${session.minutes} minutes`}</p>
        <Segmented
          className="w-full [&>button]:flex-1"
          value={String(minutes)}
          onChange={(v) => setMinutes(Number(v))}
          options={[30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} min` }))}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white">Free times on {fmt.short(day)}</p>
          <Pill tone="cyan">{minutes} min blocks</Pill>
        </div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">Morning</p>
        <div className="grid grid-cols-4 gap-1.5">{morning.map((s) => <SlotBtn key={s.t} {...s} />)}</div>
        <p className="mt-3 mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">Afternoon & evening</p>
        <div className="grid grid-cols-4 gap-1.5">{evening.map((s) => <SlotBtn key={s.t} {...s} />)}</div>
        {commitmentsOn(state.commitments, day).length > 0 && <p className="mt-2 text-[10.5px] text-white/40">Greyed-out times overlap your commitments or other sessions.</p>}
      </div>

      {picked?.date === day && willHave > 1 && (
        <Notice tone={totalH > DAILY_LIMIT_H ? "error" : "warning"} title={`${fmt.dowLong(day)} will have ${willHave} sessions`}>
          That’s {totalH.toFixed(totalH % 1 ? 1 : 0)} h of study on {fmt.dow(day)} — {totalH > DAILY_LIMIT_H ? `over your ${DAILY_LIMIT_H} h daily limit.` : `still within your ${DAILY_LIMIT_H} h limit.`}
        </Notice>
      )}
    </div>
  );
}

/* ---------- Step 3 · review ---------- */
function ReviewChanges({ session, picked, remind, setRemind, calendar, setCalendar }: { session: StudySession; picked: Slot; remind: boolean; setRemind: (v: boolean) => void; calendar: boolean; setCalendar: (v: boolean) => void }) {
  const { state } = useStore();
  const dueSunday = addDays(weekStart(session.date), 6);
  const daysLeft = daysBetween(picked.date, dueSunday);
  const onTrack = picked.date <= dueSunday;
  const dayMin = sessionsOn(state.sessions, picked.date)
    .filter((s) => s.id !== session.id && s.status === "planned")
    .reduce((a, s) => a + s.minutes, 0);
  const dayH = (dayMin + picked.minutes) / 60;
  const reminderAt = addMinutes(picked.start, -30);

  const rows: { icon: ReactNode; title: string; sub: string; badge: ReactNode }[] = [
    onTrack
      ? { icon: <CheckCircleIcon size={14} className="text-emerald-400" />, title: `${session.short} still due ${fmt.short(dueSunday).replace(/ \w+$/, "")}`, sub: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left after this session`, badge: <Pill tone="green">On track</Pill> }
      : { icon: <AlertCircleIcon size={14} className="text-amber-300" />, title: `${session.short} target moves to ${fmt.short(addDays(picked.date, 1)).replace(/ \w+$/, "")}`, sub: "2 days later — still inside this week’s buffer", badge: <Pill tone="amber">Moved</Pill> },
  ];
  if (!onTrack)
    rows.push({ icon: <RepeatIcon size={14} className="text-cyan-300" />, title: "2 later sessions shift by a day", sub: "Next lecture → Sat · next problem set → Tue", badge: <Pill tone="cyan">Auto-adjusted</Pill> });
  if (dayMin > 0)
    rows.push({ icon: <AlertCircleIcon size={14} className="text-amber-300" />, title: `${fmt.dowLong(picked.date)} becomes a ${dayH} h study day`, sub: `Still under your ${DAILY_LIMIT_H} h daily limit`, badge: <Pill tone="amber">{dayH} h</Pill> });
  rows.push({ icon: <FlagIcon size={14} className="text-emerald-400" />, title: "Finish date unchanged", sub: "Your plan still ends on the same day", badge: <Pill tone="green">No change</Pill> });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.04] p-4">
        <div className="flex-1">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">From</p>
          <p className="mt-1 text-[15px] font-semibold text-white/60 line-through">{fmt.short(session.date)}</p>
          <p className="text-[11px] text-white/45">{fmt.range(session.start, session.minutes)} · {session.minutes} min</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
          <ArrowRightIcon size={14} />
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-cyan-300 uppercase">To</p>
          <p className="mt-1 text-[15px] font-semibold text-white">{fmt.short(picked.date)}</p>
          <p className="text-[11px] text-cyan-300">{fmt.range(picked.start, picked.minutes)} · {picked.minutes} min</p>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-white">What changes in your plan</p>
        <p className="mb-2.5 text-[11px] text-white/45">StudentOS checked the rest of your week</p>
        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02]">
          {rows.map((r) => (
            <li key={r.title} className="flex items-center gap-3 px-3.5 py-3">
              {r.icon}
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-white">{r.title}</span>
                <span className="block text-[10.5px] text-white/45">{r.sub}</span>
              </span>
              {r.badge}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-white">Reminders</p>
        <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5">
          <div className="flex items-center justify-between gap-3 py-3">
            <span>
              <span className="block text-[12.5px] font-medium text-white">Remind me 30 min before</span>
              <span className="block text-[10.5px] text-white/45">Push notification · {fmt.dow(picked.date)} {fmt.time(reminderAt)}</span>
            </span>
            <Switch label="Remind me 30 min before" checked={remind} onChange={setRemind} />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span>
              <span className="block text-[12.5px] font-medium text-white">Update my Google Calendar</span>
              <span className="block text-[10.5px] text-white/45">Moves the event on {state.profile.email}</span>
            </span>
            <Switch label="Update my Google Calendar" checked={calendar} onChange={setCalendar} />
          </div>
        </div>
      </div>
    </div>
  );
}

