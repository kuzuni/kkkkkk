/* 작업 409 게이트 — «활성 알약의 검정 옆띠가 **등폭 링**인가, 가로 평행이동 밴드인가».
 *
 *   node tools/verify409.js
 *
 * 잡는 것 하나:
 *   ref 의 검정 옆띠는 코너에서도 **법선 두께 7 이 일정**하다(등폭 링). 수리 전 우리 것은
 *   `inset ±7px 0 0 #000` = **가로 평행이동 밴드**라 같은 자리에서 **7·cos α** 로 얇아졌다.
 *   `python3 tools/probe409.py` 실측(07 활성 «스킬» 좌하 코너 · 코너 원 중심에서 쏜 광선):
 *       ref  0°/30°/45°/60°/70° = 6.0 / 7.0 / 6.5 / 5.5 / 10.0   ← 등폭
 *       수리 전 cap                = 6.5 / 6.0 / 4.5 / 4.0 / 3.5  ← 7·cos α (밴드)
 *       수리 후 cap                = 6.5 / 6.5 / 7.0 / 6.5 / 6.5  ← 등폭
 *
 * ⚑ **가로 런이 아니라 «법선» 으로 잰다**(probe409 서두). 가로 런은 코너에서 1/cos α 로
 *   길어지므로 «등폭인가» 를 직접 못 묻는다 — 384 1회차에 BB 가 «대각 4.94 ↔ ref 7.08» 로
 *   가른 축이 바로 이것이다.
 *
 * ⚑ **무른 게이트가 안 되게 네 겹으로 문다**(LESSONS 328·334 · 384 §7):
 *     [2] 코너 — 0°~75° 법선 두께가 전부 ≥5.0 이고 **편차 ≤2.0**(등폭)
 *     [3] 음성항 — 직선 상·하변에는 링이 **없다**(«위·아래 테두리는 바 테두리와 공유» 07 §9 · 378)
 *     [4] 끝 칸 — 셸에 닿는 면은 코너 기둥이 **통째로 빠진다**(378 을 링에서도 지킨다) ·
 *         반대 면은 코너까지 검정이 **있다**(«다 지웠다» 와 구분한다)
 *     [5] 밴드 대조 — 60°·75° 가 밴드 예측(3.5·1.8)을 **크게 넘는다**
 *   그리고 [R] 이 되돌림을 문다 — **옛 밴드를 도로 주입하면 빨개진다**(R2)·
 *   마스크를 걷으면 [3] 이 실제로 잡는다(R4). 이게 없으면 «원래 그랬던 것을 굳힌 게이트» 다(338 교훈).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '409.png');

/* 437 (2026-08-30) 이관 — 알약 상자 85 → **84**(셸 98 / 테두리 7 / 칸 84 한 덩어리).
   409 의 각도 표본은 **코너 원 중심**(반경 30) 기준이라 상자 높이 1 이 줄어도 광선은 같은
   호를 탄다 — 그래서 이 파일에서 바뀌는 것은 이 상수 하나다(`probe437.py` ⓕ). */
const PILL_H = 84, R = 30;
const BLACK = '#000000';
const BEVEL = '#634F37';    /* 알약 베벨 (352 6회차) */
const FACE = '#4B3E2D';     /* 채움면 */
const DARK = '#413122';     /* 바닥 어두운 띠 (384) */
const RIM = '#705F4B';      /* 셸 안쪽 밝은 림 */
const SHELL = '#61523D';
const INK = '#F2BC8D';      /* 활성 라벨 색 */

/* 각도 표본 — 0° = 변 한복판(직선부와 만나는 자리) · 90° = 상/하변.
   80° 이상은 상·하변의 «공유 테두리» 구간과 섞이므로 75° 까지만 문다(probe409 ⓐ 와 같은 창). */
const DEGS = [0, 15, 30, 45, 60, 75];
const MIN_TH = 5.0;         /* 등폭이면 7 근처 · 밴드면 45° 4.9 · 60° 3.5 · 75° 1.8 */
const MAX_SPREAD = 2.0;     /* 0°~75° 편차 — 밴드는 5.2 가 나온다 */
/* 409 2회차 — 검정 «안쪽» 축. 각도는 **코너 호 한복판**만 본다(0°·85° 는 직선부로 넘어가는 자리라
   위·아래 코너의 기댓값이 서로 섞인다 — `probe409b` BL 0°/85° 가 B6.0/K6.0 으로 읽히는 그 자리다).
   MIN_BEV 5.0 은 ref 6~7 · 우리 6.0~7.0 · 수리 전 2.0~4.0 사이에 그은 선이다. */
const BEV_DEGS = [30, 45, 60, 75];
const MIN_BEV = 5.0;
/* 409 4회차 — 어두운 띠(384) 축. probe 각도계에서 0° = 옆면 · 90° = 바닥이므로 **바닥 쪽**만 본다
   (옆면 쪽은 ref 도 1px 근처로 사라지는 것이 정답이다 — 거기서 두께를 요구하면 거짓 결함이 된다).
   MIN_DARK 4.0 은 ref 6.1~6.2(CZ) · 우리 6.0 · 옛 상자 2.0~2.5 사이에 그은 선이다. */
