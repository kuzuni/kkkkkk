/* 작업 384 게이트 — «활성 알약의 **가로 띠**가 코너를 감고 올라간다».
 *
 *   node tools/verify384.js
 *
 * 잡는 것 하나:
 *   ref 는 알약 바닥의 어두운 띠(#413122)와 그 위 베벨(#634F37), 그리고 상단 베벨이
 *   **코너 반경을 따라 안쪽으로 감겨 올라간다**. 우리는 그 셋이 `linear-gradient` 의
 *   **수평 줄**이라 코너에서 잘려 나갔고, 그 자리를 (반경을 따라 평행이동한) 옆띠가 덮었다.
 *   `tools/probe384.py` 실측(07 활성 «스킬» 알약 좌 코너, rel 행별 클래스 런):
 *       ref  rel 68  K7 **D5** B10      ↔ 수리 전 cap  rel 68  K6 B6 F9   (D **0px**)
 *       ref  rel 74  K8 **D8** F1 B1    ↔ 수리 전 cap  rel 74  K6 B11     (D **0px**)
 *
 * ⚑ **찍힌 픽셀로 본다**(350 처방) — 선언만 물면 «의사요소는 있는데 안 보인다» 를 놓친다.
 *
 * ⚑ **세 갈래를 다 문다.** 한 갈래만 물면 무른 게이트가 된다(LESSONS 328·334):
 *     [2] 코너 — 옆띠 다음에 어두운 띠가 **있어야** 한다 (감김)
 *     [3] 세로 한복판 — 거기엔 어두운 띠가 **없어야** 한다 (띠를 옆면 전체로 번지게 한 게 아니다)
 *     [4] 위 코너 — 거기에도 어두운 띠가 **없어야** 한다 (아래쪽만 감긴다)
 *   그리고 [5] 는 «아래로 갈수록 두꺼워진다» 를 물어 **호(弧)** 임을 못박는다 —
 *   폭이 일정하면 그건 또 하나의 수평 줄일 뿐이다.
 *
 * ⚑ **§R 되돌림 시험** — 의사요소의 그림자를 끄면 코너의 어두운 띠가 **0px 로 돌아가야** 한다.
 *   이게 없으면 «원래부터 감겨 있던 것을 게이트로 굳힌 것» 과 구분이 안 된다(338 교훈).
 *   §R3 은 같은 대조로 **라벨 잉크 픽셀 수가 Δ0** 임을 못박는다 — 이 띠는 글자 위에 그려지므로
 *   «글자를 한 픽셀도 안 먹는다» 가 처방의 전제다(라벨 잉크 rel 20~57 · 띠 rel 78~85 + 코너).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '384.png');

/* 437 (2026-08-30) 이관 — 알약 상자 85 → **84**(셸 98/테두리 7/칸 84 한 덩어리 · probe437).
   ⚠ **아래 ROWS 를 리터럴로 두면 안 된다** — 감김은 **아래 코너**(중심 y = PILL_H − 30)의 호에서
   나오므로 rel 을 위에서 세면 상자가 1 줄어들 때 표본이 호 위에서 한 칸 위로 미끄러진다
   (실제로 [5] «rel 74 가 rel 68 보다 두껍다» 가 9 → 8 로 뒤집혀 빨개졌다). 아래 코너 기준
   («하변에서 17 · 11 위») 으로 다시 적는다 — 85 시절 값 68·74 와 같은 자리다. */
const PILL_H = 84;
const BLACK = '#000000';
const BEVEL = '#634F37';    /* 알약 베벨 (352 6회차) */
const FACE = '#4B3E2D';     /* 채움면 */
const DARK = '#413122';     /* 바닥 어두운 띠 — 384 가 코너까지 돌린 그 색 */
const RIM = '#705F4B';
const SHELL = '#61523D';
const INK = '#F2BC8D';      /* 활성 라벨 색 */

/* 감김 폭은 반경 30 의 호에서 나온다: 행 rel 에서 D 폭 = x1(rel+7) − x1(rel).
   rel 68 → 4.7 · rel 74 → 8.2 (probe384.py §ⓓ 와 같은 값). 여유 ±2 로 문다. */
