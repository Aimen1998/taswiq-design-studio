import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ActiveSelection, Canvas, FabricImage, Group, Rect, Textbox, type FabricObject } from "fabric";
import {
  Heart, MessageCircle, Send, AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowUp, Copy, Download, Expand, Eye, EyeOff, FileImage, Group as GroupIcon, ImagePlus, Layers, LayoutTemplate,
  Link2, Link2Off, Lock, LockOpen, Maximize, Minus, Package, Palette, PaintBucket, Plus, Redo2, Scissors, Search, Share2, Images, Upload, Shapes, Sparkles, Trash2, Type, Undo2, Ungroup, Wand2, X,
} from "lucide-react";
import { SIZES, FONTS, type SizeId } from "./design";
import { PHOTO_PLACEHOLDER, useHost, type StudioProduct } from "./context";
import type { UiKit } from "./ui";
import { applyZoom, cssFont, designFont, drawDesign, refreshText, exportDesign, fitZoom, makeObject, readDesign, renderThumb, snap } from "./canvas";
import { autoFix, convertSize, canUndo, placementWarnings, readabilityWarnings, record, redo, syncBindings, undo, unlink, type Design, type History, type Obj } from "./model";
import { TEMPLATE_IDS, buildDesign, money, safeBox, STORY_SAFE, type Brand, type Lang, type ProductInfo, type TemplateId } from "./templates";
import { applyMask, maskCanvas, removeBackground, supported as cutoutSupported, type Stage } from "./bgremove";
import { loadDesignFonts } from "./fonts";
import { useS } from "./strings";
import { TEXT_COMBOS, comboObjects, findStickers, stickerObject } from "./elements";

export type { StudioProduct };
// The host's own components (TaswiQ passes its design system), resolved at render time.
const Button = (p: ComponentProps<UiKit["Button"]>) => { const C = useHost().ui.Button; return <C {...p} />; };
const Dialog = (p: ComponentProps<UiKit["Dialog"]>) => { const C = useHost().ui.Dialog; return <C {...p} />; };
const Select = (p: ComponentProps<UiKit["Select"]>) => { const C = useHost().ui.Select; return <C {...p} />; };
type Tab = "templates" | "uploads" | "products" | "text" | "elements" | "background" | "brand" | "cutout" | "ai" | "layers";
const TABS: Array<{ id: Tab; icon: typeof Type; key: Parameters<ReturnType<typeof useS>>[0] }> = [
  { id: "templates", icon: LayoutTemplate, key: "rail_templates" }, { id: "uploads", icon: Images, key: "rail_uploads" }, { id: "products", icon: Package, key: "rail_products" }, { id: "text", icon: Type, key: "rail_text" },
  { id: "elements", icon: Shapes, key: "rail_elements" }, { id: "background", icon: PaintBucket, key: "rail_background" }, { id: "brand", icon: Palette, key: "rail_brand" },
  { id: "cutout", icon: Scissors, key: "rail_cutout" }, { id: "ai", icon: Sparkles, key: "rail_ai" }, { id: "layers", icon: Layers, key: "rail_layers" },
];
const TOUR_KEY = "taswiq:studio:tour";
const GRADIENTS = ["#0F7B53,#0a4f36", "#9f1239,#4c0519", "#1e3a8a,#0f172a", "#F59E0D,#b45309", "#7c3aed,#4c1d95", "#0f172a,#334155", "#be185d,#831843", "#065f46,#022c22"];
const COLORS = ["#ffffff", "#f6f3ef", "#fef3c7", "#e0f2fe", "#dcfce7", "#fce7f3", "#111827", "#1f2937", "#991b1b", "#1d4ed8"];
const isText = (o: FabricObject | null): o is Textbox => o instanceof Textbox;


function Field({ label: l, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm font-semibold">{l}{children}</label>;
}
function Range({ value, min, max, step = 1, onChange, aria }: { value: number; min: number; max: number; step?: number; onChange: (n: number) => void; aria: string }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" className="h-11 flex-1 accent-brand" min={min} max={max} step={step} value={value} aria-label={aria} onChange={(e) => onChange(Number(e.currentTarget.value))} />
      <input type="number" className="h-11 w-20 rounded-lg border border-border px-2 text-base" min={min} max={max} step={step} value={Math.round(value * 100) / 100} aria-label={aria} onChange={(e) => onChange(Number(e.currentTarget.value))} />
    </div>
  );
}

