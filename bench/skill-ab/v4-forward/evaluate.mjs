#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { BRIEF, isolateBrowserContext, loadConfig, normalizeText, readJson, serveDirectory, sha256File, writeJson } from "./lib.mjs";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const GL_ARGS = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

export function bodyStrings(copy, statusKey) {
  return [
    copy.hero.eyebrow, copy.hero.title, copy.hero.intro,
    ...copy.chapters.flatMap((chapter) => [chapter.label, chapter.title, chapter.body]),
    copy.hero.primaryAction, copy.hero.secondaryAction,
    copy.method.label, copy.method.text, copy.footer, copy.status[statusKey]
  ];
}

export function assessExactBodyText(text, expected) {
  let residual = normalizeText(text);
  const missing = [];
  const duplicated = [];
  for (const phrase of [...expected].sort((a, b) => b.length - a.length)) {
    const normalized = normalizeText(phrase);
    let count = 0;
    let index = residual.indexOf(normalized);
    while (index >= 0) {
      count += 1;
      residual = `${residual.slice(0, index)} ${residual.slice(index + normalized.length)}`;
      index = residual.indexOf(normalized);
    }
    if (count === 0) missing.push(phrase);
    if (count > 1) duplicated.push({ phrase, count });
  }
  residual = normalizeText(residual).replace(/^[|/·—–\-\s]+|[|/·—–\-\s]+$/g, "").trim();
  return { missing, duplicated, unexpected: residual };
}

