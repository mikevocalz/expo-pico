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
