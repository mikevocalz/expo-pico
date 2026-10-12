import { ConfigPlugin, withAppBuildGradle } from '@expo/config-plugins';

type SpatialAuthOptions = { metaHorizon?: boolean };
const META_MARKER = '// expo-spatial-auth: quest runtime identity';

export const withSpatialAuth: ConfigPlugin<SpatialAuthOptions> = (config, options = {}) => {
  if (!options.metaHorizon) return config;
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(META_MARKER)) {
      mod.modResults.contents += `
${META_MARKER}
android {
    productFlavors {
        quest { minSdkVersion 34 }
    }
}
dependencies {
    questImplementation "com.meta.horizon.platform.sdk:core-kotlin:0.2.2"
    questImplementation "com.meta.horizon.platform.sdk:users-kotlin:0.2.2"
}
`;
    }
    return mod;
  });
};

export default withSpatialAuth;
