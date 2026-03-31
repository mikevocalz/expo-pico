import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getPicoRuntimeInfo,
  getPicoTargetProfile,
  getSpatialMode,
  isPicoBuild,
  isPicoDevice,
} from 'expo-pico-core';
import {
  createSpatialAnchor,
  getContainerType,
  getSpaceState,
  getSpatialCapabilities,
  getSpatialSdkVersion,
  requestFullSpace,
  setWindowContainerProperties,
} from 'expo-pico-spatial';
import {
  getAccountLinkStatus,
  getAccountSdkVersion,
  getAccessToken,
  getUserProfile,
  isAccountAvailable,
  login,
  logout,
} from 'expo-pico-account';
import {
  consumePurchase,
  getIapSdkVersion,
  getProducts,
  getPurchaseHistory,
  isIapAvailable,
  purchase,
} from 'expo-pico-iap';
import {
  getNotificationPermissionStatus,
  getNotificationsSdkVersion,
  isNotificationsAvailable,
  registerForPushNotifications,
  requestPermissions,
} from 'expo-pico-notifications';
import {
  cancelSubscription,
  getActiveSubscriptions,
  getSubscriptionEntitlement,
  getSubscriptionProducts,
  getSubscriptionSdkVersion,
  isSubscriptionAvailable,
  subscribe,
} from 'expo-pico-subscription';
import {
  addRtcStateChangeListener,
  addUserJoinedListener,
  addUserLeftListener,
  getRtcSdkVersion,
  getRtcServiceStatus,
  initRtcEngine,
  joinChannel,
  leaveChannel,
  muteLocalAudio,
  setAudioOutputVolume,
} from 'expo-pico-rtc';
import {
  addMatchmakingFoundListener,
  addRoomUpdatedListener,
  addRoomUserJoinedListener,
  addRoomUserLeftListener,
  cancelMatchmaking,
  createRoom,
  getRoomInfo,
  getRoomSessionState,
  getRoomsSdkVersion,
  isRoomsAvailable,
  joinRoom,
  kickUser,
  leaveRoom,
  requestMatchmaking,
  updateRoomData,
} from 'expo-pico-rooms';
import {
  addStorageConflictListener,
  addStorageSyncCompleteListener,
  addStorageSyncProgressListener,
  clearLocalCache,
  deleteEntry,
  getStorageQuota,
  getStorageSdkVersion,
  getStorageStatus,
  isStorageAvailable,
  listKeys,
  loadEntry,
  saveEntry,
  syncStorage,
} from 'expo-pico-storage';
import {
  acceptFriendRequest,
  addFriendPresenceChangedListener,
  addFriendRequestReceivedListener,
  addInviteReceivedListener,
  blockUser,
  clearPresence,
  declineFriendRequest,
  getCurrentUser,
  getFriendList,
  getFriendshipStatus,
  getPendingFriendRequests,
  getSocialSdkVersion,
  isSocialAvailable,
  removeFriend,
  sendFriendRequest,
  sendInvites,
  setPresence,
  unblockUser,
} from 'expo-pico-social';
import {
  addAchievementBitfield,
  addAchievementCount,
  addAchievementUnlockedListener,
  getAchievementProgress,
  getAchievementsSdkVersion,
  getAllAchievements,
  getUnlockedAchievements,
  isAchievementsAvailable,
  unlockAchievement,
} from 'expo-pico-achievements';
import {
  getAllLeaderboards,
  getEntries,
  getEntriesAfterRank,
  getLeaderboardsSdkVersion,
  getUserEntry,
  isLeaderboardsAvailable,
  writeScore,
} from 'expo-pico-leaderboards';

import {
  packageCatalog,
  validationEnvironmentLabels,
  type ValidationEnvironment,
} from './catalog';

type EvidenceStatus = 'pass' | 'block' | 'deferred';

type ActionState = {
  status: 'idle' | 'running' | EvidenceStatus;
  summary: string;
  detail?: string;
  at?: string;
};

type EvidenceEntry = {
  id: string;
  packageId: string;
  action: string;
  runtime: ValidationEnvironment;
  status: EvidenceStatus;
  summary: string;
  detail?: string;
  at: string;
};

type EnvironmentSnapshot = {
  runtimeInfo: ReturnType<typeof getPicoRuntimeInfo>;
  spatial: {
    mode: ReturnType<typeof getSpatialMode>;
    targetProfile: ReturnType<typeof getPicoTargetProfile>;
    spaceState: ReturnType<typeof getSpaceState>;
    containerType: ReturnType<typeof getContainerType>;
    capabilities: ReturnType<typeof getSpatialCapabilities>;
    sdkVersion: ReturnType<typeof getSpatialSdkVersion>;
  };
  availability: {
    account: boolean;
    iap: boolean;
    notifications: boolean;
    subscription: boolean;
    rooms: boolean;
    storage: boolean;
    social: boolean;
    achievements: boolean;
    leaderboards: boolean;
  };
  versions: {
    account: string;
    iap: string;
    notifications: string;
    subscription: string;
    rtc: string | null;
    rooms: string;
    storage: string;
    social: string;
    achievements: string;
    leaderboards: string;
  };
  notificationPermission: string;
  rtcServiceStatus: string;
  roomSessionState: ReturnType<typeof getRoomSessionState>;
  storageStatus: ReturnType<typeof getStorageStatus>;
};

type InputState = {
  iapSkus: string;
  purchaseToken: string;
  subscriptionSkus: string;
  entitlementSku: string;
  rtcChannelId: string;
  rtcToken: string;
  rtcUid: string;
  roomId: string;
  roomKickUserId: string;
  roomData: string;
  storageKey: string;
  storageValue: string;
  socialUserId: string;
  socialRequestId: string;
  presenceRichText: string;
  presenceDestination: string;
  inviteDestination: string;
  inviteUserIds: string;
  achievementIds: string;
  achievementApiName: string;
  achievementCount: string;
  achievementBits: string;
  leaderboardApiName: string;
  leaderboardAfterRank: string;
  leaderboardScore: string;
};

const defaultInputs: InputState = {
  iapSkus: 'coins_100,premium_upgrade',
  purchaseToken: 'purchase-token-demo',
  subscriptionSkus: 'premium_monthly,premium_yearly',
  entitlementSku: 'premium_monthly',
  rtcChannelId: 'phase6-voice-room',
  rtcToken: 'rtc-demo-token',
  rtcUid: '1001',
  roomId: 'room-demo',
  roomKickUserId: 'user-demo',
  roomData: '{"mode":"phase6","owner":"host-a"}',
  storageKey: 'phase6/demo-key',
  storageValue: 'hello-from-expo-pico',
  socialUserId: 'friend-demo',
  socialRequestId: 'request-demo',
  presenceRichText: 'Phase 6 validation in progress',
  presenceDestination: 'demo-destination',
  inviteDestination: 'demo-destination',
  inviteUserIds: 'friend-a,friend-b',
  achievementIds: 'first_win,combo_count,bitfield_master',
  achievementApiName: 'first_win',
  achievementCount: '1',
  achievementBits: '1010',
  leaderboardApiName: 'daily-score',
  leaderboardAfterRank: '10',
  leaderboardScore: '42',
};

