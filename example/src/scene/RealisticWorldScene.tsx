import React, { useEffect, useMemo } from 'react';
import {
  Viro3DPoint,
  ViroAmbientLight,
  ViroAnimations,
  ViroBox,
  ViroController,
  ViroDirectionalLight,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroScene,
  ViroSound,
  ViroSphere,
  ViroSpotLight,
} from '@reactvision/react-viro';

/**
 * Photorealistic nature world scene — grass clearing, scattered trees, a central lake,
 * moving clouds, three bird species, ambient water and bird sounds.
 *
 * Spatial design (metres, right-handed, user at origin looking down -Z):
 *   - Sky: 35 m inverted sphere with procedural gradient + sun glow.
 *   - Ground: 24x24 m grass quad with PBR roughness and procedural wind colour.
 *   - Lake: 8x5 m animated GLSL water quad with multi-sine waves + shore foam.
 *   - Trees: simple trunk (ViroBox) + canopy (ViroSphere) clusters.
 *   - Rocks: small ViroSphere scatter along the shore.
 *   - Clouds: large transparent ViroSpheres with procedural billow + drift.
 *   - Birds: blackbird, white gull and brown sparrow flocks.
 *   - Audio: looping water lap and two bird ambience layers.
 *   - Lighting: warm sun directional + soft ambient + water glint spot.
 */

// World scale constants (metres)
const GROUND_SIZE = 24;
// Floor origin: the OpenXR renderer resolves the world origin to the physical
// floor via a native LOCAL_FLOOR reference space (PICO default; verified on a
// PICO 4 Ultra), so y=0 IS the floor. No head-height guess — the old
// FLOOR_FROM_HEADSET_Y = -1.65 offset is gone; the content node sits at 0.
const FLOOR_FROM_HEADSET_Y = 0;
const GROUND_Y = -0.01;
const LAKE_WIDTH = 8;
const LAKE_LENGTH = 5;
const LAKE_Y = 0.0;
const LAKE_POSITION: Viro3DPoint = [0, LAKE_Y, -8];
const SKY_RADIUS = 35;

const SOUNDS = {
  // Google Actions sound library — freely usable .ogg assets.
  water: 'https://actions.google.com/sounds/v1/water/water_lapping_wind.ogg',
  songbirds: 'https://actions.google.com/sounds/v1/animals/june_songbirds.ogg',
  birdsAndCrows:
    'https://actions.google.com/sounds/v1/animals/june_songbirds_with_crows.ogg',
};

type BirdType = 'blackbird' | 'gull' | 'sparrow';

