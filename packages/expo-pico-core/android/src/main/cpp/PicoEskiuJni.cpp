#include <jni.h>
#include "include/PicoEskiuABI.h"

extern "C" JNIEXPORT jint JNICALL
Java_expo_modules_pico_PicoEskiuRuntime_nativeAbiVersion(JNIEnv*, jobject) {
  return static_cast<jint>(pico_eskiu_abi_version());
}

extern "C" JNIEXPORT jfloat JNICALL
Java_expo_modules_pico_PicoEskiuRuntime_nativeClamp01(JNIEnv*, jobject, jfloat value) {
  return pico_eskiu_clamp01(value);
}

extern "C" JNIEXPORT jfloat JNICALL
Java_expo_modules_pico_PicoEskiuRuntime_nativeHapticAmplitude(JNIEnv*, jobject, jfloat value) {
  return pico_eskiu_haptic_amplitude(value);
}

extern "C" JNIEXPORT jfloat JNICALL
Java_expo_modules_pico_PicoEskiuRuntime_nativePassthroughLevel(JNIEnv*, jobject, jfloat value) {
  return pico_eskiu_passthrough_level(value);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_expo_modules_pico_PicoEskiuRuntime_nativeCapabilityEnabled(
    JNIEnv*, jobject, jlong declared, jlong available, jint bitIndex) {
  return pico_eskiu_capability_enabled(
      static_cast<uint64_t>(declared),
      static_cast<uint64_t>(available),
      static_cast<int32_t>(bitIndex)) != 0;
}
