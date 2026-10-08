import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { metaWindows } from '../layout/metaWindows';
import { META_WINDOWS } from '../layout/workspace';
import { palette, space } from './theme';

type WindowId = keyof typeof META_WINDOWS;

/**
 * Content that opens as its own Horizon OS window on Meta builds and renders
 * in place everywhere else (and on Meta whenever no window slot is free).
 *
 * Meta's windows do not support transparency, so once placed the content sits
 * on an opaque, full-bleed surface that scrolls if it outgrows the fixed
 * window size. In place it keeps the parent's layout untouched.
 */
export function WorkspaceWindow({
  id,
  title,
  children,
}: {
  id: WindowId;
  /** Shown as a header only while the content is in its own window. */
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const spec = META_WINDOWS[id];
  return (
    <metaWindows.Window spec={spec}>
      <WindowSurface label={spec.label} title={title}>
        {children}
      </WindowSurface>
    </metaWindows.Window>
  );
}

function WindowSurface({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const placed = metaWindows.usePlacement(label) === 'spatial';
  if (!placed) return <>{children}</>;
  return (
    <ScrollView style={styles.surface} contentContainerStyle={styles.content}>
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, backgroundColor: palette.bg },
  content: { padding: space.md, gap: space.sm },
  title: { color: palette.text, fontSize: 15, fontWeight: '600' },
});
