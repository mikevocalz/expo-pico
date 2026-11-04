import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { attachedWindowFrame } from '@expo-pico/spatial';

import { palette } from '../ui/theme';
import { SHELL } from './shell';
import { spatialWindows } from './spatialWindows';
import { useSpatialWindowHostStore, useStripPlacementStore } from './spatialWindowHost.store';

/**
 * The PICO main window: a transparent strip on the left holding every window
 * Meta would attach flush outside the main window's left edge (the rail),
 * then the main panel on its own rounded surface. PICO OS 5 composites the
 * main window's alpha (`windows.translucentMainWindow`, on by default), so the
 * strip reads as empty space and the rail as its own panel. The strip is
 * always reserved, so the main panel never shifts when the rail mounts.
 * Ported from MoyoLearn's `PicoMainFrame`.
 *
 * Renders `children` unchanged on every other build.
 */
export function PicoMainFrame({ children }: { children: React.ReactNode }): React.JSX.Element {
  if (spatialWindows.kind !== 'pico-strip') return <>{children}</>;
  return (
    <View style={styles.frame}>
      <AttachedWindowStrip />
      <View style={styles.main}>{children}</View>
    </View>
  );
}

function AttachedWindowStrip(): React.JSX.Element {
  const windows = useSpatialWindowHostStore((state) => state.windows);
  const setPlacement = useStripPlacementStore((state) => state.setPlacement);
  const attached = Object.values(windows).flatMap((entry) => {
    const frame = attachedWindowFrame(entry.window);
    return frame ? [{ ...entry, frame }] : [];
  });
  const labels = attached.map((entry) => entry.window.label).join('\n');

  // Drawn in this window as soon as it mounts, so report it placed and the
  // surface that asked stops drawing its in-window fallback.
  useEffect(() => {
    const placed = labels === '' ? [] : labels.split('\n');
    for (const label of placed) setPlacement(label, 'spatial');
    return () => {
      for (const label of placed) setPlacement(label, 'inline');
    };
  }, [labels, setPlacement]);

  return (
    <View pointerEvents="box-none" style={[styles.strip, { width: SHELL.railStripWidthDp }]}>
      {attached.map(({ window, content, frame }) => (
        <View
          key={window.label}
          style={{ width: frame.widthDp, height: frame.heightDp, marginRight: frame.gapDp }}
        >
          {content}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
  strip: {
    height: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  main: {
    flex: 1,
    backgroundColor: palette.bg,
    borderRadius: SHELL.tokens.cornerRadiusDp,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
