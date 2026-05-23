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
  Scene,
  Vector3,
} from '@babylonjs/core';

// Side-effect import: registers Babylon's WebXR default experience +
// its OpenXR runtime binding on the active scene. Without this the
// SessionManager can't negotiate an immersive session on PICO hardware.
import '@babylonjs/core/XR/webXRDefaultExperience';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { attachDemoModel } from './GltfModel';

type XrSessionStatus = 'idle' | 'requesting' | 'active' | 'unsupported' | 'failed';

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
  const [xrStatus, setXrStatus] = useState<XrSessionStatus>('idle');
  const [xrDetail, setXrDetail] = useState<string | null>(null);

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

    // Phase E + example compose path: attempt to negotiate an OpenXR
    // session via Babylon's default XR experience. This exercises the
    // path `expo-pico-core`'s `<uses-native-library libopenxr_loader.so/>`
    // declaration ultimately feeds — System.loadLibrary("openxr_loader")
    // runs inside Babylon's native xr binding the first time
    // createDefaultXRExperienceAsync is called.
    //
    // The call is gated to pico devices because Babylon's WebXR path
    // fails reliably on non-XR devices and clutters logs. On a real
    // PICO 4 / 4 Ultra / Swan with OpenXR support, status transitions
    // through 'requesting' → 'active' within ~1 s. On a non-PICO
    // device it stays at 'unsupported' and the rest of the scene is
    // unaffected.
    if (info.isPicoDevice) {
      setXrStatus('requesting');
      scene
        .createDefaultXRExperienceAsync({ disableDefaultUI: true })
        .then((xr) => {
          if (sceneRef.current !== scene) {
            xr.dispose();
            return;
          }
          if (!xr.baseExperience) {
            setXrStatus('unsupported');
            setXrDetail('Babylon reported no XR base experience');
            return;
          }
          setXrStatus('active');
          setXrDetail(null);
          xr.baseExperience.onStateChangedObservable.add((state) => {
            if (sceneRef.current !== scene) return;
            // State enum is numeric (0 ENTERING_XR, 1 EXITING_XR,
            // 2 IN_XR, 3 NOT_IN_XR). Map the important ones.
            if (state === 2) setXrStatus('active');
            else if (state === 3) setXrStatus('idle');
          });
        })
        .catch((err) => {
          if (sceneRef.current !== scene) return;
          setXrStatus('failed');
          setXrDetail(err instanceof Error ? err.message : String(err));
        });
    } else {
      setXrStatus('unsupported');
      setXrDetail('non-PICO device — skipping XR session init');
    }

    return disposeScene;
  }, [engine, disposeScene, info.isPicoDevice]);

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

export default PicoSceneRoot;
