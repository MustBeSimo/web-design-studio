# Product reveal recipe

Use for a launch, object story, feature explanation, before/after comparison, or
mechanism reveal. This recipe is sufficient for a first build. Inspect
`examples/luxe/index.html` only for a missing shared-state detail, or
`examples/kern-calibration/` only when the brief supplies scrub-ready video.

## Diagnose the reference before adapting it

In `examples/luxe/`, one product remains focal while type and empty space control
pace; a shared value changes light, surface, caption, and diagram together. KERN
uses real media and a stable poster. Retain the focal hierarchy and shared
cause-and-effect. Replace their styling with the brief's type contrast, density,
materials, light, emphasis, and midpoint composition.

## Choose the product variable

Find one state that explains the product rather than decorating it: assembly
progress, layer exposure, light angle, material change, calibration, scale, or a
real before/after. Define what the visitor learns at the opening, during the change,
at the hold, and after release. Use CSS/SVG or supplied stills for graphical states;
use video only when real temporal detail matters; use the 3D recipe for a requested
GLB or camera move.

Keep the primary action available independently of the reveal. Preserve supplied
specifications and claims verbatim. Never create a feature, price, endorsement, or
performance number to fill a layout.

## Build the vertical slice

1. Compose one stable product plate with a headline, concise explanation, and
   useful fallback image or authored graphic.
   Default to a relative story track with a `100svh` sticky plate and normal-flow
   copy beats; the plate becomes relative and states stack on mobile/reduced motion.
2. Create one progress function from the real section geometry. Map the product
   variable and supporting labels from it; avoid separate scroll listeners for
   shadow, caption, color, and position.
3. Allocate a visible establish interval, a meaningful transformation, a generous
   readable hold, and a clean release. Direct scroll progress should remain
   reversible; time-based entrances may use easing.
4. Inspect the opening, half-reveal, hold, and reverse path before adding evidence
   sections. The product should be legible at every sampled state.
5. Keep the closed or clearest product state as a permanent base. Change child
   layers without fading the entire plate; at 0%, 33%, 66%, and 100%, a complete
   object-and-copy composition must remain visible.

For a still/SVG treatment, calculate one normalized progress value in a scheduled
animation frame and use it for angle, light, shadow, captions, and diagram. Prefer
this small local clock over multiple observers or experimental scroll timelines.

For scrubbed video, inspect `components/mode-a/scrub-video.html` or the Mode B
equivalent plus `examples/kern-calibration/index.html`. Supply a poster and explicit
dimensions. Confirm metadata loads, duration is finite, seeking changes the visible
frame, and decode failure reveals the poster. A dense-keyframe local encode improves
seeking; optional generation scripts and provider keys are outside the basic recipe.

## Complete the page

Support the reveal with only the evidence the brief provides: detailed crop,
specification, process, provenance, comparison, or use context. Change composition
to fit each evidence type while retaining the same tokens and motifs. Components
such as `depth-figure`, `morph-background`, and `pinned-reveal` are starting code,
not a required checklist.

Mobile uses a shorter transformation or stacked before/after states in natural
flow. Reduced motion shows the clearest explanatory product state. Media or script
failure preserves the product, copy, and action.

## Acceptance checks

- The signature transformation communicates a supplied product fact without narration.
- One shared clock owns the related visual state; reverse scroll retraces it.
- Labels settle long enough to read and never collide with the object.
- Product crop and action remain useful on narrow screens, reduced motion, no JS,
  and failed media.
- The final site reflects the project's typography, palette, density, emphasis,
  materials, and imagery rather than the Luxe or KERN identity.
