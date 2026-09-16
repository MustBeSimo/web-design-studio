#!/usr/bin/env node

import {mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(repo, "assets/promo-linkedin/web-design-studio-linkedin.mp4");
const poster = resolve(repo, "assets/promo-linkedin/web-design-studio-linkedin-poster.jpg");
const work = mkdtempSync(join(tmpdir(), "wds-linkedin-promo-"));

const sans = "/System/Library/Fonts/HelveticaNeue.ttc";
const serif = "/System/Library/Fonts/Supplemental/Baskerville.ttc";
const paper = "#F1ECE2";
const ink = "#10110D";
const accent = "#D8FF45";

function run(args, label) {
  const result = spawnSync("ffmpeg", args, {cwd: repo, encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  if (result.status !== 0) {
    throw new Error(`${label} failed\n${result.stderr}`);
  }
}

function escapeText(value) {
  return value.replaceAll("\\", "\\\\").replaceAll(":", "\\:").replaceAll("'", "\\'");
}

function text(value, options = {}) {
  const {
    font = sans, size = 48, color = paper, x = "100", y = "100",
    spacing = 0, alpha = 1,
  } = options;
  return `drawtext=fontfile='${font}':text='${escapeText(value)}':fontsize=${size}:fontcolor=${color}@${alpha}:x=${x}:y=${y}:line_spacing=16:shadowcolor=black@0.45:shadowx=0:shadowy=3`;
}

// Text files preserve source-code punctuation through FFmpeg's filter parser.
function sourceLine(value, index, y) {
  const path = join(work, `aether-code-${index}.txt`);
  writeFileSync(path, value);
  return `drawtext=fontfile='/System/Library/Fonts/Menlo.ttc':textfile='${path}':expansion=none:fontsize=30:fontcolor=${paper}:x=148:y=${y}`;
}

function baseFilter({dark = 0.18, fade = true} = {}) {
  const filters = [
    "scale=1920:1080:force_original_aspect_ratio=increase",
    "crop=1920:1080",
    "setsar=1",
    "fps=30",
    "format=yuv420p",
  ];
  if (dark > 0) filters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=black@${dark}:t=fill`);
  if (fade) filters.push("fade=t=in:st=0:d=0.22", "fade=t=out:st=DURATION-0.22:d=0.22");
  return filters;
}

const segmentFiles = [];
let totalDuration = 0;

function segment({source, start = 0, duration, filters}) {
  const index = segmentFiles.length + 1;
  const file = join(work, `${String(index).padStart(2, "0")}.mp4`);
  const resolvedFilters = filters.map((item) => item
    .replaceAll("DURATION-0.22", String(duration - 0.22))
    .replaceAll("DURATION", String(duration)));
  run([
    "-y", ...(source
      ? ["-ss", String(start), "-t", String(duration), "-i", resolve(repo, source)]
      : ["-f", "lavfi", "-i", `color=c=${ink}:s=1920x1080:r=30:d=${duration}`]),
    "-an", "-vf", resolvedFilters.join(","),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-r", "30", "-movflags", "+faststart", file,
  ], `segment ${index}`);
  segmentFiles.push(file);
  totalDuration += duration;
}

segment({
  source: "assets/brand/renaissance-h3-15s.mp4",
  start: 0.8,
  duration: 4.2,
  filters: [
    ...baseFilter({dark: 0.57}),
    "drawbox=x=120:y=178:w=1680:h=2:color=#D8FF45@0.9:t=fill",
    text("A DESIGN AND BUILD SKILL FOR CODING AGENTS", {size: 25, color: accent, x: "(w-text_w)/2", y: 245, spacing: 5}),
    text("WEB DESIGN", {font: serif, size: 138, x: "(w-text_w)/2", y: 350}),
    text("STUDIO", {font: serif, size: 138, color: accent, x: "(w-text_w)/2", y: 500}),
    text("Art direction / scroll / real 3D / browser proof", {size: 30, x: "(w-text_w)/2", y: 720}),
  ],
});

segment({
  duration: 4,
  filters: [
    ...baseFilter({dark: 0}),
    text("01 / AETHER / PROMPT", {size: 28, color: accent, x: 120, y: 120}),
    text("Start with a specific vision.", {font: serif, size: 86, x: 120, y: 192}),
    "drawbox=x=120:y=380:w=1680:h=420:color=#F1ECE2@0.06:t=fill",
    "drawbox=x=120:y=380:w=6:h=420:color=#D8FF45:t=fill",
    text("Use cinematic-scroll to build Aether:", {size: 52, x: 164, y: 435}),
    text("a cinematic 3D site with an object, a hall,", {size: 52, x: 164, y: 525}),
    text("a shader field and a figure. Link the camera to scroll.", {size: 48, x: 164, y: 615}),
    text("PROMPT  /  CODE  /  PREVIEW", {size: 26, color: accent, x: 120, y: 906}),
  ],
});

const aetherSource = readFileSync(resolve(repo, "examples/flagship/main.js"), "utf8");
const codeLines = [
  "const f = t * span;",
  "const i = clamp(Math.floor(f), 0, span - 1);",
  "const local = f - i;",
  "camTarget.copy(anchors[i]).lerp(anchors[i + 1], smooth(0, 1, local));",
  "camera.lookAt(lookTarget);",
  "renderer.render(scene, camera);",
];
for (const line of codeLines) {
  if (!aetherSource.includes(line)) throw new Error(`Aether source excerpt changed: ${line}`);
}
segment({
  duration: 3,
  filters: [
    ...baseFilter({dark: 0}),
    text("01 / AETHER / CODE", {size: 28, color: accent, x: 120, y: 120}),
    text("Give the camera a path.", {font: serif, size: 86, x: 120, y: 192}),
    text("examples/flagship/main.js / selected source lines", {size: 28, color: accent, x: 148, y: 350}),
    ...codeLines.map((line, i) => sourceLine(line, i, 440 + i * 64)),
    text("PROMPT  /  CODE  /  PREVIEW", {size: 26, color: accent, x: 120, y: 906}),
  ],
});
segment({
  source: "assets/previews/flagship.mp4",
  start: 0.3,
  duration: 4,
  filters: [
    ...baseFilter({dark: 0.04}),
    "drawbox=x=72:y=840:w=1150:h=150:color=#10110D@0.88:t=fill",
    text("01 / AETHER / PREVIEW", {size: 25, color: accent, x: 108, y: 870}),
    text("One scroll. Four 3D movements.", {font: serif, size: 62, x: 108, y: 917}),
  ],
});

for (const [source, start, title] of [
  ["assets/previews/liquid-chrome.mp4", 1.1, "Product stories"],
  ["assets/previews/brutalist-kinetic.mp4", 1.0, "Brand worlds"],
]) {
  segment({
    source,
    start,
    duration: 3.5,
    filters: [
      ...baseFilter({dark: 0.04}),
      "drawbox=x=58:y=54:w=590:h=90:color=#10110D@0.82:t=fill",
      text("02 / REAL BUILDS", {size: 21, color: accent, x: 86, y: 76}),
      text(title, {font: serif, size: 42, x: 86, y: 104}),
    ],
  });
}

segment({
  source: "assets/previews/jungle-flythrough.mp4",
  start: 1.0,
  duration: 4.2,
  filters: [
    ...baseFilter({dark: 0.14}),
    "drawbox=x=72:y=714:w=960:h=250:color=#10110D@0.80:t=fill",
    text("03 / REAL-TIME 3D", {size: 23, color: accent, x: 108, y: 748}),
    text("Move through real geometry.", {font: serif, size: 68, x: 108, y: 796}),
    text("Camera, light and story share one scroll progress.", {size: 27, x: 108, y: 895}),
  ],
});

segment({
  source: "assets/video/aureus-preview.mp4",
  start: 2.2,
  duration: 4.2,
  filters: [
    ...baseFilter({dark: 0.12}),
    "drawbox=x=888:y=100:w=950:h=250:color=#10110D@0.80:t=fill",
    text("03 / INTERACTION", {size: 23, color: accent, x: 928, y: 136}),
    text("Motion explains the subject.", {font: serif, size: 62, x: 928, y: 182}),
    text("Scroll-linked camera / material / composition", {size: 25, x: 928, y: 278}),
  ],
});

segment({
  source: "assets/brand/renaissance-h3-15s.mp4",
  start: 5.2,
  duration: 5.2,
  filters: [
    ...baseFilter({dark: 0.66}),
    text("04 / RESILIENCE", {size: 24, color: accent, x: "(w-text_w)/2", y: 214}),
    text("The page still works.", {font: serif, size: 98, x: "(w-text_w)/2", y: 284}),
    "drawbox=x=250:y=524:w=1420:h=126:color=#F1ECE2@0.08:t=fill",
    text("MOBILE    /    REDUCED MOTION    /    NO JS    /    FAILURE", {size: 29, x: "(w-text_w)/2", y: 568}),
    text("Fallbacks are part of the design from the first pass.", {font: serif, size: 38, color: paper, x: "(w-text_w)/2", y: 712}),
  ],
});

segment({
  source: "assets/previews/clinical-noir.mp4",
  start: 0.4,
  duration: 5.2,
  filters: [
    ...baseFilter({dark: 0.58}),
    "drawbox=x=98:y=142:w=8:h=660:color=#D8FF45@1:t=fill",
    text("05 / BROWSER EVIDENCE", {size: 24, color: accent, x: 146, y: 164}),
    text("Inspect the result.", {font: serif, size: 92, x: 146, y: 224}),
    text("DESKTOP", {size: 28, x: 150, y: 390}),
    text("MOBILE", {size: 28, x: 150, y: 460}),
    text("REDUCED MOTION", {size: 28, x: 150, y: 530}),
    text("NO JAVASCRIPT", {size: 28, x: 150, y: 600}),
    text("RENDERER FAILURE", {size: 28, x: 150, y: 670}),
    text("Working states, visible copy and real interaction.", {font: serif, size: 40, x: 146, y: 770}),
  ],
});

segment({
  source: "assets/brand/renaissance-h3-15s.mp4",
  start: 9.6,
  duration: 5.0,
  filters: [
    ...baseFilter({dark: 0.68}),
    "drawbox=x=116:y=126:w=1688:h=2:color=#D8FF45@0.95:t=fill",
    text("FREE / MIT / BUILDS WITH YOUR AGENT", {size: 24, color: accent, x: "(w-text_w)/2", y: 218}),
    text("Build the site your brief deserves.", {font: serif, size: 88, x: "(w-text_w)/2", y: 330}),
    "drawbox=x=480:y=550:w=960:h=100:color=#F1ECE2@0.10:t=fill",
    text("npx skills add MustBeSimo/web-design-studio", {size: 30, x: "(w-text_w)/2", y: 585}),
    text("github.com/MustBeSimo/web-design-studio", {font: serif, size: 34, color: accent, x: "(w-text_w)/2", y: 724}),
  ],
});

const list = join(work, "segments.txt");
writeFileSync(list, segmentFiles.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
const silent = join(work, "silent.mp4");
run(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent], "concatenation");

run([
  "-y", "-i", silent, "-stream_loop", "-1", "-i", resolve(repo, "assets/reel3.mp4"),
  "-map", "0:v:0", "-map", "1:a:0", "-t", String(totalDuration),
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
  "-af", `volume=1.4,afade=t=in:st=0:d=1.2,afade=t=out:st=${totalDuration - 1.6}:d=1.6`,
  "-movflags", "+faststart", output,
], "audio mix");

run(["-y", "-ss", "1.6", "-i", output, "-frames:v", "1", "-q:v", "2", poster], "poster");

console.log(JSON.stringify({output, poster, durationSeconds: totalDuration, work}, null, 2));
