/**
 * Local Expo config plugin: PICO OS 6 compatibility + panel sizing.
 *
 * Mirrors the option shape of expo-horizon-core so a single codebase can
 * declare equivalent VR-panel configuration for both Quest and PICO.
 *
 * Wire into app.json:
 *
 *   "plugins": [
 *     ...
 *     ["./plugins/with-pico-compat", {
 *        "picoAppId": "DEMO_APP_ID",
 *        "defaultWidth": "1024dp",
 *        "defaultHeight": "640dp",
 *        "supportedDevices": "pico4|pico4ultra|swan",
 *        "disableVrHeadtracking": false,
 *        "allowBackup": false
 *     }]
 *   ]
 *
 * What it does (all idempotent):
 *
 * 1. `pvr.app.type=vr` <application> meta-data — gates xrCreateInstance on
 *    Pico. `mr` is rejected (device-tested).
 *
 * 2. `com.pico.app_id` meta-data when `picoAppId` is supplied —
 *    Pico-equivalent of Quest's `com.oculus.app_id`.
 *
 * 3. `<uses-native-library libopenxr_loader.so required="false">` — closes
 *    the OpenXR loader namespace-isolation gap on targetSdkVersion >= 31.
 *
 * 4. `com.pico.intent.category.VR` on MainActivity — adds the app to Pico's
 *    VR Library section. MainActivity also keeps its standard LAUNCHER
 *    intent-filter so it stays in the regular Apps section too. Not added
 *    to VRActivity — would make Pico's launcher prefer VRActivity over
 *    MainActivity on app tap (so app would open straight into XR).
 *
 * 5. Pico spatial-container meta-data on MainActivity — the actual knobs
 *    Pico OS 6 reads for panel dimensions. Android's `<layout>` block is
 *    ignored by Pico's shared space; the spatial container looks up
 *    `pico.spatial.windowcontainer.defaultsize` (+ unit, resize, captionbar,
 *    material background). Schema confirmed by dumping store2d.apk and
 *    PicoUserCenter.apk manifests off a Pico 4 Ultra. The <layout> block is
 *    still written for non-spatial launchers and for future-proofing.
 *
 * 6. `com.pico.supportedDevices` meta-data — analogous to
 *    `com.oculus.supportedDevices`. Limits the app to specific Pico
 *    hardware in launcher listings.
 *
 * 7. `<uses-feature android:name="android.hardware.vr.headtracking">` —
 *    removed when `disableVrHeadtracking: true`. Otherwise required.
 *
 * 8. `android:allowBackup` — set on <application> from the boolean option.
 *
 * Uses `withDangerousMod` because Viro's plugin also writes via
 * withDangerousMod and needs to run before we patch — withAndroidManifest
 * mods run first, then dangerous mods in registration order.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = {
  defaultWidth: '1024dp',
  defaultHeight: '640dp',
  minWidth: '640dp',
  minHeight: '480dp',
};

module.exports = function withPicoCompat(config, props = {}) {
  const opts = {
    picoAppId: props.picoAppId,
    defaultWidth: props.defaultWidth ?? DEFAULTS.defaultWidth,
    defaultHeight: props.defaultHeight ?? DEFAULTS.defaultHeight,
    minWidth: props.minWidth ?? DEFAULTS.minWidth,
    minHeight: props.minHeight ?? DEFAULTS.minHeight,
    supportedDevices: props.supportedDevices,
    disableVrHeadtracking: props.disableVrHeadtracking === true,
    allowBackup: props.allowBackup === true,
  };

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const manifestPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'AndroidManifest.xml',
      );
      if (!fs.existsSync(manifestPath)) return config;

      let xml = fs.readFileSync(manifestPath, 'utf8');
      xml = patch(xml, opts);
      fs.writeFileSync(manifestPath, xml, 'utf8');
      return config;
    },
  ]);
};

function patch(xml, opts) {
  // 1. pvr.app.type=vr — placed ON the .VRActivity element only, NOT at
  //    <application> scope. Application-level `pvr.app.type=vr` causes
  //    Pico's spatial runtime to mark EVERY activity in the app as
  //    `isVrActivity=true` and forces the whole app into XR container mode
  //    on launch (the user sees a black immersive void because MainActivity
  //    isn't a Viro scene). Per-activity placement scopes it: MainActivity
  //    stays a 2D panel, only VRActivity gets the XR contract.
  //
  //    First, remove any stale <application>-level pvr.app.type from previous
  //    runs of this plugin (idempotent migration).
  xml = xml.replace(
    /\s*<meta-data android:name="pvr\.app\.type"[^/]*\/>/g,
    '',
  );
  // Then inject it inside .VRActivity (Pico's runtime reads activity-scope
  // meta-data when xrCreateInstance is called from that activity).
  xml = ensureActivityMeta(xml, '.VRActivity', 'pvr.app.type', 'vr');

  // 2. com.pico.app_id when picoAppId provided
  if (opts.picoAppId) {
    xml = ensureAppMeta(xml, 'com.pico.app_id', opts.picoAppId);
  }

  // 3. uses-native-library libopenxr_loader.so
  if (!xml.includes('libopenxr_loader.so')) {
    xml = xml.replace(
      /(<application[^>]*>)/,
      '$1\n    <uses-native-library android:name="libopenxr_loader.so" android:required="false"/>',
    );
  }

  // 4. com.pico.intent.category.VR on MainActivity (and ONLY MainActivity —
  //    adding to VRActivity makes Pico's launcher prefer it over MainActivity).
  xml = ensureActivityIntentFilter(
    xml,
    '.MainActivity',
    'com.pico.intent.category.VR',
  );

  // 5. Pico spatial window-container meta-data on MainActivity.
  //
  //    Pico OS 6's spatial container IGNORES Android's <layout> block. The
  //    only knobs it reads are `pico.spatial.windowcontainer.*` meta-data
  //    on the activity (verified by aapt-dumping Pico's own store2d.apk
  //    and PicoUserCenter.apk). We still emit <layout> for compatibility
  //    on non-spatial launchers, but `defaultsize` is what controls the
  //    panel in-headset.
  xml = ensureAppMeta(xml, 'pico.spatial.isspatial', '1');
  xml = ensureLayout(xml, '.MainActivity', opts);
  xml = ensurePicoWindowContainer(xml, '.MainActivity', opts);

  // 6. com.pico.supportedDevices meta-data
  if (opts.supportedDevices) {
    xml = ensureAppMeta(xml, 'com.pico.supportedDevices', opts.supportedDevices);
  }

  // 7. Toggle vr.headtracking uses-feature
  if (opts.disableVrHeadtracking) {
    xml = xml.replace(
      /\s*<uses-feature[^>]*android:name="android\.hardware\.vr\.headtracking"[^/]*\/>/g,
      '',
    );
  }

  // 8. allowBackup on <application>
  xml = xml.replace(
    /(<application\b[^>]*\bandroid:allowBackup=")(true|false)(")/,
    `$1${opts.allowBackup ? 'true' : 'false'}$3`,
  );

  return xml;
}

// ──────────────────────────────────────────────────────────────────────────
// helpers

function ensureAppMeta(xml, name, value) {
  const tag = `<meta-data android:name="${name}" android:value="${value}"/>`;
  // Match any existing <meta-data android:name="<name>" ... /> and replace
  const existing = new RegExp(
    `<meta-data android:name="${name.replace(/\./g, '\\.')}"[^/]*\\/>`,
  );
  if (xml.match(existing)) return xml.replace(existing, tag);
  return xml.replace(/(<application[^>]*>)/, `$1\n    ${tag}`);
}

function ensureActivityIntentFilter(xml, activityName, categoryName) {
  const activityRe = new RegExp(
    `<activity[^>]*\\bandroid:name="${activityName.replace(/\./g, '\\.')}"[\\s\\S]*?<\\/activity>`,
  );
  const m = xml.match(activityRe);
  if (!m) return xml;
  if (m[0].includes(categoryName)) return xml;
  const insertion =
    '\n      <intent-filter>\n' +
    '        <action android:name="android.intent.action.MAIN"/>\n' +
    `        <category android:name="${categoryName}"/>\n` +
    '      </intent-filter>\n    ';
  const patched = m[0].replace(/<\/activity>/, `${insertion}</activity>`);
  return xml.replace(m[0], patched);
}

function ensureActivityMeta(xml, activityName, name, value) {
  const activityRe = new RegExp(
    `<activity[^>]*\\bandroid:name="${activityName.replace(/\./g, '\\.')}"[\\s\\S]*?<\\/activity>`,
  );
  const m = xml.match(activityRe);
  if (!m) return xml;
  if (m[0].includes(`android:name="${name}"`)) return xml;
  const tag = `\n      <meta-data android:name="${name}" android:value="${value}"/>\n    `;
  const patched = m[0].replace(/<\/activity>/, `${tag}</activity>`);
  return xml.replace(m[0], patched);
}

// Pico OS 6 spatial container reads these meta-data tags off the activity
// (verified by dumping store2d.apk / PicoUserCenter.apk). The block on
// MainActivity controls the 2D panel size, captionbar, resize behaviour,
// and world scaling. Values mirror Pico's own 2D Store app.
//
//   defaultsize:        "<WIDTH>x<HEIGHT>" in the unit declared below
//   defaultsize.unit:   "meters|dp" — Pico's documented combo for panel
//                       dimensions specified in dp but rendered in meters.
//   resizetype:         2 = user-resizable with snap-to-aspect.
//   captionbar:         0 = no Pico-drawn title bar (app draws its own).
//   worldscaletype:     0 = static world scale.
//   style/materialbg:   match Pico's default light material panel chrome.
function ensurePicoWindowContainer(xml, activityName, opts) {
  const w = stripUnit(opts.defaultWidth);
  const h = stripUnit(opts.defaultHeight);
  const size = `${w}x${h}`;
  const tags = [
    ['pico.spatial.windowcontainer.id', `${activityName.replace(/^\./, '')}Panel`],
    ['pico.spatial.WindowContainer.style', '1'],
    ['pico.spatial.windowcontainer.materialbackground', '1'],
    ['pico.spatial.windowcontainer.materialbackground.type', '1'],
    ['pico.spatial.windowcontainer.resizetype', '2'],
    ['pico.spatial.WindowContainer.size', size],
    ['pico.spatial.windowcontainer.defaultsize', size],
    ['pico.spatial.windowcontainer.defaultsize.unit', 'meters|dp'],
    ['pico.spatial.windowcontainer.worldscaletype', '0'],
    ['pico.spatial.windowcontainer.resizerestriction', '1'],
    ['pico.spatial.windowcontainer.captionbar', '0'],
    ['pico.spatial.windowcontainer.volumealignment', '0'],
    ['pico.spatial.windowcontainer.volumebasepanel', '0'],
  ];
  for (const [name, value] of tags) {
    xml = upsertActivityMeta(xml, activityName, name, value);
  }
  return xml;
}

function stripUnit(value) {
  // Accept "1280dp", "1280", or "1280px" — Pico's defaultsize is a bare
  // integer paired with the .unit meta-data field.
  const m = String(value ?? '').match(/^(\d+)/);
  return m ? m[1] : '1280';
}

// Like ensureActivityMeta, but replaces an existing meta-data entry with
// the new value (ensureActivityMeta is no-op when the name already exists).
function upsertActivityMeta(xml, activityName, name, value) {
  const activityRe = new RegExp(
    `<activity[^>]*\\bandroid:name="${activityName.replace(/\./g, '\\.')}"[\\s\\S]*?<\\/activity>`,
  );
  const m = xml.match(activityRe);
  if (!m) return xml;
  const metaRe = new RegExp(
    `\\s*<meta-data android:name="${name.replace(/\./g, '\\.')}"[^/]*\\/>`,
  );
  const tag = `\n      <meta-data android:name="${name}" android:value="${value}"/>`;
  let patchedActivity;
  if (metaRe.test(m[0])) {
    patchedActivity = m[0].replace(metaRe, tag);
  } else {
    patchedActivity = m[0].replace(/<\/activity>/, `${tag}\n    </activity>`);
  }
  return xml.replace(m[0], patchedActivity);
}

function ensureLayout(xml, activityName, opts) {
  const activityRe = new RegExp(
    `<activity[^>]*\\bandroid:name="${activityName.replace(/\./g, '\\.')}"[\\s\\S]*?<\\/activity>`,
  );
  const m = xml.match(activityRe);
  if (!m) return xml;
  const layoutTag =
    '\n      <layout' +
    `\n        android:defaultWidth="${opts.defaultWidth}"` +
    `\n        android:defaultHeight="${opts.defaultHeight}"` +
    `\n        android:minWidth="${opts.minWidth}"` +
    `\n        android:minHeight="${opts.minHeight}"` +
    '\n        android:gravity="center"/>\n    ';
  // Replace any existing <layout .../> so changes to plugin opts take
  // effect on every prebuild (otherwise stale values from earlier runs
  // get pinned and the panel never updates).
  const existingLayoutRe = /\s*<layout\b[^/]*\/>/;
  let patched;
  if (existingLayoutRe.test(m[0])) {
    patched = m[0].replace(existingLayoutRe, layoutTag.replace(/\n {4}$/, ''));
  } else {
    patched = m[0].replace(/<\/activity>/, `${layoutTag}</activity>`);
  }
  return xml.replace(m[0], patched);
}
