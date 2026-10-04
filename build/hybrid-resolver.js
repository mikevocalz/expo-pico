"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHybridObject = resolveHybridObject;
exports.__resetHybridCache = __resetHybridCache;
const expo_modules_core_1 = require("expo-modules-core");
const EXPO_MODULES = {
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
const EVENT_METHODS = {
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
    // PPS 1.0.x only pushes launch-intent changes. Friend presence, friend
    // requests and invites have no PPS listener, so @expo-pico/social does not
    // route them here.
    PicoSocial: {
        addLaunchDetailsListener: 'onLaunchDetails',
    },
    PicoStorage: {
        addStorageConflictListener: 'onStorageConflict',
        addStorageSyncProgressListener: 'onStorageSyncProgress',
        addStorageSyncCompleteListener: 'onStorageSyncComplete',
    },
};
const cache = new Map();
let nextListenerId = 1;
const listeners = new Map();
function bindIfFunction(target, value) {
    return typeof value === 'function' ? value.bind(target) : value;
}
function unsupported(name, method) {
    throw new Error(`NOT_IMPLEMENTED: ${name}.${method} is not exposed by the current PICO PPS surface`);
}
function resolveHybridObject(name) {
    if (cache.has(name))
        return cache.get(name);
    const mapping = EXPO_MODULES[name];
    let module = null;
    try {
        module = (0, expo_modules_core_1.requireOptionalNativeModule)(mapping?.name ?? name);
    }
    catch {
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
            if (typeof prop !== 'string')
                return Reflect.get(target, prop, receiver);
            if (prop in target && target[prop] !== undefined) {
                return bindIfFunction(target, target[prop]);
            }
            const propertyAlias = prop === 'available'
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
                const getter = target.getRoomSessionState;
                return typeof getter === 'function'
                    ? getter.call(target)
                    : { memberCount: 0, connectionState: 'disconnected' };
            }
            if (eventMethods[prop]) {
                return (listener) => {
                    const id = nextListenerId++;
                    try {
                        const addListener = target.addListener;
                        const subscription = typeof addListener === 'function'
                            ? addListener.call(target, eventMethods[prop], listener)
                            : { remove() { } };
                        listeners.set(id, subscription ?? { remove() { } });
                    }
                    catch {
                        listeners.set(id, { remove() { } });
                    }
                    return id;
                };
            }
            if (prop === 'removeListener' || prop === 'removeAchievementUnlockedListener') {
                return (id) => {
                    listeners.get(id)?.remove();
                    listeners.delete(id);
                };
            }
            if (name === 'PicoAchievements' && prop === 'getUnlockedAchievements') {
                return async () => {
                    const all = await target.getAllAchievements();
                    return Array.isArray(all)
                        ? all.filter((item) => item?.unlocked === true || item?.isUnlocked === true)
                        : [];
                };
            }
            if (name === 'PicoIap' && prop === 'isProductPurchased') {
                return async (sku) => {
                    const history = await target.getPurchaseHistory();
                    return Array.isArray(history)
                        ? history.some((item) => item?.sku === sku || item?.productId === sku)
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
            if (name === 'PicoSocial' &&
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
                ].includes(prop)) {
                return async () => unsupported(name, prop);
            }
            return Reflect.get(target, prop, receiver);
        },
    });
    cache.set(name, adapted);
    return adapted;
}
function __resetHybridCache() {
    for (const subscription of listeners.values())
        subscription.remove();
    listeners.clear();
    cache.clear();
}
