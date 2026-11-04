import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { useShellStore } from '../layout/detailPanel.store';
import { navigationPlacement, type NavigationPlacement } from '../layout/navigation';
import { PicoMainFrame } from '../layout/PicoMainFrame';
import { DESTINATIONS, SHELL } from '../layout/shell';
import { useHostedSpatialWindow } from '../layout/useHostedSpatialWindow';
import { isSpatial } from '../platform';
import { NavRail } from './NavRail';
import { TabBar } from './TabBar';
import { palette, space } from './theme';

/** Headset hardware or a headset build, read once: neither changes while the app runs. */
const SPATIAL = isSpatial(getPicoRuntimeInfo());

/**
 * The app's frame around the current route (docs/adr/0001,
 * `navigationPlacement`).
 *
 * Headsets: the rail on the main panel's left, in its own window (a Meta
 * Layout SDK window on Horizon OS, the main window's strip on PICO). While
 * that window is pending or refused, or the build cannot open one, the rail
 * draws as a column on the left inside the main panel. Never the tab bar.
 *
 * Tablets and unfolded foldables: the rail on the left inside the window.
 * Phones: the route above the bottom tab bar.
 */
export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  if (SPATIAL) return <HeadsetShell>{children}</HeadsetShell>;
  return <AdaptiveShell>{children}</AdaptiveShell>;
}

const RAIL_WINDOW = SHELL.railWindow(DESTINATIONS.length);

function HeadsetShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const railWindow = useHostedSpatialWindow(RAIL_WINDOW, <NavRail />);
  const setRailPlacement = useShellStore((state) => state.setRailPlacement);
  useEffect(() => setRailPlacement(railWindow), [railWindow, setRailPlacement]);
  const placement = navigationPlacement({ spatial: true, railWindow, widthDp: 0 });

  return (
    <PicoMainFrame>
      <RailFrame placement={placement}>{children}</RailFrame>
    </PicoMainFrame>
  );
}

function AdaptiveShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { width } = useWindowDimensions();
  const placement = navigationPlacement({ spatial: false, railWindow: 'inline', widthDp: width });
  if (placement === 'bottom-tabs') {
    return (
      <View style={styles.fill}>
        <View style={styles.fill}>{children}</View>
        <TabBar />
      </View>
    );
  }
  return <RailFrame placement={placement}>{children}</RailFrame>;
}

function RailFrame({
  placement,
  children,
}: {
  placement: NavigationPlacement;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      {placement === 'rail-inline' ? (
        <View style={styles.inlineRail}>
          <View style={{ width: RAIL_WINDOW.windowWidth, height: RAIL_WINDOW.windowHeight }}>
            <NavRail />
          </View>
        </View>
      ) : null}
      <View style={styles.fill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', backgroundColor: palette.bg },
  inlineRail: { justifyContent: 'center', paddingLeft: space.md },
});
