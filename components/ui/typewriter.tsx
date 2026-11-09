"use client";

/* Types text out letter by letter with a blinking cursor (from the 21st.dev
   "typewriter-text" component). With `loop`, it deletes and types the next line.
   Shows the full text at once when the OS asks for reduced motion. */

import { useEffect, useState } from "react";

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({ text, speed = 100, cursor = "|", loop = false, deleteSpeed = 50, delay = 1500, className }: TypewriterProps) {
  const lines = Array.isArray(text) ? text : [text];
  const [shown, setShown] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [line, setLine] = useState(0);
  const [still, setStill] = useState(false);
  const current = lines[line] || "";

  useEffect(() => setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  useEffect(() => {
    if (!current || still) return;
    const t = setTimeout(
      () => {
        if (!deleting) {
          if (index < current.length) {
            setShown((p) => p + current[index]);
            setIndex((p) => p + 1);
          } else if (loop) setTimeout(() => setDeleting(true), delay);
        } else if (shown.length > 0) setShown((p) => p.slice(0, -1));
        else {
          setDeleting(false);
          setIndex(0);
          setLine((p) => (p + 1) % lines.length);
        }
      },
      deleting ? deleteSpeed : speed,
    );
    return () => clearTimeout(t);
  }, [index, deleting, current, loop, speed, deleteSpeed, delay, shown, lines.length, still]);

  return (
    <span className={className} aria-label={current}>
      <span aria-hidden>{still ? current : shown}</span>
      <span aria-hidden className="animate-pulse">
        {cursor}
      </span>
    </span>
  );
}
