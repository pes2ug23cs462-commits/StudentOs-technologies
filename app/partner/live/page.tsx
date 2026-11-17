"use client";

/* /partner/live?t=<application token>: the StudentOS team's side of a careers live interview. */

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/button";
import { LiveRoom } from "@/components/live/live-company";
import { careersApi } from "@/lib/careers";
import type { LiveSignal } from "@/lib/partner";
import { useStore } from "@/lib/store";

export default function CareersLivePage() {
  const q = useSearchParams();
  const token = q?.get("t") ?? "";
  const { status } = useStore();
  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);
  if (status === "loading") return <div className="min-h-screen bg-ink" />;
  if (status === "signed-out")
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink p-6 text-center">
        <div>
          <p className="text-[15px] text-white/75">Log in with your StudentOS team account to join this interview.</p>
          <ButtonLink href={`/login?next=${encodeURIComponent(`/partner/live?t=${token}`)}`} variant="primary" className="mt-4">Log in</ButtonLink>
        </div>
      </div>
    );
  return (
    <LiveRoom
      pid="careers"
      room={token}
      signal={(body) => careersApi<LiveSignal>("live-signal", { token, host: true, put: body.put }, true)}
      saveFeedback={(fb) => careersApi("live-feedback", { token, ...fb }, true)}
      back={{ href: "/partner?tab=careers", label: "Careers" }}
      note="Only the StudentOS team sees this."
    />
  );
}
