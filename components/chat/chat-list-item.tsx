"use client";

/* One saved chat in a list (sidebar or history menu) with a ⋯ menu:
   Pin, Rename, Share, Lock and Delete. Locked chats need the chat PIN to open. */

import { useState } from "react";
import { PinDialog, ShareDialog } from "@/components/chat/chat-dialogs";
import { CheckIcon, DotsIcon, LockIcon, PencilIcon, PinIcon, ShareIcon, TrashIcon, UnlockIcon, XIcon } from "@/components/ui/icons";
import { deleteChat, patchChat, renameChat, stopSharing, useChatsUnlocked, type ChatMeta } from "@/lib/chats";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ChatListItem({
  chat,
  active,
  onOpen,
  onDeleted,
  showDate,
  className,
}: {
  chat: ChatMeta;
  active?: boolean;
  onOpen: () => void;
  /** called after delete (e.g. to leave the deleted chat) */
  onDeleted?: () => void;
  showDate?: boolean;
  className?: string;
}) {
  const { state, actions } = useStore();
  const [mode, setMode] = useState<"view" | "rename" | "confirm">("view");
  const [title, setTitle] = useState(chat.title);
  const [menu, setMenu] = useState(false);
  const [pinFor, setPinFor] = useState<null | (() => void)>(null);
  const [sharing, setSharing] = useState(false);
  const unlocked = useChatsUnlocked();
  const hidden = chat.locked && !unlocked;

  /** Runs `then` now, or after the PIN is entered (or first set). */
  const withPin = (then: () => void) => {
    if (unlocked && state.chatLock) return then();
    setPinFor(() => then);
  };
  const setLocked = (locked: boolean) => {
    actions.patch({ chats: patchChat(state.chats, chat.id, { locked }) });
    actions.toast(locked ? "Chat locked." : "Chat unlocked.");
  };

  const save = () => {
    if (title.trim() && title.trim() !== chat.title) {
      actions.patch({ chats: renameChat(state.chats, chat.id, title) });
      actions.toast("Chat renamed.");
    }
    setMode("view");
  };
  const withPinIfLocked = (then: () => void) => (chat.locked ? withPin(then) : then());
  const remove = () => {
    deleteChat(chat.id);
    if (chat.shareId) stopSharing(chat.shareId).catch(() => {});
    actions.patch({ chats: (state.chats ?? []).filter((c) => c.id !== chat.id) });
    actions.toast("Conversation deleted.");
    onDeleted?.();
  };

  if (mode === "rename")
    return (
      <form
        className={cn("flex items-center gap-1 px-1 py-1", className)}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          autoFocus
          value={title}
          maxLength={80}
          aria-label="Chat name"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && (setTitle(chat.title), setMode("view"))}
          className="h-7 min-w-0 flex-1 rounded-md border border-accent/60 bg-white/[0.05] px-2 text-[12px] text-white outline-none"
        />
        <button type="submit" aria-label="Save name" className="rounded p-1 text-accent hover:bg-white/[0.08]">
          <CheckIcon size={13} />
        </button>
        <button type="button" aria-label="Cancel" onClick={() => (setTitle(chat.title), setMode("view"))} className="rounded p-1 text-white/50 hover:bg-white/[0.08]">
          <XIcon size={13} />
        </button>
      </form>
    );

  if (mode === "confirm")
    return (
      <div className={cn("flex items-center gap-1 rounded-md bg-rose-500/[0.08] px-2 py-1.5", className)}>
        <span className="min-w-0 flex-1 truncate text-[12px] text-rose-300">Delete this chat?</span>
        <button type="button" onClick={remove} className="rounded px-2 py-0.5 text-[11.5px] font-semibold text-rose-300 hover:bg-rose-500/20">
          Delete
        </button>
        <button type="button" onClick={() => setMode("view")} className="rounded px-2 py-0.5 text-[11.5px] text-white/60 hover:bg-white/[0.08]">
          Cancel
        </button>
      </div>
    );

  const item = (label: string, Icon: typeof PinIcon, run: () => void, danger?: boolean) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setMenu(false);
        run();
      }}
      className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.06]", danger ? "text-rose-400" : "text-white/85")}
    >
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div className={cn("group relative flex items-center rounded-md hover:bg-white/[0.05]", active && "bg-white/[0.06]", className)}>
      <button type="button" onClick={() => (chat.locked ? withPin(onOpen) : onOpen())} title={hidden ? "Locked chat" : chat.title} className="min-w-0 flex-1 px-3 py-1.5 text-left">
        <span className={cn("flex items-center gap-1.5 truncate text-[12px]", active ? "text-white" : "text-white/65 group-hover:text-white")}>
          {chat.pinned && <PinIcon size={10} className="shrink-0 text-accent" />}
          {chat.locked && <LockIcon size={10} className="shrink-0 text-amber-400" />}
          <span className="truncate">{hidden ? "Locked chat" : chat.title}</span>
          {chat.shareId && !hidden && <ShareIcon size={10} className="shrink-0 text-white/40" />}
        </span>
        {showDate && (
          <span className="block text-[10.5px] text-white/40">{new Date(chat.updated).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
        )}
      </button>
      <button
        type="button"
        aria-label={`Options for ${hidden ? "locked chat" : `“${chat.title}”`}`}
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu((m) => !m)}
        className={cn("mr-1 shrink-0 rounded p-1 text-white/45 transition hover:bg-white/[0.08] hover:text-white", menu ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")}
      >
        <DotsIcon size={14} />
      </button>

      {menu && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} />
          <div role="menu" className="absolute top-full right-1 z-50 mt-1 w-44 rounded-lg border border-white/10 bg-raised p-1 shadow-2xl">
            {item(chat.pinned ? "Unpin" : "Pin", PinIcon, () => actions.patch({ chats: patchChat(state.chats, chat.id, { pinned: !chat.pinned }) }))}
            {item("Rename", PencilIcon, () => withPinIfLocked(() => (setTitle(chat.title), setMode("rename"))))}
            {item(chat.shareId ? "Sharing…" : "Share", ShareIcon, () => withPinIfLocked(() => setSharing(true)))}
            {chat.locked ? item("Unlock chat", UnlockIcon, () => withPin(() => setLocked(false))) : item("Lock chat", LockIcon, () => withPin(() => setLocked(true)))}
            {item("Delete", TrashIcon, () => withPinIfLocked(() => setMode("confirm")), true)}
          </div>
        </>
      )}

      {pinFor && (
        <PinDialog
          open
          mode={state.chatLock ? "enter" : "set"}
          onClose={() => setPinFor(null)}
          onDone={() => {
            const run = pinFor;
            setPinFor(null);
            run();
          }}
        />
      )}
      {sharing && <ShareDialog chat={chat} open onClose={() => setSharing(false)} />}
    </div>
  );
}
