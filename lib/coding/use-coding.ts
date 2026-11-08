"use client";

/* Coding progress in the app state: drafts (with AI / paste tracking), attempts and solved problems. */

import { useRef } from "react";
import { useStore, type AppState } from "../store";
import type { CodingState, Draft, Lang, Problem, Solved } from "./types";

const EMPTY: CodingState = { solved: {}, attempts: {}, drafts: {} };
const MAX_DRAFTS = 40;
const MAX_CODE = 8000;

export const draftKey = (id: string, lang: Lang) => `${id}:${lang}`;

/** Engineering students and anyone who said they want to code. */
export function wantsCoding(s: AppState) {
  const a = s.setup?.academic;
  const text = [a?.course, a?.field, a?.specialization, s.profile.degree].filter(Boolean).join(" ").toLowerCase();
  if (/b\.?\s?tech|b\.?e\b|engineer|m\.?tech|bca|mca|computer|software|information tech|\bit\b|data science|\bcse\b|\bece\b|\bai\b|artificial intelligence/.test(text)) return true;
  const skills = s.setup?.skills;
  if ((skills?.familiar ?? []).some((x) => /python|javascript|web development|data analysis/i.test(x))) return true;
  if (skills?.areaLevels?.tech || skills?.areaLevels?.data) return true;
  if ((s.setup?.goals.interests ?? []).some((x) => /tech|programming|coding|data|software|web/i.test(x))) return true;
  return Object.keys(s.coding?.solved ?? {}).length > 0;
}

export function useCoding() {
  const { state, actions } = useStore();
  // async work (submit, debounced saves) must build on the newest coding state, not the one from its render
  const latest = useRef<CodingState>(state.coding ?? EMPTY);
  latest.current = state.coding ?? latest.current;
  const c = latest.current;
  const patch = (p: Partial<CodingState> | ((cur: CodingState) => Partial<CodingState>)) => {
    const cur = latest.current;
    const next = { ...cur, ...(typeof p === "function" ? p(cur) : p) };
    latest.current = next;
    actions.patch({ coding: next });
  };

  const saveDraft = (key: string, d: Draft) =>
    patch((cur) => {
      const drafts = { ...cur.drafts, [key]: { ...d, code: d.code.slice(0, MAX_CODE), ai: [...new Set(d.ai)].slice(-200), paste: [...new Set(d.paste)].slice(-300) } };
      const keys = Object.keys(drafts);
      if (keys.length > MAX_DRAFTS) for (const k of keys.slice(0, keys.length - MAX_DRAFTS)) delete drafts[k];
      return { drafts };
    });
  const resetDraft = (key: string) =>
    patch((cur) => {
      const drafts = { ...cur.drafts };
      delete drafts[key];
      return { drafts };
    });
  const attempt = (id: string) => patch((cur) => ({ attempts: { ...cur.attempts, [id]: (cur.attempts[id] ?? 0) + 1 } }));
  const solve = (id: string, s: Solved) => patch((cur) => ({ solved: { ...cur.solved, [id]: s }, attempts: { ...cur.attempts, [id]: (cur.attempts[id] ?? 0) + 1 } }));
  const setLang = (lang: Lang) => patch({ lang });
  const addCustom = (p: Problem) => patch((cur) => ({ custom: [...(cur.custom ?? []), p].slice(-30) }));
  const removeCustom = (id: string) => patch((cur) => ({ custom: (cur.custom ?? []).filter((x) => x.id !== id) }));
  const toggleSave = (id: string) => patch((cur) => ({ saved: (cur.saved ?? []).includes(id) ? (cur.saved ?? []).filter((x) => x !== id) : [...(cur.saved ?? []), id] }));

  return { coding: c, lang: c.lang ?? "python", saveDraft, resetDraft, attempt, solve, setLang, toggleSave, addCustom, removeCustom, state };
}

/** Days in a row (ending today or yesterday) with at least one problem solved. */
export function codingStreak(c: CodingState) {
  const days = new Set(Object.values(c.solved).map((s) => new Date(s.at).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
