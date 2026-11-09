"use client";

import { useRouter } from "next/navigation";
import { useState, type InputHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/drawer";
import { EyeIcon, EyeOffIcon, GitHubIcon, GoogleIcon, LinkedInIcon, SpinnerIcon } from "@/components/ui/icons";
import { fieldClass } from "@/components/ui/primitives";
import { authErrorText, providerName, signInWithProvider, type AuthErrorCode, type SocialProvider } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function PasswordInput({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={show ? "text" : "password"}
        aria-invalid={invalid || undefined}
        className={cn(fieldClass(invalid, show && !invalid), "pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-white/55 hover:text-white"
      >
        {show ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
      </button>
    </div>
  );
}

const providers: { key: SocialProvider; Icon: (p: { size?: number }) => React.ReactElement }[] = [
  { key: "google", Icon: GoogleIcon },
  { key: "github", Icon: GitHubIcon },
  { key: "linkedin", Icon: LinkedInIcon },
];

/* Google and GitHub sign in with Firebase. LinkedIn isn’t set up yet,
   so it explains that instead of failing silently. */
export function SocialButtons({ layout, disabled, onError, remember = false }: { layout: "row" | "stack"; disabled?: boolean; onError?: (code: AuthErrorCode) => void; remember?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [notice, setNotice] = useState<SocialProvider | null>(null);

  const go = async (p: SocialProvider) => {
    if (p === "linkedin") return setNotice(p);
    setBusy(p);
    const res = await signInWithProvider(p, remember);
    if (res.ok) {
      router.push(res.isNew ? "/setup/academic" : "/dashboard");
      return;
    }
    setBusy(null);
    if (res.code !== "popup-closed") onError?.(res.code);
  };

  return (
    <>
      <div className={layout === "row" ? "grid grid-cols-3 gap-2.5" : "flex flex-col gap-2.5"}>
        {providers.map(({ key, Icon }) => (
          <button
            key={key}
            type="button"
            disabled={disabled || !!busy}
            onClick={() => go(key)}
            className="flex h-[38px] items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] text-[12.5px] font-medium text-white/90 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            {busy === key ? <SpinnerIcon size={15} className="animate-spin" /> : <Icon size={15} />}
            {layout === "stack" ? `Continue with ${providerName[key]}` : providerName[key]}
          </button>
        ))}
      </div>
      <Dialog
        open={!!notice}
        onClose={() => setNotice(null)}
        title={`${notice ? providerName[notice] : ""} sign-in is coming soon`}
        actions={
          <Button size="sm" variant="primary" onClick={() => setNotice(null)}>
            OK
          </Button>
        }
      >
        {authErrorText["not-enabled"].body}
      </Dialog>
    </>
  );
}

export function OrDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3.5 flex items-center gap-3 text-[11px] text-white/40">
      <span className="h-px flex-1 bg-white/10" />
      {children}
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
