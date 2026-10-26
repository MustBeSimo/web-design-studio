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
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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

/** Targets in `pagePath` (relative to `root`) that do not exist on disk. */
export function missingRefs(root, pagePath) {
  const html = readFileSync(join(root, pagePath), 'utf8');
  const base = join(root, dirname(pagePath));
  return extractLocalRefs(html).filter((ref) => !existsSync(join(base, ref)));
}

function main(argv) {
  const pages = (argv.length ? argv : DEFAULT_PAGES).filter((page) => existsSync(join(ROOT, page)));
  const problems = [];
  let checked = 0;
  for (const page of pages) {
    const refs = extractLocalRefs(readFileSync(join(ROOT, page), 'utf8'));
    checked += refs.length;
    for (const ref of missingRefs(ROOT, page)) problems.push(`${page}: dead link ${ref}`);
  }
  if (problems.length) {
    console.error(`✗ check-site-links: ${problems.length} dead local link(s):\n  ${problems.join('\n  ')}`);
    return 1;
  }
  console.log(`✓ check-site-links: ${checked} local links resolve across ${pages.length} page(s) (${pages.join(', ')}).`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
