"use client";

/* StudentOS Specimen: a scroll-scrubbed story built around one object, the StudentOS
   logo in solid 3D. Scroll is the timeline. Six frames (cover, plan, learn, practice,
   grow, begin); between them the logo turns, shrinks and flies, and the type morphs
   from one layout into the next. On the cover, the first and last "S" of StudentOS
   slide out to flank the logo; everything else rises, blurs or clips in on its own
   stagger. Idea and timing from the 21st.dev "Lycoris Specimen". The logo is a real
   lit solid in raw WebGL (logo-gl.ts); without WebGL it falls back to stacked image
   layers turned with CSS 3D. Drag the logo to spin it. No extra packages.
   Colours and type follow design-system/studentos/MASTER.md (Inter, violet accent). */

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createLogoGL, loadImage, lookAt, multiply, perspective, rotX, rotY } from "@/components/landing/logo-gl";

type Fx = "rise" | "clip" | "line" | "fade" | "draw";

/** Everything that belongs to one frame registers itself through this. */
const sc = (scene: number, fx: Fx = "rise", delay = 0) => ({ "data-sc": scene, "data-fx": fx, "data-d": delay });

/** Logo pose: centre in clip space (-1..1, +y up), diameter as a share of the stage's short side, turn and tilt in degrees. */
type Key = { ox: number; oy: number; d: number; ry: number; rx: number };
const KEYS: Key[] = [
  { ox: 0, oy: 0.26, d: 0.36, ry: -12, rx: 6 },
  { ox: 0, oy: 0, d: 0.5, ry: 360, rx: 0 },
  { ox: 0, oy: 0.44, d: 0.2, ry: 720, rx: 4 },
  { ox: 0, oy: -0.46, d: 0.5, ry: 1060, rx: -16 },
  { ox: 0.5, oy: 0.02, d: 0.62, ry: 1456, rx: 6 },
  { ox: 0, oy: 0.56, d: 0.2, ry: 1800, rx: 0 },
];
/* Portrait stages move the logo rather than squeezing the type. */
const KEYS_TALL: Partial<Key>[] = [{ oy: 0.32, d: 0.55 }, { d: 0.5 }, { oy: 0.5, d: 0.24 }, { oy: -0.5, d: 0.56 }, { ox: 0, oy: 0.42, d: 0.5 }, { oy: 0.66, d: 0.26 }];
const SCENES = KEYS.length;
const HOLD = 0.34;
const NAV = ["Start", "Plan", "Learn", "Practice", "Grow", "Begin"];
const SCROLL_PER_SCENE = 1.2;

const WORD = "StudentOS";
const LEARN = [
  { w: "Courses", d: "Made from your degree and interests, with the best long-form lessons split into short parts." },
  { w: "Notes", d: "AI notes for any topic, kept inside My Materials." },
  { w: "Flashcards", d: "Quick cards from your notes, with a spaced revision plan." },
];
const PRACTISE = [
  { w: "Tests", d: "Mock tests with analytics by subject and topic." },
  { w: "Interviews", d: "An AI interviewer that speaks, listens and scores your answers." },
  { w: "Coding", d: "Your own set of problems with an in-browser runner and an AI checker." },
];
const DEGREES = ["B.Tech", "B.Com", "BBA", "B.Sc", "B.A.", "BCA", "MBA", "M.Com", "M.Tech", "MCA", "Diploma"];
const SPECS = ["AI study plan & schedule", "Personalised video courses", "Mock tests & AI interview", "Coding practice", "AI resume & certificates"];

