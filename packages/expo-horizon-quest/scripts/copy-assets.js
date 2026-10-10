// Copies the Viro renderer overlay that the quest flavor stages from
// @expo-pico/core's plugin assets, so the binary is stored in git once.
const fs = require('fs');
const path = require('path');

const from = path.resolve(__dirname, '../../expo-pico-core/plugin/assets');
const to = path.resolve(__dirname, '../plugin/assets');
const files = ['jniLibs/arm64-v8a/libviro_renderer.so', 'androidAssets/controller_neutral.glb'];

fs.rmSync(to, { recursive: true, force: true });
for (const file of files) {
  fs.mkdirSync(path.dirname(path.join(to, file)), { recursive: true });
  fs.copyFileSync(path.join(from, file), path.join(to, file));
}
