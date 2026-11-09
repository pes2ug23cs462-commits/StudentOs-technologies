"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useStore } from "@/lib/store";

/* Profile setup pages: full-screen, no sidebar, logged-in users only. */
export default function SetupLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useStore();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);

  if (status !== "ready") return <div className="min-h-screen bg-ink" />;
  return (
    <>
      <Suspense fallback={null}>{children}</Suspense>
      <Toaster />
    </>
  );
}
