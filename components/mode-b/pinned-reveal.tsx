'use client';

import { useRef, useId, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Legacy name: this does not pin. New URL installs use entrance-reveal.tsx.
 * PinnedReveal — staggered eyebrow → title → summary reveal as the chapter enters view
 * (the long-take title arrival). Token-driven via className (consumes var(--ease-reveal),
 * var(--bg) … from tokens/build/variables.css); transform/opacity only; reduced-motion safe.
 */
type PinnedRevealProps = {
  eyebrow?: string;
  title: ReactNode;
  summary?: string;
  id?: string;
};

export default function PinnedReveal({ eyebrow, title, summary, id }: PinnedRevealProps) {
  const root = useRef<HTMLElement>(null);
  const autoId = useId();
  const titleId = `${id ?? autoId}-title`;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Motion only when the user allows it; reduced-motion shows the final state.
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(gsap.utils.toArray<HTMLElement>('[data-reveal]', root.current), {
          opacity: 0,
          y: 40,
          duration: 0.72,
          ease: 'expo.out', // === var(--ease-reveal)
          stagger: 0.09,
          scrollTrigger: { trigger: root.current, start: 'top 75%', invalidateOnRefresh: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id={id} aria-labelledby={titleId} className="chapter">
      {eyebrow && <p data-reveal className="eyebrow">{eyebrow}</p>}
      <h2 data-reveal id={titleId} className="title">{title}</h2>
      {summary && <p data-reveal className="summary">{summary}</p>}
    </section>
  );
}