export function Editor({ initial, designId: startId, name: startName, brand, products, product: startProduct, onBack }: {
  initial: Design; designId: string | null; name: string; brand: Brand; products: StudioProduct[]; product: StudioProduct; onBack: () => void;
}) {
  const s = useS();
  const host = useHost();
  const notify = host.notify;
  const locale = host.locale as Lang;
  const tabs = TABS.filter((t) => (t.id !== "ai" || host.ai) && (t.id !== "products" || host.products) && (t.id !== "uploads" || host.assets.list));
  const lang: Lang = locale === "fr" || locale === "en" ? locale : "ar";
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<Canvas | null>(null);
  const base = useRef<Design>(initial);
  const quiet = useRef(false);
  const signed = useRef<Record<string, string>>({});
  const [design, setDesign] = useState<Design>(initial);
  const idRef = useRef<string | null>(startId);
  const nameRef = useRef(startName);
  const photoInput = useRef<HTMLInputElement>(null);
  const [name, setNameState] = useState(startName);
  const setName = (n: string) => { nameRef.current = n; setNameState(n); };
  const [product, setProduct] = useState<StudioProduct>(startProduct);
  const [sel, setSel] = useState<FabricObject | null>(null);
  const [, bump] = useState(0);
  const [tab, setTab] = useState<Tab>("templates");
  const [sheet, setSheet] = useState(false);
  const [zoom, setZoom] = useState(0.4);
  const [fitted, setFitted] = useState(true);
  const [guides, setGuides] = useState<Array<{ x?: number; y?: number }>>([]);
  const [showSafe, setShowSafe] = useState(initial.size === "story");
  const [hist, setHist] = useState<History>({ past: [], future: [] });
  const [status, setStatus] = useState<"saved" | "saving" | "failed" | "rejected">("saved");
  const [preview, setPreview] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [tour, setTour] = useState<number | null>(null);
  const [elQuery, setElQuery] = useState("");
  const stickers = useMemo(() => findStickers(elQuery), [elQuery]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolve = useCallback((src: string) => host.assets.resolve(src, signed.current), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [W, H] = SIZES[design.size];

  // Signed picture links last one hour: they are renewed after 45 minutes, before any redraw or export.
  const signedAt = useRef(Date.now());
  const signFor = async (d: Design) => {
    if (Date.now() - signedAt.current > (host.assets.renewAfterMs ?? 45 * 60_000)) { signed.current = {}; signedAt.current = Date.now(); }
    const keys = new Set<string>();
    const walk = (os: Obj[]) => os.forEach((o) => { if (typeof o.src === "string" && o.src.startsWith("studio:") && !signed.current[o.src]) keys.add(o.src); if (Array.isArray(o.objects)) walk(o.objects); });
    walk(d.objects);
    if (keys.size) Object.assign(signed.current, await host.assets.sign([...keys]).catch(() => ({})));
  };

  // Redraws run one after another, so a slow one never paints over a newer choice.
  const drawing = useRef<Promise<void>>(Promise.resolve());
  const apply = useCallback((d: Design, opts: { history?: boolean; save?: boolean } = {}) => {
    const run = drawing.current.then(async () => {
      const c = cv.current;
      if (!c) return;
      quiet.current = true;
      base.current = { ...d };
      try {
        await signFor(d);
        await drawDesign(c, d, resolve);
      } finally {
        quiet.current = false;
      }
      setDesign(d);
      setSel(null);
      if (opts.history !== false) setHist((h) => record(h, JSON.stringify(d)));
      if (opts.save !== false) scheduleSave(d);
    });
    drawing.current = run.catch(() => {});
    return run;
  }, [resolve]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = useCallback(() => (cv.current ? readDesign(cv.current, base.current) : base.current), []);

  // Autosave: one save at a time and the newest version always last, so an older one can never land after it.
  const pending = useRef<Design | null>(null);
  const flushing = useRef<Promise<void> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function flush(): Promise<void> {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    if (flushing.current) return flushing.current;
    const job = (async () => {
      while (pending.current) {
        const d = pending.current;
        pending.current = null;
        try {
          await signFor(d);
          const thumb = await renderThumb(d, resolve).catch(() => null);
          const title = nameRef.current || s("name_default");
          if (idRef.current) await host.designs.save(idRef.current, title, d, thumb);
          else {
            const r = await host.designs.create(title, d, thumb);
            idRef.current = r.id;
            host.address.set("d", r.id);
          }
        } catch (e: any) {
          const code = Number(e?.status ?? 0);
          if (e?.quota) {
            pending.current ??= d;
            setStatus("rejected");
            notify.error(s("save_storage_full"));
            return;
          }
          if (code >= 400 && code < 500 && code !== 408 && code !== 429) {
            // The server refused this version (too long, plan limit): retrying cannot help, so say why and stop.
            pending.current ??= d;
            setStatus("rejected");
            notify.error(code === 403 ? s("save_quota") : s("save_invalid"));
            return;
          }
          pending.current ??= d;
          setStatus("failed");
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => void flush(), 8000);
          return;
        }
      }
      setStatus("saved");
    })().finally(() => { flushing.current = null; });
    flushing.current = job;
    return job;
  }
  function scheduleSave(d: Design) {
    setStatus("saving");
    pending.current = d;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush(), 1800);
  }
  const leaveArmed = useRef(false);
  async function leave() {
    if (leaveArmed.current) { onBack(); return; }
    if (saveTimer.current || flushing.current || (pending.current && status !== "rejected")) await flush();
    if (pending.current) { leaveArmed.current = true; notify.error(s("leave_again")); setTimeout(() => { leaveArmed.current = false; }, 10_000); return; }
    onBack();
  }

  const changed = useCallback(() => {
    if (quiet.current) return;
    const d = current();
    setDesign(d);
    setHist((h) => record(h, JSON.stringify(d)));
    scheduleSave(d);
    bump((n) => n + 1);
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas life ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasEl.current) return;
    const c = new Canvas(canvasEl.current, { preserveObjectStacking: true, selectionColor: "rgba(15,123,83,0.08)", selectionBorderColor: "#0F7B53", enableRetinaScaling: true });
    cv.current = c;
    c.on("object:modified", (e: any) => {
      const t = e?.target;
      // Resizing a picture by hand gives it a new box; moving keeps the box.
      const scaled = /scale/i.test(String(e?.action ?? e?.transform?.action ?? ""));
      if (t instanceof FabricImage && scaled) (t as any).meta = { ...(t as any).meta, box: { w: t.width * t.scaleX, h: t.height * t.scaleY } };
      // Resized together with others: the box is re-read from the picture's real size on the canvas.
      if (t instanceof ActiveSelection && scaled) t.getObjects().forEach((x) => { if (x instanceof FabricImage) { const { box: _b, ...m } = (x as any).meta ?? {}; (x as any).meta = m; } });
      changed();
    });
    c.on("selection:created", () => setSel(c.getActiveObject() ?? null));
    c.on("selection:updated", () => setSel(c.getActiveObject() ?? null));
    c.on("selection:cleared", () => setSel(null));
    c.on("object:moving", (e) => setGuides(snap(e.target, base.current.size, 10 / c.getZoom())));
    c.on("mouse:up", () => setGuides([]));
    // Double-tap on the empty photo frame opens the picture picker.
    c.on("mouse:dblclick", (e: any) => { const t = e?.target; if (t instanceof FabricImage && (t as any).meta?.src === PHOTO_PLACEHOLDER) photoInput.current?.click(); });
    c.on("text:editing:entered", () => { const t = c.getActiveObject(); if (t instanceof Textbox) { t.selectAll(); c.requestRenderAll(); } });
    // Draw the design at once (never a white canvas on a slow connection), then re-measure the text when the fonts arrive.
    void apply(initial, { history: true, save: false });
    void loadDesignFonts().catch(() => {}).then(() => { if (cv.current) refreshText(cv.current); });
    try { if (window.localStorage.getItem(TOUR_KEY) !== "1") setTour(0); } catch {}
    return () => { c.dispose(); cv.current = null; if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = stage.current;
    if (!el || !cv.current) return;
    const fit = () => { if (fitted && cv.current) { const pad = parseFloat(getComputedStyle(el).paddingBottom) || 0; const z = fitZoom(design.size, el.clientWidth, el.clientHeight - pad); setZoom(z); applyZoom(cv.current, design.size, z); } };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [design.size, fitted]);
  useEffect(() => { if (cv.current) applyZoom(cv.current, design.size, zoom); }, [zoom, design.size]);

  // Pinch to zoom (two fingers), and ctrl/cmd + wheel.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let start = 0, z0 = 0;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const down = (e: PointerEvent) => { if (e.pointerType !== "touch") return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { start = dist(); z0 = zoom; } };
    const move = (e: PointerEvent) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2 && start) { setFitted(false); setZoom(Math.min(3, Math.max(0.1, (z0 * dist()) / start))); } };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) start = 0; };
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setFitted(false); setZoom((z) => Math.min(3, Math.max(0.1, z * (e.deltaY < 0 ? 1.1 : 0.9)))); };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("wheel", wheel, { passive: false });
    return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("wheel", wheel); };
  }, [zoom]);

  // Keyboard shortcuts.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const c = cv.current;
      if (!c || (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]") || (c.getActiveObject() as any)?.isEditing) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); }
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); void duplicate(); }
      else if (mod && e.key.toLowerCase() === "g") { e.preventDefault(); e.shiftKey ? ungroup() : group(); }
      else if (e.key === "Delete" || e.key === "Backspace") { if (c.getActiveObject()) { e.preventDefault(); remove(); } }
      else if (e.key.startsWith("Arrow") && c.getActiveObject()) {
        e.preventDefault();
        const o = c.getActiveObject()!; const step = e.shiftKey ? 10 : 1;
        o.set({ left: (o.left ?? 0) + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0), top: (o.top ?? 0) + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0) });
        o.setCoords(); c.requestRenderAll(); changed();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (status !== "saved") e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function doUndo() { const r = undo(hist, JSON.stringify(current())); if (r.snapshot) { setHist(r.h); void apply(JSON.parse(r.snapshot), { history: false }); } }
  function doRedo() { const r = redo(hist, JSON.stringify(current())); if (r.snapshot) { setHist(r.h); void apply(JSON.parse(r.snapshot), { history: false }); } }
  async function addMany(os: Obj[]) {
    const c = cv.current; if (!c) return;
    await signFor({ ...base.current, objects: os });
    const made = (await Promise.all(os.map((o) => makeObject(o, resolve)))).filter(Boolean) as FabricObject[];
    made.forEach((f) => c.add(f)); c.setActiveObject(made[made.length - 1]); c.requestRenderAll(); changed(); setSheet(false);
  }
  async function add(o: Obj) {
    const c = cv.current; if (!c) return;
    await signFor({ ...base.current, objects: [o] });
    const f = await makeObject(o, resolve); if (!f) return;
    c.add(f); c.setActiveObject(f); c.requestRenderAll(); changed(); setSheet(false);
  }
  function remove() {
    const c = cv.current; const o = c?.getActiveObject(); if (!c || !o) return;
    (o instanceof ActiveSelection ? o.getObjects() : [o]).forEach((x) => c.remove(x));
    c.discardActiveObject(); c.requestRenderAll(); changed();
  }
  async function duplicate() {
    const c = cv.current; const o = c?.getActiveObject(); if (!c || !o || o instanceof ActiveSelection) return;
    const copy = await makeObject({ ...((await import("./canvas")).readObject(o)), left: (o.left ?? 0) + 30, top: (o.top ?? 0) + 30 }, resolve);
    if (copy) { c.add(copy); c.setActiveObject(copy); c.requestRenderAll(); changed(); }
  }
  function group() {
    const c = cv.current; const o = c?.getActiveObject(); if (!c || !(o instanceof ActiveSelection)) return;
    const items = o.getObjects(); c.discardActiveObject(); items.forEach((x) => c.remove(x));
    const g = new Group(items); (g as any).meta = { type: "group" }; c.add(g); c.setActiveObject(g); c.requestRenderAll(); changed();
  }
  function ungroup() {
    const c = cv.current; const o = c?.getActiveObject(); if (!c || !(o instanceof Group) || o instanceof ActiveSelection) return;
    const items = o.removeAll(); c.remove(o); items.forEach((x) => { (x as any).meta ??= { type: x.type === "textbox" ? "textbox" : x.type }; c.add(x); });
    c.requestRenderAll(); changed();
  }
  const setProp = (props: Record<string, unknown>) => { const o = cv.current?.getActiveObject(); if (!o) return; o.set(props as any); o.setCoords(); cv.current!.requestRenderAll(); changed(); };
  const setMeta = (m: Record<string, unknown>) => { const o = cv.current?.getActiveObject() as any; if (!o) return; o.meta = { ...(o.meta ?? {}), ...m }; changed(); };
  function order(dir: 1 | -1) { const c = cv.current; const o = c?.getActiveObject(); if (!c || !o) return; dir > 0 ? c.bringObjectForward(o) : c.sendObjectBackwards(o); c.requestRenderAll(); changed(); }
  function toggleLock(o: FabricObject) { const m = (o as any).meta ?? {}; const locked = !m.locked; (o as any).meta = { ...m, locked }; o.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked, hasControls: !locked }); changed(); }
  function toggleVisible(o: FabricObject) { o.set({ visible: !o.visible }); cv.current?.requestRenderAll(); changed(); }

  const warnings = useMemo(() => [...readabilityWarnings(design), ...placementWarnings(design)], [design]);
  const fixAll = () => void apply(autoFix(current()));

  async function changeSize(to: SizeId) {
    if (to === design.size) return;
    setFitted(true); setShowSafe(to === "story");
    await apply(convertSize(current(), to, brand, product, lang));
  }
  async function useProduct(p: StudioProduct) { setProduct(p); await apply(syncBindings(current(), p, lang)); }
  async function useTemplate(tid: TemplateId) { await apply(buildDesign(tid, design.size, brand, product, lang) as Design); }
  async function applyBrand() {
    const d = current();
    await apply({ ...d, background: `linear:${brand.primary},${d.background.startsWith("linear:") ? d.background.split(",")[1] : brand.primary}`, objects: d.objects.map((o) => (o.role === "cta" || o.role === "badge") && Array.isArray(o.objects) ? { ...o, objects: o.objects.map((c: Obj, i: number) => (i === 0 ? { ...c, fill: o.role === "badge" ? brand.accent : c.fill } : c)) } : o.type === "textbox" ? { ...o, fontFamily: brand.font } : o) });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const fileName = (size: SizeId, ext: string) => `${(name || "design").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}-${size}.${ext}`;
  const save = (blob: Blob, n: string) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = n; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); };
  async function run(task: () => Promise<void>) { setWorking(true); try { await task(); } catch { notify.error(s("ex_failed")); } finally { setWorking(false); } }
  const exportAs = (format: "png" | "jpeg") => run(async () => { await signFor(current()); save(await exportDesign(current(), resolve, format), fileName(design.size, format === "png" ? "png" : "jpg")); notify.success(s("ex_downloaded")); });
  const exportAll = () => run(async () => { await signFor(current()); for (const size of ["square", "portrait", "story"] as SizeId[]) save(await exportDesign(convertSize(current(), size, brand, product, lang), resolve, "jpeg"), fileName(size, "jpg")); });
  const toProduct = () => run(async () => {
    if (!product.id || usesSample) throw new Error("no product");
    await signFor(current());
    const blob = await exportDesign(current(), resolve, "jpeg");
    if (!host.exports?.toProduct) throw new Error("no product target");
    await host.exports.toProduct(product.id, new File([blob], fileName(design.size, "jpg"), { type: "image/jpeg" }), product.name);
    notify.success(s("ex_product_done"));
  });
  const toLanding = () => run(async () => {
    const blob = await exportDesign(current(), resolve, "jpeg");
    if (!host.exports?.toLanding) throw new Error("no landing target");
    const url = await host.exports.toLanding(new File([blob], fileName(design.size, "jpg"), { type: "image/jpeg" }));
    try { await navigator.clipboard.writeText(url); } catch {}
    notify.success(s("ex_landing_done"));
  });
  const share = () => run(async () => {
    await signFor(current());
    const file = new File([await exportDesign(current(), resolve, "jpeg")], fileName(design.size, "jpg"), { type: "image/jpeg" });
    const text = `${product.name} — ${money(product.price, lang)}`;
    if ((navigator as any).canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
    else { save(file, file.name); notify.success(s("wa_hint")); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); }
  });
  const downloadMain = () => run(async () => { await signFor(current()); save(await exportDesign(current(), resolve, "png"), fileName(design.size, "png")); notify.success(s("ex_downloaded")); setExportOpen(false); });
  const usesPlaceholder = useMemo(() => { const walk = (os: Obj[]): boolean => os.some((o) => o.src === PHOTO_PLACEHOLDER || (Array.isArray(o.objects) && walk(o.objects))); return walk(design.objects); }, [design]);
  const usesSample = useMemo(() => { const walk = (os: Obj[]): boolean => os.some((o) => (typeof o.src === "string" && o.src.startsWith("/studio/samples/")) || (Array.isArray(o.objects) && walk(o.objects))); return walk(design.objects); }, [design]);
  async function putOwnPhoto(file: File) {
    await run(async () => {
      let up: { key: string; url: string };
      try { up = await host.assets.upload(file); }
      catch (e: any) { notify.error(e?.status === 413 || e?.status === 422 ? s("photo_too_big") : s("photo_wrong_type")); return; }
      signed.current[up.key] = up.url;
      const d = current();
      const swap = (os: Obj[]): Obj[] => os.map((o) => (typeof o.src === "string" && o.src.startsWith("/studio/samples/") ? { ...unlink(o), src: up.key } : Array.isArray(o.objects) ? { ...o, objects: swap(o.objects) } : o));
      await apply({ ...d, objects: swap(d.objects) });
    });
  }
  async function openPreview() { setPreview(await renderThumb(current(), resolve, 540)); }

  // ── Panels ────────────────────────────────────────────────────────────────
  const panel = (() => {
    switch (tab) {
      case "templates": return <TemplatesPanel size={design.size} brand={brand} product={product} lang={lang} resolve={resolve} onPick={(t) => void useTemplate(t)} />;
      case "uploads": return <UploadsPanel onUse={(key, url) => { signed.current[key] = url; void add({ type: "image", src: key, left: W * 0.25, top: H * 0.25, width: W * 0.5, height: W * 0.5 }); }} />;
      case "products": return (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">{s("products_hint")}</p>
          {products.map((p) => (
            <button key={p.id ?? "sample"} type="button" onClick={() => void useProduct(p)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-2 text-start ${product.id === p.id ? "border-brand bg-brand/5" : "border-border"}`}>
              <img src={resolve(p.image)} alt="" className="size-12 rounded-lg object-cover" crossOrigin="anonymous" />
              <span className="grid flex-1"><b className="line-clamp-1 text-[0.9375rem]">{p.name}</b><span className="text-sm text-muted-foreground">{money(p.price, lang)}</span></span>
            </button>
          ))}
        </div>
      );
      case "text": return (
        <div className="grid gap-2">
          <Button type="button" className="min-h-12 justify-start text-lg font-black" onClick={() => void add({ type: "textbox", text: s("heading_text"), left: W * 0.1, top: H * 0.1, width: W * 0.8, fontFamily: brand.font, fontWeight: 900, fontSize: Math.round(W * 0.075), fill: "#ffffff", textAlign: lang === "ar" ? "right" : "left", direction: lang === "ar" ? "rtl" : "ltr" })}>{s("add_heading")}</Button>
          <Button type="button" variant="outline" className="min-h-12 justify-start" onClick={() => void add({ type: "textbox", text: s("body_text"), left: W * 0.1, top: H * 0.3, width: W * 0.8, fontFamily: brand.font, fontWeight: 700, fontSize: Math.round(W * 0.045), fill: "#ffffff", textAlign: lang === "ar" ? "right" : "left", direction: lang === "ar" ? "rtl" : "ltr" })}>{s("add_body")}</Button>
          <Button type="button" variant="outline" className="min-h-12 justify-start" onClick={() => void add({ type: "textbox", role: "price", bind: "price", text: money(product.price, lang), left: W * 0.1, top: H * 0.7, width: W * 0.6, fontFamily: brand.font, fontWeight: 900, fontSize: Math.round(W * 0.09), fill: "#ffffff", textAlign: lang === "ar" ? "right" : "left", direction: lang === "ar" ? "rtl" : "ltr" })}><Link2 className="size-4" aria-hidden /> {s("add_price")}</Button>
          <p className="mt-2 font-bold">{s("combos")}</p>
          <div className="grid gap-2" data-studio-combos>
            {TEXT_COMBOS.map((c) => (
              <button key={c.id} type="button" className={`grid gap-0.5 rounded-xl border border-border p-3 text-start ${c.look === "light" ? "bg-card" : ""}`} style={c.look === "light" ? undefined : { background: c.look === "dark" ? "#111827" : brand.primary, color: "#fff" }}
                onClick={() => void addMany(comboObjects(c, brand, lang, money(product.price, lang), W, H))} data-combo={c.id}>
                <b className="text-lg leading-tight" style={{ fontFamily: c.font }}>{c.headline[lang]}</b>
                <span className="text-sm opacity-80">{c.line[lang]}</span>
              </button>
            ))}
          </div>
        </div>
      );
      case "elements": return (
        <div className="grid gap-3">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input type="search" value={elQuery} onChange={(e) => setElQuery(e.currentTarget.value)} placeholder={s("el_search")} aria-label={s("el_search")} className="min-w-0 flex-1 bg-transparent text-base outline-none" data-studio-el-search />
          </label>
          <p className="font-bold">{s("stickers")} <span className="text-xs font-normal text-muted-foreground">({stickers.length})</span></p>
          <div className="flex flex-wrap gap-2" data-studio-stickers>
            {stickers.map((st) => {
              const look = st.tone === "accent" ? { background: brand.accent, color: "#1f1300" } : st.tone === "red" ? { background: "#dc2626", color: "#fff" } : st.tone === "dark" ? { background: "#111827", color: "#fff" } : st.tone === "light" ? { background: "#fff", color: brand.primary, border: `2px solid ${brand.primary}` } : { background: brand.primary, color: "#fff" };
              const shape = st.style === "seal" ? "rounded-full aspect-square px-2" : st.style === "pill" ? "rounded-full px-4" : st.style === "ribbon" ? "-rotate-3 px-4" : "rounded-lg px-4";
              return <button key={st.id} type="button" className={`min-h-11 text-sm font-black ${shape}`} style={st.style === "outline" ? { background: "#fff", color: look.background as string, border: `2px solid ${look.background}` } : look} onClick={() => void add(stickerObject(st, brand, lang, W, H))} data-sticker={st.id}>{st.text[lang]}</button>;
            })}
            {!stickers.length && <p className="text-sm text-muted-foreground">{s("el_none")}</p>}
          </div>
          <p className="font-bold">{s("shapes")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void add({ type: "rect", left: W * 0.3, top: H * 0.3, width: W * 0.4, height: W * 0.25, rx: 16, ry: 16, fill: brand.primary })}>{s("shape_rect")}</Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void add({ type: "circle", left: W * 0.35, top: H * 0.3, radius: W * 0.15, fill: brand.accent })}>{s("shape_circle")}</Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void add({ type: "rect", left: W * 0.07, top: H * 0.45, width: W * 0.86, height: W * 0.09, rx: W * 0.045, ry: W * 0.045, fill: "rgba(0,0,0,0.45)" })}>{s("shape_pill")}</Button>
          </div>
        </div>
      );
      case "background": return (
        <div className="grid gap-3">
          <p className="font-bold">{s("bg_brand")}</p>
          <div className="flex flex-wrap gap-2">{[brand.primary, brand.accent, `linear:${brand.primary},#0a2e20`].map((c) => <Swatch key={c} c={c} on={() => void apply({ ...current(), background: c })} />)}</div>
          <p className="font-bold">{s("bg_gradients")}</p>
          <div className="flex flex-wrap gap-2">{GRADIENTS.map((g) => <Swatch key={g} c={`linear:${g}`} on={() => void apply({ ...current(), background: `linear:${g}` })} />)}</div>
          <p className="font-bold">{s("bg_colors")}</p>
          <div className="flex flex-wrap gap-2">{COLORS.map((c) => <Swatch key={c} c={c} on={() => void apply({ ...current(), background: c })} />)}</div>
        </div>
      );
      case "brand": return (
        <div className="grid gap-2">
          <Button type="button" className="min-h-12" onClick={() => void applyBrand()}><Palette className="size-4" aria-hidden /> {s("brand_apply")}</Button>
          {brand.logo ? <Button type="button" variant="outline" className="min-h-12" onClick={() => void add({ type: "image", src: brand.logo!, left: W * 0.08, top: H * 0.08, width: W * 0.2, height: W * 0.2, role: "logo" })}><ImagePlus className="size-4" aria-hidden /> {s("brand_logo")}</Button> : <p className="text-sm text-muted-foreground">{s("brand_no_logo")}</p>}
        </div>
      );
      case "cutout": return <CutoutPanel selected={sel} resolve={resolve} onDone={async (key, url) => { signed.current[key] = url; const o = cv.current?.getActiveObject(); if (o instanceof FabricImage) { await o.setSrc(url, { crossOrigin: "anonymous" }); (o as any).meta = { ...(o as any).meta, src: key, bind: undefined }; cv.current!.requestRenderAll(); changed(); } }} />;
      case "ai": return <AiPanel product={product} onApply={(c) => { const d = current(); void apply({ ...d, objects: d.objects.map((o) => o.role === "headline" ? { ...o, text: c.headline } : o.role === "line" && !o.bind && !String(o.text ?? "").startsWith("💵") ? { ...o, text: c.line } : o.role === "cta" && Array.isArray(o.objects) ? { ...o, objects: o.objects.map((x: Obj) => (x.type === "textbox" ? { ...x, text: c.cta } : x)) } : o) }); }} />;
      case "layers": return (
        <ul className="grid gap-1" aria-label={s("rail_layers")}>
          {!cv.current?.getObjects().length && <li className="text-sm text-muted-foreground">{s("empty_layers")}</li>}
          {[...(cv.current?.getObjects() ?? [])].reverse().map((o, i) => (
            <li key={i} className={`flex min-h-11 items-center gap-1 rounded-lg px-2 ${sel === o ? "bg-brand/10" : ""}`}>
              <button type="button" className="min-h-11 flex-1 truncate text-start text-sm font-semibold" title={layerName(o, s)} onClick={() => { cv.current!.setActiveObject(o); cv.current!.requestRenderAll(); setSel(o); }}>{(o as any).meta?.bind && <Link2 className="me-1 inline size-3.5 text-brand" aria-label={s("linked")} />}{layerName(o, s)}</button>
              <button type="button" className="grid size-11 place-items-center" aria-label={o.visible ? s("hide") : s("show")} onClick={() => toggleVisible(o)}>{o.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
              <button type="button" className="grid size-11 place-items-center" aria-label={(o as any).meta?.locked ? s("unlock") : s("lock")} onClick={() => toggleLock(o)}>{(o as any).meta?.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}</button>
            </li>
          ))}
        </ul>
      );
    }
  })();

  const props = sel ? <Properties o={sel} brand={brand} s={s} setProp={setProp} setMeta={setMeta} onDelete={remove} onDuplicate={() => void duplicate()} onOrder={order} onGroup={group} onUngroup={ungroup} onUnlink={() => { const o = cv.current?.getActiveObject() as any; if (o?.meta) { o.meta = unlink(o.meta); changed(); } }} /> : null;
  const safe = safeBox(design.size);
  const statusText = status === "saved" ? s("saved") : status === "saving" ? s("saving") : status === "rejected" ? s("not_saved") : s("save_failed");

  return (
    <div className="fixed inset-0 z-40 grid grid-rows-[auto_1fr] bg-background text-foreground" data-studio-editor>
      <header className="flex min-h-14 items-center gap-2 border-b border-border bg-card px-2 lg:px-3">
        <button type="button" className="grid size-11 place-items-center rounded-lg" onClick={() => void leave()} aria-label={s("back")}><ArrowLeft className="size-5 rtl:rotate-180" /></button>
        <input value={name} maxLength={80} onChange={(e) => setName(e.currentTarget.value)} onBlur={() => scheduleSave(current())} className="min-h-11 w-0 min-w-0 flex-1 truncate rounded-lg bg-transparent px-2 text-base font-bold lg:max-w-xs" aria-label={s("title")} placeholder={s("name_default")} />
        <span className={`text-xs font-bold ${status === "failed" || status === "rejected" ? "inline text-orange-700" : "hidden text-brand sm:inline"}`} role="status" data-studio-status={status}>{statusText}</span>
        <button type="button" className="grid size-11 shrink-0 place-items-center rounded-lg disabled:opacity-40" onClick={doUndo} disabled={!canUndo(hist)} aria-label={s("undo")}><Undo2 className="size-5" /></button>
        <button type="button" className="hidden size-11 place-items-center rounded-lg disabled:opacity-40 sm:grid" onClick={doRedo} disabled={!hist.future.length} aria-label={s("redo")}><Redo2 className="size-5" /></button>
        <div className="hidden items-center overflow-hidden rounded-lg border border-border md:flex" role="radiogroup" aria-label={s("size")}>
          {(["square", "portrait", "story"] as SizeId[]).map((z) => <button key={z} type="button" role="radio" aria-checked={design.size === z} onClick={() => void changeSize(z)} className={`min-h-11 px-3 text-sm font-bold ${design.size === z ? "bg-foreground text-background" : ""}`}>{s(`size_${z}` as never)}</button>)}
        </div>
        <Select wrapperClassName="w-[5.5rem] shrink-0 md:hidden" triggerClassName="h-11! text-sm!" value={design.size} onChange={(e) => void changeSize(e.currentTarget.value as SizeId)} aria-label={s("convert")}>
          {(["square", "portrait", "story"] as SizeId[]).map((z) => <option key={z} value={z}>{z === "square" ? "1:1" : z === "portrait" ? "4:5" : "9:16"}</option>)}
        </Select>
        <button type="button" className="hidden size-11 place-items-center rounded-lg sm:grid" onClick={() => void openPreview()} aria-label={s("preview")}><Expand className="size-5" /></button>
        <Button type="button" className="min-h-11" onClick={() => setExportOpen(true)} data-studio-export><Download className="size-4" aria-hidden /> <span>{s("export")}</span></Button>
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-[4.5rem_19rem_minmax(0,1fr)_17rem]">
        <nav className="hidden flex-col gap-1 border-e border-border bg-card p-1.5 lg:flex" aria-label={s("title")}>
          {tabs.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`grid min-h-14 justify-items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.6875rem] font-bold ${tab === t.id ? "bg-brand/10 text-brand" : "text-muted-foreground"}`} data-studio-tab={t.id}><t.icon className="size-5" aria-hidden />{s(t.key)}</button>)}
        </nav>
        <aside className="hidden min-h-0 overflow-y-auto border-e border-border bg-card p-3 lg:block">{panel}</aside>

        <section className="relative grid h-full min-h-0 w-full min-w-0 place-items-center overflow-auto pb-[5.5rem] lg:pb-0" ref={stage} data-studio-stage style={{ touchAction: "none" }}>
          <div className="relative shadow-xl" style={{ width: W * zoom, height: H * zoom }}>
            <canvas ref={canvasEl} />
            <svg className="pointer-events-none absolute inset-0" width={W * zoom} height={H * zoom} viewBox={`0 0 ${W} ${H}`} aria-hidden>
              {guides.map((g, i) => (g.x !== undefined ? <line key={i} x1={g.x} x2={g.x} y1={0} y2={H} stroke="#ec4899" strokeDasharray="12 8" strokeWidth={3} /> : <line key={i} y1={g.y} y2={g.y} x1={0} x2={W} stroke="#ec4899" strokeDasharray="12 8" strokeWidth={3} />))}
              {showSafe && design.size === "story" && (
                <g fill="rgba(250,204,21,0.18)" stroke="#facc15" strokeDasharray="14 10" strokeWidth={3}>
                  <rect x={0} y={0} width={W} height={H * STORY_SAFE.top} /><rect x={0} y={H * (1 - STORY_SAFE.bottom)} width={W} height={H * STORY_SAFE.bottom} /><rect x={W * (1 - STORY_SAFE.side)} y={H * 0.4} width={W * STORY_SAFE.side} height={H * 0.4} />
                </g>
              )}
              {sel && <rect x={safe.left} y={safe.top} width={safe.right - safe.left} height={safe.bottom - safe.top} fill="none" stroke="rgba(15,123,83,0.35)" strokeDasharray="8 8" strokeWidth={2} />}
            </svg>
          </div>
          {usesSample && (
            <div className="absolute inset-x-2 bottom-[6rem] z-10 mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-950 shadow lg:bottom-16" data-studio-sample>
              <span>{usesPlaceholder ? s("photo_missing_badge") : s("sample_badge")}</span>
              <button type="button" className="min-h-11 rounded-full bg-brand px-4 font-black text-white" onClick={() => photoInput.current?.click()} disabled={working}><ImagePlus className="me-1 inline size-4" aria-hidden />{s("sample_add")}</button>
              <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) void putOwnPhoto(f); }} />
            </div>
          )}
          {warnings.length > 0 && (
            <div role="status" className="absolute inset-x-2 top-2 mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 rounded-2xl border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-950 shadow" data-studio-warning>
              <span>⚠️ {warnings.some((w) => w.kind === "contrast" || w.kind === "over_photo") ? s("warn_contrast") : warnings.some((w) => w.kind === "story_zone") ? s("warn_story") : s("warn_margin")}</span>
              <button type="button" className="min-h-11 rounded-full bg-brand px-4 font-black text-white" onClick={fixAll} data-studio-fix><Wand2 className="me-1 inline size-4" aria-hidden />{s("fix")}</button>
            </div>
          )}
          <div className="absolute bottom-[5.5rem] end-3 flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow lg:bottom-3" data-studio-zoom>
            <button type="button" className="grid size-11 place-items-center" aria-label={s("zoom_out")} onClick={() => { setFitted(false); setZoom((z) => Math.max(0.1, z / 1.2)); }}><Minus className="size-4" /></button>
            <button type="button" className="min-h-11 min-w-14 text-sm font-bold" aria-label="100%" onClick={() => { setFitted(false); setZoom(1); }}>{Math.round(zoom * 100)}%</button>
            <button type="button" className="grid size-11 place-items-center" aria-label={s("zoom_in")} onClick={() => { setFitted(false); setZoom((z) => Math.min(3, z * 1.2)); }}><Plus className="size-4" /></button>
            <button type="button" className="grid size-11 place-items-center" aria-label={s("zoom_fit")} onClick={() => setFitted(true)}><Maximize className="size-4" /></button>
            {design.size === "story" && <button type="button" aria-pressed={showSafe} className={`min-h-11 rounded-lg px-2 text-xs font-bold ${showSafe ? "bg-amber-100" : ""}`} onClick={() => setShowSafe((v) => !v)}>{s("safe_zones")}</button>}
          </div>
          {tour !== null && (
            <div className="absolute inset-x-3 bottom-[6rem] z-[60] mx-auto max-w-sm rounded-2xl bg-foreground p-4 text-background shadow-xl lg:bottom-6" role="dialog" aria-label="tour" data-studio-tour>
              <p className="text-[0.9375rem]">{tour + 1}/4 · {s(`tour_${tour + 1}` as never)}</p>
              <div className="mt-3 flex justify-end"><button type="button" className="min-h-11 rounded-full bg-brand px-4 font-black text-white" onClick={() => { if (tour < 3) setTour(tour + 1); else { setTour(null); try { window.localStorage.setItem(TOUR_KEY, "1"); } catch {} } }}>{tour < 3 ? s("tour_next") : s("tour_done")}</button></div>
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 overflow-y-auto border-s border-border bg-card p-3 lg:block" aria-label={s("props")}>{props ?? <TabsHint s={s} />}</aside>
      </div>

      {/* Phone: bottom toolbar + folding sheets (panel, or the selected element's properties). */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        {(sheet || sel) && (
          <div className="max-h-[48vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]" data-studio-sheet>
            <div className="mb-2 flex items-center"><span className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" /><button type="button" className="grid size-11 place-items-center" aria-label="close" onClick={() => { setSheet(false); cv.current?.discardActiveObject(); cv.current?.requestRenderAll(); setSel(null); }}><X className="size-5" /></button></div>
            {sel ? props : panel}
          </div>
        )}
        <span className="pointer-events-none absolute bottom-0 end-0 z-10 h-16 w-10 bg-gradient-to-l from-card to-transparent rtl:bg-gradient-to-r" aria-hidden />
        <nav className="flex overflow-x-auto border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)]" aria-label={s("title")}>
          {tabs.map((t) => <button key={t.id} type="button" onClick={() => { setTab(t.id); setSheet(true); cv.current?.discardActiveObject(); setSel(null); }} className={`grid min-h-16 min-w-16 flex-1 justify-items-center content-center gap-0.5 text-[0.6875rem] font-bold ${sheet && tab === t.id ? "text-brand" : "text-muted-foreground"}`}><t.icon className="size-5" aria-hidden />{s(t.key)}</button>)}
        </nav>
      </div>

      {preview && <PreviewDialog img={preview} size={design.size} storeName={brand.name ?? ""} onClose={() => setPreview(null)} s={s} />}
      {exportOpen && (
        <Dialog onClose={() => !working && setExportOpen(false)} title={s("export")} description={working ? s("ex_working") : undefined}>
          <div className="grid gap-2" data-studio-export-menu>
            {usesSample && <p role="note" className="rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-950">{usesPlaceholder ? s("photo_missing_export") : s("sample_export")} <button type="button" className="min-h-11 font-black underline" onClick={() => { setExportOpen(false); photoInput.current?.click(); }}>{s("sample_add")}</button></p>}
            <Button type="button" className="min-h-14 justify-center text-base font-black" disabled={working} onClick={() => void downloadMain()} data-studio-download><Download className="size-5" aria-hidden /> {s("ex_download")}</Button>
            <Button type="button" variant="outline" className="min-h-12 justify-start" disabled={working} onClick={() => void share()}><Share2 className="size-4" aria-hidden /> {s("ex_whatsapp")}</Button>
            <Button type="button" variant="outline" className="min-h-12 justify-start sm:hidden" disabled={working} onClick={() => { setExportOpen(false); void openPreview(); }}><Expand className="size-4" aria-hidden /> {s("preview")}</Button>
            <p className="mt-2 text-sm font-bold text-muted-foreground">{s("ex_more")}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-12" disabled={working} onClick={() => void exportAs("png")}>{s("ex_png")}</Button>
              <Button type="button" variant="outline" className="min-h-12" disabled={working} onClick={() => void exportAs("jpeg")}>{s("ex_jpg")}</Button>
            </div>
            <Button type="button" variant="outline" className="min-h-12 justify-start" disabled={working} onClick={() => void exportAll()}><Copy className="size-4" aria-hidden /> {s("ex_all")}</Button>
            {product.id && !usesSample && host.exports?.toProduct && <Button type="button" variant="outline" className="min-h-12 justify-start" disabled={working} onClick={() => void toProduct()}><Package className="size-4" aria-hidden /> {s("ex_product")}</Button>}
            {host.exports?.toLanding && <Button type="button" variant="outline" className="min-h-12 justify-start" disabled={working} onClick={() => void toLanding()}><FileImage className="size-4" aria-hidden /> {s("ex_landing")}</Button>}
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** A layer's name the merchant understands: its text, or what the element is. */
function layerName(o: FabricObject, s: ReturnType<typeof useS>): string {
  if (o instanceof Textbox) return (o.text ?? "").slice(0, 28);
  const role = (o as any).meta?.role as string | undefined;
  if (role && ["cta", "badge", "product", "decor", "logo"].includes(role)) return s(`role_${role}` as never);
  return s(o instanceof FabricImage ? "role_image" : o instanceof Group ? "role_group" : "role_shape");
}

function TabsHint({ s }: { s: ReturnType<typeof useS> }) {
  return <p className="text-sm text-muted-foreground">{s("tour_2")}</p>;
}
function Swatch({ c, on }: { c: string; on: () => void }) {
  const bg = c.startsWith("linear:") ? `linear-gradient(160deg, ${c.slice(7)})` : c;
  return <button type="button" onClick={on} className="size-11 rounded-xl border border-border shadow-sm" style={{ background: bg }} aria-label={c} />;
}

function TemplatesPanel({ size, brand, product, lang, resolve, onPick }: { size: SizeId; brand: Brand; product: ProductInfo; lang: Lang; resolve: (s: string) => string; onPick: (t: TemplateId) => void }) {
  const s = useS();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void (async () => {
      for (const t of TEMPLATE_IDS) {
        const url = await renderThumb(buildDesign(t, size, brand, product, lang) as Design, resolve, 200).catch(() => "");
        if (!alive) return;
        setThumbs((m) => ({ ...m, [`${size}:${t}`]: url }));
      }
    })();
    return () => { alive = false; };
  }, [size, brand, product, lang, resolve]);
  return (
    <div className="grid grid-cols-2 gap-2" data-studio-templates>
      {TEMPLATE_IDS.map((t, i) => (
        <button key={t} type="button" onClick={() => onPick(t)} className="overflow-hidden rounded-xl border border-border bg-muted" style={{ aspectRatio: `${SIZES[size][0]} / ${SIZES[size][1]}` }} aria-label={s("template_n", { n: i + 1 })}>
          {thumbs[`${size}:${t}`] ? <img src={thumbs[`${size}:${t}`]} alt="" className="size-full object-cover" /> : <span className="block size-full animate-pulse bg-muted motion-reduce:animate-none" />}
        </button>
      ))}
    </div>
  );
}

function Properties({ o, brand, s, setProp, setMeta, onDelete, onDuplicate, onOrder, onGroup, onUngroup, onUnlink }: {
  o: FabricObject; brand: Brand; s: ReturnType<typeof useS>; setProp: (p: Record<string, unknown>) => void; setMeta: (m: Record<string, unknown>) => void;
  onDelete: () => void; onDuplicate: () => void; onOrder: (d: 1 | -1) => void; onGroup: () => void; onUngroup: () => void; onUnlink: () => void;
}) {
  const a = o as any;
  const swatches = [brand.primary, brand.accent, "#ffffff", "#111827", "#f6f3ef", "#dc2626"];
  const Colors = ({ value, onPick }: { value: string; onPick: (c: string) => void }) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {swatches.map((c) => <button key={c} type="button" onClick={() => onPick(c)} className={`size-11 rounded-lg border ${value === c ? "ring-2 ring-brand" : "border-border"}`} style={{ background: c }} aria-label={c} />)}
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onPick(e.currentTarget.value)} className="size-11 rounded-lg" aria-label={s("color")} />
    </div>
  );
  return (
    <div className="grid gap-4" data-studio-props>
      {a.meta?.bind && (
        <div className="flex items-center gap-2 rounded-xl bg-brand/10 p-2 text-sm font-bold text-brand" data-studio-linked>
          <Link2 className="size-4" aria-hidden /> {s("linked")}
          <button type="button" className="ms-auto min-h-11 rounded-lg px-2 underline" onClick={onUnlink}><Link2Off className="me-1 inline size-4" aria-hidden />{s("unlink")}</button>
        </div>
      )}
      {o instanceof Textbox && (
        <>
          <label className="grid gap-1 text-sm font-semibold">{s("text_label")}
            <textarea value={a.text ?? ""} maxLength={2000} rows={2} dir="auto" className="min-h-12 rounded-lg border border-border bg-card p-2 text-base" onChange={(e) => setProp({ text: e.currentTarget.value })} onFocus={(e) => e.currentTarget.select()} data-studio-text />
          </label>
          <Field label={s("font")}>
            <Select triggerClassName="h-11! text-base!" aria-label={s("font")} value={designFont(a.fontFamily)} onChange={(e) => setProp({ fontFamily: cssFont(e.currentTarget.value) })}>{FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}</Select>
          </Field>
          <Field label={s("font_size")}><Range value={a.fontSize} min={12} max={240} onChange={(n) => setProp({ fontSize: n })} aria={s("font_size")} /></Field>
          <div className="grid gap-1 text-sm font-semibold">{s("align")}
            <div className="flex gap-1">{([["right", AlignRight], ["center", AlignCenter], ["left", AlignLeft]] as const).map(([al, Ic]) => <button key={al} type="button" aria-pressed={a.textAlign === al} onClick={() => setProp({ textAlign: al })} className={`grid size-11 place-items-center rounded-lg border ${a.textAlign === al ? "border-brand bg-brand/10" : "border-border"}`} aria-label={al}><Ic className="size-4" /></button>)}</div>
          </div>
          <div className="grid gap-1 text-sm font-semibold">{s("color")}<Colors value={a.fill} onPick={(c) => setProp({ fill: c })} /></div>
          <Field label={s("letter")}><Range value={a.charSpacing ?? 0} min={-100} max={800} step={10} onChange={(n) => setProp({ charSpacing: n })} aria={s("letter")} /></Field>
          <Field label={s("line")}><Range value={a.lineHeight ?? 1.2} min={0.6} max={2.5} step={0.05} onChange={(n) => setProp({ lineHeight: n })} aria={s("line")} /></Field>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5" checked={Boolean(a.textBackgroundColor)} onChange={(e) => setProp({ textBackgroundColor: e.currentTarget.checked ? "rgba(0,0,0,0.55)" : "" })} />{s("text_bg")}</label>
        </>
      )}
      {o instanceof FabricImage && (
        <>
          <div className="grid gap-1 text-sm font-semibold">{s("crop")}
            <Range value={a.cropY ?? 0} min={0} max={Math.round((a._element?.naturalHeight ?? a.height) * 0.45)} onChange={(n) => setProp({ cropY: n, height: (a._element?.naturalHeight ?? a.height) - n * 2 })} aria={s("crop_top")} />
            <Range value={a.cropX ?? 0} min={0} max={Math.round((a._element?.naturalWidth ?? a.width) * 0.45)} onChange={(n) => setProp({ cropX: n, width: (a._element?.naturalWidth ?? a.width) - n * 2 })} aria={s("crop_left")} />
          </div>
          <Field label={s("radius")}><Range value={a.meta?.rx ?? 0} min={0} max={300} onChange={(n) => { setMeta({ rx: n || undefined }); setProp({ clipPath: n ? new Rect({ width: a.width, height: a.height, rx: n / (a.scaleX || 1), ry: n / (a.scaleX || 1), originX: "center", originY: "center" }) : undefined }); }} aria={s("radius")} /></Field>
          <div className="grid gap-1 text-sm font-semibold">{s("border")}<Colors value={a.stroke ?? ""} onPick={(c) => setProp({ stroke: c, strokeWidth: a.strokeWidth || 8 })} /></div>
          <Field label={s("border_width")}><Range value={a.strokeWidth ?? 0} min={0} max={60} onChange={(n) => setProp({ strokeWidth: n })} aria={s("border_width")} /></Field>
        </>
      )}
      {(o instanceof Rect || o.type === "circle") && (
        <>
          <div className="grid gap-1 text-sm font-semibold">{s("fill")}<Colors value={a.fill} onPick={(c) => setProp({ fill: c })} /></div>
          <div className="grid gap-1 text-sm font-semibold">{s("border")}<Colors value={a.stroke ?? ""} onPick={(c) => setProp({ stroke: c, strokeWidth: a.strokeWidth || 6 })} /></div>
          {o instanceof Rect && <Field label={s("radius")}><Range value={a.rx ?? 0} min={0} max={300} onChange={(n) => setProp({ rx: n, ry: n })} aria={s("radius")} /></Field>}
        </>
      )}
      <Field label={s("opacity")}><Range value={a.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={(n) => setProp({ opacity: n })} aria={s("opacity")} /></Field>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5" checked={Boolean(a.shadow)} onChange={(e) => setProp({ shadow: e.currentTarget.checked ? { color: "rgba(0,0,0,0.35)", blur: 12, offsetX: 0, offsetY: 4 } : null })} />{s("shadow")}</label>
      <div className="flex flex-wrap gap-1">
        <button type="button" className="grid size-11 place-items-center rounded-lg border border-border" onClick={onDuplicate} aria-label={s("duplicate")}><Copy className="size-4" /></button>
        <button type="button" className="grid size-11 place-items-center rounded-lg border border-border" onClick={() => onOrder(1)} aria-label={s("bring_up")}><ArrowUp className="size-4" /></button>
        <button type="button" className="grid size-11 place-items-center rounded-lg border border-border" onClick={() => onOrder(-1)} aria-label={s("send_down")}><ArrowDown className="size-4" /></button>
        {o instanceof ActiveSelection && <button type="button" className="grid size-11 place-items-center rounded-lg border border-border" onClick={onGroup} aria-label={s("group")}><GroupIcon className="size-4" /></button>}
        {o instanceof Group && !(o instanceof ActiveSelection) && <button type="button" className="grid size-11 place-items-center rounded-lg border border-border" onClick={onUngroup} aria-label={s("ungroup")}><Ungroup className="size-4" /></button>}
        <button type="button" className="grid size-11 place-items-center rounded-lg border border-red-300 text-red-700" onClick={onDelete} aria-label={s("delete")}><Trash2 className="size-4" /></button>
      </div>
    </div>
  );
}

function CutoutPanel({ selected, resolve, onDone }: { selected: FabricObject | null; resolve: (s: string) => string; onDone: (key: string, url: string) => Promise<void> }) {
  const s = useS();
  const host = useHost();
  const [stage, setStage] = useState<Stage | "idle" | "edit">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"keep" | "erase">("erase");
  const [brush, setBrush] = useState(18);
  const img = useRef<HTMLImageElement | null>(null);
  const mask = useRef<HTMLCanvasElement | null>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const src = selected instanceof FabricImage ? ((selected as any).meta?.src as string | undefined) : undefined;

  const redraw = () => {
    const v = view.current; if (!v || !img.current || !mask.current) return;
    const ctx = v.getContext("2d")!;
    v.width = 320; v.height = 320;
    ctx.clearRect(0, 0, 320, 320); ctx.drawImage(mask.current, 0, 0, 320, 320);
    ctx.globalCompositeOperation = "source-in"; ctx.drawImage(img.current, 0, 0, 320, 320); ctx.globalCompositeOperation = "source-over";
  };
  async function run() {
    setError(null);
    if (!cutoutSupported()) { setError(s("cutout_unsupported")); return; }
    if (!src) return;
    try {
      const blob = await (await fetch(resolve(src))).blob();
      const el = new Image(); el.crossOrigin = "anonymous"; el.src = URL.createObjectURL(blob); await el.decode(); img.current = el;
      const r = await removeBackground(blob, host.modelUrl, (st) => setStage(st));
      mask.current = maskCanvas(r.mask, r.size);
      setStage("edit");
      requestAnimationFrame(redraw);
    } catch (e) {
      setStage("idle");
      setError(e instanceof Error && e.message === "too_slow" ? s("cutout_slow") : s("cutout_failed"));
    }
  }
  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1 && e.pointerType !== "touch") return;
    const m = mask.current; if (!m) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * m.width, y = ((e.clientY - r.top) / r.height) * m.height;
    const ctx = m.getContext("2d")!;
    ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, brush / 2, 0, Math.PI * 2); ctx.fill();
    redraw();
  }
  async function done() {
    if (!img.current || !mask.current) return;
    try {
      const out = await applyMask(img.current, mask.current);
      const up = await host.assets.upload(out);
      await onDone(up.key, up.url);
      setStage("idle");
    } catch (e: any) {
      setError(e?.status === 503 ? s("cutout_bucket") : s("cutout_failed"));
    }
  }
  if (!src) return <p className="text-sm text-muted-foreground">{s("cutout_pick")}</p>;
  return (
    <div className="grid gap-3" data-studio-cutout>
      {error && <p role="alert" className="rounded-xl bg-orange-50 p-3 text-sm text-orange-950">{error}</p>}
      {stage === "idle" && <Button type="button" className="min-h-12" onClick={() => void run()}><Scissors className="size-4" aria-hidden /> {s("cutout_run")}</Button>}
      {(stage === "model" || stage === "run") && <p role="status" className="text-sm">{stage === "model" ? s("cutout_model") : s("cutout_running")}</p>}
      {stage === "edit" && (
        <>
          <canvas ref={view} className="w-full touch-none rounded-xl border border-border bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)] bg-[length:20px_20px]" onPointerDown={paint} onPointerMove={paint} />
          <div className="flex gap-1" role="radiogroup">
            <button type="button" role="radio" aria-checked={mode === "keep"} onClick={() => setMode("keep")} className={`min-h-11 flex-1 rounded-lg border text-sm font-bold ${mode === "keep" ? "border-brand bg-brand/10" : "border-border"}`}>{s("cutout_keep")}</button>
            <button type="button" role="radio" aria-checked={mode === "erase"} onClick={() => setMode("erase")} className={`min-h-11 flex-1 rounded-lg border text-sm font-bold ${mode === "erase" ? "border-brand bg-brand/10" : "border-border"}`}>{s("cutout_erase")}</button>
          </div>
          <label className="grid gap-1 text-sm font-semibold">{s("cutout_brush")}<input type="range" min={4} max={60} value={brush} onChange={(e) => setBrush(Number(e.currentTarget.value))} className="h-11 accent-brand" /></label>
          <Button type="button" className="min-h-12" onClick={() => void done()}>{s("cutout_done")}</Button>
        </>
      )}
    </div>
  );
}

