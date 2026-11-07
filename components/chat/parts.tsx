"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRightIcon, CheckCircleIcon, AlertCircleIcon, FileIcon, MicIcon, PaperclipIcon, RefreshIcon, XIcon } from "@/components/ui/icons";
import { ACCEPT, MAX_FILES, readAttachment, type Attachment } from "@/lib/attachments";
import { MAX_RECORD_SECONDS, VOICE_LANGS, startRecording, transcribe, type Recorder } from "@/lib/voice";
import { LogoMark } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function AssistantMessage({ time, children, className }: { time?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <LogoMark size={22} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[12px] font-semibold text-white">
          StudentOS {time && <span className="ml-1 font-normal text-white/40">{time}</span>}
        </p>
        <div className="text-[14px] leading-relaxed text-white/85">{children}</div>
      </div>
    </div>
  );
}

function fileLabel(name: string, pages?: number) {
  if (/\.pptx$/i.test(name)) return pages ? `Slides · ${pages}` : "Slides";
  if (/\.docx$/i.test(name)) return "Word";
  if (/\.pdf$/i.test(name)) return pages ? `PDF · ${pages} page${pages > 1 ? "s" : ""}` : "PDF";
  return "Text";
}

export function UserBubble({ children, failed, onRetry, files }: { children: ReactNode; failed?: boolean; onRetry?: () => void; files?: Attachment[] }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {files && files.length > 0 && (
        <div className="flex max-w-[80%] flex-wrap justify-end gap-1.5">
          {files.map((f) =>
            f.kind === "image" && f.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={f.dataUrl} alt={f.name} className="h-24 max-w-[180px] rounded-lg border border-white/10 object-cover" />
            ) : (
              <span key={f.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] text-white/80">
                <FileIcon size={12} /> {f.name}
              </span>
            ),
          )}
        </div>
      )}
      <div className={cn("max-w-[80%] rounded-xl px-3.5 py-2 text-[13px] text-white", failed ? "bg-plum-strong/60 text-white/60" : "bg-plum-strong")}>{children}</div>
      {failed && (
        <p className="flex items-center gap-3 text-[11.5px] text-rose-400">
          <span className="flex items-center gap-1.5">
            <AlertCircleIcon size={12} /> Couldn’t send — check your connection.
          </span>
          <button type="button" onClick={onRetry} className="flex items-center gap-1 font-semibold text-white hover:underline">
            <RefreshIcon size={12} /> Retry
          </button>
        </p>
      )}
    </div>
  );
}

/* Saved-answer pill: “✓ Goal: Finish CS50’s Python course  Edit” */
export function AnswerChip({ children, onEdit }: { children: ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] items-center gap-2 rounded-lg border border-violet-400/15 bg-plum/80 px-3 py-1.5 text-[12px] text-white/85">
        <CheckCircleIcon size={13} className="shrink-0 text-emerald-400" />
        <span className="truncate">{children}</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="font-medium text-cyan-300 hover:underline">
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export function Thinking() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={22} />
      <span className="flex h-6 items-center gap-1 rounded-full bg-white/[0.06] px-2.5" aria-label="StudentOS is thinking">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-dot rounded-full bg-cyan-300" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
      <span className="text-[12px] text-white/50">Thinking…</span>
    </div>
  );
}