const DARK_DEGS = [60, 75];
const MIN_DARK = 4.0;

const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비', '#eqTabs', () => heroSubGo('eq')],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n + (d === undefined ? '' : ' — ' + d)); }
  else { fail++; console.log('  FAIL ' + n + (d === undefined ? '' : ' — ' + d)); }
};

const PAL = [['K', BLACK], ['B', BEVEL], ['F', FACE], ['D', DARK], ['R', RIM], ['S', SHELL]];

/* ── 스크린샷을 페이지 안 캔버스에 올려 두고 이후 질의는 그 위에서 한다(350 처방 — 찍힌 픽셀) ── */
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
      window.__v409 = c.getContext('2d');
      res([im.width, im.height]);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

/* 코너 원 중심에서 각도 deg 로 쏜 광선을 0.5px 간격으로 훑어 클래스 문자열로 돌려준다.
   d = 윤곽에서 안쪽으로 들어간 거리. 광선은 항상 바깥 → 안쪽.
   ⚠ **윤곽 «바깥» 은 안 읽는다**(probe409 는 맥락을 보려고 6px 밖까지 읽는다) — 알약이 셸
   안쪽 변에 닿는 면에서는 바로 밖이 **셸의 검정 테두리 6px** 이라, 밖을 읽으면 378 이 넘긴
   면에서도 «검정이 있다» 로 읽힌다(그 면의 [4] 음성항이 통째로 죽는다). */
