/** Studio logic without the canvas: contrast, safe margins, size changes, product links, history. */
import { SIZES, type SizeId } from "./design";
import { boundText, buildDesign, safeBox, type Brand, type Lang, type ProductInfo, type TemplateId } from "./templates";

export type Obj = Record<string, any>;
export interface Design { schemaVersion: number; size: SizeId; background: string; objects: Obj[]; templateId?: string }

// ── Contrast (WCAG) ─────────────────────────────────────────────────────────
function rgb(c: string): [number, number, number] | null {
  const s = c.trim().toLowerCase();
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-f])/.exec(s);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((x) => x + x).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const m = /^rgba?\(([^)]+)\)/.exec(s);
  if (m) {
    const [r, g, b] = m[1].split(",").map((x) => parseFloat(x));
    return [r, g, b];
  }
  if (s.startsWith("linear:")) return rgb(s.slice(7).split(",")[0]);
  return s === "transparent" ? null : null;
}
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contrastRatio(a: string, b: string): number | null {
  const x = rgb(a), y = rgb(b);
  if (!x || !y) return null;
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

const box = (o: Obj) => {
  const w = (o.width ?? 0) * (o.scaleX ?? 1), h = (o.height ?? (o.fontSize ?? 0) * 1.3) * (o.scaleY ?? 1);
  const left = o.originX === "center" ? o.left - w / 2 : o.left ?? 0;
  const top = o.originY === "center" ? o.top - h / 2 : o.top ?? 0;
  return { left, top, right: left + w, bottom: top + h };
};
const overlaps = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

export type Warning = { index: number; kind: "contrast" | "over_photo" | "outside_margin" | "story_zone" };

/** Text that may be hard to read: low contrast with the background, or sitting on a photo without help. */
export function readabilityWarnings(d: Design): Warning[] {
  const out: Warning[] = [];
  const photos = d.objects.map((o, i) => ({ o, i })).filter(({ o }) => o.type === "image");
  d.objects.forEach((o, i) => {
    if (!/text/.test(String(o.type)) || o.visible === false) return;
    const helped = Boolean(o.textBackgroundColor) || Boolean(o.shadow);
    const onPhoto = photos.some((p) => p.i < i && overlaps(box(o), box(p.o)));
    if (onPhoto && !helped) { out.push({ index: i, kind: "over_photo" }); return; }
    const r = contrastRatio(String(o.fill ?? "#000"), String(o.textBackgroundColor || d.background));
    if (r !== null && r < 3 && !helped) out.push({ index: i, kind: "contrast" });
  });
  return out;
}

/** Text that leaves the safe margin, or sits where story apps draw their buttons. */
export function placementWarnings(d: Design): Warning[] {
  const safe = safeBox(d.size);
  const out: Warning[] = [];
  d.objects.forEach((o, i) => {
    if (!/text|group/.test(String(o.type)) || o.visible === false) return;
    const b = box(o);
    const [W] = SIZES[d.size];
    const m = Math.round(W * 0.06);
    if (b.left < m - 1 || b.top < m - 1 || b.right > W - m + 1 || b.bottom > SIZES[d.size][1] - m + 1) out.push({ index: i, kind: "outside_margin" });
    else if (d.size === "story" && (b.top < safe.top || b.bottom > safe.bottom)) out.push({ index: i, kind: "story_zone" });
  });
  return out;
}

/** «Fix it»: a soft dark band behind text on a photo or with low contrast, and text pulled inside the safe box. */
export function autoFix(d: Design): Design {
  const safe = safeBox(d.size);
  const bad = new Set([...readabilityWarnings(d), ...placementWarnings(d)].map((w) => w.index));
  return {
    ...d,
    objects: d.objects.map((o, i) => {
      if (!bad.has(i)) return o;
      const next: Obj = { ...o };
      if (/text/.test(String(o.type))) {
        const light = (contrastRatio(String(o.fill ?? "#fff"), "#000000") ?? 21) > 7;
        next.textBackgroundColor = light ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.8)";
      }
      const b = box(next);
      const w = b.right - b.left, h = b.bottom - b.top;
      const left = Math.min(Math.max(b.left, safe.left), safe.right - Math.min(w, safe.right - safe.left));
      const top = Math.min(Math.max(b.top, safe.top), safe.bottom - Math.min(h, safe.bottom - safe.top));
      next.left = o.originX === "center" ? left + w / 2 : left;
      next.top = o.originY === "center" ? top + h / 2 : top;
      if (w > safe.right - safe.left && o.width) next.width = (safe.right - safe.left) / (o.scaleX ?? 1);
      return next;
    }),
  };
}

