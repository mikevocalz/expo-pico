import React, { useMemo } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { getPicoRuntimeInfo } from '@expo-pico/core';

import { DiagnosticsPanel } from './src/scene/DiagnosticsPanel';
import { PicoSceneRoot } from './src/scene/PicoSceneRoot';
import { Tabs, type TabDefinition } from './src/ui/Tabs';
import { ValidationHarness } from './src/validation/ValidationHarness';

/**
 * App entry point.
 *
 * Standard Viro flow: MainActivity is a normal 2D React Native activity. The
 * three-tab dev surface lives at the root. When the user opens the Scene tab,
 * `<ViroVRSceneNavigator>` mounts inside and Viro itself launches the
 * immersive `VRActivity` to claim the HMD surface — so we DON'T put the
 * navigator at the absolute root. Same code on PICO, Quest, and mobile.
 *
 *   - Scene       — Viro scene + compact runtime HUD.
 *   - Diagnostics — runtime report + SDK probe table.
 *   - Harness     — full per-sibling validation harness.
 */
export default function App(): React.JSX.Element {
  const info = useMemo(() => getPicoRuntimeInfo(), []);

  const tabs: readonly TabDefinition[] = [
    {
      id: 'harness',
      label: 'Harness',
      render: () => <ValidationHarness />,
    },
    {
      id: 'scene',
      label: 'Scene',
      badge: info.xrMode === 'mobile' ? null : info.xrMode,
      render: () => <PicoSceneRoot />,
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      badge: info.platformSdkPresent ? 'live' : 'seam',
      render: () => <DiagnosticsPanel />,
    },
  ];

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
      <Tabs tabs={tabs} initialId="harness" />
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
