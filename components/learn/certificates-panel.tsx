"use client";

import Link from "next/link";
import { verifyUrl } from "@/components/learn/certificate-view";
import { useLearning } from "@/components/learn/use-learning";
import { Button } from "@/components/ui/button";
import { EyeIcon, FileIcon, TrophyIcon } from "@/components/ui/icons";
import { COURSES, FREE_CERT_LIMIT, certLabel, courseDuration, moduleKey } from "@/lib/learn";
import { LEVEL_INFO } from "@/lib/setup";
import { hms } from "@/lib/youtube";

/** The student’s StudentOS certificates, for the profile. */
export function CertificatesPanel({ compactView = false }: { compactView?: boolean }) {
  const { state, learning, actions } = useLearning();
  const earned = COURSES.filter((c) => learning.courses[c.id]?.certId).map((c) => {
    const cp = learning.courses[c.id];
    const secs = c.modules.map((m) => learning.modules[moduleKey(c.id, m.id)]?.d ?? 0);
    return {
      course: c,
      cert: {
        id: cp.certId!,
        name: state.profile.name || "StudentOS learner",
        course: c.title,
        duration: secs.every(Boolean) ? hms(secs.reduce((a, b) => a + b, 0)) : courseDuration(c),
        level: LEVEL_INFO[c.level].label,
        date: new Date(cp.passedAt ?? Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      },
    };
  });
  const passedNoCert = COURSES.filter((c) => learning.courses[c.id]?.passedAt && !learning.courses[c.id]?.certId);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-white">
            <TrophyIcon size={16} className="text-accent" /> Certifications
          </h2>
          <p className="mt-1 text-[11.5px] text-white/50">
            StudentOS certificates you earned by finishing a course and passing its quiz · {earned.length}/{FREE_CERT_LIMIT} on the Free plan
          </p>
        </div>
        <Link href="/learn" className="text-[12.5px] text-accent hover:underline">
          Go to Learning
        </Link>
      </div>

      {earned.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-white/15 p-4 text-center text-[12.5px] text-white/55">
          No certificates yet. Finish a course in Learning and pass its quiz to earn your first one.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.07] overflow-hidden rounded-xl border border-white/10">
          {earned.map(({ course, cert }) => (
            <li key={course.id} className="flex flex-wrap items-center gap-3 bg-white/[0.02] px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <TrophyIcon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-white">{course.title}</p>
                <p className="text-[11.5px] text-white/50">
                  {certLabel(cert.id)} · {cert.date}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/certificates/${course.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.05] px-3 text-[12px] font-medium text-white hover:bg-white/[0.09]">
                  <EyeIcon size={13} /> View
                </Link>
                <Link href={`/certificates/${course.id}?download=1`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[12px] font-semibold text-black hover:bg-accent-hover">
                  <FileIcon size={13} /> Download
                </Link>
                {!compactView && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      navigator.clipboard?.writeText(verifyUrl(cert.id)).then(
                        () => actions.toast("Verify link copied"),
                        () => actions.toast(verifyUrl(cert.id)),
                      )
                    }
                  >
                    Copy verify link
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {passedNoCert.length > 0 && (
        <p className="mt-3 text-[11.5px] text-white/45">
          Also passed: {passedNoCert.map((c) => c.title).join(", ")}. Certificates for these unlock with Premium.
        </p>
      )}
    </div>
  );
}
