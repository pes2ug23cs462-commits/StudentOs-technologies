"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssistantMessage, Composer, Disclaimer, UserBubble, clockTime } from "@/components/chat/parts";
import { ThinkingOrb } from "@/components/chat/thinking-orb";
import { RescheduleDrawer } from "@/components/reschedule/reschedule-drawer";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronDownIcon, LockIcon, PlanIcon, PlusIcon, RefreshIcon, TargetIcon, TrashIcon } from "@/components/ui/icons";
import { AssistantError, OfflineError, askAssistant } from "@/lib/assistant";
import { buildContext } from "@/lib/ai-context";
import { MAX_TEXT_CHARS, type Attachment } from "@/lib/attachments";
import { loadMaterialText } from "@/lib/materials";
import { Markdown } from "@/components/chat/markdown";
import { Logo3D } from "@/components/chat/logo-3d";
import { ChatListItem } from "@/components/chat/chat-list-item";
import { chatTitle, loadChat, newChatId, saveChat, sortChats, touchChat, useChatsUnlocked, type StoredMessage } from "@/lib/chats";
import { PinDialog } from "@/components/chat/chat-dialogs";
import { nextSession } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { NOW, TODAY, cn, greeting, uid } from "@/lib/utils";
import { ActionCard } from "@/components/chat/action-card";
import { applyAction, markApplied, parseActions } from "@/lib/assistant-actions";
import { starterResume } from "@/lib/resume-starter";

type Msg = { id: number; role: "user" | "assistant"; text: string; time: string; failed?: boolean; files?: Attachment[]; error?: boolean };

