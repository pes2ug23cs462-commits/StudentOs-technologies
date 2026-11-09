/* ------------------------------------------------------------------
   Auth — Firebase Authentication.
   Screens call these functions and get back { ok } or { ok:false, code },
   so they never deal with Firebase errors directly.
------------------------------------------------------------------ */

import { recentlySignedIn, setChatsUnlocked } from "./chats";
import { FirebaseError } from "firebase/app";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "./firebase";

/* Staying signed in: by default a login lasts only until the browser is closed, so the
   next visit shows "Log in" again. Ticking "Remember me" keeps it across visits. The
   choice is kept in localStorage; this also moves anyone signed in from an older
   version (which always remembered) to the new rule. */
const REMEMBER_KEY = "studentos:remember";
function remembered() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}
function setRemember(on: boolean) {
  try {
    if (on) localStorage.setItem(REMEMBER_KEY, "1");
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* private mode */
  }
}
if (typeof window !== "undefined" && firebaseConfigured && !remembered()) setPersistence(auth, browserSessionPersistence).catch(() => {});

export type AuthErrorCode =
  | "email-in-use"
  | "invalid-credentials"
  | "network"
  | "send-failed"
  | "too-many"
  | "popup-blocked"
  | "popup-closed"
  | "not-enabled"
  | "account-exists"
  | "recent-login"
  | "domain"
  | "config"
  | "unknown";
export type AuthResult = { ok: true; name: string; email: string; isNew?: boolean } | { ok: false; code: AuthErrorCode };
export type SocialProvider = "google" | "github" | "linkedin";

export const authErrorText: Record<AuthErrorCode, { title: string; body: string }> = {
  "email-in-use": { title: "That email already has an account", body: "Log in instead, or use a different email." },
  "invalid-credentials": { title: "Email or password is incorrect", body: "Check your details and try again, or reset your password." },
  network: { title: "Couldn’t reach StudentOS", body: "Check your connection and try again." },
  "send-failed": { title: "We couldn’t send the link", body: "Something went wrong on our side. Your email is saved — try again in a moment." },
  "too-many": { title: "Too many attempts", body: "Wait a few minutes and try again." },
  "popup-blocked": { title: "Your browser blocked the sign-in window", body: "Allow pop-ups for this site and try again." },
  "popup-closed": { title: "Sign-in was cancelled", body: "The sign-in window was closed before it finished." },
  "not-enabled": { title: "This sign-in method isn’t available yet", body: "Use Google, GitHub or your email for now." },
  "account-exists": { title: "This email uses a different sign-in method", body: "Log in the way you signed up — with email or with Google." },
  "recent-login": { title: "Please log in again first", body: "For your security, log out, log back in, then try again." },
  domain: { title: "This website isn’t allowed to sign in yet", body: "Add this domain in Firebase → Authentication → Settings → Authorized domains, then try again." },
  config: { title: "Sign-in isn’t set up on this deploy", body: "The Firebase settings are missing. Add the NEXT_PUBLIC_FIREBASE_… variables in Vercel and redeploy." },
  unknown: { title: "Something went wrong", body: "Please try again." },
};

function toCode(err: unknown): AuthErrorCode {
  const code = err instanceof FirebaseError ? err.code : "";
  switch (code) {
    case "auth/email-already-in-use":
      return "email-in-use";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "invalid-credentials";
    case "auth/network-request-failed":
      return "network";
    case "auth/too-many-requests":
      return "too-many";
    case "auth/popup-blocked":
      return "popup-blocked";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "popup-closed";
    case "auth/operation-not-allowed":
      return "not-enabled";
    case "auth/account-exists-with-different-credential":
      return "account-exists";
    case "auth/requires-recent-login":
      return "recent-login";
    case "auth/unauthorized-domain":
      return "domain";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/configuration-not-found":
    case "auth/auth-domain-config-required":
      return "config";
    default:
      if (err) console.error(err);
      return "unknown";
  }
}

