# PicoEskiu.cmake
#
# Opt-in Eskiu object compiler helper shared with the ViroCore integration.
# It is intentionally NOT included by any consumer target by default: npm
# consumers must not need an Eskiu compiler installed just to build an Expo app.

include_guard(GLOBAL)
include(CMakeParseArguments)

set(PICO_ESKIU_EXPECTED_VERSION "0.9.2" CACHE STRING "Pinned Eskiu compiler version")
find_program(PICO_ESKIU_COMPILER NAMES eskiuc)

function(pico_eskiu_require_compiler)
  if(NOT PICO_ESKIU_COMPILER)
    message(FATAL_ERROR
      "eskiuc was not found. Install the pinned Eskiu v${PICO_ESKIU_EXPECTED_VERSION} "
      "toolchain or set PICO_ESKIU_COMPILER.")
  endif()

  execute_process(
    COMMAND "${PICO_ESKIU_COMPILER}" --version
    OUTPUT_VARIABLE _stdout
    ERROR_VARIABLE _stderr
    RESULT_VARIABLE _result
    OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_STRIP_TRAILING_WHITESPACE
  )
  set(_version "${_stdout}${_stderr}")
  if(NOT _result EQUAL 0)
    message(FATAL_ERROR "Failed to run eskiuc --version: ${_version}")
  endif()
  string(REGEX MATCH "^Eskiu +([0-9]+\\.[0-9]+\\.[0-9]+)( .*)?$" _match "${_version}")
  set(_token "${CMAKE_MATCH_1}")
  if(_token STREQUAL "" OR NOT _token STREQUAL PICO_ESKIU_EXPECTED_VERSION)
    message(FATAL_ERROR
      "expo-pico expects exactly Eskiu ${PICO_ESKIU_EXPECTED_VERSION}; found: ${_version}")
  endif()
endfunction()

# pico_eskiu_compile_object(
#   OUT_VAR
#   SOURCE <file.esk>
#   [NAME <stem>]
#   [TARGET <llvm-triple>]
#   [OPT <0|1|2|3>]
#   [FREESTANDING]
#   [SAFE]
# )
function(pico_eskiu_compile_object OUT_VAR)
  set(options FREESTANDING SAFE)
  set(oneValueArgs SOURCE NAME TARGET OPT)
  cmake_parse_arguments(PE "${options}" "${oneValueArgs}" "" ${ARGN})

  if(NOT PE_SOURCE)
    message(FATAL_ERROR "pico_eskiu_compile_object requires SOURCE")
  endif()
  pico_eskiu_require_compiler()

  get_filename_component(_source "${PE_SOURCE}" ABSOLUTE BASE_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
  get_filename_component(_stem "${_source}" NAME_WE)
  if(PE_NAME)
    set(_stem "${PE_NAME}")
  endif()

  set(_out_dir "${CMAKE_CURRENT_BINARY_DIR}/eskiu")
  set(_object "${_out_dir}/${_stem}.o")
  set(_args "${_source}" -c -o "${_object}")

  if(PE_TARGET)
    list(APPEND _args --target "${PE_TARGET}")
  endif()
  if(DEFINED PE_OPT AND NOT PE_OPT STREQUAL "")
    if(NOT PE_OPT MATCHES "^[0-3]$")
      message(FATAL_ERROR "OPT must be 0, 1, 2, or 3")
    endif()
    list(APPEND _args "-O${PE_OPT}")
  endif()
  if(PE_FREESTANDING)
    list(APPEND _args --freestanding)
  endif()
  if(PE_SAFE)
    list(APPEND _args --safe)
  endif()

  add_custom_command(
    OUTPUT "${_object}"
    COMMAND "${CMAKE_COMMAND}" -E make_directory "${_out_dir}"
    COMMAND "${PICO_ESKIU_COMPILER}" ${_args}
    DEPENDS "${_source}"
    COMMENT "Compiling Eskiu object ${_stem}.o"
    VERBATIM
  )
  set_source_files_properties("${_object}" PROPERTIES GENERATED TRUE EXTERNAL_OBJECT TRUE)
  set(${OUT_VAR} "${_object}" PARENT_SCOPE)
endfunction()
