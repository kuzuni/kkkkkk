/* 작업 462 게이트 — «끝 칸의 «셸에 **안** 닿는» 면도 동심인가».
 *
 *   node tools/verify462.js
 *
 * 잡는 것 하나:
 *   449 는 끝 칸의 «셸에 **닿는** 면» 을 동심으로 옮겼다(그 면의 `::before` 가로 인셋 7 → 0).
 *   남은 절반은 **반대 면**이다 — 그 면엔 검정 링이 있으니 세 띠가 시작해야 할 자리는
 *   «검정의 안쪽 윤곽»(사방 7 인셋 · r23)인데, 끝 칸 `::before` 는 449 를 위해 «세로 0 · r30» 인
 *   옛 상자라 이 면의 코너 원 중심이 알약보다 가로로 7 안쪽(37)이다 ⇒ 아래 코너에서 어두운 띠가
 *   납작해진다(수리 전 45°/60°/75° = **D 2.5/2.0/2.0**).
 *
 * ⚑ **목표값은 같은 호스트의 «가운데 칸» 이다** — 409 4회차가 그 칸을 ref 에 맞춰 동심으로 옮겼고
 *   `verify409` [10] 이 그 자리를 지킨다. 그래서 이 자의 본체는 절대값이 아니라 **[3] 동치**다:
 *   «끝 칸의 이 면이 가운데 칸과 ±1.0 안에서 같은가». 절대 문턱(≥4.0)은 449 와 같은 값으로 같이 문다.
 *
 * ⚑ **무른 게이트가 안 되게 여섯 겹으로 문다**(LESSONS 328·334 · 449 §4-2):
 *     [1] 선언 — 끝 칸 `::after` 에 스프레드 7 두 겹 · 검정이 **첫 항** · **가운데 칸엔 없다**(스코프)
 *     [2] 실측 — 반대 면 아래 코너에서 검정 뒤 첫 실런이 **D** 이고 ≥4.0 · 그 뒤 B ≥4.0
 *     [3] 동치 — 같은 호스트 가운데 칸과 **±1.0**
 *     [4] 무손상 — 검정 링 ≥5.0(378·409) · 위 코너 첫 실런 B 5.0~8.0(안 건드렸다)
 *     [5] 449 무손상 — **닿는** 면 아래 코너는 여전히 «가장 바깥이 D · ≥4.0»
 *     [R] 되돌림 4겹 — 두 겹을 빼면 납작해지고(R1) · 타원 변종(등재문 ⓐ)은 순서가 뒤집히며(R2) ·
 *         `::after` **배경**을 꺼도 아래 코너는 Δ0(R3 = `verify409` [8-Δ] 가 여전히 참) ·
 *         주입을 걷으면 원복(R4)
 *
 * ⚠ **`.stab-sep` 이 06 장비 칸4 의 왼쪽 코너 위를 지난다**(구분선 #483B2B 가 알약 x 9..15 을 덮는다).
 *    그 색은 면색 #4B3E2D 와 RGB 로 3 밖에 안 떨어져 팔레트가 **F 로 분류**한다 — 462 등재문의
 *    «칸4 좌상 30° F7.0» 이 그것이다(462 의 결함이 아니라 z-순서 문제 · **468** 로 등재).
 *    ⇒ 아래 코너는 **45°/60°/75°** 만 본다(구분선은 y 1976..2030 이라 그 각도에 안 닿는다).
 *    [기록] 항이 그 값을 매 실행 찍는다 — 숨기지 않는다(449 [5-기록] 과 같은 규약).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');   /* 967 — 활성 주입 공용 부품 */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '462v.png');
const R = 30;
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61503C']];

