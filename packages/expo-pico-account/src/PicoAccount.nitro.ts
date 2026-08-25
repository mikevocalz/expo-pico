import type { HybridObject } from 'react-native-nitro-modules';

/** Account-linking state reported by PicoSignInClient. */
export type PicoAccountLinkStatus = 'linked' | 'not-linked' | 'pending' | 'error' | 'unsupported';

export type PicoLoginStatus = 'success' | 'cancelled' | 'error';

/**
 * Tri-state, deliberately not a boolean.
 *
 * PPS returns `AdultStatus{UNKNOWN, MINOR, ADULT}`. Collapsing `UNKNOWN` into
 * `false` would read as "confirmed minor" and collapsing it into `true` would
 * open an age gate the platform never verified, so the third state is carried
 * through and the caller decides.
 */
export type PicoAdultStatus = 'unknown' | 'minor' | 'adult';

export interface PicoUserProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Flattened from the previous discriminated union. Nitro structs cannot model
 * `{status:'success',...} | {status:'cancelled'}`, so the variant fields are
 * optional and only populated for their own `status`:
 *   success   → userId, accessToken
 *   error     → code, message
 *   cancelled → nothing
 */
export interface PicoLoginResult {
  status: PicoLoginStatus;
  userId?: string;
  accessToken?: string;
  code?: string;
  message?: string;
}

export interface PicoAccount extends HybridObject<{ android: 'kotlin' }> {
  /** False when PPS is off the classpath (mobile flavor, non-PICO hardware, offline prebuild). */
  readonly available: boolean;
  readonly sdkVersion: string;
  /** Remediation string when `available` is false; 'ready' once initialized. */
  readonly sdkStatus: string;

  getUserProfile(): Promise<PicoUserProfile>;
  getAccountLinkStatus(): Promise<PicoAccountLinkStatus>;
  login(): Promise<PicoLoginResult>;
  getAccessToken(): Promise<string>;
  logout(): Promise<void>;

  /** Age gate. Returns `'unknown'` when PICO has not verified the account. */
  getAdultStatus(): Promise<PicoAdultStatus>;
  /** Scopes the user has already granted this app. */
  getAuthorizedScopes(): Promise<string[]>;
  /** Requests additional OAuth scopes; resolves with the scopes actually granted. */
  requestAuthScopes(scopes: string[]): Promise<string[]>;
  /** Revokes this app's authorization. The next call needing a scope re-prompts. */
  cancelAuthorization(): Promise<void>;
}
