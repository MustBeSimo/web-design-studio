# Web Design Studio v4 forward test

This is a narrow forward comparison on one unseen real-time WebGL brief. Baseline
`f1b5625` and candidate `eb9e1aa` each run twice with `claude-sonnet-5`, for four
sealed runs total. Each run is capped at US$2, 60 turns, and 20 minutes; the total
cap is US$8.

The runner receives only `Read`, `Write`, and `Edit`. Shell, web tools, MCP
servers, network tools, delegation, and session persistence are disabled. Each
run gets a new temporary directory containing immutable copies of the same
prompt, brief, three local assets, and its pinned skill. A stored seed chooses
the starting condition, then B and C alternate.

No paid call occurs during tests, validation, preparation, evaluation, review,
status, or conclusion:

```bash
node --test bench/skill-ab/v4-forward/test.mjs
node bench/skill-ab/v4-forward/harness.mjs validate
node bench/skill-ab/v4-forward/harness.mjs prepare
node bench/skill-ab/v4-forward/harness.mjs status
```

After inspecting the prepared ledger, execute one sealed run at a time, four
times:

```bash
node bench/skill-ab/v4-forward/harness.mjs run --execute --ack-paid-runs
```

Both flags are mandatory. Raw output, stderr, telemetry, generated pages,
screenshots, browser evidence, evaluator reports, costs, and hashes remain under
ignored `.work/`; the OS temporary directory retains a second copy.

After four complete runs:

```bash
node bench/skill-ab/v4-forward/harness.mjs conclude
```

The automated claim requires candidate 2/2, baseline below 2/2, no
candidate-added claims, and candidate median cost, elapsed time, and turns each
no more than 1.10× baseline.

Taste is separate. If a taste claim is wanted, complete the opaque X/Y review
before concluding:

```bash
node bench/skill-ab/v4-forward/review.mjs prepare
node bench/skill-ab/v4-forward/review.mjs serve
node bench/skill-ab/v4-forward/review.mjs reveal --ratings ~/Downloads/v4-taste-ratings.json
```

The mapping appears only after `reveal`; candidate must win both pairs before
`tasteClaimSupported` can be true.
