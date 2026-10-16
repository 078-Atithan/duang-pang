import { CONFIG, SPREADS, TOPICS, icon } from './config.js';
import { getLanguage, setLanguage, t, local, translatePage } from './i18n.js';
import { availableCards, shuffle, validateDeck } from './deck.js';
import { createDemoReading, getServerConfig, requestReading } from './reading.js';
import { initializeHero } from './hero.js';
import { cardText } from './card-text.js';
import { shuffleIntoFan, flyCardToSlot, closeDeck, observeCardReveals, initializePageMotion } from './effects.js';

const $ = (selector) => document.querySelector(selector);
// Escape every dynamic value before composing markup, including provider output.
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const label = (key, values) => escapeHtml(t(key, values));
const named = (item) => item[getLanguage()];
const freshState = () => ({ step: 0, topic: '', question: '', count: 3, spread: 'timeline', profile: { name: '', birthDate: '', status: '', gender: '', career: '' }, chosen: [], hand: [], actions: [], phase: 'stacked', consent: false, busy: false, error: '', result: null, resultPayload: null, resultLanguages: {} });
let state = freshState();
let deck = [];
let serverConfig = { mode: 'demo' };
let activeRequest;
let drawController;
let stopResultEffects = () => {};

const spread = () => SPREADS.find((item) => item.id === state.spread);
const positions = () => local(spread().positions);
const announce = (message) => { $('#announcement').textContent = message; };
const motionLocked = () => state.busy || ['shuffling', 'drawing'].includes(state.phase);
const actionButton = (action, text, variant = 'button-dark', extra = '') => `<button type="button" class="button ${variant}" data-action="${action}" ${extra}>${text}</button>`;
const ERROR_KEYS = { quota: 'errorQuota', daily_limit: 'errorQuota', busy: 'errorBusy', rate_limit: 'errorRateLimit', timeout: 'errorTimeout', incomplete: 'errorIncomplete', blocked: 'errorBlocked', network: 'errorNetwork', config: 'errorConfig' };
const errorText = (code) => label(ERROR_KEYS[code] || 'readingError');

// Runs after the final re-render so layout changes above #results cannot cut the scroll short.
function scrollToResults() {
  requestAnimationFrame(() => {
    const headerHeight = $('.site-header')?.offsetHeight ?? 0;
    const top = $('#results').getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $('#results-title')?.focus({ preventScroll: true });
  });
}

function heading(title, description) {
  return `<div class="wizard-heading"><h3 id="step-title" tabindex="-1">${label(title)}</h3><p>${label(description)}</p></div>`;
}
function footer(hint, nextText = 'continue') {
  return `<div class="wizard-footer">${state.step > 0 ? actionButton('back', `← ${label('back')}`, 'button-plain') : `<span class="helper">✧ ${label(hint)}</span>`}<button type="submit" class="button button-dark" id="continue-button" ${state.step === 0 && !state.topic ? 'disabled' : ''}>${label(nextText)} <span aria-hidden="true">→</span></button></div>`;
}

function renderStepper() {
  $('#stepper').innerHTML = Array.from({ length: 5 }, (_, index) => {
    const current = index === state.step;
    const complete = index < state.step;
    return `<li class="${current ? 'active' : complete ? 'complete' : ''}"><button type="button" class="step-button" data-step="${index}" ${current ? 'aria-current="step"' : ''} ${index > state.step || motionLocked() ? 'disabled' : ''}><span class="step-number" aria-hidden="true">${complete ? '✓' : `0${index + 1}`}</span><span>${label(`step${index}`)}</span></button></li>`;
  }).join('');
}

function renderTopic() {
  return `${heading('topicTitle', 'topicDescription')}<form id="step-form"><fieldset><legend class="sr-only">${label('topicLegend')}</legend><div class="topic-grid">${TOPICS.map((topic) => `<label class="choice topic-choice"><input type="radio" name="topic" value="${topic.id}" ${state.topic === topic.id ? 'checked' : ''} required><span class="choice-body">${icon(topic.icon)}<span class="choice-check" aria-hidden="true">✓</span><span class="choice-title">${escapeHtml(named(topic))}</span><span class="choice-subtitle">${escapeHtml(local(topic.description))}</span></span></label>`).join('')}</div></fieldset>${footer('topicHint')}</form>`;
}

