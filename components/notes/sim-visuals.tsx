"use client";

/* Simulations for “Explain with AI”: real worked examples that move while the
   narrator explains them. Each one shows frame N of its data as line N is
   spoken (share 0–1 = how far through the scene we are). Flat, 2D only. */

import { useMemo } from "react";
import type { Sim, SimType } from "@/lib/explainer";
import { cn } from "@/lib/utils";

const frameAt = (n: number, share: number) => Math.min(n - 1, Math.max(0, Math.ceil(share * n) - 1));
const fmtNum = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : String(Math.round(n * 100) / 100));

export function SimVisual({ type, sim, share }: { type: SimType; sim: Sim; share: number }) {
  switch (type) {
    case "bars":
      return <Bars sim={sim} share={share} />;
    case "array":
      return <ArrayRow sim={sim} share={share} />;
    case "stack":
      return <StackQueue sim={sim} share={share} />;
    case "gantt":
      return <Gantt sim={sim} share={share} />;
    case "graph":
      return <Graph sim={sim} share={share} />;
    case "calc":
      return <Calc sim={sim} share={share} />;
  }
}

function Note({ text }: { text?: string }) {
  return (
    <p key={text} className="explain-in mt-3 min-h-[20px] text-center text-[12.5px] font-medium text-[var(--cyan,#22d3ee)]">
      {text ?? ""}
    </p>
  );
}

