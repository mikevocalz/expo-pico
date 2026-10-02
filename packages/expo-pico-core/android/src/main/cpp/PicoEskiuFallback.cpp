#include "include/PicoEskiuABI.h"

extern "C" uint32_t pico_eskiu_abi_version(void) { return PICO_ESKIU_ABI_VERSION; }
extern "C" int32_t pico_eskiu_android_probe(int32_t value) { return value + 1; }
extern "C" float pico_eskiu_clamp01(float value) {
  if (value < 0.0f) return 0.0f;
  if (value > 1.0f) return 1.0f;
  return value;
}
extern "C" uint64_t pico_eskiu_capability_intersection(uint64_t declared, uint64_t available) {
  return declared & available;
}
extern "C" int32_t pico_eskiu_capability_enabled(uint64_t declared, uint64_t available, int32_t bit_index) {
  if (bit_index < 0 || bit_index > 63) return 0;
  const uint64_t mask = uint64_t{1} << bit_index;
  return ((declared & mask) != 0 && (available & mask) != 0) ? 1 : 0;
}
extern "C" float pico_eskiu_haptic_amplitude(float amplitude) { return pico_eskiu_clamp01(amplitude); }
extern "C" float pico_eskiu_passthrough_level(float level) { return pico_eskiu_clamp01(level); }
