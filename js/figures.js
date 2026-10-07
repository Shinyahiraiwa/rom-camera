// 撮影方向の図（SVG）と、基本軸・移動軸の模式図
const C_CAM = '#0f172a';
const C_BODY = '#cbd5e1';
const C_BODY_LINE = '#64748b';
const C_ACCENT = '#f59e0b';

function cam(x, y, rot, label) {
  // rot: レンズが向く方向（度、0=右, 90=下）
  return `
  <g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M 14 0 L 70 -26 L 70 26 Z" fill="${C_ACCENT}" opacity="0.18"/>
    <rect x="-18" y="-13" width="30" height="26" rx="5" fill="${C_CAM}"/>
    <rect x="10" y="-7" width="8" height="14" rx="2" fill="${C_CAM}"/>
    <circle cx="-3" cy="0" r="6" fill="#fff"/><circle cx="-3" cy="0" r="3" fill="${C_CAM}"/>
  </g>
  ${label ? `<text x="${x < 100 ? x - 18 : x > 240 ? x + 18 : x}" y="${y + (y > 150 ? 32 : -24)}" text-anchor="${x < 100 ? 'start' : x > 240 ? 'end' : 'middle'}" class="fig-label">${label}</text>` : ''}`;
}

function bodyTop(cx, cy) {
  // 上から見た被検者（下側が前）
  return `<g transform="translate(${cx} ${cy}) scale(1.45) translate(${-cx} ${-cy})">
  <ellipse cx="${cx}" cy="${cy}" rx="52" ry="18" fill="${C_BODY}" stroke="${C_BODY_LINE}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy - 2}" r="17" fill="#e2e8f0" stroke="${C_BODY_LINE}" stroke-width="1.5"/>
  <path d="M ${cx - 5} ${cy + 13} L ${cx} ${cy + 22} L ${cx + 5} ${cy + 13} Z" fill="${C_BODY_LINE}"/>
  </g><text x="${cx}" y="${cy + 58}" text-anchor="middle" class="fig-small">↓ 前（顔の向き）</text>`;
}

function sideLabels(cx, cy) {
  return `<text x="${cx - 62}" y="${cy + 40}" text-anchor="middle" class="fig-label">右</text>
          <text x="${cx + 62}" y="${cy + 40}" text-anchor="middle" class="fig-label">左</text>`;
}

function personSideElev(x, y) {
  // 横から見た座位の人（右向き）
  return `
  <g stroke="${C_BODY_LINE}" stroke-width="5" stroke-linecap="round" fill="none">
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 55}"/>
    <line x1="${x}" y1="${y + 55}" x2="${x + 40}" y2="${y + 55}"/>
    <line x1="${x + 40}" y1="${y + 55}" x2="${x + 40}" y2="${y + 90}"/>
    <line x1="${x}" y1="${y + 12}" x2="${x + 8}" y2="${y + 45}"/>
  </g>
  <circle cx="${x}" cy="${y - 15}" r="13" fill="#e2e8f0" stroke="${C_BODY_LINE}" stroke-width="2"/>
  <rect x="${x - 22}" y="${y + 58}" width="50" height="6" fill="${C_BODY}"/>`;
}

function handTop(x, y) {
  // 前腕と手（手背側から見た模式図・右が指先、上が母指側）
  return `
  <rect x="${x}" y="${y - 13}" width="120" height="26" rx="12" fill="${C_BODY}" stroke="${C_BODY_LINE}" stroke-width="1.5"/>
  <rect x="${x + 112}" y="${y - 22}" width="46" height="44" rx="12" fill="#e2e8f0" stroke="${C_BODY_LINE}" stroke-width="1.5"/>
  ${[-16, -5, 6, 17].map(d => `<rect x="${x + 154}" y="${y + d - 4}" width="${d === -5 || d === 6 ? 38 : 32}" height="9" rx="4.5" fill="#e2e8f0" stroke="${C_BODY_LINE}" stroke-width="1.2"/>`).join('')}
  <rect x="${x + 128}" y="${y - 40}" width="10" height="26" rx="5" transform="rotate(-35 ${x + 133} ${y - 20})" fill="#e2e8f0" stroke="${C_BODY_LINE}" stroke-width="1.2"/>
  <text x="${x + 133}" y="${y - 48}" text-anchor="middle" class="fig-small">母指側（橈側）</text>
  <text x="${x + 50}" y="${y + 32}" text-anchor="middle" class="fig-small">前腕</text>`;
}

function footTop(x, y) {
  // 足部を上から（上が趾先、下が踵）
  return `
  <path d="M ${x} ${y + 70} C ${x - 26} ${y + 70} ${x - 30} ${y + 20} ${x - 26} ${y - 20} C ${x - 22} ${y - 60} ${x + 30} ${y - 70} ${x + 30} ${y - 30} C ${x + 32} ${y + 10} ${x + 24} ${y + 70} ${x} ${y + 70} Z"
        fill="#e2e8f0" stroke="${C_BODY_LINE}" stroke-width="1.5"/>
  <circle cx="${x - 14}" cy="${y - 58}" r="8" fill="#e2e8f0" stroke="${C_BODY_LINE}" stroke-width="1.2"/>
  <text x="${x}" y="${y + 90}" text-anchor="middle" class="fig-small">踵</text>
  <text x="${x}" y="${y - 76}" text-anchor="middle" class="fig-small">趾先</text>`;
}