ViroMaterials.createMaterials({
  sky: {
    lightingModel: 'Constant',
    cullMode: 'None',
    diffuseColor: '#87CEEB',
    shaderModifiers: {
      surface: `
        highp vec3 topColor    = vec3(0.22, 0.48, 0.78);
        highp vec3 bottomColor = vec3(0.04, 0.07, 0.16);
        highp vec3 sunColor    = vec3(1.00, 0.92, 0.72);
        highp vec3 sunDir      = normalize(vec3(0.3, 0.45, -0.8));

        highp float horizon = clamp(_surface.normal.y * 0.5 + 0.5, 0.0, 1.0);
        highp vec3 sky = mix(bottomColor, topColor, horizon);

        highp float sunDot = max(dot(_surface.normal, sunDir), 0.0);
        highp float sunGlow = pow(sunDot, 20.0);
        highp float sunDisc = step(0.985, sunDot);
        sky += sunColor * sunGlow * 0.6;
        sky += sunColor * sunDisc * 0.4;

        _surface.diffuse_color = vec4(sky, 1.0);
      `,
    },
  },

  grass: {
    lightingModel: 'PBR',
    diffuseColor: '#3A5F2A',
    roughness: 0.95,
    metalness: 0.0,
    shaderModifiers: {
      surface: `
        uniform highp float time;
        highp vec2 uv = _surface.diffuse_texcoord;
        highp float t = time * 0.0004;

        highp float wind1 = sin(uv.x * 18.0 + t * 2.0) * cos(uv.y * 14.0 - t * 1.5);
        highp float wind2 = sin((uv.x + uv.y) * 9.0 + t * 1.2);
        highp float variation = (wind1 + wind2) * 0.25 + 0.5;

        highp vec3 base   = vec3(0.10, 0.26, 0.07);
        highp vec3 bright = vec3(0.24, 0.42, 0.14);
        highp vec3 dark   = vec3(0.06, 0.16, 0.04);

        highp vec3 color = mix(dark, bright, variation);
        color = mix(color, base, 0.3);

        _surface.diffuse_color.rgb = color;
        _surface.roughness = 0.92 + variation * 0.05;
      `,
    },
  },

  /**
   * Water shader — multi-sine wave surface with colour depth, foam and sparkle.
   */
  water: {
    lightingModel: 'Constant',
    blendMode: 'Alpha',
    cullMode: 'None',
    diffuseColor: '#2B6E8C',
    shaderModifiers: {
      surface: `
        uniform highp float time;
        highp vec2 uv = _surface.diffuse_texcoord;
        highp float t = time * 0.0008;

        highp float wave1 = sin(uv.x * 16.0 + t * 3.0);
        highp float wave2 = cos(uv.y * 14.0 + t * 2.5);
        highp float wave3 = sin((uv.x + uv.y) * 10.0 - t * 4.0);
        highp float wave4 = sin(uv.x * 28.0 - t * 5.5) * cos(uv.y * 22.0 + t * 3.5);
        highp float waves = (wave1 + wave2 + wave3 + wave4 * 0.5) / 3.5;

        highp float shoreX = max(abs(uv.x - 0.5), 0.0) * 2.0;
        highp float shoreY = max(abs(uv.y - 0.5), 0.0) * 2.0;
        highp float shore = max(shoreX * (8.0 / 5.0), shoreY * (8.0 / 5.0));
        shore = smoothstep(0.75, 0.95, shore);

        highp vec3 deep   = vec3(0.05, 0.22, 0.32);
        highp vec3 mid    = vec3(0.10, 0.45, 0.58);
        highp vec3 foam   = vec3(0.85, 0.95, 1.00);

        highp float blend = smoothstep(-0.3, 0.7, waves);
        highp vec3 col = mix(deep, mid, blend);
        col += foam * smoothstep(0.60, 0.90, waves) * 0.35;
        col += foam * shore * 0.45;

        highp float sparkle1 = sin(uv.x * 60.0 + t * 5.0) * sin(uv.y * 60.0 + t * 4.5);
        highp float sparkle2 = sin(uv.x * 90.0 - t * 6.0) * sin(uv.y * 80.0 + t * 5.0);
        highp float sparkle = pow(max(sparkle1, 0.0), 12.0) * 0.35 + pow(max(sparkle2, 0.0), 16.0) * 0.2;
        col += vec3(sparkle);

        _surface.diffuse_color = vec4(col, 0.84);
      `,
    },
  },

  trunk: {
    lightingModel: 'PBR',
    diffuseColor: '#5C4033',
    roughness: 0.9,
    metalness: 0.0,
  },

  canopy: {
    lightingModel: 'PBR',
    diffuseColor: '#2E7D32',
    roughness: 0.85,
    metalness: 0.0,
  },

  rock: {
    lightingModel: 'PBR',
    diffuseColor: '#6B6B6B',
    roughness: 0.92,
    metalness: 0.05,
  },

  cloud: {
    lightingModel: 'Constant',
    diffuseColor: '#FFFFFF',
    shaderModifiers: {
      surface: `
        uniform highp float time;
        highp vec2 uv = _surface.diffuse_texcoord;
        highp float t = time * 0.0003;

        highp float billow1 = sin(uv.x * 4.0 + t) * cos(uv.y * 4.0 + t * 0.7);
        highp float billow2 = sin(uv.x * 12.0 - t * 1.3) * cos(uv.y * 10.0 + t * 0.9);
        highp float billow3 = sin((uv.x + uv.y) * 8.0 + t * 0.6);
        highp float density = (billow1 + billow2 * 0.4 + billow3 * 0.3) * 0.6 + 0.5;

        highp float cloud = smoothstep(0.15, 0.65, density);
        highp vec3 white = vec3(0.96, 0.97, 1.0);
        highp vec3 grey  = vec3(0.72, 0.75, 0.82);

        _surface.diffuse_color = vec4(mix(grey, white, cloud), 0.6 + cloud * 0.35);
      `,
    },
  },

  birdBlack: {
    lightingModel: 'Constant',
    diffuseColor: '#1A1A1A',
  },

  birdWhite: {
    lightingModel: 'Constant',
    diffuseColor: '#F0F0F0',
  },

  birdBrown: {
    lightingModel: 'Constant',
    diffuseColor: '#8B5A2B',
  },
});

ViroAnimations.registerAnimations({
  cloudDrift: {
    duration: 40000,
    easing: 'Linear',
    properties: {
      positionX: '-=22',
    },
  },
  birdFly: {
    duration: 12000,
    easing: 'Linear',
    properties: {
      positionX: '+=14',
      positionZ: '-=3',
    },
  },
  gullFly: {
    duration: 17000,
    easing: 'Linear',
    properties: {
      positionX: '+=18',
      positionY: '+=1.2',
      positionZ: '+=5',
    },
  },
  sparrowFly: {
    duration: 9000,
    easing: 'Linear',
    properties: {
      positionX: '+=10',
      positionY: '-=0.4',
      positionZ: '-=2',
    },
  },
});