export default function AssistantPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, actions } = useStore();
  const rawFirst = state.profile.name.trim().split(/\s+/)[0] || "there";
  const first = rawFirst === rawFirst.toUpperCase() && rawFirst.length > 1 ? rawFirst[0] + rawFirst.slice(1).toLowerCase() : rawFirst;
  const conv = params.get("c");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  // the orb turns green and folds away for a moment before the answer appears
  const [orbDone, setOrbDone] = useState(false);
  // newest answer: its paragraphs blur in once
  const [fresh, setFresh] = useState<number | null>(null);
  // send animation: the message box squeezes and a ball flies up to the orb
  const [launch, setLaunch] = useState(0);
  const [loadingChat, setLoadingChat] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const idRef = useRef(10);
  const bottom = useRef<HTMLDivElement>(null);
  // id of the chat on screen (set when a saved chat opens or a new one is first saved)
  const chatId = useRef<string | null>(null);
  const unlocked = useChatsUnlocked();
  const [askPin, setAskPin] = useState(false);
  const [preset, setPreset] = useState<Attachment[] | undefined>();

  // “Ask AI” from Learning → My materials attaches that material to the message box.
  const materialId = params.get("m");
  useEffect(() => {
    if (!materialId) return;
    const meta = (state.materials ?? []).find((x) => x.id === materialId);
    if (!meta) return;
    loadMaterialText(materialId)
      .then((text) => {
        setPreset([{ id: `mat-${materialId}`, name: meta.name, kind: "text", text: text.slice(0, MAX_TEXT_CHARS), truncated: text.length > MAX_TEXT_CHARS, ...(meta.pages ? { pages: meta.pages } : {}) }]);
        router.replace("/assistant");
      })
      .catch(() => actions.toast("Couldn’t open that material. Check your connection."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  // Open a saved chat from ?c=<id>
  useEffect(() => {
    if (!conv) {
      chatId.current = null;
      setMessages([]);
      return;
    }
    if ((state.chats ?? []).find((c) => c.id === conv)?.locked && !unlocked) {
      // locked: keep it closed until the PIN is entered
      chatId.current = null;
      setMessages([]);
      return;
    }
    if (conv === chatId.current) return; // already on screen
    let alive = true;
    setLoadingChat(true);
    loadChat(conv)
      .then((saved) => {
        if (!alive) return;
        if (!saved) {
          actions.toast("That conversation wasn’t found.");
          router.replace("/assistant");
          return;
        }
        chatId.current = conv;
        setMessages(saved.map((m) => ({ id: ++idRef.current, role: m.role, text: m.text, time: m.time, files: m.files?.map((f, i) => ({ id: `${i}`, name: f.name, kind: f.kind })) })));
      })
      .catch(() => alive && actions.toast("Couldn’t open that conversation. Check your connection."))
      .finally(() => alive && setLoadingChat(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv, unlocked]);

  // Save the conversation after each reply, so it shows in history.
  function persist(list: Msg[]) {
    const keep = list.filter((m) => !m.failed && !m.error);
    const firstUser = keep.find((m) => m.role === "user");
    if (!firstUser) return;
    let id = chatId.current;
    if (!id) {
      id = newChatId();
      chatId.current = id;
      router.replace(`/assistant?c=${id}`);
    }
    const stored: StoredMessage[] = keep.map((m) => ({ role: m.role, text: m.text, time: m.time, ...(m.files?.length ? { files: m.files.map((f) => ({ name: f.name, kind: f.kind })) } : {}) }));
    saveChat(id, stored).catch(() => actions.toast("Couldn’t save this chat to history."));
    actions.patch({ chats: touchChat(state.chats, id, chatTitle(firstUser.text)) });
  }

  const leaveChat = () => {
    chatId.current = null;
    setMessages([]);
    router.replace("/assistant");
  };
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  // Shortcut from Study Plan → “Ask StudentOS to revise”
  const asked = useRef(false);
  useEffect(() => {
    if (params.get("q") === "revise" && !asked.current) {
      asked.current = true;
      send("Can you revise my study plan?");
    }
    // From the landing page demo: /assistant?ask=…
    const ask = params.get("ask")?.trim();
    if (ask && !asked.current) {
      asked.current = true;
      router.replace("/assistant");
      send(ask.slice(0, 500));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function send(text: string, files: Attachment[] = [], retryId?: number) {
    setLaunch((n) => n + 1);
    const id = retryId ?? ++idRef.current;
    const base: Msg[] = retryId ? messages.map((x) => (x.id === id ? { ...x, failed: false } : x)) : [...messages, { id, role: "user", text, time: clockTime(), files }];
    setMessages(base);
    setThinking(true);
    try {
      // earlier files are referred to by name only, to keep messages small
      const history = messages
        .filter((m) => !m.failed && !m.error && m.id !== id)
        .map((m) => ({ role: m.role, content: m.text + (m.files?.length ? `\n[Attached earlier: ${m.files.map((f) => f.name).join(", ")}]` : "") }));
      const reply = await askAssistant(text, { history, context: buildContext(state), tone: state.assistant.tone, files });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setOrbDone(true);
        await new Promise((r) => setTimeout(r, 750));
      }
      const newId = ++idRef.current;
      const next: Msg[] = [...base, { id: newId, role: "assistant", text: reply, time: clockTime() }];
      setFresh(newId);
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
      setOrbDone(false);
    }
  }

  // A change suggested by the assistant, applied only when the student presses the button.
  function apply(msgId: number, index: number, action: Parameters<typeof applyAction>[0]): string | null {
    const res = applyAction(action, {
      today: TODAY,
      resume: state.resume ?? starterResume(state),
      entries: state.entries ?? [],
      addSession: actions.addSession,
      setPrefs: actions.setPrefs,
      patch: actions.patch,
      go: (href) => router.push(href),
      id: uid,
    });
    if (!res.ok) return res.error;
    actions.toast(res.message);
    if (action.type !== "open_page") {
      const list = messages.map((x) => (x.id === msgId ? { ...x, text: markApplied(x.text, index) } : x));
      setMessages(list);
      persist(list);
    }
    return null;
  }

  const next = nextSession(state.sessions) ?? null;
  const empty = messages.length === 0 && !thinking && !loadingChat;
  const chats = sortChats(state.chats);
  const currentMeta = conv ? chats.find((c) => c.id === conv) : undefined;
  const lockedOut = !!currentMeta?.locked && !unlocked;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:h-screen">
      <header className="relative flex items-center justify-between px-6 pt-5">
        <button
          type="button"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-white hover:bg-white/[0.08]"
        >
          {conv ? (lockedOut ? "Locked chat" : (currentMeta?.title ?? "Conversation")) : "StudentOS Assistant"}
          <ChevronDownIcon size={13} className="text-white/60" />
        </button>
        {historyOpen && (
          <>
            <button type="button" aria-label="Close history" className="fixed inset-0 z-30 cursor-default" onClick={() => setHistoryOpen(false)} />
            <div className="absolute top-full left-6 z-40 mt-2 w-[320px] overflow-hidden rounded-xl border border-white/10 bg-raised shadow-2xl">
              <p className="border-b border-white/[0.07] px-4 py-2.5 text-[11px] font-semibold tracking-wide text-white/50 uppercase">Chat history</p>
              {chats.length === 0 ? (
                <p className="px-4 py-4 text-[12.5px] text-white/55">No saved chats yet. Your conversations will appear here.</p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto p-1.5">
                  {chats.map((c) => (
                    <ChatListItem
                      key={c.id}
                      chat={c}
                      active={c.id === conv}
                      showDate
                      onOpen={() => {
                        setHistoryOpen(false);
                        router.push(`/assistant?c=${c.id}`);
                      }}
                      onDeleted={() => c.id === chatId.current && leaveChat()}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        <Button
          size="sm"
          icon={<PlusIcon size={13} />}
          onClick={() => {
            chatId.current = null;
            setMessages([]);
            router.replace("/assistant");
          }}
        >
          New chat
        </Button>
      </header>

      {lockedOut ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
            <LockIcon size={22} />
          </span>
          <h1 className="mt-4 text-[20px] font-semibold text-white">This chat is locked</h1>
          <p className="mt-1 max-w-sm text-[13px] text-white/55">Enter your chat PIN to open it.</p>
          <Button variant="primary" className="mt-5" onClick={() => setAskPin(true)}>
            Enter PIN
          </Button>
          <PinDialog open={askPin} mode={state.chatLock ? "enter" : "set"} onClose={() => setAskPin(false)} onDone={() => setAskPin(false)} />
        </div>
      ) : empty ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-6">
          <Logo3D size={104} />
          <h1 className="mt-4 text-center text-[34px] leading-tight font-medium tracking-tight text-white">
            {greeting(NOW)}, {first}.
            <br />
            What should we plan today?
          </h1>
          <div className="mt-8 w-full max-w-[620px]">
            <Composer
              onSend={(t, f) => send(t, f)}
              allowFiles
              preset={preset}
              tall
              showMic
              tools={
                <>
                  <button type="button" onClick={() => send("Build my plan for this week")} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[11.5px] text-white/85 hover:bg-white/[0.08]">
                    <PlanIcon size={13} /> Build my plan
                  </button>
                  <button type="button" onClick={() => next && setRescheduling(true)} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[11.5px] text-white/85 hover:bg-white/[0.08]">
                    <CalendarIcon size={13} /> Reschedule a session
                  </button>
                </>
              }
            />
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {[
                { Icon: CalendarIcon, title: "Plan my week", sub: "Fit sessions around college, the gym and your rest day.", q: "Plan my week" },
                { Icon: RefreshIcon, title: "Catch up", sub: "Move a missed session without pushing your target date.", q: "I missed a session — can you move it?" },
                { Icon: TargetIcon, title: "Check progress", sub: `See where you are in ${state.goals[0]?.course ?? "your course"} and what comes next.`, q: "Where am I in my progress?" },
              ].map(({ Icon, title, sub, q }) => (
                <button key={title} type="button" onClick={() => send(q)} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-left transition hover:border-white/15 hover:bg-white/[0.06]">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                    <Icon size={14} className="text-accent" /> {title}
                  </span>
                  <span className="mt-1.5 block text-[11px] leading-relaxed text-white/50">{sub}</span>
                </button>
              ))}
            </div>
            <Disclaimer />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="mx-auto flex max-w-[680px] flex-col gap-6 py-8">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} failed={m.failed} files={m.files} onRetry={() => send(m.text, m.files, m.id)}>
                    {m.text}
                  </UserBubble>
                ) : (
                  <AssistantMessage key={m.id} time={m.time}>
                    {(() => {
                      const parsed = parseActions(m.text);
                      return (
                        <>
                          <div className={m.id === fresh ? "answer-reveal" : undefined}>
                            <Markdown text={parsed.text} />
                          </div>
                          {parsed.actions.map((p) => (
                            <ActionCard key={p.index} action={p.action} applied={p.applied} onApply={() => apply(m.id, p.index, p.action)} />
                          ))}
                        </>
                      );
                    })()}
                    {/move|reschedule/i.test(m.text) && next && (
                      <div className="mt-3">
                        <Button size="sm" icon={<CalendarIcon size={13} />} onClick={() => setRescheduling(true)}>
                          Open reschedule options
                        </Button>
                      </div>
                    )}
                  </AssistantMessage>
                ),
              )}
              {thinking && <ThinkingOrb done={orbDone} />}
              {loadingChat && <p className="text-center text-[12.5px] text-white/50">Opening conversation…</p>}
              <div ref={bottom} />
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[680px] px-6 pb-4">
            {launch > 0 && <span key={`ball-${launch}`} aria-hidden className="orb-launch pointer-events-none absolute top-6 left-1/2 z-10 h-10 w-10 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ede9fe,#a78bfa_45%,#6d28d9)] shadow-[0_0_30px_rgba(139,92,246,0.7)]" />}
            <div key={`box-${launch}`} className={launch > 0 ? "composer-launch" : undefined}>
              <Composer onSend={(t, f) => send(t, f)} allowFiles disabled={thinking} />
            </div>
            <Disclaimer />
          </div>
        </>
      )}
      <RescheduleDrawer session={next} open={rescheduling} onClose={() => setRescheduling(false)} />
    </div>
  );
}
