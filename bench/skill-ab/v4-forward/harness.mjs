#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BRIEF, EXPERIMENT, SKILL_PAYLOAD_PATHS, WORK, exportGitTree, hashTree, loadConfig, protocolFiles, readJson, resolveGitRef, sha256, sha256File, writeJson } from "./lib.mjs";
import { evaluateRun } from "./evaluate.mjs";

const argv = process.argv.slice(2);
const command = argv[0] || "help";
const hasFlag = (name) => argv.includes(`--${name}`);
const statePath = (name) => join(WORK, "state", name);

function fail(message, code = 1) {
  console.error(`✗ ${message}`);
  process.exit(code);
}

export function paidRunAuthorized(args) {
  return args.includes("--execute") && args.includes("--ack-paid-runs");
}

export function changedPreparedInputs(directory, expectedHashes) {
  const changed = [];
  for (const [path, expected] of Object.entries(expectedHashes)) {
    const absolute = join(directory, path);
    if (!existsSync(absolute) || sha256File(absolute) !== expected) changed.push(path);
  }
  return changed;
}

export function authoredOutputViolations(beforeHashes, afterHashes) {
  const changed = Object.keys(beforeHashes).filter((path) => afterHashes[path] !== beforeHashes[path]);
  const added = Object.keys(afterHashes).filter((path) => !Object.hasOwn(beforeHashes, path) && path !== "index.html");
  return { changed, added, valid: changed.length === 0 && added.length === 0 && Object.hasOwn(afterHashes, "index.html") };
}

export function makeRunPlan(seed, isolatedRoot) {
  const first = Number.parseInt(sha256(seed).slice(0, 2), 16) % 2 === 0 ? "B" : "C";
  const order = first === "B" ? ["B", "C", "B", "C"] : ["C", "B", "C", "B"];
  const counters = { B: 0, C: 0 };
  return order.map((conditionId, index) => {
    const attempt = ++counters[conditionId];
    const id = `${conditionId}-${attempt}`;
    return { id, conditionId, attempt, order: index + 1, directory: join(isolatedRoot, id), status: "pending" };
  });
}

export function validateProtocol() {
  const config = loadConfig();
  const errors = [];
  if (config.protocolVersion !== "4.0.0" || config.kind !== "baseline-candidate-forward-test") errors.push("protocol must remain the v4 baseline/candidate forward test");
  if (config.conditions?.map((item) => `${item.id}:${item.skillRef}`).join("|") !== "B:f1b5625|C:eb9e1aa") errors.push("conditions must remain baseline f1b5625 and candidate eb9e1aa");
  if (config.model !== "claude-sonnet-5") errors.push("model must remain claude-sonnet-5");
  if (config.attempts !== 2 || config.conditions?.length !== 2) errors.push("the forward test must contain two attempts per condition");
  if (config.budgetCapUsd !== 8) errors.push("the four-run budget cap must remain US$8");
  if (config.runner.allowedTools !== "Read,Write,Edit") errors.push("the runner may expose only Read,Write,Edit");
  if (!config.runner.safeMode || !config.runner.restricted || config.runner.sessionPersistence !== false) errors.push("safe, restricted, non-persistent execution is required");
  if (config.runner.maxBudgetUsd !== 2 || config.runner.maxTurns !== 60 || config.runner.timeoutSeconds !== 1200) errors.push("per-attempt limits must remain US$2, 60 turns, and 20 minutes");
  if (config.expectedAssets.join("|") !== "assets/orbit-field-viewer.js|assets/scene.json|assets/poster.svg") errors.push("exactly the three supplied assets must be configured");
  for (const path of ["brief.md", "copy.json", "kit.json", ...config.expectedAssets]) if (!existsSync(join(BRIEF, path))) errors.push(`missing brief input ${path}`);
  if (SKILL_PAYLOAD_PATHS.some((path) => /^(?:bench|evals)(?:\/|$)/.test(path))) errors.push("skill payload includes benchmark/evaluation material");
  try {
    for (const condition of config.conditions) {
      const fullRef = resolveGitRef(condition.skillRef);
      if (!fullRef.startsWith(condition.skillRef)) errors.push(`${condition.id} skillRef resolved unexpectedly`);
    }
  } catch (error) { errors.push(error.message); }
  return { config, errors, protocolFiles: protocolFiles() };
}

