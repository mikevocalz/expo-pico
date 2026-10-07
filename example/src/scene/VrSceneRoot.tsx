import React, { useEffect, useMemo } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { ViroVRSceneNavigator } from '@reactvision/react-viro';

import { exitImmersiveScene } from '@expo-pico/core';

import { SpatialWorkspaceScene } from './SpatialWorkspaceScene';

/**
 * Root component for `VRActivity`, registered as `"VRQuestScene"` from
 * index.js. This is the only immersive scene on PICO and on Meta Horizon
 * (Quest 3/3S, Meta VR Glasses): HomeScreen starts VRActivity through
 * `enterImmersiveScene()` on both.
 *
 * Viro auto-registers its own `ViroQuestEntryPoint` under that name on import,
 * but that component renders whatever `VRQuestNavigatorBridge.getIntent()`
 * returns — and the intent is only ever set by `ViroXRSceneNavigator` on its
 * Quest-gated path, immediately before it calls `VRLauncher.launchVRScene()`.
 * `ViroPlatform.isQuest` matches `Build.MANUFACTURER`/`BRAND` against Oculus
 * and Meta, so it is false on PICO: nothing sets an intent, and VRActivity
 * mounts with no scene and sits on a blank loading screen forever.
 *
 * Overriding the registration is the documented escape hatch — Viro's own
 * entry point says apps "can call AppRegistry.registerComponent('VRQuestScene',
 * ...) to override". Rendering the scene directly also drops the bridge
 * indirection, which only exists to ferry a scene across the panel/activity
 * split that PICO does not use.
 *
 * The scene is `SpatialWorkspaceScene`: the sample's four layout surfaces
 * (library, stage, details, controls) placed as Viro panels at the poses
 * `layout/workspace.ts` resolves. Phones keep `InteractiveCubeScene` via
 * XrScreen.
 *
 * Hardware back calls `exitImmersiveScene()` from `@expo-pico/core`, which
 * finishes this activity and returns to the 2D panel, so exit is never more
 * than one press away.
 */
export function VrSceneRoot(): React.JSX.Element {
  const initialScene = useMemo(() => ({ scene: SpatialWorkspaceScene }), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Not react-viro's exitVRScene(): it delegates to a VRLauncher native
      // module the Viro plugin never generates, and is a documented no-op
      // without it — which is why back did nothing here.
      void exitImmersiveScene();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Meta VR Glasses ship without controllers, so hands are the default input
  // there; Quest and PICO still accept controllers alongside.
  return (
    <ViroVRSceneNavigator
      initialScene={initialScene}
      handTrackingEnabled
      style={styles.navigator}
    />
  );
}

const styles = StyleSheet.create({
  navigator: { flex: 1 },
});
