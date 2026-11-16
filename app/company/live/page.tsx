"use client";

/* /company/live?d=<drive id>&r=<room>: the recruiter's live interview call. */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LiveCompany } from "@/components/live/live-company";

function Inner() {
  const q = useSearchParams();
  return <LiveCompany pid={q?.get("d") ?? ""} room={q?.get("r") ?? ""} />;
}

export default function CompanyLivePage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
