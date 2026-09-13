#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { EXPERIMENT, WORK, hashOrder, isolateBrowserContext, loadConfig, readJson, serveDirectory, writeJson } from "./lib.mjs";
import { assertFrozenEvidenceIntegrity } from "./harness.mjs";

const argv = process.argv.slice(2);
const command = argv[0] || "help";
const option = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function makeBlindMap(config, seed) {
  const groups = [];
  for (const brief of config.briefs) for (let attempt = 1; attempt <= config.attemptsPerCondition; attempt++) {
    const source = config.conditions.map((condition) => ({ id: condition.id }));
    const shuffled = hashOrder(source.map((item) => ({ ...item, id: `${brief.id}:${attempt}:${item.id}` })), `${seed}:blind`).map((item) => item.id.split(":").at(-1));
    const conditionToLabel = Object.fromEntries(shuffled.map((condition, index) => [condition, ["X", "Y", "Z"][index]]));
    groups.push({ id: `${brief.id}--${attempt}`, briefId: brief.id, attempt, conditionToLabel });
  }
  return groups;
}

export function buildPublicReviewManifest(config, privateMap, claimEvidence = {}) {
  return {
    protocolVersion: config.protocolVersion,
    dimensions: ["brandFit", "composition", "typography", "motionPurpose", "mobileReadability"],
    groups: privateMap.map((group) => {
      const brief = config.briefs.find((item) => item.id === group.briefId);
      return {
        id: group.id, briefId: group.briefId, category: brief.category, attempt: group.attempt, captureFractions: brief.captureFractions,
        approvedCopy: readJson(join(EXPERIMENT, brief.copy)).required,
        candidates: Object.entries(group.conditionToLabel).map(([conditionId, label]) => ({
          label, url: `live/${group.id}/${label}/index.html`,
          claimCandidates: claimEvidence[`${group.briefId}--${conditionId}--${group.attempt}`] || []
        })).sort((a, b) => a.label.localeCompare(b.label))
      };
    })
  };
}

export function stageBlindBuild(source, destination) {
  const excluded = new Set(["PROMPT.txt", "result.json", "stderr.log", "metrics.json", "evaluation.json", "brief.md", "skill"]);
  cpSync(source, destination, { recursive: true, filter: (path) => {
    if (path === source) return true;
    if (lstatSync(path).isSymbolicLink()) return false;
    return !excluded.has(path.slice(source.length + 1).split("/")[0]);
  } });
}

