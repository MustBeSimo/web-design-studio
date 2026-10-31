'use client';

import { useId, type ReactNode, type CSSProperties } from 'react';
import { CinematicScope, MagneticSurface } from '@/lib/cinematic/react';

export type TiltCardProps = {
  eyebrow?: string; title: string; children?: ReactNode; maxDeg?: number;
  className?: string; style?: CSSProperties;
};

/** Stable outer geometry and native child controls; one runtime owns the inner transform. */
export function TiltCard({ eyebrow, title, children, maxDeg = 8, className, style }: TiltCardProps) {
  const id = useId();
  const strength = (Number.isFinite(maxDeg) ? Math.max(0, Math.min(15, maxDeg)) : 8) / .35;
  return <CinematicScope><article aria-labelledby={id} className={className} data-wds-tilt
    style={{ maxWidth: '24rem', ...style }}>
    <MagneticSurface variant="depth" strength={strength}>
      <div style={{ position: 'relative', display: 'grid', gap: 'var(--wds-card-gap, 1rem)',
        padding: 'var(--wds-card-padding, 1.5rem)', border: '1px solid var(--border, #d4d4d8)',
        borderRadius: 'var(--radius, .75rem)', background: 'var(--card, #fff)', color: 'var(--card-foreground, #18181b)' }}>
        <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
          opacity: 'var(--cinematic-proximity, 0)', background: 'radial-gradient(ellipse at 30% 20%,#ffffff35,transparent 65%)' }} />
        {eyebrow && <p style={{ margin: 0, color: 'var(--muted-foreground, #52525b)' }}>{eyebrow}</p>}
        <h2 id={id} style={{ margin: 0, fontSize: 'inherit' }}>{title}</h2>
        {children && <div>{children}</div>}
      </div>
    </MagneticSurface>
    <style>{`[data-wds-tilt] :focus-visible{outline:2px solid var(--ring,#2563eb);outline-offset:4px}`}</style>
  </article></CinematicScope>;
}
