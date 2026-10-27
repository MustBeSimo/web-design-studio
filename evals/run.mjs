#!/usr/bin/env node
/**
 * evals/run.mjs — Phase 11 eval runner.
 *
 *   node evals/run.mjs                       # validate trigger set + assert all golden fixtures
 *   node evals/run.mjs --target out.html --spec mode-a-pinned-chapter   # score an agent-built file
 *
 * Deterministic part (runs in CI): every golden fixture must hit its doctor score and
 * content rules. Triggering accuracy needs an LLM judge — the runner validates the
 * dataset shape and prints it as the judge's worklist (recall/precision targets in the file).
 *
 * Exit 0 = all deterministic assertions pass. Zero npm deps.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateTriggerCases } from "./trigger-schema.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };

function doctorScore(file) {
  const r = spawnSync(process.execPath, [join(ROOT, "tools/cinematic-doctor/cli.mjs"), file, "--json"], { cwd: ROOT, encoding: "utf8" });
  try { return JSON.parse(r.stdout).total; } catch { return null; }
}

function assertFile(file, a) {
  const errs = [];
  const abs = join(ROOT, file);
  if (!existsSync(abs)) return [`file missing: ${file}`];
  const text = readFileSync(abs, "utf8");
  if (a.doctorMin != null) {
    const s = doctorScore(file);
    if (s == null) errs.push(`${file}: doctor produced no score`);
    else if (s < a.doctorMin) errs.push(`${file}: doctor ${s} < ${a.doctorMin}`);
  }
  for (const needle of a.mustContain || []) if (!text.includes(needle)) errs.push(`${file}: missing required "${needle}"`);
  for (const pat of a.mustNotMatch || []) if (new RegExp(pat, "i").test(text)) errs.push(`${file}: matched banned /${pat}/`);
  return errs;
}

const golden = JSON.parse(readFileSync(join(ROOT, "evals/golden.json"), "utf8"));
const trigger = JSON.parse(readFileSync(join(ROOT, "evals/trigger.json"), "utf8"));

// --- single-target mode (score an agent-built file against a buildSpec) ---
const target = arg("target");
if (target) {
  const spec = golden.buildSpecs.find((s) => s.id === arg("spec"));
  if (!spec) { console.error(`unknown --spec; choices: ${golden.buildSpecs.map((s) => s.id).join(", ")}`); process.exit(2); }
  const a = spec.assert || {};
  const checkable = a.doctorMin != null || (a.mustContain && a.mustContain.length) || (a.mustNotMatch && a.mustNotMatch.length);
  if (!checkable) {
    console.error(`✗ spec "${spec.id}" has no script-checkable assertion (e.g. a Mode B build spec). Run its build manually: ${a.note || "typecheck + build in the project"}. Not a pass.`);
    process.exit(2);
  }
  const errs = assertFile(target, spec.assert);
  if (errs.length) { console.error(`✗ ${target} vs ${spec.id}:`); errs.forEach((e) => console.error(`  - ${e}`)); process.exit(1); }
  console.log(`✓ ${target} satisfies golden spec "${spec.id}".`);
  process.exit(0);
}

// --- trigger set shape + summary ---
const skills = readdirSync(join(ROOT, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(ROOT, "skills", entry.name, "SKILL.md")))
  .map((entry) => entry.name).sort();
const badShape = validateTriggerCases(trigger.cases, skills);
if (badShape.length) { console.error(`✗ trigger.json:\n  ${badShape.join("\n  ")}`); process.exit(1); }
const pos = trigger.cases.filter((c) => c.should_trigger).length;
const neg = trigger.cases.length - pos;

// --- golden fixtures (deterministic) ---
let failed = 0;
console.log("Golden fixtures:");
for (const f of golden.goldenFixtures) {
  const errs = assertFile(f.file, f);
  if (errs.length) { failed++; console.log(`  ✗ ${f.file}`); errs.forEach((e) => console.log(`      ${e}`)); }
  else console.log(`  ✓ ${f.file} (doctor ≥ ${f.doctorMin})`);
}

console.log(`\nTrigger set: ${trigger.cases.length} cases (${pos} should-fire, ${neg} near-miss negatives) — run with an LLM judge; targets recall ${trigger.metric.recall_target}, precision ${trigger.metric.precision_target}.`);
for (const skill of skills) {
  const cases = trigger.cases.filter((c) => c.skill === skill);
  const positives = cases.filter((c) => c.should_trigger).length;
  console.log(`  ${skill}: ${cases.length} cases (${positives} should-fire, ${cases.length - positives} near-miss negatives)`);
}
console.log(`Build specs: ${golden.buildSpecs.length} (run via an agent, score with --target/--spec).`);

if (failed) { console.error(`\n✗ evals: ${failed} golden fixture(s) failed.`); process.exit(1); }
console.log(`\n✓ evals: all ${golden.goldenFixtures.length} golden fixtures pass; trigger set well-formed.`);
process.exit(0);
