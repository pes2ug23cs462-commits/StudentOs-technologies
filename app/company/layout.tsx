import { Suspense, type ReactNode } from "react";

export const metadata = { title: "Hiring · StudentOS for companies" };

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-ink" />}>{children}</Suspense>;
}
