import { MOTIONS, GROUPS, VIEWS, ACC } from './data.js';
import { cameraFigure, axisFigure } from './figures.js';

const MP_VER = '1.1.0';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const $ = sel => document.querySelector(sel);
const deg = r => r * 180 / Math.PI;

const S = {
  motion: null, side: 'R', finger: 1, facing: 'environment',
  stream: null, frozen: null, frameW: 0, frameH: 0, mirror: false,
  mode: 'idle', // idle | live | frozen
  pts: {}, low: {}, offset: null, offsetLabel: '',
  gravity: { x: 0, y: 1, ok: false, flat: false, tilt: 0 },
  photo: false, freezeReq: false, timer: null, autoStill: false, autoSince: 0, hist: [],
  lastTs: 0, drag: null, wakeLock: null, lastAngle: null,
};
let pose = null, hand = null, mpLoading = null, mpError = null;

// ───────── 画面遷移 ─────────
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}

function renderHome(group = GROUPS[0]) {
  const tabs = $('#tabs');
  tabs.innerHTML = GROUPS.map(g => `<button class="tab ${g === group ? 'on' : ''}" data-g="${g}">${g}</button>`).join('');
  tabs.onclick = e => { const b = e.target.closest('.tab'); if (b) renderHome(b.dataset.g); };
  const list = MOTIONS.filter(m => m.group === group);
  const joints = [...new Set(list.map(m => m.joint))];
  $('#motionList').innerHTML = joints.map(j => `
    <section class="joint">
      <h3>${j}</h3>
      <div class="chips">
        ${list.filter(m => m.joint === j).map(m => `
          <button class="chip" data-id="${m.id}">
            <span class="chip-name">${m.name}</span>
            <span class="chip-ref">${m.ref === '—' ? '参考値なし' : m.ref + (m.ref.match(/\d$/) ? '°' : '')}</span>
            <span class="acc ${ACC[m.acc].cls}" title="${ACC[m.acc].label}">${ACC[m.acc].mark}</span>
          </button>`).join('')}
      </div>
    </section>`).join('');
  $('#motionList').onclick = e => {
    const b = e.target.closest('.chip');
    if (b) openSetup(MOTIONS.find(m => m.id === b.dataset.id));
  };
  try { localStorage.setItem('rom.group', group); } catch {}
}

function openSetup(m) {
  S.motion = m;
  S.offset = null;
  renderSetup();
  show('setup');
}

function renderSetup() {
  const m = S.motion;
  const acc = ACC[m.acc];
  const sideLabel = m.dirLR ? ['右', '左'] : ['右', '左'];
  const view = VIEWS[m.view];
  $('#setupBody').innerHTML = `
    <div class="setup-head">
      <div>
        <div class="crumb">${m.group} ＞ ${m.joint}</div>
        <h2>${m.joint}　${m.name}</h2>
        <div class="refline">参考可動域 <b>${m.ref === '—' ? '記載なし' : m.ref + (m.ref.match(/\d$/) ? '°' : '')}</b>
          <span class="acc ${acc.cls}">${acc.mark} ${acc.label}</span></div>
      </div>
    </div>
    ${m.acc === 'C' ? `<div class="warn">⚠ この運動はカメラでは誤差が大きくなります（運動面にカメラを正対させにくい・指標点が写りにくい）。<b>参考値</b>として扱い、必ずゴニオメーターの値と比べてください。</div>` : ''}
    <div class="opts">
      <div class="opt"><span>${m.dirLR ? '運動方向' : '測定側'}</span>
        <div class="seg" id="sideSeg">
          <button data-v="R" class="${S.side === 'R' ? 'on' : ''}">${sideLabel[0]}</button>
          <button data-v="L" class="${S.side === 'L' ? 'on' : ''}">${sideLabel[1]}</button>
        </div></div>
      ${m.finger ? `<div class="opt"><span>指</span>
        <div class="seg" id="fingerSeg">
          ${['示指', '中指', '環指', '小指'].map((n, i) => `<button data-v="${i + 1}" class="${S.finger === i + 1 ? 'on' : ''}">${n}</button>`).join('')}
        </div></div>` : ''}
      <div class="opt"><span>カメラ</span>
        <div class="seg" id="camSeg">
          <button data-v="environment" class="${S.facing === 'environment' ? 'on' : ''}">背面（相手を撮る）</button>
          <button data-v="user" class="${S.facing === 'user' ? 'on' : ''}">前面</button>
        </div></div>
    </div>
    <div class="cards">
      <div class="card">
        <h4>① 撮影方向：${view.name}</h4>
        ${cameraFigure(m.view, S.side, m)}
        <p>${view.text}</p>
        ${m.viewExtra ? `<p class="sub">${m.viewExtra}</p>` : ''}
      </div>
      <div class="card">
        <h4>② 基本軸と移動軸</h4>
        ${axisFigure(m)}
        <table class="axes">
          <tr><th class="b">基本軸</th><td>${m.base}</td></tr>
          <tr><th class="m">移動軸</th><td>${m.move}</td></tr>
          ${m.pos ? `<tr><th>測定肢位・注意点</th><td>${m.pos}</td></tr>` : ''}
        </table>
      </div>
      <div class="card">
        <h4>③ 画像上に置く点</h4>
        <ol class="ptlist">${m.pts.map(([id, label]) => `<li><span class="pt-badge ${roleOf(m, id)}">${id}</span>${label}</li>`).join('')}</ol>
        <p class="sub">${m.models.length ? 'AIが点を自動で置きます。ずれていたら指でドラッグして指標点に合わせてください。' : 'この運動はAIで推定できないため、点を指で置きます。'}</p>
        ${m.baseline ? `<p class="sub"><b>開始肢位→最終域の2回撮影：</b>まず開始肢位で止めて「開始肢位を0°にする」を押し、次に最終域で止めます。</p>` : ''}
        ${m.note ? `<p class="sub">📝 ${m.note}</p>` : ''}
      </div>
    </div>`;
  const bindSeg = (id, key, conv = v => v) => {
    const el = $(id); if (!el) return;
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; S[key] = conv(b.dataset.v); renderSetup(); };
  };
  bindSeg('#sideSeg', 'side');
  bindSeg('#fingerSeg', 'finger', Number);
  bindSeg('#camSeg', 'facing');
}

