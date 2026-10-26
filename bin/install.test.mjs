import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, symlinkSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { discoverSkills, installSkills, parseArgs } from './install.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('discovers the three skills from the package root', () => {
  assert.deepEqual(discoverSkills(pkgRoot).map((s) => s.name).sort(), ['cinematic-scroll', 'launch-page-strategy', 'scroll-audit']);
  for (const skill of discoverSkills(pkgRoot)) assert.ok(skill.description.length > 40, skill.name);
});

test('installs a selected skill into --dir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  const out = installSkills({ pkgRoot, skillsDir: dir, only: ['cinematic-scroll'] });
  assert.equal(out.length, 1);
  assert.equal(out[0].target, join(dir, 'cinematic-scroll'));
  assert.ok(existsSync(join(dir, 'cinematic-scroll', 'SKILL.md')));
  assert.ok(existsSync(join(dir, 'cinematic-scroll', 'references', 'recipe-catalog.md')));
  assert.ok(!existsSync(join(dir, 'scroll-audit')));
});

test('installs from a different working directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  execFileSync(process.execPath, [join(pkgRoot, 'bin/install.mjs'), '--dir', dir], { cwd: tmpdir() });
  assert.ok(existsSync(join(dir, 'scroll-audit', 'SKILL.md')));
  assert.ok(existsSync(join(dir, 'launch-page-strategy', 'SKILL.md')));
  assert.ok(existsSync(join(dir, 'cinematic-scroll', 'SKILL.md')));
});

test('an unknown skill name exits 1 and names the available skills', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  assert.throws(
    () => execFileSync(process.execPath, [join(pkgRoot, 'bin/install.mjs'), '--dir', dir, '--skill', 'nope'], { stdio: 'pipe' }),
    (error) => error.status === 1 && /Unknown skill "nope"\. Available: cinematic-scroll, launch-page-strategy, scroll-audit/.test(String(error.stderr)),
  );
});

test('runs when invoked through a symlink, as npm installs its bin shims', () => {
  const shimDir = mkdtempSync(join(tmpdir(), 'shim-'));
  const shim = join(shimDir, 'cinematic-scroll-skill');
  symlinkSync(join(pkgRoot, 'bin/install.mjs'), shim);
  const out = execFileSync(process.execPath, [shim, '--list'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.match(out, /cinematic-scroll —/);
  assert.match(out, /scroll-audit —/);
});

test('announces when it replaces an existing folder of the same name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  mkdirSync(join(dir, 'scroll-audit'));
  writeFileSync(join(dir, 'scroll-audit', 'stray.txt'), 'old');
  const out = execFileSync(process.execPath, [join(pkgRoot, 'bin/install.mjs'), '--dir', dir, '--skill', 'scroll-audit'], { encoding: 'utf8' });
  assert.match(out, /replac/i);
  assert.ok(!existsSync(join(dir, 'scroll-audit', 'stray.txt')));
  assert.ok(existsSync(join(dir, 'scroll-audit', 'SKILL.md')));
});

test('parses flags', () => {
  assert.deepEqual(parseArgs(['--dir', '~/x', '--skill', 'a,b', '--skill', 'c', '--list']), { dir: '~/x', only: ['a', 'b', 'c'], list: true, help: false });
  assert.deepEqual(parseArgs([]), { dir: undefined, only: undefined, list: false, help: false });
  assert.equal(parseArgs(['-h']).help, true);
});
