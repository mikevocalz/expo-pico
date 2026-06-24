import React, { useEffect } from 'react';
import {
  ViroAmbientLight,
  ViroBox,
  ViroDirectionalLight,
  ViroMaterials,
  ViroNode,
} from '@reactvision/react-viro';

/**
 * Renders the demo geometry shown in `PicoSceneRoot`.
 *
 * Why a primitive box and not the BrainStem GLB:
 *   - Viro 2.56.0's GLB loader has a stack-protector overflow on PICO 4 Ultra
 *     when a model contains many meshes without explicit tangent vectors
 *     (`F libc: stack corruption detected (-fstack-protector)` triggered by
 *     `Viro: Unable to generate missing tangents for this model` repeated
 *     for every triangle in the BrainStem mesh). The crash drops the
 *     process before the first frame submits.
 *   - A primitive box gives us a verifiable live frame in the headset while
 *     the GLB path is patched upstream. The `assets/models/pico-demo.glb` file
 *     is still bundled — once Viro fixes the tangent path, swap this back to
 *     `<Viro3DObject>`.
 */
export type DemoModelStatus = 'glb' | 'fallback' | 'booting';

export interface GltfModelProps {
  onStatusChange?: (status: DemoModelStatus) => void;
}

ViroMaterials.createMaterials({
  picoDemoCube: {
    diffuseColor: '#6c79ff',
    lightingModel: 'Blinn',
  },
});

export function GltfModel(props: GltfModelProps): React.JSX.Element {
  const { onStatusChange } = props;

  // ponytail: report `fallback` immediately — we're intentionally NOT loading the
  // GLB. Surfaces the state honestly in the HUD instead of pretending the model
  // loaded.
  useEffect(() => {
    onStatusChange?.('fallback');
  }, [onStatusChange]);

  return (
    <ViroNode position={[0, 0, -1.5]} scale={[0.4, 0.4, 0.4]}>
      <ViroAmbientLight color="#6c79ff" intensity={140} />
      <ViroDirectionalLight color="#ffffff" direction={[-0.5, -1, -0.5]} intensity={900} />
      <ViroBox
        position={[0, 0, 0]}
        width={1}
        height={1}
        length={1}
        materials={['picoDemoCube']}
      />
    </ViroNode>
  );
}