function roleOf(m, id) {
  const b = m.geo.base;
  const baseIds = (b.t === 'seg' || b.t === 'perp') ? [b.a, b.b] : [];
  const inBase = baseIds.includes(id), inMove = m.geo.move.includes(id);
  if (inBase && inMove) return 'both';
  if (inMove) return 'move';
  return 'base';
}

// ───────── AIモデル ─────────
async function loadModels() {
  if (mpLoading) return mpLoading;
  mpLoading = (async () => {
    const { FilesetResolver, PoseLandmarker, HandLandmarker } = await import(`${MP_URL}/vision_bundle.mjs`);
    const fileset = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
    const make = async (Cls, path, extra) => {
      for (const delegate of ['GPU', 'CPU']) {
        try {
          return await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: path, delegate }, runningMode: 'VIDEO', ...extra });
        } catch (e) { if (delegate === 'CPU') throw e; }
      }
    };
    pose = await make(PoseLandmarker, 'models/pose_landmarker_full.task', { numPoses: 1, minPoseDetectionConfidence: 0.4, minTrackingConfidence: 0.4 });
    hand = await make(HandLandmarker, 'models/hand_landmarker.task', { numHands: 2, minHandDetectionConfidence: 0.4 });
  })().catch(e => { mpError = e; console.error(e); });
  return mpLoading;
}

function detect(source) {
  const m = S.motion;
  const res = {};
  let ts = performance.now();
  if (ts <= S.lastTs) ts = S.lastTs + 1;
  S.lastTs = ts;
  try {
    if (pose && m.models.includes('pose')) res.pose = pose.detectForVideo(source, ts);
    if (hand && m.models.includes('hand')) res.hand = hand.detectForVideo(source, ts);
  } catch (e) { console.warn(e); }
  return res;
}

// ───────── ランドマーク → 指標点 ─────────
const IDX = { eye: [2, 5], ear: [7, 8], shoulder: [11, 12], elbow: [13, 14], wrist: [15, 16], pinky: [17, 18], index: [19, 20], thumb: [21, 22], hip: [23, 24], knee: [25, 26], ankle: [27, 28], heel: [29, 30], foot: [31, 32] };