function AiPanel({ product, onApply }: { product: ProductInfo; onApply: (c: { headline: string; line: string; cta: string }) => void }) {
  const s = useS();
  const ai = useHost().ai;
  const [lang, setLang] = useState<"darija" | "ar" | "fr">("darija");
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ headline: string; line: string; cta: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true); setError(null);
    try { if (!ai) throw new Error("no ai"); setRes(await ai.suggest(product.name, lang, offer || undefined)); }
    catch (e: any) { setError(e?.status === 402 ? s("ai_no_points") : s("ai_error")); }
    finally { setBusy(false); }
  }
  return (
    <div className="grid gap-3" data-studio-ai>
      <p className="font-bold">{s("ai_title")}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={s("ai_lang")}>{(["darija", "ar", "fr"] as const).map((l) => <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)} className={`min-h-11 flex-1 rounded-lg border text-sm font-bold ${lang === l ? "border-brand bg-brand/10" : "border-border"}`}>{s(`ai_${l}` as never)}</button>)}</div>
      <label className="grid gap-1 text-sm font-semibold">{s("ai_offer")}<input value={offer} maxLength={120} onChange={(e) => setOffer(e.currentTarget.value)} className="h-11 rounded-lg border border-border px-2 text-base" /></label>
      <Button type="button" className="min-h-12" disabled={busy} onClick={() => void go()}><Sparkles className="size-4" aria-hidden /> {s("ai_go")}</Button>
      {error && <p role="alert" className="rounded-xl bg-orange-50 p-3 text-sm text-orange-950">{error}{error === s("ai_no_points") && ai?.buyUrl && <> · <a className="font-bold underline" href={ai.buyUrl}>{s("ai_buy")}</a></>}</p>}
      {res && (
        <div className="grid gap-1 rounded-xl border border-border p-3 text-[0.9375rem]">
          <b>{res.headline}</b><span>{res.line}</span><span className="font-bold text-brand">{res.cta}</span>
          <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => onApply(res)}>{s("ai_apply")}</Button>
        </div>
      )}
    </div>
  );
}

