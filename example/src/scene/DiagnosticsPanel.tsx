import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  formatDiagnostics,
  getPicoDiagnostics,
  getPlatformSdkProbe,
  getPlatformSdkVersion,
  isPlatformSdkPresent,
  type DiagnosticSeverity,
  type PicoDiagnosticsReport,
  type PicoPlatformSdkProbe,
} from 'expo-pico-core';

/**
 * Live runtime diagnostics panel. Calls `getPicoDiagnostics()` on mount
 * and renders the report in a scrollable card. A "Refresh" button
 * re-reads — useful after the user grants a runtime permission or
 * toggles a device-side feature.
 *
 * Intentionally renders off the critical path of the 3D scene (sits
 * between the Canvas and the ValidationHarness in App.tsx) so the
 * scene keeps animating regardless of panel state.
 */
export function DiagnosticsPanel(): JSX.Element {
  const [report, setReport] = useState<PicoDiagnosticsReport | null>(null);
  const [probe, setProbe] = useState<PicoPlatformSdkProbe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, probeResult] = await Promise.all([
        getPicoDiagnostics(),
        getPlatformSdkProbe(),
      ]);
      setReport(next);
      setProbe(probeResult);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Runtime diagnostics</Text>
        <Pressable onPress={refresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>{loading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {loading && !report ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6d7cff" />
          <Text style={styles.loadingText}>Probing PackageManager…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : report ? (
        <DiagnosticsBody report={report} probe={probe} />
      ) : null}
    </View>
  );
}

function DiagnosticsBody({
  report,
  probe,
}: {
  report: PicoDiagnosticsReport;
  probe: PicoPlatformSdkProbe | null;
}): JSX.Element {
  const sdkVersion = getPlatformSdkVersion();
  const sdkPresent = isPlatformSdkPresent();
  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
      <Text style={styles.summary}>
        <Text style={styles.summaryKey}>errors:</Text> {report.summary.hasError ? 'yes' : 'no'}
        {'   '}
        <Text style={styles.summaryKey}>warnings:</Text> {report.summary.hasWarning ? 'yes' : 'no'}
        {'\n'}
        <Text style={styles.summaryKey}>features:</Text> {report.summary.declaredFeatureCount}
        {'   '}
        <Text style={styles.summaryKey}>permissions:</Text> {report.summary.declaredPermissionCount}
        {'   '}
        <Text style={styles.summaryKey}>missing:</Text> {report.summary.missingSystemFeatureCount}
        {'\n'}
        <Text style={styles.summaryKey}>platform sdk:</Text>{' '}
        {sdkPresent ? (sdkVersion ?? 'present') : 'absent'}
        {probe
          ? '   ' +
            Object.entries(probe)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(',')
          : ''}
      </Text>

      {report.findings.length === 0 ? (
        <Text style={styles.cleanText}>No issues detected.</Text>
      ) : (
        report.findings.map((f) => (
          <View key={f.id} style={styles.finding}>
            <View style={styles.findingRow}>
              <Text style={[styles.severity, severityStyle(f.severity)]}>
                {f.severity.toUpperCase()}
              </Text>
              <Text style={styles.findingId}>{f.id}</Text>
            </View>
            <Text style={styles.findingMessage}>{f.message}</Text>
            {f.hint ? <Text style={styles.findingHint}>{f.hint}</Text> : null}
          </View>
        ))
      )}

      <Text style={styles.rawHeader}>Raw report (formatDiagnostics):</Text>
      <Text style={styles.raw}>{formatDiagnostics(report)}</Text>
    </ScrollView>
  );
}

function severityStyle(s: DiagnosticSeverity) {
  switch (s) {
    case 'error':
      return { color: '#ff6b7a' };
    case 'warning':
      return { color: '#ffb15a' };
    case 'info':
      return { color: '#6d7cff' };
    default:
      return { color: '#76b989' };
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1126',
    borderTopWidth: 1,
    borderTopColor: '#1a1c30',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1c30',
    maxHeight: 260,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#2a2d45',
    borderRadius: 6,
  },
  refreshText: {
    color: '#d0d4f0',
    fontSize: 11,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    color: '#8a91c0',
    fontSize: 11,
  },
  error: {
    color: '#ff6b7a',
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 12,
    paddingBottom: 24,
  },
  summary: {
    color: '#d0d4f0',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  summaryKey: {
    color: '#8a91c0',
  },
  cleanText: {
    color: '#76b989',
    fontSize: 12,
    marginVertical: 6,
  },
  finding: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1c30',
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severity: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    minWidth: 50,
  },
  findingId: {
    color: '#8a91c0',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  findingMessage: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 2,
  },
  findingHint: {
    color: '#8a91c0',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  rawHeader: {
    color: '#8a91c0',
    fontSize: 10,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  raw: {
    color: '#5a6090',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});

export default DiagnosticsPanel;
