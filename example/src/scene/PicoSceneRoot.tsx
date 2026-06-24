import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ViroARSceneNavigator,
  ViroScene,
  ViroSceneNavigator,
  ViroVRSceneNavigator,
  ViroBox,
} from '@reactvision/react-viro';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { GltfModel, type DemoModelStatus } from './GltfModel';

type XrSessionStatus = 'idle' | 'requesting' | 'active' | 'unsupported' | 'failed';

/**
 * Root 3D scene for the example app, rendered via ReactVision/Viro on top of
 * the system OpenXR loader that `expo-pico-core` declares
 * (`<uses-native-library android:name="libopenxr_loader.so"/>`, Phase E).
 *
 * Layout:
 *   - `<ViroVRSceneNavigator>` fills the tab body and owns the immersive XR
 *     session on PICO / Meta Quest. On non-XR (mobile dev) it falls back to a
 *     flat `<ViroSceneNavigator>` window so the same code renders on a phone.
 *   - The bundled glTF loads through `<GltfModel>`; on load failure the scene
 *     falls back to a procedural primitive — the app never ends up empty.
 *
 * HUD overlay surfaces live runtime info from `getPicoRuntimeInfo()`, layered
 * absolute-positioned so the Viro scene keeps its full render area.
 */

// ponytail: viroAppProps reaches the scene through a global ref. Viro's
// `initialScene.scene` is typed as `() => React.JSX.Element` (no args), so we
// can't pull props off `sceneNavigator` in the function signature TS-cleanly.
// The ref pattern is the supported escape hatch — the parent updates it on every
// render and the scene reads the latest value at render time.
let viroAppPropsRef: {
  onStatusChange?: (s: DemoModelStatus) => void;
  status: DemoModelStatus;
} = { status: 'booting' };

function InitialScene(): React.JSX.Element {
  return (
    <ViroScene>
      <GltfModel onStatusChange={viroAppPropsRef.onStatusChange} />
      {viroAppPropsRef.status === 'fallback' ? (
        <ViroBox position={[0, 0, -1.5]} scale={[0.4, 0.4, 0.4]} />
      ) : null}
    </ViroScene>
  );
}