function PreviewDialog({ img, size, storeName, onClose, s }: { img: string; size: SizeId; storeName: string; onClose: () => void; s: ReturnType<typeof useS> }) {
  return (
    <Dialog onClose={onClose} title={s("pv_title")} description={size === "story" ? s("pv_story") : s("pv_facebook")}>
      {size === "story" ? (
        <div className="relative mx-auto w-64 overflow-hidden rounded-[2rem] border-[8px] border-neutral-900 bg-black" data-studio-preview="story">
          <img src={img} alt="" className="block w-full" />
          <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3 text-xs font-bold text-white"><span className="size-7 rounded-full bg-white/40" />{storeName}<span className="opacity-70">· {s("pv_sponsored")}</span></div>
          <div className="absolute inset-x-0 bottom-0 grid gap-2 p-3"><div className="h-9 rounded-full border border-white/50" /><div className="mx-auto h-1 w-24 rounded-full bg-white/70" /></div>
          <div className="absolute bottom-24 end-2 grid gap-4 text-white">{[Heart, MessageCircle, Send].map((Ic, i) => <span key={i} className="grid size-8 place-items-center rounded-full bg-black/30"><Ic className="size-4" aria-hidden /></span>)}</div>
        </div>
      ) : (
        <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-border bg-white text-neutral-900" data-studio-preview="post">
          <div className="flex items-center gap-2 p-3"><span className="size-9 rounded-full bg-neutral-200" /><span className="grid"><b className="text-sm">{storeName}</b><span className="text-xs text-neutral-500">{s("pv_sponsored")}</span></span></div>
          <img src={img} alt="" className="block w-full" />
          <div className="flex justify-around border-t border-neutral-200 p-2 text-sm font-semibold text-neutral-600"><span>{s("pv_like")}</span><span>{s("pv_comment")}</span><span>{s("pv_share")}</span></div>
        </div>
      )}
    </Dialog>
  );
}

