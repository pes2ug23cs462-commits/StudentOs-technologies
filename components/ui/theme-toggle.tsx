"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "./icons";

export const THEME_KEY = "studentos:theme";

/** Puts the current theme on <html> and remembers it for the next visit. */
export function ThemeSync() {
  const { state } = useStore();
  useEffect(() => {
    document.documentElement.classList.toggle("light", state.theme === "light");
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch {
      /* private mode */
    }
  }, [state.theme]);
  return null;
}

/* Dark / Light pill. */
export function ThemeToggle({ className, stretch }: { className?: string; stretch?: boolean }) {
  const { state, actions } = useStore();
  const items = [
    { key: "dark", label: "Dark", Icon: MoonIcon },
    { key: "light", label: "Light", Icon: SunIcon },
  ] as const;
  return (
    <div className={cn("flex rounded-full border border-white/10 bg-white/[0.04] p-[3px]", stretch && "w-full", className)} role="group" aria-label="Theme">
      {items.map(({ key, label, Icon }) => {
        const active = state.theme === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => actions.setTheme(key)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] transition",
              stretch && "flex-1",
              active ? "bg-cyan-400/15 text-cyan-300" : "text-white/55 hover:text-white",
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
