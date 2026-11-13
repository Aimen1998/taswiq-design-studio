import { FONTS } from "./design";

/** Design fonts (all OFL-1.1), loaded only when the studio opens and only the weights the studio offers. */
export const DESIGN_FONTS = FONTS;
let loading: Promise<void> | null = null;
export function loadDesignFonts(): Promise<void> {
  loading ??= Promise.all([
    import("@fontsource/tajawal/700.css"), import("@fontsource/tajawal/900.css"),
    import("@fontsource/changa/700.css"), import("@fontsource/changa/800.css"),
    import("@fontsource/noto-kufi-arabic/700.css"), import("@fontsource/noto-kufi-arabic/900.css"),
    import("@fontsource/amiri/700.css"),
  ]).then(() => Promise.all(["Tajawal", "Changa", "Noto Kufi Arabic", "Amiri", "Cairo Variable", "Inter Variable"].map((f) => document.fonts.load(`700 32px "${f}"`, "السعر 2,900 دج Commander").catch(() => [])))).then(() => undefined);
  return loading;
}
