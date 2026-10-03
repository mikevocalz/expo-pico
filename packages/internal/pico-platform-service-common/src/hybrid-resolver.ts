import { requireOptionalNativeModule } from 'expo-modules-core';

const EXPO_MODULES: Record<string, { name: string; prefix: string }> = {
  PicoAccount: { name: 'ExpoPicoAccount', prefix: 'account' },
  PicoAchievements: { name: 'ExpoPicoAchievements', prefix: 'achievements' },
  PicoIap: { name: 'ExpoPicoIap', prefix: 'iap' },
  PicoLeaderboards: { name: 'ExpoPicoLeaderboards', prefix: 'leaderboards' },
  PicoNotifications: { name: 'ExpoPicoNotifications', prefix: 'notifications' },
  PicoRooms: { name: 'ExpoPicoRooms', prefix: 'rooms' },
  PicoRtc: { name: 'ExpoPicoRtc', prefix: 'rtc' },
  PicoSocial: { name: 'ExpoPicoSocial', prefix: 'social' },
  PicoStorage: { name: 'ExpoPicoStorage', prefix: 'storage' },
  PicoSubscription: { name: 'ExpoPicoSubscription', prefix: 'subscription' },
};

const EVENT_METHODS: Record<string, Record<string, string>> = {
  PicoAchievements: { addAchievementUnlockedListener: 'onAchievementUnlocked' },
  PicoNotifications: {
    addPushMessageListener: 'onPushMessage',
    addPushRevocationListener: 'onPushRevocation',
  },
  PicoRooms: {
    addRoomUpdatedListener: 'onRoomUpdated',
    addRoomUserJoinedListener: 'onRoomUserJoined',
    addRoomUserLeftListener: 'onRoomUserLeft',
    addMatchmakingFoundListener: 'onMatchmakingFound',
  },
  PicoRtc: {
    addUserJoinedListener: 'onRtcUserJoined',
    addUserLeftListener: 'onRtcUserLeft',
    addRtcStateChangeListener: 'onRtcStateChange',
  },
  PicoSocial: {
    addFriendPresenceChangedListener: 'onFriendPresenceChanged',
    addFriendRequestReceivedListener: 'onFriendRequestReceived',
    addInviteReceivedListener: 'onInviteReceived',
    addLaunchDetailsListener: 'onLaunchDetails',
  },
  PicoStorage: {
    addStorageConflictListener: 'onStorageConflict',
    addStorageSyncProgressListener: 'onStorageSyncProgress',
    addStorageSyncCompleteListener: 'onStorageSyncComplete',
  },
};

const cache = new Map<string, unknown>();
let nextListenerId = 1;
const listeners = new Map<number, { remove(): void }>();

function bindIfFunction(target: object, value: unknown): unknown {
  return typeof value === 'function' ? value.bind(target) : value;
}

function unsupported(name: string, method: string): never {
  throw new Error(
    `NOT_IMPLEMENTED: ${name}.${method} is not exposed by the current PICO PPS surface`
  );
}

export function resolveHybridObject<T extends object>(name: string): T | null {
  if (cache.has(name)) return cache.get(name) as T | null;

  const mapping = EXPO_MODULES[name];
  let module: Record<string, unknown> | null = null;
  try {
    module = requireOptionalNativeModule(mapping?.name ?? name) as unknown as Record<
      string,
      unknown
    > | null;
  } catch {
    module = null;
  }

  if (!module) {
    cache.set(name, null);
    return null;
  }

  const prefix = mapping?.prefix;
  const eventMethods = EVENT_METHODS[name] ?? {};

  const adapted = new Proxy(module, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string') return Reflect.get(target, prop, receiver);

      if (prop in target && target[prop] !== undefined) {
        return bindIfFunction(target, target[prop]);
      }

      const propertyAlias =
        prop === 'available'
          ? `${prefix}SdkAvailable`
          : prop === 'sdkVersion'
            ? `${prefix}SdkVersion`
            : prop === 'sdkStatus'
              ? `${prefix}SdkStatus`
              : prop === 'status'
                ? `${prefix}Status`
                : prop === 'permissionStatus'
                  ? 'notificationPermissionStatus'
                  : prop === 'sessionState'
                    ? null
                    : null;

      if (propertyAlias && propertyAlias in target && target[propertyAlias] !== undefined) {
        return bindIfFunction(target, target[propertyAlias]);
      }

      if (name === 'PicoRooms' && prop === 'sessionState') {
        const getter = (target as any).getRoomSessionState;
        return typeof getter === 'function'
          ? getter.call(target)
          : { memberCount: 0, connectionState: 'disconnected' };
      }

      if (eventMethods[prop]) {
        return (listener: (...args: any[]) => void) => {
          const id = nextListenerId++;
          try {
            const addListener = (target as any).addListener;
            const subscription =
              typeof addListener === 'function'
                ? addListener.call(target, eventMethods[prop], listener)
                : { remove() {} };
            listeners.set(id, subscription ?? { remove() {} });
          } catch {
            listeners.set(id, { remove() {} });
          }
          return id;
        };
      }

      if (prop === 'removeListener' || prop === 'removeAchievementUnlockedListener') {
        return (id: number) => {
          listeners.get(id)?.remove();
          listeners.delete(id);
        };
      }

      if (name === 'PicoAchievements' && prop === 'getUnlockedAchievements') {
        return async () => {
          const all = await (target as any).getAllAchievements();
          return Array.isArray(all)
            ? all.filter((item: any) => item?.unlocked === true || item?.isUnlocked === true)
            : [];
        };
      }

      if (name === 'PicoIap' && prop === 'isProductPurchased') {
        return async (sku: string) => {
          const history = await (target as any).getPurchaseHistory();
          return Array.isArray(history)
            ? history.some((item: any) => item?.sku === sku || item?.productId === sku)
            : false;
        };
      }

      if (name === 'PicoRooms' && (prop === 'requestMatchmaking' || prop === 'cancelMatchmaking')) {
        return async () => unsupported(name, prop);
      }

      if (name === 'PicoSubscription' && prop === 'cancelSubscription') {
        return async () => unsupported(name, prop);
      }

      if (name === 'PicoSocial' && prop === 'getLaunchDetails') {
        return () => ({
          launchType: 'normal',
          launchResult: 'unknown',
          launchSource: '',
          deepLinkMessage: '',
          destinationApiName: '',
          trackingId: '',
          lobbySessionId: '',
          matchSessionId: '',
          extra: '',
          clientAction: '',
        });
      }

      if (
        name === 'PicoSocial' &&
        [
          'getDestinations',
          'getInvitableUsers',
          'getSentInvites',
          'launchApp',
          'launchPresenceInvitePanel',
          'launchInviteUserJoinRoomFlow',
          'launchStore',
          'shareVideo',
          'shareImages',
        ].includes(prop)
      ) {
        return async () => unsupported(name, prop);
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as T;

  cache.set(name, adapted);
  return adapted;
}

export function __resetHybridCache(): void {
  for (const subscription of listeners.values()) subscription.remove();
  listeners.clear();
  cache.clear();
}
