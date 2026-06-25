import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  formatDiagnostics,
  getPicoDiagnostics,
  getPicoRuntimeInfo,
  getPlatformSdkProbe,
  isPlatformSdkPresent,
  type PicoDiagnosticsReport,
  type PicoPlatformSdkProbe,
  type PicoRuntimeInfo,
} from '@expo-pico/core';

/**
 * Starter app shell for a PICO OS 6 / Project Swan project.
 *
 * What you see on a PICO device:
 *   - "PICO runtime" card with xrMode, appType, target profile, device
 *     model, OS version, platform identity + Platform SDK presence
 *     (reflection probe).
 *   - "Diagnostics" card with the result of `getPicoDiagnostics()`.
 *   - "Platform SDK probe" card with per-surface live/seam status for
 *     every `expo-pico-*` sibling package.
 *
 * What you see on a non-PICO device or emulator:
 *   - Same layout; diagnostics will surface `build-device-mismatch` or
 *     `mobile-on-pico-device` warnings where applicable. This is
 *     intentional — the app doesn't crash, and you can develop UI on
 *     a phone before moving to headset hardware.
 *
 * Replace this file with your real app once you've confirmed the PICO
 * plumbing is live. Keep the `DiagnosticsCard` if you want it as an
 * in-app debug overlay.
 */
export default function App(): JSX.Element {
  const runtime = useMemo(() => getPicoRuntimeInfo(), []);
  const [diagnostics, setDiagnostics] = useState<PicoDiagnosticsReport | null>(null);
  const [probe, setProbe] = useState<PicoPlatformSdkProbe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, p] = await Promise.all([getPicoDiagnostics(), getPlatformSdkProbe()]);
      setDiagnostics(d);
      setProbe(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>expo-pico starter</Text>
        <Text style={styles.subtitle}>
          Everything in this screen is a signal that the plugin is wired. Delete `App.tsx` and replace with your real app once you've confirmed the numbers below look right.
        </Text>

        <RuntimeCard info={runtime} />
        <DiagnosticsCard
          report={diagnostics}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />
        <PlatformSdkCard probe={probe} present={isPlatformSdkPresent()} />
      </ScrollView>
    </View>
  );
}

function RuntimeCard({ info }: { info: PicoRuntimeInfo }): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>PICO runtime</Text>
      <Row label="xrMode" value={info.xrMode} accent={info.xrMode === 'mobile' ? 'info' : 'good'} />
      <Row label="appType" value={info.appType} />
      <Row label="spatialMode" value={info.spatialMode} />
      <Row label="targetProfile" value={info.targetProfile} />

      <View style={styles.divider} />

      <Row
        label="device"
        value={info.isPicoDevice ? 'pico' : 'non-pico'}
        accent={info.isPicoDevice ? 'good' : 'info'}
      />
      <Row
        label="build"
        value={info.isPicoBuild ? 'pico flavor' : 'mobile flavor'}
        accent={info.isPicoBuild ? 'good' : 'info'}
      />
      {info.deviceModel ? <Row label="model" value={info.deviceModel} /> : null}
      {info.picoOsVersion ? <Row label="os" value={info.picoOsVersion} /> : null}

      <View style={styles.divider} />

      <Row
        label="identity"
        value={info.hasPlatformIdentity ? 'wired' : 'missing'}
        accent={info.hasPlatformIdentity ? 'good' : 'warn'}
      />
      <Row
        label="platformSdk"
        value={
          info.platformSdkPresent
            ? info.platformSdkVersion ?? 'present'
            : 'seam (AAR not on classpath)'
        }
        accent={info.platformSdkPresent ? 'good' : 'info'}
      />
    </View>
  );
}

function DiagnosticsCard({
  report,
  loading,
  error,
  onRefresh,
}: {
  report: PicoDiagnosticsReport | null;
  loading: boolean;
  error: string | null;
  onRefresh(): void;
}): JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Diagnostics</Text>
        <Pressable onPress={onRefresh} style={styles.refresh}>
          <Text style={styles.refreshText}>{loading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>
      {loading && !report ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6d7cff" />
          <Text style={styles.muted}>Probing PackageManager…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : report ? (
        <View>
          <Row
            label="summary"
            value={
              report.summary.hasError
                ? `${report.findings.length} findings incl. errors`
                : report.summary.hasWarning
                  ? `${report.findings.length} findings, warnings only`
                  : report.findings.length > 0
                    ? `${report.findings.length} info-only`
                    : 'all clean'
            }
            accent={
              report.summary.hasError
                ? 'bad'
                : report.summary.hasWarning
                  ? 'warn'
                  : 'good'
            }
          />
          <Text style={styles.mono}>{formatDiagnostics(report)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PlatformSdkCard({
  probe,
  present,
}: {
  probe: PicoPlatformSdkProbe | null;
  present: boolean;
}): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Platform SDK probe</Text>
      <Row
        label="core"
        value={present ? 'live' : 'seam'}
        accent={present ? 'good' : 'info'}
      />
      {probe ? (
        (Object.keys(probe) as Array<keyof PicoPlatformSdkProbe>).map((k) => (
          <Row
            key={k}
            label={k}
            value={probe[k] ? 'live' : 'seam'}
            accent={probe[k] ? 'good' : 'info'}
          />
        ))
      ) : (
        <Text style={styles.muted}>(probe unavailable)</Text>
      )}
    </View>
  );
}

type AccentStyle = 'good' | 'warn' | 'bad' | 'info';

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: AccentStyle;
}): JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent ? accents[accent] : undefined]}>
        {String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0d1a' },
  body: { padding: 20, paddingBottom: 60 },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 6,
  },
  subtitle: {
    color: '#8a91c0',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#0f1126',
    borderWidth: 1,
    borderColor: '#1a1c30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  refresh: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#6d7cff',
    borderRadius: 6,
  },
  refreshText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#1a1c30', marginVertical: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  rowLabel: { color: '#8a91c0', fontSize: 12, fontFamily: 'monospace' },
  rowValue: { color: '#d0d4f0', fontSize: 12, fontFamily: 'monospace' },
  mono: {
    color: '#8a91c0',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 8,
    lineHeight: 16,
  },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 },
  muted: { color: '#8a91c0', fontSize: 11 },
  error: { color: '#ff6b7a', fontSize: 12, fontFamily: 'monospace' },
});

const accents: Record<AccentStyle, { color: string; fontWeight: '700' }> = {
  good: { color: '#76b989', fontWeight: '700' },
  warn: { color: '#ffb15a', fontWeight: '700' },
  bad: { color: '#ff6b7a', fontWeight: '700' },
  info: { color: '#6d7cff', fontWeight: '700' },
};
