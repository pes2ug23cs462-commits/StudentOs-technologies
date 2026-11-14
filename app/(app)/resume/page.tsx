"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/free/parts";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, FileIcon, PlusIcon } from "@/components/ui/icons";
import { Card, Checkbox, Input, Label, Textarea } from "@/components/ui/primitives";
import { ENTRY_KINDS, type ResumeData } from "@/lib/free";

import { useStore } from "@/lib/store";
import { AiResume } from "@/components/resume/ai-resume";
import { entryPoints } from "@/lib/resume-ai";
import { starterResume } from "@/lib/resume-starter";
import { cn } from "@/lib/utils";
import { ResumeSheet, TEMPLATES, TemplateThumb } from "@/components/resume/resume-sheet";
import { resumeCerts } from "@/lib/resume-snapshot";

function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="text-[14px] font-semibold text-white">{title}</span>
        <ChevronDownIcon size={16} className={cn("text-white/50 transition", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-4 border-t border-white/[0.07] px-5 py-5">{children}</div>}
    </Card>
  );
}

export default function ResumePage() {
  const { state, actions } = useStore();
  const r: ResumeData = state.resume ?? starterResume(state);
  const entries = state.entries ?? [];
  const set = (patch: Partial<ResumeData>) => actions.patch({ resume: { ...r, ...patch } });
  // StudentOS certificates go on the resume automatically
  const certs = resumeCerts(state);
  const setEdu = (patch: Partial<ResumeData["education"]>) => set({ education: { ...r.education, ...patch } });

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader
        icon="resume"
        tone="emerald"
        title="Resume Creator"
        sub="Fill in the form or let AI write it for your target role — your resume updates on the right."
        actions={
          <>
            <Button onClick={() => (actions.patch({ resume: starterResume(state) }), actions.toast("Resume refilled from your profile."))}>Refill from profile</Button>
            <Button variant="primary" icon={<FileIcon size={14} />} onClick={() => window.print()}>
              Download PDF
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,460px)_1fr] xl:grid-cols-[minmax(0,420px)_1fr]">
        {/* Form */}
        <div className="space-y-3">
          <AiResume
            r={r}
            entries={entries.filter((e) => r.entryIds.includes(e.id))}
            certs={certs.map((c) => `${c.title}, ${c.issuer}`)}
            profile={[state.setup?.academic.course, state.setup?.academic.field, state.setup?.academic.year].filter(Boolean).join(" · ")}
            set={set}
          />
          <Section title="Personal details">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="r-name">Full name</Label>
                <Input id="r-name" value={r.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="r-head">Headline</Label>
                <Input id="r-head" value={r.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="B.Tech CSE student" />
              </div>
              <div>
                <Label htmlFor="r-email">Email</Label>
                <Input id="r-email" value={r.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="r-phone">Phone</Label>
                <Input id="r-phone" value={r.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 …" />
              </div>
              <div>
                <Label htmlFor="r-loc">City</Label>
                <Input id="r-loc" value={r.location} onChange={(e) => set({ location: e.target.value })} placeholder="Bengaluru" />
              </div>
              <div>
                <Label htmlFor="r-links">Links</Label>
                <Input id="r-links" value={r.links} onChange={(e) => set({ links: e.target.value })} placeholder="github.com/you, linkedin.com/in/you" />
              </div>
            </div>
            <div>
              <Label htmlFor="r-sum" hint="2–3 lines">
                Summary
              </Label>
              <Textarea id="r-sum" rows={3} value={r.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="Second-year CSE student who enjoys building web apps. Looking for a summer internship in frontend development." />
            </div>
          </Section>

          <Section title="Education">
            <div>
              <Label htmlFor="r-school">College / school</Label>
              <Input id="r-school" value={r.education.school} onChange={(e) => setEdu({ school: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label htmlFor="r-deg">Degree</Label>
                <Input id="r-deg" value={r.education.degree} onChange={(e) => setEdu({ degree: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="r-years">Years</Label>
                <Input id="r-years" value={r.education.years} onChange={(e) => setEdu({ years: e.target.value })} placeholder="2024 – 2028" />
              </div>
              <div>
                <Label htmlFor="r-score">CGPA / %</Label>
                <Input id="r-score" value={r.education.score} onChange={(e) => setEdu({ score: e.target.value })} placeholder="8.6" />
              </div>
            </div>
          </Section>

          <Section title="Skills">
            <Label htmlFor="r-skills" hint="separate with commas">
              Skills
            </Label>
            <Textarea id="r-skills" rows={2} value={r.skills} onChange={(e) => set({ skills: e.target.value })} placeholder="Python, Figma, Communication" />
          </Section>

          <Section title={`Projects & experience (${r.entryIds.filter((id) => entries.some((e) => e.id === id)).length} of ${entries.length})`}>
            {entries.length === 0 ? (
              <p className="text-[12.5px] text-white/55">
                Nothing added yet.{" "}
                <Link href="/projects" className="font-medium text-accent hover:underline">
                  Add projects and experience
                </Link>{" "}
                and they’ll appear here.
              </p>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {entries.map((e) => (
                    <li key={e.id}>
                      <Checkbox
                        checked={r.entryIds.includes(e.id)}
                        onChange={(on) => set({ entryIds: on ? [...r.entryIds, e.id] : r.entryIds.filter((x) => x !== e.id) })}
                        label={e.title}
                      >
                        <span>
                          <span className="block text-[13px] text-white">{e.title}</span>
                          <span className="block text-[11px] text-white/45">{ENTRY_KINDS.find((k) => k.value === e.kind)?.label}</span>
                        </span>
                      </Checkbox>
                    </li>
                  ))}
                </ul>
                <Link href="/projects" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline">
                  <PlusIcon size={12} /> Add more
                </Link>
                {entries.filter((e) => r.entryIds.includes(e.id) && r.bullets?.[e.id] !== undefined).map((e) => (
                  <div key={e.id} className="rounded-xl border border-violet-400/25 bg-violet-500/[0.05] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`rb-${e.id}`}>Resume points · {e.title}</Label>
                      <button
                        type="button"
                        onClick={() => {
                          const b = { ...(r.bullets ?? {}) };
                          delete b[e.id];
                          set({ bullets: b });
                        }}
                        className="mb-1.5 text-[11.5px] text-white/50 hover:text-white"
                      >
                        Use original
                      </button>
                    </div>
                    <Textarea id={`rb-${e.id}`} rows={4} value={r.bullets![e.id]} onChange={(ev) => set({ bullets: { ...(r.bullets ?? {}), [e.id]: ev.target.value } })} />
                    <p className="mt-1 text-[11px] text-white/40">One point per line. Only your resume uses this; the project itself is unchanged.</p>
                  </div>
                ))}
              </>
            )}
          </Section>

        </div>

        {/* Preview */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-white/70">Preview · A4</p>
            <div role="radiogroup" aria-label="Resume format" className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={(r.template ?? "professional") === t.value}
                  title={t.sub}
                  onClick={() => set({ template: t.value })}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition",
                    (r.template ?? "professional") === t.value ? "border-accent bg-accent/15 font-semibold text-white" : "border-white/10 text-white/65 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <TemplateThumb kind={t.value} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <p className="-mt-1 mb-3 text-[11.5px] text-white/45">{TEMPLATES.find((t) => t.value === (r.template ?? "professional"))?.sub}</p>
          <div className="overflow-x-auto rounded-xl bg-black/20 p-4">
            <ResumeSheet r={r} entries={entries.filter((e) => r.entryIds.includes(e.id)).map((e) => ({ ...e, description: entryPoints(r, e) }))} certs={certs} photo={state.profile.photo} />
          </div>
        </div>
      </div>
    </div>
  );
}
