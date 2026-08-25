import { NULL_SUBSCRIPTION } from '../event-helpers';

describe('NULL_SUBSCRIPTION', () => {
  it('has a remove function', () => {
    expect(typeof NULL_SUBSCRIPTION.remove).toBe('function');
  });

  it('remove() does not throw', () => {
    expect(() => NULL_SUBSCRIPTION.remove()).not.toThrow();
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(NULL_SUBSCRIPTION)).toBe(true);
  });

  it('remove() is idempotent — safe to call multiple times', () => {
    expect(() => {
      NULL_SUBSCRIPTION.remove();
      NULL_SUBSCRIPTION.remove();
      NULL_SUBSCRIPTION.remove();
    }).not.toThrow();
  });
});
