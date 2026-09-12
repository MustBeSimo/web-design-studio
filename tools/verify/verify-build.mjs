#!/usr/bin/env node
/** Verify the requested output. Exit 0 PASS, 1 FAIL, 2 INCOMPLETE/invalid usage. */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BROWSER_PROFILES = new Set(['desktop', 'mobile', 'reduced-motion', 'mobile-reduced-motion', 'no-js']);

export function parseArgs(argv) {
  const options = {
    phase: 'build', runtime: false, fast: false, strict: false, json: false,
    scope: 'all', 'doctor-mode': 'required',
  };
  const values = new Set(['phase', 'min', 'mode-b', 'report', 'browser', 'profiles', 'scope', 'doctor-mode']);
  const flags = new Set(['runtime', 'fast', 'strict', 'json']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const name = a.slice(2);
      if (flags.has(name)) options[name] = true;
      else if (values.has(name)) {
        if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for ' + a);
        options[name] = argv[++i];
      } else throw new Error('Unknown option: ' + a);
    } else if (!options.target) options.target = a;
    else throw new Error('Unexpected argument: ' + a);
  }
  if (!['build', 'polish'].includes(options.phase)) throw new Error('Phase must be build or polish');
  if (!['all', 'package', 'output'].includes(options.scope)) throw new Error('--scope must be all, package or output');
  if (!['required', 'advisory'].includes(options['doctor-mode'])) throw new Error('--doctor-mode must be required or advisory');
  options.min = Number(options.min ?? (options.phase === 'polish' ? 85 : 80));
  if (!Number.isFinite(options.min) || options.min < 0 || options.min > 100) throw new Error('--min must be 0–100');
  const includesOutput = options.scope !== 'package';
  if (options.scope === 'package' && (options.target || options.runtime || options['mode-b'] || options.profiles)) {
    throw new Error('--scope package cannot be combined with a target, --runtime, --profiles or --mode-b');
  }
  options.runtime ||= includesOutput && options.phase === 'polish';
  if (options.runtime && !options.target) throw new Error('Runtime/polish requires an HTML target or running URL');
  if (options.profiles) {
    const requested = [...new Set(options.profiles.split(',').map(value => value.trim()).filter(Boolean))];
    if (!requested.length || requested.some(value => !BROWSER_PROFILES.has(value))) throw new Error('--profiles contains an unknown browser profile');
    if (!options.runtime) throw new Error('--profiles requires --runtime or --phase polish');
    options.profiles = requested.join(',');
  }
  if (options.scope === 'output' && !options.target && !options['mode-b']) throw new Error('--scope output requires a target or --mode-b directory');
  return options;
}

export function summarize(steps, strict = false) {
  const failed = steps.some(s => !s.ok && !s.skipped);
  const incomplete = steps.some(s => s.skipped);
  const verdict = failed ? 'FAIL' : incomplete ? 'INCOMPLETE' : 'PASS';
  return { ok: verdict === 'PASS', verdict, exitCode: failed ? 1 : incomplete ? (strict ? 1 : 2) : 0 };
}

