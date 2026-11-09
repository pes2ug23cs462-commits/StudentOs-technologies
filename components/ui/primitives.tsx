"use client";

import Image from "next/image";
import type { HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, CheckIcon, InfoIcon } from "./icons";

/* ---------- Brand ---------- */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return <Image src="/studentos-mark.png" alt="" width={size} height={size} className={cn("object-contain", className)} />;
}
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight text-white", className)}>
      Student<span className="text-violet-400">OS</span>
    </span>
  );
}

/* ---------- Card ---------- */
export function Card({
  className,
  glow,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "depth rounded-2xl border border-white/[0.08] backdrop-blur-sm",
        glow ? "card-glow" : "bg-white/[0.025]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h3 className="text-[15px] font-semibold text-white">{children}</h3>
      {action}
    </div>
  );
}

/* ---------- Pills / badges ---------- */
type Tone = "cyan" | "green" | "red" | "amber" | "violet" | "gray";
const tones: Record<Tone, string> = {
  cyan: "bg-accent/12 text-accent border-accent/20",
  green: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  red: "bg-rose-500/12 text-rose-300 border-rose-400/20",
  amber: "bg-amber-400/12 text-amber-300 border-amber-400/20",
  violet: "bg-violet-500/20 text-violet-200 border-violet-400/25",
  gray: "bg-white/[0.06] text-white/70 border-white/10",
};
export function Pill({ tone = "gray", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------- Chips (single / multi select) ---------- */
export function Chip({
  selected,
  onClick,
  children,
  className,
  invalid,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  invalid?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium transition",
        selected
          ? "border-accent/60 bg-accent/10 text-accent"
          : invalid
            ? "border-white/10 bg-white/[0.05] text-white/85 hover:bg-white/[0.08]"
            : "border-white/10 bg-white/[0.05] text-white/85 hover:bg-white/[0.08]",
        className,
      )}
    >
      {selected && <CheckIcon size={12} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T | T[] | "" | undefined;
  onChange: (v: T) => void;
  className?: string;
}) {
  const isSelected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <Chip key={String(o.value)} selected={isSelected(o.value)} onClick={() => onChange(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

/* ---------- Segmented control (Week / List / Milestones) ---------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex rounded-lg border border-white/10 bg-black/30 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition",
            size === "sm" ? "px-3 py-1 text-[12px]" : "px-4 py-1.5 text-[13px]",
            value === o.value ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Switch ---------- */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-[34px] shrink-0 items-center rounded-full transition",
        checked ? "bg-accent" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "absolute h-4 w-4 rounded-full shadow transition-all",
          checked ? "left-[16px] bg-[#05242a]" : "left-[2px] bg-white/60",
        )}
      />
    </button>
  );
}

/* A labelled row with a switch on the right (settings, reminders). */
export function SwitchRow({
  title,
  description,
  checked,
  onChange,
  className,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3.5", className)}>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-white">{title}</p>
        {description && <p className="mt-0.5 text-[11.5px] text-white/45">{description}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/* ---------- Checkbox ---------- */
export function Checkbox({
  checked,
  onChange,
  label,
  className,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-white/85", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition",
          checked ? "border-accent bg-accent text-black" : "border-white/25 bg-white/[0.03] hover:border-white/40",
        )}
      >
        {checked && <CheckIcon size={11} strokeWidth={3} />}
      </button>
      {children ?? label}
    </label>
  );
}

/* ---------- Radio ---------- */
export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
        checked ? "border-accent bg-accent" : "border-white/30",
      )}
    >
      {checked && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
    </span>
  );
}

/* Selectable option card with a radio (reschedule suggestions, goal types, target dates). */
export function OptionCard({
  checked,
  onSelect,
  title,
  lines,
  badge,
  className,
}: {
  checked: boolean;
  onSelect: () => void;
  title: ReactNode;
  lines?: ReactNode[];
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition",
        checked ? "border-accent/70 bg-accent/[0.07]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
        className,
      )}
    >
      <RadioDot checked={checked} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-white">{title}</span>
        {lines?.map((l, i) => (
          <span key={i} className={cn("block text-[12px]", i === 0 && checked ? "text-accent" : "text-white/50")}>
            {l}
          </span>
        ))}
      </span>
      {badge}
    </button>
  );
}

/* ---------- Form fields ---------- */
export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-white/90">
      {children}
      {hint && <span className="text-[11.5px] font-normal text-white/40">{hint}</span>}
    </label>
  );
}

export const fieldClass = (invalid?: boolean, active?: boolean) =>
  cn(
    "h-10 w-full rounded-xl border px-3.5 text-[13px] text-white placeholder:text-white/35 outline-none transition",
    invalid
      ? "border-rose-400/70 bg-rose-500/20 focus:border-rose-300"
      : active
        ? "border-accent/70 bg-accent/15"
        : "border-white/[0.08] bg-field focus:border-accent/70 focus:bg-accent/[0.05]",
  );

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(fieldClass(invalid), className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-xl border border-white/[0.08] bg-field px-3.5 py-3 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-accent/70",
        className,
      )}
      {...rest}
    />
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-rose-400" role="alert">
      <AlertCircleIcon size={12} />
      {children}
    </p>
  );
}

/* ---------- Notices ---------- */
export function Notice({
  tone,
  title,
  children,
  icon,
  className,
}: {
  tone: "error" | "warning" | "success" | "info";
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const styles = {
    error: "border-rose-500/35 bg-rose-500/[0.07] text-rose-400",
    warning: "border-amber-400/30 bg-amber-400/[0.07] text-amber-300",
    success: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300",
    info: "border-accent/25 bg-accent/[0.06] text-accent",
  }[tone];
  const DefaultIcon = tone === "info" ? InfoIcon : tone === "success" ? CheckIcon : AlertCircleIcon;
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3.5", styles, className)} role={tone === "error" ? "alert" : undefined}>
      <span className="mt-0.5 shrink-0">{icon ?? <DefaultIcon size={14} />}</span>
      <div className="min-w-0">
        {title && <p className="text-[13.5px] font-semibold text-white">{title}</p>}
        {children && <div className={cn("text-[12px] leading-relaxed text-white/60", !!title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}

/* ---------- Progress ---------- */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, size = 28, className, src }: { name: string; size?: number; className?: string; src?: string }) {
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} width={size} height={size} className={cn("inline-block shrink-0 rounded-full border border-white/15 object-cover", className)} style={{ width: size, height: size }} />
    );
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] font-medium text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || "?"}
    </span>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, children, className }: { icon?: ReactNode; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center", className)}>
      {icon && <span className="tile-3d mb-3 flex h-11 w-11 items-center justify-center rounded-xl">{icon}</span>}
      <p className="text-[15px] font-semibold text-white">{title}</p>
      {children && <p className="mt-1.5 text-[12.5px] text-white/50">{children}</p>}
    </div>
  );
}
