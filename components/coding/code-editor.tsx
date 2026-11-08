"use client";

/* A small code editor with no extra packages: a transparent <textarea> on top of
   a syntax-coloured <pre>, line numbers, Tab / Shift+Tab, auto-indent on Enter,
   and paste detection (pastes are reported so the 50% AI rule can count them). */

import { forwardRef, useImperativeHandle, useRef, type KeyboardEvent } from "react";
import type { Lang } from "@/lib/coding/types";
import { cn } from "@/lib/utils";

export type EditKind = "type" | "paste" | "ai";
export type EditorHandle = { insert: (text: string) => void; focus: () => void };

const KW: Record<Lang, string[]> = {
  python: "def return if elif else for while in not and or is None True False class import from as try except finally raise with lambda pass break continue yield global nonlocal assert del".split(" "),
  javascript: "function return if else for while of in let const var new class this null undefined true false typeof instanceof try catch finally throw break continue switch case default do yield async await".split(" "),
};
const BUILTIN: Record<Lang, string[]> = {
  python: "len range print int str list dict set tuple min max sum sorted enumerate zip abs map filter any all reversed float bool".split(" "),
  javascript: "Math Array Object String Number Map Set JSON console parseInt parseFloat Infinity".split(" "),
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function highlight(code: string, lang: Lang) {
  const kw = new Set(KW[lang]);
  const bi = new Set(BUILTIN[lang]);
  const comment = lang === "python" ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  const re = new RegExp(`(${comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*)`, "g");
  let out = "";
  let last = 0;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    const [t] = m;
    if (m[1]) out += `<span class="tok-c">${esc(t)}</span>`;
    else if (m[2]) out += `<span class="tok-s">${esc(t)}</span>`;
    else if (m[3]) out += `<span class="tok-n">${t}</span>`;
    else if (kw.has(t)) out += `<span class="tok-k">${t}</span>`;
    else if (bi.has(t)) out += `<span class="tok-b">${t}</span>`;
    else if (code[(m.index ?? 0) + t.length] === "(") out += `<span class="tok-f">${t}</span>`;
    else out += t;
    last = (m.index ?? 0) + t.length;
  }
  return out + esc(code.slice(last)) + "\n";
}

type Props = { value: string; lang: Lang; onChange: (v: string, kind: EditKind, added: string) => void; className?: string; label?: string };

export const CodeEditor = forwardRef<EditorHandle, Props>(function CodeEditor({ value, lang, onChange, className, label = "Code editor" }, ref) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const pasting = useRef(false);
  const unit = lang === "python" ? "    " : "  ";
  const lines = value.split("\n").length;

  const replace = (start: number, end: number, text: string, kind: EditKind, caret = start + text.length) => {
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next, kind, text);
    requestAnimationFrame(() => {
      if (!ta.current) return;
      ta.current.selectionStart = ta.current.selectionEnd = caret;
    });
  };

  useImperativeHandle(ref, () => ({
    focus: () => ta.current?.focus(),
    insert: (text: string) => {
      const el = ta.current;
      const at = el ? el.selectionEnd : value.length;
      // put the snippet on its own line(s) with the current line's indent
      const lineStart = value.lastIndexOf("\n", at - 1) + 1;
      const indent = /^[ \t]*/.exec(value.slice(lineStart))?.[0] ?? "";
      const body = text
        .split("\n")
        .map((l, i) => (i === 0 ? l : indent + l))
        .join("\n");
      const atLineEnd = value.indexOf("\n", at) === -1 ? value.length : value.indexOf("\n", at);
      const before = value.slice(lineStart, atLineEnd).trim() ? "\n" + indent : "";
      replace(atLineEnd, atLineEnd, before + body, "ai");
    },
  }));

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    if (e.key === "Tab") {
      e.preventDefault();
      const ls = value.lastIndexOf("\n", a - 1) + 1;
      if (e.shiftKey) {
        const line = value.slice(ls);
        const n = Math.min(unit.length, /^ */.exec(line)?.[0].length ?? 0);
        if (n) replace(ls, ls + n, "", "type", Math.max(ls, a - n));
      } else if (a !== b && value.slice(a, b).includes("\n")) {
        const block = value.slice(ls, b);
        const ind = block.split("\n").map((l) => unit + l).join("\n");
        replace(ls, b, ind, "type", b + (ind.length - block.length));
      } else replace(a, b, unit, "type");
      return;
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const ls = value.lastIndexOf("\n", a - 1) + 1;
      const line = value.slice(ls, a);
      let indent = /^[ \t]*/.exec(line)?.[0] ?? "";
      const t = line.trimEnd();
      if ((lang === "python" && t.endsWith(":")) || (lang === "javascript" && /[{[(]$/.test(t))) indent += unit;
      const closing = lang === "javascript" && /[{[(]$/.test(t) && /^[}\])]/.test(value.slice(b));
      if (closing) {
        const outer = indent.slice(unit.length);
        replace(a, b, "\n" + indent + "\n" + outer, "type", a + 1 + indent.length);
      } else replace(a, b, "\n" + indent, "type");
    }
  };

  const sync = () => {
    if (!ta.current) return;
    if (pre.current) {
      pre.current.scrollTop = ta.current.scrollTop;
      pre.current.scrollLeft = ta.current.scrollLeft;
    }
    if (gutter.current) gutter.current.scrollTop = ta.current.scrollTop;
  };

  return (
    <div className={cn("code-editor relative flex min-h-0 overflow-hidden font-mono text-[13.5px] leading-[1.6]", className)}>
      <div ref={gutter} aria-hidden className="w-11 shrink-0 overflow-hidden border-r border-white/[0.06] py-3 pr-2 text-right text-white/30 select-none">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <pre ref={pre} aria-hidden className="pointer-events-none absolute inset-0 m-0 overflow-hidden p-3 whitespace-pre text-white/90" dangerouslySetInnerHTML={{ __html: highlight(value, lang) }} />
        <textarea
          ref={ta}
          value={value}
          aria-label={label}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          onScroll={sync}
          onKeyDown={onKey}
          onPaste={() => (pasting.current = true)}
          onChange={(e) => {
            const next = e.target.value;
            const kind: EditKind = pasting.current ? "paste" : "type";
            pasting.current = false;
            // what was added: the longest new middle part
            let i = 0;
            while (i < value.length && i < next.length && value[i] === next[i]) i++;
            let j = 0;
            while (j < value.length - i && j < next.length - i && value[value.length - 1 - j] === next[next.length - 1 - j]) j++;
            onChange(next, kind, next.slice(i, next.length - j));
          }}
          className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent p-3 whitespace-pre text-transparent caret-[var(--color-accent)] outline-none selection:bg-violet-500/30"
        />
      </div>
    </div>
  );
});
