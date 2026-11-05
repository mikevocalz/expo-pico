import { NativeModule } from 'expo';
declare class ExpoHorizonModule extends NativeModule {
    isHorizonDevice: boolean;
    isHorizonBuild: boolean;
    horizonAppId: null;
    readonly horizonSdkVersion: number | null;
    readonly horizonOsVersion: string | null;
    isHorizonSdkVersionAtLeast(_version: number): boolean;
}
declare const _default: ExpoHorizonModule;
export default _default;
//# sourceMappingURL=ExpoHorizonModule.web.d.ts.map