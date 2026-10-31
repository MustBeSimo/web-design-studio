# Entrance reveal

Also called fade-up, staggered section arrival or chapter entrance. The section
stays in normal document flow. For an actual pinned chapter, use the skill's
editorial recipe and define a finite pin interval separately.

```sh
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/entrance-reveal.json
```

```tsx
import EntranceReveal from '@/components/entrance-reveal';

<EntranceReveal eyebrow="Materials" title="Made from the supplied material"
  summary="Replace this example with verified product copy." />
```

Required: `title` (React node). Optional: `eyebrow`, `summary`, `id`, `className`,
`style`. Arrival uses 24px, .72s, .09s stagger, `expo.out`, starting at 85% of the
viewport. Focus reveals content immediately. Reduced motion removes the effect;
server markup is visible without JS. Each instance owns and reverts its GSAP
match-media context and ScrollTrigger on prop changes and unmount.

The old repository filename `pinned-reveal.tsx` retains its existing props and CSS classes for compatibility.
It is not the registry name. Dependencies: React host, GSAP and `@gsap/react`.
