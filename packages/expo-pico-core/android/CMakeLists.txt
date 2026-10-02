cmake_minimum_required(VERSION 3.22.1)
project(ExpoPicoEskiu LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(ESKIU_SOURCE "${CMAKE_CURRENT_SOURCE_DIR}/src/main/eskiu/pico_runtime.esk")
set(ESKIU_OBJECT "${CMAKE_CURRENT_BINARY_DIR}/pico_runtime.o")
find_program(ESKIUC NAMES eskiuc)

set(RUNTIME_SOURCES
  src/main/cpp/PicoEskiuJni.cpp
)

if(ESKIUC AND CMAKE_ANDROID_ARCH_ABI STREQUAL "arm64-v8a")
  add_custom_command(
    OUTPUT "${ESKIU_OBJECT}"
    COMMAND "${ESKIUC}"
            "${ESKIU_SOURCE}"
            --target aarch64-unknown-linux-gnu
            --freestanding
            -O2
            -o "${ESKIU_OBJECT}"
    DEPENDS "${ESKIU_SOURCE}"
    COMMENT "Compiling expo-pico Eskiu arm64 runtime"
    VERBATIM
  )
  set_source_files_properties("${ESKIU_OBJECT}" PROPERTIES GENERATED TRUE EXTERNAL_OBJECT TRUE)
  list(APPEND RUNTIME_SOURCES "${ESKIU_OBJECT}")
  message(STATUS "expo-pico: using Eskiu runtime for arm64")
else()
  list(APPEND RUNTIME_SOURCES src/main/cpp/PicoEskiuFallback.cpp)
  message(STATUS "expo-pico: eskiuc unavailable or non-arm64 ABI; using ABI-compatible fallback")
endif()

add_library(ExpoPicoEskiu SHARED ${RUNTIME_SOURCES})
target_include_directories(ExpoPicoEskiu PUBLIC src/main/cpp/include)
set_target_properties(ExpoPicoEskiu PROPERTIES
  CXX_VISIBILITY_PRESET default
  VISIBILITY_INLINES_HIDDEN OFF
)
