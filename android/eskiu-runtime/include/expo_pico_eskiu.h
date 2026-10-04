#pragma once
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define EXPO_PICO_VIRO_ABI_VERSION 1u

#define EXPO_PICO_VIRO_FEATURE_POSE        (1ull << 0)
#define EXPO_PICO_VIRO_FEATURE_PLANE       (1ull << 1)
#define EXPO_PICO_VIRO_FEATURE_SCENE_MESH  (1ull << 2)
#define EXPO_PICO_VIRO_FEATURE_HAPTICS     (1ull << 3)
#define EXPO_PICO_VIRO_FEATURE_PASSTHROUGH (1ull << 4)

typedef struct ExpoPicoVec3 {
  float x;
  float y;
  float z;
} ExpoPicoVec3;

typedef struct ExpoPicoQuat {
  float x;
  float y;
  float z;
  float w;
} ExpoPicoQuat;

typedef struct ExpoPicoByteView {
  const uint8_t *data;
  uint64_t length;
} ExpoPicoByteView;

typedef struct ExpoPicoPosePacket {
  uint32_t struct_size;
  uint32_t flags;
  uint64_t timestamp_ns;
  ExpoPicoVec3 position;
  ExpoPicoQuat rotation;
} ExpoPicoPosePacket;

typedef struct ExpoPicoPlanePacket {
  uint32_t struct_size;
  uint32_t flags;
  uint64_t plane_id;
  ExpoPicoPosePacket pose;
  float extent_x;
  float extent_z;
  float confidence;
  float reserved;
} ExpoPicoPlanePacket;

typedef struct ExpoPicoSceneMeshPacket {
  uint32_t struct_size;
  uint32_t flags;
  uint64_t mesh_id;
  uint64_t version;
  uint32_t vertex_count;
  uint32_t vertex_stride_bytes;
  uint32_t index_count;
  uint32_t index_stride_bytes;
  ExpoPicoByteView vertices;
  ExpoPicoByteView indices;
} ExpoPicoSceneMeshPacket;

float expo_pico_clampf(float value, float lo, float hi);
int expo_pico_capability_enabled(uint64_t declared, uint64_t available, int bit);
float expo_pico_haptic_amplitude(float amplitude);
float expo_pico_passthrough_level(float level);

/* Stable ViroCore-facing ABI. Keep this surface POD/scalar-only. */
uint32_t expo_pico_viro_abi_version(void);
uint32_t expo_pico_viro_negotiate_version(uint32_t requested_version);
uint64_t expo_pico_viro_capabilities(void);
uint64_t expo_pico_viro_feature_mask(uint64_t declared, uint64_t available);
float expo_pico_vec3_length_sq(float x, float y, float z);
float expo_pico_quat_norm_sq(float x, float y, float z, float w);
int expo_pico_pose_packet_validate(const ExpoPicoPosePacket *packet);
int expo_pico_plane_packet_validate(const ExpoPicoPlanePacket *packet);
int expo_pico_scene_mesh_packet_validate(const ExpoPicoSceneMeshPacket *packet);

/* ------------------------------------------------------------------------
 * Icon stroke meshes (src/icon/)
 *
 * Turns SVG element markup (path, line, circle, ellipse, rect, polyline,
 * polygon; other tags are skipped) into a 2D triangle mesh of its stroke with
 * round joins and round caps, the way Lucide icons are drawn. Coordinates stay
 * in the input's user space (Lucide: a 24x24 grid, y down). Every triangle has
 * a negative signed area in those coordinates, so it is counter-clockwise once
 * y is negated to point up. Triangles of overlapping strokes overlap; draw opaque.
 *
 * No call allocates. Size first, allocate, then fill with the same arguments:
 *
 *   uint32_t nv, ni;
 *   expo_pico_icon_mesh_size(svg, 2.0f, 0.02f, &nv, &ni);
 *   float *xy = malloc(nv * 2 * sizeof(float));
 *   uint32_t *idx = malloc(ni * sizeof(uint32_t));
 *   expo_pico_icon_mesh_fill(svg, 2.0f, 0.02f, xy, nv, idx, ni, &nv, &ni);
 *
 * stroke_width and tolerance are in input units; tolerance is the largest
 * distance a flattened curve or arc fan may stray from the true outline.
 * Both must be finite, > 0 and <= 1000. Calls are reentrant and thread-safe
 * (state lives on the caller's stack, about 33 KiB).
 * ------------------------------------------------------------------------ */

#define EXPO_PICO_ICON_ABI_VERSION 1u

#define EXPO_PICO_ICON_OK            0
#define EXPO_PICO_ICON_ERR_NULL     -1 /* a required pointer was NULL */
#define EXPO_PICO_ICON_ERR_PARAM    -2 /* stroke_width or tolerance out of range */
#define EXPO_PICO_ICON_ERR_PARSE    -3 /* malformed markup, path data or number */
#define EXPO_PICO_ICON_ERR_LIMIT    -4 /* > 2048 points in one subpath, or > 2^24 vertices/indices */
#define EXPO_PICO_ICON_ERR_CAPACITY -5 /* fill: buffers too small; out counts hold what is needed */

typedef struct ExpoPicoSvgArcCenter {
  double cx;
  double cy;
  double rx;          /* radii after the F.6.6 out-of-range correction */
  double ry;
  double theta1;      /* start angle, radians */
  double delta_theta; /* signed sweep, radians; positive follows sweep-flag = 1 */
} ExpoPicoSvgArcCenter;

uint32_t expo_pico_icon_abi_version(void);

/* Counts the vertices (x, y pairs) and indices (3 per triangle) of the mesh. */
int32_t expo_pico_icon_mesh_size(const char *svg_elements, float stroke_width, float tolerance,
                                 uint32_t *out_vertex_count, uint32_t *out_index_count);

/* Writes the mesh. vertices_xy holds vertex_capacity * 2 floats; indices holds
 * index_capacity uint32 values. Writes nothing past either capacity. */
int32_t expo_pico_icon_mesh_fill(const char *svg_elements, float stroke_width, float tolerance,
                                 float *vertices_xy, uint32_t vertex_capacity,
                                 uint32_t *indices, uint32_t index_capacity,
                                 uint32_t *out_vertex_count, uint32_t *out_index_count);

/* Inspection helper: parses and flattens SVG path data (the d attribute) and
 * writes the points of every painted subpath back to back. A closed subpath
 * does not repeat its first point. Pass out_xy = NULL to only count; that call
 * returns EXPO_PICO_ICON_ERR_CAPACITY with the counts filled in. */
int32_t expo_pico_svg_path_flatten(const char *path_data, float tolerance, float *out_xy,
                                   uint32_t point_capacity, uint32_t *out_point_count,
                                   uint32_t *out_subpath_count);

/* SVG 1.1 F.6.5 endpoint-to-centre conversion. Returns 1 for a drawable arc,
 * 0 when SVG draws a line (rx or ry is 0) or nothing (equal endpoints), and
 * EXPO_PICO_ICON_ERR_NULL when out is NULL. */
int32_t expo_pico_svg_arc_center(double x1, double y1, double rx, double ry,
                                 double x_axis_rotation_deg, int32_t large_arc, int32_t sweep,
                                 double x2, double y2, ExpoPicoSvgArcCenter *out);

#ifdef __cplusplus
}
#endif
