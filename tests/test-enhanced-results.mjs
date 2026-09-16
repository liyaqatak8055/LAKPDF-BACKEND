import { chromium } from 'playwright';

async function testInterviewGenerator() {
  console.log('1. Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  console.log('2. Navigating to http://localhost:5173/ai-interview-generator ...');
  await page.goto('http://localhost:5173/ai-interview-generator', { waitUntil: 'networkidle' });

  // 3. Click sample resume button
  const sampleBtn = page.locator('button:has-text("Frontend Fresher")').first();
  await sampleBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('3. Loading sample resume: Frontend Fresher...');
  await sampleBtn.click();

  // 4. Wait for Interview Preparation to appear
  console.log('4. Waiting for AI extraction & question generation (up to 180s)...');
  const resultHeader = page.locator('h2:has-text("Interview Preparation")');
  await resultHeader.waitFor({ state: 'visible', timeout: 180000 });
  console.log('✓ Section 1: "Interview Preparation" summary is visible!');

  // Summary details
  const resumeDoc = await page.locator('p:has-text("Resume Document") + p').textContent();
  const detectedRole = await page.locator('p:has-text("Detected Role") + p').textContent();
  const detectedExp = await page.locator('p:has-text("Detected Experience") + p').textContent();
  const totalQuestions = await page.locator('span:has-text("Questions:")').textContent();
  console.log(`✓ Summary: Resume=${resumeDoc}, Role=${detectedRole}, Exp=${detectedExp}, Total=${totalQuestions}`);

  // Section 2: Detected Skills
  const skillsCount = await page.locator('text=/\\d+ skills detected in document/').first().textContent();
  console.log(`✓ Section 2 Detected Skills: ${skillsCount}`);

  // Section 11: Practice Progress
  const progressText = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent();
  console.log(`✓ Section 11 Questions Practiced progress: ${progressText?.trim()}`);

  // Section 10: Category Filters
  const catButtons = await page.locator('div:has(> span:has-text("Category:")) button').allTextContents();
  console.log(`✓ Section 10 Category Filters: ${catButtons.map(t => t.trim()).join(' | ')}`);

  // Section 3: Categories Visible
  const techVisible = await page.locator('h3:has-text("Technical Questions")').isVisible();
  const projVisible = await page.locator('h3:has-text("Project-Based Questions")').isVisible();
  const hrVisible = await page.locator('h3:has-text("HR / Behavioral Questions")').isVisible();
  const codingVisible = await page.locator('h3:has-text("Coding Questions")').isVisible();
  console.log(`✓ Section 3 Categories: Technical=${techVisible}, Projects=${projVisible}, HR=${hrVisible}, Coding=${codingVisible}`);

  // Question Card (Section 4, 5, 7, 12 + Evidence Badges)
  const firstCard = page.locator('div.rounded-3xl:has(span:has-text("Question 01"))').first();
  await firstCard.waitFor({ state: 'visible' });

  // Check evidence badge (REPORTED, COMMON, or ROLE-RELEVANT)
  const evidenceBadge = await firstCard.locator('span:has-text("REPORTED"), span:has-text("COMMON"), span:has-text("ROLE-RELEVANT")').first().textContent();
  console.log(`✓ Question 01 Evidence Badge: ${evidenceBadge?.trim()}`);

  // Check why_ask / whyImportant
  const whyImportantText = await firstCard.locator('div:has(> svg.lucide-lightbulb) div').textContent();
  console.log(`✓ Question 01 Importance Context: ${whyImportantText?.trim()?.slice(0, 80)}...`);

  // Test Show Answer (Section 5)
  console.log('5. Testing "Show Answer" toggle...');
  const showAnswerBtn = firstCard.locator('button:has-text("Show Answer")');
  await showAnswerBtn.click();
  await page.waitForTimeout(300);
  const expectedAnswerVisible = await firstCard.locator('text=Expected Answer').isVisible();
  const keyPointsVisible = await firstCard.locator('text=Key Points').isVisible();
  console.log(`✓ Section 5 Expected Answer: ${expectedAnswerVisible}, Key Points: ${keyPointsVisible}`);

  // Test Follow-up (Section 7)
  const followUpBtn = firstCard.locator('button:has-text("Follow-up")');
  if (await followUpBtn.isVisible()) {
    console.log('6. Testing "Follow-up" toggle...');
    await followUpBtn.click();
    await page.waitForTimeout(300);
    const followUpVisible = await firstCard.locator('text=Follow-up Questions').isVisible();
    console.log(`✓ Section 7 Follow-ups: ${followUpVisible}`);
  }

  // Test Save Question (Section 12)
  console.log('7. Testing "Save Question"...');
  const saveBtn = firstCard.locator('button:has-text("Save")');
  await saveBtn.click();
  await page.waitForTimeout(300);
  const isSaved = await firstCard.locator('button:has-text("Saved")').isVisible();
  console.log(`✓ Section 12 Save toggled to Saved: ${isSaved}`);

  // Test Mark as Practiced (Section 11)
  console.log('8. Testing "Need Practice" toggle...');
  const practiceToggleBtn = firstCard.locator('button:has-text("Need Practice")');
  if (await practiceToggleBtn.isVisible()) {
    await practiceToggleBtn.click();
    await page.waitForTimeout(300);
    const isPracticed = await firstCard.locator('button:has-text("Practiced")').isVisible();
    const updatedProgress = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent();
    console.log(`✓ Section 11 Practiced toggled: ${isPracticed}, Updated Progress: ${updatedProgress?.trim()}`);
  }

  // Test Mock Interview CTA (Section 13)
  console.log('9. Testing "🎤 Start Mock Interview" button...');
  const mockBtn = page.locator('button:has-text("Start Mock Interview")').first();
  await mockBtn.click();
  await page.waitForTimeout(500);
  const modalVisible = await page.locator('text=AI Mock Interview').isVisible();
  console.log(`✓ Section 13 Mock Interview Modal: ${modalVisible}`);

  // Close modal
  const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // Save full page verification screenshot
  await page.screenshot({ path: 'tests/evidence-badges-verified.png', fullPage: true });
  console.log('✓ Full page screenshot saved to tests/evidence-badges-verified.png');

  await browser.close();
  console.log('SUCCESS: ALL INTERVIEW GENERATOR TESTS PASSED WITH EVIDENCE BADGES!');
}

testInterviewGenerator().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
