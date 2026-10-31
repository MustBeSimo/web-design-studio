'use client';

import { useRef, useId, type ReactNode, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type EntranceRevealProps = {
  eyebrow?: string;
  title: ReactNode;
  summary?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
};

/** A staggered arrival in normal document flow; this component never pins. */
export default function EntranceReveal({ eyebrow, title, summary, id, className, style }: EntranceRevealProps) {
  const root = useRef<HTMLElement>(null);
  const autoId = useId();
  const titleId = `${id ?? autoId}-title`;
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const element = root.current;
      if (!element) return;
      const animation = gsap.from(element.querySelectorAll('[data-wds-reveal]'), {
        opacity: 0, y: 24, duration: .72, ease: 'expo.out', stagger: .09,
        scrollTrigger: { trigger: element, start: 'top 85%', invalidateOnRefresh: true },
      });
      // A focused heading link must be visible even before its scroll trigger fires.
      const reveal = () => animation.progress(1);
      element.addEventListener('focusin', reveal);
      return () => element.removeEventListener('focusin', reveal);
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [eyebrow, title, summary], revertOnUpdate: true });

  return <section ref={root} id={id} aria-labelledby={titleId} className={className}
    data-wds-entrance style={{ color: 'var(--foreground, #18181b)', ...style }}>
    {eyebrow && <p data-wds-reveal>{eyebrow}</p>}
    <h2 data-wds-reveal id={titleId}>{title}</h2>
    {summary && <p data-wds-reveal style={{ color: 'var(--muted-foreground, #52525b)' }}>{summary}</p>}
  </section>;
}
