"use client";

/* Student reviews: a strip for the landing page and the /reviews page where
   signed-in students write theirs. Only reviews approved by StudentOS are public. */

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { FancyIcon } from "@/components/site/fancy-icon";
import { Eyebrow, TiltCard, delay as d } from "@/components/site/motion";
import { PageHero, SiteShell } from "@/components/site/site-shell";
import { ArrowRightIcon, StarIcon } from "@/components/ui/icons";
import { REVIEW_MAX, REVIEW_MIN, approvedReviews, checkReview, deleteReview, myReview, saveReview, type Review } from "@/lib/reviews";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function useApproved() {
  const [list, setList] = useState<Review[] | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    approvedReviews()
      .then(setList)
      .catch(() => setList([]));
  }, [n]);
  return [list, () => setN((x) => x + 1)] as const;
}

function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="inline-flex gap-1" onMouseLeave={() => setHover(0)} role={onChange ? "radiogroup" : undefined} aria-label={onChange ? "Rating" : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="transition hover:scale-125"
          >
            <StarIcon size={size} className={n <= shown ? "fill-amber-300 text-amber-300" : "text-white/25"} />
          </button>
        ) : (
          <StarIcon key={n} size={size} className={n <= shown ? "fill-amber-300 text-amber-300" : "text-white/20"} />
        ),
      )}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function ReviewCard({ r, className }: { r: Review; className?: string }) {
  return (
    <TiltCard max={8} className={cn("rounded-3xl border border-white/10 bg-white/[0.03] p-6", className)}>
      <div className="relative flex items-center justify-between">
        <Stars value={r.rating} />
        <FancyIcon name="quote" tone="violet" size={34} />
      </div>
      <p className="relative mt-4 text-[14px] leading-relaxed text-white/80">“{r.text}”</p>
      <div className="relative mt-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[13px] font-semibold text-[#ffffff]">{initials(r.name)}</span>
        <span>
          <span className="block text-[13.5px] font-semibold text-white">{r.name}</span>
          {r.role && <span className="block text-[12px] text-white/50">{r.role}</span>}
        </span>
      </div>
    </TiltCard>
  );
}

