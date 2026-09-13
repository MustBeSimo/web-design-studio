#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  EXPERIMENT, REPO, WORK, allRuns, exportGitTree, hashOrder, loadConfig, materializeKit,
  normalizeText, protocolFiles, readJson, resolveGitRef, sha256File, writeJson
} from "./lib.mjs";
import { runPreflight } from "./preflight.mjs";
import { evaluateRun } from "./evaluate.mjs";

const argv = process.argv.slice(2);
const command = argv[0] || "help";
const option = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const statePath = (name) => join(WORK, "state", name);
export const SKILL_PAYLOAD_PATHS = [
  "SKILL.md", "AGENTS.md", "package.json", "manifest.json", "design.md", "taste-guardrails.md", "MODELS.md", "COMPATIBILITY.md", "ASSETS-3D.md",
  "references", "components", "runtime", "templates", "tokens", "themes", "tools", "examples"
];

function fail(message, code = 1) {
  console.error(`✗ ${message}`);
  process.exit(code);
}

function validateProtocol() {
  const config = loadConfig();
  const errors = [];
  if (config.protocolVersion !== "3.0.0") errors.push("protocolVersion must be 3.0.0");
  if (config.status !== "draft-not-frozen") errors.push("tracked experiment status must remain draft-not-frozen; frozen state belongs in .work");
  if (config.conditions.map((item) => item.id).join("") !== "ABC") errors.push("condition order/ids must be A, B, C");
  if (config.conditions.find((item) => item.id === "B")?.skillRef !== "dd2ecfb") errors.push("condition B must stay pinned to dd2ecfb");
  if (config.attemptsPerCondition !== 2 || config.briefs.length !== 3 || allRuns(config).length !== 18) errors.push("protocol must describe exactly 18 runs");
  const allocation = config.budget.developmentUsd + config.budget.evaluationUsd + config.budget.reserveUsd;
  if (allocation !== config.budget.overallUsd) {
    errors.push("development, evaluation, and reserve budgets must sum to overallUsd");
  }
  if (allRuns(config).length * config.runner.maxBudgetUsd > config.budget.evaluationUsd) errors.push("evaluation caps exceed evaluation budget");
  if (config.runner.maxTurns !== 60 || config.runner.timeoutSeconds !== 1200 || config.runner.maxBudgetUsd !== 2) errors.push("per-run caps must remain 60 turns, 20 minutes, and US$2");
  if (/\b(?:Bash|WebFetch|WebSearch)\b/.test(config.runner.allowedTools)) errors.push("isolated runs must not expose shell or web tools");
  for (const brief of config.briefs) {
    for (const key of ["brief", "copy", "kit"]) if (!existsSync(join(EXPERIMENT, brief[key]))) errors.push(`${brief.id}: missing ${brief[key]}`);
    if (existsSync(join(EXPERIMENT, brief.brief)) && existsSync(join(EXPERIMENT, brief.copy))) {
      const source = normalizeText(readFileSync(join(EXPERIMENT, brief.brief), "utf8"));
      for (const phrase of readJson(join(EXPERIMENT, brief.copy)).required || []) if (!source.includes(normalizeText(phrase))) errors.push(`${brief.id}: required copy absent from brief: ${phrase}`);
    }
    try {
      const kit = readJson(join(EXPERIMENT, brief.kit));
      if (!kit.files?.length || !kit.requiredUsage?.length) errors.push(`${brief.id}: kit must list files and requiredUsage`);
    } catch (error) { errors.push(`${brief.id}: invalid kit: ${error.message}`); }
  }
  const ids = allRuns(config).map((run) => run.id);
  if (new Set(ids).size !== ids.length) errors.push("run identifiers are not unique");
  return { config, errors, files: protocolFiles() };
}

function protocolHashes() {
  return Object.fromEntries(protocolFiles().map((file) => [file, sha256File(join(EXPERIMENT, file))]));
}

export function assertFrozenIntegrity(lock) {
  const current = protocolHashes();
  const changed = Object.keys(lock.protocolHashes).filter((file) => current[file] !== lock.protocolHashes[file]);
  const added = Object.keys(current).filter((file) => !lock.protocolHashes[file]);
  if (changed.length || added.length) throw new Error(`frozen protocol changed (${[...changed, ...added].join(", ")}); create a new freeze instead of running mixed inputs`);
  for (const condition of ["B", "C"]) {
    const actual = snapshotHashes(join(WORK, "snapshots", condition));
    if (JSON.stringify(actual) !== JSON.stringify(lock.skillPayloadHashes[condition])) throw new Error(`frozen ${condition} skill payload changed`);
  }
}

