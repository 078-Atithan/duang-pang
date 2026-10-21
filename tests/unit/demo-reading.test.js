import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoReading } from '../../js/reading/demo.js';
import { validateReading } from '../../js/reading/validate.js';
import { cardText } from '../../js/i18n/card-text.js';
import { SPREADS } from '../../js/data/spreads.js';
import { TOPICS } from '../../js/data/topics.js';
import { deck, payload } from '../helpers.js';

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
