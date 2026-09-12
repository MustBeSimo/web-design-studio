#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const profiles = [
  { name: 'desktop', flags: ['--viewport', '1440x900'] },
  { name: 'mobile', flags: ['--viewport', '390x844', '--mobile'] },
  { name: 'reduced-motion', flags: ['--viewport', '1440x900', '--reduced-motion'] },
  { name: 'mobile-reduced-motion', flags: ['--viewport', '390x844', '--mobile', '--reduced-motion'] },
  { name: 'no-js', flags: ['--viewport', '1440x900', '--no-js'] },
];

export function runMatrix(target, { out = '.page-proof/matrix', extra = [], selectedProfiles = profiles, execute = spawnSync } = {}) {
  out = resolve(out);
  mkdirSync(out, { recursive: true });
  const proof = join(dirname(fileURLToPath(import.meta.url)), 'proof.mjs');
  const results = [];
  for (const profile of selectedProfiles) {
    const dir = join(out, profile.name);
    const r = execute(process.execPath, [proof, target, '--out', dir, '--check-layout', ...profile.flags, ...extra],
      { encoding: 'utf8', timeout: 240000, maxBuffer: 4 * 1024 * 1024 });
    let evidence = null;
    // Do not read a stale report after failed execution.
    if (r.status === 0 || r.status === 1) {
      try { evidence = JSON.parse(readFileSync(join(dir, 'proof.json'), 'utf8')); } catch {}
    }
    const invalidEvidence = r.status === 0 && (!evidence || evidence.verdict !== 'CLEAN' || !evidence.shots?.length);
    results.push({ name: profile.name, code: r.status, ok: r.status === 0 && !invalidEvidence,
      incomplete: r.status === 2 || r.status === null || invalidEvidence,
      report: evidence ? join(dir, 'proof.json') : null,
      detail: [r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim().slice(-2000) });
  }
  const failed = results.some(r => !r.ok && !r.incomplete);
  const incomplete = results.some(r => r.incomplete);
  const report = { verdict: failed ? 'FAIL' : incomplete ? 'INCOMPLETE' : 'PASS',
    ok: !failed && !incomplete, exitCode: failed ? 1 : incomplete ? 2 : 0, profiles: results };
  writeFileSync(join(out, 'matrix.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const target = args.shift();
    if (!target || target.startsWith('--')) throw new Error('Usage: matrix.mjs <url-or-file> [--out dir] [--browser path] [--profiles names] [--wait ms] [--shots fractions]');
    let out;
    const extra = [];
    let selectedProfiles = profiles;
    for (let i = 0; i < args.length; i++) {
      if (!['--out', '--browser', '--profiles', '--wait', '--shots'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid option: ' + args[i]);
      if (args[i] === '--out') out = args[++i];
      else if (args[i] === '--profiles') {
        const names = [...new Set(args[++i].split(',').map(value => value.trim()).filter(Boolean))];
        selectedProfiles = names.map(name => {
          const profile = profiles.find(candidate => candidate.name === name);
          if (!profile) throw new Error('Unknown profile: ' + name);
          return profile;
        });
        if (!selectedProfiles.length) throw new Error('--profiles requires at least one profile');
      }
      else extra.push(args[i], args[++i]);
    }
    const report = runMatrix(target, { out, extra, selectedProfiles });
    for (const p of report.profiles) console.log(`${p.ok ? 'PASS' : p.incomplete ? 'SKIP' : 'FAIL'} ${p.name}${p.report ? ': ' + p.report : ''}`);
    console.log('page-proof matrix: ' + report.verdict);
    process.exitCode = report.exitCode;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
