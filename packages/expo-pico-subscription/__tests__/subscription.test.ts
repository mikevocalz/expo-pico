import { isSubscriptionAvailable, getSubscriptionSdkVersion } from '../src/index';

jest.mock('expo-modules-core', () => ({
  requireNativeModule: () => ({
    subscriptionSdkAvailable: false,
    subscriptionSdkVersion: null,
  }),
}));

describe('expo-pico-subscription', () => {
  describe('isSubscriptionAvailable', () => {
    it('returns false when SDK is not present', () => {
      expect(isSubscriptionAvailable()).toBe(false);
    });
  });

  describe('getSubscriptionSdkVersion', () => {
    it('returns unavailable when SDK is not present', () => {
      expect(getSubscriptionSdkVersion()).toBe('unavailable');
    });
  });

  describe('extension seams', () => {
    it('getSubscriptionProducts throws a descriptive error', async () => {
      const { getSubscriptionProducts } = await import('../src/index');
      await expect(getSubscriptionProducts(['sku-1'])).rejects.toThrow(
        'expo-pico-subscription: getSubscriptionProducts()'
      );
    });

    it('subscribe throws a descriptive error', async () => {
      const { subscribe } = await import('../src/index');
      await expect(subscribe({ sku: 'sku-1' })).rejects.toThrow(
        'expo-pico-subscription: subscribe()'
      );
    });

    it('getSubscriptionEntitlement throws a descriptive error', async () => {
      const { getSubscriptionEntitlement } = await import('../src/index');
      await expect(getSubscriptionEntitlement('sku-1')).rejects.toThrow(
        'expo-pico-subscription: getSubscriptionEntitlement()'
      );
    });

    it('getActiveSubscriptions throws a descriptive error', async () => {
      const { getActiveSubscriptions } = await import('../src/index');
      await expect(getActiveSubscriptions()).rejects.toThrow(
        'expo-pico-subscription: getActiveSubscriptions()'
      );
    });

    it('cancelSubscription throws a descriptive error', async () => {
      const { cancelSubscription } = await import('../src/index');
      await expect(cancelSubscription('sku-1')).rejects.toThrow(
        'expo-pico-subscription: cancelSubscription()'
      );
    });
  });
});
