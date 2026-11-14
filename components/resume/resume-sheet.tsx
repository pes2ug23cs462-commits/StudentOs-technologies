"use client";

/* The resume as an A4 page, in four templates. Used by the Resume Creator and
   wherever a student's resume is shown to their college or a company. Fixed
   colours so it looks the same in both themes and in print. */

import type { ReactNode } from "react";
import { monthLabel, type Entry, type ResumeCert, type ResumeData } from "@/lib/free";
import { cn } from "@/lib/utils";

type Cert = ResumeCert;

export type SheetProps = { r: ResumeData; entries: Entry[]; certs: Cert[]; photo?: string };

export const TEMPLATES: { value: ResumeData["template"]; label: string; sub: string }[] = [
  { value: "professional", label: "Professional", sub: "Two columns with a navy sidebar. Good all-rounder." },
  { value: "classic", label: "Classic", sub: "Plain one column in black and white. Safest for applicant tracking systems and campus placements." },
  { value: "modern", label: "Modern", sub: "One column with a violet header. Good for startups, design and product roles." },
  { value: "compact", label: "Compact", sub: "Smaller text and tight spacing, so more fits on one page. Good for freshers with many projects." },
];

/** Tiny picture of each layout for the picker. */
export function TemplateThumb({ kind }: { kind: ResumeData["template"] }) {
  const line = (w: number, y: number, x = 0, c = "#cbd5e1") => <rect x={x} y={y} width={w} height="1.6" rx="0.8" fill={c} />;
  return (
    <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden className="shrink-0 rounded-[3px] bg-[#ffffff]">
      {kind === "professional" && (
        <>
          <rect width="6" height="24" fill="#0f1b4c" />
          {line(8, 4, 8, "#0f1b4c")}
          {line(8, 8, 8)}
          {line(8, 11, 8)}
          {line(8, 14, 8)}
        </>
      )}
      {kind === "classic" && (
        <>
          {line(10, 3, 4, "#111827")}
          {line(14, 7, 2, "#111827")}
          {line(14, 10, 2)}
          {line(14, 13, 2)}
          {line(14, 16, 2)}
        </>
      )}
      {kind === "modern" && (
        <>
          <rect width="18" height="7" fill="#6d28d9" />
          {line(14, 10, 2, "#6d28d9")}
          {line(14, 13, 2)}
          {line(14, 16, 2)}
          {line(10, 19, 2)}
        </>
      )}
      {kind === "compact" && (
        <>
          {line(14, 2.5, 2, "#111827")}
          {[5, 7, 9, 11, 13, 15, 17, 19, 21].map((y) => (
            <rect key={y} x="2" y={y} width={y % 4 ? 14 : 10} height="1" rx="0.5" fill="#cbd5e1" />
          ))}
        </>
      )}
    </svg>
  );
}

/* The A4 page. Fixed colours so it looks the same in both themes and in print. */
export function ResumeSheet(props: SheetProps) {
  const t = props.r.template ?? "professional";
  if (t === "classic") return <ClassicSheet {...props} />;
  if (t === "modern") return <ModernSheet {...props} />;
  if (t === "compact") return <CompactSheet {...props} />;
  return <ProfessionalSheet {...props} />;
}

/* Shared pieces for the one-column templates. */
function sheetData({ r, entries }: SheetProps) {
  return {
    skills: r.skills.split(",").map((s) => s.trim()).filter(Boolean),
    contact: [r.email, r.phone, r.location, ...r.links.split(",").map((s) => s.trim())].filter(Boolean),
    groups: [
      { title: "Experience", items: entries.filter((e) => e.kind === "internship" || e.kind === "volunteering") },
      { title: "Projects", items: entries.filter((e) => e.kind === "project") },
      { title: "Achievements", items: entries.filter((e) => e.kind === "hackathon" || e.kind === "achievement") },
    ].filter((g) => g.items.length),
  };
}
const points = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
const dates = (e: Entry) => [e.start && monthLabel(e.start), e.end && monthLabel(e.end)].filter(Boolean).join(" – ");

