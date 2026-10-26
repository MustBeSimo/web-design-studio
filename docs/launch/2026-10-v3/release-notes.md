# Web Design Studio 3.0.0

A distribution release that makes the skills smaller to install and separates
planning, building and reviewing into distinct entry points. The collection is
free and MIT-licensed. Using the skills requires no Web Design Studio account or
API key. Your coding agent and its tools remain separate prerequisites.

## What changed

- **Three skills.** `launch-page-strategy` prepares the message, proof and story
  brief. `cinematic-scroll` builds the website in the project's own visual language.
  `scroll-audit` reviews an authorised page and writes a scored remediation plan.
- **A far lighter install.** The default path selects a roughly 30 KB skill
  folder instead of treating the full 393 MB tree as the skill. Measured on
  27 October 2026 from one home connection: the previous installer was still
  cloning after 150 seconds; the 3.0.0 path listed all three skills from GitHub
  in 55 seconds. The remaining time is the shallow clone of the showcase media
  the live site still serves from main (about 106 MB tracked); moving that media
  to a Pages build is the next step.
- **Media archived to a release.** Launch media moves to the `media-2026-10`
  release assets, including the [showcase film](https://github.com/MustBeSimo/web-design-studio/releases/download/media-2026-10/promo-linkedin__web-design-studio-linkedin.mp4).
  Media needed by the live site remains available to its pages.
- **Dependency-free npm installer.** The npm package installs the text-only skills
  without runtime dependencies. The development and verification toolkit stays
  in the full repository.

The [live collection](https://mustbesimo.github.io/web-design-studio/) includes
28 examples, 11 visual systems, nine components and seven real-time 3D flagships.
These are reference work, not first-build benchmark results.

## Breaking

- The root `SKILL.md` is removed. Installable contracts live in their individual
  folders under `skills/`.
- A git clone into `~/.claude/skills/cinematic-scroll` no longer acts as a skill.
  Use the collection installer below to select the skill folders.
- The `cinematic-doctor` and `cinematic-bench` bins leave the npm package. They
  remain available as `npm run doctor` and `npm run bench` in a full clone with
  the toolkit's development dependencies installed.

## Install

```sh
npx skills add MustBeSimo/web-design-studio
```

Choose the skills for your task. Start with strategy when the message is unclear,
build when the brief is ready, or audit an existing authorised page.

## Evidence

Read [docs/skill-advantage/README.md](../../skill-advantage/README.md) for the
recorded checks, source snapshot and limitations.

Historical checks on v2.7.6 covered six reference fixtures, nine verifier
failure-path tests and five FIELD browser profiles. All passed their stated
checks. These observations concern those fixtures, failure paths and sampled
page states; they are not a new 3.0.0 validation run.

A three-build exploratory comparison used one brief and the same model with an
ordinary prompt, an expert prompt and the skill. It found no correctness advantage
for the skill on that brief. No larger head-to-head benchmark has been run.
The package supplies reusable instructions and inspection workflows; the evidence
does not establish better design, conversion, universal accessibility or faster
site production. Installation size and timing are separate distribution measures.

## Thanks

Thanks to everyone who tries the examples, reports a broken path or shares an
output with enough context to inspect it. Useful feedback includes the brief,
agent, installed skill version, actual result and checks that failed.
