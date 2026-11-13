import { useEffect, useMemo, useState } from "react";
import { Copy, LayoutTemplate, Plus, Search, Trash2, Zap } from "lucide-react";
import { SIZES, type SizeId } from "./design";
import { useHost, type DesignRow, type StudioProduct } from "./context";
import { renderThumb } from "./canvas";
import { Editor } from "./Editor";
import { loadDesignFonts } from "./fonts";
import type { Design } from "./model";
import { useS } from "./strings";
import { instantDesigns, type Brand, type Lang } from "./templates";

type Open = { design: Design; id: string | null; name: string };

/** The studio: instant designs from a product (the default start), «My designs», and the editor. Wrap it in <StudioProvider>. */
export function Studio() {
  const s = useS();
  const host = useHost();
  const { Button, PageHeader, Select, Skeleton } = host.ui;
  const notify = host.notify;
  const SAMPLE = host.sample;
  const lang: Lang = host.locale;
  const clearReopen = () => host.address.set("d", null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [product, setProduct] = useState<StudioProduct>(SAMPLE);
  const [size, setSize] = useState<SizeId>("square");
  const [rows, setRows] = useState<DesignRow[] | null>(null);
  const [quota, setQuota] = useState<{ n: number; max: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Open | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"start" | "library">("start");

  async function load() {
    setFailed(false);
    try {
      const [b, ps, lib] = await Promise.all([host.brand(), host.products ? host.products.list().catch(() => []) : Promise.resolve([]), host.designs.list()]);
      setBrand(b);
      const list: StudioProduct[] = ps.filter((p) => p.name);
      const wanted = host.address.get("product");
      if (wanted && !list.some((p) => p.id === wanted)) {
        const one = host.products?.get ? await host.products.get(wanted).catch(() => null) : null;
        if (one?.name) list.unshift(one);
        else notify.error(s("product_missing"));
      }
      setProducts(list.length ? list : [SAMPLE]);
      setProduct(list.find((p) => p.id === wanted) ?? list[0] ?? SAMPLE);
      setRows(lib.designs);
      setQuota(lib.usage && lib.quota ? { n: lib.usage.designs, max: lib.quota.designs } : null);
      if (lib.designs.length && !list.length) setView("library");
      const reopen = host.address.get("d");
      if (reopen && host.designs.isId(reopen)) { try { const d = await host.designs.open(reopen); setOpen({ design: d.doc, id: d.id, name: d.name }); } catch { clearReopen(); } }
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => { void load(); void loadDesignFonts(); }, []);

  const three = useMemo(() => (brand ? instantDesigns(product, brand, lang, size) : []), [brand, product, lang, size]);
  useEffect(() => {
    let alive = true;
    setThumbs([]);
    void (async () => {
      await loadDesignFonts();
      const out: string[] = [];
      for (const d of three) { out.push(await renderThumb(d as Design, (src) => host.assets.resolve(src, {}), 360).catch(() => "")); if (alive) setThumbs([...out]); }
    })();
    return () => { alive = false; };
  }, [three]);

  async function openRow(r: DesignRow) {
    try { const d = await host.designs.open(r.id); setOpen({ design: d.doc, id: d.id, name: d.name }); host.address.set("d", d.id); }
    catch { notify.error(s("design_invalid")); }
  }
  async function dup(r: DesignRow) {
    try { await host.designs.duplicate(r.id, s("lib_copy")); setRows((await host.designs.list()).designs); }
    catch { notify.error(s("save_failed")); }
  }
  function remove(r: DesignRow) {
    setRows((all) => all?.filter((x) => x.id !== r.id) ?? null);
    let undone = false;
    notify.undo(s("lib_deleted"), s("undo"), () => { undone = true; setRows((all) => (all ? [r, ...all] : all)); }, 10_000);
    setTimeout(() => { if (!undone) void host.designs.remove(r.id).catch(() => notify.error(s("save_failed"))); }, 10_200);
  }

  if (failed) return <div role="alert" className="grid justify-items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center"><p className="text-base">{s("load_error")}</p><Button type="button" className="min-h-11" onClick={() => void load()}>{s("retry")}</Button></div>;
  if (!brand || !rows) return <div className="grid gap-3" aria-busy="true"><Skeleton className="h-12 w-1/2" /><div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-square w-full" />)}</div></div>;
  if (open) return <Editor initial={open.design} designId={open.id} name={open.name} brand={brand} products={products} product={product} onBack={() => { clearReopen(); setOpen(null); void host.designs.list().then((l) => setRows(l.designs)).catch(() => {}); }} />;

  const shown = rows.filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="grid gap-5" data-studio-start>
      <PageHeader title={s("title")} subtitle={s("start_sub")} />
      <div role="tablist" className="flex gap-2">
        <button type="button" role="tab" aria-selected={view === "start"} onClick={() => setView("start")} className={`min-h-11 rounded-full border px-4 font-bold ${view === "start" ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}><Zap className="me-1 inline size-4" aria-hidden />{s("instant")}</button>
        <button type="button" role="tab" aria-selected={view === "library"} onClick={() => setView("library")} className={`min-h-11 rounded-full border px-4 font-bold ${view === "library" ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`} data-studio-library>{s("my_designs")} ({rows.length})</button>
      </div>

      {view === "start" ? (
        <section className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">{s("pick_product")}
              <Select triggerClassName="h-12! text-base!" aria-label={s("pick_product")} value={product.id ?? ""} onChange={(e) => setProduct(products.find((p) => (p.id ?? "") === e.currentTarget.value) ?? SAMPLE)} data-studio-product>
                {products.map((p) => <option key={p.id ?? "sample"} value={p.id ?? ""}>{p.id ? p.name : `${p.name} · ${s("sample_product")}`}</option>)}
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">{s("size")}
              <Select triggerClassName="h-12! text-base!" aria-label={s("size")} value={size} onChange={(e) => setSize(e.currentTarget.value as SizeId)}>
                {(["square", "portrait", "story"] as SizeId[]).map((z) => <option key={z} value={z}>{s(`size_${z}` as never)}</option>)}
              </Select>
            </label>
          </div>
          {host.products && !products.some((p) => p.id) && <p className="text-sm text-muted-foreground">{s("no_products")}</p>}
          {product.sample && product.id && <p role="note" className="rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-950" data-studio-sample-note>{s("sample_start")}</p>}
          <div className="grid gap-3 sm:grid-cols-3" data-studio-instant>
            {three.map((d, i) => (
              <button key={i} type="button" onClick={() => setOpen({ design: d as Design, id: null, name: `${product.name}` })} className="group grid gap-2 rounded-2xl border border-border bg-card p-2 text-start hover:border-brand focus-visible:outline-2 focus-visible:outline-brand">
                <span className="block overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: `${SIZES[size][0]} / ${SIZES[size][1]}` }}>{thumbs[i] ? <img src={thumbs[i]} alt="" className="size-full object-cover" /> : <span className="block size-full animate-pulse bg-muted motion-reduce:animate-none" />}</span>
                <span className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-brand font-bold text-white"><LayoutTemplate className="size-4" aria-hidden />{s("open_this")}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen({ design: { schemaVersion: 1, size, background: "#ffffff", objects: [] }, id: null, name: s("name_default") })}><Plus className="size-4" aria-hidden /> {s("blank")}</Button>
          </div>
        </section>
      ) : (
        <section className="grid gap-3" data-studio-designs>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-12 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3"><Search className="size-4" aria-hidden /><input value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder={s("lib_search")} aria-label={s("lib_search")} className="min-w-0 flex-1 bg-transparent text-base outline-none" /></label>
            {quota && <span className="text-sm text-muted-foreground">{s("lib_quota", { n: quota.n, max: quota.max })}</span>}
          </div>
          {!shown.length ? <p className="rounded-2xl border border-dashed border-border p-6 text-center text-base text-muted-foreground">{s("lib_empty")}</p> : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shown.map((r) => (
                <li key={r.id} className="grid gap-1 rounded-2xl border border-border bg-card p-2">
                  <button type="button" onClick={() => void openRow(r)} className="overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "1" }}>{r.thumb ? <img src={r.thumb} alt="" className="size-full object-cover" /> : null}</button>
                  <b className="line-clamp-1 text-sm">{r.name}</b>
                  {r.cleanupWarnedAt && <span className="text-xs text-orange-800">{s("lib_warned")}</span>}
                  <div className="flex gap-1">
                    <button type="button" className="grid size-11 place-items-center rounded-lg border border-border" onClick={() => void dup(r)} aria-label={s("duplicate")}><Copy className="size-4" /></button>
                    <button type="button" className="grid size-11 place-items-center rounded-lg border border-red-300 text-red-700" onClick={() => remove(r)} aria-label={s("delete")}><Trash2 className="size-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
