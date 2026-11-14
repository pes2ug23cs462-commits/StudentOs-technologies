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
    let v: unknown = JSON.parse(raw.trim().replace(/^'|'$/g, ""));
    // pasted as a quoted string, or as base64 of the file
    if (typeof v === "string") v = JSON.parse(v);
    const j = v as ServiceAccount;
    if (!j.client_email || !j.private_key) {
      problem = "The key JSON is missing client_email or private_key. Download a new key.";
      return null;
    }
    return { ...j, private_key: j.private_key.replace(/\\n/g, "\n"), project_id: j.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "" };
  } catch {
    try {
      const dec = Buffer.from(raw.trim(), "base64").toString("utf8");
      if (dec.trim().startsWith("{")) return parse(dec);
    } catch {}
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
/** why the service account can’t be used (empty when it can) */
export const adminProblem = () => (account() ? "" : problem);

const cachedTokens = new Map<string, { token: string; exp: number }>();
const DATASTORE = "https://www.googleapis.com/auth/datastore";

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function accessToken(sa: ServiceAccount, scope = DATASTORE) {
  const cached = cachedTokens.get(scope);
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
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
  cachedTokens.set(scope, { token: j.access_token, exp: now + j.expires_in });
  return j.access_token;
}

type Value = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  mapValue?: { fields?: Record<string, Value> };
  arrayValue?: { values?: Value[] };
};
const plain = (v: Value): unknown =>
  v.mapValue
    ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]))
    : v.arrayValue
      ? (v.arrayValue.values ?? []).map(plain)
      : (v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : (v.doubleValue ?? v.booleanValue ?? null)));

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

type Field = string | number | boolean;
const toValue = (v: Field) => (typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : { stringValue: v });

/** Creates a document; fails (returns false) if it already exists. */
export async function adminCreate(collection: string, id: string, fields: Record<string, Field>) {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const res = await fetch(`${base(sa)}/${collection}?documentId=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toValue(v)])) }),
    cache: "no-store",
  });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error(`create ${res.status}`);
  return true;
}

/** Adds `by` to a number field (creating the document if needed) and returns the new value. */
export async function adminIncrement(path: string, field: string, by = 1): Promise<number> {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const name = `projects/${sa.project_id}/databases/(default)/documents/${path}`;
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: [{ transform: { document: name, fieldTransforms: [{ fieldPath: field, increment: { integerValue: String(by) } }] } }] }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`increment ${res.status}`);
  const j = (await res.json()) as { writeResults?: { transformResults?: Value[] }[] };
  const v = j.writeResults?.[0]?.transformResults?.[0];
  return v ? Number(plain(v)) : by;
}

/** A server-only secret for signing things the client hands back (from the service account key). */
export function adminSecret(): string | null {
  return process.env.QUIZ_SECRET || account()?.private_key || null;
}

/** Lists a collection's documents (up to `max`), with their fields as plain values. */
export async function adminList(collection: string, max = 1000): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const out: { id: string; data: Record<string, unknown> }[] = [];
  let page = "";
  do {
    const res = await fetch(`${base(sa)}/${collection}?pageSize=300${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`, { headers: { Authorization: `Bearer ${await accessToken(sa)}` }, cache: "no-store" });
    if (!res.ok) throw new Error(`list ${res.status}`);
    const j = (await res.json()) as { documents?: { name: string; fields?: Record<string, Value> }[]; nextPageToken?: string };
    for (const d of j.documents ?? []) out.push({ id: d.name.split("/").pop() ?? "", data: Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, plain(v)])) });
    page = j.nextPageToken ?? "";
  } while (page && out.length < max);
  return out.slice(0, max);
}

/** Sends one web push notification through Firebase Cloud Messaging. False when the token is no longer valid. */
export async function adminPush(token: string, n: { title: string; body: string; url: string }): Promise<boolean> {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(sa, "https://www.googleapis.com/auth/firebase.messaging")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, data: { title: n.title, body: n.body, url: n.url }, webpush: { headers: { Urgency: "high", TTL: "86400" } } } }),
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return false;
  if (!res.ok) throw new Error(`push ${res.status}`);
  return true;
}

/** For the system check: can this service account send through FCM? Uses validate_only with a fake token. */
export async function adminPushCheck(): Promise<string> {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(sa, "https://www.googleapis.com/auth/firebase.messaging")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ validate_only: true, message: { token: "system-check", data: { t: "1" } } }),
    cache: "no-store",
  });
  if (res.status === 400 || res.status === 404 || res.ok) return `Ready · Firebase Cloud Messaging (${sa.project_id})`;
  if (res.status === 403) throw new Error("Turn on “Firebase Cloud Messaging API (V1)” in Google Cloud for this project, or the service account lacks permission.");
  throw new Error(`Error ${res.status}`);
}

type Any = unknown;
const deep = (v: Any): Value =>
  v === null || v === undefined
    ? { nullValue: null }
    : typeof v === "boolean"
      ? { booleanValue: v }
      : typeof v === "number"
        ? Number.isInteger(v)
          ? { integerValue: String(v) }
          : { doubleValue: v }
        : typeof v === "string"
          ? { stringValue: v }
          : Array.isArray(v)
            ? { arrayValue: { values: v.filter((x) => x !== undefined).map(deep) } }
            : { mapValue: { fields: Object.fromEntries(Object.entries(v as Record<string, Any>).filter(([, x]) => x !== undefined).map(([k, x]) => [k, deep(x)])) } };

/** Writes a whole document (creates or replaces), any JSON-like value. */
export async function adminSet(path: string, data: Record<string, unknown>) {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const res = await fetch(`${base(sa)}/${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: (deep(data) as { mapValue: { fields: Record<string, Value> } }).mapValue.fields }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`set ${res.status}`);
}

/** Sets some fields (any JSON-like values) on a document, creating it if needed. */
export async function adminMerge(path: string, data: Record<string, unknown>) {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const res = await fetch(`${base(sa)}/${path}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: (deep(data) as { mapValue: { fields: Record<string, Value> } }).mapValue.fields }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`merge ${res.status}`);
}

export async function adminDelete(path: string) {
  const sa = account();
  if (!sa) throw new Error("no-admin");
  const res = await fetch(`${base(sa)}/${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${await accessToken(sa)}` }, cache: "no-store" });
  if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
}
