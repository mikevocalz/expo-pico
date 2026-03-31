export const PICO_MAVEN_REPO = 'https://developer.pico-interactive.com/maven';
export const PICO_SDK_GROUP = 'com.pvr';
export const PICO_PLATFORM_SDK_GROUP = 'com.pvr.platform';
export const PICO_PLATFORM_SDK_VERSION = '3.2.0';
export const PICO_SPATIAL_SDK_VERSION = '1.0.0';

export const MANIFEST_META = {
  PICO_APP_ID: 'pvr.app.id',
  SUPPORTED_DEVICES: 'com.pico.supportedDevices',
  SPATIAL_MODE: 'com.pico.spatial.mode',
  CONTAINER_MODE: 'com.pico.spatial.containerMode',
  TARGET_PROFILE: 'com.pico.targetProfile',
  ENTITLEMENT_CHECK: 'pvr.app.entitlement.check',
  DEVELOPER_TOOLS: 'com.pico.developerTools',
} as const;

export const PICO_FEATURES = {
  HAND_TRACKING: 'pico.hardware.handtracking',
  PASSTHROUGH: 'pico.hardware.passthrough',
  SCENE_UNDERSTANDING: 'pico.software.scene',
  VR_HEADTRACKING: 'android.hardware.vr.headtracking',
  SPATIAL_ANCHOR: 'pico.software.spatialanchor',
} as const;

export const DEVICE_TARGET_MAP: Record<string, string> = {
  'pico-4': 'PICO 4',
  'pico-4-ultra': 'PICO 4 Ultra',
  'neo3': 'PICO Neo3',
  'swan': 'PICO Swan',
} as const;

/** Target profile → manifest value */
export const TARGET_PROFILE_MAP: Record<string, string> = {
  'legacy': 'legacy',
  'pico4': 'pico4',
  'pico4ultra': 'pico4ultra',
  'swan': 'swan',
} as const;

/** Minimum SDK per target profile */
export const PROFILE_MIN_SDK: Record<string, number> = {
  legacy: 29,
  pico4: 32,
  pico4ultra: 32,
  swan: 33,
} as const;

export const PICO_PROHIBITED_PERMISSIONS = [
  'CALL_PHONE',
  'CALL_PRIVILEGED',
  'PROCESS_OUTGOING_CALLS',
  'READ_CALL_LOG',
  'WRITE_CALL_LOG',
  'READ_PHONE_STATE',
  'READ_PHONE_NUMBERS',
  'SEND_SMS',
  'RECEIVE_SMS',
  'READ_SMS',
  'RECEIVE_MMS',
  'RECEIVE_WAP_PUSH',
  'ADD_VOICEMAIL',
  'READ_VOICEMAIL',
  'WRITE_VOICEMAIL',
  'BIND_CARRIER_MESSAGING_SERVICE',
  'BIND_CARRIER_MESSAGING_CLIENT_SERVICE',
  'SMS_FINANCIAL_TRANSACTIONS',
  'SEND_RESPOND_VIA_MESSAGE',
  'ANSWER_PHONE_CALLS',
  'ACCEPT_HANDOVER',
  'MODIFY_PHONE_STATE',
] as const;
