    rz: lerp(rzStart, .025, turn)
  };

  /* manifesto pose */
  const manH = Math.min(lerp(.5, .7, k) * VH, .36 * W * 2.43 / 1.05);
  const manPose = {
    x: 0, y: lerp(-.16, -.1, k) * VH, z: 0, h: manH, rx: 0,
    ry: Math.PI * 2 + Math.PI * 2 * easeInOutCubic(m), rz: 0
  };

  const lineupPose = (u) => ({
    x: slotX(u),
    y: lineupFloor + lineupH / 2,
    z: 1.4 - 1.55 * u,
    h: lineupH,
    rx: 0,
    ry: -.38 + Math.sin(.8 * u + 2.5 * l) * .12,
    rz: 0
  });

  for (let i = 0; i < COUNT; i++) {
    const bt = bottles[i];
    const d = i - car;
    const sd = Math.abs(d);
    const ad = Math.min(sd, 6);

    let p = pose();
    p.x = Math.sign(d) * (Math.min(sd, 1) * s1 + Math.max(0, sd - 1) * s2) * W;
    p.h = hc * (1 - .3 * Math.min(sd, 1) - .035 * Math.max(0, sd - 1));
    p.y = heroBot + .05 * VH * Math.min(sd, 1) + p.h / 2;
    p.z = -ad * .32;
    p.ry = -d * .2;
    p.rz = TILT[i] * smoothstep(0, 1, sd);

    if (!REDUCE) {
      p.y += Math.sin(1.1 * t + 1.7 * i) * .035;
      p.rz += Math.sin(.8 * t + 2.3 * i) * .025;
      p.ry += Math.sin(.5 * t + i) * .06;
    }

    if (introT < 1) {
      if (i === cIdx) {
        const e = easeOutCubic(clamp((introT - .06 * sd) / .62, 0, 1));
        p.y -= (1 - e) * .75 * VH;
      } else {
        const e = eraIntro(i, d);
        const sgn = Math.sign(d) || 1;
        p.x += sgn * .85 * W * (1 - e);
        p.rz += sgn * .5 * (1 - e);
      }
    }

    if (i === cIdx) {
      if (a > 0) p = mixPose(p, storyPos, a);
      if (b > 0) p = mixPose(p, manPose, b);
      if (c > 0) {
        const lp = lineupPose(slots[i] - easeInOutCubic(l) * 2);
        lp.ry += Math.PI * 4;
        p = mixPose(p, lp, c);
      }
      if (hovered === i && a < .2) p.y += .09 * (1 - a);
    } else {
      if (a > 0) {
        const sgn = Math.sign(d) || 1;
        const h0 = p.h;
        p.h = h0 * (1 - .25 * a);
        p.y = p.y - (h0 - p.h) / 2 + sgn * 0;
        p.x += sgn * .9 * W * a;
      }
      if (c > 0) {
        const stag = (slots[i] % 5) / 5 * .15;
        const tc = easeInOutCubic(clamp((c - stag) / (1 - .15), 0, 1));
        const u = slots[i] - easeInOutCubic(l) * 2;
        const lp = lineupPose(u);
        const sgn = (slots[i] % 2) ? 1 : -1;
        lp.x += sgn * 1.25 * W * (1 - tc);
        lp.y += .05 * VH * (1 - tc);
        lp.rz += sgn * 1.2 * (1 - tc);
        p = mixPose(p, lp, c);
      }
    }

    bt.group.position.set(p.x, p.y, p.z);
    bt.group.scale.setScalar(p.h / BH);
    bt.group.rotation.set(p.rx, p.ry, p.rz);

    const heroL = 1 - .48 * smoothstep(0, 1.2, sd);
    let lit = lerp(heroL, 1, clamp(a, 0, 1));
    if (hovered === i && a < .2) lit = 1;
    bt.liquidMat.color.copy(bt.flavour.liquidC).multiplyScalar(.42 + .58 * lit);
    bt.liquidMat.emissive.copy(bt.flavour.liquidC);
    bt.liquidMat.emissiveIntensity = .08 + .34 * lit;
    const lab = .48 + .52 * lit;
    bt.frontMat.color.setScalar(lab);
    bt.backMat.color.setScalar(lab);

    if (i !== cIdx) {
      bt.backMat.userData.u.uP.value = [0, 0, 0];
      bt.backMat.userData.u.uD.value = [0, 0, 0];
      bt.backMat.userData.u.uStreakI.value = 0;
    }
  }

  /* story row glow + shader uniforms on centre bottle */
  const cb = bottles[cIdx];
  const storyStrength = clamp(a, 0, 1) * (1 - clamp(b, 0, 1));
  glowY += (rowLocal - glowY) * damp(dt, 8);
  cb.glow.position.y = glowY;
  cb.glow.material.opacity = (.2 + .05 * Math.sin(2.2 * t)) * storyStrength;
  cb.glow.visible = storyStrength > .01;

  const u = cb.backMat.userData.u;
  u.uP.value = rowP.map(v => easeInOutCubic(v));
  u.uD.value = rowD.slice();
  if (streakStart > 0) {
    const st = (performance.now() - streakStart) / 950;
    if (st < 1) {
      u.uStreakPos.value = lerp(-.15, 1.15, easeOutCubic(st));
      u.uStreakI.value = Math.sin(Math.PI * st) * .6;
    } else {
      u.uStreakI.value = 0;
    }
  }

  /* disc */
  const frac = hc / VH;
  discGroup.scale.set(frac * 1.25, frac * 1.2, frac * 1.25);
  const discBottom = (i => {
    const bp = bottles[cIdx].group.position;
    return bp.y - (bottles[cIdx].group.scale.y * BH) / 2;
  })();
  discGroup.position.set(cb.group.position.x, discBottom - .02 - a * .45 * VH, cb.group.position.z);
  discGroup.visible = a < .98;
}

