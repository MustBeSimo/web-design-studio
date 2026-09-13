#!/usr/bin/env node
/** Static dependency preflight for Three.js and glTF assets. Exit 0 PASS, 1 FAIL, 2 invalid usage. */
import {
  existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOURCE_EXTENSIONS = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const SKIP_DIRECTORIES = new Set(['.git', '.next', '.verify', 'coverage', 'dist', 'node_modules']);
const DECODER_REQUIREMENTS = new Map([
  ['KHR_draco_mesh_compression', 'draco'],
  ['EXT_meshopt_compression', 'meshopt'],
  ['KHR_texture_basisu', 'ktx2'],
]);

export function parseArgs(argv) {
  const options = { models: [], json: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json' || arg === '--quiet') options[arg.slice(2)] = true;
    else if (arg === '--model' || arg === '--report') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for ' + arg);
      if (arg === '--model') options.models.push(argv[++i]);
      else options.report = argv[++i];
    } else if (arg.startsWith('--')) throw new Error('Unknown option: ' + arg);
    else if (!options.target) options.target = arg;
    else throw new Error('Unexpected argument: ' + arg);
  }
  if (!options.target) throw new Error('Usage: preflight-3d.mjs <html-or-project> [--model file] [--json] [--report file]');
  return options;
}

function walkSources(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) walkSources(join(directory, entry.name), files);
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(join(directory, entry.name));
  }
  return files;
}

function walkModels(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) walkModels(join(directory, entry.name), files);
    } else if (/\.(?:glb|gltf)$/i.test(entry.name)) files.push(join(directory, entry.name));
  }
  return files;
}

function walkModelReferenceFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) walkModelReferenceFiles(join(directory, entry.name), files);
    } else if (/\.json$/i.test(entry.name) && !/^(?:package-lock|package|tsconfig)\.json$/i.test(entry.name)) {
      const file = join(directory, entry.name);
      if (statSync(file).size <= 1024 * 1024) files.push(file);
    }
  }
  return files;
}

function collectSourceGraph(entry, root) {
  const files = [];
  const seen = new Set();
  const queue = [entry];
  const importMap = {};
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    files.push(file);
    const text = readFileSync(file, 'utf8');
    if (/\.html?$/i.test(file)) Object.assign(importMap, parseImportMaps([{ file, text }]).imports);
    for (const request of parseImports(text, file)) {
      const mapped = importMapValue(request, importMap);
      if (!mapped && !isLocalRequest(request)) continue;
      const dependency = mapped ? resolveImportTarget(mapped, root) : resolveLocal(request, file, root);
      if (dependency && !/^(?:https?:|data:)/i.test(dependency) && SOURCE_EXTENSIONS.has(extname(dependency).toLowerCase())) queue.push(dependency);
    }
  }
  return files;
}

