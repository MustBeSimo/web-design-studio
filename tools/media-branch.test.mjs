import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isMediaCandidate, planMedia, buildPlan, writeBranch } from './media-branch.mjs';

const entry = (path, size = 1) => ({ path, size, mode: '100644' });

test('includes explicit asset directories at every size and other media only above 200 KB', () => {
  for (const path of ['examples/noir/assets/photo.jpg', 'examples/noir/assets/model/scene.bin', 'assets/previews/manifest.json', 'assets/video/clip.mp4', 'assets/brand/hero.mp4']) {
    assert.equal(isMediaCandidate(entry(path)), true, path);
  }
  for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'glb']) {
    assert.equal(isMediaCandidate(entry(`examples/world/hero.${extension}`, 200_001)), true);
    assert.equal(isMediaCandidate(entry(`examples/world/hero.${extension}`, 200_000)), false);
  }
  assert.equal(isMediaCandidate(entry('assets/brand/still.png')), false);
  assert.equal(isMediaCandidate(entry('examples/world/index.html', 300_000)), false);
  assert.equal(isMediaCandidate(entry('assets/brand/nested/small.mp4')), false);
});

test('never classifies the excluded trees, and reports exact totals without double counting', () => {
  for (const directory of ['skills', 'tools', 'bench', 'docs', 'templates']) {
    assert.equal(isMediaCandidate(entry(`${directory}/photo.jpg`, 900_000)), false);
  }
  const plan = planMedia([entry('index.html', 100), entry('assets/video/a.mp4', 300), entry('assets/video/b.mp4', 400), entry('examples/world/hero.jpg', 200_001), entry('docs/proof.jpg', 500_000)]);
  assert.equal(plan.totalBytes, 700_801);
  assert.equal(plan.mediaBytes, 200_701);
  assert.equal(plan.projectedBytes, 500_100);
  assert.deepEqual(plan.groups, [{ path: 'assets/video', bytes: 700, count: 2 }, { path: 'examples/world', bytes: 200_001, count: 1 }]);
});

test('rejects symlink candidates rather than publishing links into a Pages overlay', () => {
  assert.throws(() => planMedia([{ ...entry('assets/video/link.mp4'), mode: '120000' }]), /regular file/);
});

