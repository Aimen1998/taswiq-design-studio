import { expect, test, type Page } from "@playwright/test";

/** How much of the canvas is painted (not white, not transparent), 0..1, from a 40×40 sample grid. */
async function painted(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>("[data-studio-stage] canvas.lower-canvas") ?? document.querySelector<HTMLCanvasElement>("[data-studio-stage] canvas");
    if (!c) return 0;
    const ctx = c.getContext("2d")!; const { width: w, height: h } = c; let n = 0;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      const [r, g, b, a] = ctx.getImageData(Math.floor(((x + 0.5) * w) / 40), Math.floor(((y + 0.5) * h) / 40), 1, 1).data;
      if (a > 0 && !(r > 245 && g > 245 && b > 245)) n++;
    }
    return n / 1600;
  });
}
async function canvasHash(page: Page): Promise<string> {
  return page.evaluate(() => (document.querySelector<HTMLCanvasElement>("[data-studio-stage] canvas.lower-canvas") ?? document.querySelector<HTMLCanvasElement>("[data-studio-stage] canvas"))!.toDataURL("image/jpeg", 0.3).slice(-200));
}
/** Opens the first instant design as soon as its button exists — like a merchant on a slow line, before thumbnails or fonts. */
async function openEditor(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem("taswiq:studio:tour", "1"); } catch {} });
  await page.goto("/editor/");
  await page.locator("[data-studio-instant] button").first().waitFor();
  await page.locator("[data-studio-instant] button").first().click();
  await page.locator("[data-studio-editor] canvas").first().waitFor();
}

test("a design opened from a template is drawn at once, even while the fonts are still loading", async ({ page }) => {
  await page.route(/\.woff2?(\?|$)/, async (route) => { await new Promise((r) => setTimeout(r, 8000)); await route.continue(); });
  await openEditor(page);
  await expect.poll(() => painted(page), { timeout: 3000 }).toBeGreaterThan(0.3);
});

test("choosing another template in the Templates tab applies it at once", async ({ page, isMobile }) => {
  test.skip(isMobile, "the template rail is the desktop layout");
  await openEditor(page);
  await expect.poll(() => painted(page)).toBeGreaterThan(0.3);
  const before = await canvasHash(page);
  await page.locator("[data-studio-tab=templates]").click();
  await page.locator("[data-studio-templates] button").nth(8).click();
  await expect.poll(() => canvasHash(page), { timeout: 5000 }).not.toBe(before);
  expect(await painted(page)).toBeGreaterThan(0.3);
});

test("the landing page opens the editor", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.locator("a[href='/editor/']").first().click();
  await expect(page.locator("[data-studio-instant] img").first()).toBeVisible();
});

test("40 stickers with search, and ready text combinations add to the design", async ({ page, isMobile }) => {
  test.skip(isMobile, "the side panels are the desktop layout");
  await openEditor(page);
  await page.locator("[data-studio-tab=elements]").click();
  await expect(page.locator("[data-sticker]")).toHaveCount(40);
  await page.locator("[data-studio-el-search]").fill("توصيل");
  const found = await page.locator("[data-sticker]").count();
  expect(found).toBeGreaterThanOrEqual(2);
  expect(found).toBeLessThan(40);
  const before = await canvasHash(page);
  await page.locator("[data-sticker]").first().click();
  await expect.poll(() => canvasHash(page)).not.toBe(before);
  await page.locator("[data-studio-tab=text]").click();
  await expect(page.locator("[data-combo]")).toHaveCount(20);
  const mid = await canvasHash(page);
  await page.locator("[data-combo=t05]").click();
  await expect.poll(() => canvasHash(page)).not.toBe(mid);
  await expect(page.locator("[data-studio-status]")).toHaveAttribute("data-studio-status", "saved", { timeout: 10_000 });
});
