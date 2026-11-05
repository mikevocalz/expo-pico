import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';

import { palette } from '../ui/theme';
import {
  isImmersiveRoute,
  mainContentFrameFor,
  useMainContentFrameStore,
} from './mainContentFrame.store';

/**
 * Keeps the main panel's content at the panel's launch aspect (1280x800dp,
 * 1.6) when the user resizes the panel on a headset.
 *
 * Horizon OS and PICO OS 5 resize the window to any shape, and the manifest
 * cannot lock it (Android ignores minAspectRatio/maxAspectRatio on resizeable
 * activities). This measures the main panel and lays the content out in the
 * largest centred 1.6 frame that fits, filling the rest with the surface
 * color. The window bounds are left alone, so the rail window and the detail
 * panel are unaffected. Ported from MoyoLearn's `MainContentFrame`
 * (apps/mobile/src/spatial/MainContentFrame.tsx).
 *
 * Headsets only (`framed`); phones, tablets and the inline XR route render
 * their content unchanged.
 */
export function MainContentFrame({
  framed,
  children,
}: {
  framed: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const setHostSize = useMainContentFrameStore((state) => state.setHostSize);
  // Two scalar selectors: a selector returning a new frame object each call
  // would re-render forever.
  const hostWidth = useMainContentFrameStore((state) => state.hostWidth);
  const hostHeight = useMainContentFrameStore((state) => state.hostHeight);
  const frame = mainContentFrameFor({ hostWidth, hostHeight });
  if (!framed || isImmersiveRoute(pathname)) return <View style={styles.fill}>{children}</View>;
  return (
    <View
      testID="main-content-frame-host"
      style={styles.host}
      onLayout={({ nativeEvent: { layout } }) => setHostSize(layout.width, layout.height)}
    >
      {/* Hidden until measured, so the content never flashes at the window's shape. */}
      <View
        testID="main-content-frame-surface"
        style={frame ? [styles.surface, frame] : [styles.fill, styles.hidden]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  host: { flex: 1, overflow: 'hidden', backgroundColor: palette.bg },
  surface: { position: 'absolute', overflow: 'hidden', backgroundColor: palette.bg },
  hidden: { opacity: 0 },
});
