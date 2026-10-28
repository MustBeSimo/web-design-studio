#!/usr/bin/env node
/**
 * Plan a site-media overlay, or publish it to origin/media without changing main.
 *
 *   node tools/media-branch.mjs --plan
 *   node tools/media-branch.mjs --write-branch
 *
 * Read committed origin/main blobs, never working-tree files. The write action
 * refreshes origin/main, uses an isolated worktree and pushes only refs/heads/media.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LARGE_MEDIA_BYTES = 200_000;
const EXCLUDED = /^(?:skills|tools|bench|docs|templates)\//;
const MEDIA_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.glb']);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function isMediaCandidate({ path, size }) {
  if (EXCLUDED.test(path)) return false;
  if (/^examples\/[^/]+\/assets\//.test(path) || /^assets\/(?:previews|video)\//.test(path)) return true;
  if (/^assets\/brand\/[^/]+\.mp4$/i.test(path)) return true;
  return size > LARGE_MEDIA_BYTES && MEDIA_EXTENSIONS.has(extname(path).toLowerCase());
}

export function planMedia(entries) {
  const candidates = entries.filter(isMediaCandidate).sort((a, b) => a.path.localeCompare(b.path));
  for (const entry of candidates) {
    if (!['100644', '100755'].includes(entry.mode)) throw new Error(`Media candidate must be a regular file: ${entry.path}`);
  }
  const groups = new Map();
  for (const { path, size } of candidates) {
    const directory = path.split('/').slice(0, 2).join('/');
    const group = groups.get(directory) ?? { path: directory, bytes: 0, count: 0 };
    group.bytes += size;
    group.count++;
    groups.set(directory, group);
  }
  const totalBytes = entries.reduce((total, entry) => total + entry.size, 0);
  const mediaBytes = candidates.reduce((total, entry) => total + entry.size, 0);
  return { candidates, groups: [...groups.values()].sort((a, b) => a.path.localeCompare(b.path)), totalBytes, mediaBytes, projectedBytes: totalBytes - mediaBytes };
}

function runGit(root, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result;
}

function git(root, args) { return runGit(root, args).stdout.trim(); }

/** Plan from one immutable commit, including sizes of every tracked blob. */
export function buildPlan(root = ROOT) {
  const source = git(root, ['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}']);
  const entries = runGit(root, ['ls-tree', '-r', '-l', '-z', source]).stdout.split('\0').filter(Boolean).map((line) => {
    const match = line.match(/^(\d{6}) (\w+) ([a-f0-9]+)\s+(\d+|-)\t([\s\S]+)$/);
    if (!match || match[2] !== 'blob') throw new Error(`Unsupported tracked entry: ${line}`);
    return { mode: match[1], oid: match[3], size: Number(match[4]), path: match[5] };
  });
  return { source, fileCount: entries.length, ...planMedia(entries) };
}

/** Publish a media-only orphan history, with fast-forward updates and no force push. */
export function writeBranch(root = ROOT) {
  git(root, ['fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main']);
  const plan = buildPlan(root);
  const remote = runGit(root, ['ls-remote', '--exit-code', '--heads', 'origin', 'refs/heads/media'], { allowFailure: true });
  let previous;
  if (remote.status === 0) {
    git(root, ['fetch', 'origin', 'refs/heads/media']);
    previous = git(root, ['rev-parse', 'FETCH_HEAD']);
    const common = runGit(root, ['merge-base', plan.source, previous], { allowFailure: true });
    if (common.status === 0) throw new Error('origin/media is not an orphan history; refusing to overwrite it');
    if (common.status !== 1) throw new Error(`Cannot verify orphan media history: ${common.stderr.trim()}`);
    // After the cutover main carries only README images and helpers; mirroring it again
    // would replace the overlay with a near-empty tree and break the live site.
    const mediaCount = runGit(root, ['ls-tree', '-r', '--name-only', previous]).stdout.split('\n').filter(Boolean).length;
    if (plan.candidates.length < mediaCount / 2) {
      throw new Error(`main no longer holds the site media (origin/media has ${mediaCount} files, main offers ${plan.candidates.length}); maintain the media branch directly`);
    }
  } else if (remote.status !== 2) {
    throw new Error(`Cannot inspect origin/media: ${remote.stderr.trim()}`);
  }
  if (!plan.candidates.length) throw new Error('No site media candidates; refusing to publish an empty overlay');

  const staging = mkdtempSync(join(tmpdir(), 'wds-media-branch-'));
  const worktree = join(staging, 'tree');
  const branch = `codex/media-stage-${randomUUID()}`;
  let attached = false;
  try {
    if (previous) git(root, ['worktree', 'add', '-b', branch, worktree, previous]);
    else git(root, ['worktree', 'add', '--detach', worktree, plan.source]);
    attached = true;
    if (!previous) git(worktree, ['checkout', '--orphan', branch]);
    // This removes files only in the tool-owned temporary worktree.
    git(worktree, ['rm', '-r', '-f', '--ignore-unmatch', '--', '.']);
    const paths = plan.candidates.map(({ path }) => path);
    for (let i = 0; i < paths.length; i += 100) git(worktree, ['checkout', plan.source, '--', ...paths.slice(i, i + 100)]);
    const diff = runGit(worktree, ['diff', '--cached', '--quiet'], { allowFailure: true });
    if (![0, 1].includes(diff.status)) throw new Error(`Cannot inspect staged media: ${diff.stderr.trim()}`);
    if (!previous || diff.status === 1) {
      git(worktree, ['commit', '-m', `chore(media): mirror site assets from main ${plan.source.slice(0, 7)}`, '-m', 'Co-Authored-By: Codex <noreply@openai.com>']);
    }
    const commit = git(worktree, ['rev-parse', 'HEAD']);
    if (commit !== previous) git(worktree, ['push', 'origin', 'HEAD:refs/heads/media']);
    return { ...plan, commit, updated: commit !== previous };
  } finally {
    if (attached) git(root, ['worktree', 'remove', '--force', worktree]);
    runGit(root, ['branch', '-D', branch], { allowFailure: true });
    rmSync(staging, { recursive: true, force: true });
  }
}

