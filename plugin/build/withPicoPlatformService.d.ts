import type { AndroidConfig } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * In-place PICO Platform Service manifest mutation for the flavor
 * manifest. Adds the two login/payment activities and the Platform SDK
 * BuildConfig-mirror meta-data.
 *
 * Gated on `options.platformService.declareActivities && hasIdentity`.
 *
 * Idempotent: activities are keyed on `android:name`, so a repeat apply
 * updates the element in place rather than duplicating.
 *
 * Note on scope: Platform SDK identity. The activities
 * exist so the Platform SDK auth/payment flows bind correctly. The
 * actual `CoreService.Initialize` call remains an extension seam in
 * `PicoOs5Runtime` / sibling packages — this plugin only ensures the
 * manifest surface is correct when the consumer wires up identity.
 */
export declare function applyPlatformServiceContract(manifest: AndroidConfig.Manifest.AndroidManifest, options: ResolvedPicoOptions): AndroidConfig.Manifest.AndroidManifest;
export declare const PLATFORM_SERVICE_ACTIVITIES: {
    readonly AUTH: "com.pico.loginpaysdk.UnityAuthInterface";
    readonly BROWSER: "com.pico.loginpaysdk.component.PicoSDKBrowser";
};
export default applyPlatformServiceContract;
//# sourceMappingURL=withPicoPlatformService.d.ts.map