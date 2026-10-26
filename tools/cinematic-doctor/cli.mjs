#!/usr/bin/env node
/* ============================================================================
   cinematic-doctor — an executable quality gate for cinematic-scroll builds.

   Scores an HTML build 0-100 across six weighted categories (taste, performance,
   a11y, mobile, tokens, 3D) plus an advisory hygiene pass (weight 0 — info only),
   prints a scorecard, writes cinematic-report.json, and exits non-zero below
   threshold so it can sit in CI / a pre-commit hook.

   Usage:
     node tools/cinematic-doctor/cli.mjs <path-to-html-or-dir>
     node tools/cinematic-doctor/cli.mjs <path> --min 85
     node tools/cinematic-doctor/cli.mjs --selftest
     node tools/cinematic-doctor/cli.mjs --json        # only print the JSON
     node tools/cinematic-doctor/cli.mjs --quiet       # no scorecard, just exit code

   Exit codes:
     0  total >= threshold (or --selftest passed)
     1  total <  threshold (or --selftest failed)
     2  usage / IO error
   ========================================================================== */

import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDoc } from './lib/doc.mjs';
import { localStylesheets } from './lib/stylesheets.mjs';
import { aggregate, renderScorecard, buildReport } from './lib/scorecard.mjs';

import { analyze as taste } from './checks/taste.mjs';
import { analyze as performance } from './checks/performance.mjs';
import { analyze as a11y } from './checks/a11y.mjs';
import { analyze as mobile } from './checks/mobile.mjs';
import { analyze as tokens } from './checks/tokens.mjs';
import { analyze as threed } from './checks/threed.mjs';
import { analyze as hygiene } from './checks/hygiene.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIN = 80;
// hygiene is advisory: it carries no weight (not in WEIGHTS), so it surfaces
// info-level findings without ever changing the score or failing a build.
const CHECKS = [taste, performance, a11y, mobile, tokens, threed, hygiene];

/** Run all checks against one HTML string, returning the aggregate. */
export function scoreHtml(raw, file = '<input>', externalStyles = []) {
  const doc = buildDoc(raw, file, externalStyles);
  const results = CHECKS.map((fn) => fn(doc));
  return aggregate(results);
}

/** Score a single file path. */
function scoreFile(file) {
  const raw = readFileSync(file, 'utf8');
  return scoreHtml(raw, file, localStylesheets(raw,file));
}

/** Directories that never contain gradeable web builds: dependency trees,
 *  build output, the doctor's own test fixtures (which include an
 *  intentionally failing bad.html), and the benchmark's internal review apps
 *  (bench/skill-ab: blind-comparison and review tooling for maintainers, not
 *  websites the skill produced). Hidden dirs are skipped separately. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out',
  'coverage', '.thumbnails', 'fixtures', 'skill-ab',
]);

/** Collect *.html files from a path. A file resolves to itself; a directory
 *  is walked recursively (skipping SKIP_DIRS and hidden dirs) so both
 *  `examples` and a whole-repo `.` sweep find the real builds, not noise. */
function collectTargets(target) {
  const st = statSync(target);
  if (st.isFile()) return [target];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      let s;
      try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) {
        if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
        walk(full);
      } else if (name.endsWith('.html')) {
        out.push(full);
      }
    }
  };
  walk(target);
  return out;
}

/** HyperFrames video compositions are fixed-canvas render targets (e.g.
 *  1920×1080 driven by a paused GSAP timeline), not responsive web builds.
 *  Grading them against web rules — responsive breakpoints, reduced-motion,
 *  visible focus — is a category error, so a sweep recognises and skips them.
 *  Detected by the compiler's `data-composition-id` marker or a fixed-pixel
 *  viewport (a real responsive site never pins viewport width to pixels). */
function isVideoComposition(raw) {
  return /data-composition-id\s*=/.test(raw)
    || /<meta[^>]+name=["']viewport["'][^>]*content=["'][^"']*\bwidth=\s*\d{3,}/i.test(raw);
}

function parseArgs(argv) {
  const opts = { min: DEFAULT_MIN, json: false, quiet: false, selftest: false, targets: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') opts.selftest = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--min') opts.min = Number(argv[++i]);
    else if (a.startsWith('--min=')) opts.min = Number(a.slice(6));
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else opts.targets.push(a);
  }
  if (!Number.isFinite(opts.min)) opts.min = DEFAULT_MIN;
  return opts;
}

const HELP = `cinematic-doctor — quality gate for cinematic-scroll builds

  node tools/cinematic-doctor/cli.mjs <path-to-html-or-dir> [--min N] [--json] [--quiet]
  node tools/cinematic-doctor/cli.mjs --selftest

Categories: taste(30) performance(25) a11y(20) mobile(15) tokens(12) threed(10, N/A unless 3D detected) hygiene(advisory, weight 0 — info only, never affects the score).
Weights re-normalize over applied categories. Default threshold ${DEFAULT_MIN} (override --min).
Exit 0 if total >= threshold, else 1. Writes cinematic-report.json next to the CLI.`;

