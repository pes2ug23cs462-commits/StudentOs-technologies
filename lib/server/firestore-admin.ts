/* Server-only: talks to Firestore as the project's service account, which is
   allowed past the security rules. Used to approve reviews automatically.
   No extra package: the service account signs a short JWT with Node's crypto.

   Setup (free): Firebase console → Project settings → Service accounts →
   “Generate new private key”. Then either
     1) rename the downloaded file to service-account.json, put it in the project
        folder, and add to .env.local:  FIREBASE_SERVICE_ACCOUNT_FILE=service-account.json
     2) or put the whole JSON on ONE line:  FIREBASE_SERVICE_ACCOUNT={"type":…}
   Never commit or share this key (service-account*.json is in .gitignore). */

import { createSign } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/** Why the service account can’t be used, for the system check. */
let problem = "";

function parse(raw: string): ServiceAccount | null {
  try {
    const j = JSON.parse(raw.trim().replace(/^'|'$/g, "")) as ServiceAccount;
    if (!j.client_email || !j.private_key) {
      problem = "The key JSON is missing client_email or private_key. Download a new key.";
      return null;
    }
    return { ...j, private_key: j.private_key.replace(/\\n/g, "\n"), project_id: j.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "" };
  } catch {
    problem = "FIREBASE_SERVICE_ACCOUNT isn’t valid JSON. It must be on ONE line, or use FIREBASE_SERVICE_ACCOUNT_FILE instead.";
    return null;
  }
}

/** The key file in the project folder: service-account.json, or the file as Firebase names it. */
function findKeyFile() {
  try {
    const names = readdirSync(process.cwd());
    return names.find((n) => n === "service-account.json") ?? names.find((n) => /firebase-adminsdk.*\.json$/i.test(n));
  } catch {
    return undefined;
  }
}

function account(): ServiceAccount | null {
  problem = "";
  const fileVar = process.env.FIREBASE_SERVICE_ACCOUNT_FILE?.trim();
  // Someone pasted the JSON itself into the FILE line: ignore it and look for the file instead.
  const file = fileVar && !fileVar.startsWith("{") ? fileVar : findKeyFile();
  if (file) {
    try {
      return parse(readFileSync(resolve(process.cwd(), file), "utf8"));
    } catch {
      problem = "Can’t read the key file. Put service-account.json in the project folder (next to package.json).";
      return null;
    }
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return parse(raw);
  problem = fileVar?.startsWith("{")
    ? "FIREBASE_SERVICE_ACCOUNT_FILE should be a file name, not the JSON. Put service-account.json in the project folder."
    : "Not set up. Put the key file, renamed to service-account.json, in the project folder (next to package.json) and restart npm run dev.";
  return null;
}

export const adminConfigured = () => !!account();

let cached: { token: string; exp: number } | null = null;

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function accessToken(sa: ServiceAccount) {
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${claim}`);
  const jwt = `${head}.${claim}.${b64url(signer.sign(sa.private_key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: now + j.expires_in };
  return j.access_token;
}

type Value = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null };
const plain = (v: Value) => (v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : (v.doubleValue ?? v.booleanValue ?? null)));

function base(sa: ServiceAccount) {
  return `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
}

/** Reads a document (simple fields only). Null when it doesn't exist. */
export async function adminGet(path: string): Promise<Record<string, unknown> | null> {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const res = await fetch(`${base(sa)}/${path}`, { headers: { Authorization: `Bearer ${await accessToken(sa)}` }, cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get ${res.status}`);
  const j = (await res.json()) as { fields?: Record<string, Value> };
  return Object.fromEntries(Object.entries(j.fields ?? {}).map(([k, v]) => [k, plain(v)]));
}

/** Sets boolean/string fields on an existing document. */
export async function adminUpdate(path: string, fields: Record<string, boolean | string>) {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === "boolean" ? { booleanValue: v } : { stringValue: v }])) };
  const res = await fetch(`${base(sa)}/${path}?${mask}&currentDocument.exists=true`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`update ${res.status}`);
}

/** For the system check: can we get a token? */
export async function adminPing() {
  const sa = account();
  if (!sa) throw new Error(problem);
  await accessToken(sa);
  return sa.project_id;
}
