/* 작업 462 재현기 — «끝 칸(378)의 «셸에 **안** 닿는 면» 은 `::before` 가 아직 옛 평행이동 상자다».
 *
 *   node tools/probe462.js              현행 + 후보 변종을 한 표에
 *   V462_FULL=1 node tools/probe462.js  전체 런 문자열까지
 *   V462_NEAR=1 node tools/probe462.js  **닿는** 면(449 가 닫은 절반)을 본다 = 비회귀 대조
 *
 * 338 규칙 — 462 등재문의 처방 셋(ⓐ 타원 반경 · ⓑ `::after` 배경 코너 타일 · ⓒ 셋째 층)을
 * 따르기 **전에** 먼저 잰다. 자는 409·449 가 쓴 것과 같다(코너 원 중심에서 쏜 광선의 **법선** 런).
 *
 * 무엇을 보는가:
 *   끝 칸의 `::before` 는 «세로 0 · r30 · 마스크 없음» 짜리 옛 상자이고, 449 가 **닿는 면의
 *   가로 인셋만** 0 으로 뒀다. 반대 면(검정 링이 있는 면)은 아직 가로 인셋 7 이라 그 코너의
 *   원 중심이 알약보다 7 안쪽(37)이다 ⇒ 세 띠가 호에서 얇아진다.
 *
 * ⚑ **목표값은 «가운데 칸»** 이다 — 409 4회차가 그 칸을 ref 에 맞춰 «사방 7 인셋 · r23»(= 검정
 *   링의 안쪽 윤곽) 동심으로 옮겼고 `verify409` [10] 이 그 자리의 어두운 띠 ≥4.0 을 못박고 있다.
 *   같은 호스트의 가운데 칸을 같은 자로 재서 표에 나란히 놓는다(M 행).
 *
 * 변종:
 *   A  현행
 *   E  ⓐ 타원 반경 — 반대 면 코너만 `23px 30px`. 상자의 아래변이 세로 0 이라 호가 **알약 바닥까지
 *      끌려 내려간다** — 원(r23)과 얼마나 어긋나는지를 값으로 남긴다.
 *   W  **`::after` 에 스프레드 7 짜리 띠 두 겹**. `inset 0 -7px 0 7px` 의 그림자 상자는
 *      «알약을 사방 7 인셋한 것»(= 가운데 칸 `::before` 의 상자, r23)이라 **같은 띠가 같은 자리에**
 *      생긴다. 끝 칸의 `::after` 는 마스크가 이미 «반대 면 기둥 하나» 만 남기므로 스코프가 공짜다.
 *      ⚠ 배경이 아니라 **그림자**다 — `verify409` [8-Δ](«::after 배경을 껐다 켜도 아래 코너 Δ0»)를
 *        건드리지 않는다(등재문 ⓑ 가 치러야 한다던 값).
 *   G  `::before` 를 통째로 동심으로 (= 449 를 되돌린다 · 닿는 면이 깨지는 대조군)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');   /* 967 — 활성 주입 공용 부품 */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '462.png');
const R = 30;
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61503C']];
const DEGS = [0, 15, 30, 45, 60, 75];

const L_END = '.stabs.sp2>.stab.on:nth-of-type(1),.stabs.sp3>.stab.on:nth-of-type(1),.stab.on.stab-c1';
const R_END = '.stabs.sp2>.stab.on:nth-of-type(2),.stabs.sp3>.stab.on:nth-of-type(3),.stab.on.stab-c4';
/* ⚠ 셀렉터 목록에 의사요소를 붙일 때는 **쉼표마다** 붙이고 블록은 한 번만 적는다
   (`a,b::after{…}` 는 a 에 안 걸리고, `a::after{…},b::after{…}` 는 통째로 무효 CSS 다 —
   1회차에 네 변종이 소수점까지 같은 값으로 나온 것이 이 오타였다). */
const sub = (sel, suf) => sel.split(',').map(s => s + suf).join(',');
const rule = (sel, suf, body) => sub(sel, suf) + '{' + body + '}';

/* E — 반대 면(= 검정 링이 있는 면) 코너만 타원. 좌끝 칸은 우측 두 코너, 우끝 칸은 좌측 두 코너. */
const ELL = rule(L_END, '::before', 'border-top-right-radius:23px 30px!important;'
  + 'border-bottom-right-radius:23px 30px!important')
  + rule(R_END, '::before', 'border-top-left-radius:23px 30px!important;'
  + 'border-bottom-left-radius:23px 30px!important');

/* W — 끝 칸 `::after` 에 스프레드 7 띠. 검정 링이 **첫 항**이라 계속 맨 위다.
   ⚠ **아래 두 겹뿐**이다 — 위 코너는 이미 `::after` 배경 고리(r16..24)가 동심으로 그리고 있어
      A 와 M(가운데 칸)의 TR 값이 소수점까지 같다(1회차 실측). 안 건드린다. */
const SPR = 'box-shadow:inset 0 0 0 7px var(--pill-k,#000),'
  + 'inset 0 -7px 0 7px #413122,inset 0 -14px 0 7px #634F37!important';
