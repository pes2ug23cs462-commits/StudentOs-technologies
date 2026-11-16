"use client";

import { useParams } from "next/navigation";
import { DrivePrep } from "@/components/placement/drive-prep";

export default function DrivePrepPage() {
  const { did } = useParams<{ did: string }>();
  return (
    <div className="px-6 py-7 lg:px-8">
      <DrivePrep did={String(did ?? "")} />
    </div>
  );
}
