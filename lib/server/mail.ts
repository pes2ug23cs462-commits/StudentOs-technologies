/* Server-only: email through Resend (https://resend.com), using the batch endpoint
   (up to 100 emails per call). Needs RESEND_API_KEY. EMAIL_FROM sets the sender,
   e.g. "StudentOS <placements@yourdomain.in>"; that domain must be verified in Resend.
   Without a verified domain Resend only delivers to the Resend account owner's own email. */

export const mailConfigured = () => !!process.env.RESEND_API_KEY;

export type Mail = { to: string; subject: string; text: string; html: string };

/** Sends the emails; returns how many Resend accepted. Never throws. */
export async function sendMails(list: Mail[]): Promise<number> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !list.length) return 0;
  const from = process.env.EMAIL_FROM || "StudentOS <onboarding@resend.dev>";
  let sent = 0;
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map((m) => ({ from, to: [m.to], subject: m.subject, text: m.text, html: m.html }))),
        cache: "no-store",
      });
      if (res.ok) sent += chunk.length;
    } catch {
      /* count only what went through */
    }
  }
  return sent;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A simple, readable email: heading, a few lines, one button. */
export function mailHtml(o: { heading: string; lines: string[]; button: string; url: string; foot: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f3f8;font-family:Arial,Helvetica,sans-serif;color:#1a1726">
<div style="max-width:520px;margin:0 auto;padding:28px 18px">
<p style="margin:0 0 18px;font-size:15px;font-weight:bold;color:#7c3aed">StudentOS · Placements</p>
<div style="background:#ffffff;border-radius:14px;padding:26px 24px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${esc(o.heading)}</h1>
${o.lines.map((l) => `<p style="margin:0 0 8px;font-size:14.5px;line-height:1.5;color:#3d3a4a">${esc(l)}</p>`).join("")}
<p style="margin:22px 0 4px"><a href="${esc(o.url)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:11px 18px;border-radius:10px">${esc(o.button)}</a></p>
</div>
<p style="margin:16px 4px 0;font-size:11.5px;line-height:1.5;color:#7a7590">${esc(o.foot)}</p>
</div></body></html>`;
}
