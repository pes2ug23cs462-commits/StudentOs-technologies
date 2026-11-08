"use client";

/* Dialogs for saved chats: set / enter the chat PIN, and share a read-only link. */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/drawer";
import { hashPin, makeLock, patchChat, recentlySignedIn, setChatsUnlocked, shareChat, shareUrl, stopSharing, validPin, type ChatMeta } from "@/lib/chats";
import { useStore } from "@/lib/store";

function PinInput({ value, onChange, label, autoFocus }: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      maxLength={6}
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-center text-[18px] tracking-[0.4em] text-white placeholder:text-[12.5px] placeholder:tracking-normal placeholder:text-white/40 outline-none focus:border-accent"
    />
  );
}

/** Create the PIN (mode "set") or check it (mode "enter"). Calls onDone when unlocked. */
export function PinDialog({ mode, open, onClose, onDone }: { mode: "set" | "enter"; open: boolean; onClose: () => void; onDone: () => void }) {
  const { state, actions } = useStore();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const setting = mode === "set" || resetting;

  const close = () => {
    setPin("");
    setPin2("");
    setError("");
    setResetting(false);
    onClose();
  };

  const submit = async () => {
    setError("");
    if (setting) {
      if (!validPin(pin)) return setError("Use 4 to 6 digits.");
      if (pin !== pin2) return setError("The two PINs don’t match.");
      setBusy(true);
      actions.patch({ chatLock: await makeLock(pin) });
      setBusy(false);
      setChatsUnlocked(true);
      actions.toast(resetting ? "New chat PIN set." : "Chat PIN set.");
      close();
      onDone();
      return;
    }
    const lock = state.chatLock;
    if (!lock) return;
    setBusy(true);
    const ok = (await hashPin(pin, lock.salt)) === lock.hash;
    setBusy(false);
    if (!ok) {
      setPin("");
      return setError("Wrong PIN. Try again.");
    }
    setChatsUnlocked(true);
    close();
    onDone();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={resetting ? "Set a new chat PIN" : setting ? "Set a PIN for locked chats" : "Enter your chat PIN"}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" loading={busy} onClick={submit}>
            {setting ? "Save PIN" : "Unlock"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p>
          {setting
            ? "Locked chats are hidden from your chat list until you enter this PIN. It works on this account on every device."
            : "This chat is locked. Enter your 4–6 digit PIN to open locked chats until you close this tab."}
        </p>
        <PinInput value={pin} onChange={setPin} label={setting ? "New PIN (4–6 digits)" : "PIN"} autoFocus />
        {setting && <PinInput value={pin2} onChange={setPin2} label="Type the PIN again" />}
        {error && <p className="mt-2 text-[12px] text-rose-400">{error}</p>}
        <button type="submit" className="hidden" />
        {!setting && (
          <button
            type="button"
            onClick={() => {
              if (recentlySignedIn()) {
                setError("");
                setResetting(true);
              } else setError("To reset your PIN, log out and log in again, then choose “Forgot PIN” within 10 minutes.");
            }}
            className="mt-3 text-[12px] text-accent hover:underline"
          >
            Forgot PIN?
          </button>
        )}
      </form>
    </Dialog>
  );
}

/** Create, copy, refresh or remove a public read-only link to a chat. */
export function ShareDialog({ chat, open, onClose }: { chat: ChatMeta; open: boolean; onClose: () => void }) {
  const { state, actions } = useStore();
  const [busy, setBusy] = useState(false);
  const link = chat.shareId ? shareUrl(chat.shareId) : "";

  const create = async () => {
    setBusy(true);
    try {
      const shareId = await shareChat(chat.id, chat.title, chat.shareId);
      actions.patch({ chats: patchChat(state.chats, chat.id, { shareId }) });
      await navigator.clipboard?.writeText(shareUrl(shareId)).catch(() => {});
      actions.toast(chat.shareId ? "Shared copy updated." : "Link created and copied.");
    } catch {
      actions.toast("Couldn’t create the link. Check your connection.");
    } finally {
      setBusy(false);
    }
  };
  const stop = async () => {
    if (!chat.shareId) return;
    setBusy(true);
    try {
      await stopSharing(chat.shareId);
      actions.patch({ chats: patchChat(state.chats, chat.id, { shareId: undefined }) });
      actions.toast("Sharing stopped. The old link no longer works.");
      onClose();
    } catch {
      actions.toast("Couldn’t stop sharing. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share this chat"
      actions={
        chat.shareId ? (
          <>
            <Button size="sm" variant="danger" loading={busy} onClick={stop}>
              Stop sharing
            </Button>
            <Button size="sm" loading={busy} onClick={create}>
              Update copy
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" loading={busy} onClick={create}>
              Create link
            </Button>
          </>
        )
      }
    >
      <p>Anyone with the link can read a copy of “{chat.title}”. They can’t reply or see your other chats. Attached files aren’t included.</p>
      {chat.shareId ? (
        <div className="mt-3 flex gap-2">
          <input readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[12px] text-white outline-none" />
          <Button size="sm" onClick={() => navigator.clipboard?.writeText(link).then(() => actions.toast("Link copied."), () => {})}>
            Copy
          </Button>
        </div>
      ) : null}
      {chat.shareId && <p className="mt-2 text-[11.5px] text-white/45">The link shows the chat as it was when shared. Use “Update copy” to add newer messages.</p>}
    </Dialog>
  );
}
