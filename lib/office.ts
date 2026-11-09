/* Reads the text out of Word (.docx) and PowerPoint (.pptx) files in the browser.
   Both are zip files of XML; we unzip just the parts we need with the browser's
   built-in DecompressionStream, so no extra package is needed. */

type Entry = { name: string; method: number; size: number; offset: number };

function entries(buf: ArrayBuffer): Entry[] {
  const v = new DataView(buf);
  // find "end of central directory" (searching back from the end)
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70_000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: Entry[] = [];
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    out.push({ name, method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function read(buf: ArrayBuffer, e: Entry): Promise<string> {
  const v = new DataView(buf);
  const nameLen = v.getUint16(e.offset + 26, true);
  const extraLen = v.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const data = new Uint8Array(buf, start, e.size);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error("unsupported compression");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/** Paragraph text from WordprocessingML / DrawingML (w:p + w:t, a:p + a:t). */
function textFromXml(xml: string, ns: "w" | "a") {
  const paras = xml.split(new RegExp(`</${ns}:p>`));
  const tRe = new RegExp(`<${ns}:t(?:\\s[^>]*)?>([\\s\\S]*?)</${ns}:t>`, "g");
  return paras
    .map((p) => {
      let line = "";
      for (const m of p.matchAll(tRe)) line += decodeXml(m[1]);
      if (ns === "w" && /<w:tab\/>/.test(p) && !line) line = "";
      return line.trim();
    })
    .filter(Boolean)
    .join("\n");
}

export async function readDocx(file: File) {
  const buf = await file.arrayBuffer();
  const list = entries(buf);
  const main = list.find((e) => e.name === "word/document.xml");
  if (!main) throw new Error("not a Word file");
  return textFromXml(await read(buf, main), "w");
}

export async function readPptx(file: File) {
  const buf = await file.arrayBuffer();
  const slides = entries(buf)
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name))
    .sort((a, b) => Number(a.name.match(/\d+/)![0]) - Number(b.name.match(/\d+/)![0]));
  if (!slides.length) throw new Error("not a PowerPoint file");
  const parts: string[] = [];
  for (const [i, s] of slides.entries()) {
    const t = textFromXml(await read(buf, s), "a");
    if (t) parts.push(`Slide ${i + 1}\n${t}`);
  }
  return { text: parts.join("\n\n"), slides: slides.length };
}
