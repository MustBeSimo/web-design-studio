# Web Design Studio 3.0 Distribution Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v3.0.0: a three-skill collection whose default install delivers a 30 KB skill in seconds, a light working tree, a README that sells in one screen, and a launch kit.

**Architecture:** The root `SKILL.md` is deleted so the skills CLI discovers `skills/*/` (lean, text-only folders). Promo media leaves `main` for a GitHub Release and a CI gate keeps it out. The npm package becomes a dependency-free installer that copies `skills/*`. Two new skills (`scroll-audit`, `launch-page-strategy`) join `cinematic-scroll`.

**Tech Stack:** Node ≥ 18 ESM scripts, `node:test`, `gh` CLI (authenticated as MustBeSimo, scopes `repo, workflow`), GitHub Pages (legacy build from `main`), skills CLI 1.7.4 (`npx skills`).

**Spec:** `docs/superpowers/specs/2026-10-27-v3-distribution-release-design.md`

## Global Constraints

- Version everywhere is `3.0.0`: `package.json`, `manifest.json`, `.claude-plugin/plugin.json`, every `skills/*/SKILL.md` `metadata.version`, `index.html` release label.
- Identifier `cinematic-scroll` is unchanged in paths, install commands, URLs. Product copy says "Web Design Studio".
- No root `SKILL.md` may exist after Task 4.
- Skill folders: text-only extensions `.md .json .yaml .yml .toml .txt` (plus `.clawhubignore`), every relative link resolves inside the folder, folder size < 300,000 bytes, no `license:` frontmatter key.
- Tracked file size limit 5,000,000 bytes; allowlist exactly `examples/kern-calibration/assets/kern-color.mp4`.
- Media release tag `media-2026-10`, target commit `c8b99b1`, pre-release, not latest; asset name = repo path with `/` → `__`.
- Do not modify `assets/promo-linkedin/README.md` (owner has uncommitted edits in the main checkout). Do not touch the owner's main checkout at all; work only in this worktree.
- npm tarball unpacked size < 500,000 bytes; files limited to `bin/`, `skills/`, `LICENSE`, `README.md`, `package.json`.
- No house-style numeric rules (fonts, hex, durations) in any skill. No competitor text. Claims only as strong as `docs/skill-advantage/README.md` supports.
- `npm test` must pass at the end of every task that touches code or tooling.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. The installer is run via `npx` from an unrelated cwd: skill discovery must resolve from the package root, not `process.cwd()`. Pinned in Task 5 test `installs from a different working directory`.
2. A stray binary (`.DS_Store`, `.png`) inside a skill folder must fail validation, while `.clawhubignore` passes. Pinned in Task 3 test `rejects non-text files but allows .clawhubignore`.
3. After media removal, a page still referencing a removed path would 404 on the live site. Pinned in Task 2 step `--verify` (every `assets/` path referenced by site files exists) and Task 12 live curl checks.
4. Two skills with the same `name` (the `.codex`/`.cursor` pointer stubs are also named `cinematic-scroll`) could make the CLI list duplicates or pick a stub. Pinned in Task 11 smoke: the CLI must print `Found 3 skills` and the installed `cinematic-scroll/SKILL.md` must contain `## Choose one route`.
5. The release asset URL in README must exist before the README is pushed. Pinned in Task 2 step `curl -sIL … | head -1` returning `200` after redirects.

---

### Task 1: Media size gate

**Files:**
- Create: `tools/check-media-size.mjs`
- Create: `tools/check-media-size.test.mjs`

**Interfaces:**
- Produces: `export function oversized(entries, { limit = 5_000_000, allow = [] })` where `entries` is `Array<{ path: string, size: number }>`; returns `Array<{ path, size }>` sorted by size descending. CLI: `node tools/check-media-size.mjs [--limit <bytes>]` lists `git ls-files -z`, stats each, prints `✓ check-media-size: N tracked files under <limit> bytes (allowlist: …)` and exits 0, or prints each oversized `path (size MB)` and exits 1. `ALLOW` constant = `['examples/kern-calibration/assets/kern-color.mp4']`.

- [ ] **Step 1: Write the failing test**