function renderQuestion() {
  return `${heading('questionTitle', 'questionDescription')}<form id="step-form"><div class="question-layout"><div><label class="field-label" for="question">${label('questionLabel')}<span class="optional">${label('optional')}</span></label><textarea id="question" name="question" maxlength="${CONFIG.maxQuestionLength}" placeholder="${label('questionPlaceholder')}" aria-describedby="question-help">${escapeHtml(state.question)}</textarea><div class="field-meta"><span id="question-help">${label('questionPrivacy')}</span><span id="question-count">${state.question.length}/${CONFIG.maxQuestionLength}</span></div></div><aside class="question-tips"><h4>${label('tipsTitle')}</h4><button class="example-button" type="button" data-action="example">“${label('example')}” ↗</button><p class="tip-good">${label('goodTip')}</p><p>${label('avoidTip')}</p></aside></div>${footer('questionHint')}</form>`;
}

function renderSpread() {
  return `${heading('spreadTitle', 'spreadDescription')}<form id="step-form"><fieldset><legend class="field-label">${label('cardCount')}</legend><div class="spread-count">${[3, 4].map((count) => `<label class="choice"><input type="radio" name="count" value="${count}" ${state.count === count ? 'checked' : ''}><span class="choice-body"><span class="choice-title">${label('cards', { count })}</span></span></label>`).join('')}</div></fieldset><fieldset><legend class="sr-only">${label('spreadLegend')}</legend><div class="spread-grid ${state.count === 4 ? 'single' : ''}">${SPREADS.filter((item) => item.count === state.count).map((item) => `<label class="choice spread-choice"><input type="radio" name="spread" value="${item.id}" ${state.spread === item.id ? 'checked' : ''}><span class="choice-body"><span class="mini-spread" aria-hidden="true">${Array.from({ length: item.count }, (_, index) => `<span class="mini-card">${index + 1}</span>`).join('')}</span><span class="choice-title">${escapeHtml(named(item))}</span><span class="spread-positions">${local(item.positions).map(escapeHtml).join(' · ')}</span></span></label>`).join('')}</div></fieldset>${footer('spreadHint')}</form>`;
}

function selectField(name, options) {
  return `<div class="field"><label class="field-label" for="${name}">${label(name)}</label><select id="${name}" name="${name}">${['', ...options].map((value) => `<option value="${value}" ${state.profile[name] === value ? 'selected' : ''}>${label(value || 'preferNot')}</option>`).join('')}</select></div>`;
}
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function renderDetails() {
  return `${heading('detailsTitle', 'detailsDescription')}<form id="step-form"><div class="details-grid"><div class="field"><label class="field-label" for="name">${label('name')}</label><input id="name" name="name" autocomplete="name" maxlength="80" placeholder="${label('namePlaceholder')}" value="${escapeHtml(state.profile.name)}"></div><div class="field"><label class="field-label" for="birthDate">${label('birthDate')}</label><input id="birthDate" name="birthDate" type="date" min="1900-01-01" max="${localToday()}" value="${escapeHtml(state.profile.birthDate)}"></div>${selectField('status', ['single', 'relationship', 'married'])}${selectField('gender', ['female', 'male', 'other'])}<div class="field"><label class="field-label" for="career">${label('career')}</label><input id="career" name="career" maxlength="120" value="${escapeHtml(state.profile.career)}" placeholder="${label('careerPlaceholder')}" autocomplete="organization-title"></div></div><p class="privacy-inline"><span aria-hidden="true">♧</span>${label(serverConfig.mode === 'ai' ? 'privacyAi' : 'privacyLocal')}</p>${footer('', 'drawStart')}</form>`;
}

function renderSlots() {
  return `<div class="selected-slots ${state.busy ? 'is-waiting' : ''}" aria-label="${label('drawCount', { chosen: state.chosen.length, total: state.count })}">${positions().map((position, index) => `<div class="selected-slot"><div class="slot-card ${state.chosen[index] ? 'is-filled' : ''}" style="--i:${index}" data-slot="${index}">${state.chosen[index] ? `<img src="${CONFIG.cardBack}" alt="${label('hiddenCard')}">` : index + 1}</div><span>${escapeHtml(position)}</span></div>`).join('')}</div>`;
}

