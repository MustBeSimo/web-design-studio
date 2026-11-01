# Stack integration plan (2026-11-01)

**Goal:** make Web Design Studio the layer that integrates the motion, 3D, physics,
authoring and video-production tools people actually use, including tools outside
the website lane, without bundling any of them or adding owner costs.

**Spec, in one paragraph.** Simone asked to integrate the 22 projects from a public
"free motion studio" list plus the standards that list omits (GSAP, Motion, Lenis,
Rive, dotLottie, Rapier, Matter.js, lygia, WebGPU/TSL, the asset and proof
pipelines). The skill's own rule stands: use the host project's stack, add a
dependency only when the signature moment needs it, keep one scroll clock and one
owner per property, and prove the reduced-motion, coarse-pointer, failure and
no-JavaScript states. Integration therefore means recipes, preflight, fallback
contracts and alias entries inside the text-only skill, plus toolkit documentation
for the production tools that are not website code. Licence and maintenance facts
were read from GitHub and npm on 2026-11-01 and are dated in the documents.

## Deliverables

1. `skills/cinematic-scroll/references/stack-shelf.md`: every library and tool,
   its job in a cinematic page, how it integrates under the rules, licence,
   maintenance status, fallback, and the words users use for it.
2. `skills/cinematic-scroll/references/bake-pipeline.md`: offline producers
   (Taichi, SPlisHSPlasH, OpenToonz, Blender, After Effects exports) to frames,
   RIFE interpolation, FFmpeg encoding for scrubbing, poster and budget rules.
3. `skills/cinematic-scroll/references/splat-scene.md`: Gaussian-splat scenes with
   Spark inside the real-time 3D contract.
4. `docs/video-pipeline.md`: the promo lane (OBS, Remotion, Qwen3-TTS, Auto-Editor,
   Audacity, Subtitle Edit, RIFE, FFmpeg) tied to the repository's existing tools,
   with licence notes and the media rule.
5. Catalog, contract, index and discovery updates: recipe-catalog alias rows,
   SKILL.md route and description, llms.txt entries, README and AGENTS pointers,
   trigger evals and the evals README counts, mirrored skill copies synced.

## Global constraints

- Skill folders stay text-only, self-contained and under the size gate; links from
  inside `skills/` resolve inside the folder (`node tools/check-skills.mjs --forbid-root-skill`).
- No version bump in this change; releases bump versions (`docs/releasing.md`).
- No new dependencies, telemetry, hosted services or paid-service integration.
- Do not touch `assets/promo-linkedin/README.md`, `video-launch/` or the LinkedIn
  revision tools.
- Codex owns PR review norms: open a PR, never push to `main` directly.

## Tasks and verification

| Task | Verify |
|---|---|
| Write the three skill references | `npm run skills:check` |
| Update recipe catalog, SKILL.md, llms.txt, README, AGENTS | `npm run links:check && npm run consistency:check && npm run site:check` |
| Add trigger cases and update evals README counts | `npm run evals:run` |
| Sync mirrored skill copies | `npm run skill:sync:check` |
| Full gate | `npm test` |
| Install surface unchanged | CI job "install surface" on the PR |

## Review focus

- A reference that names an API must name one that exists in the current release.
- Licence statements must match the licence files read on 2026-11-01.
- No reference may imply the skill ships or installs any of these libraries.
