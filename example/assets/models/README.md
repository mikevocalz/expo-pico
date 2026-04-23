# PICO example 3D assets

Drop a single `pico-demo.glb` (glTF 2.0 binary) into this directory and the
example app will pick it up automatically on the next Metro restart.

Why this directory ships empty:

- The example repo is scaffolded through text-only tooling, which cannot
  create or commit a valid binary GLB file.
- Shipping a placeholder GLB would mislead reviewers into thinking the
  3D pipeline had been validated against a real asset.
- The code in `../src/scene/GltfModel.tsx` already tries to
  `require('../../assets/models/pico-demo.glb')` and falls through to a
  procedural torus-knot when the file is absent, so the scene always
  renders.

## Recommended sample

The Khronos sample models repository ships permissively-licensed test
assets. Good candidates (all CC0 / public domain):

- `DamagedHelmet.glb` — PBR-heavy, no animation.
- `BrainStem.glb` — skeletal animation. Best choice if you want the
  "animating model" to exercise the animation clip path inside
  `GltfModel.tsx`.
- `Fox.glb` — skeletal animation with three built-in clips.

```bash
# Download any Khronos sample
curl -L -o pico-demo.glb \
  https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb
```

## Animation clips

If your GLB carries animation clips and you want them to play, extend
`GltfModel.tsx` to construct a `THREE.AnimationMixer` from the loaded
`gltf.animations` array and advance it inside the existing `useFrame`
callback. The wrapping `<group>` rotation / bobbing we already apply is
scene-level — it composes cleanly on top of clip-driven mesh skinning.
