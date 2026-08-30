/* 작업 409 2회차 — «검정을 등폭으로 만들었더니 감쇠가 **베벨로 옮겨 갔다**» 를 재는 자.
 *
 *   node tools/probe409b.js
 *
 * 1회차 채점(CV)이 낸 것: 검정 법선 두께는 등폭(변동 4.6%)이 됐는데, 그 **안쪽 베벨 링**이
 * 코너에서 7·cos α 로 사라진다(0° 6px → 75° 1px → 88° 0px). 즉 결손이 없어진 게 아니라
 * 한 칸 안으로 옮겨 갔다는 지적이다. 여기서는 **검정과 그 안쪽 런을 같이** 재서
 * 후보 변종들을 한 표에 놓는다.
 *
 *   A 현행        — 검정 = `::after` 등폭 링(코너 기둥 마스크) · 가로 띠 = `::before`(아래)
 *   B 순서 되돌림 — 검정 링은 그대로 두고 **가로 띠를 위로**(띠가 코너에서 링을 덮는다)
 *   C 이중 링     — `::after` 에 검정 7 + 베벨 7 을 **동심으로** 얹는다
 *
 * ref 실측(비평가 CV·CW 2인 + probe409): 검정 6.0~7.0(0~60°) · **베벨 6~7 이 각도와 무관**.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '409b.png');
const R = 30;
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61523D']];
const DEGS = [0, 15, 30, 45, 60, 75, 85];

const VARIANTS = [
  ['A 현행(링 위 · 띠 아래)', ''],
  ['B 띠를 위로', '.stab.on::before{z-index:1}.stab.on::after{z-index:0}'],
  ['C 이중 링(검정7+베벨7)',
    '.stab.on::after{box-shadow:inset 0 0 0 7px var(--pill-k,#000),inset 0 0 0 14px #634F37!important}'],
  ['D 링 + 상단 베벨 복사본(코너 기둥 안에서만)',
    '.stab.on::after{box-shadow:inset 0 0 0 7px var(--pill-k,#000),inset 0 7px 0 #634F37!important}'],
  ['E 링 + 상단 베벨 + 바닥 D·베벨 복사본',
    '.stab.on::after{box-shadow:inset 0 0 0 7px var(--pill-k,#000),inset 0 7px 0 #634F37,'
    + 'inset 0 -7px 0 #413122,inset 0 -14px 0 #634F37!important}'],
];

async function shoot(page) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(data => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      window.__v409b = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('load fail'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

const ray = (page, p, corner, deg) => page.evaluate(([box, cor, dg, pal, r]) => {
  const g = window.__v409b;
  const a = dg * Math.PI / 180;
  const bottom = cor[0] === 'B', right = cor[1] === 'R';
  const cx = box.x + (right ? box.w - r : r), cy = box.y + (bottom ? box.h - r : r);
  const ux = (right ? 1 : -1) * Math.cos(a), uy = (bottom ? 1 : -1) * Math.sin(a);
  const cls = (R2, G2, B2) => {
    let best = '?', bd = Infinity;
    for (const [ch, hex] of pal) {
      const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      const d2 = (R2 - rr) ** 2 + (G2 - gg) ** 2 + (B2 - bb) ** 2;
      if (d2 < bd) { bd = d2; best = ch; }
    }
    return best;
  };
  let s = '';
  for (let d = 0; d <= 24 + 1e-9; d += 0.5) {
    const q = g.getImageData(Math.round(cx + ux * (r - d)), Math.round(cy + uy * (r - d)), 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, corner, deg, PAL, R]);

/* 윤곽에서 시작하는 검정 런의 두께와 **그 바로 안쪽 런**(베벨이면 B)의 두께를 같이 낸다. */
function split(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  let k = rs.findIndex(r => r[0] === 'K');
  if (k < 0 || k > 6) return { k: 0, nx: '-', nn: 0, txt: rs.map(r => r[0] + (r[1] * step).toFixed(1)).join(' ') };
  const inner = rs[k + 1] || null;
  return { k: rs[k][1] * step, nx: inner ? inner[0] : '-', nn: inner ? inner[1] * step : 0,
    txt: rs.map(r => r[0] + (r[1] * step).toFixed(1)).join(' ') };
}

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(900);

    console.log('\n══════ 409 2회차 — 검정 + «그 안쪽 런» 을 같이 잰다 (07 활성 «스킬») ══════');
    console.log(' ref 실측: 검정 6.0~7.0(0~60°) · 베벨 6~7 이 **각도와 무관** (CV·CW 2인 + probe409)');
    for (const [name, css] of VARIANTS) {
      if (css) await page.evaluate(c => {
        const s = document.createElement('style'); s.id = 'v409b'; s.textContent = c; document.head.appendChild(s);
      }, css);
      await page.waitForTimeout(250);
      const p = await page.evaluate(() => {
        const on = document.querySelector('#bSk .stabs > .stab.on').getBoundingClientRect();
        return { x: on.x, y: on.y, w: on.width, h: on.height };
      });
      await shoot(page);
      console.log('\n ── ' + name);
      for (const cor of ['TL', 'BL']) {
        const K = [], N = [];
        for (const d of DEGS) { const r = split(await ray(page, p, cor, d)); K.push(r.k); N.push(r.nx + r.nn.toFixed(1)); }
        console.log('   ' + cor + '  deg  ' + DEGS.map(d => String(d).padStart(6)).join(''));
        console.log('       검정 ' + K.map(v => v.toFixed(1).padStart(6)).join(''));
        console.log('       안쪽 ' + N.map(v => v.padStart(6)).join(''));
      }
      if (css) await page.evaluate(() => { const s = document.getElementById('v409b'); if (s) s.remove(); });
      await page.waitForTimeout(200);
    }
  } finally {
    await browser.close();
  }
})();
