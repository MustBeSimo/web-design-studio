import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assessExactBodyText, bodyStrings, evaluateRun, failurePasses, pixelDifference, profilePasses, progressTracksScroll, summarizeAssetRequests } from "./evaluate.mjs";
import { authoredOutputViolations, buildConclusion, changedPreparedInputs, makeRunPlan, paidRunAuthorized, parseRunnerResult, validateProtocol } from "./harness.mjs";
import { BRIEF, SKILL_PAYLOAD_PATHS, exportGitTree, loadConfig, readJson } from "./lib.mjs";
import { buildPublicManifest, makeBlindMap, stageBlindBuild } from "./review.mjs";

test("protocol fixes two attempts per condition and the exact restricted runner", () => {
  const { config, errors } = validateProtocol();
  assert.deepEqual(errors, []);
  assert.deepEqual(config.conditions.map(({ id, skillRef }) => ({ id, skillRef })), [{ id: "B", skillRef: "f1b5625" }, { id: "C", skillRef: "eb9e1aa" }]);
  assert.equal(config.model, "claude-sonnet-5");
  assert.equal(config.attempts, 2);
  assert.equal(config.budgetCapUsd, 8);
  assert.equal(config.runner.allowedTools, "Read,Write,Edit");
  assert.equal(config.runner.maxBudgetUsd, 2);
  assert.equal(config.runner.maxTurns, 60);
  assert.equal(config.runner.timeoutSeconds, 1200);
});

test("seeded plan is deterministic and alternates two runs per condition", () => {
  const one = makeRunPlan("fixed", "/tmp/v4");
  const two = makeRunPlan("fixed", "/tmp/v4");
  assert.deepEqual(one, two);
  assert.equal(one.length, 4);
  assert.equal(one.filter((run) => run.conditionId === "B").length, 2);
  assert.equal(one.filter((run) => run.conditionId === "C").length, 2);
  assert.ok(one.every((run, index) => index === 0 || run.conditionId !== one[index - 1].conditionId));
});

test("paid execution requires both acknowledgements", () => {
  assert.equal(paidRunAuthorized(["run"]), false);
  assert.equal(paidRunAuthorized(["run", "--execute"]), false);
  assert.equal(paidRunAuthorized(["run", "--ack-paid-runs"]), false);
  assert.equal(paidRunAuthorized(["run", "--execute", "--ack-paid-runs"]), true);
});

test("sealed input check reports modified or removed files without rejecting new outputs", () => {
  const directory = mkdtempSync(join(tmpdir(), "v4-input-"));
  writeFileSync(join(directory, "brief.md"), "sealed");
  const expected = { "brief.md": "c9d0036bed6744bcdf692fc980d8717d7e5f5a4f4e8266b4a84982602fb1cd09" };
  assert.deepEqual(changedPreparedInputs(directory, expected), []);
  writeFileSync(join(directory, "index.html"), "new output");
  assert.deepEqual(changedPreparedInputs(directory, expected), []);
  writeFileSync(join(directory, "brief.md"), "changed");
  assert.deepEqual(changedPreparedInputs(directory, expected), ["brief.md"]);
});

test("runner may author only index.html", () => {
  const before = { "brief.md": "a", "assets/poster.svg": "b" };
  assert.equal(authoredOutputViolations(before, { ...before, "index.html": "c" }).valid, true);
  assert.deepEqual(authoredOutputViolations(before, { ...before, "index.html": "c", "style.css": "d" }).added, ["style.css"]);
  assert.deepEqual(authoredOutputViolations(before, { ...before, "brief.md": "z", "index.html": "c" }).changed, ["brief.md"]);
  assert.equal(authoredOutputViolations(before, before).valid, false);
});

test("body ledger detects missing, duplicate, and extra visible copy", () => {
  const copy = readJson(join(BRIEF, "copy.json"));
  const expected = bodyStrings(copy, "ready");
  assert.deepEqual(assessExactBodyText(expected.join("\n"), expected), { missing: [], duplicated: [], unexpected: "" });
  const missing = assessExactBodyText(expected.slice(1).join("\n"), expected);
  assert.deepEqual(missing.missing, [copy.hero.eyebrow]);
  const duplicate = assessExactBodyText(`${expected.join("\n")}\n${copy.footer}`, expected);
  assert.deepEqual(duplicate.duplicated, [{ phrase: copy.footer, count: 2 }]);
  assert.equal(assessExactBodyText(`${expected.join("\n")}\nUnapproved claim`, expected).unexpected, "Unapproved claim");
});

test("asset request ledger requires the three local assets exactly once", () => {
  const expected = loadConfig().expectedAssets;
  const base = "http://127.0.0.1:43210";
  const valid = summarizeAssetRequests([`${base}/index.html`, ...expected.map((path) => `${base}/${path}`)], base, expected);
  assert.equal(valid.exactThree, true);
  assert.equal(summarizeAssetRequests([`${base}/index.html`, `${base}/${expected[0]}`], base, expected).exactThree, false);
  assert.deepEqual(summarizeAssetRequests([`${base}/index.html`, ...expected.map((path) => `${base}/${path}`), `${base}/extra.css`], base, expected).unexpected, ["extra.css"]);
  assert.deepEqual(summarizeAssetRequests([`${base}/index.html`, ...expected.map((path) => `${base}/${path}`), `${base}/${expected[0]}`], base, expected).duplicates, [expected[0]]);
});

