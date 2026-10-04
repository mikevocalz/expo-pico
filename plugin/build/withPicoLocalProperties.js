"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoLocalProperties = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LOCAL_PROPS_NODE_MARKER = '# expo-pico-core: node path';
/**
 * Patches android/local.properties to ensure:
 *   1. `nodejs.dir` is set so Android Studio (which may launch outside a shell
 *      where nvm shims are unavailable) can resolve the `node` binary used
 *      during the React Native bundler invocation.
 *   2. `pico.sdk.dir` / `pico.editor.dir` are written when provided via env
 *      vars (PICO_SDK_DIR, PICO_EDITOR_DIR), mirroring the convention that
 *      Android Studio uses for `sdk.dir`.
 *
 * local.properties is intentionally NOT committed to source control, so
 * mutations here are safe to apply unconditionally on each prebuild.
 */
const withPicoLocalProperties = (config, _options) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const localPropsPath = path.join(projectRoot, 'android', 'local.properties');
            let contents = '';
            if (fs.existsSync(localPropsPath)) {
                contents = fs.readFileSync(localPropsPath, 'utf8');
            }
            // 1. Node path — resolve the binary that launched this process.
            //    process.execPath is the absolute path to the node binary, which
            //    works correctly whether the user is using nvm, volta, fnm, or a
            //    system install.
            if (!contents.includes(LOCAL_PROPS_NODE_MARKER)) {
                const nodeBin = path.dirname(process.execPath);
                // Escape backslashes for Windows paths in Java properties files.
                const nodePathEscaped = nodeBin.replace(/\\/g, '\\\\');
                contents = contents.trimEnd();
                if (contents.length > 0)
                    contents += '\n';
                contents += `\n${LOCAL_PROPS_NODE_MARKER}\nnodejs.dir=${nodePathEscaped}\n`;
            }
            // 2. PICO SDK dir — only written when the env var is present.
            const picoSdkDir = process.env.PICO_SDK_DIR;
            if (picoSdkDir && !contents.includes('pico.sdk.dir=')) {
                contents = contents.trimEnd() + '\n';
                contents += `pico.sdk.dir=${picoSdkDir.replace(/\\/g, '\\\\')}\n`;
            }
            // 3. PICO Editor dir — only written when the env var is present.
            const picoEditorDir = process.env.PICO_EDITOR_DIR;
            if (picoEditorDir && !contents.includes('pico.editor.dir=')) {
                contents = contents.trimEnd() + '\n';
                contents += `pico.editor.dir=${picoEditorDir.replace(/\\/g, '\\\\')}\n`;
            }
            fs.writeFileSync(localPropsPath, contents, 'utf8');
            return config;
        },
    ]);
};
exports.withPicoLocalProperties = withPicoLocalProperties;
exports.default = exports.withPicoLocalProperties;
//# sourceMappingURL=withPicoLocalProperties.js.map