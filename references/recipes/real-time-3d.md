# Real-time 3D recipe

Use when the brief requires a GLB, procedural object, orbit, exploded assembly, or
camera flight. `examples/crystalline-monolith/index.html` is the lean procedural
Three.js reference. `examples/flagship/main.js`, `runtime/assets.tsx`, and the
Next.js flagship chapters show real GLB loading. Keep all Three.js core, addons,
React bindings, and decoders on compatible versions.

## Diagnose the reference before adapting it

The crystalline monolith coordinates silhouette, refractive material, core light,
and camera crane while copy stays outside the object. The flagship uses scale,
light, and camera stops to separate movements. Retain the coordination between
focal geometry, material/light, camera verb, type hierarchy, and readable hold.
Replace every reference-specific shape, palette, surface, and motif from the brief.

## Prove the asset path first

Before composing the page, make a minimal visible scene with the intended canvas,
camera, one light/environment, and the actual asset.

1. Confirm WebGL creation and show a visible loading/error state over a permanent
   poster. Serve module imports and local assets over HTTP.
2. For GLB, inspect compression/extensions and configure only what it requires:
   `GLTFLoader`; a reachable `DRACOLoader` path for Draco; `MeshoptDecoder` for
   Meshopt; and `KTX2Loader.detectSupport(renderer)` plus a reachable transcoder for
   KTX2. A successful network response does not prove decoding or rendering.
3. Frame the loaded bounds, render, and assert that the canvas contains a non-empty
   result before adding scroll choreography. Surface loader/decoder errors with the
   failed URL. Do not let an indefinite loader cover the page.
4. If the supplied asset is broken, repair an in-scope path/version/decoder issue
   and retest. Keep the poster and report the asset failure if it cannot be repaired.

For standalone Three.js, adapt the pinned import map and renderer lifecycle in
`examples/crystalline-monolith/index.html`. For an installed React Three Fiber app,
reuse its versions and inspect `runtime/assets.tsx`; for a new routed 3D app, begin
from `templates/nextjs/` and its self-hosted `public/draco/` decoder.

## Build the signature camera or object change

Define the subject and verb precisely: orbit the housing, separate the layers,
enter the gallery, or follow a route. Map one scroll progress value to camera pose,
object state, and supporting labels. Interpolate camera position and look target
together, avoid clipping through geometry, and include a readable hold. Pointer
input may add bounded local response; it must not fight scroll or keyboard controls.

Cap pixel ratio, shadows, post effects, particle count, and texture size. Pause the
render loop while hidden/off-screen and when the scene is settled if possible.
Handle resize and context loss; dispose owned geometry, materials, textures,
controls, decoders, observers, and listeners. Preserve shared cached resources.

## Responsive and fallback states

- Desktop/capable: the requested scene and full signature movement.
- Narrow/coarse pointer: a bounded renderer or authored poster/sequence with the
  same explanation and natural document flow; keep real 3D when it remains usable.
- Reduced motion: a deliberate static camera and explicit controls if interaction
  is essential; no scroll camera, autoplay, or continuous ambient loop.
- WebGL, import, decoder, texture, or context failure: permanent poster, readable
  copy, and primary action. The failure state must not claim that 3D succeeded.

## Acceptance checks

- The actual supplied model renders, not only a placeholder or poster.
- The requested camera/object transformation is visible, reversible, and framed at
  opening, midpoint, hold, and exit without blank canvas or clipping.
- Core and addon requests share compatible versions; required decoder/transcoder
  assets load and decode successfully.
- Resize, restored scroll, tab visibility, context loss, reduced motion, narrow
  layout, and asset failure all produce bounded behavior.
- The poster is intentional and permanent, while verification distinguishes it
  from successful real-time rendering.
