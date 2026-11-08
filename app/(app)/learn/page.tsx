"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoalsSection } from "@/components/goals/goals-section";
import { FilterPills, FreeBadge, PageHeader, PremiumNote } from "@/components/free/parts";
import { useLearning } from "@/components/learn/use-learning";
import { TrophyIcon, CheckCircleIcon, ClockIcon, FolderIcon, PinIcon, PlayIcon, TargetIcon, VideoIcon } from "@/components/ui/icons";
import { MaterialsHub } from "@/components/notes/materials-hub";
import { cn } from "@/lib/utils";
import { Card, EmptyState, Pill } from "@/components/ui/primitives";
import { COURSES, isVideoCourse, videoCourse, FREE_CERT_LIMIT, QUIZ_SECONDS, QUIZ_SIZE, certCount, courseForGoal, coursePercent, courseStats, moduleKey, thumb } from "@/lib/learn";
import { useCatalog } from "@/components/learn/use-catalog";
import { useYtRefresh } from "@/components/learn/use-yt-refresh";
import { Button } from "@/components/ui/button";
import { RefreshIcon } from "@/components/ui/icons";
import { LEVEL_INFO } from "@/lib/setup";
import { PopularVideos } from "@/components/learn/popular-videos";
import { usePremium } from "@/lib/premium";

