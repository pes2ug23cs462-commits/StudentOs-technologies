"use client";

/* Tiny, safe markdown for assistant replies: paragraphs, bullet and numbered
   lists, headings, tables, --- rules, **bold**, *italic*, `code` and ``` code blocks.
   Builds React elements (no innerHTML), so model output can't inject HTML. */

import { Fragment, type ReactNode } from "react";

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={`${key}-${i++}`} className="font-semibold text-white">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={`${key}-${i++}`} className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[12.5px]">{t.slice(1, -1)}</code>);
    else out.push(<em key={`${key}-${i++}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={k++} className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[12.5px] leading-relaxed text-white/90">
          {code.join("\n")}
        </pre>,
      );
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && /^\s*\d+[.)]/.test(lines[i]) === ordered)
        items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k++} className={ordered ? "my-2 list-decimal space-y-1 pl-5" : "my-2 list-disc space-y-1 pl-5"}>
          {items.map((it, n) => (
            <li key={n}>{inline(it, `${k}-${n}`)}</li>
          ))}
        </Tag>,
      );
      continue;
    }
    // a table: | a | b | rows, with a |---|---| line under the header
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      let header = false;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const r = lines[i++].trim();
        if (/^\|[\s:|-]+\|$/.test(r)) {
          if (rows.length === 1) header = true;
          continue;
        }
        rows.push(r.slice(1, -1).split("|").map((c) => c.trim()));
      }
      const head = header ? rows[0] : null;
      const body = header ? rows.slice(1) : rows;
      blocks.push(
        <div key={k++} className="my-2 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full border-collapse text-left text-[13px]">
            {head && (
              <thead className="bg-white/[0.05]">
                <tr>
                  {head.map((c, n) => (
                    <th key={n} className="border-b border-white/10 px-3 py-1.5 font-semibold text-white">
                      {inline(c, `th${k}-${n}`)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((r, rn) => (
                <tr key={rn} className="border-t border-white/[0.06] first:border-t-0">
                  {r.map((c, n) => (
                    <td key={n} className="px-3 py-1.5 align-top">
                      {inline(c, `td${k}-${rn}-${n}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr key={k++} className="my-3 border-white/10" />);
      i++;
      continue;
    }
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) {
      blocks.push(
        <p key={k++} className="mt-3 mb-1 font-semibold text-white">
          {inline(h[1], `h${k}`)}
        </p>,
      );
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !lines[i].trim().startsWith("```") && !/^\s*\|.*\|\s*$/.test(lines[i]) && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={k++} className="my-1.5">
        {para.map((p, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(p, `p${k}-${n}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{blocks}</div>;
}
