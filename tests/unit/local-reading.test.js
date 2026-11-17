import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalReading } from '../../js/reading/local.js';
import { validateReading } from '../../js/reading/validate.js';
import { cardText } from '../../js/i18n/card-text.js';
import { SPREADS } from '../../js/data/spreads.js';
import { deck, payload } from '../helpers.js';

test('local mode carries only the drawn cards, nothing about the visitor', () => {
  for (const spread of SPREADS) for (const language of ['en', 'th']) {
    const cards = deck.slice(0, spread.count);
    const input = { ...payload(), spread: spread.id, language, cardIds: cards.map((card) => card.img) };
    const result = validateReading(createLocalReading(input, cards), input.cardIds);
    assert.equal(result.mode, 'demo');
    assert.equal(result.language, language);
    assert.deepEqual(result.cards, cards.map((card) => ({ img: card.img })));
    const text = JSON.stringify(result);
    for (const personal of [input.question, input.profile.name, input.profile.career]) assert.ok(!text.includes(personal), `local mode leaks "${personal}"`);
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
  }
  assert.equal(JSON.stringify(deck), original, 'Localization must preserve the source deck');
});

test('AI readings still need text for every card; local readings do not', () => {
  const ids = ['m00.jpg', 'm01.jpg'];
  assert.throws(() => validateReading({ mode: 'ai', language: 'en', summary: 'S', cards: ids.map((img) => ({ img })) }, ids));
  assert.doesNotThrow(() => validateReading({ mode: 'demo', language: 'en', summary: '', cards: ids.map((img) => ({ img })) }, ids));
  assert.throws(() => validateReading({ mode: 'demo', language: 'en', summary: '', cards: [{ img: 'm01.jpg' }, { img: 'm00.jpg' }] }, ids), 'order still matters');
});