function protocolHashes() {
  return Object.fromEntries(protocolFiles().map((path) => [path, sha256File(join(EXPERIMENT, path))]));
}

export function parseRunnerResult(path, wallMs, result) {
  let raw = {}, parsed = false;
  try { raw = readJson(path); parsed = true; } catch { /* raw result remains retained */ }
  const usage = raw.usage || raw.modelUsage || {};
  const nested = Object.values(usage).filter((value) => value && typeof value === "object");
  const sum = (keys) => nested.reduce((total, value) => total + Number(keys.map((key) => value[key]).find(Number.isFinite) || 0), 0);
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
  if (result.status !== 0 || result.signal || result.error) issues.push("runner process did not exit cleanly");
  if (result.error?.code === "ETIMEDOUT") issues.push("runner timed out");
  if (raw.type !== "result" || raw.subtype !== "success" || raw.is_error === true) issues.push("runner did not report success");
  if (!Number.isFinite(turns) || turns <= 0 || turns > 60) issues.push("turn count is missing or outside the cap");
  if (!hasCost || !Number.isFinite(costUsd) || costUsd < 0 || costUsd > 2.001) issues.push("reported cost is missing or outside the cap");
  if (!raw.usage && !raw.modelUsage) issues.push("token usage is missing");
  if (Object.values(tokens).some((value) => !Number.isFinite(value) || value < 0) || Object.values(tokens).every((value) => value === 0)) issues.push("token usage is invalid");
  return {
    runnerValid: issues.length === 0, runnerIssues: issues,
    exitCode: result.status, signal: result.signal || null,
    timedOut: result.error?.code === "ETIMEDOUT", wallMs,
    turns: Number.isFinite(turns) ? turns : null,
    costUsd: hasCost && Number.isFinite(costUsd) && costUsd >= 0 ? costUsd : null,
    tokens, stopReason: raw.stop_reason ?? raw.terminal_reason ?? null
  };
}

function assertPreparedIntegrity(lock) {
  if (JSON.stringify(protocolHashes()) !== JSON.stringify(lock.protocolHashes)) throw new Error("forward-test protocol changed after preparation");
  for (const conditionId of ["B", "C"]) {
    const snapshot = join(WORK, "snapshots", conditionId);
    if (JSON.stringify(hashTree(snapshot)) !== JSON.stringify(lock.skillPayloadHashes[conditionId])) throw new Error(`pinned ${conditionId} skill payload changed after preparation`);
  }
  const plan = readJson(statePath("plan.json"));
  const shape = plan.map(({ id, conditionId, attempt, order, directory }) => ({ id, conditionId, attempt, order, directory }));
  if (JSON.stringify(shape) !== JSON.stringify(lock.planShape)) throw new Error("prepared run plan identity changed");
  const outputHashes = existsSync(statePath("output-hashes.json")) ? readJson(statePath("output-hashes.json")) : {};
  for (const attempt of plan.filter((entry) => entry.status !== "pending")) {
    const archive = join(WORK, "runs", attempt.id);
    if (!outputHashes[attempt.id] || !existsSync(archive) || JSON.stringify(hashTree(archive)) !== JSON.stringify(outputHashes[attempt.id])) {
      throw new Error(`${attempt.id} retained output changed after archival`);
    }
  }
  for (const attempt of plan.filter((entry) => entry.status === "pending")) {
    if (JSON.stringify(hashTree(attempt.directory)) !== JSON.stringify(lock.inputHashes[attempt.id])) throw new Error(`${attempt.id} isolated input changed before execution`);
  }
  return plan;
}

function runnerCapabilities(config) {
  const version = spawnSync(config.runner.executable, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) throw new Error(`${config.runner.executable} --version failed`);
  const help = spawnSync(config.runner.executable, ["--help"], { encoding: "utf8" });
  for (const flag of ["--restricted", "--safe-mode", "--no-session-persistence"]) {
    if (help.status !== 0 || !help.stdout.includes(flag)) throw new Error(`${config.runner.executable} lacks ${flag}`);
  }
  return version.stdout.trim();
}

