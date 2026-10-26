# Web Design Studio 3.0 — distribution release design

Date: 2026-10-27. Author: Claude (Fable 5.1) for Simone Leonelli. Status: approved
by owner's instruction "make the best choices for me" (2026-10-27).

## Intent

Turn the repository from "one heavy skill plus a showcase" into a legible
three-skill collection whose default install path delivers a 30 KB skill in
seconds, with a README whose first screen answers *what, install, prompt*, and a
launch kit aimed at the three channels the owner named: X, ClawHub, and GitHub
search / SEO.

The owner's goal is more than 1,000 GitHub stars. Code cannot guarantee that.
This release removes every measured reason a visitor has *not* to star
(minutes-long install, unreadable first screen, stale versions, no second
skill to try) and gives the owner shareable, honest launch material.

## Why now (evidence gathered 2026-10-26)

- `npx skills add MustBeSimo/web-design-studio` was still cloning after 150 s.
  The installer stops at the root `SKILL.md` and treats the whole 393 MB
  working tree as the skill. The competitor `elayadesign/ai-design-skills`
  (5 files) installs in about 5 s and has 1.9K skills.sh installs to our 193.
- npm served 2.7.1 (2026-09-07) while the repo and ClawHub were at 2.7.6.
- The 30 KB lean edition in `skills/cinematic-scroll/` is only reachable via
  ClawHub.
- Stale strings: `sitemap.xml` still points at `mustbesimo.github.io/cinematic-scroll-skill/`,
  `.claude-plugin/marketplace.json` says "Five live worlds", the lean skill's
  homepage points at the old repo name, two unlinked legacy landing pages pin
  about 45 MB of media.
- A Codex review in the owner's sibling pane reached the same priority:
  install simplicity and understanding before new rules.

## Goals

1. `npx skills add MustBeSimo/web-design-studio` lists three skills and
   finishes in under 15 s on an ordinary connection; no installed skill folder
   exceeds 300 KB.
2. Every route delivers the same `cinematic-scroll` 3.0.0 text: skills
   registry, ClawHub, Claude Code plugin marketplace, npm installer.
3. Tracked working tree under 100 MB; no tracked file over 5 MB except an
   explicit allowlist; CI blocks regressions.
4. README first screen: one value line, a three-row skills table, one install
   command, one prompt per skill, one visual.
5. Stale strings fixed everywhere a validator can reach.
6. A launch kit with honest copy for X, LinkedIn, Show HN, Reddit, and a list
   of directories to submit to.

## Non-goals

- Rewriting git history. The 1.6 GB history stays; shallow clones never fetch it.
- Changing GitHub Pages hosting, the showcase's Renaissance art direction, or
  any example page's content.
- Running the 27-build prompt-versus-skill comparison (remains a follow-up).
- Changing the Pro offer or its Stripe link.
- Publishing to npm or ClawHub from this session. Both need the owner's login;
  the release prepares the exact commands.

## Anti-goals (what would make this a failure even if it ships)

- Adding house-style numeric rules (fonts, hex lists, fixed durations) to
  `cinematic-scroll`. Brand neutrality is the differentiator over the
  competitor's single look.
- Copying the competitor's text. `launch-page-strategy` is original writing.
  Anything adapted from MIT material keeps its notice.
- Promotional copy inside websites the skill generates.
- Claims of superiority over prompts. The repo's own evidence found no
  correctness advantage; copy stays scoped to what was measured.

## Constraints

- Keep the `cinematic-scroll` identifier in install commands, paths, URLs and
  compatibility interfaces. Human-facing product copy says "Web Design Studio".
- GitHub Pages keeps serving from `main` at `/`. Every example URL and the 28
  destinations stay live. Media the site references stays in the tree.
- No owner operating costs: media moves to GitHub Release assets (free for
  public repos). No Git LFS, no new hosting, no new accounts.
- The owner's main checkout has uncommitted promo work
  (`assets/promo-linkedin/README.md` modified, new MP4s untracked). All work
  happens in the worktree branch; `assets/promo-linkedin/README.md` is not
  modified on the branch so the owner's edit merges cleanly.
- Credentials stay out of the repo and out of chat.

## Decisions (owner delegated these; each is Claude's call)

### D1. Canonical skill is `skills/cinematic-scroll/`; the root `SKILL.md` is deleted

The skills CLI (`skills` 1.7.4) parses a root `SKILL.md` first and returns
immediately, so a root skill makes the whole repo the install payload. With no
root skill it searches `skills/` next and dedupes by name. Deleting the root
contract is therefore the fix, not a cleanup. Content from the root contract
that the lean edition lacked is merged in: the audit route (now naming
`scroll-audit`), the verifier hint for toolkit installs, Hermes tags.

`references/` and `references/recipes/` stay as **toolkit references** for
maintainers and full-repo clones. They are not part of any installed skill.
`AGENTS.md` is rewritten to say so and to forbid a root `SKILL.md`.

