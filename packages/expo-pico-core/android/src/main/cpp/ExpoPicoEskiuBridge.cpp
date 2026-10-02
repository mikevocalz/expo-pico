#include <jni.h>
#include "expo_pico_eskiu.h"

extern "C" JNIEXPORT jdouble JNICALL
Java_expo_modules_pico_PicoEskiuBridge_hapticAmplitude(
    JNIEnv*, jobject, jdouble amplitude) {
  return static_cast<jdouble>(
      expo_pico_haptic_amplitude(static_cast<float>(amplitude)));
}

extern "C" JNIEXPORT jdouble JNICALL
Java_expo_modules_pico_PicoEskiuBridge_passthroughLevel(
    JNIEnv*, jobject, jdouble level) {
  return static_cast<jdouble>(
      expo_pico_passthrough_level(static_cast<float>(level)));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_expo_modules_pico_PicoEskiuBridge_capabilityEnabled(
    JNIEnv*, jobject, jlong declared, jlong available, jint bit) {
  return expo_pico_capability_enabled(
      static_cast<uint64_t>(declared),
      static_cast<uint64_t>(available),
      static_cast<int>(bit)) ? JNI_TRUE : JNI_FALSE;
}
