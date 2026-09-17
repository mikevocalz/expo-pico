#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PICO_CLI_PACKAGE = '@picoxr/pico-cli@0.5.0';
const usage = `Usage: node scripts/pico-cli.mjs <doctor|devices|install|launch|capture> [options]
  --device SERIAL    Required for install, launch, capture
  --apk PATH         Required for install (build assemblePicoDebug first)
  --package ID       Required for launch/capture; launch the panel to create Viro's scene intent
  --out DIRECTORY    Required for capture; saves device info, package logcat, screenshot
  --dry-run          Print commands without invoking PICO CLI
Commands use the pinned PICO CLI 0.5.0 through npx. No setup or native scaffolding is run.`;

export function plan(argv) {
  const [command, ...args] = argv;
  if (!command || command === '--help') return { help: true };
  const values = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--dry-run') {
      values.dryRun = true;
      continue;
    }
    if (
      !['--device', '--apk', '--package', '--out'].includes(key) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    ) {
      throw new Error(`Invalid option: ${key}\n${usage}`);
    }
    if (values[key] !== undefined) throw new Error(`Duplicate option: ${key}`);
    values[key] = args[++i];
  }
  const requireValue = (key) => {
    if (!values[key]?.trim()) throw new Error(`${command} requires ${key}`);
    return values[key];
  };
  const jobs = [];
  if (command === 'doctor') jobs.push({ args: ['doctor', '--format', 'json'], json: true });
  else if (command === 'devices')
    jobs.push({ args: ['device', 'list', '--format', 'json'], json: true });
  else {
    if (!['install', 'launch', 'capture'].includes(command))
      throw new Error(`Unknown command: ${command}`);
    const device = requireValue('--device');
    if (command === 'install') {
      const apk = path.resolve(requireValue('--apk'));
      if (!apk.endsWith('.apk')) throw new Error('--apk must be an APK');
      if (!values.dryRun && !existsSync(apk)) throw new Error(`APK not found: ${apk}`);
      jobs.push({ args: ['app', 'install', apk, '--device', device, '--replace'] });
    } else {
      const app = requireValue('--package');
      if (!/^[A-Za-z_]\w*(\.[A-Za-z_]\w*)+$/.test(app))
        throw new Error('Invalid Android package ID');
      if (command === 'launch') jobs.push({ args: ['app', 'launch', app, '--device', device] });
      else {
        const out = path.resolve(requireValue('--out'));
        jobs.push({
          args: ['device', 'info', '--device', device, '--format', 'json'],
          json: true,
          file: path.join(out, 'device.json'),
        });
        jobs.push({
          args: [
            'app',
            'logcat',
            '--device',
            device,
            '--package',
            app,
            '--lines',
            '1000',
            '--format',
            'json',
          ],
          json: true,
          file: path.join(out, 'logcat.json'),
        });
        jobs.push({
          args: [
            'capture',
            'screenshot',
            '--device',
            device,
            '--out',
            path.join(out, 'screenshot.png'),
          ],
          directory: out,
        });
      }
    }
  }
  return { jobs, dryRun: Boolean(values.dryRun) };
}

// PICO CLI doctor can exit zero with tool_status=FAILED. Propagate that failure.
export function validateResult(result, expectsJson) {
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`PICO CLI exited ${result.status ?? result.signal}`);
  if (expectsJson) {
    const payload = JSON.parse(result.stdout);
    if (payload.tool_status === 'FAILED' || payload.success === false) {
      throw new Error(payload.summary || 'PICO CLI reported failure');
    }
  }
}

export function main(argv, run = spawnSync) {
  const planned = plan(argv);
  if (planned.help) {
    console.log(usage);
    return;
  }
  for (const job of planned.jobs) {
    const args = ['--yes', PICO_CLI_PACKAGE, ...job.args];
    if (planned.dryRun) {
      console.log(JSON.stringify({ command: 'npx', args, output: job.file }));
      continue;
    }
    if (job.file || job.directory)
      mkdirSync(job.directory ?? path.dirname(job.file), { recursive: true });
    // Use Node to run npm's npx entry point: no shell interpolation, including on Windows.
    const npmExec = process.env.npm_execpath;
    const npxEntry = npmExec?.endsWith('npm-cli.js')
      ? path.join(path.dirname(npmExec), 'npx-cli.js')
      : null;
    const command = npxEntry && existsSync(npxEntry) ? process.execPath : 'npx';
    if (process.platform === 'win32' && command === 'npx')
      throw new Error('On Windows run this script through npm run pico:<command>.');
    const result = run(command, npxEntry && existsSync(npxEntry) ? [npxEntry, ...args] : args, {
      encoding: 'utf8',
      shell: false,
      maxBuffer: 16 * 1024 * 1024,
      timeout: 120000,
    });
    if (result.stdout) {
      if (job.file) writeFileSync(job.file, result.stdout);
      else process.stdout.write(result.stdout);
    }
    if (result.stderr) process.stderr.write(result.stderr);
    validateResult(result, job.json);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
