"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BackButton, Icon, NextButton } from "@/components/setup/fields";
import { ProgressCard, SetupShell } from "@/components/setup/shell";
import { useSetup, useStepGuard } from "@/components/setup/use-setup";
import { PencilIcon } from "@/components/ui/icons";
import { AREAS, INTERESTS, PRIMARY_GOALS, SKILL_LEVELS, STUDENT_TYPES, labelOf } from "@/lib/setup";
import { cn } from "@/lib/utils";

function Tags({ items, tone }: { items: string[]; tone: "green" | "violet" }) {
  if (!items.length) return <span className="text-white/45">Not provided</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span
          key={t}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[12.5px] font-medium",
            tone === "green" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500" : "border-violet-500/25 bg-violet-500/10 text-violet-400",
          )}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

function Row({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[22px_150px_1fr] items-start gap-3 py-2 text-[14px]">
      <Icon name={icon} size={18} className="mt-0.5 text-white/55" />
      <span className="text-white/80">{label}</span>
      <span className="min-w-0 text-white">{children}</span>
    </div>
  );
}

function Section({ icon, iconTone, title, sub, href, tone, children }: { icon: string; iconTone: string; title: string; sub: string; href: string; tone: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <section className={cn("rounded-2xl border border-white/[0.08] p-5", tone)}>
      <div className="mb-3 flex items-start gap-3.5">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconTone)}>
          <Icon name={icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold text-white">{title}</h3>
          <p className="text-[13px] text-white/55">{sub}</p>
        </div>
        <button type="button" onClick={() => router.push(href)} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-white/[0.08]">
          <PencilIcon size={13} /> Edit
        </button>
      </div>
      {children}
    </section>
  );
}

const none = (v: string) => v || <span className="text-white/45">Not provided</span>;

export default function ReviewPage() {
  const router = useRouter();
  const { setup, reach } = useSetup();
  const allowed = useStepGuard(4);
  if (!allowed) return null;
  const { academic: a, goals: g, skills: s } = setup;
  const primary = labelOf(PRIMARY_GOALS, g.primary);
  const keySkills = Object.entries(s.areaLevels)
    .filter(([, lv]) => lv !== "beginner")
    .map(([k]) => labelOf(AREAS, k).replace(" / Programming", "").replace(" (please specify)", ""));

  return (
    <SetupShell
      step={4}
      reached={setup.reached}
      variant="review"
      title={
        <>
          You’re almost
          <br />
          there!
        </>
      }
      subtitle="Review your details before we create your personalized experience. You can always update this information later from your profile."
      aside={<ProgressCard current={4} />}
    >
      <div className="mb-7">
        <p className="text-[14px] font-semibold text-accent">Step 4 of 4</p>
        <h2 className="mt-1 text-[34px] leading-tight font-bold tracking-[-0.02em] text-white">Review Your Information</h2>
        <p className="mt-2 text-[16px] text-white/70">Here’s a summary of the information you’ve provided. Please review and confirm to continue.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon="cap" iconTone="bg-indigo-500/12 text-indigo-500" title="Academic Details" sub="Your educational background" href="/setup/academic" tone="bg-indigo-500/[0.03]">
          <Row icon="building" label="Student Type">{none(labelOf(STUDENT_TYPES, a.type))}</Row>
          <Row icon="building" label="College / University">{none(a.college)}</Row>
          <Row icon="book" label="Course / Degree">{none(a.course)}</Row>
          <Row icon="layers" label="Current Year">{none(a.year)}</Row>
          <Row icon="file" label="Field of Study">{none(a.field)}</Row>
          <Row icon="calendar" label="Expected Graduation">{none(a.graduation)}</Row>
        </Section>

        <Section icon="target" iconTone="bg-emerald-500/12 text-emerald-500" title="Goals & Interests" sub="Your goals and areas of interest" href="/setup/goals" tone="bg-emerald-500/[0.04]">
          <Row icon="star" label="Primary Goal">{none(primary)}</Row>
          <Row icon="grid" label="Areas of Interest">
            <Tags tone="green" items={g.interests.map((i) => labelOf(INTERESTS, i))} />
          </Row>
          <Row icon="briefcase" label="Opportunities">
            <Tags tone="green" items={g.opportunities} />
          </Row>
          <Row icon="clock" label="Weekly Learning Time">{none(g.hours)}</Row>
          <Row icon="book" label="Learning Format">
            <Tags tone="green" items={g.formats} />
          </Row>
        </Section>

        <Section icon="chart" iconTone="bg-violet-500/12 text-violet-500" title="Skills & Experience" sub="Your current skills and experience" href="/setup/skills" tone="bg-violet-500/[0.03]">
          <Row icon="chart" label="Overall Skill Level">{none(labelOf(SKILL_LEVELS, s.level))}</Row>
          <Row icon="palette" label="Key Skills">
            <Tags tone="violet" items={[...keySkills, ...s.familiar.filter((f) => f !== "No specific skills yet")].slice(0, 6)} />
          </Row>
          <Row icon="laptop" label="Tools & Platforms">
            <Tags tone="violet" items={s.tools.filter((t) => t !== "None yet")} />
          </Row>
          <Row icon="file" label="Experience">
            {s.experience.includes("none") || !s.experience.length ? "No experience yet" : s.experience.length + " type(s) added"}
          </Row>
          <Row icon="shield" label="Certification Interest">
            {none({ yes: "Yes, definitely", maybe: "Maybe", no: "Not at the moment", "": "" }[s.certifications])}
          </Row>
        </Section>

        <section className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
              <Icon name="bulb" size={22} />
            </span>
            <div>
              <h3 className="text-[16px] font-semibold text-white">What Happens Next?</h3>
              <p className="text-[13px] text-white/55">After you confirm, we’ll create your personalized assessment.</p>
            </div>
          </div>
          <ol className="mt-5 space-y-5">
            {[
              ["Take a short personalized assessment", "Based on your goals and background", "bg-emerald-500"],
              ["Get tailored recommendations", "Learning paths, skills, projects and opportunities", "bg-sky-500"],
              ["Start your StudentOS journey", "Access your personalized dashboard", "bg-violet-500"],
            ].map(([t, sub, c], i) => (
              <li key={t} className="flex items-start gap-3.5">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white", c)}>{i + 1}</span>
                <span>
                  <span className="block text-[14.5px] font-semibold text-white">{t}</span>
                  <span className="block text-[13px] text-white/55">{sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-10">
        <div className="flex items-center justify-between gap-4">
          <BackButton onClick={() => router.push("/setup/skills")} />
          <NextButton
            onClick={() => {
              reach(5);
              router.push("/setup/assessment");
            }}
          >
            Confirm &amp; Start Assessment
          </NextButton>
        </div>
        <p className="text-right text-[12.5px] text-white/50">You can always update your information later from your profile settings.</p>
      </div>
    </SetupShell>
  );
}
