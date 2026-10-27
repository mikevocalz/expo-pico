cmake_minimum_required(VERSION 3.22.1)
project(ExpoPicoAchievements LANGUAGES C CXX)

# One shared library per package, named after `android.cxxLibName` in
# nitro.json. Those names are unique across the family, so installing
# several @expo-pico/* packages never puts two identically-named .so files
# into one APK.
add_library(ExpoPicoAchievements SHARED src/main/cpp/ExpoPicoAchievements.cpp)
target_compile_features(ExpoPicoAchievements PUBLIC cxx_std_20)

# Nitrogen V1: adds every generated C++ source, include dir, and the fbjni /
# React Native / NitroModules links to the target above.
include(${CMAKE_CURRENT_SOURCE_DIR}/../nitrogen/generated/android/ExpoPicoAchievements+autolinking.cmake)

find_library(LOG_LIB log)
target_link_libraries(ExpoPicoAchievements ${LOG_LIB} android)
