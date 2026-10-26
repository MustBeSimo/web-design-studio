#!/usr/bin/env node
/**
 * check-consistency.mjs — Phase 12 invariant: catch drift that the per-phase gates don't.
 *
 *   1. VERSION SYNC      package.json === manifest.json === every skills/<name>/SKILL.md frontmatter === .claude-plugin/plugin.json === index.html release label; no root SKILL.md
 *   2. SECRET SCAN       no tracked *.env.local (only *.example may be tracked)
 *   3. KEY PATHS         the foundation files the docs promise actually exist
 *   4. TOKEN DETERMINISM committed tokens/build/variables.css matches a fresh build
 *
 * Exit 0 = consistent. Zero npm deps (uses git + node only). Wired into `npm test` + CI.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

// 1. version sync — package.json, manifest.json, AND the SKILL.md frontmatter (the
//    canonical version a skill registry like ClawHub reads). All three must agree.
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const man = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
if (pkg.version !== man.version) errors.push(`version drift: package.json ${pkg.version} ≠ manifest.json ${man.version}`);
const home = readFileSync(join(ROOT, "index.html"), "utf8");
const release = home.match(/<a\b[^>]*data-release-version="([^"]+)"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
const repository = pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
if (!release || release[1] !== pkg.version || release[2] !== `${repository}/releases/tag/v${pkg.version}` || !release[3].startsWith(`v${pkg.version} ·`)) {
  errors.push("index.html release label/link must match package.json version and repository");
}
// Every installable skill folder carries metadata.version; all must equal package.json.
// A root SKILL.md must never exist: the skills installer would treat the whole repository as the skill.
if (existsSync(join(ROOT, "SKILL.md"))) errors.push("root SKILL.md must not exist (installer would ship the whole repository as one skill)");
const skillDirs = readdirSync(join(ROOT, "skills"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
if (skillDirs.length === 0) errors.push("skills/ has no skill folders");
for (const name of skillDirs) {
  const skillFm = readFileSync(join(ROOT, "skills", name, "SKILL.md"), "utf8").split(/^---\s*$/m)[1] || "";
  const skillVer = (skillFm.match(/^  version:\s*(.+?)\s*$/m) || [])[1];
  if (!skillVer) errors.push(`skills/${name}/SKILL.md frontmatter has no metadata.version field`);
  else if (skillVer !== pkg.version) errors.push(`version drift: skills/${name}/SKILL.md ${skillVer} ≠ package.json ${pkg.version}`);
}
// the Claude Code plugin manifest is a 4th install surface — keep it in the triad (now a quad)
const PLUGIN = join(ROOT, ".claude-plugin/plugin.json");
if (existsSync(PLUGIN)) {
  const plug = JSON.parse(readFileSync(PLUGIN, "utf8"));
  if (plug.version !== pkg.version) errors.push(`version drift: .claude-plugin/plugin.json ${plug.version} ≠ package.json ${pkg.version}`);
}

// 2. secret scan (tracked .env.local) — git required; skip with notice if absent
const ls = spawnSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
if (ls.status === 0) {
  const ALLOW = /\.(example|sample|template)$/;
  const leaked = ls.stdout.split("\n").filter((f) => f && /(^|\/)\.env($|\.)/.test(f) && !ALLOW.test(f));
  for (const f of leaked) errors.push(`tracked secret-bearing file: ${f} (gitignore it; only .env*.example/.sample/.template may be tracked)`);
} else {
  console.log("  (git unavailable — skipping secret scan)");
}

// 3. key paths the docs promise
for (const p of ["design.md", "tokens/core.tokens.json", "tokens/motion.tokens.json", "tokens/semantic.tokens.json",
  "tokens/build/variables.css", "themes/theme-contract.md", "components/manifest.json",
  "references/component-grammar.md", "references/design-tokens.md",
  "learn-mode.md", "references/detection-pipeline.md", "references/pattern-ir.md",
  "references/learning-rubric.md", "references/promotion-rules.md", "references/visual-systems.md",
  "references/learned/manifest.json", "references/learned/LEARNING-LOG.md",
  "references/learned/CLUSTERS.md", "references/learned/PROMOTION-PROPOSALS.md",
  "references/learned/REJECTED.md"]) {
  if (!existsSync(join(ROOT, p))) errors.push(`promised path missing: ${p}`);
}


// 4. token build determinism — committed output must equal a fresh build
const before = existsSync(join(ROOT, "tokens/build/variables.css")) ? readFileSync(join(ROOT, "tokens/build/variables.css"), "utf8") : null;
const build = spawnSync(process.execPath, [join(ROOT, "tools/build-tokens/build.mjs")], { cwd: ROOT, encoding: "utf8" });
if (build.status !== 0) errors.push(`build:tokens failed: ${(build.stderr || "").trim().split("\n").pop()}`);
else {
  const after = readFileSync(join(ROOT, "tokens/build/variables.css"), "utf8");
  if (before !== null && before !== after) errors.push("tokens/build/variables.css is stale — run `npm run build:tokens` and commit the result");
}

// 5. learned-shelf integrity (real shelf): IR schema, pointer↔shelf, manifest in sync
for (const [label, toolArgs] of [
  ["validate-ir", ["tools/learn/validate-ir.mjs"]],
  ["check-pointers", ["tools/learn/check-pointers.mjs"]],
  ["sync-manifest --check", ["tools/learn/sync-manifest.mjs", "--check"]],
]) {
  const r = spawnSync(process.execPath, [join(ROOT, toolArgs[0]), ...toolArgs.slice(1)], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) errors.push(`learned-shelf: ${label} failed — ${((r.stderr || r.stdout) || "").trim().split("\n").pop()}`);
}

if (errors.length) {
  console.error(`✗ check-consistency: ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ check-consistency: version ${pkg.version} in sync (package.json · manifest.json · skills/*/SKILL.md · plugin.json · index.html), no tracked secrets, foundation paths present, token build deterministic, learned-shelf integrity verified (IR schema · pointer↔shelf · manifest sync).`);
process.exit(0);
