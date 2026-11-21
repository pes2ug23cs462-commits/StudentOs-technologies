"use client";

/* Settings → Profile → Education: the student can say they've moved on (school → college,
   college → work …) without starting over. Only the education details change: plans,
   tests, notes, projects and certificates all stay. The sidebar and the placement tools
   follow the new status (lib/education.ts). */

import { GuardianConsent } from "@/components/setup/guardian-consent";
import { useState } from "react";
import { ChoicePill, ErrorText, FieldLabel, IconInput, IconSelect, SelectTile } from "@/components/setup/fields";
import { Button } from "@/components/ui/button";
import { COLLEGE_SUGGESTIONS, STUDENT_TYPES, academicForm, graduationYears, studentLine, type SetupData } from "@/lib/setup";
import { useStore } from "@/lib/store";

type Academic = SetupData["academic"];

const TYPE_LABEL: Record<string, string> = { college: "College student", school: "School student", professional: "Working professional", other: "Other" };

export function EducationPanel() {
  const { state, actions } = useStore();
  const now = state.setup?.academic;
  const [draft, setDraft] = useState<Academic | null>(null);
  const [tried, setTried] = useState(false);

  if (!draft)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white">{now?.type ? TYPE_LABEL[now.type] : "Not set"}</p>
          <p className="truncate text-[11.5px] text-white/50">{now?.type ? [studentLine(now), now.college].filter(Boolean).join(" · ") : "Tell StudentOS where you study or work"}</p>
        </div>
        <Button size="sm" onClick={() => setDraft(now ? { ...now } : { type: "", college: "", course: "", year: "", field: "", specialization: "", graduation: "" })}>
          Update education
        </Button>
      </div>
    );

  const a = draft;
  const set = (p: Partial<Academic>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const form = academicForm(a.type);
  const errors = {
    type: !a.type ? "Choose what best describes you now." : "",
    college: form.place.required && !a.college.trim() ? `Enter your ${form.place.label.split(" /")[0].toLowerCase()}.` : "",
    course: form.course?.required && !a.course ? `Choose your ${form.course.label.toLowerCase()}.` : "",
    year: !a.year ? `Choose: ${form.year.label.replace("?", "").toLowerCase()}.` : "",
    specialization: form.specialization?.required && !a.specialization.trim() ? `Enter your ${form.specialization.label.toLowerCase()}.` : "",
    guardian: a.type === "school" && !a.guardianConsent ? "A parent or guardian needs to agree." : "",
  };
  const valid = !Object.values(errors).some(Boolean);
  const wasSchool = now?.type === "school";
  const opens = wasSchool && a.type && a.type !== "school";

  const save = () => {
    setTried(true);
    if (!valid) return;
    actions.setSetup({ academic: a });
    actions.setProfile({ college: a.college, degree: [a.course, a.year].filter(Boolean).join(", ") });
    actions.toast(opens ? "Education updated. Placement tools are now open for you." : "Education updated.");
    setDraft(null);
    setTried(false);
  };

  return (
    <div className="space-y-6">
      <section>
        <FieldLabel required>What best describes you now?</FieldLabel>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="radiogroup">
          {STUDENT_TYPES.map((t) => (
            <SelectTile key={t.value} selected={a.type === t.value} onClick={() => a.type !== t.value && set({ type: t.value, college: "", course: "", year: "", field: "", specialization: "", graduation: "" })} icon={t.icon} title={t.label} />
          ))}
        </div>
        {tried && <ErrorText>{errors.type}</ErrorText>}
      </section>

      {a.type && (
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <section>
            <FieldLabel required={form.place.required} optional={!form.place.required}>
              {form.place.label}
            </FieldLabel>
            <IconInput icon={form.place.suggest ? "search" : a.type === "professional" ? "briefcase" : "book"} list={form.place.suggest ? "edu-college-list" : undefined} value={a.college} onChange={(e) => set({ college: e.target.value })} placeholder={form.place.placeholder} invalid={tried && !!errors.college} aria-label={form.place.label} />
            {form.place.suggest && (
              <datalist id="edu-college-list">
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
              <IconSelect icon="cap" value={a.course} onChange={(course) => set({ course })} placeholder={form.course.placeholder} options={form.course.options} invalid={tried && !!errors.course} />
              {tried && <ErrorText>{errors.course}</ErrorText>}
            </section>
          )}
          <section className="md:col-span-2">
            <FieldLabel required>{form.year.label}</FieldLabel>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {form.year.options.map((y) => (
                <ChoicePill key={y} selected={a.year === y} onClick={() => set({ year: y })} className="min-w-[76px]">
                  {y}
                </ChoicePill>
              ))}
            </div>
            {tried && <ErrorText>{errors.year}</ErrorText>}
          </section>
          {form.field && (a.type !== "school" || a.year === "Class 11" || a.year === "Class 12") && (
            <section>
              <FieldLabel optional>{form.field.label}</FieldLabel>
              <IconSelect icon="book" value={a.field} onChange={(field) => set({ field })} placeholder={form.field.placeholder} options={form.field.options} />
            </section>
          )}
          {form.specialization && (
            <section>
              <FieldLabel required={form.specialization.required} optional={!form.specialization.required}>
                {form.specialization.label}
              </FieldLabel>
              <IconInput icon="grid" value={a.specialization} onChange={(e) => set({ specialization: e.target.value })} placeholder={form.specialization.placeholder} invalid={tried && !!errors.specialization} aria-label={form.specialization.label} />
              {tried && <ErrorText>{errors.specialization}</ErrorText>}
            </section>
          )}
          {form.graduation && (
            <section>
              <FieldLabel optional>{form.graduation.label}</FieldLabel>
              <IconSelect icon="calendar" value={a.graduation} onChange={(graduation) => set({ graduation })} placeholder="Select year" options={graduationYears()} />
            </section>
          )}
        </div>
      )}

      {a.type === "school" && !now?.guardianConsent && <GuardianConsent checked={!!a.guardianConsent} onChange={(guardianConsent) => set({ guardianConsent })} error={tried ? errors.guardian : ""} />}

      <p className="rounded-lg bg-white/[0.04] px-3 py-2.5 text-[12px] leading-relaxed text-white/60">
        Nothing of yours is deleted: your plan, tests, notes, projects and certificates all stay.
        {opens && <b className="text-white"> Placement, Resume Creator, mock interviews and company coding rounds will open for you.</b>}
        {a.type === "school" && now?.type && now.type !== "school" && <b className="text-white"> As a school student, placement tools will be hidden.</b>}
      </p>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setDraft(null); setTried(false); }}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" onClick={save}>
          Save education
        </Button>
      </div>
    </div>
  );
}
