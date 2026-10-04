# Viro + Eskiu ABI

Expose a stable versioned C ABI from expo-pico's Eskiu runtime for direct ViroCore consumption.

Goals:

- no JS hop for renderer-consumed PICO state
- fixed-layout ABI structs
- ABI version/capability negotiation
- pose/vector/quaternion helpers
- scene/plane packet primitives
- C/C++ header usable by ViroCore

## Icon stroke meshes (`EXPO_PICO_ICON_ABI_VERSION` 1)

`include/expo_pico_eskiu.h` also declares an icon mesher, versioned separately
from the Viro packets. It turns SVG element markup (`path`, `line`, `circle`,
`ellipse`, `rect`, `polyline`, `polygon`) into a triangle mesh of the stroke
with round joins and round caps, which is how Lucide icons are drawn. The
immersive Viro scene has no SVG renderer, so this is how icons reach it.

```c
uint32_t expo_pico_icon_abi_version(void);
int32_t expo_pico_icon_mesh_size(const char *svg_elements, float stroke_width, float tolerance,
                                 uint32_t *out_vertex_count, uint32_t *out_index_count);
int32_t expo_pico_icon_mesh_fill(const char *svg_elements, float stroke_width, float tolerance,
                                 float *vertices_xy, uint32_t vertex_capacity,
                                 uint32_t *indices, uint32_t index_capacity,
                                 uint32_t *out_vertex_count, uint32_t *out_index_count);
int32_t expo_pico_svg_path_flatten(const char *path_data, float tolerance, float *out_xy,
                                   uint32_t point_capacity, uint32_t *out_point_count,
                                   uint32_t *out_subpath_count);
int32_t expo_pico_svg_arc_center(double x1, double y1, double rx, double ry,
                                 double x_axis_rotation_deg, int32_t large_arc, int32_t sweep,
                                 double x2, double y2, ExpoPicoSvgArcCenter *out);
```

- Two calls, no allocation: `_size` counts, the caller allocates, `_fill` writes.
  `_fill` never writes past either capacity and returns
  `EXPO_PICO_ICON_ERR_CAPACITY` (with the required counts) when they are short.
- Output: `x, y` float pairs in the input's units (Lucide: 24x24, y down) and
  `uint32` triangle indices. Every triangle has a negative signed area in those
  coordinates, so it is counter-clockwise after flipping y up.
- `tolerance` bounds how far a flattened curve, arc or round cap/join may stray
  from the true outline. Beziers are flattened with Wang's bound; arcs are
  converted to centre form per SVG 1.1 F.6.5 and F.6.6.
- Status codes: `0` OK, `-1` null pointer, `-2` bad width/tolerance, `-3` parse
  error, `-4` limit (over 2048 points in one subpath or 2^24 vertices/indices),
  `-5` capacity.
- Reentrant; working state is about 33 KiB of the caller's stack.

ViroCore can call these directly to build native geometry. Today the only
consumer is `@expo-pico/core`: Kotlin `PicoRuntimeV2.getIconMesh` returns the
arrays to JS, and `iconMeshToViroGeometry` turns them into `ViroGeometry` props.
The Lucide markup comes from `scripts/build-lucide-icons.mjs` (ten icons are
committed; `--all` writes the full set for a build step). Host tests:
`yarn test:eskiu`.
