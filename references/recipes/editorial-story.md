# Editorial story recipe

Use for an image-led campaign, portfolio, cultural story, essay, or branded
longread. The source pattern is `examples/renaissance/index.html`; use
`examples/v3-flagship/` when the story benefits from one compact interactive
instrument. Both are standalone references with no runtime JS library;
Renaissance optionally loads Google Fonts and keeps local fallback families.

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
- Let a focal image or authored SVG carry motion while the reading column holds.
- Use one scroll-derived progress value for the signature. Map that value to the
  image crop, mask, layered depth, or diagram state; reverse scroll must retrace it.
- Give the transformed state enough distance to settle into a readable frame.
- On narrow screens, stack image and copy in the intended reading order and shorten
  or remove the pin. Reduced motion shows the best explanatory frame in normal flow.

Inspect `examples/renaissance/index.html` for alternating image/copy composition,
decorative depth wrappers, chapter navigation, and touch-safe collapse. Inspect
`examples/v3-flagship/story.css` and `story.mjs` for a single controlled instrument,
shared signals, reset/pause controls, and teardown. Reuse one implementation model,
not both clocks.

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