function makeL(res, W, H) {
  const lm = res.pose?.landmarks?.[0];
  const pt = i => (lm && lm[i]) ? { x: lm[i].x * W, y: lm[i].y * H, v: lm[i].visibility ?? 1 } : null;
  const sideIdx = S.side === 'L' ? 0 : 1;
  const mid = (a, b) => (a && b) ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) } : null;
  const unit = (dx, dy) => { const n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };

  // 手：測定側の手首に近い手、なければ大きい手
  let hl = null;
  const hands = res.hand?.landmarks || [];
  if (hands.length) {
    const wr = pt(IDX.wrist[sideIdx]);
    const size = h => Math.hypot((h[0].x - h[9].x) * W, (h[0].y - h[9].y) * H);
    hl = hands.slice().sort((a, b) => wr
      ? Math.hypot(a[0].x * W - wr.x, a[0].y * H - wr.y) - Math.hypot(b[0].x * W - wr.x, b[0].y * H - wr.y)
      : size(b) - size(a))[0];
  }
  const h = i => hl ? { x: hl[i].x * W, y: hl[i].y * H, v: 1 } : null;
  const torsoUp = () => {
    const ms = mid(pt(11), pt(12)), mh = mid(pt(23), pt(24));
    if (ms && mh) return unit(ms.x - mh.x, ms.y - mh.y);
    return [-S.gravity.x, -S.gravity.y];
  };
  const L = {
    pose: pt,
    p: n => pt(IDX[n][sideIdx]),
    o: n => pt(IDX[n][1 - sideIdx]),
    L: n => pt(IDX[n][0]),
    R: n => pt(IDX[n][1]),
    h,
    f: k => h(({ 1: 5, 2: 9, 3: 13, 4: 17 })[S.finger] + k),
    mid,
    sternum() {
      const a = pt(11), b = pt(12); if (!a || !b) return null;
      const w = Math.hypot(a.x - b.x, a.y - b.y), [ux, uy] = torsoUp(), m = mid(a, b);
      return { x: m.x - ux * w * 0.12, y: m.y - uy * w * 0.12, v: m.v };
    },
    c7() {
      const a = pt(11), b = pt(12); if (!a || !b) return null;
      const w = Math.hypot(a.x - b.x, a.y - b.y), [ux, uy] = torsoUp(), m = mid(a, b);
      return { x: m.x + ux * w * 0.12, y: m.y + uy * w * 0.12, v: m.v };
    },
    jacoby() {
      const a = pt(23), b = pt(24); if (!a || !b) return null;
      const w = Math.hypot(a.x - b.x, a.y - b.y), [ux, uy] = torsoUp(), m = mid(a, b);
      return { x: m.x + ux * w * 0.55, y: m.y + uy * w * 0.55, v: m.v };
    },
    vertexSide() {
      const ear = L.p('ear'), eye = L.p('eye'); if (!ear || !eye) return null;
      const dx = ear.x - eye.x, dy = ear.y - eye.y, len = Math.hypot(dx, dy);
      let [px, py] = unit(-dy, dx);
      const [ux, uy] = torsoUp();
      if (px * ux + py * uy < 0) { px = -px; py = -py; }
      return { x: ear.x + px * len * 1.4 - dx * 0.3, y: ear.y + py * len * 1.4 - dy * 0.3, v: Math.min(ear.v, eye.v) * 0.8 };
    },
    vertexBack() {
      const a = pt(7), b = pt(8); if (!a || !b) return null;
      const m = mid(a, b), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      let [px, py] = unit(-dy, dx);
      const [ux, uy] = torsoUp();
      if (px * ux + py * uy < 0) { px = -px; py = -py; }
      return { x: m.x + px * len * 0.8, y: m.y + py * len * 0.8, v: m.v * 0.8 };
    },
  };
  return L;
}

const DEFAULT_TMPL = {
  2: [[0.5, 0.33], [0.5, 0.62]],
  3: [[0.32, 0.3], [0.5, 0.5], [0.72, 0.42]],
  4: [[0.3, 0.36], [0.7, 0.36], [0.38, 0.62], [0.66, 0.6]],
};

function autoPoints(res, W, H, keepExisting) {
  const m = S.motion;
  let got = {};
  if (m.auto && Object.keys(res).length) {
    try { got = m.auto(makeL(res, W, H)) || {}; } catch (e) { console.warn(e); }
  }
  const pts = {}, low = {};
  const tmpl = DEFAULT_TMPL[m.pts.length] || DEFAULT_TMPL[4];
  m.pts.forEach(([id], i) => {
    const g = got[id];
    if (g && isFinite(g.x) && isFinite(g.y)) {
      pts[id] = { x: g.x, y: g.y };
      if ((g.v ?? 1) < 0.5) low[id] = true;
    } else if (keepExisting && S.pts[id]) {
      pts[id] = S.pts[id];
    } else {
      pts[id] = { x: tmpl[i][0] * W, y: tmpl[i][1] * H, manual: true };
      low[id] = 'manual';
    }
  });
  return { pts, low, found: Object.keys(got).filter(k => got[k]).length };
}

// ───────── 角度計算 ─────────
function gravityRaw() {
  // 画像（ミラー前）座標での「下」方向
  const g = S.gravity;
  if (!g.ok || g.flat || S.photo) return { x: 0, y: 1, fallback: true };
  return { x: S.mirror ? -g.x : g.x, y: g.y, fallback: false };
}

