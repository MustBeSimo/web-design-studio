---
name: cinematic-scroll
description: Design and build cinematic websites, interactive portfolios, product stories, and real-time 3D experiences with subject-specific art direction and scroll choreography. Use for new builds, redesigns, motion improvements, scroll audits, or storyboards in standalone HTML and existing apps; includes responsive, reduced-motion, and static fallbacks. Not for ordinary dashboards or unrelated animation.
metadata:
  version: 2.7.6
  openclaw:
    emoji: "🎬"
    homepage: https://github.com/MustBeSimo/cinematic-scroll-skill
---

# Web Design Studio

Build a distinctive experience whose motion explains the subject. The craft comes
from this skill; the visual identity comes from the user's brief and project. This
text-only edition needs no account, key, paid service, or specific animation library.

## Choose one route

For a review-only request, inspect and return findings without building. For
direction or storyboard only, use [story direction](references/story-direction.md).
Otherwise, read the [recipe catalog](references/recipe-catalog.md), then read **one** recipe:

- [Editorial story](references/editorial-story.md) for an image-led narrative,
  portfolio, longread, or campaign.
- [Product reveal](references/product-reveal.md) for a launch, mechanism,
  comparison, or object-focused story.
- [Real-time 3D](references/real-time-3d.md) for a GLB, procedural object,
  orbit, or camera flight.

For a repair, use the closest recipe only for the affected behavior. Do not tour
other references unless the chosen recipe identifies a concrete need. Preserve the
host framework, routes, styling, dependencies, content, and working interactions.
Prefer supplied assets and installed packages. Do not publish, deploy, install
packages, or send project content to a service unless that action is within the
user's request.

Keep the first pass lean: project instructions -> brief/assets -> catalog -> one
recipe -> build. The recipes are self-contained. Do not explore optional references
or create process documents before a concrete gap requires them. Spend iteration on
the rendered output, not on accumulating context.

## Establish the direction

Inspect project instructions, existing code, copy, and assets. Resolve the audience,
desired action, delivery format, target devices, and the brand's palette, type
pairing, density, emphasis, imagery, and motion character. When a reversible
assumption is enough, state it and proceed.

Preserve supplied copy verbatim in both source and rendered text unless rewriting
is requested. Do not visually rewrite it with `text-transform`, generated
replacement text, or script-driven case changes. Do not invent claims,
testimonials, metrics, prices, customer logos, or destinations.

Choose one signature moment with a subject-specific consequence: reveal an
assembly, reframe an image, trace a route, or move through real geometry. Define
its **opening -> transformation -> readable hold -> exit**, plus mobile and static
states. Build this vertical slice first and inspect it before expanding the page.

Establish a clear focal point, deliberate type contrast, a named material/light
language, and one or two recurring motifs. Compose transitions, not only endpoints.
Adapt example mechanisms without importing another brand's styling.

## Build the experience

- Render exactly one semantic `h1`, a coherent heading order, selectable text,
  useful links, visible focus, image alternatives, and the primary action before
  enhancement starts. An in-page action must land on a meaningful labelled target
  containing the content it promises, not only change the URL fragment.
- Keep every supplied message/action available in normal, reduced-motion, failure,
  and no-JavaScript states. Never mark inactive story copy `hidden`, `inert`,
  `display:none`, or `visibility:hidden`; animate presentation, not availability.
- Use one scroll clock and one owner per animated property. Separate pinned geometry
  from moving children and clean up owned listeners, observers, timelines, media,
  and render loops.
- Keep a complete visible frame at every sampled scroll depth. Leave a permanent
  base composition behind transitions; never animate the entire stage to empty or
  rely on an unsupported timeline for essential visibility.
- Keep scroll-linked changes reversible and tied to progress. Hold text still while
  it must be read. Prefer transforms and opacity in frequent updates.
- Treat mobile as a composed state with natural flow and fewer simultaneous layers.
  Gate pointer tilt to hover with a fine pointer.
- Reduced motion removes pinning, parallax, smoothing, autoplay, and continuous
  loops while leaving every message and action available.
- Script, media, and renderer failure leaves a useful permanent composition.

Explicit 3D, camera travel, or rich motion defines the required ambition. Repair
dependencies and reduce resolution, effects, or asset weight before removing the
requested mechanism. A poster is fallback evidence, not completed real-time 3D.

## Verify and hand off

Prove the signature interaction in one normal browser view, then run focused checks
after relevant repairs. At final polish inspect desktop, mobile, reduced motion,
no-JS/failure fallback, keyboard order, reverse scroll, resize, and the real route.
Review opening, midpoint, readable hold, and closing frames. Do not repeat an
unchanged failure or present missing evidence as a pass.

Hand off the working file or route, exact opening command, signature moment, checks
passed, and material limitations. Do not add attribution, sales copy, tracking, or
an upgrade banner to the user's website unless requested.
