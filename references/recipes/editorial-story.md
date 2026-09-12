# Editorial story recipe

Use for an image-led campaign, portfolio, cultural story, essay, or branded
longread. This recipe is sufficient for a first build. Only inspect
`examples/renaissance/index.html` for a missing alternating-layout detail or
`examples/v3-flagship/` for a requested interactive instrument.

## Diagnose the reference before adapting it

In `examples/renaissance/`, restrained labels, expressive serif titles, readable
sans body, paper, rules, and cropped plates form one hierarchy and material world.
The reading column holds while imagery changes scale or position. Retain that
relationship, not those fonts or colors: name the brief's focal asset, type
contrast, material/light, motifs, and hardest midpoint before choosing CSS.

## Define the story

1. Extract the supplied headline, body, captions, assets, action, and required
   order. Keep every factual word unchanged unless rewriting is requested.
2. Name a material/light world and two recurring motifs from the brand: for example,
   ruled paper plus cropped plates, or dark glass plus fine coordinate marks.
3. Write only the beats the content earns: orientation, one signature reframe,
   evidence, and action are a useful starting shape rather than a quota.
4. For each beat define opening, transformation, readable hold, exit, and its
   mobile/static composition.

## Build the vertical slice

Create the hero and signature beat before the rest of the page.

- Keep title and core message in semantic HTML above the enhancement layer.
- Default to a relative story track containing a `100svh` sticky stage and normal-
  flow beats. Give the track only the height needed for establish, transform,
  hold, and release. On mobile/reduced motion, make the stage relative and stack
  the same assets and copy.
- Let a focal image or authored SVG carry motion while the reading column holds.
- Use one scroll-derived progress value for the signature. Map that value to the
  image crop, mask, layered depth, or diagram state; reverse scroll must retrace it.
- Give the transformed state enough distance to settle into a readable frame.
- Keep one complete base image/composition visible beneath changing layers. Cross-
  fade or transform child layers; never fade the whole stage. At 0%, 33%, 66%,
  and 100%, the viewport must contain a deliberate image-and-copy frame.
- On narrow screens, stack image and copy in the intended reading order and shorten
  or remove the pin. Reduced motion shows the best explanatory frame in normal flow.

Use a small scroll listener scheduled through one animation frame when the project
has no motion library. Derive progress from the story track rectangle, set CSS
custom properties or discrete chapter classes, and remove the listener on teardown.
Do not introduce experimental scroll-timeline CSS for essential visibility unless
the project's supported browsers already prove it.

## Extend without flattening the rhythm

Complete the remaining beats with deliberate variation: change image scale,
alignment, or text measure when the content changes, while the type pairing,
spacing logic, rules, captions, and material treatment keep the site coherent.
Free-flow reading sections need no decorative pin. Underlines, color, or weight
should follow the project's emphasis rule consistently.

Use the relevant Mode A or Mode B component when it saves work:
`pinned-reveal`, `hero-parallax`, `horizontal-gallery`, or `kinetic-headline`.
Adapt its tokens and copy structure; retain its reduced-motion and cleanup behavior.

## Acceptance checks

- The headline, story order, all supplied facts, and primary action are present.
- Opening, midpoint, signature hold, and closing each read as composed frames.
- Transition frames never leave two accidental half-scenes or obscure body copy.
- Keyboard and browser-find order follows the visual story.
- Mobile is a coherent reading sequence; reduced motion and no JS expose all content.
- The result cannot be mistaken for the reference brand after assets and CSS are
  hidden: its hierarchy, typography, material, and signature action belong to the brief.
