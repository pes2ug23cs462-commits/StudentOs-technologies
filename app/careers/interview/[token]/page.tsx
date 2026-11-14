"use client";

import { useParams } from "next/navigation";
import { CareerInterview } from "@/components/site/career-interview";

export default function CareerInterviewPage() {
  const { token } = useParams<{ token: string }>();
  return <CareerInterview token={String(token ?? "")} />;
}
