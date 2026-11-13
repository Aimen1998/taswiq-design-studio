/**
 * Our own sales stickers and ready text combinations (all made for this project, AGPL like the code).
 * Stickers are plain shapes + text (no SVG), so every one passes the design check in design.ts.
 */
import type { Obj } from "./model";
import type { Brand, Lang } from "./templates";

type T3 = Record<Lang, string>;
export type StickerStyle = "pill" | "seal" | "tag" | "ribbon" | "outline";
export type StickerTone = "accent" | "primary" | "dark" | "red" | "light";
export interface Sticker { id: string; text: T3; style: StickerStyle; tone: StickerTone; words: string }

const s = (id: string, ar: string, fr: string, en: string, style: StickerStyle, tone: StickerTone, words = ""): Sticker => ({ id, text: { ar, fr, en }, style, tone, words });

/** 40 stickers: discounts, delivery and payment, status, trust, occasions, calls to action. */
export const STICKERS: Sticker[] = [
  s("off10", "−10%", "−10%", "−10%", "seal", "red", "تخفيض خصم remise promo sale discount"),
  s("off20", "−20%", "−20%", "−20%", "seal", "red", "تخفيض خصم remise promo sale discount"),
  s("off30", "−30%", "−30%", "−30%", "seal", "red", "تخفيض خصم remise promo sale discount"),
  s("off40", "−40%", "−40%", "−40%", "seal", "accent", "تخفيض خصم remise promo sale discount"),
  s("off50", "−50%", "−50%", "−50%", "seal", "accent", "تخفيض خصم نصف remise promo sale discount"),
  s("sale", "تخفيض", "Promo", "Sale", "pill", "accent", "تخفيضات خصم solde remise"),
  s("big_sale", "تخفيضات كبرى", "Grandes soldes", "Big sale", "ribbon", "red", "تخفيض خصم soldes"),
  s("special_price", "سعر خاص", "Prix spécial", "Special price", "tag", "primary", "سعر عرض prix offre"),
  s("bogo", "اشترِ 1 واحصل على 1", "1 acheté = 1 offert", "Buy 1 get 1", "ribbon", "accent", "عرض مجاني هدية offert gratuit"),
  s("second_half", "الثانية بنصف السعر", "La 2e à moitié prix", "Second at half price", "tag", "accent", "عرض نصف 2 deuxième"),
  s("free_delivery", "توصيل مجاني", "Livraison gratuite", "Free delivery", "pill", "primary", "توصيل شحن مجاني livraison gratuite"),
  s("delivery_58", "توصيل 58 ولاية", "Livraison 58 wilayas", "Delivery to 58 wilayas", "pill", "primary", "توصيل ولاية الجزائر livraison wilaya"),
  s("cod", "الدفع عند الاستلام", "Paiement à la livraison", "Cash on delivery", "pill", "dark", "دفع استلام نقدا paiement livraison cash"),
  s("fast_delivery", "توصيل خلال 24–48 ساعة", "Livré en 24–48 h", "Delivered in 24–48 h", "tag", "primary", "توصيل سريع ساعة rapide livraison"),
  s("check_first", "افحص قبل الدفع", "Vérifiez avant de payer", "Check before you pay", "outline", "primary", "فحص دفع ضمان vérifier payer"),
  s("free_return", "إرجاع مجاني 7 أيام", "Retour gratuit 7 jours", "Free 7-day returns", "outline", "dark", "إرجاع استبدال ضمان retour échange"),
  s("new", "جديد", "Nouveau", "New", "seal", "primary", "جديد nouveau new"),
  s("just_in", "وصل حديثاً", "Nouvel arrivage", "Just arrived", "ribbon", "primary", "جديد وصل nouveau arrivage"),
  s("best_seller", "الأكثر مبيعاً", "Meilleure vente", "Best seller", "ribbon", "accent", "مبيعا شعبي top vente populaire"),
  s("limited", "كمية محدودة", "Quantité limitée", "Limited stock", "pill", "red", "محدودة قليلة limité stock"),
  s("last_pieces", "آخر القطع", "Dernières pièces", "Last pieces", "tag", "red", "آخر نفاد dernières stock"),
  s("today", "عرض اليوم", "Offre du jour", "Deal of the day", "seal", "accent", "عرض يوم اليوم offre jour"),
  s("weekend", "عرض نهاية الأسبوع", "Offre du week-end", "Weekend deal", "ribbon", "accent", "عرض أسبوع جمعة week-end"),
  s("limited_time", "عرض لفترة محدودة", "Offre limitée", "Limited-time offer", "pill", "red", "عرض وقت محدود limité temps"),
  s("exclusive", "حصري", "Exclusif", "Exclusive", "seal", "dark", "حصري خاص exclusif"),
  s("original", "أصلي 100%", "100% original", "100% original", "seal", "primary", "أصلي ضمان original authentique"),
  s("warranty", "ضمان سنة", "Garantie 1 an", "1-year warranty", "outline", "primary", "ضمان سنة garantie"),
  s("quality", "جودة عالية", "Haute qualité", "High quality", "tag", "dark", "جودة ممتاز qualité premium"),
  s("made_dz", "صنع في الجزائر", "Fabriqué en Algérie", "Made in Algeria", "ribbon", "primary", "جزائر محلي algérie local"),
  s("natural", "منتج طبيعي", "Produit naturel", "Natural product", "pill", "primary", "طبيعي عضوي naturel bio"),
  s("ramadan", "رمضان كريم", "Ramadan Karim", "Ramadan Kareem", "ribbon", "dark", "رمضان ramadan"),
  s("eid", "عيد مبارك", "Aïd moubarak", "Eid Mubarak", "ribbon", "accent", "عيد aïd eid"),
  s("school", "العودة إلى المدارس", "Rentrée scolaire", "Back to school", "tag", "primary", "مدرسة دخول rentrée école"),
  s("black_friday", "الجمعة البيضاء", "Black Friday", "Black Friday", "ribbon", "dark", "جمعة تخفيض friday"),
  s("gift", "هدية مثالية", "Le cadeau idéal", "The perfect gift", "pill", "accent", "هدية مناسبة cadeau gift"),
  s("summer", "عرض الصيف", "Offre d'été", "Summer deal", "pill", "accent", "صيف été summer"),
  s("winter", "عرض الشتاء", "Offre d'hiver", "Winter deal", "pill", "primary", "شتاء hiver winter"),
  s("order_now", "اطلب الآن", "Commander", "Order now", "pill", "light", "طلب اطلب commander acheter"),
  s("call_us", "اتصل بنا", "Appelez-nous", "Call us", "outline", "dark", "اتصال هاتف appeler contact"),
  s("hurry", "سارع قبل النفاد!", "Vite, avant rupture !", "Hurry before it's gone!", "ribbon", "red", "سارع نفاد vite rupture"),
];