function prepare() {
  const { config, errors } = validateProtocol();
  if (errors.length) fail(`protocol invalid:\n  - ${errors.join("\n  - ")}`);
  if (existsSync(WORK)) fail(".work already exists; preserve the existing evidence or remove it deliberately before preparing a new test");
  let version;
  try { version = runnerCapabilities(config); } catch (error) { fail(error.message); }
  mkdirSync(join(WORK, "state"), { recursive: true });
  const refs = Object.fromEntries(config.conditions.map((condition) => [condition.id, resolveGitRef(condition.skillRef)]));
  for (const condition of config.conditions) exportGitTree(refs[condition.id], join(WORK, "snapshots", condition.id));
  const isolatedRoot = mkdtempSync(join(tmpdir(), "wds-v4-forward-"));
  const prompt = readFileSync(join(EXPERIMENT, "prompt.txt"), "utf8");
  const seed = process.env.WDS_V4_SEED || new Date().toISOString();
  const plan = makeRunPlan(seed, isolatedRoot);
  for (const entry of plan) {
    const directory = entry.directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    cpSync(BRIEF, directory, { recursive: true });
    cpSync(join(WORK, "snapshots", entry.conditionId), join(directory, "skill"), { recursive: true });
    writeFileSync(join(directory, "PROMPT.txt"), `${prompt.trim()}\n`);
  }
  const commonInputHashes = plan.map((entry) => Object.fromEntries(Object.entries(hashTree(entry.directory)).filter(([path]) => !path.startsWith("skill/"))));
  if (commonInputHashes.some((hashes) => JSON.stringify(hashes) !== JSON.stringify(commonInputHashes[0]))) fail("non-skill inputs differ between prepared runs");
  const lock = {
    preparedAt: new Date().toISOString(), protocolVersion: config.protocolVersion,
    refs, model: config.model, seed,
    runner: { executable: config.runner.executable, version }, isolatedRoot,
    allowedTools: config.runner.allowedTools,
    skillPayloadPaths: SKILL_PAYLOAD_PATHS,
    skillPayloadHashes: Object.fromEntries(["B", "C"].map((id) => [id, hashTree(join(WORK, "snapshots", id))])),
    protocolHashes: protocolHashes(),
    commonInputHashes: commonInputHashes[0],
    inputHashes: Object.fromEntries(plan.map((entry) => [entry.id, hashTree(entry.directory)])),
    planShape: plan.map(({ id, conditionId, attempt, order, directory }) => ({ id, conditionId, attempt, order, directory }))
  };
  writeJson(statePath("lock.json"), lock);
  writeJson(statePath("plan.json"), plan);
  writeJson(statePath("ledger.json"), { capUsd: config.budgetCapUsd, spentUsd: 0, attempts: [] });
  console.log(JSON.stringify({ prepared: true, refs, model: config.model, runs: plan.length, seed, isolatedRoot, paidCalls: 0 }, null, 2));
}

