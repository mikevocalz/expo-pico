//
// ExpoPicoCore.cpp
//
// JNI entry point for this package's Nitro module.
//
// Nitrogen generates `registerAllNatives()` but nothing calls it: the header
// says to invoke it from `JNI_OnLoad` in the cpp-adapter, and this file used to
// be an empty anchor. The library therefore shipped in the APK with the symbol
// exported and unreachable, so no HybridObject was ever registered and every
// `@expo-pico` call fell back to its native-absent default on real hardware.
//
// `System.loadLibrary` (from the generated `ExpoPicoCoreOnLoad.initializeNative()`,
// invoked by PicoCorePackage) triggers this.
//
// Note the generated header's example names `registerNatives()`; the symbol it
// actually declares is `registerAllNatives()`.
//
#include <fbjni/fbjni.h>
#include <jni.h>

#include "ExpoPicoCoreOnLoad.hpp"

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, [] {
    margelo::nitro::expopico::picocore::registerAllNatives();
  });
}
