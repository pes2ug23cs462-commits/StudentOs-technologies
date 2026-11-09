"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackButton, CheckPill, ErrorText, FieldLabel, IconCheckChip, NextButton, SelectTile } from "@/components/setup/fields";
import { ProgressCard, SetupShell, StepHeading } from "@/components/setup/shell";
import { toggle, useSetup, useStepGuard } from "@/components/setup/use-setup";
import { FORMATS, INTERESTS, WEEKLY_HOURS, opportunitiesFor, primaryGoalsFor } from "@/lib/setup";

export default function GoalsPage() {
  const router = useRouter();
  const { setup, setGoals, reach } = useSetup();
  const g = setup.goals;
  const [tried, setTried] = useState(false);

  const allowed = useStepGuard(2);
  if (!allowed) return null;

  const errors = {
    primary: !g.primary ? "Choose your main goal." : "",
    interests: !g.interests.length ? "Pick at least one area." : "",
  };

  const next = () => {
    setTried(true);
    if (errors.primary || errors.interests) return;
    reach(3);
    router.push("/setup/skills");
  };

  return (
    <SetupShell
      step={2}
      reached={setup.reached}
      variant="goals"
      title={
        <>
          Let’s build
          <br />
          your personalized
          <br />
          experience.
        </>
      }
      subtitle="Help us understand your goals, interests and preferences so we can recommend the right resources, opportunities and learning path for you."
      aside={<ProgressCard current={2} />}
    >
      <StepHeading step={2} title="Goals & Interests" sub="Tell us about your goals, interests and what you want to achieve with StudentOS." />

      <section>
        <FieldLabel required sub="Select one option that best describes your main goal right now.">
          What is your primary goal?
        </FieldLabel>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="radiogroup">
          {primaryGoalsFor(setup.academic.type).map((p) => (
            <SelectTile key={p.value} selected={g.primary === p.value} onClick={() => setGoals({ primary: p.value })} icon={p.icon} title={p.label} sub={p.sub} />
          ))}
        </div>
        {tried && <ErrorText>{errors.primary}</ErrorText>}
      </section>

      <section className="mt-8">
        <FieldLabel required sub="You can select multiple options.">
          What areas are you interested in?
        </FieldLabel>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {INTERESTS.map((i) => (
            <IconCheckChip key={i.value} selected={g.interests.includes(i.value)} onClick={() => setGoals({ interests: toggle(g.interests, i.value) })} icon={i.icon} label={i.label} />
          ))}
        </div>
        {tried && <ErrorText>{errors.interests}</ErrorText>}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-2 xl:gap-0 xl:divide-x xl:divide-white/[0.08]">
        <section className="xl:pr-7">
          <FieldLabel optional sub="Select all that apply.">
            What type of opportunities interest you?
          </FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {opportunitiesFor(setup.academic.type).map((o) => (
              <CheckPill key={o} selected={g.opportunities.includes(o)} onClick={() => setGoals({ opportunities: toggle(g.opportunities, o) })}>
                {o}
              </CheckPill>
            ))}
          </div>
        </section>
        <section className="xl:pl-7">
          <FieldLabel optional sub="This helps us suggest a realistic learning plan.">
            How much time can you dedicate per week?
          </FieldLabel>
          <div className="flex flex-wrap gap-2.5" role="radiogroup">
            {WEEKLY_HOURS.map((h) => (
              <CheckPill key={h} selected={g.hours === h} onClick={() => setGoals({ hours: g.hours === h ? "" : h })}>
                {h}
              </CheckPill>
            ))}
          </div>
          <p className="mt-5 mb-3 text-[16px] font-semibold text-white">
            Preferred learning format <span className="font-normal text-white/55">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {FORMATS.map((f) => (
              <CheckPill key={f} selected={g.formats.includes(f)} onClick={() => setGoals({ formats: toggle(g.formats, f) })}>
                {f}
              </CheckPill>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 pt-10">
        <BackButton onClick={() => router.push("/setup/academic")} />
        <NextButton onClick={next}>Next: Skills &amp; Experience</NextButton>
      </div>
    </SetupShell>
  );
}