/** Name typed on the sign-up form, read by the store when it creates the user’s data. */
const PENDING_NAME_KEY = "studentos:pendingName";
export function takePendingName() {
  try {
    const n = sessionStorage.getItem(PENDING_NAME_KEY);
    sessionStorage.removeItem(PENDING_NAME_KEY);
    return n ?? "";
  } catch {
    return "";
  }
}

export async function signUp(input: { name: string; email: string; password: string }): Promise<AuthResult> {
  try {
    try {
      sessionStorage.setItem(PENDING_NAME_KEY, input.name);
    } catch {
      /* private mode */
    }
    setRemember(false);
    await setPersistence(auth, browserSessionPersistence);
    const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
    await updateProfile(cred.user, { displayName: input.name });
    sendEmailVerification(cred.user).catch(console.error);
    return { ok: true, name: input.name, email: input.email, isNew: true };
  } catch (err) {
    return { ok: false, code: toCode(err) };
  }
}

export async function logIn(input: { email: string; password: string; remember: boolean }): Promise<AuthResult> {
  try {
    setRemember(input.remember);
    await setPersistence(auth, input.remember ? browserLocalPersistence : browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, input.email, input.password);
    return { ok: true, name: cred.user.displayName ?? "", email: cred.user.email ?? input.email };
  } catch (err) {
    return { ok: false, code: toCode(err) };
  }
}

export async function signInWithProvider(provider: SocialProvider, remember = false): Promise<AuthResult> {
  if (!firebaseConfigured) return { ok: false, code: "config" };
  if (provider === "linkedin") return { ok: false, code: "not-enabled" };
  try {
    setRemember(remember);
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const p = provider === "github" ? new GithubAuthProvider() : new GoogleAuthProvider();
    if (p instanceof GithubAuthProvider) p.addScope("user:email");
    const cred = await signInWithPopup(auth, p);
    return {
      ok: true,
      name: cred.user.displayName ?? "",
      email: cred.user.email ?? "",
      isNew: getAdditionalUserInfo(cred)?.isNewUser ?? false,
    };
  } catch (err) {
    return { ok: false, code: toCode(err) };
  }
}

export async function sendPasswordReset(email: string): Promise<{ ok: true } | { ok: false; code: AuthErrorCode }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (err) {
    // Don’t reveal whether an account exists for this email.
    if (err instanceof FirebaseError && err.code === "auth/user-not-found") return { ok: true };
    const code = toCode(err);
    return { ok: false, code: code === "unknown" || code === "invalid-credentials" ? "send-failed" : code };
  }
}

export async function logOut() {
  setChatsUnlocked(false);
  setRemember(false);
  await signOut(auth);
}

/** Deletes the user’s data and their login. */
/** Deletes the account and everything stored for it: the profile and app data,
 *  saved chats, study materials, shared chat links and public certificate records. */
export async function deleteAccount(): Promise<{ ok: true } | { ok: false; code: AuthErrorCode }> {
  const user = auth.currentUser;
  if (!user) return { ok: true };
  // Firebase only deletes a sign-in that is recent, so check first, before any data is removed.
  if (!recentlySignedIn(5)) return { ok: false, code: "recent-login" };
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = (snap.exists() ? snap.data() : {}) as {
      chats?: { id: string; shareId?: string }[];
      materials?: { id: string }[];
      learning?: { courses?: Record<string, { certId?: string }> };
    };
    const refs = [
      ...(data.chats ?? []).map((c) => doc(db, "users", user.uid, "chats", c.id)),
      ...(data.chats ?? []).filter((c) => c.shareId).map((c) => doc(db, "shared", c.shareId!)),
      ...(data.materials ?? []).map((m) => doc(db, "users", user.uid, "materials", m.id)),
      ...Object.values(data.learning?.courses ?? {}).filter((c) => c.certId).map((c) => doc(db, "certificates", c.certId!)),
      doc(db, "reviews", user.uid),
    ];
    await Promise.allSettled(refs.map((r) => deleteDoc(r)));
    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(user);
    return { ok: true };
  } catch (err) {
    return { ok: false, code: toCode(err) };
  }
}

export const providerName: Record<SocialProvider, string> = { google: "Google", github: "GitHub", linkedin: "LinkedIn" };

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
