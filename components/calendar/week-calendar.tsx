"use client";

import { useState, type DragEvent } from "react";
import { CheckCircleIcon, XCircleIcon } from "@/components/ui/icons";
import { commitmentsOn, sessionsOn } from "@/lib/selectors";
import type { Commitment, StudySession } from "@/lib/types";
import { NOW, TODAY, addDays, cn, fmt, fromMinutes, toMinutes } from "@/lib/utils";

/* Week grid used by Plan review, Edit schedule and Schedule.
   Commitments are grey blocks; study sessions are purple with a cyan edge. */

type Props = {
  weekStart: string;
  sessions: StudySession[];
  commitments: Commitment[];
  startHour?: number;
  endHour?: number;
  hourHeight?: number;
  /** Show done / missed icons and colours (Schedule). Plan review shows the plan only. */
  showStatus?: boolean;
  selectedId?: string | null;
  onSelect?: (s: StudySession) => void;
  /** Enables drag-and-drop to move sessions (Edit schedule). */
  onMove?: (id: string, date: string, start: string) => void;
  /** Label every N hours on the left axis */
  labelEvery?: number;
  className?: string;
};

export function WeekCalendar({
  weekStart,
  sessions,
  commitments,
  startHour = 8,
  endHour = 21,
  hourHeight = 28,
  showStatus = false,
  selectedId,
  onSelect,
  onMove,
  labelEvery = 2,
  className,
}: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const totalH = (endHour - startHour) * hourHeight;
  const y = (hhmm: string) => ((toMinutes(hhmm) - startHour * 60) / 60) * hourHeight;
  const [dragOver, setDragOver] = useState<{ date: string; start: string } | null>(null);
  const [dragging, setDragging] = useState<StudySession | null>(null);

  const timeFromEvent = (e: DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = startHour * 60 + ((e.clientY - rect.top) / hourHeight) * 60;
    const snapped = Math.round(minutes / 30) * 30;
    return fromMinutes(Math.max(startHour * 60, Math.min((endHour - 1) * 60, snapped)));
  };

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/[0.08] bg-black/25", className)}>
      {/* Header */}
      <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-white/[0.07]">
        <div />
        {days.map((d) => (
          <div key={d} className={cn("px-2 py-2.5 text-[11.5px] font-medium", d === TODAY && showStatus ? "text-accent" : "text-white/70")}>
            {fmt.dow(d)} {fmt.dayNum(d)}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="relative grid grid-cols-[52px_repeat(7,minmax(0,1fr))]" style={{ height: totalH }}>
        {/* hour axis */}
        <div className="relative">
          {hours.map((h, i) =>
            i % labelEvery === 0 ? (
              <span key={h} className="absolute left-2 -translate-y-1/2 text-[9.5px] whitespace-nowrap text-white/40" style={{ top: i * hourHeight + (i === 0 ? 8 : 0) }}>
                {fmt.hour(`${String(h).padStart(2, "0")}:00`)}
              </span>
            ) : null,
          )}
        </div>

        {days.map((d) => {
          const isToday = d === TODAY && showStatus;
          const daySessions = sessionsOn(sessions, d);
          return (
            <div
              key={d}
              className={cn("relative border-l border-white/[0.06]", isToday && "bg-violet-500/[0.06]")}
              onDragOver={
                onMove
                  ? (e) => {
                      e.preventDefault();
                      setDragOver({ date: d, start: timeFromEvent(e) });
                    }
                  : undefined
              }
              onDragLeave={onMove ? () => setDragOver(null) : undefined}
              onDrop={
                onMove
                  ? (e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain");
                      if (id) onMove(id, d, timeFromEvent(e));
                      setDragOver(null);
                      setDragging(null);
                    }
                  : undefined
              }
            >
              {/* hour lines */}
              {hours.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-white/[0.045]" style={{ top: i * hourHeight }} />
              ))}

              {commitmentsOn(commitments, d).map((c) => {
                const top = Math.max(0, y(c.start));
                const height = Math.min(totalH, y(c.end)) - top;
                if (height <= 0) return null;
                return (
                  <div
                    key={c.id}
                    className="absolute inset-x-1 overflow-hidden rounded-md border border-white/[0.09] bg-white/[0.07] px-1.5 py-1"
                    style={{ top: top + 1, height: height - 2 }}
                  >
                    <p className="truncate text-[10.5px] leading-tight font-medium text-white/75">{c.name}</p>
                    {height - 2 >= 30 && <p className="mt-0.5 truncate text-[10px] leading-tight text-white/60">{fmt.rangeCompact(c.start, c.end)}</p>}
                  </div>
                );
              })}

              {daySessions.map((s) => {
                const top = y(s.start);
                const height = Math.max(hourHeight * 0.8, (s.minutes / 60) * hourHeight);
                if (top < 0 || top >= totalH) return null;
                const selected = selectedId === s.id;
                const dashed = s.status === "suggested" || s.status === "buffer";
                const done = showStatus && s.status === "completed";
                const missed = showStatus && s.status === "missed";
                return (
                  <button
                    key={s.id}
                    type="button"
                    draggable={!!onMove && !dashed}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", s.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(s);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setDragOver(null);
                    }}
                    onClick={() => onSelect?.(s)}
                    title={`${s.title} · ${fmt.range(s.start, s.minutes)}`}
                    className={cn(
                      "absolute inset-x-1 z-10 overflow-hidden rounded-md px-1.5 py-[3px] text-left transition",
                      dashed
                        ? "border border-dashed border-white/25 bg-ink/80"
                        : done
                          ? "border border-emerald-400/45 bg-emerald-500/15"
                          : missed
                            ? "border border-rose-400/50 bg-rose-500/15"
                            : "border-l-[3px] border-l-accent bg-plum-strong",
                      selected && "ring-2 ring-accent ring-offset-1 ring-offset-black",
                      onSelect && "hover:brightness-125",
                      onMove && !dashed && "cursor-grab active:cursor-grabbing",
                      dragging?.id === s.id && "opacity-40",
                    )}
                    style={{ top: top + 1, height: height - 2 }}
                  >
                    {(() => {
                      const label = s.status === "suggested" ? `Suggested: ${s.short}` : s.short;
                      const time = s.status === "suggested" ? "Needs your OK" : fmt.rangeCompact(s.start, fromMinutes(toMinutes(s.start) + s.minutes));
                      // short blocks: one line, time first so it is always readable
                      return height - 2 < 30 ? (
                        <p className="flex h-full items-center gap-1.5 text-[10.5px] leading-none">
                          {done && <CheckCircleIcon size={10} className="shrink-0 text-emerald-300" />}
                          {missed && <XCircleIcon size={10} className="shrink-0 text-rose-300" />}
                          <span className="shrink-0 font-semibold text-accent-hover">{time}</span>
                          <span className="truncate font-medium text-white">{label}</span>
                        </p>
                      ) : (
                        <>
                          <p className="flex items-center gap-1 text-[10.5px] leading-tight font-semibold text-white">
                            {done && <CheckCircleIcon size={10} className="shrink-0 text-emerald-300" />}
                            {missed && <XCircleIcon size={10} className="shrink-0 text-rose-300" />}
                            <span className="truncate">{label}</span>
                          </p>
                          <p className="mt-0.5 truncate text-[10px] leading-tight font-medium text-white/80">{time}</p>
                        </>
                      );
                    })()}
                  </button>
                );
              })}

              {/* drop preview */}
              {dragOver?.date === d && dragging && (
                <div
                  className="pointer-events-none absolute inset-x-1 z-20 rounded-md border-2 border-dashed border-accent bg-accent/10"
                  style={{ top: y(dragOver.start), height: (dragging.minutes / 60) * hourHeight }}
                />
              )}

              {/* now line */}
              {isToday && (
                <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-accent shadow-[0_0_8px_rgba(139,92,246,0.7)]" style={{ top: y(`${NOW.getHours()}:${NOW.getMinutes()}`) }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
