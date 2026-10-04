cmake_minimum_required(VERSION 3.22.1)
project(ExpoPicoCore LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(
  ExpoPicoCore
  SHARED
  src/main/cpp/ExpoPicoEskiuBridge.cpp
)

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
