# Examples showreel — v2.4.0

Media described here now lives in GitHub Release `media-2026-10`, mapped in [docs/launch/2026-10-v3/media-archive-manifest.txt](../../docs/launch/2026-10-v3/media-archive-manifest.txt).

A cinematic **showreel of the real sites the skill builds, scrolling**. Each shot is an actual
captured scroll-through of an example site, full-frame, with a slow camera push-in, cinematic
letterbox, kinetic brand text, and crossfades — so a viewer *sees* the range of what the skill
produces, in motion. Bookended by the electric-blue brand frame, scored to music. ~34s.

| File | Aspect | Use for |
|---|---|---|
| `showreel-16x9.mp4` | 1920×1080 | ClawHub · LinkedIn · X · YouTube |
| `showreel-16x9-poster.jpg` | — | thumbnail / cover |

Featured (9 shots, curated for range): **Vanta Labs** (Clinical Noir) · **Bloom** (Gen-Z Pop) ·
**Obsidian** (Temporal Monument) · **Atelier Nocturne** (Kinetic Shader) · **Chroma** (Liquid
Chrome) · **Keepsake** (Warm Scrapbook) · **Signal** (Data Cinematic) · **Flagship** (Real 3D /
WebXR) · **Concrete / Orange** (Brutalist Kinetic).

## How it's made
Remotion comp `video/src/Showcase.tsx` composes the captured footage in
`video/public/footage/` (theme-* = the fal.ai brand sites; the rest = the original examples).
Each shot: full-frame `OffthreadVideo` + camera push-in + letterbox + kinetic brand block.

Re-render:
```bash
cd video
npx remotion render src/index.ts Showcase ../assets/examples-showreel/showreel-16x9.mp4 --codec=h264 --crf=18
```

## Notes
- Distinct from `assets/promo-v2.4.0/` (the design-system "wall of worlds" reel). This one is the
  immersive "sites in action" cut.
- 9:16 / 1:1 cuts can be added on request (the shots are landscape footage, so vertical uses a
  centered film band + the brand text stacked).
