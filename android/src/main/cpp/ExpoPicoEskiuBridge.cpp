#include <jni.h>
#include <algorithm>
#include <cstdint>
#include "expo_pico_eskiu.h"

namespace {
#ifndef EXPO_PICO_ESKIU
float clampf(float value, float lo, float hi) {
  return std::max(lo, std::min(value, hi));
}
float hapticAmplitude(float value) { return clampf(value, 0.0f, 1.0f); }
float passthroughLevel(float value) { return clampf(value, 0.0f, 1.0f); }
bool capabilityEnabled(uint64_t declared, uint64_t available, int bit) {
  if (bit < 0 || bit > 63) return false;
  const uint64_t mask = uint64_t{1} << bit;
  return (declared & mask) != 0 && (available & mask) != 0;
}
#else
float hapticAmplitude(float value) { return expo_pico_haptic_amplitude(value); }
float passthroughLevel(float value) { return expo_pico_passthrough_level(value); }
bool capabilityEnabled(uint64_t declared, uint64_t available, int bit) {
  return expo_pico_capability_enabled(declared, available, bit) != 0;
}
#endif
} // namespace

extern "C" JNIEXPORT jdouble JNICALL
Java_expo_modules_pico_PicoEskiuBridge_hapticAmplitude(
    JNIEnv*, jobject, jdouble amplitude) {
  return static_cast<jdouble>(hapticAmplitude(static_cast<float>(amplitude)));
}

extern "C" JNIEXPORT jdouble JNICALL
Java_expo_modules_pico_PicoEskiuBridge_passthroughLevel(
    JNIEnv*, jobject, jdouble level) {
  return static_cast<jdouble>(passthroughLevel(static_cast<float>(level)));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_expo_modules_pico_PicoEskiuBridge_capabilityEnabled(
    JNIEnv*, jobject, jlong declared, jlong available, jint bit) {
  return capabilityEnabled(
      static_cast<uint64_t>(declared),
      static_cast<uint64_t>(available),
      static_cast<int>(bit)) ? JNI_TRUE : JNI_FALSE;
}