function eraIntro(i, d) {
  return easeOutBack(clamp((introT - .06 * Math.abs(d)) / .62, 0, 1));
}

/* ------------------------------------------------------------------- boot */
function loadSheet() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    setTimeout(() => finish(null), 10000);
    img.src = SHEET;
  });
}

function buildTextures(fronts) {
  for (let i = 0; i < 8; i++) {
    const t = new THREE.CanvasTexture(fronts[i]);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    frontTex.push(t);
    const bt = new THREE.CanvasTexture(makeBackCanvas(i));
    bt.colorSpace = THREE.SRGBColorSpace;
    bt.anisotropy = 4;
    backTex.push(bt);
  }
}

let last = performance.now();
let firstFrame = true;
let prCur = Math.min(devicePixelRatio || 1, 1.5);
let prTarget = prCur;
let avgMs = 16;
let lastDrop = -1e9;
let raiseAcc = 0;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(prCur);
  renderer.setSize(w, h, false);
  aspect = w / h;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  W = VH * aspect;
  k = smoothstep(.72, 1.25, aspect);
  bgUniforms.uAspect.value = aspect;
  const portrait = aspect < 1;
  bgUniforms.uTxtY.value = portrait ? .47 : .5;
  bgUniforms.uTxtW.value = portrait ? 1.02 : .92;
}

function updateScroll(dt) {
  const maxY = (document.documentElement.scrollHeight - innerHeight) / innerHeight;
  const target = clamp(window.scrollY / innerHeight, 0, maxY + .001);
  const w = REDUCE ? 40 : 5.6;
  const steps = Math.max(1, Math.ceil(dt * 240));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const acc = w * w * (target - Y) - 2 * w * Yv;
    Yv += acc * h;
    Y += Yv * h;
  }
  if (Math.abs(target - Y) < 1e-5 && Math.abs(Yv) < 1e-5) { Y = target; Yv = 0; }

  a = easeInOutCubic(clamp(Y / .75, 0, 1));
  s = clamp((Y - .75) / (3.3 - .75), 0, 1);
  b = easeInOutCubic(clamp((Y - 3.3) / .65, 0, 1));
  m = clamp((Y - 3.95) / 1.05, 0, 1);
  c = easeInOutCubic(clamp((Y - 5.0) / .7, 0, 1));
  l = easeInOutCubic(clamp((Y - 5.7) / 1.35, 0, 1));
}

