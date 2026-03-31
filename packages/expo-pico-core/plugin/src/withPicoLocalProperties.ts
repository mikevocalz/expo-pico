import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedPicoOptions } from './types';

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
export const withPicoLocalProperties: ConfigPlugin<ResolvedPicoOptions> = (config, _options) => {
  return withDangerousMod(config, [
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
        if (contents.length > 0) contents += '\n';
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

export default withPicoLocalProperties;
