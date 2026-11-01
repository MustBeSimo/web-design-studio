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
| Exact frame selection within a measured decode-memory budget | Image sequence drawn on a canvas | None; bounded frame cache | Permanent poster |
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

RIFE ([ECCV2022-RIFE](https://github.com/hzwer/ECCV2022-RIFE), MIT, Python) doubles
the frame rate of a sparse video with `--exp=1`. Check hard edges and thin lines for ghosting before keeping the result,
and keep the original frames. Interpolation cannot repair a camera path that was
too fast to read; shorten the move instead.

## Encode with FFmpeg

Scrubbing benefits from frequent keyframes; it does not require every frame to be
a keyframe. Start with a short GOP (15 frames at 30 fps below), then compare seek
latency and bytes on target devices. Use `-g 1` only when its larger download buys
a measured improvement. Use the source frame rate in place of 30.
The commands require `libx264`, plus `libvpx-vp9` and `libwebp` for the optional
WebM and WebP outputs; check the installed build with `ffmpeg -encoders`.

```sh
# scrub clip: keyframe at most every half-second, no audio, streaming header first
ffmpeg -framerate 30 -i frame_%04d.png -c:v libx264 -g 15 -crf 20 \
  -pix_fmt yuv420p -movflags +faststart -an scrub.mp4

# alternative codec for browsers that prefer it
ffmpeg -framerate 30 -i frame_%04d.png -c:v libvpx-vp9 -g 15 -b:v 0 -crf 32 -an scrub.webm

# poster from a readable frame
ffmpeg -i scrub.mp4 -ss 00:00:02.000 -frames:v 1 -q:v 2 poster.jpg

# canvas sequence at a bounded width
ffmpeg -framerate 30 -i frame_%04d.png -vf "scale='min(960,iw)':-2" \
  -c:v libwebp -quality 80 seq_%04d.webp
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
  on phones, before decoder and GPU overhead. Decode near the current frame into a
  bounded cache and release evicted bitmaps. Fewer frames or a video is usually the
  right answer.
- Network: load the scrub clip after the poster and copy are visible, and only when
  the mechanism will actually run. Verify byte-range responses (`206` with
  `Content-Range`) and seeking on the deployed URL, not just a local file.

## Integrate under the recipe rules

- The poster is in the document before any script runs and stays behind the stage.
- Wait for metadata and one decoded frame (`loadeddata`/`canplay`, `readyState >= 2`)
  before seeking. Coalesce scroll, resize and restored-position updates into one
  `requestAnimationFrame`; keep only the latest requested time while a seek is in
  flight and apply it on `seeked`. Clamp to the last frame, below `duration`.
  [`requestVideoFrameCallback`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
  observes decoded frames; it must not be the only driver of seeks in a paused
  video, because no new frame arrives until a seek starts.
- Scroll progress maps to time or frame index with one owner, reversible, and holds
  still while nearby copy must be read.
- Failure of the clip, the frames or the decoder leaves the poster and all copy.
- Cancel owned callbacks, remove listeners and release media/cache resources when
  the mechanism becomes ineligible or unmounts.

## Proof

Confirm the poster alone in a browser with scripting disabled. Confirm seeking at
three scroll depths and in reverse, after a resize and after a reload at a restored
scroll position. Confirm the coarse-pointer and reduced-motion states show the
intended stills. Record the measured clip size and decode behaviour on one real
mobile device; emulation proves layout, not performance.
