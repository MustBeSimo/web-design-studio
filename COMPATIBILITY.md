# Platform Compatibility & Installation

For current copy-and-paste commands for Claude Code, Cursor, Hermes, Kimi Code,
Gemini CLI and OpenClaw, use [the integration guide](INTEGRATIONS.md).
The version-specific transcripts and instructions below are historical evidence.

This document provides documented installation paths for each platform, with evidence included where terminal transcripts have been recorded.

## Supported Platforms

| Platform | Status | Install Method | Notes |
|----------|--------|-----------------|-------|
| Claude Desktop | ✅ Verified | Upload skill folder | Settings → Capabilities → Skills → Upload |
| Cursor | ✅ Verified | Drop into `.cursor/skills/` | Auto-discovery, no reload required |
| Hermes Agent | ✅ Verified | `git clone` to `~/.hermes/skills/` | Fully compatible; tested June 1, 2026 |
| OpenClaw | ✅ Verified | [ClawHub](https://clawhub.ai): `clawhub install cinematic-scroll` (or `git clone` to `~/.openclaw/workspace/skills/`) | Fully compatible; tested June 1, 2026 |
| skills.sh | 🚀 Target | Registry submission | Primary distribution channel |

---

## Installation Instructions by Platform

### Claude Desktop

**Prerequisites:** Claude Desktop app (latest version)

**Steps:**
1. Download this repository as a ZIP file (or clone it)
2. Open Claude Desktop → Settings → Capabilities → Skills
3. Click **"Upload skill"**
4. Drag the `cinematic-scroll-skill` folder into the upload dialog
5. Confirm

**Verification:**
Open a new chat and try:
```
/describe a boutique hotel website using the Warm Scrapbook aesthetic with pinned chapters, 220vh pins, and title reveals via letter-spacing scrub
```

You should get back a multi-phase response (audit → storyboard → spec → build).

---

### Cursor

**Prerequisites:** Cursor (latest version)

**Steps:**
1. Clone or download this repository to your local machine
2. Locate your Cursor skills directory:
   ```bash
   # On macOS:
   ~/.cursor/skills/

   # On Linux:
   ~/.cursor/skills/

   # On Windows:
   %APPDATA%\Cursor\skills\
   ```
3. Copy the entire `cinematic-scroll-skill` folder into `.cursor/skills/`
4. Restart Cursor (or reload with Cmd+Shift+P → Reload Window)

**Verification:**
Open a new file in Cursor and try:
```
Generate a cinematic scroll site for a luxury real estate brand. Use the Symmetric Monument system. 5 chapters. References: David Chipperfield, minimalism, Italian countryside.
```

Cursor will auto-discover the skill and activate it.

---

---

### Hermes Agent

**Prerequisites:** Hermes Agent CLI (v0.15.1+)  
**Install Hermes:** See [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com)

**Installation (correct method):**
```bash
# Clone the full repository into Hermes skills directory
git clone https://github.com/MustBeSimo/web-design-studio ~/.hermes/skills/cinematic-scroll
```

**Verify installation:**
```bash
hermes chat
# Type: /cinematic-scroll --help
```

**Usage (slash command syntax):**
```bash
hermes chat
# Then in the chat prompt:
/cinematic-scroll Build a minimalist architecture portfolio. Use Symmetric Monument system.
```

**Key findings:**
- ✅ Full repository installs correctly via git clone
- ✅ Skill manifest (SKILL.md) matches Hermes frontmatter spec
- ✅ Skill is discoverable and enabled in skill list
- ✅ Invocation via slash commands (`/cinematic-scroll`) per Hermes spec
- ⚠️ Tested on Hermes v0.15.1 (2026-05-29) via Tailscale VPS

**Integration:** Compatible with Hermes' skill system using standard YAML frontmatter + markdown format.

---

### OpenClaw

**Prerequisites:** OpenClaw (latest version)  
**Install OpenClaw:** See [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)

**Installation from ClawHub:**
```bash
openclaw skills install cinematic-scroll
```

**Verify installation:**
```bash
ls -la ~/.openclaw/workspace/skills/cinematic-scroll/
# Should show: SKILL.md, references/, .clawhubignore
```

Since 3.0.0 the repository root carries no skill file, so a `git:` install of the
whole repository is no longer a skill install; use the ClawHub package above or
`npx skills add MustBeSimo/web-design-studio --agent openclaw`.

**Usage:**
OpenClaw automatically discovers the skill from the workspace directory.

Browse the registry at [clawhub.ai](https://clawhub.ai). ClawHub keeps a version
history per publish, so installs are auditable and pinnable.

#### Publishing a new version (maintainers)

ClawHub uploads the folder you point it at. Publish the tracked text-only bundle,
not the full repository with its website and 3D media:

```bash
# 1. validate bundle shape and version
npm run clawhub:validate

# 2. NVIDIA SkillSpector must pass raw, without a suppression baseline
skillspector scan skills/cinematic-scroll --no-llm

# 3. authenticate (GitHub account ≥ 1 week old) and publish
clawhub login
clawhub skill publish skills/cinematic-scroll --slug cinematic-scroll \
  --name "Web Design Studio" --version <X.Y.Z>

# preview what a sync would do without uploading
clawhub sync --dry-run
```

CLI reference: [github.com/openclaw/clawhub → docs/cli.md](https://github.com/openclaw/clawhub/blob/main/docs/cli.md).

**Key findings:**
- ✅ Full repository installs correctly via git clone
- ✅ SKILL.md (42KB) properly structured for OpenClaw agent contract
- ✅ All reference files and examples included (43 commits)
- ✅ MIT license verified
- ✅ Skill discoverable and ready for invocation

**Tested on:** OpenClaw (June 1, 2026)

**Integration:** Compatible with OpenClaw's skill system using standard YAML frontmatter + markdown format, same as Hermes.

---

## Known Limitations

### Platform-Specific

| Issue | Platform | Workaround |
|-------|----------|-----------|
| Large file uploads may timeout | Claude Desktop | Use web version (claude.ai) or Cursor instead |
| Asset paths require relative URLs | All | Ensure generated files use `./assets/` not `/assets/` |
| Mode B requires Node.js 18+ | Hermes/OpenClaw | Update Node version or use Mode A (vanilla HTML) |
| IMAGE-SPEC.md requires fal.ai key | All | Optional; use CSS-only visuals without it |

### Feature Availability

| Feature | Status | Notes |
|---------|--------|-------|
| Mode A (vanilla HTML) | ✅ All platforms | Self-contained, no build required |
| Mode B (Next.js template) | ✅ All platforms | Requires Node.js locally |
| AI image generation | ⚠️ Opt-in | Requires fal.ai account and API key |
| 11 visual systems | ✅ All platforms | See `references/film-archetypes.md` + `themes/` |
| DTCG design tokens | ✅ All platforms | `design.md` + `tokens/`; zero-dep build pipeline |
| 10 live examples | ✅ Reference only | Cannot be directly modified via skill invocation |
| Custom CSS-only render | ✅ All platforms | Default fallback if no images provided |

---

## Troubleshooting

### "Skill not found" error

**Hermes:**
```bash
# Clear the skill cache
hermes skills clear-cache

# Reinstall
npx skills add MustBeSimo/web-design-studio --agent hermes-agent
```

**OpenClaw:**
```bash
# Check registry connectivity, then reinstall
openclaw skills install cinematic-scroll
```

### "SKILL.md not found" error

Each installable folder is `skills/<name>/` in the repository (`cinematic-scroll`,
`scroll-audit`, `launch-page-strategy`). Each contains its own `SKILL.md` and
`references/` and nothing else is required. The repository root intentionally has
no skill file: installing or cloning the root into a skills directory produces a
toolkit checkout, not a skill. Reinstall with `npx skills add MustBeSimo/web-design-studio`
or `npx cinematic-scroll-skill`.

### Agent produces broken HTML

This usually means `references/scroll-patterns.md` or `references/taste-guardrails.md` isn't accessible. Verify:
```bash
ls -la ./references/
# Should show:
# film-archetypes.md
# scroll-patterns.md
# taste-guardrails.md
# performance-budget.md
```

### Generated images don't load

This is normal if you haven't provided an `fal.ai` API key. The system falls back to CSS-only rendering. To use generated images:

1. Get a key at [fal.ai](https://fal.ai)
2. Set it in the agent environment: `FAL_KEY=your_key_here`
3. Re-trigger the generation

---

## Version Compatibility

| Skill version | Release | Notes |
|---|---|---|
| **v3.0.0 (current)** | 2026-10-27 | Three-skill collection (`cinematic-scroll`, `scroll-audit`, `launch-page-strategy`). The root `SKILL.md` is removed so `npx skills add` installs the 30 KB `skills/cinematic-scroll/` folder instead of the whole repository; promo media moved to the `media-2026-10` GitHub Release; the npm package is a dependency-free installer. Breaking: a git clone into `~/.claude/skills/cinematic-scroll` no longer acts as a skill. |
| **v2.6.1** | 2026-06 | Craft hygiene (from a full-app QA audit): a new advisory `cinematic-doctor` **hygiene** check (weight 0 — never affects the score) flagging dead CSS classes, dead JS attribute-branches, and the `file://` hazard of external local `<script src>`; plus taste-guardrails **1.12** (no dead code) & **1.13** (single-file must be self-contained & `file://`-safe). No score/behaviour change to existing builds. |
| **v2.6.0** | 2026-06 | **Learn mode — the Pattern Compiler (Phase 1).** `Learn [URL]` distills sites you own/are authorized to study into original, IR-validated recipes on a pointer-first learned shelf (`references/learned/`), behind an enforced originality firewall. Ships the compiler core: the Pattern-IR gate (`references/pattern-ir.md`), four zero-dep tools (`tools/learn/`: validate-ir · sync-manifest · check-pointers · surface-dedup), four canon pointer hosts (incl. new `references/visual-systems.md`), a shared `references/detection-pipeline.md` extracted from audit mode, and learned-shelf integrity in CI. Tag/keyword dedup only (no embeddings); reuse telemetry + semantic scoring land in Phases 2–4. |
| **v2.5.5** | 2026-06 | Version realignment (2.5.1 → 2.5.5) across the version quad (`package.json` · `manifest.json` · `SKILL.md` · `plugin.json`) and the clawhub export. No shipped skill-content changes; promo-video tooling fixes (Remotion footage anchored to scene starts; aspect-aware 16:9/9:16 showcase) live in `video/`, which is not packaged. |
| **v2.5.1** | 2026-06 | Distribution fixes: `npx` install now ships `tools/` (the cinematic-doctor quality gate), `ASSETS-3D.md`, `FRAME.md` & `REVIEW.md` (were missing → SKILL.md referenced absent files); Claude Code `plugin.json` version realigned (was stale at 2.1.0); version sync widened to a quad (+ `plugin.json`) with an installer-payload completeness guard. Live demo rebuilt as a circular WebGL flythrough (gyroscope-steerable, glassmorphic). |
| **v2.5.0** | 2026-06 | Asset Direction (Phase 1.5, `references/asset-direction.md`) + the Wow Gate (`references/wow-gate.md`) — world-before-layout direction that makes the wow reproducible; three scroll-scrubbed 3D fly-through examples (gallery / jungle / AUREUS); HeyGen avatar-walkthrough tooling (`tools/heygen/`) |
| **v2.4.0** | 2026-06 | DTCG design-token contract (`design.md` + `tokens/`), zero-dep token build pipeline, 11 machine-readable visual-system themes, named component library (Mode A + Mode B), evals + browser-gated runtime smoke in CI, adversarial self-review (`REVIEW.md`) |
| **v2.3.5** | 2026-06 | Security-audit fixes; distribution/packaging reconciliation |
| **v2.1.0** | 2026-06-02 | Mobile-ready touch-safe scroll-coupled motion, deferred-GSAP showcase beats in the examples, and reconciled distribution packaging |
| **v2.0.0** | Prior | Contract baseline; 5-phase pipeline, taste constraints, 7 visual systems — superseded by v2.1.0 |
| **v0.1.2** | 2026-06-01 | Prior public release; corrected README GSAP documentation and softened platform verification claims |
| **v0.1.1** | 2026-06-01 | Initial open-source release; 5 live examples, all platforms supported |

**Current recommendation:** Use v2.6.1 for all new installations.

---

## What's Next

After installation, see:
- **`README.md`** for quickstart examples
- **`examples/PROMPTS.md`** for 20+ copy-paste prompts
- **`references/film-archetypes.md`** for visual system deep-dives
- **`SKILL.md`** for the full agent contract (if you're integrating programmatically)

For help, open an issue on [GitHub](https://github.com/MustBeSimo/web-design-studio).
