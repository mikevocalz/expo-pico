import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';

import { PicoSceneRoot } from './src/scene/PicoSceneRoot';
import { ValidationHarness } from './src/validation/ValidationHarness';

export default function App(): JSX.Element {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d1a" />
      <View style={styles.sceneContainer}>
        <PicoSceneRoot />
      </View>
      <View style={styles.harnessContainer}>
        <ValidationHarness />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0d1a',
  },
  sceneContainer: {
    // The scene is a fixed-height panel at the top of the screen so the
    // immersive preview stays pinned while the consumer scrolls the
    // validation harness below it. On a PICO headset in windowed /
    // shared-space mode this lays out as a floating panel; the GL
    // canvas itself drives the 3D content.
  },
  harnessContainer: {
    flex: 1,
  },
});
