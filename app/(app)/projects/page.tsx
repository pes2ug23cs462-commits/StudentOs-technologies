"use client";

import { useState } from "react";
import { FilterPills, PageHeader } from "@/components/free/parts";
import { Button } from "@/components/ui/button";
import { Dialog, Drawer } from "@/components/ui/drawer";
import { BriefcaseIcon, CalendarIcon, CubeIcon, FolderIcon, GitHubIcon, PencilIcon, PlusIcon, SparkleIcon, TrashIcon, TrophyIcon, UsersIcon, StarIcon } from "@/components/ui/icons";
import { IdeasCard } from "@/components/projects/ideas-card";
import { PlanDrawer } from "@/components/projects/plan-drawer";
import { fallbackPlan, githubLabel, githubUrl, ideasProfile, makePlan, type ProjectIdea } from "@/lib/projects-ai";
import { Card, ChipGroup, EmptyState, FieldError, Input, Label, Pill, Textarea } from "@/components/ui/primitives";
import { ENTRY_KINDS, monthLabel, type Entry, type EntryKind } from "@/lib/free";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/utils";

const KIND_ICON: Record<EntryKind, (p: { size?: number; className?: string }) => React.ReactElement> = {
  project: CubeIcon,
  internship: BriefcaseIcon,
  hackathon: TrophyIcon,
  achievement: StarIcon,
  volunteering: UsersIcon,
};

const blank = (kind: EntryKind = "project"): Entry => ({ id: "", kind, title: "", org: "", start: "", end: "", description: "", skills: [], link: "" });

