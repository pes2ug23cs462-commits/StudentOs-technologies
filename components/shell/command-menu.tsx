"use client";

/* ⌘K / Ctrl+K search: jump to any page, or ask the assistant straight away. */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, SearchIcon, SparkleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { NAV_ALL, QUICK_LINKS } from "./nav";

const EVENT = "studentos:command-menu";
export const openCommandMenu = () => window.dispatchEvent(new Event(EVENT));

type Item = { key: string; label: string; hint: string; go: () => void; ask?: boolean };

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const back = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      back.current = document.activeElement as HTMLElement | null;
      setQ("");
      setSel(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else show();
      }
    };
    window.addEventListener(EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
    else back.current?.focus?.();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const pages: Item[] = [
      ...NAV_ALL.map((n) => ({ key: n.href, label: n.label, hint: "Page", go: go(n.href) })),
      ...QUICK_LINKS.map((l) => ({ key: l.href, label: l.label, hint: l.hint, go: go(l.href) })),
    ];
    const t = q.trim().toLowerCase();
    const hits = t ? pages.filter((p) => `${p.label} ${p.hint}`.toLowerCase().includes(t)) : pages;
    const ask: Item[] = t ? [{ key: "ask", label: `Ask StudentOS: “${q.trim()}”`, hint: "AI Assistant", ask: true, go: go(`/assistant?ask=${encodeURIComponent(q.trim())}`) }] : [];
    return hits.length ? [...hits, ...ask] : ask;
  }, [q, router]);

  if (!open) return null;
  const pick = Math.min(sel, Math.max(0, items.length - 1));

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 animate-fade-in bg-scrim/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
      <div className="relative w-full max-w-[560px] animate-fade-in overflow-hidden rounded-xl border border-white/10 bg-raised shadow-[0_24px_60px_-12px_rgb(0_0_0_/_0.6)]">
        <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4">
          <SearchIcon size={15} className="text-white/45" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(items.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter") items[pick]?.go();
            }}
            placeholder="Search pages or ask anything…"
            aria-label="Search pages or ask anything"
            role="combobox"
            aria-expanded
            aria-controls="cmd-list"
            aria-activedescendant={items[pick] ? `cmd-${pick}` : undefined}
            className="h-12 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
          />
          <kbd className="rounded border border-white/12 px-1.5 py-0.5 text-[10.5px] text-white/45">Esc</kbd>
        </div>
        <ul id="cmd-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {items.map((it, i) => (
            <li
              key={it.key}
              id={`cmd-${i}`}
              role="option"
              aria-selected={i === pick}
              onMouseEnter={() => setSel(i)}
              onClick={it.go}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px]", i === pick ? "bg-white/[0.07] text-white" : "text-white/75")}
            >
              {it.ask ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-[#ffffff]" style={{ background: "var(--brand-grad)" }}>
                  <SparkleIcon size={12} />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-white/55">
                  <ArrowRightIcon size={12} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
              <span className="text-[11.5px] text-white/40">{it.hint}</span>
            </li>
          ))}
          {!items.length && <li className="px-3 py-6 text-center text-[13px] text-white/45">Type to search</li>}
        </ul>
        <div className="flex items-center gap-4 border-t border-white/[0.07] px-4 py-2 text-[11px] text-white/40">
          <span>↑↓ to move</span>
          <span>Enter to open</span>
          <span className="ml-auto">Type a question to ask the AI</span>
        </div>
      </div>
    </div>
  );
}