export function assertFrozenEvidenceIntegrity() {
  if (!existsSync(statePath("lock.json"))) throw new Error("experiment is not frozen");
  const lock = readJson(statePath("lock.json"));
  assertFrozenIntegrity(lock);
  const preflight = join(WORK, "preflight.json");
  if (!existsSync(preflight) || sha256File(preflight) !== lock.preflightSha256) throw new Error("frozen preflight is absent or changed");
  const plan = readJson(statePath("run-plan.json"));
  const planShape = plan.map(({ id, briefId, conditionId, attempt, order }) => ({ id, briefId, conditionId, attempt, order }));
  if (JSON.stringify(planShape) !== JSON.stringify(lock.runPlanShape)) throw new Error("frozen run plan identity or order changed");
  const archiveHashPath = statePath("run-output-hashes.json");
  if (!existsSync(archiveHashPath)) throw new Error("archived run hashes are missing");
  const archiveHashes = readJson(archiveHashPath);
  for (const run of plan.filter((item) => item.status === "complete")) {
    if (!archiveHashes[run.id]) throw new Error(`archived hashes missing for ${run.id}`);
    const actual = snapshotHashes(join(WORK, "runs", run.id));
    if (JSON.stringify(actual) !== JSON.stringify(archiveHashes[run.id])) throw new Error(`archived output changed for ${run.id}`);
  }
  return { lock, plan };
}

export function prepareSnapshot(ref, destination) {
  exportGitTree(ref, destination, SKILL_PAYLOAD_PATHS);
}

export function snapshotHashes(directory) {
  const rows = [];
  const visit = (relativePath) => {
    const absolute = join(directory, relativePath);
    const status = spawnSync("find", [absolute, "-type", "f"], { encoding: "utf8" });
    if (status.status !== 0) throw new Error(`cannot inventory skill snapshot ${directory}`);
    for (const file of status.stdout.trim().split("\n").filter(Boolean)) rows.push([file.slice(directory.length + 1), sha256File(file)]);
  };
  visit("");
  return Object.fromEntries(rows.sort(([a], [b]) => a.localeCompare(b)));
}

