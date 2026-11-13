import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/cairo";
import "@fontsource-variable/inter";
import "./styles.css";
import { Studio, StudioProvider, type Lang, type Notify } from "../src";
import { localHost } from "./local";

const LANGS: Array<{ id: Lang; label: string }> = [{ id: "ar", label: "العربية" }, { id: "fr", label: "Français" }, { id: "en", label: "English" }];
const TRY: Record<Lang, string> = { ar: "جرّب TaswiQ: متجرك للدفع عند الاستلام", fr: "Essayez TaswiQ : votre boutique en paiement à la livraison", en: "Try TaswiQ: your cash-on-delivery store" };
const LOCAL: Record<Lang, string> = { ar: "تصاميمك محفوظة في هذا المتصفح فقط، بلا حساب ولا خادم.", fr: "Vos designs restent dans ce navigateur : sans compte, sans serveur.", en: "Your designs stay in this browser only: no account, no server." };

function firstLang(): Lang {
  try { const saved = localStorage.getItem("design-studio:lang"); if (saved === "ar" || saved === "fr" || saved === "en") return saved; } catch {}
  const n = (navigator.language || "ar").slice(0, 2);
  return n === "fr" ? "fr" : n === "en" ? "en" : "ar";
}

type Toast = { id: number; text: string; tone: "ok" | "error"; action?: { label: string; run: () => void } };

function App() {
  const [lang, setLang] = useState<Lang>(firstLang);
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("design-studio:lang", lang); } catch {}
  }, [lang]);
  const push = useCallback((t: Omit<Toast, "id">, ms = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all, { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), ms);
  }, []);
  const notify: Notify = useMemo(() => ({
    success: (text) => push({ text, tone: "ok" }),
    error: (text) => push({ text, tone: "error" }, 6000),
    undo: (text, label, run, ms) => push({ text, tone: "ok", action: { label, run } }, ms),
  }), [push]);
  const host = useMemo(() => localHost(lang, notify), [lang, notify]);

  return (
    <StudioProvider host={host}>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <a href="/" className="me-auto text-lg font-black text-brand">TaswiQ Studio</a>
          <div className="flex gap-1" role="group" aria-label="Language">
            {LANGS.map((l) => <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => setLang(l.id)} className={`min-h-11 rounded-full px-3 text-sm font-bold ${lang === l.id ? "bg-foreground text-background" : "border border-border bg-card"}`}>{l.label}</button>)}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-10">
          <p className="mb-4 rounded-xl bg-card p-3 text-sm text-muted-foreground">{LOCAL[lang]}</p>
          <Studio key={lang} />
        </main>
        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-6 text-sm text-muted-foreground">
          <a className="font-bold text-brand underline" href="https://taswiq.store">{TRY[lang]}</a>
          <a className="underline" href="https://github.com/Aimen1998/taswiq-design-studio">AGPL-3.0 · GitHub</a>
        </footer>
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] grid justify-items-center gap-2 px-4" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${t.tone === "error" ? "bg-orange-50 text-orange-950" : "bg-foreground text-background"}`}>
              <span>{t.text}</span>
              {t.action && <button type="button" className="min-h-11 rounded-lg px-2 underline" onClick={() => { t.action!.run(); setToasts((all) => all.filter((x) => x.id !== t.id)); }}>{t.action.label}</button>}
            </div>
          ))}
        </div>
      </div>
    </StudioProvider>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