function colours(tone: StickerTone, brand: Brand): { bg: string; fg: string; line: string } {
  switch (tone) {
    case "accent": return { bg: brand.accent, fg: "#1f1300", line: brand.accent };
    case "primary": return { bg: brand.primary, fg: "#ffffff", line: brand.primary };
    case "dark": return { bg: "#111827", fg: "#ffffff", line: "#111827" };
    case "red": return { bg: "#dc2626", fg: "#ffffff", line: "#dc2626" };
    case "light": return { bg: "#ffffff", fg: brand.primary, line: brand.primary };
  }
}

/** One sticker as a design element (a group: a shape and its text), sized for a canvas `W` wide. */
export function stickerObject(st: Sticker, brand: Brand, lang: Lang, W: number, H: number): Obj {
  const text = st.text[lang];
  const c = colours(st.tone, brand);
  const font = brand.font;
  if (st.style === "seal") {
    const r = Math.round(W * 0.11);
    return { type: "group", role: "badge", name: text, left: W * 0.62, top: H * 0.12, objects: [
      { type: "circle", radius: r, fill: c.bg, stroke: "#ffffff", strokeWidth: Math.round(r * 0.08) },
      { type: "textbox", text, width: r * 1.7, left: r * 0.15, top: r * (text.length > 6 ? 0.72 : 0.62), fontFamily: font, fontWeight: 900, fontSize: Math.round(r * (text.length > 6 ? 0.34 : 0.62)), fill: c.fg, textAlign: "center" },
    ] };
  }
  const h = Math.round(W * 0.075);
  const w = Math.min(Math.round(W * 0.86), Math.round(h * 0.62 * Math.max(4, text.length) + h * 1.2));
  const shape: Obj = st.style === "outline"
    ? { type: "rect", width: w, height: h, rx: h * 0.22, ry: h * 0.22, fill: "rgba(255,255,255,0.92)", stroke: c.line, strokeWidth: Math.round(h * 0.07) }
    : { type: "rect", width: w, height: h, rx: st.style === "pill" ? h / 2 : st.style === "tag" ? h * 0.18 : 0, ry: st.style === "pill" ? h / 2 : st.style === "tag" ? h * 0.18 : 0, fill: c.bg };
  return { type: "group", role: "badge", name: text, left: (W - w) / 2, top: H * 0.14, angle: st.style === "ribbon" ? -6 : 0, objects: [
    shape,
    { type: "textbox", text, width: w, top: h * 0.2, fontFamily: font, fontWeight: 900, fontSize: Math.round(h * 0.5), fill: st.style === "outline" ? c.line : c.fg, textAlign: "center" },
  ] };
}

