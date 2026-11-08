"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, cn, fmt, fromKey, toKey, weekStart } from "@/lib/utils";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { fieldClass } from "./primitives";

/* Text-field style date picker with a month popover (onboarding step 3, goals). */
export function DatePicker({
  value,
  onChange,
  min,
  placeholder = "Choose a date",
  invalid,
  id,
  display = fmt.full,
}: {
  value: string;
  onChange: (key: string) => void;
  min?: string;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  display?: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || min || toKey(new Date())).slice(0, 7) + "-01");
  const ref = useRef<HTMLDivElement>(null);

  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) popRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shiftMonth = (n: number) => {
    const d = fromKey(month);
    d.setMonth(d.getMonth() + n);
    setMonth(toKey(d));
  };

  const first = weekStart(month);
  const monthIdx = fromKey(month).getMonth();
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const rows = days[35] && fromKey(days[35]).getMonth() === monthIdx ? 6 : 5;

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(fieldClass(invalid, open), "flex items-center justify-between text-left")}
      >
        <span className={value ? "text-white" : "text-white/45"}>{value ? display(value) : placeholder}</span>
        <CalendarIcon size={15} className="text-white/60" />
      </button>

      {open && (
        <div ref={popRef} role="dialog" aria-label="Choose date" className="absolute top-[calc(100%+6px)] left-0 z-40 w-[280px] animate-fade-in rounded-xl border border-white/10 bg-raised/95 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <ChevronLeftIcon size={14} />
            </button>
            <span className="text-[13px] font-semibold text-white">{fmt.monthYear(month)}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <ChevronRightIcon size={14} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10.5px] text-white/40">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.slice(0, rows * 7).map((key) => {
              const inMonth = fromKey(key).getMonth() === monthIdx;
              const disabled = !!min && key < min;
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-8 rounded-md text-[12px] transition",
                    selected
                      ? "bg-accent font-semibold text-black"
                      : inMonth
                        ? "text-white/85 hover:bg-white/10"
                        : "text-white/25 hover:bg-white/5",
                    disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
                  )}
                >
                  {fmt.dayNum(key)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
