// Optional interaction checks for wizard navigation, including keyboard and touch.
// Use PLAYWRIGHT_MODULE for an existing installation and TEST_URL for the preview.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = new URL('./.artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const errors = [];

async function openSpread(context) {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator('label:has(input[name="topic"][value="love"])').click();
  await page.locator('#continue-button').click();
  await page.locator('#question').fill('How can I communicate with kindness?');
  await page.locator('#continue-button').click();
  await page.locator('#stepper').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  return page;
}

async function state(button) {
  return button.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      opacity: getComputedStyle(element, '::before').opacity,
      transform: getComputedStyle(element.querySelector('.step-number')).transform,
      color: getComputedStyle(element).color,
      focusVisible: element.matches(':focus-visible'),
      rect: [bounds.x, bounds.y, bounds.width, bounds.height],
    };
  });
}

async function waitWash(button, opacity) {
  await button.evaluate((element, expected) => new Promise((resolve, reject) => {
    const started = performance.now();
    const poll = () => {
      if (getComputedStyle(element, '::before').opacity === expected) return resolve();
      if (performance.now() - started > 3000) return reject(new Error('Navigation wash did not settle'));
      requestAnimationFrame(poll);
    };
    poll();
  }), String(opacity));
}

function sameBounds(before, after) {
  assert.ok(before.rect.every((value, index) => Math.abs(value - after.rect[index]) < .1), 'Hover must not move or resize navigation panels');
}

try {
  const normal = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await openSpread(normal);
  assert.ok(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches));
  for (const index of [0, 2]) {
    const button = page.locator(`.step-button[data-step="${index}"]`);
    const before = await state(button);
    assert.equal(before.opacity, '0');
    await button.hover();
    await waitWash(button, 1);
    const after = await state(button);
    assert.notEqual(after.transform, 'none', 'Completed and current steps lift their number on hover');
    assert.notEqual(after.color, before.color, 'Hovered labels have a color cue');
    sameBounds(before, after);
    if (index === 2) await page.locator('#stepper').screenshot({ path: fileURLToPath(new URL('stepper-hover.png', output)) });
    await page.mouse.move(0, 0);
    await waitWash(button, 0);
  }

  const future = page.locator('.step-button[data-step="4"]');
  assert.ok(await future.isDisabled());
  const futureBefore = await state(future);
  await future.hover();
  const futureAfter = await state(future);
  assert.equal(futureAfter.opacity, '0');
  assert.equal(futureAfter.transform, 'none');
  assert.equal(futureAfter.color, futureBefore.color);
  sameBounds(futureBefore, futureAfter);

  await page.mouse.move(0, 0);
  await page.locator('.step-button[data-step="0"]').focus();
  await page.keyboard.press('Tab');
  const keyboard = page.locator('.step-button[data-step="1"]');
  await waitWash(keyboard, 1);
  const focused = await state(keyboard);
  assert.ok(focused.focusVisible, 'Keyboard focus uses the same emphasis');
  assert.notEqual(focused.transform, 'none');
  await normal.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const reducedPage = await openSpread(reduced);
  const reducedButton = reducedPage.locator('.step-button[data-step="2"]');
  await reducedButton.hover();
  await waitWash(reducedButton, 1);
  assert.equal((await state(reducedButton)).transform, 'none', 'Reduced motion keeps the static emphasis without movement');
  await reducedPage.locator('.step-button[data-step="0"]').focus();
  await reducedPage.keyboard.press('Tab');
  const reducedFocus = await state(reducedPage.locator('.step-button[data-step="1"]'));
  assert.ok(reducedFocus.focusVisible);
  assert.equal(reducedFocus.transform, 'none');
  await reduced.close();

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touchPage = await openSpread(touch);
  assert.equal(await touchPage.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), false);
  const touchButton = touchPage.locator('.step-button[data-step="2"]');
  await touchButton.tap();
  const tapped = await state(touchPage.locator('.step-button[data-step="2"]'));
  assert.equal(tapped.opacity, '0', 'Touch taps must not leave a sticky hover wash');
  assert.equal(tapped.transform, 'none');
  assert.ok(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await touch.close();

  assert.deepEqual(errors, []);
  console.log('Stepper checks passed: enabled hover, disabled steps, stable geometry, keyboard, reduced motion, and touch.');
} finally {
  await browser.close();
}
