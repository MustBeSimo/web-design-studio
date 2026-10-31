import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function writeConsumer(dir, kind) {
  const vite = kind === 'vite', prefix = vite ? '~/widgets' : '@/components';
  const write = (path, value) => { const file = join(dir, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
  const json = (path, value) => write(path, JSON.stringify(value, null, 2) + '\n');
  json('package.json', {
    name: `registry-${kind}-consumer`, private: true, type: 'module',
    scripts: { build: vite ? 'vite build' : 'next build --webpack', typecheck: 'tsc --noEmit' },
    dependencies: { react: '19.3.1', 'react-dom': '19.3.1', ...(vite ? {} : { next: '16.4.3' }) },
    devDependencies: { typescript: '5.9.3', '@types/react': '19.3.0', '@types/react-dom': '19.2.3', '@types/node': '22.15.30', ...(vite ? { vite: '7.3.7' } : {}) },
  });
  json('components.json', {
    $schema: 'https://ui.shadcn.com/schema.json', style: 'new-york', rsc: !vite, tsx: true,
    tailwind: { config: '', css: vite ? 'src/style.css' : 'app/style.css', baseColor: 'neutral', cssVariables: true },
    aliases: vite
      ? { components: '~/widgets', ui: '~/widgets/ui', lib: '~/shared', hooks: '~/hooks', utils: '~/shared/utils' }
      : { components: '@/components', ui: '@/components/ui', lib: '@/lib', hooks: '@/hooks', utils: '@/lib/utils' },
  });
  json('tsconfig.json', {
    compilerOptions: { target: 'ES2022', lib: ['DOM', 'DOM.Iterable', 'ESNext'], strict: true, noEmit: true,
      allowJs: false, skipLibCheck: true, esModuleInterop: true, module: 'ESNext', moduleResolution: 'Bundler',
      resolveJsonModule: true, isolatedModules: true, jsx: vite ? 'react-jsx' : 'preserve',
      paths: vite ? { '~/*': ['./src/*'] } : { '@/*': ['./*'] } },
    include: ['**/*.ts', '**/*.tsx', '**/*.mts', '.next/types/**/*.ts'], exclude: ['node_modules'],
  });
  const fixture = `'use client';
import { StrictMode, useState, useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import EntranceReveal from '${prefix}/entrance-reveal';
import ScrubVideo from '${prefix}/scrub-video';
import { TiltCard } from '${prefix}/tilt-card';

declare global { interface Window { triggerCount: () => number; fixtureReady: boolean } }
function MountProbe() { useEffect(() => { document.body.dataset.setups = String(Number(document.body.dataset.setups || 0) + 1); return () => { document.body.dataset.cleanups = String(Number(document.body.dataset.cleanups || 0) + 1); }; }, []); return null; }
export default function Fixture() {
 const [mounted, setMounted] = useState(true), [revision, setRevision] = useState(0), [broken, setBroken] = useState(false);
 useEffect(() => { window.triggerCount = () => ScrollTrigger.getAll().length; window.fixtureReady = true; }, []);
 return <main>
 <nav><button onClick={() => setMounted(!mounted)}>{mounted ? 'Unmount' : 'Mount'}</button>
 <button onClick={() => setRevision(revision + 1)}>Update props</button>
 <button onClick={() => setBroken(!broken)}>Toggle failed media</button></nav>
 <h1>Registry consumer</h1>
 {mounted && <StrictMode><MountProbe />
 <div className="pair">{[1,2].map(i => <EntranceReveal key={i} title={<>Entrance {i} · {revision}</>} summary="Readable section copy" />)}</div>
 <div className="pair">{[1,2].map(i => <TiltCard key={i} title={'Card ' + i} maxDeg={revision % 2 ? 4 : 8}>
 <p>Native controls remain available.</p><a href={'#destination-' + i}>Read item {i}</a></TiltCard>)}</div>
 {[1,2].map(i => <ScrubVideo key={i} src={broken ? '/broken.mp4' : '/clip.mp4?revision=' + revision} poster="/poster.svg" label={'Product still ' + i} title={'Video ' + i} trackVh={2.2} />)}
 </StrictMode>}
 <footer style={{minHeight: '110vh'}}><p id="destination-1">Destination one</p><p id="destination-2">Destination two</p></footer>
 </main>;
}
`;
  write(vite ? 'src/Fixture.tsx' : 'app/Fixture.tsx', fixture);
  write(vite ? 'src/style.css' : 'app/style.css', `:root{--background:#f4f3ed;--foreground:#17382c;--card:#e2eadb;--card-foreground:#17382c;--border:#6a8069;--muted-foreground:#435e4b;--ring:#2867d2;--radius:1rem}*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:var(--background);color:var(--foreground)}main{max-width:960px;margin:auto;padding:24px}nav{position:relative;display:flex;flex-wrap:wrap;gap:1rem}button,a{font:inherit}button{padding:8px}h1{margin-block:2rem}.pair{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:80px}@media(max-width:600px){.pair{grid-template-columns:1fr}}`);
  if (vite) {
    write('index.html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Registry Vite consumer</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
    write('src/main.tsx', "import { StrictMode } from 'react'; import { createRoot } from 'react-dom/client'; import Fixture from './Fixture'; import './style.css'; createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);");
    write('vite.config.ts', "import { defineConfig } from 'vite'; import { fileURLToPath } from 'node:url'; export default defineConfig({resolve:{alias:{'~':fileURLToPath(new URL('./src',import.meta.url))}}});");
  } else {
    write('app/layout.tsx', "import './style.css'; import type {ReactNode} from 'react'; export default function Layout({children}:{children:ReactNode}) {return <html lang=\"en\"><body>{children}</body></html>}");
    write('app/page.tsx', "import Fixture from './Fixture'; export default function Page() {return <Fixture />}\n");
    write('next.config.mjs', "import {fileURLToPath} from 'node:url'; export default {reactStrictMode:true,outputFileTracingRoot:fileURLToPath(new URL('.',import.meta.url))};\n");
  }
  write('public/poster.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#17382c"/><circle cx="320" cy="180" r="110" fill="#d4e6aa"/></svg>');
}
