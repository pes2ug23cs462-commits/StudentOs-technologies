import type { Metadata } from "next";
import { CareersPage } from "@/components/site/careers-page";

export const metadata: Metadata = { title: "Careers" };

export default function Page() {
  return <CareersPage />;
}
