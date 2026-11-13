import { describe, expect, it } from "vitest";
import { MAX_OBJECTS, allowedImageSrc, designProblems } from "./design";

const ok = {
  schemaVersion: 1,
  size: "square",
  background: "#0F7B53",
  objects: [
    { type: "textbox", left: 40, top: 300, width: 900, text: "السعر 2,900 دج — توصيل 58 ولاية", fontFamily: "Cairo", fontWeight: 900, fontSize: 64, fill: "#ffffff", direction: "rtl", textAlign: "right", shadow: { color: "rgba(0,0,0,.3)", blur: 6, offsetX: 0, offsetY: 2 } },
    { type: "image", left: 400, top: 200, src: "studio:cutout/abcdef123456.png", scaleX: 0.5, scaleY: 0.5 },
    { type: "group", objects: [{ type: "rect", width: 200, height: 60, rx: 30, fill: "#F59E0D" }, { type: "text", text: "−30%", fontFamily: "Cairo", fill: "#2b1a00" }] },
  ],
};

describe("studio design check", () => {
  it("accepts a normal Arabic ad", () => {
    expect(designProblems(ok)).toBeNull();
  });
  it("refuses SVG, outside links, data: and scripts in image sources", () => {
    for (const src of ["https://evil.example.com/x.png", "data:image/svg+xml;base64,PHN2Zz4=", "javascript:alert(1)", "/images/products/x.svg", "studio:../../etc/passwd.png", "//evil.example.com/a.png"]) {
      expect(allowedImageSrc(src), src).toBe(false);
      expect(designProblems({ ...ok, objects: [{ type: "image", src }] }), src).not.toBeNull();
    }
    expect(allowedImageSrc("/images/products/0a1b2c3d.webp")).toBe(false);
    const host = (src: unknown) => allowedImageSrc(src) || (typeof src === "string" && /^\/images\/products\/[a-z0-9]{8}\.webp$/.test(src));
    const own = { ...ok, objects: [{ type: "image", src: "/images/products/0a1b2c3d.webp" }] };
    expect(designProblems(own)).not.toBeNull();
    expect(designProblems(own, { allowImage: host })).toBeNull();
    expect(designProblems({ ...ok, objects: [{ type: "image", src: "https://evil.example.com/x.png" }] }, { allowImage: host })).not.toBeNull();
  });
  it("accepts a two-colour gradient only", () => {
    expect(designProblems({ ...ok, background: "linear:#0F7B53,#0a4f36" })).toBeNull();
    for (const bg of ["linear:url(x),red", "linear:#fff", "linear:#fff,#000,#123", "linear:red,blue"]) expect(designProblems({ ...ok, background: bg }), bg).not.toBeNull();
  });
  it("refuses element types and properties an attacker could abuse", () => {
    expect(designProblems({ ...ok, objects: [{ type: "svg", src: "x" }] })?.[0].reason).toContain("not allowed");
    expect(designProblems({ ...ok, objects: [{ type: "rect", onclick: "x" }] })?.[0].reason).toBe("unknown property");
    expect(designProblems({ ...ok, objects: [{ type: "rect", fill: "url(javascript:alert(1))" }] })).not.toBeNull();
    expect(designProblems({ ...ok, objects: [{ type: "image", src: "studio:a/abcdefgh.png", filters: [{ type: "Convolute" }] }] })).not.toBeNull();
    expect(designProblems({ ...ok, objects: [{ type: "text", text: "x", fontFamily: "Comic Sans" }] })).not.toBeNull();
  });
  it("limits size, element count and nesting", () => {
    expect(designProblems({ ...ok, objects: Array(MAX_OBJECTS + 1).fill({ type: "rect" }) })).not.toBeNull();
    const deep = (n: number): any => (n === 0 ? { type: "rect" } : { type: "group", objects: [deep(n - 1)] });
    expect(designProblems({ ...ok, objects: [deep(5)] })).not.toBeNull();
    expect(designProblems({ ...ok, objects: [{ type: "text", text: "x".repeat(300_000) }] })?.[0].reason).toContain("larger than");
  });
  it("refuses an unknown version or size, and extra top-level keys", () => {
    expect(designProblems({ ...ok, schemaVersion: 99 })).not.toBeNull();
    expect(designProblems({ ...ok, size: "billboard" })).not.toBeNull();
    expect(designProblems({ ...ok, script: "x" })).not.toBeNull();
    expect(designProblems(null)).not.toBeNull();
  });
});
