import { type LucideIconName } from './lucideIcons.generated';
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
export declare const DEFAULT_ICON_STROKE_WIDTH = 2;
export declare const DEFAULT_ICON_TOLERANCE = 0.02;
/**
 * Meshes the stroke of SVG element markup: `path`, `line`, `circle`,
 * `ellipse`, `rect`, `polyline` and `polygon`, with round caps and joins.
 *
 * Throws `ESKIU_RUNTIME_UNAVAILABLE` on builds without the Eskiu runtime
 * (anything but an arm64-v8a Android build compiled with eskiuc >= 0.9.3), and
 * `ICON_MESH_PARSE_ERROR` / `ICON_MESH_INVALID_INPUT` / `ICON_MESH_LIMIT` for
 * bad input.
 */
export declare function getIconMesh(svgElements: string, options?: IconMeshOptions): IconMesh;
/** {@link getIconMesh} for one of the bundled Lucide icons. */
export declare function getLucideIconMesh(name: LucideIconName, options?: IconMeshOptions): IconMesh;
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
export declare function iconMeshToViroGeometry(mesh: IconMesh, options?: ViroIconGeometryOptions): ViroIconGeometry;
//# sourceMappingURL=iconMesh.d.ts.map