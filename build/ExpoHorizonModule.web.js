import { registerWebModule, NativeModule, CodedError } from 'expo';
class ExpoHorizonModule extends NativeModule {
    isHorizonDevice = false;
    isHorizonBuild = false;
    horizonAppId = null;
    horizonSdkVersion = null;
    horizonOsVersion = null;
    isHorizonSdkVersionAtLeast(_version) {
        throw new CodedError('ERR_HORIZON_SDK_UNAVAILABLE', 'Horizon OS SDK checks are only available on Android.');
    }
}
export default registerWebModule(ExpoHorizonModule, 'ExpoHorizonModule');
//# sourceMappingURL=ExpoHorizonModule.web.js.map