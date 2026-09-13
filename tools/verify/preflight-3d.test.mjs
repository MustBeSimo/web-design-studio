import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectModel, parseArgs, preflight3d } from './preflight-3d.mjs';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'cinematic-3d-preflight-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writeGlb(file, extensions = [], required = extensions) {
  const json = Buffer.from(JSON.stringify({
    asset: { version: '2.0' }, scenes: [{}], scene: 0,
    extensionsUsed: extensions, extensionsRequired: required,
  }));
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const buffer = Buffer.alloc(12 + 8 + paddedLength, 0x20);
  buffer.write('glTF', 0, 'ascii');
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(buffer.length, 8);
  buffer.writeUInt32LE(paddedLength, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  json.copy(buffer, 20);
  writeFileSync(file, buffer);
}

test('reports Three addon usage without a resolvable core dependency', t => {
  const directory = fixture(t);
  writeGlb(join(directory, 'hero.glb'));
  writeFileSync(join(directory, 'scene.js'), `
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.glb', () => {}, undefined, console.error);
  `);
  const report = preflight3d(directory);
  assert.equal(report.ok, false);
  assert.equal(report.checks.find(check => check.name === 'three-core').ok, false);
  assert.ok(report.checks.some(check => check.name === 'module-request' && !check.ok));
});

test('reads GLB extensions and rejects a missing Draco decoder', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.glb');
  `);
  const report = preflight3d(directory);
  assert.deepEqual(report.requirements, ['draco']);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, false);
  assert.deepEqual(inspectModel(join(directory, 'hero.glb')).extensionsRequired, ['KHR_draco_mesh_compression']);
});

test('passes when Three core, loader and the model-required decoder are configured', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  mkdirSync(join(directory, 'public/draco'), { recursive: true });
  writeFileSync(join(directory, 'public/draco/draco_decoder.wasm'), 'wasm');
  writeFileSync(join(directory, 'public/draco/draco_wasm_wrapper.js'), 'wrapper');
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
    const loader = new GLTFLoader();
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    loader.setDRACOLoader(draco);
    loader.load('./hero.glb', () => {}, undefined, error => console.error(error));
  `);
  const report = preflight3d(directory);
  assert.equal(report.ok, true);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, true);
  assert.equal(report.checks.find(check => check.name === 'decoder-resources:draco').ok, true);
});

test('follows local module requests and checks external glTF resources', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import './missing-scene.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.gltf');
  `);
  writeFileSync(join(directory, 'hero.gltf'), JSON.stringify({
    asset: { version: '2.0' }, buffers: [{ uri: 'missing.bin', byteLength: 12 }], scenes: [{}], scene: 0,
  }));
  const report = preflight3d(directory);
  assert.equal(report.ok, false);
  assert.ok(report.checks.some(check => check.name === 'module-request' && check.detail.includes('missing-scene.js')));
  assert.ok(report.checks.some(check => check.name === 'model-resource' && check.detail.includes('missing.bin')));
});

test('ignores model and decoder examples inside source comments', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'));
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    /* loader.load('missing-doc.glb'); draco.setDecoderPath('/missing-doc-draco/'); */
    const note = 'literal // text stays intact'; // loader.load('also-missing.gltf');
    const model = './hero.glb';
  `);
  const report = preflight3d(directory);
  assert.ok(report.models.some(model => model.file.endsWith('hero.glb')));
  assert.equal(report.checks.some(check => /missing-doc|also-missing/.test(check.detail)), false);
});

test('commented decoder examples cannot satisfy a required Draco configuration', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    const loader = new GLTFLoader();
    loader.load('./hero.glb');
    // DRACOLoader; loader.setDRACOLoader(draco); draco.setDecoderPath('/draco/');
  `);
  const report = preflight3d(directory);
  assert.equal(report.ok, false);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, false);
});

test('HTML prose apostrophes cannot expose commented decoder examples', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  writeFileSync(join(directory, 'index.html'), `
    <p>it's ready</p>
    <!-- DRACOLoader; loader.setDRACOLoader(draco); draco.setDecoderPath('/draco/'); -->
    <script type="module" src="./scene.js"></script>
  `);
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.glb');
  `);
  const report = preflight3d(directory);
  assert.equal(report.ok, false);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, false);
});

test('JSX prose apostrophes cannot expose commented decoder examples', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  writeFileSync(join(directory, 'scene.tsx'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.glb');
    const View = () => <p>it's ready</p>;
    // DRACOLoader; loader.setDRACOLoader(draco); draco.setDecoderPath(runtimePath);
  `);
  const report = preflight3d(directory);
  assert.equal(report.ok, false);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, false);
});

test('rejects invalid CLI arguments', () => {
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs(['project', '--model']));
  assert.throws(() => parseArgs(['project', '--wat']));
});

test('an HTML target follows its local module graph before checking 3D', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  writeFileSync(join(directory, 'index.html'), '<script type="module" src="./scene.js"></script>');
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.glb');
  `);
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.detected, true);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, false);
});

