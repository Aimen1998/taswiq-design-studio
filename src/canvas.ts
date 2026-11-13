/**
 * The bridge between the studio's design JSON and Fabric.js (MIT). Only this file knows Fabric: it draws a design,
 * reads it back with the allowed properties only (so a saved file always passes the check in design.ts),
 * snaps elements to the safe margins and the centre with visible guides, and handles zoom and pinch.
 */
import { ActiveSelection, Canvas, Circle, FabricImage, Gradient, Group, Rect, Shadow, StaticCanvas, Textbox, cache, util, type FabricObject } from "fabric";
import { SIZES, type SizeId } from "./design";
import type { Design, Obj } from "./model";
import { safeBox } from "./templates";

/** Design font names → the families the browser has loaded («Cairo» ships as «Cairo Variable» in the dashboard). */
const FONT_CSS: Record<string, string> = { Cairo: "Cairo Variable, Cairo", Inter: "Inter Variable, Inter" };
export const cssFont = (f: string) => FONT_CSS[f] ?? f;
export const designFont = (f: string) => Object.entries(FONT_CSS).find(([, css]) => css === f)?.[0] ?? f;
/** No explicit direction: Arabic text reads right-to-left, anything else left-to-right (Fabric garbles Latin in rtl). */
export const directionOf = (text: string) => (/[\u0600-\u06FF]/.test(text) ? "rtl" : "ltr");

const ROUND = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined);

export function backgroundFill(bg: string, size: SizeId) {
  const [W, H] = SIZES[size];
  if (!bg.startsWith("linear:")) return bg;
  const [a, b] = bg.slice(7).split(",");
  return new Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: W * 0.4, y2: H }, colorStops: [{ offset: 0, color: a.trim() }, { offset: 1, color: (b ?? a).trim() }] });
}

/** How far a picture's anchor moves when it is centred in a bigger box: half the gap for a left/top anchor, none for a centre one. */
const anchor = (origin: unknown) => (origin === "center" ? 0 : origin === "right" || origin === "bottom" ? -0.5 : 0.5);

const shadowOf = (s: any) => (s ? new Shadow({ color: s.color ?? "rgba(0,0,0,0.35)", blur: s.blur ?? 8, offsetX: s.offsetX ?? 0, offsetY: s.offsetY ?? 2 }) : undefined);

