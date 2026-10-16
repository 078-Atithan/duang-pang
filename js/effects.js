// Motion is progressive enhancement. The reading works with reduced motion too.
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const abortError = () => new DOMException('Animation cancelled', 'AbortError');

async function animate(element, keyframes, options, signal) {
  if (signal?.aborted) throw abortError();
  if (reducedMotion() || !element.animate) return;
  // Backwards fill holds the first pose during a delay; otherwise a delayed
  // card flashes in its final CSS pose before its animation even starts.
  const animation = element.animate(keyframes, { ...options, fill: 'both' });
  const cancel = () => animation.cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  try { await animation.finished; }
  catch { throw abortError(); }
  finally { signal?.removeEventListener('abort', cancel); animation.cancel(); }
}

/** A bounded burst: particles remove themselves and never intercept input. */
export function sparkleBurst(host, { x = host.clientWidth / 2, y = host.clientHeight / 2, count = 15 } = {}, signal) {
  if (reducedMotion() || signal?.aborted) return;
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('span');
    particle.className = 'magic-spark'; particle.ariaHidden = 'true';
    particle.textContent = index % 3 ? '✦' : '·';
    particle.style.left = `${x}px`; particle.style.top = `${y}px`;
    const angle = (index / count) * Math.PI * 2;
    const radius = 40 + (index % 4) * 15;
    host.append(particle);
    animate(particle, [
      { transform: 'translate(-50%, -50%) scale(.15)', opacity: 0 },
      { opacity: 1, offset: .15 },
      { transform: `translate(calc(-50% + ${Math.cos(angle) * radius}px), calc(-50% + ${Math.sin(angle) * radius - 15}px)) scale(.1) rotate(100deg)`, opacity: 0 },
    ], { duration: 1000 + (index % 4) * 100, easing: 'cubic-bezier(.15,.6,.25,1)' }, signal)
      .catch(() => {}).finally(() => particle.remove());
  }
}