async function freeze() {
  const { config, errors } = validateProtocol();
  if (errors.length) fail(`protocol invalid:\n  - ${errors.join("\n  - ")}`);
  const model = option("model");
  if (!model) fail("freeze requires an exact --model identifier", 2);
  const developmentSpentUsd = Number(option("development-spent", "0"));
  if (!Number.isFinite(developmentSpentUsd) || developmentSpentUsd < 0 || developmentSpentUsd > config.budget.developmentUsd) fail(`--development-spent must be between 0 and ${config.budget.developmentUsd}`, 2);
  if (existsSync(statePath("lock.json")) && !flag("force")) fail("a frozen experiment already exists; pass --force only to discard an unstarted freeze");
  const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: REPO, encoding: "utf8" }).stdout.trim();
  if (dirty) fail("candidate must be a clean committed tree before freezing");
  const candidateRef = resolveGitRef(option("candidate-ref", "HEAD"));
  const currentRef = resolveGitRef("dd2ecfb");
  const cliVersion = spawnSync(config.runner.executable, ["--version"], { encoding: "utf8" });
  if (cliVersion.status !== 0) fail(`${config.runner.executable} --version failed; install/authenticate the runner before freezing`);
  const cliHelp = spawnSync(config.runner.executable, ["--help"], { encoding: "utf8" });
  for (const capability of ["--restricted", "--safe-mode", "--no-session-persistence"]) {
    if (cliHelp.status !== 0 || !cliHelp.stdout.includes(capability)) fail(`${config.runner.executable} lacks required isolated-run capability ${capability}`);
  }
  if (flag("force") && existsSync(WORK)) rmSync(WORK, { recursive: true, force: true });
  mkdirSync(join(WORK, "state"), { recursive: true });
  const preflight = await runPreflight();
  if (preflight.status !== "passed") fail(`kit preflight failed: ${preflight.error || "see .work/preflight.json"}`);
  prepareSnapshot(currentRef, join(WORK, "snapshots", "B"));
  prepareSnapshot(candidateRef, join(WORK, "snapshots", "C"));
  const seed = option("seed", randomBytes(16).toString("hex"));
  const isolatedRoot = resolve(option("isolated-root", join(tmpdir(), `wds-skill-ab-v3-${seed}`)));
  if (isolatedRoot === REPO || isolatedRoot.startsWith(`${REPO}${sep}`)) fail("--isolated-root must be outside the repository");
  if (existsSync(isolatedRoot)) fail(`isolated run root already exists: ${isolatedRoot}`);
  mkdirSync(join(isolatedRoot, "runs"), { recursive: true, mode: 0o700 });
  const plan = hashOrder(allRuns(config), seed).map((run, order) => ({ ...run, order: order + 1, status: "pending" }));
  for (const run of plan) {
    const brief = config.briefs.find((item) => item.id === run.briefId);
    const condition = config.conditions.find((item) => item.id === run.conditionId);
    const directory = join(isolatedRoot, "runs", run.id);
    mkdirSync(directory, { recursive: true });
    cpSync(join(EXPERIMENT, brief.brief), join(directory, "brief.md"));
    materializeKit(brief, join(directory, "kit"));
    const prompt = readFileSync(join(EXPERIMENT, condition.prompt), "utf8");
    writeFileSync(join(directory, "PROMPT.txt"), `${prompt.trim()}\n`);
    if (run.conditionId !== "A") cpSync(join(WORK, "snapshots", run.conditionId), join(directory, "skill"), { recursive: true });
  }
  const lock = {
    protocolVersion: config.protocolVersion,
    frozenAt: new Date().toISOString(),
    seed,
    model,
    runner: { executable: config.runner.executable, version: cliVersion.stdout.trim() },
    refs: { current: currentRef, candidate: candidateRef },
    isolatedRoot,
    skillPayloadPaths: SKILL_PAYLOAD_PATHS,
    skillPayloadHashes: { B: snapshotHashes(join(WORK, "snapshots", "B")), C: snapshotHashes(join(WORK, "snapshots", "C")) },
    runInputHashes: Object.fromEntries(plan.map((run) => [run.id, snapshotHashes(join(isolatedRoot, "runs", run.id))])),
    runPlanShape: plan.map(({ id, briefId, conditionId, attempt, order }) => ({ id, briefId, conditionId, attempt, order })),
    protocolHashes: protocolHashes(),
    preflightSha256: sha256File(join(WORK, "preflight.json"))
  };
  writeJson(statePath("lock.json"), lock);
  writeJson(statePath("run-plan.json"), plan);
  writeJson(statePath("budget.json"), { overallUsd: config.budget.overallUsd, developmentSpentUsd, evaluationCapUsd: config.budget.evaluationUsd, evaluationSpentUsd: 0, reserveUsd: config.budget.reserveUsd, completedRuns: 0 });
  writeJson(statePath("invalidations.json"), { groups: [] });
  writeJson(statePath("run-output-hashes.json"), {});
  console.log(`✓ frozen ${plan.length} runs; candidate ${candidateRef.slice(0, 12)}; model ${model}; seed ${seed}`);
}

function parseResult(path, wallMs, exit) {
  let raw = {};
  let parsed = false;
  try { raw = readJson(path); parsed = true; } catch { /* retained as malformed output */ }
  const usage = raw.usage || raw.modelUsage || {};
  const nested = Object.values(usage).filter((value) => value && typeof value === "object");
  const sum = (keys) => nested.reduce((total, item) => total + Number(keys.map((key) => item[key]).find(Number.isFinite) || 0), 0);
  const hasCost = Object.hasOwn(raw, "total_cost_usd") || Object.hasOwn(raw, "cost_usd");
  const costUsd = Number(raw.total_cost_usd ?? raw.cost_usd);
  const turns = Number(raw.num_turns ?? raw.turns);
  const tokens = {
    input: Number(usage.input_tokens ?? sum(["inputTokens", "input_tokens"])),
    output: Number(usage.output_tokens ?? sum(["outputTokens", "output_tokens"])),
    cacheRead: Number(usage.cache_read_input_tokens ?? sum(["cacheReadInputTokens", "cache_read_input_tokens"])),
    cacheWrite: Number(usage.cache_creation_input_tokens ?? sum(["cacheCreationInputTokens", "cache_creation_input_tokens"]))
  };
  const issues = [];
  if (!parsed) issues.push("result JSON is missing or malformed");
  if (exit.status !== 0 || exit.signal || exit.error) issues.push("runner process did not exit cleanly");
  if (exit.error?.code === "ETIMEDOUT") issues.push("runner timed out");
  if (raw.type !== "result" || raw.subtype !== "success" || raw.is_error === true) issues.push("runner did not report a successful result");
  if (!Number.isFinite(turns) || turns <= 0) issues.push("turn count is missing or invalid");
  if (!hasCost || !Number.isFinite(costUsd) || costUsd < 0) issues.push("reported cost is missing or invalid");
  if (!raw.usage && !raw.modelUsage) issues.push("token usage is missing");
  if (Object.values(tokens).some((value) => !Number.isFinite(value) || value < 0)) issues.push("token usage is invalid");
  if (Object.values(tokens).every((value) => value === 0)) issues.push("token usage contains no reported tokens");
  if (Object.values(tokens).every((value) => value === 0)) issues.push("token usage contains no reported activity");
  return {
    exitCode: exit.status,
    signal: exit.signal,
    timedOut: exit.error?.code === "ETIMEDOUT",
    wallMs,
    turns: Number.isFinite(turns) ? turns : null,
    costUsd: hasCost && Number.isFinite(costUsd) && costUsd >= 0 ? costUsd : null,
    tokens,
    isError: issues.length > 0,
    runnerValid: issues.length === 0,
    runnerIssues: issues,
    stopReason: raw.stop_reason ?? raw.terminal_reason ?? null,
  };
}

