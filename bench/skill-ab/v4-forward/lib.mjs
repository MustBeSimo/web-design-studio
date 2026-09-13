import { createHash } from "node:crypto";
import { createReadStream, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const EXPERIMENT = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(EXPERIMENT, "../../..");
export const WORK = join(EXPERIMENT, ".work");
export const CONFIG_PATH = join(EXPERIMENT, "experiment.json");
export const BRIEF = join(EXPERIMENT, "brief");

export const SKILL_PAYLOAD_PATHS = [
  "SKILL.md", "AGENTS.md", "package.json", "manifest.json", "design.md",
  "taste-guardrails.md", "MODELS.md", "COMPATIBILITY.md", "ASSETS-3D.md",
  "references", "components", "runtime", "templates", "tokens", "themes",
  "tools", "examples"
];

export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
export const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const sha256File = (path) => sha256(readFileSync(path));
export const normalizeText = (value) => String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
export const loadConfig = () => readJson(CONFIG_PATH);

export function resolveGitRef(ref) {
  const result = spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { cwd: REPO, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`cannot resolve git ref ${ref}: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

export function exportGitTree(ref, destination, paths = SKILL_PAYLOAD_PATHS) {
  if (paths.some((path) => path === "bench" || path === "evals" || path.startsWith("bench/") || path.startsWith("evals/"))) {
    throw new Error("skill payload cannot include bench or evals");
  }
  mkdirSync(destination, { recursive: true });
  const archive = spawnSync("git", ["archive", "--format=tar", ref, ...paths], {
    cwd: REPO, encoding: null, maxBuffer: 256 * 1024 * 1024
  });
  if (archive.status !== 0) throw new Error(`git archive failed: ${String(archive.stderr).trim()}`);
  const unpack = spawnSync("tar", ["-xf", "-", "-C", destination], {
    input: archive.stdout, encoding: null, maxBuffer: 256 * 1024 * 1024
  });
  if (unpack.status !== 0) throw new Error(`unpacking skill payload failed: ${String(unpack.stderr).trim()}`);
}

export function hashTree(root) {
  const base = resolve(root);
  const rows = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const absolute = join(directory, name);
      if (lstatSync(absolute).isSymbolicLink()) throw new Error(`symbolic links are not allowed in evidence: ${absolute}`);
      if (statSync(absolute).isDirectory()) visit(absolute);
      else rows.push([relative(base, absolute).split(sep).join("/"), sha256File(absolute)]);
    }
  };
  visit(base);
  return Object.fromEntries(rows);
}

export function protocolFiles() {
  const roots = ["PROTOCOL.md", "README.md", "experiment.json", "prompt.txt", "brief", "fixtures", "lib.mjs", "evaluate.mjs", "harness.mjs", "review.mjs", "review-app.html", "test.mjs"];
  const files = [];
  const visit = (relativePath) => {
    const absolute = join(EXPERIMENT, relativePath);
    if (!existsSync(absolute)) return;
    if (statSync(absolute).isDirectory()) {
      for (const name of readdirSync(absolute).sort()) visit(join(relativePath, name));
    } else files.push(relativePath.split(sep).join("/"));
  };
  for (const root of roots) visit(root);
  return files.sort();
}

export function protocolHashes() {
  return Object.fromEntries(protocolFiles().map((file) => [file, sha256File(join(EXPERIMENT, file))]));
}

export function isAllowedBrowserRequest(requestUrl, localUrl) {
  if (/^(?:about:|blob:|data:)/i.test(requestUrl)) return true;
  try { return new URL(requestUrl).origin === new URL(localUrl).origin; }
  catch { return false; }
}

export async function isolateBrowserContext(context, localUrl, blockedRequests = []) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (isAllowedBrowserRequest(request.url(), localUrl)) return route.continue();
    blockedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType() });
    return route.abort("blockedbyclient");
  });
  return blockedRequests;
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".glb": "model/gltf-binary", ".wasm": "application/wasm"
};

export async function serveDirectory(root) {
  const base = resolve(root);
  const realBase = realpathSync(base);
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const requested = resolve(base, `.${pathname}`);
    if (requested !== base && !requested.startsWith(`${base}${sep}`)) { response.writeHead(403).end("forbidden"); return; }
    let file = requested;
    try { if (statSync(file).isDirectory()) file = join(file, "index.html"); } catch { /* handled below */ }
    if (!existsSync(file) || !statSync(file).isFile()) { response.writeHead(404).end("not found"); return; }
    const realFile = realpathSync(file);
    if (realFile !== realBase && !realFile.startsWith(`${realBase}${sep}`)) { response.writeHead(403).end("forbidden"); return; }
    response.setHeader("content-type", MIME[extname(file).toLowerCase()] || "application/octet-stream");
    response.setHeader("cache-control", "no-store");
    createReadStream(file).pipe(response);
  });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((accept) => server.close(accept))
  };
}