/** Landing page section. Shows only real, approved reviews; otherwise invites the first one. */
export function ReviewsStrip() {
  const [list] = useApproved();
  const many = (list?.length ?? 0) >= 4;
  return (
    <section id="reviews" className="relative scroll-mt-20 overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-24">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="reveal flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Reviews</Eyebrow>
            <h2 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">What students say</h2>
          </div>
          <Link href="/reviews#write" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 text-[14px] font-medium text-white hover:border-accent/50">
            <FancyIcon name="star" tone="amber" size={26} /> Write a review
          </Link>
        </div>
      </div>

      {list === null ? (
        <div className="mx-auto mt-10 grid max-w-[1200px] gap-4 px-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[210px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="reveal mx-auto mt-10 max-w-[1200px] px-5">
          <TiltCard max={5} className="flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
            <FancyIcon name="heart" tone="pink" size={64} float />
            <p className="relative mt-5 text-[20px] font-semibold text-white">Be one of the first to review StudentOS</p>
            <p className="relative mt-2 max-w-[460px] text-[14px] text-white/55">Using StudentOS? Tell other students what helped you, and what we should improve.</p>
            <Link href="/reviews#write" className="relative mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-black">
              Write a review <ArrowRightIcon size={14} />
            </Link>
          </TiltCard>
        </div>
      ) : many ? (
        <div className="mt-10 space-y-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          {[0, 1].map((row) => {
            const items = list.filter((_, i) => i % 2 === row);
            return (
              <div key={row} className="flex w-max gap-4 hover:[animation-play-state:paused]" style={{ animation: `land-marquee ${Math.max(30, items.length * 9)}s linear infinite ${row ? "reverse" : ""}` }}>
                {[...items, ...items].map((r, i) => (
                  <ReviewCard key={`${r.uid}-${i}`} r={r} className="w-[340px]" />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto mt-10 grid max-w-[1200px] gap-4 px-5 md:grid-cols-3">
          {list.map((r, i) => (
            <div key={r.uid} className="reveal" style={d(0.08 * i)}>
              <ReviewCard r={r} className="h-full" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- /reviews ---------- */

function WriteReview({ onLive }: { onLive: () => void }) {
  const { state, status, uid } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState<Review | null>(null);
  const [f, setF] = useState({ name: "", role: "", rating: 0, text: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (status !== "ready" || !uid) return;
    const a = state.setup?.academic;
    const role = [[a?.course, a?.year].filter(Boolean).join(", "), a?.college].filter(Boolean).join(" · ");
    myReview(uid)
      .then((r) => {
        setExisting(r);
        setF(r ? { name: r.name, role: r.role, rating: r.rating, text: r.text } : { name: state.profile.name, role, rating: 0, text: "" });
        if (r) setConsent(true);
      })
      .catch(() => setF({ name: state.profile.name, role, rating: 0, text: "" }))
      .finally(() => setLoaded(true));
  }, [status, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status !== "ready") {
    return (
      <div className="land-glass flex flex-col items-center rounded-3xl p-10 text-center">
        <FancyIcon name="star" tone="amber" size={60} float />
        <p className="mt-5 text-[20px] font-semibold text-white">Log in to write a review</p>
        <p className="mt-2 max-w-[400px] text-[14px] text-white/55">Only StudentOS students can review, so every review comes from a real account.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-[14px] font-semibold text-black">
            Log in
          </Link>
          <Link href="/signup" className="inline-flex h-11 items-center rounded-xl border border-white/15 px-5 text-[14px] font-medium text-white">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const valid = f.name.trim().length >= 2 && f.rating > 0 && f.text.trim().length >= REVIEW_MIN && consent;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || !uid) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveReview(uid, f);
      setExisting(r);
      // automatic check: approves fine reviews straight away
      const c = await checkReview();
      if (c.approved) {
        setExisting({ ...r, approved: true });
        setMsg({ ok: true, text: "Thank you! Your review is live on StudentOS now." });
        onLive();
      } else if (c.reason && c.reason !== "manual") {
        setMsg({ ok: false, text: `Not published yet: ${c.reason} You can edit it and submit again.` });
      } else {
        setMsg({ ok: true, text: "Thank you! Your review will appear on StudentOS after a quick check." });
      }
    } catch {
      setMsg({ ok: false, text: "Couldn’t save your review. Check your internet and try again." });
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!uid || !window.confirm("Delete your review?")) return;
    await deleteReview(uid).catch(() => undefined);
    setExisting(null);
    setF({ ...f, rating: 0, text: "" });
    setConsent(false);
    setMsg({ ok: true, text: "Your review was deleted." });
  };
  const field = "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/35 outline-none transition focus:border-accent";

  return (
    <form onSubmit={submit} className="land-glass rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <FancyIcon name="star" tone="amber" size={44} />
        <div>
          <p className="text-[18px] font-semibold text-white">{existing ? "Edit your review" : "Write your review"}</p>
          <p className="text-[12.5px] text-white/50">{existing ? (existing.approved ? "Live on StudentOS. Editing sends it for a quick check again." : "Waiting for a quick check before it goes live.") : "Reviews go live after a quick check."}</p>
        </div>
      </div>
      {!loaded ? (
        <div className="mt-6 h-[300px] animate-pulse rounded-2xl bg-white/[0.04]" />
      ) : (
        <>
          <p className="mt-6 text-[12.5px] text-white/70">Your rating</p>
          <div className="mt-2">
            <Stars value={f.rating} size={30} onChange={(rating) => setF({ ...f, rating })} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-[12.5px] text-white/70">
              Name shown
              <input className={field} value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Priya S." />
            </label>
            <label className="text-[12.5px] text-white/70">
              Course and college <span className="text-white/40">(optional)</span>
              <input className={field} value={f.role} maxLength={90} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="B.Com, 3rd Year · Christ University" />
            </label>
          </div>
          <label className="mt-4 block text-[12.5px] text-white/70">
            Your review
            <textarea className={cn(field, "min-h-[130px] resize-y")} value={f.text} maxLength={REVIEW_MAX} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="What helped you most? What should we improve?" />
          </label>
          <p className="mt-1 text-right text-[11px] text-white/40">
            {f.text.trim().length < REVIEW_MIN ? `At least ${REVIEW_MIN} characters` : `${f.text.length}/${REVIEW_MAX}`}
          </p>
          <label className="mt-3 flex items-start gap-2.5 text-[12.5px] text-white/65">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
            Show my name, course and review publicly on the StudentOS website. I can edit or delete it any time.
          </label>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!valid || busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-[14px] font-semibold text-black transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40">
              {busy ? "Saving…" : existing ? "Update review" : "Submit review"}
            </button>
            {existing && (
              <button type="button" onClick={remove} className="text-[12.5px] text-white/50 hover:text-rose-300">
                Delete my review
              </button>
            )}
          </div>
          {msg && (
            <p className={cn("mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px]", msg.ok ? "land-ok bg-emerald-400/10" : "land-bad bg-rose-400/10")}>
              {msg.ok && <FancyIcon name="check" tone="emerald" size={22} />} {msg.text}
            </p>
          )}
        </>
      )}
    </form>
  );
}

export function ReviewsPage() {
  const [list, reload] = useApproved();
  const avg = list && list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
  return (
    <SiteShell>
      <PageHero
        eyebrow="Reviews"
        title={
          <>
            Real reviews from <span className="land-shine">real students</span>
          </>
        }
        sub="Every review here is written by a StudentOS student from their own account and checked for spam and abuse before it goes live."
      >
        {list && list.length > 0 && (
          <div className="hero-in mt-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2" style={d(0.4)}>
            <Stars value={Math.round(avg)} size={16} />
            <span className="text-[13.5px] text-white/75">
              {avg.toFixed(1)} from {list.length} review{list.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </PageHero>
      <section className="mx-auto grid max-w-[1200px] gap-8 px-5 pb-24 lg:grid-cols-[1.25fr_1fr]">
        <div>
          {list === null ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[200px] animate-pulse rounded-3xl bg-white/[0.04]" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 p-10 text-center">
              <FancyIcon name="heart" tone="pink" size={60} float />
              <p className="mt-5 text-[18px] font-semibold text-white">No reviews yet</p>
              <p className="mt-2 max-w-[360px] text-[14px] text-white/55">Be the first student to share what StudentOS is like.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((r, i) => (
                <div key={r.uid} className="reveal" style={d(0.05 * (i % 4))}>
                  <ReviewCard r={r} className="h-full" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div id="write" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <WriteReview onLive={reload} />
        </div>
      </section>
    </SiteShell>
  );
}
