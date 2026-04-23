import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFrame } from '@react-three/fiber/native';
import { AnimationMixer, Box3, Vector3 } from 'three';
import type { AnimationAction, AnimationClip, Group, Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * Loads and animates a glTF/GLB model for the PICO example scene.
 *
 * Asset resolution:
 *   - `require('../../assets/models/pico-demo.glb')`. The file is
 *     auto-downloaded on `yarn install` by
 *     `example/scripts/download-demo-model.js` (Khronos BrainStem,
 *     CC0). See `assets/models/README.md`.
 *   - When the asset is absent (skipped download, offline, or first
 *     run before the script succeeds), [ProceduralFallback] renders a
 *     rotating torus-knot instead. The app never errors on a missing
 *     GLB.
 *
 * Once the real GLB resolves:
 *   - The scene is attached under the wrapping `<group>`.
 *   - If the GLB carries animation clips (BrainStem ships three), a
 *     [AnimationMixer] is created and the first clip is played on
 *     loop. Clip choice is intentionally simple — apps that want
 *     clip-picking UI should fork this component rather than add
 *     props here.
 *   - The model is re-centered and scaled so it fits in a ~2-unit
 *     cube at the origin. BrainStem's native scale would render it
 *     far below the camera frustum otherwise; auto-fitting keeps the
 *     demo robust if you swap in a different sample.
 *
 * The wrapping `<group>` also rotates on Y and bobs on Y via a sin
 * wave, independent of any clip animation — so even a static GLB has
 * motion.
 */
export function GltfModel(): JSX.Element {
  const group = useRef<Group>(null);
  const [gltfScene, setGltfScene] = useState<Group | null>(null);
  const elapsed = useRef(0);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionRef = useRef<AnimationAction | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tryLoad(): Promise<void> {
      try {
        // Require.resolve-style asset resolution. Wrapped in try/catch so a
        // missing bundled GLB falls through to the procedural fallback
        // without crashing the scene.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('../../assets/models/pico-demo.glb');
        const asset = Asset.fromModule(mod);
        await asset.downloadAsync();
        if (!asset.localUri || cancelled) return;

        const loader = new GLTFLoader();
        loader.load(
          asset.localUri,
          (gltf) => {
            if (cancelled) return;
            const scene = gltf.scene;
            fitToUnitCube(scene);
            setGltfScene(scene);
            attachAnimation(scene, gltf.animations);
          },
          undefined,
          // Any loader error → stay on procedural fallback.
          () => {
            /* ignore — fallback path */
          }
        );
      } catch {
        // Asset not bundled; fallback renders.
      }
    }

    function attachAnimation(scene: Group, clips: AnimationClip[] | undefined): void {
      if (!clips || clips.length === 0) return;
      const mixer = new AnimationMixer(scene);
      const action = mixer.clipAction(clips[0]);
      action.play();
      mixerRef.current = mixer;
      actionRef.current = action;
    }

    void tryLoad();
    return () => {
      cancelled = true;
      if (actionRef.current) {
        actionRef.current.stop();
        actionRef.current = null;
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
    };
  }, []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    // Advance any baked animation clip first so its timing doesn't
    // drift when the wrapping-group math below runs.
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    if (group.current) {
      group.current.rotation.y += delta * 0.6;
      group.current.position.y = Math.sin(elapsed.current * 1.4) * 0.15;
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]} scale={1}>
      {gltfScene ? <primitive object={gltfScene} /> : <ProceduralFallback />}
    </group>
  );
}

/**
 * Re-center and normalize a loaded glTF scene into a ~2-unit cube at the
 * origin. Without this step, different sample models render at wildly
 * different scales — BrainStem comes out ~0.5 m tall below the camera,
 * the Fox ends up several meters wide, and static samples like
 * DamagedHelmet land above the frustum.
 *
 * The fit computes the loaded scene's axis-aligned bounding box, then
 * applies a uniform scale + translate to move the box center to origin
 * and cap its longest axis at 2 units.
 */
function fitToUnitCube(scene: Group): void {
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());

  const longest = Math.max(size.x, size.y, size.z);
  if (longest > 0) {
    const scale = 2 / longest;
    scene.scale.multiplyScalar(scale);
    scene.position.sub(center.multiplyScalar(scale));
  }
}

/**
 * A torus-knot rendered from three.js primitives. Used when a bundled
 * glTF is not available so the PICO scene always has something moving
 * on screen.
 *
 * Kept simple: a single mesh with a standard material. Consumers who
 * want richer fallback visuals should ship a real GLB instead — that's
 * the whole point of the fallback being minimal.
 */
function ProceduralFallback(): JSX.Element {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () => ({
      color: '#6d7cff',
      metalness: 0.25,
      roughness: 0.35,
    }),
    []
  );

  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta * 0.3;
    }
  });

  return (
    <mesh ref={mesh}>
      <torusKnotGeometry args={[0.6, 0.2, 120, 16]} />
      <meshStandardMaterial
        color={material.color}
        metalness={material.metalness}
        roughness={material.roughness}
      />
    </mesh>
  );
}

export default GltfModel;
