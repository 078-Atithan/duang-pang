import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDeck, shuffle, availableCards } from '../js/deck.js';
import { createDemoReading, validateReading } from '../js/reading.js';
import { cardText } from '../js/card-text.js';
import { SPREADS, TOPICS } from '../js/config.js';
import { validatePayload } from '../server/validation.js';
import { ageFrom, createAppServer, generateAiReading } from '../server/server.js';

const deck = validateDeck(JSON.parse(await readFile(new URL('../assets/data/tarot-images.json', import.meta.url), 'utf8')));
const payload = () => ({ topic: 'career', spread: 'timeline', cardIds: ['m00.jpg', 'm01.jpg', 'm02.jpg'], language: 'en', question: 'How can I approach my next project?', profile: {}, consent: true, actions: [] });
const responseFixture = (ids = payload().cardIds) => ({ summary: 'Reflect, then choose a practical step.', cards: ids.map((img) => ({ img, reflection: 'Consider a new perspective.', prompt: 'What is within your control?' })) });
const providerResponse = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
const geminiResponse = (text, finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { role: 'model', parts: [{ text, thoughtSignature: 'opaque' }] } }] });

test('all 78 filenames are unique and every draw excludes previously chosen cards', () => {
  const original = deck.map((card) => card.img);
  const chosen = [];
  for (let index = 0; index < 78; index += 1) {
    const hand = shuffle(availableCards(deck, chosen));
    assert.equal(hand.length, 78 - index);
    chosen.push(hand[0]);
  }
  assert.equal(new Set(chosen.map((card) => card.img)).size, 78);
  assert.deepEqual(deck.map((card) => card.img), original, 'The source deck is never mutated');
});

test('demo readings support every topic, spread and language without an AI provider', () => {
  for (const topic of TOPICS) for (const spread of SPREADS) for (const language of ['en', 'th']) {
    const cards = deck.slice(0, spread.count);
    const input = { ...payload(), topic: topic.id, spread: spread.id, language, cardIds: cards.map((card) => card.img) };
    const result = validateReading(createDemoReading(input, cards), input.cardIds);
    assert.equal(result.mode, 'demo');
    assert.equal(result.language, language);
    assert.equal(result.cards.length, spread.count);
    assert.ok(result.cards[0].reflection.includes(cardText(cards[0], language).name));
  }
});

test('all 78 cards have Thai names, keywords, meanings and questions without English leakage', () => {
  const original = JSON.stringify(deck);
  for (const card of deck) {
    const text = cardText(card, 'th');
    assert.equal(text.keywords.length, 3);
    assert.equal(text.meanings.length, 2);
    for (const value of [text.name, ...text.keywords, ...text.meanings, text.prompt]) {
      assert.match(value, /[\u0E00-\u0E7F]/, card.img);
      assert.doesNotMatch(value, /[a-z]/i, card.img);
    }
    const cards = [card, ...deck.filter((item) => item.img !== card.img).slice(0, 2)];
    const result = createDemoReading({ ...payload(), language: 'th', question: 'ฉันควรเดินหน้าต่ออย่างไร?' }, cards);
    assert.doesNotMatch(result.summary, /[a-z]/i);
    assert.doesNotMatch(result.cards[0].reflection + result.cards[0].prompt, /[a-z]/i);
  }
  assert.equal(JSON.stringify(deck), original, 'Localization must preserve the source deck');
});

test('server rejects unknown or duplicate cards, invalid spreads and excessive input', () => {
  assert.throws(() => validatePayload({ ...payload(), cardIds: ['m00.jpg', 'm00.jpg', 'm01.jpg'] }, deck));
  assert.throws(() => validatePayload({ ...payload(), cardIds: ['m00.jpg', 'm01.jpg', '../../.env'] }, deck));
  assert.throws(() => validatePayload({ ...payload(), spread: 'guidance' }, deck));
  assert.throws(() => validatePayload({ ...payload(), topic: 'unknown' }, deck));
  assert.throws(() => validatePayload({ ...payload(), question: 'x'.repeat(1001) }, deck));
  assert.throws(() => validatePayload({ ...payload(), profile: { birthDate: '2024-02-30' } }, deck));
  assert.throws(() => validatePayload({ ...payload(), profile: { birthDate: '2099-01-01' } }, deck));
  assert.doesNotThrow(() => validatePayload({ ...payload(), profile: { birthDate: '2000-02-29' } }, deck));
});