const clamp01 = (x: number) => (x <= 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Scroll progress → a frame coordinate in 0..n-1; each frame holds still for part of its slot. */
const sceneCoord = (p: number) => {
  const t = clamp01(p) * (SCENES - 1);
  const i = Math.min(Math.floor(t), SCENES - 2);
  const h = HOLD / 2;
  return i + easeInOut(clamp01((t - i - h) / (1 - 2 * h)));
};
/** How present one element of frame `scene` is at `coord`; `delay` staggers it in, and mirrored, out. */
const reveal = (coord: number, scene: number, delay: number) => {
  const d = coord - scene;
  const lag = d < 0 ? delay : 1 - delay;
  return clamp01((0.6 - Math.abs(d) - lag * 0.2) / 0.25);
};
const keyAt = (coord: number, tall: boolean): Key => {
  const i = Math.max(0, Math.min(SCENES - 1, Math.floor(coord)));
  const j = Math.min(SCENES - 1, i + 1);
  const f = coord - i;
  const a = { ...KEYS[i], ...(tall ? KEYS_TALL[i] : {}) };
  const b = { ...KEYS[j], ...(tall ? KEYS_TALL[j] : {}) };
  const l = (x: number, y: number) => x + (y - x) * f;
  return { ox: l(a.ox, b.ox), oy: l(a.oy, b.oy), d: l(a.d, b.d), ry: l(a.ry, b.ry), rx: l(a.rx, b.rx) };
};

const LOGO = 200; // px; the logo box is scaled from this
const LAYERS = 12;

/* Scoped by the sx- prefix. */
const CSS =
  ".sx-stage{container-type:size;container-name:sx}" +
  ".sx-char{display:inline-block;animation:sx-in 1.2s cubic-bezier(.2,.8,.2,1) both}" +
  "@keyframes sx-in{from{opacity:0;transform:translateY(0.35em) rotate(4deg);filter:blur(10px)}to{opacity:1;transform:none;filter:blur(0)}}" +
  ".sx-g{display:inline-block;transition:color .25s,transform .25s cubic-bezier(.2,.8,.2,1);cursor:default;outline-offset:6px}" +
  ".sx-g:hover,.sx-g:focus-visible{color:var(--color-accent);transform:translateY(-0.04em) scale(1.06)}" +
  ".sx-deg{display:inline-block;transition:color .25s,transform .25s cubic-bezier(.2,.8,.2,1)}" +
  ".sx-deg:hover{color:var(--color-accent);transform:translateY(-0.12em) scale(1.25)}" +
  ".sx-nav button{display:flex;align-items:center;gap:10px;justify-content:flex-end;background:none;border:0;padding:5px 0;cursor:pointer;color:inherit;font:inherit}" +
  ".sx-nav .sx-tick{display:block;height:1px;width:14px;background:currentColor;opacity:.45;transition:width .4s cubic-bezier(.2,.8,.2,1),opacity .3s,background-color .3s}" +
  ".sx-nav .sx-lab{opacity:0;transform:translateX(6px);transition:opacity .3s,transform .3s}" +
  ".sx-nav button:hover .sx-lab,.sx-nav button:focus-visible .sx-lab{opacity:1;transform:none}" +
  ".sx-nav button[aria-current=step] .sx-tick{width:34px;opacity:1;background:var(--color-accent)}" +
  ".sx-nav button[aria-current=step]{color:var(--color-accent)}" +
  ".sx-edit{outline:none;cursor:text;border-bottom:1px dashed transparent;transition:border-color .3s}" +
  ".sx-edit:hover,.sx-edit:focus{border-bottom-color:var(--color-accent)}" +
  "@container sx (orientation: portrait){.sx-bloom{left:7cqw!important;top:auto!important;bottom:12cqh;font-size:17cqw!important}.sx-degs{font-size:3.6cqw!important}" +
  ".sx-fin{flex-direction:column!important;gap:5cqh!important;top:40cqh!important}" +
  ".sx-spec{grid-template-columns:1fr 1fr!important;top:30cqh!important}.sx-spec-mid{display:none!important}}" +
  "@container sx (max-width: 720px){.sx-hide-sm{display:none!important}}" +
  "@container sx (max-width: 1020px){.sx-hide-md{display:none!important}}" +
  "@media (prefers-reduced-motion: reduce){.sx-char{animation:none}.sx-g,.sx-deg{transition:none}}";

const ink = "var(--color-white)";
const accent = "var(--color-accent)";
const hidden: CSSProperties = { opacity: 0 };
const small: CSSProperties = { fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 };

function Mark({ size = 30 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/studentos-mark.png" alt="" width={size} height={size} draggable={false} style={{ flex: "none", width: size, height: size, objectFit: "contain" }} />;
}

export function Journey({ cta }: { cta: { href: string; label: string } }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wordRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [inspect, setInspect] = useState<{ w: string; d: string } | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const logo = logoRef.current;
    const glow = glowRef.current;
    const word = wordRef.current;
    const canvas = canvasRef.current;
    if (!root || !stage || !logo || !glow || !word || !canvas) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- measuring ----
    let W = 1;
    let H = 1;
    let dpr = 1;
    const chars = Array.from(word.querySelectorAll<HTMLElement>("[data-ch]"));
    let nat: { x: number; y: number; w: number }[] = [];
    const measure = () => {
      const sr = stage.getBoundingClientRect();
      W = Math.max(1, sr.width);
      H = Math.max(1, sr.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(W * dpr);
      const ch = Math.round(H * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      const saved = chars.map((c) => c.style.transform);
      chars.forEach((c) => (c.style.transform = "none"));
      nat = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top, w: r.width };
      });
      chars.forEach((c, i) => (c.style.transform = saved[i]));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    measure();
    document.fonts?.ready.then(measure);

    // ---- frame elements ----
    const items = Array.from(stage.querySelectorAll<HTMLElement>("[data-sc]")).map((el) => ({
      el,
      scene: Number(el.dataset.sc),
      fx: el.dataset.fx as Fx,
      delay: Number(el.dataset.d) || 0,
      last: -1,
    }));

    // ---- the WebGL logo (DOM layers until it is ready, or for good if it never is) ----
    let gl: ReturnType<typeof createLogoGL> = null;
    let born = 0;
    let dead = false;
    loadImage("/studentos-mark.png")
      .then((img) => {
        if (dead) return;
        gl = createLogoGL(canvas, img);
        if (gl) {
          born = performance.now();
          logo.style.display = "none";
        }
      })
      .catch(() => {});

    // ---- pointer tilt and drag-to-spin ----
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let spin = 0;
    let spinVel = 0;
    let drag: { id: number; x: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (drag && drag.id === e.pointerId) {
        spinVel += (e.clientX - drag.x) * 0.0022;
        drag.x = e.clientX;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if ((e.target as HTMLElement).closest("a,button,[contenteditable],.sx-g,.sx-deg")) return;
      drag = { id: e.pointerId, x: e.clientX };
      stage.style.cursor = "grabbing";
    };
    const onUp = () => {
      drag = null;
      stage.style.cursor = "";
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    // ---- loop ----
    let raf = 0;
    let running = false;
    let last = performance.now();
    let time = 0;
    let prog = -1;
    let shown = -1;
    const lastIdx = WORD.length - 1;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!still) time += dt;

      const r = root.getBoundingClientRect();
      const travel = r.height - H;
      const p = travel <= 0 ? 0 : clamp01(-r.top / travel);
      prog = prog < 0 || still ? p : prog + (p - prog) * (1 - Math.exp(-dt * 9));
      const coord = sceneCoord(prog);
      const scene = Math.round(coord);
      if (scene !== shown) {
        shown = scene;
        setActive(scene);
      }

      // the logo
      const tall = H > W * 1.05;
      const k = keyAt(coord, tall);
      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 4));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 4));
      const px = still ? 0 : pointer.x;
      const py = still ? 0 : pointer.y;
      const minDim = Math.min(W, H);
      const size = k.d * minDim;
      const cx = (0.5 + k.ox / 2) * W;
      const cy = (0.5 - k.oy / 2) * H;
      const bob = still ? 0 : Math.sin(time * 1.1) * minDim * 0.008;
      const idle = still ? 0 : Math.sin(time * 0.5) * 10;
      // a drag spins it; when let go it settles back to the nearest front view
      spin += spinVel;
      spinVel *= Math.exp(-dt * 3);
      if (!drag) {
        const near = Math.round(spin / (Math.PI * 2)) * Math.PI * 2;
        spin += (near - spin) * (1 - Math.exp(-dt * 1.2));
      }
      let drawn = false;
      if (gl) {
        const grow = still ? 1 : easeInOut(clamp01((now - born) / 1600));
        const fov = (30 * Math.PI) / 180;
        const dist = (1.0 * H) / (Math.max(0.05, k.d * (0.75 + 0.25 * grow)) * minDim * Math.tan(fov / 2));
        const eye: [number, number, number] = [0, 0, dist];
        const vp = multiply(perspective(fov, W / H, Math.max(0.05, dist - 4), dist + 4), lookAt(eye, [0, 0, 0]));
        const model = multiply(
          rotX(((k.rx - py * 10) * Math.PI) / 180),
          rotY(((k.ry + idle + px * 18) * Math.PI) / 180 + spin),
        );
        const dy = (bob / H) * 2;
        drawn = gl.draw({ vp, model, ox: k.ox, oy: k.oy - dy, eye, depth: 0.085 * grow, alpha: grow });
        if (!drawn) {
          gl = null;
          logo.style.display = "";
        }
      }
      if (!drawn) logo.style.transform =
        `translate3d(${(cx - LOGO / 2).toFixed(1)}px,${(cy - LOGO / 2 + bob).toFixed(1)}px,0) scale(${(size / LOGO).toFixed(4)}) ` +
        `rotateX(${(k.rx - py * 10).toFixed(2)}deg) rotateY(${(k.ry + idle + px * 18 + (spin * 180) / Math.PI).toFixed(2)}deg)`;
      const gr = size * 1.2;
      glow.style.transform = `translate(${(cx - gr).toFixed(1)}px,${(cy - gr).toFixed(1)}px)`;
      glow.style.width = glow.style.height = `${(gr * 2).toFixed(1)}px`;

      // the type
      for (const it of items) {
        const q = Math.round(reveal(coord, it.scene, it.delay) * 500) / 500;
        if (q === it.last) continue;
        it.last = q;
        const s = it.el.style;
        const dir = coord < it.scene ? 1 : -1;
        s.visibility = q <= 0 ? "hidden" : "";
        it.el.toggleAttribute("inert", q < 0.5);
        if (it.fx === "draw") {
          s.setProperty("--v", String(q));
          s.opacity = String(Math.min(1, q * 3));
          continue;
        }
        if (it.fx === "line") {
          s.transform = `scaleX(${q})`;
          s.opacity = String(Math.min(1, q * 2));
          continue;
        }
        s.opacity = String(q);
        if (still || it.fx === "fade") continue;
        if (it.fx === "clip") {
          const hid = ((1 - q) * 100).toFixed(1);
          s.clipPath = dir > 0 ? `inset(0 0 ${hid}% 0)` : `inset(${hid}% 0 0 0)`;
          s.transform = `translateY(${((1 - q) * 0.4 * dir).toFixed(3)}em)`;
        } else {
          s.transform = `translateY(${((1 - q) * 34 * dir).toFixed(1)}px)`;
          s.filter = q > 0.995 ? "" : `blur(${((1 - q) * 8).toFixed(1)}px)`;
        }
      }

      // The cover word morphs into frame 1: its two S's slide out to flank the logo, the rest fall into it.
      const m = easeInOut(clamp01(coord));
      const out = clamp01(coord - 1);
      const k1 = keyAt(1, tall);
      const r1 = (k1.d * minDim) / 2;
      const cy1 = (0.5 - k1.oy / 2) * H;
      chars.forEach((c, i) => {
        const n0 = nat[i];
        if (!n0) return;
        if (i === 0 || i === lastIdx) {
          const side = i === 0 ? -1 : 1;
          const tx = W / 2 + side * (r1 + n0.w * 0.55 + minDim * 0.03);
          const dx = (tx - n0.x) * m;
          const dy = (cy1 - n0.y) * m - out * 60;
          c.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
          c.style.opacity = String(coord < 1 ? 1 : 1 - smoothstep(0.1, 0.45, out));
          c.style.filter = still || out < 0.05 ? "" : `blur(${(out * 14).toFixed(1)}px)`;
        } else {
          const dx = (W / 2 - n0.x) * m * 0.75;
          const dy = (cy1 - n0.y) * m;
          c.style.transform = still ? "" : `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${(1 - m * 0.7).toFixed(3)})`;
          c.style.opacity = String(1 - smoothstep(0, 0.4, m));
          c.style.filter = still || m < 0.02 ? "" : `blur(${(m * 12).toFixed(1)}px)`;
        }
        c.style.visibility = coord > 1.6 ? "hidden" : "";
      });
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(root);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      dead = true;
      gl?.dispose();
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      stage.removeEventListener("pointermove", onMove);
    };
  }, []);

  const jump = (i: number) => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const r = root.getBoundingClientRect();
    const travel = r.height - stage.clientHeight;
    window.scrollBy({ top: (i / (SCENES - 1)) * travel + r.top, behavior: reduced ? "auto" : "smooth" });
  };

  const words = (rows: { w: string; d: string }[], side: "l" | "r", base: number) =>
    rows.map((row, i) => (
      <div key={row.w} {...sc(2, "clip", base + i * 0.15)} style={hidden} className="relative">
        <span
          className="sx-g"
          tabIndex={0}
          onPointerEnter={() => setInspect(row)}
          onFocus={() => setInspect(row)}
          onBlur={() => setInspect(null)}
          style={{ fontSize: "min(7cqw, 8.6cqh)", lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.035em", whiteSpace: "nowrap" }}
        >
          {row.w}
        </span>
      </div>
    ));

  const foot = (href: string, children: ReactNode) => (
    <Link href={href} className="transition-colors hover:text-accent" style={{ color: "inherit", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: 4 }}>
      {children}
    </Link>
  );

  return (
    <section
      id="journey"
      ref={rootRef}
      aria-label="How StudentOS helps you"
      className="relative w-full"
      style={{ height: `calc(100svh * ${(1 + (SCENES - 1) * SCROLL_PER_SCENE).toFixed(2)})` }}
    >
      <style>{CSS}</style>
      <div
        ref={stageRef}
        className="sx-stage sticky top-0 w-full overflow-hidden select-none"
        style={{ height: "100svh", color: ink }}
        onPointerLeave={() => setInspect(null)}
      >
        {/* soft violet bleed at the edges */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(124,58,237,0.12)_100%)]" />
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(124,58,237,0.42), rgba(34,211,238,0.10) 50%, transparent 100%)", willChange: "transform" }}
        />

        {/* the logo: a lit WebGL solid, with stacked image layers as the fallback */}
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 block" style={{ width: "100%", height: "100%" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ perspective: 1100 }}>
          <div ref={logoRef} className="absolute top-0 left-0" style={{ width: LOGO, height: LOGO, transformStyle: "preserve-3d", willChange: "transform", transformOrigin: "50% 50%" }}>
            {Array.from({ length: LAYERS }, (_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src="/studentos-mark.png"
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full"
                style={{
                  transform: `translateZ(${(LAYERS / 2 - i) * 1.6}px)`,
                  filter: i === 0 ? "drop-shadow(0 0 22px rgba(124,58,237,0.55))" : `brightness(${(0.6 - i * 0.03).toFixed(2)}) saturate(1.2)`,
                }}
              />
            ))}
          </div>
        </div>

        {/* ============================ 0 · cover ============================ */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute flex items-start justify-between gap-6" style={{ left: "5cqw", right: "5cqw", top: "calc(64px + 4cqh)" }}>
            <div {...sc(0, "clip", 0)} style={{ ...hidden, fontSize: "clamp(20px, 3cqw, 42px)", lineHeight: 0.92, fontWeight: 800, letterSpacing: "-0.03em", textTransform: "uppercase" }}>
              Your study
              <br />
              <span style={{ color: accent }}>OS</span>
            </div>
            <p {...sc(0, "rise", 0.2)} className="sx-hide-md" style={{ ...hidden, maxWidth: "25cqw", fontSize: "clamp(11px, 0.95cqw, 13.5px)", lineHeight: 1.5, margin: 0 }}>
              One app for college study: an AI plan for your week, courses made from your degree, practice for exams and interviews, and a resume that shows your work.
            </p>
            <ul {...sc(0, "rise", 0.35)} className="sx-hide-md" style={{ ...hidden, listStyle: "none", margin: 0, padding: 0, fontSize: "clamp(11px, 0.95cqw, 13.5px)", lineHeight: 1.6 }}>
              {SPECS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <div {...sc(0, "clip", 0.5)} className="sx-hide-sm" style={{ ...hidden, fontSize: "clamp(18px, 2.4cqw, 34px)", lineHeight: 0.95, textAlign: "right", textTransform: "uppercase", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Plan
              <br />
              Learn
              <br />
              <span style={{ color: accent }}>Grow</span>
            </div>
          </div>

          <div ref={wordRef} className="absolute whitespace-nowrap" style={{ left: "50%", top: "66%", transform: "translate(-50%, -50%)", fontSize: "min(17cqw, 26cqh)", lineHeight: 1, fontWeight: 800, letterSpacing: "-0.05em" }}>
            <span {...sc(0, "rise", 0.6)} style={{ ...hidden, position: "absolute", right: "0.04em", bottom: "88%", fontSize: "0.16em", letterSpacing: "0.2em", fontWeight: 600, textTransform: "uppercase", color: accent }}>
              Meet
            </span>
            <h2 aria-label={WORD} style={{ margin: 0, font: "inherit" }}>
              {Array.from(WORD).map((c, i) => (
                <span key={i} data-ch className="inline-block" style={{ willChange: "transform", color: i >= 7 ? accent : undefined }} aria-hidden>
                  <span className="sx-char" style={{ animationDelay: `${0.15 + i * 0.07}s` }}>
                    {c}
                  </span>
                </span>
              ))}
            </h2>
          </div>

          <div className="absolute flex items-end justify-between gap-6" style={{ left: "5cqw", right: "5cqw", bottom: "5cqh" }}>
            <div {...sc(0, "rise", 0.3)} className="flex items-center gap-3" style={hidden}>
              <Mark />
              <span style={{ fontSize: "clamp(20px, 2.2cqw, 32px)", letterSpacing: "-0.03em", fontWeight: 300 }}>2026</span>
              <span style={{ fontSize: 9.5, lineHeight: 1.3, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid currentColor", paddingBottom: 6, paddingRight: "6cqw" }}>
                Made for
                <br />
                college students
              </span>
            </div>
            <div {...sc(0, "rise", 0.5)} className="sx-hide-sm flex gap-6" style={{ ...hidden, color: accent, fontSize: 9.5, lineHeight: 1.35, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              <span>Study plan<br />& schedule</span>
              <span>Practice<br />Arena</span>
              <span>AI resume<br />builder</span>
              <span>Free<br />to start</span>
            </div>
          </div>
        </div>

        {/* ============================ 1 · plan ============================ */}
        <div className="pointer-events-none absolute inset-0">
          <div {...sc(1, "fade", 0.5)} className="absolute text-center" style={{ ...hidden, left: "50%", top: "calc(50% + min(28cqw, 28cqh))", transform: "translateX(-50%)", ...small, color: accent, whiteSpace: "nowrap" }}>
            Your week, planned by AI
          </div>
          <div {...sc(1, "rise", 0.6)} className="sx-hide-sm absolute" style={{ ...hidden, right: "5cqw", bottom: "5cqh", maxWidth: 300, fontSize: "clamp(12px, 1cqw, 14px)", lineHeight: 1.5, textAlign: "right" }}>
            Add your classes once. The AI writes a week-by-week plan and fits every session into your free time.
          </div>
          <div {...sc(1, "rise", 0.7)} className="absolute" style={{ ...hidden, left: "5cqw", bottom: "5cqh", ...small }}>
            <span style={{ color: accent }}>01</span> — Plan
            <div className="sx-hide-sm" style={{ marginTop: 8, opacity: 0.6, letterSpacing: "0.18em", fontSize: 9 }}>Drag the logo to spin it</div>
          </div>
        </div>

        {/* ============================ 2 · learn ============================ */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="sx-spec pointer-events-auto absolute grid items-center"
            style={{ left: "7cqw", right: "7cqw", top: "16cqh", bottom: "22cqh", gridTemplateColumns: "1fr min(28cqw, 32cqh) 1fr", columnGap: "2cqw" }}
          >
            <div className="relative flex flex-col gap-[1.4cqh]">
              <div {...sc(2, "fade", 0)} style={{ ...hidden, ...small, fontSize: 9.5, color: accent }}>Learn</div>
              {words(LEARN, "l", 0)}
            </div>
            <div className="sx-spec-mid relative h-full text-center">
              <div {...sc(2, "rise", 0.45)} className="absolute w-full" style={{ ...hidden, top: "52%", lineHeight: 1.1 }}>
                <div style={{ fontSize: inspect ? "min(3cqw, 4cqh)" : "min(1.9cqw, 2.7cqh)", fontWeight: 800, letterSpacing: "-0.02em", color: inspect ? accent : undefined, transition: "font-size .35s cubic-bezier(.2,.8,.2,1)" }}>
                  {inspect ? inspect.w : "Everything inside"}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 8, minHeight: "4.4em" }}>
                  {inspect ? inspect.d : <span style={{ ...small, fontSize: 9 }}>Hover a word</span>}
                </div>
              </div>
            </div>
            <div className="relative flex flex-col items-end gap-[1.4cqh] text-right">
              <div {...sc(2, "fade", 0.1)} style={{ ...hidden, ...small, fontSize: 9.5, color: accent }}>Practise</div>
              {words(PRACTISE, "r", 0.1)}
            </div>
          </div>
          <div {...sc(2, "line", 0.5)} className="absolute" style={{ ...hidden, left: "7cqw", right: "7cqw", bottom: "16cqh", height: 1, background: "rgba(124,58,237,0.35)", transformOrigin: "left" }} />
          <div {...sc(2, "rise", 0.6)} className="sx-degs pointer-events-auto absolute flex flex-wrap justify-center gap-x-[2.2cqw] gap-y-2" style={{ ...hidden, left: "7cqw", right: "7cqw", bottom: "8cqh", fontSize: "min(2.2cqw, 3cqh)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {DEGREES.map((dg) => (
              <span key={dg} className="sx-deg">
                {dg}
              </span>
            ))}
          </div>
          <div {...sc(2, "fade", 0.7)} className="absolute" style={{ ...hidden, left: "7cqw", bottom: "4cqh", ...small, fontSize: 9 }}>
            <span style={{ color: accent }}>02</span> — Courses for every degree
          </div>
        </div>

        {/* ============================ 3 · practice ============================ */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute text-center" style={{ left: "50%", top: "calc(64px + 5cqh)", transform: "translateX(-50%)", fontSize: "min(12cqw, 10.5cqh)", lineHeight: 0.92, fontWeight: 800, letterSpacing: "-0.045em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            <span {...sc(3, "fade", 0.3)} className="sx-hide-sm" style={{ ...hidden, position: "absolute", right: "100%", top: "0.4em", ...small, fontSize: "max(10px, 0.09em)", marginRight: "1.4em" }}>Practice</span>
            <span {...sc(3, "fade", 0.4)} className="sx-hide-sm" style={{ ...hidden, position: "absolute", left: "100%", top: "0.4em", ...small, fontSize: "max(10px, 0.09em)", marginLeft: "1.4em", color: accent }}>Arena</span>
            <div {...sc(3, "clip", 0)} style={hidden}>Mock tests</div>
            <div {...sc(3, "clip", 0.15)} style={hidden}>Interviews</div>
            <div {...sc(3, "clip", 0.3)} style={{ ...hidden, color: accent }}>Coding</div>
          </div>
          <div {...sc(3, "rise", 0.6)} className="absolute" style={{ ...hidden, left: "5cqw", bottom: "5cqh", ...small }}>
            <span style={{ color: accent }}>03</span> — Practice Arena
          </div>
        </div>

        {/* ============================ 4 · grow ============================ */}
        <div className="pointer-events-none absolute inset-0">
          <div className="sx-bloom absolute" style={{ left: "8cqw", top: "28cqh", fontSize: "min(9cqw, 13cqh)", lineHeight: 0.86, fontWeight: 800, letterSpacing: "-0.045em" }}>
            {[
              { t: "Study" },
              { t: "with a", s: true },
              { t: "plan," },
              { t: "not panic", s: true, a: true },
            ].map((l, i) => (
              <div
                key={i}
                {...sc(4, "clip", i * 0.14)}
                className="pointer-events-auto"
                style={{
                  ...hidden,
                  fontSize: l.s ? "0.38em" : undefined,
                  lineHeight: l.s ? 1.15 : undefined,
                  marginLeft: l.s ? (i < 2 ? "4.8em" : "3.6em") : i > 1 ? "0.45em" : 0,
                  marginTop: l.s ? "-0.1em" : 0,
                  marginBottom: l.s ? "0.25em" : 0,
                  fontWeight: l.s ? 600 : 800,
                  letterSpacing: l.s ? "-0.01em" : undefined,
                  color: l.a ? accent : undefined,
                }}
              >
                <span className="sx-edit" contentEditable spellCheck={false} suppressContentEditableWarning>
                  {l.t}
                </span>
              </div>
            ))}
            <div {...sc(4, "rise", 0.7)} style={{ ...hidden, ...small, fontSize: 9.5, marginTop: "3cqh" }}>
              <span style={{ color: accent }}>04</span> — Click the words, type your own
            </div>
          </div>
        </div>

        {/* ============================ 5 · begin ============================ */}
        <div className="pointer-events-none absolute inset-0">
          <div className="sx-fin absolute flex items-center justify-around" style={{ left: "5cqw", right: "5cqw", top: "52cqh" }}>
            <div className="relative text-center">
              <div {...sc(5, "fade", 0.1)} style={{ ...hidden, ...small, fontSize: 9.5, marginBottom: "1.4cqh" }}>Proof of your work</div>
              <div {...sc(5, "clip", 0)} className="relative" style={{ ...hidden, fontSize: "min(9cqw, 12cqh)", lineHeight: 1, fontWeight: 800, letterSpacing: "-0.045em" }}>
                Resume
                <svg
                  {...sc(5, "draw", 0.2)}
                  aria-hidden
                  viewBox="0 0 100 100"
                  style={{ ...hidden, position: "absolute", left: "50%", top: "50%", width: "1.35em", height: "1.35em", transform: "translate(-50%,-48%)", overflow: "visible", pointerEvents: "none" }}
                >
                  <circle cx="50" cy="50" r="48" fill="none" stroke={accent} strokeWidth="1.2" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: "calc(1 - var(--v, 0))" } as CSSProperties} />
                  <path d="M2 50H98M50 50V98" fill="none" stroke={accent} strokeWidth="1.2" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: "calc(1 - var(--v, 0))" } as CSSProperties} />
                </svg>
              </div>
              <div {...sc(5, "rise", 0.4)} className="flex justify-center gap-[2.4cqw]" style={{ ...hidden, marginTop: "2.4cqh" }}>
                {["Projects", "Certificates", "Timeline"].map((l) => (
                  <span key={l} style={{ fontSize: "max(13px, min(1.6cqw, 2.4cqh))", fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div {...sc(5, "fade", 0.3)} style={{ ...small, ...hidden, fontSize: 9.5 }}>StudentOS</div>
              <div {...sc(5, "clip", 0.35)} style={{ ...hidden, fontSize: "min(5.6cqw, 8cqh)", lineHeight: 1, whiteSpace: "nowrap", fontWeight: 800, letterSpacing: "-0.045em" }}>
                {["Plan", "Learn", "Practise", "Build"].map((part, i) => (
                  <span key={part}>
                    {i > 0 && <span style={{ color: accent }}>·</span>}
                    {part}
                  </span>
                ))}
              </div>
              <div {...sc(5, "fade", 0.5)} style={{ ...small, ...hidden, fontSize: 9.5, textAlign: "right", color: accent }}>Free to start</div>
            </div>
          </div>

          <div {...sc(5, "rise", 0.75)} className="pointer-events-auto absolute flex items-center justify-between gap-4" style={{ ...hidden, left: "5cqw", right: "5cqw", bottom: "4.5cqh", fontSize: "clamp(11px, 1.3cqw, 18px)", letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>
            {foot(cta.href, cta.label)}
            <Mark size={34} />
            {foot("#features", "See all features")}
          </div>
        </div>

        {/* ============================ nav ============================ */}
        <nav aria-label="Story frames" className="sx-nav sx-hide-sm absolute flex flex-col items-end" style={{ right: "2cqw", top: "50%", transform: "translateY(-50%)", fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
          {NAV.map((n, i) => (
            <button key={n} type="button" onClick={() => jump(i)} aria-current={active === i ? "step" : undefined}>
              <span className="sx-lab">
                {String(i + 1).padStart(2, "0")} {n}
              </span>
              <span className="sx-tick" />
            </button>
          ))}
        </nav>

        {/* grain */}
        <svg aria-hidden className="pointer-events-none absolute inset-0" width="100%" height="100%" style={{ opacity: 0.06, mixBlendMode: "overlay" }}>
          <filter id="sx-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#sx-grain)" />
        </svg>
      </div>
    </section>
  );
}
