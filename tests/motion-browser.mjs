// Optional browser regression for the magical theme and the complete draw/reveal motion.
// PLAYWRIGHT_MODULE may reference an existing Playwright module; TEST_URL selects the server.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = new URL('./.artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const report = { flows: [], responsive: [] };
const errors = [];
const screenshot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`magical-${name}.png`, output)) });

async function settleHero(page) {
  // Wait for the entrance, retaining the ongoing shimmer and levitation.
  await page.locator('.hero').evaluate((hero) => Promise.all(hero.getAnimations({ subtree: true })
    .filter((animation) => Number.isFinite(animation.effect.getTiming().iterations))
    .map((animation) => animation.finished.catch(() => {}))));
}

function watchErrors(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => {
    errors.push(`Unexpected dialog: ${dialog.message()}`);
    dialog.dismiss();
  });
  page.setDefaultTimeout(15000);
}

async function noOverflow(page, state) {
  const dimensions = await page.evaluate(() => ({ full: document.documentElement.scrollWidth, view: innerWidth }));
  assert.ok(dimensions.full <= dimensions.view + 1, `Overflow in ${state}: ${JSON.stringify(dimensions)}`);
  report.responsive.push({ state, ...dimensions });
}

async function responsive(page, state) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await noOverflow(page, `${state}-${width}`);
    const navSizes = await page.locator('.main-nav a').evaluateAll((links) => links.map((link) => parseFloat(getComputedStyle(link).fontSize)));
    assert.ok(navSizes.length > 0 && navSizes.every((size) => size >= 14), `Navigation text must be at least 14px at ${width}: ${navSizes}`);
  }
}

