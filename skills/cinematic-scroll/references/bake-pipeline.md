# Bake pipeline

Use this when the motion the story needs is produced offline: a fluid, smoke, foam,
cloth or particle simulation from Taichi or SPlisHSPlasH, a rendered camera move
from Blender, hand-drawn frames from OpenToonz, or an export from a motion editor.
The browser never runs the simulator. It receives frames, and the page scrubs or
plays them under the same rules as any other media mechanism.

## Choose the delivery mechanism first

| Need | Mechanism | Dependency | Static state |
|---|---|---|---|
| Scroll drives the sequence on desktop | Scrubbed video, as in [product reveal](product-reveal.md) | None; a `<video>` with a poster | Permanent poster |
| Frame-exact seeking, or touch devices that block programmatic seeks | Image sequence drawn on a canvas | None; preloaded frames | Permanent poster |
| The sequence is atmosphere, not explanation | A short clip that plays once when visible | None | Poster |

Scrubbing needs a fine pointer and motion allowed. Coarse pointers and reduced
motion get the poster or a short sequence of authored stills in normal flow. Keep
copy in the document, never inside the frames.

## Export frames

- Render at the final crop and aspect ratio, so no frame is resized twice.
- Name frames `frame_0001.png` upward and record count, frame rate and dimensions.
- Keep the first, a readable middle and the last frame as poster candidates.
- Record the source tool, the scene file and the licence of any third-party asset.
  Taichi is Apache-2.0 and SPlisHSPlasH is MIT; OpenToonz is a desktop application
  under a BSD-style licence. The licence of the tool does not attach to your frames.

## Interpolate only when it helps

RIFE (`ECCV2022-RIFE`, MIT, Python) doubles the frame rate of a sparse render with
`--exp=1`. Check hard edges and thin lines for ghosting before keeping the result,
and keep the original frames. Interpolation cannot repair a camera path that was
too fast to read; shorten the move instead.

## Encode with FFmpeg

Scrubbing seeks to arbitrary times, so every frame must be independently
decodable. The clip grows, which is why the sequence stays short.

```sh
# scrub clip: every frame is a keyframe, no audio, streaming header first
ffmpeg -framerate 30 -i frame_%04d.png -c:v libx264 -g 1 -crf 20 \
  -pix_fmt yuv420p -movflags +faststart -an scrub.mp4

# alternative codec for browsers that prefer it
ffmpeg -framerate 30 -i frame_%04d.png -c:v libvpx-vp9 -g 1 -b:v 0 -crf 32 -an scrub.webm

# poster from a readable frame
ffmpeg -i scrub.mp4 -ss 00:00:02.000 -frames:v 1 -q:v 2 poster.jpg

# canvas sequence at a bounded width
ffmpeg -i frame_%04d.png -vf scale=960:-2 -quality 80 seq_%04d.webp
```

FFmpeg is LGPL, or GPL when built with GPL components. Run it as a tool during
production; do not bundle it into the site.

## Budget before integrating

- Clip length: a scrubbed sequence reads best between three and eight seconds of
  source footage; longer moves become a film the visitor cannot pace.
- Bytes: this repository tracks nothing over 5 MB; a project sets its own limit and
  states the clip size in the handoff.
- Decoded memory for canvas sequences: frames multiplied by width, height and four
  bytes. Sixty frames at 960 by 540 decode to about 124 MB, which is already heavy
  on phones. Fewer frames or a video is usually the right answer.
- Network: load the scrub clip after the poster and copy are visible, and only when
  the mechanism will actually run.

## Integrate under the recipe rules

- The poster is in the document before any script runs and stays behind the stage.
- Wait for metadata and one decoded frame before the first seek; seek on
  `requestVideoFrameCallback` or a frame callback, never inside the scroll handler.
- Scroll progress maps to time or frame index with one owner, reversible, and holds
  still while nearby copy must be read.
- Failure of the clip, the frames or the decoder leaves the poster and all copy.

## Proof

Confirm the poster alone in a browser with scripting disabled. Confirm seeking at
three scroll depths and in reverse, after a resize and after a reload at a restored
scroll position. Confirm the coarse-pointer and reduced-motion states show the
intended stills. Record the measured clip size and decode behaviour on one real
mobile device; emulation proves layout, not performance.
