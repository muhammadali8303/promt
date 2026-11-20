      }

      if (uManifest > 0.001){
        vec2 halfBox = vec2(uTxtW * 0.5, uTxtW * uAspect * 0.25);
        vec2 tuv = (uv - vec2(0.5, uTxtY)) / (2.0 * halfBox) + 0.5;
        float inside = step(0.0, tuv.x) * step(tuv.x, 1.0) * step(0.0, tuv.y) * step(tuv.y, 1.0);
        float sa = texture2D(tSharp, tuv).a;
        float sb = texture2D(tSoft, tuv).a;
        float val = mix(sb, sa, uSharp) * inside;
        float grain = 0.82 + 0.36 * hash(floor(uv * vec2(1024.0, 512.0)) + floor(uTime * 12.0));
        col = mix(col, uTint, clamp(val * uManifest * 0.78 * grain, 0.0, 1.0));
      }

      float g = (hash(uv * vec2(1920.0, 1080.0)) - 0.5) * 0.045;
      col += g;
      gl_FragColor = vec4(col, 1.0);
    }
  `
});
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

/* --------------------------------------------------------- manifesto type */
function manifestoTexture(blurPx) {
  const Wc = 2048, Hc = 1024;
  const c = canvasOf(Wc, Hc);
  const g = c.getContext('2d');
  g.clearRect(0, 0, Wc, Hc);
  g.filter = blurPx ? `blur(${blurPx}px)` : 'none';
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const fit = (txt, y) => {
    let size = 700;
    g.font = `italic 900 ${size}px "Barlow Condensed", Impact, sans-serif`;
    const w = g.measureText(txt).width;
    size = size * (1700 / w);
    g.font = `italic 900 ${size}px "Barlow Condensed", Impact, sans-serif`;
    g.fillText(txt, Wc / 2, y);
  };
  fit('REAL FRUIT', 340);
  fit('REAL FIZZ', 720);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------ bottle build */
const frontTex = [], backTex = [];
const bottles = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-9, -9);

function glowTexture() {
  const c = canvasOf(512, 256);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.save();
  g.translate(256, 128);
  g.scale(1, .5);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,255,255,.85)');
  grd.addColorStop(.45, 'rgba(255,255,255,.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(-256, -256, 512, 512);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const rowGlowTex = glowTexture();

function createBottle(i) {
  const f = F[i % 8];
  const group = new THREE.Group();
  const glass = new THREE.Mesh(geoGlass, glassMat);
  glass.position.y = -BH / 2;
  glass.userData.index = i;
  group.add(glass);

  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: f.liquidC.clone(), roughness: .22, metalness: 0,
    emissive: f.liquidC.clone(), emissiveIntensity: 1,
    clearcoat: .7, clearcoatRoughness: .2, envMapIntensity: 1.1
  });
  const liquid = new THREE.Mesh(geoLiquid, liquidMat);
  liquid.position.y = -BH / 2;
  group.add(liquid);

  const capMat = new THREE.MeshStandardMaterial({ color: f.capC.clone(), metalness: .55, roughness: .32, envMapIntensity: 1.2 });
  const cap = new THREE.Mesh(geoCap, capMat);
  cap.position.y = -BH / 2;
  group.add(cap);

  const frontMat = new THREE.MeshPhysicalMaterial({
    map: frontTex[i % 8], transparent: true, alphaTest: .5,
    roughness: .55, metalness: 0, clearcoat: .25, side: THREE.DoubleSide
  });
  const front = new THREE.Mesh(geoLabelFront, frontMat);
  front.position.y = .6 + .47 - BH / 2;
  group.add(front);

  const backMat = new THREE.MeshPhysicalMaterial({
    map: backTex[i % 8], transparent: true, alphaTest: .5,
    roughness: .55, metalness: 0, clearcoat: .25, side: THREE.DoubleSide
  });
  backMat.userData.u = {
    uP: { value: [0, 0, 0] },
    uD: { value: [0, 0, 0] },
    uStreakPos: { value: -1 },
    uStreakI: { value: 0 }
  };
  backMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, backMat.userData.u);
    shader.vertexShader = 'varying vec2 vLabelUv;\n' + shader.vertexShader.replace(
      'void main() {', 'void main() {\n  vLabelUv = uv;'
    );
    shader.fragmentShader = `
      varying vec2 vLabelUv;
      uniform float uP[3];
      uniform float uD[3];
      uniform float uStreakPos;
      uniform float uStreakI;
      float bandMask(float v, float lo, float hi){
        return smoothstep(lo - .008, lo + .008, v) * (1.0 - smoothstep(hi - .008, hi + .008, v));
      }
      vec3 rowTint(vec3 base, float p, float d, float u){
        float lum = dot(base, vec3(.299, .587, .114));
        float paper = smoothstep(.72, .90, lum);
        float ink = 1.0 - paper;
        vec3 dim = mix(base, vec3(1.0, .953, .925), d * .66);
        float edge = mix(.12, .90, p);
        float sweep = 1.0 - smoothstep(edge - .03, edge + .03, u);
        float feather = smoothstep(.12, .30, u) * (1.0 - smoothstep(.72, .90, u));
        float m = clamp(sweep * feather, 0.0, 1.0);
        vec3 act = mix(dim, vec3(1.0), paper * .85 * m);
        act = mix(act, act * (1.0 - m * .25), ink);
        float streak = uStreakI * exp(-pow((u - uStreakPos) / .16, 2.0)) * (1.0 - d);
        act = mix(act, vec3(1.0), clamp(streak, 0.0, 1.0) * paper * .6);
        return act;
      }
    ` + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 base = diffuseColor.rgb;
        vec3 acc = base;
        acc = mix(acc, rowTint(base, uP[0], uD[0], vLabelUv.x), bandMask(vLabelUv.y, .65, .85));
        acc = mix(acc, rowTint(base, uP[1], uD[1], vLabelUv.x), bandMask(vLabelUv.y, .4357, .6357));
        acc = mix(acc, rowTint(base, uP[2], uD[2], vLabelUv.x), bandMask(vLabelUv.y, .2214, .4214));
        diffuseColor.rgb = acc;
      }`);
  };
  const back = new THREE.Mesh(geoLabelBack, backMat);
  back.position.y = .62 - BH / 2;
  group.add(back);

  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(.544, .544, .3, 48, 1, true, Math.PI - 1.05, 2.1),
    new THREE.MeshBasicMaterial({
      map: rowGlowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, color: 0xffffff
    })
  );
  glow.position.y = ROW_LOCAL_Y[0];
  group.add(glow);

  return { group, glass, liquid, liquidMat, capMat, frontMat, backMat, glow, flavour: f, index: i };
}

