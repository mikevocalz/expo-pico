import { NitroModules } from 'react-native-nitro-modules';
import {
  PicoServiceError,
  PicoErrorCode,
  wrapNativeCall,
} from '@expo-pico/platform-service-common';
import type { PicoAccount } from './PicoAccount.nitro';

export type {
  PicoUserProfile,
  PicoLoginResult,
  PicoLoginStatus,
  PicoAccountLinkStatus,
} from './PicoAccount.nitro';

const PKG = '@expo-pico/account';

/**
 * Created lazily: createHybridObject throws when the native library is absent
 * (mobile flavor, non-PICO hardware), and that must surface as
 * SERVICE_UNAVAILABLE rather than a module-load crash.
 */
let cached: PicoAccount | null = null;
let resolved = false;

function nativeAccount(): PicoAccount | null {
  if (!resolved) {
    resolved = true;
    try {
      cached = NitroModules.createHybridObject<PicoAccount>('PicoAccount');
    } catch {
      cached = null;
    }
  }
  return cached;
}

export function isAccountAvailable(): boolean {
  return nativeAccount()?.available ?? false;
}

export function getAccountSdkVersion(): string {
  return nativeAccount()?.sdkVersion ?? 'unavailable';
}

/** Remediation step from the native side; 'ready' once the SDK is initialized. */
export function getAccountSdkStatus(): string {
  return nativeAccount()?.sdkStatus ?? 'unknown';
}

function requireAvailable(method: string): PicoAccount {
  const native = nativeAccount();
  if (native?.available) return native;
  throw new PicoServiceError({
    code: PicoErrorCode.SERVICE_UNAVAILABLE,
    packageName: PKG,
    methodName: method,
    message: `${PKG}: ${method}() — ${getAccountSdkStatus()}`,
  });
}

export async function getUserProfile() {
  const native = requireAvailable('getUserProfile');
  return wrapNativeCall(PKG, 'getUserProfile', native.getUserProfile());
}

export async function getAccountLinkStatus() {
  const native = requireAvailable('getAccountLinkStatus');
  return wrapNativeCall(PKG, 'getAccountLinkStatus', native.getAccountLinkStatus());
}

export async function login() {
  const native = requireAvailable('login');
  return wrapNativeCall(PKG, 'login', native.login());
}

export async function getAccessToken(): Promise<string> {
  const native = requireAvailable('getAccessToken');
  return wrapNativeCall(PKG, 'getAccessToken', native.getAccessToken());
}

export async function logout(): Promise<void> {
  const native = requireAvailable('logout');
  await wrapNativeCall(PKG, 'logout', native.logout());
}
