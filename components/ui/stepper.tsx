import { cn } from "@/lib/utils";
import { CheckIcon } from "./icons";

/* Horizontal step indicator: ✓ Profile — ◉ Goal — ○ Course & date … */
export function Stepper({
  steps,
  current,
  connector = true,
  className,
  onStepClick,
}: {
  steps: string[];
  /** index of the active step; steps before it are complete. Use steps.length for all complete. */
  current: number;
  connector?: boolean;
  className?: string;
  onStepClick?: (i: number) => void;
}) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = !!onStepClick && done;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && connector && <span className={cn("h-px w-5 lg:w-6", i <= current ? "bg-accent" : "bg-white/15")} />}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn("flex items-center gap-1.5 text-[11.5px] whitespace-nowrap", clickable ? "cursor-pointer" : "cursor-default")}
            >
              <span
                className={cn(
                  "flex h-[17px] w-[17px] items-center justify-center rounded-full border",
                  done && "border-accent bg-accent text-black",
                  active && "border-accent",
                  !done && !active && "border-white/25",
                )}
              >
                {done && <CheckIcon size={10} strokeWidth={3.2} />}
                {active && <span className="h-[7px] w-[7px] rounded-full bg-accent" />}
              </span>
              <span className={cn(done || active ? "text-white" : "text-white/45", active && "font-medium")}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
