/**
 * EXPERIMENTAL — not the recommended resting-lanczos path.
 *
 * Draws a loaded HTMLImageElement into a WebGL2 canvas with
 * LINEAR_MIPMAP_LINEAR (+ optional anisotropy and light sharpen).
 *
 * WARNING: Often softens fine text/UI in screenshots. Prefer plain
 * <img srcset> of Lanczos tiers + CSS transform: scale() for cards.
 */

function compile(gl, type, source) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader create failed");
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(info || "shader compile failed");
  }
  return sh;
}

function createProgram(gl) {
  const vs = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

  const fs = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform float u_sharpen;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  vec3 n = texture(u_tex, v_uv + vec2(0.0, -u_texel.y)).rgb;
  vec3 s = texture(u_tex, v_uv + vec2(0.0,  u_texel.y)).rgb;
  vec3 e = texture(u_tex, v_uv + vec2( u_texel.x, 0.0)).rgb;
  vec3 w = texture(u_tex, v_uv + vec2(-u_texel.x, 0.0)).rgb;
  vec3 blur = (n + s + e + w) * 0.25;
  float contrast = max(max(abs(c.r - blur.r), abs(c.g - blur.g)), abs(c.b - blur.b));
  float gate = 1.0 - smoothstep(0.04, 0.22, contrast);
  float amt = u_sharpen * gate;
  vec3 sharp = c + (c - blur) * amt;
  outColor = vec4(clamp(sharp, 0.0, 1.0), 1.0);
}`;

  const prog = gl.createProgram();
  if (!prog) throw new Error("program create failed");
  const vsh = compile(gl, gl.VERTEX_SHADER, vs);
  const fsh = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  gl.deleteShader(vsh);
  gl.deleteShader(fsh);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(info || "program link failed");
  }
  return prog;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.wrap — sized container (ResizeObserver target)
 * @param {HTMLCanvasElement} opts.canvas
 * @param {HTMLImageElement} opts.img — must load the chosen srcset tier
 * @param {number} [opts.sharpen=0.12] — set 0 to disable sharpen
 * @param {number} [opts.maxDpr=2]
 * @param {() => void} [opts.onFallback]
 * @returns {{ destroy: () => void, redraw: () => void }}
 */
export function mountMipmapDrawer(opts) {
  const {
    wrap,
    canvas,
    img,
    sharpen = 0.12,
    maxDpr = 2,
    onFallback,
  } = opts;

  let gl = null;
  let prog = null;
  let tex = null;
  let vao = null;
  let buf = null;
  let uTexel = null;
  let uSharpen = null;
  let uTex = null;
  let disposed = false;
  let failed = false;
  let texW = 1;
  let texH = 1;

  const destroyGl = () => {
    if (!gl) return;
    if (tex) gl.deleteTexture(tex);
    if (buf) gl.deleteBuffer(buf);
    if (vao) gl.deleteVertexArray(vao);
    if (prog) gl.deleteProgram(prog);
    tex = null;
    buf = null;
    vao = null;
    prog = null;
    gl = null;
  };

  const fail = () => {
    if (failed) return;
    failed = true;
    destroyGl();
    onFallback?.();
  };

  try {
    gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      fail();
      return { destroy: () => {}, redraw: () => {} };
    }
    prog = createProgram(gl);
    uTexel = gl.getUniformLocation(prog, "u_texel");
    uSharpen = gl.getUniformLocation(prog, "u_sharpen");
    uTex = gl.getUniformLocation(prog, "u_tex");

    vao = gl.createVertexArray();
    buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    const anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");
    if (anisoExt) {
      const max = gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(
        gl.TEXTURE_2D,
        anisoExt.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(4, max),
      );
    }
  } catch {
    fail();
    return { destroy: () => {}, redraw: () => {} };
  }

  const draw = () => {
    if (disposed || failed || !gl || !prog || !tex) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uTex, 0);
    gl.uniform2f(uTexel, 1 / Math.max(texW, 1), 1 / Math.max(texH, 1));
    gl.uniform1f(uSharpen, sharpen);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  const uploadFromImg = () => {
    if (disposed || failed || !gl || !tex || !img.naturalWidth) return;
    texW = img.naturalWidth;
    texH = img.naturalHeight;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    draw();
  };

  const resizeCanvas = () => {
    if (disposed || failed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const cssW = Math.max(1, wrap.clientWidth);
    const cssH = Math.max(1, wrap.clientHeight);
    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    draw();
  };

  const onImgLoad = () => {
    try {
      uploadFromImg();
      resizeCanvas();
    } catch {
      fail();
    }
  };

  if (img.complete && img.naturalWidth) onImgLoad();
  else img.addEventListener("load", onImgLoad);

  const ro = new ResizeObserver(() => resizeCanvas());
  ro.observe(wrap);

  return {
    redraw: () => {
      resizeCanvas();
    },
    destroy: () => {
      disposed = true;
      img.removeEventListener("load", onImgLoad);
      ro.disconnect();
      destroyGl();
    },
  };
}
