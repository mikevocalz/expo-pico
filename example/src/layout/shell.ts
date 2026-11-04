import { createSpatialShell } from '@expo-pico/spatial';
import type { LucideIconName } from '@expo-pico/core';

import { radius, shellSize } from '../ui/theme';

/**
 * The app's spatial shell, one spec for every target (docs/adr/0001):
 *
 * - Headsets (Meta Horizon OS and PICO): the rail on the left holds
 *   {@linkcode DESTINATIONS}, the main panel shows the current one, and a
 *   detail panel opens beside it for {@linkcode DetailId} content.
 * - Phones: the same destinations are the bottom tab bar, and detail is a
 *   pushed screen.
 */
export const SHELL = createSpatialShell({
  railWidthDp: shellSize.railWidth,
  railItemDp: shellSize.railItem,
  railPaddingDp: shellSize.railPadding,
  cornerRadiusDp: radius.lg,
  detailWidthDp: shellSize.detailWidth,
  detailHeightDp: shellSize.detailHeight,
});

export type DestinationId = 'home' | 'diagnostics' | 'harness';

export interface Destination {
  id: DestinationId;
  title: string;
  href: '/' | '/diagnostics' | '/harness';
  icon: LucideIconName;
}

/** The rail on headsets and the tab bar on phones, in order. */
export const DESTINATIONS: readonly Destination[] = [
  { id: 'home', title: 'Home', href: '/', icon: 'house' },
  { id: 'diagnostics', title: 'Diagnostics', href: '/diagnostics', icon: 'search' },
  { id: 'harness', title: 'Harness', href: '/harness', icon: 'check' },
];

/** The destination a route belongs to. Routes outside the rail keep Home selected. */
export function destinationForPath(pathname: string): DestinationId {
  const match = DESTINATIONS.find((d) => d.href !== '/' && pathname.startsWith(d.href));
  return match?.id ?? 'home';
}

/** Content that opens in the detail panel. */
export type DetailId = 'headset' | 'layout';

export const DETAIL_TITLES: Readonly<Record<DetailId, string>> = {
  headset: 'This headset',
  layout: 'Spatial layout',
};

export function isDetailId(value: unknown): value is DetailId {
  return value === 'headset' || value === 'layout';
}

/** The `AppRegistry` name of the detail panel's surface (index.js). */
export const DETAIL_PANEL_COMPONENT = 'ExpoPicoDetailPanel';