function geometry(pts) {
  const m = S.motion, b = m.geo.base, [c, d] = m.geo.move;
  const P = id => pts[id];
  const g = gravityRaw();
  let bv, anchor, kind = 'ray';
  switch (b.t) {
    case 'seg': bv = sub(P(b.b), P(b.a)); anchor = P(b.b); kind = 'seg'; break;
    case 'vert': bv = b.dir === 'up' ? { x: -g.x, y: -g.y } : { x: g.x, y: g.y }; anchor = P(b.at); kind = 'line'; break;
    case 'horiz': bv = { x: g.y, y: -g.x }; anchor = P(b.at); kind = 'line'; break;
    case 'perp': { const s = sub(P(b.b), P(b.a)); bv = { x: -s.y, y: s.x }; anchor = P(b.at); kind = 'line'; break; }
    case 'screenH': bv = { x: 1, y: 0 }; anchor = P(b.at); kind = 'line'; break;
    case 'screenV': bv = b.dir === 'up' ? { x: 0, y: -1 } : { x: 0, y: 1 }; anchor = P(b.at); kind = 'line'; break;
  }
  const mv = sub(P(d), P(c));
  // 画面上での向き（ミラー時はx反転）に合わせた符号付き角
  const signed = deg(Math.atan2(cross(bv, mv), dot(bv, mv)));
  const s = S.offset != null ? wrap(signed - S.offset) : signed;
  let val = Math.abs(s);
  if (m.geo.mode === 'line' && val > 90) val = 180 - val;
  return { bv, mv, anchor, kind, signed, val, c: P(c), d: P(d), gFallback: g.fallback && ['vert', 'horiz'].includes(b.t) };
}
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const wrap = a => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const norm = v => { const n = Math.hypot(v.x, v.y) || 1; return { x: v.x / n, y: v.y / n }; };

// ───────── 傾きセンサー ─────────
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null) return;
  const ang = (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
  const vx = a.x, vy = -a.y;
  // 端末座標 → 画面座標
  let sx = vx * Math.cos(-ang) - vy * Math.sin(-ang);
  let sy = vx * Math.sin(-ang) + vy * Math.cos(-ang);
  const inPlane = Math.hypot(sx, sy), total = Math.hypot(a.x, a.y, a.z || 0) || 9.8;
  if (sy < 0) { sx = -sx; sy = -sy; }
  const g = S.gravity;
  const k = 0.2;
  const nx = sx / (inPlane || 1), ny = sy / (inPlane || 1);
  g.x = g.ok ? g.x * (1 - k) + nx * k : nx;
  g.y = g.ok ? g.y * (1 - k) + ny * k : ny;
  const n = Math.hypot(g.x, g.y) || 1; g.x /= n; g.y /= n;
  g.flat = inPlane < total * 0.45;
  g.tilt = deg(Math.atan2(g.x, g.y));
  g.ok = true;
}

async function enableMotionSensor() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const r = await DeviceMotionEvent.requestPermission();
      if (r !== 'granted') return;
    }
    window.addEventListener('devicemotion', onMotion);
  } catch (e) { console.warn(e); }
}

// ───────── カメラ ─────────
const video = $('#video');
const canvas = $('#stage');
const ctx = canvas.getContext('2d');

async function startCamera() {
  stopCamera();
  S.photo = false;
  S.mirror = S.facing === 'user';
  try {
    S.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: S.facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
  } catch (e) {
    toast('カメラを起動できませんでした。Safariの設定でカメラを許可し、https のページで開いてください。');
    console.error(e);
    return false;
  }
  video.srcObject = S.stream;
  await video.play().catch(() => {});
  try { S.wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  return true;
}

function stopCamera() {
  if (S.stream) S.stream.getTracks().forEach(t => t.stop());
  S.stream = null;
  video.srcObject = null;
  try { S.wakeLock?.release(); } catch {}
  S.wakeLock = null;
}

async function beginMeasure() {
  show('measure');
  $('#mTitle').textContent = `${S.motion.joint} ${S.motion.name}`;
  $('#mSide').textContent = S.motion.dirLR ? `${S.side === 'R' ? '右' : '左'}方向` : `${S.side === 'R' ? '右' : '左'}側`;
  S.pts = {}; S.low = {}; S.offset = null;
  enableMotionSensor();
  if (S.motion.models.length) {
    setStatus('AIモデルを読み込み中…（初回は少し時間がかかります）');
    loadModels().then(() => setStatus(mpError ? 'AIを読み込めませんでした。点は手で置いてください。' : ''));
  }
  goLive();
  if (!loopRunning) { loopRunning = true; requestAnimationFrame(loop); }
  const ok = await startCamera();
  if (!ok) setStatus('カメラを使えません。「写真から」で撮影済みの写真を測ることはできます。');
}
let loopRunning = false;

function goLive() {
  S.mode = 'live';
  S.frozen = null;
  S.hist = [];
  S.autoStill = false;
  renderPanel();
}

// ───────── 描画ループ ─────────
let lastVideoTime = -1;
function loop() {
  if ($('#measure').hidden) { loopRunning = false; return; }
  resizeCanvas();
  if (S.mode === 'live' && video.readyState >= 2) {
    const W = video.videoWidth, H = video.videoHeight;
    S.frameW = W; S.frameH = H;
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const res = (pose || hand) ? detect(video) : {};
      const ap = autoPoints(res, W, H, false);
      S.livePts = ap.found ? ap.pts : null;
      S.liveLow = ap.low;
      if (S.livePts) {
        const gm = geometry(S.livePts);
        S.lastAngle = gm.val;
        S.hist.push({ t: performance.now(), a: gm.val });
        S.hist = S.hist.filter(h => performance.now() - h.t < 1500);
      } else {
        S.lastAngle = null; S.hist = [];
      }
      if (S.autoStill) checkStill();
      if (S.freezeReq) {
        S.freezeReq = false;
        freezeFrame(res, ap);
      }
    }
  }
  draw();
  updateLiveReadout();
  requestAnimationFrame(loop);
}

