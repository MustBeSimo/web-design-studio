#!/usr/bin/env node
/**
 * check-media-size.mjs — keep heavy media out of the tracked tree.
 *
 * The skills installer shallow-clones the whole repository, so every tracked
 * byte is install time for users. Promo films, reels and legacy stills belong
 * in a `media-*` GitHub Release (see tools/media-archive.mjs), not on main.
 *
 *   node tools/check-media-size.mjs            # exit 1 if any tracked file > 5 MB
 *   node tools/check-media-size.mjs --limit N  # custom limit in bytes
 */
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIMIT = 5_000_000;

/** Tracked files allowed above the limit because a live example needs them. */
export const ALLOW = ['examples/kern-calibration/assets/kern-color.mp4'];

/**
 * @param {Array<{path: string, size: number}>} entries
 * @param {{limit?: number, allow?: string[]}} [options]
 * @returns {Array<{path: string, size: number}>} files over the limit, largest first
 */
export function oversized(entries, { limit = LIMIT, allow = [] } = {}) {
  const allowed = new Set(allow);
  return entries
    .filter((entry) => entry.size > limit && !allowed.has(entry.path))
    .sort((a, b) => b.size - a.size);
}

function trackedEntries(root) {
  const ls = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  if (ls.status !== 0) throw new Error(`git ls-files failed: ${ls.stderr.trim()}`);
  const entries = [];
  for (const path of ls.stdout.split('\0')) {
    if (!path) continue;
    try {
      entries.push({ path, size: statSync(join(root, path)).size });
    } catch {
      // Staged deletion: the path is still in the index but gone from disk.
    }
  }
  return entries;
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const limitIndex = argv.indexOf('--limit');
  const limit = limitIndex === -1 ? LIMIT : Number(argv[limitIndex + 1]);
  if (!Number.isFinite(limit) || limit <= 0) {
    console.error('check-media-size: --limit must be a positive number of bytes');
    return 2;
  }
  const entries = trackedEntries(root);
  const bad = oversized(entries, { limit, allow: ALLOW });
  if (bad.length) {
    console.error(`✗ check-media-size: ${bad.length} tracked file(s) over ${limit} bytes. Move them to a media-* GitHub Release (tools/media-archive.mjs):`);
    for (const entry of bad) console.error(`  ${entry.path} (${(entry.size / 1e6).toFixed(1)} MB)`);
    return 1;
  }
  console.log(`✓ check-media-size: ${entries.length} tracked files under ${limit} bytes (allowlist: ${ALLOW.join(', ')}).`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
