import { Suspense, type ReactNode } from "react";

export const metadata = { title: "Team console", robots: { index: false, follow: false } };

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-ink" />}>{children}</Suspense>;
}
