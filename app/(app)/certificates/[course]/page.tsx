"use client";

/* Certificate opened from Settings → Certifications (stays in the Settings area). */

import { useParams } from "next/navigation";
import { CertificateScreen } from "@/components/learn/certificate-screen";

export default function SettingsCertificatePage() {
  const { course } = useParams<{ course: string }>();
  return <CertificateScreen courseId={course} from="settings" />;
}
