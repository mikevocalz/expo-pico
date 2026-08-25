#!/usr/bin/env node
/**
 * `expo-pico-doctor` — lint an Expo project's `app.config.{ts,js,json}`
 * against the `expo-pico-core` plugin options schema without running
 * `npx expo prebuild`. Surfaces the same diagnostics the
 * prebuild pass emits, plus a few config-shape checks that require
 * inspecting the raw plugin entry before `resolveOptions` normalizes it.
 *
 * Usage:
 *   npx expo-pico-doctor [--project <path>] [--json] [--fail-on-warning]
 *
 * Exit codes:
 *   0 — no errors (warnings allowed unless --fail-on-warning)
 *   1 — at least one error, or --fail-on-warning and >=1 warning
 *   2 — could not load or parse the Expo config
 *
 * Renderer-agnostic: doctor reads `app.config.*` only. It does not
 * spawn any Android toolchain or touch the filesystem beyond the
 * project root, so it's fast to run inside a pre-commit hook or a
 * GitHub Actions PR check.
 */

// Imported from the compiled plugin artifacts so the CLI has a single
// source root. Requires `yarn build:plugin` before `yarn build:cli` —
// turbo.json declares the dependency so CI builds in the right order.
import {
  resolveOptions,
  type PicoPluginOptions,
  type ResolvedPicoOptions,
} from '../../plugin/build/types';
import {
  runDiagnosticChecks,
  type DiagnosticCheckFinding,
} from '../../plugin/build/withPicoDiagnostics';
import { PPS_GROUP, PPS_LOCAL_AAR_EXCLUDES, PPS_VERSION } from '../../plugin/build/ppsArtifacts';

interface CliArgs {
  projectRoot: string;
  json: boolean;
  failOnWarning: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectRoot: process.cwd(),
    json: false,
    failOnWarning: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project' || a === '-p') {
      args.projectRoot = argv[++i] ?? args.projectRoot;
    } else if (a === '--json') {
      args.json = true;
    } else if (a === '--fail-on-warning') {
      args.failOnWarning = true;
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      process.stderr.write(`expo-pico-doctor: unknown arg '${a}'\n`);
      printHelp();
      process.exit(2);
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(
    [
      'Usage: expo-pico-doctor [options]',
      '',
      'Options:',
      '  --project <path>     Project root (default: cwd)',
      '  --json               Machine-readable JSON output',
      '  --fail-on-warning    Exit 1 on warning as well as error',
      '  --help               Show this help',
      '',
      'Description:',
      "  Lints an Expo project's app.config against the expo-pico-core",
      '  plugin options without running `npx expo prebuild`. Runs the',
      "  same checks as the plugin's prebuild diagnostics pass plus",
      '  raw-config shape checks that `resolveOptions` would normalize',
      '  away.',
      '',
    ].join('\n')
  );
}

/**
 * Read plugin entries from `app.config`. Uses `@expo/config` when
 * available (normal Expo project), falls back to requiring the raw
 * `app.config.{ts,js,json}` file when not. Returns `null` when no
 * config can be located.
 */
function loadPluginOptions(projectRoot: string): PicoPluginOptions | null {
  const raw = loadRawExpoConfig(projectRoot) as
    | (Record<string, unknown> & { expo?: { plugins?: unknown[] } })
    | null;
  if (!raw) return null;

  const plugins: unknown[] = Array.isArray(raw.plugins)
    ? (raw.plugins as unknown[])
    : Array.isArray(raw.expo?.plugins)
    ? (raw.expo!.plugins as unknown[])
    : [];

  for (const entry of plugins) {
    if (typeof entry === 'string' && entry === '@expo-pico/core') {
      return {};
    }
    if (Array.isArray(entry) && entry[0] === '@expo-pico/core') {
      return (entry[1] ?? {}) as PicoPluginOptions;
    }
  }
  return null;
}

/**
 * Best-effort Expo config load. Tries `@expo/config` first (the
 * canonical Expo loader — handles app.config.ts transpilation, merges
 * app.json + app.config.js, etc.). Falls back to reading app.json /
 * app.config.json directly when @expo/config is not installed (e.g.
 * running doctor against a bare-RN project).
 */
function loadRawExpoConfig(projectRoot: string): Record<string, unknown> | null {
  try {
    // Dynamic require so doctor runs even when @expo/config isn't
    // installed (doctor's only runtime dep is `expo-pico-core` itself).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoConfig = require('@expo/config');
    const { exp } = expoConfig.getConfig(projectRoot, { skipPlugins: true });
    return exp as Record<string, unknown>;
  } catch {
    // Fall through to filesystem probe.
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path');

  for (const file of ['app.config.json', 'app.json']) {
    const p = path.join(projectRoot, file);
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        return (parsed.expo ?? parsed) as Record<string, unknown>;
      } catch {
        // Invalid JSON — report later.
      }
    }
  }
  return null;
}

// ── ANSI colors (stdlib-only — no chalk dependency) ──────────────────
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
};

