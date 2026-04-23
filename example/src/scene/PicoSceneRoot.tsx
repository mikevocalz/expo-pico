import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EngineView, useEngine } from '@babylonjs/react-native';
import {
  ArcRotateCamera,
  type Camera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

import { getPicoRuntimeInfo } from 'expo-pico-core';

import { attachDemoModel } from './GltfModel';

/**
 * Root 3D scene for the example app, rendered via Babylon React Native.
 *
 * Why Babylon (not three/r3f): PICO Swan consumers frequently pair
 * Babylon Native with PICO OS because Babylon's OpenXR path binds to
 * the system OpenXR loader that `expo-pico-core` declares via
 * `<uses-native-library android:name="libopenxr_loader.so"/>` (Phase E).
 * Using Babylon here demonstrates the composition end-to-end on real
 * hardware.
 *
 * Layout:
 *   - `<EngineView>` fills the tab body.
 *   - A Babylon scene is constructed once on first frame via
 *     `useEngine()` — the hook returns null until the native engine
 *     has bound to the EngineView surface.
 *   - A neutral camera + ambient lighting.
 *   - `attachDemoModel` loads the bundled glTF (auto-downloaded by
 *     `scripts/download-demo-model.js` at `yarn install` time). On
 *     load failure the scene falls back to an animated torus knot —
 *     the app never ends up with an empty scene.
 *
 * HUD overlay on top of the EngineView renders live runtime info from
 * `getPicoRuntimeInfo()`. It's layered absolute-positioned so the
 * Babylon canvas keeps its full render area.
 */
export function PicoSceneRoot(): JSX.Element {
  const engine = useEngine();
  const [camera, setCamera] = useState<Camera | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const info = useMemo(() => getPicoRuntimeInfo(), []);
  const [sceneStatus, setSceneStatus] = useState<'booting' | 'glb' | 'fallback'>('booting');

  const disposeScene = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.animationGroups.forEach((g) => g.stop());
    s.dispose();
    sceneRef.current = null;
  }, []);

  useEffect(() => {
    if (!engine) return;
    disposeScene();

    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color4(0.043, 0.051, 0.102, 1); // #0b0d1a

    const cam = new ArcRotateCamera(
      'main',
      Math.PI / 2, // alpha — rotate around Y
      Math.PI / 2.4, // beta — slight tilt down
      4, // radius
      Vector3.Zero(),
      scene
    );
    cam.lowerRadiusLimit = 1.5;
    cam.upperRadiusLimit = 8;
    cam.wheelDeltaPercentage = 0.02;
    setCamera(cam);

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.7;
    hemi.groundColor = new Color3(0.08, 0.09, 0.18);

    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.5), scene);
    sun.intensity = 0.9;

    // Load the demo model asynchronously. `attachDemoModel` returns a
    // promise that resolves once the glTF has been appended + animated.
    // On failure (missing asset, loader error), it falls back to a
    // procedural torus knot and resolves with 'fallback'.
    attachDemoModel(scene).then((status) => {
      if (sceneRef.current === scene) setSceneStatus(status);
    });

    return disposeScene;
  }, [engine, disposeScene]);

  return (
    <View style={styles.wrapper}>
      {engine && camera ? (
        <EngineView style={styles.canvas} camera={camera} displayFrameRate={false} />
      ) : (
        <View style={styles.canvas}>
          <Text style={styles.loadingText}>Initializing Babylon engine…</Text>
        </View>
      )}

      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.overlayTitle}>PICO runtime</Text>

        <Row label="xrMode" value={info.xrMode} accent={info.xrMode === 'pico-swan' ? 'good' : info.xrMode === 'pico-os6' ? 'info' : undefined} />
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

        <Row
          label="renderer"
          value="babylon-native"
          accent="info"
        />
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
}): JSX.Element {
  return (
    <Text style={styles.overlayRow}>
      <Text style={styles.overlayLabel}>{label}:</Text>{' '}
      <Text style={accent ? accentStyles[accent] : undefined}>{String(value)}</Text>
    </Text>
  );
}

function Separator(): JSX.Element {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8a91c0',
    fontSize: 13,
    fontFamily: 'monospace',
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
});

const accentStyles: Record<AccentStyle, { color: string; fontWeight: '700' }> = {
  good: { color: '#76b989', fontWeight: '700' },
  warn: { color: '#ffb15a', fontWeight: '700' },
  bad: { color: '#ff6b7a', fontWeight: '700' },
  info: { color: '#6d7cff', fontWeight: '700' },
};

export default PicoSceneRoot;