type Tab = "for-you" | "mine";
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
  const { state, learning, removeCourse, setCourse } = useLearning();
  const { premium } = usePremium();
  // Courses made for this student from their profile and assessment.
  const catalog = useCatalog();
  // refresh stored YouTube details older than 30 days (YouTube policy)
  useYtRefresh();
  // My courses: anything the student has opened or watched, plus courses linked to their goals.
  const goalCourses = new Set(state.goals.map((g) => courseForGoal(g, learning)?.id).filter((id): id is string => !!id && !learning.courses[id]?.hidden));
  const hidden = (id: string) => !!learning.courses[id]?.hidden;
  const begun = (id: string) => !hidden(id) && (!!learning.courses[id] || Object.keys(learning.modules).some((k) => k.startsWith(`${id}/`)));
  // Popular videos the student opened show up as small courses too (newest first).
  const videoCourses = Object.entries(learning.videos ?? {})
    .sort(([, a], [, b]) => b.addedAt - a.addedAt)
    .map(([id, v]) => videoCourse(id, v));
  // Pinned first, then most recently watched.
  const rank = (id: string) => [learning.courses[id]?.pinned ? 1 : 0, learning.courses[id]?.lastAt ?? learning.videos?.[id.slice(3)]?.addedAt ?? 0] as const;
  const started = [...catalog.courses.filter((c) => begun(c.id) || goalCourses.has(c.id)), ...COURSES.filter((c) => begun(c.id) || goalCourses.has(c.id)), ...videoCourses].sort((a, b) => {
    const [pa, ta] = rank(a.id);
    const [pb, tb] = rank(b.id);
    return pb - pa || tb - ta;
  });
  const [tab, setTab] = useState<Tab>(() => (started.length ? "mine" : "for-you"));
  const certs = certCount(learning);
  const list = tab === "for-you" ? catalog.courses.filter((c) => !begun(c.id)).concat(catalog.courses.filter((c) => begun(c.id))) : started;

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader
        icon="video"
        tone="cyan"
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
          <MaterialsHub />
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
          <p className="text-[11.5px] text-white/50">My courses</p>
          <p className="mt-1 text-[20px] font-semibold text-white">{started.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11.5px] text-white/50">Certificates earned</p>
          <p className="mt-1 text-[20px] font-semibold text-white">
            {certs} <span className="text-[13px] font-normal text-white/45">{premium ? "· unlimited" : `/ ${FREE_CERT_LIMIT} on Free`}</span>
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
            { value: "for-you", label: "For you", count: catalog.courses.length },
            { value: "mine", label: "My courses", count: started.length },
          ]}
        />
      </div>
      {tab === "for-you" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-white/55">Made for you from your profile and assessment{state.setup?.academic.course ? ` (${[state.setup.academic.course, state.setup.academic.year].filter(Boolean).join(", ")})` : ""}. They change when your profile changes.</p>
          <Button size="xs" variant="ghost" icon={<RefreshIcon size={12} className={catalog.refreshing ? "animate-spin" : ""} />} disabled={catalog.refreshing} onClick={() => void catalog.refresh()}>
            {catalog.refreshing ? "Finding courses…" : "Suggest new courses"}
          </Button>
        </div>
      )}

      {tab === "for-you" && catalog.loading && !catalog.courses.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[360px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<VideoIcon size={15} />} title="No courses started yet" className="mt-6 py-12">
          Pick a course from For you and press Start.
        </EmptyState>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const s = courseStats(c, learning);
            const img = thumb(learning.modules[moduleKey(c.id, c.modules[0].id)]?.yt ?? c.modules[0].yt);
            const pct = coursePercent(c, learning);
            const active = begun(c.id);
            return (
              <Card key={c.id} className="lift-3d flex flex-col overflow-hidden">
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
                    {c.modules.length} module{c.modules.length > 1 ? "s" : ""}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {isVideoCourse(c) && learning.videos?.[c.id.slice(3)]?.gone && <Pill tone="amber">Removed from YouTube</Pill>}
                    {isVideoCourse(c) ? <Pill tone="cyan">Popular video</Pill> : <Pill tone={LEVEL_TONE[c.level]}>{LEVEL_INFO[c.level].label}</Pill>}
                    {s.progress?.certId ? (
                      <Pill tone="green" dot>Certified</Pill>
                    ) : s.progress?.passedAt ? (
                      <Pill tone="green" dot>Quiz passed</Pill>
                    ) : active ? (
                      <Pill tone="cyan" dot>{s.ready ? "Quiz ready" : "In progress"}</Pill>
                    ) : null}
                    {goalCourses.has(c.id) && <Pill tone="green">From my goals</Pill>}
                    {tab === "mine" && (
                      <button
                        type="button"
                        aria-label={learning.courses[c.id]?.pinned ? `Unpin ${c.title}` : `Pin ${c.title}`}
                        title={learning.courses[c.id]?.pinned ? "Unpin" : "Pin to top"}
                        onClick={() => setCourse(c.id, { pinned: !learning.courses[c.id]?.pinned })}
                        className={cn(
                          "ml-auto flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] transition",
                          learning.courses[c.id]?.pinned ? "border-accent/50 bg-accent/[0.1] text-accent" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white",
                        )}
                      >
                        <PinIcon size={12} /> {learning.courses[c.id]?.pinned ? "Pinned" : "Pin"}
                      </button>
                    )}
                  </div>
                  <h3 className="mt-3 text-[15px] leading-snug font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-white/65">{c.blurb}</p>
                  {c.why && <p className="mt-2 text-[11.5px] leading-snug text-accent">Why for you: {c.why}</p>}
                  {(active || goalCourses.has(c.id)) && (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11.5px] text-white/50">
                        {pct}% · {s.done} of {s.total} modules done
                      </p>
                    </div>
                  )}
                  <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-white/50">
                    <ClockIcon size={12} /> <span className="line-clamp-2">{c.modules.map((m) => m.title).join(" · ")}</span>
                  </p>
                  <Link
                    href={`/learn/${c.id}`}
                    className="mt-4 inline-flex h-9 w-fit items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-black hover:bg-accent-hover"
                  >
                    <PlayIcon size={10} /> {active && pct > 0 ? "Continue" : isVideoCourse(c) ? "Watch" : active ? "Continue" : "Start course"}
                  </Link>
                  {tab === "mine" && !s.progress?.certId && (
                    <button
                      type="button"
                      onClick={() => window.confirm(`Remove “${c.title}” from My courses? Your progress and notes for it will be deleted.`) && removeCourse(c.id)}
                      className="mt-2 w-fit text-[11.5px] text-white/45 hover:text-rose-300"
                    >
                      Remove from My courses
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <PremiumNote title={premium ? "Unlimited certificates are on" : "Unlimited certificates"} href={premium ? "/settings/certificates" : "/premium"} cta={premium ? "My certificates" : "See Premium"}>
          {premium ? "You get a StudentOS certificate for every course you pass." : `Free includes ${FREE_CERT_LIMIT} StudentOS certificates. Premium gives you a certificate for every course you pass.`}
        </PremiumNote>
        <PremiumNote title="AI notes and revision" href={premium ? "/learn?tab=materials&m=notes" : "/premium"} cta={premium ? "Open AI Notes" : "See Premium"}>
          Turn any topic, your notes or a PDF into short notes and flashcards, and get reminders on what to revise.
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
