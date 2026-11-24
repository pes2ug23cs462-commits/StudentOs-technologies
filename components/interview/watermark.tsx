"use client";

/* Faint repeated name tag across the whole screen during strict tests (like Unstop).
   A photo of a question taken with a phone carries the student's email and the time,
   so leaked questions can be traced back, which stops most people from trying. */

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function Watermark({ text }: { text?: string }) {
  const [line1, setLine1] = useState(text ?? "");
  const [line2, setLine2] = useState("");
  useEffect(() => {
    const u = auth.currentUser;
    if (!text) setLine1(u?.email || u?.displayName || "StudentOS candidate");
    const stamp = () => setLine2(`StudentOS · ${new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`);
    stamp();
    const t = setInterval(stamp, 60_000);
    return () => clearInterval(t);
  }, [text]);
  if (!line1) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="220"><g transform="rotate(-24 190 110)" font-family="Arial, sans-serif" fill="#ffffff" fill-opacity="0.075" text-anchor="middle"><text x="190" y="104" font-size="16">${esc(line1)}</text><text x="190" y="126" font-size="12.5">${esc(line2)}</text></g></svg>`;
  return (
    <div
      aria-hidden
      data-watermark
      className="pointer-events-none fixed inset-0 z-[65] select-none print:block"
      style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundRepeat: "repeat" }}
    />
  );
}