/* ---- bar chart: values change frame to frame (e.g. book value each year) ---- */
function Bars({ sim, share }: { sim: Sim; share: number }) {
  const frames = sim.frames ?? [];
  const f = frames[frameAt(frames.length, share)];
  const max = Math.max(1, ...frames.flatMap((x) => x.values ?? []));
  const labels = sim.labels ?? [];
  return (
    <div className="w-full max-w-[640px]">
      <div className="flex h-[190px] items-end gap-2 border-b border-white/15 px-1 sm:gap-3">
        {labels.map((l, i) => {
          const v = f?.values?.[i] ?? 0;
          return (
            <div key={l} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[11.5px] font-semibold text-white tabular-nums">
                {sim.unit && /^[₹$€£]$/.test(sim.unit) ? sim.unit : ""}
                {fmtNum(v)}
                {sim.unit && !/^[₹$€£]$/.test(sim.unit) ? ` ${sim.unit}` : ""}
              </span>
              <span
                className="w-full max-w-[56px] rounded-t-md bg-gradient-to-t from-violet-600 to-violet-400 transition-[height] duration-700 ease-out"
                style={{ height: `${(v / max) * 150}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2 px-1 sm:gap-3">
        {labels.map((l) => (
          <span key={l} className="min-w-0 flex-1 truncate text-center text-[11px] text-white/55">
            {l}
          </span>
        ))}
      </div>
      <Note text={f?.note} />
    </div>
  );
}

/* ---- array: items slide to new places (sorting, searching) ---- */
function keyed(items: string[]) {
  const seen = new Map<string, number>();
  return items.map((v) => {
    const n = seen.get(v) ?? 0;
    seen.set(v, n + 1);
    return `${v}#${n}`;
  });
}
function ArrayRow({ sim, share }: { sim: Sim; share: number }) {
  const frames = sim.frames ?? [];
  const f = frames[frameAt(frames.length, share)];
  const items = f?.items ?? [];
  const keys = keyed(items);
  const order = useMemo(() => [...new Set(frames.flatMap((x) => keyed(x.items ?? [])))], [frames]);
  const W = 52;
  const width = Math.max(...frames.map((x) => x.items?.length ?? 0)) * W;
  return (
    <div className="w-full">
      <div className="relative mx-auto h-[70px]" style={{ width }}>
        {order.map((k) => {
          const at = keys.indexOf(k);
          if (at < 0) return null;
          const hl = f?.hl?.includes(at);
          const done = f?.done?.includes(at);
          return (
            <span
              key={k}
              className={cn(
                "absolute top-2 flex h-11 w-11 items-center justify-center rounded-xl border text-[15px] font-bold tabular-nums transition-all duration-500 ease-out",
                hl ? "-translate-y-2 border-accent bg-violet-500/30 text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,0.9)]" : done ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200" : "border-white/15 bg-white/[0.05] text-white",
              )}
              style={{ left: at * W }}
            >
              {k.split("#")[0]}
            </span>
          );
        })}
      </div>
      <div className="mx-auto flex" style={{ width }}>
        {items.map((_, i) => (
          <span key={i} className="mr-2 w-11 shrink-0 text-center text-[10.5px] text-white/35 tabular-nums">
            {i}
          </span>
        ))}
      </div>
      <Note text={f?.note} />
    </div>
  );
}

/* ---- stack / queue: items push in and pop out ---- */
function StackQueue({ sim, share }: { sim: Sim; share: number }) {
  const frames = sim.frames ?? [];
  const i = frameAt(frames.length, share);
  const f = frames[i];
  const prev = frames[i - 1];
  const now = keyed(f?.items ?? []);
  const before = keyed(prev?.items ?? []);
  const gone = before.filter((k) => !now.includes(k));
  const queue = sim.mode === "queue";
  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[11px] font-semibold tracking-wide text-white/45 uppercase">{queue ? "Queue · first in, first out" : "Stack · last in, first out"}</p>
      <div className={cn("mx-auto flex items-center justify-center gap-2.5", queue ? "flex-row" : "w-[170px] flex-col-reverse rounded-b-xl border-x-2 border-b-2 border-white/20 px-2 pt-2 pb-2")} style={queue ? undefined : { minHeight: 230 }}>
        {now.map((k, j) => {
          const fresh = !before.includes(k);
          const top = queue ? j === now.length - 1 : j === now.length - 1;
          return (
            <span
              key={k}
              className={cn(
                "flex h-12 items-center justify-center rounded-xl border px-4 text-[15px] font-bold text-white transition-colors",
                queue ? "min-w-[78px]" : "w-full",
                fresh ? "sim-push border-accent bg-violet-500/30" : top ? "border-violet-400/40 bg-violet-500/15" : "border-white/15 bg-white/[0.05]",
              )}
            >
              {k.split("#")[0]}
            </span>
          );
        })}
      </div>
      {gone.length > 0 && (
        <div className="mt-2 flex justify-center gap-2" aria-hidden>
          {gone.map((k) => (
            <span key={`${i}-${k}`} className="sim-pop rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-[12.5px] font-semibold text-rose-200">
              {k.split("#")[0]} {queue ? "served" : "popped"}
            </span>
          ))}
        </div>
      )}
      {queue && now.length > 0 && (
        <div className="mx-auto mt-1 flex max-w-[420px] justify-between px-1 text-[10.5px] text-white/40">
          <span>front</span>
          <span>back</span>
        </div>
      )}
      <Note text={f?.note} />
    </div>
  );
}

/* ---- gantt: tasks fill in on a time axis (CPU scheduling, plans) ---- */
function Gantt({ sim, share }: { sim: Sim; share: number }) {
  const tasks = sim.tasks ?? [];
  const frames = sim.frames ?? [];
  const end = Math.max(...tasks.map((t) => t.end));
  const shown = Math.max(1, Math.ceil(tasks.length * share));
  const now = tasks[shown - 1]?.end ?? 0;
  const ticks = [...new Set([0, ...tasks.map((t) => t.end)])].sort((a, b) => a - b);
  const colors = ["bg-violet-500/70", "bg-cyan-500/60", "bg-fuchsia-500/60", "bg-emerald-500/60", "bg-amber-500/60", "bg-sky-500/60"];
  const labels = [...new Set(tasks.map((t) => t.label))];
  return (
    <div className="w-full max-w-[700px]">
      <div className="relative h-16 overflow-hidden rounded-xl border border-white/12 bg-white/[0.03]">
        {tasks.slice(0, shown).map((t, i) => (
          <span
            key={i}
            className={cn("sim-grow absolute top-2 bottom-2 flex items-center justify-center rounded-md text-[14px] font-bold text-[#ffffff]", colors[labels.indexOf(t.label) % colors.length])}
            style={{ left: `${(t.start / end) * 100}%`, width: `calc(${((t.end - t.start) / end) * 100}% - 2px)` }}
          >
            {t.label}
          </span>
        ))}
        <span className="absolute top-0 bottom-0 w-0.5 bg-[var(--cyan,#22d3ee)] shadow-[0_0_10px_var(--cyan,#22d3ee)] transition-[left] duration-700 ease-out" style={{ left: `${(now / end) * 100}%` }} />
      </div>
      <div className="relative mt-1 h-4">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 text-[10.5px] text-white/50 tabular-nums" style={{ left: `${(t / end) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-white/45">Time{sim.unit ? ` (${sim.unit})` : ""} →</p>
      <Note text={frames[frameAt(Math.max(1, frames.length), share)]?.note} />
    </div>
  );
}

/* ---- graph: a token travels the links (traversal, process states, flows) ---- */
function Graph({ sim, share }: { sim: Sim; share: number }) {
  const nodes = sim.nodes ?? [];
  const frames = sim.frames ?? [];
  const f = frames[frameAt(frames.length, share)];
  const at = (id: string) => nodes.find((n) => n.id === id)!;
  const token = f?.active ? at(f.active) : undefined;
  const isEdge = (a: string, b: string) => !!f?.edge && ((f.edge[0] === a && f.edge[1] === b) || (!sim.directed && f.edge[0] === b && f.edge[1] === a));
  return (
    <div className="w-full max-w-[620px]">
      <svg viewBox="0 0 100 62" className="w-full" role="img" aria-label="Diagram">
        <defs>
          <marker id="sim-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="rgba(167,139,250,0.7)" />
          </marker>
        </defs>
        {(sim.edges ?? []).map(([a, b], i) => {
          const A = at(a);
          const B = at(b);
          const on = isEdge(a, b);
          // stop short of the node circle so arrowheads show
          const dx = B.x - A.x;
          const dy = (B.y - A.y) * 0.62;
          const len = Math.hypot(dx, dy) || 1;
          const k = 6 / len;
          return (
            <line
              key={i}
              x1={A.x + dx * k}
              y1={A.y * 0.62 + dy * k}
              x2={B.x - dx * k}
              y2={B.y * 0.62 - dy * k}
              stroke={on ? "#22d3ee" : "rgba(167,139,250,0.35)"}
              strokeWidth={on ? 0.9 : 0.5}
              strokeDasharray={on ? "2 1.2" : undefined}
              className={on ? "sim-flow" : undefined}
              markerEnd={sim.directed ? "url(#sim-arrow)" : undefined}
            />
          );
        })}
        {nodes.map((n) => {
          const active = f?.active === n.id;
          const visited = f?.visited?.includes(n.id);
          return (
            <g key={n.id}>
              {active && <circle cx={n.x} cy={n.y * 0.62} r="7.5" className="sim-ring" fill="none" stroke="#a78bfa" strokeWidth="0.5" />}
              <circle
                cx={n.x}
                cy={n.y * 0.62}
                r="5.2"
                fill={active ? "#7c3aed" : visited ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.06)"}
                stroke={active ? "#c4b5fd" : visited ? "#22d3ee" : "rgba(255,255,255,0.25)"}
                strokeWidth="0.5"
                style={{ transition: "fill 400ms, stroke 400ms" }}
              />
              <text x={n.x} y={n.y * 0.62 + 0.9} textAnchor="middle" fontSize={n.label.length > 6 ? 2.2 : 2.8} fontWeight={700} fill="currentColor" className="text-white">
                {n.label.length > 10 ? `${n.label.slice(0, 9)}…` : n.label}
              </text>
            </g>
          );
        })}
        {token && <circle cx={token.x} cy={token.y * 0.62 - 6.4} r="1.1" fill="#22d3ee" style={{ transition: "cx 600ms ease, cy 600ms ease" }} />}
      </svg>
      <Note text={f?.note} />
    </div>
  );
}

/* ---- calc: a worked example, step by step, then the answer ---- */
function Calc({ sim, share }: { sim: Sim; share: number }) {
  const steps = sim.steps ?? [];
  const total = steps.length + (sim.result ? 1 : 0);
  const shown = Math.max(1, Math.ceil(total * share));
  return (
    <div className="w-full max-w-[560px] space-y-2">
      {steps.slice(0, shown).map((s, i) => (
        <p key={i} className={cn("explain-pop rounded-lg px-4 py-2 font-mono text-[14.5px] sm:text-[16px]", i === Math.min(shown, steps.length) - 1 ? "bg-white/[0.07] text-white" : "text-white/55")}>
          {s}
        </p>
      ))}
      {sim.result && shown > steps.length && (
        <p className="explain-pop mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-center text-[17px] font-bold text-emerald-200">{sim.result}</p>
      )}
    </div>
  );
}
