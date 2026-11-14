"use client";

/* 🔔 The bell in the top bar: placement alerts and other updates the server sent.
   Checks on open, every minute and when the tab comes back into focus. */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon, BriefcaseIcon, XIcon } from "@/components/ui/icons";
import { loadInbox, markRead, removeItem, type InboxItem } from "@/lib/inbox";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function ago(t: number) {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d} d ago` : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const { uid } = useStore();
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!uid) return;
    loadInbox(uid)
      .then(setItems)
      .catch(() => setItems((x) => x ?? []));
  }, [uid]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = (items ?? []).filter((i) => !i.read);
  const readOne = (it: InboxItem) => {
    if (!uid || it.read) return;
    setItems((x) => x?.map((y) => (y.id === it.id ? { ...y, read: true } : y)) ?? null);
    void markRead(uid, it.id).catch(() => {});
  };
  const readAll = () => unread.forEach(readOne);
  const remove = (it: InboxItem) => {
    if (!uid) return;
    setItems((x) => x?.filter((y) => y.id !== it.id) ?? null);
    void removeItem(uid, it.id).catch(() => {});
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refresh();
        }}
        aria-label={unread.length ? `Notifications, ${unread.length} new` : "Notifications"}
        aria-expanded={open}
        className={cn("relative flex items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white", compact ? "p-2" : "h-7 w-7")}
      >
        <BellIcon size={compact ? 17 : 15} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white tabular-nums">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className={cn("animate-fade-in z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#121118] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]", compact ? "fixed inset-x-3 top-[60px]" : "absolute top-full right-0 mt-2 w-[360px]")}>
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <p className="text-[13.5px] font-semibold text-white">Notifications</p>
            {unread.length > 0 && (
              <button type="button" onClick={readAll} className="text-[11.5px] font-medium text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items === null ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-white/45">Loading…</p>
            ) : items.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/40">
                  <BellIcon size={17} />
                </span>
                <p className="mt-3 text-[13px] font-medium text-white">No notifications yet</p>
                <p className="mt-1 text-[12px] text-white/45">Placement drives, test links and offers from your college show up here.</p>
              </div>
            ) : (
              items.map((it) => (
                <div key={it.id} className={cn("group relative flex gap-3 border-b border-white/[0.05] px-4 py-3 transition last:border-0 hover:bg-white/[0.03]", !it.read && "bg-accent/[0.06]")}>
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                    <BriefcaseIcon size={14} />
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      readOne(it);
                      setOpen(false);
                      if (it.url?.startsWith("/")) router.push(it.url);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-white">{it.title}</span>
                      {!it.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="new" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-white/55">{it.body}</span>
                    <span className="mt-1 block text-[11px] text-white/35">{ago(it.at)}</span>
                  </button>
                  <button type="button" onClick={() => remove(it)} aria-label="Remove notification" className="h-6 w-6 shrink-0 rounded-md text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white focus:opacity-100">
                    <XIcon size={12} className="mx-auto" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
