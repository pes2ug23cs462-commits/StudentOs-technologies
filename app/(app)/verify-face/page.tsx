"use client";

/* Face check set-up (/verify-face): the student takes their faceprint once, with consent.
   In strict tests and interviews the camera then checks that the person taking the round
   is the account's owner (see lib/faceprint.ts). Only numbers are saved, never a photo,
   and the student can delete them here at any time. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CheckIcon, ShieldIcon, TrashIcon } from "@/components/ui/icons";
import { faceApi } from "@/lib/faceprint";
import { captureFaceprint } from "@/lib/presence";
import { cn } from "@/lib/utils";

type Status = { enrolled: boolean; at: number } | null;

export default function VerifyFace() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<"idle" | "camera" | "capturing" | "saving" | "done">("idle");
  const [progress, setProgress] = useState({ share: 0, hint: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    faceApi<{ enrolled: boolean; at: number }>({ action: "status" })
      .then(setStatus)
      .catch(() => setStatus({ enrolled: false, at: 0 }));
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startCamera = async () => {
    setError("");
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } });
      stream.current = st;
      setStep("camera");
      requestAnimationFrame(async () => {
        if (!video.current) return;
        video.current.srcObject = st;
        await video.current.play().catch(() => {});
      });
    } catch {
      setError("Camera is blocked. Allow the camera for this site and try again.");
    }
  };

  const capture = async () => {
    if (!video.current) return;
    setError("");
    setStep("capturing");
    const print = await captureFaceprint(video.current, (share, hint) => setProgress({ share, hint }));
    if (!print) {
      setStep("camera");
      setError("Couldn’t get a clear look at your face. Sit facing a light, look straight at the camera, and try again.");
      return;
    }
    setStep("saving");
    try {
      await faceApi({ action: "enroll", print, consent: true });
      stream.current?.getTracks().forEach((t) => t.stop());
      setStatus({ enrolled: true, at: Date.now() });
      setStep("done");
    } catch {
      setStep("camera");
      setError("Couldn’t save it. Check your internet and try again.");
    }
  };

  const remove = async () => {
    setError("");
    try {
      await faceApi({ action: "delete" });
      setStatus({ enrolled: false, at: 0 });
      setStep("idle");
    } catch {
      setError("Couldn’t delete it. Try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8">
      <Link href="/tests" className="inline-flex items-center gap-1.5 text-[12.5px] text-white/60 hover:text-white">
        <ArrowLeftIcon size={13} /> Back
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
          <ShieldIcon size={20} />
        </span>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-white">Face check</h1>
          <p className="text-[13px] text-white/60">So nobody else can take a strict test or interview in your name.</p>
        </div>
      </div>

      {status?.enrolled && step !== "done" && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] px-4 py-3">
          <p className="flex items-center gap-2 text-[13.5px] text-emerald-200">
            <CheckIcon size={15} /> Face check is set up{status.at ? ` (${new Date(status.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})` : ""}.
          </p>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => void startCamera()}>
              Take again
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void remove()}>
              <TrashIcon size={13} /> Delete
            </Button>
          </span>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-emerald-200">
            <CheckIcon size={16} /> Done. Your face check is set up.
          </p>
          <p className="mt-1 text-[13px] text-white/65">In strict tests and interviews the camera will check that it’s you.</p>
          <Link href="/tests" className="mt-3 inline-block text-[13px] font-semibold text-accent hover:underline">
            Go to tests →
          </Link>
        </div>
      )}

      {!status?.enrolled && step === "idle" && (
        <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-[15px] font-semibold text-white">How it works</h2>
          <ul className="space-y-2 text-[13px] leading-relaxed text-white/70">
            <li>· Look at your camera for about 5 seconds. We measure the shape of your face (distances between eyes, nose, jaw) as a list of numbers.</li>
            <li>· <b className="text-white">No photo or video is saved or sent.</b> Only those numbers are stored with your account.</li>
            <li>· In strict rounds, the camera checks the same numbers. If the face doesn’t match, you get a warning. If it matches another student who is already placed, the round stops and your placement cell is told, so they can check.</li>
            <li>· It isn’t perfect: bad light or a new look can confuse it. Nobody is punished by it alone; the placement cell always checks.</li>
            <li>· You can delete it here any time.</li>
          </ul>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-black/20 p-3 text-[13px] text-white/85">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
            I agree to StudentOS saving my face measurements (not a photo) to check my identity in strict tests and interviews. I can delete them at any time.
          </label>
          <Button variant="primary" disabled={!consent} onClick={() => void startCamera()}>
            Start camera
          </Button>
        </div>
      )}

      {(step === "camera" || step === "capturing" || step === "saving") && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-xl bg-black">
            <video ref={video} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            <div className="pointer-events-none absolute inset-[14%_24%] rounded-[50%] border-2 border-dashed border-white/50" aria-hidden />
            {step !== "camera" && (
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-4 py-2.5 backdrop-blur">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className={cn("h-full rounded-full bg-cyan-400 transition-all")} style={{ width: `${Math.round((step === "saving" ? 1 : progress.share) * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-[12px] text-white/80">{step === "saving" ? "Saving…" : progress.hint || "Hold still…"}</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-[12.5px] text-white/55">Sit facing a light, keep your face inside the oval and look straight at the camera.</p>
          <div className="mt-3 flex justify-center">
            <Button variant="primary" loading={step !== "camera"} disabled={step !== "camera"} onClick={() => void capture()}>
              {step === "camera" ? "Take my face check" : "Measuring…"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-300">{error}</p>}
    </div>
  );
}
