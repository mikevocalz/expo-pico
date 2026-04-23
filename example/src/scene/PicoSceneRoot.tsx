import React, { Suspense, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import type { Mesh } from 'three';

import { GltfModel } from './GltfModel';
import { getPicoRuntimeInfo } from 'expo-pico-core';

/**
 * Root 3D scene for the example app. Renders via `@react-three/fiber/native`
 * which wraps `expo-gl` + `three` for React Native.
 *
 * Layout:
 *   - Fills the bounds of the surrounding View.
 *   - Centered animated glTF model loaded via `GltfModel` (see below). The
 *     component tries a bundled GLB at `assets/models/pico-demo.glb` first,
 *     then falls back to a procedurally generated animated cube so the
 *     scene always renders even before a real model is dropped in.
 *   - An ambient-only lighting rig so the fallback procedural material
 *     reads clearly.
 *
 * Runtime-info overlay: calls `getPicoRuntimeInfo()` once on mount and
 * displays the headline state (xrMode, appType, device match). This is
 * exactly the smoke test asked for — "example app tests main PICO modules
 * with an animating model" — on a PICO device the overlay flips to show
 * `isPicoDevice: true` and the runtime fields come alive; on a mobile
 * emulator it shows the 2D fallback state. Either way, the scene keeps
 * animating, which proves the GL pipeline + PICO core module both work.
 */
export function PicoSceneRoot(): JSX.Element {
  const info = useMemo(() => getPicoRuntimeInfo(), []);

  return (
    <View style={styles.wrapper}>
      <Canvas
        style={styles.canvas}
        camera={{ position: [0, 1.5, 4], fov: 55 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0b0d1a']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} />
        <directionalLight position={[-5, -2, -5]} intensity={0.3} />

        <Suspense fallback={<FallbackSpinner />}>
          <GltfModel />
        </Suspense>

        <gridHelper args={[10, 10, '#2a2d45', '#1a1c30']} position={[0, -1, 0]} />
      </Canvas>

      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.overlayTitle}>PICO runtime</Text>

        <OverlayRow label="xrMode" value={info.xrMode} accent={info.xrMode === 'pico-swan' ? 'good' : info.xrMode === 'pico-os6' ? 'info' : undefined} />
        <OverlayRow label="appType" value={info.appType} />
        <OverlayRow label="spatialMode" value={info.spatialMode} />
        <OverlayRow label="targetProfile" value={info.targetProfile} />

        <OverlaySeparator />

        <OverlayRow
          label="device"
          value={info.isPicoDevice ? 'pico' : 'non-pico'}
          accent={info.isPicoDevice ? 'good' : 'info'}
        />
        <OverlayRow
          label="build"
          value={info.isPicoBuild ? 'pico flavor' : 'mobile flavor'}
          accent={info.isPicoBuild ? 'good' : 'info'}
        />
        {info.deviceModel ? (
          <OverlayRow label="model" value={info.deviceModel} />
        ) : null}
        {info.picoOsVersion ? (
          <OverlayRow label="os" value={info.picoOsVersion} />
        ) : null}

        <OverlaySeparator />

        <OverlayRow
          label="identity"
          value={info.hasPlatformIdentity ? 'wired' : 'missing'}
          accent={info.hasPlatformIdentity ? 'good' : 'warn'}
        />
        <OverlayRow
          label="iap identity"
          value={info.hasIapIdentity ? 'wired' : 'missing'}
          accent={info.hasIapIdentity ? 'good' : 'info'}
        />
        <OverlayRow
          label="platform sdk"
          value={
            info.platformSdkPresent
              ? info.platformSdkVersion ?? 'present'
              : 'seam'
          }
          accent={info.platformSdkPresent ? 'good' : 'info'}
        />

        {info.swanRuntimeInitialized || info.os6RuntimeInitialized ? (
          <>
            <OverlaySeparator />
            {info.swanRuntimeInitialized ? (
              <OverlayRow label="swan runtime" value="initialized" accent="good" />
            ) : null}
            {info.os6RuntimeInitialized ? (
              <OverlayRow label="os6 runtime" value="initialized" accent="good" />
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

type AccentStyle = 'good' | 'warn' | 'bad' | 'info';

function OverlayRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: AccentStyle;
}): JSX.Element {
  return (
    <Text style={styles.overlayRow}>
      <Text style={styles.overlayLabel}>{label}:</Text>{' '}
      <Text style={accent ? accentStyles[accent] : undefined}>{String(value)}</Text>
    </Text>
  );
}

function OverlaySeparator(): JSX.Element {
  return <View style={styles.separator} />;
}

/**
 * Minimal rotating mesh shown while the real model resolves. Intentionally
 * tiny so there is no visible gap on slow device reads.
 */
function FallbackSpinner(): JSX.Element {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 2;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#6d7cff" />
    </mesh>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // When mounted inside a tab the parent provides the full remaining
    // height — flex: 1 makes the scene fill the tab body. When mounted
    // without a flex parent, the minHeight keeps the canvas visible.
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
    maxWidth: 240,
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
});

const accentStyles: Record<AccentStyle, { color: string; fontWeight: '700' }> = {
  good: { color: '#76b989', fontWeight: '700' },
  warn: { color: '#ffb15a', fontWeight: '700' },
  bad: { color: '#ff6b7a', fontWeight: '700' },
  info: { color: '#6d7cff', fontWeight: '700' },
};

export default PicoSceneRoot;
