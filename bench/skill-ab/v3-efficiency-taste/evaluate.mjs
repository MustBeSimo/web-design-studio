import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright-core";
import { EXPERIMENT, REPO, isolateBrowserContext, loadConfig, normalizeText, readJson, serveDirectory, writeJson } from "./lib.mjs";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const GL_ARGS = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

const leafCopy = `(() => [...document.querySelectorAll('h1,h2,h3,h4,p,li,figcaption,a,button')]
  .filter(e => ![...e.children].some(c => /^(H1|H2|H3|H4|P|LI|FIGCAPTION|A|BUTTON)$/.test(c.tagName)))
  .map(e => (e.innerText || '').replace(/\\s+/g,' ').trim()).filter(Boolean))()`;

export function analyzeCopy(rendered, copy) {
  const normalized = normalizeText(rendered.text);
  const missing = copy.required.filter((phrase) => !normalized.includes(normalizeText(phrase)));
  const approved = [...copy.required, ...(copy.allowedUi || [])].map(normalizeText).sort((a, b) => b.length - a.length);
  const elements = rendered.elements || [];
  const addedClaimCandidates = [...new Map(elements.map((text) => {
    let residual = normalizeText(text);
    for (const allowed of approved) residual = residual.split(allowed).join(" ");
    residual = residual.replace(/[^a-z0-9$€£%]+/g, " ").replace(/\s+/g, " ").trim();
    return [text, residual];
  }).filter(([, residual]) => residual.length >= 4)).entries()].map(([text, residual]) => ({ text, residual }));
  return { missing, missingCount: missing.length, addedClaimCandidates, requiresManualClaimReview: addedClaimCandidates.length > 0 };
}

export function countVisualStateChanges(opening, ending) {
  return ending.reduce((count, end, index) => {
    const start = opening[index];
    if (!start || start.key !== end.key) return count;
    const changed = Math.abs(start.x - end.x) > 3 || Math.abs(start.documentY - end.documentY) > 3
      || Math.abs(start.w - end.w) > 3 || Math.abs(start.h - end.h) > 3
      || start.opacity !== end.opacity || start.transform !== end.transform || start.clipPath !== end.clipPath
      || start.backgroundColor !== end.backgroundColor;
    return count + (changed ? 1 : 0);
  }, 0);
}

export function isUsableImageEvidence(image) {
  return Boolean(image?.complete && Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0);
}

