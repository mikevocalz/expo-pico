# Expo Modules 2 + Eskiu runtime architecture

## Goal

Remove Nitro/Nitrogen from the expo-pico runtime without replacing it with another
JSI layer. The public TypeScript packages stay stable. Android enters native code
through Expo Modules 2.0, while portable systems logic moves behind a small C ABI
implemented in Eskiu. ViroCore can consume that same ABI directly.

## Boundary

```
TypeScript / React Native
        |
        v
Expo Modules 2.0 (@ExpoModule / @JS)
        |
        +--> Kotlin: Android lifecycle, Context, PICO Java/Kotlin SDKs
        |
        +--> C ABI (POD + opaque handles only)
                    |
                    v
                 Eskiu
                    |
                    +--> portable state / validation / math / capability policy
                    +--> ViroCore can call the same ABI
```

PICO SDK entry points that are Java/Kotlin APIs stay in a deliberately thin
Kotlin adapter. Eskiu does not replace Android Context, Activity, PackageManager,
or a vendor Java SDK. Moving those into Eskiu would add a JNI wrapper only to
call back into Java and would make the stack heavier, not lighter.

## Consumer-build rule

npm consumers do **not** need `eskiuc`. The compiler is a repository/CI tool.
Release artifacts will package the arm64 object/shared library after the ABI and
size gates pass. `cmake/PicoEskiu.cmake` is opt-in for development and CI.

## Compatibility contract

The Eskiu ABI follows the ViroCore engine ABI rules already used in
`mikevocalz/virocore`:

- fixed-width scalar/POD values at the C boundary;
- opaque integer handles for owned state;
- explicit ownership and release functions;
- versioned ABI negotiation;
- no STL, Kotlin, JSI, React Native, or Eskiu aggregate layout crossing the ABI.

This makes the runtime consumable by Expo Modules and ViroCore without either
side depending on the other's bridge implementation.

## Migration order

1. Pin/probe Eskiu v0.9.2 and establish the shared ABI.
2. Switch core + spatial from Nitro to Expo Modules 2.
3. Switch PPS service packages to Expo Modules 2 and centralize repeated native
   plumbing.
4. Move portable logic to Eskiu module-by-module with before/after APK, AAR,
   symbol-count and runtime-memory evidence.
5. Delete Nitrogen specs, generated JNI anchors, per-package CMake targets,
   Nitro stubs and the template dependency.

The PICO vendor SDK adapters remain Kotlin until PICO exposes equivalent
native/OpenXR APIs.