const ray = (page, p, corner, deg, out = 0, inn = 20, step = 0.5) => page.evaluate(([box, cor, dg, o, i2, st, pal, r]) => {
  const g = window.__v409;
  const a = dg * Math.PI / 180;
  const bottom = cor[0] === 'B', right = cor[1] === 'R';
  const cx = box.x + (right ? box.w - r : r);
  const cy = box.y + (bottom ? box.h - r : r);
  const ux = (right ? 1 : -1) * Math.cos(a);
  const uy = (bottom ? 1 : -1) * Math.sin(a);
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
  for (let d = -o; d <= i2 + 1e-9; d += st) {
    const px = Math.round(cx + ux * (r - d)), py = Math.round(cy + uy * (r - d));
    const q = g.getImageData(px, py, 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, corner, deg, out, inn, step, PAL, R]);

/* 윤곽(d=0)에 **가장 가까운** 검정 런이 알약의 옆띠다(probe409 `ring_run`) —
   안쪽 깊은 곳의 검정(라벨 글자 외곽선)을 옆띠로 오독하지 않게 하는 것이 이 규칙이다. */
function blackNorm(s, out = 0, step = 0.5) {
  const c = out / step;
  const rs = [];
  for (let i = 0; i < s.length;) {
    if (s[i] === 'K') { let j = i; while (j < s.length && s[j] === 'K') j++; rs.push([i, j - i]); i = j; }
    else i++;
  }
  if (!rs.length) return 0;
  let best = rs[0];
  for (const r of rs) if (Math.abs(r[0] - c) < Math.abs(best[0] - c)) best = r;
  /* 윤곽에서 3px 넘게 떨어져 시작하는 검정은 옆띠가 아니다(라벨 글자 외곽선 등) — 0 으로 읽는다.
     ⚠ 3px 은 여유가 아니라 **좌표 오차**다: 알약 폭·좌변이 소수라 `getBoundingClientRect` 로
        세운 코너 원 중심이 최대 1px 밀리고, 거기에 AA 한 줄이 더 붙는다. 2px 로 조이면
        같은 등폭 링이 각도에 따라 «0.0» 으로 읽혀 자가 스스로 흔들린다(1회차 실측). */
  if (Math.abs(best[0] - c) > 6) return 0;
  return best[1] * step;
}
/* 409 2회차 — **검정 «바로 안쪽» 런.** 등폭이 된 검정 안쪽에서 베벨이 7·cos α 로 사라지던 것이
   1회차의 남은 반쪽(CV D1)이라, 그 자리를 자로 만든다.
   ⚠ **이음매 한 칸을 건너뛴다**: 검정 링의 안쪽 모서리는 그 밑 색과 섞여 각도에 따라 0.5~1.0px 짜리
      중간색 런을 하나 남긴다(45°/60°/85° 에서만 나오고 0°/30°/75° 에서는 안 나온다 = 정수 픽셀 격자에
      걸리는 표본 운). 그래서 «**2px 이상인 첫 런**» 을 읽는다 — 2px 은 여유가 아니라 «AA 이음매는
      1px 를 절대 안 넘는다» 는 관측이다. 무르게 푼 것이 아님은 [R6] 이 못박는다(배경 고리를 떼면
      같은 자가 B7.0 → B2.0 으로 빨개진다). */
function innerRun(s, out = 0, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  let k = rs.findIndex(r => r[0] === 'K');
  if (k < 0 || k > 6) return ['-', 0];
  let si = k + 1;
  while (rs[si] && rs[si][1] * step < 2.0) si++;
  return rs[si] ? [rs[si][0], rs[si][1] * step] : ['-', 0];
}
/* 409 3회차 — **아래 코너의 «어두운 띠 뒤 밝은 베벨».**
   위 코너는 검정 바로 안쪽이 베벨이지만(→ `innerRun`), 아래 코너는 ref 도 우리도 «검정 → 어두운 띠 →
   베벨» 순서다. 그래서 아래에서는 **K 뒤 첫 B 런(≥2px)** 을 읽는다 — 사이에 낀 D·AA 이음매는 건너뛰되
   D 자체는 [8-Δ] 가 따로 물고 있으므로 여기서 숨겨지는 값이 없다. */
function bevelRun(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  const k = rs.findIndex(r => r[0] === 'K');
  if (k < 0 || k > 6) return 0;
  for (let i = k + 1; i < rs.length; i++) {
    if (rs[i][0] === 'B' && rs[i][1] * step >= 2.0) return rs[i][1] * step;
    if (rs[i][0] === 'F' && rs[i][1] * step >= 3.0) return 0;   /* 면이 먼저 나오면 베벨은 없다 */
  }
  return 0;
}
/* 409 4회차 — 검정 뒤 첫 «어두운 띠(D)» 런. AA 이음매(<2px)는 건너뛴다. */
function darkRun(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  const k = rs.findIndex(r => r[0] === 'K');
  if (k < 0 || k > 6) return 0;
  for (let i = k + 1; i < rs.length; i++) {
    if (rs[i][0] === 'D' && rs[i][1] * step >= 2.0) return rs[i][1] * step;
    if (rs[i][1] * step >= 2.0) return 0;   /* D 아닌 두꺼운 런이 먼저 나오면 띠는 없다 */
  }
  return 0;
}
const fmtRuns = s => {
  const out = [];
  for (const ch of s) {
    if (out.length && out[out.length - 1][0] === ch) out[out.length - 1][1]++;
    else out.push([ch, 1]);
  }
  return out.map(([c, n]) => c + (n * 0.5).toFixed(1)).join(' ');
};

/* 세로 단면(직선부) — 코너 기둥(반경 30) **밖**에서 위/아래로 훑는다.
   ⚠ 알약 가로 한복판은 못 쓴다 — 거기엔 **라벨 글자의 검은 외곽선**이 있어(잉크 rel 20~57)
      «상변에 검정이 있다» 로 잘못 읽힌다. 그리고 표본은 12 = rel −3..8 로 끊는다:
      링이 얹히면 rel 0..7 에 나오므로 그 창이면 충분하고, 글자에는 절대 안 닿는다. */
const vscan = (page, p, side, n = 12) => page.evaluate(([box, sd, nn, pal]) => {
  const g = window.__v409;
  const x = Math.round(box.x + 38);      /* 반경 30 + 8 = 직선부 시작 직후 */
  const y0 = sd === 'T' ? Math.round(box.y) - 3 : Math.round(box.y + box.h) + 2;
  const dy = sd === 'T' ? 1 : -1;
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
  for (let i = 0; i < nn; i++) {
    const q = g.getImageData(x, y0 + dy * i, 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, side, n, PAL]);

const countInk = (page, box) => page.evaluate(([b, ink]) => {
  const g = window.__v409;
  const d = g.getImageData(b.x, b.y, b.w, b.h).data;
  const t = [1, 3, 5].map(i => parseInt(ink.slice(i, i + 2), 16));
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - t[0]) <= 26 && Math.abs(d[i + 1] - t[1]) <= 26 && Math.abs(d[i + 2] - t[2]) <= 26) n++;
  }
  return n;
}, [box, INK]);

const PILL = sel => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const on = bar.querySelector(':scope > .stab.on');
  if (!on) return null;
  const b = on.getBoundingClientRect();
  const cs = getComputedStyle(on);
  const ring = getComputedStyle(on, '::after');
  const band = getComputedStyle(on, '::before');
  const pl = cs.getPropertyValue('--pill-l').trim();
  const pr = cs.getPropertyValue('--pill-r').trim();
  return {
    x: b.x, y: b.y, w: b.width, h: b.height,
    label: (on.querySelector('i') || {}).textContent || '',
    shadow: cs.boxShadow,
    ringSh: ring.boxShadow, ringPe: ring.pointerEvents,
    ringMask: (ring.maskImage && ring.maskImage !== 'none' ? ring.maskImage : ring.webkitMaskImage) || '',
    bandSh: band.boxShadow,
    pl, pr,
    /* 378 — 셸 안쪽 변에 **닿는** 면은 검정을 셸 테두리에 넘긴 면이다(밴드가 `inset 7px` 로 바뀐다). */
    touchL: /(^|\s)7px/.test(pl), touchR: /-7px/.test(pr),
  };
};

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto('file://' + path.resolve(process.env.V409_SRC || path.join(ROOT, 'index.html')));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    /* ⚠ **배지·자물쇠를 가린다** — `.stab>.bdg`(레드닷 · right 23 · top −6)는 알약 **우상 코너를
       통째로 덮는다**. 안 가리면 10 상점 활성 칸 TR 이 «60° 검정 20px» 로 읽혀(닷의 검은 테)
       등폭 판정이 무너진다. 이 게이트가 재는 것은 알약 테두리의 기하이지 배지가 아니다. */
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });

    /* ---- 1. 선언 — 손잡이가 넷이다 ---- */
    console.log('\n[1] 선언 — 검정은 밴드가 아니라 `::after` 의 등폭 링이고, 면별 손잡이는 마스크다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(800);
    await page.evaluate(SETTLE);
    const d0 = await page.evaluate(PILL, '#bSk .stabs');
    ok('활성 알약을 찾았다', !!d0, d0 ? d0.label + ' ' + Math.round(d0.w) + '×' + Math.round(d0.h) : '없음');
    ok('알약 높이 = ' + PILL_H, !!d0 && Math.abs(d0.h - PILL_H) <= 0.6, d0 ? d0.h.toFixed(2) : '—');
    ok('`::after` 가 스프레드 7px 검정 링이다 (`inset 0 0 0 7px`)',
      !!d0 && /rgb\(0, 0, 0\) 0px 0px 0px 7px inset/.test(d0.ringSh), d0 ? d0.ringSh.slice(0, 70) : '—');
    ok('링에 코너 기둥 마스크가 걸려 있다 (좌·우 30px = 반경)',
      !!d0 && /linear-gradient/.test(d0.ringMask) && /30px/.test(d0.ringMask),
      d0 ? d0.ringMask.replace(/\s+/g, ' ').slice(0, 90) : '—');
    ok('`pointer-events:none` — 클릭은 그대로 칸이 받는다', !!d0 && d0.ringPe === 'none', d0 ? d0.ringPe : '—');
    /* ⚠ 여기(부모 box-shadow)에 검정이 남아 있으면 384 §6-1 ⓐ 가 되돌린 자리로 돌아간다 —
       가로 띠 의사요소가 코너에서 그 검정을 7·cos α 로 깎는다. */
    ok('부모 `box-shadow` 에는 **베벨만** 남았다 (검정 0건)',
      !!d0 && !/rgb\(0, 0, 0\)/.test(d0.shadow) && /rgb\(99, 79, 55\)/.test(d0.shadow),
      d0 ? d0.shadow.replace(/\s+/g, ' ').slice(0, 90) : '—');
    ok('가로 띠(384)는 `::before` 로 내려가 세 겹 그대로다',
      !!d0 && (d0.bandSh.match(/inset/g) || []).length === 3, d0 ? String((d0.bandSh.match(/inset/g) || []).length) + '겹' : '—');

    /* ---- 2·3·4·5. 찍힌 픽셀 ---- */
    console.log('\n[2] 코너 — 0°~75° 법선 두께가 ≥' + MIN_TH.toFixed(1) + ' 이고 편차 ≤' + MAX_SPREAD.toFixed(1) + ' (등폭 링)');
    console.log('[3] 음성항 — 직선 상·하변에는 검정이 없다 (링을 네 면에 두른 게 아니다)');
    console.log('[4] 끝 칸 — 셸에 닿는 면은 코너 기둥이 통째로 빠진다 (378)');
    console.log('[5] 밴드 대조 — 60°/75° 가 7·cos α (3.5/1.8) 를 크게 넘는다\n');
    let faces = 0, offFaces = 0, deltaFaces = 0, collapsed = 0, endCells = 0, midFaces = 0;
    for (const [name, sel, setup] of HOSTS) {
      const botOn = {}, botBev = {};
      try { await page.evaluate(setup); } catch (e) { ok(name + ' 진입', false, e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const p = await page.evaluate(PILL, sel);
      if (!p) { ok(name + ' 활성 알약 측정', false, '못 찾음'); continue; }
      const midCell = !p.touchL && !p.touchR;
      await shoot(page);

      for (const corner of ['BL', 'BR', 'TL', 'TR']) {
        const touching = corner[1] === 'L' ? p.touchL : p.touchR;
        const tag = name + '«' + p.label + '» ' + corner;
        const th = [];
        for (const dg of DEGS) th.push(blackNorm(await ray(page, p, corner, dg)));
        const line = DEGS.map((d, i) => d + '°:' + th[i].toFixed(1)).join(' ');
        if (touching) {
          /* [4] 378 이 넘긴 면 — 링 기둥이 통째로 빠져 코너에도 검정이 없다. */
          ok('[4] ' + tag + ' — 셸에 닿는 면이라 코너 검정 0 (378 을 링에서도 지킨다)',
            th.every(v => v <= 1.0), line);
          offFaces++;
        } else {
          ok('[2] ' + tag + ' — 전 각도 ≥ ' + MIN_TH.toFixed(1) + 'px', th.every(v => v >= MIN_TH), line);
          const spread = Math.max(...th) - Math.min(...th);
          ok('[2] ' + tag + ' — 편차 ≤ ' + MAX_SPREAD.toFixed(1) + 'px (등폭)', spread <= MAX_SPREAD, spread.toFixed(1) + 'px : ' + line);
          ok('[5] ' + tag + ' — 60° ' + th[4].toFixed(1) + ' > 밴드 예측 3.5 · 75° ' + th[5].toFixed(1) + ' > 1.8',
            th[4] >= 4.5 && th[5] >= 3.5, line);
          /* [8] 409 2회차 — 검정 **안쪽** 도 각도와 무관해야 한다. ref 의 코너는 «위는 베벨 ·
             아래는 어두운 띠» 라(384 §ref: 위 `K8 B9 F…` ↔ 아래 `K8 D8 F1 B1`) 두 축의 기댓값이
             **서로 다르고**, 그 다름이 이 항의 음성항 노릇을 한다 — 아래 코너에 베벨을 깔면
             384 의 감김을 덮게 되므로 아래에서는 D 를 요구한다(`probe409b` 의 C·E 가 그렇게 무너졌다). */
          const inner = [];
          for (const dg of BEV_DEGS) inner.push(innerRun(await ray(page, p, corner, dg)));
          const iline = BEV_DEGS.map((d, i) => d + '°:' + inner[i][0] + inner[i][1].toFixed(1)).join(' ');
          if (corner[0] === 'T') {
            ok('[8] ' + tag + ' — 검정 안쪽 베벨 동심 고리 ≥ ' + MIN_BEV.toFixed(1) + 'px (7·cos α 로 안 사라진다)',
              inner.every(r => r[0] === 'B' && r[1] >= MIN_BEV), iline);
          } else {
            /* ⚠ 아래 코너는 «**D 여야 한다**» 로 묻지 않는다 — 그 값은 384(바닥 띠 감김)의 소유이고,
               `03 던전` BL 75° 는 **수리 전 트리에서도** `B7.0` 이다(직접 대조로 확인 · 곁다리 등재 438).
               그것을 여기서 물으면 남의 결함이 이 게이트의 색을 정하게 된다(409 1회차가 `verify96`
               [1-c] 에서 겪은 것과 반대 방향의 같은 사고). ⇒ **이 항이 실제로 주장하는 것**만 묻는다:
               «2회차가 넣은 고리는 아래 코너를 한 픽셀도 안 건드린다» = 고리를 껐다 켜도 Δ0.
               무른 항이 아니다 — 고리가 아래 코너로 새면(후보 C·E 가 그랬다) 즉시 빨개진다. */
            botOn[corner] = inner;
            ok('[8] ' + tag + ' — 검정 안쪽 런을 쟀다 (아래 코너 · Δ0 판정은 [8-Δ] 에서)',
              inner.every(r => r[0] !== '-'), iline);
            /* [9] 409 3회차 — 아래 코너의 «어두운 띠 뒤 밝은 베벨» 도 각도와 무관해야 한다
               (ref 6.66~7.80 · 수리 전 4.04~5.97 로 코너로 갈수록 단조 감소했다 — CY·CZ 2인 독립).
               ⚠ **가운데 칸에서만 묻는다.** 4회차가 새 상자를 «셸에 안 닿는 칸» 으로 한정했기 때문이다
                  (닿는 면에는 검정이 없어 «검정의 안쪽 윤곽» 이라는 전제가 성립 안 한다 — 449 로 등재).
                  끝 칸은 아래 [E] 가 «옛 상자 그대로인가» 로 따로 문다 — 자리를 비우지 않는다. */
            if (!midCell) { continue; }
            const bev = [];
            for (const dg of BEV_DEGS) bev.push(bevelRun(await ray(page, p, corner, dg)));
            botBev[corner] = bev; midFaces++;
            ok('[9] ' + tag + ' — 어두운 띠 뒤 베벨 ≥ ' + MIN_BEV.toFixed(1) + 'px (아래 코너도 등폭)',
              bev.every(v => v >= MIN_BEV), BEV_DEGS.map((d, i) => d + '°:' + bev[i].toFixed(1)).join(' '));
          }
          faces++;
        }
      }

      /* [3] 직선 상·하변 — 링이 안 얹힌다(«위·아래 테두리는 바 테두리와 공유» 07 §9). */
      for (const side of ['T', 'B']) {
        const s = await vscan(page, p, side);
        const inside = s.slice(4);      /* 셸 쪽 4 표본(테두리·림)은 건너뛴다 */
        ok('[3] ' + name + ' ' + (side === 'T' ? '상변' : '하변') + ' 한복판 — 알약 안쪽에 검정 0',
          !inside.includes('K'), s);
      }

      /* [8-Δ] 2회차가 넣은 배경 동심 고리를 이 호스트에서 껐다 켠다 — 아래 코너가 Δ0 이어야 한다.
         (위 코너의 «무너진다» 쪽은 [R6] 이 한 번 문다 — 여기서 두 번 물을 필요는 없다.) */
      if (Object.keys(botOn).length) {
        await page.evaluate(() => {
          const s = document.createElement('style'); s.id = 'v409bevH';
          s.textContent = '.stab.on::after{background:none!important}';
          document.head.appendChild(s);
        });
        await page.waitForTimeout(180);
        await shoot(page);
        for (const corner of Object.keys(botOn)) {
          const off = [];
          for (const dg of BEV_DEGS) off.push(innerRun(await ray(page, p, corner, dg)));
          const on = botOn[corner];
          const fmtI = a => BEV_DEGS.map((d, i) => d + '°:' + a[i][0] + a[i][1].toFixed(1)).join(' ');
          ok('[8-Δ] ' + name + ' ' + corner + ' — 고리를 껐다 켜도 Δ0 (384 의 바닥 감김을 안 덮었다)',
            on.every((r, i) => r[0] === off[i][0] && Math.abs(r[1] - off[i][1]) < 0.01),
            '켬 ' + fmtI(on) + '  ↔  끔 ' + fmtI(off));
          deltaFaces++;
        }
        await page.evaluate(() => { const s = document.getElementById('v409bevH'); if (s) s.remove(); });
        await page.waitForTimeout(150);
        await shoot(page);
      }

      /* [10] 409 4회차 — 아래 코너의 **어두운 띠**(384)도 호를 따라 두꺼워져야 한다.
             ref 는 바닥 직선부(7px)에서 옆면(≈1px)으로 매끄럽게 줄어드는데(CY·CZ·DA 3인 독립),
             옛 상자(좌·우만 7 인셋)에서는 코너 내내 2.0~2.8 로 납작했다.
             ⇒ **바닥 쪽 각도**(60°·75° — probe 각도계에서 0°=옆면 · 90°=바닥)에서 ≥4.0 을 묻는다.
         [9-R]·[10-R] 되돌림 — `::before` 를 **옛 상자**(좌·우만 7 인셋 · r30 · 마스크 없음)로 되돌리면
             둘 다 무너져야 한다. 이 주입이 곧 «384 의 상자를 그대로 쓰면 어떻게 되는가» 다. */
      if (!midCell) {
        endCells++;
        /* [E] 끝 칸 — 4회차는 여기에 **옛 상자를 그대로** 남겼고, **449(2026-08-30)** 가 그 절반을 닫았다.
           ⚑ **이관이다(값만 갈지 않았다).** 4회차의 [E] 는 «옛 상자 그대로인가»(세로 인셋 0 · r30)만
              물었는데, 그 문장은 449 가 닫히는 순간 **«아직 안 고쳐졌는가» 를 지키는 항**이 된다.
              449 가 밝힌 것은 «옛 상자» 가 틀린 게 아니라 그 상자의 **가로 인셋 7** 하나가 틀렸다는
              것이다 — 이 면엔 검정이 없어 세 띠가 시작할 자리가 «검정 안쪽» 이 아니라 알약 윤곽
              그 자체이고, 가로 인셋을 0 으로 두면 세로 인셋 0 · r30 과 합쳐져 상자가 곧 **동심**이 된다.
           ⇒ 그래서 세 값을 다 묻되 **가로 인셋은 «닿는 면만 0»** 으로 묻는다. 이 항은 이제
              «닿는 면이 동심인가» 를 지키고, 그림 자체는 `tools/verify449.js` 가 법선으로 잰다. */
        const bb = await page.evaluate(sel2 => {
          const on = document.querySelector(sel2 + ' > .stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::before');
          const st = getComputedStyle(on);
          return { t: cs.top, bt: cs.bottom, r: cs.borderRadius, l: cs.left, rt: cs.right,
            pl: st.getPropertyValue('--pill-l').trim(), pr: st.getPropertyValue('--pill-r').trim() };
        }, sel);
        /* 어느 면이 셸에 닿는가는 378 의 손잡이(`--pill-*` 가 7 로 바뀐 쪽)가 말한다 — 자리를
           셀렉터로 다시 적지 않는다(378 이 그 규약을 이미 갖고 있다). */
        const tchL = !!bb && /(^|\s)7px/.test(bb.pl), tchR = !!bb && /-7px/.test(bb.pr);
        ok('[E] ' + name + ' — 끝 칸의 가로 띠 상자: 세로 인셋 0 · r30 (알약과 같은 반경)',
          !!bb && bb.t === '0px' && bb.bt === '0px' && /^30px/.test(bb.r),
          bb ? (bb.t + ' / ' + bb.bt + ' / ' + bb.r) : '없음');
        ok('[E] ' + name + ' — **닿는 면만** 가로 인셋 0 (449 — 그 면이 동심이 된다) · 반대 면은 7',
          !!bb && (tchL ? bb.l === '0px' : bb.l === '7px') && (tchR ? bb.rt === '0px' : bb.rt === '7px'),
          bb ? ('좌 ' + bb.l + (tchL ? '(닿음)' : '') + ' · 우 ' + bb.rt + (tchR ? '(닿음)' : '')) : '없음');
      }
      if (midCell && Object.keys(botBev).length) {
        const darkOn = {};
        for (const corner of Object.keys(botBev)) {
          const dk = [];
          for (const dg of DARK_DEGS) dk.push(darkRun(await ray(page, p, corner, dg)));
          darkOn[corner] = dk;
          ok('[10] ' + name + ' ' + corner + ' — 바닥 쪽 어두운 띠 ≥ ' + MIN_DARK.toFixed(1) + 'px (띠도 호를 따라간다)',
            dk.every(v => v >= MIN_DARK), DARK_DEGS.map((d, i) => d + '°:' + dk[i].toFixed(1)).join(' '));
        }
        await page.evaluate(() => {
          const st = document.createElement('style'); st.id = 'v409box';
          st.textContent = '.stab.on::before{top:0!important;bottom:0!important;border-radius:30px!important;'
            + '-webkit-mask-image:none!important;mask-image:none!important}';
          document.head.appendChild(st);
        });
        await page.waitForTimeout(180);
        await shoot(page);
        for (const corner of Object.keys(botBev)) {
          const bOff = [], dOff = [];
          for (const dg of BEV_DEGS) bOff.push(bevelRun(await ray(page, p, corner, dg)));
          for (const dg of DARK_DEGS) dOff.push(darkRun(await ray(page, p, corner, dg)));
          const f = a => a.map(v => v.toFixed(1)).join(' / ');
          /* ⚠ «전 각도에서 두꺼워진다» 로는 못 쓴다 — 4회차는 어두운 띠를 **두껍게** 만들었고
             그만큼 베벨의 시작점이 안으로 밀려 바닥 쪽(75°) 한 각도는 오히려 얇아진다(ref 도 같은
             구조다: 바닥 쪽은 «띠 6.2 + 베벨 7.2» 로 둘이 자리를 나눈다). 그래서 «**가장 얇은 각도가
             올라간다**» 로 묻는다 — 축이 하나 무너지면 그 각도가 최솟값이 되어 곧바로 빨개진다. */
          ok('[9-R] ' + name + ' ' + corner + ' — 옛 상자로 되돌리면 띠 뒤 베벨의 최악 각도가 내려간다',
            botBev[corner].every(v => v >= MIN_BEV) && Math.min(...botBev[corner]) > Math.min(...bOff),
            '켬 ' + f(botBev[corner]) + '(최악 ' + Math.min(...botBev[corner]).toFixed(1) + ')'
            + '  ↔  끔 ' + f(bOff) + '(최악 ' + Math.min(...bOff).toFixed(1) + ')');
          ok('[10-R] ' + name + ' ' + corner + ' — 옛 상자로 되돌리면 어두운 띠가 ' + MIN_DARK.toFixed(1) + ' 아래로 무너진다',
            darkOn[corner].every(v => v >= MIN_DARK) && dOff.some(v => v < MIN_DARK),
            '켬 ' + f(darkOn[corner]) + '  ↔  끔 ' + f(dOff));
          if (bOff.some(v => v < MIN_BEV)) collapsed++;
        }
        await page.evaluate(() => { const st = document.getElementById('v409box'); if (st) st.remove(); });
        await page.waitForTimeout(150);
        await shoot(page);
      }
    }
    ok('[8-Δ] 아래 코너를 4 면 이상 껐다 켰다 (Δ0 항이 공허하지 않다)', deltaFaces >= 4, deltaFaces + '면');
    ok('[9-R] 옛 상자로 되돌리면 MIN_BEV(' + MIN_BEV.toFixed(1) + ') 아래로 무너지는 면이 실제로 있다 (선 자체가 문다)',
      collapsed >= 2, collapsed + '면');
    ok('[9]·[10] 을 가운데 칸 아래 코너 4 면 이상에서 쟀다 (표본이 공허하지 않다)', midFaces >= 4, midFaces + '면');
    ok('[E] 끝 칸도 표본에 있다 («가운데만 본다» 가 회피가 아님을 보인다)', endCells >= 2, endCells + '칸');
    ok('링이 살아 있는 면을 8 면 이상 쟀다', faces >= 8, faces + '면');
    ok('378 이 넘긴 면도 실제로 있었다 (음성항이 공허하지 않다)', offFaces >= 2, offFaces + '면');

    /* ---- R. 되돌림 시험 ---- */
    console.log('\n[R] 되돌림 시험 — 옛 «가로 평행이동 밴드» 를 도로 주입하면 빨개진다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(800);
    await page.evaluate(SETTLE);
    const p0 = await page.evaluate(PILL, '#bSk .stabs');
    await shoot(page);
    const on60 = blackNorm(await ray(page, p0, 'BL', 60));
    const inkOn = await countInk(page, { x: Math.round(p0.x), y: Math.round(p0.y), w: Math.round(p0.w), h: PILL_H });
    ok('R1 지금은 60° 가 ≥ ' + MIN_TH.toFixed(1), on60 >= MIN_TH, on60.toFixed(1) + 'px');

    /* R2 — 링을 끄고 **수리 전 그 밴드**(`inset ±7px 0 0 #000`)를 그대로 되살린다.
       «링을 끄기만» 하면 검정이 통째로 0 이 되어 «밴드와 링을 구별하는가» 를 못 묻는다. */
    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v409band';
      s.textContent = '.stab.on::after{box-shadow:none!important}'
        + '.stab.on{box-shadow:inset 7px 0 0 #000,inset -7px 0 0 #000,var(--pill-l),var(--pill-r)!important}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(200);
    await shoot(page);
    const band60 = blackNorm(await ray(page, p0, 'BL', 60));
    const band45 = blackNorm(await ray(page, p0, 'BL', 45));
    ok('R2 옛 밴드를 주입하면 60° 가 7·cos60 = 3.5 근처로 떨어진다 (게이트가 실제로 가른다)',
      band60 <= 4.5, band60.toFixed(1) + 'px (45° ' + band45.toFixed(1) + 'px)');
    const inkBand = await countInk(page, { x: Math.round(p0.x), y: Math.round(p0.y), w: Math.round(p0.w), h: PILL_H });
    ok('R3 라벨 잉크 픽셀 수는 Δ0 — 링은 글자를 한 픽셀도 안 먹는다',
      inkOn === inkBand && inkOn > 0, '링 ' + inkOn + ' ↔ 밴드 ' + inkBand);
    await page.evaluate(() => { const s = document.getElementById('v409band'); if (s) s.remove(); });

    /* R4 — 마스크를 걷으면 링이 네 면 전부에 둘러져 [3] 이 빨개진다(음성항이 일을 한다). */
    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v409mask';
      s.textContent = '.stab.on::after{-webkit-mask-image:none!important;mask-image:none!important}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(200);
    await shoot(page);
    const topOff = await vscan(page, p0, 'T');
    ok('R4 마스크를 걷으면 상변 한복판에 검정이 생긴다 ([3] 이 공허하지 않다)',
      topOff.slice(4).includes('K'), topOff);
    await page.evaluate(() => { const s = document.getElementById('v409mask'); if (s) s.remove(); });
    await page.waitForTimeout(200);
    await shoot(page);
    const back60 = blackNorm(await ray(page, p0, 'BL', 60));
    const topBack = await vscan(page, p0, 'T');
    ok('R5 주입을 걷으면 다시 등폭이고 상변은 검정 0',
      back60 >= MIN_TH && !topBack.slice(4).includes('K'), back60.toFixed(1) + 'px / ' + topBack);

    /* R6·R7 — **[8] 의 되돌림.** 2회차가 넣은 것은 `::after` 의 배경 동심 고리 한 벌뿐이라
       그것만 떼면 1회차 상태가 그대로 돌아온다. 떼서 위 코너가 무너지고(R6) 아래 코너는
       Δ0 이어야(R7) [8] 이 «이미 참인 것을 굳힌 항» 이 아니라는 것이 증명된다 —
       R7 이 곧 «384 를 한 픽셀도 안 건드렸다» 의 가장 짧은 증거이기도 하다. */
    const bevOn = [], dOn = [];
    for (const dg of BEV_DEGS) { bevOn.push(innerRun(await ray(page, p0, 'TL', dg))); dOn.push(innerRun(await ray(page, p0, 'BL', dg))); }
    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v409bev';
      s.textContent = '.stab.on::after{background:none!important}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(200);
    await shoot(page);
    const bevOff = [], dOff = [];
    for (const dg of BEV_DEGS) { bevOff.push(innerRun(await ray(page, p0, 'TL', dg))); dOff.push(innerRun(await ray(page, p0, 'BL', dg))); }
    const fmtI = a => BEV_DEGS.map((d, i) => d + '°:' + a[i][0] + a[i][1].toFixed(1)).join(' ');
    /* ⚠ 4회차부터는 «떼면 5.0 아래로 무너진다» 가 아니다 — `::before` 가 동심 윤곽으로 옮겨 오면서
       위 코너 베벨도 **일부는 그 층이** 그린다(떼도 5.0~6.0 이 남는다). 두 층이 같은 자리를 나눠
       그리므로, 이 항이 묻는 것은 «`::after` 고리가 그 값을 실제로 끌어올리는가» 다 —
       가장 얇은 각도가 내려가면 빨개진다(떼면 6.0 → 5.0). */
    ok('R6 배경 동심 고리를 떼면 위 코너 베벨의 최악 각도가 내려간다 ([8] 이 공허하지 않다)',
      bevOn.every(r => r[0] === 'B' && r[1] >= MIN_BEV)
      && Math.min(...bevOn.map(r => r[1])) > Math.min(...bevOff.map(r => r[1])),
      '켬 ' + fmtI(bevOn) + '  ↔  끔 ' + fmtI(bevOff));
    ok('R7 같은 조작으로 **아래** 코너는 Δ0 — 384 의 바닥 띠 감김은 이 고리와 무관하다',
      dOn.every((r, i) => r[0] === dOff[i][0] && Math.abs(r[1] - dOff[i][1]) < 0.01),
      '켬 ' + fmtI(dOn) + '  ↔  끔 ' + fmtI(dOff));
    await page.evaluate(() => { const s = document.getElementById('v409bev'); if (s) s.remove(); });
    await page.waitForTimeout(200);
    await shoot(page);

    /* ---- 6. 조작 ---- */
    console.log('\n[6] 조작 — 링이 클릭을 안 가로챈다');
    const hit = await page.evaluate(sel => {
      const bar = document.querySelector(sel);
      const cells = [...bar.querySelectorAll(':scope > .stab')];
      const on = cells.findIndex(c => c.classList.contains('on'));
      const b = cells[on].getBoundingClientRect();
      const el = document.elementFromPoint(b.x + 8, b.y + b.height - 8);   /* 링이 덮는 코너 */
      return { tag: el ? (el.className || el.tagName) : null,
        inside: !!el && (el === cells[on] || cells[on].contains(el)) };
    }, '#bSk .stabs');
    ok('링이 덮는 코너 자리의 히트 테스트가 활성 칸으로 간다', hit.inside, String(hit.tag));

    console.log('\n[7] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 80) : ''));
  } catch (e) {
    ok('게이트 실행', false, String(e && e.message || e).slice(0, 200));
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY409 ' + pass + '/' + (pass + fail) + '  ' + (fail ? fail + ' FAIL' : 'ALL PASS'));
  process.exit(fail ? 1 : 0);
})();
