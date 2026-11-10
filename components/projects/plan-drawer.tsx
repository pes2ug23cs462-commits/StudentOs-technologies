"use client";

/* Build a project with AI: a step-by-step plan the student ticks off, the tools
   to use, “Ask AI” on any step (opens the assistant with the step filled in),
   and the project's GitHub repository. */

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { CheckIcon, ChatIcon, GitHubIcon, RefreshIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/primitives";
import type { Entry } from "@/lib/free";
import { githubLabel, githubUrl } from "@/lib/projects-ai";
import { cn } from "@/lib/utils";

export function PlanDrawer({ entry, busy, onClose, onChange, onRemake }: { entry: Entry | null; busy: boolean; onClose: () => void; onChange: (e: Entry) => void; onRemake: () => void }) {
  const [gh, setGh] = useState("");
  if (!entry) return null;
  const plan = entry.plan;
  const done = plan?.steps.filter((s) => s.done).length ?? 0;
  const total = plan?.steps.length ?? 0;
  const repo = githubUrl(entry.github);
  const ghOk = githubUrl(gh);
  const ask = (step: string) =>
    `/assistant?ask=${encodeURIComponent(`I'm building my project “${entry.title}”${entry.skills.length ? ` with ${entry.skills.join(", ")}` : ""}. Help me with this step: ${step}. Explain how to do it, with example code or a template if useful.`)}`;

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="Build with AI"
      title={entry.title}
      width="w-[520px]"
      footer={
        <>
          <Button size="sm" variant="ghost" icon={<RefreshIcon size={13} />} loading={busy} onClick={onRemake}>
            New plan
          </Button>
          <span className="mr-auto" />
          <Button size="sm" variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      {busy && !plan ? (
        <div className="space-y-3" aria-live="polite">
          <p className="flex items-center gap-2 text-[13px] text-white/70">
            <span className="ui-live" aria-hidden /> Making a step-by-step plan for you…
          </p>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : plan ? (
        <div className="space-y-5">
          {/* progress */}
          <div>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-white/80">Progress</span>
              <span className="text-white/55 tabular-nums">
                {done}/{total} steps
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* repo */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-white">
              <GitHubIcon size={14} /> GitHub repository
            </p>
            {repo ? (
              <a href={repo} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
                {githubLabel(repo)} ↗
              </a>
            ) : (
              <div className="mt-2 flex gap-2">
                <Input value={gh} onChange={(x) => setGh(x.target.value)} placeholder="github.com/you/project" aria-label="GitHub repository link" invalid={!!gh && !ghOk} />
                <Button size="sm" disabled={!ghOk} onClick={() => onChange({ ...entry, github: ghOk })}>
                  Save
                </Button>
              </div>
            )}
            {!repo && <p className="mt-1.5 text-[11.5px] text-white/45">Create the repository in step 2, then paste its link here.</p>}
          </div>

          {plan.stack.length > 0 && (
            <div>
              <p className="text-[12.5px] font-medium text-white/80">Tools to use</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {plan.stack.map((t) => (
                  <span key={t} className="rounded-md border border-white/10 px-2 py-0.5 text-[12px] text-white/75">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* steps */}
          <ol className="relative space-y-2">
            {plan.steps.map((s, i) => (
              <li key={i} className={cn("pl-step rounded-xl border p-3.5 transition-colors", s.done ? "border-emerald-400/25 bg-emerald-400/[0.04]" : "border-white/[0.08] bg-white/[0.02]")} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!s.done}
                    aria-label={`Mark step ${i + 1} done`}
                    onClick={() => onChange({ ...entry, plan: { ...plan, steps: plan.steps.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) } })}
                    className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors", s.done ? "border-emerald-400 bg-emerald-400 text-[#ffffff]" : "border-white/30 hover:border-accent")}
                  >
                    {s.done ? <CheckIcon size={11} /> : <span className="text-[10px] text-white/50">{i + 1}</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[13.5px] font-semibold", s.done ? "text-white/55 line-through" : "text-white")}>{s.title}</p>
                    {s.detail && <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{s.detail}</p>}
                    {!s.done && (
                      <Link href={ask(`${s.title}. ${s.detail}`)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline">
                        <ChatIcon size={12} /> Ask AI to help with this step
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-[13px] text-white/60">Couldn’t make a plan right now. Try “New plan”.</p>
      )}
    </Drawer>
  );
}
