import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ViroXRSceneNavigator } from '@reactvision/react-viro';

import { InteractiveCubeScene } from './InteractiveCubeScene';

/**
 * Entry into the immersive activity on a headset.
 *
 * Mounting `ViroXRSceneNavigator` is the whole mechanism. On PICO and Quest it
 * renders nothing — VRActivity owns the display, and keeping the 2D tree out of
 * it is why — but its mount effect calls `VRQuestNavigatorBridge.setIntent()`
 * and then `VRLauncher.launchVRScene()`. VRActivity then mounts Viro's own
 * `ViroQuestEntryPoint`, registered as `VRQuestScene`, which reads that intent.
 *
 * The intent is the part that matters. It carries the renderer flags and the
 * `onExitViro` callback, and publishing the view tag is what gives
 * `VRModuleOpenXR.getCapabilities()` something to resolve against. Starting
 * VRActivity by any other route skips all of it: the activity comes up with no
 * intent to read and sits on a blank loading screen.
 *
 * On a phone the navigator renders the scene inline instead, so this same
 * component is the mobile path too.
 */
export function XrLauncher({ onExit }: { onExit: () => void }): React.JSX.Element {
  const initialScene = useMemo(() => ({ scene: InteractiveCubeScene }), []);

  return (
    <View style={styles.host}>
      <Text style={styles.status}>Opening in your headset…</Text>
      <ViroXRSceneNavigator
        vrInitialScene={initialScene}
        initialScene={initialScene}
        onExitViro={onExit}
        style={styles.navigator}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, backgroundColor: '#000000' },
  // Sits behind the navigator: on a headset the navigator draws nothing, so
  // this is the only thing in the panel window while VRActivity starts.
  status: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  navigator: { flex: 1 },
});
