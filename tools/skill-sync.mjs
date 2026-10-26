#!/usr/bin/env node
/**
 * skill-sync.mjs — keep the per-tool SKILL.md POINTER stubs in lockstep from one source.
 *
 * .codex/ and .cursor/ ship a small pointer (NOT a copy) that redirects to the canonical
 * root SKILL.md and lists deep references. This generates both from a single template so a
 * description/reference change can't drift between tools.
 *
 *   node tools/skill-sync.mjs            # write both stubs
 *   node tools/skill-sync.mjs --check    # verify both match (exit 1 on drift) — for CI
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = [".codex/skills/cinematic-scroll/SKILL.md", ".cursor/skills/cinematic-scroll/SKILL.md"];

// Single source of truth for the stub (root-relative paths use ../../../ from the stub).
const CANONICAL = "skills/cinematic-scroll/SKILL.md";
const DESCRIPTION = (readFileSync(join(ROOT, CANONICAL), "utf8").match(/^description:\s*(.+)$/m) || [])[1];
if (!DESCRIPTION) throw new Error("Canonical skill description is missing");

const STUB = `---
name: cinematic-scroll
description: ${DESCRIPTION}
---

# cinematic-scroll (pointer)

The \`cinematic-scroll\` skill gives an agent the taste to build cinematic,
scroll-driven websites: pinned chapters, hero/multi-depth parallax, scroll-linked
3D tilt and camera moves, and environment-morphing backgrounds — from a single
self-contained \`.html\` section (Mode A) to a full Next.js release site with
optional AI-generated visuals (Mode B). Reach for it whenever the user asks for a
scroll-driven or cinematic site, pinned/sticky sections, parallax, a product
story page, an editorial microsite, or a release/launch/drop page.

**Canonical instructions: [\`../../../skills/cinematic-scroll/SKILL.md\`](../../../skills/cinematic-scroll/SKILL.md)**
— the skill contract. Read it in full before building. This file is only a
pointer; do not duplicate its content. Companion skills live beside it:
\`../../../skills/scroll-audit/\` and \`../../../skills/launch-page-strategy/\`.

Skill references (\`../../../skills/cinematic-scroll/references/\`):

- [\`recipe-catalog.md\`](../../../skills/cinematic-scroll/references/recipe-catalog.md) — choose one recipe
- [\`editorial-story.md\`](../../../skills/cinematic-scroll/references/editorial-story.md), [\`product-reveal.md\`](../../../skills/cinematic-scroll/references/product-reveal.md), [\`real-time-3d.md\`](../../../skills/cinematic-scroll/references/real-time-3d.md) — the three recipes
- [\`motion-toolkit.md\`](../../../skills/cinematic-scroll/references/motion-toolkit.md) — interaction patterns
- [\`verification.md\`](../../../skills/cinematic-scroll/references/verification.md) — proof checklist

Toolkit (this repository only): the token contract in [\`../../../design.md\`](../../../design.md)
+ [\`../../../tokens/\`](../../../tokens/), 11 visual systems in [\`../../../themes/\`](../../../themes/),
deep references in [\`../../../references/\`](../../../references/), taste rules in
[\`../../../taste-guardrails.md\`](../../../taste-guardrails.md), and prompts in
[\`../../../examples/PROMPTS.md\`](../../../examples/PROMPTS.md).
`;

const check = process.argv.includes("--check");
let drift = 0;
for (const t of TARGETS) {
  const p = join(ROOT, t);
  const cur = existsSync(p) ? readFileSync(p, "utf8") : null;
  if (check) {
    if (cur !== STUB) { drift++; console.error(`✗ ${t} is out of sync — run \`node tools/skill-sync.mjs\``); }
  } else if (cur !== STUB) {
    writeFileSync(p, STUB);
    console.log(`↻ synced ${t}`);
  } else {
    console.log(`= ${t} already in sync`);
  }
}
if (check && drift) process.exit(1);
console.log(check ? `✓ skill-sync: ${TARGETS.length} pointer stubs in sync` : `✓ skill-sync: ${TARGETS.length} pointer stubs written`);
process.exit(0);
