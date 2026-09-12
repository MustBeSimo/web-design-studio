# Efficiency + taste evaluation harness

This directory prepares the new evidence run without touching either historical comparison. It does not contain completed results and does not make a performance claim.

```bash
node bench/skill-ab/v3-efficiency-taste/harness.mjs validate
node --test bench/skill-ab/v3-efficiency-taste/test.mjs
node bench/skill-ab/v3-efficiency-taste/harness.mjs preflight

# Only after the candidate is committed and development is finished:
node bench/skill-ab/v3-efficiency-taste/harness.mjs freeze \
  --candidate-ref HEAD --model <exact-model-id> --development-spent <usd>

# Explicit paid step; runs the next item in the sealed random order:
node bench/skill-ab/v3-efficiency-taste/harness.mjs run --execute --ack-paid-runs
node bench/skill-ab/v3-efficiency-taste/harness.mjs status

# After all valid runs complete:
node bench/skill-ab/v3-efficiency-taste/review.mjs prepare
python3 -m http.server 8765 \
  --directory bench/skill-ab/v3-efficiency-taste/.work/review
# Open http://127.0.0.1:8765/index.html

node bench/skill-ab/v3-efficiency-taste/review.mjs reveal \
  --ratings /path/to/skill-ab-v3-ratings.json
```

If a run exposes an infrastructure defect rather than an agent/build defect, preserve its output and invalidate the whole matched brief group:

```bash
node bench/skill-ab/v3-efficiency-taste/harness.mjs invalidate \
  --brief three-d --reason "precise reason" --infrastructure
```

Generated snapshots, archived runs, logs, screenshots, private condition maps,
ratings, and results live under ignored `.work/`. Paid agents run in separate
external directories under restricted/safe mode with no shell, web tools, session
persistence, or links back into the repository. Freeze checks those CLI
capabilities; each run rechecks the frozen CLI version and all isolated inputs.
Read [PROTOCOL.md](./PROTOCOL.md) before freezing.
