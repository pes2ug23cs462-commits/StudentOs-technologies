"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackButton, CheckPill, ErrorText, FieldLabel, Icon, NextButton, SelectTile } from "@/components/setup/fields";
import { ProgressCard, SetupShell, StepHeading } from "@/components/setup/shell";
import { toggle, useSetup, useStepGuard } from "@/components/setup/use-setup";
import { AREAS, FAMILIAR, SKILL_LEVELS, TOOLS, experienceFor, type AreaLevel } from "@/lib/setup";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const LEVELS: { value: AreaLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

/** “None yet” style options clear the others, and picking anything else clears them. */
function toggleExclusive(list: string[], v: string, exclusive: string) {
  if (v === exclusive) return list.includes(v) ? [] : [v];
  return toggle(list.filter((x) => x !== exclusive), v);
}

export default function SkillsPage() {
  const router = useRouter();
  const { setup, setSkills, reach } = useSetup();
  const s = setup.skills;
  const [tried, setTried] = useState(false);
  const extra = Object.keys(s.areaLevels).length + s.tools.length + (s.experienceNote ? 1 : 0) + (s.certifications ? 1 : 0);
  const [more, setMore] = useState(extra > 0);
  const allowed = useStepGuard(3);
  if (!allowed) return null;

  const levelError = !s.level ? "Choose your overall skill level." : "";

  const next = () => {
    setTried(true);
    if (levelError) return;
    reach(4);
    router.push("/setup/review");
  };

  return (
    <SetupShell
      step={3}
      reached={setup.reached}
      variant="skills"
      title={
        <>
          Discover
          <br />
          your strengths,
          <br />
          build your future.
        </>
      }
      subtitle="Tell us about your current skills, experience and comfort level so we can recommend the right resources, projects and opportunities for you."
      aside={<ProgressCard current={3} />}
    >
      <StepHeading step={3} title="Skills & Experience" sub="Help us understand your current skills and experience so we can suggest the right learning path for you." />

      <div className="space-y-9">
          <section>
            <FieldLabel required sub="Select your overall comfort level with learning new skills.">
              How would you rate your current skill level?
            </FieldLabel>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup">
              {SKILL_LEVELS.map((l) => (
                <SelectTile key={l.value} compact selected={s.level === l.value} onClick={() => setSkills({ level: l.value })} icon={l.icon} title={l.label} sub={l.sub} />
              ))}
            </div>
            {tried && <ErrorText>{levelError}</ErrorText>}
          </section>

        <div className="grid gap-9 xl:grid-cols-2 xl:gap-10">
          <section>
            <FieldLabel optional sub="Select all that apply. Don’t worry if you’re a beginner.">
              Which skills are you currently familiar with?
            </FieldLabel>
            <div className="flex flex-wrap gap-2">
              {FAMILIAR.map((f) => (
                <CheckPill key={f} selected={s.familiar.includes(f)} onClick={() => setSkills({ familiar: toggleExclusive(s.familiar, f, "No specific skills yet") })}>
                  {f}
                </CheckPill>
              ))}
            </div>
          </section>
          <section>
            <FieldLabel optional sub="This could be academic projects, internships, part-time work, or personal projects.">
              Do you have any relevant experience?
            </FieldLabel>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2">
              {experienceFor(setup.academic.type).map((e) => {
                const on = s.experience.includes(e.value);
                return (
                  <button
                    key={e.value}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setSkills({ experience: toggleExclusive(s.experience, e.value, "none") })}
                    className={cn(
                      "relative flex min-h-[64px] items-center gap-3 rounded-xl border px-4 text-left transition",
                      on ? "border-accent bg-accent/[0.07]" : "border-white/10 bg-white/[0.03] hover:border-white/20",
                    )}
                  >
                    <Icon name={e.icon} size={20} className={on ? "text-accent" : "text-white/60"} />
                    <span>
                      <span className="block text-[13.5px] leading-tight font-medium text-white">{e.label}</span>
                      {e.sub && <span className="block text-[12px] text-white/55">{e.sub}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="rounded-2xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          >
            <span>
              <span className="block text-[15px] font-semibold text-white">Add more details (optional)</span>
              <span className="block text-[13px] text-white/55">Skill level by area, tools you’ve used, your experience and certifications</span>
            </span>
            <span className="flex items-center gap-2 text-[13px] text-white/55">
              {extra > 0 && <span className="rounded-full bg-accent/[0.12] px-2 py-0.5 text-[12px] font-medium text-accent">{extra} added</span>}
              <ChevronDownIcon size={18} className={cn("transition", more && "rotate-180")} />
            </span>
          </button>
          {more && (
            <div className="setup-enter grid gap-9 border-t border-white/[0.08] px-5 pt-6 pb-6 xl:grid-cols-2 xl:gap-10">
          <section>
            <FieldLabel optional sub="This helps us personalize your recommendations.">
              Select your skill level for specific areas
            </FieldLabel>
            <ul className="space-y-2">
              {AREAS.map((a) => (
                <li key={a.value} className="flex items-center gap-3">
                  <Icon name={a.icon} size={19} className="shrink-0 text-white/60" />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-white">{a.label}</span>
                  <div className="grid w-[270px] shrink-0 grid-cols-3 gap-1.5" role="radiogroup" aria-label={a.label}>
                    {LEVELS.map((lv) => {
                      const on = s.areaLevels[a.value] === lv.value;
                      return (
                        <button
                          key={lv.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => {
                            const areaLevels = { ...s.areaLevels };
                            if (on) delete areaLevels[a.value];
                            else areaLevels[a.value] = lv.value;
                            setSkills({ areaLevels });
                          }}
                          className={cn(
                            "h-9 rounded-lg border text-[12.5px] font-medium transition",
                            on ? "border-accent bg-accent/[0.08] text-accent" : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20",
                          )}
                        >
                          {lv.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <FieldLabel optional sub="Select all that apply.">
              Which tools or platforms have you used?
            </FieldLabel>
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((t) => (
                <CheckPill key={t.value} selected={s.tools.includes(t.value)} dot={t.color || undefined} onClick={() => setSkills({ tools: toggleExclusive(s.tools, t.value, "None yet") })}>
                  {t.value}
                </CheckPill>
              ))}
            </div>
          </section>
          <section>
            <FieldLabel optional>Tell us more about your experience</FieldLabel>
            <textarea
              value={s.experienceNote}
              maxLength={500}
              onChange={(e) => setSkills({ experienceNote: e.target.value })}
              placeholder="e.g. personal projects, internships, part-time work, achievements, etc."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-white placeholder:text-white/45 outline-none focus:border-accent"
            />
            <p className="mt-1 text-right text-[12px] text-white/45">{s.experienceNote.length}/500</p>
          </section>
          <section>
            <FieldLabel optional sub="Let us know if you’d like course or certification recommendations.">
              Are you interested in certifications?
            </FieldLabel>
            <div className="grid grid-cols-3 gap-2.5" role="radiogroup">
              {(
                [
                  ["yes", "Yes, definitely", "check"],
                  ["maybe", "Maybe", "clock"],
                  ["no", "Not at the moment", "x"],
                ] as const
              ).map(([v, label, icon]) => {
                const on = s.certifications === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSkills({ certifications: on ? "" : v })}
                    className={cn(
                      "flex h-[50px] items-center justify-center gap-2 rounded-xl border px-2 text-[13.5px] font-medium transition",
                      on ? "border-accent bg-accent/[0.07] text-white" : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20",
                    )}
                  >
                    <Icon name={icon} size={17} className={on ? "text-accent" : "text-white/55"} /> {label}
                  </button>
                );
              })}
            </div>
          </section>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 pt-10">
        <BackButton onClick={() => router.push("/setup/goals")} />
        <NextButton onClick={next}>Next: Review &amp; Continue</NextButton>
      </div>
    </SetupShell>
  );
}
