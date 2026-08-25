cmake_minimum_required(VERSION 3.22.1)
project(ExpoPicoIap)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# One shared library per package, named after `android.androidCxxLibName`
# in nitro.json. Those names are unique across the family, so installing
# several @expo-pico/* packages never puts two identically-named .so files
# into one APK.
add_library(ExpoPicoIap SHARED src/main/cpp/ExpoPicoIap.cpp)

# Appends every C++ source nitrogen generated for this package to the
# target above, and links fbjni / React Native / NitroModules.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/ExpoPicoIap+autolinking.cmake)
