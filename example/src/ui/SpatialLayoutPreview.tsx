import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { getSpatialLayoutReadiness, type PicoSpatialLayoutPrimitive } from '@expo-pico/spatial';

import { resolveWorkspace, type ResolvedSurface, type SurfacePose } from '../layout/workspace';
import { palette, radius, space } from './theme';

/** Plain-language name for each PICO Spatial SDK 6 primitive. */
const PRIMITIVE_NAMES: Record<PicoSpatialLayoutPrimitive, string> = {
  'window-container-planar': 'Main window',
  'window-container-volume': 'Volume window',
  'subwindow-start': 'Side window, start',
  'subwindow-end': 'Side window, end',
  augment: 'Attached view',
  toolbar: 'Toolbar under the main window',
  'spatial-popup': 'Popup',
  'attachment-panel': 'Attached panel',
  stage: 'Full space',
  inline: 'Inline view',
};

export function describePrimitive(primitive: PicoSpatialLayoutPrimitive): string {
  return PRIMITIVE_NAMES[primitive];
}

/** Approximate panel widths in metres, only used to size the diagram bars. */
const PANEL_WIDTH: Partial<Record<PicoSpatialLayoutPrimitive, number>> = {
  'window-container-planar': 1.0,
  'subwindow-start': 0.6,
  'subwindow-end': 0.6,
  toolbar: 0.5,
};
const DEFAULT_PANEL_WIDTH = 0.6;

type Placed = ResolvedSurface & { pose: SurfacePose };

function isPlaced(s: ResolvedSurface): s is Placed {
  return s.pose != null;
}

const fmt = (m: number): string => `${(Math.round(m * 10) / 10).toFixed(1)} m`;

/** Spoken description of the arrangement, built from the same poses as the diagram. */
function describeArrangement(surfaces: readonly ResolvedSurface[]): string {
  const placed = surfaces.filter(isPlaced);
  const eyeY = Math.max(...placed.map((s) => s.pose.position[1]));
  const parts = surfaces.map((s) => {
    if (!s.pose) return `${s.title} has no position yet`;
    const [x, y, z] = s.pose.position;
    const angle = Math.round((Math.atan2(x, -z) * 180) / Math.PI);
    const dir =
      Math.abs(angle) < 3
        ? 'straight ahead'
        : `${Math.abs(angle)} degrees to your ${angle < 0 ? 'left' : 'right'}`;
    const drop = eyeY - y;
    const height = drop > 0.1 ? `, ${fmt(drop)} lower` : '';
    return `${s.title} ${fmt(Math.hypot(x, z))} away, ${dir}${height}`;
  });
  return `Top-down view of the panels around you. ${parts.join('. ')}.`;
}

const DIAGRAM_PAD_X = 16;
const DIAGRAM_PAD_TOP = 26;
const DIAGRAM_PAD_BOTTOM = 34;
const BAR = 4;
const LABEL_W = 84;

