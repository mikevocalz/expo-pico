"use strict";
// PPS service barrel. Re-exports the seven platform-service modules so
// app code can do `import { account, iap, social, ... } from '@/pico'`
// without remembering each individual package name.
//
// Metro doesn't allow dynamic require() with a variable argument, so
// each loader is its own static try/require — clunkier than a Proxy but
// the only shape Metro will accept.
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscription = exports.storage = exports.rtc = exports.social = exports.push = exports.friend = exports.leaderboard = exports.achievement = exports.iap = exports.account = void 0;
const picoCapabilities_1 = require("./picoCapabilities");
function loadModule(loader) {
    try {
        const m = loader();
        return m ?? null;
    }
    catch {
        return null;
    }
}
function makeWrapper(loader, capability, label) {
    return new Proxy({}, {
        get(_target, prop) {
            if (!(0, picoCapabilities_1.getPicoCapabilities)()[capability]) {
                return () => Promise.reject(new Error(`[pico/${label}] bridge unavailable — required PICO SDK class not on classpath`));
            }
            const mod = loadModule(loader);
            if (!mod) {
                return () => Promise.reject(new Error(`[pico/${label}] module failed to load`));
            }
            const value = mod[prop];
            return typeof value === 'function' ? value.bind(mod) : value;
        },
    });
}
exports.account = makeWrapper(() => require('@expo-pico/account'), 'account', 'account');
exports.iap = makeWrapper(() => require('@expo-pico/iap'), 'iap', 'iap');
exports.achievement = makeWrapper(() => require('@expo-pico/achievements'), 'achievement', 'achievement');
exports.leaderboard = makeWrapper(() => require('@expo-pico/leaderboards'), 'leaderboard', 'leaderboard');
exports.friend = makeWrapper(() => require('@expo-pico/rooms'), 'friend', 'friend');
exports.push = makeWrapper(() => require('@expo-pico/notifications'), 'push', 'push');
exports.social = makeWrapper(() => require('@expo-pico/social'), 'social', 'social');
exports.rtc = makeWrapper(() => require('@expo-pico/rtc'), 'rtc', 'rtc');
exports.storage = makeWrapper(() => require('@expo-pico/storage'), 'storage', 'storage');
exports.subscription = makeWrapper(() => require('@expo-pico/subscription'), 'subscription', 'subscription');
//# sourceMappingURL=picoServices.js.map