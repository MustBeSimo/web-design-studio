#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRegistry, root } from './build.mjs';
import { writeConsumer } from './fixture.mjs';
import { verifyConsumers } from './verify-consumers.mjs';

const output = join(root, '.verify/registry');
const remoteIndex = process.argv.indexOf('--registry-base');
const remoteBase = remoteIndex < 0 ? null : process.argv[remoteIndex + 1]?.replace(/\/$/, '');
if (remoteIndex >= 0 && (!remoteBase || !/^https?:\/\//.test(remoteBase))) throw new Error('--registry-base requires an HTTP(S) base URL');
const report = { registryBase: remoteBase || 'local', mode: process.argv.includes('--browser-only') ? 'browser-only' : 'fresh', versions: { shadcn: '4.23.0', next: '16.4.3', vite: '7.3.7', react: '19.3.1', node: process.version }, timings: [], assertions: [] };
mkdirSync(output, { recursive: true });
const services = [];
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', SHADCN_TELEMETRY_DISABLED: '1' };
async function run(command, args, cwd, name) {
  const start = performance.now(), log = join(output, `${name}.log`);
  console.log(name);
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let content = '';
  child.stdout.on('data', chunk => { content += chunk; });
  child.stderr.on('data', chunk => { content += chunk; });
  const code = await new Promise((res, rej) => { child.on('error', rej); child.on('exit', res); });
  writeFileSync(log, content);
  report.timings.push({ step: name, seconds: +( (performance.now() - start) / 1000 ).toFixed(2) });
  if (code !== 0) throw new Error(`${name} failed (${code})\n${content.slice(-6000)}`);
}
async function serve(command, args, cwd, name, url) {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  services.push(child);
  let log = ''; child.stdout.on('data', c => log += c); child.stderr.on('data', c => log += c);
  child.on('exit', () => writeFileSync(join(output, name + '.log'), log));
  for (let i = 0; i < 180; i++) {
    if (child.exitCode !== null) throw new Error(`${name} exited\n${log}`);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`${name} failed to start\n${log}`);
}
const registry = createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  if (!/^\/web-design-studio\/r\/[a-z-]+\.json$/.test(name)) { res.writeHead(404).end(); return; }
  try { res.setHeader('Content-Type', 'application/json'); res.end(readFileSync(join(output, 'site/r', name.split('/').pop()))); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => registry.listen(0, '127.0.0.1', r));
const base = remoteBase || `http://127.0.0.1:${registry.address().port}/web-design-studio`;
try {
  const expected = buildRegistry({ base });
  if (remoteBase) {
    for (const item of expected) {
      const response = await fetch(`${base}/r/${item.name}.json`);
      if (!response.ok) throw new Error(`Live registry ${item.name}: HTTP ${response.status}`);
      const published = await response.json();
      if (JSON.stringify(published) !== JSON.stringify(item)) throw new Error(`Live registry differs from this checkout: ${item.name}`);
    }
    const index = await fetch(`${base}/llms.txt`);
    if (!index.ok || await index.text() !== readFileSync(join(root, 'llms.txt'), 'utf8')) throw new Error('Live llms.txt is missing or stale');
  }
  if (!process.argv.includes('--browser-only')) {
    const cli = join(output, 'cli'); mkdirSync(cli, { recursive: true });
    await run('npm', ['install', '--prefix', cli, '--no-audit', '--no-fund', 'shadcn@4.23.0'], root, 'install-cli');
    // Use the CLI's own public schema, not a hand-maintained approximation.
    const { registryItemSchema, registrySchema } = await import(join(cli, 'node_modules/@shadcn/registry/dist/schema/index.js'));
    registrySchema.parse(JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')));
    for (const name of ['entrance-reveal', 'scrub-video', 'tilt-card', 'cinematic-runtime']) registryItemSchema.parse(JSON.parse(readFileSync(join(output, 'site/r', name + '.json'))));
    for (const kind of ['next', 'vite']) {
      const dir = join(output, kind); rmSync(dir, { recursive: true, force: true }); writeConsumer(dir, kind);
      await run('npm', ['install', '--no-audit', '--no-fund'], dir, kind + '-install');
      await run(process.execPath, [join(cli, 'node_modules/shadcn/dist/index.js'), 'add', ...['entrance-reveal','scrub-video','tilt-card'].map(name => `${base}/r/${name}.json`), '--yes'], dir, kind + '-url-install');
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=12', '-t', '2', '-c:v', 'libx264', '-g', '1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(dir, 'public/clip.mp4')], dir, kind + '-test-media');
      await run('npm', ['run', 'typecheck'], dir, kind + '-typecheck');
      await run('npm', ['run', 'build'], dir, kind + '-build');
    }
  }
  const endpoints = [];
  for (const kind of ['next', 'vite', 'strict-development']) {
    const probe = createServer();
    await new Promise(r => probe.listen(0, '127.0.0.1', r));
    const port = probe.address().port;
    await new Promise(r => probe.close(r));
    const dir = join(output, kind === 'next' ? 'next' : 'vite');
    const args = kind === 'next'
      ? [join(dir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)]
      : [join(dir, 'node_modules/vite/bin/vite.js'), ...(kind === 'vite' ? ['preview'] : []), '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
    const origin = `http://127.0.0.1:${port}`;
    await serve(process.execPath, args, dir, kind + '-server', origin);
    endpoints.push([kind, origin]);
  }
  await verifyConsumers({ output, report, endpoints });
  report.passed = true;
  console.log(process.argv.includes('--browser-only') ? 'Existing consumer browser matrix passed.' : 'Fresh Next + Vite URL installs, strict typechecks, production builds and browser matrix passed.');
} finally {
  for (const child of services) child.kill('SIGTERM');
  registry.closeAllConnections();
  await new Promise(r => registry.close(r));
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