The `.codex/` and `.cursor/` pointer stubs are regenerated to point at the
lean skill. `.claude/commands/cinematic-scroll.md` points there too.

Breaking change: a `git clone` into `~/.claude/skills/cinematic-scroll` no
longer works as a skill. Version becomes **3.0.0**.

### D2. Three skills in one collection

| Folder | Job | Source |
|---|---|---|
| `skills/cinematic-scroll/` | Build a distinctive scroll, 3D or motion site with provable fallbacks | existing lean edition, updated |
| `skills/scroll-audit/` | Score any URL's scroll experience on pacing, performance, accessibility, emotional arc; output a remediation plan | condensed from `audit-mode.md` + `references/detection-pipeline.md` |
| `skills/launch-page-strategy/` | Decide what a launch or landing page must say and prove before any motion; hand a story brief to `cinematic-scroll` | new, original writing |

Every skill folder is text-only (`.md`, `.json`, `.yaml`, `.yml`, `.toml`,
`.txt`), self-contained (every relative link resolves inside the folder),
carries `metadata.version` equal to `package.json`, and stays under 300 KB.
`audit-mode.md` at the root gains a one-line note that the installable form is
`skills/scroll-audit/`; its body is otherwise unchanged.

### D3. Media relocation to a GitHub Release

A release tagged `media-2026-10`, targeting commit `c8b99b1` (the last commit
that contains the files), marked pre-release and not latest, receives every
tracked file under `assets/` that nothing on the site or in the docs
references, plus the README-only LinkedIn film. Asset names are the repo path
with `/` replaced by `__`. A manifest (`docs/launch/2026-10-v3/media-archive-manifest.txt`)
maps each original path to its download URL.

Referrers that define "referenced": `index.html`, `examples/**`, `stack/**`,
`bench/index.html`, `docs/**`, `sitemap.xml`, `manifest.json`, `.github/**`,
`assets/**/*.{js,mjs,css}`, and `README.md` after its film link is repointed.
Excluded as referrers: `assets/**/*.md`, `tools/**`, `bench/raw/**`,
`bench/results/**`, `IMAGE-SPEC.md` (repointed to the archive),
`index.legacy.html` and `index.v2.html` (deleted).

Kept on main: `assets/previews/`, `assets/video/`, `assets/brand/` files the
site uses, `assets/*.{js,mjs,css}`, the LinkedIn poster JPG, and every
`assets/**/*.md`. The Kern example's 11 MB scrub video is allowlisted.

A CI gate fails when any tracked file exceeds 5,000,000 bytes outside the
allowlist.

### D4. npm package becomes a thin installer

`cinematic-scroll-skill` 3.0.0 ships `bin/`, `skills/`, `LICENSE`,
`README.md`, `package.json` only, with no runtime dependencies. The installer
copies any or all skills into `~/.claude/skills/<name>` (or `--dir`). The
`cinematic-doctor` and `cinematic-bench` bins leave the npm package; they stay
in the repo as `npm run doctor` and `npm run bench`. `esbuild` and
`playwright-core` move to `devDependencies`. The tarball must stay under
500,000 bytes unpacked.

### D5. README first screen

Order: title and one-line value statement; badges; showcase image linking to
the live site; skills table; `npx skills add MustBeSimo/web-design-studio`;
one prompt per skill; then the flagships, the examples table, why-a-skill
(honest), other install routes, toolkit, validation, Pro, develop, license.
The film link points at the release asset.

### D6. Launch kit

`docs/launch/2026-10-v3/` holds: `README.md` (sequence and checklist),
`release-notes.md` (GitHub release body), `x-thread.md`, `linkedin.md`,
`show-hn.md`, `reddit.md`, `listings.md` (directories and roundups to submit
to, with URLs), and the media manifest. All copy is original and makes only
claims the repo's evidence supports. The owner posts; Claude does not.

### D7. Shipping

Branch `worktree-release-v3.0.0` fast-forwards `origin/main` via
`git push origin HEAD:main`. Tag `v3.0.0` and a GitHub release with
`release-notes.md` follow. The repo description is updated to name the three
skills. npm and ClawHub publishing are handed to the owner as two commands.
After the push, live checks confirm the site, preview videos, five example
pages and the sitemap return 200, and that the installer lists three skills
from the GitHub URL in under 15 s.

## Left to the builder

- Exact wording inside the two new skills, within the brand-neutral rule.
- Section order inside the launch posts.
- The README's examples table may be wrapped in `<details>` if it pushes the
  install block below the first screen.

## Follow-ups (not in this release)

- 27-build matched comparison before any stronger claim.
- Optional history rewrite to drop the 1.6 GB of old media blobs.
- Pages deploy via Actions so even the site's preview media could leave `main`.
