# Splat scene

Use Gaussian splats when the subject is a real, captured place or object and the
brief supplies a capture or can produce one. A splat scene is photoreal from the
viewpoints that were captured and falls apart away from them, so the camera path is
the design. Everything in the [real-time 3D](real-time-3d.md) scene contract applies.

## Renderer

Spark (`@sparkjsdev/spark`, MIT, maintained by World Labs) renders splats as a
Three.js object, so the existing renderer, camera and lifecycle stay in charge:

```js
import { SplatMesh } from "@sparkjsdev/spark";

const room = new SplatMesh({ url: "/captures/room.spz" });
scene.add(room);
```

Supported inputs include PLY, compressed PLY, SPZ, SPLAT, KSPLAT and SOG. It targets
WebGL2 and its documentation pairs it with recent Three.js releases; pin Spark and
Three.js together and preflight the actual capture in a minimal page before building
the chapters.

## Capture and asset rules

- Prefer compressed formats such as SPZ or SOG and state the file size in the
  handoff. Measure, do not assume: a hero capture is often tens of megabytes, which
  decides whether it loads before or after the visitor reaches the chapter.
- Record provenance: who captured it, where, and whether people, interiors or
  artworks in it need consent or a licence.
- Export a poster from the capture itself at the opening camera stop. The poster is
  in the document before any script runs.

## Camera design

- Choose camera stops inside the captured volume and near the capture trajectory.
  Test each stop; a view that shows floating fragments or holes is outside the data.
- Map scroll progress to a bounded path between stops, with enough stable time at
  each stop to read the copy beside it.
- On coarse pointers shorten the path or replace it with a sequence of stable views
  in normal flow. Reduced motion shows the stable views and no automatic travel.

## Performance

- Cap the pixel ratio and measure frame time on a real device; splat sorting and
  overdraw cost more than most meshes of similar visual weight.
- Load the capture only when the chapter approaches, after poster and copy exist.
- Sleep the render loop off screen and when the page is hidden; dispose the splat
  mesh and renderer resources on teardown.

## Proof

- Two camera stops render visibly different frames, in forward and reverse scroll.
- Blocking the capture URL, the Spark module and WebGL each leaves the poster, all
  copy and the page's explicit failure state.
- Resize, restored scroll position, context loss and page visibility behave.
- One real mobile device confirms load time and frame rate; emulation does not.
