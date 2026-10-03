# Viro + Eskiu ABI

Expose a stable versioned C ABI from expo-pico's Eskiu runtime for direct ViroCore consumption.

Goals:

- no JS hop for renderer-consumed PICO state
- fixed-layout ABI structs
- ABI version/capability negotiation
- pose/vector/quaternion helpers
- scene/plane packet primitives
- C/C++ header usable by ViroCore