/** --selftest: good.html must PASS, bad.html must FAIL. */
function runSelftest() {
  const fixtures = join(__dirname, 'fixtures');
  const good = join(fixtures, 'good.html');
  const bad = join(fixtures, 'bad.html');
  const min = DEFAULT_MIN;

  const goodAgg = scoreFile(good);
  const badAgg = scoreFile(bad);
  const goodPass = goodAgg.total >= min;
  const badPass = badAgg.total >= min;

  console.log('cinematic-doctor --selftest');
  console.log(`  good.html → ${goodAgg.total}/100  expected PASS (>=${min})  → ${goodPass ? 'PASS ✓' : 'FAIL ✗'}`);
  for (const c of goodAgg.categories) console.log(`      ${c.category.padEnd(12)} ${c.score}`);
  console.log(`  bad.html  → ${badAgg.total}/100  expected FAIL (<${min})   → ${!badPass ? 'FAIL ✓' : 'PASS ✗'}`);
  for (const c of badAgg.categories) console.log(`      ${c.category.padEnd(12)} ${c.score}`);

  // Advisory hygiene check: must flag smells on a dirty page and stay silent on a
  // clean one — and, being weight 0, must NOT change the score (bad.html still
  // fails on the real categories, good.html still passes).
  const dirty = '<!doctype html><html><head><style>.used{}.deadzzz{color:red}</style></head><body><div class="used"></div><script src="./local.js"></script><script>document.body.hasAttribute("data-ghost")</script></body></html>';
  const clean = '<!doctype html><html><head><style>.used{color:red}</style></head><body><div class="used"></div><script>console.log(1)</script></body></html>';
  const hygN = (h) => (scoreHtml(h).categories.find((c) => c.category === 'hygiene') || { findings: [] }).findings.length;
  const dirtyN = hygN(dirty), cleanN = hygN(clean);
  const hygieneOK = dirtyN >= 3 && cleanN === 0;
  console.log(`  hygiene (advisory) → dirty ${dirtyN} finding(s) (expect >=3), clean ${cleanN} (expect 0)  → ${hygieneOK ? 'PASS ✓' : 'FAIL ✗'}`);

  const ok = goodPass && !badPass && hygieneOK;
  console.log('');
  console.log(ok
    ? '  selftest OK — good PASSes, bad FAILs, hygiene advisory works.'
    : `  selftest FAILED — good ${goodPass ? 'passed' : 'did NOT pass'}, bad ${badPass ? 'incorrectly passed' : 'correctly failed'}${hygieneOK ? '' : ', hygiene advisory MISfired'}.`);
  return ok ? 0 : 1;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) { console.log(HELP); process.exit(0); }
  if (opts.selftest) process.exit(runSelftest());

  if (opts.targets.length === 0) {
    console.error(HELP);
    process.exit(2);
  }

  // Expand each target to candidate files.
  let files = [];
  for (const t of opts.targets) {
    const abs = resolve(t);
    if (!existsSync(abs)) { console.error(`not found: ${t}`); process.exit(2); }
    files.push(...collectTargets(abs));
  }
  files = [...new Set(files)];
  if (files.length === 0) { console.error('no .html files found at target(s).'); process.exit(2); }

  // Separate web builds from video compositions. The latter are fixed-canvas
  // render targets graded by the video pipeline, not against responsive web
  // rules — including them here would be a false negative on the web gate.
  const webFiles = [];
  const videoFiles = [];
  for (const file of files) {
    (isVideoComposition(readFileSync(file, 'utf8')) ? videoFiles : webFiles).push(file);
  }

  if (webFiles.length === 0) {
    if (!opts.quiet) {
      for (const f of videoFiles) {
        console.log(`  ${relative(process.cwd(), f) || f} — video composition (fixed canvas), not graded as a web build`);
      }
    }
    process.exit(0); // nothing web to gate; not a failure
  }

  const reports = [];
  let worst = 100;
  for (const file of webFiles) {
    const agg = scoreFile(file);
    const rel = relative(process.cwd(), file) || file;
    const report = buildReport(rel, agg, opts.min);
    reports.push(report);
    worst = Math.min(worst, agg.total);
    if (!opts.json && !opts.quiet) {
      console.log(renderScorecard(rel, agg, opts.min));
    }
  }

  const out = reports.length === 1 ? reports[0] : { tool: 'cinematic-doctor', version: 1, threshold: opts.min, lowestTotal: worst, pass: worst >= opts.min, reports };
  const reportPath = join(__dirname, 'cinematic-report.json');
  writeFileSync(reportPath, JSON.stringify(out, null, 2) + '\n');

  if (opts.json) {
    console.log(JSON.stringify(out, null, 2));
  } else if (!opts.quiet) {
    console.log(`  report → ${relative(process.cwd(), reportPath) || reportPath}`);
    if (videoFiles.length > 0) {
      console.log(`  skipped ${videoFiles.length} video composition(s) (fixed canvas, graded by the video pipeline)`);
    }
    if (reports.length > 1) {
      console.log(`  lowest total across ${reports.length} web build(s): ${worst}/100 → ${worst >= opts.min ? 'PASS' : 'FAIL'}`);
    }
  }

  process.exit(worst >= opts.min ? 0 : 1);
}

main();
