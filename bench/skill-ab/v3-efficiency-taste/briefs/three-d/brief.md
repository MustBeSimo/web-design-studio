# Axis 24 — real-time 3D inspection story

Build a self-contained product story for a cast desk object. The supplied GLB is mandatory and must render as live WebGL, not as a poster or simulated CSS shape. The kit includes a dependency-free local GLB viewer and a fallback poster; use only local files.

Create three pinned chapters. Begin with a full-object inspection, move the camera closer to the surface in chapter two, then return to a composed three-quarter view in chapter three. Scroll should control camera position and object rotation. Pointer or touch drag should provide a small inspection movement without fighting scroll. Show a visible loading state. If WebGL, the model, or its viewer fails, replace the canvas with the supplied poster and keep all copy readable. Reduced motion should keep a stable live view when WebGL works and a stable poster otherwise. With JavaScript disabled, show the poster and all copy.

Expose honest machine-readable evidence for this benchmark: set `document.documentElement.dataset.modelState` to `loading`, then `ready` only after the GLB has loaded and the first model frame has rendered; use `fallback` when the poster replaces it. On the live canvas, keep `data-camera-state` updated with the numeric camera position and object rotation. Its value must change between the close-surface and three-quarter chapters.

Use every supplied asset. Keep the supplied wording verbatim and do not add facts.

## Supplied copy

Axis 24

A study in weight and balance

The form begins as one continuous cast.

A shallow ridge marks the point of balance.

The surface is bead-blasted, then sealed by hand.

240 millimetres tall. 1.9 kilograms.

Made in a run of twenty-four.

Inspect the object

Request the material sheet
