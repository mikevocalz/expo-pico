import React, { useMemo } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { IsoCube } from './IsoCube';
import { useLayout } from './useLayout';
import { palette, radius, space } from './theme';

export type HomeRoute = 'xr' | 'diagnostics' | 'harness';

type Props = { onNavigate: (route: HomeRoute) => void };

function Chip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'warn';
}): React.JSX.Element {
  const dot = tone === 'ok' ? palette.ok : tone === 'warn' ? palette.warn : palette.textFaint;
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: dot }]} />
      <View style={styles.chipBody}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={styles.chipValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Row({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

export function HomeScreen({ onNavigate }: Props): React.JSX.Element {
  const info = useMemo(() => getPicoRuntimeInfo(), []);
  const L = useLayout();
  const onHeadset = info.xrMode !== 'mobile';

  const hero = (
    <View style={[styles.heroCol, L.twoColumn && styles.heroColWide]}>
      <IsoCube size={L.heroSize} />
      <Text style={[styles.title, { fontSize: L.titleSize }, L.twoColumn && styles.textLeft]}>
        expo-pico
      </Text>
      <Text
        style={[
          styles.subtitle,
          { fontSize: L.bodySize, lineHeight: L.bodySize * 1.5 },
          L.twoColumn && styles.textLeft,
        ]}
      >
        Expo-native XR for PICO 4, 4 Ultra, Swan and Meta Quest 3.
      </Text>
    </View>
  );

  const actions = (
    <View style={[styles.actionCol, L.twoColumn && styles.actionColWide]}>
      <View style={[styles.chips, !L.twoColumn && styles.chipsRow]}>
        <Chip label="XR MODE" value={info.xrMode} tone={onHeadset ? 'ok' : 'warn'} />
        <Chip label="APP TYPE" value={info.appType} />
        <Chip
          label="PLATFORM SDK"
          value={info.platformSdkPresent ? 'live' : 'seam'}
          tone={info.platformSdkPresent ? 'ok' : 'warn'}
        />
      </View>

      <Pressable
        onPress={() => onNavigate('xr')}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel="Enter the XR scene"
      >
        <Text style={styles.ctaLabel}>Enter XR Scene</Text>
      </Pressable>

      <Text style={styles.ctaNote}>
        {onHeadset
          ? `${info.deviceModel ?? 'Headset'} · immersive session`
          : 'No headset detected — the scene renders as a flat preview.'}
      </Text>

      <View style={styles.rows}>
        <Row
          title="Diagnostics"
          detail="Build-time and runtime report, SDK probe table"
          onPress={() => onNavigate('diagnostics')}
        />
        <Row
          title="Validation harness"
          detail="Exercises every sibling package's public API"
          onPress={() => onNavigate('harness')}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={palette.bg} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: L.gutter, paddingVertical: L.gutter },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.frame, { maxWidth: L.maxContentWidth }]}>
          <View style={L.twoColumn ? styles.split : undefined}>
            {hero}
            {actions}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '100%' },
  split: { flexDirection: 'row', alignItems: 'center', gap: space.xl },

  heroCol: { alignItems: 'center' },
  heroColWide: { flex: 1, alignItems: 'flex-start' },
  actionCol: { marginTop: space.xl },
  actionColWide: { flex: 1, marginTop: 0, maxWidth: 460 },

  textLeft: { textAlign: 'left' },
  title: {
    color: palette.text,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: space.md,
  },
  subtitle: {
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
  },

  chips: { gap: space.sm },
  chipsRow: { flexDirection: 'row' },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.bgRaised,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.sm + 2,
  },
  chipBody: { flex: 1 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { color: palette.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  chipValue: { color: palette.text, fontSize: 12, fontWeight: '600' },

  cta: {
    marginTop: space.lg,
    backgroundColor: palette.text,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  ctaLabel: { color: palette.bg, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  ctaNote: { color: palette.textFaint, fontSize: 12, textAlign: 'center', marginTop: space.sm + 2 },

  rows: { marginTop: space.lg, gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgCard,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  rowPressed: { backgroundColor: palette.bgRaised },
  rowText: { flex: 1 },
  rowTitle: { color: palette.text, fontSize: 15, fontWeight: '600' },
  rowDetail: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  rowChevron: { color: palette.textFaint, fontSize: 22, marginLeft: space.sm },
});
