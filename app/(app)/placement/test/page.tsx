"use client";

/* /placement/test?c=<college id>&d=<drive id>: a company's online test in strict mode. */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CompanyTestRun } from "@/components/placement/company-test-run";

function Inner() {
  const q = useSearchParams();
  const cid = q?.get("c") ?? "", pid = q?.get("d") ?? "";
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 sm:px-8">
      {cid && pid ? <CompanyTestRun cid={cid} pid={pid} /> : <p className="mt-16 text-center text-[14px] text-white/60">This test link is missing a part. Open it from My applications.</p>}
    </div>
  );
}

export default function CompanyTestPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
