# v4 forward-test protocol

## Question

Does Web Design Studio candidate `eb9e1aa` complete the new Parallax Index brief
reliably where baseline `f1b5625` does not, without losing efficiency or adding
unsupported copy?

## Fixed execution

- B is baseline `f1b5625`; C is candidate `eb9e1aa`.
- Each condition gets two attempts. A stored seed selects the starting condition;
  B and C then alternate.
- Exact model: `claude-sonnet-5`.
- Per run: US$2, 60 turns, and 1,200 seconds maximum. Total cap: US$8.
- Available tools: exactly `Read`, `Write`, and `Edit`.
- Restricted and safe modes, empty settings sources, empty MCP configuration,
  no session persistence, and no shell or web/network tool access.
- `bench/` and `evals/` are excluded from both skill payloads.
- Every run starts outside the repository with identical immutable prompt, brief,
  and assets; only the pinned skill payload differs.

`prepare` seals the protocol, both payloads, seeded plan, and four input trees.
`run` refuses changed evidence and requires both paid-execution flags.

## Functional evidence

Local Chrome/Playwright checks desktop, mobile, reduced-motion, and no-JavaScript
profiles while blocking non-local requests. JavaScript profiles must request
exactly the three supplied assets. The WebGL context, module-origin call stack,
draw calls, visible canvas, and captured pixels must identify the same canvas.
Desktop and mobile require non-background pixels and visible change across two
scroll positions. Instrumented `uProgress` writes must span those positions,
separating scroll causality from the viewer's time drift. Reduced motion must
remain visually and parametrically stable.

The evaluator verifies exact visible copy, no additions or duplicates, metadata,
actions, semantic headings, horizontal overflow, decoded poster, lifecycle state,
live status, and event ordering. `ready` must follow poster decode and first draw.
The `#method` target must contain the exact method copy.

Viewer-module and `scene.json` requests are aborted independently. Each failure
must settle within four seconds only after fallback state, event, decoded visible
poster, exact copy/actions, meaningful anchor, and open-but-operable notes panel
are all present.

The runner may add only `index.html`; all supplied inputs remain immutable.
Harness evidence files are added only after the runner exits. Raw JSON, stderr,
metrics, screenshots, evaluator reports, ledger, and archive hashes are retained.

## Claim gates

The bounded function/efficiency claim passes only when C is 2/2 functional, B is
at most 1/2, C adds no claims, and C's median cost, elapsed time, and turns are
each at most 1.10× B.

Taste is not inferred from functional automation. A taste claim additionally
requires an opaque X/Y review of both attempt pairs, with metrics and condition
labels withheld until reveal. C must win both pairs.
