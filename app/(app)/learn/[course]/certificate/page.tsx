"use client";

import { useParams } from "next/navigation";
import { CertificateScreen } from "@/components/learn/certificate-screen";

export default function CourseCertificatePage() {
  const { course } = useParams<{ course: string }>();
  return <CertificateScreen courseId={course} from="course" />;
}
