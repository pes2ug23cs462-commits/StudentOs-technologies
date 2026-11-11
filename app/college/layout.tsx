import { Suspense, type ReactNode } from "react";

export const metadata = { title: "College dashboard · StudentOS" };

export default function CollegeLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-ink" />}>{children}</Suspense>;
}
