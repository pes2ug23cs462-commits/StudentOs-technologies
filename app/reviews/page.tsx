import type { Metadata } from "next";
import { ReviewsPage } from "@/components/site/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default function Page() {
  return <ReviewsPage />;
}
