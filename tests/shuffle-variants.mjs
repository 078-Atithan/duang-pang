// Optional browser regression for the five shuffle styles and temporary stardust.
// Set PLAYWRIGHT_MODULE to an installed module and TEST_URL to a running server.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = new URL('./.artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const expectedStyles = ['overhand', 'riffle', 'hindu', 'strip', 'weave'];
const errors = [];
const report = { runs: [], reducedMotion: [], aborted: [], compactFan: null };

async function prepare(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.goto(base);
  await page.locator('label:has(input[name="topic"][value="love"])').click();
  await page.locator('#continue-button').click();
  await page.locator('#question').fill('How can I build a caring connection?');
  await page.locator('#continue-button').click();
  await page.locator('#continue-button').click();
  await page.locator('#name').fill('Alex');
  await page.locator('#continue-button').click();
  await page.locator('.deck-stage.stacked').waitFor();
  const contract = await page.evaluate(async () => {
    window.__shuffleModule = await import('/js/effects.js');
    window.__shuffleTemplate = document.querySelector('.deck-stage').cloneNode(true);
    return { duration: window.__shuffleModule.SHUFFLE_DURATION, styles: window.__shuffleModule.SHUFFLE_STYLES };
  });
  assert.equal(contract.duration, 1900, 'All styles share the documented shuffle duration');
  assert.deepEqual(contract.styles, expectedStyles);
}

async function resetStage(page) {
  await page.evaluate(() => {
    document.querySelector('.deck-stage').replaceWith(window.__shuffleTemplate.cloneNode(true));
  });
  await page.locator('.deck-stage').scrollIntoViewIfNeeded();
}

async function beginShuffle(page, style, { abortAfter } = {}) {
  return page.evaluate(({ style, abortAfter }) => {
    const stage = document.querySelector('.deck-stage');
    const controller = new AbortController();
    const started = performance.now();
    const result = { style, duration: 0, maxParticles: 0, samples: 0, completion: 'pending', frames: [] };
    window.__shuffleStarted = started;
    const styleBefore = getComputedStyle(stage);
    result.background = { color: styleBefore.backgroundColor, image: styleBefore.backgroundImage, shadow: styleBefore.boxShadow };
    let frame;
    const sample = () => {
      result.samples += 1;
      result.maxParticles = Math.max(result.maxParticles, stage.querySelector('.shuffle-magic')?.childElementCount || 0);
      result.frames.push({ at: performance.now() - started, cards: [...stage.querySelectorAll('.deck-card')].map((card) => {
        const rect = card.getBoundingClientRect();
        return [rect.x + rect.width / 2, rect.y + rect.height / 2];
      }) });
      if (result.completion === 'pending') frame = requestAnimationFrame(sample);
    };
    const pending = window.__shuffleModule.shuffleIntoFan(stage, controller.signal, { style });
    result.styleId = stage.dataset.shuffleStyle;
    result.nominalDurations = [...stage.querySelectorAll('.deck-card')].flatMap((card) => card.getAnimations()
      .filter((animation) => !(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition))
      .map((animation) => animation.effect.getTiming().duration));
    sample();
    const abortTimer = abortAfter === undefined ? null : setTimeout(() => controller.abort(), abortAfter);
    window.__shuffleRun = pending.then(() => { result.completion = 'fulfilled'; }, (error) => { result.completion = error.name; }).then(() => {
      clearTimeout(abortTimer);
      cancelAnimationFrame(frame);
      sample(); // Include the handoff to the final CSS fan pose.
      result.duration = performance.now() - started;
      result.layersAfter = stage.querySelectorAll('.shuffle-magic').length;
      result.animationsAfter = stage.getAnimations({ subtree: true }).length;
      result.finalPhase = stage.className;
      result.cardsAfter = stage.querySelectorAll('.deck-card').length;
      return result;
    });
    return { nominalDurations: result.nominalDurations, styleId: result.styleId };
  }, { style, abortAfter });
}

