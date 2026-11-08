/* Study materials: notes, slides and past papers a student uploads.
   Free approach (no Firebase Storage): the file is read in the browser and only
   its text is saved, in users/{uid}/materials/{id}. The list (names, sizes) lives
   in the main app state. */

import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type MaterialKind = "pdf" | "docx" | "pptx" | "text" | "image";

export interface MaterialMeta {
  id: string;
  name: string;
  kind: MaterialKind;
  /** pages or slides, when known */
  pages?: number;
  /** characters of text saved */
  chars: number;
  /** text was cut to fit */
  truncated?: boolean;
  addedAt: string;
  /** optional link to a StudentOS course */
  courseId?: string;
}

/** Free plan: how many materials a student can keep. */
export const FREE_MATERIAL_LIMIT = 10;
/** Text kept per material (about 25–30 pages of notes). */
export const MATERIAL_CHARS = 60_000;
export const MATERIAL_MAX_BYTES = 25 * 1024 * 1024;

export function kindOf(name: string, isImage: boolean): MaterialKind {
  if (isImage) return "image";
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.docx$/i.test(name)) return "docx";
  if (/\.pptx$/i.test(name)) return "pptx";
  return "text";
}

export const KIND_LABEL: Record<MaterialKind, string> = { pdf: "PDF", docx: "Word", pptx: "Slides", text: "Text", image: "Image" };

const ref = (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please log in again.");
  return doc(db, "users", uid, "materials", id);
};

export async function saveMaterialText(id: string, text: string) {
  await setDoc(ref(id), { text, savedAt: new Date().toISOString() });
}

const cache = new Map<string, string>();
export async function loadMaterialText(id: string): Promise<string> {
  if (cache.has(id)) return cache.get(id)!;
  const snap = await getDoc(ref(id));
  const text = snap.exists() ? String((snap.data() as { text?: string }).text ?? "") : "";
  cache.set(id, text);
  return text;
}

export async function deleteMaterialText(id: string) {
  cache.delete(id);
  await deleteDoc(ref(id)).catch(() => {});
}
