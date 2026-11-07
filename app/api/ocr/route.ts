/* POST /api/ocr  { image: "data:image/jpeg;base64,..." }
   Reads the text in a photo of notes or a question paper with a vision model,
   so it can be saved as a study material. Returns { text }. */

import { NextResponse } from "next/server";
import { AiError, chat } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

export async function POST(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { image?: string };
  const image = String(body.image ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 3_000_000) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });
  try {
    const { text } = await chat(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Copy out all the text in this image exactly, keeping headings, lists and line breaks. If there are diagrams, add a one-line description of each in [square brackets]. Reply with the text only, no comments.",
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      { vision: true, maxTokens: 2500, temperature: 0 },
    );
    return NextResponse.json({ text });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
