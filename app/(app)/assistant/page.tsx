"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssistantMessage, Composer, Disclaimer, Thinking, UserBubble, clockTime } from "@/components/chat/parts";
import { RescheduleDrawer } from "@/components/reschedule/reschedule-drawer";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronDownIcon, PlanIcon, PlusIcon, RefreshIcon, TargetIcon } from "@/components/ui/icons";
import { OfflineError, askAssistant } from "@/lib/assistant";
import { nextSession } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { NOW, greeting } from "@/lib/utils";

type Msg = { id: number; role: "user" | "assistant"; text: string; time: string; failed?: boolean };

const SEED: Record<string, Msg[]> = {
  "cs50-week-2": [
    { id: 1, role: "user", text: "In week 2, what’s the difference between elif and a second if?", time: "8:12 PM" },
    {
      id: 2,
      role: "assistant",
      text: "With elif, Python stops checking once one branch matches. With two separate ifs, both conditions are always checked — so both blocks can run. Use elif when only one option should happen.",
      time: "8:12 PM",
    },
  ],
};

export default function AssistantPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { state } = useStore();
  const first = state.profile.name.split(" ")[0] || "there";
  const conv = params.get("c");
  const [messages, setMessages] = useState<Msg[]>(() => (conv && SEED[conv]) || []);
  const [thinking, setThinking] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const idRef = useRef(10);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((conv && SEED[conv]) || []);
  }, [conv]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function send(text: string, retryId?: number) {
    const id = retryId ?? ++idRef.current;
    setMessages((m) => (retryId ? m.map((x) => (x.id === id ? { ...x, failed: false } : x)) : [...m, { id, role: "user", text, time: clockTime() }]));
    setThinking(true);
    try {
      const reply = await askAssistant(text);
      setMessages((m) => [...m, { id: ++idRef.current, role: "assistant", text: reply, time: clockTime() }]);
    } catch (e) {
      if (e instanceof OfflineError) setMessages((m) => m.map((x) => (x.id === id ? { ...x, failed: true } : x)));
    } finally {
      setThinking(false);
    }
  }

  const next = nextSession(state.sessions) ?? null;
  const empty = messages.length === 0 && !thinking;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:h-screen">
      <header className="flex items-center justify-between px-6 pt-5">
        <button type="button" className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] font-medium text-white hover:bg-white/[0.08]">
          StudentOS Assistant <ChevronDownIcon size={13} className="text-white/60" />
        </button>
        <Button size="sm" icon={<PlusIcon size={13} />} onClick={() => (setMessages([]), router.replace("/assistant"))}>
          New chat
        </Button>
      </header>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-6">
          <div className="h-16 w-16 rounded-full bg-[conic-gradient(from_200deg,#7c3aed,#22d3ee,#a78bfa,#4c1d95,#7c3aed)] shadow-[0_0_50px_rgba(124,58,237,0.55)] [mask-image:radial-gradient(circle,black_62%,transparent_64%)]" />
          <h1 className="mt-8 text-center text-[34px] leading-tight font-medium tracking-tight text-white">
            {greeting(NOW)}, {first}.
            <br />
            What should we plan today?
          </h1>
          <div className="mt-8 w-full max-w-[620px]">
            <Composer
              onSend={(t) => send(t)}
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
                    <Icon size={14} className="text-cyan-300" /> {title}
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
                  <UserBubble key={m.id} failed={m.failed} onRetry={() => send(m.text, m.id)}>
                    {m.text}
                  </UserBubble>
                ) : (
                  <AssistantMessage key={m.id} time={m.time}>
                    {m.text}
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
              {thinking && <Thinking />}
              <div ref={bottom} />
            </div>
          </div>
          <div className="mx-auto w-full max-w-[680px] px-6 pb-4">
            <Composer onSend={(t) => send(t)} disabled={thinking} />
            <Disclaimer />
          </div>
        </>
      )}
      <RescheduleDrawer session={next} open={rescheduling} onClose={() => setRescheduling(false)} />
    </div>
  );
}