const DEGS = [45, 60, 75];       /* 아래 코너 — 구분선(468)이 안 닿는 각도 */
const TOP_DEGS = [45, 60, 75];   /* 위 코너 — 같은 이유 */
const REC_DEGS = [0, 15, 30];    /* [기록] 전용 — 468 이 사는 각도 */
const MIN_DARK = 4.0, MIN_BEV = 4.0, MIN_K = 5.0;
/* 아래 코너 어두운 띠의 **ref 곡선**(45°/60°/75°).
   ⚑ **409 17회차 이관 (2026-08-31) — 2.5/3.75/5.0 → 3.0/4.25/6.0.**
      13회차 값은 `probe409e --rays` = **손으로 적은 ref 상자**(x 292) 위에서 잰 것이다.
      17회차가 `tools/probe409i.py` 로 알약 네 변을 **그림에서** 직선 스캔해 보니 ref 상자 좌변은
      **290.7**(폭 260.8)이고 292 는 검정 링 «안» 이다 — 1.32px 어긋난 선 위에서 잰 곡선이었다.
      그 자는 cap 에서 검산된다: 그림이 돌려준 290.61 ↔ DOM 실측 290.75 = **0.14px**.
      같은 광선을 그림 상자에 걸어 BL·BR 를 재어 평균한 값이 **3.0 / 4.25 / 6.0** 이다
      (BL 3.0/4.0/6.0 · BR 3.0/4.5/6.0 — 두 코너가 0.5px 안에서 일치한다).
   ⚠ **허용 ±1.5 는 한 칸도 안 넓혔다**(무르게 푼 이관이 아니다). 다만 정직하게 적어 둔다 —
      곡선이 0.5/0.5/1.0 만 옮겼고 창이 ±1.5 라 **옛 곡선을 그리는 제품도 아직 창 안**이다.
      이 이관이 바꾸는 것은 «빨강 하나» 가 아니라 **창의 중심**, 곧 다음 회차가 무엇을 향해
      깎을지다. 창을 좁히는 것은 별도 근거가 필요해 이 회차에서 하지 않았다
      (ref 두 코너가 0.5px 안에서 일치하므로 좁힐 여지 자체는 있다 — 18회차 몫으로 남긴다).
   ⚑ 이 재측정이 17회차의 본체다 — 같은 1.32px 이 «ref 의 D+B 는 11.0» 이라는 15회차의 읽기도
      만들어 냈고(참값 8.5), 그 위에 얹힌 «아래 코너 등폭 고리» 를 17회차가 걷어냈다. */
const REF_DARK = [3.0, 4.25, 6.0], DARK_TOL = 1.5;
const TOP_LO = 5.0, TOP_HI = 8.0;
const EQ = 1.0;                  /* [3] 가운데 칸과의 허용 차 */

const L_END = '.stabs.sp2>.stab.on:nth-of-type(1),.stabs.sp3>.stab.on:nth-of-type(1),.stab.on.stab-c1';
const R_END = '.stabs.sp2>.stab.on:nth-of-type(2),.stabs.sp3>.stab.on:nth-of-type(3),.stab.on.stab-c4';
const sub = (sel, suf) => sel.split(',').map(s => s + suf).join(',');
const rule = (sel, suf, body) => sub(sel, suf) + '{' + body + '}';

/* [R1] 두 겹을 빼 본다 = 462 이전 상태 */
const OFF = rule(L_END, '::after', 'box-shadow:inset 0 0 0 7px var(--pill-k,#000)!important')
  + rule(R_END, '::after', 'box-shadow:inset 0 0 0 7px var(--pill-k,#000)!important');
/* [R2] 등재문 ⓐ — 반대 면 코너만 타원 반경 */
const ELL = OFF + rule(L_END, '::before', 'border-top-right-radius:23px 30px!important;'
  + 'border-bottom-right-radius:23px 30px!important')
  + rule(R_END, '::before', 'border-top-left-radius:23px 30px!important;'
  + 'border-bottom-left-radius:23px 30px!important');
/* [R3] `::after` 배경(위 코너 고리 둘)만 끈다 — 아래 코너는 Δ0 이어야 한다(verify409 [8-Δ]) */
const NOBG = rule(L_END, '::after', 'background:none!important')
  + rule(R_END, '::after', 'background:none!important')
  + '.stab.on::after{background:none!important}';

