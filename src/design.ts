/**
 * TaswiQ Design Studio files. Every design is checked here on save AND on open, so a
 * file edited by hand (or by an attacker) can never carry a script, an SVG, an outside link or a giant payload into
 * the editor. The format is versioned (`schemaVersion`), so designs saved by an older editor keep opening.
 */

export const SCHEMA_VERSION = 1;
export const MAX_DESIGN_BYTES = 256 * 1024;
export const MAX_OBJECTS = 300;
export const MAX_DEPTH = 3;
export const SIZES = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] } as const;
export type SizeId = keyof typeof SIZES;

const TYPES = new Set(["text", "textbox", "i-text", "image", "rect", "circle", "ellipse", "triangle", "line", "polygon", "path", "group", "sticker"]);
const KEYS = new Set([
  "type", "id", "name", "left", "top", "width", "height", "scaleX", "scaleY", "angle", "flipX", "flipY", "opacity", "visible", "locked",
  "originX", "originY", "fill", "stroke", "strokeWidth", "strokeDashArray", "rx", "ry", "radius", "points", "path", "x1", "y1", "x2", "y2",
  "text", "fontFamily", "fontWeight", "fontSize", "fontStyle", "lineHeight", "charSpacing", "textAlign", "direction", "underline",
  "textBackgroundColor", "linethrough", "shadow", "src", "cropX", "cropY", "filters", "objects", "clipPath", "sticker", "selectable", "evented", "bind", "role",
]);
export const FONTS = ["Cairo", "Tajawal", "Changa", "Noto Kufi Arabic", "Amiri", "Inter"] as const;
const FONT_SET = new Set<string>(FONTS);
/** Fields tied to the product (🔗): they follow the product until the merchant unlinks them. */
export const BINDINGS = ["name", "price", "compareAtPrice", "image"] as const;
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent|linear:#[0-9a-f]{3,8},#[0-9a-f]{3,8})$/i;

/**
 * Images may only point at the studio's own pictures (`studio:<key>`) or the host's sample photos — never an outside
 * site, data: or SVG. A host adds its own safe sources (TaswiQ: its product photos) through `CheckOptions.allowImage`.
 */
export function allowedImageSrc(src: unknown): boolean {
  if (typeof src !== "string" || src.length > 500) return false;
  if (/^studio:[a-z0-9/_-]{8,120}\.(png|jpe?g|webp)$/i.test(src)) return true;
  return /^\/studio\/samples\/[a-z0-9-]{2,40}\.webp$/.test(src);
}
export interface CheckOptions { allowImage?: (src: unknown) => boolean }
let imageCheck: (src: unknown) => boolean = allowedImageSrc;

export type Problem = { path: string; reason: string };

function checkValue(key: string, v: unknown, path: string, out: Problem[]) {
  const num = (min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) out.push({ path, reason: `${key} out of range` });
  };
  switch (key) {
    case "left": case "top": case "x1": case "y1": case "x2": case "y2": return num(-20000, 20000);
    case "width": case "height": case "radius": case "rx": case "ry": return num(0, 20000);
    case "scaleX": case "scaleY": return num(-100, 100);
    case "angle": return num(-3600, 3600);
    case "opacity": return num(0, 1);
    case "strokeWidth": return num(0, 500);
    case "fontSize": return num(4, 1000);
    case "lineHeight": return num(0.3, 5);
    case "charSpacing": return num(-1000, 5000);
    case "fontWeight": if (!(typeof v === "number" ? v >= 100 && v <= 1000 : ["normal", "bold"].includes(String(v)))) out.push({ path, reason: "fontWeight" }); return;
    case "fontFamily": if (typeof v !== "string" || !FONT_SET.has(v)) out.push({ path, reason: "font not offered" }); return;
    case "fill": case "stroke": case "textBackgroundColor": if (v !== null && v !== "" && (typeof v !== "string" || !COLOR.test(v))) out.push({ path, reason: `${key} is not a colour` }); return;
    case "text": if (typeof v !== "string" || v.length > 2000) out.push({ path, reason: "text too long" }); return;
    case "src": if (!imageCheck(v)) out.push({ path, reason: "image source not allowed" }); return;
    case "path": if (!Array.isArray(v) || v.length > 2000 || JSON.stringify(v).length > 40_000) out.push({ path, reason: "path too large" }); return;
    case "points": if (!Array.isArray(v) || v.length > 500) out.push({ path, reason: "too many points" }); return;
    case "textAlign": if (!["left", "center", "right", "justify", "justify-left", "justify-right", "justify-center"].includes(String(v))) out.push({ path, reason: "textAlign" }); return;
    case "direction": if (!["rtl", "ltr"].includes(String(v))) out.push({ path, reason: "direction" }); return;
    case "filters": if (!Array.isArray(v) || v.length > 0) out.push({ path, reason: "filters are not supported" }); return;
    case "sticker": if (typeof v !== "string" || !/^[a-z0-9_-]{1,40}$/.test(v)) out.push({ path, reason: "sticker id" }); return;
    case "bind": if (!(BINDINGS as readonly string[]).includes(String(v))) out.push({ path, reason: "unknown binding" }); return;
    case "role": if (!["headline", "line", "cta", "price", "badge", "product", "logo", "decor"].includes(String(v))) out.push({ path, reason: "unknown role" }); return;
    case "visible": case "locked": case "flipX": case "flipY": case "selectable": case "evented": case "underline": case "linethrough": if (typeof v !== "boolean") out.push({ path, reason: `${key} must be true or false` }); return;
    case "fontStyle": if (!["normal", "italic"].includes(String(v))) out.push({ path, reason: "fontStyle" }); return;
    case "originX": case "originY": if (!["left", "center", "right", "top", "bottom"].includes(String(v))) out.push({ path, reason: key }); return;
    case "strokeDashArray": if (v !== null && (!Array.isArray(v) || v.length > 8 || v.some((n) => typeof n !== "number"))) out.push({ path, reason: key }); return;
    case "cropX": case "cropY": return num(0, 20000);
    case "shadow": if (v !== null && (typeof v !== "object" || Array.isArray(v) || JSON.stringify(v).length > 300 || !COLOR.test(String((v as any).color ?? "#000")))) out.push({ path, reason: "shadow" }); return;
    case "id": case "name": if (typeof v !== "string" || v.length > 80) out.push({ path, reason: `${key} too long` }); return;
    default:
      if (typeof v === "string" && (v.length > 200 || /javascript:|data:|<|url\(/i.test(v))) out.push({ path, reason: `${key} has a forbidden value` });
  }
}

