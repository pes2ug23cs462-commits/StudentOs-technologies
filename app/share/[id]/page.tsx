"use client";

/* Public, read-only copy of a chat a student chose to share. No sign-in needed. */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AssistantMessage, UserBubble } from "@/components/chat/parts";
import { Markdown } from "@/components/chat/markdown";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { loadShared, type SharedChat } from "@/lib/chats";

export default function SharedChatPage() {
  const { id } = useParams<{ id: string }>();
  const [chat, setChat] = useState<SharedChat | null | undefined>(undefined);

  useEffect(() => {
    loadShared(id)
      .then(setChat)
      .catch(() => setChat(null));
  }, [id]);

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} />
            <Wordmark className="text-[15px]" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-8">
        {chat === undefined ? (
          <p className="py-20 text-center text-[13px] text-white/50">Loading…</p>
        ) : chat === null ? (
          <div className="py-20 text-center">
            <p className="text-[16px] font-semibold text-white">This shared chat isn’t available</p>
            <p className="mt-1 text-[13px] text-white/55">The link may be wrong, or the student stopped sharing it.</p>
          </div>
        ) : (
          <>
            <p className="text-[11.5px] font-medium tracking-wide text-accent uppercase">Shared from StudentOS</p>
            <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-white">{chat.title}</h1>
            <p className="mt-1 text-[12px] text-white/45">
              Shared {new Date(chat.sharedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · read-only
            </p>
            <div className="mt-8 flex flex-col gap-6">
              {chat.messages.map((m, i) =>
                m.role === "user" ? (
                  <UserBubble key={i} files={m.files?.map((f, k) => ({ id: String(k), name: f.name, kind: f.kind }))}>
                    {m.text}
                  </UserBubble>
                ) : (
                  <AssistantMessage key={i} time={m.time}>
                    <Markdown text={m.text} />
                  </AssistantMessage>
                ),
              )}
            </div>
            <div className="mt-12 rounded-xl border border-accent/30 bg-accent/[0.06] p-5 text-center">
              <p className="text-[14px] font-semibold text-white">Plan your studies with StudentOS</p>
              <p className="mt-1 text-[12.5px] text-white/60">A free AI study planner, courses and certificates for college students.</p>
              <Link href="/signup" className="mt-4 inline-flex h-10 items-center rounded-lg bg-accent px-5 text-[13.5px] font-semibold text-black hover:bg-accent-hover">
                Try StudentOS free
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