function checkStill() {
  const now = performance.now();
  if (!S.livePts || now - S.autoSince < 1500) { $('#autoInfo').textContent = '静止を待っています…'; return; }
  const span = S.hist.length ? now - S.hist[0].t : 0;
  const as = S.hist.map(h => h.a);
  const range = Math.max(...as) - Math.min(...as);
  $('#autoInfo').textContent = `静止を待っています…（ゆれ ${range.toFixed(1)}°）`;
  if (span > 1200 && as.length >= 6 && range < 2) { S.autoStill = false; S.freezeReq = true; }
}

function freezeFrame(res, ap) {
  const c = document.createElement('canvas');
  c.width = S.frameW; c.height = S.frameH;
  c.getContext('2d').drawImage(video, 0, 0);
  S.frozen = c;
  S.pts = ap.pts; S.low = ap.low;
  S.mode = 'frozen';
  beep();
  renderPanel();
}

function resizeCanvas() {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

function fit() {
  const W = S.frameW || 16, H = S.frameH || 9;
  const s = Math.min(canvas.width / W, canvas.height / H);
  return { s, ox: (canvas.width - W * s) / 2, oy: (canvas.height - H * s) / 2, W, H };
}
function toScreen(p, f = fit()) {
  return { x: f.ox + (S.mirror ? (f.W - p.x) : p.x) * f.s, y: f.oy + p.y * f.s };
}
function fromScreen(x, y, f = fit()) {
  let rx = (x - f.ox) / f.s; if (S.mirror) rx = f.W - rx;
  return { x: rx, y: (y - f.oy) / f.s };
}
// 画像座標のベクトル → 画面のベクトル
const vScreen = v => ({ x: S.mirror ? -v.x : v.x, y: v.y });

function draw() {
  const f = fit();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const src = S.mode === 'frozen' ? S.frozen : (video.readyState >= 2 ? video : null);
  if (src) {
    ctx.save();
    if (S.mirror) { ctx.translate(f.ox + f.W * f.s, f.oy); ctx.scale(-f.s, f.s); }
    else { ctx.translate(f.ox, f.oy); ctx.scale(f.s, f.s); }
    ctx.drawImage(src, 0, 0, f.W, f.H);
    ctx.restore();
  }
  const pts = S.mode === 'frozen' ? S.pts : S.livePts;
  if (pts) drawOverlay(pts, S.mode === 'frozen' ? S.low : S.liveLow, f, S.mode === 'frozen');
  drawLevel();
}

function drawOverlay(pts, low, f, editable) {
  const m = S.motion;
  const gm = geometry(pts);
  const dpr = window.devicePixelRatio || 1;
  const L = Math.min(f.W, f.H) * 0.45;
  const css = getComputedStyle(document.documentElement);
  const cBase = css.getPropertyValue('--base').trim() || '#2563eb';
  const cMove = css.getPropertyValue('--move').trim() || '#dc2626';
  const lw = 4 * dpr;

  const line = (a, b, color, dash) => {
    const A = toScreen(a, f), B = toScreen(b, f);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = lw + 3 * dpr; ctx.setLineDash(dash ? dash.map(x => x * dpr) : []);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.restore();
  };
  const add = (p, v, k) => ({ x: p.x + v.x * k, y: p.y + v.y * k });

  // 基本軸
  const bu = norm(gm.bv);
  const b = m.geo.base;
  if (gm.kind === 'seg') {
    line(pts[b.a], pts[b.b], cBase);
    const len = Math.hypot(gm.bv.x, gm.bv.y);
    line(pts[b.b], add(pts[b.b], bu, len * 0.7), cBase, [10, 8]);
  } else {
    const both = m.geo.mode === 'line';
    line(both ? add(gm.anchor, bu, -L * 0.6) : gm.anchor, add(gm.anchor, bu, L), cBase, b.t === 'vert' || b.t === 'horiz' || b.t.startsWith('screen') ? [14, 8] : null);
  }
  // 移動軸
  const mu = norm(gm.mv);
  const mlen = Math.hypot(gm.mv.x, gm.mv.y);
  line(gm.c, gm.d, cMove);
  line(gm.d, add(gm.d, mu, mlen * 0.35), cMove, [10, 8]);

  // 角度の弧（移動軸の起点に基本軸を平行移動）
  let bdir = bu;
  if (m.geo.mode === 'line' && dot(bu, mu) < 0) bdir = { x: -bu.x, y: -bu.y };
  const anchorOnMove = Math.hypot(gm.anchor.x - gm.c.x, gm.anchor.y - gm.c.y) > 2;
  if (anchorOnMove) line(gm.c, add(gm.c, bdir, Math.min(mlen, L) * 0.8), cBase, [4, 6]);
  if (S.offset == null) {
    const C = toScreen(gm.c, f);
    const sb = vScreen(bdir), sm = vScreen(mu);
    const a0 = Math.atan2(sb.y, sb.x), a1 = Math.atan2(sm.y, sm.x);
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const r = Math.max(28 * dpr, Math.min(mlen * f.s * 0.35, 70 * dpr));
    ctx.save();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3 * dpr;
    ctx.beginPath(); ctx.arc(C.x, C.y, r, a0, a0 + d, d < 0); ctx.stroke();
    ctx.restore();
  }

  // 点
  const roleColor = id => ({ base: cBase, move: cMove, both: '#7c3aed' })[roleOf(m, id)];
  const all = m.pts.map(([id]) => pts[id]).filter(Boolean);
  const cen = { x: all.reduce((a, p) => a + p.x, 0) / all.length, y: all.reduce((a, p) => a + p.y, 0) / all.length };
  for (const [id, label] of m.pts) {
    const p = pts[id]; if (!p) continue;
    const s = toScreen(p, f);
    const r = (editable ? 11 : 7) * dpr;
    ctx.save();
    if (low?.[id]) {
      ctx.strokeStyle = low[id] === 'manual' ? '#f59e0b' : '#fb923c';
      ctx.lineWidth = 3 * dpr;
      ctx.beginPath(); ctx.arc(s.x, s.y, r + 6 * dpr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = roleColor(id);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${11 * dpr}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(id, s.x, s.y + 0.5);
    if (editable) {
      ctx.font = `${12 * dpr}px system-ui, sans-serif`;
      const tw = ctx.measureText(label).width;
      // 他の点の重心から離れる向きにラベルを置く
      let dv = vScreen(sub(p, cen)); const dn = Math.hypot(dv.x, dv.y);
      dv = dn > 1 ? { x: dv.x / dn, y: dv.y / dn } : { x: 0.7, y: -0.7 };
      const off = r + 14 * dpr;
      const ty = s.y + dv.y * off;
      const tx = dv.x >= 0 ? s.x + dv.x * off : s.x + dv.x * off - tw;
      ctx.fillStyle = 'rgba(15,23,42,0.75)';
      ctx.fillRect(tx - 4 * dpr, ty - 9 * dpr, tw + 8 * dpr, 18 * dpr);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText(label, tx, ty);
    }
    ctx.restore();
  }
}

function drawLevel() {
  const g = S.gravity;
  const el = $('#level');
  const usesGravity = ['vert', 'horiz'].includes(S.motion?.geo.base.t);
  if (S.photo) { el.textContent = '写真：傾き補正なし'; el.className = 'level warn'; return; }
  if (!g.ok) { el.textContent = '傾きセンサー：未使用（画面の縦を垂直とみなす）'; el.className = 'level'; return; }
  if (g.flat) {
    el.textContent = usesGravity ? 'iPadが水平に近い：画面の縦を垂直とみなします' : 'iPad 水平（真上撮影）';
    el.className = 'level' + (usesGravity ? ' warn' : '');
    return;
  }
  const t = g.tilt;
  el.textContent = `傾き ${t > 0 ? '+' : ''}${t.toFixed(1)}°${usesGravity ? '（自動補正）' : ''}`;
  el.className = 'level' + (Math.abs(t) > 5 ? ' warn' : ' ok');
}

// ───────── パネル ─────────
function updateLiveReadout() {
  if (S.mode === 'frozen') {
    const gm = geometry(S.pts);
    renderAngle(gm);
  } else if (S.mode === 'live') {
    if (S.lastAngle != null) renderAngle(geometry(S.livePts), true);
    else {
      $('#angle').textContent = '—';
      $('#angleSub').textContent = S.motion.models.length
        ? (pose || hand ? '体（手）が見つかりません。全体が画面に入るようにしてください' : (mpError ? 'AIなし：止めてから点を手で置いてください' : 'AI読込中…'))
        : '止めてから点を手で置いてください';
    }
  }
}

function renderAngle(gm, live) {
  const v = gm.val;
  const r5 = Math.round(v / 5) * 5;
  $('#angle').textContent = `${v.toFixed(0)}°`;
  const m = S.motion;
  let sub = `記録値（5°刻み）${r5}°`;
  if (m.refMax) sub += `　｜　参考 ${m.ref}°（${Math.round(v / m.refMax * 100)}%）`;
  if (S.offset != null) sub += '　｜　開始肢位からの差';
  if (gm.gFallback) sub += '　｜　⚠ 垂直は画面の縦で代用';
  $('#angleSub').textContent = live ? 'ライブ（AI推定）　' + sub : sub;
  const gon = parseFloat($('#gonio')?.value);
  const diffEl = $('#gonioDiff');
  if (diffEl) diffEl.textContent = isFinite(gon) ? `差 ${(r5 - gon) > 0 ? '+' : ''}${r5 - gon}°（アプリ記録値 − ゴニオ）` : '';
}

function renderPanel() {
  const m = S.motion;
  const p = $('#controls');
  const baselineBtn = S.offset == null
    ? `<button class="btn" id="bSetZero">この画像を開始肢位（0°）にする</button>`
    : `<button class="btn" id="bClearZero">開始肢位の記録を解除</button>`;
  if (S.mode === 'frozen') {
    p.innerHTML = `
      <div class="hint">点をドラッグして指標点に合わせてください。<span class="lg"><i class="dot b"></i>基本軸 <i class="dot m"></i>移動軸 <i class="dot o"></i>要確認</span></div>
      <div class="row">
        <button class="btn primary" id="bRetake">↺ 撮り直す</button>
        ${m.models.length ? `<button class="btn" id="bReAI">AIで再推定</button>` : ''}
      </div>
      ${m.baseline || S.offset != null ? `<div class="row">${baselineBtn}</div>` : `<div class="row"><details><summary>開始肢位からの差で測る</summary>${baselineBtn}</details></div>`}
      <div class="row gon"><label>ゴニオ実測 <input id="gonio" type="number" inputmode="numeric" placeholder="°" step="5"></label><span id="gonioDiff"></span></div>`;
    $('#bRetake').onclick = () => goLive();
    if ($('#bReAI')) $('#bReAI').onclick = reAI;
    $('#gonio').oninput = () => updateLiveReadout();
  } else {
    p.innerHTML = `
      ${S.offset != null ? `<div class="hint ok">開始肢位を記録済み。最終域で止めてください。</div>` : (m.baseline ? `<div class="hint">まず<b>開始肢位</b>で止めてください。</div>` : '')}
      <div class="row">
        <button class="btn primary big" id="bFreeze">■ 止める</button>
      </div>
      <div class="row">
        <button class="btn" id="bTimer">⏱ 3秒後</button>
        <button class="btn ${S.autoStill ? 'on' : ''}" id="bAuto">${S.autoStill ? '自動：待機中' : '静止したら自動'}</button>
      </div>
      <div class="row">
        <button class="btn" id="bFlip">カメラ切替</button>
        <label class="btn file">写真から<input type="file" accept="image/*" id="fPhoto" hidden></label>
      </div>
      <div class="sub" id="autoInfo"></div>
      ${S.offset != null ? `<div class="row">${baselineBtn}</div>` : ''}`;
    $('#bFreeze').onclick = () => { S.autoStill = false; requestFreeze(); };
    $('#bTimer').onclick = startTimer;
    $('#bAuto').onclick = () => { S.autoStill = !S.autoStill; S.autoSince = performance.now(); renderPanel(); };
    $('#bFlip').onclick = async () => { S.facing = S.facing === 'user' ? 'environment' : 'user'; await startCamera(); goLive(); };
    $('#fPhoto').onchange = e => loadPhoto(e.target.files[0]);
  }
  if ($('#bSetZero')) $('#bSetZero').onclick = () => {
    S.offset = geometry(S.pts).signed;
    toast('開始肢位を0°として記録しました。次に最終域で止めてください。');
    if (S.photo) { renderPanel(); } else goLive();
  };
  if ($('#bClearZero')) $('#bClearZero').onclick = () => { S.offset = null; renderPanel(); };
}

function requestFreeze() {
  if (S.mode !== 'live') return;
  if (video.readyState < 2) return;
  S.freezeReq = true;
}

function startTimer() {
  if (S.timer) return;
  let n = 3;
  const el = $('#countdown');
  el.hidden = false; el.textContent = n;
  S.timer = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(S.timer); S.timer = null; el.hidden = true; requestFreeze(); }
    else { el.textContent = n; tick(); }
  }, 1000);
  tick();
}

