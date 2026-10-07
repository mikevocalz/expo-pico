import React, { memo, useCallback, useState } from 'react';
import {
  ViroAmbientLight,
  ViroBox,
  ViroDirectionalLight,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroScene,
  ViroSpotLight,
  ViroText,
  type ViroTextStyle,
} from '@reactvision/react-viro';

import { exitImmersiveScene } from '@expo-pico/core';
import { getSpatialLayoutReadiness, type PicoSpatialLayoutPrimitive } from '@expo-pico/spatial';
import { LucideIcon } from './LucideIcon';
import {
  OUTLINE_ACTIVE,
  OUTLINE_REST,
  usePressState,
  useTargetFocus,
  XrController,
} from './xrInput';

import { resolveWorkspace, type ResolvedSurface, type SurfacePose } from '../layout/workspace';
// Importing from the cube scene also registers its materials (cube tints,
// focusRing, panelPlate, panelTextWash, floor), which this scene reuses.
import { CUBE_SHELL_ACTIVE, CUBE_SHELL_REST, EDGE, TINTS } from './InteractiveCubeScene';

/**
 * Spatial workspace scene: the immersive layout for `VrSceneRoot`.
 *
 * Spatial contract (metres, floor-level origin, user at origin looking -Z):
 *   - Each surface in `WORKSPACE` is resolved by `resolveWorkspace()` to a
 *     PICO layout primitive and a pose. The pose is used as given: the panel
 *     sits at `pose.position` with `rotation [0, pose.yaw, 0]`, which already
 *     turns it to face the user. A surface with no pose is skipped and logged.
 *   - Library (master, left) and Details (inspector, right) are 0.60 x 0.66 m.
 *     Stage (content, centre) is 0.90 x 0.66 m. Controls (toolbar, below the
 *     stage) is 0.84 x 0.15 m. No panel is wider than 0.9 m.
 *   - The cube rests 0.20 m in front of the stage plate, so it never
 *     intersects it, and drags with FixedDistance like the phone scene.
 *   - Floor quad at y=0 is the only shadow receiver.
 *
 * Type: native Viro sets text at ~1 cm per point, so every label goes through
 * `ScaledText` (scale 0.1, box divided by 0.1) and 1 pt reads as ~1 mm. At
 * 1.5 m, 1 degree of arc is ~26 mm, so nothing is set below 26 pt.
 *
 * Targets: every button is at least 100 mm tall (64 mm minimum for hands at
 * 1.5 m) and carries a resting outline, so it reads as pressable on Meta VR
 * Glasses, which send no hover. Focus (hover or eye gaze) brightens the
 * outline and fill; press (darker fill, 3% inset) comes from click state only.
 * See `xrInput.tsx`.
 *
 * Panels are drawn by Viro because the PICO native layout bridge does not open
 * Subwindow/Toolbar primitives yet. When it does, the intents in
 * `layout/workspace.ts` stay put and only this presenter changes.
 */

// Viro's d.ts declares this point type but the package root does not export it.
type Viro3DPoint = [number, number, number];

// ─── Type scale (points; 1 pt ≈ 1 mm through ScaledText) ─────────────────────

const TITLE_PT = 40;
const BODY_PT = 28;
const META_PT = 26;

const INK = '#F5F7FF';
const ACCENT = '#7DD3FC';

const TEXT_SCALE = 0.1;
const TEXT_SCALE_3D: Viro3DPoint = [TEXT_SCALE, TEXT_SCALE, TEXT_SCALE];

// Z layering inside a panel. 2 mm steps stay clear of depth fighting at 1.5 m.
// Rough advance per character at a given point size (~0.55em at pt/1000 em).
// Used to place icons next to centred text; ScaledText still owns the glyphs.
const charW = (pt: number) => pt * 0.00055;

// X for an icon a fixed gap after a left-aligned title of `pt` size, where the
// title's text box is `boxW` wide and centred on x=0.
const titleIconX = (title: string, iconSize: number, boxW: number, pt = TITLE_PT) =>
  -boxW / 2 + title.length * charW(pt) + 0.015 + iconSize / 2;

const Z_WASH = 0.002;
const Z_RING = 0.004;
const Z_BUTTON = 0.006;
const Z_TEXT = 0.01;