/* Message box at the bottom of every chat. */
export function Composer({
  onSend,
  disabled,
  placeholder = "Message StudentOS…",
  tools,
  tall,
  showMic,
  allowFiles,
  preset,
}: {
  onSend: (text: string, files: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Extra quick-action buttons next to the attach icon */
  tools?: ReactNode;
  tall?: boolean;
  /** kept for older callers; the mic is always shown now */
  showMic?: boolean;
  /** show the attach (paperclip) button */
  allowFiles?: boolean;
  /** files to attach when this changes (e.g. a study material opened with “Ask AI”) */
  preset?: Attachment[];
}) {
  void showMic;
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [reading, setReading] = useState(0);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("en-IN");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("studentos:voice-lang");
      if (saved && VOICE_LANGS.some((l) => l.value === saved)) setLang(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rec = useRef<Recorder | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [recSecs, setRecSecs] = useState(0);

  useEffect(() => () => rec.current?.cancel(), []);
  useEffect(() => {
    if (preset?.length) setFiles(preset.slice(0, MAX_FILES));
  }, [preset]);
  useEffect(() => {
    if (!listening) return;
    setRecSecs(0);
    const t = setInterval(() => setRecSecs((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  const canSend = (text.trim() || files.length > 0) && !disabled && reading === 0 && !listening && !transcribing;
  const send = () => {
    if (!canSend) return;
    const t = text.trim() || (files.some((f) => f.kind === "image") ? "What’s in this image? Explain it simply." : "Summarise this file and list the key points.");
    onSend(t, files);
    setText("");
    setFiles([]);
    setError("");
    ref.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    setError("");
    const room = MAX_FILES - files.length;
    const picked = Array.from(list).slice(0, Math.max(0, room));
    if (list.length > room) setError(`You can attach up to ${MAX_FILES} files.`);
    for (const f of picked) {
      setReading((n) => n + 1);
      try {
        const a = await readAttachment(f);
        setFiles((cur) => (cur.length < MAX_FILES ? [...cur, a] : cur));
        if (a.truncated) setError(`${a.name} is long, so only the first part will be sent.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn’t read that file.");
      } finally {
        setReading((n) => n - 1);
      }
    }
  };

  // Tap to record, tap again to stop; the recording is turned into text and added to the box.
  const toggleMic = async () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    setError("");
    try {
      rec.current = await startRecording(async (audio) => {
        setListening(false);
        rec.current = null;
        if (audio.size < 2000) {
          setError("That was too short. Hold on a moment longer and speak.");
          return;
        }
        setTranscribing(true);
        try {
          const said = await transcribe(audio, lang);
          if (said) setText((t) => (t.trim() ? `${t.trimEnd()} ${said}` : said));
          else setError("Didn’t catch any words. Try again.");
          ref.current?.focus();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn’t turn that into text.");
        } finally {
          setTranscribing(false);
        }
      });
      setListening(true);
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Allow microphone access in your browser to use voice typing."
          : name === "NotFoundError"
            ? "No microphone found. Plug one in or check your sound settings."
            : "Voice typing isn’t supported in this browser.",
      );
    }
  };

  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-raised/90 p-3.5 backdrop-blur transition", disabled && "opacity-60", listening && "border-rose-400/40")}>
      {(files.length > 0 || reading > 0) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <span key={f.id} className="flex max-w-[240px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-1 pr-1 pl-1.5 text-[12px] text-white/85">
              {f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.dataUrl} alt="" className="h-7 w-7 rounded object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded bg-white/[0.06] text-white/60">
                  <FileIcon size={13} />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate">{f.name}</span>
                <span className="block text-[10.5px] text-white/45">{f.kind === "image" ? "Image" : fileLabel(f.name, f.pages)}</span>
              </span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((x) => x.id !== f.id))} className="rounded p-1 text-white/50 hover:bg-white/[0.08] hover:text-white">
                <XIcon size={12} />
              </button>
            </span>
          ))}
          {reading > 0 && <span className="flex items-center rounded-lg border border-dashed border-white/15 px-3 py-1 text-[12px] text-white/55">Reading file…</span>}
        </div>
      )}
      <textarea
        ref={ref}
        rows={tall ? 3 : 2}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onPaste={(e) => allowFiles && e.clipboardData.files.length > 0 && (e.preventDefault(), addFiles(e.clipboardData.files))}
        placeholder={listening ? "Recording… speak now, then tap the mic to stop" : transcribing ? "Turning your voice into text…" : placeholder}
        aria-label="Message StudentOS"
        className="w-full resize-none bg-transparent text-[13.5px] text-white placeholder:text-white/45 outline-none"
      />
      {error && <p className="mb-1 text-[11.5px] text-amber-400">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        {allowFiles && (
          <>
            <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
            <button
              type="button"
              aria-label="Attach a file"
              title="Attach a PDF, notes, code or a photo"
              disabled={disabled || files.length >= MAX_FILES}
              onClick={() => fileRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.06] disabled:opacity-40"
            >
              <PaperclipIcon size={14} />
            </button>
          </>
        )}
        {tools}
        <span className="ml-auto hidden text-[11px] text-white/40 sm:block">{listening ? `Recording ${Math.floor(recSecs / 60)}:${String(recSecs % 60).padStart(2, "0")} (max ${MAX_RECORD_SECONDS}s) · tap mic to stop` : transcribing ? "Converting…" : "Enter to send · Shift + Enter for a new line"}</span>
        <select
          aria-label="Voice typing language"
          value={lang}
          disabled={listening}
          onChange={(e) => {
            setLang(e.target.value);
            try {
              localStorage.setItem("studentos:voice-lang", e.target.value);
            } catch {
              /* ignore */
            }
          }}
          className="h-8 rounded-lg border border-white/10 bg-transparent px-1.5 text-[11.5px] text-white/70 outline-none hover:bg-white/[0.06] [&>option]:bg-[#1a1a1f] [&>option]:text-white"
        >
          {VOICE_LANGS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={listening ? "Stop voice typing" : "Voice typing"}
          aria-pressed={listening}
          title="Voice typing"
          disabled={disabled || transcribing}
          onClick={toggleMic}
          className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition", listening ? "animate-pulse bg-rose-500/90 text-[#ffffff]" : "text-white/60 hover:bg-white/[0.06]")}
        >
          <MicIcon size={15} />
        </button>
        <button
          type="button"
          onClick={send}
          aria-label="Send"
          disabled={!canSend}
          className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition", canSend ? "bg-accent text-black" : "bg-white/[0.07] text-white/60")}
        >
          <ArrowRightIcon size={14} />
        </button>
      </div>
    </div>
  );
}

export function Disclaimer() {
  return <p className="mt-2 text-center text-[11px] text-white/40">StudentOS can make mistakes. You review every plan before it’s saved.</p>;
}

export function clockTime(d = new Date()) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
