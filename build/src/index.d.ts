import type { PicoAuthType } from './types';
export type { PicoUserProfile, PicoLoginResult, PicoLoginStatus, PicoAccountLinkStatus, PicoAdultStatus, PicoAuthType, PicoAuthScopeResult, } from './types';
export declare function isAccountAvailable(): boolean;
export declare function getAccountSdkVersion(): string;
/** Remediation step from the native side; 'ready' once the SDK is initialized. */
export declare function getAccountSdkStatus(): string;
export declare function getUserProfile(): Promise<import("./types").PicoUserProfile>;
export declare function getAccountLinkStatus(): Promise<import("./types").PicoAccountLinkStatus>;
export declare function login(): Promise<import("./types").PicoLoginResult>;
export declare function getAccessToken(): Promise<string>;
export declare function getAdultStatus(): Promise<import("./types").PicoAdultStatus>;
export declare function getAuthorizedScopes(): Promise<string[]>;
export declare function requestAuthScopes(scopes: string[]): Promise<string[]>;
export declare function cancelAuthorization(): Promise<void>;
/**
 * Interactive scope request that also returns credentials.
 *
 * Prefer exchanging the returned `authCode` server-side over holding
 * `refreshToken` in the JS bundle.
 */
export declare function sendAuthScopesRequest(scopes: string[], authType: PicoAuthType): Promise<import("./types").PicoAuthScopeResult>;
export declare function logout(): Promise<void>;
//# sourceMappingURL=index.d.ts.map