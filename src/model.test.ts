import { describe, expect, it } from "vitest";
import { designProblems } from "./design";
import { autoFix, contrastRatio, convertSize, placementWarnings, readabilityWarnings, record, redo, canUndo, syncBindings, undo, unlink, type Design } from "./model";
import { TEMPLATE_IDS, buildDesign, instantDesigns, safeBox } from "./templates";

const brand = { primary: "#0F7B53", accent: "#F59E0D", font: "Cairo" };
const product = { name: "عباية مطرزة", price: 4900, compareAtPrice: 5900, image: "/studio/samples/abaya.webp" };

describe("templates", () => {
  it("all 15 templates, in the 3 sizes and 3 languages, are valid designs that raise no warning", () => {
    expect(TEMPLATE_IDS).toHaveLength(15);
    for (const id of TEMPLATE_IDS) for (const size of ["square", "portrait", "story"] as const) for (const lang of ["ar", "fr", "en"] as const) {
      const d = buildDesign(id, size, brand, product, lang) as Design;
      expect(designProblems(d), `${id} ${size} ${lang}`).toBeNull();
      expect(readabilityWarnings(d), `${id} ${size} ${lang} readability`).toEqual([]);
      expect(placementWarnings(d), `${id} ${size} ${lang} placement`).toEqual([]);
    }
  });
  it("text never touches the edge: 7 % margin, and story text stays out of the apps' button zones", () => {
    const sq = safeBox("square");
    expect(sq.left).toBe(Math.round(1080 * 0.07));
    const st = safeBox("story");
    expect(st.top).toBeGreaterThan(1920 * 0.12);
    expect(st.bottom).toBeLessThan(1920 * 0.81);
  });
  it("instant designs: 3, with the product's photo, name and price, a sale look first when there is an old price", () => {
    const three = instantDesigns(product, brand, "ar");
    expect(three).toHaveLength(3);
    expect(three[0].templateId).toBe("sale");
    expect(JSON.stringify(three[0])).toContain("4,900 دج");
    expect(three.every((d) => d.objects.some((o: any) => o.bind === "image" && o.src === product.image))).toBe(true);
  });
});

describe("contrast and margins", () => {
  it("measures contrast like WCAG", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffff00")!).toBeLessThan(1.2);
  });
  it("warns about white text on a light background and on a photo, and «fix it» clears both", () => {
    const d: Design = { schemaVersion: 1, size: "square", background: "#fef9c3", objects: [
      { type: "image", src: "/studio/samples/abaya.webp", left: 100, top: 100, width: 800, height: 800 },
      { type: "textbox", text: "عرض", left: 200, top: 300, width: 400, fill: "#ffffff", fontSize: 60 },
      { type: "textbox", text: "حافة", left: 5, top: 950, width: 300, fill: "#ffffff", fontSize: 60 },
    ] };
    expect(readabilityWarnings(d).map((w) => w.kind)).toEqual(["over_photo", "contrast"]);
    expect(placementWarnings(d).map((w) => w.index)).toEqual([2]);
    const fixed = autoFix(d);
    expect(readabilityWarnings(fixed)).toEqual([]);
    expect(placementWarnings(fixed)).toEqual([]);
    expect(designProblems(fixed)).toBeNull();
  });
});

describe("size change and product links", () => {
  it("rebuilds a template for 9:16 and keeps the merchant's edited headline", () => {
    const d = buildDesign("offer", "square", brand, product, "ar") as Design;
    d.objects = d.objects.map((o) => (o.role === "headline" ? { ...o, text: "عرض العيد" } : o));
    const story = convertSize(d, "story", brand, product, "ar");
    expect(story.size).toBe("story");
    expect(story.objects.find((o) => o.role === "headline")?.text).toBe("عرض العيد");
    expect(placementWarnings(story)).toEqual([]);
  });
  it("keeps the merchant's own photo, added elements and deletions when the size changes", () => {
    const d = buildDesign("offer", "square", brand, product, "ar") as Design;
    const own = { ...d, objects: d.objects.filter((o) => o.role !== "badge").map((o) => (o.bind === "image" ? { ...unlink(o), src: "studio:studio/abcdef1234567890.png", scaleX: 0.4, scaleY: 0.4 } : o)) };
    own.objects.push({ type: "textbox", text: "شعاري", left: 100, top: 100, width: 300 });
    const story = convertSize(own, "story", brand, product, "ar");
    const photo = story.objects.find((o) => o.src === "studio:studio/abcdef1234567890.png");
    expect(photo?.bind).toBeUndefined();
    expect(photo?.scaleX).toBeUndefined();
    expect(story.objects.some((o) => o.text === "شعاري")).toBe(true);
    expect(story.objects.some((o) => o.role === "badge")).toBe(false);
    expect(story.objects).toHaveLength(own.objects.length);
  });
  it("linked price and name follow the product; an unlinked one stays", () => {
    const d = buildDesign("sale", "square", brand, product, "ar") as Design;
    const after = syncBindings(d, { ...product, price: 3900, compareAtPrice: null }, "ar");
    expect(after.objects.find((o) => o.bind === "price")?.text).toBe("3,900 دج");
    expect(after.objects.find((o) => o.bind === "compareAtPrice")?.visible).toBe(false);
    const free = { ...d, objects: d.objects.map((o) => (o.bind === "name" ? unlink({ ...o, text: "اسمي الخاص" }) : o)) };
    expect(syncBindings(free, { ...product, name: "آخر" }, "ar").objects.find((o) => o.text === "اسمي الخاص")).toBeTruthy();
  });
});

describe("history", () => {
  it("undo and redo up to 50 steps", () => {
    let h = { past: [] as string[], future: [] as string[] };
    for (let i = 0; i < 60; i++) h = record(h, `s${i}`);
    expect(h.past).toHaveLength(50);
    const u = undo(h, "s59");
    expect(u.snapshot).toBe("s58");
    const r = redo(u.h, "s58");
    expect(r.snapshot).toBe("s59");
  });
  it("undo, edit, undo lands on the step before the edit (none skipped)", () => {
    let h = { past: [] as string[], future: [] as string[] };
    for (const s of ["A", "B", "C"]) h = record(h, s);
    const u1 = undo(h, "C");
    expect(u1.snapshot).toBe("B");
    const edited = record(u1.h, "D");
    const u2 = undo(edited, "D");
    expect(u2.snapshot).toBe("B");
    expect(undo(u2.h, "B").snapshot).toBe("A");
    expect(canUndo(record({ past: [], future: [] }, "A"))).toBe(false);
  });
});
