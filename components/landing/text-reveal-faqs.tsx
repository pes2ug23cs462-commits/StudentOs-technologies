"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FaqItem = { q: string; a: string; extra?: ReactNode };

/** Letters fade in from a blur, one after another (like a typed reveal). Words never break mid-word. */
export function BlurredStagger({ text, step = 0.012 }: { text: string; step?: number }) {
  let i = 0;
  return (
    <p className="text-[13.5px] leading-relaxed break-words text-white/65" aria-label={text}>
      {text.split(" ").map((word, w) => (
        <span key={w} aria-hidden className="inline-block whitespace-nowrap">
          {word.split("").map((ch) => {
            const style: CSSProperties = { animationDelay: `${(i++ * step).toFixed(3)}s` };
            return (
              <span key={i} className="faq-letter inline-block" style={style}>
                {ch}
              </span>
            );
          })}
          {w < text.split(" ").length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </p>
  );
}

function Row({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className="border-b border-white/[0.08] last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-[15px] font-medium text-white transition-colors hover:text-accent"
        >
          {item.q}
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={cn("shrink-0 text-white/50 transition-transform duration-300 group-hover:text-accent", open && "rotate-180 text-accent")}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h3>
      <div
        id={id}
        role="region"
        className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          {open && (
            <div className="pb-4">
              <BlurredStagger text={item.a} />
              {item.extra && <div className="faq-letter mt-2 text-[13.5px] text-white/65" style={{ animationDelay: `${item.a.length * 0.012}s` }}>{item.extra}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TextRevealFaqs({ items, contactHref = "/contact" }: { items: FaqItem[]; contactHref?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const help = (
    <>
      Can’t find what you’re looking for? Reach out to our{" "}
      <Link href={contactHref} className="font-medium text-accent hover:underline">
        support team
      </Link>
      .
    </>
  );
  return (
    <div className="grid gap-8 md:grid-cols-5 md:gap-12">
      <div className="md:col-span-2">
        <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">FAQ</span>
        <h2 className="mt-4 text-[34px] font-semibold tracking-tight text-white sm:text-[40px]">Questions, answered</h2>
        <p className="mt-3 text-[15px] text-balance text-white/60">Everything you need to know about StudentOS.</p>
        <p className="mt-6 hidden text-[14px] text-white/55 md:block">{help}</p>
      </div>
      <div className="depth rounded-2xl border border-white/10 bg-white/[0.02] px-5 md:col-span-3">
        {items.map((item, i) => (
          <Row key={item.q} item={item} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
        ))}
      </div>
      <p className="text-[14px] text-white/55 md:hidden">{help}</p>
    </div>
  );
}
