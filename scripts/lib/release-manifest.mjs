const APP_TEMPLATES = new Set(['@expo-pico/template']);
const LIFECYCLE_SCRIPTS = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'prepublishOnly',
  'preprepare',
  'prepare',
  'postprepare',
  'prepack',
  'postpack',
  'publish',
  'postpublish',
]);

export function isAppTemplate(manifest) {
  return APP_TEMPLATES.has(manifest.name);
}

export function prepareReleaseManifest(manifest) {
  if (isAppTemplate(manifest)) {
    if (manifest.scripts) {
      for (const name of LIFECYCLE_SCRIPTS) delete manifest.scripts[name];
      if (!Object.keys(manifest.scripts).length) delete manifest.scripts;
    }
  } else {
    delete manifest.scripts;
    delete manifest.devDependencies;
  }
  return manifest;
}
