"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell, AuthTabs } from "@/components/auth/auth-shell";
import { OrDivider, PasswordInput, SocialButtons } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Notice } from "@/components/ui/primitives";
import { authErrorText, isValidEmail, signUp, type AuthErrorCode } from "@/lib/auth";

type Field = "name" | "email" | "password" | "confirm";
type Errors = Partial<Record<Field, string>>;

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<AuthErrorCode | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
    setServerError(null);
  };

  const validate = (): Errors => {
    const er: Errors = {};
    if (!form.name.trim()) er.name = "Enter your name";
    if (!isValidEmail(form.email)) er.email = "Enter a valid email, like name@college.edu";
    if (form.password.length < 8) er.password = "Use at least 8 characters";
    if (!form.confirm || form.confirm !== form.password) er.confirm = "Passwords don’t match";
    return er;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    const res = await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    if (!res.ok) {
      setServerError(res.code);
      setLoading(false);
      return;
    }
    router.push("/onboarding");
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <AuthShell>
      <AuthTabs active="signup" />
      <h2 className="text-[26px] font-bold tracking-tight text-white">Create your account</h2>
      <p className="mt-1.5 text-[13px] text-white/55">Free to start. You’ll set up your first study plan right after.</p>

      {errorCount > 0 && (
        <Notice tone="error" title={`Check ${errorCount} field${errorCount > 1 ? "s" : ""}`} className="mt-4">
          Fix the highlighted fields to create your account.
        </Notice>
      )}
      {serverError && (
        <Notice tone="error" title={authErrorText[serverError].title} className="mt-4">
          {authErrorText[serverError].body}{" "}
          {serverError === "email-in-use" && (
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          )}
        </Notice>
      )}

      <div className="mt-4">
        <SocialButtons layout="row" disabled={loading} onError={setServerError} />
      </div>
      <OrDivider>or sign up with email</OrDivider>

      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <fieldset disabled={loading} className="space-y-3 disabled:opacity-60">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Aarav Mehta" value={form.name} onChange={set("name")} autoComplete="name" invalid={!!errors.name} />
            <FieldError>{errors.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="you@college.edu" value={form.email} onChange={set("email")} autoComplete="email" invalid={!!errors.email} />
            <FieldError>{errors.email}</FieldError>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" placeholder="At least 8 characters" value={form.password} onChange={set("password")} autoComplete="new-password" invalid={!!errors.password} />
              <FieldError>{errors.password}</FieldError>
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <PasswordInput id="confirm" placeholder="Repeat password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" invalid={!!errors.confirm} />
              <FieldError>{errors.confirm}</FieldError>
            </div>
          </div>
        </fieldset>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          {loading ? "Creating your account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-4 text-[11.5px] leading-relaxed text-white/45">
        By creating an account you agree to the{" "}
        <Link href="/terms" className="text-accent hover:underline">Terms and Conditions</Link> and{" "}
        <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
      </p>
      <p className="mt-4 text-center text-[13px] text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
