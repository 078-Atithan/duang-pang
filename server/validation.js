import { SPREADS, TOPICS } from '../js/config.js';

export class RequestError extends Error {
  // `code` is a stable identifier the browser maps to a localized message.
  constructor(message, status = 400, code = undefined) { super(message); this.status = status; this.code = code; }
}

function text(value, max, field) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) throw new RequestError(`Invalid ${field}`);
  return value.trim();
}

export function validatePayload(body, deck, today = new Date().toISOString().slice(0, 10)) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('Expected a JSON object');
  const topic = TOPICS.find((item) => item.id === body.topic);
  const spread = SPREADS.find((item) => item.id === body.spread);
  if (!topic || !spread) throw new RequestError('Invalid topic or spread');
  if (!['en', 'th'].includes(body.language)) throw new RequestError('Invalid language');
  if (!Array.isArray(body.cardIds) || body.cardIds.length !== spread.count || new Set(body.cardIds).size !== spread.count) throw new RequestError('Choose the correct number of unique cards');
  const cards = body.cardIds.map((id) => deck.find((card) => card.img === id));
  if (cards.some((card) => !card)) throw new RequestError('Unknown card');
  const source = body.profile ?? {};
  if (typeof source !== 'object' || Array.isArray(source)) throw new RequestError('Invalid profile');
  const profile = {
    name: text(source.name, 80, 'name'), birthDate: text(source.birthDate, 10, 'birth date'),
    status: text(source.status, 20, 'relationship status'), gender: text(source.gender, 20, 'gender'), career: text(source.career, 120, 'career'),
  };
  if (profile.birthDate) {
    const date = new Date(`${profile.birthDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== profile.birthDate || profile.birthDate < '1900-01-01' || profile.birthDate > today) throw new RequestError('Invalid birth date');
  }
  if (!['', 'single', 'relationship', 'married'].includes(profile.status) || !['', 'female', 'male', 'other'].includes(profile.gender)) throw new RequestError('Invalid profile choice');
  const actions = body.actions ?? [];
  if (!Array.isArray(actions) || actions.length > 64 || actions.some((action) => !action || !['shuffle', 'pick'].includes(action.type) || !Number.isFinite(action.at) || (action.type === 'pick' && !body.cardIds.includes(action.cardId)))) throw new RequestError('Invalid action history');
  return { topic: topic.id, spread: spread.id, question: text(body.question, 1000, 'question'), language: body.language, cardIds: cards.map((card) => card.img), profile, consent: body.consent === true, actions: actions.map(({ type, at, cardId }) => ({ type, at, ...(type === 'pick' ? { cardId } : {}) })) };
}
