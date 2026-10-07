import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedPicoOptions } from './types';

const digest = (file: string): string =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/**
 * The only ABI these overlays are staged for.
 *
 * PICO ships no 32-bit device, and `scripts/verify-16kb-alignment.py` — the
 * one thing in this repo that can vouch for a staged binary — reads 64-bit
 * ELF only. Staging `armeabi-v7a` would put a library nothing here can check
 * into the source set, and `ndkAbiFilters: false` is a supported option, so
 * the Gradle ABI filter is not a guarantee it stays out of the APK.
 *
 * A copy an earlier plugin version staged is still removed: cleanup walks the
 * recorded `.expo-pico-overlays.json` state, not just the current ABI list.
 */
const OVERLAY_ABI = 'arm64-v8a';

/**
 * Source sets whose copy of an overlay this plugin owns: it writes there when
 * enabled and removes its own copy otherwise. `main` holds copies from plugin
 * versions before flavor-scoped overlays. The loader never goes to quest, so
 * a user's own loader in `app/src/quest` is not this plugin's to judge. A
 * user's own renderer there is only an error when the overlay would replace it.
 */
const LOADER_MANAGED_FLAVORS = ['main', 'pico', 'dual'];
const RENDERER_MANAGED_FLAVORS = ['main', 'pico', 'dual', 'quest'];

/** Flavor source sets that receive PICO-only overlays. */
function picoFlavors(options: ResolvedPicoOptions): string[] {
  return options.buildVariant === 'dual' ? ['pico', 'dual'] : ['pico'];
}

/**
 * Compatibility overlays for older AARs. The native ViroCore renderer remains
 * authoritative; modern paired AAR builds can disable both overlays. ELF page
 * alignment must be checked in the resulting artifact, independent of OS name.
 * Record hashes so incremental prebuild updates and removals preserve user files.
 *
 * The two overlays go to different flavors:
 * - `libopenxr_loader.so` goes to pico (and dual) only. It is the generic
 *   Khronos loader, but stock Viro 3.0.2 already ships a 16KB-aligned loader
 *   that exports every `xr*` symbol the overlay renderer imports, so Quest has
 *   no reason to swap it.
 * - `libviro_renderer.so` and the assets it loads (`controller_neutral.glb`)
 *   replace Viro's OpenXR renderer for every headset, and the floor origin and
 *   controller mesh apply on Quest as well. They go to pico, dual and quest. Core
 *   declares the `quest` flavor itself whenever these overlays can be active
 *   (`buildVariant` `pico` or `dual`; see `renderFlavorBlock`), so
 *   `app/src/quest` is always a real source set here. Without it, Quest builds
 *   get the stock renderer: floor at eye level and no controller models.
 *
 * `main` and `mobile` never get either. Only files under `jniLibs/` and
 * `assets/` are written; no manifest entry follows the renderer into quest.
 */
export function syncPicoOverlays(
  platformRoot: string,
  options: ResolvedPicoOptions,
  stagedRoot = path.resolve(__dirname, '../assets')
): void {
  const sourceRoot = path.join(platformRoot, 'app/src');
  const statePath = path.join(sourceRoot, '.expo-pico-overlays.json');
  const previous: Record<string, string> = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
    : {};
  const next: Record<string, string> = {};
  const active = options.xrMode !== 'mobile' && options.buildVariant !== 'mobile';
  const loaderFlavors = picoFlavors(options);
  const rendererFlavors = [...loaderFlavors, 'quest'];
  const staged: {
    relative: string;
    source: string;
    enabled: boolean;
    flavors: string[];
    managed: string[];
  }[] = [];
  for (const library of ['libopenxr_loader.so', 'libviro_renderer.so']) {
    const isLoader = library === 'libopenxr_loader.so';
    const enabled =
      active && (isLoader ? options.openXrLoaderOverlay : options.viroRendererOverlay);
    const relative = path.join('jniLibs', OVERLAY_ABI, library);
    const source = path.join(stagedRoot, relative);
    if (enabled && !fs.existsSync(source)) {
      throw new Error(
        `[expo-pico-core] Missing staged ${relative}. Disable the overlay to use a rebuilt AAR.`
      );
    }
    if (fs.existsSync(source)) {
      staged.push({
        relative,
        source,
        enabled,
        flavors: isLoader ? loaderFlavors : rendererFlavors,
        managed: isLoader ? LOADER_MANAGED_FLAVORS : RENDERER_MANAGED_FLAVORS,
      });
    }
  }
  const assets = path.join(stagedRoot, 'androidAssets');
  if (fs.existsSync(assets)) {
    for (const name of fs.readdirSync(assets)) {
      const source = path.join(assets, name);
      if (fs.statSync(source).isFile())
        staged.push({
          relative: path.join('assets', name),
          source,
          enabled: active && options.viroRendererOverlay,
          flavors: rendererFlavors,
          managed: RENDERER_MANAGED_FLAVORS,
        });
    }
  }
  const desired = new Map<string, string>();
  const known = new Map<string, string>();
  for (const entry of staged) {
    for (const flavor of entry.managed) {
      const relative = path.join(flavor, entry.relative);
      known.set(relative, digest(entry.source));
      if (entry.enabled && entry.flavors.includes(flavor)) desired.set(relative, entry.source);
    }
  }
  // `src/quest` was not ours before 1.1. A file there that we neither recorded
  // nor want to write belongs to the app, unless it is byte-for-byte our copy.
  const foreign = (relative: string, target: string): boolean =>
    relative.startsWith('quest' + path.sep) &&
    !desired.has(relative) &&
    previous[relative] === undefined &&
    digest(target) !== known.get(relative);
  // Clean only content we can attribute to this plugin. Unknown legacy files
  // must be reviewed explicitly; silently keeping them can mask a new AAR.
  for (const relative of new Set([...Object.keys(previous), ...known.keys()])) {
    const target = path.resolve(sourceRoot, relative);
    if (!target.startsWith(path.resolve(sourceRoot) + path.sep)) {
      throw new Error('[expo-pico-core] Invalid overlay state path');
    }
    if (fs.existsSync(target) && !foreign(relative, target)) {
      const current = digest(target);
      if (current !== previous[relative] && current !== known.get(relative)) {
        throw new Error(
          `[expo-pico-core] Review custom native override ${target} before prebuild; it was not modified.`
        );
      }
    }
  }
  for (const relative of new Set([...Object.keys(previous), ...known.keys()])) {
    const target = path.resolve(sourceRoot, relative);
    const source = desired.get(relative);
    if (fs.existsSync(target) && !source && !foreign(relative, target)) {
      fs.unlinkSync(target);
    }
    if (source) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (!fs.existsSync(target) || digest(target) !== known.get(relative)) {
        fs.copyFileSync(source, target);
      }
      next[relative] = digest(source);
    }
  }
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(next, null, 2) + '\n');
}

export const withPicoOpenXrLoaderOverlay: ConfigPlugin<ResolvedPicoOptions> = (config, options) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      syncPicoOverlays(cfg.modRequest.platformProjectRoot, options);
      return cfg;
    },
  ]);