export function summarizeAssetRequests(urls, pageUrl, expectedAssets) {
  const origin = new URL(pageUrl).origin;
  const paths = urls.flatMap((value) => {
    try {
      const parsed = new URL(value);
      if (parsed.origin !== origin || parsed.pathname === "/" || parsed.pathname === "/index.html" || parsed.pathname === "/favicon.ico") return [];
      return [decodeURIComponent(parsed.pathname).replace(/^\//, "")];
    } catch { return []; }
  });
  const expected = [...expectedAssets].sort();
  const distinct = [...new Set(paths)].sort();
  return {
    paths,
    distinct,
    missing: expected.filter((path) => !distinct.includes(path)),
    unexpected: distinct.filter((path) => !expected.includes(path)),
    duplicates: [...new Set(paths.filter((path, index) => paths.indexOf(path) !== index))].sort(),
    exactThree: paths.length === 3 && distinct.length === 3 && JSON.stringify(distinct) === JSON.stringify(expected)
  };
}

export function pixelDifference(one, two) {
  const length = Math.min(one.length, two.length);
  let changed = 0;
  for (let index = 0; index + 3 < length; index += 4) {
    if (Math.abs(one[index] - two[index]) + Math.abs(one[index + 1] - two[index + 1]) + Math.abs(one[index + 2] - two[index + 2]) > 24) changed += 1;
  }
  const pixels = Math.floor(length / 4);
  return { pixels, changedPixels: changed, changedRatio: pixels ? changed / pixels : 0 };
}

export function progressTracksScroll(entries, minimumProgress = .3, minimumScroll = 100) {
  for (let one = 0; one < entries.length; one += 1) {
    for (let two = one + 1; two < entries.length; two += 1) {
      if (Math.abs(entries[two].value - entries[one].value) >= minimumProgress
        && Math.abs(entries[two].scrollY - entries[one].scrollY) >= minimumScroll) return true;
    }
  }
  return false;
}

export function profilePasses(profile) {
  const context = profile.webglContexts.find((entry) => entry.canvasId === profile.canvasId);
  const ready = profile.renderEvents.find((entry) => entry.state === "ready");
  const decoded = profile.posterDecode.find((entry) => Number.isFinite(entry.completedAt));
  const progressValues = context?.progress?.map((entry) => entry.value) || [];
  const progressRange = progressValues.length ? Math.max(...progressValues) - Math.min(...progressValues) : 0;
  const common = profile.state === "ready" && profile.statusMatches && profile.copy.missing.length === 0
    && profile.copy.duplicated.length === 0 && !profile.copy.unexpected && profile.visibleCopy.every(Boolean)
    && profile.metadata && profile.posterDecoded && !profile.posterVisible && decoded
    && profile.canvasFallbackMatches && profile.canvasVisible && context?.drawCalls > 0
    && /orbit-field-viewer\.js/i.test(context?.stack || "") && Number.isFinite(context?.firstDrawAt)
    && ready && context.firstDrawAt <= ready.at && decoded.completedAt <= ready.at
    && profile.externalRequests.length === 0 && profile.uncaught.length === 0
    && profile.consoleErrors.length === 0 && profile.failedRequests.length === 0
    && profile.assetRequests.exactThree && profile.assetResponsesOk && profile.h1Count === 1 && profile.headingsValid
    && profile.overflowX <= 1 && profile.anchor.valid && profile.anchor.works && profile.toggle.works
    && profile.scrollable;
  if (profile.id === "mobile") return common && profile.mobile.stageInFlow && profile.mobile.stageRatio >= .7
    && profile.mobile.stageRatio <= .95 && profile.mobile.minControlSize >= 44 && profile.mobile.bodyFontSize >= 16
    && profile.motion.firstNonDominantRatio >= .01 && profile.motion.secondNonDominantRatio >= .01
    && profile.motion.changedRatio >= .004 && progressRange >= .3 && progressTracksScroll(context.progress);
  if (profile.id === "reduced") return common && profile.motion.firstNonDominantRatio >= .01
    && profile.motion.secondNonDominantRatio >= .01 && profile.motion.changedRatio <= .002 && progressRange <= .001
    && progressValues.some((value) => Math.abs(value - .52) <= .02);
  return common && profile.motion.firstNonDominantRatio >= .01 && profile.motion.secondNonDominantRatio >= .01
    && profile.motion.changedRatio >= .004 && profile.motion.changedRatio >= profile.motion.ambientChangedRatio * 1.5
    && progressRange >= .3 && progressTracksScroll(context.progress);
}

export function failurePasses(failure) {
  const fallback = failure.renderEvents.find((entry) => entry.state === "fallback");
  const decoded = failure.posterDecode.find((entry) => Number.isFinite(entry.completedAt));
  return failure.settledMs <= 4100 && failure.state === "fallback" && failure.statusMatches
    && failure.copy.missing.length === 0 && failure.copy.duplicated.length === 0 && !failure.copy.unexpected
    && failure.visibleCopy.every(Boolean) && failure.posterVisible && failure.posterDecoded && decoded
    && failure.externalRequests.length === 0 && failure.uncaught.length === 0
    && failure.unknownLocalRequests.length === 0 && failure.blockedAssetRequested && failure.anchor.valid
    && failure.anchor.works && failure.toggle.initiallyOpen && failure.toggle.works
    && fallback && decoded.completedAt <= fallback.at;
}

function isIgnorableConsoleError(text, locationUrl = "") {
  return /failed to load resource/i.test(String(text)) && /\/favicon\.ico(?:[?#]|$)/i.test(String(locationUrl));
}

async function canvasPixels(page, buffer) {
  return page.evaluate(async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    return [...context.getImageData(0, 0, bitmap.width, bitmap.height).data];
  }, buffer.toString("base64"));
}

function nonDominantRatio(bytes) {
  const histogram = new Map();
  for (let index = 0; index + 3 < bytes.length; index += 4) {
    const key = `${bytes[index] >> 3},${bytes[index + 1] >> 3},${bytes[index + 2] >> 3},${bytes[index + 3] >> 5}`;
    histogram.set(key, (histogram.get(key) || 0) + 1);
  }
  const pixels = Math.floor(bytes.length / 4);
  const dominant = histogram.size ? Math.max(...histogram.values()) : pixels;
  return pixels ? (pixels - dominant) / pixels : 0;
}

async function installEvidence(context, page, baseUrl, events) {
  await isolateBrowserContext(context, baseUrl, events.externalRequests);
  await page.addInitScript(() => {
    window.__V4_WEBGL__ = [];
    window.__V4_DECODE__ = [];
    window.__V4_RENDER_EVENTS__ = [];
    let canvasSequence = 0;
    const originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, options) {
      const value = originalContext.call(this, type, options);
      if (/^webgl2?$/i.test(String(type)) && value && !value.__v4Evidence) {
        this.dataset.v4CanvasId ||= `canvas-${++canvasSequence}`;
        const record = { canvasId: this.dataset.v4CanvasId, type: String(type), stack: String(new Error().stack || ""), drawCalls: 0, firstDrawAt: null, progress: [] };
        window.__V4_WEBGL__.push(record);
        const uniformNames = new Map();
        const originalLocation = value.getUniformLocation.bind(value);
        value.getUniformLocation = (program, name) => { const location = originalLocation(program, name); if (location) uniformNames.set(location, name); return location; };
        const originalUniform1f = value.uniform1f.bind(value);
        value.uniform1f = (location, number) => {
          if (uniformNames.get(location) === "uProgress") {
            const next = { value: Number(number), scrollY, at: performance.now() }, prior = record.progress.at(-1);
            if (!prior || Math.abs(next.value - prior.value) >= .01 || Math.abs(next.scrollY - prior.scrollY) >= 50) record.progress.push(next);
            if (record.progress.length > 200) record.progress.splice(1, record.progress.length - 200);
          }
          return originalUniform1f(location, number);
        };
        for (const method of ["drawArrays", "drawElements"]) {
          const originalDraw = value[method].bind(value);
          value[method] = (...args) => { record.drawCalls += 1; record.firstDrawAt ??= performance.now(); return originalDraw(...args); };
        }
        Object.defineProperty(value, "__v4Evidence", { value: true });
      }
      return value;
    };
    const originalDecode = HTMLImageElement.prototype.decode;
    if (originalDecode) HTMLImageElement.prototype.decode = function() {
      const record = { src: this.currentSrc || this.src || "", calledAt: performance.now(), completedAt: null };
      window.__V4_DECODE__.push(record);
      return originalDecode.call(this).then((value) => { record.completedAt = performance.now(); return value; });
    };
    addEventListener("renderstatechange", (event) => window.__V4_RENDER_EVENTS__.push({ state: event.detail?.state ?? null, at: performance.now() }));
  });
  page.on("request", (request) => events.requests.push(request.url()));
  page.on("response", (response) => events.responses.push({ url: response.url(), status: response.status() }));
  page.on("requestfailed", (request) => events.failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "failed" }));
  page.on("pageerror", (error) => events.uncaught.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !isIgnorableConsoleError(message.text(), message.location().url)) events.consoleErrors.push(message.text());
  });
}

