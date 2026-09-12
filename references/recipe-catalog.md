# Recipe catalog

Read this catalog once, choose the primary experience, and open only its recipe.
Use additional rows as source code to inspect when that mechanism is actually part
of the brief. Copy behavior and lifecycle contracts; replace the example's subject,
copy, palette, typography, assets, and composition with the project's own.

## Starting routes

| Primary experience | Recipe | Best starting source | Dependencies | Mobile / static |
|---|---|---|---|---|
| Image-led campaign, portfolio, or longread | [Editorial story](recipes/editorial-story.md) | `examples/renaissance/index.html` for alternating image/copy chapters; `examples/v3-flagship/` for a compact interactive study | No JS library; Renaissance loads optional Google Fonts, so substitute local/system fonts for offline use | Natural reading flow; images and controls remain usable without motion |
| Launch, product detail, or mechanism reveal | [Product reveal](recipes/product-reveal.md) | `examples/luxe/index.html` for one state shared across the story; `examples/kern-calibration/` for scrubbed media | Luxe: none. KERN: one local MP4; optional generation is separate | Stable product plate or poster, stacked evidence, same action |
| GLB, procedural object, orbit, or camera flight | [Real-time 3D](recipes/real-time-3d.md) | `examples/crystalline-monolith/index.html` for procedural Three.js; `examples/flagship/` or `templates/nextjs/components/flagship/` for GLB loading | One consistent Three.js version; GLTFLoader plus matching decoders when the asset needs them | Permanent poster; bounded/static scene for reduced motion and low capability |

## Mechanism shelf

| Need | Reuse | Adapt | Dependency and fallback |
|---|---|---|---|
| Pinned chapter with readable reveal | `components/mode-a/pinned-reveal.html` or `components/mode-b/pinned-reveal.tsx` | Pin distance, copy rhythm, focal asset | Existing GSAP in the component; free-flow readable section |
| Multi-plane hero | `hero-parallax` component | Crops, depth ratios, focal point | Existing component dependency; two layers on narrow screens, still frame for reduced motion |
| Image/object depth card | `depth-figure` component | Image, caption, restrained depth | Tilt only for hover/fine pointer; flat card otherwise |
| Product card response | `tilt-card` component | Surface material and information hierarchy | Flat focusable card on touch/reduced motion |
| Atmosphere or chapter color change | `morph-background` component | Two brand-derived grounds and contrast scrim | Crossfade layers; first ground is the static state |
| Collection or archive | `horizontal-gallery` component | Card widths, labels, sequence | Sticky translation on capable desktop; native horizontal overflow otherwise |
| Frame-accurate product/media reveal | `scrub-video` component; `examples/kern-calibration/` | Clip, poster, hold points, captions | Local scrub-ready media; poster when decode, JS, or motion is unavailable |
| Expressive heading | `kinetic-headline` component | Split unit and type rhythm | Plain semantic heading is always present |
| Shared scroll/pointer signals | `runtime/index.mjs`; React adapter in `runtime/react.tsx` | Subscribe one signature interaction | No Three.js dependency in core; dispose every subscription |
| Text, proximity, shader media | `examples/effects-lab/`; `runtime/effects.mjs` | Select one response that reinforces the subject | Quality setting plus readable non-effect state |
| Procedural WebGL object | `examples/crystalline-monolith/index.html` | Geometry, material, lighting, camera path | Pinned Three.js/import-map versions; CSS/poster fallback |
| GLB product/world/figure | `examples/flagship/main.js`; `runtime/assets.tsx` | Manifest path, framing, animation clips | GLTFLoader and asset-specific Draco/Meshopt/KTX2 support; procedural/poster fallback |

## Selection rules

- Use the project's installed animation/rendering stack when it can express the
  mechanism. Add a dependency only when the signature moment needs it.
- Reuse one complete clock/lifecycle pattern rather than mixing loops from examples.
- Start with supplied assets. Record each asset's purpose, focal crop, intrinsic
  size, loading priority, and fallback.
- Use optional deep references only for a concrete issue: `references/mobile-motion.md`
  for a difficult touch composition, `references/interaction-runtime.md` for shared
  signals/effects, and `references/3d-stack.md` for uncommon loader or GPU details.
