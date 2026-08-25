import React, { useCallback, useRef, useState } from 'react';
import {
  Viro3DPoint,
  ViroAmbientLight,
  ViroBox,
  ViroDirectionalLight,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroScene,
  ViroSpotLight,
  ViroText,
} from '@reactvision/react-viro';

/**
 * Interactive cube scene.
 *
 * Spatial contract (metres, user at origin looking down -Z):
 *   - Cube rests at [0, 1.35, -1.5] — comfortableUI distance, a touch below
 *     eye level so the resting gaze (5°-15° under horizon) lands on it.
 *   - Cube edge 0.24m. At 1.5m that subtends ~9°, well over the 4° minimum
 *     hit target, and comfortable for a controller ray or a pinch.
 *   - Caption panel sits 0.34m above the cube, same depth, so reading it
 *     costs no vergence change.
 *   - Floor quad at y=0 grounds the object; it is the only shadow receiver.
 *
 * Input parity: onClick fires on controller trigger, on gaze+pinch, and on
 * tap in the flat mobile fallback — one handler covers all three.
 */

const HOME: Viro3DPoint = [0, 1.35, -1.5];
const EDGE = 0.24;

// Cycled on click so a press has a visible, non-destructive result.
const TINTS = ['cubeIdle', 'cubeViolet', 'cubeMint'] as const;

ViroMaterials.createMaterials({
  cubeIdle: {
    lightingModel: 'PBR',
    diffuseColor: '#4E9BE0',
    roughness: 0.35,
    metalness: 0.0,
  },
  cubeViolet: {
    lightingModel: 'PBR',
    diffuseColor: '#A78BFA',
    roughness: 0.35,
    metalness: 0.0,
  },
  cubeMint: {
    lightingModel: 'PBR',
    diffuseColor: '#5EEAD4',
    roughness: 0.35,
    metalness: 0.0,
  },
  // Constant-lit so the ring reads as UI, not as a lit surface.
  focusRing: {
    lightingModel: 'Constant',
    diffuseColor: '#7DD3FC',
  },
  panelPlate: {
    lightingModel: 'PBR',
    diffuseColor: '#12172B',
    roughness: 0.6,
    metalness: 0.0,
  },
  // Darker wash sits directly behind glyphs for AA contrast.
  panelTextWash: {
    lightingModel: 'Constant',
    diffuseColor: '#080A14',
  },
  floor: {
    lightingModel: 'PBR',
    diffuseColor: '#0C1020',
    roughness: 0.9,
    metalness: 0.0,
  },
});

function fmt(p: Viro3DPoint): string {
  return `x ${p[0].toFixed(2)}   y ${p[1].toFixed(2)}   z ${p[2].toFixed(2)}`;
}

export function InteractiveCubeScene(): React.JSX.Element {
  const [position, setPosition] = useState<Viro3DPoint>(HOME);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [tint, setTint] = useState(0);
  const dragCount = useRef(0);

  // FixedDistance keeps the cube on the ray at its current depth, so dragging
  // never flings it to the far clip plane or into the user's face.
  const onDrag = useCallback((to: Viro3DPoint) => {
    dragCount.current += 1;
    setPosition(to);
  }, []);

  const onClick = useCallback(() => {
    setTint((t) => (t + 1) % TINTS.length);
  }, []);

  // Hover grows the cube ~4%; pressed insets it ~3%. Both are small enough to
  // read as feedback rather than motion.
  const scale: Viro3DPoint = pressed
    ? [0.97, 0.97, 0.97]
    : hovered
      ? [1.04, 1.04, 1.04]
      : [1, 1, 1];

  return (
    <ViroScene>
      {/* Lighting: low ambient fill, a key from the upper-left, and a spot
          that pools light on the floor to seat the cube in the space. */}
      <ViroAmbientLight color="#5A6488" intensity={520} />
      <ViroDirectionalLight
        color="#FFFFFF"
        intensity={900}
        direction={[-0.45, -0.75, -0.5]}
        castsShadow
        influenceBitMask={2}
      />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={38}
        color="#8FD0FF"
        intensity={420}
        position={[0, 3.2, -1.5]}
        direction={[0, -1, 0]}
        castsShadow
        influenceBitMask={2}
        shadowMapSize={1024}
        shadowNearZ={0.5}
        shadowFarZ={5}
        shadowOpacity={0.5}
      />

      {/* Floor — the only shadow receiver in the scene. */}
      <ViroQuad
        rotation={[-90, 0, 0]}
        position={[0, 0, -1.5]}
        width={4}
        height={4}
        materials={['floor']}
        lightReceivingBitMask={3}
        arShadowReceiver={false}
      />

      <ViroNode position={position}>
        {/* Focus ring — appears on hover/press only, just behind the cube. */}
        {(hovered || pressed) && (
          <ViroBox
            width={EDGE * 1.12}
            height={EDGE * 1.12}
            length={EDGE * 1.12}
            materials={['focusRing']}
            opacity={0.22}
          />
        )}

        <ViroBox
          width={EDGE}
          height={EDGE}
          length={EDGE}
          scale={scale}
          materials={[TINTS[tint]]}
          shadowCastingBitMask={2}
          lightReceivingBitMask={3}
          dragType="FixedDistance"
          onDrag={onDrag}
          onHover={(isHovering: boolean) => setHovered(isHovering)}
          onClickState={(state: number) => setPressed(state === 1)}
          onClick={onClick}
        />
      </ViroNode>

      {/* Caption — live position proves the drag is real, and the plate keeps
          the glyphs legible against whatever is behind them. */}
      <ViroNode position={[position[0], position[1] + 0.34, position[2]]}>
        <ViroQuad width={0.72} height={0.2} materials={['panelPlate']} />
        <ViroQuad
          width={0.68}
          height={0.16}
          position={[0, 0, 0.001]}
          materials={['panelTextWash']}
        />
        <ViroText
          text={hovered ? 'Drag to move · tap to recolour' : 'Interactive cube'}
          position={[0, 0.042, 0.003]}
          width={0.66}
          height={0.06}
          style={{ fontSize: 13, color: '#F5F7FF', fontWeight: '600', textAlign: 'center' }}
        />
        <ViroText
          text={fmt(position)}
          position={[0, -0.028, 0.003]}
          width={0.66}
          height={0.06}
          style={{ fontSize: 10, color: '#7DD3FC', fontWeight: '400', textAlign: 'center' }}
        />
      </ViroNode>
    </ViroScene>
  );
}
