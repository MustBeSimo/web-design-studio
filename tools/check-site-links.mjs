#!/usr/bin/env node
/**
 * check-site-links.mjs — every relative href/src/poster on the GitHub Pages
 * landing surfaces must point at a file or directory that exists in the tree.
 *
 * GitHub Pages serves main at /, so a page that links a deleted path ships a
 * 404 the moment main is pushed (3.0.0 removed the root SKILL.md; the landing
 * page's "Read the skill" button had to move with it).
 *
 *   node tools/check-site-links.mjs            # index.html + the other landing surfaces
 *   node tools/check-site-links.mjs <page>...  # specific pages
 *   node tools/check-site-links.mjs --root <dir> [<page>...]  # assembled Pages tree
 */
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_PAGES = ['index.html', 'examples/flagships/index.html', 'stack/index.html', 'bench/index.html'];

const ATTR = /\b(?:href|src|poster)\s*=\s*(?:"([^"]+)"|'([^']+)')/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** Relative link targets in an HTML string, without query strings or fragments, deduplicated. */
export function extractLocalRefs(html) {
  const out = new Set();
  for (const match of html.matchAll(ATTR)) {
    const raw = (match[1] ?? match[2]).trim();
    if (!raw || EXTERNAL.test(raw)) continue;
    const target = raw.split(/[?#]/)[0];
    if (target) out.add(target);
  }
  return [...out];
}

/** True when `overlayRef` names a commit in the repository at `root`. */
export function overlayRefExists(root, overlayRef) {
  if (!overlayRef) return false;
  return spawnSync('git', ['-C', root, 'rev-parse', '--verify', '--quiet', `${overlayRef}^{commit}`], { encoding: 'utf8' }).status === 0;
}

/** True when the repository at `root` has `path` committed on `overlayRef` (the site media branch). */
function existsOnOverlay(root, overlayRef, path) {
  const result = spawnSync('git', ['-C', root, 'cat-file', '-e', `${overlayRef}:${path}`], { encoding: 'utf8' });
  return result.status === 0;
}

/**
 * Targets in `pagePath` (relative to `root`) that exist neither on disk nor, when
 * an overlay ref is given, on that branch. GitHub Pages assembles main plus the
 * `media` branch, so a path committed there is served even if main lacks it.
 */
export function missingRefs(root, pagePath, { overlayRef } = {}) {
  const html = readFileSync(join(root, pagePath), 'utf8');
  const base = join(root, dirname(pagePath));
  return extractLocalRefs(html).filter((ref) => {
    if (existsSync(join(base, ref))) return false;
    if (!overlayRef) return true;
    const repoPath = normalize(relative(root, join(base, ref))).split('\\').join('/');
    if (repoPath.startsWith('..')) return true;
    return !existsOnOverlay(root, overlayRef, repoPath);
  });
}

function main(argv) {
  let root = ROOT;
  let overlayRef;
  let noOverlay = false;
  const requested = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) {
        console.error('check-site-links: --root requires a directory');
        return 2;
      }
      root = resolve(argv[++i]);
    } else if (argv[i] === '--overlay-ref') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) {
        console.error('check-site-links: --overlay-ref requires a git ref');
        return 2;
      }
      overlayRef = argv[++i];
    } else if (argv[i] === '--no-overlay') {
      noOverlay = true;
    } else if (argv[i].startsWith('--')) {
      console.error(`check-site-links: unknown option ${argv[i]}`);
      return 2;
    } else requested.push(argv[i]);
  }
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`check-site-links: root directory does not exist: ${root}`);
    return 2;
  }
  if (overlayRef && !overlayRefExists(root, overlayRef)) {
    console.error(`✗ check-site-links: overlay ref ${overlayRef} is not a commit in ${root}`);
    return 1;
  }
  // Site media lives on the `media` branch (served by Pages as an overlay); use it when present.
  if (!overlayRef && !noOverlay && overlayRefExists(root, 'refs/remotes/origin/media')) overlayRef = 'refs/remotes/origin/media';
  const pages = requested.length ? requested : DEFAULT_PAGES;
  const problems = [];
  let checked = 0;
  for (const page of pages) {
    if (!existsSync(join(root, page)) || !statSync(join(root, page)).isFile()) {
      problems.push(`${page}: page is missing from ${root}`);
      continue;
    }
    const refs = extractLocalRefs(readFileSync(join(root, page), 'utf8'));
    checked += refs.length;
    for (const ref of missingRefs(root, page, { overlayRef })) problems.push(`${page}: dead link ${ref}`);
  }
  if (problems.length) {
    console.error(`✗ check-site-links: ${problems.length} dead local link(s):\n  ${problems.join('\n  ')}`);
    return 1;
  }
  const overlayNote = overlayRef ? ` with overlay ${overlayRef.replace(/^refs\/remotes\//, '')}` : '';
  console.log(`✓ check-site-links: ${checked} local links resolve across ${pages.length} page(s) (${pages.join(', ')})${overlayNote}.`);
  return 0;
}

/** True when invoked directly or through a bin symlink. */
function isMain() {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  process.exit(main(process.argv.slice(2)));
}
