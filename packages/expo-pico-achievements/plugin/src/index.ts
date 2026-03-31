import { ConfigPlugin } from '@expo/config-plugins';

export interface PicoAchievementsPluginOptions {
  enabled?: boolean;
}

// Achievements API requires no extra manifest permissions beyond those
// already declared by expo-pico-core (PICO platform SDK base).
const withPicoAchievements: ConfigPlugin<PicoAchievementsPluginOptions | void> = (
  config,
  _options
) => {
  return config;
};

export default withPicoAchievements;
