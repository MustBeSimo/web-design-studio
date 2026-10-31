'use client';

import { useEffect, useId, useRef, type CSSProperties } from 'react';

export interface ScrubVideoProps {
  src: string;
  /** Permanent still beneath the video, including failure and no-JS states. */
  poster: string;
  label: string;
  eyebrow?: string;
  title?: string;
  /** Viewport multiples, clamped to 1.5–8. Only used on eligible desktops. */
  trackVh?: number;
  className?: string;
  style?: CSSProperties;
}

/** Silent decorative footage driven by scroll. Supply equivalent information in copy. */
export default function ScrubVideo({ src, poster, label, eyebrow, title, trackVh = 3.2, className, style }: ScrubVideoProps) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const titleId = useId();
  const height = Number.isFinite(trackVh) ? Math.max(1.5, Math.min(8, trackVh)) : 3.2;

  useEffect(() => {
    const track = root.current, clip = video.current;
    if (!track || !clip) return;
    const query = matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let dispose = () => {};
    const update = () => {
      dispose();
      dispose = () => {};
      if (!query.matches) return;
      let frame = 0, failed = false, started = false;
      const seek = () => {
        frame = 0;
        if (failed || !started || !Number.isFinite(clip.duration) || clip.duration <= 0) return;
        const rect = track.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
        // rVFC waits for a decoded frame; a paused video cannot use it to initiate a seek.
        const time = progress * Math.max(0, clip.duration - .001);
        try { if (Math.abs(clip.currentTime - time) > .016) clip.currentTime = time; }
        catch { fail(); }
      };
      const schedule = () => { if (!frame && !failed) frame = requestAnimationFrame(seek); };
      const ready = () => {
        if (failed || clip.readyState < 2) return;
        started = true;
        track.dataset.wdsReady = '';
        schedule(); // includes restored scroll and source changes
      };
      const fail = () => {
        failed = true;
        cancelAnimationFrame(frame); frame = 0;
        delete track.dataset.wdsReady;
      };
      // Do not seek on resize until a first frame has decoded. Seeking at metadata
      // time can interrupt that first frame during rapid preference changes.
      clip.addEventListener('loadeddata', ready);
      clip.addEventListener('canplay', ready);
      clip.addEventListener('error', fail);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('pageshow', schedule);
      clip.src = src;
      clip.load();
      dispose = () => {
        failed = true;
        cancelAnimationFrame(frame);
        clip.removeEventListener('loadeddata', ready);
        clip.removeEventListener('canplay', ready);
        clip.removeEventListener('error', fail);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        window.removeEventListener('pageshow', schedule);
        delete track.dataset.wdsReady;
        clip.pause(); clip.removeAttribute('src'); clip.load();
      };
    };
    query.addEventListener('change', update);
    update();
    return () => { query.removeEventListener('change', update); dispose(); };
  }, [src, height]);

  return <section ref={root} className={['wds-scrub', className].filter(Boolean).join(' ')}
    aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : label}
    style={{ '--wds-track-height': `${height * 100}vh`, ...style } as CSSProperties}>
    <div className="wds-scrub-stage">
      <div className="wds-scrub-media">
        <img src={poster} alt={label} className="wds-scrub-poster" />
        <video ref={video} muted playsInline preload="auto" aria-hidden="true" className="wds-scrub-video" />
      </div>
      {(eyebrow || title) && <div className="wds-scrub-caption">
        {eyebrow && <p>{eyebrow}</p>}{title && <h2 id={titleId}>{title}</h2>}
      </div>}
    </div>
    <style>{`
      .wds-scrub{position:relative;color:var(--foreground,#18181b);background:var(--background,#fff)}
      .wds-scrub-stage{position:static}
      .wds-scrub-media{position:relative;aspect-ratio:16/9;overflow:clip}
      .wds-scrub-poster,.wds-scrub-video{display:block;width:100%;height:100%;object-fit:cover}
      .wds-scrub-video{position:absolute;inset:0;visibility:hidden}
      .wds-scrub-caption{padding:var(--wds-caption-padding,1.5rem)}
      .wds-scrub-caption>:first-child{margin-top:0}
      .wds-scrub-caption>:last-child{margin-bottom:0}
      @media(min-width:769px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference){
        .wds-scrub[data-wds-ready]{min-height:var(--wds-track-height)}
        .wds-scrub[data-wds-ready] .wds-scrub-stage{position:sticky;top:0}
        .wds-scrub[data-wds-ready] .wds-scrub-media{height:65vh}
        .wds-scrub[data-wds-ready] .wds-scrub-video{visibility:visible}
      }
    `}</style>
  </section>;
}
