"use client";

/* A one-line nudge beside a strict-mode switch: set up the face check first (/verify-face). */

import Link from "next/link";
import { useEffect, useState } from "react";
import { faceApi } from "@/lib/faceprint";
import { cn } from "@/lib/utils";

export function FaceNotice({ className }: { className?: string }) {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  useEffect(() => {
    faceApi<{ enrolled: boolean }>({ action: "status" })
      .then((r) => setEnrolled(r.enrolled))
      .catch(() => setEnrolled(null));
  }, []);
  if (enrolled !== false) return null;
  return (
    <p className={cn("rounded-lg border border-amber-300/30 bg-amber-300/[0.07] px-3 py-2 text-[12px] text-amber-100/85", className)}>
      Face check isn’t set up, so strict mode can’t confirm it’s you.{" "}
      <Link href="/verify-face" className="font-semibold text-amber-200 underline">
        Set it up (1 min)
      </Link>
    </p>
  );
}