/** Builds one Fabric object from a design element; pictures load through `resolve` (CORS-safe URLs). */
export async function makeObject(o: Obj, resolve: (src: string) => string): Promise<FabricObject | null> {
  const common: Record<string, unknown> = {
    left: o.left ?? 0, top: o.top ?? 0, angle: o.angle ?? 0, opacity: o.opacity ?? 1, scaleX: o.scaleX ?? 1, scaleY: o.scaleY ?? 1,
    originX: o.originX ?? "left", originY: o.originY ?? "top", visible: o.visible !== false, flipX: Boolean(o.flipX), flipY: Boolean(o.flipY),
    shadow: shadowOf(o.shadow),
  };
  let obj: FabricObject | null = null;
  let keep: Obj | undefined;
  let box: { w: number; h: number } | undefined;
  const t = String(o.type);
  if (t === "textbox" || t === "text" || t === "i-text") {
    obj = new Textbox(String(o.text ?? ""), {
      ...common, width: o.width ?? 400, fontFamily: cssFont(String(o.fontFamily ?? "Cairo")), fontWeight: o.fontWeight ?? 700, fontSize: o.fontSize ?? 48,
      fill: o.fill ?? "#000000", textAlign: o.textAlign ?? (directionOf(String(o.text ?? "")) === "rtl" ? "right" : "left"), direction: o.direction ?? directionOf(String(o.text ?? "")), lineHeight: o.lineHeight ?? 1.2,
      charSpacing: o.charSpacing ?? 0, textBackgroundColor: o.textBackgroundColor ?? "", underline: Boolean(o.underline), linethrough: Boolean(o.linethrough), splitByGrapheme: false,
    } as any);
  } else if (t === "rect") {
    obj = new Rect({ ...common, width: o.width ?? 100, height: o.height ?? 100, rx: o.rx ?? 0, ry: o.ry ?? o.rx ?? 0, fill: o.fill ?? "#cccccc", stroke: o.stroke ?? undefined, strokeWidth: o.strokeWidth ?? 0 } as any);
  } else if (t === "circle") {
    obj = new Circle({ ...common, radius: o.radius ?? 50, fill: o.fill ?? "#cccccc", stroke: o.stroke ?? undefined, strokeWidth: o.strokeWidth ?? 0 } as any);
  } else if (t === "image" && typeof o.src === "string") {
    try {
      const url = resolve(o.src);
      if (!url) throw new Error("no picture address");
      const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      const cx = Number(o.cropX ?? 0), cy = Number(o.cropY ?? 0);
      const nw = Math.max(1, (img.width || 1) - cx * 2), nh = Math.max(1, (img.height || 1) - cy * 2);
      // A picture lives in a box (its width and height on the design); any photo put in it is fitted, whatever its pixels.
      const fit = o.width && o.height ? Math.min(Number(o.width) / nw, Number(o.height) / nh) : null;
      // Centred in its box; the box itself is kept (meta.box) so the next photo gets the same space, whatever its shape.
      const off = fit ? { left: Number(o.left ?? 0) + (Number(o.width) - nw * fit) * anchor(o.originX ?? "left"), top: Number(o.top ?? 0) + (Number(o.height) - nh * fit) * anchor(o.originY ?? "top") } : {};
      img.set({ ...common, ...(fit ? { scaleX: fit, scaleY: fit, ...off } : {}), cropX: cx, cropY: cy, ...(cx || cy ? { width: nw, height: nh } : {}), stroke: o.stroke ?? undefined, strokeWidth: o.strokeWidth ?? 0 } as any);
      box = fit ? { w: Number(o.width), h: Number(o.height) } : { w: nw * Number(o.scaleX ?? 1), h: nh * Number(o.scaleY ?? 1) };
      const k = fit ?? Number(o.scaleX ?? 1);
      if (o.rx) img.set({ clipPath: new Rect({ width: img.width, height: img.height, rx: Number(o.rx) / k, ry: Number(o.rx) / k, originX: "center", originY: "center" }) });
      obj = img;
    } catch {
      // Never drop a picture that failed to load once (expired link, offline): a placeholder keeps it in the design.
      keep = o;
      const w = Number(o.width ?? 300 * Number(o.scaleX ?? 1)), h = Number(o.height ?? 300 * Number(o.scaleY ?? 1));
      obj = new Rect({ ...common, scaleX: 1, scaleY: 1, width: w, height: h, fill: "rgba(148,163,184,0.25)", stroke: "#94a3b8", strokeWidth: 3, strokeDashArray: [12, 8] } as any);
    }
  } else if (t === "group" && Array.isArray(o.objects)) {
    const children = (await Promise.all(o.objects.map((c: Obj) => makeObject(c, resolve)))).filter(Boolean) as FabricObject[];
    obj = new Group(children, { ...common, subTargetCheck: false } as any);
  }
  if (!obj) return null;
  (obj as any).meta = { type: t, role: o.role, bind: o.bind, src: o.src, rx: o.rx, locked: Boolean(o.locked), name: o.name, ...(keep ? { keep } : {}), ...(box ? { box } : {}) };
  if (o.locked) obj.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false });
  return obj;
}