function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), 'media-branch-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const root = join(temp, 'repo'), remote = join(temp, 'origin.git');
  const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '--bare', remote], temp);
  git(['init', '-b', 'main', root], temp);
  git(['config', 'user.name', 'Media branch test']);
  git(['config', 'user.email', 'test@example.invalid']);
  mkdirSync(join(root, 'assets/video'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<video src="assets/video/a.mp4"></video>');
  writeFileSync(join(root, 'assets/video/a.mp4'), 'committed media');
  git(['add', '.']);
  git(['commit', '-m', 'source']);
  git(['remote', 'add', 'origin', remote]);
  git(['push', 'origin', 'main']);
  git(['switch', '-c', 'codex/followups']);
  writeFileSync(join(root, 'assets/video/topic-only.mp4'), 'not on main');
  git(['add', 'assets/video/topic-only.mp4']);
  git(['commit', '-m', 'topic work']);
  writeFileSync(join(root, 'assets/video/a.mp4'), 'uncommitted edit');
  writeFileSync(join(root, 'untracked-promo.txt'), 'leave me alone');
  return { root, remote, temp, git };
}

test('plans committed origin/main, then publishes an isolated orphan branch without touching the caller', (t) => {
  const { root, remote, git } = fixture(t);
  const before = git(['status', '--porcelain']);
  const main = git(['rev-parse', 'refs/heads/main'], remote);
  const plan = buildPlan(root);
  assert.deepEqual(plan.candidates.map(({ path }) => path), ['assets/video/a.mp4']);
  assert.equal(plan.mediaBytes, Buffer.byteLength('committed media'));
  const result = writeBranch(root);
  assert.equal(git(['rev-parse', 'refs/heads/main'], remote), main);
  assert.deepEqual(git(['ls-tree', '-r', '--name-only', 'media'], remote).split('\n'), ['assets/video/a.mp4']);
  assert.equal(git(['show', 'media:assets/video/a.mp4'], remote), 'committed media');
  assert.equal(git(['rev-list', '--parents', '-n', '1', 'media'], remote), result.commit);
  assert.equal(git(['branch', '--show-current']), 'codex/followups');
  assert.equal(git(['status', '--porcelain']), before);
  assert.equal(readFileSync(join(root, 'untracked-promo.txt'), 'utf8'), 'leave me alone');
  assert.equal(git(['worktree', 'list', '--porcelain']).match(/^worktree /gm).length, 1);
  assert.equal(writeBranch(root).commit, result.commit, 'unchanged media must not create a new commit');
});

test('updates media with a fast-forward commit and removes stale overlay paths only', (t) => {
  const { root, remote, temp, git } = fixture(t);
  const first = writeBranch(root).commit;
  const mainWorktree = join(temp, 'main-update');
  git(['worktree', 'add', mainWorktree, 'main']);
  git(['rm', 'assets/video/a.mp4'], mainWorktree);
  mkdirSync(join(mainWorktree, 'assets/video'), { recursive: true });
  writeFileSync(join(mainWorktree, 'assets/video/new clip.mp4'), 'replacement');
  git(['add', 'assets/video/new clip.mp4'], mainWorktree);
  git(['commit', '-m', 'update source'], mainWorktree);
  git(['push', 'origin', 'main'], mainWorktree);
  const before = git(['status', '--porcelain']);
  const second = writeBranch(root).commit;
  assert.notEqual(second, first);
  assert.equal(git(['rev-parse', 'media^'], remote), first);
  assert.equal(git(['ls-tree', '-r', '--name-only', 'media'], remote), 'assets/video/new clip.mp4');
  assert.equal(git(['status', '--porcelain']), before);
  assert.equal(spawnSync('git', ['merge-base', 'main', 'media'], { cwd: remote }).status, 1);
});

test('refuses a media branch sharing main history and leaves remote refs unchanged', (t) => {
  const { root, remote, git } = fixture(t);
  git(['push', 'origin', 'origin/main:refs/heads/media']);
  const before = git(['show-ref'], remote);
  assert.throws(() => writeBranch(root), /orphan/);
  assert.equal(git(['show-ref'], remote), before);
});

test('cleans up the temporary worktree when the remote rejects a media push', (t) => {
  const { root, remote, git } = fixture(t);
  writeFileSync(join(remote, 'hooks/pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const before = git(['status', '--porcelain']);
  assert.throws(() => writeBranch(root), /push/);
  assert.equal(git(['status', '--porcelain']), before);
  assert.equal(git(['worktree', 'list', '--porcelain']).match(/^worktree /gm).length, 1);
  assert.equal(spawnSync('git', ['show-ref', '--verify', '--quiet', 'refs/heads/media'], { cwd: remote }).status, 1);
});

test('removal plan keeps README-embedded images and non-media helpers on main', async () => {
  const { removalPlan } = await import('./media-branch.mjs');
  const candidates = [
    entry('examples/jungle-flythrough/poster.jpg', 224_000),
    entry('examples/aureus-flythrough/poster.jpg', 88_000),
    entry('examples/kern-calibration/assets/kern-color.mp4', 11_000_000),
    entry('examples/kern-calibration/assets/generate-i2v.py', 2_000),
    entry('examples/studio/assets/.gitkeep', 0),
    entry('assets/previews/manifest.json', 500),
    entry('assets/previews/flagship.mp4', 567_395),
  ];
  const readme = '![Jungle](examples/jungle-flythrough/poster.jpg) and [x](examples/aureus-flythrough/poster.jpg)';
  const plan = removalPlan(candidates, { readmeText: readme });
  assert.deepEqual(plan.remove.map((e) => e.path), ['assets/previews/flagship.mp4', 'examples/kern-calibration/assets/kern-color.mp4']);
  assert.deepEqual(plan.keep.map((e) => e.path).sort(), [
    'assets/previews/manifest.json', 'examples/aureus-flythrough/poster.jpg', 'examples/jungle-flythrough/poster.jpg',
    'examples/kern-calibration/assets/generate-i2v.py', 'examples/studio/assets/.gitkeep',
  ]);
  assert.equal(plan.removeBytes, 11_567_395);
});
