/* The StudentOS logo as a real 3D object in raw WebGL: the mark's PNG is traced with
   marching squares and extruded into a solid with lit, slightly chrome faces.
   Front and back are one textured quad each (pixels outside the mark are discarded);
   the sides are a strip of quads along the traced outline with smooth normals.
   No libraries. Returns null when WebGL or the image is not available. */

type V3 = [number, number, number];
type M4 = Float32Array;

const VERT = `
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec2 a_uv;
uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec2 u_offset;
uniform float u_depth;
varying vec3 v_n;
varying vec3 v_w;
varying vec2 v_uv;
varying float v_side;
void main() {
  vec3 p = a_pos;
  p.z *= u_depth;
  vec4 w = u_model * vec4(p, 1.0);
  v_w = w.xyz;
  v_n = mat3(u_model) * a_nrm;
  v_uv = a_uv;
  v_side = 1.0 - abs(a_nrm.z);
  vec4 c = u_vp * w;
  c.xy += u_offset * c.w;
  gl_Position = c;
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec3 u_eye;
uniform float u_alpha;
varying vec3 v_n;
varying vec3 v_w;
varying vec2 v_uv;
varying float v_side;
void main() {
  vec4 t = texture2D(u_tex, v_uv);
  if (v_side < 0.5 && t.a < 0.5) discard;
  vec3 base = t.rgb / max(t.a, 0.05);
  if (v_side > 0.5) base *= 0.62;
  vec3 n = normalize(v_n);
  vec3 v = normalize(u_eye - v_w);
  if (dot(n, v) < 0.0) n = -n;
  vec3 l1 = normalize(vec3(-0.45, 0.75, 0.9));
  vec3 l2 = normalize(vec3(0.85, -0.35, 0.45));
  float d1 = max(dot(n, l1), 0.0);
  float d2 = max(dot(n, l2), 0.0);
  float s1 = pow(max(dot(n, normalize(l1 + v)), 0.0), 56.0);
  float s2 = pow(max(dot(n, normalize(l2 + v)), 0.0), 24.0);
  float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 col = base * (0.32 + 0.72 * d1 + 0.28 * d2)
    + vec3(1.0) * s1 * 0.4
    + vec3(0.55, 0.9, 1.0) * s2 * 0.25
    + vec3(0.62, 0.45, 1.0) * fr * 0.55;
  gl_FragColor = vec4(col * u_alpha, u_alpha);
}`;

/* ---- matrices (column-major) ---- */
export const perspective = (fovy: number, aspect: number, near: number, far: number): M4 => {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
};
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lookAt = (eye: V3, at: V3): M4 => {
  const z = norm(sub(eye, at));
  const x = norm(cross([0, 1, 0], z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ]);
};
export const multiply = (a: M4, b: M4): M4 => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};
export const rotY = (t: number): M4 => {
  const c = Math.cos(t), s = Math.sin(t);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};
export const rotX = (t: number): M4 => {
  const c = Math.cos(t), s = Math.sin(t);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
};

/* ---- geometry: trace the alpha mask, extrude the outline ---- */
const GRID = 200;
const STRIDE = 8; // pos 3, normal 3, uv 2