async function startReading(page, count) {
  const next = () => page.locator('#continue-button').click();
  await page.locator('label:has(input[name="topic"][value="love"])').click();
  await next();
  await page.locator('#question').fill('How can I approach someone I like with kindness?');
  await next();
  if (count === 4) await page.locator('label:has(input[name="count"][value="4"])').click();
  await next();
  await page.locator('#name').fill('Alex');
  await next();
  await page.locator('.deck-stage.stacked').waitFor();
  assert.equal(await page.locator('.deck-card').count(), 12);
  const deckStyle = await page.locator('.deck-stage').evaluate((stage) => ({ background: getComputedStyle(stage).backgroundColor, image: getComputedStyle(stage).backgroundImage, shadow: getComputedStyle(stage).boxShadow }));
  assert.deepEqual(deckStyle, { background: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none' }, 'The deck has no background panel');
  assert.equal(await page.locator('.cosmic-sky, .ritual-orbit, .ritual-stars').count(), 0);
  assert.equal(await page.locator('.shuffle-magic').count(), 0, 'The deck is undecorated while idle');
}

async function draw(page, count, reduced, capture) {
  const original = await page.locator('.deck-card').first().elementHandle();
  const sameDeck = async () => assert.ok(await original.evaluate((card) => card.isConnected && card === document.querySelector('.deck-card')), 'The deck must retain its DOM identity during shuffle and draw');
  if (!reduced) await page.evaluate(() => {
    window.__shuffleFrames = [];
    window.__sampleShuffle = true;
    const sample = (at) => {
      const stage = document.querySelector('.deck-stage');
      window.__shuffleFrames.push({ at, phase: stage?.className, cards: [...stage.querySelectorAll('.deck-card')].map((card) => {
        const rect = card.getBoundingClientRect();
        return [rect.x + rect.width / 2, rect.y + rect.height / 2];
      }) });
      if (window.__sampleShuffle) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  // Two synchronous clicks exercise the event guard without Playwright waiting for a
  // disabled button to become enabled and unintentionally starting a second action.
  await page.locator('[data-action="shuffle"]').evaluate((button) => { button.click(); button.click(); });
  if (!reduced) {
    await page.locator('.deck-stage.shuffling').waitFor();
    await page.locator('.shuffle-magic').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.deck-card:not(:disabled)').count(), 0);
    assert.ok(await page.locator('#language-toggle').isDisabled());
  }
  await page.locator('.deck-stage.fanned').waitFor();
  await page.locator('.deck-stage.fanned .deck-card:not(:disabled)').first().waitFor();
  await sameDeck();
  assert.equal(await page.locator('.shuffle-magic').count(), 0, 'Shuffle effects clear before selection');
  if (!reduced) {
    // Capture the handoff frame as well. Test visible geometry, not keyframe syntax.
    const frames = await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
      window.__sampleShuffle = false; resolve(window.__shuffleFrames);
    })));
    let maxStep = 0;
    for (let i = 1; i < frames.length; i += 1) {
      const elapsed = frames[i].at - frames[i - 1].at;
      if (elapsed > 40) continue; // A stalled test runner is not a visual teleport.
      for (let j = 0; j < 12; j += 1) maxStep = Math.max(maxStep, Math.hypot(frames[i].cards[j][0] - frames[i - 1].cards[j][0], frames[i].cards[j][1] - frames[i - 1].cards[j][1]));
    }
    assert.ok(frames.length > 8, 'Sample the whole shuffle transition');
    assert.ok(maxStep < 65, 'Cards must not jump between shuffle and fan: ' + maxStep);
    report.shuffleContinuity = { frames: frames.length, maxStep };
  }
  if (capture) {
    await responsive(page, 'fan');
    await page.locator('.deck-stage').scrollIntoViewIfNeeded();
    await screenshot(page, 'deck-fan');
  }

  for (let index = 0; index < count; index += 1) {
    const card = page.locator(`[data-card-index="${11 - index}"]`);
    await card.focus();
    if (index === 0) {
      // Keyboard selection checks accessibility when overlapping cards hide their centers.
      await card.press('Enter');
      if (!reduced) await card.evaluate((button) => button.click());
    } else {
      await card.evaluate((button, doubleClick) => { button.click(); if (doubleClick) button.click(); }, !reduced);
    }
    if (!reduced) {
      await page.locator('.deck-stage.drawing').waitFor();
      assert.equal(await page.locator('.deck-card:not(:disabled)').count(), 0);
      assert.ok(await page.locator('#language-toggle').isDisabled());
      await sameDeck();
    }
    await page.waitForFunction((chosen) => document.querySelectorAll('.slot-card img').length === chosen, index + 1);
    if (index < count - 1) {
      // Selecting a card must automatically blend into the next fan without a new click.
      await page.locator('.deck-stage.fanned').waitFor();
      await page.locator('.deck-stage.fanned .deck-card:not(:disabled)').first().waitFor();
      await sameDeck();
      assert.equal(await page.locator('.deck-card').count(), 12);
      assert.equal(await page.locator('.slot-card img').count(), index + 1, 'Double click must not select a second card');
    }
  }
  await page.locator('[data-action="reveal"]').waitFor();
  assert.equal(await page.locator('.slot-card img').count(), count);
  assert.equal(await page.locator('.result-card').count(), 0, 'Cards remain hidden until reveal');
  await original.dispose();
}

async function recordReveals(page) {
  // Observe DOM changes instead of asserting on a single race-prone animation frame.
  await page.evaluate(() => {
    window.__motionSnapshots = [];
    window.__motionInitial = null;
    let lastSignature = '';
    window.__motionObserver = new MutationObserver(() => {
      const cards = [...document.querySelectorAll('.result-card')];
      if (!cards.length) return;
      const snapshot = cards.map((card) => {
        const inner = card.querySelector('.reveal-inner');
        const copy = card.querySelector('.result-copy');
        return { revealed: card.classList.contains('is-revealed'), inert: copy?.inert, hidden: copy?.getAttribute('aria-hidden'), transform: inner ? getComputedStyle(inner).transform : null };
      });
      if (!window.__motionInitial) window.__motionInitial = snapshot;
      const signature = JSON.stringify(snapshot.map(({ revealed, inert, hidden }) => ({ revealed, inert, hidden })));
      if (signature !== lastSignature) {
        window.__motionSnapshots.push({ at: performance.now(), cards: snapshot });
        lastSignature = signature;
      }
    });
    window.__motionObserver.observe(document.querySelector('#results-content'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'inert', 'aria-hidden'] });
  });
}