async function inspectState(page, copy, statusKey) {
  const expected = bodyStrings(copy, statusKey);
  const state = await page.evaluate(({ expectedPhrases, expectedStatus, copyData }) => {
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const phraseVisible = (phrase) => {
      const candidates = [...document.body.querySelectorAll("*")].filter((element) => (element.innerText || "").replace(/\s+/g, " ").includes(phrase));
      candidates.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
      return candidates.length > 0 && visible(candidates[0]);
    };
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((node) => Number(node.tagName.slice(1)));
    const poster = [...document.images].find((image) => /assets\/poster\.svg(?:[?#]|$)/.test(image.currentSrc || image.src));
    const canvas = [...document.querySelectorAll("canvas")].find(visible) || null;
    const anchor = [...document.querySelectorAll("a")].find((node) => (node.innerText || "").trim() === copyData.hero.primaryAction);
    const button = [...document.querySelectorAll("button")].find((node) => (node.innerText || "").trim() === copyData.hero.secondaryAction);
    const status = document.querySelector("[data-render-status]");
    return {
      text: document.body.innerText,
      visibleCopy: expectedPhrases.map(phraseVisible),
      state: document.documentElement.getAttribute("data-render-state"),
      statusMatches: Boolean(status && status.getAttribute("role") === "status" && status.getAttribute("aria-live") === "polite" && status.innerText.trim() === expectedStatus),
      metadata: document.title === copyData.meta.title && document.querySelector('meta[name="description"]')?.content === copyData.meta.description
        && poster?.alt === copyData.media.posterAlt,
      posterDecoded: Boolean(poster?.complete && poster.naturalWidth > 0 && poster.naturalHeight > 0),
      posterVisible: Boolean(poster && visible(poster) && Number(getComputedStyle(poster).opacity) > .01),
      posterDecode: (window.__V4_DECODE__ || []).filter((record) => /poster\.svg/i.test(record.src)),
      canvasFallbackMatches: Boolean(canvas && canvas.textContent.includes(copyData.media.canvasFallback)),
      canvasVisible: Boolean(canvas && visible(canvas)),
      canvasId: canvas?.dataset.v4CanvasId || null,
      webglContexts: window.__V4_WEBGL__ || [],
      renderEvents: window.__V4_RENDER_EVENTS__ || [],
      h1Count: document.querySelectorAll("h1").length,
      headingsValid: headings[0] === 1 && headings.every((level, index) => index === 0 || level <= headings[index - 1] + 1),
      overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      scrollable: document.documentElement.scrollHeight >= innerHeight * 1.8,
      anchorValid: Boolean(anchor && anchor.getAttribute("href") === "#method" && document.getElementById("method")
        && document.getElementById("method").innerText.includes(copyData.method.label)
        && document.getElementById("method").innerText.includes(copyData.method.text)
        && document.getElementById("method").getBoundingClientRect().height > 20
        && button && (anchor.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)
        && anchor.tabIndex >= 0 && button.tabIndex >= 0),
      buttonExists: Boolean(button),
      buttonLabel: button?.innerText.trim() || null,
      buttonExpanded: button?.getAttribute("aria-expanded") || null
    };
  }, { expectedPhrases: expected, expectedStatus: copy.status[statusKey], copyData: copy });
  return { ...state, copy: assessExactBodyText(state.text, expected) };
}

async function testActions(page, copy) {
  const anchor = page.getByRole("link", { name: copy.hero.primaryAction, exact: true });
  const button = page.getByRole("button", { name: copy.hero.secondaryAction, exact: true });
  let anchorWorks = false;
  let toggle = { works: false, initiallyOpen: false };
  if (await anchor.count()) {
    await anchor.first().click();
    anchorWorks = new URL(page.url()).hash === "#method";
  }
  if (await button.count()) {
    const initial = await button.first().getAttribute("aria-expanded");
    const label = await button.first().innerText();
    const controls = await button.first().getAttribute("aria-controls");
    const regionVisible = async () => page.evaluate((id) => {
      const node = id ? document.getElementById(id) : null;
      if (!node) return null;
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    }, controls);
    const initialRegionVisible = await regionVisible();
    await button.first().click();
    const afterOne = await button.first().getAttribute("aria-expanded");
    const afterOneVisible = await regionVisible();
    await button.first().click();
    const afterTwo = await button.first().getAttribute("aria-expanded");
    const afterTwoVisible = await regionVisible();
    const finalLabel = await button.first().innerText();
    toggle = {
      initiallyOpen: initial === "true" && initialRegionVisible === true,
      works: Boolean(controls) && afterOne !== initial && afterTwo === initial
        && afterOneVisible !== initialRegionVisible && afterTwoVisible === initialRegionVisible
        && label === copy.hero.secondaryAction && finalLabel === label
    };
  }
  return { anchor: { valid: true, works: anchorWorks }, toggle };
}

async function inspectProfile(browser, baseUrl, runDirectory, copy, config, profile) {
  const context = await browser.newContext({ ...profile.context, serviceWorkers: "block" });
  const page = await context.newPage();
  const events = { requests: [], responses: [], externalRequests: [], failedRequests: [], uncaught: [], consoleErrors: [] };
  await installEvidence(context, page, baseUrl, events);
  const started = Date.now();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => ["ready", "fallback"].includes(document.documentElement.dataset.renderState), null, { timeout: 5000 });
  if (await page.evaluate(() => document.documentElement.dataset.renderState === "ready")) {
    await page.waitForFunction(() => {
      const poster = [...document.images].find((image) => /poster\.svg/i.test(image.currentSrc || image.src));
      return poster && Number(getComputedStyle(poster).opacity) <= .01;
    }, null, { timeout: 2000 }).catch(() => {});
  }
  let state = await inspectState(page, copy, "ready");
  const actions = await testActions(page, copy);
  const canvas = state.canvasId ? page.locator(`canvas[data-v4-canvas-id="${state.canvasId}"]`) : page.locator("canvas:visible").first();
  const motion = { changedRatio: 0, ambientChangedRatio: 0, firstNonDominantRatio: 0, secondNonDominantRatio: 0 };
  if (await canvas.count()) {
    await page.evaluate(() => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * .16)));
    await page.waitForTimeout(450);
    const first = await canvas.screenshot({ path: join(runDirectory, "evidence", `${profile.id}-progress-1.png`) });
    await page.waitForTimeout(450);
    const ambient = await canvas.screenshot({ path: join(runDirectory, "evidence", `${profile.id}-progress-1-control.png`) });
    await page.evaluate(() => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * .82)));
    await page.waitForTimeout(450);
    const second = await canvas.screenshot({ path: join(runDirectory, "evidence", `${profile.id}-progress-2.png`) });
    const firstPixels = await canvasPixels(page, first), ambientPixels = await canvasPixels(page, ambient), secondPixels = await canvasPixels(page, second);
    Object.assign(motion, pixelDifference(firstPixels, secondPixels), {
      ambientChangedRatio: pixelDifference(firstPixels, ambientPixels).changedRatio,
      firstNonDominantRatio: nonDominantRatio(firstPixels), secondNonDominantRatio: nonDominantRatio(secondPixels)
    });
  }
  const runtimeEvidence = await page.evaluate(() => ({ webglContexts: window.__V4_WEBGL__ || [], renderEvents: window.__V4_RENDER_EVENTS__ || [], posterDecode: window.__V4_DECODE__ || [] }));
  const mobile = await page.evaluate((canvasId) => {
    const canvas = canvasId ? document.querySelector(`canvas[data-v4-canvas-id="${canvasId}"]`) : [...document.querySelectorAll("canvas")].find((node) => { const r=node.getBoundingClientRect(),s=getComputedStyle(node); return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"; });
    if (!canvas) return { stageInFlow: false, stageRatio: 0, minControlSize: 0, bodyFontSize: 0 };
    let owner = canvas, stageInFlow = true;
    while (owner && owner !== document.body) {
      if (["fixed", "sticky"].includes(getComputedStyle(owner).position)) stageInFlow = false;
      owner = owner.parentElement;
    }
    const rect = canvas.getBoundingClientRect();
    const controls = [...document.querySelectorAll("a,button")].filter((node) => { const r=node.getBoundingClientRect(); return r.width>0&&r.height>0; });
    return {
      stageInFlow, stageRatio: rect.height ? rect.width / rect.height : 0,
      minControlSize: controls.length ? Math.min(...controls.map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))) : 0,
      bodyFontSize: parseFloat(getComputedStyle(document.body).fontSize)
    };
  }, state.canvasId);
  state = {
    ...state, ...runtimeEvidence, id: profile.id, ...events, settledMs: Date.now() - started,
    assetRequests: summarizeAssetRequests(events.requests, baseUrl, config.expectedAssets),
    assetResponsesOk: config.expectedAssets.every((asset) => events.responses.some((response) => response.url.endsWith(`/${asset}`) && response.status >= 200 && response.status < 300)),
    anchor: { valid: state.anchorValid, works: actions.anchor.works }, toggle: actions.toggle,
    motion, mobile
  };
  state.passed = profilePasses(state);
  await page.screenshot({ path: join(runDirectory, "evidence", `${profile.id}-page.png`), fullPage: true });
  await context.close();
  return state;
}

