import assert from 'node:assert/strict';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

async function eventually(check, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  let error;
  do { try { await check(); return; } catch (e) { error = e; } await new Promise(r => setTimeout(r, 75)); } while (Date.now() < deadline);
  throw new Error(label, { cause: error });
}

// Count native resources independently of the installed component implementation.
function instrument() {
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  const rows = [];
  const watched = (target, type) =>
    target === window && ['scroll', 'resize'].includes(type) ||
    target === document && ['pointermove', 'pointerleave'].includes(type) ||
    target === window.visualViewport && type === 'resize';
  EventTarget.prototype.addEventListener = function(type, fn, options) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    if (watched(this, type) && !rows.some(r => r.target === this && r.type === type && r.fn === fn && r.capture === capture)) rows.push({target:this,type,fn,capture});
    return add.call(this, type, fn, options);
  };
  EventTarget.prototype.removeEventListener = function(type, fn, options) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    const index = rows.findIndex(r => r.target === this && r.type === type && r.fn === fn && r.capture === capture);
    if (index >= 0) rows.splice(index, 1);
    return remove.call(this, type, fn, options);
  };
  const Native = ResizeObserver, observers = new Set();
  window.ResizeObserver = class extends Native {
    observe(...args) { observers.add(this); return super.observe(...args); }
    disconnect() { observers.delete(this); return super.disconnect(); }
  };
  window.resources = () => ({
    scroll: rows.filter(r => r.target === window && r.type === 'scroll').length,
    resize: rows.filter(r => r.target === window && r.type === 'resize').length,
    pointer: rows.filter(r => r.target === document && r.type === 'pointermove').length,
    leave: rows.filter(r => r.target === document && r.type === 'pointerleave').length,
    viewport: rows.filter(r => r.target === window.visualViewport && r.type === 'resize').length,
    observers: observers.size,
  });
}

