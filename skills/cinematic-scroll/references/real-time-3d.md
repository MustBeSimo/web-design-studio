# Real-time 3D

Use a real-time renderer for requested 3D, camera journeys, lighting, material
response or direct manipulation. Match the scene to the brief and optimize its
cost while preserving the defining interaction.

Before building, name focal geometry, material and light, camera verb, type
hierarchy, motifs, and the hardest transition frame. Borrow renderer lifecycle and
camera structure; derive shape, palette, surfaces, and composition from the brief.

## Match the mechanism to the subject

- **A place:** travel between legible camera stops. Use thresholds, light and
  changes in scale to orient the visitor; keep the camera clear of walls.
- **An object:** hold a useful silhouette, then change viewpoint or expose layers
  to explain construction. Keep nearby text outside the silhouette.
- **A material:** change roughness, transmission or light with a bounded control.
  The two ends should produce visibly different scene states, including paused.
- **A process:** connect a parameter such as density to both the simulation and its
  visible consequence. A changing label alone is not a working interaction.

Choose the mechanism before adapting an example's styling. A museum route need
not inherit brass walls; a product study need not become a floating chrome orb.

## Dependency preflight

Load the actual renderer and hero asset in a minimal browser view before expanding
the scene. Follow transitive module imports, including sibling core files in local
Three.js builds, and keep core and addons on the same version. Inspect the model's
required extensions; configure reachable Draco, Meshopt or KTX2 decoders when used.
Confirm the actual canvas renders the subject in two camera or interaction states.

Repair missing paths, imports or decoders within the task's permitted resources.
If supplied assets are immutable or unavailable, preserve the exact failure and
continue independent work. Report the scene as unfinished; a poster is fallback
evidence, not a working real-time result.

## Scene contract

A complete scene has:

- one renderer and one owned animation loop;
- a capped pixel ratio and a resize path;
- bounded geometry, texture, light, and post-processing costs;
- loading, empty, unsupported, and context-loss states;
- a permanent poster or equivalent static composition;
- disposal of created GPU resources;
- visibility gating for off-screen work;
- reduced-motion behavior that removes automatic camera travel and loops.

Virtual or augmented reality starts only after an explicit visitor action and must
have a conventional page fallback.

## Performance decisions

Start with the smallest scene that proves the idea. Prefer shared geometry and
materials, instancing for repeated objects, compressed assets, limited transparent
layers, and one restrained post-processing chain. Reduce pixel ratio, effects, and
particle counts before removing the content fallback.

Do not infer hardware quality from one browser hint. Use capability checks plus
measured runtime behavior. Pause clocks while hidden so the scene does not jump when
it becomes visible again.

## Camera and scroll

Map scroll progress to intentional camera keyframes or a bounded curve. Keep a clear
focal subject, avoid clipping through geometry, and maintain enough stable time to
read nearby copy. On touch devices, shorten the path or replace it with a sequence of
stable views in normal flow.

## Proof

Verify the poster before renderer initialization and after a simulated failure.
Exercise resize, restored scroll position, context recovery, page visibility, and
cleanup. Use a real device for performance claims; software rendering can prove
layout and error handling but not GPU speed.