const ROW_LOCAL_Y = [175, 325, 475].map(cy => (.18 + (1 - cy / 700) * .88) - BH / 2);

/* hero disc */
const discGroup = new THREE.Group();
const discBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1, .05, 72),
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, metalness: 0, transparent: true, opacity: .22, depthWrite: false })
);
discGroup.add(discBody);
const discRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
const discRing = new THREE.Mesh(new THREE.TorusGeometry(1, .007, 8, 160), discRingMat);
discRing.rotation.x = -Math.PI / 2;
discGroup.add(discRing);
const discGlowMat = new THREE.MeshBasicMaterial({ map: rowGlowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff, opacity: .8 });
const discGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.1), discGlowMat);
discGlow.rotation.x = -Math.PI / 2;
discGlow.position.y = .03;
discGroup.add(discGlow);
scene.add(discGroup);

/* ------------------------------------------------------------------ scroll */
let Y = 0, Yv = 0;
let a = 0, s = 0, b = 0, m = 0, c = 0, l = 0;
let car = 0, carTarget = 0;
let introT = 0, introStart = -1, ready = false;
let rowP = [0, 0, 0], rowD = [1, 1, 1], activeRow = -1, streakStart = -1, streakOn = false;
let shownCopy = -1;
let glowY = ROW_LOCAL_Y[0];
const curCap = new THREE.Color('#E25B45');
const curStrip = new THREE.Color('#E25B45');