/* ⚑ 409 이관 (2026-08-29) — **검정이 «등폭 링» 이 되면서 이 창이 좁아졌다.**
   384 당시 옆띠는 가로 평행이동이라 코너에서 법선 두께가 7·cosα 로 얇아졌고, 그만큼
   어두운 띠가 바깥으로 더 나와 보였다(rel 74 에서 D 8~9px). 409 가 옆띠를 법선 7 로 되돌리자
   그 7 이 D 의 **바깥 몫을 도로 가져갔다** — ref 도 같은 그림이다(ref rel 74 `K8 D8`,
   우리 `K10 D5`: 둘의 «검정+D» 합은 16 ↔ 15 로 1px 안이다).
   ⇒ 기대값을 실측(rel 68 → 3 · rel 74 → 5)에서 **1px 여유**로 다시 잡는다. 무르게 푼 게
   아님은 세 겹이 못박는다: [3]·[4] 음성항(한복판·위 코너는 0) · [5] «아래로 갈수록 두껍다» ·
   §R 되돌림(띠를 끄면 0). 그리고 **[2b] 가 새로 «검정+D 합»** 을 물어 링이 D 를 통째로
   먹어 버리는 길을 막는다(합이 줄면 빨개진다). */
const ROWS = [
  { rel: PILL_H - 17, min: 2, sum: 8 },
  { rel: PILL_H - 11, min: 4, sum: 12 },
];

/* ⚑ 438 이관 (2026-08-30) — **가로 행은 45° 언저리에서 멈춘다.**
   알약 반경 30 · 높이 85 라 좌하 코너 원 중심은 rel 55 이고, 법선 각 α 의 바깥 점은
   rel = 55 + 30·sin α 다:  30° → 70.0 · 45° → 76.2 · 60° → 81.0 · 75° → 84.0.
   위 ROWS 는 rel 68·74 뿐이라 **60° 아래를 한 번도 안 본다.**
   `tools/probe438.js` 가 그 자리를 가로 행으로 재 보고 «행으로는 못 본다» 를 값으로 못박았다
   (03 던전 좌): rel 76 은 수리 후 D 6px ↔ 수리 전 5px 로 **1px** 차이뿐이고,
   rel 78 부터는 행이 호 밖으로 나가 D 가 양쪽 다 0 이다.
   ⇒ 이 자리는 **행이 아니라 법선(각도)** 으로만 물을 수 있다.
   ⚑ **438 이 실제로 그 구멍에서 났다** — 수리 전 트리(`V384_SRC=.v438-pre.html`)에 이 자를
   돌리면 [2]·[2b]·[5] 가 **전부 초록**이다(95/96, 유일한 빨강은 409 가 4회차에 넣은 «선언» 항).
   이 파일 서두가 «선언만 물면 «있는데 안 보인다» 를 놓친다» 라고 적어 둔 바로 그 함정이라
   여기서 닫는다.
   ⚑ **자리의 소유는 384 다.** 지금 같은 값을 `verify409` [10] 이 «어두운 띠(384) 축» 이라는
   이름으로 **빌려** 들고 있다 — 409 의 주제는 검정 등폭 링이므로, 그 축이 나중에 다시
   범위를 잡으면 384 의 성질은 아무도 안 보게 된다. 그래서 owner 사본을 여기 세운다. */
const DEEP_DEGS = [60, 75];
const MIN_DEEP = 4.0;   /* 수리 후 6.0 ↔ 수리 전 0.0~2.5 사이에 그은 선 (409 [10] 과 같은 값) */
const R = 30;           /* 알약 코너 반경 */

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

/* ── 픽셀 → 팔레트 글자. 코너는 AA 가 섞이므로 «가장 가까운 색» 으로 읽고,
      길이 1 짜리 런(=AA 한 줄)은 런 목록에서 접는다. ───────────────────── */
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
  const s = hexes.map(cls);
  const out = [];
  for (const ch of s) {
    if (out.length && out[out.length - 1].c === ch) out[out.length - 1].n++;
    else out.push({ c: ch, n: 1 });
  }
  return out;
}
/* AA 한 줄을 접는다 — 길이 1 런은 버리고 양옆이 같으면 합친다 */
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

/* ── 스크린샷을 페이지 안 캔버스에 한 번 올려 두고, 이후 질의는 그 위에서 한다 ── */
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
      window.__v384 = c.getContext('2d');
      res([im.width, im.height]);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}
