import { expect, test, type Page } from "@playwright/test";

const AD_ERROR_PATTERN = /adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i;

const seedDashboardStorage = async (page: Page) => {
  await page.addInitScript(() => {
    const now = Date.now();
    const history = [
      {
        id: "h1",
        name: "chapter-notes.pdf",
        type: "application/pdf",
        tool: "merge",
        timestamp: now - 60_000,
        size: 120_000,
      },
      {
        id: "h2",
        name: "assignment-final.pdf",
        type: "application/pdf",
        tool: "compress",
        timestamp: now - 120_000,
        size: 90_000,
      },
    ];

    const favorites = ["merge", "compress"];
    const stats = {
      toolsUsed: 7,
      filesProcessed: 12,
      lastActive: now - 15_000,
    };

    localStorage.setItem("lakpdf_file_history", JSON.stringify(history));
    localStorage.setItem("lakpdf_favorites", JSON.stringify(favorites));
    localStorage.setItem("lakpdf_stats", JSON.stringify(stats));
  });
};

test("dashboard renders with seeded data and no critical runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];

  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  });

  await seedDashboardStorage(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Recent Files", { exact: true })).toBeVisible();
  await expect(page.getByText("Favorite Tools", { exact: true })).toBeVisible();
  await expect(page.getByText("chapter-notes.pdf")).toBeVisible();
  await expect(page.getByText("assignment-final.pdf")).toBeVisible();

  const criticalErrors = pageErrors.filter((m) => !AD_ERROR_PATTERN.test(m));
  expect(criticalErrors, "Critical runtime errors on /dashboard").toEqual([]);
});

for (const hash of ["#activity", "#favorites"]) {
  test(`dashboard hash navigation works for ${hash}`, async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => pageErrors.push(err.message));
    await seedDashboardStorage(page);

    await page.goto(`/dashboard${hash}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1400);

    const targetId = hash.replace("#", "");
    const target = page.locator(`#${targetId}`);
    await expect(target).toBeVisible();

    const isInViewport = await target.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    expect(isInViewport).toBeTruthy();

    const criticalErrors = pageErrors.filter((m) => !AD_ERROR_PATTERN.test(m));
    expect(criticalErrors, `Critical runtime errors on /dashboard${hash}`).toEqual([]);
  });
}
