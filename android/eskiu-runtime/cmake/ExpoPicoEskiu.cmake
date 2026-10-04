function(expo_pico_add_eskiu_runtime target)
  if(NOT ANDROID)
    return()
  endif()

  if(NOT CMAKE_ANDROID_ARCH_ABI STREQUAL "arm64-v8a")
    message(STATUS "expo-pico: Eskiu runtime skipped for ${CMAKE_ANDROID_ARCH_ABI}")
    return()
  endif()

  set(ESKIU_RUNTIME_DIR "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/..")
  target_include_directories(${target} PRIVATE "${ESKIU_RUNTIME_DIR}/include")

  if(DEFINED ENV{ESKIUC})
    set(EXPO_PICO_ESKIUC "$ENV{ESKIUC}")
  else()
    find_program(EXPO_PICO_ESKIUC eskiuc)
  endif()

  if(NOT EXPO_PICO_ESKIUC)
    if(EXPO_PICO_REQUIRE_ESKIU)
      message(FATAL_ERROR "expo-pico: eskiuc >= 0.9.2 is required for this PICO build")
    endif()
    message(STATUS "expo-pico: eskiuc not found; building without Eskiu runtime")
    return()
  endif()

  set(ESKIU_SOURCE "${ESKIU_RUNTIME_DIR}/src/runtime.esk")
  set(ESKIU_OBJECT "${CMAKE_CURRENT_BINARY_DIR}/expo_pico_eskiu_runtime.o")

  add_custom_command(
    OUTPUT "${ESKIU_OBJECT}"
    COMMAND "${EXPO_PICO_ESKIUC}"
            "${ESKIU_SOURCE}"
            --target aarch64-linux-android
            --reloc pic
            --freestanding
            -O2
            -o "${ESKIU_OBJECT}"
    DEPENDS "${ESKIU_SOURCE}"
    COMMENT "Compiling expo-pico Eskiu runtime"
    VERBATIM
  )

  set_source_files_properties("${ESKIU_OBJECT}" PROPERTIES GENERATED TRUE EXTERNAL_OBJECT TRUE)
  target_sources(${target} PRIVATE "${ESKIU_OBJECT}")
  target_compile_definitions(${target} PRIVATE EXPO_PICO_ESKIU=1)
endfunction()
