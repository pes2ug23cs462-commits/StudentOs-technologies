"use client";

/* A college's logo (or its initials in a badge), and the admin's editor:
   find it from the website, paste an image link, or upload a file.
   Whatever is picked is shrunk to a small square in the browser before saving. */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { Input, Label } from "@/components/ui/primitives";
import { collegeInitials, saveBranding, type College } from "@/lib/college";
import { auth } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CollegeLogo({ name, logo, size = 36, className }: { name: string; logo?: string; size?: number; className?: string }) {
  if (logo)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={`${name} logo`} width={size} height={size} className={cn("shrink-0 rounded-lg bg-white object-contain p-[3px]", className)} style={{ width: size, height: size }} />
    );
  const ini = collegeInitials(name);
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 font-bold text-white", className)} style={{ width: size, height: size, fontSize: Math.round(size * (ini.length > 2 ? 0.3 : 0.38)) }}>
      {ini}
    </span>
  );
}

/** Draws an image into a 160×160 square (kept whole, centred) and returns a small data URL. */
function shrink(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const N = 160;
      const c = document.createElement("canvas");
      c.width = c.height = N;
      const g = c.getContext("2d");
      if (!g) return reject(new Error("canvas"));
      const w = img.naturalWidth || N, h = img.naturalHeight || N;
      const k = Math.min(N / w, N / h);
      g.imageSmoothingQuality = "high";
      g.drawImage(img, (N - w * k) / 2, (N - h * k) / 2, w * k, h * k);
      let out = c.toDataURL("image/png");
      if (out.length > 90_000) out = c.toDataURL("image/webp", 0.85);
      resolve(out);
    };
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
}

async function api(q: string): Promise<{ src: string; from: string }[]> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/college-logo?${q}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return [];
  return ((await res.json()) as { logos?: { src: string; from: string }[] }).logos ?? [];
}

export function LogoEditor({ college, onClose, onSaved }: { college: College; onClose: () => void; onSaved: (c: College) => void }) {
  const { actions } = useStore();
  const [site, setSite] = useState(college.website ?? "");
  const [link, setLink] = useState("");
  const [found, setFound] = useState<{ src: string; from: string }[] | null>(null);
  const [pick, setPick] = useState<string | null>(college.logo ?? null);
  const [busy, setBusy] = useState<"" | "find" | "link" | "save">("");

  const choose = async (src: string) => {
    try {
      setPick(await shrink(src));
    } catch {
      actions.toast("That image couldn’t be used. Try another.");
    }
  };
  const find = async () => {
    if (!site.trim()) return;
    setBusy("find");
    const l = await api(`site=${encodeURIComponent(site.trim())}`).catch(() => []);
    setBusy("");
    setFound(l);
    if (l[0]) void choose(l[0].src);
    else actions.toast("No logo found on that website. Paste an image link or upload a file.");
  };
  const fromLink = async () => {
    if (!/^https?:\/\//i.test(link.trim())) return actions.toast("Paste a link that starts with https://");
    setBusy("link");
    const l = await api(`img=${encodeURIComponent(link.trim())}`).catch(() => []);
    setBusy("");
    if (l[0]) void choose(l[0].src);
    else actions.toast("That link isn’t an image we can use.");
  };
  const fromFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 3_000_000) return actions.toast("Pick a PNG, JPG, SVG or WebP image under 3 MB.");
    const r = new FileReader();
    r.onload = () => void choose(String(r.result));
    r.readAsDataURL(f);
  };
  const save = async (logo: string) => {
    setBusy("save");
    try {
      const website = site.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
      await saveBranding(college.id, { logo, website });
      onSaved({ ...college, logo: logo || undefined, website });
      actions.toast(logo ? "Logo saved. Students and faculty see it now." : "Logo removed.");
      onClose();
    } catch {
      actions.toast("Couldn’t save. Only the college admin can change the logo.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="College logo" className="relative w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#121118] p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
          <XIcon size={15} />
        </button>
        <h2 className="text-[18px] font-semibold text-white">College logo</h2>
        <p className="mt-1 text-[12.5px] text-white/55">Shown to your faculty and students in StudentOS. Use only your college’s own logo.</p>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <CollegeLogo name={college.name} logo={pick ?? undefined} size={64} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-white">{college.name}</p>
            <p className="text-[12px] text-white/45">{pick ? "Preview" : "No logo yet: your initials are shown"}</p>
          </div>
        </div>

        <div className="mt-5">
          <Label htmlFor="lg-site">1 · Find it from your website</Label>
          <div className="flex gap-2">
            <Input id="lg-site" value={site} onChange={(e) => setSite(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void find()} placeholder="e.g. pes.edu" />
            <Button onClick={() => void find()} loading={busy === "find"} icon={<SearchIcon size={13} />}>Find</Button>
          </div>
          {found && found.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {found.map((l, i) => (
                <button key={i} type="button" onClick={() => void choose(l.src)} title={l.from} className="rounded-xl border border-white/10 bg-white p-1.5 transition hover:border-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.src} alt={l.from} className="h-12 w-12 object-contain" />
                </button>
              ))}
              <p className="w-full text-[11.5px] text-white/40">Found {found.length}. Tap the right one.</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Label htmlFor="lg-link">2 · Or paste an image link</Label>
          <div className="flex gap-2">
            <Input id="lg-link" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void fromLink()} placeholder="https://…/logo.png" />
            <Button onClick={() => void fromLink()} loading={busy === "link"}>Use</Button>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[12.5px] font-medium text-white/75">3 · Or upload a file</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-3 text-[12.5px] text-white/60 transition hover:border-white/30 hover:text-white">
            <ImageIcon size={14} /> Choose PNG, JPG, SVG or WebP
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => fromFile(e.target.files?.[0])} />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {college.logo && (
            <button type="button" onClick={() => void save("")} className="text-[12.5px] text-rose-300 hover:underline">
              Remove logo
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => pick && void save(pick)} disabled={!pick || pick === college.logo} loading={busy === "save"}>Save logo</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
