import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { useShellStore } from '../layout/detailPanel.store';
import { PicoMainFrame } from '../layout/PicoMainFrame';
import { DESTINATIONS, SHELL } from '../layout/shell';
import { useHostedSpatialWindow } from '../layout/useHostedSpatialWindow';
import { isHeadsetBuild } from '../platform';
import { NavRail } from './NavRail';
import { TabBar } from './TabBar';
import { palette, space } from './theme';

const ON_HEADSET = isHeadsetBuild(getPicoRuntimeInfo());

/**
 * The app's frame around the current route (docs/adr/0001).
 *
 * Headsets: the rail sits outside the main panel's left edge, in its own Meta
 * Layout SDK window on Horizon OS or in the main window's strip on PICO, and
 * the route fills the main panel. While the rail window is pending or was
 * refused, the rail draws as a column inside the main panel instead.
 *
 * Phones: the route above the bottom tab bar.
 */
export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  if (!ON_HEADSET) {
    return (
      <View style={styles.fill}>
        <View style={styles.fill}>{children}</View>
        <TabBar />
      </View>
    );
  }
  return <HeadsetShell>{children}</HeadsetShell>;
}

const RAIL_WINDOW = SHELL.railWindow(DESTINATIONS.length);

function HeadsetShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const placement = useHostedSpatialWindow(RAIL_WINDOW, <NavRail />);
  const setRailPlacement = useShellStore((state) => state.setRailPlacement);
  useEffect(() => setRailPlacement(placement), [placement, setRailPlacement]);

  return (
    <PicoMainFrame>
      <View style={styles.row}>
        {placement === 'spatial' ? null : (
          <View style={styles.inlineRail}>
            <View style={{ width: RAIL_WINDOW.windowWidth, height: RAIL_WINDOW.windowHeight }}>
              <NavRail />
            </View>
          </View>
        )}
        <View style={styles.fill}>{children}</View>
      </View>
    </PicoMainFrame>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', backgroundColor: palette.bg },
  inlineRail: { justifyContent: 'center', paddingLeft: space.md },
});
