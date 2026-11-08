"use client";

import type { ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BarChartIcon,
  BriefcaseIcon,
  BuildingIcon,
  BulbIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CodeIcon,
  CompassIcon,
  CrownIcon,
  CubeIcon,
  DollarIcon,
  DotsIcon,
  FileIcon,
  FlaskIcon,
  FolderIcon,
  GradCapIcon,
  GridIcon,
  LaptopIcon,
  LayersIcon,
  MegaphoneIcon,
  MoonIcon,
  OpenBookIcon,
  PaletteIcon,
  RepeatIcon,
  RocketIcon,
  SearchIcon,
  BellIcon,
  SproutIcon,
  StarIcon,
  SunIcon,
  TargetIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
  XSmallIcon,
  AlertCircleIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type IconC = (p: { size?: number; className?: string; strokeWidth?: number }) => React.ReactElement;
const ICONS: Record<string, IconC> = {
  cap: GradCapIcon,
  book: OpenBookIcon,
  briefcase: BriefcaseIcon,
  grid: GridIcon,
  target: TargetIcon,
  compass: CompassIcon,
  laptop: LaptopIcon,
  chart: BarChartIcon,
  palette: PaletteIcon,
  dollar: DollarIcon,
  flask: FlaskIcon,
  users: UsersIcon,
  user: UserIcon,
  trophy: TrophyIcon,
  bulb: BulbIcon,
  cube: CubeIcon,
  dots: DotsIcon,
  sprout: SproutIcon,
  crown: CrownIcon,
  chat: ChatIcon,
  file: FileIcon,
  clock: ClockIcon,
  folder: FolderIcon,
  video: VideoIcon,
  search: SearchIcon,
  check: CheckIcon,
  repeat: RepeatIcon,
  sun: SunIcon,
  moon: MoonIcon,
  calendar: CalendarIcon,
  bell: BellIcon,
  x: XSmallIcon,
  code: CodeIcon,
  star: StarIcon,
  layers: LayersIcon,
  building: BuildingIcon,
  megaphone: MegaphoneIcon,
  rocket: RocketIcon,
  arrow: ArrowRightIcon,
};
export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const C = ICONS[name] ?? GridIcon;
  return <C size={size} className={className} />;
}

/* Round check badge used on selected cards and chips. */
function CheckBadge({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-black", className)}>
      <CheckIcon size={12} strokeWidth={3.2} />
    </span>
  );
}

/* Large selectable card with an icon, a title and an optional description. */
export function SelectTile({
  selected,
  onClick,
  icon,
  title,
  sub,
  compact,
  role = "radio",
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  sub?: string;
  compact?: boolean;
  role?: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border text-center transition",
        compact ? "min-h-[118px] px-3 py-4" : "min-h-[128px] px-4 py-5",
        selected
          ? "border-accent bg-accent/[0.07] shadow-[0_0_0_1px_var(--color-accent)]"
          : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_8px_20px_rgb(60_50_120/0.08)]",
      )}
    >
      {selected && <CheckBadge className="absolute top-2.5 right-2.5" />}
      <Icon name={icon} size={30} className={selected ? "text-accent" : "text-indigo-500"} />
      <span className="mt-3 text-[15px] leading-snug font-semibold text-white">{title}</span>
      {sub && <span className="mt-1.5 text-[13px] leading-snug text-white/55">{sub}</span>}
    </button>
  );
}

/* Wide chip with an icon on the left and a checkbox/check on the right. */
export function IconCheckChip({ selected, onClick, icon, label }: { selected: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex h-[50px] items-center gap-3 rounded-xl border px-4 text-left transition",
        selected ? "border-accent bg-accent/[0.07]" : "border-white/10 bg-white/[0.03] hover:border-white/20",
      )}
    >
      <Icon name={icon} size={19} className={selected ? "text-accent" : "text-white/60"} />
      <span className="flex-1 truncate text-[14px] font-medium text-white">{label}</span>
      {selected ? <CheckBadge /> : <span className="h-[20px] w-[20px] rounded-md border border-white/20" />}
    </button>
  );
}

