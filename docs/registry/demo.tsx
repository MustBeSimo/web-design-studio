'use client';

import EntranceReveal from '@/components/entrance-reveal';
import ScrubVideo from '@/components/scrub-video';
import { TiltCard } from '@/components/tilt-card';

const site = 'https://mustbesimo.github.io/web-design-studio';

/** Next App Router demo. Install the three items first; place this file at app/pilot/page.tsx. */
export default function RegistryPilotDemo() {
  return <main data-registry-demo>
    <header><a href={site}>Web Design Studio</a><span>React component pilot</span></header>
    <div className="pilot-intro">
      <p className="pilot-kicker">Three small mechanisms. Your visual identity.</p>
      <h1>Motion, in your own hands.</h1>
      <p>Entrance reveal, tilt card and scroll-controlled video, installed as source into your project.</p>
      <a className="pilot-action" href="#pilot-install">Try the components <span aria-hidden>↗</span></a>
    </div>
    <section className="pilot-chapter" aria-label="Entrance reveal demonstration">
      <p className="pilot-index">01 / Entrance reveal</p>
      <EntranceReveal eyebrow="Normal document flow" title="A quiet arrival."
        summary="The eyebrow, heading and summary arrive together as the section enters view. Reduced motion shows the complete section." />
    </section>
    <section className="pilot-chapter" aria-label="Tilt card demonstration">
      <p className="pilot-index">02 / Tilt card</p>
      <div className="pilot-cards">
        <TiltCard title="Follow the pointer" eyebrow="Fine-hover devices" maxDeg={7}>
          <p>Move across this card. The inner surface responds while its outer layout stays put.</p>
          <a href="#pilot-install">Install tilt card</a>
        </TiltCard>
        <TiltCard title="Keep your own theme" eyebrow="Host semantic tokens" maxDeg={7}>
          <p>These cards inherit this page’s colors and type. Keyboard links stay native.</p>
          <a href={`${site}/docs/registry/tilt-card.md`}>Read the component guide</a>
        </TiltCard>
      </div>
    </section>
    <section className="pilot-chapter" aria-label="Scrub video demonstration">
      <p className="pilot-index">03 / Scrub video</p>
      <p>Scroll forward, then back. The KERN sample clip follows your position.</p>
      <ScrubVideo src={`${site}/examples/kern-calibration/assets/kern-color.mp4`}
        poster={`${site}/examples/kern-calibration/assets/kern-poster.jpg`}
        label="Rendered optical mechanism from the KERN example" title="A frame for every position." trackVh={2.4} />
      <p className="pilot-note">On narrow screens, coarse pointers or reduced motion, the same section uses its poster in natural flow. This is sample artwork from the existing KERN example.</p>
    </section>
    <section className="pilot-chapter" id="pilot-install" aria-labelledby="pilot-install-title">
      <p className="pilot-index">Try it / Source-owned components</p>
      <h2 id="pilot-install-title">Bring one into your project.</h2>
      <p>Use a React + TypeScript project already configured for shadcn. Pick one component to start.</p>
      <pre><code>{`npx shadcn@4.23.0 add ${site}/r/entrance-reveal.json\nnpx shadcn@4.23.0 add ${site}/r/tilt-card.json\nnpx shadcn@4.23.0 add ${site}/r/scrub-video.json`}</code></pre>
      <a className="pilot-action" href={`${site}/docs/registry/README.md`}>Read the install guide <span aria-hidden>↗</span></a>
    </section>
    <footer>Web Design Studio · Registry pilot · No account or API key required</footer>
    <style>{`
      [data-registry-demo]{--background:#171914;--foreground:#f3f0e6;--card:#22261e;--card-foreground:#f3f0e6;--muted-foreground:#c0c6b5;--border:#4c5740;--ring:#d5ff73;--radius:.35rem;
        max-width:none;margin:0;padding:0;background:var(--background);color:var(--foreground);font:16px/1.6 system-ui,sans-serif}
      [data-registry-demo] *{box-sizing:border-box}
      [data-registry-demo] header,[data-registry-demo] footer{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:1.3rem clamp(1.25rem,6vw,6rem);border-bottom:1px solid var(--border);font-size:.85rem}
      [data-registry-demo] footer{border-top:1px solid var(--border);border-bottom:0;color:var(--muted-foreground)}
      [data-registry-demo] a{color:inherit;text-underline-offset:.25em}
      [data-registry-demo] :focus-visible{outline:2px solid var(--ring);outline-offset:5px}
      [data-registry-demo] h1,[data-registry-demo] h2{font-family:Georgia,serif;font-weight:400;line-height:1.1;text-wrap:balance}
      [data-registry-demo] h1{font-size:clamp(3.5rem,8vw,7rem);max-width:11ch;margin:1.5rem 0}
      [data-registry-demo] h2{font-size:clamp(2rem,4vw,3.8rem);margin:1rem 0}
      [data-registry-demo] p{max-width:62ch}
      [data-registry-demo] .pilot-intro,[data-registry-demo] .pilot-chapter{padding:clamp(3.5rem,8vw,7rem) clamp(1.25rem,6vw,6rem)}
      [data-registry-demo] .pilot-chapter{border-top:1px solid var(--border)}
      [data-registry-demo] .pilot-index,[data-registry-demo] .pilot-kicker{color:#d5ff73;font-size:.85rem;letter-spacing:.04em}
      [data-registry-demo] .pilot-index{margin:0 0 3rem}
      [data-registry-demo] .pilot-action{display:inline-flex;gap:2rem;align-items:center;margin-top:1.5rem;padding:.75rem 1rem;background:#d5ff73;color:#171914;text-decoration:none}
      [data-registry-demo] .pilot-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem}
      [data-registry-demo] [data-wds-tilt]{max-width:30rem !important}
      [data-registry-demo] [data-wds-tilt] h2{font-size:1.8rem !important}
      [data-registry-demo] .pilot-note{font-size:.9rem;color:var(--muted-foreground)}
      [data-registry-demo] pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--card);border:1px solid var(--border);padding:1.2rem;font-size:.85rem}
      @media(max-width:680px){[data-registry-demo] .pilot-cards{grid-template-columns:1fr}}
    `}</style>
  </main>;
}
