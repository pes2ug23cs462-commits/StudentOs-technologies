"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { GoalsSection } from "@/components/goals/goals-section";
import { FilterPills, FreeBadge, PageHeader, PremiumNote } from "@/components/free/parts";
import { useLearning } from "@/components/learn/use-learning";
import { TrophyIcon, CheckCircleIcon, ClockIcon, FolderIcon, PlayIcon, TargetIcon, VideoIcon } from "@/components/ui/icons";
import { MaterialsSection } from "@/components/learn/materials-section";
import { cn } from "@/lib/utils";
import { Card, EmptyState, Pill } from "@/components/ui/primitives";
import { COURSES, FREE_CERT_LIMIT, QUIZ_SECONDS, QUIZ_SIZE, certCount, courseStats, recommendCourses, thumb } from "@/lib/learn";
import { LEVEL_INFO } from "@/lib/setup";
import { PopularVideos } from "@/components/learn/popular-videos";

type Tab = "for-you" | "all" | "mine";
const LEVEL_TONE = { beginner: "green", intermediate: "cyan", advanced: "violet" } as const;

type Section = "courses" | "videos" | "materials" | "goals";
const SECTIONS: { key: Section; label: string; Icon: typeof VideoIcon }[] = [
  { key: "courses", label: "Courses", Icon: VideoIcon },
  { key: "videos", label: "Popular videos", Icon: PlayIcon },
  { key: "materials", label: "My materials", Icon: FolderIcon },
  { key: "goals", label: "My goals", Icon: TargetIcon },
];

export default function LearnPage() {
  return (
    <Suspense fallback={null}>
      <Learn />
    </Suspense>
  );
}

function Learn() {
  const router = useRouter();
  const params = useSearchParams();
  const section = (SECTIONS.find((x) => x.key === params.get("tab"))?.key ?? "courses") as Section;
  const { state, learning } = useLearning();
  const [tab, setTab] = useState<Tab>("for-you");
  const recommended = useMemo(() => recommendCourses(state.setup), [state.setup]);
  const started = COURSES.filter((c) => learning.courses[c.id]);
  const certs = certCount(learning);
  const list = tab === "for-you" ? recommended.slice(0, 4) : tab === "mine" ? started : COURSES;

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader
        title="Learning"
        sub="Free video courses inside StudentOS, in short lessons, picked from your interests and skills."
        actions={<FreeBadge />}
      />

      <div role="tablist" aria-label="Learning sections" className="mt-5 flex gap-1 border-b border-white/10">
        {SECTIONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => router.replace(key === "courses" ? "/learn" : `/learn?tab=${key}`)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition",
              section === key ? "border-accent text-white" : "border-transparent text-white/55 hover:text-white",
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {section === "videos" && <PopularVideos interests={state.setup?.goals.interests ?? []} />}
      {section === "materials" && (
        <div className="mt-6">
          <MaterialsSection />
        </div>
      )}
      {section === "goals" && (
        <div className="mt-6">
          <GoalsSection />
        </div>
      )}
      {section === "courses" && (
      <>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11.5px] text-white/50">Courses started</p>
          <p className="mt-1 text-[20px] font-semibold text-white">{started.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11.5px] text-white/50">Certificates earned</p>
          <p className="mt-1 text-[20px] font-semibold text-white">
            {certs} <span className="text-[13px] font-normal text-white/45">/ {FREE_CERT_LIMIT} on Free</span>
          </p>
          {certs > 0 && (
            <Link href="/settings/certificates" className="mt-1 inline-block text-[12px] text-accent hover:underline">
              View my certificates
            </Link>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-[11.5px] text-white/50">How it works</p>
          <p className="mt-1 text-[12.5px] leading-snug text-white/70">
            Watch each module in short lessons, then pass a {QUIZ_SIZE}-question quiz in {QUIZ_SECONDS} seconds to unlock your certificate.
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <FilterPills
          value={tab}
          onChange={setTab}
          options={[
            { value: "for-you", label: "For you" },
            { value: "all", label: "All courses", count: COURSES.length },
            { value: "mine", label: "My courses", count: started.length },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<VideoIcon size={15} />} title="No courses started yet" className="mt-6 py-12">
          Pick a course from For you and press Start.
        </EmptyState>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const s = courseStats(c, learning);
            const img = thumb(c.modules[0].yt);
            const pct = Math.round((s.done / s.total) * 100);
            return (
              <Card key={c.id} className="flex flex-col overflow-hidden">
                <Link href={`/learn/${c.id}`} className="group relative block aspect-video bg-white/[0.04]">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#000000]/60 text-[#ffffff] backdrop-blur transition group-hover:scale-105 group-hover:bg-accent group-hover:text-black">
                      <PlayIcon size={16} />
                    </span>
                  </span>
                  <span className="absolute bottom-2 left-2 rounded-md bg-[#000000]/70 px-2 py-0.5 text-[11px] font-medium text-[#ffffff]">
                    {c.modules.length} modules
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={LEVEL_TONE[c.level]}>{LEVEL_INFO[c.level].label}</Pill>
                    {s.progress?.certId ? (
                      <Pill tone="green" dot>Certified</Pill>
                    ) : s.progress?.passedAt ? (
                      <Pill tone="green" dot>Quiz passed</Pill>
                    ) : s.progress ? (
                      <Pill tone="cyan" dot>{s.ready ? "Quiz ready" : "In progress"}</Pill>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-[15px] leading-snug font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-white/65">{c.blurb}</p>
                  {s.progress && (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11.5px] text-white/50">
                        {s.done} of {s.total} modules done
                      </p>
                    </div>
                  )}
                  <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-white/50">
                    <ClockIcon size={12} /> {c.modules.map((m) => m.title).join(" · ")}
                  </p>
                  <Link
                    href={`/learn/${c.id}`}
                    className="mt-4 inline-flex h-9 w-fit items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-black hover:bg-accent-hover"
                  >
                    <PlayIcon size={10} /> {s.progress ? "Continue" : "Start course"}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <PremiumNote title="Unlimited certificates">
          Free includes {FREE_CERT_LIMIT} StudentOS certificates. Premium will unlock a certificate for every course you pass.
        </PremiumNote>
        <PremiumNote title="AI notes from every video">
          Premium will turn each module into short notes and suggest what to revise before the quiz.
        </PremiumNote>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-white/40">
        <CheckCircleIcon size={12} /> Videos play inside StudentOS with YouTube’s official player. <TrophyIcon size={12} /> Certificates are issued by StudentOS.
      </p>
      </>
      )}
    </div>
  );
}
