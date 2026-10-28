import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { missingRefs } from './check-site-links.mjs';

const tool = fileURLToPath(new URL('./check-site-links.mjs', import.meta.url));

/** A repo whose main references a video that only exists on an orphan `media` branch. */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'site-overlay-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'overlay test');
  git('config', 'user.email', 'test@example.invalid');
  writeFileSync(join(root, 'index.html'), '<video src="assets/video/clip.mp4"></video><a href="missing.html">x</a>');
  git('add', '.');
  git('commit', '-q', '-m', 'main without media');
  git('checkout', '-q', '--orphan', 'media');
  git('rm', '-rfq', '.');
  mkdirSync(join(root, 'assets', 'video'), { recursive: true });
  writeFileSync(join(root, 'assets', 'video', 'clip.mp4'), 'video bytes');
  git('add', '.');
  git('commit', '-q', '-m', 'media only');
  git('checkout', '-q', 'main');
  return { root, git };
}

test('a path that exists only on the overlay ref counts as present; unrelated dead links still fail', (t) => {
  const { root } = fixture(t);
  assert.deepEqual(missingRefs(root, 'index.html').sort(), ['assets/video/clip.mp4', 'missing.html']);
  assert.deepEqual(missingRefs(root, 'index.html', { overlayRef: 'media' }), ['missing.html']);
});

test('the CLI accepts --overlay-ref and reports the overlay it used', (t) => {
  const { root } = fixture(t);
  writeFileSync(join(root, 'page.html'), '<img src="assets/video/clip.mp4">');
  const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
  assert.equal(run('--root', root, 'page.html').status, 1);
  const pass = run('--root', root, '--overlay-ref', 'media', 'page.html');
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /overlay media/);
  assert.equal(run('--root', root, '--overlay-ref', 'no-such-ref', 'page.html').status, 1, 'an unknown overlay ref must not silently pass');
});
