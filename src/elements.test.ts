import { describe, expect, it } from "vitest";
import { designProblems } from "./design";
import { STICKERS, TEXT_COMBOS, comboObjects, findStickers, stickerObject } from "./elements";
import type { Brand, Lang } from "./templates";

const brand: Brand = { primary: "#0F7B53", accent: "#F59E0D", font: "Cairo" };
const langs: Lang[] = ["ar", "fr", "en"];

describe("stickers and text combinations", () => {
  it("has at least 40 stickers and 20 text combinations, all with three languages", () => {
    expect(STICKERS.length).toBeGreaterThanOrEqual(40);
    expect(TEXT_COMBOS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(STICKERS.length);
    for (const s of STICKERS) for (const l of langs) expect(s.text[l], `${s.id} ${l}`).toBeTruthy();
  });
  it("every sticker and every combination passes the design check, in every language and size", () => {
    for (const l of langs) for (const [W, H] of [[1080, 1080], [1080, 1920]]) {
      const objects = [...STICKERS.map((s) => stickerObject(s, brand, l, W, H)), ...TEXT_COMBOS.flatMap((c) => comboObjects(c, brand, l, "2,900 دج", W, H))];
      for (const chunk of [objects.slice(0, 100), objects.slice(100)]) expect(designProblems({ schemaVersion: 1, size: H > W ? "story" : "square", background: "#ffffff", objects: chunk }), `${l} ${W}x${H}`).toBeNull();
    }
  });
  it("finds stickers in Arabic and French, with or without hamza", () => {
    expect(findStickers("توصيل").map((s) => s.id)).toEqual(expect.arrayContaining(["free_delivery", "delivery_58"]));
    expect(findStickers("livraison").length).toBeGreaterThanOrEqual(3);
    expect(findStickers("اصلي").map((s) => s.id)).toContain("original");
    expect(findStickers("")).toHaveLength(STICKERS.length);
  });
});
