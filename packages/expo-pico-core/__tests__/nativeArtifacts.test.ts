import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { checkPicoNativeArtifacts } from '../plugin/src/withPicoNativeArtifacts';

let project: string;
let rendererRoot: string;
const artifacts = {
  renderer: 'android/viro_renderer/viro_renderer-release.aar',
  bridge: 'android/react_viro/react_viro-release.aar',
};
// The consumer guard checks archive signatures, not ZIP contents; the
// renderer's release verifier validates the native libraries inside each AAR.
const archive = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);

function installRenderer(): void {
  fs.mkdirSync(rendererRoot, { recursive: true });
  fs.writeFileSync(
    path.join(rendererRoot, 'package.json'),
    JSON.stringify({ name: '@reactvision/react-viro', version: '3.1.0' })
  );
  for (const relative of Object.values(artifacts)) {
    const file = path.join(rendererRoot, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, archive);
  }
}

function writeManifest(): Record<string, unknown> {
  const manifest = {
    schemaVersion: 1,
    ...Object.fromEntries(
      Object.entries(artifacts).map(([kind, relative]) => [
        kind,
        {
          path: relative,
          sourceCommit: 'a'.repeat(40),
          sha256: createHash('sha256').update(archive).digest('hex'),
        },
      ])
    ),
  };
  fs.writeFileSync(
    path.join(rendererRoot, 'android/native-artifacts.json'),
    JSON.stringify(manifest)
  );
  return manifest;
}

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'pico-artifacts-'));
  rendererRoot = path.join(project, 'node_modules/@reactvision/react-viro');
  fs.writeFileSync(path.join(project, 'package.json'), '{}');
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

it('does not require a renderer for a native panel app', () => {
  expect(checkPicoNativeArtifacts(project)).toEqual([]);
});

it('accepts upstream packages that ship both archives without a provenance manifest', () => {
  installRenderer();
  expect(checkPicoNativeArtifacts(project)).toEqual([]);
});

it('reports an omitted bridge AAR before Gradle starts', () => {
  installRenderer();
  fs.unlinkSync(path.join(rendererRoot, artifacts.bridge));
  expect(checkPicoNativeArtifacts(project)).toEqual([
    expect.objectContaining({ id: 'viro.bridge-artifact-invalid', severity: 'error' }),
  ]);
});

it('rejects Git LFS pointers instead of treating them as shipped AARs', () => {
  installRenderer();
  fs.writeFileSync(
    path.join(rendererRoot, artifacts.renderer),
    'version https://git-lfs.github.com/spec/v1\noid sha256:deadbeef\nsize 100\n'
  );
  const findings = checkPicoNativeArtifacts(project);
  expect(findings[0].id).toBe('viro.renderer-artifact-invalid');
  expect(findings[0].message).toContain('Reinstall a complete, pinned Viro release');
});

it('accepts a paired release with both source commits and matching hashes', () => {
  installRenderer();
  writeManifest();
  expect(checkPicoNativeArtifacts(project)).toEqual([]);
});

it('detects an AAR replaced independently of its paired release', () => {
  installRenderer();
  writeManifest();
  fs.appendFileSync(path.join(rendererRoot, artifacts.renderer), 'different build');
  expect(checkPicoNativeArtifacts(project)).toEqual([
    expect.objectContaining({ id: 'viro.renderer-artifact-mismatch', severity: 'error' }),
  ]);
});

it('rejects a manifest that points outside the fixed package artifact paths', () => {
  installRenderer();
  const manifest = writeManifest();
  manifest.renderer = {
    path: '../../../unrelated.aar',
    sha256: 'a'.repeat(64),
    sourceCommit: 'a'.repeat(40),
  };
  fs.writeFileSync(
    path.join(rendererRoot, 'android/native-artifacts.json'),
    JSON.stringify(manifest)
  );
  expect(checkPicoNativeArtifacts(project)[0].id).toBe('viro.artifact-manifest-invalid');
});