async function reAI() {
  if (!S.frozen) return;
  if (!pose && !hand) { await loadModels(); }
  if (!pose && !hand) { toast('AIを読み込めませんでした'); return; }
  const res = detect(S.frozen);
  const ap = autoPoints(res, S.frameW, S.frameH, true);
  S.pts = ap.pts; S.low = ap.low;
  toast(ap.found ? 'AIで点を置き直しました' : 'AIで見つけられませんでした');
}

async function loadPhoto(file) {
  if (!file) return;
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();
  const k = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  S.photo = true; S.mirror = false;
  setStatus('');
  S.frameW = c.width; S.frameH = c.height; S.frozen = c;
  S.mode = 'frozen';
  if (S.motion.models.length) await loadModels();
  const res = (pose || hand) ? detect(c) : {};
  const ap = autoPoints(res, c.width, c.height, false);
  S.pts = ap.pts; S.low = ap.low;
  renderPanel();
}

// ───────── ドラッグ編集＋拡大鏡 ─────────
const loupe = $('#loupe');
const lctx = loupe.getContext('2d');

canvas.addEventListener('pointerdown', e => {
  if (S.mode !== 'frozen') return;
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
  const f = fit();
  let best = null, bd = 48 * dpr;
  for (const [id] of S.motion.pts) {
    const s = toScreen(S.pts[id], f);
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = id; }
  }
  if (!best) return;
  const s = toScreen(S.pts[best], f);
  S.drag = { id: best, dx: s.x - x, dy: s.y - y };
  canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
  moveDrag(e);
});
canvas.addEventListener('pointermove', e => { if (S.drag) { moveDrag(e); e.preventDefault(); } });
const endDrag = () => { if (S.drag) { delete S.low[S.drag.id]; S.drag = null; loupe.hidden = true; } };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function moveDrag(e) {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * dpr + S.drag.dx, y = (e.clientY - r.top) * dpr + S.drag.dy;
  const p = fromScreen(x, y);
  p.x = Math.max(0, Math.min(S.frameW, p.x));
  p.y = Math.max(0, Math.min(S.frameH, p.y));
  S.pts[S.drag.id] = p;
  drawLoupe(p, e.clientX - r.left < r.width / 2);
}