test('optional AI adapter uses verified card context and validates structured output', async () => {
  let sent;
  const profile = { name: 'Alex', birthDate: '1990-06-15', status: 'relationship', gender: 'female', career: 'Designer' };
  const fixture = responseFixture();
  fixture.cards = fixture.cards.map((card) => ({ position: 'Past', cardName: 'The Fool', meaning: 'A fresh start.', ...card }));
  const result = await generateAiReading(validatePayload({ ...payload(), profile }, deck), {
    apiKey: 'test-only-secret', model: 'test-model', fetchImpl: async (url, options) => {
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');
      assert.equal(options.headers['x-goog-api-key'], 'test-only-secret');
      sent = JSON.parse(options.body);
      return providerResponse(geminiResponse(JSON.stringify(fixture)));
    },
  });
  const input = JSON.parse(sent.contents[0].parts[0].text);
  assert.equal(sent.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(sent.generationConfig.responseSchema.properties.cards.items.properties.img.enum, payload().cardIds);
  assert.equal(input.spread.positions[0].position, 'Past');
  assert.equal(input.spread.positions[0].card.name, 'The Fool');
  assert.ok(input.spread.positions[0].card.light.length);
  assert.equal(input.querent.relationshipStatus, 'in a relationship');
  assert.equal(typeof input.querent.age, 'number');
  assert.doesNotMatch(sent.contents[0].parts[0].text, /Alex|1990-06-15/, 'Name and birth date are never sent');
  assert.equal(result.mode, 'ai');
  assert.deepEqual(result.cards.map((card) => card.img), payload().cardIds);
  assert.equal(result.cards[0].meaning, 'A fresh start.');
  assert.equal(result.cards[0].position, undefined);
});

test('age is calculated from birth date around the birthday', () => {
  assert.equal(ageFrom('2000-06-15', new Date('2026-06-14T12:00:00Z')), 25);
  assert.equal(ageFrom('2000-06-15', new Date('2026-06-15T12:00:00Z')), 26);
  assert.equal(ageFrom(''), undefined);
});

test('AI refusals, incomplete answers, provider errors and mismatched cards fail clearly', async () => {
  const invalidResponses = [
    geminiResponse(JSON.stringify(responseFixture()), 'MAX_TOKENS'),
    geminiResponse('', 'SAFETY'),
    { promptFeedback: { blockReason: 'SAFETY' } },
    geminiResponse('not json'),
    geminiResponse(JSON.stringify(responseFixture(['m02.jpg', 'm01.jpg', 'm00.jpg']))),
  ];
  for (const response of invalidResponses) {
    await assert.rejects(generateAiReading(validatePayload(payload(), deck), { apiKey: 'test', model: 'test', fetchImpl: async () => providerResponse(response) }));
  }
  const codes = { MAX_TOKENS: 'incomplete', SAFETY: 'blocked' };
  for (const [finishReason, code] of Object.entries(codes)) {
    await assert.rejects(generateAiReading(validatePayload(payload(), deck), { apiKey: 'test', model: 'test', fetchImpl: async () => providerResponse(geminiResponse('', finishReason)) }), { code });
  }
  for (const [status, code] of [[429, 'quota'], [503, 'busy'], [401, 'config'], [400, 'config'], [418, 'provider']]) {
    await assert.rejects(generateAiReading(validatePayload(payload(), deck), { apiKey: 'test', model: 'test', fetchImpl: async () => new Response('secret provider detail', { status }) }), (error) => {
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /secret provider detail/);
      return true;
    });
  }
});

test('HTTP server serves assets, protects private files, enforces origin and consent', async (context) => {
  let providerCalls = 0;
  const server = createAppServer({ apiKey: 'private-test-key', model: 'test', fetchImpl: async () => {
    providerCalls += 1;
    return providerResponse(geminiResponse(JSON.stringify(responseFixture())));
  } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  context.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (url) => fetch(`${base}${url}`);
  const post = (body, origin = base) => fetch(`${base}/api/reading`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
  assert.equal((await get('/')).status, 200);
  assert.match((await get('/js/app.js')).headers.get('content-type'), /javascript/);
  assert.deepEqual(await (await get('/api/config')).json(), { mode: 'ai' });
  for (const url of ['/.env', '/server/server.js', '/tests/reading.test.js', '/package.json', '/assets/%2e%2e%2fserver/server.js']) assert.equal((await get(url)).status, 404);
  assert.equal((await post({ ...payload(), consent: false })).status, 400);
  assert.equal((await post(payload(), 'https://unrelated.example')).status, 403);
  assert.equal(providerCalls, 0);
  assert.equal((await post(payload())).status, 200);
  assert.equal(providerCalls, 1);
  for (let index = 0; index < 4; index += 1) await post(payload());
  const limited = await post(payload());
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, 'rate_limit');
  assert.equal((await get('/api/reading')).status, 405);
});