function collectEnvironmentSnapshot(): EnvironmentSnapshot {
  return {
    runtimeInfo: getPicoRuntimeInfo(),
    spatial: {
      mode: getSpatialMode(),
      targetProfile: getPicoTargetProfile(),
      spaceState: getSpaceState(),
      containerType: getContainerType(),
      capabilities: getSpatialCapabilities(),
      sdkVersion: getSpatialSdkVersion(),
    },
    availability: {
      account: isAccountAvailable(),
      iap: isIapAvailable(),
      notifications: isNotificationsAvailable(),
      subscription: isSubscriptionAvailable(),
      rooms: isRoomsAvailable(),
      storage: isStorageAvailable(),
      social: isSocialAvailable(),
      achievements: isAchievementsAvailable(),
      leaderboards: isLeaderboardsAvailable(),
    },
    versions: {
      account: getAccountSdkVersion(),
      iap: getIapSdkVersion(),
      notifications: getNotificationsSdkVersion(),
      subscription: getSubscriptionSdkVersion(),
      rtc: getRtcSdkVersion(),
      rooms: getRoomsSdkVersion(),
      storage: getStorageSdkVersion(),
      social: getSocialSdkVersion(),
      achievements: getAchievementsSdkVersion(),
      leaderboards: getLeaderboardsSdkVersion(),
    },
    notificationPermission: getNotificationPermissionStatus(),
    rtcServiceStatus: getRtcServiceStatus(),
    roomSessionState: getRoomSessionState(),
    storageStatus: getStorageStatus(),
  };
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRecord(value: string): Record<string, string> {
  if (!value.trim()) {
    return {};
  }
  const parsed = JSON.parse(value) as Record<string, string>;
  return parsed ?? {};
}

function stringifyDetail(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeError(error: unknown): {
  status: EvidenceStatus;
  summary: string;
  detail: string;
} {
  const raw = error as { code?: string; message?: string };
  const code = raw?.code ?? 'UNKNOWN';
  const message = raw?.message ?? 'Unknown error';
  const status: EvidenceStatus = code === 'NOT_IMPLEMENTED' ? 'deferred' : 'block';
  return {
    status,
    summary: `${code}: ${message}`,
    detail: stringifyDetail(error),
  };
}

function getStatusColor(status: ActionState['status'] | EvidenceStatus): string {
  switch (status) {
    case 'pass':
      return '#2fc781';
    case 'deferred':
      return '#f2a84a';
    case 'block':
      return '#ff6e5e';
    case 'running':
      return '#6bc3ff';
    default:
      return '#7c8899';
  }
}

export function ValidationHarness() {
  const [environment, setEnvironment] = React.useState<EnvironmentSnapshot>(() =>
    collectEnvironmentSnapshot()
  );
  const [inputs, setInputs] = React.useState<InputState>(defaultInputs);
  const [actionStates, setActionStates] = React.useState<Record<string, ActionState>>({});
  const [evidenceLog, setEvidenceLog] = React.useState<EvidenceEntry[]>([]);
  const nextEvidenceId = React.useRef(0);

  const appendEvidenceRef = React.useRef(
    (_entry: Omit<EvidenceEntry, 'id' | 'at'>) => undefined
  );

  appendEvidenceRef.current = (entry) => {
    setEvidenceLog((current) => {
      const nextEntry: EvidenceEntry = {
        ...entry,
        id: `e-${nextEvidenceId.current++}`,
        at: new Date().toISOString(),
      };
      return [nextEntry, ...current].slice(0, 120);
    });
  };

  React.useEffect(() => {
    const subscriptions = [
      addRtcStateChangeListener((event) =>
        appendEvidenceRef.current({
          packageId: 'rtc',
          action: 'onRtcStateChange',
          runtime: 'multi-user',
          status: 'pass',
          summary: `RTC state change: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addUserJoinedListener((event) =>
        appendEvidenceRef.current({
          packageId: 'rtc',
          action: 'onRtcUserJoined',
          runtime: 'multi-user',
          status: 'pass',
          summary: `RTC user joined: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addUserLeftListener((event) =>
        appendEvidenceRef.current({
          packageId: 'rtc',
          action: 'onRtcUserLeft',
          runtime: 'multi-user',
          status: 'pass',
          summary: `RTC user left: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addRoomUpdatedListener((event) =>
        appendEvidenceRef.current({
          packageId: 'rooms',
          action: 'onRoomUpdated',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Room updated: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addRoomUserJoinedListener((event) =>
        appendEvidenceRef.current({
          packageId: 'rooms',
          action: 'onRoomUserJoined',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Room user joined: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addRoomUserLeftListener((event) =>
        appendEvidenceRef.current({
          packageId: 'rooms',
          action: 'onRoomUserLeft',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Room user left: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addMatchmakingFoundListener((event) =>
        appendEvidenceRef.current({
          packageId: 'rooms',
          action: 'onMatchmakingFound',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Matchmaking found: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addStorageConflictListener((event) =>
        appendEvidenceRef.current({
          packageId: 'storage',
          action: 'onStorageConflict',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Storage conflict: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addStorageSyncProgressListener((event) =>
        appendEvidenceRef.current({
          packageId: 'storage',
          action: 'onStorageSyncProgress',
          runtime: 'device',
          status: 'pass',
          summary: `Storage sync progress: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addStorageSyncCompleteListener((event) =>
        appendEvidenceRef.current({
          packageId: 'storage',
          action: 'onStorageSyncComplete',
          runtime: 'device',
          status: 'pass',
          summary: `Storage sync complete: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addFriendPresenceChangedListener((event) =>
        appendEvidenceRef.current({
          packageId: 'social',
          action: 'onFriendPresenceChanged',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Presence changed: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addFriendRequestReceivedListener((event) =>
        appendEvidenceRef.current({
          packageId: 'social',
          action: 'onFriendRequestReceived',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Friend request received: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addInviteReceivedListener((event) =>
        appendEvidenceRef.current({
          packageId: 'social',
          action: 'onInviteReceived',
          runtime: 'multi-user',
          status: 'pass',
          summary: `Invite received: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
      addAchievementUnlockedListener((event) =>
        appendEvidenceRef.current({
          packageId: 'achievements',
          action: 'onAchievementUnlocked',
          runtime: 'device',
          status: 'pass',
          summary: `Achievement unlocked: ${stringifyDetail(event)}`,
          detail: stringifyDetail(event),
        })
      ),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  async function runAction<T>(params: {
    key: string;
    packageId: string;
    action: string;
    runtime: ValidationEnvironment;
    fn: () => Promise<T> | T;
    onSuccess?: (value: T) => string;
  }) {
    const now = new Date().toISOString();
    setActionStates((current) => ({
      ...current,
      [params.key]: { status: 'running', summary: 'Running...', at: now },
    }));

    try {
      const value = await params.fn();
      const summary = params.onSuccess?.(value) ?? 'Completed successfully';
      const detail = stringifyDetail(value);
      setActionStates((current) => ({
        ...current,
        [params.key]: { status: 'pass', summary, detail, at: new Date().toISOString() },
      }));
      appendEvidenceRef.current({
        packageId: params.packageId,
        action: params.action,
        runtime: params.runtime,
        status: 'pass',
        summary,
        detail,
      });
      setEnvironment(collectEnvironmentSnapshot());
    } catch (error) {
      const normalized = normalizeError(error);
      setActionStates((current) => ({
        ...current,
        [params.key]: {
          status: normalized.status,
          summary: normalized.summary,
          detail: normalized.detail,
          at: new Date().toISOString(),
        },
      }));
      appendEvidenceRef.current({
        packageId: params.packageId,
        action: params.action,
        runtime: params.runtime,
        status: normalized.status,
        summary: normalized.summary,
        detail: normalized.detail,
      });
      setEnvironment(collectEnvironmentSnapshot());
    }
  }

  function updateInput<K extends keyof InputState>(key: K, value: InputState[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function latestPackageEvidence(packageId: string) {
    return evidenceLog.find((entry) => entry.packageId === packageId);
  }

  async function shareEvidenceReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      environment,
      packages: packageCatalog.map((entry) => ({
        packageName: entry.packageName,
        maturity: entry.maturity,
        prereleaseReady: entry.prereleaseReady,
        stableBlocker: entry.stableBlocker,
        latestEvidence: latestPackageEvidence(entry.id) ?? null,
      })),
      evidenceLog,
    };

    try {
      await Share.share({
        message: JSON.stringify(report, null, 2),
        title: 'expo-pico validation evidence',
      });
    } catch (error) {
      Alert.alert('Evidence export failed', stringifyDetail(error));
    }
  }

  const summary = {
    pass: evidenceLog.filter((entry) => entry.status === 'pass').length,
    block: evidenceLog.filter((entry) => entry.status === 'block').length,
    deferred: evidenceLog.filter((entry) => entry.status === 'deferred').length,
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Phase 6 / Phase 7</Text>
        <Text style={styles.title}>expo-pico validation harness</Text>
        <Text style={styles.subtitle}>
          Action-driven proving UI for device validation, negative-path capture, and prerelease evidence.
        </Text>
        <View style={styles.heroMetaRow}>
          <Badge label={isPicoBuild() ? 'PICO build' : 'mobile build'} tone={isPicoBuild() ? 'success' : 'neutral'} />
          <Badge label={isPicoDevice() ? 'PICO device' : 'non-PICO runtime'} tone={isPicoDevice() ? 'success' : 'neutral'} />
          <Badge label={`RTC ${environment.rtcServiceStatus}`} tone={environment.rtcServiceStatus === 'available' ? 'success' : 'warn'} />
          <Badge label={`Storage ${environment.storageStatus}`} tone={environment.storageStatus === 'available' ? 'success' : 'warn'} />
        </View>
      </View>

      <Section title="Overview" description="Current environment, runtime snapshot, and evidence export controls.">
        <PackageCard
          packageName="environment"
          maturity="session"
          validationEnvironments={['non-pico', 'emulator', 'device', 'provisioning']}
          prereleaseReady="used for every validation run"
          stableBlocker="must reflect the real build and device under test"
          lastEvidence={{
            summary: `pass ${summary.pass} / block ${summary.block} / deferred ${summary.deferred}`,
            status: summary.block > 0 ? 'block' : summary.deferred > 0 ? 'deferred' : 'pass',
            at: evidenceLog[0]?.at,
          }}
        >
          <View style={styles.buttonRow}>
            <ActionButton
              label="Refresh runtime"
              state={actionStates['environment.refresh']}
              onPress={() =>
                runAction({
                  key: 'environment.refresh',
                  packageId: 'core',
                  action: 'refreshEnvironment',
                  runtime: 'device',
                  fn: () => collectEnvironmentSnapshot(),
                  onSuccess: () => 'Environment snapshot refreshed',
                }).then(() => setEnvironment(collectEnvironmentSnapshot()))
              }
            />
            <ActionButton label="Share evidence" onPress={shareEvidenceReport} />
            <ActionButton
              label="Clear evidence"
              onPress={() => {
                setEvidenceLog([]);
                setActionStates({});
              }}
            />
          </View>
          <JsonBlock value={environment} />
        </PackageCard>
      </Section>

      <Section title="Core / Spatial" description="Build flavoring, spatial snapshot, and explicit seam proof.">
        <PackageCardFromCatalog id="core" lastEvidence={latestPackageEvidence('core')}>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Capture runtime info"
              state={actionStates['core.runtime']}
              onPress={() =>
                runAction({
                  key: 'core.runtime',
                  packageId: 'core',
                  action: 'captureRuntimeInfo',
                  runtime: 'device',
                  fn: () => collectEnvironmentSnapshot().runtimeInfo,
                  onSuccess: () => 'Runtime info captured',
                })
              }
            />
          </View>
          <JsonBlock value={environment.runtimeInfo} />
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="spatial" lastEvidence={latestPackageEvidence('spatial')}>
          <View style={styles.inputGrid}>
            <Field
              label="Window container props"
              value={'{"width":960,"height":720}'}
              editable={false}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Refresh spatial snapshot"
              state={actionStates['spatial.snapshot']}
              onPress={() =>
                runAction({
                  key: 'spatial.snapshot',
                  packageId: 'spatial',
                  action: 'refreshSpatialSnapshot',
                  runtime: 'device',
                  fn: () => collectEnvironmentSnapshot().spatial,
                  onSuccess: () => 'Spatial snapshot refreshed',
                })
              }
            />
            <ActionButton
              label="Anchor seam"
              state={actionStates['spatial.anchor']}
              onPress={() =>
                runAction({
                  key: 'spatial.anchor',
                  packageId: 'spatial',
                  action: 'createSpatialAnchor',
                  runtime: 'device',
                  fn: () =>
                    createSpatialAnchor({
                      position: { x: 0, y: 1.4, z: -1 },
                      orientation: { x: 0, y: 0, z: 0, w: 1 },
                    }),
                  onSuccess: () => 'Spatial anchor created',
                })
              }
            />
            <ActionButton
              label="Window seam"
              state={actionStates['spatial.window']}
              onPress={() =>
                runAction({
                  key: 'spatial.window',
                  packageId: 'spatial',
                  action: 'setWindowContainerProperties',
                  runtime: 'device',
                  fn: () => setWindowContainerProperties({ width: 960, height: 720 }),
                  onSuccess: () => 'Window container updated',
                })
              }
            />
            <ActionButton
              label="Full-space seam"
              state={actionStates['spatial.full-space']}
              onPress={() =>
                runAction({
                  key: 'spatial.full-space',
                  packageId: 'spatial',
                  action: 'requestFullSpace',
                  runtime: 'device',
                  fn: () => requestFullSpace(),
                  onSuccess: () => 'Full-space requested',
                })
              }
            />
          </View>
          <JsonBlock value={environment.spatial} />
        </PackageCardFromCatalog>
      </Section>

      <Section title="Account / Commerce" description="Identity, billing, subscriptions, and notification proving flows.">
        <PackageCardFromCatalog id="account" lastEvidence={latestPackageEvidence('account')}>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Get user profile"
              state={actionStates['account.profile']}
              onPress={() =>
                runAction({
                  key: 'account.profile',
                  packageId: 'account',
                  action: 'getUserProfile',
                  runtime: 'device',
                  fn: () => getUserProfile(),
                  onSuccess: () => 'User profile loaded',
                })
              }
            />
            <ActionButton
              label="Link status"
              state={actionStates['account.link']}
              onPress={() =>
                runAction({
                  key: 'account.link',
                  packageId: 'account',
                  action: 'getAccountLinkStatus',
                  runtime: 'device',
                  fn: () => getAccountLinkStatus(),
                  onSuccess: () => 'Account link status loaded',
                })
              }
            />
            <ActionButton
              label="Login seam"
              state={actionStates['account.login']}
              onPress={() =>
                runAction({
                  key: 'account.login',
                  packageId: 'account',
                  action: 'login',
                  runtime: 'device',
                  fn: () => login(),
                  onSuccess: () => 'Login flow completed',
                })
              }
            />
            <ActionButton
              label="Access token seam"
              state={actionStates['account.token']}
              onPress={() =>
                runAction({
                  key: 'account.token',
                  packageId: 'account',
                  action: 'getAccessToken',
                  runtime: 'device',
                  fn: () => getAccessToken(),
                  onSuccess: () => 'Access token retrieved',
                })
              }
            />
            <ActionButton
              label="Logout seam"
              state={actionStates['account.logout']}
              onPress={() =>
                runAction({
                  key: 'account.logout',
                  packageId: 'account',
                  action: 'logout',
                  runtime: 'device',
                  fn: () => logout(),
                  onSuccess: () => 'Logged out',
                })
              }
            />
          </View>
          <MetaText>SDK version: {environment.versions.account}</MetaText>
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="iap" lastEvidence={latestPackageEvidence('iap')}>
          <View style={styles.inputGrid}>
            <Field
              label="IAP SKUs"
              value={inputs.iapSkus}
              onChangeText={(value) => updateInput('iapSkus', value)}
            />
            <Field
              label="Purchase token"
              value={inputs.purchaseToken}
              onChangeText={(value) => updateInput('purchaseToken', value)}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Query products"
              state={actionStates['iap.products']}
              onPress={() =>
                runAction({
                  key: 'iap.products',
                  packageId: 'iap',
                  action: 'getProducts',
                  runtime: 'device',
                  fn: () => getProducts(parseCsv(inputs.iapSkus)),
                  onSuccess: () => 'IAP products fetched',
                })
              }
            />
            <ActionButton
              label="Purchase history"
              state={actionStates['iap.history']}
              onPress={() =>
                runAction({
                  key: 'iap.history',
                  packageId: 'iap',
                  action: 'getPurchaseHistory',
                  runtime: 'device',
                  fn: () => getPurchaseHistory(),
                  onSuccess: () => 'Purchase history fetched',
                })
              }
            />
            <ActionButton
              label="Consume purchase"
              state={actionStates['iap.consume']}
              onPress={() =>
                runAction({
                  key: 'iap.consume',
                  packageId: 'iap',
                  action: 'consumePurchase',
                  runtime: 'device',
                  fn: () => consumePurchase(inputs.purchaseToken),
                  onSuccess: () => 'Purchase consumed',
                })
              }
            />
            <ActionButton
              label="Purchase seam"
              state={actionStates['iap.purchase']}
              onPress={() =>
                runAction({
                  key: 'iap.purchase',
                  packageId: 'iap',
                  action: 'purchase',
                  runtime: 'device',
                  fn: () => purchase(parseCsv(inputs.iapSkus)[0] ?? ''),
                  onSuccess: () => 'Purchase flow completed',
                })
              }
            />
          </View>
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="notifications" lastEvidence={latestPackageEvidence('notifications')}>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Request permission"
              state={actionStates['notifications.permission']}
              onPress={() =>
                runAction({
                  key: 'notifications.permission',
                  packageId: 'notifications',
                  action: 'requestPermissions',
                  runtime: 'device',
                  fn: () => requestPermissions(),
                  onSuccess: () => 'Notification permission requested',
                })
              }
            />
            <ActionButton
              label="Push token seam"
              state={actionStates['notifications.register']}
              onPress={() =>
                runAction({
                  key: 'notifications.register',
                  packageId: 'notifications',
                  action: 'registerForPushNotifications',
                  runtime: 'device',
                  fn: () => registerForPushNotifications(),
                  onSuccess: () => 'Push token registered',
                })
              }
            />
          </View>
          <MetaText>Permission status: {environment.notificationPermission}</MetaText>
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="subscription" lastEvidence={latestPackageEvidence('subscription')}>
          <View style={styles.inputGrid}>
            <Field
              label="Subscription SKUs"
              value={inputs.subscriptionSkus}
              onChangeText={(value) => updateInput('subscriptionSkus', value)}
            />
            <Field
              label="Entitlement SKU"
              value={inputs.entitlementSku}
              onChangeText={(value) => updateInput('entitlementSku', value)}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Query products"
              state={actionStates['subscription.products']}
              onPress={() =>
                runAction({
                  key: 'subscription.products',
                  packageId: 'subscription',
                  action: 'getSubscriptionProducts',
                  runtime: 'device',
                  fn: () => getSubscriptionProducts(parseCsv(inputs.subscriptionSkus)),
                  onSuccess: () => 'Subscription products fetched',
                })
              }
            />
            <ActionButton
              label="Active subscriptions"
              state={actionStates['subscription.active']}
              onPress={() =>
                runAction({
                  key: 'subscription.active',
                  packageId: 'subscription',
                  action: 'getActiveSubscriptions',
                  runtime: 'device',
                  fn: () => getActiveSubscriptions(),
                  onSuccess: () => 'Active subscriptions fetched',
                })
              }
            />
            <ActionButton
              label="Check entitlement"
              state={actionStates['subscription.entitlement']}
              onPress={() =>
                runAction({
                  key: 'subscription.entitlement',
                  packageId: 'subscription',
                  action: 'getSubscriptionEntitlement',
                  runtime: 'device',
                  fn: () => getSubscriptionEntitlement(inputs.entitlementSku),
                  onSuccess: () => 'Entitlement checked',
                })
              }
            />
            <ActionButton
              label="Subscribe seam"
              state={actionStates['subscription.subscribe']}
              onPress={() =>
                runAction({
                  key: 'subscription.subscribe',
                  packageId: 'subscription',
                  action: 'subscribe',
                  runtime: 'device',
                  fn: () => subscribe({ sku: inputs.entitlementSku }),
                  onSuccess: () => 'Subscription started',
                })
              }
            />
            <ActionButton
              label="Cancel seam"
              state={actionStates['subscription.cancel']}
              onPress={() =>
                runAction({
                  key: 'subscription.cancel',
                  packageId: 'subscription',
                  action: 'cancelSubscription',
                  runtime: 'device',
                  fn: () => cancelSubscription(inputs.entitlementSku),
                  onSuccess: () => 'Subscription cancelled',
                })
              }
            />
          </View>
        </PackageCardFromCatalog>
      </Section>

      <Section title="Comms" description="RTC and rooms flows that eventually require two-device proving.">
        <PackageCardFromCatalog id="rtc" lastEvidence={latestPackageEvidence('rtc')}>
          <View style={styles.inputGrid}>
            <Field
              label="RTC channel"
              value={inputs.rtcChannelId}
              onChangeText={(value) => updateInput('rtcChannelId', value)}
            />
            <Field
              label="RTC token"
              value={inputs.rtcToken}
              onChangeText={(value) => updateInput('rtcToken', value)}
            />
            <Field
              label="RTC uid"
              value={inputs.rtcUid}
              onChangeText={(value) => updateInput('rtcUid', value)}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Init engine"
              state={actionStates['rtc.init']}
              onPress={() =>
                runAction({
                  key: 'rtc.init',
                  packageId: 'rtc',
                  action: 'initRtcEngine',
                  runtime: 'device',
                  fn: () => initRtcEngine(),
                  onSuccess: () => 'RTC engine initialized',
                })
              }
            />
            <ActionButton
              label="Join channel"
              state={actionStates['rtc.join']}
              onPress={() =>
                runAction({
                  key: 'rtc.join',
                  packageId: 'rtc',
                  action: 'joinChannel',
                  runtime: 'multi-user',
                  fn: () =>
                    joinChannel({
                      channelId: inputs.rtcChannelId,
                      token: inputs.rtcToken,
                      uid: Number(inputs.rtcUid) || 0,
                    }),
                  onSuccess: () => 'RTC channel joined',
                })
              }
            />
            <ActionButton
              label="Mute audio"
              state={actionStates['rtc.mute']}
              onPress={() =>
                runAction({
                  key: 'rtc.mute',
                  packageId: 'rtc',
                  action: 'muteLocalAudio',
                  runtime: 'multi-user',
                  fn: () => muteLocalAudio(true),
                  onSuccess: () => 'RTC audio muted',
                })
              }
            />
            <ActionButton
              label="Volume 60"
              state={actionStates['rtc.volume']}
              onPress={() =>
                runAction({
                  key: 'rtc.volume',
                  packageId: 'rtc',
                  action: 'setAudioOutputVolume',
                  runtime: 'multi-user',
                  fn: () => setAudioOutputVolume(60),
                  onSuccess: () => 'RTC volume updated',
                })
              }
            />
            <ActionButton
              label="Leave channel"
              state={actionStates['rtc.leave']}
              onPress={() =>
                runAction({
                  key: 'rtc.leave',
                  packageId: 'rtc',
                  action: 'leaveChannel',
                  runtime: 'multi-user',
                  fn: () => leaveChannel(),
                  onSuccess: () => 'RTC channel left',
                })
              }
            />
          </View>
          <MetaText>RTC status: {environment.rtcServiceStatus}</MetaText>
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="rooms" lastEvidence={latestPackageEvidence('rooms')}>
          <View style={styles.inputGrid}>
            <Field
              label="Room id"
              value={inputs.roomId}
              onChangeText={(value) => updateInput('roomId', value)}
            />
            <Field
              label="Kick user id"
              value={inputs.roomKickUserId}
              onChangeText={(value) => updateInput('roomKickUserId', value)}
            />
            <Field
              label="Room data JSON"
              value={inputs.roomData}
              onChangeText={(value) => updateInput('roomData', value)}
              multiline
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Session snapshot"
              state={actionStates['rooms.session']}
              onPress={() =>
                runAction({
                  key: 'rooms.session',
                  packageId: 'rooms',
                  action: 'getRoomSessionState',
                  runtime: 'device',
                  fn: () => getRoomSessionState(),
                  onSuccess: () => 'Room session captured',
                })
              }
            />
            <ActionButton
              label="Create room"
              state={actionStates['rooms.create']}
              onPress={() =>
                runAction({
                  key: 'rooms.create',
                  packageId: 'rooms',
                  action: 'createRoom',
                  runtime: 'multi-user',
                  fn: () =>
                    createRoom({
                      joinPolicy: 'friends-only',
                      maxMembers: 8,
                      data: parseRecord(inputs.roomData),
                    }),
                  onSuccess: () => 'Room created',
                })
              }
            />
            <ActionButton
              label="Join room"
              state={actionStates['rooms.join']}
              onPress={() =>
                runAction({
                  key: 'rooms.join',
                  packageId: 'rooms',
                  action: 'joinRoom',
                  runtime: 'multi-user',
                  fn: () => joinRoom(inputs.roomId),
                  onSuccess: () => 'Room joined',
                })
              }
            />
            <ActionButton
              label="Room info"
              state={actionStates['rooms.info']}
              onPress={() =>
                runAction({
                  key: 'rooms.info',
                  packageId: 'rooms',
                  action: 'getRoomInfo',
                  runtime: 'multi-user',
                  fn: () => getRoomInfo(inputs.roomId),
                  onSuccess: () => 'Room info loaded',
                })
              }
            />
            <ActionButton
              label="Update room"
              state={actionStates['rooms.update']}
              onPress={() =>
                runAction({
                  key: 'rooms.update',
                  packageId: 'rooms',
                  action: 'updateRoomData',
                  runtime: 'multi-user',
                  fn: () => updateRoomData(parseRecord(inputs.roomData)),
                  onSuccess: () => 'Room data updated',
                })
              }
            />
            <ActionButton
              label="Kick user"
              state={actionStates['rooms.kick']}
              onPress={() =>
                runAction({
                  key: 'rooms.kick',
                  packageId: 'rooms',
                  action: 'kickUser',
                  runtime: 'multi-user',
                  fn: () => kickUser(inputs.roomKickUserId),
                  onSuccess: () => 'User kicked from room',
                })
              }
            />
            <ActionButton
              label="Leave room"
              state={actionStates['rooms.leave']}
              onPress={() =>
                runAction({
                  key: 'rooms.leave',
                  packageId: 'rooms',
                  action: 'leaveRoom',
                  runtime: 'multi-user',
                  fn: () => leaveRoom(),
                  onSuccess: () => 'Room left',
                })
              }
            />
            <ActionButton
              label="Matchmaking seam"
              state={actionStates['rooms.matchmaking']}
              onPress={() =>
                runAction({
                  key: 'rooms.matchmaking',
                  packageId: 'rooms',
                  action: 'requestMatchmaking',
                  runtime: 'multi-user',
                  fn: () => requestMatchmaking({ poolName: 'ranked-4v4' }),
                  onSuccess: () => 'Matchmaking requested',
                })
              }
            />
            <ActionButton
              label="Cancel seam"
              state={actionStates['rooms.matchmaking-cancel']}
              onPress={() =>
                runAction({
                  key: 'rooms.matchmaking-cancel',
                  packageId: 'rooms',
                  action: 'cancelMatchmaking',
                  runtime: 'multi-user',
                  fn: () => cancelMatchmaking(),
                  onSuccess: () => 'Matchmaking cancelled',
                })
              }
            />
          </View>
          <JsonBlock value={environment.roomSessionState} />
        </PackageCardFromCatalog>
      </Section>

      <Section title="Social / Game Services" description="Storage, social, achievements, and leaderboard validation flows.">
        <PackageCardFromCatalog id="storage" lastEvidence={latestPackageEvidence('storage')}>
          <View style={styles.inputGrid}>
            <Field
              label="Storage key"
              value={inputs.storageKey}
              onChangeText={(value) => updateInput('storageKey', value)}
            />
            <Field
              label="Storage value"
              value={inputs.storageValue}
              onChangeText={(value) => updateInput('storageValue', value)}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Save"
              state={actionStates['storage.save']}
              onPress={() =>
                runAction({
                  key: 'storage.save',
                  packageId: 'storage',
                  action: 'saveEntry',
                  runtime: 'device',
                  fn: () => saveEntry(inputs.storageKey, inputs.storageValue),
                  onSuccess: () => 'Storage entry saved',
                })
              }
            />
            <ActionButton
              label="Load"
              state={actionStates['storage.load']}
              onPress={() =>
                runAction({
                  key: 'storage.load',
                  packageId: 'storage',
                  action: 'loadEntry',
                  runtime: 'device',
                  fn: () => loadEntry(inputs.storageKey),
                  onSuccess: () => 'Storage entry loaded',
                })
              }
            />
            <ActionButton
              label="List keys"
              state={actionStates['storage.keys']}
              onPress={() =>
                runAction({
                  key: 'storage.keys',
                  packageId: 'storage',
                  action: 'listKeys',
                  runtime: 'device',
                  fn: () => listKeys(),
                  onSuccess: () => 'Storage keys listed',
                })
              }
            />
            <ActionButton
              label="Delete"
              state={actionStates['storage.delete']}
              onPress={() =>
                runAction({
                  key: 'storage.delete',
                  packageId: 'storage',
                  action: 'deleteEntry',
                  runtime: 'device',
                  fn: () => deleteEntry(inputs.storageKey),
                  onSuccess: () => 'Storage entry deleted',
                })
              }
            />
            <ActionButton
              label="Sync"
              state={actionStates['storage.sync']}
              onPress={() =>
                runAction({
                  key: 'storage.sync',
                  packageId: 'storage',
                  action: 'syncStorage',
                  runtime: 'device',
                  fn: () => syncStorage(),
                  onSuccess: () => 'Storage synced',
                })
              }
            />
            <ActionButton
              label="Quota"
              state={actionStates['storage.quota']}
              onPress={() =>
                runAction({
                  key: 'storage.quota',
                  packageId: 'storage',
                  action: 'getStorageQuota',
                  runtime: 'device',
                  fn: () => getStorageQuota(),
                  onSuccess: () => 'Storage quota loaded',
                })
              }
            />
            <ActionButton
              label="Clear cache"
              state={actionStates['storage.cache']}
              onPress={() =>
                runAction({
                  key: 'storage.cache',
                  packageId: 'storage',
                  action: 'clearLocalCache',
                  runtime: 'device',
                  fn: () => clearLocalCache(),
                  onSuccess: () => 'Storage cache cleared',
                })
              }
            />
          </View>
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="social" lastEvidence={latestPackageEvidence('social')}>
          <View style={styles.inputGrid}>
            <Field
              label="User id"
              value={inputs.socialUserId}
              onChangeText={(value) => updateInput('socialUserId', value)}
            />
            <Field
              label="Request id"
              value={inputs.socialRequestId}
              onChangeText={(value) => updateInput('socialRequestId', value)}
            />
            <Field
              label="Presence text"
              value={inputs.presenceRichText}
              onChangeText={(value) => updateInput('presenceRichText', value)}
            />
            <Field
              label="Destination api name"
              value={inputs.presenceDestination}
              onChangeText={(value) => updateInput('presenceDestination', value)}
            />
            <Field
              label="Invite user ids"
              value={inputs.inviteUserIds}
              onChangeText={(value) => updateInput('inviteUserIds', value)}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Current user"
              state={actionStates['social.current']}
              onPress={() =>
                runAction({
                  key: 'social.current',
                  packageId: 'social',
                  action: 'getCurrentUser',
                  runtime: 'device',
                  fn: () => getCurrentUser(),
                  onSuccess: () => 'Current user loaded',
                })
              }
            />
            <ActionButton
              label="Friend list"
              state={actionStates['social.friends']}
              onPress={() =>
                runAction({
                  key: 'social.friends',
                  packageId: 'social',
                  action: 'getFriendList',
                  runtime: 'multi-user',
                  fn: () => getFriendList(),
                  onSuccess: () => 'Friend list loaded',
                })
              }
            />
            <ActionButton
              label="Friendship status"
              state={actionStates['social.status']}
              onPress={() =>
                runAction({
                  key: 'social.status',
                  packageId: 'social',
                  action: 'getFriendshipStatus',
                  runtime: 'multi-user',
                  fn: () => getFriendshipStatus(inputs.socialUserId),
                  onSuccess: () => 'Friendship status loaded',
                })
              }
            />
            <ActionButton
              label="Send request"
              state={actionStates['social.send-request']}
              onPress={() =>
                runAction({
                  key: 'social.send-request',
                  packageId: 'social',
                  action: 'sendFriendRequest',
                  runtime: 'multi-user',
                  fn: () => sendFriendRequest(inputs.socialUserId),
                  onSuccess: () => 'Friend request sent',
                })
              }
            />
            <ActionButton
              label="Accept request"
              state={actionStates['social.accept-request']}
              onPress={() =>
                runAction({
                  key: 'social.accept-request',
                  packageId: 'social',
                  action: 'acceptFriendRequest',
                  runtime: 'multi-user',
                  fn: () => acceptFriendRequest(inputs.socialRequestId),
                  onSuccess: () => 'Friend request accepted',
                })
              }
            />
            <ActionButton
              label="Decline request"
              state={actionStates['social.decline-request']}
              onPress={() =>
                runAction({
                  key: 'social.decline-request',
                  packageId: 'social',
                  action: 'declineFriendRequest',
                  runtime: 'multi-user',
                  fn: () => declineFriendRequest(inputs.socialRequestId),
                  onSuccess: () => 'Friend request declined',
                })
              }
            />
            <ActionButton
              label="Pending requests"
              state={actionStates['social.pending']}
              onPress={() =>
                runAction({
                  key: 'social.pending',
                  packageId: 'social',
                  action: 'getPendingFriendRequests',
                  runtime: 'multi-user',
                  fn: () => getPendingFriendRequests(),
                  onSuccess: () => 'Pending requests loaded',
                })
              }
            />
            <ActionButton
              label="Set presence"
              state={actionStates['social.presence']}
              onPress={() =>
                runAction({
                  key: 'social.presence',
                  packageId: 'social',
                  action: 'setPresence',
                  runtime: 'multi-user',
                  fn: () =>
                    setPresence({
                      status: 'online',
                      richText: inputs.presenceRichText,
                      destinationApiName: inputs.presenceDestination,
                    }),
                  onSuccess: () => 'Presence updated',
                })
              }
            />
            <ActionButton
              label="Clear presence"
              state={actionStates['social.clear-presence']}
              onPress={() =>
                runAction({
                  key: 'social.clear-presence',
                  packageId: 'social',
                  action: 'clearPresence',
                  runtime: 'multi-user',
                  fn: () => clearPresence(),
                  onSuccess: () => 'Presence cleared',
                })
              }
            />
            <ActionButton
              label="Send invites"
              state={actionStates['social.invites']}
              onPress={() =>
                runAction({
                  key: 'social.invites',
                  packageId: 'social',
                  action: 'sendInvites',
                  runtime: 'multi-user',
                  fn: () =>
                    sendInvites({
                      destinationApiName: inputs.inviteDestination,
                      userIds: parseCsv(inputs.inviteUserIds),
                      data: { source: 'validation-harness' },
                    }),
                  onSuccess: () => 'Invites sent',
                })
              }
            />
            <ActionButton
              label="Remove friend"
              state={actionStates['social.remove']}
              onPress={() =>
                runAction({
                  key: 'social.remove',
                  packageId: 'social',
                  action: 'removeFriend',
                  runtime: 'multi-user',
                  fn: () => removeFriend(inputs.socialUserId),
                  onSuccess: () => 'Friend removed',
                })
              }
            />
            <ActionButton
              label="Block user"
              state={actionStates['social.block']}
              onPress={() =>
                runAction({
                  key: 'social.block',
                  packageId: 'social',
                  action: 'blockUser',
                  runtime: 'multi-user',
                  fn: () => blockUser(inputs.socialUserId),
                  onSuccess: () => 'User blocked',
                })
              }
            />
            <ActionButton
              label="Unblock user"
              state={actionStates['social.unblock']}
              onPress={() =>
                runAction({
                  key: 'social.unblock',
                  packageId: 'social',
                  action: 'unblockUser',
                  runtime: 'multi-user',
                  fn: () => unblockUser(inputs.socialUserId),
                  onSuccess: () => 'User unblocked',
                })
              }
            />
          </View>
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="achievements" lastEvidence={latestPackageEvidence('achievements')}>
          <View style={styles.inputGrid}>
            <Field
              label="Achievement ids"
              value={inputs.achievementIds}
              onChangeText={(value) => updateInput('achievementIds', value)}
            />
            <Field
              label="Achievement api name"
              value={inputs.achievementApiName}
              onChangeText={(value) => updateInput('achievementApiName', value)}
            />
            <Field
              label="Count increment"
              value={inputs.achievementCount}
              onChangeText={(value) => updateInput('achievementCount', value)}
            />
            <Field
              label="Bitfield"
              value={inputs.achievementBits}
              onChangeText={(value) => updateInput('achievementBits', value)}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="All achievements"
              state={actionStates['achievements.all']}
              onPress={() =>
                runAction({
                  key: 'achievements.all',
                  packageId: 'achievements',
                  action: 'getAllAchievements',
                  runtime: 'device',
                  fn: () => getAllAchievements(),
                  onSuccess: () => 'Achievements loaded',
                })
              }
            />
            <ActionButton
              label="Unlocked"
              state={actionStates['achievements.unlocked']}
              onPress={() =>
                runAction({
                  key: 'achievements.unlocked',
                  packageId: 'achievements',
                  action: 'getUnlockedAchievements',
                  runtime: 'device',
                  fn: () => getUnlockedAchievements(),
                  onSuccess: () => 'Unlocked achievements loaded',
                })
              }
            />
            <ActionButton
              label="Progress"
              state={actionStates['achievements.progress']}
              onPress={() =>
                runAction({
                  key: 'achievements.progress',
                  packageId: 'achievements',
                  action: 'getAchievementProgress',
                  runtime: 'device',
                  fn: () => getAchievementProgress(parseCsv(inputs.achievementIds)),
                  onSuccess: () => 'Achievement progress loaded',
                })
              }
            />
            <ActionButton
              label="Unlock"
              state={actionStates['achievements.unlock']}
              onPress={() =>
                runAction({
                  key: 'achievements.unlock',
                  packageId: 'achievements',
                  action: 'unlockAchievement',
                  runtime: 'device',
                  fn: () => unlockAchievement(inputs.achievementApiName),
                  onSuccess: () => 'Achievement unlocked',
                })
              }
            />
            <ActionButton
              label="Add count"
              state={actionStates['achievements.count']}
              onPress={() =>
                runAction({
                  key: 'achievements.count',
                  packageId: 'achievements',
                  action: 'addAchievementCount',
                  runtime: 'device',
                  fn: () =>
                    addAchievementCount(
                      inputs.achievementApiName,
                      Number(inputs.achievementCount) || 0
                    ),
                  onSuccess: () => 'Achievement count added',
                })
              }
            />
            <ActionButton
              label="Add bitfield"
              state={actionStates['achievements.bitfield']}
              onPress={() =>
                runAction({
                  key: 'achievements.bitfield',
                  packageId: 'achievements',
                  action: 'addAchievementBitfield',
                  runtime: 'device',
                  fn: () => addAchievementBitfield(inputs.achievementApiName, inputs.achievementBits),
                  onSuccess: () => 'Achievement bitfield updated',
                })
              }
            />
          </View>
        </PackageCardFromCatalog>

        <PackageCardFromCatalog id="leaderboards" lastEvidence={latestPackageEvidence('leaderboards')}>
          <View style={styles.inputGrid}>
            <Field
              label="Leaderboard api name"
              value={inputs.leaderboardApiName}
              onChangeText={(value) => updateInput('leaderboardApiName', value)}
            />
            <Field
              label="After rank"
              value={inputs.leaderboardAfterRank}
              onChangeText={(value) => updateInput('leaderboardAfterRank', value)}
            />
            <Field
              label="Score"
              value={inputs.leaderboardScore}
              onChangeText={(value) => updateInput('leaderboardScore', value)}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="All boards"
              state={actionStates['leaderboards.all']}
              onPress={() =>
                runAction({
                  key: 'leaderboards.all',
                  packageId: 'leaderboards',
                  action: 'getAllLeaderboards',
                  runtime: 'device',
                  fn: () => getAllLeaderboards(),
                  onSuccess: () => 'Leaderboards loaded',
                })
              }
            />
            <ActionButton
              label="Entries"
              state={actionStates['leaderboards.entries']}
              onPress={() =>
                runAction({
                  key: 'leaderboards.entries',
                  packageId: 'leaderboards',
                  action: 'getEntries',
                  runtime: 'device',
                  fn: () => getEntries(inputs.leaderboardApiName),
                  onSuccess: () => 'Leaderboard entries loaded',
                })
              }
            />
            <ActionButton
              label="After rank"
              state={actionStates['leaderboards.after-rank']}
              onPress={() =>
                runAction({
                  key: 'leaderboards.after-rank',
                  packageId: 'leaderboards',
                  action: 'getEntriesAfterRank',
                  runtime: 'multi-user',
                  fn: () =>
                    getEntriesAfterRank(
                      inputs.leaderboardApiName,
                      Number(inputs.leaderboardAfterRank) || 0
                    ),
                  onSuccess: () => 'Entries after rank loaded',
                })
              }
            />
            <ActionButton
              label="User entry"
              state={actionStates['leaderboards.user']}
              onPress={() =>
                runAction({
                  key: 'leaderboards.user',
                  packageId: 'leaderboards',
                  action: 'getUserEntry',
                  runtime: 'device',
                  fn: () => getUserEntry(inputs.leaderboardApiName),
                  onSuccess: () => 'User leaderboard entry loaded',
                })
              }
            />
            <ActionButton
              label="Write score"
              state={actionStates['leaderboards.write']}
              onPress={() =>
                runAction({
                  key: 'leaderboards.write',
                  packageId: 'leaderboards',
                  action: 'writeScore',
                  runtime: 'multi-user',
                  fn: () =>
                    writeScore(
                      inputs.leaderboardApiName,
                      Number(inputs.leaderboardScore) || 0
                    ),
                  onSuccess: () => 'Leaderboard score written',
                })
              }
            />
          </View>
        </PackageCardFromCatalog>
      </Section>

      <Section title="Evidence" description="Latest package outcomes and recent event traffic.">
        {packageCatalog.map((entry) => {
          const latest = latestPackageEvidence(entry.id);
          return (
            <PackageCardFromCatalog key={entry.id} id={entry.id} lastEvidence={latest}>
              <MetaText>
                Latest status: {latest ? `${latest.status} at ${latest.at}` : 'No evidence recorded yet'}
              </MetaText>
              {latest ? <JsonBlock value={latest} /> : null}
            </PackageCardFromCatalog>
          );
        })}
      </Section>
    </ScrollView>
  );
}

function PackageCardFromCatalog({
  id,
  lastEvidence,
  children,
}: {
  id: string;
  lastEvidence?: Pick<EvidenceEntry, 'summary' | 'status' | 'at'>;
  children: React.ReactNode;
}) {
  const entry = packageCatalog.find((item) => item.id === id);
  if (!entry) return null;

  return (
    <PackageCard
      packageName={entry.packageName}
      maturity={entry.maturity}
      validationEnvironments={entry.validationEnvironments}
      prereleaseReady={entry.prereleaseReady}
      stableBlocker={entry.stableBlocker}
      lastEvidence={lastEvidence}
    >
      {children}
    </PackageCard>
  );
}

function PackageCard({
  packageName,
  maturity,
  validationEnvironments,
  prereleaseReady,
  stableBlocker,
  lastEvidence,
  children,
}: {
  packageName: string;
  maturity: string;
  validationEnvironments: ValidationEnvironment[];
  prereleaseReady: string;
  stableBlocker: string;
  lastEvidence?: Pick<EvidenceEntry, 'summary' | 'status' | 'at'>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleColumn}>
          <Text style={styles.cardTitle}>{packageName}</Text>
          <Text style={styles.cardHint}>Prerelease: {prereleaseReady}</Text>
          <Text style={styles.cardHint}>Stable blocker: {stableBlocker}</Text>
        </View>
        <Badge label={maturity} tone="neutral" />
      </View>
      <View style={styles.chipRow}>
        {validationEnvironments.map((environment) => (
          <Badge
            key={`${packageName}-${environment}`}
            label={validationEnvironmentLabels[environment]}
            tone="warn"
          />
        ))}
      </View>
      {lastEvidence ? (
        <View style={styles.lastEvidenceRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(lastEvidence.status) },
            ]}
          />
          <Text style={styles.lastEvidenceText}>{lastEvidence.summary}</Text>
          {lastEvidence.at ? <Text style={styles.lastEvidenceAt}>{lastEvidence.at}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  state,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  state?: ActionState;
}) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionLabel}>{label}</Text>
      {state ? (
        <Text style={[styles.actionState, { color: getStatusColor(state.status) }]}>
          {state.status}
        </Text>
      ) : null}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  editable?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        editable={editable}
        multiline={multiline}
        style={[styles.input, multiline ? styles.inputMultiline : null, !editable ? styles.inputDisabled : null]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#667085"
      />
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'neutral' | 'warn' | 'success' }) {
  const backgroundColor =
    tone === 'success' ? '#163f2f' : tone === 'warn' ? '#422e15' : '#1a2532';
  const textColor = tone === 'success' ? '#84f1bc' : tone === 'warn' ? '#ffc977' : '#95b8ff';

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <Text style={styles.jsonBlock}>{stringifyDetail(value)}</Text>;
}

function MetaText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.metaText}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08101a',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 48,
  },
  hero: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#0f1b29',
    borderWidth: 1,
    borderColor: '#1d3148',
    marginBottom: 24,
  },
  eyebrow: {
    color: '#9bc3ff',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#f5f8fb',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9cb0c9',
    fontSize: 15,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#f5f8fb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    color: '#8194ad',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#0e1825',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1b2b3e',
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardTitleColumn: {
    flex: 1,
  },
  cardTitle: {
    color: '#f5f8fb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardHint: {
    color: '#93a5be',
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#162335',
    borderWidth: 1,
    borderColor: '#24364b',
  },
  actionLabel: {
    color: '#f5f8fb',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionState: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inputGrid: {
    gap: 10,
    marginBottom: 12,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#8ea5c4',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#24364b',
    backgroundColor: '#09121d',
    color: '#f5f8fb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    color: '#8a99ad',
  },
  jsonBlock: {
    marginTop: 6,
    backgroundColor: '#07111b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1c2a3c',
    padding: 12,
    color: '#c9d7e8',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  metaText: {
    color: '#b4c6dc',
    fontSize: 13,
    lineHeight: 18,
  },
  lastEvidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  lastEvidenceText: {
    flex: 1,
    color: '#d6e2ef',
    fontSize: 13,
    lineHeight: 18,
  },
  lastEvidenceAt: {
    color: '#7f91aa',
    fontSize: 11,
  },
});
