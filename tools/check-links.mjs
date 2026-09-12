#!/usr/bin/env node
/**
 * check-links.mjs — Phase 4 verification gate (doc ↔ reality).
 *
 * 1. DEAD LINKS: every repo-relative path referenced in SKILL.md (and design.md)
 *    that points into a real repo root must exist on disk. Paths that describe the
 *    *generated* Mode B project (lib/…, app/…, components/…) are intentionally skipped.
 * 2. STALE STRINGS: a denylist of known-wrong tokens (old version pins, the wrong
 *    manifest shape, "7 visual systems", v2.1.0, dead README link) must be absent.
 *
 * Exit 0 = docs match reality. Zero dependencies. Reused by CI (Phase 12).
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = [
  "SKILL.md", "design.md", "references/recipe-catalog.md",
  "references/recipes/editorial-story.md", "references/recipes/product-reveal.md", "references/recipes/real-time-3d.md",
  "skills/cinematic-scroll/SKILL.md", "skills/cinematic-scroll/references/recipe-catalog.md",
  "skills/cinematic-scroll/references/editorial-story.md", "skills/cinematic-scroll/references/product-reveal.md",
  "skills/cinematic-scroll/references/real-time-3d.md",
];
const REPO_DIRS = ["references/", "templates/", "examples/", "tokens/", "themes/", "components/", "evals/", "tools/", "bin/", "docs/", "launch/", "video/", "assets/"];
const ROOT_FILE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*\.(md|json|mjs|js|ts)$/;
// Filenames the 5-phase pipeline / audit mode EMIT at build time — documented outputs, not repo files.
const ARTIFACTS = new Set([
  "cinematic-audit.md", "motion-storyboard.md", "technical-spec.md", "polish-report.md",
  "remediation-plan.md", "scene.json",
]);

const DENY = [
  ["@react-three/fiber ^8.15", "old fiber pin"],
  ["| ^3.5 ", "old model-viewer pin"],
  ["clips, ar}", "wrong manifest shape"],
  ["choreo-3d | latest", "unpinned choreo-3d"],
  ["7 visual systems", "stale system count (now 11)"],
  ["templates/nextjs/README", "dead link (use FLAGSHIP.md)"],
  ["(v2.1.0)", "stale version label"],
];

const errors = [];
let checked = 0;

for (const file of SCAN) {
  const p = join(ROOT, file);
  if (!existsSync(p)) { errors.push(`scan target missing: ${file}`); continue; }
  const text = readFileSync(p, "utf8");

  // stale strings
  for (const [needle, why] of DENY) {
    if (text.includes(needle)) errors.push(`${file}: stale string "${needle}" (${why})`);
  }

  // candidate paths: backtick spans + markdown link targets
  const cands = new Map();
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const repoPath = REPO_DIRS.some(dir => m[1].startsWith(dir));
    cands.set(`root:${m[1]}`, { raw: m[1], base: repoPath ? ROOT : dirname(p), link: false });
  }
  for (const m of text.matchAll(/\]\(([^)]+)\)/g)) cands.set(`link:${m[1]}`, { raw: m[1], base: dirname(p), link: true });

  for (const { raw, base, link } of cands.values()) {
    let tok = raw.trim().replace(/[#?].*$/, "").replace(/[.,;:]+$/, ""); // drop #anchor / ?query before checking the file
    if (/[\s{}*<>()|=$#]/.test(tok)) continue;          // placeholders / code / commands
    if (/^(https?:|#)/.test(tok)) continue;
    if (!link && /^(npm |node |git |cd |ls |\.\/)/.test(tok)) continue;
    if (ARTIFACTS.has(tok)) continue;                   // pipeline outputs, not repo files
    const inRepoDir = REPO_DIRS.some((d) => tok.startsWith(d));
    const isRootFile = ROOT_FILE.test(tok) && (base === ROOT || link);
    const isRelativeLink = link && /(?:\/|\.(?:md|json|mjs|js|ts))$/.test(tok);
    if (!inRepoDir && !isRootFile && !isRelativeLink) continue; // skip generated-project paths
    checked++;
    const target = join(base, tok.replace(/\/$/, ""));
    if (!existsSync(target)) errors.push(`${file}: dead path \`${tok}\``);
  }
}

if (errors.length) {
  console.error(`✗ check-links: ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ check-links: ${checked} repo paths exist, 0 stale strings (scanned ${SCAN.join(", ")}).`);
process.exit(0);
