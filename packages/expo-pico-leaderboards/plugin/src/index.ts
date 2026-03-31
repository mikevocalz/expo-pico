import { ConfigPlugin } from '@expo/config-plugins';

export interface PicoLeaderboardsPluginOptions {
  enabled?: boolean;
}

// Leaderboards API requires no extra manifest permissions beyond those
// already declared by expo-pico-core (PICO platform SDK base).
const withPicoLeaderboards: ConfigPlugin<PicoLeaderboardsPluginOptions | void> = (
  config,
  _options
) => {
  return config;
};

export default withPicoLeaderboards;
