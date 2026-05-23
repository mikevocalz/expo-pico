import React, { useMemo } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { getPicoRuntimeInfo } from '@expo-pico/core';

import { DiagnosticsPanel } from './src/scene/DiagnosticsPanel';
import { PicoSceneRoot } from './src/scene/PicoSceneRoot';
import { Tabs, type TabDefinition } from './src/ui/Tabs';
import { ValidationHarness } from './src/validation/ValidationHarness';

/**
 * Three-tab layout:
 *   - Scene       — 3D preview + compact runtime HUD.
 *   - Diagnostics — Phase F runtime report + Phase J SDK probe table.
 *   - Harness     — full per-sibling validation harness (2247-line test surface).
 *
 * Tabs are lazy — only the active tab's content is mounted. This keeps
 * the ValidationHarness's initialization cost out of the 3D scene's
 * warm-up window, and lets the Canvas keep a stable ref when the user
 * switches tabs and back.
 */
export default function App(): JSX.Element {
  const info = useMemo(() => getPicoRuntimeInfo(), []);
  const tabs: readonly TabDefinition[] = useMemo(
    () => [
      {
        id: 'scene',
        label: 'Scene',
        badge: info.xrMode === 'mobile' ? null : info.xrMode,
        render: () => <PicoSceneRoot />,
      },
      {
        id: 'diagnostics',
        label: 'Diagnostics',
        // Red dot when the platform SDK isn't detected — matches the
        // "seam" state consumers care about at a glance.
        badge: info.platformSdkPresent ? 'live' : 'seam',
        render: () => <DiagnosticsPanel />,
      },
      {
        id: 'harness',
        label: 'Harness',
        render: () => <ValidationHarness />,
      },
    ],
    [info.xrMode, info.platformSdkPresent]
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d1a" />
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>expo-pico example</Text>
        <Text style={styles.topSub}>
          {info.xrMode} · {info.appType}
          {info.deviceModel ? ` · ${info.deviceModel}` : ''}
        </Text>
      </View>
      <Tabs tabs={tabs} initialId="scene" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0d1a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f1126',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1c30',
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  topSub: {
    color: '#8a91c0',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
