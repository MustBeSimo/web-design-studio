import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAssets, assetName, downloadUrl, isReferrer, referencedAssetPaths, resolveReference } from './media-archive.mjs';

test('keeps referenced files and markdown, moves the rest', () => {
  const assets = [
    { path: 'assets/previews/flagship.mp4', size: 1 },
    { path: 'assets/reel3.mp4', size: 1 },
    { path: 'assets/promo-linkedin/README.md', size: 1 },
    { path: 'assets/video/scroll-demo.mp4', size: 1 },
  ];
  const referrerTexts = [
    { path: 'index.html', text: '<video data-gallery-preview="assets/previews/flagship.mp4?v=1">' },
    { path: 'index.html', text: 'src="assets/video/scroll-demo.mp4?v=worlds-2026-09"' },
  ];
  const { keep, move } = classifyAssets({ assets, referrerTexts });
  assert.deepEqual(keep.sort(), ['assets/previews/flagship.mp4', 'assets/promo-linkedin/README.md', 'assets/video/scroll-demo.mp4']);
  assert.deepEqual(move, ['assets/reel3.mp4']);
});

test('a longer path that merely starts with an asset path is not a reference', () => {
  const assets = [{ path: 'assets/reel3.mp4', size: 1 }];
  const referrerTexts = [{ path: 'docs/x.md', text: 'see assets/reel3.mp4.backup' }];
  assert.deepEqual(classifyAssets({ assets, referrerTexts }).move, ['assets/reel3.mp4']);
});

test('asset names flatten the path and URLs point at the media release', () => {
  assert.equal(assetName('assets/promo-linkedin/captures/flagship.mp4'), 'promo-linkedin__captures__flagship.mp4');
  assert.equal(downloadUrl('assets/reel3.mp4'), 'https://github.com/MustBeSimo/web-design-studio/releases/download/media-2026-10/reel3.mp4');
});

test('referrer set follows the spec: site, docs, README and asset scripts in; media READMEs, tools, legacy pages out', () => {
  for (const p of ['index.html', 'examples/noir/index.html', 'stack/index.html', 'bench/index.html', 'docs/skill-advantage/README.md', 'sitemap.xml', 'manifest.json', '.github/workflows/ci.yml', 'assets/gallery-motion.mjs', 'assets/studio-brand.css', 'README.md']) {
    assert.equal(isReferrer(p), true, p);
  }
  for (const p of ['assets/promo-linkedin/README.md', 'tools/check-links.mjs', 'bench/raw/x.json', 'bench/results/x.json', 'IMAGE-SPEC.md', 'index.legacy.html', 'index.v2.html', 'assets/reel3.mp4', 'AGENTS.md',
    'docs/superpowers/plans/2026-10-27-v3-distribution-release.md', 'docs/launch/2026-10-v3/media-archive-manifest.txt']) {
    assert.equal(isReferrer(p), false, p);
  }
});

test('brand files and json metadata stay even when nothing references them', () => {
  const assets = [
    { path: 'assets/brand/renaissance-h3-15s.mp4', size: 1 },
    { path: 'assets/previews/manifest.json', size: 1 },
    { path: 'assets/social-card.png', size: 1 },
  ];
  const { keep, move } = classifyAssets({ assets, referrerTexts: [] });
  assert.deepEqual(keep, ['assets/brand/renaissance-h3-15s.mp4', 'assets/previews/manifest.json']);
  assert.deepEqual(move, ['assets/social-card.png']);
});

test('referenced asset paths keep their relative prefix, drop query strings and skip URLs', () => {
  const text = 'a="assets/video/x.mp4?v=2" b=assets/brand/y.jpg c="../assets/previews/z.mp4" d="examples/noir/assets/0-prologue.jpg" e="https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wall_1k.jpg"';
  assert.deepEqual(referencedAssetPaths(text).sort(), ['../assets/previews/z.mp4', 'assets/brand/y.jpg', 'assets/video/x.mp4', 'examples/noir/assets/0-prologue.jpg']);
});

test('references resolve relative to the referring file, so nested example assets never claim root files', () => {
  const assets = [{ path: 'assets/0-prologue.jpg', size: 1 }, { path: 'assets/previews/jungle.mp4', size: 1 }];
  const referrerTexts = [
    { path: 'examples/noir/index.html', text: 'src="assets/0-prologue.jpg"' },
    { path: 'examples/flagships/index.html', text: 'src="../../assets/previews/jungle.mp4"' },
  ];
  const { keep, move } = classifyAssets({ assets, referrerTexts });
  assert.deepEqual(keep, ['assets/previews/jungle.mp4']);
  assert.deepEqual(move, ['assets/0-prologue.jpg']);
});

test('paths inside site scripts and stylesheets resolve from the document root as well as the file', () => {
  const assets = [{ path: 'assets/video/tunnel.mp4', size: 1 }, { path: 'assets/studio-tunnel.mjs', size: 1 }];
  const referrerTexts = [{ path: 'assets/gallery-motion.mjs', text: "const src = 'assets/video/tunnel.mp4'; import('./studio-tunnel.mjs')" }];
  assert.deepEqual(classifyAssets({ assets, referrerTexts }).keep, ['assets/video/tunnel.mp4', 'assets/studio-tunnel.mjs']);
  assert.deepEqual(resolveReference('assets/gallery-motion.mjs', 'assets/video/tunnel.mp4'), ['assets/assets/video/tunnel.mp4', 'assets/video/tunnel.mp4']);
  assert.deepEqual(resolveReference('index.html', 'assets/video/tunnel.mp4'), ['assets/video/tunnel.mp4']);
});