const scan = (page, y, x0, n, dx) => page.evaluate(([yy, xx, nn, d]) => {
  const g = window.__v384, out = [];
  for (let i = 0; i < nn; i++) {
    const p = g.getImageData(xx + i * d, yy, 1, 1).data;
    out.push('#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase());
  }
  return out;
}, [y, x0, n, dx]);
const countInk = (page, box) => page.evaluate(([b, ink]) => {
  const g = window.__v384;
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
  /* 409 — 가로 띠 의사요소는 ::before 로 내려갔다(칠 순서만 바뀌었다: 검정 등폭 링이
     ::after 로 그 **위**에 온다). 묻는 것은 그대로 «어느 상자의 코너를 도는가» 다. */
  const cs = getComputedStyle(on, '::before');
  const ring = getComputedStyle(on, '::after');
  const st = getComputedStyle(on);
  return {
    x: b.x, y: b.y, w: b.width, h: b.height,
    label: (on.querySelector('i') || {}).textContent || '',
    pe: cs.pointerEvents, shadow: cs.boxShadow, radius: cs.borderRadius,
    left: cs.left, right: cs.right, top: cs.top, bottom: cs.bottom,
    ringSh: ring.boxShadow, ringMask: ring.maskImage || ring.webkitMaskImage || '',
    /* 378 의 손잡이로 «어느 면이 셸에 닿는가» 를 읽는다(자리를 셀렉터로 다시 적지 않는다).
       449 가 그 면의 층 순서를 바꿨으므로 아래 `wrapAt` 이 면마다 다른 것을 묻는다. */
    touchL: /(^|\s)7px/.test(st.getPropertyValue('--pill-l').trim()),
    touchR: /-7px/.test(st.getPropertyValue('--pill-r').trim()),
  };
};

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* 한 코너 행을 읽어 «옆띠 → 어두운 띠 → 베벨» 을 찾는다.
   side 'L' 은 알약 좌변에서 오른쪽으로, 'R' 은 우변에서 왼쪽으로 훑는다. */
/* ⚠ **옆띠를 «처음 나오는 검정» 으로 찾으면 안 된다** — 378 이 끝 칸의 그 면을 셸 테두리에
   넘겼기 때문에, 끝 칸(10 상점 좌 등)에서는 스캔이 **셸 검정 6** 을 먼저 만나고 알약의 옆띠는
   그 다음 베벨이다(`K4 B6 D4 B10`). 그래서 **어두운 띠를 먼저 찾고 그 앞 런이 옆띠인지** 를 묻는다.
   두 갈래(검정 옆띠 · 베벨 옆띠)가 한 자로 읽힌다. */
/* ⚑ **449 이관 (2026-08-30) — 면에 따라 «앞에 오는 것» 이 다르다.**
   여기까지의 자는 «어두운 띠 앞에는 두께 ≥4 의 **옆띠**(검정 링이든 베벨 밴드든)가 있다» 를
   두 갈래로 한꺼번에 물었다. 449 가 닫은 뒤로 그 문장은 **셸에 닿는 면에서 거짓**이다 —
   그 면엔 알약 자신의 검정이 없고(378), 449 가 세 띠를 «검정 안쪽» 이 아니라 **알약 윤곽**에서
   시작하게 만들었으므로 어두운 띠 앞에 오는 것은 **셸의 검정뿐**이고 그 두께는 셸의 몫이다
   (스캔 창이 알약 밖 2px 부터라 3~5px 로 읽힌다 — 알약의 값이 아니다).
   ref 가 그 순서다: `python3 tools/probe449.py`(03 «던전» 우하) = **셸 검정 → D → B → 면**.
   ⇒ 값을 넓히지 않고 **면마다 다른 것을 묻는다**:
       · 안 닿는 면 — 그대로 «옆띠(≥4) → D»
       · 닿는 면    — «셸 검정 → D» 이고, 그 앞에 **베벨 옆띠(B ≥4)가 없어야** 한다.
         (있으면 449 이전 = `--pill-l` 가로 밴드가 띠 앞에 깔린 상태다. [2b] 가 그것을 문다.) */
function wrapAt(rs, touch) {
  if (touch) {
    const i = rs.findIndex((r, k) => r.c === 'D' && r.n >= 3 && k > 0 && rs[k - 1].c === 'K');
    const preB = rs.slice(0, i < 0 ? rs.length : i).some(r => r.c === 'B' && r.n >= 4);
    /* 못 찾은 자리(세로 한복판·위 코너)는 «띠가 없는 것이 정답» 이다 — [3]·[4] 가 그것을 문다.
       그 두 항은 «옆띠 자체는 있다» 도 같이 묻는데, 닿는 면의 옆띠는 검정이 아니라 **베벨**이므로
       안 닿는 면과 같은 폴백(첫 K|B 런 ≥4)으로 돌려준다(`K2 B7 F21` → B7). */
    if (i < 0) {
      const b = rs.find(r => (r.c === 'K' || r.c === 'B') && r.n >= 4) || null;
      return { band: b, dark: 0, next: null, preB, touch: true, txt: fmt(rs) };
    }
    return { band: rs[i - 1], dark: rs[i].n, next: rs[i + 1] || null, preB, touch: true, txt: fmt(rs) };
  }
  const i = rs.findIndex((r, k) => r.c === 'D' && r.n >= 3 && k > 0
    && (rs[k - 1].c === 'K' || rs[k - 1].c === 'B') && rs[k - 1].n >= 4);
  if (i < 0) {
    const b = rs.find(r => (r.c === 'K' || r.c === 'B') && r.n >= 4) || null;
    return { band: b, dark: 0, next: null, preB: false, touch: false, txt: fmt(rs) };
  }
  return { band: rs[i - 1], dark: rs[i].n, next: rs[i + 1] || null, preB: false, touch: false, txt: fmt(rs) };
}

/* ── 438 — 코너 원 중심에서 **법선**으로 쏘는 광선. 기하는 `verify409` 의 `ray` 와 같게 둔다
      (두 자가 다른 기하로 같은 자리를 말하면 값을 견줄 수 없다).
      d = 0 이 윤곽이고 안쪽으로 `inn` px 까지 읽는다 — **바깥은 안 읽는다**: 셸에 닿는 면은
      바로 밖이 셸 검정 6px 이라 밖을 읽으면 378 이 넘긴 면까지 «검정이 있다» 로 읽힌다. */
const ray = (page, p, corner, deg, inn = 20, step = 0.5) => page.evaluate(([box, cor, dg, i2, st, pal, r]) => {
  const g = window.__v384;
  const a = dg * Math.PI / 180;
  const bottom = cor[0] === 'B', right = cor[1] === 'R';
  const cx = box.x + (right ? box.w - r : r);
  const cy = box.y + (bottom ? box.h - r : r);
  const ux = (right ? 1 : -1) * Math.cos(a);
  const uy = (bottom ? 1 : -1) * Math.sin(a);
  const near = (R2, G2, B2) => {
    let best = '?', bd = Infinity;
    for (const [ch, hex] of pal) {
      const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      const d2 = (R2 - rr) ** 2 + (G2 - gg) ** 2 + (B2 - bb) ** 2;
      if (d2 < bd) { bd = d2; best = ch; }
    }
    return best;
  };
  let s = '';
  for (let d = 0; d <= i2 + 1e-9; d += st) {
    const px = Math.round(cx + ux * (r - d)), py = Math.round(cy + uy * (r - d));
    const q = g.getImageData(px, py, 1, 1).data;
    s += near(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, corner, deg, inn, step, PAL, R]);

/* 광선 위에서 «검정 옆띠 **다음**에 오는 어두운 띠» 의 법선 두께.
   ⚠ 검정을 먼저 만나야 한다(k ≤ 6) — 알약 밖에서 시작한 광선이 아님을 그것이 보증한다.
   ⚠ D 가 아닌 두꺼운 런이 먼저 나오면 **0** 이다: 438 이 잡힌 자리가 정확히 그 모양이었다
     (03 던전 좌하 75° 가 `B8.0` — 어두운 띠 자리에 베벨이 나왔다). */
function deepDark(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  const k = rs.findIndex(r => r[0] === 'K');
  if (k < 0 || k > 6) return 0;
  for (let i = k + 1; i < rs.length; i++) {
    if (rs[i][0] === 'D' && rs[i][1] * step >= 2.0) return rs[i][1] * step;
    if (rs[i][1] * step >= 2.0) return 0;
  }
  return 0;
}
const deepLine = a => DEEP_DEGS.map((d, i) => d + '°:' + a[i].toFixed(1)).join(' ');
async function deepRead(page, p, corner) {
  const out = [];
  for (const dg of DEEP_DEGS) out.push(deepDark(await ray(page, p, corner, dg)));
  return out;
}

async function readCorner(page, p, rel, side, n = 30) {
  const y = Math.round(p.y + rel);
  const x0 = side === 'L' ? Math.round(p.x) - 2 : Math.round(p.x + p.w) + 1;
  return fold(runs(await scan(page, y, x0, n, side === 'L' ? 1 : -1)));
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto('file://' + path.resolve(process.env.V384_SRC || path.join(ROOT, 'index.html')));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });

    /* ---- 1. 선언 ---- */
    console.log('\n[1] 선언 — 가로 띠는 «검정 안쪽 상자»(좌·우 7 인셋) 의 코너를 돈다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(800);
    await page.evaluate(SETTLE);
    const d0 = await page.evaluate(PILL, '#bSk .stabs');
    ok('활성 알약을 찾았다', !!d0, d0 ? d0.label + ' ' + Math.round(d0.w) + '×' + Math.round(d0.h) : '없음');
    ok('알약 높이 = ' + PILL_H, !!d0 && Math.abs(d0.h - PILL_H) <= 0.6, d0 ? d0.h.toFixed(2) : '—');
    ok('`::before` 가 좌·우 7px 인셋 상자다 (검정 «안쪽» 윤곽)',
      !!d0 && d0.left === '7px' && d0.right === '7px', d0 ? d0.left + ' / ' + d0.right : '—');
    /* 409 4회차 이관 (2026-08-30) — **이 항의 전제가 바뀌었다.** «반경 30» 의 근거는 «이 상자는 검정
       가로 밴드의 내변을 **평행이동**한 것이고 평행이동은 반경을 안 바꾼다» 였다. 409 가 검정을
       **동심 등폭 링**으로 바꾸면서 그 내변이 «사방 7 인셋 · 반경 23» 인 **동심 윤곽**이 됐고,
       가운데 칸의 `::before` 는 그리로 옮겨 갔다(그래야 띠가 호를 따라간다 — CY·CZ·DA 3인 독립).
       셸에 닿는 끝 칸은 그 면에 검정이 없어(378) 옛 상자를 그대로 쓴다.
       ⇒ 값을 갈아 끼우는 대신 **두 경우를 다 묻고, 둘을 잇는 불변식까지 묻는다**:
          «가로 인셋 + 반경 = 알약 반경 30» — 상자가 어느 쪽이든 코너 중심의 x 가 알약과 같다는 뜻이고,
          이것이 384 가 «평행이동» 으로 말하려던 바로 그 성질이다. 무르게 푼 게 아니다:
          옛 상자를 가운데 칸에 되돌리면 세로 인셋이 0 이라 아래 [2]·[5] 가 즉시 빨개진다. */
    /* 409 5회차 이관 (2026-08-30) — **전제가 또 한 칸 움직였다.** 4회차는 검정이 «동심 등폭 링» 이라
       그 내변이 «사방 7 인셋 · r23»(코너 중심 x = 30)이었다. 5회차는 검정을 **테이퍼 프레임 한 쌍**
       (`inset ±d 0 0 s` · d+s = 7)으로 바꿔 코너에서 가늘어지게 했고, 그 두 구멍의 교집합 —
       즉 검정의 새 안쪽 윤곽 — 은 «좌·우 7 · 상·하 s 인셋 · 반경 30−s» 이고 코너 중심 x 는 **30 + d** 다.
       ⇒ 값을 또 적어 넣지 않는다. **d 를 링에서 읽어 상자를 유도**하므로 상자와 링은 따로 놀 수 없고,
          d=0 이면 4회차(30 · r23) · d=7 이면 끝 칸의 옛 평행이동(37 · r30)으로 **한 식이 세 경우를 덮는다.** */
    const rf0 = d0 ? [...d0.ringSh.matchAll(/rgb\(0, 0, 0\) (-?[\d.]+)px 0px 0px ([\d.]+)px inset/g)] : [];
    const dTap = rf0.length === 2 ? Math.abs(parseFloat(rf0[0][1])) : 0;
    const endBox = !!d0 && d0.top === '0px' && d0.bottom === '0px';
    const boxOK = d0 && (endBox
      ? /^30px/.test(d0.radius)
      : (Math.abs(parseFloat(d0.top) - (7 - dTap)) < 0.6
         && Math.abs(parseFloat(d0.bottom) - (7 - dTap)) < 0.6
         && Math.abs(parseFloat(d0.radius) - (23 + dTap)) < 0.6));
    ok('그 상자가 «검정의 안쪽 윤곽(좌·우 7 · 상·하 ' + (7 - dTap) + ' · r' + (23 + dTap) + ')» 이거나 «옛 평행이동 상자(r30)» 다',
      !!boxOK, d0 ? (d0.radius + ' · top ' + d0.top + ' · bottom ' + d0.bottom) : '—');
    ok('어느 쪽이든 «가로 인셋 + 반경 = 30 + d(테이퍼 깊이 ' + dTap + ')» — 코너 중심 x 가 링 구멍과 같다',
      !!d0 && Math.abs(parseFloat(d0.left) + parseFloat(d0.radius) - (endBox ? 37 : 30 + dTap)) < 0.6,
      d0 ? (d0.left + ' + ' + d0.radius + ' = ' + (parseFloat(d0.left) + parseFloat(d0.radius))) : '—');
    ok('세 띠가 다 걸려 있다 — 바닥 ' + DARK + ' 7 · 바닥 베벨 14 · 상단 베벨 7',
      !!d0 && /inset/.test(d0.shadow) && (d0.shadow.match(/inset/g) || []).length === 3,
      d0 ? d0.shadow.replace(/\s+/g, ' ').slice(0, 110) : '—');
    ok('`pointer-events:none` — 클릭은 그대로 칸이 받는다', !!d0 && d0.pe === 'none', d0 ? d0.pe : '—');
    /* 409 — 이 띠가 «검정 밑» 에 있다는 전제가 이제 **칠 순서**로 성립한다(::before < ::after).
       링이 사라지면 이 게이트의 기대값(아래 ROWS)도 같이 틀려지므로 여기서 한 번 묻는다. */
    ok('그 위에 409 의 검정 테이퍼 프레임 한 쌍(`::after`)이 얹혀 있다 (오프셋 + 스프레드 = 7)',
      rf0.length === 2 && Math.abs(dTap + parseFloat(rf0[0][2]) - 7) < 0.01, d0 ? d0.ringSh : '—');

    /* ---- 2·3·4·5. 찍힌 픽셀 ---- */
    console.log('\n[2] 코너 — 옆띠 다음에 어두운 띠 ' + DARK + ' 가 있다 (감김)');
    console.log('[3] 세로 한복판 — 거기엔 어두운 띠가 없다 (옆면 전체로 번지게 한 게 아니다)');
    console.log('[4] 위 코너 — 거기에도 없다 (아래쪽만 감긴다)');
    console.log('[5] 아래로 갈수록 두꺼워진다 — 수평 줄이 아니라 호(弧)다\n');
    let samples = 0, deep = 0;
    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { ok(name + ' 진입', false, e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const p = await page.evaluate(PILL, sel);
      if (!p) { ok(name + ' 활성 알약 측정', false, '못 찾음'); continue; }
      await shoot(page);
      for (const side of ['L', 'R']) {
        const tag = name + '«' + p.label + '» ' + (side === 'L' ? '좌' : '우');
        const touch = side === 'L' ? !!p.touchL : !!p.touchR;
        const w = [];
        for (const r of ROWS) w.push(wrapAt(await readCorner(page, p, r.rel, side), touch));
        for (let i = 0; i < ROWS.length; i++) {
          ok('[2] ' + tag + ' rel ' + ROWS[i].rel + ' — 어두운 띠 ≥ ' + ROWS[i].min + 'px',
            w[i].dark >= ROWS[i].min, 'D ' + w[i].dark + 'px : ' + w[i].txt);
          if (touch) {
            /* [2b] 449 — 이 면엔 옆띠가 없으므로 «합» 은 물을 것이 없다. 대신 그 면에서만
               성립하는 것을 문다: **어두운 띠 앞에 베벨 옆띠가 없다**(= 세 띠가 알약 윤곽에서 시작한다).
               449 를 되돌리면(`::before` 가로 인셋 7) 곧바로 `B` 가 앞에 깔려 빨개진다. */
            ok('[2b] ' + tag + ' rel ' + ROWS[i].rel + ' — 어두운 띠 **앞**에 베벨 옆띠가 없다 (449)',
              !w[i].preB, w[i].txt);
          } else {
            /* [2b] 409 — «옆띠 + 어두운 띠» 합. 링이 D 를 밀어내 가져간 몫까지 세므로
               둘 중 하나가 얇아지면(또는 링이 D 를 통째로 먹으면) 여기서 잡힌다. */
            const sum = (w[i].band ? w[i].band.n : 0) + w[i].dark;
            ok('[2b] ' + tag + ' rel ' + ROWS[i].rel + ' — 옆띠+어두운 띠 합 ≥ ' + ROWS[i].sum + 'px',
              sum >= ROWS[i].sum, '합 ' + sum + 'px : ' + w[i].txt);
          }
        }
        ok('[2] ' + tag + ' — 어두운 띠 **다음**이 베벨 ' + BEVEL + ' 이다 (면이 바로 안 온다)',
          !!w[0].next && (w[0].next.c === 'B' || w[0].next.c === 'D'),
          w[0].next ? w[0].next.c + w[0].next.n : '없음');
        ok('[5] ' + tag + ' — rel ' + ROWS[1].rel + ' 가 rel ' + ROWS[0].rel + ' 보다 두껍다 (호)',
          w[1].dark > w[0].dark, w[0].dark + ' → ' + w[1].dark + 'px');
        const mid = wrapAt(await readCorner(page, p, 42, side), touch);
        ok('[3] ' + tag + ' rel 42(한복판) — 어두운 띠 0px · 옆띠 다음은 베벨',
          mid.dark === 0 && !!mid.band, mid.txt);
        const top = wrapAt(await readCorner(page, p, 17, side), touch);
        ok('[4] ' + tag + ' rel 17(위 코너) — 어두운 띠 0px', top.dark === 0, top.txt);
        samples++;
      }
      /* ---- 8. 438 — 깊은 코너(법선 60°·75°). 가로 행이 못 가는 자리다. ----
         ⚠ **가운데 칸(동심 안쪽 윤곽 · r23)만 잰다.** 셸에 닿는 끝 칸은 그 면에 검정이 없어
         (378) 옛 상자를 그대로 쓰고, 거기서는 띠가 수평 줄인 것이 **정답**이다 —
         그 쪽은 `verify409` [E] 가 «옛 상자 그대로» 로 따로 문다. 여기서 두께를 요구하면
         378 이 넘긴 면에 거짓 결함이 선다. */
      /* 409 5회차 — 가운데 칸 판별을 «반경 23» 이 아니라 «**세로 인셋이 0 이 아니다**» 로 바꿨다.
         반경은 테이퍼 깊이 d 를 따라 23+d 로 움직이지만(5회차 27), 끝 칸의 옛 상자는 언제나 세로 인셋 0 이다. */
      if (p.top && parseFloat(p.top) > 0) {
        for (const corner of ['BL', 'BR']) {
          const dk = await deepRead(page, p, corner);
          ok('[8] ' + name + ' ' + corner + ' — 깊은 코너 법선 어두운 띠 ≥ ' + MIN_DEEP.toFixed(1)
            + 'px (rel 68·74 행이 못 보는 자리)', dk.every(v => v >= MIN_DEEP), deepLine(dk));
          deep++;
        }
      }
    }
    ok('실제로 잰 면이 8 면 이상', samples >= 8, samples + '면');
    /* [8] 이 «공허하지 않다» — 가운데 칸이 표본에 실제로 있었는가.
       끝 칸만 남는 트리에서는 위 if 가 통째로 안 돌아 [8] 이 0 항으로 조용히 사라진다. */
    ok('[8] 깊은 코너를 4 면 이상에서 쟀다 (가운데 칸이 표본에 있다)', deep >= 4, deep + '면');

    /* ---- R. 되돌림 시험 ---- */
    console.log('\n[R] 되돌림 시험 — 의사요소(::before)의 그림자를 끄면 코너의 어두운 띠가 0px 로 돌아간다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(800);
    await page.evaluate(SETTLE);
    const p0 = await page.evaluate(PILL, '#bSk .stabs');
    await shoot(page);
    const on68 = wrapAt(await readCorner(page, p0, 68, 'L'));
    const inkOn = await countInk(page, { x: Math.round(p0.x), y: Math.round(p0.y), w: Math.round(p0.w), h: PILL_H });
    ok('R1 지금은 감긴다 (D ≥ 3)', on68.dark >= 3, 'D ' + on68.dark + 'px : ' + on68.txt);

    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v384off';
      /* 409 — 가로 띠는 `::before` 로 내려갔다. `::after` 를 끄면 이제 검정 링이 꺼진다. */
      s.textContent = '.stab.on::before{box-shadow:none!important}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(200);
    await shoot(page);
    const off68 = wrapAt(await readCorner(page, p0, 68, 'L'));
    const inkOff = await countInk(page, { x: Math.round(p0.x), y: Math.round(p0.y), w: Math.round(p0.w), h: PILL_H });
    ok('R2 끄면 0px 로 돌아간다 (게이트가 실제로 잡는다)', off68.dark === 0,
      'D ' + off68.dark + 'px : ' + off68.txt);
    ok('R3 라벨 잉크 픽셀 수는 Δ0 — 이 띠는 글자를 한 픽셀도 안 먹는다',
      inkOn === inkOff && inkOn > 0, '켬 ' + inkOn + ' ↔ 끔 ' + inkOff);

    await page.evaluate(() => { const s = document.getElementById('v384off'); if (s) s.remove(); });
    await page.waitForTimeout(200);
    await shoot(page);
    const back68 = wrapAt(await readCorner(page, p0, 68, 'L'));
    ok('R4 주입을 걷으면 다시 감긴다', back68.dark >= 3, 'D ' + back68.dark + 'px : ' + back68.txt);

    /* R5·R6 (438) — **옛 «평행이동 상자» 를 도로 주입하면 깊은 코너가 무너진다.**
       이게 없으면 [8] 은 «원래 그랬던 것을 게이트로 굳힌 것» 과 구분이 안 된다(338 교훈).
       주입값은 지어낸 것이 아니라 **수리 전 트리의 실측 선언**이다 —
       `probe438` 이 `.v438-pre.html` 에서 읽은 `::before 30px · left 7px · top 0px/0px`.
       ⚠ 위 R2 의 `v384off` 와 달리 그림자를 끄지 않는다: 띠는 그대로 두고 **상자만** 되돌려야
       «호를 따라가는가» 하나만 갈린다. */
    const deepOn = await deepRead(page, p0, 'BL');
    ok('R5 지금은 깊은 코너가 ≥ ' + MIN_DEEP.toFixed(1) + 'px', deepOn.every(v => v >= MIN_DEEP), deepLine(deepOn));
    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v384old';
      s.textContent = '.stab.on::before{top:0!important;bottom:0!important;border-radius:30px!important}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(200);
    await shoot(page);
    const deepOld = await deepRead(page, p0, 'BL');
    /* 409 5회차 이관 — 판정을 «어느 각도가 4.0 아래냐» 에서 «**최솟값이 1.0px 이상 내려가느냐**» 로 옮겼다.
       5회차의 테이퍼가 코너에서 검정을 벗겨 내면서 그 자리를 **부모 그라데이션의 세 띠가 일부 메우게** 됐고,
       그래서 옛 상자를 주입해도 4.5 로 버티는 각도가 생긴다(실측 켬 6.0/6.0 ↔ 끔 4.5/5.0).
       ⚠ 무르게 푼 것이 아니다 — **켠 쪽의 절대 하한(R5 의 MIN_DEEP)은 그대로**이고, 이 항은 그 위에
          «상자를 되돌리면 반드시 나빠진다» 를 얹는다. `verify409` [10-R] 도 같은 처방으로 옮겼다. */
    ok('R6 옛 상자(세로 인셋 0 · r30)를 주입하면 깊은 코너의 최솟값이 1.0px 이상 내려간다',
      Math.min(...deepOn) - Math.min(...deepOld) >= 1.0,
      '켬 ' + deepLine(deepOn) + '(최소 ' + Math.min(...deepOn).toFixed(1) + ')'
      + '  ↔  끔 ' + deepLine(deepOld) + '(최소 ' + Math.min(...deepOld).toFixed(1) + ')');
    await page.evaluate(() => { const s = document.getElementById('v384old'); if (s) s.remove(); });
    await page.waitForTimeout(200);
    await shoot(page);
    const deepBack = await deepRead(page, p0, 'BL');
    ok('R7 주입을 걷으면 다시 ≥ ' + MIN_DEEP.toFixed(1) + 'px', deepBack.every(v => v >= MIN_DEEP), deepLine(deepBack));

    /* 클릭이 그대로 칸으로 간다 — 오버레이가 히트 테스트를 안 가로챈다 */
    console.log('\n[6] 조작 — 오버레이가 클릭을 안 가로챈다');
    const hit = await page.evaluate(sel => {
      const bar = document.querySelector(sel);
      const cells = [...bar.querySelectorAll(':scope > .stab')];
      const on = cells.findIndex(c => c.classList.contains('on'));
      const b = cells[on].getBoundingClientRect();
      const el = document.elementFromPoint(b.x + 14, b.y + b.height - 6);   /* 띠가 덮는 자리 */
      return { on, tag: el ? (el.className || el.tagName) : null,
        inside: !!el && (el === cells[on] || cells[on].contains(el)) };
    }, '#bSk .stabs');
    ok('띠가 덮는 코너 자리의 히트 테스트가 활성 칸으로 간다', hit.inside, String(hit.tag));
    /* ⚠ **진짜 마우스 클릭**으로 친다 — `el.click()` 은 이 바의 핸들러(포인터 계열)를 안 깨운다.
       그리고 노리는 자리는 «다른 칸» 이 아니라 **띠가 덮는 활성 칸의 코너**다: 오버레이가
       히트 테스트를 가로채면 여기서 활성이 안 바뀌는 게 아니라 **아무 일도 안 일어난다**. */
    const geo = await page.evaluate(sel => {
      const bar = document.querySelector(sel);
      const cells = [...bar.querySelectorAll(':scope > .stab')];
      const on = cells.findIndex(c => c.classList.contains('on'));
      const other = cells.findIndex((c, i) => i !== on && !c.classList.contains('lk'));
      if (other < 0) return null;
      const b = cells[other].getBoundingClientRect();
      return { was: on, want: other, label: (cells[other].querySelector('i') || {}).textContent || '',
        x: b.x + b.width / 2, y: b.y + b.height - 6 };
    }, '#bSk .stabs');
    if (geo) await page.mouse.click(geo.x, geo.y);
    await page.waitForTimeout(600);
    /* ⚠ 07 의 칸은 «같은 바 안에서 활성만 옮기는» 것이 아니라 **다른 시트를 연다**(장비·코스튬·펫).
       그래서 «그 바의 idx» 가 아니라 **지금 보이는 바의 활성 라벨**을 묻는다. */
    const nowLabel = await page.evaluate(() => {
      const bars = [...document.querySelectorAll('.stabs')].filter(b => b.getClientRects().length);
      for (const b of bars) {
        const on = b.querySelector(':scope > .stab.on');
        if (on) return (on.querySelector('i') || {}).textContent || '';
      }
      return null;
    });
    ok('다른 칸의 «띠 자리»(하변 −6px) 를 눌러도 그 칸이 열린다',
      !!geo && nowLabel === geo.label, geo ? '«' + geo.label + '» 눌러 → «' + nowLabel + '»' : '표본 없음');

    console.log('\n[7] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 80) : ''));
  } finally { await browser.close(); }

  console.log('\nVERIFY384 ' + pass + '/' + (pass + fail) + '  ' + (fail ? 'FAIL ' + fail : 'ALL PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