export interface TextCombo { id: string; headline: T3; line: T3; withPrice: boolean; font: string; weight: number; look: "light" | "dark" | "brand" }
const tc = (id: string, h: T3, l: T3, withPrice: boolean, font: string, look: TextCombo["look"], weight = 900): TextCombo => ({ id, headline: h, line: l, withPrice, font, weight, look });

/** 20 ready text combinations: a headline, a line and (often) the product's price. */
export const TEXT_COMBOS: TextCombo[] = [
  tc("t01", { ar: "عرض خاص", fr: "Offre spéciale", en: "Special offer" }, { ar: "لفترة محدودة فقط", fr: "Pour une durée limitée", en: "For a limited time only" }, true, "Cairo", "brand"),
  tc("t02", { ar: "تخفيضات كبرى", fr: "Grandes soldes", en: "Big sale" }, { ar: "حتى −50% على مختارات", fr: "Jusqu'à −50 % sur une sélection", en: "Up to −50% on a selection" }, false, "Changa", "dark"),
  tc("t03", { ar: "وصل حديثاً", fr: "Nouvel arrivage", en: "Just arrived" }, { ar: "اكتشف التشكيلة الجديدة", fr: "Découvrez la nouvelle collection", en: "Discover the new collection" }, true, "Tajawal", "light"),
  tc("t04", { ar: "الأكثر مبيعاً", fr: "Meilleure vente", en: "Best seller" }, { ar: "اختيار زبائننا الأول", fr: "Le choix n°1 de nos clients", en: "Our customers' first choice" }, true, "Cairo", "brand"),
  tc("t05", { ar: "توصيل مجاني", fr: "Livraison gratuite", en: "Free delivery" }, { ar: "إلى 58 ولاية، والدفع عند الاستلام", fr: "Dans les 58 wilayas, paiement à la livraison", en: "To all 58 wilayas, cash on delivery" }, false, "Tajawal", "brand"),
  tc("t06", { ar: "اطلب الآن", fr: "Commandez maintenant", en: "Order now" }, { ar: "وادفع عند الاستلام", fr: "Payez à la livraison", en: "Pay on delivery" }, true, "Cairo", "dark"),
  tc("t07", { ar: "جودة لا تُقاوم", fr: "Une qualité irrésistible", en: "Irresistible quality" }, { ar: "بسعر في متناول الجميع", fr: "À un prix pour tous", en: "At a price for everyone" }, true, "Amiri", "light", 700),
  tc("t08", { ar: "هدية مثالية", fr: "Le cadeau idéal", en: "The perfect gift" }, { ar: "لمن تحب في كل مناسبة", fr: "Pour ceux que vous aimez", en: "For the ones you love" }, true, "Amiri", "brand", 700),
  tc("t09", { ar: "عرض اليوم", fr: "Offre du jour", en: "Deal of the day" }, { ar: "ينتهي منتصف الليل", fr: "Se termine à minuit", en: "Ends at midnight" }, true, "Changa", "dark"),
  tc("t10", { ar: "كمية محدودة", fr: "Quantité limitée", en: "Limited stock" }, { ar: "سارع قبل النفاد", fr: "Vite, avant la rupture", en: "Hurry before it's gone" }, true, "Cairo", "dark"),
  tc("t11", { ar: "رمضان كريم", fr: "Ramadan Karim", en: "Ramadan Kareem" }, { ar: "عروض الشهر الفضيل", fr: "Les offres du mois sacré", en: "Offers for the holy month" }, true, "Amiri", "dark", 700),
  tc("t12", { ar: "عيد مبارك", fr: "Aïd moubarak", en: "Eid Mubarak" }, { ar: "أسعار العيد لكل العائلة", fr: "Les prix de l'Aïd pour toute la famille", en: "Eid prices for the whole family" }, true, "Noto Kufi Arabic", "brand"),
  tc("t13", { ar: "العودة إلى المدارس", fr: "Rentrée scolaire", en: "Back to school" }, { ar: "كل ما يحتاجه أطفالك", fr: "Tout ce qu'il faut à vos enfants", en: "Everything your kids need" }, true, "Changa", "light"),
  tc("t14", { ar: "طبيعي 100%", fr: "100 % naturel", en: "100% natural" }, { ar: "بدون مواد كيميائية", fr: "Sans produits chimiques", en: "No chemicals" }, true, "Tajawal", "light"),
  tc("t15", { ar: "أناقة كل يوم", fr: "L'élégance au quotidien", en: "Everyday elegance" }, { ar: "تصميم عصري وخامة ممتازة", fr: "Design moderne, matière de qualité", en: "Modern design, quality fabric" }, true, "Noto Kufi Arabic", "light", 700),
  tc("t16", { ar: "قوة وأداء", fr: "Puissance et performance", en: "Power and performance" }, { ar: "مصمّم ليدوم معك", fr: "Conçu pour durer", en: "Built to last" }, true, "Changa", "dark"),
  tc("t17", { ar: "اشترِ 1 واحصل على 1", fr: "1 acheté = 1 offert", en: "Buy 1, get 1 free" }, { ar: "العرض ساري حتى نفاد الكمية", fr: "Jusqu'à épuisement du stock", en: "While stocks last" }, false, "Cairo", "brand"),
  tc("t18", { ar: "افحص قبل أن تدفع", fr: "Vérifiez avant de payer", en: "Check before you pay" }, { ar: "ثقتك أولاً: الدفع عند الاستلام", fr: "Votre confiance d'abord : paiement à la livraison", en: "Your trust first: cash on delivery" }, false, "Tajawal", "brand"),
  tc("t19", { ar: "سعر لا يتكرر", fr: "Un prix unique", en: "A price you won't see again" }, { ar: "بدلاً من السعر القديم", fr: "Au lieu de l'ancien prix", en: "Instead of the old price" }, true, "Cairo", "dark"),
  tc("t20", { ar: "صنع في الجزائر", fr: "Fabriqué en Algérie", en: "Made in Algeria" }, { ar: "منتج محلي بجودة عالية", fr: "Produit local de qualité", en: "Local, high-quality product" }, true, "Noto Kufi Arabic", "brand", 700),
];

