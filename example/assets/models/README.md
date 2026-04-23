# PICO example 3D assets

`pico-demo.glb` is **auto-downloaded** by the example's `postinstall` hook
from the Khronos glTF Sample Models repo (CC0 / public domain). You do
not need to commit it — `.gitignore` excludes it, and every checkout
regenerates it.

## Automation

| Command                    | Behavior                                                                 |
| -------------------------- | ------------------------------------------------------------------------ |
| `yarn install` (in root or example) | Runs `example/scripts/download-demo-model.js --post-install`. Network failures degrade gracefully — the install never breaks because of a flaky CDN. |
| `yarn demo:model`          | Manual re-download (always refreshes, verbose logging). Non-zero exit on failure so you can gate CI on it. |
| `yarn demo:model:clean`    | Removes the file locally. Useful to verify the procedural fallback still renders correctly. |

### Skipping the download

Set `EXPO_PICO_SKIP_DEMO_MODEL=1` in the environment if you want to:

- Work offline in a clean workspace.
- Ship your own GLB in this directory (place your file at
  `pico-demo.glb` and the script will treat it as already-present).
- Run CI with strict no-network postinstall policies.

### Model choice

BrainStem (Khronos sample):

- ~3 MB binary.
- CC0 / public domain.
- Three baked skeletal-animation clips. `GltfModel.tsx` picks up the
  first clip automatically via `THREE.AnimationMixer`.
- Reasonable visual density — exercises the full glTF 2.0 loader path
  (vertex colors, PBR materials, skinning, morph targets).

## Swap in a different GLB

If you want to test with a different model:

1. `yarn demo:model:clean` to remove the auto-downloaded one.
2. Drop your `.glb` file at `pico-demo.glb` in this directory.
3. Set `EXPO_PICO_SKIP_DEMO_MODEL=1` so `postinstall` doesn't overwrite
   it on the next `yarn install`.

Or pin a different URL in `example/scripts/download-demo-model.js`'s
`SOURCE_URL` constant. Keep to a permissively-licensed source (Khronos
samples + most Sketchfab CC-BY authors are safe; assets from asset
stores usually are not).

## Procedural fallback

`GltfModel.tsx` always renders _something_ — if `pico-demo.glb` is
absent at load time, it falls through to a rotating torus-knot made
of three.js primitives. The scene stays animating either way; the
overall app never breaks because of an asset miss.
