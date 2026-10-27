# Evals

Turns "the skill has taste / triggers correctly" from a claim into a number.

```bash
npm run evals:run                                   # deterministic: golden fixtures + trigger-set shape
node evals/run.mjs --target build.html --spec mode-a-pinned-chapter   # score an agent-built file
```

## What runs deterministically (CI)

- **Golden fixtures** (`golden.json` → `goldenFixtures`) — committed reference outputs (the
  component library) are asserted every run: doctor score ≥ threshold + required content
  (`prefers-reduced-motion`, `var(--ease…)`) + banned-pattern absence (`filter: blur(`,
  `transition: all`). These double as regression anchors.
- **Trigger-set shape** — `trigger.json` is validated: every case has a `skill`
  matching an installed folder under `skills/`, a non-empty `query` and boolean
  `should_trigger`. The runner reports totals and counts for each skill.

The dataset now labels each case with its target `skill`; `should_trigger` applies
only to that skill, not the whole collection. All 23 original cinematic-scroll
queries and labels are preserved, including its historical audit overlap.
Sibling-skill negatives test routing boundaries, not whether the request is useful.

| Skill | Should fire | Near-miss negatives | Total |
|---|---:|---:|---:|
| cinematic-scroll | 13 | 10 | 23 |
| scroll-audit | 8 | 8 | 16 |
| launch-page-strategy | 8 | 8 | 16 |
| **Collection** | **29** | **26** | **55** |

## What needs an LLM judge (not deterministic)

- **Triggering accuracy** — run the 55 cases in `trigger.json` against each named
  skill's frontmatter `description` with an LLM judge; assess each skill separately.
  Targets: recall ≥ 0.9 on positives, precision ≥ 0.9 on negatives. Tune the description
  until both clear.
- **Build specs** (`golden.json` → `buildSpecs`) — have an agent satisfy each prompt, then
  score the output: `node evals/run.mjs --target <built> --spec <id>`. Includes an
  anti-pattern trap that must trigger a guardrail redirect, not a literal blur animation.

## Self-critique

[Workflow scenarios](workflows.md) evaluate the normal edition's first build,
existing-app integration, brand precedence, restrained motion, planning-only
requests, truthful verification, and Studio boundary. These require an actual
agent run and artifact review; they are not passed by the static CI suite.

`npm run test:workflow` exercises the executable failure paths with Node's test
runner. `node --test tools/page-proof/runtime.test.mjs` adds real-browser regressions
for clean HTML, missing HTTP assets, overflow, and invisible no-JS title text.

The deterministic self-critique loop is the **verify orchestrator** (`npm run verify -- <file>`)
— an agent runs it on its OWN output before shipping (doctor + page-proof + contract gates).
Taste-level self-critique (does the build match the promised story?) is the LLM-judge layer
above. Together: machine-checkable craft + judged taste.
