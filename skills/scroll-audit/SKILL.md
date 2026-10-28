---
name: scroll-audit
description: Audit a live website's or local page's scroll experience and return a scored remediation plan. Use for an audit, review, score or benchmark request about scroll performance, parallax, pinned sections, scroll-jacking, reduced motion or motion accessibility, including "why does this page feel janky". Inspect authorised targets, separate observed behavior from unavailable evidence, and prioritise repairs across pacing, performance, accessibility and emotional arc. This skill diagnoses existing pages; it does not build or publish them.
metadata:
  version: 3.0.1
  openclaw:
    emoji: "🔎"
    homepage: https://github.com/MustBeSimo/web-design-studio
---

# Scroll audit

Use Web Design Studio to inspect an existing scroll experience and turn evidence
into a scored repair plan. Use the agent's available browser and source access.
This text-only skill includes a rubric and report template, not an executable
scanner. Scores describe the inspected page and conditions, not every visitor.

## When this fires

- The user asks to audit, review, score or benchmark an existing scroll experience.
- A page feels janky, gets stuck in pinned sections or fights normal scrolling.
- Parallax, camera movement or scroll-jacking makes content difficult to read.
- The user wants reduced-motion or motion-accessibility findings with priorities.

Keep the review within the requested page, route and device scope. A general SEO
review or a request to build a new site is outside this skill's purpose.

## Before you fetch

Audit only sites the user owns or is authorised to test. Establish that scope
before loading the target. A benchmark request does not waive this requirement.
The fetch runs in the agent's network context. Loading scripts or using controls
can trigger analytics, ad impressions or other side effects.

Confirm before fetching localhost or internal URLs. Existing explicit permission
for the exact target is sufficient. Read a supplied local file within the user's
scope; obtain confirmation before serving or opening it through a local URL.

Never enter real credentials. Prefer a throwaway test account and a session the
user has already authenticated. Do not request passwords in chat, bypass access
controls, submit forms or activate purchases as part of this audit. If access is
unavailable, report the limitation and inspect only the authorised public surface.

## Procedure

### 1. Fetch and analyse

Open the requested route and record the URL or local path, date, device, browser,
viewport, motion preference and available tools. Follow
[detection](references/detection.md) across all seven categories. Inspect the
opening, transitions, readable holds and exit, then reverse direction. Observe
keyboard access and the reduced-motion version when the tools support them.

Record evidence by chapter and selector. A missing browser, inaccessible source or
unavailable trace is missing evidence. Do not infer a frame rate from smooth-looking
screenshots or infer accessibility from the presence of a media query.

### 2. Score each dimension

Read [scoring](references/scoring.md). Apply its four formulas to the recorded
findings and keep a deduction ledger. State the observation behind each deduction,
its count and any cap. Explain judgment calls, especially narrative findings.
If a required measurement is unavailable, label the affected score provisional
or not assessed. Do not present an incomplete review as a complete overall grade.

### 3. Check taste violations

Apply all seventeen checks and the critical caps in
[scoring](references/scoring.md). Keep these deductions separate from the base
formula so another reviewer can reproduce the result. Explain brand-dependent
judgments. The rubric is a diagnostic convention, not a prescription for a site's
fonts, palette, layout or motion character.

### 4. Write remediation-plan.md

Use the [report template](references/report-template.md). Put critical issues
first, with the affected chapter, evidence, practical repair and estimated effort.
Distinguish measured results from rubric judgments and projected improvements.
Do not invent timings, source filenames or before/after scores. Record unavailable
checks explicitly. Write in the user's requested output directory.

See the [fictional remediation plan](references/example-remediation-plan.md) for a completed example with a deduction ledger and unavailable checks.

### 5. Present and offer fixes

Summarise the overall score and grade, or explain why either is unavailable.
Name the single fix that would remove the largest observed obstacle. Offer to
implement critical fixes with `cinematic-scroll` if it is installed. The audit
alone does not authorise changes. After an accepted repair, repeat affected checks
and compare them under the same conditions.

## Dimensions and grades

Score each dimension from 0 to 100. Pacing, Performance, Accessibility and Emotional
Arc each contribute 25% of the overall result after deductions and caps.

| Tier | Score band | Pacing | Performance | Accessibility | Emotional arc |
|---|---|---|---|---|---|
| A | 90-100 | Deliberate rhythm and release | Few observed technical penalties | Content and controls remain reachable | Clear progression serving the subject |
| B | 70-89 | Isolated timing issues | Minor execution issues | Limited access gaps | Coherent but repetitive progression |
| C | 50-69 | Repeated timing problems | Noticeable execution problems | Significant gaps | Weak connection between motion and meaning |
| D | 30-49 | Scroll feels obstructed | Serious execution problems | Essential paths are obstructed | Repetitive or disconnected treatment |
| F | 0-29 | Broken or persistently trapped flow | Critical execution failure | Essential content is unreachable | Disorienting or contradictory treatment |

Use the calculated band, not the description alone, to assign a grade. A high
score is not certification of accessibility, device performance or conversion.

## Edge cases

- **No scroll interactions:** the inherited rubric uses Pacing 50, Performance 100,
  Accessibility 100 and Emotional Arc 30, overall 70. Label this a nominal static
  baseline, not measured proof of performance or accessibility. Report observed
  defects separately. Do not claim that a static page needs motion to tell a story.
- **SPA:** cover the requested initial route and loaded state. Identify untested
  navigation and recommend separate route checks rather than claiming whole-app coverage.
- **Authentication:** use an authorised test session. If none is available, mark
  protected content not assessed and explain which public states were inspected.
- **Custom library:** assess observed scheduling, property changes and cleanup.
  A recognised library name earns no points by itself.
- **CSS-only scroll timelines:** inspect computed animation state, supported-browser
  behavior and the fallback. No JavaScript does not mean no scroll interaction.
- **Mixed quality:** score chapters first and weight their scores by scroll range.
  Show those ranges so a long broken chapter is not hidden by a short successful one.
- **Reduced motion active:** label the active preference. Compare normal and reduced
  modes separately when authorised and possible. Report a score gap above 30 points
  with its cause; missing normal-mode evidence must stay visible.

## Output contract

Write `remediation-plan.md` using the linked template. Then return a short chat
summary with the overall score, grade, the single most impactful fix and remaining
unknowns. If a complete score is unsupported, say so instead of filling the gap.
Offer to implement critical fixes with the `cinematic-scroll` skill if installed.
