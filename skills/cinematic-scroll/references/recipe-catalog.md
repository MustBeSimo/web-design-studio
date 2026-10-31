# Recipe catalog

Choose the primary experience and read only its recipe. Each recipe gives the
minimum complete build shape, dependencies, responsive behavior, and proof points.
It is sufficient for a first build; open optional source only for a concrete gap.

| Experience | Recipe | Mechanism | Dependency | Static state |
|---|---|---|---|---|
| Editorial campaign, portfolio, longread | [Editorial story](editorial-story.md) | A focal image, mask, crop, or diagram changes while copy holds | None required | Image and story in natural reading flow |
| Product launch or explanation | [Product reveal](product-reveal.md) | One product variable drives object, labels, and atmosphere | None for CSS/SVG; local media when real time detail matters | Best explanatory plate or poster |
| GLB, procedural object, orbit, camera flight | [Real-time 3D](real-time-3d.md) | Real geometry and a deliberate camera/object path | Compatible Three.js stack and only the decoders the asset uses | Permanent authored poster |

Useful optional mechanisms include a multi-plane hero, pinned reveal, horizontal
collection, image depth card, scrubbed video, expressive heading, material/light
crossfade, or proximity response. Recreate only the mechanism the story needs.

Use the host project's animation stack. Add a dependency only when the signature
moment requires it. Use one complete clock/lifecycle pattern. Record each supplied
asset's purpose, crop, dimensions, loading priority, and fallback.

The full repository linked in the skill metadata contains executable examples,
components, runtime adapters, and verification tools. They are optional; this
text-only package contains the complete recipes needed to build locally.

## Find a mechanism by name

Users often name an effect rather than an experience. These aliases select a
mechanism inside the existing recipes; they are not extra skills or presets.
Keep the host brand, native scrolling, and readable static content.

| User asks for | Choose | Boundary / fallback |
|---|---|---|
| Entrance reveal, fade-up, staggered section arrival | Editorial story + a bounded entrance | Normal flow; no pin implied; content visible without JS or with reduced motion |
| Sticky chapter, pinned reveal, scroll-controlled reveal | Editorial story + an explicit pin interval | Define start/end and release; natural flow on narrow screens |
| Scroll-scrubbed video, scroll-to-seek, video timeline | Product reveal + media scrubbing | Permanent poster; no autoplay; no video fetch on coarse pointer or reduced motion |
| Tilt card, depth card, pointer parallax card | Editorial story + proximity response | Fine-hover only; preserve native links and stable hit areas; neutral static card |
| Magnetic button, cursor attraction | Motion toolkit proximity response | Move decoration, not the control hit area; ordinary hover styling alone needs no cinematic skill |
| Split text, word cascade, kinetic heading | Editorial story + text choreography | Preserve heading semantics; don't split controls; readable reduced-motion text |
| Image sequence, frame-by-frame product turn | Product reveal + local frames | Budget decoding and memory; poster if assets fail |
| Horizontal collection, sideways gallery | Editorial story + bounded collection movement | Native vertical reading flow and reachable links on mobile |

The optional repository registry offers React implementations of **entrance
reveal**, **scrub video**, and **tilt card**. Those names describe their actual
behavior. A request for an accordion, ordinary button, data-table scrolling, or
video player controls does not become a cinematic task just because it mentions
motion. For other stacks, build the mechanism locally using this text package;
installing a component registry is not required.