async function inspectNoJavaScript(browser, baseUrl, copy, config) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false, serviceWorkers: "block" });
  const page = await context.newPage();
  const externalRequests = [], requests = [];
  await isolateBrowserContext(context, baseUrl, externalRequests);
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "load", timeout: 30000 });
  const state = await inspectState(page, copy, "noJs");
  state.copy = assessExactBodyText(state.text, [...bodyStrings(copy, "noJs"), copy.media.canvasFallback]);
  const result = {
    ...state, externalRequests,
    assetRequests: summarizeAssetRequests(requests, baseUrl, config.expectedAssets),
    passed: state.copy.missing.length === 0 && state.copy.duplicated.length === 0 && !state.copy.unexpected
      && state.visibleCopy.every(Boolean) && state.posterDecoded && state.posterVisible && state.canvasFallbackMatches && state.anchorValid
      && state.h1Count === 1 && state.headingsValid && state.overflowX <= 1 && externalRequests.length === 0
  };
  await context.close();
  return result;
}

async function inspectFailure(browser, baseUrl, runDirectory, copy, config, asset) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const events = { requests: [], responses: [], externalRequests: [], failedRequests: [], uncaught: [], consoleErrors: [] };
  await installEvidence(context, page, baseUrl, events);
  await page.route(`**/${asset}`, (route) => route.abort("failed"));
  const started = Date.now();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.dataset.renderState === "fallback", null, { timeout: 4200 });
  await page.waitForFunction(() => [...document.images].some((image) => /poster\.svg/.test(image.currentSrc || image.src) && image.complete && image.naturalWidth > 0), null, { timeout: 1000 });
  const state = await inspectState(page, copy, "fallback");
  const settledMs = Date.now() - started;
  const actions = await testActions(page, copy);
  const requestSummary = summarizeAssetRequests(events.requests, baseUrl, config.expectedAssets);
  const result = {
    ...state, ...events, settledMs,
    blockedAsset: asset, blockedAssetRequested: requestSummary.distinct.includes(`assets/${asset}`),
    unknownLocalRequests: requestSummary.unexpected,
    anchor: { valid: state.anchorValid, works: actions.anchor.works }, toggle: actions.toggle
  };
  result.passed = failurePasses(result);
  await page.screenshot({ path: join(runDirectory, "evidence", `fallback-${asset.replace(/\W+/g, "-")}.png`), fullPage: true });
  await context.close();
  return result;
}

