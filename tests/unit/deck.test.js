import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, availableCards } from '../../js/reading/deck.js';
import { deck } from '../helpers.js';

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
