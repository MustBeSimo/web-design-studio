import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { profiles, runMatrix } from './matrix.mjs';

function run(t, failingProfile, status) {
  const out = mkdtempSync(join(tmpdir(), 'cinematic-matrix-test-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const calls = [];
  const report = runMatrix('https://example.com', { out, execute: (cmd, args) => {
    calls.push(args);
    const dir = args[args.indexOf('--out') + 1];
    mkdirSync(dir, { recursive: true });
    const code = dir.endsWith('/' + failingProfile) ? status : 0;
    writeFileSync(join(dir, 'proof.json'), JSON.stringify({ verdict: code ? 'ERRORS' : 'CLEAN', shots: [join(dir, 'shot.png')] }));
    return { status: code, stdout: 'proof result' };
  } });
  return { report, calls };
}

test('matrix actually requests touch, reduced-motion and disabled-JS browser contexts', t => {
  const { report, calls } = run(t);
  assert.equal(report.exitCode, 0);
  assert.equal(calls.length, 5);
  assert.ok(calls.some(a => a.includes('--mobile') && a.includes('--reduced-motion')));
  assert.ok(calls.some(a => a.includes('--no-js')));
  assert.ok(calls.every(a => a.includes('--check-layout')));
});
test('focused runs execute only the requested browser profiles', t => {
  const selectedProfiles = profiles.filter(profile => ['desktop', 'mobile'].includes(profile.name));
  const out = mkdtempSync(join(tmpdir(), 'cinematic-focused-matrix-test-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const calls = [];
  const report = runMatrix('x.html', { out, selectedProfiles, execute: (cmd, args) => {
    calls.push(args);
    const dir = args[args.indexOf('--out') + 1];
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'proof.json'), JSON.stringify({ verdict: 'CLEAN', shots: ['shot.png'] }));
    return { status: 0 };
  } });
  assert.equal(report.ok, true);
  assert.equal(calls.length, 2);
  assert.ok(calls.some(args => args.includes('--mobile')));
});
test('one broken mobile profile fails the whole matrix', t => {
  assert.equal(run(t, 'mobile', 1).report.exitCode, 1);
});
test('missing runtime evidence makes the matrix incomplete', t => {
  assert.equal(run(t, 'no-js', 2).report.exitCode, 2);
});
test('exit zero without a report is not evidence', t => {
  const out = mkdtempSync(join(tmpdir(), 'cinematic-empty-proof-test-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  assert.equal(runMatrix('x.html', { out, execute: () => ({ status: 0 }) }).exitCode, 2);
});
