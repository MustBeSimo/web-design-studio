import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { analyzeCopy, countVisualStateChanges, isIgnorableConsoleError, isUsableImageEvidence, passesModelProof, passesSignatureProof } from "./evaluate.mjs";
import { SKILL_PAYLOAD_PATHS, parseResult, prepareSnapshot, validateProtocol } from "./harness.mjs";
import { isAllowedBrowserRequest, loadConfig, serveDirectory } from "./lib.mjs";
import { runPreflight } from "./preflight.mjs";
import { buildPublicReviewManifest, makeBlindMap, stageBlindBuild } from "./review.mjs";

test("protocol describes the frozen 18-run comparison", () => {
  const result = validateProtocol();
  assert.deepEqual(result.errors, []);
  assert.equal(result.config.briefs.length * result.config.conditions.length * result.config.attemptsPerCondition, 18);
});

test("rendered copy normalization catches text split by elements and appended claims", () => {
  const copy = { required: ["Axis 24", "Made in a run of twenty-four."], allowedUi: ["Menu"] };
  const exact = analyzeCopy({ text: "Axis\n 24 Made in a run of twenty-four.", elements: ["Axis 24", "Made in a run of twenty-four.", "Menu"] }, copy);
  assert.equal(exact.missingCount, 0);
  assert.deepEqual(exact.addedClaimCandidates, []);
  const appended = analyzeCopy({ text: "Axis 24 World's best object", elements: ["Axis 24 — World's best object"] }, { required: ["Axis 24"], allowedUi: [] });
  assert.equal(appended.missingCount, 0);
  assert.deepEqual(appended.addedClaimCandidates, [{ text: "Axis 24 — World's best object", residual: "world s best object" }]);
});

test("normal document scrolling does not count as visual motion", () => {
  const opening = [{ key: "P:0:copy", x: 0, documentY: 500, w: 300, h: 40, opacity: "1", transform: "none", clipPath: "none", backgroundColor: "rgba(0, 0, 0, 0)" }];
  assert.equal(countVisualStateChanges(opening, [{ ...opening[0] }]), 0);
  assert.equal(countVisualStateChanges(opening, [{ ...opening[0], transform: "matrix(1, 0, 0, 1, 30, 0)" }]), 1);
});

test("browser request policy permits only the served origin and inert URL schemes", () => {
  const local = "http://127.0.0.1:43210";
  assert.equal(isAllowedBrowserRequest(`${local}/index.html`, local), true);
  assert.equal(isAllowedBrowserRequest("data:image/svg+xml,%3Csvg/%3E", local), true);
  assert.equal(isAllowedBrowserRequest("blob:http://127.0.0.1:43210/id", local), true);
  assert.equal(isAllowedBrowserRequest("about:blank", local), true);
  assert.equal(isAllowedBrowserRequest("https://fonts.example/font.woff2", local), false);
  assert.equal(isAllowedBrowserRequest("http://127.0.0.1:43211/tracker", local), false);
});

test("poster evidence rejects a broken image that only has CSS geometry", () => {
  assert.equal(isUsableImageEvidence({ complete: true, naturalWidth: 800, naturalHeight: 600 }), true);
  assert.equal(isUsableImageEvidence({ complete: true, naturalWidth: 0, naturalHeight: 0, width: 800, height: 600 }), false);
  assert.equal(isUsableImageEvidence({ complete: false, naturalWidth: 800, naturalHeight: 600 }), false);
});

test("only the browser's missing default favicon noise is ignored", () => {
  assert.equal(isIgnorableConsoleError("Failed to load resource: 404", "http://127.0.0.1:4000/favicon.ico"), true);
  assert.equal(isIgnorableConsoleError("Failed to load resource: 404", "http://127.0.0.1:4000/app.js"), false);
  assert.equal(isIgnorableConsoleError("Uncaught TypeError", "http://127.0.0.1:4000/favicon.ico"), false);
});

test("editorial and product gates require real signature states and complete static assets", () => {
  const assets = ["one.svg", "two.svg", "three.svg"];
  const fallback = { renderedAssets: assets };
  const base = { "desktop-reduced": fallback, "mobile-reduced": fallback };
  const editorial = { ...base, desktop: { signatureSamples: [
    { routeChapter: "1", targetPinned: true, targetVisual: { transform: "matrix(1,0,0,1,0,0)" } },
    { routeChapter: "2", targetPinned: true, targetVisual: { transform: "matrix(1,0,0,1,20,0)" } },
    { routeChapter: "3", targetPinned: true, targetVisual: { transform: "matrix(1,0,0,1,40,0)" } },
  ] } };
  assert.equal(passesSignatureProof("editorial", editorial, fallback, assets), true);
  assert.equal(passesSignatureProof("editorial", { ...editorial, desktop: { signatureSamples: editorial.desktop.signatureSamples.map((sample) => ({ ...sample, targetVisual: {} })) } }, fallback, assets), false);
  assert.equal(passesSignatureProof("editorial", editorial, { renderedAssets: assets.slice(1) }, assets), false);
  const product = { ...base, desktop: { signatureSamples: [
    { hingeProgress: "0", targetPinned: true, targetVisual: { transform: "rotate(0deg)" } },
    { hingeProgress: ".5", targetPinned: true, targetVisual: { transform: "rotate(59deg)" } },
    { hingeProgress: "1", targetPinned: true, targetVisual: { transform: "rotate(118deg)" } },
  ] } };
  assert.equal(passesSignatureProof("product", product, fallback, assets), true);
  assert.equal(passesSignatureProof("product", { ...product, desktop: { signatureSamples: product.desktop.signatureSamples.map((sample) => ({ ...sample, hingeProgress: "0" })) } }, fallback, assets), false);
  assert.equal(passesSignatureProof("product", { ...product, desktop: { signatureSamples: product.desktop.signatureSamples.map((sample) => ({ ...sample, targetPinned: false })) } }, fallback, assets), false);
});

