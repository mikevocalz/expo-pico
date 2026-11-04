/**
 * The navigation rail: the phone tab bar's destinations as a narrow vertical
 * panel on the main panel's left. Structure-only references (Mobbin):
 * Fireflies (https://mobbin.com/screens/440008bf-bf0c-486f-bd38-c77df867470d)
 * for an icon rail flush against the content; Front
 * (https://mobbin.com/screens/9bded131-2394-46cf-bcbd-a44ab7be10cb) for a
 * left navigation column that stays put while content changes. Ported from
 * Harlem Might's `AppTabBarHost` rail window (its ADR 0005).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { DESTINATIONS, destinationForPath, SHELL, type Destination } from '../layout/shell';
import { LucideGlyph } from './LucideGlyph';
import { palette, radius, space } from './theme';

function RailItem({
  destination,
  active,
  onPress,
}: {
  destination: Destination;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const tint = active ? palette.text : palette.textMuted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={destination.title}
    >
      <View style={[styles.indicator, active && styles.indicatorActive]}>
        <LucideGlyph name={destination.icon} size={22} color={active ? palette.accent : tint} />
      </View>
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {destination.title}
      </Text>
    </Pressable>
  );
}

/**
 * The rail's content. It fills whatever holds it: the rail window on Meta
 * Horizon OS, the main window's strip on PICO, or a column inside the main
 * panel while the window is not placed. It has no close button and no grab
 * bar: the rail never closes or moves on its own.
 */
export function NavRail(): React.JSX.Element {
  const router = useRouter();
  const active = destinationForPath(usePathname());
  return (
    <View
      style={[styles.rail, { paddingVertical: SHELL.tokens.railPaddingDp }]}
      accessibilityRole="tablist"
    >
      {DESTINATIONS.map((destination) => (
        <RailItem
          key={destination.id}
          destination={destination}
          active={destination.id === active}
          onPress={() => router.navigate(destination.href)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: palette.bgRaised,
    borderRadius: SHELL.tokens.cornerRadiusDp,
    borderCurve: 'continuous',
  },
  item: {
    height: SHELL.tokens.railItemDp,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  itemPressed: { opacity: 0.7 },
  indicator: {
    width: 56,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: { backgroundColor: palette.borderBright },
  label: { fontSize: 12, fontWeight: '600' },
});