/** A text combination as design elements, placed in the upper safe area; the price stays linked to the product (🔗). */
export function comboObjects(c: TextCombo, brand: Brand, lang: Lang, priceText: string, W: number, H: number): Obj[] {
  const fg = c.look === "light" ? "#111827" : "#ffffff";
  const bg = c.look === "light" ? "rgba(255,255,255,0.92)" : c.look === "dark" ? "rgba(17,24,39,0.88)" : brand.primary;
  const align = lang === "ar" ? "right" : "left";
  const direction = lang === "ar" ? "rtl" : "ltr";
  const x = W * 0.08, w = W * 0.84, top = H * 0.08;
  const boxH = c.withPrice ? W * 0.36 : W * 0.26;
  const out: Obj[] = [
    { type: "rect", role: "decor", left: x - W * 0.02, top: top - W * 0.02, width: w + W * 0.04, height: boxH, rx: W * 0.03, ry: W * 0.03, fill: bg },
    { type: "textbox", role: "headline", text: c.headline[lang], left: x, top, width: w, fontFamily: c.font, fontWeight: c.weight, fontSize: Math.round(W * 0.085), fill: fg, textAlign: align, direction },
    { type: "textbox", role: "line", text: c.line[lang], left: x, top: top + W * 0.11, width: w, fontFamily: c.font === "Amiri" ? "Tajawal" : c.font, fontWeight: 700, fontSize: Math.round(W * 0.042), fill: fg, textAlign: align, direction },
  ];
  if (c.withPrice) out.push({ type: "textbox", role: "price", bind: "price", text: priceText, left: x, top: top + W * 0.18, width: w, fontFamily: "Cairo", fontWeight: 900, fontSize: Math.round(W * 0.08), fill: c.look === "light" ? brand.primary : brand.accent, textAlign: align, direction: "rtl" });
  return out;
}

/** Search across stickers by any language and by the extra words (Arabic and French both work). */
export function fold(x: string): string {
  return x.toLowerCase().normalize("NFKD").replace(/[ً-ٰٟ̀-ͯ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}
export function findStickers(q: string): Sticker[] {
  const f = fold(q.trim());
  if (!f) return STICKERS;
  return STICKERS.filter((st) => fold(`${st.text.ar} ${st.text.fr} ${st.text.en} ${st.words}`).includes(f));
}