test("blind review manifests expose only opaque aliases and staged web files", async () => {
  const config = loadConfig(), map = makeBlindMap(config, "fixed-seed");
  const first = map[0], firstCondition = Object.keys(first.conditionToLabel)[0], firstLabel = first.conditionToLabel[firstCondition];
  const evidence = { [`${first.briefId}--${firstCondition}--${first.attempt}`]: [{ text: "invented", residual: "invented" }] };
  const manifest = buildPublicReviewManifest(config, map, evidence);
  assert.equal(map.length, 6);
  for (const group of manifest.groups) assert.deepEqual(group.candidates.map((item) => item.label), ["X", "Y", "Z"]);
  assert.ok(manifest.groups[0].approvedCopy.length > 0);
  assert.deepEqual(manifest.groups[0].candidates.find((candidate) => candidate.label === firstLabel).claimCandidates, [{ text: "invented", residual: "invented" }]);
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /conditionToLabel|conditionId|runId|--[ABC]--/);
  const scratch = mkdtempSync(join(tmpdir(), "skill-ab-stage-")), source = join(scratch, "source"), destination = join(scratch, "blind");
  mkdirSync(join(source, "skill"), { recursive: true });
  const secret = join(scratch, "secret.txt");
  writeFileSync(secret, "private");
  writeFileSync(join(source, "index.html"), "ok"); writeFileSync(join(source, "main.js"), "ok"); writeFileSync(join(source, "metrics.json"), "secret"); writeFileSync(join(source, "skill", "SKILL.md"), "secret");
  symlinkSync(secret, join(source, "alias.txt"));
  stageBlindBuild(source, destination);
  assert.ok(existsSync(join(destination, "index.html")) && existsSync(join(destination, "main.js")));
  assert.ok(!existsSync(join(destination, "metrics.json")) && !existsSync(join(destination, "skill")) && !existsSync(join(destination, "alias.txt")));
  symlinkSync(secret, join(destination, "forced-alias.txt"));
  const server = await serveDirectory(destination);
  try { assert.equal((await fetch(`${server.url}/forced-alias.txt`)).status, 403); }
  finally { await server.close(); }
});

test("runner metrics require a clean successful result and explicit finite telemetry", () => {
  const scratch = mkdtempSync(join(tmpdir(), "skill-ab-result-"));
  const file = join(scratch, "result.json");
  writeFileSync(file, JSON.stringify({ type: "result", subtype: "success", is_error: false, num_turns: 2, total_cost_usd: 0, usage: { input_tokens: 1, output_tokens: 2 } }));
  const valid = parseResult(file, 100, { status: 0, signal: null });
  assert.equal(valid.runnerValid, true);
  assert.equal(valid.costUsd, 0);
  writeFileSync(file, "{}");
  const missing = parseResult(file, 100, { status: 0, signal: null });
  assert.equal(missing.runnerValid, false);
  assert.equal(missing.costUsd, null);
  const timedOut = parseResult(file, 100, { status: null, signal: "SIGTERM", error: { code: "ETIMEDOUT" } });
  assert.equal(timedOut.runnerValid, false);
  assert.equal(timedOut.timedOut, true);
});

test("curated skill snapshot excludes benchmark and evaluation inputs", () => {
  assert.ok(!SKILL_PAYLOAD_PATHS.includes("bench") && !SKILL_PAYLOAD_PATHS.includes("evals"));
  const scratch = mkdtempSync(join(tmpdir(), "skill-ab-snapshot-"));
  prepareSnapshot("dd2ecfb", scratch);
  assert.ok(existsSync(join(scratch, "SKILL.md")));
  assert.ok(!existsSync(join(scratch, "bench")) && !existsSync(join(scratch, "evals")));
});

test("3D gate requires ready instrumentation, two camera states, visible model pixels, and honest fallbacks", () => {
  const profile = { visibleCanvas: true, webglContexts: ["webgl"], modelState: "ready", modelProof: { statesDiffer: true, nonDominantRatio: .2, changedRatio: .1 } };
  const failures = { missingModel: { uncaught: [], posterVisible: true, modelState: "fallback", missingCopy: [] }, missingViewer: { uncaught: [], posterVisible: true, modelState: "fallback", missingCopy: [] } };
  assert.equal(passesModelProof(profile, failures, new Set(["axis-24.glb"]), { posterVisible: true }), true);
  assert.equal(passesModelProof({ ...profile, modelState: "loading" }, failures, new Set(["axis-24.glb"]), { posterVisible: true }), false);
  assert.equal(passesModelProof({ ...profile, modelProof: { ...profile.modelProof, statesDiffer: false } }, failures, new Set(["axis-24.glb"]), { posterVisible: true }), false);
});

test("all supplied kits preflight and the GLB produces real non-background WebGL pixels", { timeout: 30000 }, async () => {
  const output = join(mkdtempSync(join(tmpdir(), "skill-ab-preflight-test-")), "report.json");
  const report = await runPreflight({ output });
  assert.equal(report.status, "passed");
  assert.equal(report.briefs["three-d"].liveRender.modelState, "ready");
  assert.ok(report.briefs["three-d"].liveRender.variedPixels > 1000);
  assert.match(report.briefs["three-d"].liveRender.cameraState, /^\[/);
});
