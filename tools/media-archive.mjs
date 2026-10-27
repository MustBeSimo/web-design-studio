#!/usr/bin/env node
/**
 * media-archive.mjs — move promo media out of the tracked tree into a GitHub
 * Release so the skills installer (a shallow clone of main) stays light.
 *
 *   node tools/media-archive.mjs --plan [--manifest <file>]   # classify assets/, print tables, write manifest
 *   node tools/media-archive.mjs --apply [--tag <tag>]        # create release if needed, upload, git rm
 *   node tools/media-archive.mjs --verify                      # every assets/ path the site references exists
 *
 * "Referenced" means the exact path appears in a site or docs file (see
 * isReferrer). Markdown, JSON and everything under assets/brand/ is always kept.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KEEP_PATHS = ['assets/promo-linkedin/web-design-studio-linkedin-poster.jpg'];

export const RELEASE = {
  repo: 'MustBeSimo/web-design-studio',
  tag: 'media-2026-10',
  target: 'c8b99b171c7c1f8c5ebb9fb6962d26769f015ab5', // main at 2.7.6, the last commit holding the files
  title: 'Media archive: promo films, reels and legacy stills',
  notes: 'Promo films, reels and legacy landing-page stills archived from the repository tree on 2026-10-27 so the skills installer stays small. Each asset name is its former repository path (without the assets/ prefix) with "/" replaced by "__". The manifest lives at docs/launch/2026-10-v3/media-archive-manifest.txt on main.',
};

export function assetName(path) {
  return path.replace(/^assets\//, '').replaceAll('/', '__');
}

export function downloadUrl(path) {
  return `https://github.com/${RELEASE.repo}/releases/download/${RELEASE.tag}/${assetName(path)}`;
}

const INCLUDE = [
  /^index\.html$/, /^examples\//, /^stack\//, /^bench\/index\.html$/, /^docs\//,
  /^sitemap\.xml$/, /^manifest\.json$/, /^\.github\//, /^assets\/.*\.(js|mjs|css)$/, /^README\.md$/,
];
const EXCLUDE = [
  /^assets\/.*\.md$/, /^tools\//, /^bench\/raw\//, /^bench\/results\//,
  /^IMAGE-SPEC\.md$/, /^index\.legacy\.html$/, /^index\.v2\.html$/,
  // Planning records and the archive manifest name moved files on purpose.
  /^docs\/superpowers\//, /^docs\/launch\//,
];

/** Always kept: notes, metadata, site code, and the brand identity folder (provenance lives there). */
const ALWAYS_KEEP = [/\.md$/, /\.json$/, /\.(js|mjs|css)$/, /^assets\/brand\//];

/** Referenced by the site but never committed; reported once, not a gate failure. */
const KNOWN_MISSING = ['assets/brand/renaissance-h3-15s-mobile.mp4'];

const SITE_CODE = /\.(js|mjs|css)$/;
const TEXT = /\.(html|md|json|css|js|mjs|xml|svg|yml|yaml|txt)$/;

/** Site and docs files whose text decides whether an asset is still needed. */
export function isReferrer(path) {
  if (EXCLUDE.some((re) => re.test(path))) return false;
  if (!INCLUDE.some((re) => re.test(path))) return false;
  return TEXT.test(path);
}

// A path token that contains an `assets/` segment: keeps any relative prefix
// (`../`, `examples/noir/`), stops before `?query`, and is skipped when it is
// part of a URL (`https://…/ph-assets/…`).
const ASSET_REF = /[A-Za-z0-9_.@:/-]*assets\/[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)*\.[A-Za-z0-9]+/g;

/** Every asset path token in a text, as written (relative prefixes kept), without query strings or URLs. */
export function referencedAssetPaths(text) {
  const out = new Set();
  for (const match of text.matchAll(ASSET_REF)) {
    const token = match[0];
    if (token.includes('://')) continue;
    out.add(token.replace(/^\.\//, ''));
  }
  return [...out];
}

/**
 * Repo-relative paths a reference may point at: resolved from the referring
 * file's directory, plus from the document root when the referrer is a script
 * or stylesheet (their path strings are relative to the page that loads them).
 */
export function resolveReference(referrerPath, ref) {
  if (ref.startsWith('/')) return [normalize(ref.replace(/^\/web-design-studio\//, '/').slice(1))];
  const candidates = [normalize(join(dirname(referrerPath), ref))];
  if (SITE_CODE.test(referrerPath)) {
    const fromRoot = normalize(ref);
    if (!candidates.includes(fromRoot)) candidates.push(fromRoot);
  }
  return candidates;
}

/**
 * @param {{assets: Array<{path: string, size: number}>, referrerTexts: Array<{path: string, text: string}>}} input
 * @returns {{keep: string[], move: string[]}}
 */
export function classifyAssets({ assets, referrerTexts }) {
  const referenced = new Set();
  for (const { path, text } of referrerTexts) {
    for (const ref of referencedAssetPaths(text)) for (const candidate of resolveReference(path, ref)) referenced.add(candidate);
  }
  const keep = [];
  const move = [];
  for (const { path } of assets) {
    if (KEEP_PATHS.includes(path) || ALWAYS_KEEP.some((re) => re.test(path)) || referenced.has(path)) keep.push(path);
    else move.push(path);
  }
  return { keep, move };
}

// ---------------------------------------------------------------- repo I/O

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(args, options = {}) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || '').trim()}`);
  return result.stdout;
}

function trackedEntries() {
  const entries = [];
  for (const path of git(['ls-files', '-z']).split('\0')) {
    if (!path) continue;
    try { entries.push({ path, size: statSync(join(ROOT, path)).size }); } catch { /* staged deletion */ }
  }
  return entries;
}

function referrerTexts(paths) {
  return paths.filter(isReferrer).map((path) => ({ path, text: readFileSync(join(ROOT, path), 'utf8') }));
}

function buildPlan() {
  const entries = trackedEntries();
  const sizes = new Map(entries.map((entry) => [entry.path, entry.size]));
  const assets = entries.filter((entry) => entry.path.startsWith('assets/'));
  const referrers = referrerTexts(entries.map((entry) => entry.path));
  const { keep, move } = classifyAssets({ assets, referrerTexts: referrers });
  return { entries, sizes, keep, move, referrers };
}

function mb(bytes) { return (bytes / 1e6).toFixed(1); }

function printGroup(label, paths, sizes) {
  const groups = new Map();
  let total = 0;
  for (const path of paths) {
    const key = path.split('/').slice(0, 2).join('/');
    groups.set(key, (groups.get(key) ?? 0) + sizes.get(path));
    total += sizes.get(path);
  }
  console.log(`\n${label}: ${paths.length} files, ${mb(total)} MB`);
  for (const [key, bytes] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  ${mb(bytes).padStart(7)} MB  ${key}`);
}

function writeManifest(file, move) {
  mkdirSync(dirname(file), { recursive: true });
  const lines = [
    `# Media archived from the repository tree to GitHub Release ${RELEASE.tag} (target ${RELEASE.target}).`,
    '# original repository path<TAB>download URL',
    ...move.slice().sort().map((path) => `${path}\t${downloadUrl(path)}`),
  ];
  writeFileSync(file, `${lines.join('\n')}\n`);
}

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function cmdPlan(argv) {
  const plan = buildPlan();
  printGroup('KEEP on main (referenced or markdown)', plan.keep, plan.sizes);
  printGroup(`MOVE to release ${RELEASE.tag}`, plan.move, plan.sizes);
  const manifest = argValue(argv, '--manifest');
  if (manifest) {
    writeManifest(resolve(ROOT, manifest), plan.move);
    console.log(`\nmanifest written: ${manifest} (${plan.move.length} lines)`);
  }
  return 0;
}

function cmdVerify() {
  const plan = buildPlan();
  const missing = [];
  for (const { path, text } of plan.referrers) {
    for (const ref of referencedAssetPaths(text)) {
      if (KNOWN_MISSING.includes(normalize(ref))) continue;
      if (!resolveReference(path, ref).some((candidate) => existsSync(join(ROOT, candidate)))) missing.push(`${path} -> ${ref}`);
    }
  }
  if (KNOWN_MISSING.length) console.log(`note: ${KNOWN_MISSING.length} known-missing reference(s) skipped: ${KNOWN_MISSING.join(', ')}`);
  if (missing.length) {
    console.error(`✗ media-archive --verify: ${missing.length} referenced asset path(s) missing on disk:`);
    for (const line of missing) console.error(`  ${line}`);
    return 1;
  }
  console.log(`✓ media-archive --verify: every assets/ path referenced by ${plan.referrers.length} site/docs files exists.`);
  return 0;
}

function ensureClean(allowedPaths) {
  const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean);
  const blocking = dirty.filter((line) => {
    const status = line.slice(0, 2);
    const path = line.slice(3).trim();
    if (status === '??') return false;
    return !allowedPaths.some((allowed) => path === allowed || path.startsWith(allowed));
  });
  if (blocking.length) {
    throw new Error(`working tree has unrelated changes; commit them first:\n  ${blocking.join('\n  ')}`);
  }
}

function releaseExists(tag) {
  return spawnSync('gh', ['release', 'view', tag, '--repo', RELEASE.repo], { encoding: 'utf8' }).status === 0;
}

function cmdApply(argv) {
  const tag = argValue(argv, '--tag') ?? RELEASE.tag;
  const plan = buildPlan();
  if (plan.move.length === 0) { console.log('media-archive --apply: nothing to move.'); return 0; }
  ensureClean(['README.md', 'IMAGE-SPEC.md', 'docs/launch/']);

  if (!releaseExists(tag)) {
    console.log(`creating release ${tag} at ${RELEASE.target}…`);
    execFileSync('gh', ['release', 'create', tag, '--repo', RELEASE.repo, '--target', RELEASE.target, '--title', RELEASE.title,
      '--notes', RELEASE.notes, '--prerelease', '--latest=false'], { stdio: 'inherit' });
  }

  const staging = mkdtempSync(join(tmpdir(), 'media-archive-'));
  const files = plan.move.map((path) => {
    const target = join(staging, assetName(path));
    try { linkSync(join(ROOT, path), target); } catch { copyFileSync(join(ROOT, path), target); }
    return target;
  });
  for (let i = 0; i < files.length; i += 20) {
    const batch = files.slice(i, i + 20);
    console.log(`uploading ${i + 1}-${i + batch.length} of ${files.length}…`);
    execFileSync('gh', ['release', 'upload', tag, ...batch, '--repo', RELEASE.repo, '--clobber'], { stdio: 'inherit' });
  }

  for (let i = 0; i < plan.move.length; i += 50) git(['rm', '-q', '--', ...plan.move.slice(i, i + 50)]);
  const moved = plan.move.reduce((sum, path) => sum + plan.sizes.get(path), 0);
  console.log(`✓ media-archive --apply: uploaded ${files.length} assets (${mb(moved)} MB) to ${tag} and staged their removal; ${plan.keep.length} files kept.`);
  return 0;
}

function main(argv) {
  if (argv.includes('--plan')) return cmdPlan(argv);
  if (argv.includes('--verify')) return cmdVerify();
  if (argv.includes('--apply')) return cmdApply(argv);
  console.error('usage: media-archive.mjs --plan [--manifest <file>] | --apply [--tag <tag>] | --verify');
  return 2;
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
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`✗ media-archive: ${error.message}`);
    process.exit(1);
  }
}
