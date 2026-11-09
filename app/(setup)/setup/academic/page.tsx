"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChoicePill, ErrorText, FieldLabel, IconInput, IconSelect, NextButton, SelectTile } from "@/components/setup/fields";
import { QuoteCard, SetupShell, StepHeading } from "@/components/setup/shell";
import { useSetup } from "@/components/setup/use-setup";
import { InfoIcon } from "@/components/ui/icons";
import { COLLEGE_SUGGESTIONS, STUDENT_TYPES, academicForm, graduationYears } from "@/lib/setup";

export default function AcademicPage() {
  const router = useRouter();
  const { setup, setAcademic, reach } = useSetup();
  const a = setup.academic;
  const [tried, setTried] = useState(false);

  const form = academicForm(a.type);
  const errors = {
    type: !a.type ? "Choose what best describes you." : "",
    college: form.place.required && !a.college.trim() ? `Enter your ${form.place.label.split(" /")[0].toLowerCase()}.` : "",
    course: form.course?.required && !a.course ? `Choose your ${form.course.label.toLowerCase()}.` : "",
    year: !a.year ? `Choose: ${form.year.label.replace("?", "").toLowerCase()}.` : "",
    specialization: form.specialization?.required && !a.specialization.trim() ? `Enter your ${form.specialization.label.toLowerCase()}.` : "",
  };
  const valid = !Object.values(errors).some(Boolean);

  const next = () => {
    setTried(true);
    if (!valid) return;
    reach(2);
    router.push("/setup/goals");
  };

  return (
    <SetupShell
      step={1}
      reached={setup.reached}
      variant="academic"
      title={
        <>
          Let’s
          <br />
          personalize
          <br />
          your journey.
        </>
      }
      subtitle="Tell us a bit about yourself so we can recommend the best resources, opportunities and learning path for you."
      aside={<QuoteCard />}
    >
      <StepHeading step={1} title="Academic Details" sub="Help us understand your current educational background." />

      <section>
        <FieldLabel required>What best describes you?</FieldLabel>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="radiogroup">
          {STUDENT_TYPES.map((t) => (
            <SelectTile key={t.value} selected={a.type === t.value} onClick={() => a.type !== t.value && setAcademic({ type: t.value, course: "", year: "", field: "", specialization: "", graduation: "" })} icon={t.icon} title={t.label} />
          ))}
        </div>
        {tried && <ErrorText>{errors.type}</ErrorText>}
      </section>

      {a.type && (
        <>
          <div className="mt-8 grid gap-x-8 gap-y-7 md:grid-cols-2">
            <section>
              <FieldLabel required={form.place.required} optional={!form.place.required}>
                {form.place.label}
              </FieldLabel>
              <IconInput
                icon={form.place.suggest ? "search" : a.type === "professional" ? "briefcase" : "book"}
                list={form.place.suggest ? "college-list" : undefined}
                value={a.college}
                onChange={(e) => setAcademic({ college: e.target.value })}
                placeholder={form.place.placeholder}
                invalid={tried && !!errors.college}
                aria-label="College or university name"
              />
              {form.place.suggest && (
                <datalist id="college-list">
                  {COLLEGE_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
              {tried && <ErrorText>{errors.college}</ErrorText>}
            </section>

            {form.course && (
              <section>
                <FieldLabel required={form.course.required} optional={!form.course.required}>
                  {form.course.label}
                </FieldLabel>
                <IconSelect icon="cap" value={a.course} onChange={(course) => setAcademic({ course })} placeholder={form.course.placeholder} options={form.course.options} invalid={tried && !!errors.course} />
                {tried && <ErrorText>{errors.course}</ErrorText>}
              </section>
            )}

            <section>
              <FieldLabel required>{form.year.label}</FieldLabel>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {form.year.options.map((y) => (
                  <ChoicePill key={y} selected={a.year === y} onClick={() => setAcademic({ year: y })} className="min-w-[76px]">
                    {y}
                  </ChoicePill>
                ))}
              </div>
              {tried && <ErrorText>{errors.year}</ErrorText>}
            </section>

            {form.field && (a.type !== "school" || a.year === "Class 11" || a.year === "Class 12") && (
              <section>
                <FieldLabel optional>{form.field.label}</FieldLabel>
                <IconSelect icon="book" value={a.field} onChange={(field) => setAcademic({ field })} placeholder={form.field.placeholder} options={form.field.options} />
              </section>
            )}
          </div>

          {(form.specialization || form.graduation) && (
            <>
              <hr className="my-8 border-white/[0.08]" />
              <div className="grid gap-x-8 gap-y-7 md:grid-cols-2">
                {form.specialization && (
                  <section>
                    <FieldLabel required={form.specialization.required} optional={!form.specialization.required}>
                      {form.specialization.label}
                    </FieldLabel>
                    <IconInput icon="grid" value={a.specialization} onChange={(e) => setAcademic({ specialization: e.target.value })} placeholder={form.specialization.placeholder} invalid={tried && !!errors.specialization} aria-label={form.specialization.label} />
                    {tried && <ErrorText>{errors.specialization}</ErrorText>}
                  </section>
                )}
                {form.graduation && (
                  <section>
                    <FieldLabel optional>{form.graduation.label}</FieldLabel>
                    <IconSelect icon="calendar" value={a.graduation} onChange={(graduation) => setAcademic({ graduation })} placeholder="Select year" options={graduationYears()} />
                  </section>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div className="mt-auto flex flex-col gap-4 pt-10 md:flex-row md:items-center">
        <div className="flex flex-1 items-start gap-3 rounded-2xl bg-white/[0.04] px-5 py-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/80 text-white">
            <InfoIcon size={15} />
          </span>
          <p className="text-[13.5px] leading-relaxed text-white/70">
            This information helps us personalize your learning path, opportunities, and recommendations. You can always update these details later from your profile.
          </p>
        </div>
        <NextButton onClick={next}>Next: Goals &amp; Interests</NextButton>
      </div>
    </SetupShell>
  );
}
