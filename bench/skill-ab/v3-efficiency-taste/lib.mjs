import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, realpathSync, readdirSync, statSync, writeFileSync, cpSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const EXPERIMENT = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(EXPERIMENT, "../../..");
export const WORK = join(EXPERIMENT, ".work");
export const CONFIG_PATH = join(EXPERIMENT, "experiment.json");

export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
export const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const sha256File = (path) => sha256(readFileSync(path));
export const normalizeText = (value) => String(value || "")
  .normalize("NFKC")
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

export function loadConfig() {
  return readJson(CONFIG_PATH);
}

export function runId(briefId, conditionId, attempt) {
  return `${briefId}--${conditionId}--${attempt}`;
}

export function allRuns(config = loadConfig()) {
  const runs = [];
  for (const brief of config.briefs) for (const condition of config.conditions) {
    for (let attempt = 1; attempt <= config.attemptsPerCondition; attempt++) {
      runs.push({ id: runId(brief.id, condition.id, attempt), briefId: brief.id, conditionId: condition.id, attempt });
    }
  }
  return runs;
}

export function hashOrder(items, seed) {
  return [...items].sort((a, b) => sha256(`${seed}:${a.id}`).localeCompare(sha256(`${seed}:${b.id}`)));
}

export function resolveGitRef(ref) {
  const out = spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { cwd: REPO, encoding: "utf8" });
  if (out.status !== 0) throw new Error(`cannot resolve git ref ${ref}: ${out.stderr.trim()}`);
  return out.stdout.trim();
}

export function gitBlob(ref, path) {
  const out = spawnSync("git", ["show", `${ref}:${path}`], { cwd: REPO, encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (out.status !== 0) throw new Error(`cannot read ${ref}:${path}: ${String(out.stderr).trim()}`);
  return out.stdout;
}

export function exportGitTree(ref, destination, paths = []) {
  mkdirSync(destination, { recursive: true });
  const archive = spawnSync("git", ["archive", "--format=tar", ref, ...paths], { cwd: REPO, encoding: null, maxBuffer: 256 * 1024 * 1024 });
  if (archive.status !== 0) throw new Error(`git archive ${ref} failed: ${String(archive.stderr).trim()}`);
  const unpack = spawnSync("tar", ["-xf", "-", "-C", destination], { input: archive.stdout, encoding: null, maxBuffer: 256 * 1024 * 1024 });
  if (unpack.status !== 0) throw new Error(`unpacking ${ref} failed: ${String(unpack.stderr).trim()}`);
}

export function materializeKit(brief, destination) {
  const manifestPath = join(EXPERIMENT, brief.kit);
  const manifest = readJson(manifestPath);
  const sourceBase = dirname(manifestPath);
  const files = [];
  for (const entry of manifest.files) {
    const target = join(destination, entry.target);
    mkdirSync(dirname(target), { recursive: true });
    if (entry.gitRef) writeFileSync(target, gitBlob(entry.gitRef, entry.gitPath));
    else if (entry.base64Source) writeFileSync(target, Buffer.from(readFileSync(join(sourceBase, entry.base64Source), "utf8").trim(), "base64"));
    else {
      const source = entry.repoSource ? join(REPO, entry.repoSource) : join(sourceBase, entry.source);
      if (!existsSync(source)) throw new Error(`${brief.id}: kit source missing: ${source}`);
      cpSync(source, target);
    }
    const actual = sha256File(target);
    if (entry.sha256 && actual !== entry.sha256) throw new Error(`${brief.id}: hash mismatch for ${entry.target}: ${actual}`);
    files.push({ target: entry.target, sha256: actual, bytes: statSync(target).size, role: entry.role });
  }
  return { requiredUsage: manifest.requiredUsage || [], files };
}

export function protocolFiles() {
  const roots = ["PROTOCOL.md", "README.md", "experiment.json", "prompts", "briefs", "harness.mjs", "lib.mjs", "preflight.mjs", "evaluate.mjs", "review.mjs", "review-app.html", "test.mjs"];
  const found = [];
  const visit = (rel) => {
    const abs = join(EXPERIMENT, rel);
    if (!existsSync(abs)) return;
    const s = statSync(abs);
    if (s.isDirectory()) {
      for (const name of readdirSync(abs)) visit(join(rel, name));
    } else found.push(rel.split(sep).join("/"));
  };
  for (const root of roots) visit(root);
  return found.sort();
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".glb": "model/gltf-binary",
  ".wasm": "application/wasm"
};

export async function serveDirectory(root) {
  const base = resolve(root);
  const realBase = realpathSync(base);
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const requested = resolve(base, `.${pathname}`);
    if (requested !== base && !requested.startsWith(`${base}${sep}`)) { res.writeHead(403).end(); return; }
    let file = requested;
    try { if (statSync(file).isDirectory()) file = join(file, "index.html"); } catch { /* handled below */ }
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end("not found"); return; }
    const realFile = realpathSync(file);
    if (realFile !== realBase && !realFile.startsWith(`${realBase}${sep}`)) { res.writeHead(403).end("forbidden"); return; }
    res.setHeader("content-type", MIME[extname(file).toLowerCase()] || "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    createReadStream(file).pipe(res);
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise((done) => server.close(done)) };
}

export function relativeExperiment(path) {
  return relative(EXPERIMENT, path).split(sep).join("/");
}