async function runNext() {
  if (!paidRunAuthorized(argv)) fail("paid execution is gated; pass both --execute and --ack-paid-runs", 2);
  if (!existsSync(statePath("lock.json"))) fail("run prepare first");
  const config = loadConfig();
  const lock = readJson(statePath("lock.json"));
  let plan;
  try { plan = assertPreparedIntegrity(lock); } catch (error) { fail(error.message); }
  const version = runnerCapabilities(config);
  if (version !== lock.runner.version) fail(`runner version changed after preparation (expected ${lock.runner.version}, got ${version})`);
  const entry = plan.find((item) => item.status === "pending");
  if (!entry) fail("all four forward-test runs are already complete");
  const ledger = readJson(statePath("ledger.json"));
  if (ledger.spentUsd + config.runner.maxBudgetUsd > ledger.capUsd) fail("the retained ledger cannot cover another capped run");
  const root = realpathSync(lock.isolatedRoot), directory = realpathSync(entry.directory);
  if (!directory.startsWith(`${root}${sep}`)) fail("isolated attempt escaped its prepared root");
  const prompt = readFileSync(join(directory, "PROMPT.txt"), "utf8");
  const args = [
    "-p", prompt, "--model", config.model, "--output-format", "json",
    "--setting-sources", "", "--safe-mode", "--restricted", "--strict-mcp-config",
    "--mcp-config", '{"mcpServers":{}}', "--allowedTools", config.runner.allowedTools,
    "--disallowedTools", config.runner.disallowedTools,
    "--max-turns", String(config.runner.maxTurns), "--max-budget-usd", String(config.runner.maxBudgetUsd),
    "--permission-mode", "acceptEdits", "--no-session-persistence"
  ];
  const started = Date.now();
  const result = spawnSync(config.runner.executable, args, {
    cwd: directory, encoding: "utf8", timeout: config.runner.timeoutSeconds * 1000,
    maxBuffer: 64 * 1024 * 1024
  });
  const runnerOutputHashes = hashTree(directory);
  const outputViolations = authoredOutputViolations(lock.inputHashes[entry.id], runnerOutputHashes);
  writeFileSync(join(directory, "result.json"), result.stdout || "{}");
  writeFileSync(join(directory, "stderr.log"), result.stderr || String(result.error || ""));
  const metrics = parseRunnerResult(join(directory, "result.json"), Date.now() - started, result);
  const changedInputs = changedPreparedInputs(directory, lock.inputHashes[entry.id]);
  let evaluation;
  if (!outputViolations.valid) {
    evaluation = { status: "failed", functionalComplete: false, reason: `authored output contract failed; changed=[${outputViolations.changed.join(", ")}], added=[${outputViolations.added.join(", ")}]` };
    writeJson(join(directory, "evaluation.json"), evaluation);
  } else if (!metrics.runnerValid) {
    evaluation = { status: "infrastructure-review", functionalComplete: false, reason: metrics.runnerIssues.join("; ") };
    writeJson(join(directory, "evaluation.json"), evaluation);
  } else {
    try { evaluation = await evaluateRun(directory); }
    catch (error) {
      evaluation = { status: "infrastructure-review", functionalComplete: false, reason: String(error?.stack || error) };
      writeJson(join(directory, "evaluation.json"), evaluation);
    }
  }
  writeJson(join(directory, "metrics.json"), { id: entry.id, conditionId: entry.conditionId, attempt: entry.attempt, model: config.model, skillRef: lock.refs[entry.conditionId], ...metrics, changedInputs, outputViolations, evaluationStatus: evaluation.status, functionalComplete: evaluation.functionalComplete });
  entry.status = evaluation.status === "infrastructure-review" ? "infrastructure-review" : "complete";
  entry.completedAt = new Date().toISOString();
  writeJson(statePath("plan.json"), plan);
  const accountedCostUsd = metrics.costUsd ?? config.runner.maxBudgetUsd;
  ledger.spentUsd = Number((ledger.spentUsd + accountedCostUsd).toFixed(6));
  ledger.attempts.push({ id: entry.id, conditionId: entry.conditionId, accountedCostUsd, reportedCostUsd: metrics.costUsd, turns: metrics.turns, wallMs: metrics.wallMs, runnerValid: metrics.runnerValid, functionalComplete: evaluation.functionalComplete, status: evaluation.status });
  writeJson(statePath("ledger.json"), ledger);
  const archive = join(WORK, "runs", entry.id);
  if (existsSync(archive)) fail(`archive already exists for ${entry.id}`);
  cpSync(directory, archive, { recursive: true });
  const outputHashes = existsSync(statePath("output-hashes.json")) ? readJson(statePath("output-hashes.json")) : {};
  outputHashes[entry.id] = hashTree(archive);
  writeJson(statePath("output-hashes.json"), outputHashes);
  console.log(JSON.stringify({ run: entry.id, metrics, evaluation: { status: evaluation.status, functionalComplete: evaluation.functionalComplete }, ledger }, null, 2));
}

