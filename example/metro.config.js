// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle 3D model assets. Viro's Viro3DObject loads .glb / .gltf / .obj / .vrx
// through require() — expo-asset wraps the file with a localUri at runtime,
// but Metro has to recognize the extension as an asset first or it tries to
// parse the binary as JavaScript.
const MODEL_EXTS = ['glb', 'gltf', 'obj', 'mtl', 'vrx', 'hdr'];
config.resolver.assetExts = [...new Set([...(config.resolver.assetExts ?? []), ...MODEL_EXTS])];

// Monorepo workspaces: tell Metro to watch the workspace root so symlinked
// `@expo-pico/*` packages reload on edit.
const path = require('path');
const workspaceRoot = path.resolve(__dirname, '..');
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// SVG as components. react-native-svg-transformer compiles .svg imports into
// react-native-svg elements, so brand assets stay vector at any panel scale
// instead of shipping a raster per density.
//
// .svg has to move out of assetExts as well as into sourceExts — leaving it in
// both makes Metro treat it as a binary asset and the transformer never runs.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
