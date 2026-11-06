# The one eskiuc version this runtime is built and tested with. The same file
# drives scripts/install-eskiuc.sh, so the installer and the build cannot drift.
file(STRINGS "${CMAKE_CURRENT_LIST_DIR}/eskiu-version.txt" EXPO_PICO_ESKIU_VERSION LIMIT_COUNT 1)
string(STRIP "${EXPO_PICO_ESKIU_VERSION}" EXPO_PICO_ESKIU_VERSION)

# Sets <out_var> to the version `<compiler> --version` reports ("Eskiu 0.14.1
# (LLVM ...)"), or to an empty string when it does not run or prints no version.
function(expo_pico_eskiuc_version compiler out_var)
  execute_process(
    COMMAND "${compiler}" --version
    OUTPUT_VARIABLE _out
    ERROR_VARIABLE _err
    RESULT_VARIABLE _rc
  )
  set(_found "")
  if(_rc EQUAL 0 AND _out MATCHES "([0-9]+\\.[0-9]+\\.[0-9]+)")
    set(_found "${CMAKE_MATCH_1}")
  endif()
  set(${out_var} "${_found}" PARENT_SCOPE)
endfunction()

# Finds eskiuc at exactly EXPO_PICO_ESKIU_VERSION and sets <out_var> to its path.
#
# Search order: the directory of $ESKIUC, then ~/.local/eskiu-<pinned>/bin (where
# scripts/install-eskiuc.sh puts it), and only then PATH. A PATH compiler of
# another version is skipped: a stale ~/.local/eskiu-0.10.0 on PATH once built
# the Quest APK while the repo pinned 0.14.0. The cache entry is cleared first so
# a compiler found by an earlier configure is looked up again. No compiler at the
# pinned version is a configure error.
function(expo_pico_find_eskiuc out_var)
  set(_fix "Run scripts/install-eskiuc.sh (installs ~/.local/eskiu-${EXPO_PICO_ESKIU_VERSION}), or set ESKIUC=/absolute/path/to/eskiuc for eskiuc ${EXPO_PICO_ESKIU_VERSION}.")

  # Older configures cached the compiler as EXPO_PICO_ESKIUC; drop that too.
  unset(EXPO_PICO_ESKIUC CACHE)
  unset(EXPO_PICO_ESKIUC_FOUND CACHE)
  set(_hints "")
  if(DEFINED ENV{ESKIUC} AND NOT "$ENV{ESKIUC}" STREQUAL "")
    get_filename_component(_env_dir "$ENV{ESKIUC}" DIRECTORY)
    list(APPEND _hints "${_env_dir}")
  endif()
  if(DEFINED ENV{HOME})
    list(APPEND _hints "$ENV{HOME}/.local/eskiu-${EXPO_PICO_ESKIU_VERSION}/bin")
  endif()

  find_program(EXPO_PICO_ESKIUC_FOUND NAMES eskiuc HINTS ${_hints} NO_DEFAULT_PATH)
  if(EXPO_PICO_ESKIUC_FOUND)
    expo_pico_eskiuc_version("${EXPO_PICO_ESKIUC_FOUND}" _version)
    if(NOT _version STREQUAL EXPO_PICO_ESKIU_VERSION)
      message(FATAL_ERROR
        "expo-pico: ${EXPO_PICO_ESKIUC_FOUND} is eskiuc '${_version}', this build needs ${EXPO_PICO_ESKIU_VERSION}. ${_fix}")
    endif()
  else()
    unset(EXPO_PICO_ESKIUC_FOUND CACHE)
    find_program(EXPO_PICO_ESKIUC_FOUND NAMES eskiuc)
    if(EXPO_PICO_ESKIUC_FOUND)
      expo_pico_eskiuc_version("${EXPO_PICO_ESKIUC_FOUND}" _version)
      if(NOT _version STREQUAL EXPO_PICO_ESKIU_VERSION)
        message(FATAL_ERROR
          "expo-pico: eskiuc on PATH (${EXPO_PICO_ESKIUC_FOUND}) is '${_version}', this build needs ${EXPO_PICO_ESKIU_VERSION}. ${_fix}")
      endif()
    endif()
  endif()

  if(NOT EXPO_PICO_ESKIUC_FOUND)
    message(FATAL_ERROR "expo-pico: eskiuc ${EXPO_PICO_ESKIU_VERSION} not found. ${_fix}")
  endif()
  message(STATUS "expo-pico: eskiuc ${EXPO_PICO_ESKIU_VERSION} at ${EXPO_PICO_ESKIUC_FOUND}")
  set(${out_var} "${EXPO_PICO_ESKIUC_FOUND}" PARENT_SCOPE)
  unset(EXPO_PICO_ESKIUC_FOUND CACHE)
