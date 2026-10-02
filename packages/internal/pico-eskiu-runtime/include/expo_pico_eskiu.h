#pragma once
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
float expo_pico_clampf(float value, float lo, float hi);
int expo_pico_capability_enabled(uint64_t declared, uint64_t available, int bit);
float expo_pico_haptic_amplitude(float amplitude);
float expo_pico_passthrough_level(float level);
#ifdef __cplusplus
}
#endif