ViroMaterials.createMaterials({
  // Constant-lit like focusRing, so buttons read as UI rather than lit props.
  wsButton: {
    lightingModel: 'Constant',
    diffuseColor: '#1E2747',
  },
  wsButtonHover: {
    lightingModel: 'Constant',
    diffuseColor: '#2B3866',
  },
});

const TINT_LABEL: Record<(typeof TINTS)[number], string> = {
  cubeIdle: 'Sky blue',
  cubeViolet: 'Violet',
  cubeMint: 'Mint',
};

const PRIMITIVE_LABEL: Record<PicoSpatialLayoutPrimitive, string> = {
  'window-container-planar': 'Window (planar)',
  'window-container-volume': 'Window (volume)',
  'subwindow-start': 'Subwindow (start)',
  'subwindow-end': 'Subwindow (end)',
  augment: 'Augment',
  toolbar: 'Toolbar',
  'spatial-popup': 'Popup',
  'attachment-panel': 'Attachment panel',
  stage: 'Stage',
  inline: 'Inline',
};

// ─── Layout resolution (once per load) ───────────────────────────────────────

const SURFACES: readonly ResolvedSurface[] = resolveWorkspace();

const UNPLACED = SURFACES.filter((s) => s.pose === null);
if (UNPLACED.length > 0) {
  console.warn(
    `SpatialWorkspaceScene: no pose for ${UNPLACED.map((s) => `${s.title} (${s.primitive})`).join(
      ', '
    )}; skipping.`
  );
}

const STAGE_POSE = SURFACES.find((s) => s.id === 'stage')?.pose ?? null;

/** Rotates a panel-local offset by the pose's yaw and adds the pose origin. */
function toWorld(pose: SurfacePose, local: Viro3DPoint): Viro3DPoint {
  const r = (pose.yaw * Math.PI) / 180;
  const [lx, ly, lz] = local;
  const [px, py, pz] = pose.position;
  return [
    px + lx * Math.cos(r) + lz * Math.sin(r),
    py + ly,
    pz - lx * Math.sin(r) + lz * Math.cos(r),
  ];
}

// Cube sits a little low in the stage, 0.20 m proud of the plate.
const CUBE_HOME: Viro3DPoint = STAGE_POSE ? toWorld(STAGE_POSE, [0, -0.06, 0.2]) : [0, 1.35, -1.3];

function fmt(p: Viro3DPoint): string {
  return `x ${p[0].toFixed(2)}   y ${p[1].toFixed(2)}   z ${p[2].toFixed(2)}`;
}

// ─── Building blocks ─────────────────────────────────────────────────────────

interface ScaledTextProps {
  text: string;
  position: Viro3DPoint;
  /** Box size in metres; converted to the 0.1-scaled text space here. */
  width: number;
  height: number;
  fontSize: number;
  color?: string;
  weight?: '400' | '600' | '700';
  align?: 'left' | 'center' | 'right';
  maxLines?: number;
}

/** The only way this scene draws text: 1 pt ≈ 1 mm, box given in metres. */
function ScaledText({
  text,
  position,
  width,
  height,
  fontSize,
  color = INK,
  weight = '400',
  align = 'left',
  maxLines = 1,
}: ScaledTextProps): React.JSX.Element {
  const style: ViroTextStyle = {
    fontSize,
    color,
    fontWeight: weight,
    textAlign: align,
    textAlignVertical: 'center',
  };
  // VROTextFormatter centers the glyph *baseline* on the box, so ink sits
  // ~0.25em high. Drop the baseline to land the optical center on `position`
  // (1 pt ≈ 1 mm, so em in metres = fontSize / 1000).
  const dy = -0.25 * (fontSize / 1000);
  return (
    <ViroText
      text={text}
      position={[position[0], position[1] + dy, position[2]]}
      scale={TEXT_SCALE_3D}
      width={width / TEXT_SCALE}
      height={height / TEXT_SCALE}
      maxLines={maxLines}
      textClipMode="ClipToBounds"
      style={style}
    />
  );
}

/** Opaque plate plus an inset dark wash, like the phone scene's caption. */
function PanelPlate({ width, height }: { width: number; height: number }): React.JSX.Element {
  return (
    <>
      <ViroQuad width={width} height={height} materials={['panelPlate']} />
      <ViroQuad
        width={width - 0.04}
        height={height - 0.04}
        position={[0, 0, Z_WASH]}
        materials={['panelTextWash']}
      />
    </>
  );
}

