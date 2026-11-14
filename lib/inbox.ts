/* The in-app notification bell: users/{uid}/inbox, written by the server
   (placement alerts). The student can read, mark read and delete. */

import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  at: number;
  read: boolean;
}

export async function loadInbox(uid: string): Promise<InboxItem[]> {
  const snap = await getDocs(query(collection(db, "users", uid, "inbox"), orderBy("at", "desc"), limit(30)));
  return snap.docs.map((d: { data: () => unknown }) => d.data() as InboxItem).sort((a: InboxItem, b: InboxItem) => b.at - a.at);
}

export const markRead = (uid: string, id: string) => updateDoc(doc(db, "users", uid, "inbox", id), { read: true });
export const removeItem = (uid: string, id: string) => deleteDoc(doc(db, "users", uid, "inbox", id));
