import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// ts-jest compiles CommonJS tests with moduleResolution Node10, which ignores
// package.json "exports". Without a "typesVersions" entry, an import of a
// subpath such as '@expo-pico/core/plugin' has no types and the test fails
// with TS2307. Consumers still on moduleResolution "node" hit the same error.

const REPO_ROOT = path.resolve(__dirname, '../../..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

type Case = { pkgName: string; pkgDir: string; specifier: string; typesFile: string };

function subpathTypeExports(): Case[] {
  const dirs = fs
    .readdirSync(PACKAGES_DIR)
    .map((name) => path.join(PACKAGES_DIR, name))
    .concat(path.join(PACKAGES_DIR, 'internal', 'pico-platform-service-common'));
  const out: Case[] = [];
  for (const pkgDir of dirs) {
    const pkgJson = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgJson)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8')) as {
      name: string;
      exports?: Record<string, string | { types?: string }>;
    };
    for (const [key, entry] of Object.entries(pkg.exports ?? {})) {
      if (key === '.' || !key.startsWith('./') || typeof entry === 'string' || !entry.types) {
        continue;
      }
      out.push({
        pkgName: pkg.name,
        pkgDir,
        specifier: `${pkg.name}/${key.slice(2)}`,
        typesFile: path.join(pkgDir, entry.types),
      });
    }
  }
  return out;
}

const cases = subpathTypeExports();

describe('subpath exports resolve under moduleResolution Node10', () => {
  it('covers the core plugin subpaths', () => {
    expect(cases.map((c) => c.specifier)).toEqual(
      expect.arrayContaining(['@expo-pico/core/plugin', '@expo-pico/core/plugin/viro'])
    );
  });

  it.each(cases)(
    '$specifier resolves to its exports types file',
    ({ pkgName, pkgDir, specifier, typesFile }) => {
      // Paths under the hoisted node_modules link, rewritten to the package.
      const linkDir = path.join(REPO_ROOT, 'node_modules', pkgName);
      const toPackage = (p: string) =>
        p.startsWith(linkDir + path.sep) ? path.join(pkgDir, p.slice(linkDir.length)) : p;
      // The build output may not exist yet when this runs, so the host treats
      // the exports types file as present. Everything else is the real disk.
      const host: ts.ModuleResolutionHost = {
        fileExists: (p) => toPackage(path.resolve(p)) === typesFile || ts.sys.fileExists(p),
        readFile: ts.sys.readFile,
        directoryExists: ts.sys.directoryExists,
      };
      const { resolvedModule } = ts.resolveModuleName(
        specifier,
        path.join(REPO_ROOT, 'probe.ts'),
        { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 },
        host
      );
      expect(resolvedModule && toPackage(path.resolve(resolvedModule.resolvedFileName))).toBe(
        typesFile
      );
    }
  );
});
