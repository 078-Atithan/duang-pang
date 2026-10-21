import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePayload } from '../../server/validation.js';
import { deck, payload } from '../helpers.js';

test('server rejects unknown or duplicate cards, invalid spreads and excessive input', () => {
  assert.throws(() => validatePayload({ ...payload(), cardIds: ['m00.jpg', 'm00.jpg', 'm01.jpg'] }, deck));
  assert.throws(() => validatePayload({ ...payload(), cardIds: ['m00.jpg', 'm01.jpg', '../../.env'] }, deck));
  assert.throws(() => validatePayload({ ...payload(), spread: 'guidance' }, deck));
  assert.throws(() => validatePayload({ ...payload(), topic: 'unknown' }, deck));
  assert.throws(() => validatePayload({ ...payload(), question: 'x'.repeat(1001) }, deck));
  const withProfile = (changes) => ({ ...payload(), profile: { ...payload().profile, ...changes } });
  assert.throws(() => validatePayload(withProfile({ birthDate: '2024-02-30' }), deck));
  assert.throws(() => validatePayload(withProfile({ birthDate: '2099-01-01' }), deck));
  assert.doesNotThrow(() => validatePayload(withProfile({ birthDate: '2000-02-29' }), deck));
  for (const field of ['name', 'birthDate', 'status', 'gender', 'career']) {
    assert.throws(() => validatePayload(withProfile({ [field]: '' }), deck), /complete all personal details/, field);
    assert.throws(() => validatePayload(withProfile({ [field]: '   ' }), deck), undefined, `${field} with spaces only`);
  }
});
