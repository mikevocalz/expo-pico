import { getRtcServiceStatus, getRtcSdkVersion } from '../src/index';

// Mock the native module
jest.mock('expo-modules-core', () => ({
  requireNativeModule: () => ({
    rtcSdkAvailable: false,
    rtcSdkVersion: null,
  }),
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  })),
}));

describe('expo-pico-rtc', () => {
  describe('getRtcServiceStatus', () => {
    it('returns unavailable when SDK is not present', () => {
      expect(getRtcServiceStatus()).toBe('unavailable');
    });
  });

  describe('getRtcSdkVersion', () => {
    it('returns null when SDK is not present', () => {
      expect(getRtcSdkVersion()).toBeNull();
    });
  });

  describe('extension seams', () => {
    it('initRtcEngine throws a descriptive error', async () => {
      const { initRtcEngine } = await import('../src/index');
      await expect(initRtcEngine()).rejects.toThrow('expo-pico-rtc: initRtcEngine()');
    });

    it('joinChannel throws a descriptive error', async () => {
      const { joinChannel } = await import('../src/index');
      await expect(
        joinChannel({ channelId: 'test', token: 'tok', uid: 1 })
      ).rejects.toThrow('expo-pico-rtc: joinChannel()');
    });

    it('leaveChannel throws a descriptive error', async () => {
      const { leaveChannel } = await import('../src/index');
      await expect(leaveChannel()).rejects.toThrow('expo-pico-rtc: leaveChannel()');
    });
  });
});
