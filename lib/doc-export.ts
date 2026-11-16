/* Notes as a PDF or a Word file, made in the browser with no extra library.
   PDF: each A4 page is drawn on a canvas (so any script, Hindi included, prints right)
   and saved as a JPEG page. Word: a small .docx (a zip of three XML files). */

export type DocBlock = { kind: "title" | "sub" | "h" | "p" | "li" | "small"; text: string };

/* ---------- PDF ---------- */

const PW = 1240, PH = 1754, M = 110; // A4 at 150 dpi, margins
const STYLE: Record<DocBlock["kind"], { font: string; size: number; gap: number; color: string; indent?: number }> = {
  title: { font: "700", size: 46, gap: 22, color: "#14121c" },
  sub: { font: "400", size: 25, gap: 26, color: "#4a4560" },
  h: { font: "700", size: 30, gap: 14, color: "#4c1d95" },
  p: { font: "400", size: 25, gap: 14, color: "#1f1c29" },
  li: { font: "400", size: 25, gap: 10, color: "#1f1c29", indent: 34 },
  small: { font: "400", size: 20, gap: 8, color: "#6b6680" },
};
const FAMILY = "Inter, 'Noto Sans', 'Segoe UI', Arial, sans-serif";

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > width && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

function pages(blocks: DocBlock[], footer: string): HTMLCanvasElement[] {
  const list: HTMLCanvasElement[] = [];
  let c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, y = 0;
  const fresh = () => {
    c = document.createElement("canvas");
    c.width = PW;
    c.height = PH;
    ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PW, PH);
    ctx.textBaseline = "top";
    list.push(c);
    y = M;
  };
  fresh();
  for (const b of blocks) {
    const s = STYLE[b.kind];
    ctx!.font = `${s.font} ${s.size}px ${FAMILY}`;
    const indent = s.indent ?? 0;
    const lines = wrap(ctx!, b.text, PW - 2 * M - indent);
    const lh = Math.round(s.size * 1.45);
    if (b.kind === "h") y += 18;
    if (y + lh * Math.min(lines.length, 2) > PH - M - 40) fresh();
    lines.forEach((ln, k) => {
      if (y + lh > PH - M - 40) {
        fresh();
        ctx!.font = `${s.font} ${s.size}px ${FAMILY}`;
      }
      ctx!.fillStyle = s.color;
      if (b.kind === "li" && k === 0) ctx!.fillText("•", M + 8, y);
      ctx!.fillText(ln, M + indent, y);
      y += lh;
    });
    if (b.kind === "title") {
      ctx!.fillStyle = "#7c3aed";
      ctx!.fillRect(M, y + 4, 90, 6);
      y += 16;
    }
    y += s.gap;
  }
  list.forEach((p, k) => {
    const x = p.getContext("2d")!;
    x.font = `400 19px ${FAMILY}`;
    x.fillStyle = "#8a85a0";
    x.textBaseline = "alphabetic";
    x.fillText(footer, M, PH - 60);
    const n = `${k + 1} / ${list.length}`;
    x.fillText(n, PW - M - x.measureText(n).width, PH - 60);
  });
  return list;
}

const enc = new TextEncoder();
function jpegBytes(c: HTMLCanvasElement): Uint8Array {
  const b64 = c.toDataURL("image/jpeg", 0.9).split(",")[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A PDF whose pages are the given canvases (A4). */
function pdf(canvases: HTMLCanvasElement[]): Blob {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (x: string | Uint8Array) => {
    const b = typeof x === "string" ? enc.encode(x) : x;
    parts.push(b);
    len += b.length;
  };
  const obj = (n: number, body: string | (string | Uint8Array)[]) => {
    offsets[n] = len;
    push(`${n} 0 obj\n`);
    for (const p of Array.isArray(body) ? body : [body]) push(p);
    push("\nendobj\n");
  };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const n = canvases.length;
  // 1 catalog, 2 pages, then per page: page, content, image
  const kids = canvases.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  canvases.forEach((c, i) => {
    const p = 3 + i * 3;
    const img = jpegBytes(c);
    const content = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q";
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
    obj(p + 1, [`<< /Length ${content.length} >>\nstream\n`, content, "\nendstream"]);
    obj(p + 2, [`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`, img, "\nendstream"]);
  });
  const total = 3 + n * 3;
  const xref = len;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/* ---------- Word (.docx) ---------- */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
/** A zip with no compression (stored), enough for a .docx. */
function zip(files: { name: string; data: string }[]): Blob {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let off = 0;
  const u16 = (v: number) => [v & 255, (v >>> 8) & 255];
  const u32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const head = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(head, name, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += head.length + name.length + data.length;
  }
  const size = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(size), ...u32(off), ...u16(0)]);
  return new Blob([...parts, ...central, end] as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function docx(blocks: DocBlock[], footer: string): Blob {
  const run = (t: string, o: { b?: boolean; sz?: number; color?: string } = {}) =>
    `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${o.b ? "<w:b/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:sz w:val="${o.sz ?? 22}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
  const para = (inner: string, after = 120, ind = 0) => `<w:p><w:pPr><w:spacing w:after="${after}"/>${ind ? `<w:ind w:left="${ind}" w:hanging="240"/>` : ""}</w:pPr>${inner}</w:p>`;
  const body = blocks
    .map((b) => {
      switch (b.kind) {
        case "title": return para(run(b.text, { b: true, sz: 40 }), 160);
        case "sub": return para(run(b.text, { sz: 22, color: "4A4560" }), 240);
        case "h": return para(run(b.text, { b: true, sz: 28, color: "4C1D95" }), 100);
        case "li": return para(run(`• ${b.text}`), 60, 480);
        case "small": return para(run(b.text, { sz: 18, color: "6B6680" }), 60);
        default: return para(run(b.text));
      }
    })
    .join("");
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${para(run(footer, { sz: 16, color: "8A85A0" }))}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", data: doc },
  ]);
}

/* ---------- download ---------- */

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const fileName = (title: string) => (title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "notes").slice(0, 60);

export async function downloadPdf(title: string, blocks: DocBlock[], footer = "Made with StudentOS · student-os.in") {
  await document.fonts?.ready;
  save(pdf(pages(blocks, footer)), `${fileName(title)}.pdf`);
}
export function downloadDocx(title: string, blocks: DocBlock[], footer = "Made with StudentOS · student-os.in") {
  save(docx(blocks, footer), `${fileName(title)}.docx`);
}
/** For tests: the files without downloading. */
export const _make = { pdf: (b: DocBlock[]) => pdf(pages(b, "f")), docx: (b: DocBlock[]) => docx(b, "f") };
