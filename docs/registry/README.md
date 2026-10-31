# React component registry pilot

Web Design Studio offers three source-owned React components through standard
[shadcn URL installs](https://ui.shadcn.com/docs/registry/getting-started).
This optional toolkit is separate from the three text-only agent skills.
No namespace registration, account, API key or Studio subscription is required.

| Mechanism | Use it for | Static state |
|---|---|---|
| [Entrance reveal](entrance-reveal.md) | Staggered eyebrow, heading and summary arrival; never pins | Readable section |
| [Scrub video](scrub-video.md) | Silent footage tied to desktop scroll position | Permanent authored poster and caption |
| [Tilt card](tilt-card.md) | Fine-pointer depth response | Neutral card with native links |

From a React project already configured with `components.json` and TypeScript:

```sh
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/entrance-reveal.json
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/scrub-video.json
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/tilt-card.json
```

The URLs become available when the PR is merged and the existing Pages workflow
deploys successfully. Preview locally with `npm run registry:build`; the consumer
harness serves the generated JSON and exercises real URL installs before release.
No directory listing or registered `@namespace` is implied.

Components install under your configured component alias. Tilt card also installs
the shared cinematic runtime under your lib alias, including TypeScript declarations.
Entrance reveal adds `gsap` and `@gsap/react`; tilt adds `gsap`; scrub video uses
React and browser APIs only. React is supplied by the host project. Source is MIT;
installed payloads retain the project's notice. GSAP retains its own package license.

## Theme and ownership

Typography is inherited. Colors use modern shadcn CSS color tokens (`--background`,
`--foreground`, `--card`, `--card-foreground`, `--muted-foreground`, `--border`,
`--ring`) with local literal fallbacks. Radius uses `--radius`. Legacy HSL-channel
variables must be converted to complete color values at the component boundary.
All components accept `className` and `style`. No global stylesheet, font download,
reset, Tailwind class processing or Studio token sheet is required.

Optional full Studio themes remain available in `tokens/` and `themes/` for builds
that deliberately choose that visual system. They are not installed by the pilot.
Use component variables for local adjustments; no component writes global tokens.

No component contacts Web Design Studio or sends analytics. Only your media URLs
are fetched at runtime. External media you supply is allowed. Keep copy and any
CTA in semantic markup; footage must not be the sole carrier of information.

## Verification and limits

`npm run test:registry` checks deterministic payloads and dependency closure.
`npm run test:registry:consumers` creates fresh Next and Vite projects, runs the
pinned shadcn CLI against local URLs, typechecks, builds and exercises the browser
matrix. It requires Chrome and ffmpeg; neither is silently skipped. Generated
projects, media, screenshots and timing reports stay in `.verify/registry/`.

Next verifies readable server markup with JavaScript actually disabled. Vite is
client rendered: these components cannot make an empty Vite shell readable without
JS; prerender or SSR the host when no-JS content is required. Browser tests cover
two instances, StrictMode mount replay, unmount/remount, live reduced motion,
coarse pointer, narrow viewport, keyboard, media failure and scroll seeking.
These three components use no WebGL, so GPU-loss testing is not applicable.

Timing reports measure controlled local installation and build runs, not adoption,
conversion or star growth. An optional human trial can record first successful
install, time to an acceptable result and the reason for any abandonment, with
participant consent; the components do not collect this automatically.
