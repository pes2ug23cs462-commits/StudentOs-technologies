/* Files a student attaches in the assistant. Everything is read in the browser:
   text and code files as text, PDFs as their text (pdf.js), images resized to a
   small JPEG so the AI can look at them. Nothing is uploaded or stored. */

export interface Attachment {
  id: string;
  name: string;
  kind: "text" | "image";
  /** extracted text (text files and PDFs) */
  text?: string;
  /** JPEG data URL (images) */
  dataUrl?: string;
  /** true when the text was cut to fit */
  truncated?: boolean;
  pages?: number;
}

export const MAX_FILES = 3;
/** Text sent to the AI per file. Free AI tiers allow only a few thousand words per message. */
export const MAX_TEXT_CHARS = 12_000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const ACCEPT =
  ".pdf,.docx,.pptx,.txt,.md,.csv,.json,.py,.js,.ts,.tsx,.jsx,.java,.c,.cpp,.h,.cs,.go,.rb,.php,.sql,.html,.css,.xml,.yml,.yaml,image/png,image/jpeg,image/webp";

const TEXT_EXT = /\.(txt|md|csv|json|py|js|ts|tsx|jsx|java|c|cpp|h|cs|go|rb|php|sql|html|css|xml|ya?ml)$/i;

function cut(text: string, max = MAX_TEXT_CHARS) {
  const t = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? { text: t.slice(0, max), truncated: true } : { text: t, truncated: false };
}

async function readPdf(file: File, max = MAX_TEXT_CHARS) {
  const pdfjs = await import("pdfjs-dist");
  // The worker file is served from /public and must match the pdfjs-dist version in package.json (6.2.108).
  if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  let out = "";
  const last = Math.min(doc.numPages, 40);
  for (let p = 1; p <= last && out.length < max + 2000; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let line = "";
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      line += item.str ?? "";
      if (item.hasEOL) {
        out += line + "\n";
        line = "";
      }
    }
    out += line + "\n\n";
  }
  const pages = doc.numPages;
  await task.destroy();
  return { ...cut(out, max), pages };
}

async function readImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("bad image"));
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readAttachment(file: File, opts: { maxChars?: number; maxBytes?: number } = {}): Promise<Attachment> {
  const id = Math.random().toString(36).slice(2, 9);
  const max = opts.maxChars ?? MAX_TEXT_CHARS;
  const maxBytes = opts.maxBytes ?? MAX_FILE_BYTES;
  if (file.size > maxBytes) throw new Error(`${file.name} is over ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  if (file.type.startsWith("image/")) return { id, name: file.name, kind: "image", dataUrl: await readImage(file) };
  if (/\.docx$/i.test(file.name)) {
    const { readDocx } = await import("./office");
    const t = await readDocx(file).catch(() => {
      throw new Error(`Couldn’t read ${file.name}. Save it again in Word and retry.`);
    });
    if (!t.trim()) throw new Error(`${file.name} has no text.`);
    return { id, name: file.name, kind: "text", ...cut(t, max) };
  }
  if (/\.pptx$/i.test(file.name)) {
    const { readPptx } = await import("./office");
    const r = await readPptx(file).catch(() => {
      throw new Error(`Couldn’t read ${file.name}. Save it again in PowerPoint and retry.`);
    });
    if (!r.text.trim()) throw new Error(`${file.name} has no text on its slides.`);
    return { id, name: file.name, kind: "text", ...cut(r.text, max), pages: r.slides };
  }
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const r = await readPdf(file, max).catch((e) => {
      console.error("[attachments] PDF read failed", e);
      throw new Error(`Couldn’t read ${file.name}. It may be password-protected.`);
    });
    if (!r.text) throw new Error(`${file.name} has no readable text (it may be a scanned PDF). Try a photo of the page instead.`);
    return { id, name: file.name, kind: "text", ...r };
  }
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) return { id, name: file.name, kind: "text", ...cut(await file.text(), max) };
  throw new Error(`${file.name}: this file type isn’t supported. Use PDF, Word, PowerPoint, text, code or an image.`);
}
