import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs, verify, summarize } from './verify-build.mjs';

const clean = () => ({ status: 0, stdout: 'passed', stderr: '' });
function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'cinematic-verify-test-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, 'index.html'), '<!doctype html><title>Fixture</title>');
  return cwd;
}

test('targets resolve from the caller, including spaces and absolute paths', t => {
  const cwd = fixture(t);
  for (const target of ['index.html', join(cwd, 'index.html')]) {
    const calls = [];
    const report = verify(parseArgs([target]), { cwd, execute: (cmd, args, options) => { calls.push({ cmd, args, options }); return clean(); } });
    assert.equal(report.ok, true);
    assert.equal(report.target, join(cwd, 'index.html'));
    assert.ok(calls.some(c => c.args.includes(join(cwd, 'index.html'))));
  }
});

test('runtime failures cannot be optional successes, including under strict', t => {
  const cwd = fixture(t);
  for (const extra of [[], ['--strict']]) {
    const report = verify(parseArgs(['index.html', '--runtime', ...extra]), { cwd,
      execute: (cmd, args) => args[0].endsWith('matrix.mjs') ? { status: 1, stderr: 'uncaught exception' } : clean() });
    assert.equal(report.ok, false);
    assert.equal(report.exitCode, 1);
  }
});

test('a missing browser is incomplete, not clean', t => {
  const report = verify(parseArgs(['index.html', '--phase', 'polish']), { cwd: fixture(t),
    execute: (cmd, args) => args[0].endsWith('matrix.mjs') ? { status: 2, stderr: 'no browser' } : clean() });
  assert.equal(report.verdict, 'INCOMPLETE');
  assert.equal(report.exitCode, 2);
  assert.equal(report.steps.find(step => step.name === 'page-proof matrix').skipped, true);
});

test('fast polish explicitly remains incomplete', t => {
  const report = verify(parseArgs(['index.html', '--phase', 'polish', '--fast']), { cwd: fixture(t), execute: clean });
  assert.equal(report.ok, false);
  assert.equal(report.exitCode, 2);
});

test('URL targets go to the browser and are never scanned as source files', () => {
  const calls = [];
  const report = verify(parseArgs(['http://localhost:3000/story', '--runtime']), {
    execute: (cmd, args) => { calls.push(args); return clean(); } });
  assert.equal(report.ok, true);
  assert.ok(calls.some(a => a.includes('http://localhost:3000/story')));
  assert.ok(calls.every(a => !a[0].includes('cinematic-doctor')));
});

test('Mode B compilation failure fails even without a local node_modules directory', t => {
  const cwd = fixture(t);
  mkdirSync(join(cwd, 'app space'));
  writeFileSync(join(cwd, 'app space/package.json'), '{"scripts":{"build":"exit 1"}}');
  const calls = [];
  const report = verify(parseArgs(['--mode-b', 'app space']), { cwd,
    execute: (cmd, args, config) => { calls.push({ cmd, args, config }); return cmd === 'npm' && args.includes('build') ? { status: 1, stderr: 'build failed' } : clean(); } });
  assert.equal(report.exitCode, 1);
  assert.equal(calls.find(c => c.cmd === 'npm').config.cwd, resolve(cwd, 'app space'));
});

test('missing target and subprocess failure do not pass', t => {
  assert.equal(verify(parseArgs(['missing.html']), { cwd: fixture(t), execute: clean }).exitCode, 1);
  assert.equal(verify(parseArgs([]), { execute: () => ({ status: null, error: new Error('ENOENT') }) }).exitCode, 1);
});

test('invalid thresholds, phases, missing values and unknown flags are rejected', () => {
  for (const args of [
    ['--min', 'NaN'], ['--min', '101'], ['--min'], ['--phase', 'release'], ['--oops'], ['--phase', 'polish'],
    ['--scope', 'repo'], ['--doctor-mode', 'optional'], ['--scope', 'package', 'index.html'], ['--scope', 'output'],
    ['index.html', '--profiles', 'desktop'], ['index.html', '--runtime', '--profiles', 'desktop,television'],
  ]) {
    assert.throws(() => parseArgs(args));
  }
});

test('output scope omits package checks and records its verification policy', t => {
  const cwd = fixture(t);
  const calls = [];
  const report = verify(parseArgs(['index.html', '--scope', 'output']), { cwd,
    execute: (cmd, args) => { calls.push(args); return clean(); } });
  assert.equal(report.scope, 'output');
  assert.equal(report.doctorMode, 'required');
  assert.deepEqual(report.advisories, []);
  assert.ok(calls.some(args => args[0].endsWith('cinematic-doctor/cli.mjs')));
  assert.ok(calls.some(args => args[0].endsWith('preflight-3d.mjs')));
  assert.ok(calls.every(args => !/check-(?:tokens|themes|links)\.mjs$/.test(args[0])));
});

test('package scope runs only bundled contract checks', () => {
  const calls = [];
  const report = verify(parseArgs(['--scope', 'package']), {
    execute: (cmd, args) => { calls.push(args); return clean(); },
  });
  assert.equal(report.ok, true);
  assert.deepEqual(report.steps.map(step => step.name), ['tokens:check', 'themes:check', 'links:check']);
  assert.equal(calls.length, 3);
});

test('advisory doctor findings are reported without changing the exit code', t => {
  const cwd = fixture(t);
  const execute = (cmd, args) => args[0].endsWith('cinematic-doctor/cli.mjs') ?
    { status: 1, stderr: 'score 72 below 80' } : clean();
  const advisory = verify(parseArgs(['index.html', '--scope', 'output', '--doctor-mode', 'advisory']), { cwd, execute });
  assert.equal(advisory.exitCode, 0);
  assert.equal(advisory.advisories.length, 1);
  assert.equal(advisory.steps.find(step => step.advisory).advisoryFailure, true);
  const required = verify(parseArgs(['index.html', '--scope', 'output']), { cwd, execute });
  assert.equal(required.exitCode, 1);
});

test('advisory doctor mode does not soften incomplete or failed invocation', t => {
  const cwd = fixture(t);
  const run = result => verify(parseArgs(['index.html', '--scope', 'output', '--doctor-mode', 'advisory']), { cwd,
    execute: (cmd, args) => args[0].endsWith('cinematic-doctor/cli.mjs') ? result : clean() });
  const incomplete = run({ status: 2, stderr: 'invalid doctor invocation' });
  assert.equal(incomplete.verdict, 'INCOMPLETE');
  assert.equal(incomplete.exitCode, 2);
  assert.equal(incomplete.advisories.length, 0);
  const failed = run({ status: null, error: new Error('spawn ENOENT') });
  assert.equal(failed.verdict, 'FAIL');
  assert.equal(failed.exitCode, 1);
  assert.equal(failed.advisories.length, 0);
});

test('focused runtime profiles are normalized and forwarded to page proof', t => {
  const cwd = fixture(t);
  const calls = [];
  const options = parseArgs(['index.html', '--scope', 'output', '--runtime', '--profiles', 'mobile,desktop,mobile']);
  const report = verify(options, { cwd, execute: (cmd, args) => { calls.push(args); return clean(); } });
  assert.equal(report.browserProfiles, 'mobile,desktop');
  const matrix = calls.find(args => args[0].endsWith('matrix.mjs'));
  assert.equal(matrix[matrix.indexOf('--profiles') + 1], 'mobile,desktop');
});

test('failure takes precedence over skipped evidence', () => {
  assert.equal(summarize([{ ok: false }, { ok: false, skipped: true }]).exitCode, 1);
  assert.equal(summarize([{ ok: false, skipped: true }], true).exitCode, 1);
});