function drawLoupe(p, fingerLeft) {
  const size = 160;
  loupe.hidden = false;
  loupe.style.left = fingerLeft ? '' : '12px';
  loupe.style.right = fingerLeft ? '12px' : '';
  const dpr = window.devicePixelRatio || 1;
  loupe.width = size * dpr; loupe.height = size * dpr;
  const zoom = 3;
  const f = fit();
  const srcR = (size / 2) * dpr / (f.s * zoom);
  lctx.fillStyle = '#000'; lctx.fillRect(0, 0, loupe.width, loupe.height);
  lctx.save();
  if (S.mirror) { lctx.translate(loupe.width, 0); lctx.scale(-1, 1); }
  lctx.drawImage(S.frozen, p.x - srcR, p.y - srcR, srcR * 2, srcR * 2, 0, 0, loupe.width, loupe.height);
  lctx.restore();
  lctx.strokeStyle = 'rgba(255,255,255,0.9)'; lctx.lineWidth = 1.5 * dpr;
  lctx.beginPath();
  lctx.moveTo(loupe.width / 2, 0); lctx.lineTo(loupe.width / 2, loupe.height);
  lctx.moveTo(0, loupe.height / 2); lctx.lineTo(loupe.width, loupe.height / 2);
  lctx.stroke();
  lctx.fillStyle = '#f59e0b';
  lctx.beginPath(); lctx.arc(loupe.width / 2, loupe.height / 2, 4 * dpr, 0, Math.PI * 2); lctx.fill();
}

