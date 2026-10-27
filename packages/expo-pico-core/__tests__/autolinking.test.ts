import * as fs from 'fs';
import * as path from 'path';

import { PICO_NATIVE_PACKAGES } from '../plugin/src/withPicoNitroModules';

// The resolver the Expo CLI and React Native's Gradle plugin use to build the
// autolinking config. A package it returns null for is never included in
// settings.gradle, so its Nitro library silently drops out of the APK.
const { resolveDependencyConfigImplAndroidAsync } =
  require('expo-modules-autolinking/build/reactNativeConfig/androidResolver') as {
    resolveDependencyConfigImplAndroidAsync: (
      packageRoot: string,
      reactNativeConfig: unknown,
      expoModuleConfig: unknown
    ) => Promise<{ packageImportPath: string; packageInstance: string; sourceDir: string } | null>;
  };

const PACKAGES_DIR = path.join(__dirname, '..', '..');

function packageDir(name: string): string {
  return path.join(PACKAGES_DIR, name.replace('@expo-pico/', 'expo-pico-'));
}

describe.each(PICO_NATIVE_PACKAGES)('%s autolinking', (name) => {
  const dir = packageDir(name);
  const rnConfig = require(path.join(dir, 'react-native.config.js'));
  const android = rnConfig.dependency.platforms.android;

  it('resolves to an Android dependency', async () => {
    const resolved = await resolveDependencyConfigImplAndroidAsync(dir, android, undefined);
    expect(resolved).not.toBeNull();
    expect(resolved!.sourceDir).toBe(path.join(dir, 'android'));
  });

  it('names a ReactPackage class that exists in a compiled source set', () => {
    const fqcn = /^import ([\w.]+);$/.exec(android.packageImportPath)![1];
    const className = fqcn.split('.').pop()!;
    const sources = path.join(dir, 'android', 'src', 'nitro');
    const files: string[] = [];
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name === `${className}.kt`) files.push(p);
      }
    };
    walk(sources);
    expect(files).toHaveLength(1);
    const kt = fs.readFileSync(files[0], 'utf8');
    expect(kt).toContain(`package ${fqcn.slice(0, -className.length - 1)}`);
    expect(kt).toMatch(new RegExp(`class ${className}\\b[^{]*ReactPackage`));
    expect(android.packageInstance).toBe(`new ${className}()`);
  });

  it('ships react-native.config.js', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    expect(pkg.files).toContain('react-native.config.js');
  });
});
