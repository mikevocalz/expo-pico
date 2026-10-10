import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { QUEST_OPTION_NAMES, resolveQuestOptions } from '../plugin/src/types';
import { updateQuestFlavorBlock, updateQuestProjectGradle } from '../plugin/src/withQuestGradle';
import {
  QUEST_OVERLAY_STATE,
  syncQuestRendererOverlay,
} from '../plugin/src/withQuestRendererOverlay';

const renderer = 'jniLibs/arm64-v8a/libviro_renderer.so';
const glb = 'assets/controller_neutral.glb';

let root: string;
let staged: string;
const put = (file: string, text: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const quest = (rel: string) => path.join(root, 'app/src/quest', rel);
const on = { viroRendererOverlay: true };
const off = { viroRendererOverlay: false };

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-overlay-'));
  staged = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-staged-'));
  put(path.join(staged, 'jniLibs/arm64-v8a/libviro_renderer.so'), 'VIRO');
  put(path.join(staged, 'androidAssets/controller_neutral.glb'), 'MESH');
});

describe('resolveQuestOptions', () => {
  it('defaults everything off except the arm64 filter', () => {
    expect(resolveQuestOptions()).toEqual({
      metaLayoutSdk: false,
      storeDeviceTargets: null,
      questRemovePermissions: [],
      questRemoveFeatures: [],
      questExcludeDependencies: [],
      viroRendererOverlay: false,
      ndkAbiFilters: true,
    });
  });
  it('lists every option name', () => {
    expect([...QUEST_OPTION_NAMES].sort()).toEqual(Object.keys(resolveQuestOptions()).sort());
  });
});

describe('syncQuestRendererOverlay', () => {
  it('stages the renderer and mesh into quest only', () => {
    syncQuestRendererOverlay(root, on, staged);
    expect(fs.readFileSync(quest(renderer), 'utf8')).toBe('VIRO');
    expect(fs.readFileSync(quest(glb), 'utf8')).toBe('MESH');
    expect(fs.readdirSync(path.join(root, 'app/src')).sort()).toEqual([
      QUEST_OVERLAY_STATE,
      'quest',
    ]);
  });

  it('removes its own copies and state when turned off', () => {
    syncQuestRendererOverlay(root, on, staged);
    syncQuestRendererOverlay(root, off, staged);
    expect(fs.existsSync(quest(renderer))).toBe(false);
    expect(fs.existsSync(quest(glb))).toBe(false);
    expect(fs.existsSync(path.join(root, 'app/src', QUEST_OVERLAY_STATE))).toBe(false);
  });

  it('removes a copy an older @expo-pico/core left, matched by content', () => {
    put(quest(renderer), 'VIRO');
    syncQuestRendererOverlay(root, off, staged);
    expect(fs.existsSync(quest(renderer))).toBe(false);
  });

  it('leaves an app-owned renderer alone when off', () => {
    put(quest(renderer), 'USER');
    syncQuestRendererOverlay(root, off, staged);
    expect(fs.readFileSync(quest(renderer), 'utf8')).toBe('USER');
  });

  it('stops prebuild instead of replacing an app-owned renderer', () => {
    put(quest(renderer), 'USER');
    expect(() => syncQuestRendererOverlay(root, on, staged)).toThrow(
      /Review custom native override/
    );
    expect(fs.readFileSync(quest(renderer), 'utf8')).toBe('USER');
  });

  it('fails when the overlay is on but nothing is staged', () => {
    fs.rmSync(staged, { recursive: true });
    expect(() => syncQuestRendererOverlay(root, on, staged)).toThrow(/Missing staged/);
  });

  it('is idempotent', () => {
    syncQuestRendererOverlay(root, on, staged);
    const mtime = fs.statSync(quest(renderer)).mtimeMs;
    syncQuestRendererOverlay(root, on, staged);
    expect(fs.statSync(quest(renderer)).mtimeMs).toBe(mtime);
  });
});

describe('quest flavor Gradle block', () => {
  const opts = resolveQuestOptions();
  it('declares quest without touching flavorDimensions', () => {
    const out = updateQuestFlavorBlock('android {}\n', opts);
    expect(out).toContain('quest {\n            dimension "device"');
    expect(out).toContain('minSdkVersion 29');
    expect(out).toContain("matchingFallbacks = ['mobile']");
    expect(out).toContain("abiFilters 'arm64-v8a'");
    expect(out).not.toContain('flavorDimensions');
    expect(out).not.toMatch(/\bpico\b/);
  });
  it('is rewritten, not stacked', () => {
    const once = updateQuestFlavorBlock('android {}\n', opts);
    expect(updateQuestFlavorBlock(once, opts)).toBe(once);
    const filterOff = updateQuestFlavorBlock(once, resolveQuestOptions({ ndkAbiFilters: false }));
    expect(filterOff).not.toContain('abiFilters');
    expect(filterOff.match(/begin quest flavor/g)).toHaveLength(1);
  });
  it('adds the renderer pickFirst for quest only with the overlay on', () => {
    const out = updateQuestFlavorBlock('', resolveQuestOptions({ viroRendererOverlay: true }));
    expect(out).toContain('it.second == "quest"');
    expect(out).toContain('**/libviro_renderer.so');
    expect(out).not.toContain('libopenxr_loader');
    expect(updateQuestFlavorBlock('', opts)).not.toContain('pickFirsts');
  });
  it('adds the project fixes once', () => {
    const once = updateQuestProjectGradle('');
    expect(once).toContain('buildFeatures.buildConfig = true');
    expect(once).toContain("missingDimensionStrategy 'device', 'mobile'");
    expect(updateQuestProjectGradle(once)).toBe(once);
  });
});
