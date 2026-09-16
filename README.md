# Web Design Studio

### Distinctive websites, interactive 3D and motion—built with your coding agent.

Formerly **Cinematic Scroll**. The product has a broader name; the established
`cinematic-scroll` skill identifier, npm package and ClawHub listing stay the same.
The repository is now **MustBeSimo/web-design-studio**.

[![npm](https://img.shields.io/npm/v/cinematic-scroll-skill?style=flat-square&logo=npm&color=315efb)](https://www.npmjs.com/package/cinematic-scroll-skill)
[![CI](https://img.shields.io/github/actions/workflow/status/MustBeSimo/web-design-studio/ci.yml?style=flat-square&label=quality%20gate)](https://github.com/MustBeSimo/web-design-studio/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-813de4?style=flat-square)](./LICENSE)
[![stars](https://img.shields.io/github/stars/MustBeSimo/web-design-studio?style=flat-square&label=stars)](https://github.com/MustBeSimo/web-design-studio/stargazers)

<a href="https://mustbesimo.github.io/web-design-studio/"><img src="assets/brand/social-preview.jpg" alt="Web Design Studio — the web, with a human touch. Original Renaissance-inspired artwork beside the studio identity." width="100%"></a>

<p align="center">
  <strong>Your brief, backed by reusable design craft and browser evidence.</strong><br>
  <a href="https://mustbesimo.github.io/web-design-studio/">Live site</a> ·
  <a href="https://mustbesimo.github.io/web-design-studio/examples/flagships/">Real 3D flagships</a> ·
  <a href="#install">Install</a> ·
  <a href="https://clawhub.ai/mustbesimo/skills/cinematic-scroll">ClawHub</a> ·
  <a href="https://github.com/MustBeSimo/web-design-studio">Star on GitHub</a>
</p>

Web Design Studio is a free, MIT-licensed design and build skill for coding agents. It turns a product, portfolio, launch, or story into a distinctive website with deliberate art direction, interactive 3D, scroll choreography, resilient motion, and evidence that the result actually works.

It is not a prompt pack and it is not a runtime dependency. The skill guides the agent; the finished website stays yours.

## Why give your agent a skill

**Bring a working standard to every cinematic website.** Web Design Studio packages
art direction, motion patterns, fallback requirements and verification tools so
you can reuse the craft instead of reconstructing the instructions for each project.
Your brand determines the look; the skill gives the agent a process to build and inspect it.

| What you want | What the skill adds |
| --- | --- |
| A website that belongs to your brand | Brand precedence, visual references and a content-led story before effects. |
| Motion that explains the subject | Start → transformation → readable hold → exit, with reusable interaction patterns. |
| A page that remains usable | Explicit mobile, reduced-motion, no-JS and renderer-failure requirements. |
| Evidence you can inspect | Static checks and a five-profile browser proof workflow, with failures and missing evidence reported. |

[![What changes when the skill supplies the working context](docs/skill-advantage/workflow.webp)](docs/skill-advantage/README.md)

Start with a product reveal, an interactive material study, or a camera journey
through a brand world. Adapt **28 examples, 11 visual systems and nine components**
to your own subject, then use the included checks to inspect the result.

[Explore the live collection](https://mustbesimo.github.io/web-design-studio/) ·
[See the visual evidence](docs/skill-advantage/README.md) ·
[Download the illustrated guide](docs/skill-advantage/web-design-studio-visual-evidence.docx)

Choose the install route for your agent:

**OpenClaw / ClawHub**

```bash
npx clawhub install @mustbesimo/cinematic-scroll
```

**Claude Code, Cursor and other agents supported by the skills installer**

```bash
npx skills add MustBeSimo/web-design-studio
```

[Inspect the ClawHub package](https://clawhub.ai/mustbesimo/skills/cinematic-scroll)
or [choose Claude Code, Cursor, Hermes, Kimi Code, Gemini CLI or another agent](./INTEGRATIONS.md).

Then ask:

> Use cinematic-scroll to turn this product into a one-page story. Match the brand and assets in this project, create one memorable scroll reveal, and prove the mobile and reduced-motion versions.

No account, Pro purchase, TasteHQ key, or image-generation key is required.

## Interaction toolkit

Six text treatments, magnetic/depth surfaces, four original shader families and
a shared scroll/pointer/proximity runtime—all MIT. React and Three.js adapters
add demand rendering, adaptive quality, asset cleanup and context recovery.
The WebGPU/TSL study is a separate experimental preview with WebGL2 fallback.

- [FIELD](./examples/v3-flagship/index.html): observe, focus and reframe an optical instrument.
- [Effects lab](./examples/effects-lab/index.html): isolate and explore the ingredients.
- [Runtime guide](./references/interaction-runtime.md): copyable APIs and integration contracts.

Open the standalone HTML files, or serve the repository. For React, run
`npm ci && npm run dev` in `templates/nextjs`, then visit `/v3-flagship`,
`/effects-lab` or `/webgpu-preview`. Generated examples stay synchronized with
`npm run build:lab` and `npm run build:flagship`. No remote publication is needed.

Three/types are pinned to 0.185.0 because the compatible postprocessing release
excludes 0.186. Optional runtime code belongs to your output; there is no hosted
service dependency or paid visual-effect tier. Web Design Studio Pro's Motif Engine remains separate.

## What you get

- A content-led story and visual direction before effects are chosen.
- Standalone HTML for a fast first page, or integration into an existing app.
- Pinned chapters, parallax, scrubbed video, kinetic type, and real 3D patterns.
- Eleven swappable visual systems and nine reusable components.
- Progressive fallbacks for touch, reduced motion, missing JavaScript, and WebGL failure.
- A deterministic doctor plus browser proof across desktop, mobile, reduced-motion, and no-JS profiles.
- Optional TasteHQ brand matching when a target URL or embedded grammar is available.

Choose the experience: editorial motion, an interactive 3D object, or an immersive
camera journey. The agent matches the implementation to your brief and builds the
responsive and fallback states alongside it.

## See the proof

[![Watch the Web Design Studio skill and examples film](assets/promo-linkedin/web-design-studio-linkedin-poster.jpg)](assets/promo-linkedin/web-design-studio-linkedin.mp4)

**[Watch the 46-second skill and examples film →](assets/promo-linkedin/web-design-studio-linkedin.mp4)** — Aether prompt, source code, preview, visual systems, real-time 3D, resilience states, and browser evidence.

### Seven Real 3D flagships

Seven live websites, seven different reasons to use depth. Every flagship is scrollable, source-visible, bounded by a performance budget, and backed by a designed fallback.

| | |
|---|---|
| [![Aureus](examples/aureus-flythrough/poster.jpg)](https://mustbesimo.github.io/web-design-studio/examples/aureus-flythrough/) **[01 · Aureus](https://mustbesimo.github.io/web-design-studio/examples/aureus-flythrough/)**<br><sub>Liquid chrome · camera descent</sub> | [![Atelier Marne](examples/gallery-flythrough/poster.jpg)](https://mustbesimo.github.io/web-design-studio/examples/gallery-flythrough/) **[02 · Atelier Marne](https://mustbesimo.github.io/web-design-studio/examples/gallery-flythrough/)**<br><sub>Art halls · architectural flythrough</sub> |
| [![Verdant](examples/jungle-flythrough/poster.jpg)](https://mustbesimo.github.io/web-design-studio/examples/jungle-flythrough/) **[03 · Verdant](https://mustbesimo.github.io/web-design-studio/examples/jungle-flythrough/)**<br><sub>Instanced foliage · sunlight</sub> | [![Aether](examples/flagship/poster.jpg)](https://mustbesimo.github.io/web-design-studio/examples/flagship/) **[04 · Aether](https://mustbesimo.github.io/web-design-studio/examples/flagship/)**<br><sub>Object · world · field · figure</sub> |
| [![Obsidian](examples/crystalline-monolith/poster.jpg)](https://mustbesimo.github.io/web-design-studio/examples/crystalline-monolith/) **[05 · Obsidian](https://mustbesimo.github.io/web-design-studio/examples/crystalline-monolith/)**<br><sub>Faceted glass · material response</sub> | [![Weather](examples/volumetric-aether/poster.jpg)](https://mustbesimo.github.io/web-design-studio/examples/volumetric-aether/) **[06 · Weather](https://mustbesimo.github.io/web-design-studio/examples/volumetric-aether/)**<br><sub>Cloud volume · density control</sub> |
| [![Nexus](examples/immersive/poster.jpg)](https://mustbesimo.github.io/web-design-studio/examples/immersive/) **[07 · Nexus](https://mustbesimo.github.io/web-design-studio/examples/immersive/)**<br><sub>Particles · wave displacement</sub> | **[Explore all 28 examples →](https://mustbesimo.github.io/web-design-studio/)**<br><br>Try a live scene, then copy its build prompt and adapt it to your subject. |

If an example helps you build something, [star the repository](https://github.com/MustBeSimo/web-design-studio) to keep it handy.

### More than one aesthetic

The motion grammar stays consistent; the art direction does not. Browse the [complete visual collection](https://mustbesimo.github.io/web-design-studio/#worlds), including every original editorial and all eleven visual systems.

| Live example | Direction | Code |
|---|---|---|
| [Classic Touch](https://mustbesimo.github.io/web-design-studio/examples/renaissance/) | Renaissance editorial | [Source](./examples/renaissance/) |
| [Maya Torres](https://mustbesimo.github.io/web-design-studio/examples/studio/) | Brutalist creative studio | [Source](./examples/studio/) |
| [Vantascope](https://mustbesimo.github.io/web-design-studio/examples/noir/) | Editorial sci-fi | [Source](./examples/noir/) |
| [Maison Solenne](https://mustbesimo.github.io/web-design-studio/examples/luxe/) | Quiet luxury | [Source](./examples/luxe/) |
| [Bloom](https://mustbesimo.github.io/web-design-studio/examples/pop/) | Playful product story | [Source](./examples/pop/) |
| [Atelier Nocturne](https://mustbesimo.github.io/web-design-studio/examples/atelier/) | Kinetic editorial | [Source](./examples/atelier/) |
| [Digital Wealth](https://mustbesimo.github.io/web-design-studio/examples/digital-wealth/) | Financial product story | [Source](./examples/digital-wealth/) |
| [Kern](https://mustbesimo.github.io/web-design-studio/examples/kern-calibration/) | Mechanical instrument and calibration | [Source](./examples/kern-calibration/) |
| [Meridian](https://mustbesimo.github.io/web-design-studio/examples/symmetric-monument/) | symmetric monument | [Source](./examples/symmetric-monument/) |
| [Vanta Labs](https://mustbesimo.github.io/web-design-studio/examples/clinical-noir/) | clinical noir | [Source](./examples/clinical-noir/) |
| [Polly & Plot](https://mustbesimo.github.io/web-design-studio/examples/storybook-geometry/) | storybook geometry | [Source](./examples/storybook-geometry/) |
| [Obsidian](https://mustbesimo.github.io/web-design-studio/examples/temporal-monument/) | temporal monument | [Source](./examples/temporal-monument/) |
| [Farsight](https://mustbesimo.github.io/web-design-studio/examples/atmospheric-sublime/) | atmospheric sublime | [Source](./examples/atmospheric-sublime/) |
| [Keepsake](https://mustbesimo.github.io/web-design-studio/examples/warm-scrapbook/) | warm scrapbook | [Source](./examples/warm-scrapbook/) |
| [Drift](https://mustbesimo.github.io/web-design-studio/examples/naturalistic-drift/) | naturalistic drift | [Source](./examples/naturalistic-drift/) |
| [Concrete / Orange](https://mustbesimo.github.io/web-design-studio/examples/brutalist-kinetic/) | brutalist kinetic | [Source](./examples/brutalist-kinetic/) |
| [Chroma](https://mustbesimo.github.io/web-design-studio/examples/liquid-chrome/) | liquid chrome | [Source](./examples/liquid-chrome/) |
| [Verdant Press](https://mustbesimo.github.io/web-design-studio/examples/botanical-editorial/) | botanical editorial | [Source](./examples/botanical-editorial/) |
| [Signal](https://mustbesimo.github.io/web-design-studio/examples/data-cinematic/) | data cinematic | [Source](./examples/data-cinematic/) |
| [Naturally Rooted](https://mustbesimo.github.io/web-design-studio/examples/wellness/) | A slower editorial study | [Source](./examples/wellness/) |
| [Novadeck](https://mustbesimo.github.io/web-design-studio/examples/retro/) | A playful digital throwback | [Source](./examples/retro/) |

The visual systems live in [`themes/`](./themes/). The components live in [`components/`](./components/). They are starting points, not a fixed house style.

## Validation and development results

On 12 September 2026, source v2.7.6 passed **6 reference fixtures** and **9 verifier
failure-path tests**; FIELD returned clean reports in **5 browser profiles**.
[Test scope and reproduction commands](docs/skill-advantage/README.md#verification-actually-run).

The skill is hardened in public through prompt comparisons that retain their
builds, costs, screenshots and failure evidence: [first comparison](bench/skill-ab/REVEAL.md) ·
[second run](bench/skill-ab/run2-hard/RESULTS-RUN2.md) ·
[latest sealed forward protocol](bench/skill-ab/v4-forward/README.md). Findings feed
directly into copy fidelity, fallback, interaction and efficiency safeguards.
Claims stay scoped to what these reproducible runs actually demonstrate.

## Web Design Studio and Pro

The normal edition is the complete, useful product—not a trial.

| Web Design Studio · free forever | Web Design Studio Pro · for repeat practice |
|---|---|
| Build complete cinematic websites | Build on accumulated project knowledge |
| Story and motion planning | Intent-based pattern retrieval |
| 28 references + 11 visual systems | Reuse tracking across builds |
| Components and Real 3D patterns | Learned variants from your own language |
| Doctor + five-profile browser proof | Deeper iteration without starting cold |
| Optional TasteHQ matching | Proprietary Motif Engine |

### Make every project a head start.

Web Design Studio Pro adds the **Motif Engine**: retrieve patterns by intent,
build on accumulated project knowledge, and develop variants from your own visual
language. Bring what you learned into the next brief.

<p>
  <a href="https://buy.stripe.com/cNi7sLdNBbief0L0uFfnO09"><img src="assets/brand/studio-pro-button.svg" alt="Get Web Design Studio Pro — open checkout" width="320" height="64"></a>
</p>

[Compare editions](./references/editions.md) · [See how the stack fits](https://mustbesimo.github.io/web-design-studio/stack/)

<sub>The free edition remains available for unlimited personal and commercial projects.</sub>

## Install

All paths install the same normal edition.

### Skills registry

```bash
npx skills add MustBeSimo/web-design-studio
```

### npm installer

```bash
npx cinematic-scroll-skill
npx cinematic-scroll-skill --dir .cursor/skills
```

### OpenClaw / ClawHub

```bash
openclaw skills install cinematic-scroll
```

The ClawHub edition is a lean, text-only normal edition with the complete story,
implementation, interaction, 3D, accessibility, and verification workflow. Its
source lives in [`skills/cinematic-scroll/`](./skills/cinematic-scroll/) and is
gated by NVIDIA SkillSpector in CI without a suppression baseline.

### Claude Code marketplace

```text
/plugin marketplace add MustBeSimo/web-design-studio
/plugin install cinematic-scroll@mustbesimo
```

### Git clone

```bash
git clone https://github.com/MustBeSimo/web-design-studio ~/.claude/skills/cinematic-scroll
```

For Claude Desktop, Cursor, Hermes, and alternative OpenClaw paths, see [`COMPATIBILITY.md`](./COMPATIBILITY.md).

## Two build modes

### Mode A — a section or standalone page

Use this for a hero, a campaign page, or a fast concept. The output can be one runnable HTML file with no build step.

> Build a self-contained pinned hero for this brand. Keep the page readable without JavaScript and give touch devices a natural-flow version.

### Mode B — a full release site

Use this for multi-chapter stories and existing React/Next.js products. The skill preserves the installed framework and scroll provider, then integrates the sequence at a real route.

> Build a complete release story for this product inside the existing app. Reuse its design system, create one signature moment, and verify the built route.

The included [`templates/nextjs/`](./templates/nextjs/) project is available when a new Next.js scaffold is actually needed. Generated media through fal.ai is optional; demo mode and local assets work without a key.

## Quality is a gate

`cinematic-doctor` scores static craft and exits non-zero below the chosen threshold:

```bash
npm run doctor -- examples/flagship/index.html
```

The end-to-end verifier combines contract checks with browser evidence:

```bash
node tools/verify/verify-build.mjs ./index.html --phase polish
```

For a full interaction matrix:

```bash
node tools/page-proof/matrix.mjs ./index.html --out .verify/page-proof
```

That matrix covers desktop, mobile/touch, reduced motion on both layouts, and JavaScript disabled. A requested check that cannot run reports `INCOMPLETE`; a failed check reports `FAIL`. Neither is dressed up as success.

Install browser-tool dependencies once with `npm install` in the skill directory. Chrome or Chromium is needed only for screenshot proof, not to generate a standalone page.

## Design system and architecture

```text
SKILL.md                    compact agent contract and workflow router
design.md + tokens/        DTCG color, type, spacing, and motion contract
themes/                    eleven one-file visual systems
components/                nine named patterns in HTML and React
references/                story, build, motion, performance, 3D, and XR guidance
examples/                  live references, prompts, and Real 3D flagships
templates/nextjs/          optional full-site starter
tools/cinematic-doctor/    deterministic static quality gate
tools/page-proof/          browser screenshots and interaction matrix
tools/verify/              one-command verification orchestration
tools/tastehq/             optional brand query and score adapter
evals/                     triggering and workflow behavior checks
```

The main contract is [`SKILL.md`](./SKILL.md). It routes to detailed references only when the build needs them, keeping agent context smaller and decisions clearer.

### One choreography, two media

[`scroll-choreography.json`](./scroll-choreography.json) is a declarative timing source that can compile to a webpage timeline and launch-film markers. See [`compile-choreography.mjs`](./compile-choreography.mjs) and the [compilation contract](./scroll-choreography-compilation.md).

### Real 3D assets

The flagship can run procedurally before any model arrives. When assets are available, [`ASSETS-3D.md`](./ASSETS-3D.md) defines GLB/USDZ formats, scale, pivots, triangle caps, materials, camera nodes, and manifest paths so the upgrade is data—not a rewrite.

## Develop and verify this repo

```bash
npm install
npm test
```

The test suite checks tokens, themes, links, skill mirrors, components, the doctor, evals, benchmark behavior, verification semantics, browser-matrix orchestration, package contents, and the TasteHQ adapter.

Useful commands:

```bash
npm run tokens:check
npm run themes:check
npm run components:doctor
npm run proof -- examples/noir/index.html
npm run bench -- https://example.com
```

[`CinematicBench`](https://mustbesimo.github.io/web-design-studio/bench/) is the companion passive benchmark for pacing, performance, accessibility, and motion craft.

## Principles

- Content and brand lead; effects follow.
- Use real 3D only when spatial depth carries meaning.
- One scroll clock, reversible setup, and no global teardown.
- Mobile is a composition, not a shrunken desktop.
- Reduced motion restores readable flow; it does not merely set duration to zero.
- A static poster or readable page is a designed state, not an apology.
- References inform direction without copying assets, logos, text, or exact compositions.

## License

MIT © 2026 [Simone Leonelli](https://w230.net). See [LICENSE](./LICENSE).

Built something with it? [Submit it to the showcase](https://github.com/MustBeSimo/web-design-studio/issues/new?title=Showcase:%20) or email [simone@w230.net](mailto:simone@w230.net).
