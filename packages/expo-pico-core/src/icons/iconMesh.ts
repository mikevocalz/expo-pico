import { requireOptionalNativeModule } from 'expo-modules-core';

import { LUCIDE_ICONS, type LucideIconName } from './lucideIcons.generated';

/**
 * Stroke mesh of an SVG icon, built natively by the Eskiu runtime.
 *
 * `vertices` holds x, y pairs in the icon's own units (Lucide: a 24x24 grid,
 * y pointing down). `indices` holds three vertex indices per triangle. Every
 * triangle is wound counter-clockwise once y is flipped to point up, which is
 * what {@link iconMeshToViroGeometry} does.
 */
export type IconMesh = {
  vertices: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
};

export type IconMeshOptions = {
  /** Stroke width in icon units. Lucide draws at 2. */
  strokeWidth?: number;
  /**
   * Largest distance, in icon units, that a flattened curve or a round cap/join
   * may stray from the true outline. Smaller is smoother and heavier.
   */
  tolerance?: number;
};

export const DEFAULT_ICON_STROKE_WIDTH = 2;
export const DEFAULT_ICON_TOLERANCE = 0.02;

type IconMeshNative = {
  getIconMesh(
    svgElements: string,
    strokeWidth: number,
    tolerance: number
  ): {
    vertices: ArrayLike<number>;
    indices: ArrayLike<number>;
    vertexCount: number;
    indexCount: number;
  };
};

let nativeCache: IconMeshNative | null | undefined;

function native(): IconMeshNative {
  if (nativeCache === undefined) {
    try {
      nativeCache = requireOptionalNativeModule<IconMeshNative>('PicoRuntimeV2');
    } catch {
      nativeCache = null;
    }
  }
  if (!nativeCache || typeof nativeCache.getIconMesh !== 'function') {
    throw new Error(
      'ESKIU_RUNTIME_UNAVAILABLE: icon meshes need the @expo-pico/core Android module (PicoRuntimeV2).'
    );
  }
  return nativeCache;
}

/**
 * Meshes the stroke of SVG element markup: `path`, `line`, `circle`,
 * `ellipse`, `rect`, `polyline` and `polygon`, with round caps and joins.
 *
 * Throws `ESKIU_RUNTIME_UNAVAILABLE` on builds without the Eskiu runtime
 * (anything but an arm64-v8a Android build compiled with eskiuc >= 0.9.3), and
 * `ICON_MESH_PARSE_ERROR` / `ICON_MESH_INVALID_INPUT` / `ICON_MESH_LIMIT` for
 * bad input.
 */
export function getIconMesh(svgElements: string, options: IconMeshOptions = {}): IconMesh {
  const strokeWidth = options.strokeWidth ?? DEFAULT_ICON_STROKE_WIDTH;
  const tolerance = options.tolerance ?? DEFAULT_ICON_TOLERANCE;
  const raw = native().getIconMesh(svgElements, strokeWidth, tolerance);
  return {
    vertices: Float32Array.from(raw.vertices),
    indices: Uint32Array.from(raw.indices),
    vertexCount: raw.vertexCount,
    indexCount: raw.indexCount,
  };
}

/** {@link getIconMesh} for one of the bundled Lucide icons. */
export function getLucideIconMesh(name: LucideIconName, options?: IconMeshOptions): IconMesh {
  return getIconMesh(LUCIDE_ICONS[name], options);
}

export type ViroIconGeometry = {
  vertices: [number, number, number][];
  normals: [number, number, number][];
  texcoords: [number, number][];
  triangleIndices: [number, number, number][];
};

export type ViroIconGeometryOptions = {
  /** Width and height of the icon's view box in scene units (metres). Default 0.1. */
  size?: number;
  /** Side length of the icon's view box in icon units. Lucide: 24. */
  viewBox?: number;
};

/**
 * Converts an {@link IconMesh} into props for `ViroGeometry` from
 * `@reactvision/react-viro`: centred on the origin, y flipped up, scaled so the
 * view box spans `size` metres, lying in the XY plane facing +Z.
 *
 * ```tsx
 * const geometry = iconMeshToViroGeometry(getLucideIconMesh('house'), { size: 0.08 });
 * <ViroGeometry {...geometry} materials={['iconWhite']} position={[0, 1.4, -1]} />
 * ```
 *
 * Strokes that cross overlap, so use an opaque material.
 */
export function iconMeshToViroGeometry(
  mesh: IconMesh,
  options: ViroIconGeometryOptions = {}
): ViroIconGeometry {
  const viewBox = options.viewBox ?? 24;
  const size = options.size ?? 0.1;
  const scale = size / viewBox;
  const half = viewBox / 2;
  const vertices: [number, number, number][] = [];
  const normals: [number, number, number][] = [];
  const texcoords: [number, number][] = [];
  for (let k = 0; k < mesh.vertexCount; k++) {
    const x = mesh.vertices[k * 2];
    const y = mesh.vertices[k * 2 + 1];
    vertices.push([(x - half) * scale, (half - y) * scale, 0]);
    normals.push([0, 0, 1]);
    texcoords.push([x / viewBox, y / viewBox]);
  }
  const triangleIndices: [number, number, number][] = [];
  for (let k = 0; k + 2 < mesh.indexCount; k += 3) {
    triangleIndices.push([mesh.indices[k], mesh.indices[k + 1], mesh.indices[k + 2]]);
  }
  return { vertices, normals, texcoords, triangleIndices };
}
