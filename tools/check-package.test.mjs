import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
test('new skill routes and executable tools are in the install payload', () => {
  const installer = readFileSync(resolve(root, 'bin/install.mjs'), 'utf8');
  const payload = installer.match(/const PAYLOAD = \[([\s\S]*?)\];/)[1];
  for (const surface of ['package.json', 'bin', 'references', 'tools','runtime']) assert.ok(payload.includes("'" + surface + "'"));
  for (const file of ['references/editions.md', 'references/story-design.md', 'references/build-recipes.md', 'references/tastehq.md',
    'references/recipe-catalog.md', 'references/recipes/editorial-story.md', 'references/recipes/product-reveal.md', 'references/recipes/real-time-3d.md',
    'skills/cinematic-scroll/references/recipe-catalog.md', 'skills/cinematic-scroll/references/editorial-story.md',
    'skills/cinematic-scroll/references/product-reveal.md', 'skills/cinematic-scroll/references/real-time-3d.md',
    'tools/tastehq/cli.mjs', 'tools/page-proof/matrix.mjs', 'tools/page-proof/layout.mjs',
    'runtime/index.mjs','runtime/react.tsx','runtime/three.tsx','references/interaction-runtime.md','tools/export-standalone.mjs',
    'tools/verify/preflight-3d.mjs']) assert.ok(existsSync(resolve(root, file)), file);
});
test('all relative links in canonical skill and new references resolve', () => {
  for (const name of ['SKILL.md', 'references/editions.md', 'references/story-design.md', 'references/build-recipes.md', 'references/tastehq.md','references/interaction-runtime.md',
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
