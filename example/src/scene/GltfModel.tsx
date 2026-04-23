import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFrame } from '@react-three/fiber/native';
import type { Group, Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * Loads and animates a glTF/GLB model for the PICO example scene.
 *
 * Asset resolution order:
 *
 *   1. `../../assets/models/pico-demo.glb` — a real GLB shipped with the
 *      example. Drop any valid glTF 2.0 binary file at that path and it
 *      will be picked up automatically (declared in `assetBundlePatterns`
 *      in `app.config.ts`). The repo intentionally does not ship a binary
 *      GLB by default — committing a real binary asset through the
 *      text-only tooling used to scaffold this repo is not possible, and
 *      a placeholder GLB would mislead reviewers.
 *
 *   2. Procedural fallback — a textured, animated torus-knot rendered
 *      entirely from Three.js primitives. Sized and positioned to match
 *      where the real GLB would land so swapping in a GLB does not
 *      require layout adjustments.
 *
 * Animation: every frame the wrapping `<group>` is rotated on Y and
 * bobbed on Y via a sin wave. For a loaded GLB with baked animation
 * clips, a real AnimationMixer would run in parallel — that wiring is
 * left to the consumer because the animation names depend on the GLB.
 */
export function GltfModel(): JSX.Element {
  const group = useRef<Group>(null);
  const [gltfScene, setGltfScene] = useState<Group | null>(null);
  const elapsed = useRef(0);

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
            if (!cancelled) setGltfScene(gltf.scene);
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

    void tryLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (group.current) {
      group.current.rotation.y += delta * 0.6;
      group.current.position.y = Math.sin(elapsed.current * 1.4) * 0.15;
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]} scale={1}>
      {gltfScene ? (
        <primitive object={gltfScene} />
      ) : (
        <ProceduralFallback />
      )}
    </group>
  );
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
