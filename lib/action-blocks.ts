/* The AI doesn't always write action blocks exactly as asked: it may use ```json
   or a bare ``` fence, or leave out "type" (e.g. {"title":"…","format":"pdf"}).
   This turns those into proper ```action blocks before the reply reaches the chat.
   Only objects that are clearly one of our actions are touched; other code
   blocks stay as they are. No imports, so the server can use it too. */

const TYPES = ["add_session", "add_entry", "add_resume_skills", "set_prefs", "add_event", "download_doc", "open_page"];

export function normalizeActionBlocks(reply: string): string {
  return reply.replace(/```(json|javascript|js|action)?[ \t]*\n([\s\S]*?)```/g, (whole, tag: string | undefined, body: string) => {
    if (tag === "action") return whole;
    let o: unknown;
    try {
      o = JSON.parse(body.trim());
    } catch {
      return whole;
    }
    if (!o || typeof o !== "object" || Array.isArray(o)) return whole;
    const r = o as Record<string, unknown>;
    if (typeof r.type === "string" && TYPES.includes(r.type)) return "```action\n" + JSON.stringify(r) + "\n```";
    const keys = Object.keys(r);
    if (typeof r.title === "string" && /^(pdf|docx|word)$/i.test(String(r.format ?? "")) && keys.every((k) => k === "title" || k === "format"))
      return "```action\n" + JSON.stringify({ type: "download_doc", ...r }) + "\n```";
    return whole;
  });
}

/** The student asked for a file (PDF, Word, notes to download…). */
export const wantsFile = (text: string) =>
  /\b(pdf|docx?|word (file|doc)|download|handout|print(able)?|file (bana|de|do|chahiye)|notes? (bana|de|do|chahiye|download))\b/i.test(text);

/** The first heading or bold line of a reply, for the file name. */
export function docTitle(reply: string, ask = "") {
  const h = reply.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? reply.match(/^\*\*([^*]{4,80})\*\*:?\s*$/m)?.[1];
  if (h) return h.replace(/[*_`#]/g, "").trim().slice(0, 80);
  const t = ask
    .replace(/\b(pdf|docx?|word|file|download|bana(o|de|do)?|de(do)?|do|kar(o|de|do)?|please|pls|mujhe|ab|is(ki|ka|ko|e)?|us(ki|ka|ko)?|ye(h)?|ka|ki|ke|pe|par|on|of|a|an|the|me|mein|make|give|create|2-3|\d+|pages?|page ka|pura|poora|explanation|explain|notes?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (t ? t[0].toUpperCase() + t.slice(1) : "StudentOS notes").slice(0, 80);
}

/** If the student asked for a file and the reply has no download block, add one,
    so the Download button always shows. */
export function ensureDownload(ask: string, reply: string): string {
  if (!wantsFile(ask) || /"type"\s*:\s*"download_doc"/.test(reply)) return reply;
  const format = /\b(docx?|word)\b/i.test(ask) ? "docx" : "pdf";
  // a short reply ("Sure, here you go") means the file is made from an earlier answer; its title comes from there
  const long = reply.replace(/```[\s\S]*?```/g, "").trim().length >= 350;
  return `${reply}\n\n\`\`\`action\n${JSON.stringify({ type: "download_doc", title: long ? docTitle(reply, ask) : "", format })}\n\`\`\``;
}