function walk(objects: unknown, path: string, depth: number, out: Problem[], count: { n: number }) {
  if (!Array.isArray(objects)) { out.push({ path, reason: "objects must be a list" }); return; }
  for (const [i, o] of objects.entries()) {
    const at = `${path}[${i}]`;
    if (++count.n > MAX_OBJECTS) { out.push({ path: at, reason: `more than ${MAX_OBJECTS} elements` }); return; }
    if (!o || typeof o !== "object" || Array.isArray(o)) { out.push({ path: at, reason: "not an element" }); continue; }
    const type = String((o as any).type ?? "").toLowerCase();
    if (!TYPES.has(type)) { out.push({ path: at, reason: `element type «${type}» is not allowed` }); continue; }
    for (const [k, v] of Object.entries(o)) {
      if (!KEYS.has(k)) { out.push({ path: `${at}.${k}`, reason: "unknown property" }); continue; }
      if (k === "objects") {
        if (type !== "group") { out.push({ path: `${at}.objects`, reason: "only groups hold elements" }); continue; }
        if (depth >= MAX_DEPTH) { out.push({ path: at, reason: "groups nested too deep" }); continue; }
        walk(v, `${at}.objects`, depth + 1, out, count);
      } else if (k === "clipPath") {
        if (v !== null) walk([v], `${at}.clipPath`, depth + 1, out, count);
      } else checkValue(k, v, `${at}.${k}`, out);
    }
    if (type === "image" && !imageCheck((o as any).src)) out.push({ path: `${at}.src`, reason: "image source not allowed" });
  }
}

export interface Design {
  schemaVersion: number;
  templateId?: string;
  size: SizeId;
  background: string;
  objects: unknown[];
}

/** null when the design is safe to store and open; otherwise the first problems found (at most 20). */
export function designProblems(raw: unknown, options: CheckOptions = {}): Problem[] | null {
  imageCheck = options.allowImage ?? allowedImageSrc;
  const out: Problem[] = [];
  let bytes = 0;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(raw)).length;
  } catch {
    return [{ path: "$", reason: "not JSON" }];
  }
  if (bytes > MAX_DESIGN_BYTES) return [{ path: "$", reason: `design larger than ${MAX_DESIGN_BYTES} bytes` }];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [{ path: "$", reason: "not a design" }];
  const d = raw as Record<string, unknown>;
  for (const k of Object.keys(d)) if (!["schemaVersion", "size", "background", "objects", "templateId"].includes(k)) out.push({ path: k, reason: "unknown property" });
  if (d.templateId !== undefined && (typeof d.templateId !== "string" || !/^[a-z_]{2,20}$/.test(d.templateId))) out.push({ path: "templateId", reason: "unknown template" });
  if (!Number.isInteger(d.schemaVersion) || (d.schemaVersion as number) < 1 || (d.schemaVersion as number) > SCHEMA_VERSION) out.push({ path: "schemaVersion", reason: "unknown version" });
  if (typeof d.size !== "string" || !Object.hasOwn(SIZES, d.size)) out.push({ path: "size", reason: "unknown size" });
  if (typeof d.background !== "string" || !(COLOR.test(d.background) || imageCheck(d.background))) out.push({ path: "background", reason: "background not allowed" });
  walk(d.objects, "objects", 0, out, { n: 0 });
  return out.length ? out.slice(0, 20) : null;
}

/** Older designs are upgraded on open; version 1 is the first, so this is the place future changes plug in. */
export function migrateDesign(raw: Design): Design {
  return raw;
}
