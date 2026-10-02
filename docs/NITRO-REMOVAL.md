# Nitro/Nitrogen removal gate

This is the final migration gate for the Expo PICO Eskiu + Expo Modules v2 stack.

Run:

```bash
yarn audit:native-bridge
yarn audit:native-bridge:strict
```

The strict command must report **0 remaining paths** before this PR is merge-ready.

The audit intentionally scans source/package/build configuration, but ignores generated
build output and node_modules. Historical documentation can be retained only after it no
longer participates in package scripts, native builds, or runtime resolution.

The starter template no longer installs `react-native-nitro-modules`; new Expo PICO apps
therefore enter through Expo Modules v2 + the shared Eskiu ABI instead of inheriting the
temporary compatibility layer.