function EntryBlock({ e, size, accent, muted, tight }: { e: Entry; size: number; accent: string; muted: string; tight?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p style={{ fontSize: size + 0.5, fontWeight: 700 }}>
          {e.title}
          {e.org && <span style={{ fontWeight: 500, color: accent }}>{` · ${e.org}`}</span>}
        </p>
        {dates(e) && (
          <p className="shrink-0" style={{ fontSize: size - 1.5, color: muted }}>
            {dates(e)}
          </p>
        )}
      </div>
      {e.description && (
        <ul className={cn("list-disc pl-4", tight ? "mt-0.5 space-y-0" : "mt-1 space-y-0.5")}>
          {points(e.description).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      {(e.skills.length > 0 || e.link || e.github) && (
        <p style={{ fontSize: size - 1.5, color: muted, marginTop: tight ? 1 : 3 }}>{[e.skills.join(", "), e.github?.replace(/^https?:\/\//, ""), e.link].filter(Boolean).join("  ·  ")}</p>
      )}
    </div>
  );
}

/* ---------- Classic: plain, one column, black and white ---------- */
function ClassicSheet(props: SheetProps) {
  const { r, certs } = props;
  const { skills, contact, groups } = sheetData(props);
  const H = ({ children }: { children: ReactNode }) => (
    <h3 className="mt-5 mb-2 border-b pb-1 text-[12px] font-bold tracking-[0.12em] uppercase" style={{ borderColor: "#111827" }}>
      {children}
    </h3>
  );
  return (
    <article id="resume-print" className="mx-auto min-h-[1123px] w-[794px] bg-[#ffffff] px-14 py-12 text-[12px] leading-[1.5] shadow-[0_10px_40px_rgb(0_0_0/0.25)]" style={{ color: "#111827", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <h1 className="text-center text-[28px] font-bold tracking-wide">{r.name || "Your Name"}</h1>
      {r.headline && <p className="mt-0.5 text-center text-[12.5px] italic">{r.headline}</p>}
      {contact.length > 0 && <p className="mt-1.5 text-center text-[11px]" style={{ color: "#374151" }}>{contact.join("  |  ")}</p>}
      {r.summary && (
        <>
          <H>Summary</H>
          <p>{r.summary}</p>
        </>
      )}
      {(r.education.school || r.education.degree) && (
        <>
          <H>Education</H>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-bold">{r.education.school}</p>
            <p className="text-[11px]">{r.education.years}</p>
          </div>
          <p>
            {r.education.degree}
            {r.education.score && ` — CGPA / %: ${r.education.score}`}
          </p>
        </>
      )}
      {groups.map((g) => (
        <section key={g.title}>
          <H>{g.title}</H>
          <div className="space-y-3">
            {g.items.map((e) => (
              <EntryBlock key={e.id} e={e} size={12} accent="#111827" muted="#4b5563" />
            ))}
          </div>
        </section>
      ))}
      {skills.length > 0 && (
        <>
          <H>Skills</H>
          <p>{skills.join(", ")}</p>
        </>
      )}
      {certs.length > 0 && (
        <>
          <H>Certifications</H>
          <ul className="list-disc space-y-0.5 pl-4">
            {certs.map((c) => (
              <li key={c.id}>
                {c.title} — {c.issuer}, {c.date} <span style={{ color: "#6b7280" }}>({c.id})</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

/* ---------- Modern: violet header band, one column ---------- */
function ModernSheet(props: SheetProps) {
  const { r, certs, photo } = props;
  const { skills, contact, groups } = sheetData(props);
  const V = "#6d28d9";
  const H = ({ children }: { children: ReactNode }) => (
    <h3 className="mt-6 mb-2.5 flex items-center gap-2 text-[12.5px] font-bold" style={{ color: V }}>
      <span className="h-3.5 w-1 rounded-full" style={{ background: V }} />
      {children}
    </h3>
  );
  return (
    <article id="resume-print" className="mx-auto min-h-[1123px] w-[794px] bg-[#ffffff] text-[12px] leading-[1.55] shadow-[0_10px_40px_rgb(0_0_0/0.25)]" style={{ color: "#1f2937", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <header className="flex items-center gap-5 px-12 py-9" style={{ background: "linear-gradient(120deg, #4c1d95, #6d28d9 55%, #7c3aed)", color: "#ffffff" }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-[84px] w-[84px] rounded-2xl border-2 object-cover" style={{ borderColor: "#c4b5fd" }} />
        )}
        <div className="min-w-0">
          <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">{r.name || "Your Name"}</h1>
          {r.headline && <p className="mt-0.5 text-[13px] font-medium" style={{ color: "#ddd6fe" }}>{r.headline}</p>}
          {contact.length > 0 && <p className="mt-2 text-[11px]" style={{ color: "#ede9fe" }}>{contact.join("   ·   ")}</p>}
        </div>
      </header>
      <div className="px-12 pt-2 pb-10">
        {r.summary && (
          <>
            <H>About me</H>
            <p>{r.summary}</p>
          </>
        )}
        {groups.map((g) => (
          <section key={g.title}>
            <H>{g.title}</H>
            <div className="space-y-3.5">
              {g.items.map((e) => (
                <EntryBlock key={e.id} e={e} size={12} accent={V} muted="#6b7280" />
              ))}
            </div>
          </section>
        ))}
        <div className="grid grid-cols-2 gap-x-8">
          {(r.education.school || r.education.degree) && (
            <section>
              <H>Education</H>
              <p className="font-semibold">{r.education.degree}</p>
              <p>{r.education.school}</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>
                {[r.education.years, r.education.score && `CGPA / %: ${r.education.score}`].filter(Boolean).join(" · ")}
              </p>
            </section>
          )}
          {skills.length > 0 && (
            <section>
              <H>Skills</H>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s} className="rounded-full px-2.5 py-[2px] text-[10.5px] font-medium" style={{ background: "#ede9fe", color: "#5b21b6" }}>
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
        {certs.length > 0 && (
          <>
            <H>Certifications</H>
            <ul className="space-y-1">
              {certs.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold">{c.title}</span> · {c.issuer} · {c.date} <span style={{ color: "#9ca3af" }}>{c.id}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}

/* ---------- Compact: small text, tight spacing, fits more on one page ---------- */
function CompactSheet(props: SheetProps) {
  const { r, certs } = props;
  const { skills, contact, groups } = sheetData(props);
  const H = ({ children }: { children: ReactNode }) => (
    <h3 className="mt-3 mb-1 text-[10.5px] font-bold tracking-[0.14em] uppercase" style={{ color: "#0f172a", borderBottom: "1px solid #cbd5e1" }}>
      {children}
    </h3>
  );
  return (
    <article id="resume-print" className="mx-auto min-h-[1123px] w-[794px] bg-[#ffffff] px-10 py-8 text-[10.5px] leading-[1.4] shadow-[0_10px_40px_rgb(0_0_0/0.25)]" style={{ color: "#1e293b", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-bold" style={{ color: "#0f172a" }}>{r.name || "Your Name"}</h1>
          {r.headline && <p className="text-[11px] font-medium" style={{ color: "#4f46e5" }}>{r.headline}</p>}
        </div>
        <p className="max-w-[55%] text-right text-[9.5px]" style={{ color: "#475569" }}>{contact.join(" · ")}</p>
      </div>
      {r.summary && (
        <>
          <H>Summary</H>
          <p>{r.summary}</p>
        </>
      )}
      {(r.education.school || r.education.degree) && (
        <>
          <H>Education</H>
          <p>
            <span className="font-semibold">{r.education.degree}</span>, {r.education.school}
            {r.education.years && ` · ${r.education.years}`}
            {r.education.score && ` · CGPA / %: ${r.education.score}`}
          </p>
        </>
      )}
      {skills.length > 0 && (
        <>
          <H>Skills</H>
          <p>{skills.join(" · ")}</p>
        </>
      )}
      {groups.map((g) => (
        <section key={g.title}>
          <H>{g.title}</H>
          <div className="space-y-1.5">
            {g.items.map((e) => (
              <EntryBlock key={e.id} e={e} size={10.5} accent="#4f46e5" muted="#64748b" tight />
            ))}
          </div>
        </section>
      ))}
      {certs.length > 0 && (
        <>
          <H>Certifications</H>
          <p>{certs.map((c) => `${c.title} (${c.issuer}, ${c.date})`).join(" · ")}</p>
        </>
      )}
    </article>
  );
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
                  {(e.skills.length > 0 || e.link || e.github) && (
                    <p className="mt-1 text-[10.5px]" style={{ color: MUTED }}>
                      {e.skills.length > 0 && <span className="font-medium">Tech: </span>}
                      {[e.skills.join(", "), e.github?.replace(/^https?:\/\//, ""), e.link].filter(Boolean).join("  ·  ")}
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
