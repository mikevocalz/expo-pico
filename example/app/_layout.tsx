import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { DetailPanelHost } from '../src/layout/DetailPanelHost';
import { metaWindows } from '../src/layout/metaWindows';
import { SpatialWindowHost } from '../src/layout/SpatialWindowHost';
import { spatialWindows } from '../src/layout/spatialWindows';
import { AppHeader } from '../src/ui/AppHeader';
import { AppShell } from '../src/ui/AppShell';
import { palette } from '../src/ui/theme';

/**
 * Root layout: the rail, main and detail shell (docs/adr/0001) around one
 * branded header and the route stack.
 *
 * `metaWindows.SceneProvider` is Meta's SpatialSceneProvider on Horizon OS
 * builds and a fragment elsewhere. `SpatialWindowHost` renders the rail
 * window at the surface origin so presses inside it complete, and
 * `DetailPanelHost` opens and closes the detail panel. On PICO the root is
 * transparent: the main window shows the rail strip and a rounded main panel.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <metaWindows.SceneProvider>
        <View style={styles.root}>
          <StatusBar barStyle="light-content" backgroundColor={palette.bg} />
          <AppShell>
            <AppHeader />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.bg },
                animation: 'fade',
              }}
            />
          </AppShell>
          <SpatialWindowHost />
          <DetailPanelHost />
        </View>
      </metaWindows.SceneProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: spatialWindows.kind === 'pico-strip' ? 'transparent' : palette.bg,
  },
});
