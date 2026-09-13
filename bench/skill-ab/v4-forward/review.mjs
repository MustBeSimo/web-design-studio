#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPERIMENT, WORK, hashTree, loadConfig, readJson, serveDirectory, sha256, sha256File, writeJson } from "./lib.mjs";

const argv = process.argv.slice(2);
const command = argv[0] || "help";
const option = (name) => { const index = argv.indexOf(`--${name}`); return index >= 0 ? argv[index + 1] : null; };
const statePath = (name) => join(WORK, "state", name);
const fail = (message, code = 1) => { console.error(`✗ ${message}`); process.exit(code); };

export function makeBlindMap(seed) {
  return [1, 2].map((attempt) => {
    const candidateFirst = Number.parseInt(sha256(`${seed}:taste:${attempt}`).slice(0, 2), 16) % 2 === 0;
    return { attempt, conditionToLabel: candidateFirst ? { C: "X", B: "Y" } : { B: "X", C: "Y" } };
  });
}

export function buildPublicManifest(map) {
  return {
    title: "Parallax Index — blinded taste review",
    instructions: "Compare composition, hierarchy, typography, spatial clarity, and finish. Ignore implementation metrics. Choose a tie only when neither is genuinely preferable.",
    groups: map.map((group) => ({ attempt: group.attempt, candidates: ["X", "Y"].map((label) => ({ label, path: `attempt-${group.attempt}/${label}/index.html` })) }))
  };
}

export function stageBlindBuild(source, destination, expectedAssets) {
  mkdirSync(join(destination, "assets"), { recursive: true });
  for (const relative of ["index.html", ...expectedAssets]) {
    const from = join(source, relative), to = join(destination, relative);
    if (!existsSync(from) || lstatSync(from).isSymbolicLink()) throw new Error(`unsafe or missing staged file ${relative}`);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
  }
}

function prepare() {
  if (!existsSync(statePath("lock.json"))) fail("prepare and complete the four runs first");
  const config = loadConfig(), lock = readJson(statePath("lock.json")), plan = readJson(statePath("plan.json"));
  if (plan.some((run) => run.status !== "complete")) fail("blinded review requires four completed, non-infrastructure runs");
  const archived = readJson(statePath("output-hashes.json"));
  for (const run of plan) {
    const directory = join(WORK, "runs", run.id);
    if (!archived[run.id] || JSON.stringify(hashTree(directory)) !== JSON.stringify(archived[run.id])) fail(`${run.id} archive changed before review`);
  }
  const map = makeBlindMap(lock.seed);
  const destination = join(WORK, "review");
  if (existsSync(destination)) fail("review is already staged");
  for (const group of map) {
    for (const [conditionId, label] of Object.entries(group.conditionToLabel)) {
      stageBlindBuild(join(WORK, "runs", `${conditionId}-${group.attempt}`), join(destination, `attempt-${group.attempt}`, label), config.expectedAssets);
    }
  }
  cpSync(join(EXPERIMENT, "review-app.html"), join(destination, "index.html"));
  writeJson(join(destination, "manifest.json"), buildPublicManifest(map));
  writeJson(statePath("blind-map.json"), map);
  writeJson(statePath("review-hashes.json"), hashTree(destination));
  console.log(`✓ staged opaque X/Y review at ${destination}`);
}

async function serve() {
  const directory = join(WORK, "review");
  if (!existsSync(join(directory, "manifest.json"))) fail("run review.mjs prepare first");
  const server = await serveDirectory(directory);
  console.log(`Blinded review: ${server.url}/index.html`);
  await new Promise((resolveStop) => {
    const stop = async () => { await server.close(); resolveStop(); };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  });
}

function reveal() {
  const ratingsPath = option("ratings");
  if (!ratingsPath || !existsSync(ratingsPath)) fail("usage: review.mjs reveal --ratings <ratings.json>", 2);
  if (!existsSync(statePath("blind-map.json"))) fail("prepare the blinded review first");
  if (JSON.stringify(hashTree(join(WORK, "review"))) !== JSON.stringify(readJson(statePath("review-hashes.json")))) fail("staged blinded review changed before reveal");
  const map = readJson(statePath("blind-map.json")), ratings = readJson(resolve(ratingsPath));
  if (!Array.isArray(ratings.ratings) || ratings.ratings.length !== 2) fail("ratings must contain exactly two attempt choices");
  let candidateWins = 0, baselineWins = 0, ties = 0;
  for (const group of map) {
    const rating = ratings.ratings.find((item) => item.attempt === group.attempt);
    if (!rating || !["X", "Y", "tie"].includes(rating.choice)) fail(`missing or invalid rating for attempt ${group.attempt}`);
    if (rating.choice === "tie") { ties += 1; continue; }
    const condition = Object.entries(group.conditionToLabel).find(([, label]) => label === rating.choice)?.[0];
    if (condition === "C") candidateWins += 1;
    else baselineWins += 1;
  }
  const result = { complete: true, candidateWins, baselineWins, ties, ratingsSha256: sha256File(resolve(ratingsPath)), reviewedAt: new Date().toISOString() };
  writeJson(statePath("taste-result.json"), result);
  console.log(JSON.stringify({ ...result, mapping: map }, null, 2));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  if (command === "prepare") prepare();
  else if (command === "serve") await serve();
  else if (command === "reveal") reveal();
  else console.log("v4 blinded review\n\n  node review.mjs prepare\n  node review.mjs serve\n  node review.mjs reveal --ratings <ratings.json>");
}
