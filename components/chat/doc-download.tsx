"use client";

/* Under every longer answer: save it as a PDF or a Word file, whether or not
   the AI offered one. */

import { useState } from "react";
import { DownloadIcon } from "@/components/ui/icons";
import { docTitle } from "@/lib/action-blocks";
import { replyToBlocks } from "@/lib/assistant-actions";
import { downloadDocx, downloadPdf } from "@/lib/doc-export";

/** Long enough to be worth a file. */
export const worthAFile = (text: string) => text.replace(/```[\s\S]*?```/g, "").trim().length >= 350;

export function DocDownload({ text }: { text: string }) {
  const [busy, setBusy] = useState<"" | "pdf" | "docx">("");
  const go = async (format: "pdf" | "docx") => {
    setBusy(format);
    try {
      const title = docTitle(text);
      const blocks = replyToBlocks(title, text);
      await (format === "pdf" ? downloadPdf(title, blocks) : downloadDocx(title, blocks));
    } finally {
      setBusy("");
    }
  };
  const btn = "flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11.5px] font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-60";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-white/40">Save this answer:</span>
      <button type="button" className={btn} disabled={!!busy} onClick={() => go("pdf")}>
        <DownloadIcon size={12} /> {busy === "pdf" ? "Making PDF…" : "PDF"}
      </button>
      <button type="button" className={btn} disabled={!!busy} onClick={() => go("docx")}>
        <DownloadIcon size={12} /> {busy === "docx" ? "Making file…" : "Word"}
      </button>
    </div>
  );
}
