import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSkillDir, validateCollection } from './check-skills.mjs';

const fm = (name, version = '3.0.0') => `---\nname: ${name}\ndescription: Does a thing.\nmetadata:\n  version: ${version}\n---\n\n# ${name}\n\nSee [ref](references/a.md).\n`;

function skill(root, name, { version, extra } = {}) {
  const dir = join(root, 'skills', name);
  mkdirSync(join(dir, 'references'), { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), fm(name, version));
  writeFileSync(join(dir, 'references', 'a.md'), '# a\n');
  for (const [file, body] of Object.entries(extra ?? {})) writeFileSync(join(dir, file), body);
  return dir;
}

test('a text-only, self-contained skill with matching name and version is valid', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  assert.deepEqual(validateSkillDir(skill(root, 'good'), { version: '3.0.0' }), []);
});

test('rejects non-text files but allows .clawhubignore', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  const dir = skill(root, 'bin', { extra: { '.clawhubignore': '*.log\n', '.DS_Store': 'x' } });
  const errors = validateSkillDir(dir, { version: '3.0.0' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /\.DS_Store/);
});

test('reports version mismatch, name mismatch and a broken link', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  const dir = skill(root, 'other', { version: '2.9.9' });
  writeFileSync(join(dir, 'SKILL.md'), fm('wrong-name', '2.9.9').replace('references/a.md', 'references/missing.md'));
  const errors = validateSkillDir(dir, { version: '3.0.0' });
  assert.equal(errors.length, 3, errors.join('\n'));
});

test('rejects a license key and an oversized folder', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  const dir = skill(root, 'heavy', { extra: { 'big.txt': 'x'.repeat(300_001) } });
  writeFileSync(join(dir, 'SKILL.md'), fm('heavy').replace('metadata:', 'license: MIT\nmetadata:'));
  const errors = validateSkillDir(dir, { version: '3.0.0' });
  assert.equal(errors.length, 2, errors.join('\n'));
  assert.ok(errors.some((e) => /license/.test(e)));
  assert.ok(errors.some((e) => /300,?000|bytes/.test(e)));
});

test('collection fails when a root SKILL.md exists and the flag is set', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  skill(root, 'good');
  writeFileSync(join(root, 'SKILL.md'), fm('good'));
  assert.equal(validateCollection(root, { version: '3.0.0' }).errors.length, 0);
  const flagged = validateCollection(root, { version: '3.0.0', forbidRootSkill: true });
  assert.match(flagged.errors[0], /root SKILL\.md/);
  assert.deepEqual(flagged.skills, ['good']);
});
