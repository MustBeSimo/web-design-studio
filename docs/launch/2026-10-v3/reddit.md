# Reddit drafts

## r/ClaudeAI

**Title:** I split Web Design Studio into three small skills for planning, building and auditing websites

I maintain Web Design Studio, a free MIT collection of instructions for coding
agents. Version 3.0.0 separates the skills from the showcase. The old install
pulled a 393 MB tree and was still cloning after 150 seconds; the main skill
folder is now about 30 KB.

Choose a task: `launch-page-strategy` prepares the message and proof,
`cinematic-scroll` builds the site, and `scroll-audit` reviews an authorised
page and writes a remediation plan. No Web Design Studio account or key is needed.

Install and select the skills for your agent:

```sh
npx skills add MustBeSimo/web-design-studio
```

A prompt to try in your project:

> Use cinematic-scroll to build a product story from my supplied copy and assets. Keep my brand, create one meaningful scroll reveal, and verify mobile, reduced-motion and no-JavaScript states.

[Live examples](https://mustbesimo.github.io/web-design-studio/) ·
[Repository](https://github.com/MustBeSimo/web-design-studio)

An honest limit: our three-build comparison on one brief found no correctness
advantage for the skill. The examples and historical checks are useful reference
material, not proof that this beats your own prompt. I would appreciate a concrete
brief and result if you try it and find a gap.

## r/cursor

**Title:** Web Design Studio 3.0 adds small skills for page strategy and scroll audits

I maintain Web Design Studio, a free MIT skill collection that can work with your
existing project and visual system. This release separates planning, building and
reviewing instead of making the whole showcase part of a skill installation.
The main skill folder is about 30 KB. No Web Design Studio account or key is needed.

Install and select the skills for Cursor:

```sh
npx skills add MustBeSimo/web-design-studio
```

For an existing product page, try:

> Use launch-page-strategy to review my supplied product-page copy. Keep it verbatim unless I approve a rewrite. Identify one primary action, unanswered objections and missing proof, then write a story brief for cinematic-scroll.

`cinematic-scroll` handles implementation when requested. `scroll-audit` inspects
an authorised page and returns a scored remediation plan. The live collection has
28 examples, including seven real-time 3D flagships.

[Live examples](https://mustbesimo.github.io/web-design-studio/) ·
[Evidence](https://github.com/MustBeSimo/web-design-studio/blob/main/docs/skill-advantage/README.md)

Our three-build comparison on one brief found no correctness advantage for the
skill. This is a reusable workflow, not a demonstrated improvement over a detailed
prompt. Feedback on how it fits an existing codebase would be useful.
