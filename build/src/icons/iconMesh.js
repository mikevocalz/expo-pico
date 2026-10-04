"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ICON_TOLERANCE = exports.DEFAULT_ICON_STROKE_WIDTH = void 0;
exports.getIconMesh = getIconMesh;
exports.getLucideIconMesh = getLucideIconMesh;
exports.iconMeshToViroGeometry = iconMeshToViroGeometry;
const expo_modules_core_1 = require("expo-modules-core");
const lucideIcons_generated_1 = require("./lucideIcons.generated");
exports.DEFAULT_ICON_STROKE_WIDTH = 2;
exports.DEFAULT_ICON_TOLERANCE = 0.02;
let nativeCache;
function native() {
    if (nativeCache === undefined) {
        try {
            nativeCache = (0, expo_modules_core_1.requireOptionalNativeModule)('PicoRuntimeV2');
        }
        catch {
            nativeCache = null;
        }
    }
    if (!nativeCache || typeof nativeCache.getIconMesh !== 'function') {
        throw new Error('ESKIU_RUNTIME_UNAVAILABLE: icon meshes need the @expo-pico/core Android module (PicoRuntimeV2).');
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
function getIconMesh(svgElements, options = {}) {
    const strokeWidth = options.strokeWidth ?? exports.DEFAULT_ICON_STROKE_WIDTH;
    const tolerance = options.tolerance ?? exports.DEFAULT_ICON_TOLERANCE;
    const raw = native().getIconMesh(svgElements, strokeWidth, tolerance);
    return {
        vertices: Float32Array.from(raw.vertices),
        indices: Uint32Array.from(raw.indices),
        vertexCount: raw.vertexCount,
        indexCount: raw.indexCount,
    };
}
/** {@link getIconMesh} for one of the bundled Lucide icons. */
function getLucideIconMesh(name, options) {
    return getIconMesh(lucideIcons_generated_1.LUCIDE_ICONS[name], options);
}
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
function iconMeshToViroGeometry(mesh, options = {}) {
    const viewBox = options.viewBox ?? 24;
    const size = options.size ?? 0.1;
    const scale = size / viewBox;
    const half = viewBox / 2;
    const vertices = [];
    const normals = [];
    const texcoords = [];
    for (let k = 0; k < mesh.vertexCount; k++) {
        const x = mesh.vertices[k * 2];
        const y = mesh.vertices[k * 2 + 1];
        vertices.push([(x - half) * scale, (half - y) * scale, 0]);
        normals.push([0, 0, 1]);
        texcoords.push([x / viewBox, y / viewBox]);
    }
    const triangleIndices = [];
    for (let k = 0; k + 2 < mesh.indexCount; k += 3) {
        triangleIndices.push([mesh.indices[k], mesh.indices[k + 1], mesh.indices[k + 2]]);
    }
    return { vertices, normals, texcoords, triangleIndices };
}
//# sourceMappingURL=iconMesh.js.map