function resolveLocal(request, source, root) {
  const clean = request.split(/[?#]/)[0];
  let base;
  if (clean.startsWith('file:')) {
    try { base = fileURLToPath(clean); } catch { return null; }
  } else base = clean.startsWith('/') ? join(root, clean.slice(1)) : resolve(dirname(source), clean);
  const alternatives = [base];
  if (!extname(base)) {
    for (const extension of SOURCE_EXTENSIONS) alternatives.push(base + extension);
    for (const extension of SOURCE_EXTENSIONS) alternatives.push(join(base, 'index' + extension));
  }
  if (clean.startsWith('/')) alternatives.push(join(root, 'public', clean.slice(1)));
  return alternatives.find(candidate => existsSync(candidate) && statSync(candidate).isFile()) || null;
}

function isLocalRequest(request) {
  return request.startsWith('.') || request.startsWith('/') || request.startsWith('file:');
}

function resolveImportTarget(mapping, root) {
  if (/^(?:https?:|data:)/i.test(mapping.value)) return mapping.value;
  return resolveLocal(mapping.value, mapping.source, root);
}

function resolveBrowserResource(request, source, root) {
  if (/^(?:https?:|data:)/i.test(request)) return { remote: true, path: request };
  const clean = request.split(/[?#]/)[0];
  let direct = null;
  if (clean.startsWith('file:')) {
    try { direct = fileURLToPath(clean); } catch { return { remote: false, path: null }; }
  }
  const candidates = direct ? [direct] : clean.startsWith('/') ?
    [join(root, clean.slice(1)), join(root, 'public', clean.slice(1))] :
    [resolve(root, clean), resolve(root, 'public', clean), resolve(dirname(source), clean)];
  const path = candidates.find(candidate => existsSync(candidate)) || null;
  return { remote: false, path };
}

function readPackage(root) {
  const file = join(root, 'package.json');
  if (!existsSync(file)) return { dependencies: {}, file: null };
  try {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    return {
      file,
      dependencies: { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies },
    };
  } catch (error) {
    return { dependencies: {}, file, error: error.message };
  }
}

function blankComment(text) {
  return text.replace(/[^\n]/g, ' ');
}

function stripCodeComments(text) {
  let output = '';
  let mode = 'code';
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const next = text[index + 1];
    if (mode === 'code') {
      if (character === "'" || character === '"' || character === '`') {
        mode = character;
        escaped = false;
        output += character;
      } else if (character === '/' && next === '/') {
        mode = 'line-comment';
        output += '  ';
        index++;
      } else if (character === '/' && next === '*') {
        mode = 'block-comment';
        output += '  ';
        index++;
      } else if (text.startsWith('<!--', index)) {
        mode = 'html-comment';
        output += '    ';
        index += 3;
      } else output += character;
      continue;
    }
    if (mode === "'" || mode === '"' || mode === '`') {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === mode) mode = 'code';
      continue;
    }
    if (character === '\n') {
      output += '\n';
      if (mode === 'line-comment') mode = 'code';
    } else if (mode === 'block-comment' && character === '*' && next === '/') {
      output += '  ';
      index++;
      mode = 'code';
    } else if (mode === 'html-comment' && text.startsWith('-->', index)) {
      output += '   ';
      index += 2;
      mode = 'code';
    } else output += ' ';
  }
  return output;
}

function stripSourceComments(text, file = '') {
  if (!/\.html?$/i.test(file)) {
    const source = /\.[jt]sx$/i.test(file) ? text.replace(/(?<=[\p{L}\p{N}])'(?=[\p{L}\p{N}])/gu, ' ') : text;
    return stripCodeComments(source);
  }
  const withoutHtmlComments = text.replace(/<!--[\s\S]*?-->/g, blankComment);
  return withoutHtmlComments.replace(
    /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open, body, close) => open + stripCodeComments(body) + close,
  );
}

function parseImports(text, file = '') {
  text = stripSourceComments(text, file);
  const requests = [];
  const patterns = [
    { pattern: /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g },
    { pattern: /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g },
    { pattern: /<script\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/gi, browserRelative: true },
  ];
  for (const { pattern, browserRelative } of patterns) for (const match of text.matchAll(pattern)) {
    const request = browserRelative && !/^(?:[./]|[a-z][a-z\d+.-]*:)/i.test(match[1]) ? `./${match[1]}` : match[1];
    requests.push(request);
  }
  return requests;
}

function parseNamedImports(text, file = '') {
  const imports = [];
  const source = stripSourceComments(text, file);
  for (const match of source.matchAll(/\bimport\s+(type\s+)?{([\s\S]*?)}\s*from\s*['"]([^'"]+)['"]/g)) {
    if (match[1]) continue;
    const names = match[2].split(',').map(item => item.trim()).filter(item => item && !item.startsWith('type '))
      .map(item => item.split(/\s+as\s+/)[0].trim()).filter(Boolean);
    if (names.length) imports.push({ request: match[3], names });
  }
  return imports;
}

function explicitModuleExports(text, file = '') {
  const source = stripSourceComments(text, file);
  if (/\bexport\s*\*\s*from\b/.test(source)) return null;
  const names = new Set();
  for (const match of source.matchAll(/\bexport\s*{([\s\S]*?)}(?:\s*from\s*['"][^'"]+['"])?\s*;?/g)) {
    for (const item of match[1].split(',')) {
      const parts = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      const exported = (parts[1] || parts[0] || '').trim();
      if (exported) names.add(exported);
    }
  }
  for (const match of source.matchAll(/\bexport\s+(?:async\s+)?(?:class|function|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  return names;
}

function parseImportMaps(sources) {
  const imports = {};
  const errors = [];
  for (const source of sources) {
    if (!/\.html?$/i.test(source.file)) continue;
    const text = source.text.replace(/<!--[\s\S]*?-->/g, blankComment);
    for (const match of text.matchAll(/<script\b[^>]*type\s*=\s*['"]importmap['"][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        for (const [key, value] of Object.entries(JSON.parse(match[1]).imports || {})) imports[key] = { value, source: source.file };
      }
      catch (error) { errors.push(`${source.file}: invalid import map (${error.message})`); }
    }
  }
  return { imports, errors };
}

function importMapValue(request, imports) {
  if (imports[request]) return imports[request];
  const prefix = Object.keys(imports).filter(key => key.endsWith('/') && request.startsWith(key)).sort((a, b) => b.length - a.length)[0];
  if (!prefix) return null;
  const mapping = imports[prefix];
  return { value: mapping.value + request.slice(prefix.length), source: mapping.source };
}

function modelReferences(source) {
  const refs = [];
  for (const match of stripSourceComments(source.text, source.file).matchAll(/['"]([^'"\n]+\.(?:glb|gltf)(?:[?#][^'"]*)?)['"]/gi)) {
    if (!/[${}]|<[^>]+>/.test(match[1])) refs.push(match[1]);
  }
  return refs;
}

function gltfJsonFromGlb(buffer, file) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('invalid GLB header');
  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);
  if (declaredLength !== buffer.length) throw new Error(`GLB length header is ${declaredLength}, file is ${buffer.length} bytes`);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    offset += 8;
    if (offset + length > buffer.length) throw new Error('GLB chunk exceeds file length');
    if (type === 0x4e4f534a) {
      const json = buffer.toString('utf8', offset, offset + length).replace(/[\u0000 ]+$/g, '');
      try { return JSON.parse(json); }
      catch (error) { throw new Error(`invalid GLB JSON chunk (${error.message})`); }
    }
    offset += length;
  }
  throw new Error(`no JSON chunk in ${file}`);
}

export function inspectModel(file) {
  const absolute = resolve(file);
  const extension = extname(absolute).toLowerCase();
  let document;
  if (extension === '.glb') document = gltfJsonFromGlb(readFileSync(absolute), absolute);
  else if (extension === '.gltf') document = JSON.parse(readFileSync(absolute, 'utf8'));
  else throw new Error('Model must use .glb or .gltf: ' + absolute);
  if (!String(document.asset?.version || '').startsWith('2')) throw new Error('model is not glTF 2.x');
  const extensionsUsed = [...new Set(document.extensionsUsed || [])].sort();
  const extensionsRequired = [...new Set(document.extensionsRequired || [])].sort();
  const resources = [];
  if (extension === '.gltf') {
    for (const item of [...(document.buffers || []), ...(document.images || [])]) {
      if (!item.uri || /^(?:data:|https?:)/i.test(item.uri)) continue;
      const resource = resolve(dirname(absolute), decodeURIComponent(item.uri.split(/[?#]/)[0]));
      resources.push({ uri: item.uri, path: resource, exists: existsSync(resource) });
    }
  }
  return { file: absolute, extensionsUsed, extensionsRequired, resources };
}

function versionFromThreeUrl(value) {
  return String(value?.value || value || '').match(/(?:three@|three\/)(\d+\.\d+\.\d+)/)?.[1] || null;
}

function literalLoaderPaths(sources, method) {
  const paths = [];
  const pattern = new RegExp(`${method}\\s*\\(\\s*(['"])(.*?)\\1`, 'g');
  for (const source of sources) for (const match of stripSourceComments(source.text, source.file).matchAll(pattern)) paths.push({ request: match[2], source: source.file });
  return paths;
}

function decoderFilesPresent(kind, directory) {
  if (!statSync(directory).isDirectory()) return false;
  if (kind === 'draco') {
    const jsDecoder = existsSync(join(directory, 'draco_decoder.js'));
    const wasmDecoder = existsSync(join(directory, 'draco_decoder.wasm')) && existsSync(join(directory, 'draco_wasm_wrapper.js'));
    return jsDecoder || wasmDecoder;
  }
  return existsSync(join(directory, 'basis_transcoder.js')) && existsSync(join(directory, 'basis_transcoder.wasm'));
}

function checkLiteralDecoderResources(kind, method, sources, root, checks) {
  const paths = literalLoaderPaths(sources, method);
  if (!paths.length) {
    checks.push({ name: `decoder-resources:${kind}`, ok: true, level: 'warn',
      detail: `${method}() uses no literal path in the inspected source; verify its runtime value in browser proof` });
    return;
  }
  for (const item of paths) {
    const resource = resolveBrowserResource(item.request, item.source, root);
    if (resource.remote) {
      checks.push({ name: `decoder-resources:${kind}`, ok: true, level: 'warn', detail: `remote ${kind} runtime was not fetched: ${item.request}` });
      continue;
    }
    const ok = Boolean(resource.path && decoderFilesPresent(kind, resource.path));
    const expected = kind === 'draco' ? 'draco_decoder.js or draco_decoder.wasm + draco_wasm_wrapper.js' : 'basis_transcoder.js + basis_transcoder.wasm';
    checks.push({ name: `decoder-resources:${kind}`, ok, level: ok ? 'pass' : 'error',
      detail: ok ? `${kind} runtime files found at ${resource.path}` : `${item.request} does not resolve to a directory containing ${expected}` });
  }
}

export function preflight3d(target, { models: requestedModels = [] } = {}) {
  const absoluteTarget = resolve(target);
  if (!existsSync(absoluteTarget)) throw new Error('Target does not exist: ' + absoluteTarget);
  const isDirectory = statSync(absoluteTarget).isDirectory();
  const root = isDirectory ? absoluteTarget : dirname(absoluteTarget);
  const sourceFiles = isDirectory ? walkSources(root) : collectSourceGraph(absoluteTarget, root);
  const sources = sourceFiles.map(file => ({ file, text: readFileSync(file, 'utf8') }));
  const referenceSources = isDirectory ? walkModelReferenceFiles(root).map(file => ({ file, text: readFileSync(file, 'utf8') })) : [];
  const combined = sources.map(source => stripSourceComments(source.text, source.file)).join('\n');
  const { imports: importMap, errors: importMapErrors } = parseImportMaps(sources);
  const packageInfo = readPackage(root);
  const requests = sources.flatMap(source => parseImports(source.text, source.file).map(request => ({ request, source: source.file })));
  const referencedModels = [...sources, ...referenceSources].flatMap(source =>
    modelReferences(source).map(request => ({ request, source: source.file, authoritative: true })));
  for (const request of requestedModels) referencedModels.push({ request, source: null, authoritative: true });
  const inventoryModels = isDirectory ? walkModels(root).map(request => ({ request, source: null, authoritative: false })) : [];
  const modelCandidates = [...referencedModels, ...inventoryModels];
  const detected = requestedModels.length > 0 || modelCandidates.length > 0 ||
    /\b(?:THREE\.|WebGLRenderer|GLTFLoader|useGLTF|@react-three\/|<model-viewer\b)/i.test(combined) ||
    requests.some(({ request }) => request === 'three' || request.startsWith('three/'));
  const checks = [];
  const check = (name, ok, detail, level = ok ? 'pass' : 'error') => checks.push({ name, ok, level, detail });
  for (const error of importMapErrors) check('import-map', false, error);
  if (packageInfo.error) check('package-json', false, packageInfo.error);
  if (!detected) {
    return { ok: true, verdict: 'PASS', detected: false, target: absoluteTarget, sourceFiles, models: [], requirements: [], checks };
  }

  const dependencies = packageInfo.dependencies;
  const relevantPackages = new Set();
  for (const { request, source } of requests) {
    if (/^(?:https?:|data:|node:|\/\/)/i.test(request)) continue;
    if (isLocalRequest(request)) {
      if (!resolveLocal(request, source, root)) check('module-request', false, `missing local module ${request} imported by ${source}`);
      continue;
    }
    const pkg = request.startsWith('@') ? request.split('/').slice(0, 2).join('/') : request.split('/')[0];
    if (pkg === 'three' || pkg.startsWith('@react-three/')) relevantPackages.add(pkg);
    if (pkg === 'three' || pkg.startsWith('@react-three/')) {
      const mapping = importMapValue(request, importMap);
      if (mapping && !resolveImportTarget(mapping, root)) check('module-request', false, `${request} maps to missing local module ${mapping.value}`);
      else if (!mapping && !dependencies[pkg]) check('module-request', false, `${request} has no import-map entry or ${pkg} package dependency`);
    }
  }
  for (const source of sources) {
    if (basename(source.file) !== 'three.module.js') continue;
    for (const imported of parseNamedImports(source.text, source.file)) {
    const mapping = importMapValue(imported.request, importMap);
    const target = mapping ? resolveImportTarget(mapping, root) : isLocalRequest(imported.request) ? resolveLocal(imported.request, source.file, root) : null;
    if (!target || /^(?:https?:|data:)/i.test(target) || basename(target) !== 'three.core.js') continue;
    const exported = explicitModuleExports(readFileSync(target, 'utf8'), target);
    if (exported === null) continue;
    const missing = imported.names.filter(name => !exported.has(name));
    check('module-exports', missing.length === 0,
      missing.length ? `${source.file} imports missing export${missing.length === 1 ? '' : 's'} ${missing.join(', ')} from ${target}` : `${source.file} named imports resolve in ${target}`);
    }
  }
  const coreMapping = importMapValue('three', importMap);
  const mappedCore = coreMapping && resolveImportTarget(coreMapping, root);
  const directlyImportedCore = requests.some(({ request, source }) =>
    /three(?:\.module|\.core)?\.js(?:[?#]|$)/.test(request) &&
    (/^https?:/i.test(request) || (isLocalRequest(request) && resolveLocal(request, source, root))));
  const hasThreeCore = Boolean(dependencies.three || mappedCore || directlyImportedCore);
  const usesThree = /\b(?:THREE\.|WebGLRenderer|GLTFLoader|useGLTF|@react-three\/)/i.test(combined) || relevantPackages.size > 0;
  if (usesThree) check('three-core', hasThreeCore, hasThreeCore ? 'Three.js core is mapped or declared' : 'Three.js usage has no resolvable core import or package dependency');
  const coreVersion = versionFromThreeUrl(importMap.three);
  const addonVersion = versionFromThreeUrl(importMap['three/addons/']);
  if (coreVersion && addonVersion) check('three-version', coreVersion === addonVersion,
    coreVersion === addonVersion ? `core and addons use Three.js ${coreVersion}` : `core uses Three.js ${coreVersion}, addons use ${addonVersion}`);

  const modelResults = [];
  const seenModels = new Set();
  for (const { request, source, authoritative } of modelCandidates) {
    if (/^https?:/i.test(request)) {
      checks.push({ name: 'model-resource', ok: true, level: 'warn', detail: `remote model was not inspected: ${request}` });
      continue;
    }
    const clean = request.split(/[?#]/)[0];
    let model = source === null ? resolve(root, clean) :
      clean.startsWith('/') ? resolveLocal(clean, join(root, 'index.html'), root) : resolve(dirname(source), clean);
    if (!model || !existsSync(model)) {
      if (authoritative) check('model-resource', false, `model not found: ${request}`);
      else checks.push({ name: 'model-inventory', ok: true, level: 'warn', detail: `unused inventory model disappeared before inspection: ${request}` });
      continue;
    }
    if (seenModels.has(model)) continue;
    seenModels.add(model);
    try {
      const result = inspectModel(model);
      modelResults.push({ ...result, authoritative });
      checks.push({ name: authoritative ? 'model-parse' : 'model-inventory', ok: true, level: authoritative ? 'pass' : 'info',
        detail: `${authoritative ? 'parsed referenced' : 'inspected unused'} glTF 2.x model: ${model}` });
      for (const resource of result.resources) {
        if (authoritative) check('model-resource', resource.exists, resource.exists ? `found ${resource.uri}` : `missing ${resource.uri} for ${model}`);
        else checks.push({ name: 'model-inventory', ok: true, level: resource.exists ? 'info' : 'warn',
          detail: resource.exists ? `unused model resource found: ${resource.uri}` : `unused model has missing resource ${resource.uri}: ${model}` });
      }
    } catch (error) {
      if (authoritative) check('model-parse', false, `${model}: ${error.message}`);
      else checks.push({ name: 'model-inventory', ok: true, level: 'warn', detail: `unused inventory model could not be parsed: ${model} (${error.message})` });
    }
  }

  const extensions = new Set(modelResults.filter(model => model.authoritative).flatMap(model => model.extensionsRequired));
  const requirements = [...new Set([...extensions].map(extension => DECODER_REQUIREMENTS.get(extension)).filter(Boolean))].sort();
  const usesModelViewer = /<model-viewer\b/i.test(combined);
  const hasGltfLoader = /\b(?:GLTFLoader|useGLTF)\b/.test(combined);
  if (referencedModels.length && !usesModelViewer) check('gltf-loader', hasGltfLoader,
    hasGltfLoader ? 'a glTF loader is present' : 'glTF assets are referenced without GLTFLoader, useGLTF or <model-viewer>');
  if (hasGltfLoader) {
    if (requirements.includes('draco')) {
      const ok = /\bDRACOLoader\b/.test(combined) && /setDRACOLoader\s*\(/.test(combined) && /setDecoderPath\s*\(/.test(combined);
      check('decoder:draco', ok, ok ? 'Draco loader and decoder path are configured' : 'KHR_draco_mesh_compression requires DRACOLoader, setDRACOLoader() and setDecoderPath()');
      if (ok) checkLiteralDecoderResources('draco', 'setDecoderPath', sources, root, checks);
    }
    if (requirements.includes('meshopt')) {
      const ok = /\bMeshoptDecoder\b/.test(combined) && /setMeshoptDecoder\s*\(/.test(combined);
      check('decoder:meshopt', ok, ok ? 'Meshopt decoder is configured' : 'EXT_meshopt_compression requires MeshoptDecoder and setMeshoptDecoder()');
    }
    if (requirements.includes('ktx2')) {
      const ok = /\bKTX2Loader\b/.test(combined) && /setKTX2Loader\s*\(/.test(combined) && /setTranscoderPath\s*\(/.test(combined);
      check('decoder:ktx2', ok, ok ? 'KTX2 loader and transcoder path are configured' : 'KHR_texture_basisu requires KTX2Loader, setKTX2Loader() and setTranscoderPath()');
      if (ok) checkLiteralDecoderResources('ktx2', 'setTranscoderPath', sources, root, checks);
    }
  }
  if (hasGltfLoader) {
    const handlesFailure = /\.onError\s*=|LoadingManager\s*\([^)]*\)|\.loadAsync\s*\([\s\S]{0,300}?\.catch\s*\(|\.load\s*\([\s\S]{0,800}?,\s*(?:[A-Za-z_$][\w$]*|\([^)]*\)\s*=>)\s*\)/.test(combined);
    checks.push({ name: 'loader-failure', ok: true, level: handlesFailure ? 'pass' : 'warn',
      detail: handlesFailure ? 'loader failure handling is present' : 'no clear glTF loader error handler was found; surface network and decode failures during browser proof' });
  }
  const ok = checks.every(result => result.ok);
  return { ok, verdict: ok ? 'PASS' : 'FAIL', detected: true, target: absoluteTarget, sourceFiles, models: modelResults, requirements, checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = preflight3d(options.target, { models: options.models });
    if (options.report) {
      const file = resolve(options.report);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
    }
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else if (!options.quiet || !report.ok) {
      console.log('3d-preflight: ' + report.verdict + (report.detected ? '' : ' (no 3D detected)'));
      for (const result of report.checks) if (!options.quiet || result.level === 'error') console.log(`  ${result.level.toUpperCase()} ${result.detail}`);
    }
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    console.error('3d-preflight: ' + error.message);
    process.exitCode = 2;
  }
}
