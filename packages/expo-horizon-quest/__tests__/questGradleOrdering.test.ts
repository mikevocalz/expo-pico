import { resolveQuestOptions } from '../plugin/src/types';
import { updateQuestFlavorBlock } from '../plugin/src/withQuestGradle';
import { applyMetaLayoutGradle } from '../plugin/src/withQuestMetaLayout';

/**
 * `questImplementation` exists only once the `quest` flavor is declared, so
 * the flavor block must precede the Meta Layout SDK block in
 * app/build.gradle whichever mod runs first. With the pico flavor on,
 * expo-horizon-core does not declare `quest` itself, and a reversed order
 * failed `assemblePicoDebug` with "Could not find method
 * questImplementation()" (device QA, 2026-11-04).
 */

const options = resolveQuestOptions({ metaLayoutSdk: true });

// What a PICO-enabled prebuild leaves before the quest plugin runs: the
// `device` dimension and the pico and mobile flavors, no quest flavor.
const PICO_APP_GRADLE = `apply plugin: "com.android.application"

android {
    flavorDimensions "device"
    productFlavors {
        mobile { dimension "device" }
        pico { dimension "device" }
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

const flavorAt = (gradle: string) => gradle.indexOf('// expo-horizon-quest: begin quest flavor');
const firstQuestImplementation = (gradle: string) => gradle.indexOf('questImplementation');

const metaThenFlavor = (gradle: string) =>
  updateQuestFlavorBlock(applyMetaLayoutGradle(gradle, true), options);
const flavorThenMeta = (gradle: string) =>
  applyMetaLayoutGradle(updateQuestFlavorBlock(gradle, options), true);

describe.each([
  ['Meta Layout block first (Expo reverse registration order)', metaThenFlavor],
  ['quest flavor first', flavorThenMeta],
])('quest flavor and Meta Layout SDK ordering: %s', (_name, prebuild) => {
  it('declares the quest flavor above every questImplementation call', () => {
    const out = prebuild(PICO_APP_GRADLE);
    expect(flavorAt(out)).toBeGreaterThan(-1);
    expect(firstQuestImplementation(out)).toBeGreaterThan(flavorAt(out));
  });

  it('keeps one copy of each block across repeated prebuilds', () => {
    const twice = prebuild(prebuild(PICO_APP_GRADLE));
    expect(twice.split('// expo-horizon-quest: begin quest flavor').length - 1).toBe(1);
    expect(twice.split('// expo-pico-core: Meta VR Layout SDK (quest only)').length - 1).toBe(1);
    expect(firstQuestImplementation(twice)).toBeGreaterThan(flavorAt(twice));
  });

  it('leaves the pico and mobile flavors where they were', () => {
    const out = prebuild(PICO_APP_GRADLE);
    expect(out.startsWith(PICO_APP_GRADLE.trimEnd())).toBe(true);
  });
});

it('builds the quest-only file the same way when the Layout SDK is off', () => {
  const out = updateQuestFlavorBlock(applyMetaLayoutGradle(PICO_APP_GRADLE, false), options);
  expect(out).not.toContain('questImplementation');
  expect(flavorAt(out)).toBeGreaterThan(PICO_APP_GRADLE.length - 2);
});
