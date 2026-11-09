"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { MailIcon, RefreshIcon } from "@/components/ui/icons";
import { FieldError, Input, Label, Notice } from "@/components/ui/primitives";
import { authErrorText, isValidEmail, sendPasswordReset } from "@/lib/auth";

type Status = "idle" | "sending" | "sent" | "error";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (status === "sending") return;
    if (!isValidEmail(email)) {
      setInvalid(true);
      return;
    }
    setStatus("sending");
    const res = await sendPasswordReset(email.trim());
    setStatus(res.ok ? "sent" : "error");
  };

  if (status === "sent") {
    return (
      <AuthShell>
        <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <MailIcon size={16} />
        </span>
        <h2 className="text-[27px] font-bold tracking-tight text-white">Check your email</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
          If an account exists for {email.trim()}, we’ve sent a link to reset your password. It expires in 30 minutes.
        </p>
        <Button variant="primary" size="lg" className="mt-6 w-full" onClick={() => router.push("/login")}>
          Back to log in
        </Button>
        <p className="mt-4 text-center text-[13px] text-white/60">
          Didn’t get it?{" "}
          <button type="button" onClick={() => send()} className="font-semibold text-accent hover:underline">
            Resend link
          </button>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="text-[27px] font-bold tracking-tight text-white">Reset your password</h2>
      <p className="mt-1.5 text-[13px] text-white/55">Enter the email you signed up with and we’ll send you a reset link.</p>

      {status === "error" && (
        <Notice tone="error" title={authErrorText["send-failed"].title} className="mt-5">
          {authErrorText["send-failed"].body}
        </Notice>
      )}

      <form onSubmit={send} noValidate className="mt-5 space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@college.edu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setInvalid(false);
            }}
            autoComplete="email"
            invalid={invalid}
            disabled={status === "sending"}
          />
          <FieldError>{invalid ? "Enter a valid email, like name@college.edu" : undefined}</FieldError>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={status === "sending"}
          icon={status === "error" ? <RefreshIcon size={14} /> : undefined}
        >
          {status === "error" ? "Try again" : status === "sending" ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-4 text-center text-[13px] text-white/60">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">Back to log in</Link>
      </p>
    </AuthShell>
  );
}