function renderDraw() {
  const ready = state.chosen.length === state.count;
  const ai = serverConfig.mode === 'ai';
  const canReveal = !state.busy && (state.result || !ai || state.consent);
  const deckMarkup = `<div class="deck-stage ${state.phase}" role="group" aria-label="${label('step4')}">${Array.from({ length: 12 }, (_, index) => `<button type="button" class="deck-card" style="--i:${index}" data-card-index="${index}" aria-label="${label('chooseCard', { number: index + 1 })}" ${state.phase !== 'fanned' ? 'disabled' : ''}><img src="${CONFIG.cardBack}" alt=""></button>`).join('')}</div><div class="draw-action">${state.phase === 'fanned' ? `<p class="status-message">${label('pickHint')}</p>` : actionButton('shuffle', label('shuffle'), 'button-dark')}</div>`;
  const readyMarkup = `<div class="result-ready"><h3>${label('readyTitle')}</h3><p>${label('readyDescription')}</p>${actionButton('reveal', `${label(state.busy ? 'revealing' : state.result ? 'viewReading' : state.error ? 'retry' : 'reveal')} ✦`, 'button-dark', canReveal ? '' : 'disabled')}${state.busy ? `<p class="waiting-status" role="status">${label(ai ? 'waitingAi' : 'revealing')}</p>` : ''}${ai && !state.result ? `<label class="consent"><input type="checkbox" name="consent" ${state.consent ? 'checked' : ''} ${state.busy ? 'disabled' : ''}><span>${label('consent')}</span></label>${actionButton('demo', label('useDemo'), 'button-plain', state.busy ? 'disabled' : '')}` : ''}</div>`;
  return `<div class="wizard-heading draw-heading"><p class="eyebrow">${label('drawEyebrow')}</p><h3 id="step-title" tabindex="-1">${label('drawTitle')}</h3><p>${label('drawDescription')}</p><span class="draw-counter">${label('drawCount', { chosen: state.chosen.length, total: state.count })}</span></div>${ready ? renderSlots() + readyMarkup : deckMarkup + renderSlots()}<p class="mode-bar"><span aria-hidden="true">✧</span>${label((state.result?.mode ?? serverConfig.mode) === 'ai' ? 'aiNotice' : 'demoNotice')}</p>${state.error && !state.result ? `<p class="error-message" role="alert">${errorText(state.error)}</p>` : ''}<div class="wizard-footer">${actionButton('back', `← ${label('back')}`, 'button-plain', motionLocked() ? 'disabled' : '')}<span class="helper">${label('drawHint')}</span></div>`;
}

function renderWizard({ focus = false } = {}) {
  renderStepper();
  $('#language-toggle').disabled = motionLocked();
  $('#wizard').setAttribute('aria-busy', String(motionLocked()));
  $('#wizard').innerHTML = modeBanner() + [renderTopic, renderQuestion, renderSpread, renderDetails, renderDraw][state.step]();
  if (focus) $('#step-title')?.focus({ preventScroll: true });
}

// Say plainly when no reading server answered, so a static copy (GitHub Pages) is not mistaken for AI.
function modeBanner() {
  if (serverConfig.mode !== 'demo' || serverConfig.reason !== 'unavailable') return '';
  return `<p class="mode-bar mode-banner" role="status"><span aria-hidden="true">✧</span>${label(CONFIG.remoteApi ? 'remoteDownBanner' : 'staticDemoBanner')}</p>`;
}

// A hosted server on a free plan can take a minute to wake up; keep checking and switch to AI once it answers.
async function watchRemoteServer() {
  for (let attempt = 0; attempt < 12 && serverConfig.mode !== 'ai'; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const config = await getServerConfig({ timeout: 8000 });
    if (config.mode === 'demo' && config.reason === 'unavailable') continue;
    serverConfig = config;
    if (!motionLocked() && state.phase === 'stacked' && !state.result) renderWizard();
    return;
  }
}

function clearDraw() {
  drawController?.abort();
  activeRequest?.abort();
  state.chosen = []; state.hand = []; state.phase = 'stacked'; state.actions = [];
  state.result = null; state.resultPayload = null; state.resultLanguages = {}; state.error = ''; state.consent = false;
  renderEmptyResults();
}

