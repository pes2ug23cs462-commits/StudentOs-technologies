/* Runs a student's code against test cases inside the browser.
   · JavaScript: a fresh Web Worker per run (no access to the page), killed after the time limit.
   · Python: Pyodide (CPython compiled to WebAssembly) in a Web Worker, loaded once from the
     jsDelivr CDN (~10 MB, cached by the browser). A run that hits the time limit kills the
     worker; the next run loads it again.
   Nothing is sent to a server, so this works on the free Firebase plan. */

import type { CaseResult, Lang, RunResult } from "./types";

export const TIME_LIMIT_MS = 4000;
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

const JS_WORKER = `
self.onmessage = (e) => {
  const { code, fn, tests } = e.data;
  let f;
  try {
    f = new Function(code + "\\n;return typeof " + fn + " === 'function' ? " + fn + " : undefined;")();
  } catch (err) {
    self.postMessage({ status: "error", error: String(err && err.stack ? err.message : err) });
    return;
  }
  if (typeof f !== "function") {
    self.postMessage({ status: "error", error: "Function " + fn + " was not found. Keep the function name from the starter code." });
    return;
  }
  const cases = [];
  for (const t of tests) {
    const logs = [];
    console.log = (...a) => logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
    const t0 = performance.now();
    try {
      const got = f(...JSON.parse(JSON.stringify(t.args)));
      cases.push({ got: got === undefined ? "__undefined__" : got, logs: logs.join("\\n"), ms: performance.now() - t0 });
    } catch (err) {
      cases.push({ error: (err && err.name ? err.name + ": " : "") + (err && err.message ? err.message : String(err)), logs: logs.join("\\n"), ms: performance.now() - t0 });
    }
  }
  self.postMessage({ status: "ok", cases });
};`;

const PY_WORKER = `
importScripts("${PYODIDE}pyodide.js");
let ready = loadPyodide({ indexURL: "${PYODIDE}" });
self.onmessage = async (e) => {
  const py = await ready;
  if (e.data === "ping") { self.postMessage({ status: "ready" }); return; }
  const { code, fn, tests } = e.data;
  const ns = py.globals.get("dict")();
  py.runPython("import sys, io");
  try {
    py.runPython(code, { globals: ns });
  } catch (err) {
    self.postMessage({ status: "error", error: tidy(String(err.message || err)) });
    return;
  }
  const f = ns.get(fn);
  if (!f || typeof f !== "function") {
    self.postMessage({ status: "error", error: "Function " + fn + " was not found. Keep the function name from the starter code." });
    return;
  }
  const cases = [];
  for (const t of tests) {
    py.runPython("sys.stdout = io.StringIO()");
    const t0 = performance.now();
    try {
      const args = JSON.parse(JSON.stringify(t.args)).map((a) => py.toPy(a));
      let r = f(...args);
      let got = r && typeof r.toJs === "function" ? r.toJs({ dict_converter: Object.fromEntries }) : r;
      if (r && typeof r.destroy === "function") r.destroy();
      cases.push({ got: got === undefined ? "__none__" : got, logs: py.runPython("sys.stdout.getvalue()"), ms: performance.now() - t0 });
    } catch (err) {
      cases.push({ error: tidy(String(err.message || err)), logs: py.runPython("sys.stdout.getvalue()"), ms: performance.now() - t0 });
    }
  }
  py.runPython("sys.stdout = sys.__stdout__");
  self.postMessage({ status: "ok", cases });
};
function tidy(m) {
  const lines = m.split("\\n").filter((l) => !l.includes("/lib/python") && !l.includes("_pyodide"));
  return lines.slice(-6).join("\\n").trim();
}`;

let pyWorker: Worker | null = null;
let pyReady: Promise<void> | null = null;

const workerFrom = (src: string) => new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));

/** Starts loading Python in the background (call when the student picks Python). */
export function warmPython(): Promise<void> {
  if (pyReady && pyWorker) return pyReady;
  pyWorker = workerFrom(PY_WORKER);
  const w = pyWorker;
  pyReady = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Python took too long to load. Check your internet and try again.")), 60_000);
    w.onmessage = (e) => {
      if (e.data?.status === "ready") {
        clearTimeout(t);
        resolve();
      }
    };
    w.onerror = () => {
      clearTimeout(t);
      reject(new Error("Couldn’t load Python. Check your internet and try again."));
    };
    w.postMessage("ping");
  });
  pyReady.catch(() => {
    pyWorker?.terminate();
    pyWorker = null;
    pyReady = null;
  });
  return pyReady;
}

/** Same values? Lists compare in order; numbers allow tiny float error. */
export function same(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b || Math.abs(a - b) < 1e-6;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

/** Runs `code` on `tests`. Never throws: problems come back in the result. */
export async function runCode(lang: Lang, code: string, fn: string, tests: { args: unknown[]; expected: unknown }[]): Promise<RunResult> {
  let w: Worker;
  if (lang === "python") {
    try {
      await warmPython();
    } catch (e) {
      return { status: "error", cases: [], error: e instanceof Error ? e.message : "Couldn’t load Python." };
    }
    w = pyWorker!;
  } else {
    w = workerFrom(JS_WORKER);
  }

  return new Promise<RunResult>((resolve) => {
    const timer = setTimeout(() => {
      w.terminate();
      if (lang === "python") {
        pyWorker = null;
        pyReady = null;
      }
      resolve({ status: "timeout", cases: [], error: `Time limit exceeded (${TIME_LIMIT_MS / 1000}s). Look for an infinite loop or a slow approach.` });
    }, TIME_LIMIT_MS + (lang === "python" ? 1500 : 0));
    w.onmessage = (e) => {
      const d = e.data as { status: string; cases?: { got?: unknown; error?: string; logs: string; ms: number }[]; error?: string };
      if (d.status === "ready") return;
      clearTimeout(timer);
      if (lang === "javascript") w.terminate();
      if (d.status === "error") return resolve({ status: "error", cases: [], error: d.error });
      const cases: CaseResult[] = (d.cases ?? []).map((c, i) => {
        const got = c.got === "__undefined__" || c.got === "__none__" ? undefined : c.got;
        return { args: tests[i].args, expected: tests[i].expected, got, error: c.error, logs: c.logs ?? "", ms: c.ms, ok: !c.error && same(got, tests[i].expected) };
      });
      resolve({ status: "ok", cases });
    };
    w.onerror = (e) => {
      clearTimeout(timer);
      w.terminate();
      if (lang === "python") {
        pyWorker = null;
        pyReady = null;
      }
      resolve({ status: "error", cases: [], error: e.message || "Your code crashed." });
    };
    w.postMessage({ code, fn, tests });
  });
}

/** Shows a value the way the chosen language prints it. */
export function show(v: unknown, lang: Lang): string {
  if (v === undefined) return lang === "python" ? "None" : "undefined";
  if (lang === "python") {
    if (v === true) return "True";
    if (v === false) return "False";
    if (v === null) return "None";
    if (Array.isArray(v)) return `[${v.map((x) => show(x, lang)).join(", ")}]`;
    if (typeof v === "string") return JSON.stringify(v);
  }
  if (Array.isArray(v)) return `[${v.map((x) => show(x, lang)).join(",")}]`;
  return JSON.stringify(v);
}