function useColor(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(process.stdout.isTTY);
}

function colorize(text: string, color: keyof typeof COLORS): string {
  return useColor() ? `${COLORS[color]}${text}${COLORS.reset}` : text;
}

function renderFinding(f: DiagnosticCheckFinding): string {
  const tag =
    f.severity === 'error'
      ? colorize('ERROR  ', 'red')
      : f.severity === 'warning'
      ? colorize('WARN   ', 'yellow')
      : colorize('info   ', 'blue');
  const id = colorize(f.id, 'dim');
  return `${tag} ${id}\n        ${f.message}`;
}

/**
 * Locked orientation defeats the panel-size contract.
 *
 * Expo turns `orientation: 'landscape' | 'portrait'` into
 * `android:screenOrientation` on MainActivity. On PICO that pins the activity
 * and the `<layout android:defaultWidth/defaultHeight>` this plugin writes is
 * ignored — the panel silently comes up at the system default size. Same rule
 * expo-horizon-core follows: leave it `default` and let the container decide.
 *
 * Config-level, so it cannot live in runDiagnosticChecks — that reducer only
 * sees resolved plugin options.
 */
function checkOrientation(
  expoConfig: Record<string, unknown> | null,
  resolved: ResolvedPicoOptions
): DiagnosticCheckFinding[] {
  if (!expoConfig) return [];
  const orientation = expoConfig.orientation;
  if (typeof orientation !== 'string' || orientation === 'default') return [];

  const panelSized = Boolean(resolved.defaultWidth || resolved.defaultHeight);
  const picoFlavor = resolved.buildVariant === 'pico' || resolved.buildVariant === 'dual';
  if (!picoFlavor) return [];

  return [
    {
      id: 'orientation-locked',
      // An error only when it is provably breaking something the user asked
      // for; otherwise a warning, since a 2D-only app may want the lock.
      severity: panelSized ? 'error' : 'warning',
      message:
        `app.config orientation is "${orientation}" — set it to "default" so the ` +
        'PICO window container controls the panel dimensions. A locked ' +
        'orientation writes android:screenOrientation onto MainActivity, which ' +
        (panelSized
          ? 'overrides the defaultWidth/defaultHeight you configured.'
          : 'will override defaultWidth/defaultHeight if you set them.'),
    },
  ];
}

/**
 * Duplicate PICO Platform Service artifacts on the Android classpath.
 *
 * `expo-pico-core` declares the `com.pico.pps:*` coordinates once, in the
 * app module, and every sibling `@expo-pico/*` package reaches them
 * transitively — so adding more packages cannot double a declaration. Two
 * things outside the plugin's control still can:
 *
 *  1. A copy of a PPS artifact dropped into `android/app/libs/`. PICO's own
 *     integration docs tell you to put SDK AARs there. The generated
 *     `fileTree` excludes them by name, so the file is inert — but a
 *     developer who put it there is entitled to know it is doing nothing,
 *     and an older plugin version's unbounded `fileTree` would have
 *     packaged it and failed the build on `checkDuplicateClasses`.
 *  2. A hand-written `com.pico.pps` line in `app/build.gradle` outside the
 *     plugin's marker block. The resolution pin keeps the version
 *     consistent, so this is not fatal, but it is a second place to update
 *     on the next SDK bump.
 *
 * Filesystem-level, so it cannot live in `runDiagnosticChecks` — that
 * reducer only sees resolved plugin options.
 */
