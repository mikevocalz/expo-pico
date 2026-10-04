"use strict";
// Typed wrapper + React hooks for @expo-pico/notifications (Pico push).
//
// Capability-gated: when @expo-pico/notifications' native bridge isn't
// active (no PPS push artifact on classpath), permission queries return
// 'not-determined' and register/listeners are no-ops.
Object.defineProperty(exports, "__esModule", { value: true });
exports.picoNotifications = void 0;
exports.getPermissionStatus = getPermissionStatus;
exports.requestPermissions = requestPermissions;
exports.registerForPush = registerForPush;
exports.onNotificationReceived = onNotificationReceived;
exports.onNotificationOpened = onNotificationOpened;
exports.useNotificationPermission = useNotificationPermission;
exports.usePushToken = usePushToken;
exports.useIncomingNotification = useIncomingNotification;
const react_1 = require("react");
const picoCapabilities_1 = require("./picoCapabilities");
const NULL_SUB = { remove: () => { } };
let cachedModule;
function notif() {
    if (cachedModule !== undefined)
        return cachedModule;
    try {
        cachedModule = require('@expo-pico/notifications');
    }
    catch {
        cachedModule = null;
    }
    return cachedModule;
}
let warned = false;
function warnOnce() {
    if (warned)
        return;
    warned = true;
    console.warn('[pico/notifications] bridge unavailable — PPS Push SDK not on ' +
        'classpath. Verify com.pico.pps:platform-service-push is resolving on ' +
        'Bytedance maven (or that the AAR is in android/app/libs/).');
}
// ───────── Imperative API ─────────
function getPermissionStatus() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().push)
        return 'not-determined';
    try {
        return notif()?.getNotificationPermissionStatus?.() ?? 'not-determined';
    }
    catch {
        return 'not-determined';
    }
}
async function requestPermissions() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().push) {
        warnOnce();
        return 'not-determined';
    }
    try {
        const result = await notif()?.requestPermissions?.();
        return result?.status ?? 'not-determined';
    }
    catch {
        return 'not-determined';
    }
}
async function registerForPush() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().push)
        return null;
    try {
        const result = await notif()?.registerForPushNotifications?.();
        return result?.token ?? null;
    }
    catch {
        return null;
    }
}
function onNotificationReceived(cb) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().push)
        return NULL_SUB;
    try {
        const sub = notif()?.addNotificationReceivedListener?.(cb) ?? notif()?.addReceivedListener?.(cb);
        return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
    }
    catch {
        return NULL_SUB;
    }
}
function onNotificationOpened(cb) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().push)
        return NULL_SUB;
    try {
        const sub = notif()?.addNotificationOpenedListener?.(cb) ?? notif()?.addOpenedListener?.(cb);
        return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
    }
    catch {
        return NULL_SUB;
    }
}
// ───────── React hooks ─────────
// Returns the current permission status and a callback to request it.
// Re-fetches status on mount.
function useNotificationPermission() {
    const [status, setStatus] = (0, react_1.useState)(() => getPermissionStatus());
    (0, react_1.useEffect)(() => {
        setStatus(getPermissionStatus());
    }, []);
    const request = (0, react_1.useCallback)(async () => {
        const next = await requestPermissions();
        setStatus(next);
        return next;
    }, []);
    return { status, request };
}
// Returns the current push token (re-registers on mount). null when
// permission isn't granted or the bridge is inactive.
function usePushToken() {
    const [token, setToken] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        registerForPush().then((t) => {
            if (!cancelled)
                setToken(t);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return token;
}
// Subscribes to incoming notifications while the subscribing component is
// mounted. Returns the latest payload (or null) so the consumer can render
// it inline; for richer in-app banners, build on top of this with state.
function useIncomingNotification() {
    const [payload, setPayload] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const sub = onNotificationReceived(setPayload);
        return () => sub.remove();
    }, []);
    return payload;
}
exports.picoNotifications = {
    getPermissionStatus,
    requestPermissions,
    registerForPush,
    onNotificationReceived,
    onNotificationOpened,
    isAvailable: () => (0, picoCapabilities_1.getPicoCapabilities)().push,
};
//# sourceMappingURL=picoNotifications.js.map