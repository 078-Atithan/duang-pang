// Optional visual / interaction test. Install Playwright separately to run.
// PLAYWRIGHT_MODULE may point to an already-installed Playwright module URL.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = new URL('./.artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('dialog', (dialog) => { errors.push(`Unexpected dialog: ${dialog.message()}`); dialog.dismiss(); });
const click = (action) => page.locator(`[data-action="${action}"]`).click();
const next = () => page.locator('#continue-button').click();
const choose = (name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();
const noOverflow = async (width) => {
  const dimensions = await page.evaluate(() => ({ full: document.documentElement.scrollWidth, view: window.innerWidth }));
  assert.ok(dimensions.full <= dimensions.view + 1, `Overflow at ${width}: ${JSON.stringify(dimensions)}`);
};
const draw = async (count) => {
  for (let index = 0; index < count; index += 1) {
    if (index === 0) await click('shuffle');
    await page.locator('.deck-stage.fanned .deck-card:not(:disabled)').first().waitFor();
    if (index === 0) await page.locator('[data-card-index="11"]').click();
    else {
      // Overlapping fan cards expose their edge; keyboard users can choose any card.
      const card = page.locator(`[data-card-index="${index + 2}"]`);
      await card.focus(); await card.press('Enter');
    }
    await page.waitForFunction((expected) => document.querySelectorAll('.slot-card img').length === expected, index + 1);
  }
  await page.locator('[data-action="reveal"]').waitFor();
  assert.equal(await page.locator('.result-card').count(), 0, 'No faces appear before reveal');
};

try {
  await page.goto(base);
  await page.locator('.topic-grid').waitFor();
  assert.equal(await page.locator('input[name="topic"]').count(), 8);
  assert.ok(await page.locator('#continue-button').isDisabled());
  await noOverflow(1440);
  await page.screenshot({ path: fileURLToPath(new URL('desktop.png', output)), fullPage: true });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: fileURLToPath(new URL('mobile.png', output)), fullPage: true });
  await page.locator('#language-toggle').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'th');
  await noOverflow(390);
  await page.screenshot({ path: fileURLToPath(new URL('thai-mobile.png', output)), fullPage: true });
  await page.locator('#language-toggle').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await choose('topic', 'career'); await next();
  await page.locator('#question').fill('How can I approach my next project? <img src=x onerror=alert(1)>');
  await next(); await choose('spread', 'clarity'); await next();
  await page.locator('#name').fill('Alex');
  await page.locator('#birthDate').fill('2000-05-18');
  await page.locator('#status').selectOption('single');
  await page.locator('#gender').selectOption('other');
  await page.locator('#career').fill('Designer');
  await next(); await draw(3); await click('reveal');
  await page.locator('.result-card').first().waitFor();
  assert.equal(await page.locator('.result-card').count(), 3);
  assert.equal(new Set(await page.locator('.result-card .card-name').allTextContents()).size, 3);
  assert.equal(await page.locator('.result-question img').count(), 0, 'Question markup is safely escaped');
  await page.locator('#results').scrollIntoViewIfNeeded();
  await page.screenshot({ path: fileURLToPath(new URL('reading.png', output)), fullPage: true });
  const downloaded = page.waitForEvent('download');
  await click('save');
  assert.match((await downloaded).suggestedFilename(), /^duang-pang-reading-.*\.txt$/);
  await page.locator('[data-dialog="privacy"]').click();
  assert.ok(await page.locator('#info-dialog').isVisible());
  await page.keyboard.press('Escape');
  assert.ok(!(await page.locator('#info-dialog').isVisible()));
  await click('restart');
  await page.setViewportSize({ width: 390, height: 844 });
  await choose('topic', 'love'); await next(); await next();
  await choose('count', '4');
  assert.equal(await page.locator('.mini-card').count(), 4);
  await next(); await next();
  await draw(4); await click('reveal');
  assert.equal(await page.locator('.result-card').count(), 4);
  assert.equal(new Set(await page.locator('.result-card .card-name').allTextContents()).size, 4);
  await noOverflow(390);
  await page.screenshot({ path: fileURLToPath(new URL('four-card-mobile.png', output)), fullPage: true });
  await page.locator('#language-toggle').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'th');
  await noOverflow(390);

  assert.deepEqual(await page.locator('.result-role-title').allTextContents(), ['สถานการณ์ปัจจุบัน', 'อุปสรรค', 'คำแนะนำ', 'บทสรุป']);
  assert.equal(await page.locator('.result-role-description').count(), 4);
  assert.ok((await page.locator('.result-role-description').allTextContents()).every((text) => /[\u0E00-\u0E7F]/.test(text)));
  const fonts = await page.evaluate(() => {
    const styles = (selector) => getComputedStyle(document.querySelector(selector));
    return { form: styles('.wizard-heading p').fontFamily, result: styles('.result-copy p').fontFamily, name: styles('.card-name').fontFamily, quote: styles('.reflection-box p').fontFamily, italic: styles('.reflection-box p').fontStyle, tracking: styles('.result-copy h5').letterSpacing };
  });
  assert.equal(fonts.result, fonts.form, 'Thai result body uses the same font as the form');
  assert.equal(fonts.name, fonts.form, 'Thai card names use the shared Thai font');
  assert.equal(fonts.quote, fonts.form, 'Thai reflection prompts use the shared Thai font');
  assert.equal(fonts.italic, 'normal');
  assert.ok(['normal', '0px'].includes(fonts.tracking));
  await page.locator('.result-card').first().screenshot({ path: fileURLToPath(new URL('result-role-thai-mobile.png', output)) });
  const thaiIds = await page.locator('[data-card-image]').evaluateAll((images) => images.map((image) => image.src));
  const thaiCopy = await page.locator('.result-copy, .result-summary').allTextContents();
  assert.ok(thaiCopy.every((text) => /[\u0E00-\u0E7F]/.test(text) && !/[a-z]/i.test(text)), 'Thai results must include Thai names, meanings, reflections, prompts, and summary');
  const thaiDownload = page.waitForEvent('download');
  await click('save');
  const saved = await readFile(await (await thaiDownload).path(), 'utf8');
  assert.match(saved, /ภาษาของคำอ่าน: ไทย/);
  assert.doesNotMatch(saved.replace('DUANG PANG', ''), /[a-z]/i, 'Thai export must also be localized');
  await page.locator('#results').scrollIntoViewIfNeeded();
  await page.screenshot({ path: fileURLToPath(new URL('cosmic-thai-mobile.png', output)), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: fileURLToPath(new URL('cosmic-thai-desktop.png', output)), fullPage: true });
  await page.locator('.result-grid').screenshot({ path: fileURLToPath(new URL('result-roles-thai-desktop.png', output)) });
  await page.locator('#language-toggle').click();
  assert.deepEqual(await page.locator('.result-role-title').allTextContents(), ['Current situation', 'Obstacle', 'Advice', 'Conclusion']);
  await page.locator('.result-grid').screenshot({ path: fileURLToPath(new URL('result-roles-english-desktop.png', output)) });
  assert.deepEqual(await page.locator('[data-card-image]').evaluateAll((images) => images.map((image) => image.src)), thaiIds, 'Switching language must preserve card identity and order');
  assert.ok((await page.locator('.result-copy .card-name').allTextContents()).every((name) => /[a-z]/i.test(name)));
  await page.locator('#language-toggle').click();
  await click('restart');
  await choose('topic', 'love'); await next(); await next(); await next(); await next();
  await draw(3); await click('reveal');
  assert.ok((await page.locator('.result-copy, .result-summary').allTextContents()).every((text) => !/[a-z]/i.test(text)), 'A reading started in Thai must also be fully localized');

  // Mock the optional backend to exercise consent, failure and retry without cost.
  await page.route('**/api/config', (route) => route.fulfill({ json: { mode: 'ai' } }));
  let attempts = 0;
  await page.route('**/api/reading', async (route) => {
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 502, json: { error: 'Test failure' } });
    const input = route.request().postDataJSON();
    await route.fulfill({ json: { mode: 'ai', language: input.language, summary: input.language === 'th' ? 'คำอ่านจำลองภาษาไทยสำหรับทดสอบ' : 'A mocked AI response for interface testing.', cards: input.cardIds.map((img) => ({ img, reflection: input.language === 'th' ? 'คำอ่านตามบริบทของคุณ' : 'A contextual reflection.', prompt: input.language === 'th' ? 'คุณเลือกทำอะไรได้บ้าง?' : 'What can you choose?' })) } });
  });
  await page.reload(); await page.locator('.topic-grid').waitFor();
  await choose('topic', 'daily'); await next(); await next(); await next(); await next();
  await draw(3);
  assert.ok(await page.locator('[data-action="reveal"]').isDisabled());
  await page.locator('input[name="consent"]').check(); await click('reveal');
  await page.locator('.error-message').waitFor();
  assert.equal(await page.locator('.slot-card img').count(), 3);
  await click('reveal'); await page.locator('.result-card').first().waitFor();
  assert.equal(await page.locator('.result-card').count(), 3);
  await click('reveal');
  assert.equal(attempts, 2, 'Viewing an existing reading does not charge again');
  await page.locator('#language-toggle').click();
  await page.locator('[data-action="reading-language"]').waitFor();
  assert.equal(attempts, 2, 'Switching UI language alone must not make a billable request');
  await click('reading-language');
  await page.waitForFunction(() => document.querySelector('.result-summary p').lang === 'th');
  assert.equal(attempts, 3);
  assert.ok((await page.locator('.result-copy, .result-summary').allTextContents()).every((text) => !/[a-z]/i.test(text)));
  await page.locator('#language-toggle').click();
  assert.equal(await page.locator('.result-summary p').getAttribute('lang'), 'en');
  await page.locator('#language-toggle').click();
  assert.equal(await page.locator('.result-summary p').getAttribute('lang'), 'th');
  assert.equal(attempts, 3, 'Completed AI language versions must be cached');
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: desktop/mobile layouts, EN/TH, 3/4 cards, input escaping, downloads, dialogs, AI consent/failure/retry.');
} finally { await browser.close(); }
