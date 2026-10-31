# Scrub video

Also called scroll-to-seek or a scroll-controlled video timeline. Use silent
footage to reinforce information also present in the page's copy.

```sh
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/scrub-video.json
```

```tsx
import ScrubVideo from '@/components/scrub-video';

<ScrubVideo src="/media/product.mp4" poster="/media/product-poster.webp"
  label="Side view of the product" title="Your verified product explanation" />
```

Required: `src`, `poster`, `label`. Optional: `eyebrow`, `title`, `trackVh` (3.2 by
default, clamped to 1.5–8), `className`, `style`. Custom properties:
`--wds-caption-padding` and `--wds-track-height`.

Only a fine-hover desktop wider than 768px with motion allowed loads the video.
A decoded frame activates the sticky stage. Scroll and resize schedule at most
one animation frame to seek; there is no autoplay or continuous seek loop. Encode
a seek-friendly MP4 with frequent keyframes and test the actual asset on Safari.

The poster stays in the DOM beneath the video. Failed loading returns the entire
section to natural flow. Narrow/coarse-pointer/reduced-motion and no-JS states
show the poster and caption without a long empty track. Live preference changes
cancel pending work and release the media source. All listeners and pending frames
are disposed on source changes and unmount. No package beyond the host React.
