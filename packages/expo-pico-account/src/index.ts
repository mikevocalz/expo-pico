import {
  PicoServiceError,
  PicoErrorCode,
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

/**
 * Human-readable remediation step from the native module. Returns
 * "ready" once the SDK is initialized, or an actionable message like
 * "PICO Platform SDK AAR not found. Download from ... and drop into
 * android/app/libs/" when it's not.
 */
export function getAccountSdkStatus(): string {
  return (NativeAccount as { accountSdkStatus?: string } | undefined)?.accountSdkStatus ?? 'unknown';
}

/**
 * Throws SERVICE_UNAVAILABLE with the EXACT remediation step in the message
 * (read from `accountSdkStatus` on the native module). Lets callers surface a
 * useful error to users — "drop the AAR in app/libs/" instead of "not
 * present in this build".
 */
function requireAvailable(method: string): void {
  if (isAccountAvailable()) return;
  throw new PicoServiceError({
    code: PicoErrorCode.SERVICE_UNAVAILABLE,
    packageName: PKG,
    methodName: method,
    message: `${PKG}: ${method}() — ${getAccountSdkStatus()}`,
  });
}

// ─── Implemented methods ──────────────────────────────────────────────────────

export async function getUserProfile(): Promise<PicoUserProfile> {
  requireAvailable('getUserProfile');
  const raw = await wrapNativeCall(PKG, 'getUserProfile', NativeAccount!.getUserProfile());
  return raw as unknown as PicoUserProfile;
}

export async function getAccountLinkStatus(): Promise<PicoAccountLinkStatus> {
  requireAvailable('getAccountLinkStatus');
  const raw = await wrapNativeCall(PKG, 'getAccountLinkStatus', NativeAccount!.getAccountLinkStatus());
  return raw as unknown as PicoAccountLinkStatus;
}

// ─── Seams ────────────────────────────────────────────────────────────────────

export async function login(): Promise<PicoLoginResult> {
  requireAvailable('login');
  const raw = await wrapNativeCall(PKG, 'login', NativeAccount!.login());
  return raw as unknown as PicoLoginResult;
}

export async function getAccessToken(): Promise<string> {
  requireAvailable('getAccessToken');
  return (await wrapNativeCall(PKG, 'getAccessToken', NativeAccount!.getAccessToken())) as string;
}

export async function logout(): Promise<void> {
  requireAvailable('logout');
  await wrapNativeCall(PKG, 'logout', NativeAccount!.logout());
}
