import { expect, test } from "@playwright/test";

const routesToSmoke = ["/", "/summarizer-qa", "/ai-pdf-to-mcq", "/ai-interview-generator", "/pdf-editor", "/tools", "/merge", "/split"];

for (const route of routesToSmoke) {
  test(`blank-page prevention smoke on ${route}`, async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    await expect(page.locator("#root")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("App failed to load");
    await expect(page.locator("body")).not.toContainText("Failed to Load");

    const rootText = await page.locator("#root").innerText();
    expect(rootText.trim().length).toBeGreaterThan(20);

    // We allow noisy third-party ad errors; these indicate rendering-crash risk.
    const criticalErrors = pageErrors.filter(
      (m) =>
        !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(m)
    );

    expect(criticalErrors, `Critical runtime errors on ${route}`).toEqual([]);
  });
}
