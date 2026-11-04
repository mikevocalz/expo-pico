---
'@expo-pico/core': patch
---

The Eskiu runtime builds with eskiuc 0.14.1, and only with that version. `scripts/install-eskiuc.sh` and `ExpoPicoEskiu.cmake` both read it from `cmake/eskiu-version.txt` in the runtime. The CMake lookup clears any cached compiler, searches the directory of `$ESKIUC` and `~/.local/eskiu-0.14.1/bin` before `PATH`, and checks `eskiuc --version`; a missing compiler or one at another version stops the arm64 configure with an error that names `scripts/install-eskiuc.sh` and `ESKIUC=`. Before this, any `eskiuc` on `PATH` was used, and a stale 0.10.0 built a Quest APK while the repo pinned 0.14.0. `EXPO_PICO_REQUIRE_ESKIU` is gone, since the compiler is now always required. 0.14.1 adds no breaking changes: the runtime uses no packed structs, and the icon tests and the aarch64-linux-android object compile pass on it.
