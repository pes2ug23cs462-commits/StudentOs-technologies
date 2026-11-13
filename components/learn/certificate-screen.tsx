"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CertificateView, verifyUrl } from "@/components/learn/certificate-view";
import { useLearning } from "@/components/learn/use-learning";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CheckCircleIcon, FileIcon, LockIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { issueCert, publishCert } from "@/lib/certs";
import { QUIZ_SIZE, certLabel, courseDuration, findCourse, moduleKey } from "@/lib/learn";
import { LEVEL_INFO } from "@/lib/setup";
import { hms } from "@/lib/youtube";

/** The certificate screen. `from` decides where “back” goes: the course, or Settings → Certifications. */
export function CertificateScreen({ courseId, from }: { courseId: string; from: "course" | "settings" }) {
  const { state, learning, setCourse, actions } = useLearning();
  const course = findCourse(courseId, learning);
  const cp = course ? learning.courses[course.id] : undefined;
  const publishing = useRef(false);
  const [publishError, setPublishError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const cert =
    course && cp?.certId
      ? {
          id: cp.certId,
          name: state.profile.name || "StudentOS learner",
          course: course.title,
          // real length of the videos the student watched, when known
          duration: course.modules.every((m) => learning.modules[moduleKey(course.id, m.id)]?.d)
            ? hms(course.modules.reduce((s, m) => s + (learning.modules[moduleKey(course.id, m.id)]?.d ?? 0), 0))
            : courseDuration(course, learning),
          level: LEVEL_INFO[course.level].label,
          modules: course.modules.length,
          score: cp.best ? `${cp.best}/${QUIZ_SIZE}` : undefined,
          date: new Date(cp.passedAt ?? Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        }
      : null;

  // Save the certificate to the public verification list once.
  useEffect(() => {
    if (!cert || !course || cp?.published || publishing.current) return;
    publishing.current = true;
    setPublishError(false);
    const direct = () => publishCert({ ...cert, issuedAt: cp?.passedAt ?? new Date().toISOString() });
    // The server re-marks the passing attempt and writes the certificate. Without a saved attempt
    // (passed before this check existed) or without the server's key, fall back to the old direct save.
    const save = cp?.passProof?.length
      ? issueCert({
          id: cert.id,
          courseId: course.id,
          title: course.title,
          level: course.level,
          name: cert.name,
          duration: cert.duration,
          modules: course.modules.length,
          answers: cp.passProof,
          ...(course.quiz.length ? {} : { pool: cp.quizPool ?? [], sig: cp.quizSig }),
        }).then((r) => (r === "fallback" ? direct() : undefined))
      : direct();
    save
      .then(() => setCourse(course.id, { published: true }))
      .catch((e) => {
        console.error("[certificate] couldn’t save to the verification list", e);
        publishing.current = false;
        setPublishError(true);
      });
  }, [cert?.id, cp?.published, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // “Download” from Certifications opens the save-as-PDF dialog straight away.
  const printed = useRef(false);
  useEffect(() => {
    if (!cert || printed.current || !new URLSearchParams(window.location.search).has("download")) return;
    printed.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [cert?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!course || !cert) {
    return (
      <div className="px-6 py-7 lg:px-8">
        <EmptyState icon={<LockIcon size={15} />} title="Certificate locked" className="py-16">
          Finish every module and pass the final quiz to unlock it.{" "}
          <Link href={course ? `/learn/${course.id}` : "/learn"} className="text-accent hover:underline">
            Go to the course
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="px-6 py-7 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={from === "settings" ? "/settings/certificates" : `/learn/${course.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white">
          <ArrowLeftIcon size={13} /> {from === "settings" ? "Certifications" : course.title}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(verifyUrl(cert.id)).then(() => actions.toast("Verify link copied"), () => actions.toast(verifyUrl(cert.id)));
            }}
          >
            Copy verify link
          </Button>
          <Button variant="primary" size="sm" icon={<FileIcon size={13} />} onClick={() => window.print()}>
            Download PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-[1000px]">
        <CertificateView cert={cert} printId="cert-print" />
        <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-center text-[11.5px] text-white/45">
          <CheckCircleIcon size={12} />
          {certLabel(cert.id)} ·{" "}
          {cp?.published ? (
            "Anyone can check it by scanning the QR code."
          ) : publishError ? (
            <span className="text-rose-400">
              Couldn’t save it to the verification list, so /verify won’t find it yet.{" "}
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">
                Try again
              </button>
            </span>
          ) : (
            "Saving to the verification list…"
          )}
        </p>
      </div>
    </div>
  );
}