/* --------------------------------------------------------------- copy deck */
const STEPS = [
  { tag: '01 — Fruit', title: 'REAL FRUIT', body: 'Made with real fruit juice and a splash of sparkling water. Bright, refreshing and naturally delicious.' },
  { tag: '02 — Bubbles', title: 'LIGHT FIZZ', body: 'Fine bubbles, never harsh. A soft sparkle that lifts the fruit instead of hiding it under gas.' },
  { tag: '03 — Sugar', title: 'NO SUGAR ADDED', body: 'Sweetened only by ripe fruit, with 40% less sugar than classic soda and nothing artificial inside.' }
];
const tagTxt = document.getElementById('tagTxt');
const titleTxt = document.getElementById('titleTxt');
const bodyTxt = document.getElementById('bodyTxt');
const bars = document.getElementById('bars');
const storySection = document.getElementById('story');
const heroSection = document.getElementById('hero');
const stripEl = document.getElementById('strip');
const iconEls = [...document.querySelectorAll('.icon')];
let copyTimers = [];
let scrambleRaf = 0;

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function scramble(el, text) {
  cancelAnimationFrame(scrambleRaf);
  const start = performance.now();
  const dur = 520;
  const step = (now) => {
    const t = clamp((now - start) / dur, 0, 1);
    const resolved = Math.floor(t * text.length);
    let out = '';
    for (let i = 0; i < text.length; i++) {
      if (i < resolved || text[i] === ' ') out += text[i];
      else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    el.textContent = out;
    if (t < 1) scrambleRaf = requestAnimationFrame(step);
    else el.textContent = text;
  };
  scrambleRaf = requestAnimationFrame(step);
}

function setCopy(idx) {
  if (idx === shownCopy) return;
  shownCopy = idx;
  copyTimers.forEach(clearTimeout);
  copyTimers = [];
  const st = STEPS[idx];
  iconEls.forEach((el, i) => el.classList.toggle('active', i === idx));
  tagTxt.textContent = st.tag;
  bodyTxt.textContent = st.body;
  tagTxt.classList.add('fadeout');
  bodyTxt.classList.add('fadeout');
  bars.classList.add('show');
  titleTxt.style.opacity = '0';
  copyTimers.push(setTimeout(() => {
    tagTxt.classList.remove('fadeout');
    bars.classList.remove('show');
    titleTxt.style.opacity = '1';
    scramble(titleTxt, st.title);
    copyTimers.push(setTimeout(() => bodyTxt.classList.remove('fadeout'), 160));
  }, 230));
}

/* ------------------------------------------------------------- hero title */
const heroTitle = document.getElementById('heroTitle');
let shownFlavour = -1;
function setFlavour(n, dir) {
  if (n === shownFlavour) return;
  const first = shownFlavour === -1;
  shownFlavour = n;
  const el = document.createElement('span');
  el.className = 'tline';
  el.textContent = F[n].name;
  heroTitle.appendChild(el);
  if (first) {
    el.style.transition = 'none';
    el.style.transform = 'translateY(0)';
    return;
  }
  el.style.transition = 'none';
  el.style.transform = `translateY(${dir > 0 ? 105 : -105}%)`;
  el.style.opacity = '0';
  void el.offsetWidth;
  el.style.transition = '';
  const old = [...heroTitle.children].filter(o => o !== el);
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
    old.forEach(o => {
      o.style.transform = `translateY(${dir > 0 ? -105 : 105}%)`;
      o.style.opacity = '0';
    });
  });
  setTimeout(() => old.forEach(o => o.remove()), 720);
}

/* --------------------------------------------------------------- palettes */
const C = (h) => new THREE.Color(h);
const PAL = {
  hero:      { top: C('#EE9F84'), bot: C('#F7BBA2'), glow: C('#FFD8C4'), px: .5, py: .2, amt: .42, rad: 2.4, clouds: 0, floor: 0 },
  story:     { top: C('#F6B8A0'), bot: C('#F09C7F'), glow: C('#FFE6D8'), px: .36, py: .5, amt: .5, rad: 1.6, clouds: 0, floor: 0 },
  manifesto: { top: C('#F29A87'), bot: C('#E7806E'), glow: C('#FFD2C2'), px: .5, py: .42, amt: .45, rad: 1.8, clouds: 1, floor: 0 },
  lineup:    { top: C('#3E150E'), bot: C('#250A06'), glow: C('#7A2E1A'), px: .3, py: .05, amt: 0, rad: 2, clouds: 0, floor: 1 }
};
const WHITE = C('#ffffff');
bgUniforms.uTxtX = { value: 0 };
bgMat.fragmentShader = bgMat.fragmentShader
  .replace('varying vec2 vUv;', 'varying vec2 vUv;\nuniform float uTxtX;')
  .replace('vec2(0.5, uTxtY)', 'vec2(0.5 + uTxtX, uTxtY)');