const WSPR = rule(L_END, '::after', SPR) + rule(R_END, '::after', SPR);

/* G — 449 되돌리기(끝 칸 `::before` 를 가운데 칸과 같은 상자로) */
const MASK = 'linear-gradient(90deg,#000 0 23px,transparent 23px calc(100% - 23px),#000 calc(100% - 23px))';
const CONC = 'left:7px!important;right:7px!important;top:7px!important;bottom:7px!important;'
  + 'border-radius:23px!important;-webkit-mask-image:' + MASK + '!important;mask-image:' + MASK + '!important';
const GCON = rule(L_END, '::before', CONC) + rule(R_END, '::before', CONC);

const VARIANTS = [
  ['A 현행', ''],
  ['E ⓐ 타원 반경 23px 30px', ELL],
  ['W ::after 스프레드 7 띠 두 겹', WSPR],
  ['G ::before 통째 동심 (449 되돌림 · 대조)', GCON],
];

/* [이름, sel, 진입, 끝 칸 index 목록, 가운데 칸 index]
   ⚠ **호스트마다 진입을 한 번만** 부른다 — 1회차에 «10 상점 칸1»·«10 상점 칸3» 을 따로 두었더니
      두 번째 진입의 `goTab('hero')` 가 이미 열린 상점을 덮어 rect 는 알약인데 찍힌 픽셀은
      영웅 화면인 순간이 됐다(칸3 이 통째로 `S`/`R` 로 읽혔다). verify449 와 같은 «호스트 1회 · 칸 여럿» 꼴.
   ⚠ 23 훈련은 `renderUI()` 가 매 틱 `.on` 을 상태에서 다시 그린다 — 자연 활성 칸(끝 칸)만 잰다. */
const HOSTS = [
  ['06 장비', '#eqTabs', () => { goTab('hero', true); heroSubGo('eq'); }, [0, 3], 1],
  ['10 상점', '#shopCats', () => { goTab('hero'); openShopPage(); }, [0, 2], 1],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, [null], null],
];

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* ⚠ **주입을 «핀» 으로 박는다** — 10 상점(`renderShop()`)은 틱마다 `.on` 을 상태에서 다시 그려
   rect 는 끝 칸인데 **찍힌 픽셀은 셸**인 순간을 만든다(1회차에 10 상점 칸3 이 통째로 `S`/`R`
   = 바 배경·셸 림으로 읽혔다). 한 번 켜는 것으로는 부족해서 16ms 간격으로 계속 되켠다. */
/* 967 — `SETON`(사본 + 자기 핀)은 **선언째 지웠다**(402 · 963). 심는 손잡이는 공용 부품
   `__stab967`(`tools/stab967.js`) 하나다. 이 자는 주입과 읽기 사이에 **캡처**가 들어가 «한 틱» 으로
   못 접으므로, 핀으로 붙들고(`hold`) **캡처 직후 되읽어**(`held`) 어긋난 판은 값을 안 찍고 신고한다.
   `hold` 는 붙든 칸을 돌려준다(<0 = 못 붙듦 · `i` 가 null 이면 «자연 활성» 이라 심지 않는다). */
