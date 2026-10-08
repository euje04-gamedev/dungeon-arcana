// Legend:  [TWEAK] = safe to change   [CAREFUL] = changeable, but read the note   [LOCKED] = do not touch

// [LOCKED] Vitest's test helpers. Imported explicitly (no globals), so every test file shows where its tools come from.
import { describe, expect, it } from 'vitest';
// [LOCKED] Imports from the engine through a relative path, the same way real engine tests will.
import { MAX_HEALTH } from '../src/engine/types';

// [TWEAK] Groups the tests below under one label in the output.
describe('scaffold smoke test', () => {
  // [CAREFUL] Locks the rulebook's 30 HP cap (Section 3). If you change MAX_HEALTH on purpose to tweak the mechanics, update this number AND the rulebook.
  it('exposes the rulebook health cap of 30', () => {
    expect(MAX_HEALTH).toBe(30); // [CAREFUL] Fails if the cap changes.
  });

  // [LOCKED] Proves tests run with no browser, so any DOM use in the engine would fail loudly (README principle 1).
  it('runs in a DOM-free environment', () => {
    expect(typeof window).toBe('undefined'); // [LOCKED] "window" must not exist here.
  });
});
