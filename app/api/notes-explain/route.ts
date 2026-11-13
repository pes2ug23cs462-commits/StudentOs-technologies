/* POST /api/notes-explain  (Premium)
   { title, summary, sections: [{ heading, points[] }], terms: [{ term, meaning }], profile? }
     → { scenes: Scene[] }  (see lib/explainer.ts)
   Turns a student's notes into a short animated lesson with a spoken script. */

import { NextResponse } from "next/server";
import { sanitizeScenes } from "@/lib/explainer";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";
import { isPremium } from "@/lib/server/premium";

export const maxDuration = 60;

const s = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function parse(raw: string): unknown {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(raw.slice(a, b + 1));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!(await isPremium(uid))) return NextResponse.json({ error: "premium" }, { status: 402 });
  const quota = await takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = s(b.title, 100);
  const sections = (Array.isArray(b.sections) ? b.sections : [])
    .slice(0, 8)
    .map((x) => x as { heading?: unknown; points?: unknown[] })
    .map((x) => `## ${s(x.heading, 80)}\n${(Array.isArray(x.points) ? x.points : []).slice(0, 7).map((p) => `- ${s(p, 260)}`).join("\n")}`)
    .join("\n");
  const terms = (Array.isArray(b.terms) ? b.terms : []).slice(0, 10).map((t) => t as { term?: unknown; meaning?: unknown }).map((t) => `- ${s(t.term, 60)}: ${s(t.meaning, 200)}`).join("\n");
  if (!title || sections.length < 40) return NextResponse.json({ error: "too-short" }, { status: 400 });

  const prompt = `You are a friendly, expert teacher in India. Turn these study notes into a short animated explainer lesson that a narrator will read aloud to a ${s(b.profile, 200) || "college student"}.
NOTES — "${title}"
Summary: ${s(b.summary, 500)}
${sections}
${terms ? `Key terms:\n${terms}` : ""}

Make 5–8 scenes in a teaching order: scene 1 hooks the student and says what they will learn; middle scenes explain one idea each, building up; the last scene is a quick recap.
Spoken "lines": 2–4 per scene, each ONE sentence under 170 characters, warm and conversational, simple English, speak to "you". Explain the WHY, use a relatable everyday or Indian example or analogy where it helps. Stick to the facts in the notes; never invent facts. No markdown, no emojis, no symbols the narrator can't read aloud (write "is greater than", not ">").
Each scene gets ONE visual. MOST IMPORTANT: show REAL WORKED EXAMPLES that move, not just text. At least half of the scenes (and every scene about a process, algorithm, calculation or change over time) must use a SIMULATION with real example data taken from or consistent with the notes, with correct numbers you have actually worked out. A simulation has "frames": one frame per spoken line, in the same order, so the picture changes exactly as the narrator explains each step (2–6 frames). Each frame may have a short "note" (under 10 words) shown under the picture.
SIMULATIONS (put the data in "sim"):
- "bars": numbers that change, e.g. book value each year, marks, populations. sim: {"labels":["Year 0","Year 1",...],"unit":"₹","frames":[{"values":[...],"note":"..."}]} (values same length as labels)
- "array": an algorithm on a list (sorting, searching, two pointers). sim: {"frames":[{"items":["5","2","8"],"hl":[0,1],"done":[],"note":"compare 5 and 2"}]} (hl = positions being compared/swapped, done = positions final)
- "stack": push/pop or enqueue/dequeue. sim: {"mode":"stack" or "queue","frames":[{"items":["A","B"],"note":"push B"}]} (items bottom→top or front→back)
- "gantt": tasks on a timeline (CPU scheduling, project phases). sim: {"unit":"ms","tasks":[{"label":"P1","start":0,"end":5}],"frames":[{"note":"..."}]} (tasks appear in order as lines are spoken)
- "graph": nodes and links with something moving through them (BFS/DFS, process states, circuits, food chains, networks). sim: {"directed":true,"nodes":[{"id":"A","label":"Ready","x":10,"y":50}],"edges":[["A","B"]],"frames":[{"active":"A","visited":[],"edge":["A","B"],"note":"..."}]} (x,y from 0 to 100, spread out, max 9 nodes)
- "calc": a worked calculation with real numbers substituted step by step. sim: {"steps":["D = (C − S) ÷ N","D = (50,000 − 5,000) ÷ 5","D = 45,000 ÷ 5"],"result":"D = ₹9,000 per year"}
OTHER VISUALS (use only where no simulation fits, e.g. the opening and the recap):
- "title": big title with up to 4 short tags (items) — for the opening scene
- "flow": 3–5 steps of a process in order (items); "cycle": 3–6 stages in a loop (items)
- "compare": "left" and "right", each {"label","points":[2–4 short points]}
- "cards": 2–5 key facts (items); "steps": 3–5 numbered steps (items)
Items are {"label": under 6 words, "note": optional, under 15 words}.
Make the lines describe exactly what the picture is doing in that frame ("Now P2 arrives and waits in the queue…").
Reply with JSON only:
{"scenes":[{"title":"...","lines":["..."],"visual":{"type":"bars","sim":{"labels":["..."],"frames":[{"values":[1,2],"note":"..."}]}}},{"title":"...","lines":["..."],"visual":{"type":"flow","items":[{"label":"...","note":"..."}]}}]}`;

  try {
    for (let i = 0; i < 2; i++) {
      const { text } = await chat([{ role: "user", content: prompt }], { maxTokens: 6000, temperature: 0.5 });
      const scenes = sanitizeScenes(parse(text));
      if (scenes.length >= 3) return NextResponse.json({ scenes });
    }
    return NextResponse.json({ error: "failed" }, { status: 502 });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
