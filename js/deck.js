/** Uniform random integers. Rejection sampling avoids modulo bias. */
function randomIndex(max) {
  if (!Number.isInteger(max) || max < 1) throw new RangeError('Invalid random range');
  const range = 2 ** 32;
  const limit = range - (range % max);
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % max;
}

export function shuffle(cards) {
  const copy = [...cards];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function availableCards(cards, chosen) {
  const selectedIds = new Set(chosen.map((card) => card.img));
  return cards.filter((card) => !selectedIds.has(card.img));
}

export function validateDeck(data) {
  if (!Array.isArray(data?.cards) || data.cards.length !== 78) throw new Error('Expected a 78-card deck');
  const ids = new Set();
  for (const card of data.cards) {
    if (!card.name || !/^[a-z][0-9]{2}\.jpg$/.test(card.img) || ids.has(card.img)
      || !Array.isArray(card.meanings?.light) || !card.meanings.light.length
      || !Array.isArray(card.keywords) || !Array.isArray(card['Questions to Ask'])) {
      throw new Error('Invalid or duplicate card record');
    }
    ids.add(card.img);
  }
  return data.cards;
}
