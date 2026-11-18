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
