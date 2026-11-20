import * as THREE from 'three';

/* ------------------------------------------------------------------ utils */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const easeInOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t, s = 1.15) => { const c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const damp = (dt, k) => 1 - Math.exp(-k * dt);

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------- flavours */
const FLAVORS = [
  { name: 'PEACH FIZZ',   liquid: '#F27A3C', cap: '#E25B45', ink: '#E8673E', fruit: 'peach' },
  { name: 'APRICOT FIZZ', liquid: '#F39A2E', cap: '#E58A2A', ink: '#E8942F', fruit: 'apricot' },
  { name: 'ROSE FIZZ',    liquid: '#EC6E8F', cap: '#D9567A', ink: '#D9567A', fruit: 'rose petal' },
  { name: 'BLOOD ORANGE', liquid: '#D63A2C', cap: '#C7332B', ink: '#C7332B', fruit: 'blood orange' },
  { name: 'MANGO FIZZ',   liquid: '#F4AA2C', cap: '#E39A22', ink: '#E7A229', fruit: 'mango' },
  { name: 'RASPBERRY',    liquid: '#D6436A', cap: '#C93A5C', ink: '#C93A5C', fruit: 'raspberry' },
  { name: 'GUAVA FIZZ',   liquid: '#EF7464', cap: '#E2665E', ink: '#E2665E', fruit: 'guava' },
  { name: 'NECTARINE',    liquid: '#EA5A30', cap: '#D9502F', ink: '#D9502F', fruit: 'nectarine' }
];
const F = FLAVORS.map(f => ({ ...f, liquidC: new THREE.Color(f.liquid), capC: new THREE.Color(f.cap) }));
const TILT = [.10, -.15, .07, -.09, .14, -.06, .12, -.13, .08, -.11, .15, -.07, .09, -.14, .06, -.10];
const COUNT = 16;
const BH = 2.43;
const SHEET = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261120_070622_93733524-ae88-4030-bcf5-052bfac8f786.png&w=2048&q=90';

/* --------------------------------------------------------------- renderer */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const VH = 20 * Math.tan(THREE.MathUtils.degToRad(15));
let W = VH;
let aspect = 1;
let k = 0;

/* ------------------------------------------------------------- environment */
function buildEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#2c1b17');
  const add = (w, h, col, inten, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })
    );
    m.material.color.multiplyScalar(inten);
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  add(1.0, 16, 0xffffff, 7, -5.5, 0, 4.2);
  add(0.55, 16, 0xffffff, 5, 4.8, .5, 3.6);
  add(0.35, 16, 0xfff4ea, 3.5, 1.4, 0, 6.5);
  add(12, 2.5, 0xfff1e6, 2.4, 0, 7.5, 1.5);
  add(10, 9, 0xff9466, 1.3, 0, -1, -8);
  add(7, 8, 0xffc6a8, 1.1, -8, -1, -3);
  add(7, 8, 0xffb08c, .9, 8, -1, -2);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, .035);
  pmrem.dispose();
  return rt.texture;
}
const envMap = buildEnvironment();
scene.environment = envMap;

const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(-3, 5, 6);
scene.add(key);
const amb = new THREE.AmbientLight(0xffe8dc, .35);
scene.add(amb);

