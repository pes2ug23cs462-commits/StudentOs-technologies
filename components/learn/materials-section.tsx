"use client";

/* Learning → My materials: notes, slides and past papers a student uploads.
   Files are read in the browser and only their text is saved (no paid storage).
   From each material the student can ask the AI about it or take a quick
   revision quiz made from it. */

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { RevisionQuiz } from "@/components/learn/revision-quiz";
import { Button } from "@/components/ui/button";
import { BookIcon, ChatIcon, CheckCircleIcon, FileIcon, LockIcon, PaperclipIcon, PlusIcon, TrashIcon, TrophyIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { readImageText } from "@/lib/assistant";
import { readAttachment } from "@/lib/attachments";
import { FREE_MATERIAL_LIMIT, KIND_LABEL, MATERIAL_CHARS, MATERIAL_MAX_BYTES, deleteMaterialText, kindOf, saveMaterialText, type MaterialMeta } from "@/lib/materials";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ACCEPT_MATERIALS = ".pdf,.docx,.pptx,.txt,.md,.csv,image/png,image/jpeg,image/webp";

type Job = { id: string; name: string; status: string; error?: string };

export function MaterialsSection() {
  const { state, actions } = useStore();
  const router = useRouter();
  const materials = state.materials ?? [];
  const latest = useRef(materials);
  latest.current = materials;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const [quizFor, setQuizFor] = useState<MaterialMeta | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateJob = (id: string, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const upload = async (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    const room = FREE_MATERIAL_LIMIT - latest.current.length;
    if (room <= 0) {
      actions.toast(`Free plan: up to ${FREE_MATERIAL_LIMIT} materials. Delete one to add more.`);
      return;
    }
    if (files.length > room) actions.toast(`Only ${room} more fit on the Free plan, so the rest were skipped.`);
    for (const file of files.slice(0, room)) {
      const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      setJobs((js) => [...js, { id, name: file.name, status: "Reading…" }]);
      try {
        const a = await readAttachment(file, { maxChars: MATERIAL_CHARS, maxBytes: MATERIAL_MAX_BYTES });
        let text = a.text ?? "";
        let truncated = a.truncated;
        if (a.kind === "image") {
          updateJob(id, { status: "Reading the photo with AI…" });
          text = await readImageText(a.dataUrl!);
          truncated = false;
          if (!text) throw new Error(`Couldn’t find any text in ${file.name}.`);
        }
        updateJob(id, { status: "Saving…" });
        await saveMaterialText(id, text);
        const meta: MaterialMeta = {
          id,
          name: file.name,
          kind: kindOf(file.name, a.kind === "image"),
          ...(a.pages ? { pages: a.pages } : {}),
          chars: text.length,
          ...(truncated ? { truncated: true } : {}),
          addedAt: new Date().toISOString(),
        };
        const next = [meta, ...latest.current];
        latest.current = next;
        actions.patch({ materials: next });
        setJobs((js) => js.filter((j) => j.id !== id));
        actions.toast(truncated ? `${file.name} added (long file: the first part was saved).` : `${file.name} added.`);
      } catch (e) {
        updateJob(id, { status: "", error: e instanceof Error ? e.message : `Couldn’t add ${file.name}.` });
      }
    }
  };

  const remove = (m: MaterialMeta) => {
    deleteMaterialText(m.id);
    const next = latest.current.filter((x) => x.id !== m.id);
    latest.current = next;
    actions.patch({ materials: next });
    setConfirmDelete(null);
    actions.toast(`${m.name} deleted.`);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    upload(e.dataTransfer.files);
  };

  const input = (
    <input ref={fileRef} type="file" multiple accept={ACCEPT_MATERIALS} className="hidden" onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
  );

  return (
    <div onDragOver={(e) => (e.preventDefault(), setDrag(true))} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
      {input}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-white">Study materials</h2>
          <p className="mt-0.5 text-[12.5px] text-white/55">Notes, slides and past papers StudentOS can use to answer your questions and quiz you.</p>
        </div>
        {materials.length > 0 && (
          <Button variant="primary" icon={<PaperclipIcon size={14} />} onClick={() => fileRef.current?.click()}>
            Upload
          </Button>
        )}
      </div>

      {jobs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {jobs.map((j) => (
            <li key={j.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-[12.5px]", j.error ? "border-rose-400/30 bg-rose-500/[0.06]" : "border-white/10 bg-white/[0.03]")}>
              <FileIcon size={14} className={j.error ? "text-rose-400" : "text-white/60"} />
              <span className="min-w-0 flex-1 truncate text-white">{j.name}</span>
              <span className={j.error ? "text-rose-300" : "animate-pulse text-white/55"}>{j.error ?? j.status}</span>
              {j.error && (
                <button type="button" onClick={() => setJobs((js) => js.filter((x) => x.id !== j.id))} className="text-[12px] text-white/50 hover:text-white">
                  Dismiss
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {materials.length === 0 ? (
        <div
          className={cn(
            "mt-5 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center transition",
            drag ? "border-accent bg-accent/[0.06]" : "border-white/15 bg-white/[0.02]",
          )}
        >
          <div className="relative h-20 w-28">
            <span className="absolute top-2 left-0 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <PlusIcon size={15} />
            </span>
            <span className="absolute top-0 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-2xl border border-white/10 bg-raised text-accent shadow-xl">
              <PaperclipIcon size={26} />
            </span>
            <span className="absolute right-0 bottom-1 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
              <FileIcon size={14} />
            </span>
          </div>
          <p className="mt-5 text-[16px] font-semibold text-white">No study materials yet</p>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-white/55">
            Upload lecture notes, slides or past papers. StudentOS answers your questions from them and turns them into quick revision quizzes.
          </p>
          <Button variant="primary" className="mt-5" icon={<PaperclipIcon size={14} />} onClick={() => fileRef.current?.click()}>
            Upload files
          </Button>
          <p className="mt-3 text-[11.5px] text-white/40">Drag files here · PDF, Word, PowerPoint, text or photos of notes · up to 25 MB each</p>
        </div>
      ) : (
        <div className={cn("mt-5 grid gap-3 rounded-2xl transition md:grid-cols-2 xl:grid-cols-3", drag && "outline-2 outline-offset-4 outline-accent outline-dashed")}>
          {materials.map((m) => (
            <Card key={m.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10.5px] font-bold",
                    m.kind === "pdf" ? "bg-rose-500/15 text-rose-300" : m.kind === "pptx" ? "bg-amber-400/15 text-amber-300" : m.kind === "docx" ? "bg-sky-400/15 text-sky-300" : m.kind === "image" ? "bg-violet-500/15 text-violet-300" : "bg-white/[0.06] text-white/70",
                  )}
                >
                  {{ pdf: "PDF", docx: "DOC", pptx: "PPT", text: "TXT", image: "IMG" }[m.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-white" title={m.name}>
                    {m.name}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-white/50">
                    {KIND_LABEL[m.kind]}
                    {m.pages ? ` · ${m.pages} ${m.kind === "pptx" ? "slides" : "pages"}` : ""} · ~{Math.max(1, Math.round(m.chars / 6)).toLocaleString("en-IN")} words ·{" "}
                    {new Date(m.addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  {m.truncated && <p className="mt-0.5 text-[11px] text-amber-400">Long file: only the first part was saved.</p>}
                </div>
              </div>
              {confirmDelete === m.id ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/[0.08] px-3 py-2">
                  <span className="flex-1 text-[12px] text-rose-300">Delete this material?</span>
                  <Button size="xs" variant="danger" onClick={() => remove(m)}>
                    Delete
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="xs" icon={<ChatIcon size={12} />} onClick={() => router.push(`/assistant?m=${m.id}`)}>
                    Ask AI
                  </Button>
                  <Button size="xs" variant="primary" icon={<TrophyIcon size={12} />} onClick={() => setQuizFor(m)}>
                    Quick revision
                  </Button>
                  <button type="button" aria-label={`Delete ${m.name}`} onClick={() => setConfirmDelete(m.id)} className="ml-auto rounded-md p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-rose-400">
                    <TrashIcon size={14} />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { Icon: ChatIcon, title: "Ask about them", sub: "StudentOS answers using your own notes." },
          { Icon: CheckCircleIcon, title: "Quick revision", sub: "Get short quizzes made from your uploads." },
          { Icon: LockIcon, title: "Private to you", sub: "Only the text is saved, in your own account." },
        ].map(({ Icon, title, sub }) => (
          <div key={title} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Icon size={15} className="text-accent" />
            <p className="mt-2 text-[13px] font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-[11.5px] text-white/50">{sub}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-white/40">
        <BookIcon size={12} /> Free plan: up to {FREE_MATERIAL_LIMIT} materials ({materials.length} used).
      </p>

      {quizFor && <RevisionQuiz material={quizFor} onClose={() => setQuizFor(null)} />}
    </div>
  );
}
