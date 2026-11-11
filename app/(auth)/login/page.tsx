"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell, AuthTabs } from "@/components/auth/auth-shell";
import { OrDivider, PasswordInput, SocialButtons } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label, Notice } from "@/components/ui/primitives";
import { authErrorText, isValidEmail, logIn, type AuthErrorCode } from "@/lib/auth";

export default function LogInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<AuthErrorCode | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const er: typeof errors = {};
    if (!isValidEmail(email)) er.email = "Enter a valid email, like name@college.edu";
    if (!password) er.password = "Enter your password";
    setErrors(er);
    setServerError(null);
    if (Object.keys(er).length) return;
    setLoading(true);
    const res = await logIn({ email: email.trim(), password, remember });
    if (!res.ok) {
      setServerError(res.code);
      setLoading(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && /^\/(college|join)\b/.test(next) ? next : "/dashboard");
  };

  const wrong = serverError === "invalid-credentials";

  return (
    <AuthShell>
      <AuthTabs active="login" />
      <h2 className="text-[26px] font-bold tracking-tight text-white">Welcome back</h2>
      <p className="mt-1.5 text-[13px] text-white/55">Log in to pick up your plan where you left it.</p>

      {serverError && (
        <Notice tone="error" title={authErrorText[serverError].title} className="mt-4">
          {authErrorText[serverError].body}
        </Notice>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-3">
        <fieldset disabled={loading} className="space-y-3">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((x) => ({ ...x, email: undefined }));
                setServerError(null);
              }}
              autoComplete="email"
              invalid={!!errors.email || wrong}
            />
            <FieldError>{errors.email}</FieldError>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((x) => ({ ...x, password: undefined }));
                setServerError(null);
              }}
              autoComplete="current-password"
              invalid={!!errors.password || wrong}
            />
            <FieldError>{errors.password}</FieldError>
          </div>
          <div className="flex items-center justify-between">
            <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
            <Link href="/forgot-password" className="text-[12.5px] font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
        </fieldset>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <OrDivider>or</OrDivider>
      <SocialButtons layout="stack" disabled={loading} onError={setServerError} remember={remember} />

      <p className="mt-5 text-center text-[13px] text-white/60">
        New to StudentOS?{" "}
        <Link href="/signup" className="font-semibold text-accent hover:underline">Create account</Link>
      </p>
      <p className="mt-3 text-center text-[11.5px] text-white/40">
        <Link href="/privacy" className="hover:text-white">Privacy Policy</Link> · <Link href="/terms" className="hover:text-white">Terms</Link>
      </p>
    </AuthShell>
  );
}
