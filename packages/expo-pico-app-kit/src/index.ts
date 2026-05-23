// Single import surface for the entire expo-pico-* stack.
//
//   import { bootPico, getPicoCapabilities, haptics, onGaze, account } from '@/pico';
//
// All wrappers are no-op-safe when the underlying Pico SDK AAR is absent
// — you can write app code unconditionally and let the boot-time
// capability table decide what UI to render.

export {
  bootPico,
  type BootOptions,
} from './picoBoot';

export {
  getPicoCapabilities,
  refreshPicoCapabilities,
  logPicoCapabilities,
  type PicoCapabilities,
} from './picoCapabilities';

export { haptics, type HapticHand } from './picoHaptics';

export {
  setWindowContainerProperties,
  type WindowProperties,
  onGaze,
  getGazeSnapshot,
  type GazePose,
  getSceneMesh,
  onSceneMeshUpdate,
  type SceneMesh,
  onFace,
  type FaceBlendShapes,
  onBody,
  type BodyJoint,
  requestFullSpace,
  createAnchor,
  type AnchorPose,
  type SpatialAnchor,
  type Subscription,
} from './picoSpatial';

export {
  account,
  iap,
  achievement,
  leaderboard,
  friend,
  push,
  social,
  rtc,
  storage,
  subscription,
} from './picoServices';

// Typed wrappers + React hooks layered on top of the Proxy services. Prefer
// these over the raw services for app code — they're capability-gated,
// statically typed, and hook-friendly.
export {
  picoStorage,
  getString,
  setString,
  getNumber,
  setNumber,
  getBoolean,
  setBoolean,
  getJSON,
  setJSON,
  remove as removeStorageEntry,
  getStringFresh,
  syncToCloud,
  hydrateFromCloud,
  useStorageEntry,
} from './picoStorage';

export {
  picoRtc,
  joinChannel as rtcJoin,
  leaveChannel as rtcLeave,
  setLocalMuted as rtcSetMuted,
  setOutputVolume as rtcSetVolume,
  onUserJoined as rtcOnUserJoined,
  onUserLeft as rtcOnUserLeft,
  useRtcChannel,
  type RtcJoinOptions,
  type RtcChannelState,
  type RtcUserSnapshot,
} from './picoRtc';

export {
  picoNotifications,
  getPermissionStatus as getNotificationPermissionStatus,
  requestPermissions as requestNotificationPermissions,
  registerForPush,
  onNotificationReceived,
  onNotificationOpened,
  useNotificationPermission,
  usePushToken,
  useIncomingNotification,
  type NotificationPermissionStatus,
} from './picoNotifications';
