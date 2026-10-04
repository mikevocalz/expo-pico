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

namespace {
#ifdef EXPO_PICO_ESKIU
// Holds a JNI UTF-8 string for the duration of one call.
class ScopedUtf {
 public:
  ScopedUtf(JNIEnv* env, jstring value)
      : env_(env), value_(value), chars_(env->GetStringUTFChars(value, nullptr)) {}
  ~ScopedUtf() {
    if (chars_ != nullptr) env_->ReleaseStringUTFChars(value_, chars_);
  }
  ScopedUtf(const ScopedUtf&) = delete;
  ScopedUtf& operator=(const ScopedUtf&) = delete;
  const char* get() const { return chars_; }

 private:
  JNIEnv* env_;
  jstring value_;
  const char* chars_;
};

void writeCounts(JNIEnv* env, jintArray counts, uint32_t vertices, uint32_t indices) {
  const jint values[2] = {static_cast<jint>(vertices), static_cast<jint>(indices)};
  env->SetIntArrayRegion(counts, 0, 2, values);
}
#else
// Returned by the icon mesh entry points when this library was built without
// the Eskiu runtime (eskiuc absent, or a non-arm64 ABI). Kotlin maps it to
// ESKIU_RUNTIME_UNAVAILABLE. The mesher is not duplicated in C++.
constexpr jint kIconRuntimeUnavailable = -100;
#endif
} // namespace

// counts: int[2] receiving {vertexCount, indexCount}. Returns an
// EXPO_PICO_ICON_* status, or kIconRuntimeUnavailable.
extern "C" JNIEXPORT jint JNICALL
Java_expo_modules_pico_PicoEskiuBridge_iconMeshSize(
    JNIEnv* env, jobject, jstring svg, jfloat strokeWidth, jfloat tolerance, jintArray counts) {
#ifdef EXPO_PICO_ESKIU
  ScopedUtf text(env, svg);
  if (text.get() == nullptr) return EXPO_PICO_ICON_ERR_NULL;
  uint32_t vertices = 0;
  uint32_t indices = 0;
  const int32_t rc = expo_pico_icon_mesh_size(text.get(), strokeWidth, tolerance, &vertices, &indices);
  writeCounts(env, counts, vertices, indices);
  return rc;
#else
  (void)env; (void)svg; (void)strokeWidth; (void)tolerance; (void)counts;
  return kIconRuntimeUnavailable;
#endif
}

// vertices: float[2 * vertexCapacity], indices: int[indexCapacity] (uint32 bit
// patterns; values stay below 2^24). Both arrays are owned by the caller.
extern "C" JNIEXPORT jint JNICALL
Java_expo_modules_pico_PicoEskiuBridge_iconMeshFill(
    JNIEnv* env, jobject, jstring svg, jfloat strokeWidth, jfloat tolerance,
    jfloatArray vertices, jintArray indices, jintArray counts) {
#ifdef EXPO_PICO_ESKIU
  ScopedUtf text(env, svg);
  if (text.get() == nullptr) return EXPO_PICO_ICON_ERR_NULL;
  const jsize vertexFloats = env->GetArrayLength(vertices);
  const jsize indexCapacity = env->GetArrayLength(indices);
  jfloat* xy = env->GetFloatArrayElements(vertices, nullptr);
  jint* idx = env->GetIntArrayElements(indices, nullptr);
  uint32_t vertexCount = 0;
  uint32_t indexCount = 0;
  int32_t rc = EXPO_PICO_ICON_ERR_NULL;
  if (xy != nullptr && idx != nullptr) {
    rc = expo_pico_icon_mesh_fill(
        text.get(), strokeWidth, tolerance,
        xy, static_cast<uint32_t>(vertexFloats / 2),
        reinterpret_cast<uint32_t*>(idx), static_cast<uint32_t>(indexCapacity),
        &vertexCount, &indexCount);
  }
  if (idx != nullptr) env->ReleaseIntArrayElements(indices, idx, 0);
  if (xy != nullptr) env->ReleaseFloatArrayElements(vertices, xy, 0);
  writeCounts(env, counts, vertexCount, indexCount);
  return rc;
#else
  (void)env; (void)svg; (void)strokeWidth; (void)tolerance;
  (void)vertices; (void)indices; (void)counts;
  return kIconRuntimeUnavailable;
#endif
}