export function isIgnorableConsoleError(text, locationUrl = '') {
  return /failed to load resource/i.test(String(text)) && /\/favicon\.ico(?:[?#]|$)/i.test(String(locationUrl));
}

export function passesModelProof(profile, failureModes, observedAssets, noJs) {
  return profile.visibleCanvas && profile.webglContexts.length > 0 && profile.modelState === "ready"
    && profile.modelProof?.statesDiffer && profile.modelProof?.nonDominantRatio >= .01 && profile.modelProof?.changedRatio >= .005
    && observedAssets.has("axis-24.glb") && noJs.posterVisible
    && Object.values(failureModes).every((mode) => mode.uncaught.length === 0 && (mode.externalRequests || []).length === 0
      && mode.posterVisible && mode.modelState === "fallback" && mode.missingCopy.length === 0);
}

const hasEveryAsset = (profile, names) => names.every((name) => profile.renderedAssets?.includes(name));

export function passesSignatureProof(briefId, profiles, noJs, requiredUsage) {
  if (briefId === "three-d") return true;
  const samples = profiles.desktop.signatureSamples || [];
  const sticky = samples.some((sample) => sample.targetPinned);
  const visualStates = new Set(samples.map((sample) => JSON.stringify(sample.targetVisual)).filter((value) => value !== undefined));
  const fallbacksExposeAssets = [profiles["desktop-reduced"], profiles["mobile-reduced"]]
    .every((profile) => hasEveryAsset(profile, requiredUsage)) && hasEveryAsset(noJs, requiredUsage);
  if (briefId === "editorial") {
    const chapters = new Set(samples.map((sample) => sample.routeChapter).filter((value) => /^[123]$/.test(value)));
    return sticky && chapters.size === 3 && visualStates.size >= 3 && fallbacksExposeAssets;
  }
  if (briefId === "product") {
    const progress = samples.map((sample) => Number(sample.hingeProgress));
    const valid = progress.length >= 3 && progress.every(Number.isFinite)
      && Math.min(...progress) <= .15 && Math.max(...progress) >= .85
      && progress.every((value, index) => index === 0 || value + .02 >= progress[index - 1]);
    return sticky && valid && visualStates.size >= 3 && fallbacksExposeAssets;
  }
  return false;
}

async function analyzeCanvasFrames(page, first, second) {
  return page.evaluate(async ({ a, b }) => {
    const decode = async (base64) => {
      const response = await fetch(`data:image/png;base64,${base64}`); const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); return context.getImageData(0, 0, bitmap.width, bitmap.height);
    };
    const one = await decode(a), two = await decode(b); const total = Math.min(one.data.length, two.data.length) / 4;
    const histogram = new Map(); let changed = 0;
    for (let i = 0; i < total * 4; i += 4) {
      const key = `${one.data[i] >> 3},${one.data[i+1] >> 3},${one.data[i+2] >> 3},${one.data[i+3] >> 5}`;
      histogram.set(key, (histogram.get(key) || 0) + 1);
      if (Math.abs(one.data[i]-two.data[i]) + Math.abs(one.data[i+1]-two.data[i+1]) + Math.abs(one.data[i+2]-two.data[i+2]) > 24) changed++;
    }
    const dominant = Math.max(...histogram.values());
    return { pixels: total, nonDominantPixels: total - dominant, nonDominantRatio: (total - dominant) / total, changedPixels: changed, changedRatio: changed / total };
  }, { a: first.toString('base64'), b: second.toString('base64') });
}

async function inspectPage(browser, url, brief, copy, kit) {
  const profiles = [
    { id: "desktop", viewport: { width: 1440, height: 900 } },
    { id: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { id: "desktop-reduced", viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" },
    { id: "mobile-reduced", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" }
  ];
  const reports = {};
  for (const profile of profiles) {
    const context = await browser.newContext(profile);
    const page = await context.newPage();
    const uncaught = [], consoleErrors = [], failedRequests = [], externalRequests = [], responses = [];
    await isolateBrowserContext(context, url, externalRequests);
    await page.addInitScript(() => {
      window.__BENCH_WEBGL__ = [];
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, options) {
        const result = original.call(this, type, options);
        if (/webgl/i.test(type) && result) window.__BENCH_WEBGL__.push(type);
        return result;
      };
    });
    page.on("pageerror", (error) => uncaught.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !isIgnorableConsoleError(message.text(), message.location().url)) consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on("response", (response) => responses.push({ url: response.url(), status: response.status() }));
    await page.goto(`${url}/index.html`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);
    const opening = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,p,img,canvas")].slice(0, 100).map((e, i) => {
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return { key: `${e.tagName}:${i}:${(e.textContent||e.getAttribute('src')||'').trim().slice(0,32)}`, x: r.x, documentY: r.y + scrollY, w: r.width, h: r.height, opacity: s.opacity, transform: s.transform, clipPath: s.clipPath, backgroundColor: s.backgroundColor };
    }));
    await page.evaluate(() => scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - innerHeight) * .62)));
    await page.waitForTimeout(1200);
    const result = await page.evaluate((leafExpression) => {
      const elements = (0, eval)(leafExpression);
      const visiblePoster = [...document.images].some((image) => {
        const r = image.getBoundingClientRect(); const s = getComputedStyle(image);
        return /axis-poster\.svg/i.test(image.currentSrc || image.src) && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
          && r.width > 10 && r.height > 10 && s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0;
      });
      return {
        text: document.body.innerText,
        elements,
        docHeight: document.documentElement.scrollHeight,
        viewportHeight: innerHeight,
        overflowX: document.documentElement.scrollWidth - innerWidth,
        h1Count: document.querySelectorAll("h1").length,
        visibleCanvas: [...document.querySelectorAll("canvas")].some((canvas) => { const r=canvas.getBoundingClientRect(); const s=getComputedStyle(canvas); return r.width>20&&r.height>20&&s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)>0; }),
        visiblePoster,
        webglContexts: window.__BENCH_WEBGL__ || [],
        modelState: document.documentElement.dataset.modelState || null,
        cameraState: document.querySelector('canvas[data-camera-state]')?.dataset.cameraState || null,
        endState: [...document.querySelectorAll("h1,h2,h3,p,img,canvas")].slice(0, 100).map((e,i) => { const r=e.getBoundingClientRect(); const s=getComputedStyle(e); return {key:`${e.tagName}:${i}:${(e.textContent||e.getAttribute('src')||'').trim().slice(0,32)}`,x:r.x,documentY:r.y+scrollY,w:r.width,h:r.height,opacity:s.opacity,transform:s.transform,clipPath:s.clipPath,backgroundColor:s.backgroundColor}; })
      };
    }, leafCopy);
    result.renderedAssets = await page.evaluate((names) => names.filter((name) => [...document.querySelectorAll('body *')].some((element) => {
      const request = [element.currentSrc, element.src, element.data, element.getAttribute('src'), getComputedStyle(element).backgroundImage].filter(Boolean).join(' ');
      if (!request.includes(name)) return false;
      const r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return r.width > 4 && r.height > 4 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0;
    })), kit.requiredUsage);
    const changedNodes = countVisualStateChanges(opening, result.endState);
    reports[profile.id] = {
      ...result,
      text: undefined,
      elements: undefined,
      endState: undefined,
      changedNodes,
      copy: null,
      errors: { uncaught, consoleErrors, failedRequests, externalRequests },
      requestedAssets: kit.requiredUsage.filter((name) => responses.some((response) => response.status < 400 && response.url.includes(name)))
    };
    // analyzeCopy accepts a string for normalization and the elements for claim review.
    reports[profile.id].copy = analyzeCopy({ text: result.text, elements: result.elements }, copy);
    if (brief.id !== "three-d" && profile.id === "desktop") {
      reports[profile.id].signatureSamples = [];
      for (const fraction of brief.captureFractions) {
        await page.evaluate((value) => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * value)), fraction);
        await page.waitForTimeout(350);
        reports[profile.id].signatureSamples.push(await page.evaluate(() => {
          const target = document.querySelector('[data-route-line], [data-product-stage]');
          const targetVisual = target ? (() => { const r=target.getBoundingClientRect(), s=getComputedStyle(target); return { x:Math.round(r.x), w:Math.round(r.width), h:Math.round(r.height), opacity:s.opacity, transform:s.transform, clipPath:s.clipPath, backgroundImage:s.backgroundImage }; })() : null;
          let owner = target, targetPinned = false;
          while (owner && owner !== document.body) { if (getComputedStyle(owner).position === 'sticky') { targetPinned = true; break; } owner = owner.parentElement; }
          return { routeChapter: document.documentElement.dataset.routeChapter || null, hingeProgress: document.documentElement.dataset.hingeProgress || null, targetVisual, targetPinned };
        }));
      }
    }
    if (brief.id === "three-d" && profile.id === "desktop") {
      const canvas = page.locator("canvas:visible").first();
      if (await canvas.count()) {
        await page.evaluate(() => scrollTo(0, Math.round((document.documentElement.scrollHeight-innerHeight)*.28))); await page.waitForTimeout(900);
        const firstState = await canvas.getAttribute("data-camera-state"); const firstFrame = await canvas.screenshot();
        await page.evaluate(() => scrollTo(0, Math.round((document.documentElement.scrollHeight-innerHeight)*.61))); await page.waitForTimeout(900);
        const secondState = await canvas.getAttribute("data-camera-state"); const secondFrame = await canvas.screenshot();
        reports[profile.id].modelProof = { firstState, secondState, statesDiffer: Boolean(firstState && secondState && firstState !== secondState), ...(await analyzeCanvasFrames(page, firstFrame, secondFrame)) };
      } else reports[profile.id].modelProof = { statesDiffer: false, nonDominantRatio: 0, changedRatio: 0 };
    }
    await context.close();
  }
  return reports;
}