export function PicoSceneRoot(): React.JSX.Element {
  const info = useMemo(() => getPicoRuntimeInfo(), []);
  const [sceneStatus, setSceneStatus] = useState<DemoModelStatus>('booting');
  // ponytail: Viro reports immersive session state through the navigator's
  // own lifecycle. Marking `active` once the first model load fires is the
  // right "renderer is live" moment for this surface; Phase J will swap to
  // the Meta OpenXR runtime status feed.
  const xrStatusRaw: XrSessionStatus = !info.isPicoDevice
    ? 'unsupported'
    : sceneStatus === 'booting'
      ? 'requesting'
      : 'active';
  // Widen for the value-row switch below; control-flow narrowing on a literal
  // ternary would otherwise exclude `'idle'` / `'failed'` from the union.
  const xrStatus = xrStatusRaw as XrSessionStatus;
  const xrDetail = info.isPicoDevice ? null : 'non-XR device — flat preview';

  const handleStatusChange = useCallback((s: DemoModelStatus) => {
    setSceneStatus(s);
  }, []);

  // Keep the global scene-prop ref in sync with the latest values.
  viroAppPropsRef = { onStatusChange: handleStatusChange, status: sceneStatus };

  return (
    <View style={styles.wrapper}>
      {info.isPicoDevice ? (
        <ViroVRSceneNavigator
          initialScene={{ scene: InitialScene }}
          style={styles.canvas}
        />
      ) : (
        <ViroSceneNavigator
          // ponytail: Viro3DSceneNavigator's TS type declares scene as the
          // ViroScene class, but the runtime accepts a function component.
          // The VR navigator is typed correctly (() => JSX.Element), so this
          // cast is only needed for the flat-preview path.
          initialScene={{ scene: InitialScene as never }}
          style={styles.canvas}
        />
      )}

      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.overlayTitle}>PICO runtime</Text>

        <Row
          label="xrMode"
          value={
            info.xrMode === 'pico-os6'
              ? 'pico-os5 (Ultra/4)'
              : info.xrMode === 'pico-swan'
                ? 'pico-os6 (Swan)'
                : info.xrMode
          }
          accent={info.xrMode === 'pico-swan' ? 'good' : info.xrMode === 'pico-os6' ? 'info' : undefined}
        />
        <Row label="appType" value={info.appType} />
        <Row label="spatialMode" value={info.spatialMode} />
        <Row label="targetProfile" value={info.targetProfile} />

        <Separator />

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

        <Separator />

        <Row
          label="identity"
          value={info.hasPlatformIdentity ? 'wired' : 'missing'}
          accent={info.hasPlatformIdentity ? 'good' : 'warn'}
        />
        <Row
          label="platform sdk"
          value={
            info.platformSdkPresent
              ? info.platformSdkVersion ?? 'present'
              : 'seam'
          }
          accent={info.platformSdkPresent ? 'good' : 'info'}
        />

        <Separator />

        <Row label="renderer" value="reactvision/viro" accent="info" />
        <Row
          label="scene"
          value={
            sceneStatus === 'booting'
              ? 'loading…'
              : sceneStatus === 'glb'
                ? 'gltf loaded'
                : 'fallback primitive'
          }
          accent={sceneStatus === 'glb' ? 'good' : sceneStatus === 'fallback' ? 'warn' : 'info'}
        />
        <Row
          label="xr session"
          value={
            xrStatus === 'idle'
              ? 'idle'
              : xrStatus === 'requesting'
                ? 'requesting…'
                : xrStatus === 'active'
                  ? 'active'
                  : xrStatus === 'unsupported'
                    ? 'unsupported'
                    : 'failed'
          }
          accent={
            xrStatus === 'active'
              ? 'good'
              : xrStatus === 'failed'
                ? 'bad'
                : xrStatus === 'requesting'
                  ? 'info'
                  : undefined
          }
        />
        {xrDetail ? (
          <Text style={[styles.overlayRow, styles.xrDetail]} numberOfLines={2}>
            {xrDetail}
          </Text>
        ) : null}

        {info.swanRuntimeInitialized || info.os6RuntimeInitialized ? (
          <>
            <Separator />
            {info.swanRuntimeInitialized ? (
              <Row label="swan runtime" value="initialized" accent="good" />
            ) : null}
            {info.os6RuntimeInitialized ? (
              <Row label="os6 runtime" value="initialized" accent="good" />
            ) : null}
          </>
        ) : null}
      </View>
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
}): React.JSX.Element {
  return (
    <Text style={styles.overlayRow}>
      <Text style={styles.overlayLabel}>{label}:</Text>{' '}
      <Text style={accent ? accentStyles[accent] : undefined}>{String(value)}</Text>
    </Text>
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 320,
    backgroundColor: '#0b0d1a',
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 12, 25, 0.78)',
    maxWidth: 260,
  },
  overlayTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  overlayRow: {
    color: '#d0d4f0',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'monospace',
  },
  overlayLabel: {
    color: '#8a91c0',
  },
  separator: {
    height: 1,
    backgroundColor: '#2a2d45',
    marginVertical: 5,
  },
  xrDetail: {
    color: '#8a91c0',
    fontStyle: 'italic',
    fontSize: 10,
    marginTop: 2,
    maxWidth: 240,
  },
});

const accentStyles: Record<AccentStyle, { color: string; fontWeight: '700' }> = {
  good: { color: '#76b989', fontWeight: '700' },
  warn: { color: '#ffb15a', fontWeight: '700' },
  bad: { color: '#ff6b7a', fontWeight: '700' },
  info: { color: '#6d7cff', fontWeight: '700' },
};

// ponytail: keep the AR navigator import live so a future passthrough toggle can
// branch on `getPicoRuntimeInfo().spatialMode` without re-introducing the import.
void ViroARSceneNavigator;

export default PicoSceneRoot;
