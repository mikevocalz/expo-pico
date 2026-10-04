const getIconMesh = jest.fn();

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn((name: string) =>
    name === 'PicoRuntimeV2' ? { getIconMesh } : null
  ),
}));

import {
  getIconMesh as meshFromMarkup,
  getLucideIconMesh,
  iconMeshToViroGeometry,
  LUCIDE_ICONS,
  LUCIDE_VERSION,
} from '../index';
import type { IconMesh } from '../index';

// One triangle in Lucide's y-down space with the winding the Eskiu mesher
// emits: negative signed area in SVG coordinates.
const triangle: IconMesh = {
  vertices: new Float32Array([0, 0, 24, 0, 12, 24]),
  indices: new Uint32Array([0, 2, 1]),
  vertexCount: 3,
  indexCount: 3,
};

describe('icon meshes', () => {
  beforeEach(() => {
    getIconMesh.mockReset();
    getIconMesh.mockReturnValue({
      vertices: [0, 0, 24, 0, 12, 24],
      indices: [0, 1, 2],
      vertexCount: 3,
      indexCount: 3,
    });
  });

  it('passes markup and Lucide defaults to the native module', () => {
    const mesh = getLucideIconMesh('x');
    expect(getIconMesh).toHaveBeenCalledWith(LUCIDE_ICONS.x, 2, 0.02);
    expect(mesh.vertices).toBeInstanceOf(Float32Array);
    expect(mesh.indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(mesh.indices)).toEqual([0, 1, 2]);
  });

  it('forwards explicit stroke width and tolerance', () => {
    meshFromMarkup('<circle cx="12" cy="12" r="4"/>', { strokeWidth: 1.5, tolerance: 0.1 });
    expect(getIconMesh).toHaveBeenCalledWith('<circle cx="12" cy="12" r="4"/>', 1.5, 0.1);
  });

  it('propagates native errors', () => {
    getIconMesh.mockImplementation(() => {
      throw new Error('ICON_MESH_PARSE_ERROR: malformed SVG element markup or path data');
    });
    expect(() => meshFromMarkup('<path d="M0"/>')).toThrow('ICON_MESH_PARSE_ERROR');
  });

  it('centres, flips y and scales into ViroGeometry props', () => {
    const g = iconMeshToViroGeometry(triangle, { size: 0.24 });
    expect(g.vertices[0][0]).toBeCloseTo(-0.12);
    expect(g.vertices[0][1]).toBeCloseTo(0.12);
    expect(g.vertices[1][0]).toBeCloseTo(0.12);
    expect(g.vertices[2][1]).toBeCloseTo(-0.12);
    expect(g.vertices.every((v) => v[2] === 0)).toBe(true);
    expect(g.normals).toEqual([
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
    ]);
    expect(g.texcoords[2]).toEqual([0.5, 1]);
    expect(g.triangleIndices).toEqual([[0, 2, 1]]);
  });

  it('flips the mesher winding to counter-clockwise, facing +Z', () => {
    const g = iconMeshToViroGeometry(triangle);
    const [a, b, c] = g.triangleIndices[0].map((i) => g.vertices[i]);
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    expect(cross).toBeGreaterThan(0);
  });

  it('ships the curated Lucide set with its version', () => {
    expect(LUCIDE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.keys(LUCIDE_ICONS).sort()).toEqual([
      'check',
      'chevron-right',
      'circle',
      'heart',
      'house',
      'map-pin',
      'search',
      'settings',
      'star',
      'x',
    ]);
    for (const markup of Object.values(LUCIDE_ICONS)) {
      expect(markup).toMatch(/^<(path|circle|line|rect|polyline|polygon|ellipse) /);
    }
  });
});
