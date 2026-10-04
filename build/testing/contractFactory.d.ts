/**
 * Shared package contract test factory.
 *
 * Every hardened package in the expo-pico family must apply this factory in its
 * __tests__/contract.test.ts file. This ensures consistent verification of:
 * - availability method signatures
 * - typed error behavior for all async methods
 * - NOT_IMPLEMENTED behavior for all seam methods
 * - event listener null-safety
 *
 * @example
 * // packages/expo-pico-rooms/src/__tests__/contract.test.ts
 * jest.mock('expo', () => ({ requireNativeModule: jest.fn(() => { throw new Error(); }) }));
 * import * as api from '../index';
 * import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';
 *
 * runPackageContractTests({
 *   packageName: '@expo-pico/rooms',
 *   api: api as Record<string, unknown>,
 *   availabilityMethod: 'isRoomsAvailable',
 *   versionMethod: 'getRoomsSdkVersion',
 *   asyncMethods: ['createRoom', 'joinRoom', 'leaveRoom'],
 *   listenerMethods: ['addRoomUpdatedListener'],
 *   seamMethods: ['requestMatchmaking'],
 * });
 */
export interface PackageContractOptions {
    /** Human-readable package name for test labels */
    packageName: string;
    /** The package's full export surface (import * as api from '../index') */
    api: Record<string, unknown>;
    /** Name of the is{X}Available() method */
    availabilityMethod: string;
    /** Name of the get{X}SdkVersion() method */
    versionMethod: string;
    /**
     * Async methods that must throw SERVICE_UNAVAILABLE when native is absent.
     * Pass minimal required arguments (empty arrays/objects are fine for seam testing).
     */
    asyncMethods: Array<string | [string, ...unknown[]]>;
    /**
     * Event listener methods that must return a Subscription with remove() when unavailable.
     */
    listenerMethods: string[];
    /**
     * Async methods that are explicit NOT_IMPLEMENTED seams regardless of availability.
     */
    seamMethods?: Array<string | [string, ...unknown[]]>;
}
export declare function runPackageContractTests(opts: PackageContractOptions): void;
//# sourceMappingURL=contractFactory.d.ts.map