"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssistantMessage, Composer, UserBubble, clockTime } from "@/components/chat/parts";
import { Markdown } from "@/components/chat/markdown";
import { ThinkingOrb } from "@/components/chat/thinking-orb";
import { StudyCard } from "@/components/chat/study-card";
import { ActionCard } from "@/components/chat/action-card";
import { MaximizeIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/primitives";
import { AssistantError, OfflineError, askAssistant } from "@/lib/assistant";
import { buildContext } from "@/lib/ai-context";
import { applyAction, markApplied, parseActions } from "@/lib/assistant-actions";
import { parseStudy } from "@/lib/assistant-study";
import type { Attachment } from "@/lib/attachments";
import { chatTitle, newChatId, saveChat, touchChat, type StoredMessage } from "@/lib/chats";
import { starterResume } from "@/lib/resume-starter";
import { useStore } from "@/lib/store";
import { TODAY, uid } from "@/lib/utils";
import { crumbsFor } from "./nav";

type Msg = { id: number; role: "user" | "assistant"; text: string; time: string; failed?: boolean; files?: Attachment[]; error?: boolean };

/* What to suggest on each page, so the first question is one tap away. */
const HINTS: { path: string; asks: string[] }[] = [
  { path: "/placement", asks: ["How do I prepare for TCS in 2 weeks?", "Which aptitude topics should I start with?", "Check if my resume is ready for campus drives"] },
  { path: "/resume", asks: ["Improve my resume summary", "What projects should I add to my resume?", "Make my bullet points stronger"] },
  { path: "/projects", asks: ["Suggest a project for my skills", "How do I explain my project in an interview?", "What should I build next?"] },
  { path: "/tests", asks: ["Which topic am I weakest in?", "Make a 7-day plan from my test results", "Explain my last wrong answers"] },
  { path: "/interview", asks: ["Common HR questions and how to answer", "How do I introduce myself?", "Tips to stay calm in interviews"] },
  { path: "/exam-prep", asks: ["Make a revision plan for my exams", "What should I study first?", "Give me 5 quick questions to check myself"] },
  { path: "/learn", asks: ["I want to learn data structures", "Make notes on this topic", "Which course should I take next?"] },
  { path: "/study-plan", asks: ["Can you revise my study plan?", "I missed a session — can you move it?", "Am I on track?"] },
  { path: "/schedule", asks: ["Plan my week", "Fit study around my classes", "I missed a session — can you move it?"] },
];
const DEFAULT_ASKS = ["Plan my week", "I want to learn data structures", "Where am I in my progress?"];

function pageName(pathname: string) {
  const c = crumbsFor(pathname);
  return c.length ? c[c.length - 1].label : pathname === "/dashboard" ? "Dashboard" : "this page";
}

/* The assistant as a side panel on any page: the page stays open beside it, and the
   conversation is saved to history like the full chat (open it there any time). */
export function SideChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { state, actions } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(1);
  const chatId = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const page = pageName(pathname);
  const asks = HINTS.find((h) => pathname.startsWith(h.path))?.asks ?? DEFAULT_ASKS;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  function persist(list: Msg[]) {
    const keep = list.filter((m) => !m.failed && !m.error);
    const firstUser = keep.find((m) => m.role === "user");
    if (!firstUser) return;
    if (!chatId.current) chatId.current = newChatId();
    const id = chatId.current;
    const stored: StoredMessage[] = keep.map((m) => ({ role: m.role, text: m.text, time: m.time, ...(m.files?.length ? { files: m.files.map((f) => ({ name: f.name, kind: f.kind })) } : {}) }));
    saveChat(id, stored).catch(() => actions.toast("Couldn’t save this chat to history."));
    actions.patch({ chats: touchChat(state.chats, id, chatTitle(firstUser.text)) });
  }

  async function send(text: string, files: Attachment[] = [], retryId?: number) {
    const id = retryId ?? ++idRef.current;
    const base: Msg[] = retryId ? messages.map((x) => (x.id === id ? { ...x, failed: false } : x)) : [...messages, { id, role: "user", text, time: clockTime(), files }];
    setMessages(base);
    setThinking(true);
    try {
      const history = messages
        .filter((m) => !m.failed && !m.error && m.id !== id)
        .map((m) => ({ role: m.role, content: m.text + (m.files?.length ? `\n[Attached earlier: ${m.files.map((f) => f.name).join(", ")}]` : "") }));
      const where = `\nThe student asked this from the "${page}" page of StudentOS (${pathname}). Keep the answer short (it shows in a narrow side panel) and about that page where it fits.`;
      const reply = await askAssistant(text, { history, context: buildContext(state) + where, tone: state.assistant.tone, files });
      const next: Msg[] = [...base, { id: ++idRef.current, role: "assistant", text: reply, time: clockTime() }];
      setMessages(next);
      persist(next);
    } catch (e) {
      if (e instanceof OfflineError) setMessages(base.map((x) => (x.id === id ? { ...x, failed: true } : x)));
      else {
        const next: Msg[] = [...base, { id: ++idRef.current, role: "assistant", text: e instanceof AssistantError ? e.message : "Something went wrong. Please try again.", time: clockTime(), error: true }];
        setMessages(next);
        persist(next);
      }
    } finally {
      setThinking(false);
    }
  }

  function apply(msgId: number, index: number, action: Parameters<typeof applyAction>[0]): string | null {
    const res = applyAction(action, {
      today: TODAY,
      resume: state.resume ?? starterResume(state),
      entries: state.entries ?? [],
      timeline: state.timeline ?? [],
      reply: messages.find((x) => x.id === msgId)?.text,
      addSession: actions.addSession,
      setPrefs: actions.setPrefs,
      patch: actions.patch,
      go: (href) => router.push(href),
      id: uid,
    });
    if (!res.ok) return res.error;
    actions.toast(res.message);
    if (action.type !== "open_page" && action.type !== "download_doc") {
      const list = messages.map((x) => (x.id === msgId ? { ...x, text: markApplied(x.text, index) } : x));
      setMessages(list);
      persist(list);
    }
    return null;
  }

  const fresh = () => {
    chatId.current = null;
    setMessages([]);
  };

  return (
    <>
      {/* phones: the panel covers the screen, with a dim backdrop to tap away */}
      <div aria-hidden onClick={onClose} className={open ? "fixed inset-0 z-40 bg-scrim/50 sm:hidden" : "hidden"} />
      <aside
        role="dialog"
        aria-label="Ask StudentOS"
        aria-hidden={!open}
        inert={!open}
        className={
          "fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-violet-400/20 bg-panel/[0.98] shadow-[-20px_0_60px_rgba(0,0,0,0.55)] backdrop-blur transition-transform duration-300 ease-out sm:w-[420px] " +
          (open ? "translate-x-0" : "pointer-events-none translate-x-full")
        }
      >
        <header className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
          <LogoMark size={22} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white">Ask StudentOS</p>
            <p className="truncate text-[11px] text-white/50">Helping with {page}</p>
          </div>
          <button type="button" onClick={fresh} aria-label="New chat" title="New chat" className="rounded-lg p-2 text-white/65 hover:bg-white/10 hover:text-white">
            <PlusIcon size={15} />
          </button>
          <Link href={chatId.current ? `/assistant?c=${chatId.current}` : "/assistant"} onClick={onClose} aria-label="Open full chat" title="Open full chat" className="rounded-lg p-2 text-white/65 hover:bg-white/10 hover:text-white">
            <MaximizeIcon size={14} />
          </Link>
          <button type="button" onClick={onClose} aria-label="Close" title="Close (Esc)" className="rounded-lg p-2 text-white/65 hover:bg-white/10 hover:text-white">
            <XIcon size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4">
          {messages.length === 0 && !thinking ? (
            <div className="py-8">
              <p className="text-[15px] font-semibold text-white">How can I help with {page}?</p>
              <p className="mt-1 text-[12px] text-white/50">Ask anything. <span className="hidden sm:inline">This page stays open beside the chat.</span><span className="sm:hidden">Close the chat to go back to the page.</span></p>
              <div className="mt-4 flex flex-col gap-2">
                {asks.map((q) => (
                  <button key={q} type="button" onClick={() => send(q)} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-left text-[12.5px] text-white/80 transition hover:border-white/15 hover:bg-white/[0.06]">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 py-5 text-[13.5px]">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} failed={m.failed} files={m.files} onRetry={() => send(m.text, m.files, m.id)}>
                    {m.text}
                  </UserBubble>
                ) : (
                  <AssistantMessage key={m.id} time={m.time}>
                    {(() => {
                      const st = parseStudy(m.text);
                      const parsed = parseActions(st.text);
                      return (
                        <>
                          <Markdown text={parsed.text} />
                          {st.study.map((s) => <StudyCard key={s.topic} s={s} />)}
                          {parsed.actions.map((p) => (
                            <ActionCard key={p.index} action={p.action} applied={p.applied} onApply={() => apply(m.id, p.index, p.action)} />
                          ))}
                        </>
                      );
                    })()}
                  </AssistantMessage>
                ),
              )}
              {thinking && <ThinkingOrb done={false} />}
              <div ref={bottom} />
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.06] px-3 pt-3 pb-3">
          <Composer onSend={(t, f) => send(t, f)} allowFiles disabled={thinking} placeholder={`Ask about ${page}…`} />
          <p className="mt-1.5 text-center text-[10.5px] text-white/40">Saved to your chat history · StudentOS can make mistakes</p>
        </div>
      </aside>
    </>
  );
}
