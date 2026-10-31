import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { buildRegistry, root } from './build.mjs';

test('static registry is deterministic, bounded and carries complete relative dependencies', t => {
  const out = mkdtempSync(join(tmpdir(), 'wds-registry-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const base = 'http://localhost:9183/project-prefix';
  const items = buildRegistry({ out, base });
  const before = readFileSync(join(out, 'registry.json'), 'utf8');
  buildRegistry({ out, base });
  assert.equal(readFileSync(join(out, 'registry.json'), 'utf8'), before);
  assert.ok(Buffer.byteLength(before) < 100_000, 'pilot catalog stays under 100 KB');
  assert.deepEqual(items.map(i => i.name), ['entrance-reveal', 'scrub-video', 'tilt-card', 'cinematic-runtime']);
  const targets = new Set(items.flatMap(item => item.files.map(file => file.target)));
  for (const item of items) {
    for (const dependency of item.registryDependencies) {
      assert.ok(dependency.startsWith(base + '/r/'));
      assert.ok(items.some(i => dependency.endsWith('/' + i.name + '.json')));
    }
    for (const file of item.files) {
      assert.match(file.content, /Permission is hereby granted/);
      assert.ok(!file.target.includes('..'));
      for (const [, specifier] of file.content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        if (specifier.startsWith('.')) {
          const target = posix.normalize(posix.join(posix.dirname(file.target), specifier));
          assert.ok(targets.has(target), `missing ${target}`);
        } else if (specifier.startsWith('@/lib/')) {
          assert.ok(targets.has(specifier.replace('@/lib/', '@lib/') + '.tsx'), `missing ${specifier}`);
        } else {
          const dependency = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
          assert.ok(dependency === 'react' || item.dependencies.some(d => d.startsWith(dependency + '@')), `undeclared ${dependency}`);
        }
      }
      if (file.path.endsWith('.mjs') && file.path !== 'runtime/core.mjs') {
        assert.ok(targets.has(file.target.replace(/\.mjs$/, '.d.mts')), 'typed public JS exports');
      }
    }
  }
  const packageFiles = JSON.parse(readFileSync(join(root, 'package.json'))).files;
  assert.ok(!packageFiles.some(path => /^(runtime|components|registry)/.test(path)), 'registry does not enlarge the skill payload');
});

test('invalid base URLs fail before generating payloads', () => {
  for (const base of ['file:///tmp/registry', 'https://example.com/?token=secret', 'https://example.com/#fragment']) {
    assert.throws(() => buildRegistry({ base }));
  }
});

test('agent index points to real project-prefix documents and install cards name real items', () => {
  const index = readFileSync(join(root, 'llms.txt'), 'utf8');
  const catalog = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8'));
  for (const [, path] of index.matchAll(/https:\/\/mustbesimo.github.io\/web-design-studio\/([^\s)]+)/g)) {
    assert.ok(readFileSync(join(root, path)).length > 0, `missing indexed document ${path}`);
  }
  for (const name of ['entrance-reveal', 'scrub-video', 'tilt-card']) {
    const card = readFileSync(join(root, 'docs/registry', name + '.md'), 'utf8');
    assert.ok(card.includes(`/web-design-studio/r/${name}.json`));
    assert.ok(catalog.items.some(item => item.name === name));
  }
});