// ───────── 小物 ─────────
let audioCtx = null;
function tone(freq, dur) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch {}
}
const beep = () => tone(1046, 0.18);
const tick = () => tone(660, 0.08);

let toastT = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 3200);
}
function setStatus(msg) { const el = $('#status'); el.textContent = msg; el.hidden = !msg; }

function openModal(id) { $(id).hidden = false; }
function closeModals() { for (const m of document.querySelectorAll('.modal')) m.hidden = true; }

function renderQR() {
  const url = location.href.split('#')[0].split('?')[0];
  $('#qrUrl').textContent = url;
  if (window.qrcode) {
    const qr = window.qrcode(0, 'M');
    qr.addData(url); qr.make();
    $('#qrBox').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  } else {
    $('#qrBox').textContent = 'QRコードを表示できませんでした（ネットワークを確認）';
  }
}

// ───────── 起動 ─────────
$('#bStart').onclick = () => { beginMeasure(); };
$('#bBackHome').onclick = () => { show('home'); };
$('#bBackSetup').onclick = () => { stopCamera(); S.mode = 'idle'; if (S.timer) { clearInterval(S.timer); S.timer = null; $('#countdown').hidden = true; } show('setup'); renderSetup(); };
$('#bQR').onclick = () => { renderQR(); openModal('#qrModal'); };
$('#bHelp').onclick = () => openModal('#helpModal');
for (const b of document.querySelectorAll('[data-close]')) b.onclick = closeModals;
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.mode === 'live') stopCamera();
  else if (!document.hidden && S.mode === 'live' && !$('#measure').hidden && !S.stream) startCamera();
});

let initialGroup = GROUPS[0];
try { const g = localStorage.getItem('rom.group'); if (GROUPS.includes(g)) initialGroup = g; } catch {}
renderHome(initialGroup);
show('home');

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// テスト用
window.__rom = { S, MOTIONS, geometry, autoPoints, makeL, loadPhoto, openSetup, beginMeasure, renderPanel };
