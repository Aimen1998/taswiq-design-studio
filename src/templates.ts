/**
 * The 15 ready ad templates. Pure data: a template + size + the store's brand + a product → a design.
 * Every template keeps a safe margin (7 % of the width) on all sides, keeps text out of the story apps' button zones
 * (9:16), and puts text on plain colour (never on the photo), so none trips the contrast warning.
 */
import { SIZES, type SizeId } from "./design";

export type Lang = "ar" | "fr" | "en";
export interface Brand { primary: string; accent: string; font: string; name?: string; logo?: string | null }
export interface ProductInfo { name: string; price: number; compareAtPrice?: number | null; image: string }
export type TemplateId =
  | "offer" | "new_arrival" | "sale" | "ramadan" | "eid" | "school" | "free_delivery" | "before_after"
  | "cod_trust" | "limited" | "bundle" | "minimal" | "bold_price" | "flash" | "gift";
export const TEMPLATE_IDS: TemplateId[] = ["offer", "new_arrival", "sale", "free_delivery", "cod_trust", "limited", "bold_price", "minimal", "flash", "bundle", "gift", "ramadan", "eid", "school", "before_after"];
export const TEMPLATE_GROUP: Record<TemplateId, "offers" | "new" | "sale" | "seasons" | "school" | "delivery" | "compare"> = {
  offer: "offers", bundle: "offers", gift: "offers", limited: "offers", new_arrival: "new", minimal: "new", sale: "sale", bold_price: "sale", flash: "sale",
  ramadan: "seasons", eid: "seasons", school: "school", free_delivery: "delivery", cod_trust: "delivery", before_after: "compare",
};

const COPY: Record<TemplateId, Record<Lang, { head: string; badge?: string }>> = {
  offer: { ar: { head: "عرض خاص", badge: "عرض" }, fr: { head: "Offre spéciale", badge: "Offre" }, en: { head: "Special offer", badge: "Offer" } },
  new_arrival: { ar: { head: "وصل حديثاً", badge: "جديد" }, fr: { head: "Nouveauté", badge: "Nouveau" }, en: { head: "Just arrived", badge: "New" } },
  sale: { ar: { head: "تخفيضات", badge: "تخفيض" }, fr: { head: "Soldes", badge: "Promo" }, en: { head: "Sale", badge: "Sale" } },
  ramadan: { ar: { head: "عروض رمضان", badge: "رمضان كريم" }, fr: { head: "Offres du Ramadan", badge: "Ramadan" }, en: { head: "Ramadan offers", badge: "Ramadan" } },
  eid: { ar: { head: "عيدكم مبارك", badge: "عروض العيد" }, fr: { head: "Aïd Moubarak", badge: "Offres de l’Aïd" }, en: { head: "Eid Mubarak", badge: "Eid offers" } },
  school: { ar: { head: "الدخول المدرسي", badge: "مدرسة" }, fr: { head: "Rentrée scolaire", badge: "Rentrée" }, en: { head: "Back to school", badge: "School" } },
  free_delivery: { ar: { head: "توصيل مجاني", badge: "58 ولاية" }, fr: { head: "Livraison gratuite", badge: "58 wilayas" }, en: { head: "Free delivery", badge: "58 wilayas" } },
  before_after: { ar: { head: "قبل · بعد", badge: "النتيجة" }, fr: { head: "Avant · Après", badge: "Résultat" }, en: { head: "Before · After", badge: "Result" } },
  cod_trust: { ar: { head: "اطلب الآن وادفع عند الاستلام", badge: "بلا دفع مسبق" }, fr: { head: "Commandez, payez à la livraison", badge: "Rien à l’avance" }, en: { head: "Order now, pay on delivery", badge: "Nothing upfront" } },
  limited: { ar: { head: "كمية محدودة", badge: "آخر القطع" }, fr: { head: "Quantité limitée", badge: "Dernières pièces" }, en: { head: "Limited stock", badge: "Last pieces" } },
  bundle: { ar: { head: "اشترِ 2 ووفّر", badge: "2 = أقل" }, fr: { head: "Achetez-en 2, économisez", badge: "2 = moins cher" }, en: { head: "Buy 2 and save", badge: "2 for less" } },
  minimal: { ar: { head: "" }, fr: { head: "" }, en: { head: "" } },
  bold_price: { ar: { head: "السعر" }, fr: { head: "Prix" }, en: { head: "Price" } },
  flash: { ar: { head: "عرض اليوم فقط", badge: "24 ساعة" }, fr: { head: "Offre du jour", badge: "24 h" }, en: { head: "Today only", badge: "24 h" } },
  gift: { ar: { head: "هدية مثالية", badge: "🎁" }, fr: { head: "Le cadeau idéal", badge: "🎁" }, en: { head: "The perfect gift", badge: "🎁" } },
};
const CTA: Record<Lang, string> = { ar: "اطلب الآن", fr: "Commander", en: "Order now" };
const COD: Record<Lang, string> = { ar: "الدفع عند الاستلام", fr: "Paiement à la livraison", en: "Cash on delivery" };
export const money = (n: number, lang: Lang) => `${new Intl.NumberFormat("en-US").format(n)} ${lang === "ar" ? "دج" : "DA"}`;

