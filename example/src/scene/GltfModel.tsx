import { Asset } from 'expo-asset';
import {
  AbstractMesh,
  type Animation,
  Color3,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

// Register the glTF loader plugins against SceneLoader so the
// Babylon SceneLoader knows how to handle `.glb` / `.gltf` URLs.
// Import-for-side-effect is the canonical Babylon pattern.
import '@babylonjs/loaders/glTF';

/**
 * Attaches the demo model to the given Babylon scene.
 *
 * Asset resolution:
 *   - `require('../../assets/models/pico-demo.glb')` — the file is
 *     auto-downloaded on `yarn install` by
 *     `example/scripts/download-demo-model.js` (Khronos BrainStem,
 *     CC0). See `example/assets/models/README.md`.
 *   - When the asset is absent (skipped download, offline, or first
 *     run before the script succeeds), [attachProceduralFallback]
 *     draws a rotating torus knot instead. The scene never ends up
 *     empty.
 *
 * Once the real glTF resolves:
 *   - The scene's meshes + materials are appended under a root
 *     `TransformNode` we control ("pico-demo-root").
 *   - If the glTF carries animation groups (BrainStem ships three), the
 *     first is started on loop.
 *   - The root node is scaled + translated so the loaded model fits in
 *     a ~2-unit cube at origin. Without this, different Khronos samples
 *     render at wildly different scales (BrainStem tiny and off-camera,
 *     Fox enormous, DamagedHelmet above the frustum).
 *
 * Returns `'glb'` when the real model loaded, `'fallback'` when the
 * procedural primitive was drawn instead. Useful for surfacing in the
 * scene HUD.
 */
export async function attachDemoModel(
  scene: Scene
): Promise<'glb' | 'fallback'> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../assets/models/pico-demo.glb');
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    if (!asset.localUri) {
      attachProceduralFallback(scene);
      return 'fallback';
    }

    // Babylon's SceneLoader takes (rootUrl, fileNameOrUri, scene). The
    // two-arg form where rootUrl is empty and the second arg is a
    // full URL also works and is simpler for expo-asset integration.
    const before = new Set(scene.meshes.map((m) => m.uniqueId));
    await SceneLoader.AppendAsync('', asset.localUri, scene);
    const appended = scene.meshes.filter((m) => !before.has(m.uniqueId));

    // Parent every newly-appended root-level mesh under a container
    // node so we can translate / scale the whole import uniformly.
    const root = new TransformNode('pico-demo-root', scene);
    for (const mesh of appended) {
      if (!mesh.parent) mesh.parent = root;
    }

    fitNodeToUnitCube(root, appended);

    // Play the first baked animation clip (BrainStem has three; pick
    // the first arbitrarily). Apps that want clip-picking UI should
    // fork this function rather than add props here.
    if (scene.animationGroups.length > 0) {
      scene.animationGroups[0].start(/* loop */ true);
    }

    return 'glb';
  } catch {
    // Any error → scene keeps working via the fallback primitive.
    attachProceduralFallback(scene);
    return 'fallback';
  }
}

/**
 * Scales + translates the loaded mesh set so its combined bounding
 * box is centered at origin and its longest axis is 2 units.
 *
 * Babylon's bounding-info is lazy — call `refreshBoundingInfo` on each
 * mesh first. We aggregate mins and maxs by hand so the root node's
 * transform fits the whole import.
 */
function fitNodeToUnitCube(
  root: TransformNode,
  appended: AbstractMesh[]
): void {
  if (appended.length === 0) return;
  let min: Vector3 | null = null;
  let max: Vector3 | null = null;

  for (const mesh of appended) {
    mesh.computeWorldMatrix(true);
    const info = mesh.getBoundingInfo();
    const b = info.boundingBox;
    const lo = b.minimumWorld;
    const hi = b.maximumWorld;
    if (!min) min = lo.clone();
    else min = Vector3.Minimize(min, lo);
    if (!max) max = hi.clone();
    else max = Vector3.Maximize(max, hi);
  }

  if (!min || !max) return;
  const size = max.subtract(min);
  const longest = Math.max(size.x, size.y, size.z);
  if (longest <= 0) return;

  const center = min.add(size.scale(0.5));
  const scale = 2 / longest;
  root.scaling = new Vector3(scale, scale, scale);
  root.position = center.scale(-scale);
}

/**
 * Draws a rotating torus knot from a Babylon primitive. Used as the
 * fallback when the glTF asset can't be loaded.
 *
 * Kept intentionally simple — consumers who want a richer fallback
 * should ship a real GLB instead.
 */
function attachProceduralFallback(scene: Scene): void {
  const knot = MeshBuilder.CreateTorusKnot(
    'pico-demo-fallback',
    {
      radius: 0.7,
      tube: 0.22,
      radialSegments: 120,
      tubularSegments: 16,
    },
    scene
  );
  const material = new StandardMaterial('pico-demo-fallback-mat', scene);
  material.diffuseColor = new Color3(0.427, 0.486, 1.0); // #6d7cff
  material.specularColor = new Color3(0.2, 0.2, 0.3);
  knot.material = material;

  // Spin via registered-before-render callback so it rotates every
  // frame without needing the animation-mixer path.
  const axis = new Vector3(1, 1, 0).normalize();
  scene.onBeforeRenderObservable.add(() => {
    // deltaTime is ms; convert to radians-per-second-equivalent rotation.
    const dt = scene.getEngine().getDeltaTime() / 1000;
    knot.rotate(axis, dt * 0.5);
  });
}
