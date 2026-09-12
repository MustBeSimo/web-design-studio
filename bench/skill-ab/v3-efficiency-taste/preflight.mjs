import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { EXPERIMENT, WORK, loadConfig, materializeKit, readJson, serveDirectory, writeJson } from "./lib.mjs";

export function inspectGlb(path) {
  const data = readFileSync(path);
  if (data.length < 20 || data.toString("ascii", 0, 4) !== "glTF") throw new Error("not a binary glTF file");
  const version = data.readUInt32LE(4);
  const declaredLength = data.readUInt32LE(8);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);
  if (declaredLength !== data.length) throw new Error(`GLB length ${declaredLength} does not match ${data.length}`);
  const jsonLength = data.readUInt32LE(12);
  if (data.toString("ascii", 16, 20) !== "JSON") throw new Error("GLB first chunk is not JSON");
  const gltf = JSON.parse(data.subarray(20, 20 + jsonLength).toString("utf8").trim());
  if (gltf.asset?.version !== "2.0" || !(gltf.scenes?.length) || !(gltf.nodes?.length) || !(gltf.meshes?.length)) {
    throw new Error("GLB has no renderable glTF 2.0 scene");
  }
  return {
    bytes: data.length,
    scenes: gltf.scenes.length,
    nodes: gltf.nodes.length,
    meshes: gltf.meshes.length,
    extensionsUsed: gltf.extensionsUsed || [],
    extensionsRequired: gltf.extensionsRequired || []
  };
}

function preflightHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;background:#09101a}canvas{width:800px;height:600px}</style></head><body><canvas></canvas><script type="module">
import { createAxisViewer } from "./assets/axis-viewer.js";
window.__PREFLIGHT__={status:"loading"};
try {
  const canvas=document.querySelector('canvas'); const viewer=await createAxisViewer({canvas,url:'./assets/axis-24.glb'}); viewer.setView({camera:[2.1,.35,4.2],rotation:[0,.35,0]});
  const gl=canvas.getContext('webgl'); const pixels=new Uint8Array(canvas.width*canvas.height*4); gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels); const bg=[9,14,20]; let varied=0; for(let i=0;i<pixels.length;i+=4) if(Math.abs(pixels[i]-bg[0])+Math.abs(pixels[i+1]-bg[1])+Math.abs(pixels[i+2]-bg[2])>18)varied++;
  window.__PREFLIGHT__={status:'ready',meshes:1,variedPixels:varied,renderer:gl.getParameter(gl.RENDERER),modelState:document.documentElement.dataset.modelState,cameraState:canvas.dataset.cameraState};
} catch(error) { window.__PREFLIGHT__={status:"error",error:String(error?.stack||error)}; }
</script></body></html>`;
}

async function renderGlb(directory, screenshotPath) {
  writeFileSync(join(directory, "index.html"), preflightHtml());
  const server = await serveDirectory(directory);
  const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (!existsSync(executablePath)) throw new Error(`Chrome missing at ${executablePath}; set CHROME_PATH`);
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const errors = [], consoleErrors = [], failedRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("requestfailed", (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`));
    await page.goto(server.url, { waitUntil: "load" });
    try { await page.waitForFunction(() => window.__PREFLIGHT__ && window.__PREFLIGHT__.status !== "loading", null, { timeout: 30000 }); }
    catch (error) { throw new Error(`live GLB render timed out: ${JSON.stringify({ errors, consoleErrors, failedRequests })}`); }
    const result = await page.evaluate(() => window.__PREFLIGHT__);
    mkdirSync(WORK, { recursive: true });
    await page.screenshot({ path: screenshotPath });
    if (errors.length || consoleErrors.length || failedRequests.length || result.status !== "ready" || result.meshes < 1 || result.variedPixels < 1) {
      throw new Error(`live GLB render failed: ${JSON.stringify({ ...result, errors, consoleErrors, failedRequests })}`);
    }
    return { ...result, errors, screenshot: screenshotPath.slice(EXPERIMENT.length + 1) };
  } finally {
    await browser.close();
    await server.close();
  }
}

export async function runPreflight({ output = join(WORK, "preflight.json"), browser = true } = {}) {
  const config = loadConfig();
  const scratch = mkdtempSync(join(tmpdir(), "skill-ab-preflight-"));
  const report = { protocolVersion: config.protocolVersion, generatedAt: new Date().toISOString(), status: "passed", briefs: {} };
  try {
    for (const brief of config.briefs) {
      const kitDirectory = join(scratch, brief.id);
      const kit = materializeKit(brief, kitDirectory);
      const item = { status: "passed", files: kit.files, requiredUsage: kit.requiredUsage };
      for (const required of kit.requiredUsage) {
        if (!kit.files.some((file) => file.target.endsWith(required))) throw new Error(`${brief.id}: required asset not materialized: ${required}`);
      }
      if (brief.id === "three-d") {
        item.glb = inspectGlb(join(kitDirectory, "assets/axis-24.glb"));
        item.liveRender = browser ? await renderGlb(kitDirectory, join(WORK, "preflight-three-d.png")) : { skipped: true };
      }
      report.briefs[brief.id] = item;
    }
  } catch (error) {
    report.status = "failed";
    report.error = String(error?.stack || error);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  writeJson(output, report);
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const report = await runPreflight({ browser: !process.argv.includes("--no-browser") });
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "passed") process.exitCode = 1;
}
