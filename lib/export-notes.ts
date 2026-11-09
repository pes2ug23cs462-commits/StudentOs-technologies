/* Download a student's notes as a Word document or a PDF, with no extra packages.
   Word: an HTML document saved as .doc (opens in Word, Google Docs and LibreOffice).
   PDF: the browser's print dialog with “Save as PDF”. */

export interface NoteSection {
  heading: string;
  sub?: string;
  text: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paras = (t: string) =>
  t.trim()
    ? t
        .trim()
        .split(/\n{2,}/)
        .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
        .join("")
    : `<p class="empty">No notes yet.</p>`;

function html(title: string, sections: NoteSection[], forWord: boolean) {
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const body = sections
    .map((s) => `<h2>${esc(s.heading)}</h2>${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ""}${paras(s.text)}`)
    .join("");
  return `<!DOCTYPE html>
<html${forWord ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"' : ""}>
<head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Calibri, Arial, sans-serif; color: #0f172a; font-size: 11.5pt; line-height: 1.55; }
  .brand { color: #6d28d9; font-weight: 700; font-size: 10pt; letter-spacing: .08em; text-transform: uppercase; }
  h1 { font-size: 20pt; margin: 4pt 0 2pt; }
  .meta { color: #64748b; font-size: 9.5pt; margin-bottom: 14pt; }
  h2 { font-size: 13.5pt; color: #4c1d95; border-bottom: 1px solid #ddd6fe; padding-bottom: 3pt; margin: 16pt 0 4pt; }
  .sub { color: #64748b; font-size: 9.5pt; margin: 0 0 6pt; }
  p { margin: 0 0 8pt; }
  .empty { color: #94a3b8; font-style: italic; }
</style></head>
<body>
  <div class="brand">StudentOS · My notes</div>
  <h1>${esc(title)}</h1>
  <div class="meta">Downloaded on ${date}</div>
  ${body}
</body></html>`;
}

const fileName = (title: string, ext: string) => `${title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "notes"}-notes.${ext}`;

export function downloadWord(title: string, sections: NoteSection[]) {
  const blob = new Blob(["﻿", html(title, sections, true)], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(title, "doc");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Opens the print dialog for the notes only (choose “Save as PDF”). */
export function downloadPdf(title: string, sections: NoteSection[]) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) return frame.remove();
  doc.open();
  doc.write(html(title, sections, false));
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 250);
}
