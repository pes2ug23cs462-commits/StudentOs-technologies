import { Suspense, type ReactNode } from "react";

export const metadata = { title: "Partner drives · StudentOS team" };

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-ink" />}>{children}</Suspense>;
}
