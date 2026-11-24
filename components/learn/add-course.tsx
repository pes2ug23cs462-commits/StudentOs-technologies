"use client";

/* Learning → Courses → "Add course". Paste a YouTube link, or type a topic and pick one of
   the most-viewed videos for it. Either way it becomes a course in My courses
   (modules + short lessons) through /learn/watch, like any popular video. */

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { Input, Label } from "@/components/ui/primitives";
import { VideoTile } from "./popular-videos";
import { useTopVideos } from "./use-top-videos";

/** YouTube video id from a watch, youtu.be, shorts, embed or live link (or a bare id). */
export function youtubeId(text: string) {
  const t = text.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : "";
}

export function AddCourseButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="primary" icon={<PlusIcon size={13} />} onClick={() => setOpen(true)}>
        Add course
      </Button>
      {open && <AddCourseDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddCourseDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const { loading, videos, available } = useTopVideos(topic ? `${topic} full course` : undefined, 8);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return setError("Paste a YouTube link or type a topic.");
    setError("");
    const id = youtubeId(v);
    if (id) return router.push(`/learn/watch?v=${id}`);
    if (/^https?:\/\//i.test(v)) return setError("That link isn’t a YouTube video. Paste a youtube.com or youtu.be link.");
    setTopic(v.slice(0, 80));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/70" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="add-course-title" className="relative max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-xl border border-white/10 bg-raised p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="add-course-title" className="text-[15px] font-semibold text-white">Add a course</h2>
            <p className="mt-1 text-[12.5px] text-white/55">Paste a YouTube video link, or type a topic and pick a video. It’s added to My courses, split into short lessons, with notes and progress.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/50 hover:bg-white/[0.06] hover:text-white">
            <XIcon size={14} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4">
          <Label htmlFor="add-course-input">YouTube link or topic</Label>
          <div className="mt-1.5 flex gap-2">
            <Input id="add-course-input" className="flex-1" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. https://youtu.be/… or “DBMS normalization”" invalid={!!error} />
            <Button type="submit" variant="primary">
              {youtubeId(text) ? "Add" : "Search"}
            </Button>
          </div>
          {error && <p className="mt-1.5 text-[12px] text-rose-400">{error}</p>}
        </form>
        {topic && (
          <div className="mt-5">
            <p className="text-[12px] text-white/55">Most viewed videos for “{topic}”. Pick one to add it.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {loading
                ? Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/[0.05]" />)
                : videos.slice(0, 4).map((v) => <VideoTile key={v.id} v={v} href={`/learn/watch?v=${v.id}&q=${encodeURIComponent(`${topic} full course`)}`} />)}
            </div>
            {!loading && !videos.length && (
              <p className="mt-2 text-[12px] text-white/50">{available ? "No videos found. Try a different topic." : "Video search needs the YouTube key. Paste a YouTube link instead."}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