// ── Size change ─────────────────────────────────────────────────────────────
/**
 * Nothing the merchant made is thrown away: every element keeps its content (text, photo, cut-out, link, colour).
 * A template element takes the new size's place and box from the template (a photo is fitted into its new box);
 * anything the merchant added, and every group, is scaled into the new canvas. Deleted elements stay deleted.
 */
export function convertSize(d: Design, to: SizeId, brand: Brand, product: ProductInfo, lang: Lang): Design {
  if (d.size === to) return d;
  const [W0, H0] = SIZES[d.size];
  const [W1, H1] = SIZES[to];
  if (d.templateId) {
    const fresh = buildDesign(d.templateId as TemplateId, to, brand, product, lang) as Design;
    const slots = new Map<string, Obj>();
    fresh.objects.forEach((o) => { const k = `${o.role ?? ""}:${o.bind ?? ""}`; if (o.role && !slots.has(k)) slots.set(k, o); });
    const take = (o: Obj): Obj | undefined => {
      if (!o.role || o.type === "group") return undefined;
      const exact = `${o.role}:${o.bind ?? ""}`;
      const k = slots.has(exact) ? exact : [...slots.keys()].find((x) => x.startsWith(`${o.role}:`) && slots.get(x)!.type === o.type);
      const slot = k ? slots.get(k) : undefined;
      if (!slot || slot.type !== o.type) return undefined;
      slots.delete(k!);
      return slot;
    };
    const objects = d.objects.map((o) => { const slot = take(o); return slot ? placeLike(o, slot) : scaleInto(o, W0, H0, W1, H1); });
    return { ...d, size: to, objects };
  }
  return { ...d, size: to, objects: d.objects.map((o) => scaleInto(o, W0, H0, W1, H1)) };
}
const LAYOUT = ["left", "top", "width", "height", "fontSize", "radius", "scaleX", "scaleY", "originX", "originY", "angle"] as const;
function placeLike(o: Obj, slot: Obj): Obj {
  const out: Obj = { ...o };
  for (const k of LAYOUT) { if (slot[k] === undefined) delete out[k]; else out[k] = slot[k]; }
  return out;
}
function scaleInto(o: Obj, W0: number, H0: number, W1: number, H1: number): Obj {
  const k = Math.min(W1 / W0, H1 / H0);
  const dx = (W1 - W0 * k) / 2, dy = (H1 - H0 * k) / 2;
  return { ...o, left: (o.left ?? 0) * k + dx, top: (o.top ?? 0) * k + dy, scaleX: (o.scaleX ?? 1) * k, scaleY: (o.scaleY ?? 1) * k };
}

// ── Product links (🔗) ──────────────────────────────────────────────────────
/** Bound fields follow the product: its name, price, old price and photo. Unlinked fields are left alone. */
export function syncBindings(d: Design, product: ProductInfo, lang: Lang): Design {
  return {
    ...d,
    objects: d.objects.map((o) => {
      if (!o.bind) return o;
      if (o.bind === "image") return { ...o, src: product.image };
      const text = boundText(o.bind, product, lang);
      return text === null ? { ...o, visible: false } : { ...o, text, visible: true };
    }),
  };
}
export const unlink = (o: Obj): Obj => { const { bind: _b, ...rest } = o; return rest; };

// ── History ─────────────────────────────────────────────────────────────────
export const HISTORY = 50;
export interface History { past: string[]; future: string[] }
/** `past` always ends with the state on screen; undo steps back one and keeps it there, so no state is skipped. */
export const record = (h: History, snapshot: string): History => (h.past.at(-1) === snapshot ? h : { past: [...h.past, snapshot].slice(-HISTORY), future: [] });
export const canUndo = (h: History) => h.past.length > 1;
export function undo(h: History, current: string): { h: History; snapshot: string | null } {
  const past = [...h.past];
  if (past.at(-1) === current) past.pop();
  const prev = past.at(-1);
  if (prev === undefined) return { h, snapshot: null };
  return { h: { past, future: [current, ...h.future].slice(0, HISTORY) }, snapshot: prev };
}
export function redo(h: History, current: string): { h: History; snapshot: string | null } {
  if (!h.future.length) return { h, snapshot: null };
  const [next, ...future] = h.future;
  const past = h.past.at(-1) === current ? [...h.past, next] : [...h.past, current, next];
  return { h: { past: past.slice(-HISTORY), future }, snapshot: next };
}