/** One Fabric object back to a design element, with the allowed properties only. */
export function readObject(f: FabricObject): Obj {
  const m = (f as any).meta ?? {};
  const a = f as any;
  if (m.keep) return { ...m.keep, left: ROUND(a.left), top: ROUND(a.top), visible: a.visible === false ? false : m.keep.visible };
  const out: Obj = { type: m.type ?? (f.type === "textbox" ? "textbox" : f.type) };
  const put = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== "") out[k] = v; };
  put("left", ROUND(a.left)); put("top", ROUND(a.top)); put("angle", ROUND(a.angle) || undefined); put("opacity", a.opacity === 1 ? undefined : ROUND(a.opacity));
  put("scaleX", a.scaleX === 1 ? undefined : ROUND(a.scaleX)); put("scaleY", a.scaleY === 1 ? undefined : ROUND(a.scaleY));
  if (a.originX !== "left") put("originX", a.originX); if (a.originY !== "top") put("originY", a.originY);
  if (!a.visible) out.visible = false; if (a.flipX) out.flipX = true; if (a.flipY) out.flipY = true;
  if (m.locked) out.locked = true; put("role", m.role); put("bind", m.bind); put("name", m.name);
  if (a.shadow) out.shadow = { color: a.shadow.color, blur: ROUND(a.shadow.blur), offsetX: ROUND(a.shadow.offsetX), offsetY: ROUND(a.shadow.offsetY) };
  if (f instanceof Textbox) {
    put("text", a.text); put("width", ROUND(a.width)); put("fontFamily", designFont(a.fontFamily)); put("fontWeight", typeof a.fontWeight === "string" && /^\d+$/.test(a.fontWeight) ? Number(a.fontWeight) : a.fontWeight);
    put("fontSize", ROUND(a.fontSize)); put("fill", typeof a.fill === "string" ? a.fill : undefined); put("textAlign", a.textAlign); put("direction", a.direction);
    put("lineHeight", ROUND(a.lineHeight)); if (a.charSpacing) put("charSpacing", ROUND(a.charSpacing)); put("textBackgroundColor", a.textBackgroundColor); if (a.underline) out.underline = true; if (a.linethrough) out.linethrough = true;
  } else if (f instanceof Rect) {
    put("width", ROUND(a.width)); put("height", ROUND(a.height)); put("rx", ROUND(a.rx) || undefined); put("ry", ROUND(a.ry) || undefined);
    put("fill", typeof a.fill === "string" ? a.fill : undefined); put("stroke", a.stroke || undefined); put("strokeWidth", a.strokeWidth ? ROUND(a.strokeWidth) : undefined);
  } else if (f instanceof Circle) {
    put("radius", ROUND(a.radius)); put("fill", typeof a.fill === "string" ? a.fill : undefined); put("stroke", a.stroke || undefined); put("strokeWidth", a.strokeWidth ? ROUND(a.strokeWidth) : undefined);
  } else if (f instanceof FabricImage) {
    delete out.scaleX; delete out.scaleY;
    const shownW = a.width * (a.scaleX ?? 1), shownH = a.height * (a.scaleY ?? 1);
    const bw = m.box?.w ?? shownW, bh = m.box?.h ?? shownH;
    put("left", ROUND(a.left - (bw - shownW) * anchor(a.originX))); put("top", ROUND(a.top - (bh - shownH) * anchor(a.originY)));
    put("width", ROUND(bw)); put("height", ROUND(bh));
    put("src", m.src); put("cropX", ROUND(a.cropX) || undefined); put("cropY", ROUND(a.cropY) || undefined); put("rx", m.rx); put("stroke", a.stroke || undefined); put("strokeWidth", a.strokeWidth ? ROUND(a.strokeWidth) : undefined);
  } else if (f instanceof Group) {
    out.objects = (f as Group).getObjects().map(readObject);
  }
  return out;
}

/**
 * Elements inside a multi-selection hold coordinates relative to it (Fabric 6). For the read, each one is given its
 * real place on the canvas (its full transform), read, then put back, so the selection itself is never touched.
 */
const TRANSFORM_KEYS = ["left", "top", "angle", "scaleX", "scaleY", "skewX", "skewY", "flipX", "flipY"] as const;
export function readAbsolute(o: FabricObject): Obj {
  const before: Record<string, unknown> = {};
  for (const k of TRANSFORM_KEYS) before[k] = (o as any)[k];
  util.applyTransformToObject(o, o.calcTransformMatrix());
  try { return readObject(o); } finally { o.set(before as any); }
}
export function readDesign(canvas: Canvas | StaticCanvas, base: Design): Design {
  const active = canvas instanceof Canvas ? canvas.getActiveObject() : undefined;
  const inSelection = new Set<FabricObject>(active instanceof ActiveSelection ? active.getObjects() : []);
  const objects = canvas.getObjects().filter((o) => !(o as any).guide).map((o) => (inSelection.has(o) ? readAbsolute(o) : readObject(o)));
  return { schemaVersion: 1, size: base.size, background: base.background, ...(base.templateId ? { templateId: base.templateId } : {}), objects };
}