/** «My uploads»: upload (button, drag-and-drop, paste), then tap a picture to put it in the design. */
function UploadsPanel({ onUse }: { onUse: (key: string, url: string) => void }) {
  const s = useS();
  const host = useHost();
  const [items, setItems] = useState<Array<{ key: string; url: string }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(() => { void host.assets.list?.().then((l) => setItems(l)).catch(() => setItems([])); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  async function upload(files: File[]) {
    const pics = files.filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name)).slice(0, 20);
    if (!pics.length) return;
    setBusy(true);
    let failed = 0;
    for (const f of pics) {
      try { const up = await host.assets.upload(f); setItems((all) => [{ key: up.key, url: up.url }, ...(all ?? [])]); }
      catch (e: any) { failed++; host.notify.error(e?.status === 413 || e?.status === 422 ? s("photo_too_big") : e?.status === 503 ? s("cutout_bucket") : s("photo_wrong_type")); }
    }
    setBusy(false);
    if (pics.length - failed > 0) host.notify.success(s("uploads_done"));
  }
  // Paste (⌘V / Ctrl+V) anywhere in the editor while this tab is open.
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]")) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) { e.preventDefault(); void upload(files); }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  });
  async function remove(key: string) {
    if (armed !== key) { setArmed(key); setTimeout(() => setArmed((k) => (k === key ? null : k)), 4000); return; }
    setArmed(null);
    try { await host.assets.remove?.(key); setItems((all) => (all ?? []).filter((x) => x.key !== key)); }
    catch { host.notify.error(s("save_failed")); }
  }
  return (
    <div className={`grid gap-3 rounded-xl ${over ? "outline-2 outline-dashed outline-brand" : ""}`} data-studio-uploads
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void upload([...e.dataTransfer.files]); }}>
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="grid min-h-24 place-items-center gap-1 rounded-2xl border-2 border-dashed border-brand/50 bg-brand/5 p-4 text-center font-black text-brand disabled:opacity-60" data-studio-upload-button>
        <Upload className="size-6" aria-hidden />{busy ? s("uploads_busy") : s("uploads_cta")}
        <span className="text-xs font-semibold text-muted-foreground">{s("uploads_hint")}</span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { const f = [...(e.currentTarget.files ?? [])]; e.currentTarget.value = ""; void upload(f); }} data-studio-upload-input />
      {items === null ? <p className="text-sm text-muted-foreground">…</p> : !items.length ? <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{s("uploads_empty")}</p> : (
        <ul className="grid grid-cols-3 gap-2" data-studio-upload-list>
          {items.map((it) => (
            <li key={it.key} className="relative">
              <button type="button" className="block aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted" onClick={() => onUse(it.key, it.url)} aria-label={s("uploads_use")} data-studio-upload-item>
                <img src={it.url} alt="" loading="lazy" crossOrigin="anonymous" className="size-full object-cover" />
              </button>
              {host.assets.remove && <button type="button" onClick={() => void remove(it.key)} className={`absolute end-1 top-1 grid min-h-8 min-w-8 place-items-center rounded-full px-1.5 text-xs font-bold shadow ${armed === it.key ? "bg-red-600 text-white" : "bg-card"}`} aria-label={s("delete")}>{armed === it.key ? s("uploads_confirm") : <Trash2 className="size-4" />}</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
