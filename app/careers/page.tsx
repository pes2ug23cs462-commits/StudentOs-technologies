import type { Metadata } from "next";
import { CareersPage } from "@/components/site/careers-page";

export const metadata: Metadata = { title: "Careers", description: "Join the StudentOS team. Remote internships in engineering, AI, design, marketing and content for college students.", alternates: { canonical: "/careers" } };

export default function Page() {
  return <CareersPage />;
}
