/* Interview recordings kept only on this device, in IndexedDB. The newest few are
   kept; older ones are deleted. Nothing is uploaded. */

const DB = "studentos-recordings";
const STORE = "rec";
const KEEP = 5;

type Row = { id: string; at: number; blob: Blob };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-idb"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Saves a recording and drops the oldest beyond the newest few. Never throws. */
export async function saveRecording(id: string, blob: Blob) {
  try {
    await run("readwrite", (s) => s.put({ id, at: Date.now(), blob } satisfies Row));
    const all = await run<Row[]>("readonly", (s) => s.getAll() as IDBRequest<Row[]>);
    const old = all.sort((a, b) => b.at - a.at).slice(KEEP);
    for (const r of old) await run("readwrite", (s) => s.delete(r.id));
    return true;
  } catch {
    return false;
  }
}

export async function getRecording(id: string): Promise<Blob | null> {
  try {
    const r = await run<Row | undefined>("readonly", (s) => s.get(id) as IDBRequest<Row | undefined>);
    return r?.blob ?? null;
  } catch {
    return null;
  }
}
