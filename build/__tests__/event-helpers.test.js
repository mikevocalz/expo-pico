"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_helpers_1 = require("../event-helpers");
describe('NULL_SUBSCRIPTION', () => {
    it('has a remove function', () => {
        expect(typeof event_helpers_1.NULL_SUBSCRIPTION.remove).toBe('function');
    });
    it('remove() does not throw', () => {
        expect(() => event_helpers_1.NULL_SUBSCRIPTION.remove()).not.toThrow();
    });
    it('is frozen (immutable)', () => {
        expect(Object.isFrozen(event_helpers_1.NULL_SUBSCRIPTION)).toBe(true);
    });
    it('remove() is idempotent — safe to call multiple times', () => {
        expect(() => {
            event_helpers_1.NULL_SUBSCRIPTION.remove();
            event_helpers_1.NULL_SUBSCRIPTION.remove();
            event_helpers_1.NULL_SUBSCRIPTION.remove();
        }).not.toThrow();
    });
});
