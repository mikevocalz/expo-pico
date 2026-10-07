/**
 * Launcher home for the 2D panel.
 *
 * Structure-only references (Mobbin, web): Base welcome
 * (https://mobbin.com/screens/d5d2c2c4-aaba-4764-8453-9b622e9aeacb) for the
 * split with one primary action on the left; Klaviyo empty state
 * (https://mobbin.com/screens/543b8f44-0434-46bd-ac53-5fe7cd7f55a5) for a
 * status line directly under the primary button; Replit home
 * (https://mobbin.com/screens/c38f4614-95ad-4e3a-bc84-0bb1e1b81590) for a
 * single row of chips under the hero; Dropbox Dash
 * (https://mobbin.com/screens/31a95e42-7374-4c6e-a4fb-39f1da438580) for a
 * filled primary above quieter secondary entries. Colours and type come from
 * ./theme only.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { enterImmersiveScene, getPicoRuntimeInfo } from '@expo-pico/core';

import { horizonAppId, isHeadsetBuild, isHorizonBuild, xrModeLabel } from '../platform';
import { IsoCube } from './IsoCube';
import { SpatialLayoutPreview } from './SpatialLayoutPreview';
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
    <View style={styles.chip} accessible accessibilityLabel={`${label}: ${value}`}>
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
  const onHeadset = isHeadsetBuild(info);

  // Every headset build enters through VRActivity, which renders the scene
  // registered in index.js. If no immersive activity resolves (a phone, or a
  // build without one), the xr route renders the scene inline instead.
  const onEnterXr = useCallback(async () => {
    if (onHeadset && (await enterImmersiveScene())) return;
    onNavigate('xr');
  }, [onHeadset, onNavigate]);

  const platformSdk = isHorizonBuild
    ? { value: horizonAppId ? 'app ID set' : 'no app ID', ok: horizonAppId !== null }
    : { value: info.platformSdkPresent ? 'live' : 'seam', ok: info.platformSdkPresent };

  const launcher = (
    <View style={[styles.launcher, L.twoColumn && styles.colWide]}>
      <IsoCube size={L.heroSize} />
      <Text style={[styles.title, { fontSize: L.titleSize }, L.twoColumn && styles.textLeft]}>
        XR Sample
      </Text>
      <Text
        style={[
          styles.subtitle,
          { fontSize: L.bodySize, lineHeight: L.bodySize * 1.5 },
          L.twoColumn && styles.textLeft,
        ]}
      >
        {isHorizonBuild
          ? 'Runtime capabilities and an immersive scene, running on Meta Horizon OS from an Expo app.'
          : 'Platform services, runtime capabilities and an immersive scene, running on PICO OS from an Expo app.'}
      </Text>

      <View style={styles.chips}>
        <Chip label="XR mode" value={xrModeLabel(info.xrMode)} tone={onHeadset ? 'ok' : 'warn'} />
        <Chip label="App type" value={info.appType} />
        <Chip
          label="Platform SDK"
          value={platformSdk.value}
          tone={platformSdk.ok ? 'ok' : 'warn'}
        />
      </View>

      <Pressable
        onPress={onEnterXr}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel="Enter the XR scene"
      >
        <Text style={styles.ctaLabel}>Enter XR Scene</Text>
      </Pressable>

      <Text style={[styles.ctaNote, L.twoColumn && styles.textLeft]}>
        {onHeadset
          ? `Opens the immersive scene on your ${info.deviceModel ?? 'headset'}`
          : 'No headset detected — the scene renders as a flat preview.'}
      </Text>
    </View>
  );

  const secondary = (
    <View
      style={[styles.secondary, L.twoColumn && styles.colWide, L.twoColumn && styles.secondaryWide]}
    >
      <SpatialLayoutPreview />
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
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: L.gutter, paddingVertical: L.gutter },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.frame, { maxWidth: L.maxContentWidth }]}>
          <View style={L.twoColumn ? styles.split : undefined}>
            {launcher}
            {secondary}
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

  launcher: { alignItems: 'center' },
  // Each column takes half the frame; the launcher's children stretch to it so
  // the chips and CTA share one left edge.
  colWide: { flex: 1, alignItems: 'stretch' },
  secondary: { marginTop: space.xl },
  secondaryWide: { marginTop: 0 },

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

  chips: { flexDirection: 'row', gap: space.sm, marginTop: space.lg, alignSelf: 'stretch' },
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
  chipLabel: { color: palette.textMuted, fontSize: 11, fontWeight: '600' },
  chipValue: { color: palette.text, fontSize: 12, fontWeight: '600' },

  cta: {
    alignSelf: 'stretch',
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
