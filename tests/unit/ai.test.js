import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePayload } from '../../server/validation.js';
import { generateAiReading } from '../../server/ai/gemini.js';
import { ageFrom } from '../../server/ai/prompt.js';
import { deck, payload, responseFixture, providerResponse, geminiResponse } from '../helpers.js';

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