export async function verifyConsumers({ output, report, endpoints }) {
  const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    for (const [kind, origin] of endpoints) {
      console.log('Browser matrix: ' + kind);
      const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
      const errors = [], unexpected = [];
      await page.addInitScript(instrument);
      await page.route('**/favicon.ico', route => route.fulfill({status:204}));
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404 (Not Found)')) errors.push(message.text()); });
      page.on('request', request => { if (new URL(request.url()).origin !== origin) unexpected.push(request.url()); });
      page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).pathname !== '/broken.mp4') errors.push(response.status() + ' ' + response.url()); });
      await page.goto(origin);
      await page.waitForFunction(() => window.fixtureReady).catch(error => { throw new Error(kind + ': ' + errors.join(' | '), {cause:error}); });
      await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 2), `${kind}: two videos ready`);
      assert.equal(await page.evaluate(() => window.triggerCount()), 2, 'one entrance ScrollTrigger per instance');
      assert.equal(await page.locator('[data-wds-tilt]').count(), 2);
      assert.equal(await page.locator('canvas').count(), 0, 'no GPU dependency');
      assert.equal(await page.locator('[data-wds-tilt] h2').first().evaluate(el => getComputedStyle(el).color), 'rgb(23, 56, 44)', 'host theme consumed');
      assert.equal(await page.evaluate(() => {const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return new Set(ids).size===ids.length;}), true, 'instance IDs are unique');
      if (kind === 'strict-development') {
        assert.ok(Number(await page.locator('body').getAttribute('data-setups')) >= 2, 'React development StrictMode replays mount');
        assert.ok(Number(await page.locator('body').getAttribute('data-cleanups')) >= 1);
      }
      await page.screenshot({ path: join(output, kind + '-normal.png'), fullPage: false });
      // Warm the library's process-global plugin resources, then establish an unmounted baseline.
      await page.getByRole('button', {name:'Unmount', exact:true}).click();
      await eventually(async () => assert.equal(await page.evaluate(() => window.triggerCount()), 0), 'triggers released');
      const baseline = await page.evaluate(() => window.resources());
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.getByRole('button', {name:'Mount', exact:true}).click();
        await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 2), 'remounted video pair ready');
        const mounted = await page.evaluate(() => window.resources());
        const delta = Object.fromEntries(Object.keys(baseline).map(key => [key, mounted[key] - baseline[key]]));
        assert.deepEqual(delta, {scroll:4,resize:4,pointer:2,leave:2,viewport:2,observers:2}, `${kind}: exact resources for two scrub videos + two independent card runtimes`);
        assert.equal(await page.evaluate(() => window.triggerCount()), 2);
        await page.getByRole('button', {name:'Update props'}).click();
        await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 2), 'changed sources decoded');
        assert.equal(await page.evaluate(() => window.triggerCount()), 2, 'prop changes replace effects');
        assert.deepEqual(await page.evaluate(() => window.resources()), mounted, 'prop changes do not add listeners');
        await page.getByRole('button', {name:'Unmount', exact:true}).click();
        await eventually(async () => assert.deepEqual(await page.evaluate(() => window.resources()), baseline), 'unmount restores baseline');
      }
      await page.getByRole('button', {name:'Mount', exact:true}).click();
      await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 2), 'ready for movement');
      // Pointer response and keyboard semantics.
      const card = page.locator('[data-wds-tilt]').first(), visual = card.locator('[data-proximity-visual]');
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      const neutral = await visual.evaluate(el => getComputedStyle(el).transform);
      await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
      await eventually(async () => assert.notEqual(await visual.evaluate(el => getComputedStyle(el).transform), neutral), 'pointer tilt response');
      await page.getByRole('link', {name:'Read item 1'}).focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Read item 1');
      assert.notEqual(await page.getByRole('link', {name:'Read item 1'}).evaluate(el => getComputedStyle(el).outlineStyle), 'none');
      // Seek forward, backward, then resize at a nonzero scroll position.
      const video = page.locator('video').first();
      await page.locator('.wds-scrub').first().evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (el.clientHeight-innerHeight)*.7));
      await eventually(async () => assert.ok(await video.evaluate(el => el.currentTime) > 1), 'forward seek');
      await page.locator('.wds-scrub').first().evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (el.clientHeight-innerHeight)*.2));
      await eventually(async () => assert.ok(await video.evaluate(el => el.currentTime) < .7), 'reverse seek');
      await page.setViewportSize({width:1000,height:800});
      await eventually(async () => {
        const values = await video.evaluate(el => {const r=el.closest('section').getBoundingClientRect(); return [el.currentTime,Math.max(0,Math.min(1,-r.top/(r.height-innerHeight)))*(el.duration-.001)];});
        assert.ok(Math.abs(values[0]-values[1])<.06);
      }, 'resize updates mapping');
      if (kind === 'next') {
        const savedScroll = await page.evaluate(() => scrollY);
        await page.reload();
        await page.waitForFunction(() => window.fixtureReady);
        await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 2), 'restored media ready');
        await eventually(async () => assert.ok(Math.abs(await page.evaluate(() => scrollY) - savedScroll) < 2), 'browser restores scroll on reload');
        await eventually(async () => {
          const values = await video.evaluate(el => {const r=el.closest('section').getBoundingClientRect();return [el.currentTime,Math.max(0,Math.min(1,-r.top/(r.height-innerHeight)))*(el.duration-.001)];});
          assert.ok(Math.abs(values[0]-values[1])<.06);
        }, 'restored scroll seeks to matching frame');
      }
      await page.setViewportSize({width:390,height:844});
      await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 0), 'live narrow layout releases media');
      assert.equal(await video.getAttribute('src'), null);
      await page.setViewportSize({width:1000,height:800});
      await eventually(async () => {
        const states = await page.locator('video').evaluateAll(clips => clips.map(clip => ({
          ready: clip.closest('section').hasAttribute('data-wds-ready'), readyState: clip.readyState,
          networkState: clip.networkState, error: clip.error?.message, time: clip.currentTime,
        })));
        assert.equal(states.filter(state => state.ready).length, 2, JSON.stringify(states));
      }, 'wide layout resumes eligible media');
      // Live preference switches return content to readable, non-pinned natural flow.
      await page.emulateMedia({reducedMotion:'reduce'});
      await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 0), 'live reduced motion');
      assert.equal(await page.evaluate(() => window.triggerCount()), 0);
      assert.equal(await video.getAttribute('src'), null, 'media source released');
      assert.equal(await page.locator('.wds-scrub-stage').first().evaluate(el => getComputedStyle(el).position), 'static');
      assert.equal(await page.locator('[data-wds-reveal]').first().evaluate(el => getComputedStyle(el).opacity), '1');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 2), 'motion restored');
      await page.getByRole('button', {name:'Toggle failed media'}).click();
      await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 0), 'failed media has no pinned track');
      assert.equal(await page.locator('.wds-scrub-poster').first().isVisible(), true);
      assert.equal(await page.locator('.wds-scrub-stage').first().evaluate(el => getComputedStyle(el).position), 'static');
      await page.getByRole('button', {name:'Toggle failed media'}).click();
      await eventually(async () => assert.equal(await page.locator('[data-wds-ready]').count(), 2), 'new healthy source recovers');
      assert.deepEqual(errors, [], `${kind}: console and hydration errors`);
      assert.deepEqual(unexpected, [], 'no external traffic');
      report.assertions.push(kind + ': install, theme, instances, lifecycle, keyboard, seek, resize, preference and failure recovery');
      await page.close();
    }
    // Hold decoded-frame readiness while metadata is available. Resize/scroll must
    // not seek away from the first frame and prevent the ready transition.
    const loading = await browser.newPage({viewport:{width:1200,height:900}});
    await loading.addInitScript(() => {
      const ready = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState');
      const time = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
      window.holdFrames = true; window.prematureSeeks = [];
      window.nativeMediaReady = clip => ready.get.call(clip);
      Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
        ...ready, get() { const value = ready.get.call(this); return window.holdFrames ? Math.min(1, value) : value; },
      });
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        ...time, set(value) { if (window.holdFrames) window.prematureSeeks.push(value); time.set.call(this, value); },
      });
    });
    await loading.goto(endpoints.find(([kind]) => kind === 'next')[1]);
    await loading.waitForFunction(() => window.fixtureReady && [...document.querySelectorAll('video')].every(clip => window.nativeMediaReady(clip) >= 2));
    await loading.evaluate(async () => {
      scrollTo(0, 800); dispatchEvent(new Event('resize'));
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    });
    assert.deepEqual(await loading.evaluate(() => window.prematureSeeks), [], 'metadata-only media is not sought');
    assert.equal(await loading.locator('[data-wds-ready]').count(), 0, 'loading retains the poster');
    await loading.evaluate(() => { window.holdFrames = false; document.querySelectorAll('video').forEach(clip => clip.dispatchEvent(new Event('canplay'))); });
    await eventually(async () => assert.equal(await loading.locator('[data-wds-ready]').count(), 2), 'decoded frames activate both instances');
    report.assertions.push('metadata-only loading: no premature seeks, permanent poster, decoded-frame recovery');
    await loading.close();
    for (const [name, options] of [
      ['reduced', {reducedMotion:'reduce',viewport:{width:1200,height:900}}],
      ['narrow', {viewport:{width:390,height:844}}],
      ['coarse', {hasTouch:true,isMobile:true,viewport:{width:1024,height:900}}],
      ['no-js', {javaScriptEnabled:false,viewport:{width:1200,height:900}}],
    ]) {
      const context = await browser.newContext(options);
      const page = await context.newPage(), media = [];
      page.on('request', request => { if (/\.mp4/.test(request.url())) media.push(request.url()); });
      await page.goto(endpoints.find(([kind]) => kind === 'next')[1]);
      if (name !== 'no-js') await page.waitForFunction(() => window.fixtureReady);
      assert.equal(await page.locator('[data-wds-entrance] h2').count(), 2, 'SSR content retained');
      assert.equal(await page.locator('[data-wds-tilt] a').count(), 2);
      assert.equal(await page.locator('.wds-scrub-poster').count(), 2);
      assert.equal(await page.locator('.wds-scrub-stage').first().evaluate(el => getComputedStyle(el).position), 'static');
      assert.ok(await page.locator('.wds-scrub').first().evaluate(el => el.clientHeight < innerHeight), 'no empty scroll runway');
      await eventually(async () => assert.equal(await page.locator('[data-wds-entrance] h2').first().evaluate(el => getComputedStyle(el).opacity), '1'), name + ': readable heading');
      assert.deepEqual(media, [], name + ': no video downloaded');
      if (name === 'coarse' || name === 'reduced') {
        const card = page.locator('[data-wds-tilt]').first();
        await card.scrollIntoViewIfNeeded();
        const box = await card.boundingBox();
        await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
        assert.equal(await card.locator('[data-proximity-visual]').evaluate(el => Number(el.style.getPropertyValue('--cinematic-proximity'))), 0, 'static card response');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
      await page.screenshot({path:join(output, name + '.png'),fullPage:true});
      report.assertions.push(name + ': readable Next markup, natural flow, no video fetch, no overflow');
      await context.close();
    }
  } finally { await browser.close(); }
}
