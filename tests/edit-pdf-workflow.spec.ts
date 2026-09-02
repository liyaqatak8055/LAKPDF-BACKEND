import path from "node:path";
import { expect, test } from "@playwright/test";

test("pdf editor upload and render workflow", async ({ page }) => {
  const pageErrors: string[] = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  await page.goto("/pdf-editor", { waitUntil: "domcontentloaded" });
  await expect(page.locator("p", { hasText: "Select PDF" }).first()).toBeVisible();

  const samplePdf = path.join(process.cwd(), "tmp", "sample.pdf");
  await page.setInputFiles('input[type="file"][accept="application/pdf"]', samplePdf);

  await expect(page.locator("canvas")).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible({ timeout: 25_000 });

  const criticalErrors = pageErrors.filter(
    (m) =>
      !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(
        m
      )
  );

  expect(criticalErrors).toEqual([]);
});
