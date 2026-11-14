"use client";

/* Download one or many students' resumes as PDF: the resumes are drawn off screen
   and the browser's print dialog opens (choose “Save as PDF”). Several resumes
   print one per page. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ResumeSheet } from "@/components/resume/resume-sheet";
import type { ResumeSnapshot } from "@/lib/free";

export type PrintableResume = { name: string; cv: ResumeSnapshot };

export function useResumePrint() {
  const [list, setList] = useState<PrintableResume[] | null>(null);
  useEffect(() => {
    if (!list?.length) return;
    const title = document.title;
    document.title = list.length === 1 ? `${list[0].name} - Resume` : `Resumes (${list.length})`;
    const t = setTimeout(() => {
      window.print();
      document.title = title;
      setList(null);
    }, 350);
    return () => {
      clearTimeout(t);
      document.title = title;
    };
  }, [list]);
  const node =
    list?.length && typeof document !== "undefined"
      ? createPortal(
          <div id="resume-batch" aria-hidden className="pointer-events-none fixed top-0 left-[-10000px]">
            {list.map((x, i) => (
              <ResumeSheet key={i} r={x.cv.r} entries={x.cv.entries} certs={x.cv.certs} />
            ))}
          </div>,
          document.body,
        )
      : null;
  return { print: (l: PrintableResume[]) => setList(l.length ? l : null), node };
}