export function verify(options, { cwd = process.cwd(), root = ROOT, execute = spawnSync } = {}) {
  const steps = [];
  function run(name, command, args, { at = root, unavailableIsSkip = false, advisory = false } = {}) {
    const r = execute(command, args, { cwd: at, encoding: 'utf8', timeout: 600000, maxBuffer: 10 * 1024 * 1024 });
    const output = [r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim();
    const skipped = (unavailableIsSkip && r.status === 2) || (advisory && r.status === 2);
    // Exit 1 is a valid doctor score below threshold. Exit 2 is incomplete
    // invocation and a null status is a spawn failure; neither may be softened.
    const advisoryFailure = advisory && r.status === 1;
    steps.push({
      name, ok: r.status === 0 || advisoryFailure, code: r.status, skipped,
      ...(advisory ? { advisory: true, advisoryFailure } : {}),
      detail: output.split('\n').filter(Boolean).slice(-6).join('\n').slice(-1600),
    });
  }
  const node = (name, file, args = [], config) => run(name, process.execPath, [join(root, file), ...args], config);
  const skip = (name, detail) => steps.push({ name, ok: false, skipped: true, code: null, detail });
  const includesPackage = options.scope !== 'output';
  const includesOutput = options.scope !== 'package';
  if (includesPackage) for (const name of ['tokens', 'themes', 'links']) node(name + ':check', 'tools/check-' + name + '.mjs');

  let target = null;
  let html = null;
  let outputDir = null;
  if (includesOutput && options.target) {
    if (/^https?:\/\//i.test(options.target)) {
      try { target = new URL(options.target).href; }
      catch { steps.push({ name: 'resolve-target', ok: false, detail: 'Invalid URL' }); }
    } else {
      target = resolve(cwd, options.target);
      if (existsSync(target) && statSync(target).isDirectory()) {
        outputDir = target;
        target = join(target, 'index.html');
      }
      if (existsSync(target) && statSync(target).isFile() && /\.html?$/i.test(target)) html = target;
      else { steps.push({ name: 'resolve-target', ok: false, detail: 'No HTML at ' + target }); target = null; }
    }
  }
  const modeBDir = includesOutput && options['mode-b'] ? resolve(cwd, options['mode-b']) : null;
  const preflightTarget = modeBDir && existsSync(modeBDir) ? modeBDir : outputDir || html;
  if (includesOutput && preflightTarget) node('3d dependency preflight', 'tools/verify/preflight-3d.mjs', [preflightTarget, '--quiet'], { at: cwd });
  if (html) node('doctor (min ' + options.min + ')', 'tools/cinematic-doctor/cli.mjs', [html, '--min', String(options.min), '--quiet'],
    { advisory: options['doctor-mode'] === 'advisory' });
  if (includesOutput && target && options.runtime) {
    if (options.fast) skip('page-proof matrix', '--fast omitted requested runtime evidence');
    else {
      const browser = options.browser || process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
      node('page-proof matrix', 'tools/page-proof/matrix.mjs',
        [target, '--out', resolve(cwd, '.verify/proof'), ...(browser ? ['--browser', browser] : []),
          ...(options.profiles ? ['--profiles', options.profiles] : [])],
        { at: cwd, unavailableIsSkip: true });
    }
  }
  if (includesOutput && options['mode-b']) {
    const dir = modeBDir;
    if (!existsSync(join(dir, 'package.json'))) steps.push({ name: 'mode-b', ok: false, detail: 'No package.json at ' + dir });
    else if (options.fast) skip('mode-b typecheck/build', '--fast omitted requested compilation');
    else {
      // Let the project's package scripts decide how dependencies are resolved (including workspaces).
      run('mode-b typecheck', 'npm', ['run', 'typecheck'], { at: dir });
      run('mode-b build', 'npm', ['run', 'build'], { at: dir });
    }
  }
  const advisories = steps.filter(step => step.advisoryFailure).map(({ name, code, detail }) => ({ name, code, detail }));
  return {
    phase: options.phase, target, minScore: options.min,
    scope: options.scope, doctorMode: options['doctor-mode'], browserProfiles: options.profiles || null, advisories,
    ...summarize(steps, options.strict), steps,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = verify(options);
    if (options.report) {
      const file = resolve(options.report);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
    }
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('verify-build: ' + report.verdict);
      for (const step of report.steps) {
        const state = step.skipped ? 'SKIP' : step.advisoryFailure ? 'ADVISE' : step.ok ? 'PASS' : 'FAIL';
        console.log('  ' + state + ' ' + step.name + (step.ok && !step.advisoryFailure ? '' : '\n    ' + step.detail));
      }
    }
    process.exitCode = report.exitCode;
  } catch (error) {
    console.error('verify-build: ' + error.message);
    process.exitCode = 2;
  }
}
