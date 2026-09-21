import { test, expect } from '@playwright/test';

test('AI Interview Generator Result Section Enhancement Verification', async ({ page }) => {
  // 1. Navigate to tool
  await page.goto('/ai-interview-generator', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toContainText('AI Interview Generator');

  // 2. Select a sample resume to trigger generation
  const sampleBtn = page.locator('button:has-text("Frontend Fresher")').first();
  await expect(sampleBtn).toBeVisible({ timeout: 15000 });
  await sampleBtn.click();

  // 3. Wait for processing stages to complete and results to render
  await expect(page.locator('h2:has-text("Interview Preparation")')).toBeVisible({ timeout: 35000 });

  // 4. Verify Section 1: Interview Summary
  await expect(page.locator('text=Resume Document')).toBeVisible();
  await expect(page.locator('text=Detected Role')).toBeVisible();
  await expect(page.locator('text=Detected Experience')).toBeVisible();
  await expect(page.locator('text=/Questions: \\d+/')).toBeVisible();

  // 5. Verify Section 2: Detected Skills
  await expect(page.locator('h3:has-text("Detected Skills")')).toBeVisible();
  const skillPills = page.locator('div:has(h3:has-text("Detected Skills")) span.rounded-xl');
  expect(await skillPills.count()).toBeGreaterThan(0);

  // 6. Verify Section 11: Practice Progress
  await expect(page.locator('h3:has-text("Questions Practiced")')).toBeVisible();
  await expect(page.locator('text=/\\d+\\s*\\/\\s*\\d+/')).toBeVisible();

  // 7. Verify Section 10: Question Filters
  await expect(page.locator('input[placeholder="Search questions..."]')).toBeVisible();
  await expect(page.locator('button:has-text("All")').first()).toBeVisible();
  await expect(page.locator('button:has-text("Technical")')).toBeVisible();
  await expect(page.locator('button:has-text("Projects")')).toBeVisible();
  await expect(page.locator('button:has-text("HR")')).toBeVisible();

  // 8. Verify Section 3: Questions by Category
  await expect(page.locator('h3:has-text("Technical Questions")')).toBeVisible();
  await expect(page.locator('h3:has-text("Project-Based Questions")')).toBeVisible();
  await expect(page.locator('h3:has-text("HR / Behavioral Questions")')).toBeVisible();

  // If candidate has coding skills, verify Coding Questions section
  const codingHeader = page.locator('h3:has-text("Coding Questions")');
  if (await codingHeader.isVisible()) {
    console.log('Verified Coding Questions section is visible');
  }

  // 9. Verify Question Card (Section 4, 5, 7, 12)
  const firstCard = page.locator('div.rounded-3xl:has(span:has-text("Question 01"))').first();
  await expect(firstCard).toBeVisible();

  // Verify initial answer is hidden
  await expect(firstCard.locator('text=Expected Answer')).not.toBeVisible();

  // Click "Show Answer"
  const showAnswerBtn = firstCard.locator('button:has-text("Show Answer")');
  await showAnswerBtn.click();
  await expect(firstCard.locator('text=Expected Answer')).toBeVisible();
  await expect(firstCard.locator('text=Key Points')).toBeVisible();

  // Click "Follow-up" if available
  const followUpBtn = firstCard.locator('button:has-text("Follow-up")');
  if (await followUpBtn.isVisible()) {
    await followUpBtn.click();
    await expect(firstCard.locator('text=Follow-up Questions')).toBeVisible();
  }

  // Click Save button
  const saveBtn = firstCard.locator('button:has-text("Save")');
  await saveBtn.click();
  await expect(firstCard.locator('button:has-text("Saved")')).toBeVisible();

  // Click Practiced toggle and verify progress updates
  const needPracticeBtn = firstCard.locator('button:has-text("Need Practice")');
  if (await needPracticeBtn.isVisible()) {
    await needPracticeBtn.click();
    await expect(firstCard.locator('button:has-text("Practiced")')).toBeVisible();
  }

  // 10. Verify Section 13: Start Mock Interview CTA
  const mockBtn = page.locator('button:has-text("Start Mock Interview")').first();
  await expect(mockBtn).toBeVisible();
  await mockBtn.click();

  // Verify modal opened
  await expect(page.locator('text=AI Mock Interview')).toBeVisible({ timeout: 5000 });
  const closeBtn = page.locator('button[title="Exit Interview"], button:has-text("Cancel"), button svg.lucide-x').first();
  await closeBtn.click();

  // Screenshot the final enhanced result page
  await page.screenshot({ path: 'tests/interview-result-verified.png', fullPage: true });
  console.log('Saved verification screenshot to tests/interview-result-verified.png');
});
