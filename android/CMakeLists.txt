cmake_minimum_required(VERSION 3.22.1)
project(ExpoPicoCore LANGUAGES C CXX)

# One shared library per package, named after `android.cxxLibName` in
# nitro.json. Those names are unique across the family, so installing
# several @expo-pico/* packages never puts two identically-named .so files
# into one APK. It carries both the Nitro HybridObjects and the Eskiu JNI
# bridge.
add_library(
  ExpoPicoCore
  SHARED
  src/main/cpp/ExpoPicoCore.cpp
  src/main/cpp/ExpoPicoEskiuBridge.cpp
)
target_compile_features(ExpoPicoCore PUBLIC cxx_std_20)

# Nitrogen V1: adds every generated C++ source, include dir, and the fbjni /
# React Native / NitroModules links to the target above.
include(${CMAKE_CURRENT_SOURCE_DIR}/../nitrogen/generated/android/ExpoPicoCore+autolinking.cmake)

# Eskiu owns allocation-free runtime math/state on PICO arm64. The helper
# always exposes the stable C ABI headers and falls back cleanly when eskiuc
# is unavailable for a non-PICO/mobile CI build.
#
# Inside the monorepo the runtime lives in packages/internal. A packed copy of
# this package (git release branch, npm tarball) carries it at
# android/eskiu-runtime instead, because packages/internal does not ship.
set(EXPO_PICO_ESKIU_CMAKE "${CMAKE_CURRENT_LIST_DIR}/eskiu-runtime/cmake/ExpoPicoEskiu.cmake")
if(NOT EXISTS "${EXPO_PICO_ESKIU_CMAKE}")
  set(EXPO_PICO_ESKIU_CMAKE "${CMAKE_CURRENT_LIST_DIR}/../../internal/pico-eskiu-runtime/cmake/ExpoPicoEskiu.cmake")
endif()
include(${EXPO_PICO_ESKIU_CMAKE})
expo_pico_add_eskiu_runtime(ExpoPicoCore)

find_library(LOG_LIB log)
target_link_libraries(ExpoPicoCore ${LOG_LIB} android)
