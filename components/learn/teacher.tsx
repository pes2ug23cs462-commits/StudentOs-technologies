"use client";

/* "Follow this teacher". A student who likes how one YouTube teacher explains a chapter
   (say Units and Measurement) gets the next chapters from the same teacher:
   - plan and session videos search that teacher's channel first (useTeacherVideos),
   - and they can turn the teacher's chapter-wise playlist into a full course here. */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, SpinnerIcon, UserIcon, XIcon } from "@/components/ui/icons";
import { Card, Input } from "@/components/ui/primitives";
import { useLearning } from "./use-learning";
import { useTopVideos } from "./use-top-videos";
import { teacherCourseId, teacherFor, type Course, type Teacher } from "@/lib/learn";
import type { SetupData } from "@/lib/setup";
import { hms, ytFetch, type YtVideo } from "@/lib/youtube";
import { cn } from "@/lib/utils";

const SCIENCE = ["Physics", "Chemistry", "Mathematics", "Biology"];
const COMMERCE = ["Accountancy", "Business Studies", "Economics", "Statistics"];

/** Subjects to offer as chips, from the student's class and stream. */
export function subjectChoices(a: SetupData["academic"] | undefined): string[] {
  const f = a?.field ?? "";
  if (/PCMB/.test(f)) return SCIENCE;
  if (/PCM/.test(f)) return ["Physics", "Chemistry", "Mathematics"];
  if (/PCB/.test(f)) return ["Physics", "Chemistry", "Biology"];
  if (/Commerce/i.test(f)) return COMMERCE;
  return a?.type === "school" ? SCIENCE : [];
}

/** "1st PUC" / "2nd PUC" for Karnataka PU, else "Class 11" / "Class 12", else "". Used to find the right playlist. */
export function levelLabel(a: SetupData["academic"] | undefined) {
  if (a?.type !== "school") return "";
  const pu = /PU|Karnataka/i.test(`${a.course} ${a.college}`);
  if (a.year === "Class 11") return pu ? "1st PUC" : "Class 11";
  if (a.year === "Class 12") return pu ? "2nd PUC" : "Class 12";
  return a.year;
}