async function failureMode(browser, url, copy, abortPattern) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const uncaught = [], externalRequests = [];
  await isolateBrowserContext(context, url, externalRequests);
  page.on("pageerror", (error) => uncaught.push(error.message));
  await page.route(abortPattern, (route) => route.abort("failed"));
  await page.goto(`${url}/index.html`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(5000);
  const state = await page.evaluate(() => ({
    text: document.body.innerText,
    poster: [...document.images].some((image) => { const r=image.getBoundingClientRect(); const s=getComputedStyle(image); return /axis-poster\.svg/i.test(image.currentSrc||image.src)&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0&&r.width>10&&r.height>10&&s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)>0; }),
    modelState: document.documentElement.dataset.modelState || null
  }));
  await context.close();
  return { uncaught, externalRequests, posterVisible: state.poster, modelState: state.modelState, missingCopy: copy.required.filter((phrase) => !normalizeText(state.text).includes(normalizeText(phrase))) };
}

async function noJavaScript(browser, url, copy, briefId, kit) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();
  const externalRequests = [];
  await isolateBrowserContext(context, url, externalRequests);
  await page.goto(`${url}/index.html`, { waitUntil: "load", timeout: 30000 });
  const state = await page.evaluate((names) => ({ text: document.body.innerText, poster: [...document.images].some((image) => { const r=image.getBoundingClientRect(); return /axis-poster\.svg/i.test(image.currentSrc||image.src)&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0&&r.width>10&&r.height>10; }), renderedAssets: names.filter((name) => [...document.querySelectorAll('body *')].some((element) => { const s=getComputedStyle(element),request=[element.currentSrc,element.src,element.data,element.getAttribute('src'),s.backgroundImage].filter(Boolean).join(' '); const r=element.getBoundingClientRect(); return request.includes(name)&&r.width>4&&r.height>4&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0; })) }), kit.requiredUsage);
  await context.close();
  return { externalRequests, missingCopy: copy.required.filter((phrase) => !normalizeText(state.text).includes(normalizeText(phrase))), posterVisible: briefId !== "three-d" || state.poster, renderedAssets: state.renderedAssets };
}