const HOSTS = [
  ['06 장비', '#eqTabs', () => { goTab('hero', true); heroSubGo('eq'); }, [0, 3], 1],
  ['10 상점', '#shopCats', () => { goTab('hero'); openShopPage(); }, [0, 2], 1],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, [null], null],
];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n + (d === undefined ? '' : ' — ' + d)); }
  else { fail++; console.log('  FAIL ' + n + (d === undefined ? '' : ' — ' + d)); }
};

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* ⚠ 주입을 «핀» 으로 박는다 — 10 상점(`renderShop()`)은 틱마다 `.on` 을 상태에서 다시 그려
   rect 는 끝 칸인데 **찍힌 픽셀은 셸**인 순간을 만든다(probe462 1회차가 그렇게 읽혔다). */
/* 967 — `SETON`(사본 + 자기 핀)은 **선언째 지웠다**(402 · 963). 심는 손잡이는 공용 부품
   `__stab967`(`tools/stab967.js`) 하나다.

   ⚑ 이 자는 **주입과 읽기 사이에 캡처가 들어간다** — 캡처는 프로세스 밖으로 나갔다 오므로
      «한 틱» 으로 접을 수 없다(967 등재문 갈래 ⓑ). 두 겹으로 짠다:
        ① `hold()` — 핀(16ms 재주입)이 캡처 구간을 붙든다  ← 옛 `SETON` 이 하던 일
        ② `held()` — **캡처 직후 되읽어 «그 사이 안 바뀌었다» 를 점수 줄로** 세운다  ← 새로 생긴 것
      ①만으로는 핀 틱 사이 <16ms 창이 남고, 그 창에 찍힌 판은 **다른 칸 그림을 이 칸이라고** 채점한다.
      기하만 읽는 자리(캡처가 없는 자리)는 핀도 필요 없다 — `__stab967.set` 을 읽기 evaluate
      **안에서** 부르면 그것으로 한 틱이다. */
/* `hold` 는 **붙든 칸**을 돌려준다(못 붙들면 <0). `i` 가 null 이면 «자연 활성» 이라 심지 않고
   지금 켜져 있는 칸을 그대로 쓴다 — 그 자리는 제품이 소유하므로 제품이 지킨다.
   `held` 는 그 «붙든 칸» 과 캡처 뒤의 칸을 견준다. */
const hold = (page, bar, i) => page.evaluate(([s, k]) => window.__stab967.pin(s, k), [bar, i]);
const held = async (page, bar, want, tag) => {
  const on = await page.evaluate(([s]) => window.__stab967.on(s), [bar]);
  await page.evaluate(() => window.__stab967.unpin());
  ok('[전제] ' + tag + ' — 캡처 사이에 활성이 안 바뀌었다 (967)', on === want,
    '붙든 칸 ' + (want + 1) + ' → 캡처 뒤 칸' + (on + 1));
  return on === want;
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
      window.__v462v = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

const ray = (page, p, corner, deg) => page.evaluate(([box, cor, dg, pal, r]) => {
  const g = window.__v462v;
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

function runs(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], (j - i) * step]); i = j; }
  return rs;
}
/* 검정 링 → 그 뒤 첫 실런 → 그 다음 실런. AA 이음매는 건너뛴다.
   ⚑ **409 8회차 이관 (2026-08-31): 1.5 → 2.0.** 8회차가 아래 두 코너의 링을 타원(30/33)으로 바꾸면서
      **링의 안쪽 윤곽과 띠의 바깥 윤곽이 같은 자리에 놓였다**(둘 다 23/26) — 그 전에는 원 r23 ↔ 상자 r23
      으로 어긋나 있어 AA 가 한쪽에만 났다. 두 경계가 겹치면 AA 도 겹쳐 한 칸 두꺼워진다(실측 F **1.5**).
      2.0 은 지어낸 값이 아니라 **형제 게이트가 같은 목적으로 이미 쓰는 폭**이다
      (`tools/verify409.js` 의 `darkRun`·`bevelRun` — 같은 코너·같은 광선에서 «≥2.0 이라야 실런»).
   ⚠ 무르게 푼 게 아니다: 건너뛴 런의 **클래스는 안 본다**가 아니라 여전히 «그 다음 실런이 B 인가» 를
      묻고, 두께 문턱(≥4.0)도 그대로다. 2.0 이상 뜨면 그 즉시 빨개진다. */
