# Contributing to Web Design Studio

Use the bug form for reproducible problems and the showcase form to share a site.
For a change, explain the problem, keep the scope focused, and open a pull request.

## Run the checks

From a repository checkout with Node 22 or newer:

```sh
npm install --no-audit --no-fund
npm test
```

The suite checks runtime contracts, links, skill packaging, media size, evaluation
fixtures and installer behavior. Add focused tests when executable behavior changes;
describe what you verified and any checks you could not run in the PR.

## Keep skills self-contained

Never add SKILL.md at the repository root. It makes skill discovery treat the
whole toolkit as one install payload. Each contract belongs in its own folder
under `skills/`, with any supporting references inside that same folder.

Run the packaging gate directly when editing a skill:

```sh
node tools/check-skills.mjs --forbid-root-skill
```

It validates frontmatter, version consistency, text-only contents, size limits and
local links. Do not make an installed skill depend on toolkit files elsewhere in
the repository. Keep human-facing copy on Web Design Studio and preserve existing
skill identifiers in commands, paths and compatibility interfaces.

## Keep promo media out of the tree

Promo films, reels and stills belong in a `media-*` GitHub Release, with their URLs
recorded in the release's archive manifest under `docs/launch/`; do not commit them
to the source tree. No tracked file may exceed 5 MB unless explicitly allowlisted.
Existing live-site media has a separate, coordinated migration: do not remove it
as part of an unrelated contribution. See [AGENTS.md](AGENTS.md) for the media rule.

## Propose a new skill

Explain its user request, output and boundary with the existing skills in your PR.
Add a folder under `skills/` with a unique lowercase, hyphenated name and a SKILL.md
contract containing name, description and the current package metadata version.
Include only useful, text-only references, plus realistic trigger positives and
near-miss negatives in [evals/trigger.json](evals/trigger.json). Follow the
[evaluation guide](evals/README.md); static validation is not proof of routing accuracy.
Run the packaging gate and full suite, then include a worked output and evidence
limits for review. A new skill should add a distinct job, not duplicate a sibling.