export async function evaluateRun(runDirectory, brief) {
  const index = join(runDirectory, "index.html");
  if (!existsSync(index)) {
    const report = { status: "failed", functionalComplete: false, reason: "index.html missing" };
    writeJson(join(runDirectory, "evaluation.json"), report);
    return report;
  }
  if (!existsSync(CHROME)) throw new Error(`Chrome missing at ${CHROME}; set CHROME_PATH`);
  const copy = readJson(join(EXPERIMENT, brief.copy));
  const kit = readJson(join(EXPERIMENT, brief.kit));
  const server = await serveDirectory(runDirectory);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: GL_ARGS });
  try {
    const profiles = await inspectPage(browser, server.url, brief, copy, kit);
    const noJs = await noJavaScript(browser, server.url, copy, brief.id, kit);
    const doctor = spawnSync(process.execPath, [join(REPO, "tools/cinematic-doctor/cli.mjs"), index, "--json", "--quiet"], { cwd: REPO, encoding: "utf8" });
    let doctorReport = null;
    try { doctorReport = JSON.parse(doctor.stdout); } catch { doctorReport = { error: doctor.stderr.trim() || "doctor output was not JSON", exitCode: doctor.status }; }
    const report = { generatedAt: new Date().toISOString(), status: "complete", briefId: brief.id, profiles, noJavaScript: noJs, diagnostics: { doctor: doctorReport } };
    if (brief.id === "three-d") {
      report.failureModes = {
        missingModel: await failureMode(browser, server.url, copy, "**/axis-24.glb"),
        missingViewer: await failureMode(browser, server.url, copy, "**/axis-viewer.js")
      };
    }
    const everyProfile = Object.values(profiles);
    const requiredAssets = new Set(kit.requiredUsage);
    const observedAssets = new Set(everyProfile.flatMap((profile) => profile.requestedAssets));
    const commonPass = everyProfile.every((profile) => profile.copy.missingCount === 0 && profile.overflowX <= 2 && profile.h1Count === 1
      && profile.errors.uncaught.length === 0 && profile.errors.consoleErrors.length === 0
      && profile.errors.failedRequests.length === 0 && profile.errors.externalRequests.length === 0)
      && noJs.missingCopy.length === 0 && noJs.externalRequests.length === 0;
    const assetsPass = [...requiredAssets].every((asset) => observedAssets.has(asset) || (asset === "axis-poster.svg" && noJs.posterVisible));
    const motionPass = profiles.desktop.docHeight >= profiles.desktop.viewportHeight * 2.5 && profiles.desktop.changedNodes > 0;
    const signaturePass = passesSignatureProof(brief.id, profiles, noJs, kit.requiredUsage);
    let specialPass = true;
    if (brief.id === "three-d") specialPass = passesModelProof(profiles.desktop, report.failureModes, observedAssets, noJs);
    report.checks = { commonPass, assetsPass, motionPass, signaturePass, specialPass };
    report.functionalComplete = commonPass && assetsPass && motionPass && signaturePass && specialPass;
    report.requiresManualClaimReview = everyProfile.some((profile) => profile.copy.requiresManualClaimReview);
    writeJson(join(runDirectory, "evaluation.json"), report);
    return report;
  } finally {
    await browser.close();
    await server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [runDirectory, briefId] = process.argv.slice(2);
  const brief = loadConfig().briefs.find((item) => item.id === briefId);
  if (!runDirectory || !brief) { console.error("usage: node evaluate.mjs <run-directory> <brief-id>"); process.exit(2); }
  const report = await evaluateRun(runDirectory, brief);
  console.log(JSON.stringify(report, null, 2));
  if (!report.functionalComplete) process.exitCode = 1;
}