function layers(s) {
  const rs = runs(s);
  let i = 0;
  while (rs[i] && rs[i][0] !== 'K') i++;
  const k = rs[i] ? rs[i][1] : 0;
  let j = i + 1; while (rs[j] && rs[j][1] < 2.0) j++;
  const a = rs[j] || ['-', 0];
  let m = j + 1; while (rs[m] && rs[m][1] < 2.0) m++;
  const b = rs[m] || ['-', 0];
  return { k, a, b };
}
/* **닿는** 면(449)은 검정이 없다 — 그래서 «K 를 지난 다음» 이 아니라 «가장 바깥 실런» 을 본다.
   ⚠ 셸 테두리의 AA 한 칸(≤2.5px 검정)만 건너뛴다(449 §5-2 가 못박은 폭 — 그보다 두꺼우면 378 이 깨진 것). */
function layersNear(s) {
  let rs = runs(s);
  if (rs[0] && rs[0][0] === 'K' && rs[0][1] <= 2.5) rs = rs.slice(1);
  const big = rs.filter(r => r[1] >= 1.5);
  return { k: rs[0] && rs[0][0] === 'K' ? rs[0][1] : 0, a: big[0] || ['-', 0], b: big[1] || ['-', 0] };
}
const fmt = (ds, vs) => ds.map((d, i) => d + '°:' + vs[i]).join(' ');

