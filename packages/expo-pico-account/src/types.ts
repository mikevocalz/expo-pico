/**
 * PICO platform user identity.
 * @see https://developer.picoxr.com/document/platform_service/account/
 */
export interface PicoUserProfile {
  /** PICO platform user ID (opaque string). */
  userId: string;
  /** Display name set by the user. */
  displayName: string;
  /** URL of the user's avatar image, or null if not set. */
  avatarUrl: string | null;
}

/**
 * Result of a login attempt.
 */
export type PicoLoginResult =
  | { status: 'success'; userId: string; accessToken: string }
  | { status: 'cancelled' }
  | { status: 'error'; code: string; message: string };

/**
 * Account linking status.
 * @see https://developer.picoxr.com/document/platform_service/account-linking/
 */
export type PicoAccountLinkStatus =
  | 'linked'
  | 'not-linked'
  | 'pending'
  | 'error'
  | 'unsupported';

/**
 * Module interface — constants exposed at init time.
 */
export interface ExpoPicoAccountModuleInterface {
  /** Whether the PICO Platform SDK is available and initialized. */
  platformSdkAvailable: boolean;
  /** Platform SDK version string, or null if SDK not present. */
  platformSdkVersion: string | null;
}