export function cameraFigure(view, side, motion) {
  const W = 340, H = 240;
  let g = '';
  const cx = 170, cy = 105;
  const measuredRight = side !== 'L';
  switch (view) {
    case 'side': {
      g += bodyTop(cx, cy) + sideLabels(cx, cy);
      const x = measuredRight ? 30 : 310;
      g += cam(x, cy, measuredRight ? 0 : 180, '測定側の真横');
      g += `<text x="${cx}" y="${H - 12}" text-anchor="middle" class="fig-small">上から見た図</text>`;
      break;
    }
    case 'front':
      g += bodyTop(cx, cy - 25) + sideLabels(cx, cy - 25);
      g += cam(cx, 196, -90, '');
      g += `<text x="${cx + 34}" y="${204}" class="fig-label">正面から</text>`;
      g += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="fig-small">上から見た図</text>`;
      break;
    case 'back':
      g += bodyTop(cx, cy + 25) + sideLabels(cx, cy + 25);
      g += cam(cx, 34, 90, '');
      g += `<text x="${cx + 34}" y="${30}" class="fig-label">背面から</text>`;
      g += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="fig-small">上から見た図</text>`;
      break;
    case 'top':
      g += personSideElev(150, 110);
      g += cam(150, 40, 90, '');
      g += `<text x="${190}" y="${44}" class="fig-label">頭上から真下へ</text>`;
      g += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="fig-small">横から見た図（iPadは床と平行）</text>`;
      break;
    case 'handEnd':
      g += handTop(40, 120);
      g += cam(312, 120, 180, '');
      g += `<text x="${300}" y="${170}" text-anchor="middle" class="fig-label">指先側から</text>`;
      g += `<text x="${300}" y="${186}" text-anchor="middle" class="fig-small">前腕の長軸方向</text>`;
      break;
    case 'handRadial':
      g += handTop(40, 140);
      g += cam(170, 36, 90, '');
      g += `<text x="${210}" y="${40}" class="fig-label">橈側の真横から</text>`;
      break;
    case 'handDorsal':
      g += handTop(40, 130);
      g += cam(200, 130, -90, '');
      g += `<text x="${170}" y="${210}" text-anchor="middle" class="fig-label">手背の真上から（画面に垂直）</text>`;
      break;
    case 'fingerSide':
      g += handTop(30, 140);
      g += cam(222, 52, 90, '');
      g += `<text x="${250}" y="${40}" class="fig-label">測る指の真横から</text>`;
      break;
    case 'footTop':
      g += footTop(150, 115);
      g += cam(150, 115, -90, '');
      g += `<text x="${250}" y="${110}" text-anchor="middle" class="fig-label">足背の真上から</text>`;
      g += `<text x="${250}" y="${128}" text-anchor="middle" class="fig-small">（画面に垂直）</text>`;
      break;
    case 'footBack':
      g += footTop(150, 100);
      g += cam(150, 214, -90, '');
      g += `<text x="${240}" y="${214}" text-anchor="middle" class="fig-label">踵の後方から</text>`;
      break;
    case 'toeSide':
      g += footTop(150, 115);
      g += cam(60, 60, 0, '');
      g += `<text x="${60}" y="${32}" text-anchor="middle" class="fig-label">第1趾の内側から</text>`;
      break;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="カメラ位置の図">${g}</svg>`;
}

export function axisFigure(motion) {
  // 基本軸（青）と移動軸（赤）の関係を模式的に描く（参考可動域の最大角で表示）
  const W = 340, H = 200;
  const ox = 170, oy = 110, len = 82;
  const max = motion.refMax ?? 30;
  const show = Math.min(max, 180);
  const rad = d => d * Math.PI / 180;
  const bAng = -90, mAng = bAng + show;
  const P = (a, r) => [ox + r * Math.cos(rad(a)), oy + r * Math.sin(rad(a))];
  const [bx, by] = P(bAng, len), [mx, my] = P(mAng, len);
  const r = 34;
  const [ax, ay] = P(bAng, r), [ex, ey] = P(mAng, r);
  const [lx, ly] = P((bAng + mAng) / 2, r + 20);
  const [tbx, tby] = P(bAng, len + 16), [tmx, tmy] = P(mAng, len + 20);
  return `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="基本軸と移動軸の図">
    <line x1="${ox}" y1="${oy}" x2="${bx}" y2="${by}" stroke="var(--base)" stroke-width="6" stroke-linecap="round"/>
    <line x1="${ox}" y1="${oy}" x2="${mx}" y2="${my}" stroke="var(--move)" stroke-width="6" stroke-linecap="round" ${show === 0 ? 'stroke-dasharray="8 8"' : ''}/>
    ${show > 0 ? `<path d="M ${ax} ${ay} A ${r} ${r} 0 0 1 ${ex} ${ey}" fill="none" stroke="#f59e0b" stroke-width="3"/>
    <text x="${lx}" y="${ly + 5}" text-anchor="middle" class="fig-label">${max}°</text>` : `<text x="${ox + 14}" y="${oy - 30}" class="fig-label">0°</text>`}
    <circle cx="${ox}" cy="${oy}" r="6" fill="#0f172a" stroke="#fff" stroke-width="2"/>
    <text x="${tbx}" y="${tby}" text-anchor="middle" class="fig-label" style="fill:var(--base)">基本軸</text>
    <text x="${show === 0 ? tmx + 40 : tmx}" y="${tmy + 5}" text-anchor="middle" class="fig-label" style="fill:var(--move)">移動軸</text>
    <text x="${W - 8}" y="${H - 8}" text-anchor="end" class="fig-small">模式図（参考可動域の最大角）</text>
  </svg>`;
}
