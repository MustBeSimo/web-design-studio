import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
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