/** Release a few short-lived motes from the moving card edges, not glued-on stars. */
async function shuffleStardust(stage, cards, routes, signal) {
  if (reducedMotion() || signal?.aborted || !stage.animate) return;
  const layer = document.createElement('div');
  layer.className = 'shuffle-magic'; layer.ariaHidden = 'true';
  stage.append(layer);
  const particles = [];
  let frame = 0;
  const start = performance.now();
  const emit = (index, elapsed, remaining) => {
    // Follow the card currently leaving its packet. Sampling its live matrix
    // keeps the dust attached to an actual edge throughout the transfer.
    const phase = elapsed / SHUFFLE_DURATION;
    const moving = routes.reduce((latest, route, cardIndex) => (
      route.release <= phase && phase < route.release + .20
        && (latest === -1 || route.release > routes[latest].release) ? cardIndex : latest
    ), -1);
    const card = cards[moving === -1 ? cards.length - 1 : moving];
    const style = getComputedStyle(card);
    const [originX, originY] = style.transformOrigin.split(' ').map(Number.parseFloat);
    const direction = index % 2 ? -1 : 1;
    const point = new DOMMatrix(style.transform === 'none' ? undefined : style.transform).transformPoint({
      x: (direction > 0 ? card.offsetWidth + 3 : -3) - originX,
      y: card.offsetHeight * (.2 + (index % 4) * .19) - originY,
    });
    const x = card.offsetLeft + originX + point.x;
    const y = card.offsetTop + originY + point.y;
    const particle = document.createElement('span');
    particle.className = index % 6 === 0 ? 'shuffle-dust shuffle-dust--star' : 'shuffle-dust';
    particle.style.left = `${x}px`; particle.style.top = `${y}px`;
    particle.style.setProperty('--dust-color', index % 3 ? '#b38c46' : '#9a62ba');
    layer.append(particle);
    const dx = direction * (13 + index % 4 * 4);
    const dy = -16 - index % 3 * 7;
    const playback = animate(particle, [
      { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0, offset: 0 },
      { opacity: .7, offset: .18 },
      { opacity: .35, offset: .55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.1)`, opacity: 0, offset: 1 },
    ], { duration: Math.min(500 + index % 3 * 35, remaining), easing: 'cubic-bezier(.2,.55,.35,1)' }, signal)
      .catch(() => {}).finally(() => particle.remove());
    particles.push(playback);
  };
  let abort;
  try {
    await new Promise((resolve, reject) => {
      let next = 0;
      abort = () => { cancelAnimationFrame(frame); reject(abortError()); };
      signal?.addEventListener('abort', abort, { once: true });
      const tick = (now) => {
        const elapsed = now - start;
        if (signal?.aborted) return abort();
        if (reducedMotion() || elapsed > SHUFFLE_DURATION - 550 || document.hidden) return resolve();
        if (elapsed >= 140 + next * 68) {
          emit(next, elapsed, SHUFFLE_DURATION - 50 - elapsed);
          // Skip missed emissions after a stalled frame instead of creating a burst.
          next = Math.max(next + 1, Math.floor((elapsed - 140) / 68) + 1);
        }
        if (next >= 18) resolve();
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    await Promise.all(particles);
  } finally {
    cancelAnimationFrame(frame);
    signal?.removeEventListener('abort', abort);
    layer.remove();
  }
}

// All styles share one clock and end at the same responsive fan geometry.
export const SHUFFLE_DURATION = 1900;
export const SHUFFLE_STYLES = Object.freeze(['overhand', 'riffle', 'hindu', 'strip', 'weave']);

/** Each route describes a single card leaving the top of a real packet.
 * Two-packet styles alternate left/right releases; the others peel top-first.
 * Coordinates are relative to the card size so the same motion fits phones.
 */
function shuffleRoute(style, index, total, width, height) {
  const half = Math.ceil(total / 2);
  const side = index < half ? -1 : 1;
  const interleaved = style === 'riffle' || style === 'weave';
  const order = interleaved
    ? (index < half ? (half - 1 - index) * 2 : (total - 1 - index) * 2 + 1)
    : total - 1 - index;
  const layer = (interleaved ? index % half : index) * .55;
  const received = order * .55;
  const release = .23 + order / Math.max(1, total - 1) * .242;
  const point = (x, y, rotation = 0, scale = 1) => [x * width, y * height, rotation, scale];
  let source, lift, cross, landing;
  switch (style) {
    case 'riffle':
      source = point(side * .60, .13, side * -7);
      lift = point(side * .52, -.065, side * -4, 1.025);
      cross = point(side * .17, .09, side * -1.5, 1.01);
      landing = point(0, .18);
      break;
    case 'hindu':
      source = point(-.40, -.01, -2);
      lift = point(-.12, -.075, -1, 1.025);
      cross = point(.65, .08, 2, 1.015);
      landing = point(.46, .24);
      break;
    case 'strip': {
      const direction = order % 2 ? 1 : -1;
      source = point(0, -.025);
      lift = point(direction * .95, .02, direction * 5, 1.025);
      cross = point(direction * .48, .20, direction * 2, 1.01);
      landing = point(0, .26);
      break;
    }
    case 'weave':
      source = point(side * .74, .10, side * -2);
      lift = point(side * .58, .095, side * -1, 1.015);
      cross = point(side * .24, .16, 0, 1.005);
      landing = point(0, .16);
      break;
    default:
      source = point(.48, -.025, 3);
      lift = point(.62, -.105, 5, 1.025);
      cross = point(-.34, .04, -3, 1.015);
      landing = point(-.48, .21);
  }
  source[0] += layer; source[1] += layer;
  landing[0] += received; landing[1] += received;
  return { source, lift, cross, landing, order, release };
}

// The selection fan rotates around a point below the card. Compensate for that
// pivot during shuffling so a small rotation tilts the card around its centre,
// without an accidental sideways swing. Matrix frames also blend into the fan.
function cardPose(card, [x, y, rotation = 0, scale = 1]) {
  const [originX, originY] = getComputedStyle(card).transformOrigin.split(' ').map(Number.parseFloat);
  const cx = card.offsetWidth / 2 - originX;
  const cy = card.offsetHeight / 2 - originY;
  return new DOMMatrix().translate(x + cx, y + cy).rotate(rotation).scale(scale).translate(-cx, -cy).toString();
}

/** Style overrides support previews/tests; real draws choose a fresh style randomly. */
export async function shuffleIntoFan(stage, signal, { style } = {}) {
  if (signal?.aborted) throw abortError();
  const selectedStyle = SHUFFLE_STYLES.includes(style) ? style : SHUFFLE_STYLES[Math.floor(Math.random() * SHUFFLE_STYLES.length)];
  stage.dataset.shuffleStyle = selectedStyle;
  stage.style.setProperty('--shuffle-duration', `${SHUFFLE_DURATION}ms`);
  const cards = [...stage.querySelectorAll('.deck-card')];
  cards.forEach((card) => { card.style.transition = 'none'; });
  const start = cards.map((card) => ({ transform: getComputedStyle(card).transform, opacity: getComputedStyle(card).opacity }));
  // Measure the final CSS geometry before playback in the same browser task.
  stage.classList.add('fanned');
  cards.forEach((card) => card.style.removeProperty('transform'));
  const targets = cards.map((card) => getComputedStyle(card).transform);
  stage.classList.remove('stacked', 'fanned', 'drawing'); stage.classList.add('shuffling');
  const routes = cards.map((card, index) => shuffleRoute(selectedStyle, index, cards.length, card.offsetWidth, card.offsetHeight));
  const poses = cards.map((card, index) => {
    const route = routes[index];
    const pose = (point) => cardPose(card, point);
    const stack = pose([index * .6, index * .6]);
    const source = pose(route.source);
    const landing = pose(route.landing);
    const restingDepth = index + 1;
    const movingDepth = 50 + route.order;
    return [
      { ...start[index], zIndex: restingDepth, offset: 0, easing: 'ease-in-out' },
      { transform: stack, opacity: 1, zIndex: restingDepth, offset: .12, easing: 'ease-in-out' },
      { transform: source, opacity: 1, zIndex: restingDepth, offset: .22 },
      { transform: source, zIndex: restingDepth, offset: route.release },
      // Raise only the released card above its source; later cards land on top
      // of earlier ones. Waiting cards remain still instead of moving in blocks.
      { transform: source, zIndex: movingDepth, offset: route.release + .001, easing: 'cubic-bezier(.25,.1,.45,1)' },
      { transform: pose(route.lift), zIndex: movingDepth, offset: route.release + .065, easing: 'cubic-bezier(.35,0,.45,1)' },
      { transform: pose(route.cross), zIndex: movingDepth, offset: route.release + .145, easing: 'ease-out' },
      { transform: landing, zIndex: movingDepth, offset: route.release + .20 },
      { transform: landing, zIndex: movingDepth, offset: .68, easing: 'ease-in-out' },
      { transform: stack, zIndex: movingDepth, offset: .73 },
      { transform: stack, zIndex: restingDepth, offset: .731, easing: 'cubic-bezier(.22,.65,.3,1)' },
      { transform: targets[index], opacity: 1, zIndex: restingDepth, offset: 1 },
    ];
  });
  try {
    const stardust = shuffleStardust(stage, cards, routes, signal);
    await Promise.all([...cards.map((card, index) => {
      card.style.transform = targets[index]; card.style.opacity = '1';
      return animate(card, poses[index], { duration: SHUFFLE_DURATION, easing: 'linear' }, signal);
    }), stardust]);
    if (signal?.aborted) throw abortError();
    stage.classList.add('fanned');
  } finally {
    stage.classList.remove('shuffling');
    cards.forEach((card) => { card.style.removeProperty('transition'); card.style.removeProperty('opacity'); card.style.removeProperty('transform'); });
  }
}

export async function flyCardToSlot(card, slot, signal) {
  if (reducedMotion()) return;
  const source = card.getBoundingClientRect();
  const destination = slot.getBoundingClientRect();
  const matrix = new DOMMatrix(getComputedStyle(card).transform);
  const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
  const flight = document.createElement('div');
  flight.className = 'card-flight'; flight.ariaHidden = 'true';
  const image = card.querySelector('img').cloneNode(); image.alt = ''; flight.append(image);
  Object.assign(flight.style, {
    width: `${card.offsetWidth}px`, height: `${card.offsetHeight}px`,
    left: `${source.left + source.width / 2 - card.offsetWidth / 2}px`,
    top: `${source.top + source.height / 2 - card.offsetHeight / 2}px`,
  });
  document.body.append(flight);
  card.style.opacity = '0';
  const dx = destination.left + destination.width / 2 - (source.left + source.width / 2);
  const dy = destination.top + destination.height / 2 - (source.top + source.height / 2);
  const scaleX = destination.width / card.offsetWidth;
  const scaleY = destination.height / card.offsetHeight;
  const stage = card.closest('.deck-stage');
  sparkleBurst(stage, { x: source.left + source.width / 2 - stage.getBoundingClientRect().left, y: source.top + source.height / 2 - stage.getBoundingClientRect().top }, signal);
  try {
    await animate(flight, [
      { transform: `translate(0,0) rotate(${angle}deg) scale(1)`, filter: 'drop-shadow(0 0 3px #F2E0A4)' },
      { transform: 'translate(0,-35px) rotate(0deg) scale(1.12)', filter: 'drop-shadow(0 0 19px #F2E0A4)', offset: .3 },
      { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(${scaleX},${scaleY})`, filter: 'drop-shadow(0 0 7px #A230A4)' },
    ], { duration: 780, easing: 'cubic-bezier(.22,.7,.2,1)' }, signal);
    sparkleBurst(slot, { count: 10 }, signal);
  } finally { flight.remove(); }
}