test("pixel evidence distinguishes a changed render from a static frame", () => {
  const one = Uint8Array.from([0, 0, 0, 255, 20, 20, 20, 255]);
  const two = Uint8Array.from([0, 0, 0, 255, 80, 20, 20, 255]);
  assert.deepEqual(pixelDifference(one, one), { pixels: 2, changedPixels: 0, changedRatio: 0 });
  assert.deepEqual(pixelDifference(one, two), { pixels: 2, changedPixels: 1, changedRatio: .5 });
});

function passingProfile(id = "desktop") {
  const readyAt = 30;
  return {
    id, state: "ready", statusMatches: true,
    copy: { missing: [], duplicated: [], unexpected: "" }, visibleCopy: [true], metadata: true,
    posterDecoded: true, posterVisible: false, posterDecode: [{ src: "poster.svg", completedAt: 20 }],
    canvasFallbackMatches: true, canvasVisible: true, canvasId: "canvas-1",
    webglContexts: [{ canvasId: "canvas-1", type: "webgl", stack: "at orbit-field-viewer.js:1", drawCalls: 4, firstDrawAt: 10, progress: id === "reduced" ? [{ value: .52, scrollY: 0 }] : [{ value: .1, scrollY: 100 }, { value: .8, scrollY: 900 }] }],
    externalRequests: [], uncaught: [], consoleErrors: [], failedRequests: [],
    assetRequests: { exactThree: true }, assetResponsesOk: true, h1Count: 1, headingsValid: true, overflowX: 0,
    anchor: { valid: true, works: true }, toggle: { works: true }, renderEvents: [{ state: "ready", at: readyAt }], scrollable: true,
    motion: { firstNonDominantRatio: .2, secondNonDominantRatio: .2, ambientChangedRatio: id === "reduced" ? 0 : .01, changedRatio: id === "reduced" ? 0 : .1 },
    mobile: { stageInFlow: true, stageRatio: .8, minControlSize: 44, bodyFontSize: 16 }
  };
}

test("normal, mobile, and reduced profiles have distinct motion/layout gates", () => {
  assert.equal(profilePasses(passingProfile("desktop")), true);
  assert.equal(profilePasses(passingProfile("mobile")), true);
  assert.equal(profilePasses(passingProfile("reduced")), true);
  assert.equal(profilePasses({ ...passingProfile("desktop"), motion: { firstNonDominantRatio: .2, secondNonDominantRatio: .2, changedRatio: 0 } }), false);
  assert.equal(profilePasses({ ...passingProfile("mobile"), mobile: { stageInFlow: false, stageRatio: .8, minControlSize: 44, bodyFontSize: 16 } }), false);
  assert.equal(profilePasses({ ...passingProfile("reduced"), motion: { firstNonDominantRatio: .2, secondNonDominantRatio: .2, changedRatio: .1 } }), false);
  assert.equal(profilePasses({ ...passingProfile("desktop"), canvasId: "different-canvas" }), false);
  assert.equal(profilePasses({ ...passingProfile("desktop"), webglContexts: [{ ...passingProfile("desktop").webglContexts[0], progress: [{ value: .4 }] }] }), false);
  assert.equal(profilePasses({ ...passingProfile("desktop"), webglContexts: [{ ...passingProfile("desktop").webglContexts[0], progress: [{ value: .1, scrollY: 200 }, { value: .8, scrollY: 200 }] }] }), false);
  assert.equal(profilePasses({ ...passingProfile("desktop"), renderEvents: [{ state: "ready", at: 5 }] }), false);
});

test("progress evidence must correlate a material value change with scroll movement", () => {
  assert.equal(progressTracksScroll([{ value: .1, scrollY: 100 }, { value: .8, scrollY: 900 }]), true);
  assert.equal(progressTracksScroll([{ value: .1, scrollY: 100 }, { value: .8, scrollY: 100 }]), false);
  assert.equal(progressTracksScroll([{ value: .1, scrollY: 100 }, { value: .2, scrollY: 900 }]), false);
});

test("failure gate requires fast complete fallback and an initially open operable panel", () => {
  const valid = {
    settledMs: 3900, state: "fallback", statusMatches: true,
    copy: { missing: [], duplicated: [], unexpected: "" }, visibleCopy: [true],
    posterVisible: true, posterDecoded: true, posterDecode: [{ src: "poster.svg", completedAt: 20 }],
    externalRequests: [], uncaught: [], unknownLocalRequests: [], blockedAssetRequested: true,
    anchor: { valid: true, works: true }, toggle: { initiallyOpen: true, works: true }, renderEvents: [{ state: "fallback", at: 30 }]
  };
  assert.equal(failurePasses(valid), true);
  assert.equal(failurePasses({ ...valid, settledMs: 4101 }), false);
  assert.equal(failurePasses({ ...valid, toggle: { initiallyOpen: false, works: true } }), false);
  assert.equal(failurePasses({ ...valid, posterDecoded: false }), false);
  assert.equal(failurePasses({ ...valid, posterDecode: [{ src: "poster.svg", completedAt: 40 }] }), false);
});