function updateStoryState(dt) {
  const idx = Math.min(2, Math.floor(s * 3 + 1e-6));
  if (s > .11 && idx !== activeRow) {
    activeRow = idx;
    streakStart = performance.now();
    for (let r = 0; r < 3; r++) if (r !== idx) rowP[r] = Math.min(rowP[r], .999);
    rowP[idx] = 0;
    rowD[idx] = 1;
  }
  for (let r = 0; r < 3; r++) {
    if (r === activeRow) {
      rowP[r] = Math.min(1, rowP[r] + (1 / .6) * dt);
      rowD[r] += (0 - rowD[r]) * damp(dt, 7);
    } else {
      rowP[r] = Math.max(0, rowP[r] - (1 / .6) * 1.4 * dt);
      rowD[r] += (1 - rowD[r]) * damp(dt, 7);
    }
  }
}

function updateBackdrop(t) {
  const pal = currentPalette();
  bgUniforms.uTop.value.copy(pal.top);
  bgUniforms.uBot.value.copy(pal.bot);
  bgUniforms.uGlow.value.copy(pal.glow);
  bgUniforms.uGlowPos.value.set(pal.px, pal.py);
  bgUniforms.uGlowAmt.value = pal.amt;
  bgUniforms.uGlowRad.value = pal.rad;
  bgUniforms.uClouds.value = pal.clouds;
  bgUniforms.uFloor.value = pal.floor;
  bgUniforms.uTime.value = t;
  bgUniforms.uManifest.value = clamp(b, 0, 1) * (1 - clamp(c, 0, 1));
  bgUniforms.uSharp.value = .62 * easeOutCubic(m);
  bgUniforms.uTxtX.value = (m - .5) * .03;
}

function updateUI(dt, t) {
  const cIdx = clamp(Math.round(car), 0, 15);
  const rounded = cIdx;
  if (rounded !== lastRounded) {
    const dir = lastRounded < 0 ? 1 : Math.sign(rounded - lastRounded) || 1;
    setFlavour(rounded % 8, dir);
    lastRounded = rounded;
  }

  heroSection.style.opacity = String(1 - smoothstep(.02, .35, Y));
  const stOp = smoothstep(.5, .8, Y) * (1 - smoothstep(3.3, 3.55, Y));
  storySection.style.opacity = String(stOp);
  storySection.style.visibility = stOp < .01 ? 'hidden' : 'visible';

  if (stOp > .05) setCopy(Math.min(2, Math.floor(s * 3 + 1e-6)));

  const fl = F[cIdx % 8];
  curCap.lerp(fl.capC, damp(dt, 4));
  curStrip.lerp(fl.capC, damp(dt, 4));
  const hex = '#' + curStrip.getHexString();
  document.documentElement.style.setProperty('--sc', hex);
  document.documentElement.style.setProperty('--sg', hex);
  discRingMat.color.copy(curCap).lerp(WHITE, .25).multiplyScalar(1.5);
  discGlowMat.color.copy(curCap).lerp(WHITE, .35);
}

let lastRounded = -1;

function frame(now) {
  const dtMs = Math.min(now - last, 50);
  last = now;
  const dt = Math.max(dtMs / 1000, 1 / 240);
  const t = now / 1000;

  avgMs = avgMs * .9 + dtMs * .1;
  if (avgMs > 19.5 && prCur > .7 && now - lastDrop > 400) {
    prCur = Math.max(.7, prCur - .15);
    lastDrop = now;
    raiseAcc = 0;
    resize();
  } else if (avgMs < 17.3) {
    raiseAcc += dt;
    if (raiseAcc > 1.2 && prCur < prTarget && now - lastDrop > 8000) {
      prCur = Math.min(prTarget, prCur + .05);
      raiseAcc = 0;
      resize();
    }
  }

  if (introStart > 0) introT = REDUCE ? 1 : clamp((now - introStart) / 1900, 0, 1);
  if (introT > .7) document.body.classList.add('intro-ui');

  updateScroll(dt);
  updateStoryState(dt);
  applyLayout(t, dt);
  updateBackdrop(t);
  updateUI(dt, t);

  renderer.clear();
  renderer.render(bgScene, bgCam);
  renderer.clearDepth();
  renderer.render(scene, camera);

  requestAnimationFrame(frame);
}

/* -------------------------------------------------------------- interaction */
const stepPx = () => lerp(.36, .15, k) * innerWidth;
let pointerDown = false, downX = 0, downY = 0, lastPX = 0, dragStartCar = 0;
let moved = 0, lastMoveT = 0, vel = 0, wheelTimer = 0, wheelPending = false;

