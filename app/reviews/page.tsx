import type { Metadata } from "next";
import { ReviewsPage } from "@/components/site/reviews";

export const metadata: Metadata = { title: "Reviews", description: "What students say about StudentOS.", alternates: { canonical: "/reviews" } };

export default function Page() {
  return <ReviewsPage />;
}