const TREES: Viro3DPoint[] = [
  [-7, 0, -5],
  [-5.5, 0, -12],
  [-8, 0, -10],
  [6, 0, -6],
  [8.5, 0, -13],
  [4.5, 0, -15],
  [-4, 0, -17],
  [7, 0, -4],
  [-9, 0, -3],
];

const ROCKS: { position: Viro3DPoint; scale: number }[] = [
  { position: [2.5, 0, -7.5], scale: 0.35 },
  { position: [-2.0, 0, -9.0], scale: 0.5 },
  { position: [3.8, 0, -10.0], scale: 0.25 },
  { position: [-3.5, 0, -6.5], scale: 0.4 },
];

const CLOUDS: { position: Viro3DPoint; radius: number; delay: number }[] = [
  { position: [-12, 12, -22], radius: 2.2, delay: 0 },
  { position: [8, 14, -26], radius: 1.8, delay: 6000 },
  { position: [-4, 16, -32], radius: 2.5, delay: 14000 },
  { position: [14, 13, -20], radius: 1.6, delay: 22000 },
];

const BIRDS: {
  position: Viro3DPoint;
  delay: number;
  type: BirdType;
}[] = [
  { position: [-8, 9, -12], delay: 0, type: 'blackbird' },
  { position: [-9, 9.5, -11.5], delay: 200, type: 'blackbird' },
  { position: [5, 10, -15], delay: 3000, type: 'gull' },
  { position: [6, 10.2, -14.5], delay: 3200, type: 'gull' },
  { position: [0, 11, -18], delay: 6000, type: 'sparrow' },
  { position: [-1, 10.6, -18.5], delay: 6200, type: 'sparrow' },
];

function Tree({ position }: { position: Viro3DPoint }): React.JSX.Element {
  return (
    <ViroNode position={position}>
      <ViroBox
        width={0.35}
        height={1.2}
        length={0.35}
        materials={['trunk']}
        position={[0, 0.6, 0]}
        shadowCastingBitMask={2}
        lightReceivingBitMask={3}
      />
      <ViroSphere
        radius={0.9}
        materials={['canopy']}
        position={[0, 1.8, 0]}
        shadowCastingBitMask={2}
        lightReceivingBitMask={3}
      />
      <ViroSphere
        radius={0.65}
        materials={['canopy']}
        position={[0.2, 2.3, 0.1]}
        shadowCastingBitMask={2}
        lightReceivingBitMask={3}
      />
    </ViroNode>
  );
}

function Cloud({
  position,
  radius,
  delay,
}: {
  position: Viro3DPoint;
  radius: number;
  delay: number;
}): React.JSX.Element {
  return (
    <ViroNode
      position={position}
      animation={{ name: 'cloudDrift', loop: true, run: true, delay }}
    >
      <ViroSphere radius={radius} materials={['cloud']} opacity={0.78} />
      <ViroSphere
        radius={radius * 0.7}
        position={[radius * 0.4, radius * 0.15, 0]}
        materials={['cloud']}
        opacity={0.7}
      />
      <ViroSphere
        radius={radius * 0.55}
        position={[-radius * 0.35, radius * 0.1, radius * 0.15]}
        materials={['cloud']}
        opacity={0.7}
      />
    </ViroNode>
  );
}

function Bird({
  position,
  delay,
  type,
}: {
  position: Viro3DPoint;
  delay: number;
  type: BirdType;
}): React.JSX.Element {
  const anim =
    type === 'gull' ? 'gullFly' : type === 'sparrow' ? 'sparrowFly' : 'birdFly';
  const material =
    type === 'gull' ? 'birdWhite' : type === 'sparrow' ? 'birdBrown' : 'birdBlack';

  if (type === 'gull') {
    return (
      <ViroNode
        position={position}
        animation={{ name: anim, loop: true, run: true, delay }}
      >
        <ViroBox width={0.32} height={0.05} length={0.07} materials={[material]} />
        <ViroBox
          width={0.06}
          height={0.035}
          length={0.24}
          position={[0, 0.02, 0.03]}
          rotation={[0, -5, 0]}
          materials={[material]}
        />
        <ViroBox
          width={0.22}
          height={0.025}
          length={0.07}
          position={[0, 0.04, -0.02]}
          materials={[material]}
        />
      </ViroNode>
    );
  }

  if (type === 'sparrow') {
    return (
      <ViroNode
        position={position}
        animation={{ name: anim, loop: true, run: true, delay }}
      >
        <ViroBox width={0.10} height={0.04} length={0.04} materials={[material]} />
        <ViroBox
          width={0.03}
          height={0.02}
          length={0.08}
          position={[0, 0.01, 0.01]}
          materials={[material]}
        />
      </ViroNode>
    );
  }

  return (
    <ViroNode
      position={position}
      animation={{ name: anim, loop: true, run: true, delay }}
    >
      <ViroBox width={0.16} height={0.04} length={0.04} materials={[material]} />
      <ViroBox
        width={0.04}
        height={0.02}
        length={0.1}
        position={[0, 0.01, 0.02]}
        materials={[material]}
      />
    </ViroNode>
  );
}