function changeStep(step) {
  if (motionLocked() || step < 0 || step > 4) return;
  state.step = step;
  renderWizard({ focus: true });
  $('#reading').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function syncDrawControls() {
  renderStepper();
  $('#language-toggle').disabled = motionLocked();
  $('#wizard').setAttribute('aria-busy', String(motionLocked()));
  $('[data-action="back"]').disabled = motionLocked();
  document.querySelectorAll('.deck-card').forEach((card) => { card.disabled = state.phase !== 'fanned'; });
  $('.draw-action').innerHTML = `<p class="status-message">${label(state.phase === 'fanned' ? 'pickHint' : state.phase === 'drawing' ? 'drawing' : 'shuffling')}</p>`;
  $('.draw-counter').textContent = t('drawCount', { chosen: state.chosen.length, total: state.count });
}

async function runShuffle(signal) {
  state.hand = shuffle(availableCards(deck, state.chosen)).slice(0, 12);
  state.phase = 'shuffling';
  state.actions.push({ type: 'shuffle', at: Date.now() });
  syncDrawControls();
  await shuffleIntoFan($('.deck-stage'), signal);
  if (signal.aborted) return;
  state.phase = 'fanned'; syncDrawControls();
  announce(t('pickHint'));
  $('.deck-card')?.focus({ preventScroll: true });
}

async function beginShuffle() {
  if (state.phase !== 'stacked' || state.chosen.length >= state.count) return;
  drawController = new AbortController();
  try { await runShuffle(drawController.signal); }
  catch { if (!drawController.signal.aborted) { state.phase = 'stacked'; renderWizard(); } }
}

async function pickCard(index) {
  if (state.phase !== 'fanned' || state.chosen.length >= state.count || !state.hand[index]) return;
  const card = state.hand[index];
  if (state.chosen.some((chosen) => chosen.img === card.img)) return;
  drawController = new AbortController();
  const { signal } = drawController;
  const stage = $('.deck-stage');
  const selected = $(`[data-card-index="${index}"]`);
  const slot = $(`[data-slot="${state.chosen.length}"]`);
  // Lock before the first await: fast taps and repeated keys cannot draw twice.
  state.phase = 'drawing'; stage.classList.add('drawing'); syncDrawControls();
  try {
    await flyCardToSlot(selected, slot, signal);
    if (signal.aborted) return;
    state.chosen.push(card);
    state.actions.push({ type: 'pick', at: Date.now(), cardId: card.img });
    slot.innerHTML = `<img src="${CONFIG.cardBack}" alt="${label('hiddenCard')}">`;
    slot.classList.add('is-filled');
    const progress = t('drawCount', { chosen: state.chosen.length, total: state.count });
    $('.draw-counter').textContent = progress; $('.selected-slots').setAttribute('aria-label', progress);
    announce(t('selectedAnnouncement', { number: state.chosen.length, remaining: state.count - state.chosen.length }));
    if (state.chosen.length === state.count) {
      await closeDeck(stage, signal);
      state.hand = []; state.phase = 'stacked'; renderWizard();
      $('[data-action="reveal"]')?.focus({ preventScroll: true });
    } else {
      // Keep the DOM mounted: the flight flows directly into the next shuffle.
      await runShuffle(signal);
    }
  } catch { if (!signal.aborted) { state.phase = 'stacked'; renderWizard(); } }
}

function readingPayload() {
  return { topic: state.topic, question: state.question.trim(), spread: state.spread, cardIds: state.chosen.map((card) => card.img), profile: { ...state.profile }, language: getLanguage(), actions: [...state.actions], consent: state.consent };
}

async function reveal({ demo = false } = {}) {
  if (state.busy || state.chosen.length !== state.count || (!demo && serverConfig.mode === 'ai' && !state.consent)) return;
  // Revisiting a completed reading must not make another billable AI request.
  if (state.result) return scrollToResults();
  const payload = readingPayload();
  state.busy = true; state.error = ''; renderWizard();
  activeRequest = new AbortController();
  const request = activeRequest = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; request.abort(); }, 65000);
  let revealed = false;
  try {
    state.result = demo || serverConfig.mode !== 'ai' ? createDemoReading(payload, state.chosen) : await requestReading(payload, request.signal);
    state.resultPayload = payload;
    state.resultLanguages[payload.language] = state.result;
    renderResults({ animated: true });
    revealed = true;
  } catch (error) {
    // Navigating away or starting over aborts the request; that is not a failure to report.
    if (error.code === 'aborted' && !timedOut) return;
    state.error = timedOut ? 'timeout' : error.code || 'provider';
    announce(t(ERROR_KEYS[state.error] || 'readingError'));
  } finally {
    clearTimeout(timeout);
    if (activeRequest === request) { state.busy = false; activeRequest = null; renderWizard(); }
    if (revealed) scrollToResults();
  }
}