/* Compact pill with a checkbox on the left. */
export function CheckPill({ selected, onClick, children, dot }: { selected: boolean; onClick: () => void; children: ReactNode; dot?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-[42px] items-center gap-2.5 rounded-xl border px-3.5 text-[13.5px] font-medium transition",
        selected ? "border-accent bg-accent/[0.07] text-white" : "border-white/10 bg-white/[0.03] text-white/85 hover:border-white/20",
      )}
    >
      {selected ? (
        <CheckBadge className="h-[20px] w-[20px]" />
      ) : dot ? (
        <span className="flex h-[20px] w-[20px] items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: dot }}>
          {String(children).charAt(0)}
        </span>
      ) : (
        <span className="h-[20px] w-[20px] rounded-full border border-white/25" />
      )}
      {children}
    </button>
  );
}

/* Plain pill (single choice) — year of study, levels. */
export function ChoicePill({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "h-[46px] rounded-xl border px-3.5 text-[14px] font-medium transition",
        selected ? "border-accent bg-accent/[0.07] text-white shadow-[0_0_0_1px_var(--color-accent)]" : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Text inputs ---------- */
export function FieldLabel({ children, required, optional, sub }: { children: ReactNode; required?: boolean; optional?: boolean; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[16px] font-semibold text-white">
        {children}
        {required && <span className="ml-1 text-rose-500">*</span>}
        {optional && <span className="ml-1 font-normal text-white/55">(optional)</span>}
      </p>
      {sub && <p className="mt-0.5 text-[13.5px] text-white/55">{sub}</p>}
    </div>
  );
}

const inputBase =
  "h-[50px] w-full rounded-xl border bg-white/[0.03] pr-4 pl-12 text-[14.5px] text-white placeholder:text-white/45 outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgb(22_163_74/0.12)]";

export function IconInput({
  icon,
  invalid,
  list,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: string; invalid?: boolean; list?: string }) {
  return (
    <div className="relative">
      <Icon name={icon} size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/50" />
      <input {...rest} list={list} className={cn(inputBase, invalid ? "border-rose-400" : "border-white/10")} aria-invalid={invalid || undefined} />
    </div>
  );
}

export function IconSelect({
  icon,
  value,
  onChange,
  placeholder,
  options,
  invalid,
  id,
}: {
  icon: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  invalid?: boolean;
  id?: string;
}) {
  return (
    <div className="relative">
      <Icon name={icon} size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/50" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputBase, "appearance-none pr-10", !value && "text-white/45", invalid ? "border-rose-400" : "border-white/10")}
        aria-invalid={invalid || undefined}
      >
        <option value="" className="bg-raised">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-raised text-white">
            {o}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={17} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-white/60" />
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-rose-500" role="alert">
      <AlertCircleIcon size={13} /> {children}
    </p>
  );
}

/* ---------- Footer buttons ---------- */
export function NextButton({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex h-[54px] items-center justify-center gap-3 rounded-xl bg-accent px-7 text-[16px] font-semibold text-black shadow-[0_10px_24px_rgb(22_163_74/0.28)] transition hover:bg-accent-hover",
        className,
      )}
    >
      {children}
      <ArrowRightIcon size={18} className="transition group-hover:translate-x-0.5" />
    </button>
  );
}
export function BackButton({ onClick, children = "Back" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-[50px] items-center gap-3 rounded-xl bg-white/[0.06] px-7 text-[16px] font-medium text-white transition hover:bg-white/[0.1]">
      <ArrowLeftIcon size={18} /> {children}
    </button>
  );
}

/* Pastel icon square used in the assessment and review */
const TONES = {
  blue: "bg-sky-500/12 text-sky-500",
  violet: "bg-violet-500/12 text-violet-500",
  indigo: "bg-indigo-500/12 text-indigo-500",
  green: "bg-emerald-500/12 text-emerald-500",
} as const;
export function ToneIcon({ name, tone, size = 54 }: { name: string; tone: keyof typeof TONES; size?: number }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-2xl", TONES[tone])} style={{ width: size, height: size }}>
      <Icon name={name} size={size * 0.46} />
    </span>
  );
}
