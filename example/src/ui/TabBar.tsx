import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DESTINATIONS, destinationForPath } from '../layout/shell';
import { LucideGlyph } from './LucideGlyph';
import { palette, shellSize, space } from './theme';

/**
 * The phone's bottom tab bar: the same destinations the headset rail shows.
 */
export function TabBar(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const active = destinationForPath(usePathname());
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {DESTINATIONS.map((destination) => {
        const selected = destination.id === active;
        const tint = selected ? palette.accent : palette.textMuted;
        return (
          <Pressable
            key={destination.id}
            onPress={() => router.navigate(destination.href)}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={destination.title}
          >
            <LucideGlyph name={destination.icon} size={22} color={tint} />
            <Text style={[styles.label, { color: selected ? palette.text : palette.textMuted }]}>
              {destination.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: palette.bgRaised,
    borderTopColor: palette.border,
    borderTopWidth: 1,
  },
  item: {
    flex: 1,
    height: shellSize.tabBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  itemPressed: { opacity: 0.7 },
  label: { fontSize: 12, fontWeight: '600' },
});
