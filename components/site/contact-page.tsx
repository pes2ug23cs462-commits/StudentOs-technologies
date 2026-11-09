"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eyebrow, TiltCard, delay as d, usePointerVars } from "@/components/site/motion";
import { CONTACT_EMAIL, PageHero, SiteShell } from "@/components/site/site-shell";
import { FancyIcon, type FancyIconName, type FancyTone } from "@/components/site/fancy-icon";
import { SendIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const TOPICS = ["Help with my account", "Feedback or an idea", "Report a problem", "Privacy or data request", "Partnership or college", "Careers"];

const CARDS: { icon: FancyIconName; tone: FancyTone; title: string; text: string; href: string }[] = [
  { icon: "chat", tone: "cyan", title: "Help and feedback", text: "Questions about your plan, courses or account.", href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Help · StudentOS")}` },
  { icon: "shield", tone: "emerald", title: "Privacy and data", text: "Download, correct or delete your data.", href: "/privacy" },
  { icon: "rocket", tone: "violet", title: "Careers", text: "Internships and ways to build with us.", href: "/careers" },
];

export function ContactPage() {
  const stage = usePointerVars<HTMLDivElement>();
  const [f, setF] = useState({ name: "", email: "", topic: TOPICS[0], message: "" });
  const [sent, setSent] = useState(false);
  const valid = f.name.trim() && /\S+@\S+\.\S+/.test(f.email) && f.message.trim().length > 5;

  // No server needed: the message opens in the student’s own email app, addressed to us.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const body = `${f.message}\n\n— ${f.name} (${f.email})`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${f.topic} · StudentOS`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  const field = "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/35 outline-none transition focus:border-accent focus:bg-white/[0.06]";

  return (
    <SiteShell>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            We’d love to <span className="land-shine">hear from you</span>
          </>
        }
        sub="Questions, feedback, a bug, or an idea for StudentOS? Write to us and a real person will reply."
      />

      <section className="mx-auto grid max-w-[1200px] gap-8 px-5 pb-20 lg:grid-cols-[1fr_1.1fr]">
        {/* left: 3D mail card + ways to reach */}
        <div>
          <div ref={stage} className="reveal relative h-[230px] [perspective:1000px]" aria-hidden>
            <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]" style={{ transform: "rotateX(calc(12deg + var(--my,0) * -10deg)) rotateY(calc(-16deg + var(--mx,0) * 16deg))", transition: "transform 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}>
              <div className="absolute h-[200px] w-[300px] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.5),transparent)] blur-2xl" />
              <div className="land-glass relative flex h-[170px] w-[270px] flex-col justify-between rounded-2xl p-5 [animation:hero-bob_6s_ease-in-out_infinite]">
                <div className="flex items-center justify-between">
                  <FancyIcon name="mail" tone="sky" size={44} />
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10.5px] text-emerald-300">We reply by email</span>
                </div>
                <div>
                  <p className="text-[11px] text-white/45">Write to</p>
                  <p className="text-[16px] font-semibold text-white">{CONTACT_EMAIL}</p>
                </div>
                <span className="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-black shadow-[0_0_24px_rgba(34,211,238,0.5)] [transform:translateZ(60px)]">
                  <SendIcon size={16} />
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {CARDS.map(({ icon, tone, title, text, href }, i) => (
              <div key={title} className="reveal" style={d(0.08 * i)}>
                <Link href={href}>
                  <TiltCard max={6} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:border-accent/40">
                    <FancyIcon name={icon} tone={tone} size={46} />
                    <span className="relative">
                      <span className="block text-[14px] font-semibold text-white">{title}</span>
                      <span className="block text-[12.5px] text-white/55">{text}</span>
                    </span>
                  </TiltCard>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* right: form */}
        <form onSubmit={submit} className="reveal land-glass rounded-3xl p-6 sm:p-8" style={d(0.1)}>
          <Eyebrow>Send a message</Eyebrow>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-[12.5px] text-white/70">
              Your name
              <input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Priya Sharma" autoComplete="name" />
            </label>
            <label className="text-[12.5px] text-white/70">
              Your email
              <input className={field} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@college.edu" autoComplete="email" />
            </label>
          </div>
          <p className="mt-4 text-[12.5px] text-white/70">Topic</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <button key={t} type="button" onClick={() => setF({ ...f, topic: t })} className={cn("rounded-full border px-3 py-1.5 text-[12px] transition", f.topic === t ? "border-accent bg-accent/15 text-white" : "border-white/10 text-white/60 hover:border-white/25")}>
                {t}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-[12.5px] text-white/70">
            Message
            <textarea className={cn(field, "min-h-[140px] resize-y")} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Tell us what’s on your mind…" />
          </label>
          <button type="submit" disabled={!valid} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14.5px] font-semibold text-black shadow-[0_10px_40px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none">
            <SendIcon size={15} /> Send message
          </button>
          <p className="mt-3 text-center text-[11.5px] text-white/45">
            {sent ? "Your email app should open with the message ready. Press send there." : "This opens your email app with your message ready to send."}
          </p>
        </form>
      </section>
    </SiteShell>
  );
}
