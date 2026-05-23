// Runtime capability probe for the expo-pico-* stack.
//
// The expo-pico packages each register a native module under a name
// like `ExpoPicoSpatial` / `ExpoPicoHaptics` / `ExpoPicoAccount`. Each
// module either ships with reflection-based detection (in which case
// it exposes `is{Name}Available()`) or its mere presence + a non-null
// constants table indicates the corresponding Pico SDK class is on the
// classpath.
//
// We probe once at app boot, cache the result, and expose a snapshot
// every UI surface can read synchronously. The probe is fail-soft —
// if a module's JS side throws on import (mismatched SDK version, etc.)
// the capability is treated as absent rather than crashing the app.

export type PicoCapabilities = {
  // Pico Platform Service SDK (com.pico.pps:*) — public maven
  account: boolean;
  iap: boolean;
  achievement: boolean;
  leaderboard: boolean;
  friend: boolean;
  push: boolean;
  social: boolean;
  rtc: boolean;
  storage: boolean;
  subscription: boolean;
  // Pico Native SDK (haptics) — auth-gated AAR
  haptics: boolean;
  // Pico Spatial SDK (window/gaze/mesh/face/body) — auth-gated AAR
  windowContainer: boolean;
  eyeGaze: boolean;
  sceneMesh: boolean;
  faceTracking: boolean;
  bodyTracking: boolean;
  // Always-on capabilities (no AAR needed)
  spatialAudio: boolean;
  handTracking: boolean;
  passthrough: boolean;
  controllers: boolean;
};

const NONE: PicoCapabilities = {
  account: false,
  iap: false,
  achievement: false,
  leaderboard: false,
  friend: false,
  push: false,
  social: false,
  rtc: false,
  storage: false,
  subscription: false,
  haptics: false,
  windowContainer: false,
  eyeGaze: false,
  sceneMesh: false,
  faceTracking: false,
  bodyTracking: false,
  spatialAudio: true, // Viro always supports ViroSpatialSound
  handTracking: true, // Viro onHandUpdate works on Pico via OpenXR
  passthrough: true,  // Viro passthroughEnabled prop
  controllers: true,  // Viro ViroController
};

let cached: PicoCapabilities | null = null;

// Each entry: probe key on the capability table, expo-pico-* module
// import, and a function that returns true when the underlying native
// bridge has resolved. We keep the require() lazy so a non-Pico build
// or stripped flavor can opt out by deleting the require call without
// touching this map.
function probeOne<T extends keyof PicoCapabilities>(
  key: T,
  loadModule: () => any,
  predicate: (m: any) => boolean,
): boolean {
  try {
    const m = loadModule();
    if (!m) return false;
    return predicate(m);
  } catch {
    return false;
  }
}

function safeBoolean(value: any): boolean {
  try {
    if (typeof value === 'function') return Boolean(value());
    return Boolean(value);
  } catch {
    return false;
  }
}

function buildCapabilities(): PicoCapabilities {
  return {
    ...NONE,
    account: probeOne(
      'account',
      () => require('@expo-pico/account'),
      (m) => safeBoolean(m.isAccountAvailable),
    ),
    iap: probeOne(
      'iap',
      () => require('@expo-pico/iap'),
      (m) => safeBoolean(m.isIapAvailable),
    ),
    achievement: probeOne(
      'achievement',
      () => require('@expo-pico/achievements'),
      (m) => safeBoolean(m.isAchievementsAvailable),
    ),
    leaderboard: probeOne(
      'leaderboard',
      () => require('@expo-pico/leaderboards'),
      (m) => safeBoolean(m.isLeaderboardsAvailable),
    ),
    friend: probeOne(
      'friend',
      () => require('@expo-pico/rooms'),
      (m) => safeBoolean(m.isRoomsAvailable),
    ),
    push: probeOne(
      'push',
      () => require('@expo-pico/notifications'),
      (m) => safeBoolean(m.isNotificationsAvailable),
    ),
    social: probeOne(
      'social',
      () => require('@expo-pico/social'),
      (m) => safeBoolean(m.isSocialAvailable),
    ),
    // RTC is backed by Fishjam (Software Mansion's open-source RTC,
    // public Maven Central deps, no auth gate). Pico's PPS RTC AAR is
    // Unity-only on Android and BytePlus auth-gates its native maven.
    // The probe is "is FishjamClient loadable?" — true when
    // @fishjam-cloud/react-native-client + ts-client are installed.
    //
    // NB: Fishjam ALSO requires a server-side API key (used by your
    // backend to mint per-peer JWT tokens). The client never sees the
    // API key. See picoRtc.ts header for the full auth flow.
    rtc: probeOne(
      'rtc',
      () => {
        const pkg = '@fishjam-cloud' + '/ts-client';
        // Indirect-name require so Metro static analysis doesn't bail
        // when the package isn't installed yet.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return (eval('require') as NodeRequire)(pkg);
      },
      (m) => typeof m?.FishjamClient === 'function',
    ),
    storage: probeOne(
      'storage',
      () => require('@expo-pico/storage'),
      (m) => safeBoolean(m.isStorageAvailable),
    ),
    subscription: probeOne(
      'subscription',
      () => require('@expo-pico/subscription'),
      (m) => safeBoolean(m.isSubscriptionAvailable),
    ),
    haptics: probeOne(
      'haptics',
      () => require('@expo-pico/core'),
      (m) => safeBoolean(m.isHapticsAvailable),
    ),
    windowContainer: probeOne(
      'windowContainer',
      () => require('@expo-pico/spatial'),
      (m) => safeBoolean(m.getSpatialCapabilities)
        ? Boolean(m.getSpatialCapabilities?.()?.spatialSdkAvailable)
        : false,
    ),
    eyeGaze: probeOne(
      'eyeGaze',
      () => require('@expo-pico/spatial'),
      (m) => safeBoolean(m.isEyeGazeAvailable),
    ),
    sceneMesh: probeOne(
      'sceneMesh',
      () => require('@expo-pico/spatial'),
      (m) => safeBoolean(m.isSceneMeshAvailable),
    ),
    faceTracking: probeOne(
      'faceTracking',
      () => require('@expo-pico/spatial'),
      (m) => safeBoolean(m.isFaceTrackingAvailable),
    ),
    bodyTracking: probeOne(
      'bodyTracking',
      () => require('@expo-pico/spatial'),
      (m) => safeBoolean(m.isBodyTrackingAvailable),
    ),
  };
}

export function getPicoCapabilities(): PicoCapabilities {
  if (!cached) cached = buildCapabilities();
  return cached;
}

export function refreshPicoCapabilities(): PicoCapabilities {
  cached = buildCapabilities();
  return cached;
}

export function logPicoCapabilities() {
  const caps = getPicoCapabilities();
  // eslint-disable-next-line no-console
  console.log(
    '[pico] runtime capabilities:\n' +
      (Object.keys(caps) as (keyof PicoCapabilities)[])
        .map((k) => `  ${caps[k] ? '✅' : '❌'} ${k}`)
        .join('\n'),
  );
}
