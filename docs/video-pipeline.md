# Video and promo pipeline

This is the production lane for films about the work: showcase previews, the
LinkedIn and X films, launch reels and GIFs. It is not website motion. The skill
builds pages; this document records how the repository produces and publishes video
with locally run tools, and where a tool requires a paid licence.

Rules that hold for every stage:

- Everything runs on the maker's machine. No hosted inference, rendering or storage
  paid by the owner, and no credentials in files, prompts or posts.
- Tracked media stays under 5 MB (`node tools/check-media-size.mjs`). Finished films
  go to a `media-*` GitHub Release through `node tools/media-archive.mjs --plan`
  then `--apply`, mapped in the launch kit manifest.
- Captions ship with every film, as burned-in text or a sidecar file.

## Stages and tools

| Stage | Tool | Licence | How this repository uses it |
|---|---|---|---|
| Capture a browser run | Playwright recording | Apache-2.0 | `tools/page-proof/record-gallery.mjs` records timed scroll passes; this real-time capture is not frame-deterministic |
| Capture a screen or camera | OBS Studio | GPL-2.0 | Manual capture for talking-head or live demo footage |
| Compose titles and cuts | FFmpeg filters | LGPL, GPL with GPL components | `tools/render-linkedin-promo.mjs` composes the LinkedIn film from captures |
| Compose a video in React | Remotion | [Free for individuals, for-profit organisations with up to three employees and non-profits; other companies need a company licence](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) | Optional route for templated films. `compile-choreography.mjs` can emit a paused, fixed-time GSAP timeline that a frame-by-frame renderer such as Remotion or HyperFrames seeks per frame; the repository itself has no Remotion dependency |
| Voiceover | Qwen3-TTS, run locally | Apache-2.0 | Optional; needs a GPU for comfortable speed. Earlier films used the owner's own avatar-service account |
| Cut silences | Auto-Editor | Unlicense | `auto-editor input.mp4 --margin 0.2sec` before a manual pass |
| Clean and mix audio | Audacity | GPL | Noise reduction, levels, music ducking |
| Slow motion and smoothing | RIFE | MIT | Frame interpolation of sparse captures; check edges for ghosting |
| Captions | Subtitle Edit | MIT | Timing and export of SRT or VTT; burn in with FFmpeg or ship the sidecar |
| Encode and deliver | FFmpeg | LGPL, GPL with GPL components | H.264, `yuv420p`, `+faststart`, poster frame, platform sizes |

## Delivery presets

These commands need an FFmpeg build with `libx264`; burned-in captions also need
the `subtitles` filter (`libass`). The landscape preset fits and pads to 1920×1080;
the square preset deliberately crops. Review that crop before publishing.

```sh
# 1080p landscape, preserve the composition with padding
ffmpeg -i edit.mov \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -c:a aac -b:a 160k out-1080.mp4

# square for feeds
ffmpeg -i edit.mov -vf "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a aac out-square.mp4

# burned-in captions, retain the delivery encoding and streaming header
ffmpeg -i out-1080.mp4 -vf subtitles=captions.srt \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart \
  -c:a copy out-1080-captions.mp4

# poster
ffmpeg -i out-1080.mp4 -ss 00:00:03 -frames:v 1 -q:v 2 poster.jpg
```

## Verification before publishing

- `ffprobe` confirms duration, dimensions, frame rate and audio presence.
- A contact sheet of evenly spaced frames catches flicker and wrong cuts.
- Play the file on a phone and on a desktop browser before uploading.
- Quote measured facts in captions and posts, with their date and limits, as the
  launch kit in `docs/launch/` does.

## Where the lines are

The [stack shelf](../skills/cinematic-scroll/references/stack-shelf.md) covers
libraries that run inside a website. The [bake pipeline](../skills/cinematic-scroll/references/bake-pipeline.md)
covers offline renders that end up scrubbed on a page. This document covers films
about the work. Remotion, OBS, Audacity, Auto-Editor, Subtitle Edit, RIFE and TTS
belong here, not in the skill a visitor's browser ends up running.
