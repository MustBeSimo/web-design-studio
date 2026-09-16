import {chromium} from 'playwright-core';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {serveDirectory} from '../bench/skill-ab/v4-forward/lib.mjs';

const repo = resolve(import.meta.dirname, '..');
const out = join(repo, 'assets/promo-linkedin/captures');
mkdirSync(out, {recursive:true});
const server = await serveDirectory(repo);
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--enable-unsafe-swiftshader']});
const evidence = [];
try {
  for (const name of ['flagship','liquid-chrome','brutalist-kinetic','jungle-flythrough','aureus-flythrough','clinical-noir']) {
    const page = await browser.newPage({viewport:{width:1920,height:1080}, deviceScaleFactor:1});
    await page.goto(`${server.url}/examples/${name}/`, {waitUntil:'networkidle',timeout:60000});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    const frames = mkdtempSync(join(tmpdir(), `wds-capture-${name}-`));
    const max = await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
    for (let frame=0;frame<210;frame++) {
      // A readable opening hold, followed by a gentle forward scroll; never zoom/crop.
      const t = Math.max(0,Math.min(1,(frame-30)/179));
      const progress = t*t*(3-2*t);
      await page.evaluate(y=>{document.documentElement.style.scrollBehavior='auto'; scrollTo({top:y,behavior:'instant'});}, max * .34 * progress);
      await page.waitForTimeout(33);
      await page.screenshot({path:join(frames,`${String(frame).padStart(4,'0')}.jpg`),type:'jpeg',quality:96});
    }
    const r=spawnSync('ffmpeg',['-y','-framerate','30','-i',join(frames,'%04d.jpg'),'-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',join(out,`${name}.mp4`)],{encoding:'utf8'});
    if(r.status!==0) throw new Error(r.stderr);
    evidence.push({name,viewport:{width:1920,height:1080},frames:210,fps:30,scrollEnd:max*.34,source:`examples/${name}/`});
    console.log(`Captured ${name}: full 1920x1080 viewport`);
    await page.close();
  }
  writeFileSync(join(out,'manifest.json'),JSON.stringify(evidence,null,2)+'\n');
} finally {await browser.close();await server.close();}
