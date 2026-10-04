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

#ifdef __cplusplus
}
#endif
