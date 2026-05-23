/**
 * Final manifest patches that MUST run after every other plugin —
 * specifically after `@expo-pico/core`, which writes a few entries that
 * fight our dual-activity model on Pico OS 6:
 *
 *   - `<meta-data pvr.app.type="vr"/>` at <application> scope in the
 *     pico-flavor manifest. Application-scope `pvr.app.type=vr` makes
 *     Pico treat *every* activity (including MainActivity and the dev
 *     launcher) as a VR entry, which forces the 2D React tree to render
 *     inside the XR container on launch.
 *
 *   - `org.khronos.openxr.intent.category.IMMERSIVE_HMD` on MainActivity.
 *     Tells the Pico launcher to spawn MainActivity in the immersive
 *     container, but MainActivity is our 2D panel — that mis-routes the
 *     launch and the user sees the 2D tree in XR.
 *
 *   - Additional pico.* `uses-feature` declarations needed for hand /
 *     eye / face / body / scene-mesh / spatial-anchor / foveated.
 *
 *   - Per-activity meta-data on .VRActivity (pvr.app.type=vr,
 *     taskAffinity="", excludeFromRecents="true").
 *
 * This is the same logic as `scripts/patch-manifest-postprebuild.js`, but
 * as a real Expo config plugin so it runs automatically on every prebuild
 * (no separate npm-script step that can be skipped or run out of order).
 *
 * The plugin uses `withDangerousMod` and must be registered FIRST in the
 * `plugins` array of app.json. Expo composes withMod chains as decorators:
 * the LAST plugin to register a dangerous mod becomes the innermost layer
 * and runs FIRST; the FIRST plugin to register becomes the outermost layer
 * and runs LAST. So to win the manifest-write race against `@expo-pico/core`,
 * register this plugin before it (i.e. at the top of the plugins array).
 * Counter-intuitive, but verified by adding logging to both ends of the
 * chain — see commits 2026-05-23.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const PICO_FEATURES = [
  'pico.hardware.handtracking',
  'pico.hardware.eyetracking',
  'pico.hardware.facetracking',
  'pico.hardware.bodytracking',
  'pico.hardware.scene_mesh',
  'pico.software.spatial_anchor',
  'pico.feature.foveated_rendering',
];

module.exports = function withPicoPostpatch(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const mainManifest = path.join(projectRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
      const picoManifest = path.join(projectRoot, 'app', 'src', 'pico', 'AndroidManifest.xml');

      if (fs.existsSync(mainManifest)) {
        const xml = patchMainManifest(fs.readFileSync(mainManifest, 'utf8'));
        fs.writeFileSync(mainManifest, xml, 'utf8');
      }
      if (fs.existsSync(picoManifest)) {
        const xml = patchPicoFlavorManifest(fs.readFileSync(picoManifest, 'utf8'));
        fs.writeFileSync(picoManifest, xml, 'utf8');
      }
      return config;
    },
  ]);
};

function patchMainManifest(xml) {
  // Strip any application-level pvr.app.type left behind by prior plugins.
  // The only allowed location is INSIDE .VRActivity (added below).
  xml = xml.replace(
    /\s*<meta-data android:name="pvr\.app\.type"[^/]*\/>/g,
    '',
  );

  // Ensure each Pico capability uses-feature is present (idempotent).
  for (const name of PICO_FEATURES) {
    if (xml.includes(`android:name="${name}"`)) continue;
    xml = xml.replace(
      /(<application\b)/,
      `<uses-feature android:name="${name}" android:required="false"/>\n  $1`,
    );
  }

  // Patch .VRActivity: per-activity pvr.app.type=vr + taskAffinity="" +
  // excludeFromRecents="true".
  const VR_RE = /<activity[^>]*\bandroid:name="\.VRActivity"[\s\S]*?<\/activity>/;
  const m = xml.match(VR_RE);
  if (m) {
    let block = m[0];
    if (!block.includes('android:name="pvr.app.type"')) {
      block = block.replace(
        /<\/activity>/,
        '\n      <meta-data android:name="pvr.app.type" android:value="vr"/>\n    </activity>',
      );
    }
    if (!/android:taskAffinity="[^"]*"/.test(block.match(/<activity[^>]*>/)[0])) {
      block = block.replace(
        /<activity\b([^>]*)>/,
        '<activity$1 android:taskAffinity="">',
      );
    }
    if (!/android:excludeFromRecents="[^"]*"/.test(block.match(/<activity[^>]*>/)[0])) {
      block = block.replace(
        /<activity\b([^>]*)>/,
        '<activity$1 android:excludeFromRecents="true">',
      );
    }
    xml = xml.replace(m[0], block);
  }

  return xml;
}

function patchPicoFlavorManifest(xml) {
  // Strip application-scope pvr.app.type that @expo-pico/core writes.
  xml = xml.replace(
    /\s*<meta-data android:name="pvr\.app\.type"[^/]*\/>/g,
    '',
  );
  // Strip the entire MainActivity merge block written by @expo-pico/core.
  // It adds IMMERSIVE_HMD + com.pico.intent.category.VR launcher categories
  // that route Pico's launcher to spawn MainActivity in the XR container.
  // The base manifest already declares MainActivity with a plain LAUNCHER
  // filter; the merge result keeps that.
  xml = xml.replace(
    /\s*<activity android:name="\.MainActivity"[\s\S]*?<\/activity>/g,
    '',
  );
  return xml;
}
