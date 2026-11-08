"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/free/parts";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, FileIcon, PlusIcon } from "@/components/ui/icons";
import { Card, Checkbox, Input, Label, Textarea } from "@/components/ui/primitives";
import { ENTRY_KINDS, monthLabel, type Entry, type ResumeData } from "@/lib/free";
import { AREAS } from "@/lib/setup";
import { allCourses, certLabel } from "@/lib/learn";

type Cert = { title: string; issuer: string; id: string; date: string };
import { useStore, type AppState } from "@/lib/store";
import { AiResume } from "@/components/resume/ai-resume";
import { entryPoints } from "@/lib/resume-ai";
import { cn } from "@/lib/utils";

/** First-time resume, filled from the profile, setup answers and projects. */
function starter(state: AppState): ResumeData {
  const a = state.setup?.academic;
  const s = state.setup?.skills;
  const skills = [
    ...(s?.familiar ?? []).filter((x) => x !== "No specific skills yet" && x !== "Other"),
    ...(s?.tools ?? []).filter((x) => x !== "None yet" && x !== "Other"),
    ...Object.keys(s?.areaLevels ?? {}).map((k) => AREAS.find((x) => x.value === k)?.label.split(" / ")[0] ?? ""),
  ].filter(Boolean);
  return {
    name: state.profile.name,
    headline: [a?.course || state.profile.degree, a?.specialization].filter(Boolean).join(" · ") || "Student",
    email: state.profile.email,
    phone: "",
    location: "",
    links: "",
    summary: "",
    education: {
      school: a?.college || state.profile.college,
      degree: [a?.course, a?.specialization || a?.field].filter(Boolean).join(", ") || state.profile.degree,
      years: a?.graduation ? `Expected ${a.graduation}` : "",
      score: "",
    },
    skills: [...new Set(skills)].join(", "),
    entryIds: (state.entries ?? []).map((e) => e.id),
    template: "professional",
  };
}

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
  const r: ResumeData = state.resume ?? starter(state);
  const entries = state.entries ?? [];
  const set = (patch: Partial<ResumeData>) => actions.patch({ resume: { ...r, ...patch } });
  // StudentOS certificates go on the resume automatically
  const certs: Cert[] = allCourses(state.learning).filter((c) => state.learning?.courses[c.id]?.certId).map((c) => {
    const cp = state.learning!.courses[c.id];
    return { title: c.title, issuer: "StudentOS Technologies", id: certLabel(cp.certId!), date: monthLabel((cp.passedAt ?? "").slice(0, 7)) };
  });
  const setEdu = (patch: Partial<ResumeData["education"]>) => set({ education: { ...r.education, ...patch } });

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader
        title="Resume Creator"
        sub="Fill in the form or let AI write it for your target role — your resume updates on the right."
        actions={
          <>
            <Button onClick={() => (actions.patch({ resume: starter(state) }), actions.toast("Resume refilled from your profile."))}>Refill from profile</Button>
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
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-white/70">Preview</p>
            <span className="text-[11.5px] text-white/45">Professional template · A4</span>
          </div>
          <div className="overflow-x-auto rounded-xl bg-black/20 p-4">
            <ResumeSheet r={r} entries={entries.filter((e) => r.entryIds.includes(e.id)).map((e) => ({ ...e, description: entryPoints(r, e) }))} certs={certs} photo={state.profile.photo} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* The A4 page. Fixed colours so it looks the same in both themes and in print. */
function ResumeSheet(props: { r: ResumeData; entries: Entry[]; certs: Cert[]; photo?: string }) {
  return <ProfessionalSheet {...props} />;
}

/* ---------- Professional template ----------
   Two columns: a navy sidebar with contact, education, skills and certifications,
   and a main column with summary, experience, projects and achievements.
   Text stays real text (not images), so it still reads well in applicant tracking systems. */
const NAVY = "#0f1b4c";
const INK = "#1e293b";
const MUTED = "#64748b";
const ACCENT = "#4f46e5";

function ContactIcon({ kind }: { kind: "mail" | "phone" | "pin" | "link" }) {
  const d = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
    pin: <><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
    link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
  }[kind];
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
      {d}
    </svg>
  );
}

