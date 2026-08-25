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

/**
 * What an auth-scope response should carry back. Not a login mode — the
 * artifact declares exactly these three.
 */
export type PicoAuthType = 'auth-code' | 'access-token' | 'id-token';

/**
 * Result of an interactive scope request.
 *
 * Which credential is populated follows the `PicoAuthType` asked for; the
 * others come back empty. `refreshToken` is a long-lived credential — treat it
 * the way you would any other, and prefer exchanging `authCode` server-side
 * over holding tokens in the JS bundle.
 */
export interface PicoAuthScopeResult {
  authorizedScopes: string[];
  accessToken: string;
  refreshToken: string;
  idToken: string;
  authCode: string;
  userId: string;
  displayName: string;
}

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
  /**
   * Interactive scope request that also returns credentials.
   *
   * `requestAuthScopes()` answers only which scopes were granted; this returns
   * the token or auth code as well, per `authType`.
   */
  sendAuthScopesRequest(scopes: string[], authType: PicoAuthType): Promise<PicoAuthScopeResult>;
}
