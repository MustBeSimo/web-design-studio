import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('npm tarball is a thin installer: skills, the installer, licence and README only', () => {
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  const fileCount = pack.entryCount ?? pack.files.length;
  assert.ok(pack.unpackedSize < 500_000, `unpacked ${pack.unpackedSize} bytes`);
  assert.ok(fileCount < 40, `${fileCount} files`);
  for (const file of pack.files) assert.match(file.path, /^(bin\/install\.mjs$|skills\/|LICENSE$|README\.md$|package\.json$)/, file.path);
  const shipped = pack.files.map((file) => file.path);
  for (const required of ['skills/cinematic-scroll/SKILL.md', 'skills/scroll-audit/SKILL.md', 'skills/launch-page-strategy/SKILL.md', 'bin/install.mjs']) {
    assert.ok(shipped.includes(required), required);
  }
});

test('package.json has no runtime dependencies and one bin', () => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined);
  assert.deepEqual(Object.keys(pkg.bin), ['cinematic-scroll-skill']);
});

test('toolkit files the repository docs promise still exist in the repository', () => {
  for (const file of ['references/editions.md', 'references/story-design.md', 'references/build-recipes.md', 'references/tastehq.md',
    'references/recipe-catalog.md', 'references/recipes/editorial-story.md', 'references/recipes/product-reveal.md', 'references/recipes/real-time-3d.md',
    'skills/cinematic-scroll/references/recipe-catalog.md', 'skills/cinematic-scroll/references/editorial-story.md',
    'skills/cinematic-scroll/references/product-reveal.md', 'skills/cinematic-scroll/references/real-time-3d.md',
    'tools/tastehq/cli.mjs', 'tools/page-proof/matrix.mjs', 'tools/page-proof/layout.mjs',
    'runtime/index.mjs','runtime/react.tsx','runtime/three.tsx','references/interaction-runtime.md','tools/export-standalone.mjs',
    'tools/verify/preflight-3d.mjs']) assert.ok(existsSync(resolve(root, file)), file);
});
test('all relative links in canonical skill and new references resolve', () => {
  for (const name of ['references/editions.md', 'references/story-design.md', 'references/build-recipes.md', 'references/tastehq.md','references/interaction-runtime.md',
    'references/recipe-catalog.md', 'references/recipes/editorial-story.md', 'references/recipes/product-reveal.md', 'references/recipes/real-time-3d.md',
    'skills/cinematic-scroll/SKILL.md', 'skills/cinematic-scroll/references/recipe-catalog.md',
    'skills/cinematic-scroll/references/editorial-story.md', 'skills/cinematic-scroll/references/product-reveal.md',
    'skills/cinematic-scroll/references/real-time-3d.md',
    '.codex/skills/cinematic-scroll/SKILL.md', '.cursor/skills/cinematic-scroll/SKILL.md']) {
    const file = resolve(root, name);
    for (const match of readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:|^#/.test(match[1])) continue;
      const target = resolve(dirname(file), match[1].split('#')[0]);
      assert.ok(existsSync(target), name + ' → ' + target);
    }
  }
});
