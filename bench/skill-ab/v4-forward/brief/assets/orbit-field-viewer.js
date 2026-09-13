const VERTEX_SHADER = `
attribute vec3 aPosition;
uniform float uAspect;
uniform float uProgress;
uniform float uTwist;
uniform float uSeparation;
uniform float uTime;
varying float vDepth;

mat3 rotateX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.,0.,0., 0.,c,-s, 0.,s,c);
}
mat3 rotateY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c,0.,s, 0.,1.,0., -s,0.,c);
}
void main() {
  vec3 p = aPosition;
  float phase = p.y * 1.9 + p.z * 3.1;
  p.x += sin(phase + uTwist + uTime * .14) * .13;
  p.z += cos(phase * .73 + uTwist) * uSeparation;
  p = rotateY(-.62 + uProgress * 1.28) * rotateX(.18 - uProgress * .38) * p;
  float cameraDistance = 4.2 - sin(uProgress * 3.14159) * .62;
  float perspective = 1.72 / (cameraDistance - p.z);
  vec2 projected = p.xy * perspective;
  projected.x /= uAspect;
  vDepth = clamp((p.z + 1.8) / 3.6, 0., 1.);
  gl_Position = vec4(projected, 0., 1.);
  gl_PointSize = 1.5;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec4 uSignal;
varying float vDepth;
void main() {
  float alpha = .3 + vDepth * .7;
  gl_FragColor = vec4(uSignal.rgb, alpha);
}
`;

function shader(gl, type, source) {
  const item = gl.createShader(type);
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(item) || "Shader compilation failed";
    gl.deleteShader(item);
    throw new Error(message);
  }
  return item;
}

function program(gl) {
  const result = gl.createProgram();
  const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(result, vertex);
  gl.attachShader(result, fragment);
  gl.linkProgram(result);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(result) || "Program link failed";
    gl.deleteProgram(result);
    throw new Error(message);
  }
  return result;
}

function geometry(scene) {
  const vertices = [];
  const bands = Math.max(2, scene.bands | 0);
  const segments = Math.max(8, scene.segments | 0);
  for (let band = 0; band < bands; band += 1) {
    const y = -scene.height * .5 + scene.height * band / (bands - 1);
    const bandPhase = band / bands * Math.PI * 2;
    for (let segment = 0; segment < segments; segment += 1) {
      const t = segment / (segments - 1);
      const angle = t * Math.PI * 2 * scene.turns + bandPhase * .16;
      const radius = scene.radius + Math.sin(t * Math.PI * 6 + bandPhase) * scene.wave;
      vertices.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  return { vertices: new Float32Array(vertices), bands, segments };
}

export function mountOrbitField({ canvas, scene, reducedMotion = false } = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("A canvas is required");
  if (!scene || typeof scene !== "object") throw new Error("Scene data is required");
  const gl = canvas.getContext("webgl", { alpha: false, antialias: true });
  if (!gl) throw new Error("WebGL is unavailable");

  const fieldProgram = program(gl);
  const mesh = geometry(scene);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

  const locations = {
    position: gl.getAttribLocation(fieldProgram, "aPosition"),
    aspect: gl.getUniformLocation(fieldProgram, "uAspect"),
    progress: gl.getUniformLocation(fieldProgram, "uProgress"),
    twist: gl.getUniformLocation(fieldProgram, "uTwist"),
    separation: gl.getUniformLocation(fieldProgram, "uSeparation"),
    time: gl.getUniformLocation(fieldProgram, "uTime"),
    signal: gl.getUniformLocation(fieldProgram, "uSignal")
  };

  let progress = reducedMotion ? .52 : 0;
  let frame = 0;
  let disposed = false;
  let resolveFirstFrame;
  let rejectFirstFrame;
  const firstFrame = new Promise((resolve, reject) => {
    resolveFirstFrame = resolve;
    rejectFirstFrame = reject;
  });

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  function draw(time = 0) {
    if (disposed) return;
    try {
      resize();
      const background = scene.background || [0.027, 0.078, 0.184, 1];
      const signal = scene.signal || [0.263, 0.91, 0.957, 1];
      gl.clearColor(...background);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(fieldProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(locations.position);
      gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
      gl.uniform1f(locations.aspect, canvas.width / canvas.height);
      gl.uniform1f(locations.progress, progress);
      gl.uniform1f(locations.twist, progress * 3.4);
      gl.uniform1f(locations.separation, .03 + Math.sin(progress * Math.PI) * .2);
      gl.uniform1f(locations.time, reducedMotion ? 0 : time * .001);
      gl.uniform4fv(locations.signal, signal);
      for (let band = 0; band < mesh.bands; band += 1) {
        gl.drawArrays(gl.LINE_STRIP, band * mesh.segments, mesh.segments);
      }
      if (frame === 0) resolveFirstFrame();
      frame += 1;
      if (!reducedMotion) requestAnimationFrame(draw);
    } catch (error) {
      if (frame === 0) rejectFirstFrame(error);
      throw error;
    }
  }

  requestAnimationFrame(draw);

  return {
    firstFrame,
    setProgress(value) {
      if (reducedMotion) return;
      progress = Math.min(1, Math.max(0, Number(value) || 0));
    },
    dispose() {
      disposed = true;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(fieldProgram);
    }
  };
}