function assertClean(result) {
  assert.equal(result.layersAfter, 0, `${result.style}: temporary effects must clear`);
  assert.equal(result.animationsAfter, 0, `${result.style}: no orphaned card or particle animations`);
  assert.equal(result.cardsAfter, 12, `${result.style}: the 12-card deck remains intact`);
  assert.ok(result.maxParticles <= 10, `${result.style}: too many simultaneous particles (${result.maxParticles})`);
  assert.deepEqual(result.background, { color: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none' }, 'The deck remains transparent');
}

function assertTrajectory(result) {
  const { frames } = result;
  assert.ok(frames.length > 25, 'Sample the entire card movement, including the final fan handoff');
  let maxFrameStep = 0;
  for (let index = 1; index < frames.length; index += 1) {
    const elapsed = frames[index].at - frames[index - 1].at;
    if (elapsed > 40) continue; // A stalled test runner is not a teleport.
    frames[index].cards.forEach((point, cardIndex) => {
      const previous = frames[index - 1].cards[cardIndex];
      maxFrameStep = Math.max(maxFrameStep, Math.hypot(point[0] - previous[0], point[1] - previous[1]));
    });
  }
  assert.ok(maxFrameStep < 55, `${result.style}: a card jumped ${maxFrameStep.toFixed(1)}px between frames`);

  // At 420ms both source packets are set. Each card should then leave that pose
  // on its own, before the common square-up/fan phase. Inspect rendered centers
  // rather than mirroring the implementation's keyframes or release ordering.
  const baseline = frames.reduce((best, frame) => Math.abs(frame.at - 420) < Math.abs(best.at - 420) ? frame : best);
  assert.ok(Math.abs(baseline.at - 420) < 35, 'Sample the source packets before individual card transfers');
  const departureTimes = baseline.cards.map((origin, cardIndex) => frames.find((frame) => frame.at > baseline.at && frame.at <= 1150
    && Math.hypot(frame.cards[cardIndex][0] - origin[0], frame.cards[cardIndex][1] - origin[1]) > 8)?.at);
  assert.ok(departureTimes.every(Number.isFinite), `${result.style}: each card must visibly leave its source packet`);
  const ordered = [...departureTimes].sort((a, b) => a - b);
  const groups = ordered.reduce((distinct, time) => {
    if (!distinct.length || time - distinct.at(-1) >= 20) distinct.push(time);
    return distinct;
  }, []);
  assert.ok(groups.length >= 6, `${result.style}: cards moved in only ${groups.length} synchronized groups`);
  const departureSpan = ordered.at(-1) - ordered[0];
  assert.ok(departureSpan >= 220, `${result.style}: transfers should visibly proceed through the deck, span was ${departureSpan.toFixed(1)}ms`);
  return { sampledFrames: frames.length, maxFrameStep, departureTimes, departureGroups: groups.length, departureSpan };
}

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'no-preference' });
    await prepare(page);
    for (const style of expectedStyles) {
      await resetStage(page);
      const initial = await beginShuffle(page, style);
      assert.equal(initial.styleId, style, 'The requested shuffle style is selected');
      assert.equal(initial.nominalDurations.length, 12, 'Each card owns exactly one continuous shuffle animation');
      assert.ok(initial.nominalDurations.every((duration) => duration === 1900), 'Every card uses the same 1900ms duration');
      // Two moving frames show individual card transfers, then the common fan handoff.
      await page.waitForTimeout(650);
      await page.locator('.deck-stage').screenshot({ path: fileURLToPath(new URL(`shuffle-${style}-${width}.png`, output)), animations: 'allow' });
      await page.waitForFunction(() => performance.now() - window.__shuffleStarted >= 1100);
      await page.locator('.deck-stage').screenshot({ path: fileURLToPath(new URL(`shuffle-${style}-${width}-late.png`, output)), animations: 'allow' });
      const result = await page.evaluate(() => window.__shuffleRun);
      assert.equal(result.completion, 'fulfilled');
      assert.match(result.finalPhase, /\bfanned\b/);
      assert.ok(result.duration >= 1750 && result.duration < 3500, `${style}: unexpected wall-clock duration ${result.duration}ms`);
      assertClean(result);
      result.trajectory = assertTrajectory(result);
      delete result.frames;
      report.runs.push({ width, ...result });
    }

    if (width === 390) {
      await page.setViewportSize({ width: 320, height: 844 });
      const bounds = await page.evaluate(() => ({
        viewport: innerWidth, fullWidth: document.documentElement.scrollWidth,
        cards: [...document.querySelectorAll('.deck-card')].map((card) => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      }));
      assert.ok(bounds.fullWidth <= 321, 'No horizontal overflow at 320px');
      assert.ok(bounds.cards.every((card) => card.left >= -1 && card.right <= 321), 'Every fanned card fits the compact viewport');
      report.compactFan = bounds;
      await page.setViewportSize({ width, height: 844 });
    }

    await resetStage(page);
    await beginShuffle(page, 'hindu', { abortAfter: 600 });
    const aborted = await page.evaluate(() => window.__shuffleRun);
    assert.equal(aborted.completion, 'AbortError');
    assert.ok(aborted.duration < 1600, 'Abort promptly interrupts the shuffle');
    assertClean(aborted);
    delete aborted.frames;
    report.aborted.push({ width, ...aborted });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const style of expectedStyles) {
      await resetStage(page);
      const initial = await beginShuffle(page, style);
      assert.deepEqual(initial.nominalDurations, [], 'Reduced motion does not start card animations');
      const result = await page.evaluate(() => window.__shuffleRun);
      assert.equal(result.completion, 'fulfilled');
      assert.match(result.finalPhase, /\bfanned\b/);
      assert.equal(result.maxParticles, 0, 'Reduced motion does not create particles');
      assert.ok(result.duration < 150, 'Reduced motion opens the fan immediately');
      assertClean(result);
      delete result.frames;
      report.reducedMotion.push({ width, ...result });
    }
    await page.close();
  }
  assert.deepEqual(errors, [], 'No browser exceptions');
  await writeFile(new URL('shuffle-variants-report.json', output), `${JSON.stringify(report, null, 2)}\n`);
  console.log('Shuffle variants passed: five physical styles at desktop/mobile, individually staggered card transfers, continuous movement into the fan, common 1900ms duration, bounded particles, transparent stage, cleanup, reduced motion, and abort handling.');
} finally {
  await browser.close();
}
