// Typed wrapper + React hooks for @expo-pico/notifications (Pico push).
//
// Capability-gated: when @expo-pico/notifications' native bridge isn't
// active (no PPS push artifact on classpath), permission queries return
// 'not-determined' and register/listeners are no-ops.

import { useCallback, useEffect, useState } from 'react';

import { getPicoCapabilities } from './picoCapabilities';

export type NotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'not-determined';

export type Subscription = { remove: () => void };
const NULL_SUB: Subscription = { remove: () => {} };

let cachedModule: any | null | undefined;
function notif(): any | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = require('@expo-pico/notifications');
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[pico/notifications] bridge unavailable — PPS Push SDK not on ' +
      'classpath. Verify com.pico.pps:platform-service-push is resolving on ' +
      'Bytedance maven (or that the AAR is in android/app/libs/).',
  );
}

// ───────── Imperative API ─────────

export function getPermissionStatus(): NotificationPermissionStatus {
  if (!getPicoCapabilities().push) return 'not-determined';
  try {
    return notif()?.getNotificationPermissionStatus?.() ?? 'not-determined';
  } catch {
    return 'not-determined';
  }
}

export async function requestPermissions(): Promise<NotificationPermissionStatus> {
  if (!getPicoCapabilities().push) {
    warnOnce();
    return 'not-determined';
  }
  try {
    const result = await notif()?.requestPermissions?.();
    return result?.status ?? 'not-determined';
  } catch {
    return 'not-determined';
  }
}

export async function registerForPush(): Promise<string | null> {
  if (!getPicoCapabilities().push) return null;
  try {
    const result = await notif()?.registerForPushNotifications?.();
    return result?.token ?? null;
  } catch {
    return null;
  }
}

export function onNotificationReceived(
  cb: (payload: unknown) => void,
): Subscription {
  if (!getPicoCapabilities().push) return NULL_SUB;
  try {
    const sub =
      notif()?.addNotificationReceivedListener?.(cb) ??
      notif()?.addReceivedListener?.(cb);
    return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
  } catch {
    return NULL_SUB;
  }
}

export function onNotificationOpened(
  cb: (payload: unknown) => void,
): Subscription {
  if (!getPicoCapabilities().push) return NULL_SUB;
  try {
    const sub =
      notif()?.addNotificationOpenedListener?.(cb) ??
      notif()?.addOpenedListener?.(cb);
    return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
  } catch {
    return NULL_SUB;
  }
}

// ───────── React hooks ─────────

// Returns the current permission status and a callback to request it.
// Re-fetches status on mount.
export function useNotificationPermission(): {
  status: NotificationPermissionStatus;
  request: () => Promise<NotificationPermissionStatus>;
} {
  const [status, setStatus] = useState<NotificationPermissionStatus>(() =>
    getPermissionStatus(),
  );

  useEffect(() => {
    setStatus(getPermissionStatus());
  }, []);

  const request = useCallback(async () => {
    const next = await requestPermissions();
    setStatus(next);
    return next;
  }, []);

  return { status, request };
}

// Returns the current push token (re-registers on mount). null when
// permission isn't granted or the bridge is inactive.
export function usePushToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    registerForPush().then((t) => {
      if (!cancelled) setToken(t);
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
export function useIncomingNotification(): unknown | null {
  const [payload, setPayload] = useState<unknown | null>(null);
  useEffect(() => {
    const sub = onNotificationReceived(setPayload);
    return () => sub.remove();
  }, []);
  return payload;
}

export const picoNotifications = {
  getPermissionStatus,
  requestPermissions,
  registerForPush,
  onNotificationReceived,
  onNotificationOpened,
  isAvailable: () => getPicoCapabilities().push,
};
