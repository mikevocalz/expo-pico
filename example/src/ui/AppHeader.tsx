import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountHeader } from './AccountHeader';
import { PicoWordmark } from './PicoWordmark';
import { palette, space, type } from './theme';

/**
 * Branded header for every route.
 *
 * Lockup follows PICO's own developer material: the wordmark, a hairline
 * divider, then the product name at the same optical weight — so "XR Sample"
 * reads as a title within PICO's system rather than a competing logo. The
 * divider is what makes it a lockup instead of two adjacent labels.
 *
 * Signed-in identity sits on the trailing edge, which is where the PICO
 * developer site puts its account control.
 *
 * The row's height is set by the account avatar, so the wordmark is sized as a
 * fraction of that rather than a magic number — it stays optically aligned with
 * the avatar if either changes.
 */
const ROW_HEIGHT = 36;
const WORDMARK_SCALE = 0.96;
export function AppHeader({ title = 'XR Sample' }: { title?: string }): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.lockup}>
        <PicoWordmark height={ROW_HEIGHT * WORDMARK_SCALE} />
        <View style={styles.divider} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <AccountHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: palette.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: ROW_HEIGHT * WORDMARK_SCALE,
    backgroundColor: palette.borderBright,
  },
  title: {
    color: palette.text,
    fontSize: type.title.fontSize,
    fontWeight: type.title.fontWeight,
    letterSpacing: type.title.letterSpacing,
  },
});
