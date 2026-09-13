# Benchmark brief: Parallax Index

Build a single-page, brand-neutral microsite for an imaginary public exhibit called **Parallax Index**. The visual idea is a cool duotone field of luminous woven contours: measured, editorial, and spatial rather than game-like. This is not a recreation of Axis 24; do not use its name, visual language, copy, logos, coordinates, or layout motifs.

## Delivery contract

- Deliver exactly one authored page at `index.html`. It must run from a simple static file server with no build step.
- You may author CSS and JavaScript inline in `index.html`, but the supplied `assets/orbit-field-viewer.js`, `assets/scene.json`, and `assets/poster.svg` must remain separate local files and must be used.
- Use only HTML, CSS, the browser DOM, and native WebGL. No frameworks, packages, CDNs, remote fonts, remote images, network services, or generated binary assets.
- Do not edit the supplied files. All paths must be relative.
- The final page must contain every string and action in `copy.json` exactly as supplied. Do not rewrite, capitalize, punctuate, merge, or omit them. Visible copy may appear once; accessible equivalents do not count as duplication.
- Treat `kit.json` as the visual and behavioral source of truth.

## Experience

The page is a compact editorial scroll with a persistent WebGL stage. A fine-grained woven object occupies the right/center of the viewport while the reader moves through three concise text beats on the left. The typography is a high-contrast system serif for display copy paired with a clean system sans for controls and metadata. Use the supplied cool ink/electric-cyan duotone, hairline borders, pill controls, tight spacing, underlined emphasis, and layered shadows. Do not introduce a third chromatic accent.

The WebGL canvas is not ornamental wallpaper. Load `assets/scene.json`, import `mountOrbitField` from `assets/orbit-field-viewer.js`, and use them to render the supplied procedural contour object on a genuine WebGL context. A 2D canvas simulation, CSS-only substitute, screenshot of WebGL, or shader embedded directly in `index.html` fails the benchmark.

Map normalized document scroll progress to the viewer's `setProgress(value)` method. Across the page, the supplied viewer changes camera orbit, camera distance, object twist, and field separation. The transition must be continuous and visibly meaningful. Prefer `requestAnimationFrame` batching. The opening state should still be a legible composition before any scroll.

## Required content and actions

Use `copy.json` as the exact-copy ledger. Apply `meta.title` to `<title>`, `meta.description` to the description meta tag, `media.posterAlt` to the poster, and `media.canvasFallback` inside the canvas element. All of the following must be visible in the normal experience and remain available in fallback:

- eyebrow, title, introduction, all three chapter labels/titles/bodies
- primary and secondary action labels
- the method label and method text
- the footer
- the status labels appropriate to the active state

The primary action is an in-page anchor to the method section (`#method`). The secondary action is a real button. It toggles a compact details panel containing the method label and method text, updates `aria-expanded`, and keeps its visible label exactly unchanged. In fallback, force this panel open so its exact copy is immediately visible; the button must still be operable and may close/reopen it.

## Explicit lifecycle contract

The page root is the `<html>` element. It must expose one and only one current state through the machine-readable attribute `data-render-state`:

1. Set `data-render-state="loading"` in the authored HTML before any script runs. Show the exact `status.loading` string in a live status element.
2. Set `data-render-state="ready"` only after all of these are true: the module imported, `scene.json` fetched and parsed, a WebGL context was created, shader/program setup succeeded, the first frame rendered, and the poster image has decoded. Show the exact `status.ready` string.
3. Set `data-render-state="fallback"` for any module import error, scene fetch/parse error, WebGL absence, shader/program failure, first-frame failure, or uncaught viewer startup error. Show the exact `status.fallback` string.

The visible status node must use `data-render-status`, `role="status"`, and `aria-live="polite"`. Its text must always match the current state's exact status copy. Dispatch a bubbling `CustomEvent("renderstatechange", { detail: { state } })` from `<html>` after every scripted state transition. Tests may inspect the attribute, status node, event, canvas, network requests, and WebGL calls.

## Poster and failure behavior

`assets/poster.svg` is the authored visual fallback, not merely a loading placeholder. Place it as an actual `<img>` layered with the canvas. Call `poster.decode()` (with a load-event-compatible recovery path) and do not enter `ready` before decoding resolves. The poster must be visible while loading, cross-fade away only after the first WebGL frame succeeds, and remain visible in fallback.

Blocking **either** `assets/orbit-field-viewer.js` **or** `assets/scene.json` must independently produce the same complete fallback experience:

- `data-render-state="fallback"` is present;
- the decoded poster remains visible (wait for decode/load before revealing the settled fallback surface when possible);
- the fallback status string is visible;
- every exact copy string and both actions remain visible, readable, and operable;
- the page never stalls indefinitely in loading.

Use a startup watchdog of 4 seconds or less to enter fallback if startup does not settle. Failure handling belongs in `index.html`, because the module itself may be the blocked resource. Do not hide content behind successful WebGL initialization.

## Progressive enhancement states

- **No JavaScript:** include a `<noscript>` treatment with the exact `status.noJs` string. The poster, all exact editorial copy, the `#method` destination, and both action labels must still be present in the authored HTML. The details content may be permanently expanded. The canvas may remain inert.
- **Reduced motion:** honor `prefers-reduced-motion: reduce`. Disable smooth scrolling and decorative CSS motion. Initialize the viewer with `{ reducedMotion: true }`; keep the WebGL object static at a composed midpoint and do not update it from scroll. The content and status behavior remain identical.
- **Mobile:** below 720px, use a single readable column. Keep a poster/canvas stage in normal flow with an aspect ratio near 4:5; do not pin it behind all content. Controls must have at least a 44px hit area, body text must not drop below 16px, and there must be no horizontal scrolling.
- **Keyboard and screen readers:** use semantic headings/sections, visible focus styles, useful canvas fallback text, alt text from `copy.json`, and correct button/region relationships. Do not rely on color alone.

## Acceptance checks

- One `index.html` opens without a build and requests only the three supplied local assets.
- A real WebGL context renders via the supplied module and data; scrolling changes the rendered camera/object composition.
- Authored HTML contains the complete experience, so JS failure never removes copy or actions.
- `loading`, `ready`, and `fallback` are unambiguous in `data-render-state` and the live status node.
- Blocking the viewer module and blocking the data file are tested separately; each yields the decoded poster, all copy/actions, and fallback state within four seconds.
- Poster decode, mobile layout, reduced motion, no-JS content, anchors, details toggle, focus order, and exact copy are verified.
- The final design follows `kit.json`: cool duotone, serif/sans pairing, dense spacing, underlined emphasis, pill controls, hairline borders, and layered depth.
