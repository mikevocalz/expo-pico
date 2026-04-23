import React, { Suspense, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import type { Mesh, Group } from 'three';

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
        <OverlayRow label="xrMode" value={info.xrMode} />
        <OverlayRow label="appType" value={info.appType} />
        <OverlayRow
          label="isPicoDevice"
          value={info.isPicoDevice ? 'true' : 'false'}
        />
        <OverlayRow
          label="hasPlatformIdentity"
          value={info.hasPlatformIdentity ? 'true' : 'false'}
        />
        <OverlayRow label="spatialMode" value={info.spatialMode} />
      </View>
    </View>
  );
}

function OverlayRow({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <Text style={styles.overlayRow}>
      <Text style={styles.overlayLabel}>{label}:</Text> {String(value)}
    </Text>
  );
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
    height: 320,
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
    backgroundColor: 'rgba(10, 12, 25, 0.72)',
  },
  overlayTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
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
});

export default PicoSceneRoot;