async function captureAll(manifest, reviewDirectory) {
  if (!existsSync(CHROME)) throw new Error(`Chrome missing at ${CHROME}; set CHROME_PATH`);
  const server = await serveDirectory(reviewDirectory);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
  try {
    for (const group of manifest.groups) for (const candidate of group.candidates) {
      for (const viewport of [{ id: "desktop", width: 1440, height: 900 }, { id: "mobile", width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.id === "mobile", hasTouch: viewport.id === "mobile" });
        const page = await context.newPage();
        await isolateBrowserContext(context, server.url);
        await page.goto(`${server.url}/${candidate.url}`, { waitUntil: "load", timeout: 30000 });
        await page.waitForTimeout(2200);
        for (let i = 0; i < group.captureFractions.length; i++) {
          const fraction = group.captureFractions[i];
          await page.evaluate((f) => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * f)), fraction);
          await page.waitForTimeout(1100);
          const output = join(WORK, "review", "captures", group.id, candidate.label, `${viewport.id}-${["opening", "signature", "transition", "closing"][i]}.png`);
          mkdirSync(resolve(output, ".."), { recursive: true });
          await page.screenshot({ path: output });
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

async function prepare() {
  assertFrozenEvidenceIntegrity();
  const config = loadConfig();
  const lockPath = join(WORK, "state", "lock.json");
  const planPath = join(WORK, "state", "run-plan.json");
  if (!existsSync(lockPath) || !existsSync(planPath)) throw new Error("freeze the experiment first");
  const lock = readJson(lockPath);
  const plan = readJson(planPath);
  const invalid = new Set(readJson(join(WORK, "state", "invalidations.json")).groups.map((item) => item.briefId));
  const usable = plan.filter((run) => !invalid.has(run.briefId));
  if (usable.some((run) => run.status !== "complete")) throw new Error("all non-invalidated runs must be complete before blind review");
  const privateMap = makeBlindMap(config, lock.seed).filter((group) => !invalid.has(group.briefId));
  const claimEvidence = {};
  for (const run of usable) {
    const evaluation = readJson(join(WORK, "runs", run.id, "evaluation.json"));
    const candidates = Object.values(evaluation.profiles || {}).flatMap((profile) => profile.copy?.addedClaimCandidates || []);
    claimEvidence[run.id] = [...new Map(candidates.map((item) => [`${item.text}\n${item.residual}`, item])).values()];
  }
  const manifest = buildPublicReviewManifest(config, privateMap, claimEvidence);
  const reviewDirectory = join(WORK, "review");
  mkdirSync(reviewDirectory, { recursive: true });
  for (const group of privateMap) for (const [conditionId, label] of Object.entries(group.conditionToLabel)) {
    stageBlindBuild(join(WORK, "runs", `${group.briefId}--${conditionId}--${group.attempt}`), join(reviewDirectory, "live", group.id, label));
  }
  cpSync(join(EXPERIMENT, "review-app.html"), join(reviewDirectory, "index.html"));
  writeJson(join(reviewDirectory, "manifest.json"), manifest);
  writeJson(join(WORK, "private", "blind-map.json"), { protocolVersion: config.protocolVersion, groups: privateMap });
  await captureAll(manifest, reviewDirectory);
  console.log(`✓ blind review prepared: ${manifest.groups.length} matched groups, ${manifest.groups.length * 3 * 8} captures`);
  console.log(`  serve only .work/review and open /index.html; the private condition map stays outside the served root`);
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function reveal() {
  assertFrozenEvidenceIntegrity();
  const ratingsPath = option("ratings");
  if (!ratingsPath || !existsSync(ratingsPath)) throw new Error("reveal requires --ratings <exported-ratings.json>");
  const ratings = readJson(ratingsPath);
  const map = readJson(join(WORK, "private", "blind-map.json"));
  const config = loadConfig();
  if (!ratings.authorBlinded || ratings.groups?.length !== map.groups.length) throw new Error("ratings must be complete and confirm author blinding before reveal");
  const comparisons = [];
  for (const group of map.groups) {
    const rating = ratings.groups.find((item) => item.id === group.id);
    if (!rating || !rating.winners?.length || !rating.claimsReviewed) throw new Error(`incomplete ratings for ${group.id}`);
    const labelToCondition = Object.fromEntries(Object.entries(group.conditionToLabel).map(([condition, label]) => [label, condition]));
    const winners = rating.winners.map((label) => labelToCondition[label]);
    comparisons.push({ ...group, winners, ratings: Object.fromEntries(Object.entries(rating.ratings).map(([label, value]) => [labelToCondition[label], value])) });
  }
  const runRows = [];
  const validBriefs = new Set(map.groups.map((group) => group.briefId));
  for (const run of readJson(join(WORK, "state", "run-plan.json"))) {
    if (run.status !== "complete" || !validBriefs.has(run.briefId)) continue;
    const directory = join(WORK, "runs", run.id);
    runRows.push({ ...run, metrics: readJson(join(directory, "metrics.json")), evaluation: readJson(join(directory, "evaluation.json")) });
  }
  const rows = (condition, briefId = null) => runRows.filter((row) => row.conditionId === condition && (!briefId || row.briefId === briefId));
  const ratio = (field, briefId = null) => median(rows("C", briefId).map((row) => row.metrics[field])) / median(rows("A", briefId).map((row) => row.metrics[field]));
  const candidateVsExpertWins = comparisons.filter((group) => group.winners.includes("C") && !group.winners.includes("A"));
  const categoryWins = Object.fromEntries(config.briefs.map((brief) => [brief.id, candidateVsExpertWins.some((group) => group.briefId === brief.id)]));
  const currentWins = comparisons.filter((group) => group.winners.includes("B") && !group.winners.includes("C")).length;
  const candidateCurrentWins = comparisons.filter((group) => group.winners.includes("C") && !group.winners.includes("B")).length;
  const ratios = {
    medianCostCandidateToExpert: ratio("costUsd"),
    medianTimeCandidateToExpert: ratio("wallMs"),
    byCategory: Object.fromEntries(config.briefs.map((brief) => [brief.id, { cost: ratio("costUsd", brief.id), time: ratio("wallMs", brief.id) }]))
  };
  const acceptance = {
    candidateFunctionalCompletion: rows("C").length === comparisons.length && rows("C").every((row) => row.evaluation.functionalComplete),
    noInventedClaimsConfirmed: comparisons.every((group) => {
      const label = group.conditionToLabel.C; const source = ratings.groups.find((item) => item.id === group.id); return source.claimsReviewed?.[label] === true;
    }),
    preferenceWins: candidateVsExpertWins.length >= config.acceptance.candidatePreferenceWinsOfSix,
    preferenceWinEachCategory: Object.values(categoryWins).every(Boolean),
    medianCost: ratios.medianCostCandidateToExpert <= config.acceptance.medianCostRatioCandidateToExpertMax,
    medianTime: ratios.medianTimeCandidateToExpert <= config.acceptance.medianTimeRatioCandidateToExpertMax,
    categoryRatios: Object.values(ratios.byCategory).every((item) => item.cost <= config.acceptance.categoryMedianRatioMax && item.time <= config.acceptance.categoryMedianRatioMax),
    noFunctionalRegressionVsCurrent: rows("C").filter((row) => row.evaluation.functionalComplete).length >= rows("B").filter((row) => row.evaluation.functionalComplete).length,
    noPreferenceRegressionVsCurrent: candidateCurrentWins >= currentWins
  };
  const output = { protocolVersion: config.protocolVersion, revealedAt: new Date().toISOString(), authorBlindedSingleModelPilot: true, comparisons, ratios, categoryWins, acceptance, passed: Object.values(acceptance).every(Boolean), runRows };
  writeJson(join(WORK, "results.json"), output);
  console.log(JSON.stringify(output, null, 2));
  if (!output.passed) process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  try {
    if (command === "prepare") await prepare();
    else if (command === "reveal") reveal();
    else if (command === "help" || command === "--help") console.log("usage: node review.mjs prepare | reveal --ratings <file>");
    else throw new Error(`unknown command ${command}`);
  } catch (error) { console.error(`✗ ${error.message}`); process.exitCode = 1; }
}
