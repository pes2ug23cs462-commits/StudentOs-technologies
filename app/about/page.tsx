import type { Metadata } from "next";
import { AboutPage } from "@/components/site/about-page";

export const metadata: Metadata = { title: "About", description: "Why we built StudentOS, who we are, and how we help college students plan, learn and get placed.", alternates: { canonical: "/about" } };

export default function Page() {
  return <AboutPage />;
}