function renderEmptyResults() {
  if (state.result) return;
  stopResultEffects();
  $('#results-content').className = 'empty-results';
  $('#results-content').innerHTML = `<span class="empty-symbol" aria-hidden="true">☾</span><p class="eyebrow">${label('resultsEyebrow')}</p><h2 id="results-title">${label('emptyTitle')}</h2><p>${label('emptyText')}</p><a class="text-link" href="#reading">${label('emptyCta')} ↗</a>`;
}

function renderResults({ animated = false } = {}) {
  if (!state.result) return renderEmptyResults();
  stopResultEffects();
  const payload = state.resultPayload;
  if (state.result.mode === 'demo' && state.result.language !== getLanguage()) {
    // Rebuild only the text; preserve the exact draw, order, and original inputs.
    state.result = createDemoReading({ ...payload, language: getLanguage() }, payload.cardIds.map((id) => deck.find((card) => card.img === id)));
  } else if (state.resultLanguages[getLanguage()]) {
    state.result = state.resultLanguages[getLanguage()];
  }
  const chosenSpread = SPREADS.find((item) => item.id === payload.spread);
  const chosenTopic = TOPICS.find((item) => item.id === payload.topic);
  const chosenPositions = local(chosenSpread.positions);
  const positionDescriptions = local(chosenSpread.positionDescriptions);
  const resultCards = payload.cardIds.map((id) => deck.find((card) => card.img === id));
  const needsLanguage = state.result.mode === 'ai' && state.result.language !== getLanguage();
  const languageNotice = needsLanguage ? `<div class="reading-language-notice" role="status"><p>${label('aiLanguageNotice')}</p>${actionButton('reading-language', label(state.busy ? 'revealing' : 'generateLanguage'), 'button-outline', state.busy ? 'disabled' : '')}${state.error ? `<p class="error-message" role="alert">${errorText(state.error)}</p>` : ''}</div>` : '';
  const modeLabel = state.result.mode === 'ai' ? 'aiBadge' : 'demoBadge';
  $('#results-content').className = '';
  $('#results-content').innerHTML = `<div class="result-header"><p class="eyebrow">${label('resultEyebrow')}</p><h2 id="results-title" tabindex="-1">${payload.profile.name ? label('namedResultTitle', { name: payload.profile.name }) : label('resultTitle')}</h2><p>${label('resultIntro')}</p><div class="result-badges"><span class="badge">${escapeHtml(named(chosenTopic))}</span><span class="badge">${escapeHtml(named(chosenSpread))}</span><span class="badge">${label(modeLabel)} · ${state.result.language.toUpperCase()}</span><span class="badge">${label('upright')}</span></div>${payload.question ? `<blockquote class="result-question">“${escapeHtml(payload.question)}”</blockquote>` : ''}${languageNotice}</div><div class="result-grid ${resultCards.length === 4 ? 'four' : ''}">${resultCards.map((card, index) => {
    const entry = state.result.cards[index];
    const text = cardText(card, getLanguage());
    return `<article class="result-card" aria-labelledby="result-role-${index}"><header class="result-position"><span class="result-role-index" aria-hidden="true">0${index + 1}</span><div><h3 class="result-role-title" id="result-role-${index}">${escapeHtml(chosenPositions[index])}</h3><p class="result-role-description">${escapeHtml(positionDescriptions[index])}</p></div></header><div class="result-art"><div class="reveal-inner"><div class="reveal-back"><img src="${CONFIG.cardBack}" alt="${label('hiddenCard')}"></div><div class="reveal-front" aria-hidden="true"><div class="card-placeholder" aria-label="${escapeHtml(text.name)}"><span class="placeholder-number">${escapeHtml(card.number)}</span><span class="placeholder-star" aria-hidden="true">✧</span><strong>${escapeHtml(text.name)}</strong><span class="placeholder-label">${label('placeholder')}</span></div><img src="${CONFIG.imageDirectory}${encodeURIComponent(card.img)}" alt="${escapeHtml(text.name)}" loading="eager" data-card-image></div></div></div><div class="result-copy" inert aria-hidden="true"><h4 class="card-name">${escapeHtml(text.name)}</h4><p class="card-keywords">${text.keywords.map(escapeHtml).join(' · ')}</p><h5>${label('cardMeaning')}</h5><p>${escapeHtml(text.meanings.join(getLanguage() === 'th' ? ' ' : '. '))}${getLanguage() === 'th' ? '' : '.'}</p>${entry.meaning ? `<h5>${label('positionMeaning')}</h5><p lang="${state.result.language}">${escapeHtml(entry.meaning)}</p>` : ''}<h5>${label('yourReflection')}</h5><p lang="${state.result.language}">${escapeHtml(entry.reflection)}</p><div class="reflection-box"><h5>${label('reflectionPrompt')}</h5><p lang="${state.result.language}">${escapeHtml(entry.prompt)}</p></div></div></article>`;
  }).join('')}</div><aside class="result-summary"><h3>${label('takeWithYou')}</h3><p lang="${state.result.language}">${escapeHtml(state.result.summary)}</p></aside><p class="result-source-note">${label('sourceNote')}</p><div class="result-actions">${actionButton('save', `${label('saveReading')} ↓`)}${actionButton('print', label('printReading'), 'button-outline')}${actionButton('restart', `${label('newReading')} ↗`, 'button-outline')}</div>`;
  // Missing user-supplied images leave the intentional placeholder visible.
  $('#results-content').querySelectorAll('[data-card-image]').forEach((image) => {
    const hideMissing = () => { image.hidden = true; };
    image.addEventListener('error', hideMissing, { once: true });
    if (image.complete && image.naturalWidth === 0) hideMissing();
  });
  stopResultEffects = observeCardReveals($('#results-content'), { animated });
}