function ProfessionalSheet({ r, entries, certs, photo }: { r: ResumeData; entries: Entry[]; certs: Cert[]; photo?: string }) {
  const skills = r.skills.split(",").map((s) => s.trim()).filter(Boolean);
  const links = r.links.split(",").map((s) => s.trim()).filter(Boolean);
  const groups = [
    { title: "Experience", items: entries.filter((e) => e.kind === "internship" || e.kind === "volunteering") },
    { title: "Projects", items: entries.filter((e) => e.kind === "project") },
    { title: "Achievements", items: entries.filter((e) => e.kind === "hackathon" || e.kind === "achievement") },
  ].filter((g) => g.items.length);
  const initials = (r.name || "Your Name")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const SideHeading = ({ children }: { children: ReactNode }) => (
    <h3 className="mt-7 mb-2.5 text-[10.5px] font-bold tracking-[0.18em] text-[#c7d2fe] uppercase">{children}</h3>
  );
  const MainHeading = ({ children }: { children: ReactNode }) => (
    <h3 className="mt-6 mb-3 flex items-center gap-3 text-[11.5px] font-bold tracking-[0.16em] uppercase" style={{ color: NAVY }}>
      {children}
      <span className="h-px flex-1" style={{ background: "#e2e8f0" }} />
    </h3>
  );

  return (
    <article
      id="resume-print"
      className="mx-auto flex min-h-[1123px] w-[794px] bg-[#ffffff] text-[12px] leading-[1.55] shadow-[0_10px_40px_rgb(0_0_0/0.25)]"
      style={{ color: INK, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* Sidebar */}
      <aside className="w-[250px] shrink-0 px-7 pt-12 pb-10 text-[#e2e8f0]" style={{ background: NAVY }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-[96px] w-[96px] rounded-full border-2 object-cover" style={{ borderColor: "#6366f1" }} />
        ) : (
        <div
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 text-[24px] font-semibold text-[#ffffff]"
          style={{ borderColor: "#6366f1", background: "#1e2a6b", fontFamily: "var(--font-cert), var(--font-inter), sans-serif" }}
        >
          {initials}
        </div>
        )}

        <SideHeading>Contact</SideHeading>
        <ul className="space-y-2 text-[11px] break-words">
          {r.email && (
            <li className="flex gap-2">
              <ContactIcon kind="mail" /> <span className="min-w-0">{r.email}</span>
            </li>
          )}
          {r.phone && (
            <li className="flex gap-2">
              <ContactIcon kind="phone" /> {r.phone}
            </li>
          )}
          {r.location && (
            <li className="flex gap-2">
              <ContactIcon kind="pin" /> {r.location}
            </li>
          )}
          {links.map((l) => (
            <li key={l} className="flex gap-2">
              <ContactIcon kind="link" /> <span className="min-w-0 break-all">{l}</span>
            </li>
          ))}
        </ul>

        {(r.education.school || r.education.degree) && (
          <>
            <SideHeading>Education</SideHeading>
            <p className="text-[12px] font-semibold text-[#ffffff]">{r.education.degree}</p>
            <p className="mt-0.5 text-[11px]">{r.education.school}</p>
            {r.education.years && <p className="mt-0.5 text-[10.5px] text-[#a5b4fc]">{r.education.years}</p>}
            {r.education.score && <p className="text-[10.5px] text-[#a5b4fc]">CGPA / %: {r.education.score}</p>}
          </>
        )}

        {skills.length > 0 && (
          <>
            <SideHeading>Skills</SideHeading>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="rounded px-2 py-[3px] text-[10.5px] text-[#ffffff]" style={{ background: "#26357e" }}>
                  {s}
                </span>
              ))}
            </div>
          </>
        )}

        {certs.length > 0 && (
          <>
            <SideHeading>Certifications</SideHeading>
            <ul className="space-y-2.5">
              {certs.map((c) => (
                <li key={c.id}>
                  <p className="text-[11.5px] leading-snug font-semibold text-[#ffffff]">{c.title}</p>
                  <p className="text-[10.5px]">
                    {c.issuer} · {c.date}
                  </p>
                  <p className="text-[9.5px] text-[#a5b4fc]">{c.id}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex-1 px-9 pt-12 pb-10">
        <h1 className="text-[30px] leading-tight font-bold tracking-tight" style={{ color: NAVY, fontFamily: "var(--font-cert), var(--font-inter), sans-serif" }}>
          {r.name || "Your Name"}
        </h1>
        {r.headline && (
          <p className="mt-1 text-[12.5px] font-semibold tracking-[0.06em] uppercase" style={{ color: ACCENT }}>
            {r.headline}
          </p>
        )}
        <div className="mt-4 h-[3px] w-14 rounded-full" style={{ background: ACCENT }} />

        {r.summary && (
          <>
            <MainHeading>Profile</MainHeading>
            <p className="text-[12px]" style={{ color: INK }}>
              {r.summary}
            </p>
          </>
        )}

        {groups.map((g) => (
          <section key={g.title}>
            <MainHeading>{g.title}</MainHeading>
            <div className="space-y-4">
              {g.items.map((e) => (
                <div key={e.id} className="relative pl-4">
                  <span className="absolute top-[6px] left-0 h-[7px] w-[7px] rounded-full" style={{ background: ACCENT }} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] font-semibold" style={{ color: NAVY }}>
                      {e.title}
                    </p>
                    {(e.start || e.end) && (
                      <p className="shrink-0 text-[10.5px] font-medium" style={{ color: MUTED }}>
                        {e.start && `${monthLabel(e.start)} – `}
                        {monthLabel(e.end)}
                      </p>
                    )}
                  </div>
                  {e.org && (
                    <p className="text-[11px] font-medium" style={{ color: ACCENT }}>
                      {e.org}
                    </p>
                  )}
                  {e.description && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 marker:text-[#94a3b8]">
                      {e.description
                        .split("\n")
                        .map((l) => l.replace(/^[-•]\s*/, "").trim())
                        .filter(Boolean)
                        .map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                    </ul>
                  )}
                  {(e.skills.length > 0 || e.link) && (
                    <p className="mt-1 text-[10.5px]" style={{ color: MUTED }}>
                      {e.skills.length > 0 && <span className="font-medium">Tech: </span>}
                      {e.skills.join(", ")}
                      {e.skills.length > 0 && e.link ? "  ·  " : ""}
                      {e.link}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {!r.summary && !groups.length && (
          <p className="mt-10 text-[12px]" style={{ color: "#94a3b8" }}>
            Add a summary and your projects or internships. They appear here.
          </p>
        )}
      </div>
    </article>
  );
}
