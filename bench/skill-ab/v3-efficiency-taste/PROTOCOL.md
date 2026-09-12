# Skill A/B/C v3 — frozen evaluation protocol

This versioned experiment tests whether a revised Web Design Studio skill improves functional delivery and author-blinded visual preference without adding material time or cost. The earlier comparison in `..` and the hard-brief run in `../run2-hard` remain historical evidence and are never rewritten by this harness.

## Comparison

- Three fresh supplied-asset briefs: editorial scroll story, product reveal, and live GLB inspection/camera story.
- A is a competent expert prompt with no skill. B is the skill at commit `dd2ecfb`. C is the clean candidate commit supplied at freeze time.
- Two fresh isolated attempts per condition and brief produce 18 builds. A single cryptographic seed randomizes their execution order.
- A and B/C receive the same brief, copy, assets, tools, model, caps, and network restriction. B and C additionally receive an immutable curated skill payload. Each build runs under the CLI's restricted mode in its own external directory with no shell or web tools. B and C receive a copied payload, not a link into the repository. The payload excludes `bench/` and `evals/`, preventing access to this protocol, checks, condition map, and acceptance rules.

## Freeze, execution, and invalidation

`freeze` requires a clean committed candidate, an exact model identifier, a runner version, and successful kit preflight. It hashes the full protocol, supplied assets, both skill payloads, and preflight report. Paid execution refuses changed inputs, changed skill snapshots, an invalidated group, a completed run, or insufficient budget.

Every run is capped at 60 turns, US$2, and 20 minutes. Development is capped at US$12, frozen evaluation at US$36, and smoke-test reserve at US$2, for US$50 total. CLI cost, wall time, turns, input/output/cache tokens, exit state, logs, and the untouched build are retained. A run is not evaluated or accepted unless the process exits cleanly and reports a successful result with finite turns, cost, and token usage. Missing cost is conservatively charged at the full run cap. A model/service/kit failure is not silently discarded: after review, `invalidate --infrastructure` invalidates all three conditions and both attempts for that brief while preserving logs and spend. Agent-created failures count against their condition.

No paid run starts without both `--execute` and `--ack-paid-runs`.

## Checks and review

Rendered text is normalized across whitespace and typographic punctuation, so copy split across elements still passes. Missing supplied copy fails. Semantic text remaining after approved copy is stripped becomes an added-claim candidate for manual review.

The five-profile matrix covers desktop, mobile, reduced-motion desktop, reduced-motion mobile, and no-JavaScript mobile. It captures runtime errors, asset use, overflow, headings, fallbacks, and document-space visual changes; ordinary page movement caused by scrolling does not count as motion. Editorial builds must expose three route chapters, an actually changing marked route graphic, a pinned stage, and every supplied image in reduced-motion/no-JS layouts. Product builds must expose a monotonic 0–1 hinge progression, an actually changing marked product plate, a pinned stage, and all supplied product states in reduced-motion/no-JS layouts. The same skill-native doctor runs as a diagnostic for every condition and is excluded from acceptance. The 3D build additionally requires a successful GLB request, a real WebGL context, a `ready` state after first render, two distinct instrumented camera states, non-background canvas pixels, material visual change, and working poster fallbacks when either the model or local viewer is blocked.

Blind review creates six matched X/Y/Z groups. Public paths, manifests, live copies, and captures reveal no condition or cost. The author explores live builds and rates brand fit, composition, typography, motion purpose, and mobile readability before choosing one or more winners; multiple winners record a tie. Opening, signature, transition, and closing captures are matched on desktop and mobile. Condition and cost data are revealed only after a complete ratings export confirms blinding and factual-claim review.

## Acceptance

The pilot passes only when all C builds function, the author confirms no invented factual claims, C beats A without a tie in at least five of six groups with at least one win per category, median C/A cost and time are each at most 1.10, each category median is at most 1.25, and C does not regress against B in functional completions or head-to-head preference. The result must be described as an author-blinded, single-model pilot.
