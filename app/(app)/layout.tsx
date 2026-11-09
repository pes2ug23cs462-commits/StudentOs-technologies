import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {/* Suspense lets client pages read search params (?mode=edit, ?view=day) */}
      <Suspense fallback={null}>{children}</Suspense>
    </AppShell>
  );
}
