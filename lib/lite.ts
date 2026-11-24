/* Light mode for effects ("lite"): set on <html> before paint by the script in app/layout.tsx.
   On when the device is very low-end (≤ 2 cores or ≤ 2 GB memory), Data Saver is on, or the student picked "Reduce effects" in Settings → Appearance. */

export const LITE_KEY = "studentos:effects"; // "lite" | "full" | unset (auto)

/** Inline script for <head>: decides once, before the first paint. */
export const LITE_SCRIPT = `try{var p=localStorage.getItem("${LITE_KEY}"),n=navigator,c=n.connection;var auto=(n.hardwareConcurrency&&n.hardwareConcurrency<=2)||(n.deviceMemory&&n.deviceMemory<=2)||(c&&c.saveData);if(p==="lite"||(p!=="full"&&auto))document.documentElement.classList.add("lite")}catch(e){}`;

/** True when animations and heavy effects should stay off. */
export function isLite() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("lite") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getEffectsPref(): "auto" | "lite" | "full" {
  try {
    const v = localStorage.getItem(LITE_KEY);
    return v === "lite" || v === "full" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setEffectsPref(v: "auto" | "lite" | "full") {
  try {
    if (v === "auto") localStorage.removeItem(LITE_KEY);
    else localStorage.setItem(LITE_KEY, v);
    const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const auto = (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2) || n.connection?.saveData;
    document.documentElement.classList.toggle("lite", v === "lite" || (v === "auto" && !!auto));
  } catch {}
}