/* ------------------------------------------------------------------ labels */
function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function bannerPath(g) {
  // soft brush-edged cream ribbon, tilted up to the right
  g.beginPath();
  g.moveTo(-30, 96);
  g.bezierCurveTo(120, 66, 250, 74, 520, 52);
  g.bezierCurveTo(700, 38, 830, 30, 1058, 8);
  g.lineTo(1064, 428);
  g.bezierCurveTo(860, 448, 700, 440, 520, 452);
  g.bezierCurveTo(280, 468, 120, 456, -26, 434);
  g.closePath();
}
function drawFallbackLabel(i) {
  const f = F[i];
  const c = canvasOf(1024, 512);
  const g = c.getContext('2d');
  g.fillStyle = '#FFF3EC';
  bannerPath(g);
  g.fill();
  g.save();
  g.translate(512, 300);
  g.rotate(-.035);
  g.fillStyle = f.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'italic 900 230px "Barlow Condensed", Impact, sans-serif';
  g.fillText('SUNFIZZ', 0, 0);
  g.font = 'italic 800 64px "Barlow Condensed", Impact, sans-serif';
  g.letterSpacing = '10px';
  g.fillText(f.name, 0, 80);
  g.restore();
  // little fruit
  g.fillStyle = f.ink;
  g.beginPath();
  g.arc(790, 150, 34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#FFF3EC';
  g.beginPath();
  g.arc(806, 134, 12, 0, Math.PI * 2);
  g.fill();
  return c;
}
function makeFrontCanvases(img) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    if (img) {
      const c = canvasOf(1024, 512);
      const g = c.getContext('2d');
      g.drawImage(img, (i % 2) * 1024, Math.floor(i / 2) * 512, 1024, 512, 0, 0, 1024, 512);
      out.push(c);
    } else out.push(drawFallbackLabel(i));
  }
  return out;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function iconLeaf(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r);
  g.bezierCurveTo(x - r * 1.1, y + r * .1, x - r * .5, y - r * 1.1, x + r * .75, y - r);
  g.stroke();
  g.beginPath();
  g.moveTo(x, y + r);
  g.bezierCurveTo(x - r * .1, y + r * .1, x + r * .2, y - r * .3, x + r * .6, y - r * .6);
  g.stroke();
}
function iconBubbles(g, x, y, r) {
  g.beginPath(); g.arc(x - r * .35, y - r * .2, r * .48, 0, 7); g.stroke();
  g.beginPath(); g.arc(x + r * .4, y + r * .3, r * .3, 0, 7); g.stroke();
  g.beginPath(); g.arc(x - r * .25, y + r * .55, r * .2, 0, 7); g.stroke();
}
function iconFruit(g, x, y, r) {
  g.beginPath(); g.arc(x, y + r * .12, r * .72, 0, 7); g.stroke();
  g.beginPath();
  g.moveTo(x, y - r * .55);
  g.bezierCurveTo(x - r * .05, y - r * .95, x + r * .35, y - r * 1.1, x + r * .62, y - r * .95);
  g.stroke();
}
function makeBackCanvas(i) {
  const f = F[i];
  const c = canvasOf(1024, 700);
  const g = c.getContext('2d');
  g.fillStyle = '#FFF3EC';
  bannerPath(g);
  g.fill();

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = f.ink;
  g.font = 'italic 900 104px "Barlow Condensed", Impact, sans-serif';
  g.fillText('SUNFIZZ', 512, 118);
  g.font = 'italic 800 30px "Barlow Condensed", Impact, sans-serif';
  g.fillText('SPARKLING FRUIT SODA', 512, 168);

  const rows = [
    ['REAL FRUIT', '18% ' + f.fruit + ' juice, never from concentrate', 0],
    ['LIGHT FIZZ', 'Fine bubbles, a soft natural sparkle', 1],
    ['NO SUGAR ADDED', '4.2 g sugar per 100 ml, all from fruit', 2]
  ];
  g.textAlign = 'left';
  for (const [head, detail, idx] of rows) {
    const y = 175 + idx * 150;
    const x = 150;
    g.strokeStyle = f.ink;
    g.lineWidth = 4;
    g.globalAlpha = .9;
    const cx = x + 70, cy = y + 70;
    if (idx === 0) iconLeaf(g, cx, cy, 40);
    else if (idx === 1) iconBubbles(g, cx, cy, 40);
    else iconFruit(g, cx, cy, 40);
    g.globalAlpha = 1;
    g.fillStyle = '#4A1E17';
    g.font = 'italic 800 60px "Barlow Condensed", Impact, sans-serif';
    g.fillText(head, x + 135, y + 52);
    g.font = '500 25px "Manrope", system-ui, sans-serif';
    g.fillStyle = 'rgba(74,30,23,.82)';
    g.fillText(detail, x + 135, y + 96);
  }
  g.textAlign = 'center';
  g.fillStyle = 'rgba(74,30,23,.7)';
  g.font = '600 22px "Manrope", system-ui, sans-serif';
  g.fillText('330 ml · 92 kcal · best served cold', 512, 662);
  return c;
}

/* --------------------------------------------------- droplet normal texture */
function dropletNormalMap() {
  const S = 512;
  const hc = canvasOf(S, S);
  const hg = hc.getContext('2d');
  hg.fillStyle = '#000';
  hg.fillRect(0, 0, S, S);
  let seed = 9271;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 340; i++) {
    const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 13;
    const grd = hg.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(.55, 'rgba(255,255,255,.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    hg.fillStyle = grd;
    hg.beginPath(); hg.arc(x, y, r, 0, 7); hg.fill();
  }
  const src = hg.getImageData(0, 0, S, S).data;
  const out = hg.createImageData(S, S);
  const strength = 2.2;
  const at = (x, y) => src[((((y + S) % S) * S) + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const o = (y * S + x) * 4;
      out.data[o] = (nx * .5 + .5) * 255;
      out.data[o + 1] = (ny * .5 + .5) * 255;
      out.data[o + 2] = (nz * .5 + .5) * 255;
      out.data[o + 3] = 255;
    }
  }
  hg.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(hc);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2.4);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/* -------------------------------------------------------------- geometry */
