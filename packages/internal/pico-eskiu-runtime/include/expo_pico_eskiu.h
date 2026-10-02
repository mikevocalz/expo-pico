#pragma once
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define EXPO_PICO_VIRO_ABI_VERSION 1u

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

float expo_pico_clampf(float value, float lo, float hi);
int expo_pico_capability_enabled(uint64_t declared, uint64_t available, int bit);
float expo_pico_haptic_amplitude(float amplitude);
float expo_pico_passthrough_level(float level);

/* Stable ViroCore-facing ABI. Keep this surface POD/scalar-only. */
uint32_t expo_pico_viro_abi_version(void);
uint64_t expo_pico_viro_feature_mask(uint64_t declared, uint64_t available);
float expo_pico_vec3_length_sq(float x, float y, float z);
float expo_pico_quat_norm_sq(float x, float y, float z, float w);

#ifdef __cplusplus
}
#endif
