import "@fontsource-variable/cairo";
import "./styles.css";

type Lang = "ar" | "fr" | "en";
const T: Record<Lang, Record<string, string>> = {
  ar: {
    title: "صمّم إعلاناً لمنتجك في دقائق",
    lead: "اختر صورة منتجك فنجهّز لك 3 تصاميم فورية لفيسبوك وإنستغرام والقصص. عدّل النص والألوان، واحذف الخلفية، ثم حمّل الصورة أو شاركها على واتساب.",
    open: "افتح المحرر", more: "صمّم أكثر مع متجرك على TaswiQ", free: "مجاني ومفتوح المصدر. بلا حساب، وتصاميمك تبقى في متصفحك.",
    alt: "إعلان صُمّم بالاستوديو: عطر بسعره بالدينار وزر «اطلب الآن»", features: "المزايا",
    f1: "3 تصاميم فورية", f1d: "من اسم منتجك وسعره وصورته، و15 قالباً جاهزاً.",
    f2: "حذف الخلفية على جهازك", f2d: "تعمل داخل المتصفح، فلا تُرسل صورتك إلى أي خادم.",
    f3: "كل المقاسات", f3d: "1:1 و4:5 و9:16 مع مناطق القصص الآمنة، وتنزيل PNG وJPG.",
    f4: "عربي أولاً", f4d: "خطوط عربية مفتوحة، ونص من اليمين، والسعر بالدينار.",
    try: "جرّب TaswiQ: متجرك للدفع عند الاستلام", privacy: "لا تتبع ولا ملفات تعريف: لا نجمع أي بيانات عنك.",
  },
  fr: {
    title: "Créez une pub pour votre produit en quelques minutes",
    lead: "Choisissez la photo de votre produit : 3 designs instantanés pour Facebook, Instagram et les stories. Modifiez le texte et les couleurs, détourez la photo, puis téléchargez ou partagez sur WhatsApp.",
    open: "Ouvrir l’éditeur", more: "Allez plus loin avec votre boutique TaswiQ", free: "Gratuit et open source. Sans compte : vos designs restent dans votre navigateur.",
    alt: "Une pub créée avec le studio : un parfum, son prix en dinars et « Commander »", features: "Fonctionnalités",
    f1: "3 designs instantanés", f1d: "Avec le nom, le prix et la photo de votre produit, et 15 modèles.",
    f2: "Détourage sur votre appareil", f2d: "Tout se fait dans le navigateur : votre photo n’est envoyée à aucun serveur.",
    f3: "Tous les formats", f3d: "1:1, 4:5 et 9:16 avec zones sûres des stories, export PNG et JPG.",
    f4: "L’arabe d’abord", f4d: "Polices arabes libres, texte de droite à gauche, prix en dinars.",
    try: "Essayez TaswiQ : votre boutique en paiement à la livraison", privacy: "Aucun suivi, aucun cookie : nous ne collectons aucune donnée.",
  },
  en: {
    title: "Make an ad for your product in minutes",
    lead: "Pick your product photo and get 3 instant designs for Facebook, Instagram and stories. Edit the text and colours, remove the background, then download or share on WhatsApp.",
    open: "Open the editor", more: "Do more with your store on TaswiQ", free: "Free and open source. No account: your designs stay in your browser.",
    alt: "An ad made with the studio: a perfume, its price in dinars and “Order now”", features: "Features",
    f1: "3 instant designs", f1d: "From your product’s name, price and photo, plus 15 templates.",
    f2: "Background removal on your device", f2d: "It runs in the browser, so your photo is never sent to a server.",
    f3: "Every size", f3d: "1:1, 4:5 and 9:16 with story safe zones, PNG and JPG export.",
    f4: "Arabic first", f4d: "Open Arabic fonts, right-to-left text, prices in dinars.",
    try: "Try TaswiQ: your cash-on-delivery store", privacy: "No tracking, no cookies: we collect no data about you.",
  },
};

function first(): Lang {
  try { const s = localStorage.getItem("design-studio:lang"); if (s === "ar" || s === "fr" || s === "en") return s; } catch {}
  return "ar";
}

function apply(lang: Lang) {
  const t = T[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => { const k = el.dataset.t!; if (t[k]) el.textContent = t[k]; });
  document.querySelectorAll<HTMLImageElement>("[data-t-alt]").forEach((el) => { el.alt = t[el.dataset.tAlt!] ?? el.alt; });
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => {
    const on = b.dataset.lang === lang;
    b.setAttribute("aria-pressed", String(on));
    b.classList.toggle("bg-foreground", on); b.classList.toggle("text-background", on); b.classList.toggle("bg-card", !on);
  });
  document.title = `TaswiQ Studio · ${t.title}`;
}
function choose(lang: Lang) {
  try { localStorage.setItem("design-studio:lang", lang); } catch {}
  apply(lang);
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.addEventListener("click", () => choose(b.dataset.lang as Lang)));
apply(first());
