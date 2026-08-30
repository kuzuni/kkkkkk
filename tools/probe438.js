/* 작업 438 재현기 — «활성 알약 바닥 코너의 **가장 깊은 자리**를 verify384 가 보고 있는가».
 *
 *   node tools/probe438.js                    # 지금 트리
 *   V438_SRC=.v438-pre.html node tools/probe438.js   # 대조 트리(수리 전)
 *
 * 왜 이 자를 만드나:
 *   438 은 «03 던전 활성 알약 좌하 코너 75° 에서 384 의 어두운 띠가 빠지고 베벨이 나온다» 로
 *   등재됐다. 그 값은 `verify409` [8] 이 **법선(각도)** 으로 재서 잡은 것이고,
 *   `verify384` 는 같은 자리를 **가로 행**(rel 68 · 74)으로만 본다.
 *   ⇒ 이 자는 «가로 행을 rel 76~84 까지 내리면 그 결손이 보이는가» 를 묻는다.
 *      보이면 384 는 행 두 줄만 늘리면 되고, 안 보이면 384 에는 각도 축을 세워야 한다.
 *
 * ⚠ 대조 사본은 **저장소 루트**에 둔다 — index.html 이 assets/** 를 상대 경로로 물어서
 *   /tmp 에 두면 통째로 404 가 되고 «찍힌 픽셀» 이 달라진다(360·367·439 선례).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '438.png');

const BLACK = '#000000';
const BEVEL = '#634F37';
const FACE = '#4B3E2D';
const DARK = '#413122';
const RIM = '#705F4B';
const SHELL = '#61523D';

/* verify384 의 팔레트 판독을 그대로 쓴다 — 두 자가 같은 눈으로 봐야 값을 견줄 수 있다. */
const PAL = [['K', BLACK], ['B', BEVEL], ['F', FACE], ['D', DARK], ['R', RIM], ['S', SHELL]];
const chan = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function cls(hex) {
  const c = chan(hex);
  let best = '?', bd = Infinity;
  for (const [ch, ref] of PAL) {
    const r = chan(ref);
    const d = (c[0] - r[0]) ** 2 + (c[1] - r[1]) ** 2 + (c[2] - r[2]) ** 2;
    if (d < bd) { bd = d; best = ch; }
  }
  return best;
}
function runs(hexes) {
  const s = hexes.map(cls), out = [];
  for (const ch of s) {
    if (out.length && out[out.length - 1].c === ch) out[out.length - 1].n++;
    else out.push({ c: ch, n: 1 });
  }
  return out;
}
function fold(rs) {
  const out = [];
  for (const r of rs) {
    if (r.n === 1 && out.length) continue;
    if (out.length && out[out.length - 1].c === r.c) out[out.length - 1].n += r.n;
    else out.push({ ...r });
  }
  return out;
}
const fmt = rs => rs.map(r => r.c + r.n).join(' ');

/* verify384 의 wrapAt — «어두운 띠를 먼저 찾고 그 앞 런이 옆띠인지» 를 묻는다. */
function wrapAt(rs) {
  const i = rs.findIndex((r, k) => r.c === 'D' && r.n >= 3 && k > 0
    && (rs[k - 1].c === 'K' || rs[k - 1].c === 'B') && rs[k - 1].n >= 4);
  if (i < 0) return { band: null, dark: 0, next: null, txt: fmt(rs) };
  return { band: rs[i - 1], dark: rs[i].n, next: rs[i + 1] || null, txt: fmt(rs) };
}

const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비', '#eqTabs', () => heroSubGo('eq')],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
];

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

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
      window.__v438 = c.getContext('2d');
      res([im.width, im.height]);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}
const scan = (page, y, x0, n, dx) => page.evaluate(([yy, xx, nn, d]) => {
  const g = window.__v438, out = [];
  for (let i = 0; i < nn; i++) {
    const p = g.getImageData(xx + i * d, yy, 1, 1).data;
    out.push('#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase());
  }
  return out;
}, [y, x0, n, dx]);

const PILL = sel => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const on = bar.querySelector(':scope > .stab.on');
  if (!on) return null;
  const b = on.getBoundingClientRect();
  const cs = getComputedStyle(on, '::before');
  return {
    x: b.x, y: b.y, w: b.width, h: b.height,
    label: (on.querySelector('i') || {}).textContent || '',
    radius: cs.borderRadius, left: cs.left, top: cs.top, bottom: cs.bottom,
  };
};

/* 알약 반경 30 · 높이 85 ⇒ 좌하 코너 원 중심 (30, 55).
   법선 각 α(0° = 옆면 한복판 · 90° = 바닥)에서 바깥 점의 rel = 55 + 30·sin α.
     30° → 70.0 · 45° → 76.2 · 60° → 81.0 · 75° → 84.0
   verify384 의 행은 rel 68 · 74 뿐이라 **45° 언저리에서 멈춘다** — 438 이 잡힌 75° 는 rel 84 다. */
const RELS = [68, 74, 76, 78, 80, 82, 84];

(async () => {
  const browser = await launch(chromium);
  const src = process.env.V438_SRC ? path.resolve(ROOT, process.env.V438_SRC) : path.join(ROOT, 'index.html');
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + src);
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });

    console.log('\n소스: ' + path.relative(ROOT, src));
    console.log('rel = 알약 상변 기준 행. 코너 원 중심 rel 55 · 반경 30 ⇒ rel 84 가 법선 75°.\n');

    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { console.log(name + ' 진입 실패 — ' + e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const p = await page.evaluate(PILL, sel);
      if (!p) { console.log(name + ' 활성 알약 못 찾음'); continue; }
      await shoot(page);
      console.log('── ' + name + '«' + p.label + '»  ::before ' + p.radius
        + ' · left ' + p.left + ' · top ' + p.top + '/' + p.bottom);
      for (const side of ['L', 'R']) {
        for (const rel of RELS) {
          const y = Math.round(p.y + rel);
          const x0 = side === 'L' ? Math.round(p.x) - 2 : Math.round(p.x + p.w) + 1;
          const w = wrapAt(fold(runs(await scan(page, y, x0, 30, side === 'L' ? 1 : -1))));
          console.log('   ' + (side === 'L' ? '좌' : '우') + ' rel ' + String(rel).padStart(2)
            + '  D=' + String(w.dark).padStart(2) + 'px   ' + w.txt);
        }
      }
    }
  } finally { await browser.close(); }
})();