/** Only real media leaves main; helper scripts, manifests and placeholders stay with the examples. */
export const REMOVABLE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.glb']);

/** Repository paths the README embeds or links, which GitHub renders from main and must keep. */
export function readmeEmbeddedPaths(readmeText) {
  const out = new Set();
  for (const match of readmeText.matchAll(/(?:examples|assets)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g)) out.add(match[0]);
  return out;
}

/**
 * Split overlay candidates into the files that may leave main and the ones that stay:
 * anything the README embeds, and anything that is not a media file.
 * @param {Array<{path: string, size: number}>} candidates
 * @param {{readmeText: string}} options
 */
export function removalPlan(candidates, { readmeText }) {
  const embedded = readmeEmbeddedPaths(readmeText);
  const remove = [];
  const keep = [];
  for (const entry of [...candidates].sort((a, b) => a.path.localeCompare(b.path))) {
    const removable = REMOVABLE_EXTENSIONS.has(extname(entry.path).toLowerCase()) && !embedded.has(entry.path);
    (removable ? remove : keep).push(entry);
  }
  return { remove, keep, removeBytes: remove.reduce((sum, entry) => sum + entry.size, 0) };
}

const mb = (bytes) => (bytes / 1_000_000).toFixed(2);
export function formatSummary(plan) {
  return [
    `Source: origin/main (${plan.source})`,
    `Tracked main: ${plan.fileCount} files, ${mb(plan.totalBytes)} MB (${plan.totalBytes} bytes)`,
    'Site media by directory:',
    ...plan.groups.map(({ path, count, bytes }) => `  ${path}: ${count} files, ${mb(bytes)} MB`),
    `Total media: ${plan.candidates.length} files, ${mb(plan.mediaBytes)} MB (${plan.mediaBytes} bytes)`,
    `Projected main: ${mb(plan.projectedBytes)} MB (${plan.projectedBytes} bytes)`,
    'Decimal MB; committed file bytes, not clone transfer size or git history.',
  ].join('\n');
}

/** Plan which overlay files may leave main, keeping README images and non-media helpers. */
export function buildRemovalPlan(root = ROOT) {
  const plan = buildPlan(root);
  const readmeText = readFileSync(join(root, 'README.md'), 'utf8');
  return { ...plan, ...removalPlan(plan.candidates, { readmeText }) };
}

function printRemovalPlan(plan) {
  console.log(`Source: origin/main (${plan.source})`);
  console.log(`Remove from main: ${plan.remove.length} files, ${mb(plan.removeBytes)} MB`);
  console.log(`Keep on main (README embeds or non-media helpers): ${plan.keep.length} files`);
  for (const { path } of plan.keep) console.log(`  keep  ${path}`);
  console.log(`Projected main after removal: ${mb(plan.totalBytes - plan.removeBytes)} MB`);
}

function main(argv) {
  if (argv.length !== 1 || !['--plan', '--write-branch', '--removal-plan', '--remove-from-main'].includes(argv[0])) {
    console.error('usage: media-branch.mjs --plan | --write-branch | --removal-plan | --remove-from-main');
    return 2;
  }
  if (argv[0] === '--removal-plan') {
    printRemovalPlan(buildRemovalPlan());
    return 0;
  }
  if (argv[0] === '--remove-from-main') {
    const plan = buildRemovalPlan();
    const overlay = runGit(ROOT, ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/media^{commit}'], { allowFailure: true });
    if (overlay.status !== 0) throw new Error('origin/media is missing; fetch it before removing media from main');
    for (const { path } of plan.remove) {
      if (runGit(ROOT, ['cat-file', '-e', `refs/remotes/origin/media:${path}`], { allowFailure: true }).status !== 0) {
        throw new Error(`refusing to remove ${path}: it is not on origin/media`);
      }
    }
    const paths = plan.remove.map(({ path }) => path);
    for (let i = 0; i < paths.length; i += 100) git(ROOT, ['rm', '-q', '--', ...paths.slice(i, i + 100)]);
    printRemovalPlan(plan);
    console.log(`Staged removal of ${paths.length} files; review with git status, then commit.`);
    return 0;
  }
  const plan = argv[0] === '--plan' ? buildPlan() : writeBranch();
  console.log(formatSummary(plan));
  if (argv[0] === '--plan') {
    console.log('\nCandidate paths:');
    for (const { path, size } of plan.candidates) console.log(`${path}\t${size}`);
  } else {
    console.log(`origin/media: ${plan.commit} (${plan.updated ? 'published' : 'unchanged'}); main and working files untouched.`);
  }
  return 0;
}

function isMain() {
  try { return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}
if (isMain()) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`media-branch: ${error.message}`); process.exitCode = 1; }
}
