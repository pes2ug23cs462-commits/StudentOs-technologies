"use client";

import { useSearchParams } from "next/navigation";
import { JoinCollege } from "@/components/college/join-college";
import { PageHeader } from "@/components/free/parts";

/* /join?code=K7PQ2M — a student joins their college (link or QR from the college). */
export default function JoinPage() {
  const code = useSearchParams().get("code") ?? "";
  return (
    <div className="px-6 py-7 lg:px-8">
      <div className="mx-auto max-w-[760px]">
        <PageHeader title="My college" sub="Share your progress with your college so teachers know where to help." />
        <div className="mt-6">
          <JoinCollege key={code} initialCode={code} />
        </div>
      </div>
    </div>
  );
}