// A new AI-language version requires an explicit click. Cache it for free toggling.
async function generateReadingLanguage() {
  if (state.busy || state.result?.mode !== 'ai' || !state.resultPayload?.consent) return;
  state.busy = true; state.error = ''; renderWizard(); renderResults();
  const request = activeRequest = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; request.abort(); }, 65000);
  try {
    const language = getLanguage();
    const result = await requestReading({ ...state.resultPayload, language }, request.signal);
    state.resultLanguages[language] = result; state.result = result;
  } catch (error) {
    if (error.code === 'aborted' && !timedOut) return;
    state.error = timedOut ? 'timeout' : error.code || 'provider';
    announce(t(ERROR_KEYS[state.error] || 'readingError'));
  } finally {
    clearTimeout(timeout);
    if (activeRequest === request) {
      state.busy = false; activeRequest = null;
      renderWizard(); renderResults(); $('#results-title')?.focus({ preventScroll: true });
    }
  }
}

function downloadReading() {
  if (!state.result) return;
  const payload = state.resultPayload;
  const chosenSpread = SPREADS.find((item) => item.id === payload.spread);
  const lines = ['DUANG PANG', t(state.result.mode === 'ai' ? 'aiBadge' : 'demoBadge'), `${t('readingLanguage')}: ${state.result.language === 'th' ? 'ไทย' : 'English'}`, payload.question, ''];
  state.result.cards.forEach((entry, index) => {
    const card = deck.find((item) => item.img === entry.img);
    const text = cardText(card, getLanguage());
    lines.push(`${index + 1}. ${local(chosenSpread.positions)[index]} — ${text.name}`, `${t('cardMeaning')}: ${text.meanings.join(getLanguage() === 'th' ? ' ' : '. ')}`, ...(entry.meaning ? [`${t('positionMeaning')}: ${entry.meaning}`] : []), entry.reflection, entry.prompt, '');
  });
  lines.push(state.result.summary, '', t('readingFootnote'));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `duang-pang-reading-${localToday()}.txt`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openDialog(kind) {
  const keys = { about: ['footerAbout', 'aboutDialog'], privacy: ['footerPrivacy', 'privacyDialog'], disclaimer: ['footerDisclaimer', 'disclaimerDialog'] };
  if (!keys[kind]) return;
  $('#dialog-title').textContent = t(keys[kind][0]);
  $('#dialog-body').textContent = t(keys[kind][1]);
  $('#info-dialog').showModal();
}

document.addEventListener('input', (event) => {
  const { name, value } = event.target;
  if (name === 'question') {
    if (state.question !== value && state.chosen.length) clearDraw();
    state.question = value;
    $('#question-count').textContent = `${value.length}/${CONFIG.maxQuestionLength}`;
  } else if (Object.hasOwn(state.profile, name)) {
    if (state.profile[name] !== value && state.chosen.length) clearDraw();
    state.profile[name] = value;
    event.target.setCustomValidity('');
  }
});

document.addEventListener('change', (event) => {
  const { name, value, checked } = event.target;
  if (name === 'topic') {
    if (state.topic !== value) clearDraw();
    state.topic = value; $('#continue-button').disabled = false;
  } else if (name === 'count') {
    clearDraw(); state.count = Number(value); state.spread = state.count === 4 ? 'guidance' : 'timeline';
    renderWizard(); $(`input[name="count"][value="${state.count}"]`)?.focus();
  } else if (name === 'spread') {
    if (state.spread !== value) clearDraw();
    state.spread = value;
  } else if (name === 'consent') {
    state.consent = checked;
    $('[data-action="reveal"]').disabled = !checked;
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'step-form') return;
  event.preventDefault();
  if (state.step === 0 && !state.topic) return;
  if (state.step === 3 && state.profile.birthDate && (state.profile.birthDate > localToday() || state.profile.birthDate < '1900-01-01')) {
    $('#birthDate').setCustomValidity(t('dateError')); $('#birthDate').reportValidity(); return;
  }
  if (event.target.reportValidity()) changeStep(state.step + 1);
});

document.addEventListener('click', (event) => {
  const target = event.target.closest('button, [data-dialog]');
  if (!target || target.disabled) return;
  if (target.id === 'language-toggle') {
    if (motionLocked()) return;
    setLanguage(getLanguage() === 'en' ? 'th' : 'en'); translatePage();
    if (deck.length) renderWizard(); renderResults(); return;
  }
  if (state.busy && ['restart', 'save', 'print'].includes(target.dataset.action)) return;
  if (target.dataset.dialog) return openDialog(target.dataset.dialog);
  if (target.matches('.dialog-close')) return $('#info-dialog').close();
  if (target.dataset.step !== undefined && Number(target.dataset.step) <= state.step) return changeStep(Number(target.dataset.step));
  if (target.dataset.cardIndex !== undefined) return pickCard(Number(target.dataset.cardIndex));
  switch (target.dataset.action) {
    case 'back': changeStep(state.step - 1); break;
    case 'example':
      if (state.chosen.length) clearDraw();
      state.question = t('example'); renderWizard(); $('#question').focus(); break;
    case 'shuffle': beginShuffle(); break;
    case 'reveal': reveal(); break;
    case 'demo': reveal({ demo: true }); break;
    case 'reading-language': generateReadingLanguage(); break;
    case 'save': downloadReading(); break;
    case 'print': window.print(); break;
    case 'restart': clearDraw(); state = freshState(); renderEmptyResults(); changeStep(0); break;
    case 'retry': initialize(); break;
    default: break;
  }
});

async function initialize() {
  $('#year').textContent = new Date().getFullYear();
  $('#wizard').setAttribute('aria-busy', 'true');
  $('#wizard').innerHTML = `<p class="loading-message">${label('loading')}</p>`;
  try {
    const [deckResponse, config] = await Promise.all([
      fetch(CONFIG.deckUrl, { signal: AbortSignal.timeout(10000) }), getServerConfig({ timeout: CONFIG.remoteApi ? 5000 : 2500 }),
    ]);
    if (!deckResponse.ok) throw new Error('Deck could not be loaded');
    deck = validateDeck(await deckResponse.json()); serverConfig = config;
    renderWizard();
    if (CONFIG.remoteApi && config.reason === 'unavailable') watchRemoteServer();
  } catch {
    $('#wizard').setAttribute('aria-busy', 'false');
    $('#wizard').innerHTML = `<p class="error-message" role="alert">${label('deckError')}</p><div class="result-actions">${actionButton('retry', label('retry'))}</div>`;
  }
}

initializeHero();
initializePageMotion();
initialize();
