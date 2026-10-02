#pragma once
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define PICO_ESKIU_ABI_VERSION 1u

// Stable, language-neutral ABI shared by expo-pico and Viro/ViroCore.
// Keep exported values POD/scalars; never expose Eskiu-owned aggregate layouts.
uint32_t pico_eskiu_abi_version(void);
int32_t pico_eskiu_android_probe(int32_t value);

#ifdef __cplusplus
}
#endif
