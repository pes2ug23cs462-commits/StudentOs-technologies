"use client";

/* /placement/ai-interview?c=<college id>&d=<drive id>: a company's AI technical interview in strict mode. */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CompanyIvRun } from "@/components/placement/company-iv-run";

function Inner() {
  const q = useSearchParams();
  const cid = q?.get("c") ?? "", pid = q?.get("d") ?? "", kind = q?.get("k") === "hr" ? "hr" : "technical";
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 sm:px-8">
      {cid && pid ? <CompanyIvRun key={kind} cid={cid} pid={pid} kind={kind} /> : <p className="mt-16 text-center text-[14px] text-white/60">This link is missing a part. Open it from My applications.</p>}
    </div>
  );
}

export default function CompanyIvPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
