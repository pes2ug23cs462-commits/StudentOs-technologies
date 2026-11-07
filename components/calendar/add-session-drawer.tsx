"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer } from "@/components/ui/drawer";
import { AlertCircleIcon, CheckCircleIcon } from "@/components/ui/icons";
import { Chip, ChipGroup, FieldError, Input, Label, Notice, fieldClass } from "@/components/ui/primitives";
import { COURSES, courseForSession } from "@/lib/learn";
import { findClash, sessionsOn } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { StudySession } from "@/lib/types";
import { TODAY, addDays, addMinutes, cn, fmt, toMinutes, uid, weekStart, weekdayIndex } from "@/lib/utils";

const TYPES = ["Study session", "Revision", "Catch-up / buffer", "Commitment"] as const;
type Kind = (typeof TYPES)[number];
const STARTS = Array.from({ length: 31 }, (_, i) => addMinutes("07:00", i * 30));

export function AddSessionDrawer({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate?: string }) {
  if (!open) return null;
  return <Form onClose={onClose} defaultDate={defaultDate} />;
}

function Form({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  const { state, actions } = useStore();
  const goals = state.goals;
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("Study session");
  const [date, setDate] = useState(defaultDate && defaultDate > TODAY ? defaultDate : addDays(weekStart(TODAY), 5));
  const [start, setStart] = useState("16:00");
  const [minutes, setMinutes] = useState(60);
  const [goalId, setGoalId] = useState<string>(goals[0]?.id ?? "none");
  const [courseId, setCourseId] = useState<string>("auto");
  const [touched, setTouched] = useState(false);

  const clash = findClash(state, date, start, minutes);
  const dayMin = sessionsOn(state.sessions, date).filter((s) => s.status === "planned").reduce((a, s) => a + s.minutes, 0) + minutes;
  const late = toMinutes(start) + minutes > 22 * 60;
  const ok = !clash && !late;
  const titleError = touched && !title.trim() ? "Give the session a name." : "";

  const autoCourse = courseForSession({ title, goalId: goalId === "none" ? "" : goalId }, goals);
  const goalOptions = [
    ...goals.map((g) => ({ value: g.id, label: g.type === "exam" ? `${g.course.split(" ")[0] === "Database" ? "DBMS" : g.course} exam` : `${g.course} · Week ${g.currentWeek ?? 1}` })),
    { value: "none", label: "No goal" },
  ];

  const save = () => {
    setTouched(true);
    if (!title.trim() || !ok) return;
    const goal = goals.find((g) => g.id === goalId);
    const session: StudySession = {
      id: uid("s"),
      goalId: goalId === "none" ? "" : goalId,
      title: title.trim(),
      short: title.trim().split(" · ")[0],
      summary: kind,
      objective: kind === "Revision" ? "Review what you’ve covered so far." : "Added by you.",
      week: goal?.currentWeek ?? 1,
      date,
      start,
      minutes,
      priority: kind === "Catch-up / buffer" ? "Buffer" : "Core",
      status: "planned",
      tasks: [],
      notes: "",
      countsToward: goal ? `${goal.course} · Week ${goal.currentWeek ?? 1}` : "No goal",
      ...(courseId !== "auto" ? { courseId } : {}),
    };
    if (kind === "Commitment") {
      actions.setCommitments([...state.commitments, { id: uid("c"), name: title.trim(), days: [weekdayIndex(date)], start, end: addMinutes(start, minutes) }]);
      actions.toast(`${title.trim()} added to your commitments.`);
    } else {
      actions.addSession(session);
      actions.toast(`Added ${fmt.dow(date)} ${fmt.dayMonth(date)}, ${fmt.time(start)} · ${minutes} min`);
    }
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="Schedule"
      title="Add a study session"
      subtitle="StudentOS checks it against your plan and commitments"
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-white/55">
            {fmt.short(date)} · {fmt.range(start, minutes)}
          </span>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" disabled={!ok} onClick={save}>
            Add session
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor="as-title">What will you work on?</Label>
          <Input id="as-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={!!titleError} placeholder="e.g. Problem Set 1 · Making Faces" />
          <FieldError>{titleError}</FieldError>
        </div>
        <div>
          <Label>Type</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t} selected={kind === t} onClick={() => setKind(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Day</Label>
            <DatePicker value={date} onChange={setDate} min={TODAY} display={fmt.short} />
          </div>
          <div>
            <Label htmlFor="as-start">Starts</Label>
            <select id="as-start" value={start} onChange={(e) => setStart(e.target.value)} className={cn(fieldClass(), "appearance-none")}>
              {STARTS.map((t) => (
                <option key={t} value={t} className="bg-raised">
                  {fmt.time(t)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label>Duration</Label>
          <ChipGroup options={[30, 45, 60, 90].map((m) => ({ value: m, label: `${m} min` }))} value={minutes} onChange={setMinutes} className="[&>button]:flex-1" />
        </div>
        {kind !== "Commitment" && (
          <div>
            <Label>Counts toward</Label>
            <ChipGroup options={goalOptions} value={goalId} onChange={setGoalId} />
          </div>
        )}
        {kind !== "Commitment" && (
          <div>
            <Label>Open when the session starts</Label>
            <ChipGroup
              options={[
                { value: "auto", label: autoCourse ? `${autoCourse.title} (suggested)` : "Nothing" },
                ...COURSES.filter((c) => c.id !== autoCourse?.id).map((c) => ({ value: c.id, label: c.title })),
                ...(autoCourse ? [{ value: "none", label: "Nothing" }] : []),
              ]}
              value={courseId}
              onChange={setCourseId}
            />
            <p className="mt-1.5 text-[11px] text-white/45">Press Start session and this course opens with the timer.</p>
          </div>
        )}
        {clash ? (
          <Notice tone="error" icon={<AlertCircleIcon size={14} />} title={`Clashes with ${clash}`}>
            Pick a different time — StudentOS never schedules over a commitment or another session.
          </Notice>
        ) : late ? (
          <Notice tone="warning" title="That runs late">Sessions ending after 10 PM are easy to skip. Try an earlier slot.</Notice>
        ) : (
          <Notice tone="success" icon={<CheckCircleIcon size={14} />} title="Fits your plan">
            {fmt.dow(date)} {fmt.time(start)} is free. {fmt.dowLong(date)} will have {dayMin / 60} h of study{dayMin / 60 <= 2.5 ? `, within your ${["Sat", "Sun"].includes(fmt.dow(date)) ? "weekend" : "daily"} limit.` : " — that’s over your 2.5 h daily limit."}
          </Notice>
        )}
      </div>
    </Drawer>
  );
}
