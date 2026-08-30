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

const PILL_H = 85;
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
  { rel: 68, min: 2, sum: 8 },
  { rel: 74, min: 4, sum: 12 },
];

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
  return {
    x: b.x, y: b.y, w: b.width, h: b.height,
    label: (on.querySelector('i') || {}).textContent || '',
    pe: cs.pointerEvents, shadow: cs.boxShadow, radius: cs.borderRadius,
    left: cs.left, right: cs.right, top: cs.top, bottom: cs.bottom,
    ringSh: ring.boxShadow, ringMask: ring.maskImage || ring.webkitMaskImage || '',
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
function wrapAt(rs) {
  const i = rs.findIndex((r, k) => r.c === 'D' && r.n >= 3 && k > 0
    && (rs[k - 1].c === 'K' || rs[k - 1].c === 'B') && rs[k - 1].n >= 4);
  if (i < 0) {
    const b = rs.find(r => (r.c === 'K' || r.c === 'B') && r.n >= 4) || null;
    return { band: b, dark: 0, next: null, txt: fmt(rs) };
  }
  return { band: rs[i - 1], dark: rs[i].n, next: rs[i + 1] || null, txt: fmt(rs) };
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
    const boxOK = d0 && ((/^23px/.test(d0.radius) && d0.top === '7px' && d0.bottom === '7px')
      || (/^30px/.test(d0.radius) && d0.top === '0px' && d0.bottom === '0px'));
    ok('그 상자가 «동심 안쪽 윤곽(7 인셋·r23)» 이거나 «옛 평행이동 상자(r30)» 다',
      !!boxOK, d0 ? (d0.radius + ' · top ' + d0.top + ' · bottom ' + d0.bottom) : '—');
    ok('어느 쪽이든 «가로 인셋 + 반경 = 30» — 코너 중심 x 가 알약과 같다',
      !!d0 && Math.abs(parseFloat(d0.left) + parseFloat(d0.radius) - 30) < 0.6,
      d0 ? (d0.left + ' + ' + d0.radius + ' = ' + (parseFloat(d0.left) + parseFloat(d0.radius))) : '—');
    ok('세 띠가 다 걸려 있다 — 바닥 ' + DARK + ' 7 · 바닥 베벨 14 · 상단 베벨 7',
      !!d0 && /inset/.test(d0.shadow) && (d0.shadow.match(/inset/g) || []).length === 3,
      d0 ? d0.shadow.replace(/\s+/g, ' ').slice(0, 110) : '—');
    ok('`pointer-events:none` — 클릭은 그대로 칸이 받는다', !!d0 && d0.pe === 'none', d0 ? d0.pe : '—');
    /* 409 — 이 띠가 «검정 밑» 에 있다는 전제가 이제 **칠 순서**로 성립한다(::before < ::after).
       링이 사라지면 이 게이트의 기대값(아래 ROWS)도 같이 틀려지므로 여기서 한 번 묻는다. */
    ok('그 위에 409 의 검정 등폭 링(`::after`)이 얹혀 있다',
      !!d0 && /rgb\(0, 0, 0\) 0px 0px 0px 7px inset/.test(d0.ringSh), d0 ? d0.ringSh : '—');

    /* ---- 2·3·4·5. 찍힌 픽셀 ---- */
    console.log('\n[2] 코너 — 옆띠 다음에 어두운 띠 ' + DARK + ' 가 있다 (감김)');
    console.log('[3] 세로 한복판 — 거기엔 어두운 띠가 없다 (옆면 전체로 번지게 한 게 아니다)');
    console.log('[4] 위 코너 — 거기에도 없다 (아래쪽만 감긴다)');
    console.log('[5] 아래로 갈수록 두꺼워진다 — 수평 줄이 아니라 호(弧)다\n');
    let samples = 0;
    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { ok(name + ' 진입', false, e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const p = await page.evaluate(PILL, sel);
      if (!p) { ok(name + ' 활성 알약 측정', false, '못 찾음'); continue; }
      await shoot(page);
      for (const side of ['L', 'R']) {
        const tag = name + '«' + p.label + '» ' + (side === 'L' ? '좌' : '우');
        const w = [];
        for (const r of ROWS) w.push(wrapAt(await readCorner(page, p, r.rel, side)));
        for (let i = 0; i < ROWS.length; i++) {
          ok('[2] ' + tag + ' rel ' + ROWS[i].rel + ' — 어두운 띠 ≥ ' + ROWS[i].min + 'px',
            w[i].dark >= ROWS[i].min, 'D ' + w[i].dark + 'px : ' + w[i].txt);
          /* [2b] 409 — «옆띠 + 어두운 띠» 합. 링이 D 를 밀어내 가져간 몫까지 세므로
             둘 중 하나가 얇아지면(또는 링이 D 를 통째로 먹으면) 여기서 잡힌다. */
          const sum = (w[i].band ? w[i].band.n : 0) + w[i].dark;
          ok('[2b] ' + tag + ' rel ' + ROWS[i].rel + ' — 옆띠+어두운 띠 합 ≥ ' + ROWS[i].sum + 'px',
            sum >= ROWS[i].sum, '합 ' + sum + 'px : ' + w[i].txt);
        }
        ok('[2] ' + tag + ' — 어두운 띠 **다음**이 베벨 ' + BEVEL + ' 이다 (면이 바로 안 온다)',
          !!w[0].next && (w[0].next.c === 'B' || w[0].next.c === 'D'),
          w[0].next ? w[0].next.c + w[0].next.n : '없음');
        ok('[5] ' + tag + ' — rel 74 가 rel 68 보다 두껍다 (호)',
          w[1].dark > w[0].dark, w[0].dark + ' → ' + w[1].dark + 'px');
        const mid = wrapAt(await readCorner(page, p, 42, side));
        ok('[3] ' + tag + ' rel 42(한복판) — 어두운 띠 0px · 옆띠 다음은 베벨',
          mid.dark === 0 && !!mid.band, mid.txt);
        const top = wrapAt(await readCorner(page, p, 17, side));
        ok('[4] ' + tag + ' rel 17(위 코너) — 어두운 띠 0px', top.dark === 0, top.txt);
        samples++;
      }
    }
    ok('실제로 잰 면이 8 면 이상', samples >= 8, samples + '면');

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