/** Card under the player: follow the teacher of this video for a subject. */
export function FollowTeacher({ videoId, channel, hint, subject: fixed }: { videoId: string; channel: string; hint: string; /** known subject (Exam Prep): no subject picker */ subject?: string }) {
  const { state, learning, setTeacher } = useLearning();
  const academic = state.setup?.academic;
  const choices = fixed ? [] : subjectChoices(academic);
  const following = Object.values(learning.teachers ?? {}).filter((t) => t.channel === channel && (!fixed || teacherFor(learning, fixed)?.channel === channel));
  const guess = fixed ?? choices.find((c) => new RegExp(`\\b${c}\\b`, "i").test(hint)) ?? "";
  const [subject, setSubject] = useState(guess);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [courseFor, setCourseFor] = useState<Teacher | null>(null);

  if (!channel) return null;

  const follow = async () => {
    const s = subject.trim();
    if (!s) return setError("Pick or type the subject.");
    setBusy(true);
    setError("");
    try {
      let channelId = learning.videos?.[videoId]?.channelId ?? "";
      if (!channelId) {
        const j = (await (await ytFetch(`/api/video-info?ids=${videoId}`)).json()) as { videos?: YtVideo[] };
        channelId = j.videos?.[0]?.channelId ?? "";
      }
      if (!channelId) return setError("Couldn’t reach YouTube right now. Try again in a minute.");
      setTeacher(s, { channelId, channel });
    } catch {
      setError("Couldn’t reach YouTube right now. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
          <UserIcon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          {following.length ? (
            <>
              <p className="text-[13.5px] font-semibold text-white">
                You follow {channel} for {following.map((t) => t.subject).join(", ")}
              </p>
              <p className="mt-0.5 text-[12px] text-white/55">Videos for your next chapters come from this teacher first. If they haven’t covered a chapter, you’ll see other popular teachers.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {following.map((t) => (
                  <Button key={t.subject} size="sm" variant="primary" onClick={() => setCourseFor(t)}>
                    Make a full {t.subject} course from {channel}
                  </Button>
                ))}
                {following.map((t) => (
                  <Button key={`x${t.subject}`} size="sm" variant="ghost" onClick={() => setTeacher(t.subject, null)}>
                    Stop following for {t.subject}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[13.5px] font-semibold text-white">Like how {channel} teaches?</p>
              <p className="mt-0.5 text-[12px] text-white/55">Follow this teacher for a subject and your next chapters will come from the same teacher.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSubject(c)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[12.5px] transition",
                      subject === c ? "border-accent/60 bg-accent/10 text-accent" : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25",
                    )}
                  >
                    {subject === c && <CheckIcon size={12} />} {c}
                  </button>
                ))}
                {!fixed && <Input
                  aria-label="Subject"
                  value={choices.includes(subject) ? "" : subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={choices.length ? "Other subject" : "Subject, e.g. DBMS"}
                  className="h-8 w-[160px] text-[12.5px]"
                />}
                <Button size="sm" variant="primary" loading={busy} onClick={() => void follow()}>
                  Follow for {subject.trim() || "this subject"}
                </Button>
              </div>
              {error && <p className="mt-1.5 text-[12px] text-rose-400">{error}</p>}
            </>
          )}
        </div>
      </div>
      {courseFor && <TeacherCourseDialog teacher={courseFor} level={levelLabel(academic)} onClose={() => setCourseFor(null)} />}
    </Card>
  );
}

type Playlist = { id: string; title: string; channel: string; count: number };

/** Pick one of the teacher's playlists for the subject; it becomes a course (one module per video). */
function TeacherCourseDialog({ teacher, level, onClose }: { teacher: Teacher; level: string; onClose: () => void }) {
  const router = useRouter();
  const { addCustom } = useLearning();
  const q = `${level} ${teacher.subject}`.trim();
  const [state, setState] = useState<{ loading: boolean; lists: Playlist[]; error: string }>({ loading: true, lists: [], error: "" });
  const [making, setMaking] = useState("");

  useEffect(() => {
    let alive = true;
    ytFetch(`/api/teacher?channel=${teacher.channelId}&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j: { playlists?: Playlist[]; reason?: string }) => alive && setState({ loading: false, lists: j.playlists ?? [], error: j.reason ? "Couldn’t reach YouTube right now. Try again later." : "" }))
      .catch(() => alive && setState({ loading: false, lists: [], error: "Couldn’t reach YouTube right now. Try again later." }));
    return () => {
      alive = false;
    };
  }, [teacher.channelId, q]);

  const make = async (p: Playlist) => {
    setMaking(p.id);
    try {
      const j = (await (await ytFetch(`/api/teacher?playlist=${p.id}`)).json()) as { videos?: YtVideo[] };
      const videos = j.videos ?? [];
      if (!videos.length) return setState((s) => ({ ...s, error: "This playlist has no videos that can play here. Pick another one." }));
      const course: Course = {
        id: teacherCourseId(p.id),
        title: p.title,
        blurb: `${teacher.subject} by ${teacher.channel}, chapter by chapter.`,
        areas: [],
        skills: [],
        level: "beginner",
        quiz: [],
        why: `You follow ${teacher.channel} for ${teacher.subject}.`,
        modules: videos.map((v, i) => ({ id: `m${i + 1}`, title: v.title, yt: `v:${v.id}`, topic: "", channel: v.channel, length: v.seconds ? hms(v.seconds) : "", about: "" })),
      };
      addCustom(course);
      router.push(`/learn/${course.id}`);
    } catch {
      setState((s) => ({ ...s, error: "Couldn’t reach YouTube right now. Try again later." }));
    } finally {
      setMaking("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/70" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="tc-title" className="relative max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-xl border border-white/10 bg-raised p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="tc-title" className="text-[15px] font-semibold text-white">
              {teacher.subject} course from {teacher.channel}
            </h2>
            <p className="mt-1 text-[12.5px] text-white/55">Pick the playlist that matches your class. Each video becomes a module with progress and notes.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/50 hover:bg-white/[0.06] hover:text-white">
            <XIcon size={14} />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {state.loading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-white/[0.05]" />)
          ) : state.lists.length ? (
            state.lists.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!!making}
                onClick={() => void make(p)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition hover:border-accent/50 disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="line-clamp-1 text-[13px] font-medium text-white">{p.title}</span>
                  <span className="text-[11.5px] text-white/50">{p.count} videos</span>
                </span>
                {making === p.id ? <SpinnerIcon size={14} className="animate-spin text-accent" /> : <span className="text-[12px] font-semibold text-accent">Make course</span>}
              </button>
            ))
          ) : (
            !state.error && <p className="text-[12.5px] text-white/55">{teacher.channel} has no {q} playlist we could find. Your next chapter videos will still come from this teacher first.</p>
          )}
          {state.error && <p className="text-[12px] text-rose-400">{state.error}</p>}
        </div>
      </div>
    </div>
  );
}

/** Videos for a topic from the followed teacher first; other popular teachers when they have none. */
export function useTeacherVideos(q: string | undefined, min: number, teacher: Teacher | undefined, kind: "any" | "oneshot" | "lecture" = "any") {
  const mine = useTopVideos(q && teacher ? q : undefined, min, kind, teacher?.channelId);
  const fallback = !teacher || (!mine.loading && !mine.videos.length);
  const all = useTopVideos(fallback ? q : undefined, min, kind);
  if (teacher && (mine.loading || mine.videos.length)) return { ...mine, teacher, fromTeacher: true as const };
  return { ...all, teacher, fromTeacher: false as const };
}