function Diagram({ surfaces }: { surfaces: readonly ResolvedSurface[] }): React.JSX.Element {
  const [width, setWidth] = useState(0);
  const height = Math.min(220, Math.max(150, width * 0.48));

  const placed = useMemo(() => surfaces.filter(isPlaced), [surfaces]);

  // Fit the poses plus the user at the origin into the box at one scale, so
  // angles and distances stay true.
  const geometry = useMemo(() => {
    let maxX = 0.3;
    let minZ = -0.2;
    for (const s of placed) {
      const half = (PANEL_WIDTH[s.primitive] ?? DEFAULT_PANEL_WIDTH) / 2;
      maxX = Math.max(maxX, Math.abs(s.pose.position[0]) + half);
      minZ = Math.min(minZ, s.pose.position[2] - 0.1);
    }
    const usableW = Math.max(1, width - DIAGRAM_PAD_X * 2);
    const usableH = Math.max(1, height - DIAGRAM_PAD_TOP - DIAGRAM_PAD_BOTTOM);
    const scale = Math.min(usableW / (maxX * 2), usableH / -minZ);
    const originX = width / 2;
    const originY = DIAGRAM_PAD_TOP + -minZ * scale;
    return { scale, originX, originY };
  }, [placed, width, height]);

  const onLayout = (e: LayoutChangeEvent): void => setWidth(e.nativeEvent.layout.width);
  const { scale, originX, originY } = geometry;

  return (
    <View
      style={[styles.diagram, { height }]}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={describeArrangement(surfaces)}
    >
      {width > 0 &&
        placed.map((s) => {
          const [x, , z] = s.pose.position;
          const len = (PANEL_WIDTH[s.primitive] ?? DEFAULT_PANEL_WIDTH) * scale;
          const cx = originX + x * scale;
          const cy = originY + z * scale;
          const main = s.primitive === 'window-container-planar';
          // Main window's label sits behind it; everything else labels toward the user.
          // A turned bar dips toward the user at one end; clear that drop.
          const dip = Math.abs(Math.sin((s.pose.yaw * Math.PI) / 180)) * (len / 2);
          const labelTop = main ? cy - 22 : cy + 8 + dip;
          return (
            <React.Fragment key={s.id}>
              <View
                style={[
                  styles.bar,
                  main ? styles.barMain : styles.barSide,
                  {
                    width: len,
                    left: cx - len / 2,
                    top: cy - BAR / 2,
                    transform: [{ rotate: `${-s.pose.yaw}deg` }],
                  },
                ]}
              />
              <Text
                style={[styles.diagramLabel, { left: cx - LABEL_W / 2, top: labelTop }]}
                numberOfLines={1}
              >
                {s.title}
              </Text>
            </React.Fragment>
          );
        })}
      {width > 0 && (
        <>
          <View style={[styles.user, { left: originX - 6, top: originY - 6 }]} />
          <Text style={[styles.diagramLabel, { left: originX - LABEL_W / 2, top: originY + 9 }]}>
            You
          </Text>
        </>
      )}
    </View>
  );
}

export function SpatialLayoutPreview(): React.JSX.Element {
  const surfaces = useMemo(() => resolveWorkspace(), []);
  const bound = useMemo(() => getSpatialLayoutReadiness().nativeLayoutBridgeBound, []);

  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        Spatial layout
      </Text>

      <Diagram surfaces={surfaces} />

      <View style={styles.list}>
        {surfaces.map((s, i) => (
          <View key={s.id} style={[styles.item, i > 0 && styles.itemDivider]}>
            <Text style={styles.itemTitle}>{s.title}</Text>
            <Text style={styles.itemDetail}>{describePrimitive(s.primitive)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.status}>
        <View style={[styles.statusDot, { backgroundColor: bound ? palette.ok : palette.warn }]} />
        <Text style={styles.statusText}>
          {bound
            ? 'The panels open as PICO windows.'
            : 'The panels are drawn in the Viro scene for now and will open as PICO windows once the native layout bridge ships.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: space.lg,
    backgroundColor: palette.bgCard,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  heading: { color: palette.text, fontSize: 15, fontWeight: '600' },

  diagram: {
    marginTop: space.sm + 4,
    backgroundColor: palette.bgRaised,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', height: BAR, borderRadius: BAR / 2 },
  barMain: { backgroundColor: palette.text },
  barSide: { backgroundColor: palette.textMuted },
  user: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.text,
  },
  diagramLabel: {
    position: 'absolute',
    width: LABEL_W,
    textAlign: 'center',
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  list: { marginTop: space.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm + 2,
  },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  itemTitle: { color: palette.text, fontSize: 14, fontWeight: '600' },
  itemDetail: { flexShrink: 1, color: palette.textMuted, fontSize: 13, textAlign: 'right' },

  status: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.sm },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  statusText: { flex: 1, color: palette.textMuted, fontSize: 12, lineHeight: 18 },
});