interface PanelButtonProps {
  position: Viro3DPoint;
  width: number;
  height: number;
  onPress: () => void;
  children: React.ReactNode;
}

/**
 * Rest: outline at low opacity. Focus: lighter fill, brighter outline.
 * Press: darker fill, 3% inset. Handlers sit on the node; hits on the quad or
 * glyphs bubble up to it.
 */
function PanelButton({
  position,
  width,
  height,
  onPress,
  children,
}: PanelButtonProps): React.JSX.Element {
  const { focused, onHover } = useTargetFocus();
  const [pressed, onClickState] = usePressState();
  const scale: Viro3DPoint = pressed ? [0.97, 0.97, 1] : [1, 1, 1];
  const fill = pressed ? 'panelTextWash' : focused ? 'wsButtonHover' : 'wsButton';

  return (
    <ViroNode
      position={position}
      scale={scale}
      onHover={onHover}
      onClickState={onClickState}
      onClick={onPress}
    >
      <ViroQuad
        width={width + 0.016}
        height={height + 0.016}
        position={[0, 0, Z_RING]}
        materials={['focusRing']}
        opacity={focused || pressed ? OUTLINE_ACTIVE : OUTLINE_REST}
      />
      <ViroQuad width={width} height={height} position={[0, 0, Z_BUTTON]} materials={[fill]} />
      {children}
    </ViroNode>
  );
}

function Surface({
  pose,
  children,
}: {
  pose: SurfacePose;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ViroNode position={pose.position} rotation={[0, pose.yaw, 0]}>
      {children}
    </ViroNode>
  );
}

// ─── Panels ──────────────────────────────────────────────────────────────────

const SIDE_W = 0.6;
const SIDE_H = 0.66;
const SIDE_TEXT_W = 0.52;