function authoredLifecycle(indexHtml, copy) {
  return {
    rootStartsLoading: /<html\b[^>]*\bdata-render-state\s*=\s*["']loading["']/i.test(indexHtml),
    loadingStatusAuthored: indexHtml.includes(copy.status.loading),
    statusHookAuthored: /data-render-status/i.test(indexHtml),
    importsSuppliedViewer: /orbit-field-viewer\.js/i.test(indexHtml) && /mountOrbitField/.test(indexHtml),
    loadsSuppliedScene: /scene\.json/i.test(indexHtml) && /\bfetch\s*\(/.test(indexHtml),
    drivesViewerProgress: /\.setProgress\s*\(/.test(indexHtml)
  };
}

export async function evaluateRun(runDirectory) {
  const indexPath = join(runDirectory, "index.html");
  if (!existsSync(indexPath)) {
    const report = { status: "failed", functionalComplete: false, reason: "index.html missing" };
    writeJson(join(runDirectory, "evaluation.json"), report);
    return report;
  }
  if (!existsSync(CHROME)) throw new Error(`Chrome missing at ${CHROME}; set CHROME_PATH`);
  mkdirSync(join(runDirectory, "evidence"), { recursive: true });
  const config = loadConfig();
  const copy = readJson(join(runDirectory, "copy.json"));
  const sourceCopy = readJson(join(BRIEF, "copy.json"));
  const assets = config.expectedAssets.map((path) => ({
    path,
    unchanged: existsSync(join(runDirectory, path)) && sha256File(join(runDirectory, path)) === sha256File(join(BRIEF, path))
  }));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: GL_ARGS });
  const server = await serveDirectory(runDirectory);
  const report = { status: "failed", functionalComplete: false, assets, copyLedgerUnchanged: JSON.stringify(copy) === JSON.stringify(sourceCopy) };
  try {
    report.authoredLifecycle = authoredLifecycle(readFileSync(indexPath, "utf8"), copy);
    report.profiles = {};
    const profiles = [
      { id: "desktop", context: { viewport: { width: 1440, height: 900 } } },
      { id: "mobile", context: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
      { id: "reduced", context: { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" } }
    ];
    for (const profile of profiles) {
      try { report.profiles[profile.id] = await inspectProfile(browser, server.url, runDirectory, copy, config, profile); }
      catch (error) { report.profiles[profile.id] = { id: profile.id, passed: false, error: String(error?.stack || error) }; }
    }
    try { report.noJavaScript = await inspectNoJavaScript(browser, server.url, copy, config); }
    catch (error) { report.noJavaScript = { passed: false, error: String(error?.stack || error) }; }
    report.failures = {};
    for (const asset of ["orbit-field-viewer.js", "scene.json"]) {
      try { report.failures[asset] = await inspectFailure(browser, server.url, runDirectory, copy, config, asset); }
      catch (error) { report.failures[asset] = { passed: false, error: String(error?.stack || error) }; }
    }
    report.checks = {
      inputsImmutable: report.copyLedgerUnchanged && assets.every((asset) => asset.unchanged),
      lifecycleAuthored: Object.values(report.authoredLifecycle).every(Boolean),
      profiles: Object.values(report.profiles).every((profile) => profile.passed),
      noJavaScript: report.noJavaScript.passed,
      failures: Object.values(report.failures).every((failure) => failure.passed)
    };
    report.functionalComplete = Object.values(report.checks).every(Boolean);
    report.status = report.functionalComplete ? "passed" : "failed";
    writeJson(join(runDirectory, "evaluation.json"), report);
    return report;
  } finally {
    await server.close();
    await browser.close();
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  const directory = process.argv[2];
  if (!directory) { console.error("usage: node evaluate.mjs <run-directory>"); process.exit(2); }
  const result = await evaluateRun(resolve(directory));
  console.log(JSON.stringify(result, null, 2));
  if (!result.functionalComplete) process.exitCode = 1;
}
