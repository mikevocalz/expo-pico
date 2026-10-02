#pragma once
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define PICO_ESKIU_ABI_VERSION 2u

// Stable, language-neutral ABI shared by expo-pico and Viro/ViroCore.
// Keep exported values POD/scalars; never expose Eskiu-owned aggregate layouts.
uint32_t pico_eskiu_abi_version(void);
int32_t pico_eskiu_android_probe(int32_t value);

// Allocation-free hot-path helpers. Kotlin/Expo Modules and ViroCore may both
// call these without creating JS/Kotlin object graphs.
float pico_eskiu_clamp01(float value);
uint64_t pico_eskiu_capability_intersection(uint64_t declared, uint64_t available);
int32_t pico_eskiu_capability_enabled(
    uint64_t declared,
    uint64_t available,
    int32_t bit_index
);
float pico_eskiu_haptic_amplitude(float amplitude);
float pico_eskiu_passthrough_level(float level);

#ifdef __cplusplus
}
#endif