export async function closeDeck(stage, signal) {
  await animate(stage, [
    { height: `${stage.offsetHeight}px`, opacity: 1 },
    { height: '0px', opacity: 0 },
  ], { duration: 420, easing: 'ease-in-out' }, signal);
}

/** Reveal on entry so lower cards on mobile still get their own moment. */
export function observeCardReveals(container, { animated = true } = {}) {
  const controller = new AbortController();
  const { signal } = controller;
  const cards = [...container.querySelectorAll('.result-card')];
  const finish = (card) => {
    card.classList.remove('is-revealing'); card.classList.add('is-revealed');
    card.querySelector('.reveal-front')?.removeAttribute('aria-hidden');
    const copy = card.querySelector('.result-copy');
    if (copy) { copy.inert = false; copy.removeAttribute('aria-hidden'); }
  };
  if (!animated || reducedMotion() || !('IntersectionObserver' in window)) {
    cards.forEach(finish); return () => controller.abort();
  }
  const reveal = async (card, delay) => {
    card.classList.add('is-revealing');
    const art = card.querySelector('.result-art');
    sparkleBurst(art, { count: 18 }, signal);
    try {
      await animate(card.querySelector('.reveal-inner'), [
        { transform: 'rotateY(0deg) scale(.98)', offset: 0 },
        { transform: 'rotateY(0deg) scale(1.035)', offset: .33 },
        { transform: 'rotateY(180deg) scale(1.025)', offset: .85 },
        { transform: 'rotateY(180deg) scale(1)', offset: 1 },
      ], { duration: 1850, delay, easing: 'cubic-bezier(.3,.05,.2,1)' }, signal);
      if (!signal.aborted) { finish(card); sparkleBurst(art, { count: 11 }, signal); }
    } catch { /* Navigating or changing language cancels the old DOM's effects. */ }
  };
  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry, index) => {
      observer.unobserve(entry.target); reveal(entry.target, index * 230);
    });
  }, { threshold: .18 });
  cards.forEach((card) => observer.observe(card));
  return () => { observer.disconnect(); controller.abort(); };
}

export function initializePageMotion() {
  const hero = document.querySelector('.hero');
  const visibility = new IntersectionObserver(([entry]) => hero.classList.toggle('is-offscreen', !entry.isIntersecting));
  visibility.observe(hero);
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('motion-paused', document.hidden));
}
