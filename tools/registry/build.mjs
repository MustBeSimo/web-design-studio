#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const publicBase = 'https://mustbesimo.github.io/web-design-studio';

/** Canonical source in, deterministic static payloads out; no runtime service. */
export function buildRegistry({ base = publicBase, out = resolve(root, '.verify/registry/site/r') } = {}) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash) throw new Error('Expected an HTTP(S) base URL without query or hash');
  base = url.href.replace(/\/$/, '');
  const catalog = JSON.parse(readFileSync(resolve(root, 'registry.json'), 'utf8'));
  const license = readFileSync(resolve(root, 'LICENSE'), 'utf8').trim();
  const notice = `/*\n${license}\n*/\n`;
  const items = catalog.items.map(item => ({
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    ...item,
    registryDependencies: (item.registryDependencies || []).map(dependency => dependency.replace(publicBase, base)),
    files: item.files.map(file => {
      const source = resolve(root, file.path);
      if (!source.startsWith(root + '/')) throw new Error(`Source escapes repository: ${file.path}`);
      return { ...file, content: notice + readFileSync(source, 'utf8') };
    }),
  }));
  mkdirSync(out, { recursive: true });
  for (const item of items) writeFileSync(resolve(out, `${item.name}.json`), JSON.stringify(item, null, 2) + '\n');
  // Endpoint-local catalog for clients that inspect the registry as a collection.
  writeFileSync(resolve(out, 'registry.json'), JSON.stringify({ ...catalog, items }, null, 2) + '\n');
  return items;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    if (!['--base', '--out'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: build.mjs [--base URL] [--out directory]');
    options[args[i].slice(2)] = args[++i];
  }
  const items = buildRegistry(options);
  console.log(`Built ${items.length} registry items (${items.reduce((n, item) => n + Buffer.byteLength(JSON.stringify(item)), 0)} bytes).`);
}
