import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { metaWindows } from '../src/layout/metaWindows';
import { AppHeader } from '../src/ui/AppHeader';
import { palette } from '../src/ui/theme';

/**
 * One branded header for every route.
 *
 * `headerShown: false` on the Stack and a single <AppHeader> above it, rather
 * than a per-screen `header` option: the lockup is identical on every route and
 * PICO renders the app into a fixed 2D panel, so there is no large-title or
 * collapsing-header behaviour to preserve.
 *
 * `metaWindows.SceneProvider` is Meta's SpatialSceneProvider on Horizon OS
 * builds, which the Library, Details and Controls windows on the home screen
 * need above them. Everywhere else it renders its children unchanged.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <metaWindows.SceneProvider>
        <View style={styles.root}>
          <StatusBar barStyle="light-content" backgroundColor={palette.bg} />
          <AppHeader />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.bg },
              animation: 'fade',
            }}
          />
        </View>
      </metaWindows.SceneProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
});