async function reveal(page, count, reduced, capture) {
  await recordReveals(page);
  await page.locator('[data-action="reveal"]').evaluate((button) => { button.click(); button.click(); });
  await page.locator('.result-card').first().waitFor();
  assert.equal(await page.locator('.result-card').count(), count);
  assert.equal(new Set(await page.locator('.result-card .card-name').allTextContents()).size, count, 'Each selected card must be unique');
  assert.equal(await page.locator('.result-art .reveal-inner').count(), count);
  if (reduced) await page.waitForFunction((total) => document.querySelectorAll('.result-card.is-revealed').length === total, count, { timeout: 1000 });

  if (capture) {
    await page.locator('.result-card').first().scrollIntoViewIfNeeded();
    await screenshot(page, 'reveal-initial');
  }
  // IntersectionObserver starts the reveal as each result becomes visible, so the
  // mobile reading must scroll through its cards rather than wait offscreen forever.
  for (let index = 0; index < count; index += 1) {
    const card = page.locator('.result-card').nth(index);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction((position) => document.querySelectorAll('.result-card')[position]?.classList.contains('is-revealed'), index);
    assert.equal(await card.locator('.result-copy').evaluate((copy) => copy.inert), false);
    assert.notEqual(await card.locator('.result-copy').getAttribute('aria-hidden'), 'true');
    const frontFacesUser = await card.locator('.reveal-inner').evaluate((inner) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(inner).transform);
      return matrix.m11 < -0.95 && matrix.m33 < -0.95;
    });
    assert.ok(frontFacesUser, `Card ${index + 1} must finish facing the user`);
  }

  const observations = await page.evaluate(() => {
    window.__motionObserver.disconnect();
    return { initial: window.__motionInitial, snapshots: window.__motionSnapshots };
  });
  assert.ok(observations.initial?.length === count, 'Initial reveal state was observed');
  if (!reduced) {
    assert.ok(observations.initial.every((card) => !card.revealed && card.inert && card.hidden === 'true'), 'Every result starts face down with its copy unavailable');
    assert.ok(observations.snapshots.some(({ cards }) => cards.some((card) => card.revealed) && cards.some((card) => !card.revealed)), 'Card completion must be staggered');
    for (const snapshot of observations.snapshots) {
      assert.ok(snapshot.cards.every((card) => card.revealed || (card.inert && card.hidden === 'true')), 'Unrevealed card text must remain inert and hidden from assistive technology');
    }
  }
  report.flows.push({ count, reducedMotion: reduced, ...observations });
  if (capture) {
    await responsive(page, 'results');
    await page.locator('.result-card').first().scrollIntoViewIfNeeded();
    await screenshot(page, 'results-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.result-card').first().scrollIntoViewIfNeeded();
    await screenshot(page, 'results-mobile');
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  watchErrors(page);
  // Keep this test deterministic even after the owner supplies real card art.
  await page.route('**/assets/images/tarot/*.jpg', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto(base);
  await page.locator('.topic-grid').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.hero-card.is-awaiting-art').length === 3);
  assert.deepEqual((await page.locator('.hero-card-image').evaluateAll((images) => images.map((image) => new URL(image.src).pathname.split('/').pop()))).sort(), ['m17.jpg', 'm18.jpg', 'm19.jpg']);
  assert.equal(await page.locator('.hero-card-back').count(), 3);
  assert.ok(await page.locator('.hero-card-back').evaluateAll((images) => images.every((image) => getComputedStyle(image).display !== 'none' && getComputedStyle(image).visibility !== 'hidden' && parseFloat(getComputedStyle(image).opacity) > 0)), 'Missing artwork must show the decorative card backs');
  await responsive(page, 'hero');
  await page.evaluate(() => scrollTo(0, 0));
  await settleHero(page);
  await screenshot(page, 'hero-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, 'hero-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await startReading(page, 3);
  await draw(page, 3, false, true);
  await reveal(page, 3, false, true);
  await page.locator('[data-action="restart"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await startReading(page, 4);
  await draw(page, 4, false, false);
  await noOverflow(page, 'four-card-ready-mobile');
  await reveal(page, 4, false, false);
  await noOverflow(page, 'four-card-results-mobile');
  await page.close();

  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  watchErrors(reduced);
  // A valid SVG served for the expected JPG paths verifies the supplied-art branch
  // without bundling third-party tarot artwork in the repository.
  const image = await readFile(new URL('../assets/card-back.svg', import.meta.url));
  await reduced.route('**/assets/images/tarot/*.jpg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: image }));
  await reduced.goto(base);
  await reduced.locator('.topic-grid').waitFor();
  await reduced.waitForFunction(() => [...document.querySelectorAll('.hero-card-image')].length === 3 && [...document.querySelectorAll('.hero-card-image')].every((item) => item.complete && item.naturalWidth > 0));
  assert.equal(await reduced.locator('.hero-card.is-awaiting-art').count(), 0, 'Supplied tarot images must replace card-back placeholders');
  await startReading(reduced, 3);
  await draw(reduced, 3, true, false);
  await reveal(reduced, 3, true, false);
  assert.equal(await reduced.locator('.result-card.is-revealed').count(), 3, 'Reduced motion completes all reveals without waiting for scrolling');
  await noOverflow(reduced, 'reduced-results-mobile');
  await reduced.close();

  // Validate owner-supplied scans when the complete deck is present, using the
  // real server and browser decoders rather than mocked image responses.
  const { cards } = JSON.parse(await readFile(new URL('../assets/data/tarot-images.json', import.meta.url), 'utf8'));
  const files = new Set(await readdir(new URL('../assets/images/tarot/', import.meta.url)));
  const missing = cards.filter((card) => !files.has(card.img)).map((card) => card.img);
  report.realArtwork = { available: missing.length === 0, missing };
  if (!missing.length) {
    const real = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    watchErrors(real);
    await real.goto(base);
    await real.locator('.topic-grid').waitFor();
    report.realArtwork.images = await real.evaluate(async (filenames) => Promise.all(filenames.map(async (filename) => {
      const scan = new Image();
      scan.src = new URL(`./assets/images/tarot/${encodeURIComponent(filename)}`, location.href).href;
      await scan.decode();
      return { filename, width: scan.naturalWidth, height: scan.naturalHeight };
    })), cards.map((card) => card.img));
    assert.equal(report.realArtwork.images.length, 78);
    assert.ok(report.realArtwork.images.every((scan) => scan.width > 0 && scan.height > 0), 'Every supplied tarot image must decode successfully');
    await real.waitForFunction(() => document.querySelectorAll('.hero-card.is-awaiting-art').length === 0);
    await settleHero(real);
    await screenshot(real, 'hero-real');
    await real.setViewportSize({ width: 390, height: 844 });
    await screenshot(real, 'hero-real-mobile');
    await real.locator('.hero-art').screenshot({ path: fileURLToPath(new URL('magical-hero-real-mobile-art.png', output)) });
    await noOverflow(real, 'real-hero-mobile');
    await real.emulateMedia({ reducedMotion: 'reduce' });
    await startReading(real, 3);
    await draw(real, 3, true, false);
    await reveal(real, 3, true, false);
    const resultArt = await real.locator('.result-art [data-card-image]').evaluateAll(async (images) => Promise.all(images.map(async (scan) => {
      await scan.decode();
      return { filename: new URL(scan.src).pathname.split('/').pop(), width: scan.naturalWidth, height: scan.naturalHeight, hidden: scan.hidden };
    })));
    assert.equal(resultArt.length, 3);
    assert.ok(resultArt.every((scan) => !scan.hidden && scan.width > 0 && scan.height > 0), 'Selected results must display the supplied card images');
    report.realArtwork.resultImages = resultArt;
    await real.setViewportSize({ width: 1440, height: 1000 });
    await real.locator('.result-card').first().scrollIntoViewIfNeeded();
    await screenshot(real, 'results-real-desktop');
    await real.setViewportSize({ width: 390, height: 844 });
    await real.locator('.result-card').first().scrollIntoViewIfNeeded();
    await screenshot(real, 'results-real-mobile');
    await noOverflow(real, 'real-results-mobile');
    await real.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('motion-report.json', output), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Motion browser checks passed: persistent shuffle/fan, guarded picks, auto-shuffle, 3/4 unique cards, staggered face-down reveals, inert text, reduced motion, correct hero images/fallbacks, responsive layouts. Real artwork: ${missing.length ? 'not installed; skipped' : 'all 78 images decoded; hero and result displays verified'}.`);
} finally {
  await browser.close();
}
