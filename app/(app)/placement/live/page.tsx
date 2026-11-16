"use client";

/* /placement/live?d=<drive id>&r=<room>: the student's live interview call. */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LiveStudent } from "@/components/live/live-student";

function Inner() {
  const q = useSearchParams();
  const pid = q?.get("d") ?? "", room = q?.get("r") ?? "";
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 sm:px-8">
      {pid && room ? <LiveStudent pid={pid} room={room} /> : <p className="mt-16 text-center text-[14px] text-white/60">This link is missing a part. Open it from My applications.</p>}
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
