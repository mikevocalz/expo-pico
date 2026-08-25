import React from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from './theme';

/**
 * Isometric cube mark for the home hero — three parallelograms assembled
 * with transforms, no image asset and no gradient dependency. It echoes the
 * object the XR scene hands the user, so the route reads as "this, but real".
 */
export function IsoCube({ size = 132 }: { size?: number }): React.JSX.Element {
  const face = size * 0.58;
  const lift = size * 0.29;

  return (
    <View style={[styles.stage, { width: size * 1.6, height: size * 1.6 }]}>
      {/* Ambient bloom behind the mark — three stacked discs, widest first. */}
      <View
        style={[
          styles.glow,
          { width: size * 1.6, height: size * 1.6, borderRadius: size, opacity: 0.1 },
        ]}
      />
      <View
        style={[
          styles.glow,
          { width: size * 1.1, height: size * 1.1, borderRadius: size, opacity: 0.14 },
        ]}
      />
      <View
        style={[
          styles.glow,
          { width: size * 0.7, height: size * 0.7, borderRadius: size, opacity: 0.18 },
        ]}
      />

      <View style={{ width: size, height: size }}>
        {/* Top face — square rotated 45° and flattened to an isometric rhombus. */}
        <View
          style={[
            styles.faceTop,
            {
              width: face,
              height: face,
              left: (size - face) / 2,
              top: lift * 0.16,
              transform: [{ rotate: '45deg' }, { scaleY: 0.5774 }],
            },
          ]}
        />
        {/* Left face — skewed up along Y. */}
        <View
          style={[
            styles.faceLeft,
            {
              width: face * 0.866,
              height: face,
              left: (size - face) / 2 - face * 0.075,
              top: lift * 0.62,
              transform: [{ skewY: '30deg' }],
            },
          ]}
        />
        {/* Right face — mirrored skew, brighter to read as the lit side. */}
        <View
          style={[
            styles.faceRight,
            {
              width: face * 0.866,
              height: face,
              left: (size - face) / 2 + face * 0.79,
              top: lift * 0.62,
              transform: [{ skewY: '-30deg' }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: palette.accent,
  },
  faceTop: {
    position: 'absolute',
    backgroundColor: '#9AE0FF',
  },
  faceLeft: {
    position: 'absolute',
    backgroundColor: '#2B6CB8',
  },
  faceRight: {
    position: 'absolute',
    backgroundColor: '#4E9BE0',
  },
});
