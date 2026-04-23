import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
 * Live runtime diagnostics panel.
 *
 * Phase M polish over the Phase F baseline:
 *   - Per-sibling SDK probe table (Phase J) rendered inline.
 *   - Share / copy button on the raw formatDiagnostics output so users
 *     can paste a full diagnostic report into a bug report.
 *   - Filter chips — hide info-severity findings when the user only
 *     cares about errors + warnings.
 *
 * Calls `getPicoDiagnostics()` and `getPlatformSdkProbe()` on mount and
 * renders the combined report. The Refresh button re-reads — useful
 * after the user grants a runtime permission or toggles a device-side
 * feature.
 */
export function DiagnosticsPanel(): JSX.Element {
  const [report, setReport] = useState<PicoDiagnosticsReport | null>(null);
  const [probe, setProbe] = useState<PicoPlatformSdkProbe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hideInfo, setHideInfo] = useState<boolean>(false);

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

  const share = useCallback(async () => {
    if (!report) return;
    const body = [
      formatDiagnostics(report),
      '',
      'Platform SDK probe:',
      probe
        ? Object.entries(probe)
            .map(([k, v]) => `  ${v ? '✓' : '✗'} ${k}`)
            .join('\n')
        : '  (unavailable)',
    ].join('\n');
    try {
      await Share.share({ message: body, title: 'PICO diagnostics' });
    } catch {
      // Share cancelled / unavailable — non-fatal.
    }
  }, [report, probe]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Runtime diagnostics</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setHideInfo((prev) => !prev)}
            style={[styles.chip, hideInfo && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={hideInfo ? 'Show info findings' : 'Hide info findings'}
          >
            <Text style={[styles.chipText, hideInfo && styles.chipTextActive]}>
              {hideInfo ? 'Info hidden' : 'Hide info'}
            </Text>
          </Pressable>
          <Pressable onPress={share} style={styles.secondaryBtn} disabled={!report}>
            <Text style={styles.secondaryBtnText}>Share</Text>
          </Pressable>
          <Pressable onPress={refresh} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>{loading ? '…' : 'Refresh'}</Text>
          </Pressable>
        </View>
      </View>

      {loading && !report ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6d7cff" />
          <Text style={styles.loadingText}>Probing PackageManager…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : report ? (
        <DiagnosticsBody report={report} probe={probe} hideInfo={hideInfo} />
      ) : null}
    </View>
  );
}

function DiagnosticsBody({
  report,
  probe,
  hideInfo,
}: {
  report: PicoDiagnosticsReport;
  probe: PicoPlatformSdkProbe | null;
  hideInfo: boolean;
}): JSX.Element {
  const sdkVersion = getPlatformSdkVersion();
  const sdkPresent = isPlatformSdkPresent();
  const findings = hideInfo
    ? report.findings.filter((f) => f.severity !== 'info')
    : report.findings;

  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
      <Text style={styles.sectionHeader}>SUMMARY</Text>
      <Text style={styles.summary}>
        <Text style={styles.summaryKey}>errors:</Text>{' '}
        {report.summary.hasError ? <Text style={styles.bad}>yes</Text> : 'no'}
        {'   '}
        <Text style={styles.summaryKey}>warnings:</Text>{' '}
        {report.summary.hasWarning ? <Text style={styles.warn}>yes</Text> : 'no'}
        {'\n'}
        <Text style={styles.summaryKey}>features:</Text> {report.summary.declaredFeatureCount}
        {'   '}
        <Text style={styles.summaryKey}>permissions:</Text> {report.summary.declaredPermissionCount}
        {'   '}
        <Text style={styles.summaryKey}>missing:</Text>{' '}
        {report.summary.missingSystemFeatureCount > 0 ? (
          <Text style={styles.bad}>{report.summary.missingSystemFeatureCount}</Text>
        ) : (
          report.summary.missingSystemFeatureCount
        )}
      </Text>

      <Text style={styles.sectionHeader}>PLATFORM SDK</Text>
      <Text style={styles.summary}>
        <Text style={styles.summaryKey}>present:</Text>{' '}
        {sdkPresent ? <Text style={styles.good}>yes</Text> : <Text style={styles.info}>no</Text>}
        {'   '}
        <Text style={styles.summaryKey}>version:</Text>{' '}
        {sdkVersion ?? <Text style={styles.info}>—</Text>}
      </Text>
      {probe ? (
        <View style={styles.probeTable}>
          {(Object.keys(probe) as Array<keyof PicoPlatformSdkProbe>).map((k) => (
            <View key={k} style={styles.probeRow}>
              <Text
                style={[styles.probeDot, probe[k] ? styles.probeDotLive : styles.probeDotStub]}
              >
                ●
              </Text>
              <Text style={styles.probeKey}>{k}</Text>
              <Text style={styles.probeValue}>
                {probe[k] ? (
                  <Text style={styles.good}>live</Text>
                ) : (
                  <Text style={styles.info}>seam</Text>
                )}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>
        FINDINGS ({findings.length}
        {hideInfo && report.findings.length !== findings.length
          ? ` of ${report.findings.length}, info hidden`
          : ''}
        )
      </Text>
      {findings.length === 0 ? (
        <Text style={styles.cleanText}>
          {report.findings.length === 0
            ? 'No issues detected.'
            : 'No non-info findings.'}
        </Text>
      ) : (
        findings.map((f) => (
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

      <Text style={styles.sectionHeader}>RAW (formatDiagnostics)</Text>
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
    flex: 1,
    backgroundColor: '#0f1126',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1c30',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2d45',
  },
  chipActive: {
    backgroundColor: '#2a2d45',
    borderColor: '#6d7cff',
  },
  chipText: {
    color: '#8a91c0',
    fontSize: 11,
  },
  chipTextActive: {
    color: '#d0d4f0',
  },
  secondaryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2d45',
  },
  secondaryBtnText: {
    color: '#8a91c0',
    fontSize: 11,
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#6d7cff',
    borderRadius: 6,
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
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
  sectionHeader: {
    color: '#8a91c0',
    fontSize: 10,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  summary: {
    color: '#d0d4f0',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  summaryKey: {
    color: '#8a91c0',
  },
  cleanText: {
    color: '#76b989',
    fontSize: 12,
    marginVertical: 6,
  },
  probeTable: {
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  probeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 8,
  },
  probeDot: {
    fontSize: 10,
  },
  probeDotLive: {
    color: '#76b989',
  },
  probeDotStub: {
    color: '#3a3d55',
  },
  probeKey: {
    color: '#d0d4f0',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  probeValue: {
    fontSize: 11,
    fontFamily: 'monospace',
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
  raw: {
    color: '#5a6090',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  bad: {
    color: '#ff6b7a',
    fontWeight: '700',
  },
  warn: {
    color: '#ffb15a',
    fontWeight: '700',
  },
  good: {
    color: '#76b989',
    fontWeight: '700',
  },
  info: {
    color: '#8a91c0',
  },
});

export default DiagnosticsPanel;