const hold = (page, bar, i) => page.evaluate(([s, k]) => window.__stab967.pin(s, k), [bar, i]);
const held = async (page, bar, want, tag) => {
  const on = await page.evaluate(([s]) => window.__stab967.on(s), [bar]);
  if (on !== want) console.log('   ⚠⚠ ' + tag + ' — 못 쟀다: 캡처 사이에 활성이 칸' + (on + 1) + ' 로 바뀌었다 (967)');
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
      window.__v462 = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

const ray = (page, p, corner, deg) => page.evaluate(([box, cor, dg, pal, r]) => {
  const g = window.__v462;
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
/* 검정 링 **뒤** 의 첫 실런(≥1.5px). 이 면은 검정이 있으므로 «K 를 지난 다음» 이 관심사다.
   ⚠ 앞머리의 셸/AA 런(≤1.0)은 건너뛴다(449 §5 의 함정 둘·셋). */
function afterK(s) {
  const rs = runs(s);
  let i = 0;
  while (rs[i] && rs[i][0] !== 'K') i++;          /* 검정까지 */
  const k = rs[i] ? rs[i][1] : 0;
  let j = i + 1;
  while (rs[j] && rs[j][1] < 1.5) j++;            /* AA 이음매 건너뛰기 */
  const a = rs[j] || ['-', 0];
  let m = j + 1;
  while (rs[m] && rs[m][1] < 1.5) m++;
  const b = rs[m] || ['-', 0];
  return { k, a, b };
}
const cell = (s) => { const r = afterK(s); return 'K' + r.k.toFixed(1) + ' ' + r.a[0] + r.a[1].toFixed(1) + ' ' + r.b[0] + r.b[1].toFixed(1); };

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);                                  /* 967 */
    await stabInstall(page);                                  /* 967 */
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });

    const NEAR = !!process.env.V462_NEAR;
    console.log('\n══════ 462 — 끝 칸의 «셸에 ' + (NEAR ? '닿는' : '**안** 닿는') + '» 면을 법선으로 잰다 ══════');
    console.log(' 읽는 법: «각도: K검정 / 그 뒤 첫 실런 / 그 다음 실런».');
    console.log(' 목표(가운데 칸 = 409 4회차가 ref 에 맞춘 자리): 검정 뒤가 **D** 이고 아래 코너에서 ≥4.0.');

    for (const [hname0, sel, setup, endIs, midI] of HOSTS) {
      await page.evaluate(setup);
      await page.evaluate(SETTLE);
      await page.waitForTimeout(700);
      for (const endI of endIs) {
      const hname = hname0 + ' 칸' + (endI == null ? '(자연)' : endI + 1);
      const onI = await hold(page, sel, endI);
      if (onI < 0 || (endI != null && onI !== endI)) {
        console.log('\n▣ ' + hname + (onI === -2 ? ' — 칸 없음(건너뜀)'
          : ' — ⚠⚠ 못 쟀다: 켠 칸이 칸' + (onI + 1) + ' 로 되돌려졌다 (제품이 이 자리를 소유한다 — 963·967)'));
        continue;
      }
      await page.waitForTimeout(400);
      await page.evaluate(SETTLE);
      const p = await page.evaluate(s => {
        const on = document.querySelector(s + ' > .stab.on') || document.querySelector(s + ' .stab.on');
        if (!on) return null;
        const b = on.getBoundingClientRect();
        const cs = getComputedStyle(on, '::before');
        return { x: b.x, y: b.y, w: b.width, h: b.height, txt: (on.textContent || '').trim().slice(0, 6),
          l: cs.left, r: cs.right };
      }, sel);
      if (!p) { console.log('\n▣ ' + hname + ' — 활성 칸 없음(건너뜀)'); continue; }
      /* 어느 면이 셸에 닿는가 = `::before` 인셋이 0 인 쪽(449 가 세운 손잡이 · verify449 와 같은 읽기).
         둘 다 7 이면 가운데 칸이라 이 자가 볼 자리가 아니다. */
      const touch = p.l === '0px' ? 'L' : (p.r === '0px' ? 'R' : null);
      if (!touch) { console.log('\n▣ ' + hname + ' — 끝 칸이 아니다(건너뜀)'); continue; }
      const far = touch === 'L' ? ['TR', 'BR'] : ['TL', 'BL'];
      const near = touch === 'L' ? ['TL', 'BL'] : ['TR', 'BR'];
      const CORS = NEAR ? near : far;
      console.log('\n▣ ' + hname + ' «' + p.txt + '»  알약 ' + p.w.toFixed(1) + '×' + p.h.toFixed(1)
        + ' @ ' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + '  (닿는 면 ' + touch + ')');

      for (const [vname, css] of VARIANTS) {
        if (css) await page.evaluate(c => {
          const s = document.createElement('style'); s.id = 'v462'; s.textContent = c; document.head.appendChild(s);
        }, css);
        await page.waitForTimeout(200);
        /* ⚠ 찍는 동안 핀이 붙들고 있다(967 — 옛 «찍기 직전에 다시 켠다» 를 대신한다).
           핀만으로는 16ms 창이 남으므로 **캡처 직후 되읽어** 어긋난 판은 신고한다. */
        await shoot(page);
        const okShot = await held(page, sel, onI, hname + ' ' + vname.slice(0, 2));
        if (okShot) for (const cor of CORS) {
          const cells = [];
          for (const dg of DEGS) {
            const s = await ray(page, p, cor, dg);
            cells.push(dg + '°:' + cell(s));
            if (process.env.V462_FULL) console.log('      ' + cor + ' ' + dg + '° ' + runs(s).map(r => r[0] + r[1].toFixed(1)).join(' '));
          }
          console.log('   ' + cor + '  ' + vname.slice(0, 2) + '  ' + cells.join(' | '));
        }
        if (css) await page.evaluate(() => { const s = document.getElementById('v462'); if (s) s.remove(); });
        await page.waitForTimeout(120);
      }

      /* M — 같은 호스트의 **가운데 칸**(목표값). 끝 칸과 같은 면·같은 코너를 잰다. */
      const midOn = midI == null ? -1 : await hold(page, sel, midI);
      if (midOn === midI) {
        await page.waitForTimeout(220);
        const q = await page.evaluate(s => {
          const on = document.querySelector(s + ' > .stab.on') || document.querySelector(s + ' .stab.on');
          if (!on) return null;
          const b = on.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height };
        }, sel);
        if (q) {
          await shoot(page);
          const okMid = await held(page, sel, midOn, hname + ' 가운데 칸(목표)');
          if (okMid) for (const cor of CORS) {
            const cells = [];
            for (const dg of DEGS) cells.push(dg + '°:' + cell(await ray(page, q, cor, dg)));
            console.log('   ' + cor + '  M   ' + cells.join(' | ') + '   ← 가운데 칸(목표)');
          }
        }
      }
      }
    }
    await page.evaluate(() => window.__stab967.unpin());   /* 967 */
  } finally { await browser.close(); }
})();
