import {
  guardService,
  wrapNativeCall,
  notImplementedError,
} from '@expo-pico/platform-service-common';
import { NativeAccount } from './ExpoPicoAccountModule';
import type { PicoUserProfile, PicoLoginResult, PicoAccountLinkStatus } from './types';

export * from './types';

const PKG = '@expo-pico/account';
const DOCS = 'https://developer.picoxr.com/document/unity/account/';

// ─── Availability ─────────────────────────────────────────────────────────────

export function isAccountAvailable(): boolean {
  return NativeAccount?.accountSdkAvailable ?? false;
}

export function getAccountSdkVersion(): string {
  return NativeAccount?.accountSdkVersion ?? 'unavailable';
}

// ─── Implemented methods ──────────────────────────────────────────────────────

export async function getUserProfile(): Promise<PicoUserProfile> {
  guardService(isAccountAvailable(), PKG, 'getUserProfile');
  const raw = await wrapNativeCall(PKG, 'getUserProfile', NativeAccount!.getUserProfile());
  return raw as unknown as PicoUserProfile;
}

export async function getAccountLinkStatus(): Promise<PicoAccountLinkStatus> {
  guardService(isAccountAvailable(), PKG, 'getAccountLinkStatus');
  const raw = await wrapNativeCall(PKG, 'getAccountLinkStatus', NativeAccount!.getAccountLinkStatus());
  return raw as unknown as PicoAccountLinkStatus;
}

// ─── Seams ────────────────────────────────────────────────────────────────────

/**
 * @seam login() requires PICO OS account session management.
 * No programmatic login path is documented — the user is already authenticated
 * via the PICO OS account at app launch.
 */
export async function login(): Promise<PicoLoginResult> {
  throw notImplementedError(PKG, 'login', DOCS);
}

/**
 * @seam getAccessToken() requires platform OAuth token exchange.
 * Wire through AccountBridge when SDK is linked.
 */
export async function getAccessToken(): Promise<string> {
  throw notImplementedError(PKG, 'getAccessToken', DOCS);
}

/**
 * @seam logout() is managed by PICO OS, not individual apps.
 */
export async function logout(): Promise<void> {
  throw notImplementedError(PKG, 'logout', DOCS);
}