test("runner telemetry must be finite, successful, and within fixed caps", () => {
  const directory = mkdtempSync(join(tmpdir(), "v4-result-"));
  const path = join(directory, "result.json");
  writeFileSync(path, JSON.stringify({ type: "result", subtype: "success", is_error: false, num_turns: 8, total_cost_usd: .42, usage: { input_tokens: 10, output_tokens: 20 } }));
  const valid = parseRunnerResult(path, 500, { status: 0, signal: null });
  assert.equal(valid.runnerValid, true);
  assert.equal(valid.costUsd, .42);
  writeFileSync(path, JSON.stringify({ type: "result", subtype: "success", num_turns: 61, total_cost_usd: 2.1, usage: { input_tokens: 1 } }));
  const over = parseRunnerResult(path, 500, { status: 0, signal: null });
  assert.equal(over.runnerValid, false);
  assert.match(over.runnerIssues.join(" "), /outside the cap/);
});

test("conclusion requires candidate 2/2, baseline below 2/2, no claims, and all efficiency ratios", () => {
  const acceptance = loadConfig().acceptance;
  const records = [
    { conditionId: "B", functionalComplete: true, addedClaims: 0, costUsd: 1, wallMs: 1000, turns: 10 },
    { conditionId: "B", functionalComplete: false, addedClaims: 0, costUsd: 1, wallMs: 1000, turns: 10 },
    { conditionId: "C", functionalComplete: true, addedClaims: 0, costUsd: 1.05, wallMs: 1050, turns: 10 },
    { conditionId: "C", functionalComplete: true, addedClaims: 0, costUsd: 1.05, wallMs: 1050, turns: 10 }
  ];
  const withoutTaste = buildConclusion(records, acceptance);
  assert.equal(withoutTaste.functionalEfficiencyClaimSupported, true);
  assert.equal(withoutTaste.tasteClaimSupported, false);
  assert.equal(buildConclusion(records, acceptance, { complete: true, candidateWins: 2 }).tasteClaimSupported, true);
  assert.equal(buildConclusion(records.map((record, index) => index === 2 ? { ...record, addedClaims: 1 } : record), acceptance).functionalEfficiencyClaimSupported, false);
  assert.equal(buildConclusion(records.map((record) => record.conditionId === "C" ? { ...record, wallMs: 1200 } : record), acceptance).functionalEfficiencyClaimSupported, false);
});

test("taste review stages only opaque X/Y web artifacts", () => {
  const map = makeBlindMap("fixed-seed"), manifest = buildPublicManifest(map);
  assert.equal(map.length, 2);
  assert.deepEqual(manifest.groups.flatMap((group) => group.candidates.map((candidate) => candidate.label)), ["X", "Y", "X", "Y"]);
  assert.doesNotMatch(JSON.stringify(manifest), /condition|f1b5625|eb9e1aa|\bB-\d|\bC-\d/);
  const source = mkdtempSync(join(tmpdir(), "v4-review-source-"));
  const destination = mkdtempSync(join(tmpdir(), "v4-review-dest-"));
  cpSync(BRIEF, source, { recursive: true });
  cpSync(new URL("./fixtures/passing.html", import.meta.url), join(source, "index.html"));
  writeFileSync(join(source, "metrics.json"), "private");
  stageBlindBuild(source, destination, loadConfig().expectedAssets);
  assert.ok(existsSync(join(destination, "index.html")) && existsSync(join(destination, "assets", "poster.svg")));
  assert.equal(existsSync(join(destination, "metrics.json")), false);
});

test("pinned skill payload physically excludes benchmark and eval trees", () => {
  assert.ok(!SKILL_PAYLOAD_PATHS.some((path) => /^(?:bench|evals)(?:\/|$)/.test(path)));
  const directory = mkdtempSync(join(tmpdir(), "v4-skill-"));
  exportGitTree("eb9e1aa", directory);
  assert.ok(existsSync(join(directory, "SKILL.md")));
  assert.equal(existsSync(join(directory, "bench")), false);
  assert.equal(existsSync(join(directory, "evals")), false);
});

test("local Chrome evaluator accepts the deterministic WebGL/fallback fixture", { timeout: 120000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "v4-browser-fixture-"));
  cpSync(BRIEF, directory, { recursive: true });
  cpSync(new URL("./fixtures/passing.html", import.meta.url), join(directory, "index.html"));
  const report = await evaluateRun(directory);
  const summary = {
    checks: report.checks,
    profiles: Object.fromEntries(Object.entries(report.profiles || {}).map(([id, profile]) => [id, { passed: profile.passed, posterVisible: profile.posterVisible, motion: profile.motion }])),
    noJavaScript: report.noJavaScript?.passed,
    failures: Object.fromEntries(Object.entries(report.failures || {}).map(([id, failure]) => [id, failure.passed]))
  };
  assert.equal(report.functionalComplete, true, JSON.stringify(summary, null, 2));
});