export function RealisticWorldScene(): React.JSX.Element {
  const trees = useMemo(() => TREES, []);
  const rocks = useMemo(() => ROCKS, []);
  const clouds = useMemo(() => CLOUDS, []);
  const birds = useMemo(() => BIRDS, []);

  // Animate the procedural shader 'time' uniforms across water, grass and clouds.
  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now() % 1_000_000;
      ViroMaterials.updateShaderUniform('water', 'time', 'float', t);
      ViroMaterials.updateShaderUniform('grass', 'time', 'float', t);
      ViroMaterials.updateShaderUniform('cloud', 'time', 'float', t);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <ViroScene>
      {/* Ambient audio — water, songbirds, mixed bird/crow ambience. */}
      <ViroSound
        source={{ uri: SOUNDS.water }}
        loop
        volume={0.25}
        onError={(event) => {
          console.warn('Water sound error:', event.nativeEvent);
        }}
      />
      <ViroSound
        source={{ uri: SOUNDS.songbirds }}
        loop
        volume={0.18}
        onError={(event) => {
          console.warn('Songbird sound error:', event.nativeEvent);
        }}
      />
      <ViroSound
        source={{ uri: SOUNDS.birdsAndCrows }}
        loop
        volume={0.1}
        onError={(event) => {
          console.warn('Birds/crows sound error:', event.nativeEvent);
        }}
      />

      {/* Input — PICO controllers + reticle. */}
      <ViroController reticleVisibility controllerVisibility />

      <ViroNode position={[0, FLOOR_FROM_HEADSET_Y, 0]}>
        {/* Ambient fill for shadowed areas. */}
        <ViroAmbientLight color="#8FA8C4" intensity={400} />

      {/* Sun: warm directional with shadows. */}
      <ViroDirectionalLight
        color="#FFF4E0"
        intensity={1400}
        direction={[-0.5, -0.85, -0.3]}
        castsShadow
        influenceBitMask={2}
      />

      {/* Water glint: sharp low-angle spot from the sun side. */}
      <ViroSpotLight
        color="#CCEEFF"
        intensity={500}
        position={[8, 6, -4]}
        direction={[-1, -0.6, -1]}
        innerAngle={15}
        outerAngle={45}
        influenceBitMask={2}
      />

      {/* Sky dome. */}
      <ViroSphere
        materials={['sky']}
        radius={SKY_RADIUS}
        facesOutward={false}
        position={[0, 0, 0]}
      />

      {/* Ground — a large grass clearing. */}
      <ViroQuad
        rotation={[-90, 0, 0]}
        position={[0, GROUND_Y, -6]}
        width={GROUND_SIZE}
        height={GROUND_SIZE}
        materials={['grass']}
        lightReceivingBitMask={3}
      />

      {/* Lake — animated GLSL water surface. */}
      <ViroQuad
        rotation={[-90, 0, 0]}
        position={LAKE_POSITION}
        width={LAKE_WIDTH}
        height={LAKE_LENGTH}
        materials={['water']}
        lightReceivingBitMask={3}
      />

      {/* Trees around the lake. */}
      {trees.map((pos, i) => (
        <Tree key={`tree-${i}`} position={pos} />
      ))}

      {/* Shore rocks. */}
      {rocks.map((rock, i) => (
        <ViroSphere
          key={`rock-${i}`}
          position={rock.position}
          radius={0.3 * rock.scale}
          materials={['rock']}
          shadowCastingBitMask={2}
          lightReceivingBitMask={3}
        />
      ))}

      {/* Moving clouds. */}
      {clouds.map((cloud, i) => (
        <Cloud key={`cloud-${i}`} {...cloud} />
      ))}

      {/* Flying birds — blackbird, gull, sparrow. */}
      {birds.map((bird, i) => (
        <Bird key={`bird-${i}`} {...bird} />
      ))}
      </ViroNode>
    </ViroScene>
  );
}
