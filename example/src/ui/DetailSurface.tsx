/**
 * Detail content with its header: the title on the leading edge and Close on
 * the trailing edge. Shown in the detail panel on headsets and as a pushed
 * screen on phones. Structure-only references (Mobbin): Front's account
 * details (https://mobbin.com/screens/9bded131-2394-46cf-bcbd-a44ab7be10cb)
 * and Productboard's feature detail
 * (https://mobbin.com/screens/fb2d0afb-9515-46d4-af56-cf2c5bd026ab) for a
 * detail pane beside the list with its own title and close control.
 */
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { useShellStore } from '../layout/detailPanel.store';
import { DESTINATIONS, DETAIL_TITLES, SHELL, type DetailId } from '../layout/shell';
import { spatialWindows } from '../layout/spatialWindows';
import { xrModeLabel } from '../platform';
import { LucideGlyph } from './LucideGlyph';
import { palette, radius, space, type } from './theme';

type Fact = { label: string; value: string };

function FactList({ facts }: { facts: readonly Fact[] }): React.JSX.Element {
  return (
    <View style={styles.facts}>
      {facts.map((fact) => (
        <View key={fact.label} style={styles.fact}>
          <Text style={styles.factLabel}>{fact.label}</Text>
          <Text style={styles.factValue} selectable>
            {fact.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function HeadsetFacts(): React.JSX.Element {
  const info = useMemo(() => getPicoRuntimeInfo(), []);
  return (
    <FactList
      facts={[
        { label: 'Device', value: info.deviceModel ?? 'Unknown' },
        { label: 'Runtime', value: xrModeLabel(info.xrMode) },
        { label: 'App type', value: info.appType },
        { label: 'Spatial mode', value: info.spatialMode },
        { label: 'Container', value: info.containerMode },
        { label: 'PICO OS', value: info.picoOsVersion ?? 'Not a PICO headset' },
        {
          label: 'Platform SDK',
          value: info.platformSdkPresent ? (info.platformSdkVersion ?? 'Linked') : 'Not linked',
        },
      ]}
    />
  );
}

const RAIL_BACKEND: Readonly<Record<typeof spatialWindows.kind, string>> = {
  meta: 'Meta Layout SDK window',
  'pico-strip': 'Strip of the main window',
  none: 'Bottom tab bar',
};

function LayoutFacts(): React.JSX.Element {
  const railPlacement = useShellStore((state) => state.railPlacement);
  const status = useShellStore((state) => state.status);
  const rail = SHELL.railWindow(DESTINATIONS.length);
  const detail = SHELL.detailPanelSizeDp;
  return (
    <FactList
      facts={[
        { label: 'Rail', value: RAIL_BACKEND[spatialWindows.kind] },
        { label: 'Rail placement', value: railPlacement },
        { label: 'Rail size', value: `${rail.windowWidth} × ${rail.windowHeight} dp` },
        { label: 'Detail panel', value: status },
        { label: 'Detail size', value: `${detail.widthDp} × ${detail.heightDp} dp` },
      ]}
    />
  );
}

export function DetailSurface({
  id,
  onClose,
}: {
  id: DetailId;
  onClose: () => void;
}): React.JSX.Element {
  const title = DETAIL_TITLES[id];
  return (
    <View style={styles.surface}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
        >
          <LucideGlyph name="x" size={20} color={palette.text} />
          <Text style={styles.closeLabel}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {id === 'headset' ? <HeadsetFacts /> : <LayoutFacts />}
      </ScrollView>
    </View>
  );
}

/**
 * The detail panel's own surface, registered in index.js. It shares the main
 * window's JS runtime, so it reads the selection from the shell store; Close
 * clears it and `DetailPanelHost` closes the panel.
 */
export function DetailPanelRoot(): React.JSX.Element {
  const selectedId = useShellStore((state) => state.selectedId);
  const clear = useShellStore((state) => state.clear);
  if (selectedId == null) return <View style={styles.surface} />;
  return <DetailSurface id={selectedId} onClose={clear} />;
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: palette.bg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingVertical: space.sm,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
  },
  title: { ...type.title, flex: 1, color: palette.text },
  close: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: palette.bgCard,
  },
  closePressed: { backgroundColor: palette.bgRaised },
  closeLabel: { color: palette.text, fontSize: 14, fontWeight: '600' },
  body: { padding: space.lg },
  facts: { gap: space.md },
  fact: { gap: 2 },
  factLabel: { color: palette.textMuted, fontSize: 12, fontWeight: '600' },
  factValue: { color: palette.text, fontSize: 16 },
});