```js
// tools/check-media-size.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { oversized } from './check-media-size.mjs';

test('returns files over the limit, largest first, excluding the allowlist', () => {
  const entries = [
    { path: 'a.mp4', size: 6_000_000 },
    { path: 'b.jpg', size: 400_000 },
    { path: 'examples/kern-calibration/assets/kern-color.mp4', size: 11_000_000 },
    { path: 'c.mov', size: 9_000_000 },
  ];
  const result = oversized(entries, { limit: 5_000_000, allow: ['examples/kern-calibration/assets/kern-color.mp4'] });
  assert.deepEqual(result.map((e) => e.path), ['c.mov', 'a.mp4']);
});

test('a file exactly at the limit passes', () => {
  assert.deepEqual(oversized([{ path: 'x', size: 5_000_000 }], { limit: 5_000_000 }), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/check-media-size.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `oversized` and the CLI in `tools/check-media-size.mjs`**

Guard the CLI with `if (process.argv[1] === fileURLToPath(import.meta.url))` so importing does not run it. Use `spawnSync('git', ['ls-files', '-z'])` and `statSync`; skip paths that no longer exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/check-media-size.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Run the CLI against the repo and record the current state**

Run: `node tools/check-media-size.mjs; echo exit=$?`
Expected now: exit=1 listing the large promo files (this is the baseline Task 2 fixes). Do not wire into `npm test` yet.

- [ ] **Step 6: Commit**

```bash
git add tools/check-media-size.mjs tools/check-media-size.test.mjs
git commit -m "test(tools): add tracked media size gate (5 MB, Kern scrub video allowlisted)"
```

---

### Task 2: Move promo media to a GitHub Release and lighten the tree

**Files:**
- Create: `tools/media-archive.mjs`
- Create: `tools/media-archive.test.mjs`
- Create: `docs/launch/2026-10-v3/media-archive-manifest.txt` (generated)
- Modify: `README.md` (film link only, two occurrences near "See the proof")
- Modify: `IMAGE-SPEC.md` (banner references)
- Delete: `index.legacy.html`, `index.v2.html`, and every path in the move set
- Modify: `package.json` scripts (`media:check`, add to `test`)

**Interfaces:**
- Produces: `export function classifyAssets({ assets, referrerTexts })` where `assets` is `Array<{ path, size }>` for tracked files under `assets/`, `referrerTexts` is `Array<{ path, text }>`; returns `{ keep: string[], move: string[] }`. A path is kept if its exact string (with or without a `?query`) appears in any referrer text or if it ends with `.md`. `export function assetName(path)` returns `path.replace(/^assets\//, '').replaceAll('/', '__')`. `export const RELEASE = { tag: 'media-2026-10', target: 'c8b99b1' }`. `export function downloadUrl(path)` returns `https://github.com/MustBeSimo/web-design-studio/releases/download/media-2026-10/<assetName>`.
- CLI modes: `--plan` (prints keep/move tables with MB totals, writes manifest `original-path<TAB>url` lines to `--manifest <file>`), `--apply` (runs `gh release create` if the tag does not exist, `gh release upload --clobber` in batches of 20 files, then `git rm -q` each moved path), `--verify` (every `assets/…` path referenced by site referrers exists on disk; exit 1 otherwise).
- Referrer set (exact): tracked files matching `index.html`, `examples/**`, `stack/**`, `bench/index.html`, `docs/**`, `sitemap.xml`, `manifest.json`, `.github/**`, `assets/**/*.{js,mjs,css}`, `README.md`; excluding `assets/**/*.md`, `tools/**`, `bench/raw/**`, `bench/results/**`, `IMAGE-SPEC.md`, `index.legacy.html`, `index.v2.html`.

- [ ] **Step 1: Write the failing tests**

```js
// tools/media-archive.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAssets, assetName, downloadUrl } from './media-archive.mjs';

test('keeps referenced files and markdown, moves the rest', () => {
  const assets = [
    { path: 'assets/previews/flagship.mp4', size: 1 },
    { path: 'assets/reel3.mp4', size: 1 },
    { path: 'assets/promo-linkedin/README.md', size: 1 },
    { path: 'assets/video/scroll-demo.mp4', size: 1 },
  ];
  const referrerTexts = [
    { path: 'index.html', text: '<video data-gallery-preview="assets/previews/flagship.mp4?v=1">' },
    { path: 'index.html', text: 'src="assets/video/scroll-demo.mp4?v=worlds-2026-09"' },
  ];
  const { keep, move } = classifyAssets({ assets, referrerTexts });
  assert.deepEqual(keep.sort(), ['assets/previews/flagship.mp4', 'assets/promo-linkedin/README.md', 'assets/video/scroll-demo.mp4']);
  assert.deepEqual(move, ['assets/reel3.mp4']);
});

test('asset names flatten the path and URLs point at the media release', () => {
  assert.equal(assetName('assets/promo-linkedin/captures/flagship.mp4'), 'promo-linkedin__captures__flagship.mp4');
  assert.equal(downloadUrl('assets/reel3.mp4'), 'https://github.com/MustBeSimo/web-design-studio/releases/download/media-2026-10/reel3.mp4');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tools/media-archive.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `tools/media-archive.mjs`**

Pure functions as specified; CLI reads `git ls-files -z`, builds referrer texts from the exact referrer set, and implements `--plan`, `--apply`, `--verify`. `--apply` must refuse to run when `git status --porcelain` is non-empty except for the manifest, README.md and IMAGE-SPEC.md.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tools/media-archive.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Repoint README and IMAGE-SPEC before planning**

In `README.md` replace both `assets/promo-linkedin/web-design-studio-linkedin.mp4` links with `https://github.com/MustBeSimo/web-design-studio/releases/download/media-2026-10/promo-linkedin__web-design-studio-linkedin.mp4`. Keep the poster JPG path. In `IMAGE-SPEC.md` replace `assets/banner-dark_v2.png` and `assets/banner-light_v2.png` with their `downloadUrl` values.

- [ ] **Step 6: Plan and inspect**

Run: `node tools/media-archive.mjs --plan --manifest docs/launch/2026-10-v3/media-archive-manifest.txt`
Expected: `move` total ≈ 300 MB and includes `assets/reel3.mp4`, `assets/demo-loop.mp4`, `assets/promo-linkedin/web-design-studio-linkedin.mp4`; `keep` includes every `assets/previews/*.mp4`, every `assets/video/*`, `assets/brand/social-preview.jpg`, `assets/promo-linkedin/web-design-studio-linkedin-poster.jpg`, every `assets/**/*.md`. If any `assets/previews` or `assets/video` file lands in `move`, fix the referrer set before continuing.

- [ ] **Step 7: Create the release and move the files**

Run: `node tools/media-archive.mjs --apply`
Expected: `gh release view media-2026-10` shows the asset count equal to the move set; `git status` shows the deletions staged.

- [ ] **Step 8: Verify a README asset URL resolves**

Run: `curl -sIL https://github.com/MustBeSimo/web-design-studio/releases/download/media-2026-10/promo-linkedin__web-design-studio-linkedin.mp4 | grep -E '^HTTP' | tail -1`
Expected: `HTTP/2 200`.

- [ ] **Step 9: Delete legacy landing pages and verify site references**

Run: `git rm -q index.legacy.html index.v2.html && node tools/media-archive.mjs --verify && node tools/check-media-size.mjs`
Expected: both commands print a ✓ line and exit 0.

- [ ] **Step 10: Wire the gate into `npm test`**

In `package.json` add `"media:check": "node tools/check-media-size.mjs"` and append `&& npm run media:check` to the `test` script. Add `tools/media-archive.test.mjs tools/check-media-size.test.mjs` to the `test:workflow` file list.

- [ ] **Step 11: Run the suite**

Run: `npm test 2>&1 | tail -3`
Expected: exit 0.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore(media): archive 300 MB of promo media to the media-2026-10 release

Site previews, brand files and folder READMEs stay on main; the legacy
landing pages are removed; a 5 MB tracked-file gate guards the tree."
```

---

### Task 3: Collection validator for every skill folder

**Files:**
- Create: `tools/check-skills.mjs`
- Create: `tools/check-skills.test.mjs`
- Delete: `tools/check-clawhub.mjs`
- Modify: `package.json` scripts (`clawhub:validate` → `node tools/check-skills.mjs`, add `skills:check` alias, add to `test`)
- Modify: `COMPATIBILITY.md` publishing recipe (`npm run clawhub:validate` wording stays valid)

**Interfaces:**
- Produces: `export function validateSkillDir(dir, { version })` → `string[]` of errors (empty = valid). Rules: `SKILL.md` exists; frontmatter `name` equals folder basename; `description` non-empty; `metadata.version` equals `version`; no `license:` key; every file extension in `.md .json .yaml .yml .toml .txt` or basename `.clawhubignore`; no symlinks; total bytes < 300,000; every relative markdown link in every `.md` resolves inside `dir`. `export function validateCollection(root, { version, forbidRootSkill = false })` → `{ skills: string[], errors: string[] }`; when `forbidRootSkill` is true an existing `<root>/SKILL.md` adds error `root SKILL.md must not exist (installer would treat the whole repo as one skill)`. CLI `node tools/check-skills.mjs [--forbid-root-skill]` prints `PASS <name>: N text files, K KiB, version V` per skill or `FAIL` with errors, exit 1 on any error.

- [ ] **Step 1: Write the failing tests**

```js
// tools/check-skills.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSkillDir, validateCollection } from './check-skills.mjs';

const fm = (name, version = '3.0.0') => `---\nname: ${name}\ndescription: Does a thing.\nmetadata:\n  version: ${version}\n---\n\n# ${name}\n\nSee [ref](references/a.md).\n`;
function skill(root, name, { version, extra } = {}) {
  const dir = join(root, 'skills', name); mkdirSync(join(dir, 'references'), { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), fm(name, version)); writeFileSync(join(dir, 'references', 'a.md'), '# a\n');
  for (const [f, body] of Object.entries(extra ?? {})) writeFileSync(join(dir, f), body);
  return dir;
}

test('a text-only, self-contained skill with matching name and version is valid', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  assert.deepEqual(validateSkillDir(skill(root, 'good'), { version: '3.0.0' }), []);
});

