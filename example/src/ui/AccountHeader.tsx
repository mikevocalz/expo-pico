import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getUserProfile,
  isAccountAvailable,
  login,
  type PicoUserProfile,
} from '@expo-pico/account';

import { palette, radius, space } from './theme';

type State =
  | { kind: 'unavailable' }
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; profile: PicoUserProfile };

/**
 * Signed-in PICO identity for the app header.
 *
 * `getUserProfile()` reads the *current* session and rejects when nobody is
 * signed in — it is not a way to test for one, so a rejection is treated as
 * signed-out rather than an error. `login()` is only called on an explicit
 * tap, because it can present the account picker and that should never happen
 * unprompted at launch.
 *
 * Off PICO hardware (or on the `mobile` flavor) the account SDK is absent and
 * this renders nothing rather than a broken affordance.
 */
export function AccountHeader(): React.JSX.Element | null {
  const [state, setState] = useState<State>(() =>
    isAccountAvailable() ? { kind: 'loading' } : { kind: 'unavailable' }
  );

  const read = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      setState({ kind: 'signed-in', profile });
    } catch {
      setState({ kind: 'signed-out' });
    }
  }, []);

  useEffect(() => {
    if (!isAccountAvailable()) return;
    void read();
  }, [read]);

  const onSignIn = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      await login();
    } catch {
      // Cancelled or failed — fall through to the profile read, which is the
      // authority on whether a session actually exists now.
    }
    await read();
  }, [read]);

  if (state.kind === 'unavailable') return null;

  if (state.kind === 'loading') {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (state.kind === 'signed-out') {
    return (
      <Pressable
        onPress={onSignIn}
        accessibilityRole="button"
        accessibilityLabel="Sign in to PICO"
        style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      >
        <View style={[styles.avatar, styles.avatarEmpty]} />
        <View>
          <Text style={styles.name}>Not signed in</Text>
          <Text style={styles.sub}>Tap to connect your PICO account</Text>
        </View>
      </Pressable>
    );
  }

  const { profile } = state;
  // PPS returns avatarUrl as an optional Wire field, so an account with no
  // picture set arrives as undefined rather than an empty string.
  const avatar = profile.avatarUrl;

  return (
    <View style={styles.root} accessibilityLabel={`Signed in as ${profile.displayName}`}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarEmpty]}>
          <Text style={styles.initial}>{(profile.displayName || '?').charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View>
        <Text style={styles.name} numberOfLines={1}>
          {profile.displayName || 'PICO user'}
        </Text>
        <Text style={styles.sub}>Signed in</Text>
      </View>
    </View>
  );
}

const AVATAR = 36;

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignSelf: 'flex-start',
  },
  pressed: { borderColor: palette.accent },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: palette.bgRaised,
  },
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderBright,
  },
  initial: { color: palette.textMuted, fontSize: 15, fontWeight: '600' },
  name: { color: palette.text, fontSize: 14, fontWeight: '600' },
  sub: { color: palette.textFaint, fontSize: 11 },
});
