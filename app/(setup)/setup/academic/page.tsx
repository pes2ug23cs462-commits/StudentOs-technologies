"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChoicePill, ErrorText, FieldLabel, IconInput, IconSelect, NextButton, SelectTile } from "@/components/setup/fields";
import { QuoteCard, SetupShell, StepHeading } from "@/components/setup/shell";
import { useSetup } from "@/components/setup/use-setup";
import { InfoIcon } from "@/components/ui/icons";
import { COLLEGE_SUGGESTIONS, COURSES, FIELDS, STUDENT_TYPES, YEARS, graduationYears } from "@/lib/setup";

export default function AcademicPage() {
  const router = useRouter();
  const { setup, setAcademic, reach } = useSetup();
  const a = setup.academic;
  const [tried, setTried] = useState(false);

  const errors = {
    type: !a.type ? "Choose what best describes you." : "",
    college: !a.college.trim() ? (a.type === "school" ? "Enter your school’s name." : "Enter your college or university.") : "",
    course: a.type !== "school" && !a.course ? "Choose your course or degree." : "",
    year: !a.year ? "Choose your current year." : "",
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
            <SelectTile key={t.value} selected={a.type === t.value} onClick={() => setAcademic({ type: t.value })} icon={t.icon} title={t.label} />
          ))}
        </div>
        {tried && <ErrorText>{errors.type}</ErrorText>}
      </section>

      <div className="mt-8 grid gap-x-8 gap-y-7 md:grid-cols-2">
        <section>
          <FieldLabel required>{a.type === "school" ? "School Name" : "College / University Name"}</FieldLabel>
          <IconInput
            icon="search"
            list="college-list"
            value={a.college}
            onChange={(e) => setAcademic({ college: e.target.value })}
            placeholder={a.type === "school" ? "Enter your school name" : "Search or enter your college/university name"}
            invalid={tried && !!errors.college}
            aria-label="College or university name"
          />
          <datalist id="college-list">
            {COLLEGE_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {tried && <ErrorText>{errors.college}</ErrorText>}
        </section>

        <section>
          <FieldLabel required={a.type !== "school"} optional={a.type === "school"}>
            Course / Degree
          </FieldLabel>
          <IconSelect icon="cap" value={a.course} onChange={(course) => setAcademic({ course })} placeholder="e.g. B.Tech, B.Sc, B.Com, B.A., MBA, etc." options={COURSES} invalid={tried && !!errors.course} />
          {tried && <ErrorText>{errors.course}</ErrorText>}
        </section>

        <section>
          <FieldLabel required>Current Year of Study</FieldLabel>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(a.type === "school" ? ["Class 9", "Class 10", "Class 11", "Class 12", "Other"] : YEARS).map((y) => (
              <ChoicePill key={y} selected={a.year === y} onClick={() => setAcademic({ year: y })} className="min-w-[76px]">
                {y}
              </ChoicePill>
            ))}
          </div>
          {tried && <ErrorText>{errors.year}</ErrorText>}
        </section>

        <section>
          <FieldLabel optional>Field of Study</FieldLabel>
          <IconSelect icon="book" value={a.field} onChange={(field) => setAcademic({ field })} placeholder="e.g. Science, Arts, Commerce, Management, etc." options={FIELDS} />
        </section>
      </div>

      <hr className="my-8 border-white/[0.08]" />

      <div className="grid gap-x-8 gap-y-7 md:grid-cols-2">
        <section>
          <FieldLabel optional>Are you pursuing any specific specialization?</FieldLabel>
          <IconInput icon="grid" value={a.specialization} onChange={(e) => setAcademic({ specialization: e.target.value })} placeholder="e.g. Computer Science, Psychology, Economics, etc." aria-label="Specialization" />
        </section>
        <section>
          <FieldLabel optional>Expected Graduation Year</FieldLabel>
          <IconSelect icon="calendar" value={a.graduation} onChange={(graduation) => setAcademic({ graduation })} placeholder="Select year" options={graduationYears()} />
        </section>
      </div>

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
