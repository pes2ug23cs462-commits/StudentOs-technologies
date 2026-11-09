/* Saved AI Assistant conversations. Each chat lives in users/{uid}/chats/{id};
   the list for the sidebar (id, title, last updated) is kept in the app state.
   Attached files are remembered by name only, not their contents. */

import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { auth, db } from "./firebase";

export interface ChatMeta {
  id: string;
  title: string;
  updated: string;
  /** shown at the top of the list */
  pinned?: boolean;
  /** needs the chat PIN to open */
  locked?: boolean;
  /** public read-only copy: shared/{shareId} */
  shareId?: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  time: string;
  files?: { name: string; kind: "text" | "image" }[];
}

/** Chats kept per student, and messages kept per chat. */
export const MAX_CHATS = 30;
export const MAX_MESSAGES = 80;

const ref = (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("signed-out");
  return doc(db, "users", uid, "chats", id);
};

export const newChatId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function chatTitle(firstMessage: string) {
  const t = firstMessage.replace(/\s+/g, " ").trim();
  return t.length > 48 ? `${t.slice(0, 46).trimEnd()}…` : t || "New chat";
}

export async function saveChat(id: string, messages: StoredMessage[]) {
  await setDoc(ref(id), { messages: messages.slice(-MAX_MESSAGES), updated: new Date().toISOString() });
}

export async function loadChat(id: string): Promise<StoredMessage[] | null> {
  const snap = await getDoc(ref(id));
  if (!snap.exists()) return null;
  return ((snap.data() as { messages?: StoredMessage[] }).messages ?? []).filter((m) => m && (m.role === "user" || m.role === "assistant"));
}

export async function deleteChat(id: string) {
  await deleteDoc(ref(id)).catch(() => {});
}

/** Puts a chat at the top of the list (adding it if new). */
export function touchChat(list: ChatMeta[] | undefined, id: string, title: string): ChatMeta[] {
  const rest = (list ?? []).filter((c) => c.id !== id);
  const existing = (list ?? []).find((c) => c.id === id);
  return [{ ...existing, id, title: existing?.title ?? title, updated: new Date().toISOString() }, ...rest].slice(0, MAX_CHATS);
}

export function renameChat(list: ChatMeta[] | undefined, id: string, title: string): ChatMeta[] {
  const t = title.replace(/\s+/g, " ").trim().slice(0, 80);
  return (list ?? []).map((c) => (c.id === id && t ? { ...c, title: t } : c));
}

/* ---------- pin ---------- */

/** Pinned chats first, then newest. */
export function sortChats(list: ChatMeta[] | undefined): ChatMeta[] {
  return [...(list ?? [])].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updated.localeCompare(a.updated));
}

export function patchChat(list: ChatMeta[] | undefined, id: string, patch: Partial<ChatMeta>): ChatMeta[] {
  return (list ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c));
}

/* ---------- lock (a PIN on this account, checked in the browser) ----------
   This hides locked chats from anyone using the student's logged-in screen.
   It is a privacy screen, not encryption: the chat text is still stored in the
   student's own (private) Firebase data. */

export interface ChatLock {
  salt: string;
  hash: string;
}

export async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeLock(pin: string): Promise<ChatLock> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  return { salt, hash: await hashPin(pin, salt) };
}

export const validPin = (pin: string) => /^\d{4,6}$/.test(pin);

// Unlocked until the tab is closed or the student logs out.
let unlocked = false;
const listeners = new Set<() => void>();
try {
  unlocked = typeof sessionStorage !== "undefined" && sessionStorage.getItem("studentos:chats-unlocked") === "1";
} catch {
  /* ignore */
}
export function setChatsUnlocked(v: boolean) {
  unlocked = v;
  try {
    if (v) sessionStorage.setItem("studentos:chats-unlocked", "1");
    else sessionStorage.removeItem("studentos:chats-unlocked");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
export function useChatsUnlocked() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => unlocked,
    () => false,
  );
}

/** “Forgot PIN” is allowed right after a fresh login, which proves it's the account owner. */
export function recentlySignedIn(minutes = 10) {
  const t = auth.currentUser?.metadata?.lastSignInTime;
  return !!t && Date.now() - new Date(t).getTime() < minutes * 60_000;
}

/* ---------- share (public read-only copy) ---------- */

export interface SharedChat {
  ownerUid: string;
  title: string;
  messages: StoredMessage[];
  sharedAt: string;
}

const shareRef = (id: string) => doc(db, "shared", id);

export async function shareChat(chatId: string, title: string, existingShareId?: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("signed-out");
  const messages = (await loadChat(chatId)) ?? [];
  const shareId = existingShareId ?? Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
  const data: SharedChat = { ownerUid: uid, title, messages: messages.map((m) => ({ role: m.role, text: m.text, time: m.time, ...(m.files ? { files: m.files } : {}) })), sharedAt: new Date().toISOString() };
  await setDoc(shareRef(shareId), data);
  return shareId;
}

export async function stopSharing(shareId: string) {
  await deleteDoc(shareRef(shareId));
}

export async function loadShared(shareId: string): Promise<SharedChat | null> {
  if (!/^[a-z0-9]{6,20}$/.test(shareId)) return null;
  const snap = await getDoc(shareRef(shareId));
  return snap.exists() ? (snap.data() as SharedChat) : null;
}

export const shareUrl = (shareId: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareId}`;