function latheFromProfile(raw, segments, samples) {
  const pts = raw.map(p => new THREE.Vector2(p[0], p[1]));
  let profile = pts;
  if (samples) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0)), false, 'centripetal', .5);
    profile = curve.getPoints(samples - 1).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  }
  return new THREE.LatheGeometry(profile, segments);
}
const GLASS_PROFILE = [[0,0],[.40,0],[.485,.022],[.515,.085],[.52,.16],[.52,1.08],[.524,1.2],[.517,1.33],[.47,1.5],[.385,1.69],[.295,1.86],[.24,2.0],[.217,2.12],[.21,2.21],[.226,2.245],[.229,2.31],[.214,2.34],[.18,2.345]];
const LIQUID_PROFILE = [[0,.06],[.38,.06],[.465,.09],[.49,.16],[.49,1.08],[.493,1.2],[.487,1.33],[.443,1.5],[.36,1.69],[.272,1.86],[.214,2.0],[.196,2.12],[.19,2.24],[0,2.24]];
const CAP_PROFILE = [[0,2.425],[.17,2.425],[.222,2.415],[.244,2.39],[.252,2.36],[.254,2.3],[.246,2.285]];

const geoGlass = latheFromProfile(GLASS_PROFILE, 112, 140);
const geoLiquid = latheFromProfile(LIQUID_PROFILE, 96, 0);
const geoCap = (() => {
  const g = latheFromProfile(CAP_PROFILE, 126, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 2.4) {
      const phi = Math.atan2(z, x);
      const f = 1 + .04 * Math.pow(Math.max(0, Math.cos(21 * phi)), .7);
      p.setX(i, x * f);
      p.setZ(i, z * f);
    }
  }
  g.computeVertexNormals();
  return g;
})();
const FRONT_ARC = (.94 * 2) / .528;
const geoLabelFront = new THREE.CylinderGeometry(.528, .528, .94, 64, 1, true, -FRONT_ARC / 2, FRONT_ARC);
const geoLabelBack = new THREE.CylinderGeometry(.528, .528, .88, 64, 1, true, Math.PI - 1.2, 2.4);
const normalMap = dropletNormalMap();

/* glass material (shared) */
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x000000, roughness: .04, metalness: 0, transparent: true, opacity: .07,
  depthWrite: false, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 2.1,
  ior: 1.5, normalMap, normalScale: new THREE.Vector2(.42, .42)
});
glassMat.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `
    float fresnelT = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
    float pureMax = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);
    float specT = smoothstep(.22, 1.1, pureMax);
    float alphaT = diffuseColor.a + fresnelT * .3 + specT * .9;
    gl_FragColor = vec4(outgoingLight, clamp(alphaT, 0.0, 1.0));
    `
  );
};

/* --------------------------------------------------------------- backdrop */
const bgUniforms = {
  uTime: { value: 0 },
  uAspect: { value: 1 },
  uTop: { value: new THREE.Color('#EE9F84') },
  uBot: { value: new THREE.Color('#F7BBA2') },
  uGlow: { value: new THREE.Color('#FFD8C4') },
  uGlowPos: { value: new THREE.Vector2(.5, .2) },
  uGlowAmt: { value: .42 },
  uGlowRad: { value: 2.4 },
  uClouds: { value: 0 },
  uFloor: { value: 0 },
  uManifest: { value: 0 },
  uSharp: { value: 0 },
  uTxtY: { value: .5 },
  uTxtW: { value: .92 },
  uTint: { value: new THREE.Color('#FFF1E8') },
  tSharp: { value: null },
  tSoft: { value: null }
};
const bgScene = new THREE.Scene();
const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bgMat = new THREE.ShaderMaterial({
  uniforms: bgUniforms,
  depthTest: false, depthWrite: false,
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime, uAspect, uGlowAmt, uGlowRad, uClouds, uFloor, uManifest, uSharp, uTxtY, uTxtW;
    uniform vec3 uTop, uBot, uGlow, uTint;
    uniform vec2 uGlowPos;
    uniform sampler2D tSharp, tSoft;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = vUv;
      vec3 col = mix(uBot, uTop, uv.y);

      vec2 gp = (uv - uGlowPos) * vec2(uAspect, 1.0);
      float glow = exp(-dot(gp, gp) * uGlowRad) * uGlowAmt;
      col += uGlow * glow;

      col += uGlow * uFloor * (1.0 - smoothstep(0.0, 0.5, uv.y)) * 0.55;

      if (uClouds > 0.001){
        vec2 cp = uv * vec2(uAspect, 1.0) * 1.35 + vec2(0.022, 0.011) * uTime;
        float c1 = fbm(cp);
        float c2 = fbm(cp * 1.8);
        float cloud = smoothstep(0.42, 0.86, mix(c1, c2, 0.32));
        col = mix(col, vec3(1.0, 0.902, 0.855), cloud * 0.5 * uClouds);
