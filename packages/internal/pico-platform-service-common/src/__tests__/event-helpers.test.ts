import { NULL_SUBSCRIPTION, createNativeEventEmitter, safeAddListener } from '../event-helpers';

// Mock expo-modules-core for test environment
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn((eventName: string, cb: () => void) => ({
      remove: jest.fn(),
      _eventName: eventName,
    })),
  })),
}));

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

describe('createNativeEventEmitter', () => {
  it('returns null when module is null', () => {
    expect(createNativeEventEmitter(null)).toBeNull();
  });

  it('returns an EventEmitter when module is provided', () => {
    const fakeModule = { addListener: jest.fn(), removeListeners: jest.fn() } as any;
    const result = createNativeEventEmitter(fakeModule);
    expect(result).not.toBeNull();
  });

  it('does not throw when module is null', () => {
    expect(() => createNativeEventEmitter(null)).not.toThrow();
  });
});

describe('safeAddListener', () => {
  it('returns NULL_SUBSCRIPTION when emitter is null', () => {
    const sub = safeAddListener(null, 'anyEvent', () => {});
    expect(sub).toBe(NULL_SUBSCRIPTION);
  });

  it('calls addListener on emitter when available', () => {
    const mockRemove = jest.fn();
    const mockEmitter = {
      addListener: jest.fn(() => ({ remove: mockRemove })),
    } as any;
    const listener = jest.fn();

    const sub = safeAddListener(mockEmitter, 'testEvent', listener);
    expect(mockEmitter.addListener).toHaveBeenCalledWith('testEvent', listener);
    expect(sub).toEqual({ remove: mockRemove });
  });

  it('returns a subscription with remove() when emitter is present', () => {
    const mockEmitter = {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    } as any;
    const sub = safeAddListener(mockEmitter, 'testEvent', () => {});
    expect(typeof sub.remove).toBe('function');
  });
});