const LibraryPanel = memo(function LibraryPanelView({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  const rowW = SIDE_TEXT_W;
  const rowH = 0.11;
  return (
    <>
      <PanelPlate width={SIDE_W} height={SIDE_H} />
      <ScaledText
        text="Library"
        position={[0, 0.265, Z_TEXT]}
        width={SIDE_TEXT_W}
        height={0.07}
        fontSize={TITLE_PT}
        weight="700"
      />
      <LucideIcon
        name="star"
        position={[titleIconX('Library', 0.045, SIDE_TEXT_W), 0.265, Z_TEXT]}
        size={0.045}
        accent
      />
      <ScaledText
        text="Cube colour"
        position={[0, 0.195, Z_TEXT]}
        width={SIDE_TEXT_W}
        height={0.05}
        fontSize={META_PT}
        color={ACCENT}
      />
      {TINTS.map((tint, i) => {
        const isSelected = i === selected;
        return (
          <PanelButton
            key={tint}
            position={[0, 0.085 - i * 0.13, 0]}
            width={rowW}
            height={rowH}
            onPress={() => onSelect(i)}
          >
            {/* Selection is a bar plus heavier weight, never colour alone. */}
            {isSelected && (
              <ViroQuad
                width={0.014}
                height={0.07}
                position={[-rowW / 2 + 0.02, 0, Z_TEXT]}
                materials={['focusRing']}
              />
            )}
            <ViroQuad
              width={0.05}
              height={0.05}
              position={[-rowW / 2 + 0.075, 0, Z_TEXT]}
              materials={[tint]}
              lightReceivingBitMask={3}
            />
            <ScaledText
              text={TINT_LABEL[tint]}
              position={[0.02, 0, Z_TEXT]}
              width={rowW - 0.28}
              height={0.05}
              fontSize={BODY_PT}
              weight={isSelected ? '700' : '400'}
              align="left"
            />
            {isSelected && (
              <LucideIcon name="check" position={[rowW / 2 - 0.03, 0, Z_TEXT]} size={0.04} accent />
            )}
          </PanelButton>
        );
      })}
    </>
  );
});

// Human-readable reason the native layout bridge can't run on this device.
const bridgeFooter = (reason: string | null): string => {
  if (reason?.startsWith('NOT_SPATIAL_PLATFORM')) return 'native layout needs PICO OS 6';
  if (reason?.startsWith('SPATIAL_SDK_NOT_LINKED')) return 'Spatial SDK not linked in this build';
  if (reason?.startsWith('SPATIAL_PLATFORM_CHECK_FAILED')) return 'spatial platform check failed';
  return 'native layout bridge unavailable';
};

const DetailsPanel = memo(function DetailsPanelView({
  position,
  tintName,
  bridgeBound,
  bridgeReason,
}: {
  position: Viro3DPoint;
  tintName: string;
  bridgeBound: boolean;
  bridgeReason: string | null;
}): React.JSX.Element {
  return (
    <>
      <PanelPlate width={SIDE_W} height={SIDE_H} />
      <ScaledText
        text="Details"
        position={[0, 0.265, Z_TEXT]}
        width={SIDE_TEXT_W}
        height={0.07}
        fontSize={TITLE_PT}
        weight="700"
      />
      <LucideIcon
        name="settings"
        position={[titleIconX('Details', 0.045, SIDE_TEXT_W), 0.265, Z_TEXT]}
        size={0.045}
        accent
      />
      <ScaledText
        text={`Colour: ${tintName}`}
        position={[0, 0.19, Z_TEXT]}
        width={SIDE_TEXT_W}
        height={0.05}
        fontSize={BODY_PT}
      />
      <LucideIcon name="map-pin" position={[-0.235, 0.14, Z_TEXT]} size={0.035} accent />
      <ScaledText
        text={fmt(position)}
        position={[0.01, 0.14, Z_TEXT]}
        width={0.42}
        height={0.05}
        fontSize={META_PT}
        color={ACCENT}
        align="left"
      />
      <ScaledText
        text="Layout"
        position={[0, 0.065, Z_TEXT]}
        width={SIDE_TEXT_W}
        height={0.05}
        fontSize={BODY_PT}
        weight="700"
      />
      {SURFACES.map((s, i) => {
        const y = 0.015 - i * 0.045;
        return (
          <ViroNode key={s.id} position={[0, y, Z_TEXT]}>
            <ScaledText
              text={`${s.title}${s.pose ? '' : ' (not placed)'}`}
              position={[-0.09, 0, 0]}
              width={0.14}
              height={0.045}
              fontSize={META_PT}
              align="right"
            />
            <LucideIcon name="chevron-right" position={[0.005, 0, 0.001]} size={0.03} accent />
            <ScaledText
              text={PRIMITIVE_LABEL[s.primitive]}
              position={[0.105, 0, 0]}
              width={0.15}
              height={0.045}
              fontSize={META_PT}
              align="left"
            />
          </ViroNode>
        );
      })}
      <ScaledText
        text="Glyphs: ✨ → 🔊"
        position={[0, -0.155, Z_TEXT]}
        width={SIDE_TEXT_W}
        height={0.045}
        fontSize={META_PT}
      />
      <ScaledText
        text={
          bridgeBound
            ? 'PICO layout bridge bound — this scene still draws with Viro.'
            : `Drawn by Viro — ${bridgeFooter(bridgeReason)}.`
        }
        position={[0, -0.21, Z_TEXT]}
        width={SIDE_TEXT_W}
        height={0.09}
        fontSize={META_PT}
        color={ACCENT}
        maxLines={2}
      />
    </>
  );
});

const STAGE_W = 0.9;
const STAGE_H = 0.66;

const StagePanel = memo(function StagePanelView(): React.JSX.Element {
  return (
    <>
      <PanelPlate width={STAGE_W} height={STAGE_H} />
      <ScaledText
        text="Stage"
        position={[0, 0.265, Z_TEXT]}
        width={STAGE_W - 0.08}
        height={0.07}
        fontSize={TITLE_PT}
        weight="700"
      />
      <LucideIcon
        name="house"
        position={[titleIconX('Stage', 0.045, STAGE_W - 0.08), 0.265, Z_TEXT]}
        size={0.045}
        accent
      />
      <ScaledText
        text="Drag to move, tap to recolour"
        position={[0, 0.2, Z_TEXT]}
        width={STAGE_W - 0.08}
        height={0.05}
        fontSize={META_PT}
        color={ACCENT}
      />
    </>
  );
});

const TOOLBAR_W = 0.84;
const TOOLBAR_H = 0.15;
const TOOL_W = 0.24;
const TOOL_H = 0.1;
const TOOL_PITCH = 0.26;

const ControlsPanel = memo(function ControlsPanelView({
  onReset,
  onNext,
  onExit,
}: {
  onReset: () => void;
  onNext: () => void;
  onExit: () => void;
}): React.JSX.Element {
  const tools: { label: string; icon: 'circle' | 'chevron-right' | 'x'; onPress: () => void }[] = [
    { label: 'Reset cube', icon: 'circle', onPress: onReset },
    { label: 'Next colour', icon: 'chevron-right', onPress: onNext },
    { label: 'Exit', icon: 'x', onPress: onExit },
  ];
  return (
    <>
      <PanelPlate width={TOOLBAR_W} height={TOOLBAR_H} />
      {tools.map((t, i) => (
        <PanelButton
          key={t.label}
          position={[(i - 1) * TOOL_PITCH, 0, 0]}
          width={TOOL_W}
          height={TOOL_H}
          onPress={t.onPress}
        >
          {(() => {
            // Centre [icon gap text] as one unit.
            const iconW = 0.035;
            const gap = 0.014;
            const textW = t.label.length * charW(BODY_PT);
            const groupW = iconW + gap + textW;
            const iconX = -groupW / 2 + iconW / 2;
            const textX = -groupW / 2 + iconW + gap + textW / 2;
            return (
              <>
                <LucideIcon name={t.icon} position={[iconX, 0, Z_TEXT]} size={iconW} />
                <ScaledText
                  text={t.label}
                  position={[textX, 0, Z_TEXT]}
                  width={textW}
                  height={0.05}
                  fontSize={BODY_PT}
                  weight="600"
                  align="center"
                />
              </>
            );
          })()}
        </PanelButton>
      ))}
    </>
  );
});

// ─── Scene ───────────────────────────────────────────────────────────────────

export function SpatialWorkspaceScene(): React.JSX.Element {
  const [position, setPosition] = useState<Viro3DPoint>(CUBE_HOME);
  const [tint, setTint] = useState(0);
  const { focused, onHover } = useTargetFocus();
  const [pressed, onClickState] = usePressState();
  const [layoutReadiness] = useState(getSpatialLayoutReadiness);

  // FixedDistance keeps the cube on the ray at its current depth.
  const onDrag = useCallback((to: Viro3DPoint) => setPosition(to), []);
  const nextTint = useCallback(() => setTint((t) => (t + 1) % TINTS.length), []);
  const reset = useCallback(() => {
    setPosition(CUBE_HOME);
    setTint(0);
  }, []);
  // Same exit path as the hardware back handler in VrSceneRoot.
  const exit = useCallback(() => {
    void exitImmersiveScene();
  }, []);

  const scale: Viro3DPoint = pressed
    ? [0.97, 0.97, 0.97]
    : focused
      ? [1.04, 1.04, 1.04]
      : [1, 1, 1];

  const panel = (s: ResolvedSurface): React.ReactNode => {
    switch (s.id) {
      case 'library':
        return <LibraryPanel selected={tint} onSelect={setTint} />;
      case 'stage':
        return <StagePanel />;
      case 'details':
        return (
          <DetailsPanel
            position={position}
            tintName={TINT_LABEL[TINTS[tint]]}
            bridgeBound={layoutReadiness.nativeLayoutBridgeBound}
            bridgeReason={layoutReadiness.bridgeReason}
          />
        );
      case 'controls':
        return <ControlsPanel onReset={reset} onNext={nextTint} onExit={exit} />;
    }
  };

  return (
    <ViroScene>
      <XrController />

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

      {SURFACES.map((s) =>
        s.pose ? (
          <Surface key={s.id} pose={s.pose}>
            {panel(s)}
          </Surface>
        ) : null
      )}

      <ViroNode position={position}>
        {/* Shell: always drawn so the cube reads as a target without hover. */}
        <ViroBox
          width={EDGE * 1.12}
          height={EDGE * 1.12}
          length={EDGE * 1.12}
          materials={['focusRing']}
          opacity={focused || pressed ? CUBE_SHELL_ACTIVE : CUBE_SHELL_REST}
          // Larger than the cube and always drawn: without this it would take
          // the ray's hits and the cube's handlers would never fire.
          ignoreEventHandling
        />
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
          onHover={onHover}
          onClickState={onClickState}
          onClick={nextTint}
        />
      </ViroNode>
    </ViroScene>
  );
}