async function runNext() {
  if (!flag("execute") || !flag("ack-paid-runs")) fail("paid execution is gated; use both --execute and --ack-paid-runs after reviewing the frozen plan", 2);
  if (!existsSync(statePath("lock.json"))) fail("experiment is not frozen; run freeze first");
  const config = loadConfig();
  const lock = readJson(statePath("lock.json"));
  assertFrozenIntegrity(lock);
  const cliVersion = spawnSync(config.runner.executable, ["--version"], { encoding: "utf8" });
  if (cliVersion.status !== 0 || cliVersion.stdout.trim() !== lock.runner.version) fail(`runner version changed after freeze (expected ${lock.runner.version}, got ${cliVersion.stdout.trim() || "unavailable"})`);
  const preflight = readJson(join(WORK, "preflight.json"));
  if (preflight.status !== "passed" || sha256File(join(WORK, "preflight.json")) !== lock.preflightSha256) fail("frozen kit preflight is absent, failed, or changed");
  const plan = readJson(statePath("run-plan.json"));
  const invalid = new Set(readJson(statePath("invalidations.json")).groups.map((group) => group.briefId));
  const requested = option("run");
  const run = plan.find((item) => item.status === "pending" && !invalid.has(item.briefId));
  if (!run) fail("no pending valid runs");
  if (requested && requested !== run.id) fail(`sealed order requires ${run.id} next; --run cannot skip ahead`);
  if (invalid.has(run.briefId)) fail(`${run.briefId} is invalidated and cannot be run`);
  const budget = readJson(statePath("budget.json"));
  if (budget.evaluationSpentUsd + config.runner.maxBudgetUsd > budget.evaluationCapUsd) fail("evaluation budget cannot cover another capped run");
  if (budget.developmentSpentUsd + budget.evaluationSpentUsd + config.runner.maxBudgetUsd + budget.reserveUsd > budget.overallUsd) fail("overall US$50 budget cannot cover another capped run");
  const directory = join(lock.isolatedRoot, "runs", run.id);
  const realRoot = realpathSync(lock.isolatedRoot);
  if (!existsSync(directory) || !realpathSync(directory).startsWith(`${realRoot}${sep}`)) fail(`isolated run directory is invalid: ${directory}`);
  if (JSON.stringify(snapshotHashes(directory)) !== JSON.stringify(lock.runInputHashes?.[run.id])) fail(`${run.id} isolated inputs changed after freeze`);
  if (existsSync(join(directory, "result.json"))) fail(`${run.id} already has a result and cannot be rerun`);
  const prompt = readFileSync(join(directory, "PROMPT.txt"), "utf8");
  const args = ["-p", prompt, "--model", lock.model, "--output-format", "json", "--setting-sources", "", "--safe-mode", "--restricted", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
    "--allowedTools", config.runner.allowedTools, "--disallowedTools", config.runner.disallowedTools,
    "--max-turns", String(config.runner.maxTurns), "--max-budget-usd", String(config.runner.maxBudgetUsd), "--permission-mode", "acceptEdits", "--no-session-persistence"];
  const started = Date.now();
  const result = spawnSync(config.runner.executable, args, { cwd: directory, encoding: "utf8", timeout: config.runner.timeoutSeconds * 1000, maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(join(directory, "result.json"), result.stdout || "{}");
  writeFileSync(join(directory, "stderr.log"), result.stderr || String(result.error || ""));
  const metrics = parseResult(join(directory, "result.json"), Date.now() - started, result);
  const brief = config.briefs.find((item) => item.id === run.briefId);
  let evaluation;
  if (!metrics.runnerValid) {
    evaluation = { status: "infrastructure-review", functionalComplete: false, error: metrics.runnerIssues.join("; ") };
    writeJson(join(directory, "evaluation.json"), evaluation);
  } else {
    try { evaluation = await evaluateRun(directory, brief); }
    catch (error) { evaluation = { status: "infrastructure-review", functionalComplete: false, error: String(error?.stack || error) }; writeJson(join(directory, "evaluation.json"), evaluation); }
  }
  writeJson(join(directory, "metrics.json"), { run, model: lock.model, ...metrics, functionalComplete: evaluation.functionalComplete, evaluationStatus: evaluation.status });
  const record = plan.find((item) => item.id === run.id);
  record.status = evaluation.status === "infrastructure-review" ? "infrastructure-review" : "complete";
  record.completedAt = new Date().toISOString();
  writeJson(statePath("run-plan.json"), plan);
  const accountedCost = metrics.costUsd ?? config.runner.maxBudgetUsd;
  budget.evaluationSpentUsd = Number((budget.evaluationSpentUsd + accountedCost).toFixed(6));
  budget.completedRuns += 1;
  writeJson(statePath("budget.json"), budget);
  const archived = join(WORK, "runs", run.id);
  if (existsSync(archived)) fail(`archived run already exists: ${archived}`);
  cpSync(directory, archived, { recursive: true });
  const archiveHashes = readJson(statePath("run-output-hashes.json"));
  archiveHashes[run.id] = snapshotHashes(archived);
  writeJson(statePath("run-output-hashes.json"), archiveHashes);
  console.log(JSON.stringify({ run: run.id, metrics, evaluation: { status: evaluation.status, functionalComplete: evaluation.functionalComplete }, budget }, null, 2));
}

function invalidate() {
  const briefId = option("brief");
  const reason = option("reason");
  if (!briefId || !reason || !flag("infrastructure")) fail("usage: invalidate --brief <id> --reason <text> --infrastructure", 2);
  const config = loadConfig();
  if (!config.briefs.some((brief) => brief.id === briefId)) fail(`unknown brief ${briefId}`, 2);
  if (!existsSync(statePath("lock.json"))) fail("experiment is not frozen");
  const invalidations = readJson(statePath("invalidations.json"));
  if (!invalidations.groups.some((group) => group.briefId === briefId)) invalidations.groups.push({ briefId, reason, invalidatedAt: new Date().toISOString(), classification: "infrastructure" });
  writeJson(statePath("invalidations.json"), invalidations);
  const plan = readJson(statePath("run-plan.json"));
  for (const run of plan) if (run.briefId === briefId && run.status === "pending") run.status = "invalidated";
  writeJson(statePath("run-plan.json"), plan);
  console.log(`✓ invalidated comparison group ${briefId}; logs and costs are retained`);
}

function status() {
  const { config, errors } = validateProtocol();
  const output = { protocolValid: errors.length === 0, errors, plannedRuns: allRuns(config).length, frozen: existsSync(statePath("lock.json")) };
  if (output.frozen) {
    output.lock = readJson(statePath("lock.json"));
    output.plan = readJson(statePath("run-plan.json")).reduce((counts, run) => ({ ...counts, [run.status]: (counts[run.status] || 0) + 1 }), {});
    output.budget = readJson(statePath("budget.json"));
    output.invalidations = readJson(statePath("invalidations.json"));
  }
  console.log(JSON.stringify(output, null, 2));
  if (errors.length) process.exitCode = 1;
}

function help() {
  console.log(`Skill A/B/C v3 harness\n\n  node harness.mjs validate\n  node harness.mjs preflight\n  node harness.mjs freeze --model <exact-model> [--candidate-ref HEAD] [--seed value] [--development-spent 0] [--isolated-root /private/path]\n  node harness.mjs status\n  node harness.mjs run --execute --ack-paid-runs [--run editorial--A--1]\n  node harness.mjs invalidate --brief three-d --reason <text> --infrastructure\n  node review.mjs prepare\n  node review.mjs reveal --ratings <ratings.json>\n\nfreeze and run are intentionally separate; no paid call occurs during validate, preflight, status, or review.`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  if (command === "validate") { const report = validateProtocol(); console.log(JSON.stringify(report, null, 2)); if (report.errors.length) process.exitCode = 1; }
  else if (command === "preflight") { const report = await runPreflight(); console.log(JSON.stringify(report, null, 2)); if (report.status !== "passed") process.exitCode = 1; }
  else if (command === "freeze") await freeze();
  else if (command === "run") await runNext();
  else if (command === "invalidate") invalidate();
  else if (command === "status") status();
  else if (command === "help" || command === "--help") help();
  else fail(`unknown command ${command}`, 2);
}

export { validateProtocol, parseResult };