export async function drawDesign(canvas: Canvas | StaticCanvas, d: Design, resolve: (src: string) => string) {
  const objs = (await Promise.all(d.objects.map((o) => makeObject(o, resolve)))).filter(Boolean) as FabricObject[];
  canvas.clear();
  canvas.backgroundColor = backgroundFill(d.background, d.size) as any;
  objs.forEach((o) => canvas.add(o));
  canvas.requestRenderAll();
}

/** Re-measures every text once the design fonts arrive: the design is drawn at once, never a white canvas while fonts load. */
export function refreshText(canvas: Canvas | StaticCanvas) {
  cache.clearFontCache();
  const walk = (objs: FabricObject[]) => objs.forEach((o) => {
    if (o instanceof Textbox) { o.initDimensions(); o.setCoords(); }
    else if (o instanceof Group) { walk(o.getObjects()); (o as any).triggerLayout?.(); o.setCoords(); }
  });
  walk(canvas.getObjects());
  canvas.requestRenderAll();
}

/** A small JPEG of a design (for «My designs» and template cards). */
export async function renderThumb(d: Design, resolve: (src: string) => string, width = 240): Promise<string> {
  const [W, H] = SIZES[d.size];
  const el = document.createElement("canvas");
  const sc = new StaticCanvas(el, { width: W, height: H, enableRetinaScaling: false });
  await drawDesign(sc, d, resolve);
  const url = sc.toDataURL({ format: "jpeg", quality: 0.72, multiplier: width / W });
  sc.dispose();
  return url;
}

/** Full-size export of a design (PNG or JPG). */
export async function exportDesign(d: Design, resolve: (src: string) => string, format: "png" | "jpeg"): Promise<Blob> {
  const [W, H] = SIZES[d.size];
  const el = document.createElement("canvas");
  const sc = new StaticCanvas(el, { width: W, height: H, enableRetinaScaling: false });
  await drawDesign(sc, d, resolve);
  const url = sc.toDataURL({ format, quality: 0.92, multiplier: 1 });
  sc.dispose();
  return await (await fetch(url)).blob();
}

/** Snaps a moving element to the safe margins and the centre lines; returns the guide lines to draw. */
export function snap(obj: FabricObject, size: SizeId, threshold: number): Array<{ x?: number; y?: number }> {
  const [W, H] = SIZES[size];
  const box = safeBox(size);
  const r = obj.getBoundingRect();
  const guides: Array<{ x?: number; y?: number }> = [];
  const xs = [box.left, box.right, W / 2];
  const ys = [box.top, box.bottom, H / 2];
  const edgesX = [r.left, r.left + r.width, r.left + r.width / 2];
  const edgesY = [r.top, r.top + r.height, r.top + r.height / 2];
  let dx = 0, dy = 0;
  for (const x of xs) for (const e of edgesX) if (!dx && Math.abs(x - e) < threshold) { dx = x - e; guides.push({ x }); }
  for (const y of ys) for (const e of edgesY) if (!dy && Math.abs(y - e) < threshold) { dy = y - e; guides.push({ y }); }
  if (dx || dy) obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
  return guides;
}

/** Fits the design to the stage box (zoom ≤ 1), or applies an exact zoom; keeps the canvas element sized. */
export function applyZoom(canvas: Canvas, size: SizeId, zoom: number) {
  const [W, H] = SIZES[size];
  canvas.setDimensions({ width: Math.round(W * zoom), height: Math.round(H * zoom) });
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}
export function fitZoom(size: SizeId, stageW: number, stageH: number) {
  const [W, H] = SIZES[size];
  return Math.max(0.05, Math.min(stageW / W, stageH / H) * 0.94);
}
