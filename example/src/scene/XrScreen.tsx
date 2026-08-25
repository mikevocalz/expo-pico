import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ViroSceneNavigator, ViroVRSceneNavigator } from '@reactvision/react-viro';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { InteractiveCubeScene } from './InteractiveCubeScene';
import { palette, radius, space } from '../ui/theme';
import { useLayout } from '../ui/useLayout';

/**
 * Immersive route. On PICO / Quest the VR navigator claims the HMD surface;
 * on a phone or a non-XR build the flat navigator renders the same scene in
 * a window, so the route is never a dead end.
 *
 * The back control stays pinned over the navigator rather than inside the
 * scene — a 2D affordance the user can always reach, per the safety rule
 * that exit is never more than one press away.
 */
export function XrScreen({ onBack }: { onBack: () => void }): React.JSX.Element {
  const info = useMemo(() => getPicoRuntimeInfo(), []);
  const L = useLayout();
  const immersive = info.xrMode !== 'mobile';

  const initialScene = useMemo(() => ({ scene: InteractiveCubeScene }), []);

  return (
    <View style={styles.root}>
      {immersive ? (
        <ViroVRSceneNavigator initialScene={initialScene} style={styles.navigator} />
      ) : (
        <ViroSceneNavigator initialScene={initialScene} style={styles.navigator} />
      )}

      <View style={[styles.overlay, { padding: L.gutter / 2 }]} pointerEvents="box-none">
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel="Leave the XR scene"
          hitSlop={12}
        >
          <Text style={styles.backGlyph}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {immersive ? `${info.xrMode} · immersive` : 'flat preview'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05060C' },
  navigator: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: 'rgba(16,19,34,0.82)',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
  },
  backPressed: { backgroundColor: 'rgba(35,40,66,0.92)' },
  backGlyph: { color: palette.text, fontSize: 20, marginTop: -2 },
  backLabel: { color: palette.text, fontSize: 14, fontWeight: '600' },
  badge: {
    backgroundColor: 'rgba(16,19,34,0.82)',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.sm + 4,
  },
  badgeText: { color: palette.accent, fontSize: 11, fontWeight: '600' },
});