function checkDuplicatePicoArtifacts(
  projectRoot: string,
  resolved: ResolvedPicoOptions
): DiagnosticCheckFinding[] {
  if (resolved.xrMode === 'mobile') return [];

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path');

  const findings: DiagnosticCheckFinding[] = [];
  const globToRegExp = (glob: string) =>
    new RegExp(`^${glob.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`);
  const excludePatterns = PPS_LOCAL_AAR_EXCLUDES.map(globToRegExp);

  const libsDir = path.join(projectRoot, 'android', 'app', 'libs');
  let shadowed: string[] = [];
  try {
    shadowed = fs
      .readdirSync(libsDir)
      .filter((name: string) => excludePatterns.some((re) => re.test(name)));
  } catch {
    // No android/ yet (managed workflow, pre-prebuild) — nothing to check.
  }

  if (shadowed.length > 0) {
    findings.push({
      id: 'pps-artifact-shadowed-by-libs',
      severity: 'warning',
      message:
        `android/app/libs contains ${shadowed.length} file(s) that ${PPS_GROUP} ` +
        `already supplies from Maven: ${shadowed.join(', ')}. They are excluded ` +
        'from the generated fileTree so the build still succeeds, but nothing ' +
        'loads them — delete them, or pin a different version through the ' +
        "plugin's platformService.services option instead of vendoring.",
    });
  }

  const appGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  let appGradle = '';
  try {
    appGradle = fs.readFileSync(appGradlePath, 'utf8');
  } catch {
    return findings;
  }

  const DEPS_MARKER = '// expo-pico-core: PICO Platform Service SDK (com.pico.pps:*) deps';
  const markerCount = appGradle.split(DEPS_MARKER).length - 1;
  if (markerCount > 1) {
    findings.push({
      id: 'pps-block-injected-twice',
      severity: 'error',
      message:
        `app/build.gradle contains the expo-pico-core PPS dependency block ` +
        `${markerCount} times. Every artifact is declared twice. Delete the ` +
        'duplicate block, or run `npx expo prebuild --clean` to regenerate.',
    });
  }

  // Any pinned PPS coordinate requested at a version other than the one
  // the plugin pins. The resolution pin makes these resolve consistently
  // rather than skewing `pps_sdk_base` away from the services, so this is
  // a warning — but it is a second place to update on the next SDK bump,
  // and it means someone believed they were choosing a version.
  const coordinate = new RegExp(
    `${PPS_GROUP.replace(/\./g, '\\.')}:(platform-service-[a-z]+|pps_sdk_base):([^"'\\s]+)`,
    'g'
  );
  const skewed = new Set<string>();
  for (const match of appGradle.matchAll(coordinate)) {
    const [, name, version] = match;
    if (version !== PPS_VERSION) {
      skewed.add(`${PPS_GROUP}:${name}:${version}`);
    }
  }

  if (skewed.size > 0) {
    findings.push({
      id: 'pps-coordinate-version-skew',
      severity: 'warning',
      message:
        `app/build.gradle requests ${skewed.size} ${PPS_GROUP} coordinate(s) at a ` +
        `version expo-pico-core does not pin: ${[...skewed].sort().join(', ')}. ` +
        `The resolution pin forces them to ${PPS_VERSION} so the services and ` +
        'their shared pps_sdk_base stay in step, which means the version written ' +
        'here has no effect. Remove it, or bump the plugin.',
    });
  }

  return findings;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const raw = loadPluginOptions(args.projectRoot);
  if (raw === null) {
    const err = {
      error: 'expo-pico-core plugin not found in app.config plugins array',
      projectRoot: args.projectRoot,
      hint:
        'Doctor looks for an entry "@expo-pico/core" (or ["@expo-pico/core", {...}]) ' +
        'inside the top-level `plugins` array of app.config.ts / app.config.js / ' +
        'app.config.json / app.json. Add the plugin there and re-run.',
    };
    if (args.json) {
      process.stdout.write(JSON.stringify(err, null, 2) + '\n');
    } else {
      process.stderr.write(
        colorize('expo-pico-doctor: ', 'red') +
          err.error +
          '\n' +
          colorize(`(project root: ${err.projectRoot})\n`, 'gray') +
          colorize(err.hint, 'gray') +
          '\n'
      );
    }
    process.exit(2);
  }

  const resolved = resolveOptions(raw);
  const hasDevClient = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fsLocal = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pathLocal = require('path') as typeof import('path');
      const pkg = JSON.parse(
        fsLocal.readFileSync(pathLocal.join(args.projectRoot, 'package.json'), 'utf8')
      );
      return Boolean(
        pkg.dependencies?.['expo-dev-client'] || pkg.devDependencies?.['expo-dev-client']
      );
    } catch {
      return false;
    }
  })();
  const findings = [
    ...runDiagnosticChecks(resolved, { hasDevClient }),
    ...checkOrientation(loadRawExpoConfig(args.projectRoot), resolved),
    ...checkDuplicatePicoArtifacts(args.projectRoot, resolved),
  ];

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warnCount = findings.filter((f) => f.severity === 'warning').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          projectRoot: args.projectRoot,
          resolvedOptions: resolved,
          findings,
          summary: { errorCount, warnCount, infoCount },
        },
        null,
        2
      ) + '\n'
    );
  } else {
    process.stdout.write(
      colorize('expo-pico-doctor\n', 'bold') +
        colorize(`  project: ${args.projectRoot}\n`, 'gray') +
        colorize(
          `  xrMode: ${resolved.xrMode}   appType: ${resolved.appType}   buildVariant: ${resolved.buildVariant}\n`,
          'gray'
        ) +
        '\n'
    );

    if (findings.length === 0) {
      process.stdout.write(colorize('✓ No issues.\n', 'green'));
    } else {
      for (const f of findings) {
        process.stdout.write(renderFinding(f) + '\n\n');
      }
      const summary =
        `${errorCount} error${errorCount === 1 ? '' : 's'}, ` +
        `${warnCount} warning${warnCount === 1 ? '' : 's'}, ` +
        `${infoCount} info`;
      process.stdout.write(
        errorCount > 0
          ? colorize(summary + '\n', 'red')
          : warnCount > 0
          ? colorize(summary + '\n', 'yellow')
          : colorize(summary + '\n', 'blue')
      );
    }
  }

  if (errorCount > 0) process.exit(1);
  if (args.failOnWarning && warnCount > 0) process.exit(1);
  process.exit(0);
}

main();