function validate() {
  const report = validateProtocol();
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

function status() {
  const report = validateProtocol();
  const output = { protocolValid: report.errors.length === 0, errors: report.errors, prepared: existsSync(statePath("lock.json")), paidCallsRequested: false };
  if (output.prepared) {
    output.lock = readJson(statePath("lock.json"));
    output.plan = readJson(statePath("plan.json"));
    output.ledger = readJson(statePath("ledger.json"));
    if (existsSync(statePath("taste-result.json"))) output.tasteReview = readJson(statePath("taste-result.json"));
    if (existsSync(statePath("conclusion.json"))) output.conclusion = readJson(statePath("conclusion.json"));
    try { assertPreparedIntegrity(output.lock); output.evidenceIntegrity = "passed"; }
    catch (error) { output.evidenceIntegrity = "failed"; output.integrityError = error.message; process.exitCode = 1; }
  }
  console.log(JSON.stringify(output, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};

function reportAddedClaims(report) {
  const records = [
    ...Object.values(report.profiles || {}), report.noJavaScript,
    ...Object.values(report.failures || {})
  ].filter(Boolean);
  return records.filter((record) => record.copy?.unexpected || record.copy?.duplicated?.length).length;
}

export function buildConclusion(records, acceptance, taste = null) {
  const byCondition = Object.fromEntries(["B", "C"].map((id) => [id, records.filter((record) => record.conditionId === id)]));
  const stats = Object.fromEntries(Object.entries(byCondition).map(([id, rows]) => [id, {
    functional: rows.filter((row) => row.functionalComplete).length,
    addedClaims: rows.reduce((sum, row) => sum + row.addedClaims, 0),
    medianCostUsd: median(rows.map((row) => row.costUsd)),
    medianWallMs: median(rows.map((row) => row.wallMs)),
    medianTurns: median(rows.map((row) => row.turns))
  }]));
  const ratios = {
    cost: stats.C.medianCostUsd / stats.B.medianCostUsd,
    time: stats.C.medianWallMs / stats.B.medianWallMs,
    turns: stats.C.medianTurns / stats.B.medianTurns
  };
  const gates = {
    candidateFunctional: stats.C.functional === acceptance.candidateFunctional,
    baselineFunctional: stats.B.functional <= acceptance.baselineFunctionalMax,
    candidateClaims: stats.C.addedClaims <= acceptance.candidateAddedClaimsMax,
    cost: ratios.cost <= acceptance.medianCostRatioMax,
    time: ratios.time <= acceptance.medianTimeRatioMax,
    turns: ratios.turns <= acceptance.medianTurnsRatioMax
  };
  const functionalEfficiencyClaimSupported = Object.values(gates).every(Boolean);
  const tasteClaimSupported = Boolean(functionalEfficiencyClaimSupported && taste?.candidateWins >= acceptance.candidateTasteWinsRequired && taste?.complete);
  return { stats, ratios, gates, functionalEfficiencyClaimSupported, tasteReview: taste, tasteClaimSupported };
}

function conclude() {
  if (!existsSync(statePath("lock.json"))) fail("run prepare and all four attempts first");
  const config = loadConfig(), lock = readJson(statePath("lock.json"));
  let plan;
  try { plan = assertPreparedIntegrity(lock); } catch (error) { fail(error.message); }
  if (plan.some((entry) => entry.status !== "complete")) fail("conclusion requires four completed, non-infrastructure runs");
  const records = plan.map((entry) => {
    const directory = join(WORK, "runs", entry.id);
    const metrics = readJson(join(directory, "metrics.json"));
    const evaluation = readJson(join(directory, "evaluation.json"));
    return {
      id: entry.id, conditionId: entry.conditionId,
      costUsd: metrics.costUsd, wallMs: metrics.wallMs, turns: metrics.turns,
      functionalComplete: evaluation.functionalComplete,
      addedClaims: reportAddedClaims(evaluation)
    };
  });
  const taste = existsSync(statePath("taste-result.json")) ? readJson(statePath("taste-result.json")) : null;
  const conclusion = buildConclusion(records, config.acceptance, taste);
  writeJson(statePath("conclusion.json"), conclusion);
  console.log(JSON.stringify(conclusion, null, 2));
  if (!conclusion.functionalEfficiencyClaimSupported) process.exitCode = 1;
}

function help() {
  console.log("v4 baseline/candidate forward test\n\n  node harness.mjs validate\n  node harness.mjs prepare\n  node harness.mjs status\n  node harness.mjs run --execute --ack-paid-runs\n  node harness.mjs conclude\n\nOnly run can invoke a paid agent, one sealed attempt at a time.");
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  if (command === "validate") validate();
  else if (command === "prepare") prepare();
  else if (command === "run") await runNext();
  else if (command === "status") status();
  else if (command === "conclude") conclude();
  else if (command === "help" || command === "--help") help();
  else fail(`unknown command ${command}`, 2);
}