test('an HTML target follows a browser-relative script src without dot slash', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  writeFileSync(join(directory, 'index.html'), '<script type="module" src="scene.js"></script>');
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.glb');
  `);
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.detected, true);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, false);
});

test('fails when a local module imports a named export its dependency does not provide', t => {
  const directory = fixture(t);
  writeGlb(join(directory, 'hero.glb'));
  writeFileSync(join(directory, 'index.html'), '<script type="module" src="three.module.js"></script>');
  writeFileSync(join(directory, 'three.module.js'), `
    import { Present, Missing } from './three.core.js';
    export { Present, Missing };
  `);
  writeFileSync(join(directory, 'three.core.js'), 'export const Present = true;');
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.ok, false);
  assert.match(report.checks.find(check => check.name === 'module-exports' && !check.ok).detail, /Missing/);
});

test('named-export compatibility check stays conservative outside split Three.js builds', t => {
  const directory = fixture(t);
  writeGlb(join(directory, 'hero.glb'));
  writeFileSync(join(directory, 'index.html'), '<model-viewer src="hero.glb"></model-viewer><script type="module" src="scene.js"></script>');
  writeFileSync(join(directory, 'scene.js'), `
    import { second } from './dep.js';
    import type { Shape } from './types.ts';
  `);
  writeFileSync(join(directory, 'dep.js'), 'export const first = 1, second = 2;');
  writeFileSync(join(directory, 'types.ts'), 'export interface Shape {}');
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.checks.some(check => check.name === 'module-exports' && !check.ok), false);
});

test('protocol-relative script sources are not treated as local files', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'index.html'), '<model-viewer></model-viewer><script src="//cdn.example/main.js"></script>');
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.checks.some(check => check.name === 'module-request' && /cdn\.example/.test(check.detail)), false);
});

test('local import-map targets are resolved and their transitive core imports are followed', t => {
  const directory = fixture(t);
  mkdirSync(join(directory, 'vendor/addons/loaders'), { recursive: true });
  writeFileSync(join(directory, 'vendor/three.module.js'), `export * from './three.core.js';`);
  writeFileSync(join(directory, 'vendor/addons/loaders/GLTFLoader.js'), 'export class GLTFLoader {}');
  writeFileSync(join(directory, 'index.html'), `
    <script type="importmap">{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/addons/"}}</script>
    <script type="module">
      import * as THREE from 'three';
      import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    </script>
  `);
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.ok, false);
  assert.ok(report.checks.some(check => check.name === 'module-request' && check.detail.includes('three.core.js')));
});

test('remote import-map targets remain evidence without being opened as local files', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'index.html'), `
    <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js"}}</script>
    <script type="module">import * as THREE from 'three';</script>
  `);
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.detected, true);
  assert.equal(report.checks.find(check => check.name === 'three-core').ok, true);
  assert.equal(report.checks.some(check => /ENOENT|https:\/.*open/.test(check.detail)), false);
});

test('missing local and file import-map addon targets fail preflight', t => {
  const directory = fixture(t);
  mkdirSync(join(directory, 'vendor'), { recursive: true });
  writeFileSync(join(directory, 'vendor/three.module.js'), 'export const REVISION = "185";');
  writeFileSync(join(directory, 'index.html'), `
    <script type="importmap">{"imports":{"three":"./vendor/three.module.js","three/addons/":"file:///MISSING-three-addons/"}}</script>
    <script type="module">
      import * as THREE from 'three';
      import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    </script>
  `);
  const report = preflight3d(join(directory, 'index.html'));
  assert.equal(report.ok, false);
  assert.ok(report.checks.some(check => check.name === 'module-request' && check.detail.includes('MISSING-three-addons')));
});

test('configured Draco symbols still fail when the literal runtime path is missing', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression']);
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
    const loader = new GLTFLoader();
    loader.setDRACOLoader(new DRACOLoader().setDecoderPath('./MISSING-draco/'));
    loader.load('./hero.glb', () => {}, undefined, console.error);
  `);
  const report = preflight3d(directory);
  assert.equal(report.ok, false);
  assert.equal(report.checks.find(check => check.name === 'decoder:draco').ok, true);
  const resources = report.checks.find(check => check.name === 'decoder-resources:draco');
  assert.equal(resources.ok, false);
  assert.match(resources.detail, /MISSING-draco/);
});

test('only extensionsRequired from referenced models create decoder gates', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'package.json'), '{"dependencies":{"three":"0.185.0"}}');
  writeGlb(join(directory, 'hero.glb'), ['KHR_draco_mesh_compression'], []);
  writeFileSync(join(directory, 'scene.js'), `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    new GLTFLoader().load('./hero.glb');
  `);
  const report = preflight3d(directory);
  assert.equal(report.ok, true);
  assert.deepEqual(report.requirements, []);
  assert.equal(report.checks.some(check => check.name === 'decoder:draco'), false);
});

test('unused model inventory produces warnings without creating failures or decoder gates', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, 'unused.glb'), 'not a glb');
  writeGlb(join(directory, 'unused-draco.glb'), ['KHR_draco_mesh_compression']);
  const report = preflight3d(directory);
  assert.equal(report.ok, true);
  assert.deepEqual(report.requirements, []);
  assert.ok(report.checks.some(check => check.name === 'model-inventory' && check.level === 'warn'));
});

test('models referenced by JSON manifests remain authoritative', t => {
  const directory = fixture(t);
  mkdirSync(join(directory, 'assets'), { recursive: true });
  writeFileSync(join(directory, 'assets/broken.glb'), 'not a glb');
  writeFileSync(join(directory, 'assets/manifest.json'), '{"model":"broken.glb"}');
  const report = preflight3d(directory);
  assert.equal(report.ok, false);
  assert.ok(report.checks.some(check => check.name === 'model-parse' && !check.ok));
});

test('explicit missing models are authoritative failures', t => {
  const directory = fixture(t);
  const report = preflight3d(directory, { models: ['missing.glb'] });
  assert.equal(report.ok, false);
  assert.ok(report.checks.some(check => check.name === 'model-resource' && !check.ok));
});
