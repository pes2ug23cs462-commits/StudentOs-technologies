"use client";

/* Placement cell: interview experiences students shared ("Asked before").
   Checked ones show to juniors preparing for the same company. */

import { useEffect, useState } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { checkExperience, loadAll, removeExperience, type Experience } from "@/lib/experiences";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Experiences({ cid, canEdit }: { cid: string; canEdit: boolean }) {
  const { actions, uid } = useStore();
  const [list, setList] = useState<Experience[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    void loadAll(cid).then(setList).catch(() => setList([]));
  }, [cid]);
  if (!list || !list.length) return null;
  const pending = list.filter((e) => e.status === "pending");
  const shown = showAll ? list : pending;
  const act = async (e: Experience, status: "verified" | "rejected" | "delete") => {
    setBusy(e.id);
    try {
      if (status === "delete") await removeExperience(cid, e.id);
      else await checkExperience(cid, e.id, status, uid ?? "");
      setList((l) => (status === "delete" ? l!.filter((x) => x.id !== e.id) : l!.map((x) => (x.id === e.id ? { ...x, status } : x))));
      actions.toast(status === "verified" ? `Juniors preparing for ${e.companyName} can see it now.` : status === "rejected" ? "Hidden from juniors." : "Deleted.");
    } catch {
      actions.toast("Couldn’t update. Try again.");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d152a] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
            Interview experiences
            {pending.length > 0 && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">{pending.length} to check</span>}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-white/50">What companies asked your students. Checked ones help juniors preparing for the same company.</p>
        </div>
        <button type="button" onClick={() => setShowAll(!showAll)} className="text-[12.5px] text-accent hover:underline">{showAll ? "Only to check" : `All (${list.length})`}</button>
      </div>
      {shown.length ? (
        <div className="mt-4 space-y-3">
          {shown.map((e) => (
            <div key={e.id} className="rounded-xl border border-white/[0.07] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13.5px] font-semibold text-white">{e.companyName} · {e.round}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", e.status === "verified" ? "bg-emerald-400/12 text-emerald-300" : e.status === "rejected" ? "bg-rose-500/12 text-rose-300" : "bg-amber-400/12 text-amber-200")}>{e.status === "verified" ? "checked" : e.status === "rejected" ? "hidden" : "to check"}</span>
                <span className="ml-auto text-[11.5px] text-white/40">{e.name ? `${e.name} · ` : ""}{e.by} · {new Date(e.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
              {e.text && <p className="mt-2 text-[13px] text-white/75">{e.text}</p>}
              {e.questions.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-white/80">{e.questions.map((q, k) => <li key={k}>{q}</li>)}</ul>}
              {e.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{e.tags.map((t) => <span key={t} className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/60">{t}</span>)}</div>}
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {e.status !== "verified" && <button type="button" disabled={busy === e.id} onClick={() => void act(e, "verified")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 text-[12.5px] font-semibold text-[#06140c] disabled:opacity-50"><CheckIcon size={12} /> Looks right, show to juniors</button>}
                  {e.status !== "rejected" && <button type="button" disabled={busy === e.id} onClick={() => void act(e, "rejected")} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[12.5px] text-white/75 disabled:opacity-50"><XIcon size={12} /> Hide</button>}
                  <button type="button" disabled={busy === e.id} onClick={() => window.confirm("Delete this experience?") && void act(e, "delete")} className="ml-auto text-[12px] text-white/40 hover:text-rose-300">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-white/45">Nothing to check right now.</p>
      )}
    </div>
  );
}