/** Where story apps draw their own buttons (fraction of the height/width), kept free of text. */
export const STORY_SAFE = { top: 0.13, bottom: 0.2, side: 0.14 };
export const MARGIN = 0.07;

type Obj = Record<string, unknown>;
const darker = (hex: string, f = 0.35) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - f)).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};

/** The safe box for text and important elements on this size. */
export function safeBox(size: SizeId) {
  const [W, H] = SIZES[size];
  const m = Math.round(W * MARGIN);
  if (size !== "story") return { left: m, top: m, right: W - m, bottom: H - m, W, H };
  return { left: Math.max(m, Math.round(W * STORY_SAFE.side)), top: Math.round(H * STORY_SAFE.top), right: W - Math.max(m, Math.round(W * STORY_SAFE.side)), bottom: Math.round(H * (1 - STORY_SAFE.bottom)), W, H };
}

/** One template as a design (the JSON the studio stores), sized and coloured for this store and product. */
export function buildDesign(id: TemplateId, size: SizeId, brand: Brand, product: ProductInfo, lang: Lang) {
  const box = safeBox(size);
  const { W } = box;
  const w = box.right - box.left;
  const rtl = lang === "ar";
  const align = rtl ? "right" : "left";
  const copy = COPY[id][lang];
  const dark = darker(brand.primary);
  const story = size === "story";
  const photoH = story ? (box.bottom - box.top) * 0.46 : (box.bottom - box.top) * (size === "portrait" ? 0.52 : 0.46);
  const headSize = Math.round(W * (story ? 0.085 : 0.075));
  const priceSize = Math.round(W * (id === "bold_price" ? 0.13 : 0.095));
  const objects: Obj[] = [];
  const bg = id === "minimal" ? "#f6f3ef" : id === "ramadan" ? "linear:#1e293b,#0f172a" : id === "eid" ? `linear:${brand.primary},${dark}` : id === "school" ? "linear:#4c1d95,#1e1b4b" : `linear:${brand.primary},${dark}`;
  const textColor = id === "minimal" ? "#1f2937" : "#ffffff";
  let y = box.top;
  if (copy.head) {
    objects.push({ type: "textbox", role: "headline", text: copy.head, left: box.left, top: y, width: w, fontFamily: brand.font, fontWeight: 900, fontSize: headSize, fill: textColor, textAlign: align, direction: rtl ? "rtl" : "ltr", lineHeight: 1.15 });
    y += Math.round(headSize * (copy.head.length > 18 ? 2.5 : 1.4));
  }
  objects.push({ type: "textbox", role: "line", bind: "name", text: product.name, left: box.left, top: y, width: w, fontFamily: brand.font, fontWeight: 700, fontSize: Math.round(W * 0.045), fill: textColor, textAlign: align, direction: rtl ? "rtl" : "ltr", lineHeight: 1.2 });
  y += Math.round(W * 0.075);
  const photoTop = y;
  objects.push({ type: "rect", role: "decor", left: box.left, top: photoTop, width: w, height: photoH, rx: Math.round(W * 0.04), ry: Math.round(W * 0.04), fill: id === "minimal" ? "#ffffff" : "rgba(255,255,255,0.12)" });
  objects.push({ type: "image", role: "product", bind: "image", src: product.image, left: box.left + w / 2, top: photoTop + photoH / 2, originX: "center", originY: "center", width: photoH * 0.92, height: photoH * 0.92 });
  if (copy.badge) {
    const bw = Math.round(W * 0.3);
    objects.push({ type: "group", role: "badge", left: rtl ? box.left + Math.round(W * 0.03) : box.right - bw - Math.round(W * 0.03), top: photoTop + Math.round(W * 0.03), objects: [
      { type: "rect", width: bw, height: Math.round(W * 0.075), rx: Math.round(W * 0.0375), ry: Math.round(W * 0.0375), fill: brand.accent },
      { type: "textbox", text: copy.badge, direction: rtl ? "rtl" : "ltr", width: bw, top: Math.round(W * 0.015), fontFamily: brand.font, fontWeight: 900, fontSize: Math.round(W * 0.038), fill: "#1f1300", textAlign: "center" },
    ] });
  }
  y = photoTop + photoH + Math.round(W * 0.04);
  objects.push({ type: "textbox", role: "price", bind: "price", text: money(product.price, lang), left: rtl ? box.left + w * 0.4 : box.left, top: y, width: w * 0.6, fontFamily: brand.font, fontWeight: 900, fontSize: priceSize, fill: id === "minimal" ? brand.primary : "#ffffff", textAlign: align, direction: rtl ? "rtl" : "ltr" });
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    objects.push({ type: "textbox", role: "line", bind: "compareAtPrice", text: money(product.compareAtPrice, lang), left: rtl ? box.left : box.left + w * 0.62, top: y + priceSize * 0.3, width: w * 0.36, fontFamily: brand.font, fontWeight: 700, fontSize: Math.round(priceSize * 0.45), fill: id === "minimal" ? "#6b7280" : "rgba(255,255,255,0.75)", textAlign: rtl ? "left" : "right", direction: rtl ? "rtl" : "ltr", opacity: 0.8 });
  }
  const ctaW = Math.round(w * 0.46);
  const ctaH = Math.round(W * 0.08);
  const ctaTop = Math.min(box.bottom - ctaH, y + priceSize * 1.35);
  objects.push({ type: "group", role: "cta", left: rtl ? box.left : box.right - ctaW, top: ctaTop, objects: [
    { type: "rect", width: ctaW, height: ctaH, rx: ctaH / 2, ry: ctaH / 2, fill: id === "minimal" ? brand.primary : "#ffffff" },
    { type: "textbox", text: CTA[lang], direction: rtl ? "rtl" : "ltr", width: ctaW, top: Math.round(ctaH * 0.2), fontFamily: brand.font, fontWeight: 900, fontSize: Math.round(ctaH * 0.45), fill: id === "minimal" ? "#ffffff" : brand.primary, textAlign: "center" },
  ] });
  objects.push({ type: "textbox", role: "line", text: `💵 ${COD[lang]}`, left: rtl ? box.left + ctaW + Math.round(W * 0.03) : box.left, top: ctaTop + ctaH * 0.25, width: w - ctaW - Math.round(W * 0.03), fontFamily: brand.font, fontWeight: 700, fontSize: Math.round(W * 0.032), fill: textColor, textAlign: rtl ? "right" : "left", direction: rtl ? "rtl" : "ltr" });
  return { schemaVersion: 1, size, background: bg, objects, templateId: id };
}

/** Three designs for a product, picked for what it is (a price drop gets the sale look first). */
export function instantDesigns(product: ProductInfo, brand: Brand, lang: Lang, size: SizeId = "square") {
  const ids: TemplateId[] = product.compareAtPrice && product.compareAtPrice > product.price ? ["sale", "cod_trust", "minimal"] : ["offer", "cod_trust", "minimal"];
  return ids.map((id) => buildDesign(id, size, brand, product, lang));
}

/** The text a bound field shows for this product. */
export function boundText(bind: string, product: ProductInfo, lang: Lang): string | null {
  if (bind === "name") return product.name;
  if (bind === "price") return money(product.price, lang);
  if (bind === "compareAtPrice") return product.compareAtPrice ? money(product.compareAtPrice, lang) : null;
  return null;
}
