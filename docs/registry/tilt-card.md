# Tilt card

Also called depth card or pointer parallax card. The outer geometry stays stable;
the shared runtime transforms the inner visual only on a fine-hover pointer.

```sh
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/tilt-card.json
```

```tsx
import { TiltCard } from '@/components/tilt-card';

<TiltCard title="Your product" eyebrow="Collection" maxDeg={6}>
  <p>Use your own verified description.</p>
  <a href="/product">View product</a>
</TiltCard>
```

Required: `title` (string). Optional: `eyebrow`, `children`, `maxDeg` (8 by default,
clamped to 0–15), `className`, `style`. Local variables: `--wds-card-gap` and
`--wds-card-padding`. Colors inherit host shadcn tokens with literal fallbacks.

The article is not a fake button or an extra keyboard stop. Put native links or
buttons in its children; focus stays visible. Reduced motion and coarse pointers
neutralize the tilt while preserving content and actions. No-JS server markup is
a readable card. A `CinematicScope` creates a disposable runtime unless an existing
`CinematicProvider` surrounds it. Wrap multiple cards in one provider when they
should share listeners and a clock:

```tsx
import { CinematicProvider } from '@/lib/cinematic/react';

<CinematicProvider>{/* your TiltCard instances */}</CinematicProvider>
```

The registry includes the provider, runtime, effects, core math and declarations;
there are no imports back into this repository. GSAP is installed as a dependency.
There is no WebGL requirement or mandatory theme stylesheet.
