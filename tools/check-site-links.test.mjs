import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { extractLocalRefs, missingRefs } from './check-site-links.mjs';

const html = `
<a href="SKILL.md">Read</a>
<a href="skills/cinematic-scroll/SKILL.md">Read</a>
<a href="examples/aureus-flythrough/">Open</a>
<video src="assets/video/x.mp4?v=2" poster="assets/brand/p.jpg#frag"></video>
<a href="https://github.com/x/y">repo</a>
<a href="#worlds">anchor</a>
<a href="mailto:a@b.c">mail</a>
<img src="data:image/png;base64,AAAA">
<link rel="stylesheet" href="assets/studio-brand.css">
`;

test('extracts relative href/src/poster targets, drops query and hash, skips absolute and inline schemes', () => {
  assert.deepEqual(extractLocalRefs(html).sort(), [
    'SKILL.md', 'assets/brand/p.jpg', 'assets/studio-brand.css', 'assets/video/x.mp4',
    'examples/aureus-flythrough/', 'skills/cinematic-scroll/SKILL.md',
  ]);
});

test('reports targets that do not exist relative to the page, treating a trailing slash as a directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'site-'));
  mkdirSync(join(root, 'skills', 'cinematic-scroll'), { recursive: true });
  mkdirSync(join(root, 'examples', 'aureus-flythrough'), { recursive: true });
  mkdirSync(join(root, 'assets', 'video'), { recursive: true });
  mkdirSync(join(root, 'assets', 'brand'), { recursive: true });
  writeFileSync(join(root, 'skills', 'cinematic-scroll', 'SKILL.md'), '# s');
  writeFileSync(join(root, 'examples', 'aureus-flythrough', 'index.html'), '<html></html>');
  writeFileSync(join(root, 'assets', 'video', 'x.mp4'), '');
  writeFileSync(join(root, 'assets', 'brand', 'p.jpg'), '');
  writeFileSync(join(root, 'index.html'), html);
  assert.deepEqual(missingRefs(root, 'index.html').sort(), ['SKILL.md', 'assets/studio-brand.css']);
});

test('runs the site checker through a bin symlink', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'site-bin-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entry = join(root, 'check-site-links');
  symlinkSync(fileURLToPath(new URL('./check-site-links.mjs', import.meta.url)), entry);
  const result = spawnSync(process.execPath, [entry], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /local links resolve/);
});

test('--root checks the assembled tree, including custom page paths and missing roots', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'assembled site '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'nested'));
  writeFileSync(join(root, 'nested/page.html'), '<img src="../missing.jpg">');
  const tool = fileURLToPath(new URL('./check-site-links.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
  assert.equal(run('--root', root, 'nested/page.html').status, 1);
  writeFileSync(join(root, 'missing.jpg'), 'image');
  const pass = run('nested/page.html', '--root', root);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /1 local links resolve across 1 page/);
  assert.notEqual(run('--root', join(root, 'absent')).status, 0);
  assert.notEqual(run('--root', root).status, 0, 'missing default pages cannot silently pass');
  assert.equal(run('--root').status, 2);
});