endfunction()

# Returns a validated release object, or an empty string for a source checkout.
# A partial/corrupt release is an error, never a request that an app install a
# compiler. The JSON is data only; no generated CMake or shell code is executed.
function(expo_pico_prebuilt_eskiu_object runtime_dir out_var)
  set(${out_var} "" PARENT_SCOPE)
  set(_directory "${runtime_dir}/prebuilt/android/arm64-v8a")
  if(NOT EXISTS "${runtime_dir}/prebuilt" AND NOT EXPO_PICO_ESKIU_REQUIRE_PREBUILT)
    return()
  endif()
  set(_manifest "${_directory}/manifest.json")
  set(_object "${_directory}/expo_pico_eskiu_runtime.o")
  set(_fix "Reinstall @expo-pico/core from a complete release, or rebuild its release artifacts from source.")
  if(NOT EXISTS "${_manifest}" OR NOT EXISTS "${_object}")
    message(FATAL_ERROR "expo-pico: packaged Eskiu runtime is incomplete. ${_fix}")
  endif()
  file(READ "${_manifest}" _metadata)
  set(_expected_schemaVersion "1")
  set(_expected_compilerVersion "${EXPO_PICO_ESKIU_VERSION}")
  set(_expected_target "aarch64-linux-android")
  set(_expected_abi "arm64-v8a")
  set(_expected_relocation "pic")
  set(_expected_freestanding "ON")
  set(_expected_optimization "O2")
  set(_expected_objectFilename "expo_pico_eskiu_runtime.o")
  foreach(_field IN ITEMS schemaVersion compilerVersion target abi relocation freestanding optimization objectFilename)
    string(JSON _value ERROR_VARIABLE _error GET "${_metadata}" "${_field}")
    if(_error OR NOT "${_value}" STREQUAL "${_expected_${_field}}")
      message(FATAL_ERROR "expo-pico: packaged Eskiu runtime has invalid ${_field}. ${_fix}")
    endif()
  endforeach()
  string(JSON _expected_hash ERROR_VARIABLE _error GET "${_metadata}" objectSha256)
  file(SHA256 "${_object}" _actual_hash)
  if(_error OR NOT "${_actual_hash}" STREQUAL "${_expected_hash}")
    message(FATAL_ERROR "expo-pico: packaged Eskiu object checksum mismatch. ${_fix}")
  endif()
  file(SIZE "${_object}" _size)
  if(_size LESS 64)
    message(FATAL_ERROR "expo-pico: packaged Eskiu object is truncated. ${_fix}")
  endif()
  file(READ "${_object}" _header LIMIT 20 HEX)
  string(SUBSTRING "${_header}" 0 14 _ident)
  string(SUBSTRING "${_header}" 32 4 _type)
  string(SUBSTRING "${_header}" 36 4 _machine)
  if(NOT _ident STREQUAL "7f454c46020101" OR NOT _type STREQUAL "0100" OR NOT _machine STREQUAL "b700")
    message(FATAL_ERROR "expo-pico: packaged Eskiu object is not ELF64 AArch64 relocatable code. ${_fix}")
  endif()

  # Compare the complete source inventory as well as each digest. Added,
  # removed, or modified sources cannot silently use an older object.
  file(GLOB_RECURSE _sources RELATIVE "${runtime_dir}"
    "${runtime_dir}/src/*.esk" "${runtime_dir}/include/*.h")
  list(APPEND _sources "cmake/eskiu-version.txt")
  list(SORT _sources)
  list(LENGTH _sources _source_count)
  string(JSON _manifest_count ERROR_VARIABLE _error LENGTH "${_metadata}" sources)
  if(_error OR NOT "${_manifest_count}" STREQUAL "${_source_count}")
    message(FATAL_ERROR "expo-pico: packaged Eskiu source inventory mismatch. ${_fix}")
  endif()
  set(_index 0)
  foreach(_source IN LISTS _sources)
    string(JSON _path ERROR_VARIABLE _error GET "${_metadata}" sources ${_index} path)
    if(_error OR NOT "${_path}" STREQUAL "${_source}")
      message(FATAL_ERROR "expo-pico: packaged Eskiu source inventory mismatch. ${_fix}")
    endif()
    string(JSON _expected_hash ERROR_VARIABLE _error GET "${_metadata}" sources ${_index} sha256)
    file(SHA256 "${runtime_dir}/${_source}" _actual_hash)
    if(_error OR NOT "${_actual_hash}" STREQUAL "${_expected_hash}")
      message(FATAL_ERROR "expo-pico: packaged Eskiu source checksum mismatch for ${_source}. ${_fix}")
    endif()
    math(EXPR _index "${_index} + 1")
  endforeach()
  message(STATUS "expo-pico: using packaged Eskiu ${EXPO_PICO_ESKIU_VERSION} runtime for arm64-v8a")
  set(${out_var} "${_object}" PARENT_SCOPE)