function buildMesh(img: HTMLImageElement) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = GRID;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  if (!cx) return null;
  cx.drawImage(img, 0, 0, GRID, GRID);
  const px = cx.getImageData(0, 0, GRID, GRID).data;
  const A = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(GRID - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(GRID - 1, Math.round(y)));
    return px[(yi * GRID + xi) * 4 + 3] / 255;
  };
  const grad = (x: number, y: number): [number, number] => [A(x + 1, y) - A(x - 1, y), A(x, y + 1) - A(x, y - 1)];
  // grid (pixel) → world: x right, y up, the image spans -1..1
  const wx = (x: number) => ((x + 0.5) / GRID) * 2 - 1;
  const wy = (y: number) => 1 - ((y + 0.5) / GRID) * 2;
  const uvx = (x: number) => (x + 0.5) / GRID;
  const uvy = (y: number) => (y + 0.5) / GRID;

  const data: number[] = [];
  const index: number[] = [];
  const quad = (v: number[][]) => {
    const b = data.length / STRIDE;
    v.forEach((q) => data.push(...q));
    index.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  // front (z=+1) and back (z=-1): one quad each, the shader discards the empty pixels
  quad([[-1, -1, 1, 0, 0, 1, 0, 1], [1, -1, 1, 0, 0, 1, 1, 1], [1, 1, 1, 0, 0, 1, 1, 0], [-1, 1, 1, 0, 0, 1, 0, 0]]);
  quad([[-1, -1, -1, 0, 0, -1, 0, 1], [-1, 1, -1, 0, 0, -1, 0, 0], [1, 1, -1, 0, 0, -1, 1, 0], [1, -1, -1, 0, 0, -1, 1, 1]]);

  // sides: marching squares on the alpha mask
  const T = 0.5;
  const SEG: Record<number, number[][]> = {
    1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]],
    8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]],
  };
  for (let y = 0; y < GRID - 1; y++) {
    for (let x = 0; x < GRID - 1; x++) {
      const c = [A(x, y), A(x + 1, y), A(x + 1, y + 1), A(x, y + 1)];
      const id = (c[0] > T ? 1 : 0) | (c[1] > T ? 2 : 0) | (c[2] > T ? 4 : 0) | (c[3] > T ? 8 : 0);
      const segs = SEG[id];
      if (!segs) continue;
      const lerp = (a: number, b: number) => (T - a) / (b - a || 1e-6);
      const edge = (e: number): [number, number] => {
        if (e === 0) return [x + lerp(c[0], c[1]), y];
        if (e === 1) return [x + 1, y + lerp(c[1], c[2])];
        if (e === 2) return [x + 1 - lerp(c[2], c[3]), y + 1];
        return [x, y + 1 - lerp(c[3], c[0])];
      };
      for (const [ea, eb] of segs) {
        const pts = [edge(ea), edge(eb)].map(([gx, gy]) => {
          const [dx, dy] = grad(gx, gy);
          const l = Math.hypot(dx, dy) || 1;
          const nx = -dx / l;
          const ny = dy / l; // y flips going to world space
          // colour from just inside the edge, where the mark is opaque
          const ix = gx - (-dx / l) * 2.5;
          const iy = gy - (-dy / l) * 2.5;
          return { X: wx(gx), Y: wy(gy), nx, ny, u: uvx(ix), v: uvy(iy) };
        });
        const [p, q] = pts;
        quad([
          [p.X, p.Y, 1, p.nx, p.ny, 0, p.u, p.v],
          [q.X, q.Y, 1, q.nx, q.ny, 0, q.u, q.v],
          [q.X, q.Y, -1, q.nx, q.ny, 0, q.u, q.v],
          [p.X, p.Y, -1, p.nx, p.ny, 0, p.u, p.v],
        ]);
        if (data.length / STRIDE > 65000) return null; // too detailed for 16-bit indices
      }
    }
  }
  return { data: new Float32Array(data), index: new Uint16Array(index) };
}

export type LogoFrame = {
  vp: M4;
  model: M4;
  ox: number;
  oy: number;
  eye: V3;
  /** half-thickness of the solid in world units (the mark spans -1..1) */
  depth: number;
  alpha: number;
};

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function createLogoGL(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return null;
  const mesh = buildMesh(img);
  if (!mesh) return null;
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW);
  const attr = (n: string, size: number, off: number) => {
    const a = gl.getAttribLocation(prog, n);
    if (a < 0) return;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, size, gl.FLOAT, false, STRIDE * 4, off * 4);
  };
  attr("a_pos", 3, 0);
  attr("a_nrm", 3, 3);
  attr("a_uv", 2, 6);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const loc: Record<string, WebGLUniformLocation | null> = {};
  for (const n of ["u_vp", "u_model", "u_offset", "u_depth", "u_eye", "u_alpha", "u_tex"]) loc[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(loc.u_tex, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    /** false once the context is lost; the caller falls back to the DOM logo */
    draw(f: LogoFrame) {
      if (lost) return false;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(loc.u_vp, false, f.vp);
      gl.uniformMatrix4fv(loc.u_model, false, f.model);
      gl.uniform2f(loc.u_offset, f.ox, f.oy);
      gl.uniform1f(loc.u_depth, f.depth);
      gl.uniform3f(loc.u_eye, f.eye[0], f.eye[1], f.eye[2]);
      gl.uniform1f(loc.u_alpha, f.alpha);
      gl.drawElements(gl.TRIANGLES, mesh.index.length, gl.UNSIGNED_SHORT, 0);
      return true;
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(vbo);
      gl.deleteBuffer(ibo);
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
    },
  };
}
