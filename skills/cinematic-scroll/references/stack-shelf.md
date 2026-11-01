# Stack shelf

Use this shelf when the brief or the host project names a library, engine, editor
or production tool. It says what job each one does in a cinematic page, how it fits
the rules in the recipes, and what to check before relying on it. It does not replace
a recipe and it never installs anything: this skill ships text only, and every tool
below runs on the visitor's device or on the maker's own machine.

Rules that apply to every row:

- The host project's existing stack wins. Add a library only when the signature
  moment needs it, and never add a second scroll clock or a second smoothing layer.
- One owner per animated property. A library that animates a property owns it;
  wrappers separate entrance, parallax and pointer response.
- Every mechanism keeps the reduced-motion, coarse-pointer, failure and
  no-JavaScript states described in the recipes. A library does not change that.
- Licence and maintenance facts were read from the projects' repositories and npm
  on 2026-11-01. Re-check before advising a client, and name the licence in the
  handoff when it is not MIT, ISC, BSD or Apache.

## Scroll and timeline clocks

One clock per page. Pick the one the host already has.

| Library | Job in a cinematic page | Integration rule | Licence and status | Static or failure state |
|---|---|---|---|---|
| GSAP with ScrollTrigger (`gsap`) | Timeline and scroll clock when the host uses it; `gsap.matchMedia()` carries the reduced-motion and pointer gates; `useGSAP` in React | Register plugins once; `invalidateOnRefresh`; revert the matchMedia context on teardown | [GSAP Standard License](https://gsap.com/community/standard-license/): no charge for ordinary commercial sites, with restrictions on competing visual animation builders; not open source. Use the dependency, do not vendor its source into this skill | Final composition in normal flow |
| Motion (`motion`, formerly Framer Motion) | `scroll()` and `useScroll` for progress, springs for micro-interactions | Do not run Motion scroll and ScrollTrigger on the same property; springs stay bounded and respect `useReducedMotion` | MIT, active | Same |
| Anime.js 4 (`animejs`) | `animate`, `createTimeline` and the `onScroll` observer for hosts using Anime.js | Same one-clock rule; `onScroll({ sync: true })` for scrubbing | MIT; [4.5.0 published June 2026](https://registry.npmjs.org/animejs) | Same |
| [Lenis](https://github.com/darkroomengineering/lenis) (`lenis`) | Smooth scrolling | Use one RAF driver: `autoRaf` or the host ticker, never both; `lenis.raf()` takes milliseconds (GSAP ticker time is seconds). Forward scroll to the page clock; disable smoothing under reduced motion and on native touch | MIT, active | Native scroll |
| Theatre.js (`@theatre/core`, `@theatre/studio`) | Visual keyframe authoring and runtime playback | [Load exported state with core](https://www.theatrejs.com/docs/latest/getting-started/with-html-svg); map page progress to `sheet.sequence.position`. Keep studio out of production; no independent playback clock for a scrubbed sequence | [Core: Apache-2.0](https://github.com/theatre-js/theatre/blob/main/packages/core/package.json); [studio: AGPL-3.0-only](https://github.com/theatre-js/theatre/blob/main/packages/studio/package.json). Published 0.7.2 in May 2024; check compatibility before adopting | Static composition; core may ship, studio does not |

## Vector, 2D and designer-authored motion

| Library | Job | Integration rule | Licence and status | Static or failure state |
|---|---|---|---|---|
| Two.js (`two.js`) | Animated vector scenes on SVG, canvas or WebGL | Drive it from the page clock; keep copy in the DOM, not in the scene | MIT, active | Static SVG of the same scene |
| D3 (`d3`) | Data-driven graphics in editorial and data stories | Use its scales and shapes; let the page clock own timing when the chart is part of a scroll sequence | ISC, active | Static SVG with the same data and labels |
| Rive (`@rive-app/canvas`, `@rive-app/webgl2`) | Designer-authored characters and state machines | One canvas per visible item; pause when off screen; reduced motion pauses on a readable frame | MIT runtime, active; the editor is a separate product with its own terms | Poster image or inline SVG |
| dotLottie (`@lottiefiles/dotlottie-web`) | Lottie and dotLottie playback | Same rules as Rive; no decoration-only infinite loops; pause under reduced motion | MIT, active | Poster image |
| mo.js (`@mojs/core`) | Shape bursts | Only when the host already uses it; otherwise bursts are a bounded Motion or GSAP tween | MIT; last release 2023, CoffeeScript codebase | None needed, decoration only |

## Real-time 3D and shaders

The [real-time 3D](real-time-3d.md) scene contract applies to every row.

| Library | Job | Integration rule | Licence and status | Static or failure state |
|---|---|---|---|---|
| Three.js (`three`) | Default renderer for geometry, materials and camera travel | Pin core and addons to one version; preflight decoders | MIT, active | Permanent poster |
| React Three Fiber and Drei (`@react-three/fiber`, `@react-three/drei`) | React adapters, helpers, `ScrollControls` | Same contract; one renderer per page | MIT, active | Permanent poster |
| Babylon.js (`@babylonjs/core`) | Alternative engine | Keep it when the host uses it; apply the same scene contract; never two renderers on one page | Apache-2.0, active | Permanent poster |
| Spark (`@sparkjsdev/spark`) | Gaussian splats as a Three.js object | See [splat scene](splat-scene.md) | MIT, active, by World Labs | Poster from the capture |
| Custom Shader Material (`three-custom-shader-material`) | Inject GLSL into lit Three materials | One deliberate colour-space and tone-mapping pipeline; bound displacement | MIT; last release October 2025 | Base material without the injection |
| lygia | Shader snippet library | Flag the licence before use on a commercial site | [Prosperity Public License 3.0](https://github.com/patriciogonzalezvivo/lygia/blob/main/LICENSE.md): free for noncommercial use, a thirty-day commercial trial, then a commercial licence | Not applicable |
| WebGPU and TSL | Separate experimental implementation | Own materials and an automatic WebGL2 fallback, as in the [motion toolkit](motion-toolkit.md) | Part of Three.js | WebGL2 path, then poster |
| cables.gl | Node-based visual authoring; exports a JavaScript patch | Treat the export as a renderer: poster, failure state, one owned loop, measured bundle size | Editor repository MIT; small community | Poster |

## Physics

| Library | Job | Integration rule | Licence and status | Static or failure state |
|---|---|---|---|---|
| Rapier (`@dimforge/rapier3d-compat`, `@dimforge/rapier2d-compat`) | Real-time 2D and 3D physics in WebAssembly | [Fixed simulation steps](https://rapier.rs/docs/user_guides/javascript/integration_parameters/) with bounded catch-up in the owned render loop; pause off screen and reset elapsed time on resume. Bake/cache states for reversible scroll; reverse scrolling cannot undo a live simulation | Apache-2.0, active; the old `rapier.js` repository is archived and the bindings now live in the `dimforge/rapier` repository | Settled composition |
| Matter.js (`matter-js`) | 2D physics for playful layouts | Same rules | MIT, active | Settled composition |
| Taichi, SPlisHSPlasH | Offline fluid, foam and particle simulation in Python and C++ | Not browser libraries: bake their output with the [bake pipeline](bake-pipeline.md) | Apache-2.0 and MIT | Poster or scrubbed sequence |

## Asset and production pipeline

| Tool | Job | Where it fits | Licence and status |
|---|---|---|---|
| Blender, glTF Transform, Draco, KTX2 | Model preparation and compression | Dependency preflight in [real-time 3D](real-time-3d.md) | Blender: GPL; glTF Transform: MIT; [Draco: Apache-2.0](https://github.com/google/draco/blob/main/LICENSE). KTX2 is a format; [KTX-Software is primarily Apache-2.0 with additional component licences](https://github.com/KhronosGroup/KTX-Software/blob/main/LICENSE.md) |
| FFmpeg | Encoding frames and clips for scrubbing, posters, previews | [Bake pipeline](bake-pipeline.md) | LGPL, GPL when built with GPL components; run it as a tool, never bundle it |
| RIFE | Frame interpolation for sparse renders | [Bake pipeline](bake-pipeline.md) | MIT, Python |
| OpenToonz | Hand-drawn frames | [Bake pipeline](bake-pipeline.md) | BSD-style licence; desktop application |
| Remotion | Programmatic video from React | The repository's [video pipeline](https://github.com/MustBeSimo/web-design-studio/blob/main/docs/video-pipeline.md), outside this installed skill | [Free for individuals, for-profit organisations with up to three employees and non-profits; other companies need a company licence](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) |
| OBS Studio, Audacity, Auto-Editor, Subtitle Edit, Qwen3-TTS | Capture, audio, silence cuts, captions, voice | Same video pipeline document | GPL, GPL, Unlicense, MIT, Apache-2.0 |

## Words that point here

| The brief says | Read |
|---|---|
| Splat, scan, point cloud, photoreal room, captured object | [Splat scene](splat-scene.md) after checking the capture format; a plain point cloud needs a point renderer or conversion |
| Fluid, smoke, cloth, particles rendered offline, hand-drawn frames, image sequence from a simulation | [Bake pipeline](bake-pipeline.md) |
| Lottie, Rive, After Effects export, mascot, animated icon set | Vector and designer-authored motion above |
| Smooth scroll, scroll jacking, momentum | Lenis row, then the one-clock rule |
| Physics, bouncing, gravity, collisions | Physics above |
| Promo film, reel, launch video, voiceover, captions | [Video pipeline in the full repository](https://github.com/MustBeSimo/web-design-studio/blob/main/docs/video-pipeline.md); not a file shipped with this skill |
