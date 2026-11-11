import type { Metadata } from "next";
import { InstitutionsPage } from "@/components/site/institutions-page";

export const metadata: Metadata = {
  title: "For institutions",
  description: "StudentOS for PU colleges, schools and degree colleges: exam readiness by section and chapter, students who need help, and campus placements. Free 1-month pilot.",
};

export default function Page() {
  return <InstitutionsPage />;
}
