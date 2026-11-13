/** The standalone app's host: everything stays in this browser (IndexedDB). No account, no server, no AI. */
import type { AssetStore, DesignRow, DesignStore, StudioHost, StudioProduct } from "../src";
import { designProblems, type Design } from "../src";

const DB = "design-studio";
const VERSION = 1;
type DesignRecord = DesignRow & { doc: Design };
type AssetRecord = { key: string; blob: Blob; bytes: number };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("designs")) db.createObjectStore("designs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
/** Resolves only when the transaction is committed: a write that the browser later aborts (full storage) is an error. */
async function tx<T>(store: "designs" | "assets", mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    let result: T;
    const req = run(t.objectStore(store));
    req.onsuccess = () => { result = req.result; };
    const fail = () => {
      const err = t.error ?? req.error;
      reject(err?.name === "QuotaExceededError" ? Object.assign(new Error("This browser's storage is full"), { status: 507, quota: true }) : err ?? new Error("storage failed"));
    };
    t.oncomplete = () => resolve(result);
    t.onerror = fail;
    t.onabort = fail;
  });
}

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
export const MAX_LOCAL_DESIGNS = 200;
/** What a server would receive: the design as JSON (no undefined values, no class instances). */
const plain = (d: Design): Design => JSON.parse(JSON.stringify(d));
const invalid = () => Object.assign(new Error("This design file is not valid"), { status: 422 });

export const localDesigns: DesignStore = {
  isId: (id) => /^des_[a-f0-9]{20}$/.test(id),
  async list() {
    const all = (await tx<DesignRecord[]>("designs", "readonly", (s) => s.getAll())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { designs: all.map(({ doc: _d, ...row }) => row), usage: { designs: all.length }, quota: { designs: MAX_LOCAL_DESIGNS } };
  },
  async open(id) {
    const r = await tx<DesignRecord | undefined>("designs", "readonly", (s) => s.get(id));
    if (!r) throw Object.assign(new Error("not found"), { status: 404 });
    if (designProblems(r.doc)) throw invalid();
    await tx("designs", "readwrite", (s) => s.put({ ...r, openedAt: new Date().toISOString() }));
    return { id: r.id, name: r.name, doc: r.doc };
  },
  async create(name, raw, thumb) {
    const doc = plain(raw);
    if (designProblems(doc) || name.length > 80) throw invalid();
    const n = (await tx<number>("designs", "readonly", (s) => s.count()));
    if (n >= MAX_LOCAL_DESIGNS) throw Object.assign(new Error("limit"), { status: 403 });
    const now = new Date().toISOString();
    const id = `des_${hex(10)}`;
    await tx("designs", "readwrite", (s) => s.put({ id, name, doc, thumb, size: doc.size, updatedAt: now, openedAt: now, cleanupWarnedAt: null } satisfies DesignRecord));
    return { id };
  },
  async save(id, name, raw, thumb) {
    const doc = plain(raw);
    if (designProblems(doc) || name.length > 80) throw invalid();
    const r = await tx<DesignRecord | undefined>("designs", "readonly", (s) => s.get(id));
    if (!r) throw Object.assign(new Error("not found"), { status: 404 });
    await tx("designs", "readwrite", (s) => s.put({ ...r, name, doc, size: doc.size, thumb: thumb === undefined ? r.thumb : thumb, updatedAt: new Date().toISOString() }));
  },
  async duplicate(id, suffix) {
    const r = await tx<DesignRecord | undefined>("designs", "readonly", (s) => s.get(id));
    if (!r) throw Object.assign(new Error("not found"), { status: 404 });
    await localDesigns.create(`${r.name} ${suffix}`.slice(0, 80), r.doc, r.thumb);
  },
  async remove(id) {
    await tx("designs", "readwrite", (s) => s.delete(id));
  },
};

const urls = new Map<string, string>();
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const MAX_LOCAL_PICTURE = 8 * 1024 * 1024;

export const localAssets: AssetStore = {
  async upload(blob) {
    const ext = TYPES[blob.type];
    if (!ext) throw Object.assign(new Error("Only PNG, JPEG or WebP pictures"), { status: 415 });
    if (blob.size > MAX_LOCAL_PICTURE) throw Object.assign(new Error("Picture too large"), { status: 413 });
    const key = `studio:local/${hex(16)}.${ext}`;
    await tx("assets", "readwrite", (s) => s.put({ key, blob, bytes: blob.size } satisfies AssetRecord));
    const url = URL.createObjectURL(blob);
    urls.set(key, url);
    return { key, url };
  },
  async sign(keys) {
    const out: Record<string, string> = {};
    for (const key of keys) {
      if (!urls.has(key)) {
        const r = await tx<AssetRecord | undefined>("assets", "readonly", (s) => s.get(key));
        if (r) urls.set(key, URL.createObjectURL(r.blob));
      }
      const u = urls.get(key);
      if (u) out[key] = u;
    }
    return out;
  },
  resolve: (src, signed) => (src.startsWith("studio:") ? signed[src] ?? urls.get(src) ?? "" : src),
  renewAfterMs: 24 * 3600_000,
};

export const SAMPLE: StudioProduct = { id: null, name: "عطر عود 50 مل", price: 3900, compareAtPrice: 4900, image: "/studio/samples/sample-perfume.webp", sample: true };

export function localHost(locale: StudioHost["locale"], notify: StudioHost["notify"]): StudioHost {
  return {
    locale,
    designs: localDesigns,
    assets: localAssets,
    brand: async () => ({ primary: "#0F7B53", accent: "#F59E0D", font: "Cairo", name: "TaswiQ Studio", logo: null }),
    notify,
    modelUrl: "/studio/models/u2netp.onnx",
    sample: SAMPLE,
  };
}
