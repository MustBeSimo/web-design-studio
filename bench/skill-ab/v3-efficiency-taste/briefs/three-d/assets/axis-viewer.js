// Supplied dependency-free GLB viewer for the Axis 24 benchmark asset.
// Usage: const viewer = await createAxisViewer({ canvas, url: './kit/assets/axis-24.glb' });
// viewer.setView({ camera: [2, .4, 4], rotation: [0, .6, 0] });
export async function createAxisViewer({ canvas, url }) {
  document.documentElement.dataset.modelState = "loading";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GLB request failed: ${response.status}`);
    const glb = parseGlb(await response.arrayBuffer());
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL unavailable");
    const program = makeProgram(gl, `
      attribute vec3 position; attribute vec3 normal;
      uniform mat4 matrix; uniform mat4 model;
      varying vec3 vNormal; varying vec3 vPosition;
      void main(){ vec4 world=model*vec4(position,1.); vPosition=world.xyz; vNormal=mat3(model)*normal; gl_Position=matrix*world; }
    `, `
      precision highp float; varying vec3 vNormal; varying vec3 vPosition;
      void main(){ vec3 n=normalize(vNormal); vec3 l=normalize(vec3(-.5,.9,1.)); float key=max(0.,dot(n,l)); float rim=pow(1.-max(0.,dot(n,normalize(-vPosition))),2.); vec3 metal=vec3(.25,.32,.4)*(0.34+key*.85)+vec3(.95,.72,.26)*rim*.34; gl_FragColor=vec4(metal,1.); }
    `);
    const positions = glb.accessor("POSITION"), normals = glb.accessor("NORMAL"), indices = glb.indices();
    bind(gl, program, "position", positions, 3); bind(gl, program, "normal", normals, 3);
    const indexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    let view = { camera: [2.1, .35, 4.2], rotation: [0, .35, 0] };
    const resize = () => { const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr)); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h} gl.viewport(0,0,w,h); return w/h };
    const render = () => {
      const aspect=resize(); gl.clearColor(.035,.055,.08,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program); const model=multiply(rotateX(view.rotation[0]),multiply(rotateY(view.rotation[1]),rotateZ(view.rotation[2]))); const projection=perspective(Math.PI/5,aspect,.1,100); const camera=lookAt(view.camera,[0,0,0],[0,1,0]);
      gl.uniformMatrix4fv(gl.getUniformLocation(program,"model"),false,model); gl.uniformMatrix4fv(gl.getUniformLocation(program,"matrix"),false,multiply(projection,camera)); gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    };
    const setView = (next) => { view={camera:next.camera||view.camera,rotation:next.rotation||view.rotation}; canvas.dataset.cameraState=JSON.stringify([...view.camera,...view.rotation].map(n=>Number(n.toFixed(4)))); render() };
    setView(view); document.documentElement.dataset.modelState="ready";
    return { setView, render, dispose(){ gl.deleteProgram(program); }, meshName: glb.json.meshes?.[0]?.name || "mesh" };
  } catch (error) {
    document.documentElement.dataset.modelState = "fallback";
    throw error;
  }
}

function parseGlb(buffer) {
  const view=new DataView(buffer); if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)throw new Error("Invalid GLB");
  const jsonLength=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)).trim()); const binStart=28+jsonLength,bin=new Uint8Array(buffer,binStart,view.getUint32(20+jsonLength,true)); const primitive=json.meshes[0].primitives[0];
  const readAccessor=(index) => { const a=json.accessors[index],b=json.bufferViews[a.bufferView],offset=(b.byteOffset||0)+(a.byteOffset||0),components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5123:2,5126:4}[a.componentType],Ctor={5123:Uint16Array,5126:Float32Array}[a.componentType]; if(!Ctor)throw new Error(`Unsupported component type ${a.componentType}`); if(b.byteStride&&b.byteStride!==components*bytes)throw new Error("Interleaved accessors unsupported"); return new Ctor(bin.buffer,bin.byteOffset+offset,a.count*components) };
  return { json, accessor(name){return readAccessor(primitive.attributes[name])}, indices(){return readAccessor(primitive.indices)} };
}
function makeProgram(gl,vertex,fragment){const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function bind(gl,program,name,data,size){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0)}
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function rotateX(v){const m=identity(),c=Math.cos(v),s=Math.sin(v);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}function rotateY(v){const m=identity(),c=Math.cos(v),s=Math.sin(v);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}function rotateZ(v){const m=identity(),c=Math.cos(v),s=Math.sin(v);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m}
function lookAt(eye,target,up){const norm=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l)},sub=(a,b)=>a.map((n,i)=>n-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
