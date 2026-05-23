import { isRoomsAvailable } from '../src/index';

jest.mock('expo-modules-core', () => ({
  requireNativeModule: () => ({ roomsSdkAvailable: false }),
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  })),
}));

describe('@expo-pico/rooms', () => {
  describe('isRoomsAvailable', () => {
    it('returns false when SDK is not present', () => {
      expect(isRoomsAvailable()).toBe(false);
    });
  });

  describe('extension seams', () => {
    it('createRoom throws a descriptive error', async () => {
      const { createRoom } = await import('../src/index');
      await expect(createRoom()).rejects.toThrow('expo-pico-rooms: createRoom()');
    });

    it('joinRoom throws a descriptive error', async () => {
      const { joinRoom } = await import('../src/index');
      await expect(joinRoom('room-123')).rejects.toThrow('expo-pico-rooms: joinRoom()');
    });

    it('requestMatchmaking throws a descriptive error', async () => {
      const { requestMatchmaking } = await import('../src/index');
      await expect(requestMatchmaking({ poolName: 'default' })).rejects.toThrow(
        'expo-pico-rooms: requestMatchmaking()'
      );
    });
  });
});