canvas.addEventListener('pointerdown', (e) => {
  pointerDown = true;
  downX = lastPX = e.clientX;
  downY = e.clientY;
  dragStartCar = car;
  moved = 0;
  vel = 0;
  lastMoveT = performance.now();
  document.body.classList.add('dragging');
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});

canvas.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!pointerDown) return;
  const now = performance.now();
  const dx = e.clientX - lastPX;
  const dts = Math.max((now - lastMoveT) / 1000, 1 / 240);
  lastPX = e.clientX;
  lastMoveT = now;
  moved += Math.abs(e.clientX - downX);
  const step = Math.max(stepPx(), 40);
  vel = clamp(lerp(vel, -(dx / step) / dts, .35), -14, 14);
  car = dragStartCar - (e.clientX - downX) / step;
  carTarget = car;
});

function endDrag(e) {
  if (!pointerDown) return;
  pointerDown = false;
  document.body.classList.remove('dragging');
  const now = performance.now();
  const rested = now - lastMoveT > 90;
  if (rested) vel = 0;
  if (moved < 6) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(bottles.map(o => o.glass), false);
    if (hits.length) {
      const idx = hits[0].object.userData.index;
      if (idx !== Math.round(car)) carTarget = idx;
    } else {
      carTarget = Math.round(car);
    }
  } else {
    carTarget = Math.round(car + vel * .22);
  }
  vel = 0;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
window.addEventListener('blur', endDrag);

window.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Y < .75) {
    carTarget += e.deltaX / 220;
    wheelPending = true;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      carTarget = Math.round(car);
      wheelPending = false;
    }, 130);
  }
}, { passive: true });

const nudge = (dir) => { carTarget = Math.round(car) + dir; };
document.getElementById('prevBtn').addEventListener('click', () => nudge(-1));
document.getElementById('nextBtn').addEventListener('click', () => nudge(1));
document.getElementById('shopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 6.4 * innerHeight, behavior: REDUCE ? 'auto' : 'smooth' });
});
document.querySelector('.menu-btn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
});

iconEls.forEach((el, i) => {
  el.addEventListener('click', () => {
    const target = i === 3 ? 6.2 : .75 + ((i + .5) / 3) * (3.3 - .75);
    window.scrollTo({ top: target * innerHeight, behavior: REDUCE ? 'auto' : 'smooth' });
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { nudge(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { nudge(-1); e.preventDefault(); }
});

let hoverRaf = 0;
canvas.addEventListener('pointermove', (e) => {
  if (pointerDown) return;
  if (hoverRaf) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = 0;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(bottles.map(o => o.glass), false);
    const idx = hits.length ? hits[0].object.userData.index : -1;
    hovered = (idx >= 0 && Math.abs(idx - car) > .4) ? idx : (idx >= 0 ? idx : -1);
    canvas.style.cursor = pointerDown ? 'grabbing' : (hits.length ? 'pointer' : 'grab');
  });
});

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

/* --------------------------------------------------------------------- boot */
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('italic 900 40px "Barlow Condensed"'),
      document.fonts.load('italic 800 40px "Barlow Condensed"'),
      document.fonts.load('400 20px "Manrope"'),
      document.fonts.load('500 20px "Manrope"'),
      document.fonts.load('600 20px "Manrope"'),
      document.fonts.load('700 20px "Manrope"'),
      document.fonts.load('800 20px "Manrope"')
    ]);
  } catch (err) {}

  const img = await loadSheet();
  const fronts = makeFrontCanvases(img);
  buildTextures(fronts);

  for (let i = 0; i < COUNT; i++) {
    const bt = createBottle(i);
    bottles.push(bt);
    scene.add(bt.group);
  }

  const sharp = manifestoTexture(5);
  const soft = manifestoTexture(26);
  sharp.colorSpace = THREE.NoColorSpace;
  soft.colorSpace = THREE.NoColorSpace;
  bgUniforms.tSharp.value = sharp;
  bgUniforms.tSoft.value = soft;

  resize();
  Y = window.scrollY / innerHeight;
  Yv = 0;

  setFlavour(0, 1);
  setCopy(0);

  renderer.compile(bgScene, bgCam);
  renderer.compile(scene, camera);

  document.body.classList.add('ready');
  introStart = performance.now();
  last = performance.now();
  requestAnimationFrame(frame);
}

boot();