endfunction()

function(expo_pico_add_eskiu_runtime target)
  if(NOT ANDROID)
    return()
  endif()

  set(ESKIU_RUNTIME_DIR "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/..")
  target_include_directories(${target} PRIVATE "${ESKIU_RUNTIME_DIR}/include")

  if(NOT CMAKE_ANDROID_ARCH_ABI STREQUAL "arm64-v8a")
    message(STATUS "expo-pico: Eskiu runtime skipped for ${CMAKE_ANDROID_ARCH_ABI}")
    return()
  endif()

  expo_pico_prebuilt_eskiu_object("${ESKIU_RUNTIME_DIR}" ESKIU_OBJECT)
  if(ESKIU_OBJECT)
    # Re-run validation if an installed artifact or any tracked source changes
    # after the first configure, including a newly added source file.
    file(GLOB_RECURSE _runtime_inputs CONFIGURE_DEPENDS
      "${ESKIU_RUNTIME_DIR}/src/*.esk" "${ESKIU_RUNTIME_DIR}/include/*.h")
    set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
      ${_runtime_inputs}
      "${ESKIU_RUNTIME_DIR}/cmake/eskiu-version.txt"
      "${ESKIU_RUNTIME_DIR}/prebuilt/android/arm64-v8a/manifest.json"
      "${ESKIU_OBJECT}")
    set_source_files_properties("${ESKIU_OBJECT}" PROPERTIES EXTERNAL_OBJECT TRUE)
    target_sources(${target} PRIVATE "${ESKIU_OBJECT}")
    target_compile_definitions(${target} PRIVATE EXPO_PICO_ESKIU=1)
    return()
  endif()

  expo_pico_find_eskiuc(EXPO_PICO_ESKIUC)

  set(ESKIU_SOURCE "${ESKIU_RUNTIME_DIR}/src/runtime.esk")
  # runtime.esk imports these; list them so an edit to any one recompiles.
  file(GLOB ESKIU_IMPORTS CONFIGURE_DEPENDS "${ESKIU_RUNTIME_DIR}/src/icon/*.esk")
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
    DEPENDS "${ESKIU_SOURCE}" ${ESKIU_IMPORTS}
    COMMENT "Compiling expo-pico Eskiu runtime"
    VERBATIM
  )

  set_source_files_properties("${ESKIU_OBJECT}" PROPERTIES GENERATED TRUE EXTERNAL_OBJECT TRUE)
  target_sources(${target} PRIVATE "${ESKIU_OBJECT}")
  target_compile_definitions(${target} PRIVATE EXPO_PICO_ESKIU=1)
endfunction()