test('rejects non-text files but allows .clawhubignore', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  const dir = skill(root, 'bin', { extra: { '.clawhubignore': '*.log\n', '.DS_Store': 'x' } });
  const errors = validateSkillDir(dir, { version: '3.0.0' });
  assert.equal(errors.length, 1); assert.match(errors[0], /\.DS_Store/);
});

test('reports version mismatch, name mismatch and a broken link', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  const dir = skill(root, 'other', { version: '2.9.9' });
  writeFileSync(join(dir, 'SKILL.md'), fm('wrong-name', '2.9.9').replace('references/a.md', 'references/missing.md'));
  const errors = validateSkillDir(dir, { version: '3.0.0' });
  assert.equal(errors.length, 3);
});

test('collection fails when a root SKILL.md exists and the flag is set', () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-')); skill(root, 'good');
  writeFileSync(join(root, 'SKILL.md'), fm('good'));
  assert.equal(validateCollection(root, { version: '3.0.0' }).errors.length, 0);
  assert.match(validateCollection(root, { version: '3.0.0', forbidRootSkill: true }).errors[0], /root SKILL\.md/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tools/check-skills.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `tools/check-skills.mjs`**

Port the frontmatter and walk logic from `tools/check-clawhub.mjs`, generalised to every directory under `skills/`. Read `version` from `package.json` in the CLI.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tools/check-skills.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Replace the old validator and wire scripts**

`git rm tools/check-clawhub.mjs`. In `package.json`: `"skills:check": "node tools/check-skills.mjs"`, `"clawhub:validate": "node tools/check-skills.mjs"`, append `&& npm run skills:check` to `test`, add `tools/check-skills.test.mjs` to `test:workflow`.

- [ ] **Step 6: Run the validator and the suite**

Run: `node tools/check-skills.mjs && npm test 2>&1 | tail -2`
Expected: `PASS cinematic-scroll: 11 text files …` then exit 0 (root flag not yet enabled).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(tools): validate every skill folder (text-only, self-contained, version-synced)"
```

---

### Task 4: Make `skills/cinematic-scroll/` canonical and bump to 3.0.0

**Files:**
- Delete: `SKILL.md` (root)
- Modify: `skills/cinematic-scroll/SKILL.md`
- Modify: `tools/skill-sync.mjs`, regenerate `.codex/skills/cinematic-scroll/SKILL.md`, `.cursor/skills/cinematic-scroll/SKILL.md`
- Modify: `.claude/commands/cinematic-scroll.md`
- Modify: `AGENTS.md`
- Modify: `tools/check-consistency.mjs`, `tools/check-links.mjs`, `tools/check-package.test.mjs` (link test only; payload test is rewritten in Task 5)
- Modify: `package.json`, `manifest.json`, `.claude-plugin/plugin.json`, `index.html` (release label), `COMPATIBILITY.md` (version table row), `audit-mode.md` (one-line note)
- Modify: every other tracked file whose prose says the root `SKILL.md` is canonical (`REVIEW.md`, `manifest.md`, `decision-log.md`, `V3-IMPLEMENTATION.md`, `docs/skill-advantage/README.md`, `examples/GETTING_STARTED.md`, `examples/KNOWN_ISSUES.md`, `examples/renaissance/README.md`, `references/artifact-templates.md`, `references/promotion-rules.md`, `references/wow-gate.md`, `taste-guardrails.md`)

**Interfaces:**
- Consumes: `validateCollection(root, { version, forbidRootSkill: true })` from Task 3.
- Produces: the canonical skill text at `skills/cinematic-scroll/SKILL.md` with frontmatter

```yaml
---
name: cinematic-scroll
description: <unchanged>
metadata:
  version: 3.0.0
  openclaw:
    emoji: "🎬"
    homepage: https://github.com/MustBeSimo/web-design-studio
  hermes:
    tags: [Animation, Frontend, Design, 3D, Motion, GSAP, Parallax, WebGL]
---
```

- [ ] **Step 1: Add the root-skill rule to the suite so it fails first**

In `package.json` change `skills:check` and `clawhub:validate` to `node tools/check-skills.mjs --forbid-root-skill`.
Run: `npm run skills:check; echo exit=$?`
Expected: `FAIL … root SKILL.md must not exist`, exit=1.

- [ ] **Step 2: Merge root-only content into the lean skill**

Edit `skills/cinematic-scroll/SKILL.md`: frontmatter as above; in "Choose one route" replace the review sentence with `For an audit-only request, use the scroll-audit skill when it is installed; otherwise inspect and return findings without building.`; add after the route list: `Companion skills: launch-page-strategy decides what the page must say and prove before motion; scroll-audit scores an existing page.`; in "Verify and hand off" add `When this repository's toolkit is present, run tools/verify/verify-build.mjs --scope output --doctor-mode advisory --runtime during repair and without --profiles at final polish.` Keep everything else verbatim.

- [ ] **Step 3: Delete the root skill and bump versions**

`git rm SKILL.md`. Set `3.0.0` in `package.json`, `manifest.json`, `.claude-plugin/plugin.json`. In `index.html` change the release anchor to `data-release-version="3.0.0" href="https://github.com/MustBeSimo/web-design-studio/releases/tag/v3.0.0"` with text `v3.0.0 · Release notes ↗`. Add a `COMPATIBILITY.md` table row `| **v3.0.0** | 2026-10-27 | Three-skill collection; root SKILL.md removed so installers pick the lean skill; media archived to a release; npm installer without dependencies |`.

- [ ] **Step 4: Retarget the pointer generator and command**

In `tools/skill-sync.mjs`: read `DESCRIPTION` from `skills/cinematic-scroll/SKILL.md`; stub text points to `../../../skills/cinematic-scroll/SKILL.md` and lists `editorial-story.md`, `product-reveal.md`, `real-time-3d.md`, `motion-toolkit.md`, `verification.md` under `../../../skills/cinematic-scroll/references/`; keep the design.md/tokens/themes toolkit pointers. Run `node tools/skill-sync.mjs` to regenerate both stubs. Rewrite `.claude/commands/cinematic-scroll.md` so step 1 reads `skills/cinematic-scroll/SKILL.md` and step 2 names the toolkit references.

- [ ] **Step 5: Update the validators**

`tools/check-consistency.mjs`: version sync now compares `package.json`, `manifest.json`, `.claude-plugin/plugin.json`, and `metadata.version` of every `skills/*/SKILL.md`; delete section 3b (installer PAYLOAD surfaces); add a guard `if (existsSync(join(ROOT, 'SKILL.md'))) errors.push('root SKILL.md must not exist')`. `tools/check-links.mjs`: remove `"SKILL.md"` from `SCAN`; add `["mustbesimo.github.io/cinematic-scroll-skill", "old Pages URL"]`, `["Five live worlds", "stale example count"]`, `["github.com/MustBeSimo/cinematic-scroll-skill", "old repository URL"]` to `DENY`. `tools/check-package.test.mjs`: in the link test replace `'SKILL.md'` with `'skills/cinematic-scroll/SKILL.md'` and drop the `.codex`/`.cursor` entries (they are regenerated pointers).

- [ ] **Step 6: Rewrite `AGENTS.md`**

Keep the identifier rule and the showcase section verbatim. Replace "Canonical contract" with: the three skill folders are the agent contracts; `skills/cinematic-scroll/SKILL.md` is the build contract; `references/` holds toolkit references for full-repo installs and maintainers; `Never add a SKILL.md at the repository root: the skills installer would then treat the whole repository as the skill.`; media rule: `No tracked file over 5 MB; promo media goes to a media-* GitHub Release (see tools/media-archive.mjs).`

- [ ] **Step 7: Fix prose that still calls the root file canonical**

Run: `git grep -nE '(root|repo root|repository root)[^.\n]{0,40}SKILL\.md|SKILL\.md[^.\n]{0,40}(repo root|repository root|single source of truth)' -- '*.md' ':!skills/' ':!docs/superpowers/'`
For each hit, point the sentence at `skills/cinematic-scroll/SKILL.md`. Add to `audit-mode.md` line 3: `> Installable form: skills/scroll-audit/ (added in 3.0.0).`
Expected after edits: the grep prints nothing.

- [ ] **Step 8: Run the suite**

Run: `npm test 2>&1 | tail -3 && node tools/check-skills.mjs --forbid-root-skill`
Expected: exit 0; `PASS cinematic-scroll … version 3.0.0`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat!: make skills/cinematic-scroll the canonical skill and release 3.0.0

BREAKING CHANGE: the root SKILL.md is removed so the skills installer
delivers the 30 KB skill folder instead of the whole repository. A git clone
into ~/.claude/skills/cinematic-scroll no longer acts as a skill; use
npx skills add MustBeSimo/web-design-studio."
```

---

### Task 5: Dependency-free npm installer and package manifest

**Files:**
- Rewrite: `bin/install.mjs`
- Create: `bin/install.test.mjs`
- Rewrite: `tools/check-package.test.mjs` (payload tests)
- Modify: `package.json` (`description`, `bin`, `files`, `dependencies` → `devDependencies`, `test:workflow`, `test:install`)
- Delete: `.npmignore`
- Modify: `COMPATIBILITY.md`, `INTEGRATIONS.md` (install sections)

**Interfaces:**
- Produces: `export function discoverSkills(pkgRoot)` → `Array<{ name: string, dir: string, description: string }>` from `<pkgRoot>/skills/*/SKILL.md`; `export function installSkills({ pkgRoot, skillsDir, only })` → `Array<{ name, target }>` copying each selected folder to `<skillsDir>/<name>` (replace existing); `export function parseArgs(argv)` → `{ dir?: string, only?: string[], list: boolean, help: boolean }` accepting `--dir <path>`, `--skill <name>` (repeatable or comma-separated), `--list`, `--help`. Default `skillsDir` = `join(homedir(), '.claude', 'skills')`; `~` at the start of `--dir` expands to `homedir()`. Unknown skill name → exit 1 with `Unknown skill "<name>". Available: a, b, c`.

- [ ] **Step 1: Write the failing tests**

```js
// bin/install.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { discoverSkills, installSkills, parseArgs } from './install.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('discovers the three skills from the package root', () => {
  assert.deepEqual(discoverSkills(pkgRoot).map((s) => s.name).sort(), ['cinematic-scroll', 'launch-page-strategy', 'scroll-audit']);
});

test('installs a selected skill into --dir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  const out = installSkills({ pkgRoot, skillsDir: dir, only: ['cinematic-scroll'] });
  assert.equal(out.length, 1);
  assert.ok(existsSync(join(dir, 'cinematic-scroll', 'SKILL.md')));
  assert.ok(existsSync(join(dir, 'cinematic-scroll', 'references', 'recipe-catalog.md')));
});

test('installs from a different working directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  execFileSync(process.execPath, [join(pkgRoot, 'bin/install.mjs'), '--dir', dir], { cwd: tmpdir() });
  assert.ok(existsSync(join(dir, 'scroll-audit', 'SKILL.md')));
  assert.ok(existsSync(join(dir, 'launch-page-strategy', 'SKILL.md')));
});

test('parses flags', () => {
  assert.deepEqual(parseArgs(['--dir', '~/x', '--skill', 'a,b', '--skill', 'c', '--list']), { dir: '~/x', only: ['a', 'b', 'c'], list: true, help: false });
});
```

Note: the discovery test lists three skills, so it passes only after Tasks 6 and 7; until then expect it to fail on that assertion alone and re-run it at Task 11.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test bin/install.test.mjs`
Expected: FAIL (exports missing).

- [ ] **Step 3: Rewrite `bin/install.mjs`**

Pure Node (`fs`, `path`, `os`, `url`), no dependencies. CLI guard as in Task 1. `--list` prints `name — description` per skill. Default run installs all skills and prints each target path plus `Next: ask your agent "Use cinematic-scroll to …"`.

- [ ] **Step 4: Run tests**

Run: `node --test bin/install.test.mjs`
Expected: PASS except `discovers the three skills` (pending Tasks 6–7).

- [ ] **Step 5: Rewrite the package manifest**

`package.json`: `"description": "Installer for Web Design Studio: three free agent skills (cinematic-scroll, scroll-audit, launch-page-strategy) for websites people remember."`; `"bin": { "cinematic-scroll-skill": "bin/install.mjs" }`; `"files": ["bin/", "skills/", "LICENSE", "README.md"]`; move `esbuild` and `playwright-core` to `devDependencies`; add `"test:install": "node --test bin/install.test.mjs"` and append `&& npm run test:install` to `test`. `git rm .npmignore`.

- [ ] **Step 6: Rewrite the payload tests in `tools/check-package.test.mjs`**

```js
test('npm tarball is a thin installer', () => {
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }));
  assert.ok(pack.unpackedSize < 500_000, `unpacked ${pack.unpackedSize}`);
  for (const f of pack.files) assert.match(f.path, /^(bin\/|skills\/|LICENSE$|README\.md$|package\.json$)/, f.path);
});
test('package.json has no runtime dependencies', () => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined);
});
```

Keep the relative-links test from Task 4.

- [ ] **Step 7: Update install docs**

`COMPATIBILITY.md` and `INTEGRATIONS.md`: the npm route reads `npx cinematic-scroll-skill` (all three skills) and `npx cinematic-scroll-skill --skill cinematic-scroll --dir .cursor/skills`; remove `cinematic-doctor`/`cinematic-bench` npx mentions and point to `npm run doctor` in a clone; remove the manual "clone the full repository into a cinematic-scroll directory" route and replace with `npx skills add`.

- [ ] **Step 8: Run the suite**

Run: `npm install --no-audit --no-fund && npm test 2>&1 | tail -3`
Expected: exit 0 (the three-skill discovery test still fails; note it and continue).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(npm): ship a dependency-free installer that copies skills/* (3.0.0)"
```

---

### Task 6: New skill `scroll-audit`

**Files:**
- Create: `skills/scroll-audit/SKILL.md`
- Create: `skills/scroll-audit/references/detection.md`
- Create: `skills/scroll-audit/references/scoring.md`
- Create: `skills/scroll-audit/references/report-template.md`
- Create: `skills/scroll-audit/.clawhubignore` (same content as the cinematic-scroll one)

**Interfaces:**
- Produces: frontmatter `name: scroll-audit`, `metadata.version: 3.0.0`, description (single line, ≤ 700 chars) beginning `Audit a live website's or local page's scroll experience and return a scored remediation plan.` and listing trigger phrases: audit, review, score, benchmark, scroll performance, parallax, pinned sections, scroll-jacking, reduced motion, motion accessibility, "why does this page feel janky".
- Source material: `audit-mode.md` sections Overview, Scoring (all four formulas verbatim), Taste Guardrail Violations table, Report template, Audit Agent Instructions, Edge Cases, Score Calibration; `references/detection-pipeline.md` seven categories. Condense; do not add new rules.
- Must include the authorisation warning: audit only sites you own or are authorised to test; the fetch has side effects; confirm before `localhost`.

- [ ] **Step 1: Write the skill files**

`SKILL.md` ≤ 220 lines: purpose, when it fires, safety, the five-step procedure, the four dimensions with weights, where scoring and the template live, output contract (`remediation-plan.md` plus a chat summary of score, grade, single most impactful fix, and an offer to implement with `cinematic-scroll`). `references/detection.md` ≤ 120 lines, `references/scoring.md` holds the formulas and violation table, `references/report-template.md` holds the markdown template.

- [ ] **Step 2: Validate**

Run: `node tools/check-skills.mjs --forbid-root-skill`
Expected: `PASS scroll-audit: 5 text files …`.

- [ ] **Step 3: Trigger sanity**

Run: `node -e "const t=require('fs').readFileSync('skills/scroll-audit/SKILL.md','utf8');const d=t.match(/^description: (.+)$/m)[1];console.log(d.length);for(const w of ['audit','score','parallax','reduced motion','scroll-jacking'])if(!d.toLowerCase().includes(w))throw new Error('missing '+w)"`
Expected: prints a number ≤ 700, no error.

- [ ] **Step 4: Commit**

```bash
git add skills/scroll-audit
git commit -m "feat(skills): add scroll-audit, the installable form of audit mode"
```

---

### Task 7: New skill `launch-page-strategy`

**Files:**
- Create: `skills/launch-page-strategy/SKILL.md`
- Create: `skills/launch-page-strategy/references/page-shapes.md`
- Create: `skills/launch-page-strategy/references/story-brief-template.md`
- Create: `skills/launch-page-strategy/.clawhubignore`

**Interfaces:**
- Produces: frontmatter `name: launch-page-strategy`, `metadata.version: 3.0.0`, description beginning `Decide what a launch, landing or product page must say and prove before any design or motion work.` with triggers: landing page, launch page, waitlist, pricing page copy, conversion, headline, call to action, objections, proof, "what should the page say".
- Output contract: a **story brief** (template in `references/story-brief-template.md`) with fields: audience, the one action, offer in one sentence, traffic source and what visitors already believe, top three objections and the section that answers each, proof items placed next to the claim they support, risk reversal, page shape (one of four in `references/page-shapes.md`: proof-first, education-first, single-action, comparison), index/noindex decision, hero message and call-to-action verb, beats in reading order, constraints to preserve verbatim. The brief is the hand-off to `cinematic-scroll`.
- Rules the skill must state: one offer, one audience, one primary action; ask only for missing inputs, in one batch, then proceed on stated assumptions; never invent claims, numbers, logos, testimonials or guarantees; keep supplied copy verbatim; the brand decides voice, casing and visual system (this skill sets no font, colour, spacing or motion values); match the message to the traffic source; put proof beside the claim; treat objections as sections.
- Original writing only. No text from other skills.

- [ ] **Step 1: Write the skill files**

`SKILL.md` ≤ 200 lines; `references/page-shapes.md` ≤ 80 lines (four shapes: when to use, section order, what proves success); `references/story-brief-template.md` ≤ 60 lines.

- [ ] **Step 2: Validate**

Run: `node tools/check-skills.mjs --forbid-root-skill && node --test bin/install.test.mjs`
Expected: three `PASS` lines; all installer tests pass including `discovers the three skills`.

- [ ] **Step 3: Brand-neutrality check**

Run: `grep -nEi 'geist|inter\b|manrope|#[0-9a-f]{6}|px\b|ms\b|cubic-bezier' skills/launch-page-strategy -r`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add skills/launch-page-strategy
git commit -m "feat(skills): add launch-page-strategy, the story brief before motion"
```

---

### Task 8: README first screen and stale metadata

**Files:**
- Rewrite: `README.md`
- Modify: `.claude-plugin/marketplace.json` (description), `.claude-plugin/plugin.json` (description)
- Rewrite: `sitemap.xml` (base URL `https://mustbesimo.github.io/web-design-studio/`)
- Modify: `examples/GETTING_STARTED.md` (install command), `examples/PROMPTS.md` (add one `scroll-audit` and one `launch-page-strategy` prompt under a new `## Companion skills` heading)

**Interfaces:**
- Consumes: release asset URL from Task 2; skill descriptions from Tasks 6–7.
- Produces README order: H1 `Web Design Studio`; one line `Three free agent skills for websites people remember: build it, prove it, make it convert.`; badges (npm, CI, license, stars); showcase image linking to the live site; skills table (`Skill | Ask your agent for | Folder`); `## Install` with `npx skills add MustBeSimo/web-design-studio` and one prompt per skill in blockquotes; `## See it` (live site link, film link to the release asset, the seven-flagship table, the examples table inside `<details><summary>All 28 examples</summary>`); `## Why a skill and not a prompt` (the existing four-row table plus the honest sentence that the three-build comparison found no correctness advantage, linking `docs/skill-advantage/README.md`); `## Other install routes` (ClawHub, Claude Code plugin marketplace, npm installer, `npx skills add … --skill <name>`); `## The toolkit in this repository` (verifier, doctor, examples, templates, bench, with the existing commands); `## Validation`; `## Web Design Studio Pro` (existing table and button, unchanged offer); `## Develop`; `## Principles`; `## License`.
- Copy rules: no em-dashes added; counts must match reality (28 examples, 11 visual systems, nine components, three skills); keep `Formerly Cinematic Scroll` sentence once.

- [ ] **Step 1: Rewrite the README**

Reuse the existing flagship and examples tables, Pro table and develop commands verbatim; write the new sections.

- [ ] **Step 2: Fix metadata files**

`marketplace.json` description: `Three free agent skills by Simone Leonelli (W230): cinematic-scroll builds distinctive scroll, 3D and motion websites; scroll-audit scores any page; launch-page-strategy decides what the page must say.` `plugin.json` description: `Web Design Studio: cinematic-scroll, scroll-audit and launch-page-strategy. Installed under the established cinematic-scroll compatibility key.` `sitemap.xml`: replace every `mustbesimo.github.io/cinematic-scroll-skill/` with `mustbesimo.github.io/web-design-studio/` and set `<lastmod>` to `2026-10-27` where present.

- [ ] **Step 3: Check links and stale strings**

Run: `npm run links:check && grep -c 'cinematic-scroll-skill/' sitemap.xml; grep -n 'Five live worlds' .claude-plugin/*.json; echo done`
Expected: ✓ line, `0`, no marketplace hit, `done`.

- [ ] **Step 4: Verify README anchors and counts**

Run: `grep -nE '^## ' README.md && grep -oE '[0-9]+ (live )?examples' README.md | sort -u && grep -c 'releases/download/media-2026-10' README.md`
Expected: the section list above in order; only `28 examples` / `28 live examples`; count ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: README first screen sells three skills; fix sitemap, marketplace and plugin copy"
```

---

### Task 9: CI gates

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `tools/check-skills.mjs --forbid-root-skill`, `tools/check-media-size.mjs`, `bin/install.test.mjs`, `tools/check-package.test.mjs`.

- [ ] **Step 1: Add steps to the `craft-contract` job**

After the `skill-sync` step add three `run:` steps: `node tools/check-skills.mjs --forbid-root-skill`, `node tools/check-media-size.mjs`, `node --test bin/install.test.mjs tools/check-package.test.mjs tools/check-skills.test.mjs tools/check-media-size.test.mjs tools/media-archive.test.mjs`.

- [ ] **Step 2: Add an `install-surface` job**

New job on `ubuntu-latest`, Node 20: `npx -y skills add "$GITHUB_WORKSPACE" --list | tee /tmp/skills.txt` then `grep -q 'Found 3 skills' /tmp/skills.txt`.

- [ ] **Step 3: Lint the workflow locally**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8');if(!/Found 3 skills/.test(y)||!/check-media-size/.test(y))process.exit(1)"; echo exit=$?`
Expected: `exit=0`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate skill folders, tracked media size and the installer surface"
```

---

### Task 10: Launch kit and release notes

**Files:**
- Create: `docs/launch/2026-10-v3/README.md`
- Create: `docs/launch/2026-10-v3/release-notes.md`
- Create: `docs/launch/2026-10-v3/x-thread.md`
- Create: `docs/launch/2026-10-v3/linkedin.md`
- Create: `docs/launch/2026-10-v3/show-hn.md`
- Create: `docs/launch/2026-10-v3/reddit.md`
- Create: `docs/launch/2026-10-v3/listings.md`

**Interfaces:**
- Produces `release-notes.md` (used verbatim as the GitHub release body): headline `Web Design Studio 3.0.0`, "What changed" (three skills, 5-second install, media archive, thin npm installer), "Breaking" (root SKILL.md removed; git-clone-as-skill route retired; doctor/bench bins left npm), "Install" (the one command), "Evidence" (link to `docs/skill-advantage/README.md` with the honest sentence), "Thanks".
- `x-thread.md`: 6 posts ≤ 280 chars each; post 1 names the problem (an agent skill that took minutes to install), post 2 the fix in one command, posts 3–5 one skill each with a concrete prompt, post 6 the live site and star ask. No claims beyond the repo's evidence.
- `linkedin.md`: one post ≤ 1,300 chars referencing the existing film (release asset URL) and the live site.
- `show-hn.md`: title ≤ 80 chars starting `Show HN:`; body ≤ 1,200 chars; states what is free, what was measured, what was not.
- `reddit.md`: one post each for r/ClaudeAI and r/cursor, with the install command and a prompt.
- `listings.md`: table `Where | Why | Action | URL` covering skills.sh (automatic from the GitHub repo), ClawHub (publish 3.0.0), bitdoze "Best AI skills for web design" (author contact), Kimi design-skills resource, skillselion listing refresh, awesome-list repositories found via `gh search repos "awesome claude skills" --limit 5` (record the real URLs), Hermes optional skills docs, and the GitHub topics check.
- `README.md` (kit index): day-by-day order: merge and release → npm and ClawHub publish → X thread → LinkedIn → Show HN → listings; a checklist with the owner's two credential commands.

- [ ] **Step 1: Research the listing URLs**

Run: `gh search repos "awesome claude skills" --sort stars --limit 5 --json fullName,stargazersCount,url` and `gh search repos "awesome agent skills" --sort stars --limit 5 --json fullName,stargazersCount,url`
Expected: JSON lists; copy real URLs into `listings.md`.

- [ ] **Step 2: Write the seven files**

- [ ] **Step 3: Check lengths**

Run: `node -e "const fs=require('fs');const x=fs.readFileSync('docs/launch/2026-10-v3/x-thread.md','utf8').split(/\n---\n/);for(const p of x)if(p.trim().length>280)throw new Error('post too long: '+p.trim().length);console.log(x.length,'posts ok')"`
Expected: `6 posts ok` (posts separated by `---` lines).

- [ ] **Step 4: Commit**

```bash
git add docs/launch
git commit -m "docs(launch): v3.0.0 release notes and launch kit for X, LinkedIn, HN, Reddit and directories"
```

---

### Task 11: Verification sweep

**Files:** none modified unless a check fails.

- [ ] **Step 1: Full suite and doctor**

Run: `npm test 2>&1 | tail -3 && node tools/cinematic-doctor/cli.mjs . --quiet; echo doctor=$?`
Expected: exit 0 and `doctor=0`.

- [ ] **Step 2: Tree weight**

Run: `git ls-files -z | xargs -0 du -ck | tail -1 | awk '{printf "%.0f MB\n",$1/1024}'`
Expected: under 100 MB.

- [ ] **Step 3: Installer smoke on the worktree path**

Run: `npx -y skills add "$PWD" --list 2>&1 | grep -E 'Found|^\s+[a-z-]+$'`
Expected: `Found 3 skills` and the three names.

- [ ] **Step 4: Installer smoke from GitHub on the pushed branch, timed**

Run: `git push -u origin HEAD && time npx -y skills add "https://github.com/MustBeSimo/web-design-studio/tree/$(git branch --show-current)" --list 2>&1 | grep -E 'Found'`
Expected: `Found 3 skills`; real time under 15 s.

- [ ] **Step 5: Installed content check**

Run: `D=$(mktemp -d) && npx -y skills add "https://github.com/MustBeSimo/web-design-studio/tree/$(git branch --show-current)" --skill cinematic-scroll --agent claude-code --copy -y 2>&1 | tail -2; grep -c '## Choose one route' .claude/skills/cinematic-scroll/SKILL.md; du -sh .claude/skills/cinematic-scroll`
Expected: `1` and a size under 100 KB. Then remove the installed copy: `rm -rf .claude/skills/cinematic-scroll` (keep `.claude/commands`).

- [ ] **Step 6: Tarball**

Run: `npm pack --dry-run --json --ignore-scripts | node -e "const [p]=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(p.fileCount,'files',p.unpackedSize,'bytes')"`
Expected: under 40 files and under 500,000 bytes.

- [ ] **Step 7: CI on the pushed branch**

Run: `gh run list --branch "$(git branch --show-current)" --limit 1` then `gh run watch <id> --exit-status`
Expected: success. If the `install-surface` job fails for a registry reason only, retry once; if it fails on `Found 3 skills`, fix before shipping.

---

### Task 12: Ship

**Files:** none in the worktree beyond the commits above.

- [ ] **Step 1: Fast-forward main**

Run: `git fetch origin && git merge-base --is-ancestor origin/main HEAD && git push origin HEAD:main`
Expected: push accepted (fast-forward). If `is-ancestor` fails, stop and report: someone pushed to main.

- [ ] **Step 2: Tag and release**

Run: `git tag -a v3.0.0 -m "Web Design Studio 3.0.0" && git push origin v3.0.0 && gh release create v3.0.0 --title "Web Design Studio 3.0.0" --notes-file docs/launch/2026-10-v3/release-notes.md --latest`
Expected: release URL printed.

- [ ] **Step 3: Repo description**

Run: `gh api -X PATCH repos/MustBeSimo/web-design-studio -f description='Three free agent skills for websites people remember: cinematic-scroll builds distinctive scroll, 3D and motion sites; scroll-audit scores any page; launch-page-strategy decides what the page must say. 28 live examples. Formerly Cinematic Scroll.' --jq .description`
Expected: the new description echoed.

- [ ] **Step 4: Live site checks (wait for Pages, up to 5 minutes)**

Run: `for u in / /sitemap.xml /examples/aureus-flythrough/ /examples/renaissance/ /examples/kern-calibration/ /examples/flagships/ /assets/previews/flagship.mp4 /assets/video/aureus-preview.mp4 /assets/brand/renaissance-studio.jpg; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' https://mustbesimo.github.io/web-design-studio$u)" "$u"; done; curl -s https://mustbesimo.github.io/web-design-studio/ | grep -o 'data-release-version="[^"]*"'`
Expected: nine `200` lines and `data-release-version="3.0.0"`.

- [ ] **Step 5: Installer smoke from main, timed**

Run: `time npx -y skills add MustBeSimo/web-design-studio --list 2>&1 | grep Found`
Expected: `Found 3 skills`, under 15 s.

- [ ] **Step 6: Hand off to the owner**

Report: release URL, the two commands only the owner can run (`npm login && npm publish` from the worktree at tag `v3.0.0`; `clawhub login && clawhub skill publish skills/cinematic-scroll --slug cinematic-scroll --name "Web Design Studio" --version 3.0.0`), the main-checkout step `git pull --ff-only`, the note that their uncommitted promo MP4s now belong in the `media-2026-10` release (`gh release upload media-2026-10 <file>`), and the launch kit path.
