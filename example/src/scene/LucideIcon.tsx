import React, { useMemo } from 'react';
import { ViroGeometry, ViroMaterials } from '@reactvision/react-viro';
import {
  getLucideIconMesh,
  iconMeshToViroGeometry,
  type LucideIconName,
  type ViroIconGeometry,
} from '@expo-pico/core';

type Viro3DPoint = [number, number, number];

ViroMaterials.createMaterials({
  // Constant-lit like the panel buttons: icons read as UI, not lit props.
  iconInk: {
    lightingModel: 'Constant',
    diffuseColor: '#F5F7FF',
  },
  iconAccent: {
    lightingModel: 'Constant',
    diffuseColor: '#7DD3FC',
  },
});

/**
 * One meshed Lucide icon, drawn as a flat ViroGeometry facing +Z.
 *
 * The mesh comes from the Eskiu runtime (`PicoRuntimeV2.getIconMesh` ->
 * expo_pico_icon_mesh_fill), so the icon is real geometry in the scene, not
 * a font glyph — glyphs for missing codepoints rasterize as .notdef boxes.
 * Geometries are memoized per (name, size): the native mesh call is cheap
 * but not free.
 */
const geometryCache = new Map<string, ViroIconGeometry>();

function iconGeometry(name: LucideIconName, size: number): ViroIconGeometry {
  const key = `${name}@${size}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = iconMeshToViroGeometry(getLucideIconMesh(name), { size });
    geometryCache.set(key, geometry);
  }
  return geometry;
}

export function LucideIcon({
  name,
  position,
  size = 0.04,
  accent = false,
}: {
  name: LucideIconName;
  position: Viro3DPoint;
  /** View-box span in metres. */
  size?: number;
  /** Accent (#7DD3FC) instead of ink (#F5F7FF). */
  accent?: boolean;
}): React.JSX.Element {
  const geometry = useMemo(() => iconGeometry(name, size), [name, size]);
  return (
    <ViroGeometry
      vertices={geometry.vertices}
      normals={geometry.normals}
      texcoords={geometry.texcoords}
      triangleIndices={geometry.triangleIndices}
      position={position}
      materials={[accent ? 'iconAccent' : 'iconInk']}
      ignoreEventHandling
    />
  );
}
