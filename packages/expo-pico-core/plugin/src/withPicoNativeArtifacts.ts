import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

import type { ResolvedPicoOptions } from './types';
import type { DiagnosticCheckFinding } from './withPicoDiagnostics';

const VIRO_PACKAGE = '@reactvision/react-viro';
const ARTIFACTS = {
  renderer: 'android/viro_renderer/viro_renderer-release.aar',
  bridge: 'android/react_viro/react_viro-release.aar',
} as const;
const RECOVERY =
  'Reinstall a complete, pinned Viro release that includes both Android AARs. ' +
  'The package supplies these files; app builds do not require manual AAR copies or renderer builds.';

/**
 * Check the artifacts delivered by an installed renderer, when one is present.
 * Panel apps need no renderer. Upstream Viro releases without a provenance
 * manifest remain supported; paired releases additionally verify their hashes.
 * This check never downloads or modifies a dependency.
 */
export function checkPicoNativeArtifacts(projectRoot: string): DiagnosticCheckFinding[] {
  const requireFromApp = createRequire(path.resolve(projectRoot, 'package.json'));
  let packageRoot: string;
  try {
    packageRoot = path.dirname(requireFromApp.resolve(`${VIRO_PACKAGE}/package.json`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') return [];
    return [
      {
        id: 'viro.package-unreadable',
        severity: 'error',
        message: `Cannot inspect ${VIRO_PACKAGE}: ${String(error)}. ${RECOVERY}`,
      },
    ];
  }

  const findings: DiagnosticCheckFinding[] = [];
  const complete = new Set<string>();
  for (const [kind, relative] of Object.entries(ARTIFACTS)) {
    const file = path.join(packageRoot, relative);
    try {
      const descriptor = fs.openSync(file, 'r');
      const signature = Buffer.alloc(4);
      let valid = false;
      try {
        valid =
          fs.fstatSync(descriptor).isFile() &&
          fs.readSync(descriptor, signature, 0, signature.length, 0) === 4 &&
          signature.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      } finally {
        fs.closeSync(descriptor);
      }
      if (!valid) throw new Error('not an Android ZIP archive (possibly a Git LFS pointer)');
      complete.add(kind);
    } catch (error) {
      findings.push({
        id: `viro.${kind}-artifact-invalid`,
        severity: 'error',
        message: `${VIRO_PACKAGE}/${relative} is missing or unreadable: ${String(error)}. ${RECOVERY}`,
      });
    }
  }

  const manifestPath = path.join(packageRoot, 'android/native-artifacts.json');
  if (!fs.existsSync(manifestPath)) return findings;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.schemaVersion !== 1) throw new Error('unsupported schemaVersion');
    for (const [kind, relative] of Object.entries(ARTIFACTS)) {
      const artifact = manifest[kind];
      if (
        artifact?.path !== relative ||
        typeof artifact.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(artifact.sha256) ||
        typeof artifact.sourceCommit !== 'string' ||
        !/^[a-f0-9]{40}$/.test(artifact.sourceCommit)
      ) {
        throw new Error(`invalid ${kind} path, SHA-256, or source commit`);
      }
      if (!complete.has(kind)) continue;
      const actual = createHash('sha256')
        .update(fs.readFileSync(path.join(packageRoot, relative)))
        .digest('hex');
      if (actual !== artifact.sha256) {
        findings.push({
          id: `viro.${kind}-artifact-mismatch`,
          severity: 'error',
          message:
            `${VIRO_PACKAGE}/${relative} does not match its paired release manifest. ` + RECOVERY,
        });
      }
    }
  } catch (error) {
    findings.push({
      id: 'viro.artifact-manifest-invalid',
      severity: 'error',
      message: `${VIRO_PACKAGE}/android/native-artifacts.json is invalid: ${String(error)}. ${RECOVERY}`,
    });
  }
  return findings;
}

export function usesPicoArtifacts(options: ResolvedPicoOptions): boolean {
  return options.enabled && options.xrMode !== 'mobile' && options.buildVariant !== 'mobile';
}

export const withPicoNativeArtifacts: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  if (!usesPicoArtifacts(options)) return config;
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const findings = checkPicoNativeArtifacts(cfg.modRequest.projectRoot);
      if (findings.length > 0) {
        throw new Error(
          `[expo-pico-core] Installed Viro artifacts need attention:\n${findings
            .map((finding) => finding.message)
            .join('\n')}`
        );
      }
      return cfg;
    },
  ]);
};
