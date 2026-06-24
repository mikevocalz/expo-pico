// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle 3D model assets. Viro's Viro3DObject loads .glb / .gltf / .obj / .vrx
// through require() — expo-asset wraps the file with a localUri at runtime,
// but Metro has to recognize the extension as an asset first or it tries to
// parse the binary as JavaScript.
const MODEL_EXTS = ['glb', 'gltf', 'obj', 'mtl', 'vrx', 'hdr'];
config.resolver.assetExts = [
  ...new Set([...(config.resolver.assetExts ?? []), ...MODEL_EXTS]),
];

// Monorepo workspaces: tell Metro to watch the workspace root so symlinked
// `@expo-pico/*` packages reload on edit.
const path = require('path');
const workspaceRoot = path.resolve(__dirname, '..');
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
