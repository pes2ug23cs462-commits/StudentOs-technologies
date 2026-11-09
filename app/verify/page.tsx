"use client";

/* Public page: anyone (a recruiter, a college) can check a StudentOS certificate
   by scanning its QR code or typing its ID. No sign-in needed. */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CertificateView } from "@/components/learn/certificate-view";
import { CheckCircleIcon, SearchIcon, XCircleIcon } from "@/components/ui/icons";
import { LogoMark, Wordmark } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { fetchCert, type CertRecord } from "@/lib/certs";
import { certLabel } from "@/lib/learn";

type Result = { state: "idle" } | { state: "loading" } | { state: "found"; cert: CertRecord } | { state: "missing"; id: string } | { state: "error" };

function Verify() {
  const params = useSearchParams();
  const initial = params.get("id") ?? "";
  const [id, setId] = useState(initial);
  const [res, setRes] = useState<Result>({ state: "idle" });

  const check = async (value: string) => {
    if (!value.trim()) return;
    setRes({ state: "loading" });
    try {
      const cert = await fetchCert(value);
      setRes(cert ? { state: "found", cert } : { state: "missing", id: value.trim() });
    } catch {
      setRes({ state: "error" });
    }
  };

  useEffect(() => {
    if (initial) check(initial);
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-ink px-5 py-6">
      <header className="mx-auto flex max-w-[1000px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={26} />
          <Wordmark className="text-[16px]" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto mt-10 max-w-[1000px]">
        <h1 className="text-center text-[28px] font-semibold tracking-tight text-white">Verify a certificate</h1>
        <p className="mt-1.5 text-center text-[13.5px] text-white/55">Enter the certificate ID printed on the top right, or scan its QR code.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            check(id);
          }}
          className="mx-auto mt-6 flex max-w-[520px] gap-2"
        >
          <label className="relative flex-1">
            <SearchIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/45" />
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="STOS/CER/2026-XXXXXX"
              aria-label="Certificate ID"
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] pr-3 pl-9 text-[14px] text-white uppercase placeholder:text-white/35 placeholder:normal-case outline-none focus:border-accent"
            />
          </label>
          <button type="submit" className="h-11 rounded-lg bg-accent px-5 text-[14px] font-semibold text-black hover:bg-accent-hover">
            Verify
          </button>
        </form>

        <div className="mt-7">
          {res.state === "loading" && <p className="text-center text-[13px] text-white/55">Checking…</p>}
          {res.state === "error" && <p className="text-center text-[13px] text-rose-400">Couldn’t check right now. Please try again.</p>}
          {res.state === "missing" && (
            <div className="mx-auto flex max-w-[520px] items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/[0.07] p-4">
              <XCircleIcon size={20} className="mt-0.5 shrink-0 text-rose-400" />
              <div>
                <p className="text-[14px] font-semibold text-white">No certificate found</p>
                <p className="mt-0.5 text-[12.5px] text-white/60">
                  “{res.id}” is not a StudentOS certificate. Check the ID for typing mistakes.
                </p>
              </div>
            </div>
          )}
          {res.state === "found" && (
            <>
              <div className="mx-auto flex max-w-[620px] items-start gap-3 rounded-xl border border-accent/35 bg-accent/[0.07] p-4">
                <CheckCircleIcon size={20} className="mt-0.5 shrink-0 text-accent" />
                <div className="text-[12.5px] text-white/65">
                  <p className="text-[14px] font-semibold text-white">Valid certificate · {certLabel(res.cert.id)}</p>
                  <p className="mt-0.5">
                    Issued to <b className="text-white">{res.cert.name}</b> for completing <b className="text-white">{res.cert.course}</b> ({res.cert.level}, {res.cert.duration}) on{" "}
                    {new Date(res.cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
                  </p>
                </div>
              </div>
              <div className="mx-auto mt-6 max-w-[900px]">
                <CertificateView
                  cert={{
                    id: res.cert.id,
                    name: res.cert.name,
                    course: res.cert.course,
                    duration: res.cert.duration,
                    level: res.cert.level,
                    modules: res.cert.modules,
                    score: res.cert.score,
                    date: new Date(res.cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                  }}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}
