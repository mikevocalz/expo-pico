"use strict";
// Single import surface for the entire expo-pico-* stack.
//
//   import { bootPico, getPicoCapabilities, haptics, onGaze, account } from '@/pico';
//
// All wrappers are no-op-safe when the underlying Pico SDK AAR is absent
// — you can write app code unconditionally and let the boot-time
// capability table decide what UI to render.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerForPush = exports.requestNotificationPermissions = exports.getNotificationPermissionStatus = exports.picoNotifications = exports.useRtcChannel = exports.rtcOnUserLeft = exports.rtcOnUserJoined = exports.rtcSetVolume = exports.rtcSetMuted = exports.rtcLeave = exports.rtcJoin = exports.picoRtc = exports.useStorageEntry = exports.hydrateFromCloud = exports.syncToCloud = exports.getStringFresh = exports.removeStorageEntry = exports.setJSON = exports.getJSON = exports.setBoolean = exports.getBoolean = exports.setNumber = exports.getNumber = exports.setString = exports.getString = exports.picoStorage = exports.subscription = exports.storage = exports.rtc = exports.social = exports.push = exports.friend = exports.leaderboard = exports.achievement = exports.iap = exports.account = exports.createAnchor = exports.requestFullSpace = exports.onBody = exports.onFace = exports.onSceneMeshUpdate = exports.getSceneMesh = exports.getGazeSnapshot = exports.onGaze = exports.setWindowContainerProperties = exports.haptics = exports.logPicoCapabilities = exports.refreshPicoCapabilities = exports.getPicoCapabilities = exports.bootPico = void 0;
exports.useIncomingNotification = exports.usePushToken = exports.useNotificationPermission = exports.onNotificationOpened = exports.onNotificationReceived = void 0;
var picoBoot_1 = require("./picoBoot");
Object.defineProperty(exports, "bootPico", { enumerable: true, get: function () { return picoBoot_1.bootPico; } });
var picoCapabilities_1 = require("./picoCapabilities");
Object.defineProperty(exports, "getPicoCapabilities", { enumerable: true, get: function () { return picoCapabilities_1.getPicoCapabilities; } });
Object.defineProperty(exports, "refreshPicoCapabilities", { enumerable: true, get: function () { return picoCapabilities_1.refreshPicoCapabilities; } });
Object.defineProperty(exports, "logPicoCapabilities", { enumerable: true, get: function () { return picoCapabilities_1.logPicoCapabilities; } });
var picoHaptics_1 = require("./picoHaptics");
Object.defineProperty(exports, "haptics", { enumerable: true, get: function () { return picoHaptics_1.haptics; } });
var picoSpatial_1 = require("./picoSpatial");
Object.defineProperty(exports, "setWindowContainerProperties", { enumerable: true, get: function () { return picoSpatial_1.setWindowContainerProperties; } });
Object.defineProperty(exports, "onGaze", { enumerable: true, get: function () { return picoSpatial_1.onGaze; } });
Object.defineProperty(exports, "getGazeSnapshot", { enumerable: true, get: function () { return picoSpatial_1.getGazeSnapshot; } });
Object.defineProperty(exports, "getSceneMesh", { enumerable: true, get: function () { return picoSpatial_1.getSceneMesh; } });
Object.defineProperty(exports, "onSceneMeshUpdate", { enumerable: true, get: function () { return picoSpatial_1.onSceneMeshUpdate; } });
Object.defineProperty(exports, "onFace", { enumerable: true, get: function () { return picoSpatial_1.onFace; } });
Object.defineProperty(exports, "onBody", { enumerable: true, get: function () { return picoSpatial_1.onBody; } });
Object.defineProperty(exports, "requestFullSpace", { enumerable: true, get: function () { return picoSpatial_1.requestFullSpace; } });
Object.defineProperty(exports, "createAnchor", { enumerable: true, get: function () { return picoSpatial_1.createAnchor; } });
var picoServices_1 = require("./picoServices");
Object.defineProperty(exports, "account", { enumerable: true, get: function () { return picoServices_1.account; } });
Object.defineProperty(exports, "iap", { enumerable: true, get: function () { return picoServices_1.iap; } });
Object.defineProperty(exports, "achievement", { enumerable: true, get: function () { return picoServices_1.achievement; } });
Object.defineProperty(exports, "leaderboard", { enumerable: true, get: function () { return picoServices_1.leaderboard; } });
Object.defineProperty(exports, "friend", { enumerable: true, get: function () { return picoServices_1.friend; } });
Object.defineProperty(exports, "push", { enumerable: true, get: function () { return picoServices_1.push; } });
Object.defineProperty(exports, "social", { enumerable: true, get: function () { return picoServices_1.social; } });
Object.defineProperty(exports, "rtc", { enumerable: true, get: function () { return picoServices_1.rtc; } });
Object.defineProperty(exports, "storage", { enumerable: true, get: function () { return picoServices_1.storage; } });
Object.defineProperty(exports, "subscription", { enumerable: true, get: function () { return picoServices_1.subscription; } });
// Typed wrappers + React hooks layered on top of the Proxy services. Prefer
// these over the raw services for app code — they're capability-gated,
// statically typed, and hook-friendly.
var picoStorage_1 = require("./picoStorage");
Object.defineProperty(exports, "picoStorage", { enumerable: true, get: function () { return picoStorage_1.picoStorage; } });
Object.defineProperty(exports, "getString", { enumerable: true, get: function () { return picoStorage_1.getString; } });
Object.defineProperty(exports, "setString", { enumerable: true, get: function () { return picoStorage_1.setString; } });
Object.defineProperty(exports, "getNumber", { enumerable: true, get: function () { return picoStorage_1.getNumber; } });
Object.defineProperty(exports, "setNumber", { enumerable: true, get: function () { return picoStorage_1.setNumber; } });
Object.defineProperty(exports, "getBoolean", { enumerable: true, get: function () { return picoStorage_1.getBoolean; } });
Object.defineProperty(exports, "setBoolean", { enumerable: true, get: function () { return picoStorage_1.setBoolean; } });
Object.defineProperty(exports, "getJSON", { enumerable: true, get: function () { return picoStorage_1.getJSON; } });
Object.defineProperty(exports, "setJSON", { enumerable: true, get: function () { return picoStorage_1.setJSON; } });
Object.defineProperty(exports, "removeStorageEntry", { enumerable: true, get: function () { return picoStorage_1.remove; } });
Object.defineProperty(exports, "getStringFresh", { enumerable: true, get: function () { return picoStorage_1.getStringFresh; } });
Object.defineProperty(exports, "syncToCloud", { enumerable: true, get: function () { return picoStorage_1.syncToCloud; } });
Object.defineProperty(exports, "hydrateFromCloud", { enumerable: true, get: function () { return picoStorage_1.hydrateFromCloud; } });
Object.defineProperty(exports, "useStorageEntry", { enumerable: true, get: function () { return picoStorage_1.useStorageEntry; } });
var picoRtc_1 = require("./picoRtc");
Object.defineProperty(exports, "picoRtc", { enumerable: true, get: function () { return picoRtc_1.picoRtc; } });
Object.defineProperty(exports, "rtcJoin", { enumerable: true, get: function () { return picoRtc_1.joinChannel; } });
Object.defineProperty(exports, "rtcLeave", { enumerable: true, get: function () { return picoRtc_1.leaveChannel; } });
Object.defineProperty(exports, "rtcSetMuted", { enumerable: true, get: function () { return picoRtc_1.setLocalMuted; } });
Object.defineProperty(exports, "rtcSetVolume", { enumerable: true, get: function () { return picoRtc_1.setOutputVolume; } });
Object.defineProperty(exports, "rtcOnUserJoined", { enumerable: true, get: function () { return picoRtc_1.onUserJoined; } });
Object.defineProperty(exports, "rtcOnUserLeft", { enumerable: true, get: function () { return picoRtc_1.onUserLeft; } });
Object.defineProperty(exports, "useRtcChannel", { enumerable: true, get: function () { return picoRtc_1.useRtcChannel; } });
var picoNotifications_1 = require("./picoNotifications");
Object.defineProperty(exports, "picoNotifications", { enumerable: true, get: function () { return picoNotifications_1.picoNotifications; } });
Object.defineProperty(exports, "getNotificationPermissionStatus", { enumerable: true, get: function () { return picoNotifications_1.getPermissionStatus; } });
Object.defineProperty(exports, "requestNotificationPermissions", { enumerable: true, get: function () { return picoNotifications_1.requestPermissions; } });
Object.defineProperty(exports, "registerForPush", { enumerable: true, get: function () { return picoNotifications_1.registerForPush; } });
Object.defineProperty(exports, "onNotificationReceived", { enumerable: true, get: function () { return picoNotifications_1.onNotificationReceived; } });
Object.defineProperty(exports, "onNotificationOpened", { enumerable: true, get: function () { return picoNotifications_1.onNotificationOpened; } });
Object.defineProperty(exports, "useNotificationPermission", { enumerable: true, get: function () { return picoNotifications_1.useNotificationPermission; } });
Object.defineProperty(exports, "usePushToken", { enumerable: true, get: function () { return picoNotifications_1.usePushToken; } });
Object.defineProperty(exports, "useIncomingNotification", { enumerable: true, get: function () { return picoNotifications_1.useIncomingNotification; } });
//# sourceMappingURL=index.js.map