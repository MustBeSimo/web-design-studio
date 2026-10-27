# Promo assets — v2.4.0 "Eleven Worlds"

Media described here now lives in GitHub Release `media-2026-10`, mapped in [docs/launch/2026-10-v3/media-archive-manifest.txt](../../docs/launch/2026-10-v3/media-archive-manifest.txt).

Launch reel for the cinematic-scroll v2.4.0 design system, rendered with the repo's **Remotion**
pipeline (same engine + music as `reel3`). 40s, scored: Hook → the portable skill → the **Wall of
Eleven Worlds** → the doctor gate → CTA. The wall shows the eleven themes as **eleven real,
image-rich brand sites** (`examples/<slug>/`, hero art from the skill's own fal.ai pipeline) — one
token contract, eleven worlds.

| File | Aspect | Use for |
|---|---|---|
| `eleven-worlds-16x9.mp4` | 1920×1080 | **ClawHub** listing · **LinkedIn** feed · **X/Twitter** |
| `eleven-worlds-9x16.mp4` | 1080×1920 | **Instagram** Reels/Stories · TikTok · vertical |
| `eleven-worlds-1x1.mp4`  | 1080×1080 | **Instagram** feed · **LinkedIn** square |
| `eleven-worlds-<aspect>-poster.jpg` | — | Video thumbnail / cover |
| `captions.md` | — | Paste-ready per-platform captions |

H.264 / yuv420p / +faststart, with music (AAC). ~19–22 MB (16:9, 9:16); the 1:1 is the 16:9 master
fit onto a square paper field.

## How it's made (the real pipeline)
1. `tools/promo/gen-theme-heroes.mjs` — fal.ai hero image per theme (FLUX.2).
2. `tools/promo/build-theme-site.mjs` — a token-driven, multi-section site per theme → `examples/<slug>/`.
3. `tools/capture/scroll-capture.mjs` — smooth HTTP-served scroll footage → `video/public/footage/theme-<slug>.mp4`.
4. Remotion comps `ReelV24` / `ReelV24Vertical` (scene `ElevenWorlds` / `VElevenWorlds`) compose the
   wall + reused hook/engine/doctor/CTA scenes + music.

Re-render:
```bash
cd video
npx remotion render src/index.ts ReelV24         ../assets/promo-v2.4.0/eleven-worlds-16x9.mp4 --codec=h264 --crf=18
npx remotion render src/index.ts ReelV24Vertical ../assets/promo-v2.4.0/eleven-worlds-9x16.mp4 --codec=h264 --crf=18
```

## Notes
- The eleven themed sites are live in `examples/` and linked from the live page (`#eleven-systems`) + README.
- Music is the repo's `video/public/music.m4a` (same as reel3); fades out at the end.