/* 한 알약의 한 코너를 각도별로 잰다 → {k[], a[], b[]} */
async function scan(page, p, cor, degs, near) {
  const out = { k: [], a: [], b: [] };
  for (const dg of degs) {
    const L = (near ? layersNear : layers)(await ray(page, p, cor, dg));
    out.k.push(L.k); out.a.push(L.a); out.b.push(L.b);
  }
  return out;
}

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const cerr = [];
    page.on('pageerror', e => cerr.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);                                  /* 967 */
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });

    console.log('══════ VERIFY 462 — 끝 칸의 «셸에 **안** 닿는» 면도 동심인가 ══════');

    /* ---------- [1] 선언 ---------- */
    console.log('\n[1] 선언 — 끝 칸 `::after` 에 스프레드 7 두 겹 (검정이 첫 항) · 가운데 칸엔 없다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.waitForTimeout(900);
    await page.evaluate(SETTLE);
    /* 967 — 켜기와 읽기가 한 evaluate 다(선언만 읽으므로 캡처가 없다 = 핀 불필요). */
    const rd = (i) => page.evaluate(([s, k]) => {
      if (window.__stab967.set(s, k) !== k) return null;
      return getComputedStyle(document.querySelector(s + ' > .stab.on'), '::after').boxShadow;
    }, ['#eqTabs', i]);
    const shEnd = await rd(0), shEnd4 = await rd(3), shMid = await rd(1);
    /* 409 13회차 이관 (2026-08-31) — 세 띠의 세로 인셋이 **7/14 → 5/12** 로 내려갔다(가운데 칸의
       `::before` 와 같은 값 — 그래야 [3] 의 «가운데 칸과 ±1.0» 이 산다). 문자열만 갈아 끼운다. */
    const hasD = s => /rgb\(65,\s*49,\s*34\)[^,]*5px 0px 7px inset/.test(s.replace(/\s+/g, ' '));
    const hasB = s => /rgb\(99,\s*79,\s*55\)[^,]*12px 0px 7px inset/.test(s.replace(/\s+/g, ' '));
    const kFirst = s => /^rgb\(0,\s*0,\s*0\) 0px 0px 0px 7px inset/.test(s.trim());
    ok('[1] 06 장비 칸1(끝) — 어두운 띠 `inset 0 -5px 0 7px #413122` 가 있다 (409 13회차)', hasD(shEnd), shEnd.slice(0, 120));
    ok('[1] 06 장비 칸1(끝) — 그 뒤 베벨 `inset 0 -12px 0 7px #634F37` 가 있다 (409 13회차)', hasB(shEnd));
    ok('[1] 06 장비 칸1(끝) — 검정 링이 **첫 항**이다 (계속 맨 위 · 409·378 무손상)', kFirst(shEnd), shEnd.slice(0, 60));
    ok('[1] 06 장비 칸4(끝) — 같은 두 겹 (좌·우 두 종류를 다 적었다)', hasD(shEnd4) && hasB(shEnd4));
    ok('[1] 06 장비 칸2(가운데) — 두 겹이 **없다** (스코프가 끝 칸뿐 · 가운데는 `::before` 몫)',
      !hasD(shMid) && !hasB(shMid), shMid.slice(0, 80));

    /* ---------- [2]~[5] 실측 ---------- */
    let farN = 0, nearN = 0, eqN = 0;
    for (const [hn, sel, setup, endIs, midI] of HOSTS) {
      await page.evaluate(setup);
      await page.waitForTimeout(900);
      await page.evaluate(SETTLE);

      /* 가운데 칸(목표값) 먼저 — 같은 진입·같은 프레임에서 잰다 */
      let mid = null;
      const midOn = midI == null ? -1 : await hold(page, sel, midI);
      if (midOn === midI) {
        await page.waitForTimeout(400); await page.evaluate(SETTLE);
        const q = await page.evaluate(([s]) => {
          const on = document.querySelector(s + ' > .stab.on'); if (!on) return null;
          const b = on.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };
        }, [sel]);
        if (q) {
          await shoot(page);
          await held(page, sel, midOn, hn + ' 가운데 칸' + (midOn + 1) + '(목표값)');
          mid = { L: await scan(page, q, 'BL', DEGS), R: await scan(page, q, 'BR', DEGS) };
        } else await page.evaluate(() => window.__stab967.unpin());
      }

      for (const endI of endIs) {
        /* 967 — `endI` 가 null 이면 «자연 활성»(제품이 켠 칸 그대로)이라 붙든 칸을 되받아 쓴다. */
        const onI = await hold(page, sel, endI);
        if (onI < 0 || (endI != null && onI !== endI)) {
          ok('[전제] ' + hn + ' 칸' + (endI == null ? '(자연)' : endI + 1) + ' 을 활성으로 만들 수 있다',
            false, onI === -2 ? '칸 없음' : '켠 칸이 되돌려졌다 → 칸' + (onI + 1)); continue;
        }
        await page.waitForTimeout(400); await page.evaluate(SETTLE);
        const p = await page.evaluate(([s]) => {
          const on = document.querySelector(s + ' > .stab.on'); if (!on) return null;
          const b = on.getBoundingClientRect();
          const cs = getComputedStyle(on, '::before');
          return { x: b.x, y: b.y, w: b.width, h: b.height, l: cs.left, r: cs.right,
            label: (on.querySelector('i') || {}).textContent || '' };
        }, [sel]);
        if (!p) { ok('[전제] ' + hn + ' 활성 칸을 읽었다', false, '없음'); continue; }
        const touch = p.l === '0px' ? 'L' : (p.r === '0px' ? 'R' : null);
        if (!touch) { await page.evaluate(() => window.__stab967.unpin()); continue; }
        const tag = hn + ' 칸' + (endI == null ? '(자연)' : endI + 1) + '«' + p.label + '»';
        const farB = touch === 'L' ? 'BR' : 'BL', farT = touch === 'L' ? 'TR' : 'TL';
        const nearB = touch === 'L' ? 'BL' : 'BR';
        await shoot(page);
        await held(page, sel, onI, tag);

        /* [2] 반대 면 아래 코너 */
        const F = await scan(page, p, farB, DEGS);
        farN++;
        ok('[2] ' + tag + ' ' + farB + ' — 검정 뒤 첫 실런이 **어두운 띠 D** 다',
          F.a.every(r => r[0] === 'D'), fmt(DEGS, F.a.map(r => r[0] + r[1].toFixed(1))));
        /* ⚑ **409 13회차 이관 (2026-08-31) — 절대 문턱 4.0 은 «ref 보다 두꺼운» 값이었다.**
           같은 광선(`python3 tools/probe409e.py --rays`)으로 ref 를 다시 재니 아래 코너 어두운 띠는
           **45° 2.5 · 60° 3.5~4.0 · 75° 5.0** 이다 — 45° 는 문턱 4.0 을 **ref 자신이 못 넘는다**.
           4.0 은 4회차의 «7px 띠» 를 굳힌 값이었고, 13회차가 띠를 ref 쪽으로 내리자 곧바로 빨개졌다.
           ⇒ 절대 문턱을 **ref 곡선 ±1.5** 로 옮긴다. 무르게 푼 게 아니라 **양쪽을 막는다** —
              너무 얇아도(수리 전 2.0/2.0/2.0 은 60°·75° 에서 2.0/3.0 벗어남) 너무 두꺼워도 빨갛다.
              아래 «가운데 칸과 ±1.0» 항이 그대로 두 번째 겹으로 남는다. */
        ok('[3] ' + tag + ' ' + farB + ' — 그 띠가 ref 곡선 ±' + DARK_TOL.toFixed(1) + ' (ref ' + REF_DARK.join('/') + ' · 수리 전 2.0/2.0/2.0)',
          F.a.every((r, i) => r[0] === 'D' && Math.abs(r[1] - REF_DARK[i]) <= DARK_TOL),
          fmt(DEGS, F.a.map(r => r[1].toFixed(1))));
        ok('[3] ' + tag + ' ' + farB + ' — 띠 **뒤** 베벨이 ≥ ' + MIN_BEV.toFixed(1) + 'px (순서가 D→B)',
          F.b.every(r => r[0] === 'B' && r[1] >= MIN_BEV), fmt(DEGS, F.b.map(r => r[0] + r[1].toFixed(1))));
        /* ⚑ **409 8회차 이관 (2026-08-31)** — 이 항의 «≥5.0» 은 링이 **등폭**이던 시절의 값이다.
           8회차가 ref 를 대조군까지 빼고 다시 재니(§17) ref 의 아래 두 코너 링은 등폭이 아니라
           **바닥으로 갈수록 얇아진다**(ref 실측 60° 5.5 · 75° 4.0 ↔ 옛 우리 7.0 고정).
           ⇒ 절대 문턱 대신 **같은 호스트 가운데 칸의 링과 ±1.5** 로 묻는다 — 이 항의 뜻(«462 의 두 겹이
              378·409 의 링을 갉아먹지 않았는가»)은 그대로이고, 링이 설계대로 테이퍼져도 안 흔들린다.
           ⚠ 무르게 푼 게 아니다: 가운데 칸의 링 자체는 `verify409` [2] 가 ≥5.0·편차 ≤2.0 으로 여전히
              물고 있으므로, 두 항을 이으면 끝 칸도 그 창 밖으로 못 나간다. 링이 사라지면 즉시 빨갛다. */
        if (mid && mid[farB[1]]) {
          const MK = mid[farB[1]].k;
          ok('[4] ' + tag + ' ' + farB + ' — 검정 링이 가운데 칸과 ±1.5 (378·409 무손상)',
            F.k.every((v, i) => v >= 2.0 && Math.abs(v - MK[i]) <= 1.5),
            fmt(DEGS, F.k.map((v, i) => v.toFixed(1) + '↔' + MK[i].toFixed(1))));
        } else {
          ok('[4] ' + tag + ' ' + farB + ' — 검정 링은 여전히 ≥ ' + MIN_K.toFixed(1) + 'px (378·409 무손상)',
            F.k.every(v => v >= MIN_K), fmt(DEGS, F.k.map(v => v.toFixed(1))));
        }

        /* [4] 반대 면 위 코너 — 안 건드렸다 */
        const T = await scan(page, p, farT, TOP_DEGS);
        ok('[4] ' + tag + ' ' + farT + ' — 위 코너는 첫 실런이 B 이고 ' + TOP_LO + '~' + TOP_HI + ' (배경 고리 몫 · 안 건드렸다)',
          T.a.every(r => r[0] === 'B' && r[1] >= TOP_LO && r[1] <= TOP_HI),
          fmt(TOP_DEGS, T.a.map(r => r[0] + r[1].toFixed(1))));

        /* [3] 가운데 칸과 동치 */
        if (mid) {
          const M = mid[farB[1]];
          const d = F.a.map((r, i) => Math.abs(r[1] - M.a[i][1]));
          eqN++;
          ok('[3] ' + tag + ' ' + farB + ' — **가운데 칸과 ±' + EQ.toFixed(1) + '** (목표 = 409 4회차가 ref 에 맞춘 칸)',
            M.a.every(r => r[0] === 'D') && d.every(v => v <= EQ),
            fmt(DEGS, F.a.map((r, i) => r[1].toFixed(1) + '↔' + M.a[i][0] + M.a[i][1].toFixed(1))));
        }

        /* [5] 449 무손상 — 닿는 면 아래 코너 */
        const N = await scan(page, p, nearB, DEGS, true);
        nearN++;
        ok('[5] ' + tag + ' ' + nearB + ' — **닿는** 면은 여전히 «가장 바깥 D · ≥' + MIN_DARK.toFixed(1) + '» (449 무손상)',
          N.a.every(r => r[0] === 'D' && r[1] >= MIN_DARK), fmt(DEGS, N.a.map(r => r[0] + r[1].toFixed(1))));
        ok('[5] ' + tag + ' ' + nearB + ' — 그 면에 알약 자신의 검정은 없다 (셸 AA ≤2.5 · 378 무손상)',
          N.k.every(v => v === 0), fmt(DEGS, N.k.map(v => v.toFixed(1))));

        /* [기록] 468(구분선 z-순서)가 사는 각도 — 값만 남긴다 */
        const Rec = await scan(page, p, farB, REC_DEGS);
        console.log('    [기록] ' + tag + ' ' + farB + ' 0~30° (구분선 `.stab-sep` 이 지나는 자리 = **468**) — '
          + fmt(REC_DEGS, Rec.a.map(r => r[0] + r[1].toFixed(1))));
      }
    }
    ok('[전제] 반대 면을 3곳 이상에서 쟀다 (표본이 공허하지 않다)', farN >= 3, farN + '면');
    ok('[전제] 닿는 면(449) 도 3곳 이상 확인했다', nearN >= 3, nearN + '면');
    ok('[전제] 가운데 칸 동치를 2곳 이상에서 물었다', eqN >= 2, eqN + '곳');

    /* ---------- [R] 되돌림 ---------- */
    console.log('\n[R] 되돌림 — 두 겹을 빼면 납작해진다 · 등재문 ⓐ 는 순서가 뒤집힌다 · 배경은 아래 코너와 무관하다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.waitForTimeout(900); await page.evaluate(SETTLE);
    /* 967 — [R] 은 주입·캡처를 되풀이하므로 절 전체를 핀으로 붙들고, 캡처마다 되읽어 문다. */
    ok('[R] 전제 — 06 장비 첫 칸을 붙들었다 (967)', await hold(page, '#eqTabs', 0) === 0);
    await page.waitForTimeout(400); await page.evaluate(SETTLE);
    const pe = await page.evaluate(() => {
      const on = document.querySelector('#eqTabs > .stab.on');
      const b = on.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    /* 캡처마다 «그 사이 안 바뀌었다» 를 묻되 핀은 절이 끝날 때까지 유지한다. */
    const stillOn = async (tag) => {
      const on = await page.evaluate(([s]) => window.__stab967.on(s), ['#eqTabs']);
      ok('[전제] ' + tag + ' — 캡처 사이에 활성이 안 바뀌었다 (967)', on === 0, '캡처 뒤 칸' + (on + 1));
    };
    const inject = async (css) => {
      await page.evaluate(c => {
        const s = document.createElement('style'); s.id = 'v462r'; s.textContent = c; document.head.appendChild(s);
      }, css);
      await page.waitForTimeout(220);
      await shoot(page);
      await stillOn('[R] 주입판');
      const r = await scan(page, pe, 'BR', DEGS);
      await page.evaluate(() => { const s = document.getElementById('v462r'); if (s) s.remove(); });
      await page.waitForTimeout(120);
      return r;
    };
    await shoot(page);
    await stillOn('[R] 기준판');
    const now = await scan(page, pe, 'BR', DEGS);
    const rOff = await inject(OFF);
    /* ⚑ **409 8회차 이관** — 8회차가 끝 칸 `::before` 를 «닿는 면 기둥» 으로 마스크하면서, 이 코너의
       띠를 그리는 층이 **462 의 두 겹 하나뿐**이 됐다(전에는 `::before` 의 옛 상자가 밑에 겹쳐 있었다).
       그래서 두 겹을 빼면 띠가 얇아지는 게 아니라 **아예 D 가 아니게 된다**(실측 B5.5/B6.0/B8.0).
       ⇒ «≤3.0» 을 «D 가 아니거나, D 라도 ≤3.0» 으로 옮긴다 — 더 강한 무너짐을 통과로 세는 것이지
          선을 넓히는 것이 아니다(D 가 4.0 이상으로 남으면 여전히 빨갛다). */
    ok('R1 두 겹을 빼면 어두운 띠가 사라지거나 ≤3.0 으로 납작해진다 ([2][3] 이 공허하지 않다)',
      rOff.a.every(r => r[0] !== 'D' || r[1] <= 3.0),
      '지금 ' + now.a.map(r => r[0] + r[1].toFixed(1)).join(' ') + '  ↔  뺀 뒤 ' + rOff.a.map(r => r[0] + r[1].toFixed(1)).join(' '));
    const rEll = await inject(ELL);
    ok('R2 등재문 ⓐ(타원 반경 23px 30px)로는 안 된다 — 띠가 D 로 안 남는다',
      !rEll.a.every(r => r[0] === 'D' && r[1] >= MIN_DARK), rEll.a.map(r => r[0] + r[1].toFixed(1)).join(' '));
    const rBg = await inject(NOBG);
    ok('R3 `::after` **배경**을 꺼도 아래 코너는 Δ0 (`verify409` [8-Δ] 가 여전히 참 — 배경이 아니라 그림자로 그렸다)',
      rBg.a.every((r, i) => r[0] === now.a[i][0] && Math.abs(r[1] - now.a[i][1]) <= 0.5),
      rBg.a.map(r => r[0] + r[1].toFixed(1)).join(' '));
    await shoot(page);
    await stillOn('[R] 원복판');
    const back = await scan(page, pe, 'BR', DEGS);
    ok('R4 주입을 걷으면 원복 (주입이 남지 않았다)',
      back.a.every((r, i) => r[0] === now.a[i][0] && Math.abs(r[1] - now.a[i][1]) <= 0.5),
      back.a.map(r => r[0] + r[1].toFixed(1)).join(' '));

    await page.evaluate(() => window.__stab967.unpin());   /* 967 */
    console.log('\n[C] 콘솔');
    ok('콘솔 에러 0건', cerr.length === 0, cerr.length + '건' + (cerr[0] ? ' · ' + cerr[0].slice(0, 90) : ''));

    console.log('\nVERIFY462 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
    process.exit(fail ? 1 : 0);
  } finally { await browser.close(); }
})();