export default function ProjectsPage() {
  const { state, actions } = useStore();
  const entries = state.entries ?? [];
  const [filter, setFilter] = useState<"all" | EntryKind>("all");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [removing, setRemoving] = useState<Entry | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const planEntry = entries.find((x) => x.id === planId) ?? null;

  const save = (e: Entry) => {
    const exists = entries.some((x) => x.id === e.id);
    const next = exists ? entries.map((x) => (x.id === e.id ? e : x)) : [{ ...e, id: uid("e") }, ...entries];
    actions.patch({ entries: next });
    actions.toast(exists ? "Saved." : `Added “${e.title}”.`);
    setEditing(null);
  };
  /** saves one entry without closing anything (plan ticks, GitHub link) */
  const update = (e: Entry, list = state.entries ?? []) => actions.patch({ entries: list.some((x) => x.id === e.id) ? list.map((x) => (x.id === e.id ? e : x)) : [e, ...list] });

  /** opens the build plan, making it with AI the first time (or again on “New plan”) */
  const buildPlan = async (e: Entry, list = entries, again = false) => {
    setPlanId(e.id);
    if (e.plan && !again) return;
    setPlanBusy(true);
    const profile = ideasProfile(state.setup, list, (state.resume?.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean));
    let plan = null;
    try {
      plan = await makePlan(e, profile);
    } catch {
      /* fall back below */
    }
    if (!plan) actions.toast("Made a simple plan. Try “New plan” later for a detailed one.");
    update({ ...e, plan: plan ?? fallbackPlan(e) }, list);
    setPlanBusy(false);
  };

  const fromIdea = (i: ProjectIdea): Entry => ({ ...blank("project"), title: i.title, description: i.sub, skills: i.skills });
  const buildIdea = (i: ProjectIdea) => {
    const e = { ...fromIdea(i), id: uid("e") };
    const list = [e, ...entries];
    actions.patch({ entries: list });
    void buildPlan(e, list);
  };

  const shown = entries.filter((e) => filter === "all" || e.kind === filter).sort((a, b) => (b.end || "9999").localeCompare(a.end || "9999") || b.start.localeCompare(a.start));

  return (
    <div className="px-6 py-7 lg:px-8">
      <PageHeader
        icon="laptop"
        tone="amber"
        title="Projects & Experience"
        sub="Everything you’ve built and done, in one place. It feeds straight into your resume."
        actions={
          <Button variant="primary" icon={<PlusIcon size={14} />} onClick={() => setEditing(blank())}>
            Add entry
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {(["project", "internship", "hackathon", "achievement"] as const).map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <Card key={k} className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-[20px] leading-none font-semibold text-white">{entries.filter((e) => e.kind === k).length}</span>
                <span className="text-[11.5px] text-white/50">{ENTRY_KINDS.find((x) => x.value === k)!.label}</span>
              </span>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div>
          <FilterPills
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: "All", count: entries.length }, ...ENTRY_KINDS.map((k) => ({ value: k.value, label: k.label, count: entries.filter((e) => e.kind === k.value).length }))]}
          />
          {shown.length === 0 ? (
            <EmptyState icon={<FolderIcon size={15} />} title={entries.length ? "Nothing in this category" : "No projects or experience yet"} className="mt-4 py-12">
              <span className="block">Add a class project, internship, hackathon or award — small things count.</span>
              <Button size="sm" variant="primary" className="mt-4" icon={<PlusIcon size={13} />} onClick={() => setEditing(blank(filter === "all" ? "project" : filter))}>
                Add your first entry
              </Button>
            </EmptyState>
          ) : (
            <ul className="mt-4 space-y-3">
              {shown.map((e) => {
                const Icon = KIND_ICON[e.kind];
                return (
                  <li key={e.id}>
                    <Card className="flex gap-4 p-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/[0.1] text-accent">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-semibold text-white">{e.title}</h3>
                          <Pill>{ENTRY_KINDS.find((k) => k.value === e.kind)!.label}</Pill>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-white/50">
                          {e.org && <span>{e.org}</span>}
                          {(e.start || e.end) && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon size={11} /> {e.start ? monthLabel(e.start) : ""}
                              {e.start ? " – " : ""}
                              {monthLabel(e.end)}
                            </span>
                          )}
                          {e.link && !githubUrl(e.link) && (
                            <a href={/^https?:\/\//.test(e.link) ? e.link : `https://${e.link}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              {e.link.replace(/^https?:\/\//, "")}
                            </a>
                          )}
                        </p>
                        {e.description && <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-white/70">{e.description}</p>}
                        {e.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {e.skills.map((s) => (
                              <Pill key={s} tone="violet">
                                {s}
                              </Pill>
                            ))}
                          </div>
                        )}
                        {(() => {
                          const repo = githubUrl(e.github) || githubUrl(e.link);
                          const steps = e.plan?.steps ?? [];
                          const done = steps.filter((x) => x.done).length;
                          if (!repo && e.kind !== "project") return null;
                          return (
                            <div className="mt-3.5 flex flex-wrap items-center gap-2">
                              {repo && (
                                <a href={repo} target="_blank" rel="noopener noreferrer" className="group inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[12.5px] font-medium text-white/85 transition-colors hover:border-white/25 hover:text-white">
                                  <GitHubIcon size={14} /> {githubLabel(repo)}
                                  <span className="text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
                                </a>
                              )}
                              {e.kind === "project" && (
                                <button type="button" onClick={() => void buildPlan(e)} className="inline-flex h-8 items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.08] px-2.5 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/[0.14]">
                                  <SparkleIcon size={12} />
                                  {steps.length ? `Build plan · ${done}/${steps.length}` : "Build it with AI"}
                                  {steps.length > 0 && (
                                    <span className="h-1 w-12 overflow-hidden rounded-full bg-white/10">
                                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
                                    </span>
                                  )}
                                </button>
                              )}
                              {!repo && e.kind === "project" && (
                                <button type="button" onClick={() => setEditing(e)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] text-white/50 hover:text-white">
                                  <GitHubIcon size={13} /> Add GitHub link
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" aria-label="Edit" onClick={() => setEditing(e)} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white">
                          <PencilIcon size={14} />
                        </button>
                        <button type="button" aria-label="Delete" onClick={() => setRemoving(e)} className="rounded-lg p-2 text-white/50 hover:bg-rose-500/10 hover:text-rose-400">
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-3">
          <IdeasCard onStart={(i) => setEditing(fromIdea(i))} onBuild={buildIdea} />
        </aside>
      </div>

      <EntryDrawer entry={editing} onClose={() => setEditing(null)} onSave={save} />
      <PlanDrawer key={planId ?? "none"} entry={planEntry} busy={planBusy} onClose={() => setPlanId(null)} onChange={(e) => update(e)} onRemake={() => planEntry && void buildPlan(planEntry, entries, true)} />
      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Delete this entry?"
        actions={
          <>
            <Button size="sm" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                actions.patch({ entries: entries.filter((x) => x.id !== removing?.id) });
                setRemoving(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        “{removing?.title}” will be removed from your profile and resume.
      </Dialog>
    </div>
  );
}

function EntryDrawer({ entry, onClose, onSave }: { entry: Entry | null; onClose: () => void; onSave: (e: Entry) => void }) {
  if (!entry) return null;
  return <EntryForm key={entry.id || entry.title || "new"} initial={entry} onClose={onClose} onSave={onSave} />;
}

function EntryForm({ initial, onClose, onSave }: { initial: Entry; onClose: () => void; onSave: (e: Entry) => void }) {
  const [e, setE] = useState<Entry>(initial);
  const [skill, setSkill] = useState("");
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Entry>) => setE((x) => ({ ...x, ...patch }));
  const titleErr = !e.title.trim() ? "Give it a title." : "";
  const dateErr = e.start && e.end && e.end < e.start ? "End date is before the start date." : "";
  const ghErr = e.github?.trim() && !githubUrl(e.github) ? "Paste a GitHub link, like github.com/you/project." : "";
  const addSkill = () => {
    const s = skill.trim().replace(/,$/, "");
    if (s && !e.skills.includes(s)) set({ skills: [...e.skills, s] });
    setSkill("");
  };
  const orgLabel = { project: "Course or team (optional)", internship: "Company", hackathon: "Event / organiser", achievement: "Awarded by", volunteering: "Organisation" }[e.kind];

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="Projects & experience"
      title={initial.id ? "Edit entry" : "Add entry"}
      footer={
        <>
          <span className="mr-auto" />
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setTried(true);
              if (titleErr || dateErr || ghErr) return;
              onSave({ ...e, title: e.title.trim(), org: e.org.trim(), github: githubUrl(e.github) || undefined });
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label>Type</Label>
          <ChipGroup options={ENTRY_KINDS} value={e.kind} onChange={(kind) => set({ kind })} />
        </div>
        <div>
          <Label htmlFor="en-title">Title</Label>
          <Input id="en-title" value={e.title} onChange={(x) => set({ title: x.target.value })} placeholder="e.g. College event app" invalid={tried && !!titleErr} />
          {tried && <FieldError>{titleErr}</FieldError>}
        </div>
        <div>
          <Label htmlFor="en-org">{orgLabel}</Label>
          <Input id="en-org" value={e.org} onChange={(x) => set({ org: x.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="en-start">Start</Label>
            <Input id="en-start" type="month" value={e.start} onChange={(x) => set({ start: x.target.value })} />
          </div>
          <div>
            <Label htmlFor="en-end" hint="leave empty if ongoing">
              End
            </Label>
            <Input id="en-end" type="month" value={e.end} onChange={(x) => set({ end: x.target.value })} invalid={tried && !!dateErr} />
          </div>
        </div>
        {tried && <FieldError>{dateErr}</FieldError>}
        <div>
          <Label htmlFor="en-desc">What did you do?</Label>
          <Textarea id="en-desc" rows={4} value={e.description} onChange={(x) => set({ description: x.target.value })} placeholder="What you built or did, and the result. One point per line works well on a resume." />
        </div>
        <div>
          <Label htmlFor="en-skill" hint="press Enter to add">
            Skills used
          </Label>
          <Input
            id="en-skill"
            value={skill}
            onChange={(x) => setSkill(x.target.value)}
            onKeyDown={(x) => {
              if (x.key === "Enter" || x.key === ",") {
                x.preventDefault();
                addSkill();
              }
            }}
            onBlur={addSkill}
            placeholder="e.g. React"
          />
          {e.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {e.skills.map((s) => (
                <button key={s} type="button" onClick={() => set({ skills: e.skills.filter((x) => x !== s) })} className="rounded-md border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 text-[11.5px] text-violet-300 hover:line-through">
                  {s} ×
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="en-gh" hint="optional">
            GitHub repository
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/45">
              <GitHubIcon size={14} />
            </span>
            <Input id="en-gh" value={e.github ?? ""} onChange={(x) => set({ github: x.target.value })} placeholder="github.com/you/project" className="pl-9" invalid={tried && !!ghErr} />
          </div>
          {tried && <FieldError>{ghErr}</FieldError>}
          {githubUrl(e.github) && (
            <a href={githubUrl(e.github)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-[12px] text-accent hover:underline">
              Open {githubLabel(githubUrl(e.github))} on GitHub ↗
            </a>
          )}
        </div>
        <div>
          <Label htmlFor="en-link" hint="optional">
            Live link or certificate
          </Label>
          <Input id="en-link" value={e.link} onChange={(x) => set({ link: x.target.value })} placeholder="e.g. myapp.vercel.app" />
        </div>
      </div>
    </Drawer>
  );
}