function mixPal(out, p1, p2, t) {
  out.top.copy(p1.top).lerp(p2.top, t);
  out.bot.copy(p1.bot).lerp(p2.bot, t);
  out.glow.copy(p1.glow).lerp(p2.glow, t);
  out.amt = lerp(p1.amt, p2.amt, t);
  out.rad = lerp(p1.rad, p2.rad, t);
  out.clouds = lerp(p1.clouds, p2.clouds, t);
  out.floor = lerp(p1.floor, p2.floor, t);
  out.px = lerp(p1.px, p2.px, t);
  out.py = lerp(p1.py, p2.py, t);
  return out;
}
const PAL_TMP = { top: C('#000'), bot: C('#000'), glow: C('#000'), amt: 0, rad: 0, clouds: 0, floor: 0, px: 0, py: 0 };
const PAL_A = { top: C('#000'), bot: C('#000'), glow: C('#000'), amt: 0, rad: 0, clouds: 0, floor: 0, px: 0, py: 0 };

function currentPalette() {
  mixPal(PAL_A, PAL.hero, PAL.story, a);
  mixPal(PAL_TMP, PAL_A, PAL.manifesto, b);
  mixPal(PAL_A, PAL_TMP, PAL.lineup, c);
  return PAL_A;
}

/* ------------------------------------------------------------ pose helpers */
function mixPose(p1, p2, t) {
  return {
    x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t), z: lerp(p1.z, p2.z, t),
    h: lerp(p1.h, p2.h, t), rx: lerp(p1.rx, p2.rx, t),
    ry: lerp(p1.ry, p2.ry, t), rz: lerp(p1.rz, p2.rz, t)
  };
}
const pose = () => ({ x: 0, y: 0, z: 0, h: 1, rx: 0, ry: 0, rz: 0 });

let hovered = -1;

function applyLayout(t, dt) {
  const cIdx = clamp(Math.round(car), 0, 15);
  const hc = Math.min(lerp(.38, .5, k) * VH, lerp(.36, .2, k) * W * BH / 1.056);
  const s1 = lerp(.36, .15, k);
  const s2 = lerp(.25, .104, k);
  const heroBot = lerp(-.3, -.35, k) * VH;
  const floorS = Math.sin(3 * s + 1e-6);
  const rowFloat = Math.min(2, Math.floor(s * 3 + 1e-6) + smoothstep(.6, 1, s * 3 - Math.floor(s * 3 + 1e-6)));

  /* slots for lineup */
  const slots = new Array(COUNT);
  let sc = 1;
  for (let i = 0; i < COUNT; i++) slots[i] = (i === cIdx) ? 0 : sc++;
  const slotX = (u) => lerp(-.3 * W * .86, .48 * W * 3.19, u / 15) + Math.min(0, u) * .35 * W;
  const lineupFloor = (-.43 * VH) * .86;
  const lineupH = lerp(.42, .6, k) * VH;

  /* story pose */
  const hStart = lerp(.9, 1.08, k) * VH;
  const xStart = lerp(0, -.17, k) * W;
  const topStart = lerp(.15, .44, k) * VH;
  const rzStart = lerp(.12, .3, k);
  const cdH = Math.min(hStart * lerp(1.25, 1.22, k), lerp(.78, .36, k) * W / 1.04);
  const cdX = lerp(0, -.165, k) * W;
  const rowTargetY = lerp(-.19, 0, k) * VH;
  const rowLocal = lerp(ROW_LOCAL_Y[Math.min(1, Math.floor(rowFloat))], ROW_LOCAL_Y[Math.min(2, Math.floor(rowFloat) + 1)], rowFloat - Math.floor(rowFloat));
  const turn = easeInOutCubic(clamp(s / .12, 0, 1));
  const storyPos = {
    x: lerp(xStart, cdX, turn),
    y: lerp(topStart - hStart / 2, rowTargetY - rowLocal * (cdH / BH), turn),
    z: 0,
    h: lerp(hStart, cdH, turn),
    rx: 0,
    ry: Math.PI * turn + (rowFloat - 1) * .14 + (REDUCE ? 0 : Math.sin(.7 * t) * .025),
