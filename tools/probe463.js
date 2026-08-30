/* 작업 463 재현기 — «`.stab.on::before` 의 코너 기둥 마스크가 7px 어긋나 있는가».
 *
 *   node tools/probe463.js              현행 vs 수정안(23px)을 한 표에
 *   V463_FULL=1 node tools/probe463.js  세로 단면 런 문자열까지
 *
 * 338 규칙 — 463 등재문의 처방(«30 → 23»)을 따르기 **전에** 먼저 재현한다.
 * 등재문은 두 가지를 주장한다:
 *   ⓐ 상자가 `left:7px;right:7px` 인데 마스크가 `#000 0 30px` 라 기둥이
 *      «알약 x 0~30» 이 아니라 **«7~37»** 을 덮는다.                    → [A] 선언 산수
 *   ⓑ «지금 당장은 그림이 안 바뀐다(제품 픽셀 Δ0 이 유력)».             → [B] 찍힌 픽셀
 *
 * ⓑ 가 이 자의 핵심이다. 4회차 주석은 «직선 구간은 부모 그라데이션이 이미 같은 색을 같은
 * 자리에 칠하고 있다» 를 근거로 들지만, 그 전제는 **옛 상자**(세로 인셋 0)에서만 참이다 —
 * 4회차가 상자를 `top:7px;bottom:7px` 로 옮겼으므로 세 띠도 7px 씩 안으로 밀렸다.
 * 그래서 «기둥이 7px 더 뻗은 직선부» 에서 세 띠가 부모와 **어긋난 자리**에 칠해질 수 있다.
 * 그 여부는 추론이 아니라 **찍힌 픽셀**로만 갈린다(350·368 처방).
 *
 * 재는 것:
 *   [A] 선언 — `::before` 상자·반경·마스크를 읽어 기둥 구간을 **알약 좌표**로 환산한다.
 *   [B] 픽셀 — 현행 캡처 ↔ 마스크 23px 주입 캡처를 알약 상자 안에서 대조.
 *              다른 픽셀이 **몇 개 · 어느 열 · 어느 행**인지 찍는다.
 *   [C] 단면 — 문제의 열(알약 x 33 · W−33)에서 세로 색 런을 현행/수정안/부모기대로 나란히.
 *   [D] 코너 불변 — 알약 x 0..30 (진짜 코너 기둥) 안에서는 두 상태가 Δ0 이어야 한다.
 *                   (수정이 «코너를 깎는» 것이 아니라 «직선부 덧칠만 걷는» 것임을 못박는다)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '463.png');

/* 알약 팔레트 — 352/437 이 확정한 네 띠 색 + 검정 + 셸 */
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['S', '#61503C'], ['L', '#F2BC8D']];

/* 가운데 칸이 활성인 호스트만 본다 — 끝 칸(378)의 `::before` 는 마스크가 아예 `none` 이라
   이 결함의 자리가 아니다(`verify96` [1-c] 가 그 갈림을 이미 문다). */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비', '#eqTabs', () => heroSubGo('eq')],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
];

const FIX = '.stab.on::before{-webkit-mask-image:linear-gradient(90deg,#000 0 23px,'
  + 'transparent 23px calc(100% - 23px),#000 calc(100% - 23px))!important;'
  + 'mask-image:linear-gradient(90deg,#000 0 23px,transparent 23px calc(100% - 23px),'
  + '#000 calc(100% - 23px))!important}';

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log((cond ? '  ok   ' : '  FAIL ') + msg + (detail ? '   — ' + detail : ''));
};

async function shoot(page, slot) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(([data, key]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      window['__v463' + key] = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('load fail'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, slot]);
}

/* 알약 상자 안 두 캡처의 픽셀 대조 — 다른 픽셀의 개수·열(알약 x)·행(알약 y) 범위 */
const diffBox = (page, p) => page.evaluate(box => {
  const a = window.__v463A, b = window.__v463B;
  const x0 = Math.round(box.x), y0 = Math.round(box.y);
  const w = Math.round(box.w), h = Math.round(box.h);
  const A = a.getImageData(x0, y0, w, h).data, B = b.getImageData(x0, y0, w, h).data;
  let n = 0, xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
  const cols = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) {
      n++; cols[x] = (cols[x] || 0) + 1;
      if (x < xmin) xmin = x; if (x > xmax) xmax = x;
      if (y < ymin) ymin = y; if (y > ymax) ymax = y;
    }
  }
  return { n, w, h, xmin, xmax, ymin, ymax, cols };
}, { x: p.x, y: p.y, w: p.w, h: p.h });

/* 알약 국소 x 열의 세로 색 런 (0.5px 간격) */
const column = (page, p, lx, slot) => page.evaluate(([box, x, key, pal]) => {
  const g = window['__v463' + key];
  const cls = (R, G, B) => {
    let best = '?', bd = Infinity;
    for (const [ch, hex] of pal) {
      const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      const d = (R - rr) ** 2 + (G - gg) ** 2 + (B - bb) ** 2;
      if (d < bd) { bd = d; best = ch; }
    }
    return best;
  };
  let s = '';
  for (let y = 0; y <= box.h - 0.5; y += 0.5) {
    const q = g.getImageData(Math.round(box.x + x), Math.round(box.y + y), 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, lx, slot, PAL]);

function runs(s, step = 0.5) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], (j - i) * step]); i = j; }
  return rs;
}
const fmt = rs => rs.map(r => r[0] + r[1].toFixed(1)).join(' ');

/* 마스크 문자열에서 기둥 폭을 읽는다 (computed 는 px 로 풀린다) */
function pillar(mask) {
  const l = /linear-gradient\(90deg,\s*rgb\(0, 0, 0\) 0px,\s*rgb\(0, 0, 0\) ([\d.]+)px/.exec(mask);
  const r = /rgb\(0, 0, 0\) calc\(100% - ([\d.]+)px\)\)?\s*$/.exec((mask || '').trim());
  return { l: l ? +l[1] : NaN, r: r ? +r[1] : NaN };
}

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });

    console.log('\n══════ 463 — `.stab.on::before` 코너 기둥 마스크가 7px 어긋났는가 ══════');
    console.log(' 상자: left/right 7px · r23  ⇒ 기둥은 **알약 x 0..30** 을 덮어야 한다 (= 국소 −7..23)');
    console.log(' 현행: `#000 0 30px` ⇒ 국소 0..30 = **알약 7..37** (직선부 7px 을 더 덮는다)');

    let strips = 0, cornerClean = 0, hosts = 0, masked = 0;

    for (const [hname, sel, setup] of HOSTS) {
      await page.evaluate(setup);
      await page.waitForTimeout(800);
      const info = await page.evaluate(s => {
        const bar = document.querySelector(s);
        if (!bar) return null;
        const on = bar.querySelector(':scope > .stab.on');
        if (!on) return null;
        const cells = [...bar.querySelectorAll(':scope > .stab')];
        const b = on.getBoundingClientRect();
        const cs = getComputedStyle(on, '::before');
        return {
          x: b.x, y: b.y, w: b.width, h: b.height,
          idx: cells.indexOf(on), n: cells.length,
          left: cs.left, right: cs.right, top: cs.top, bottom: cs.bottom,
          radius: cs.borderRadius, mask: cs.maskImage || cs.webkitMaskImage || '',
        };
      }, sel);
      if (!info) { console.log('\n▣ ' + hname + '  — 활성 칸 없음(건너뜀)'); continue; }
      hosts++;

      console.log('\n▣ ' + hname + '  알약 ' + info.w.toFixed(1) + '×' + info.h.toFixed(1)
        + ' @ ' + info.x.toFixed(1) + ',' + info.y.toFixed(1)
        + '  (칸 ' + (info.idx + 1) + '/' + info.n + ')');

      /* ---------- [A] 선언 산수 ---------- */
      const inL = parseFloat(info.left) || 0, inR = parseFloat(info.right) || 0;
      const pl = pillar(info.mask);
      if (!isFinite(pl.l)) {
        console.log('   [A] 마스크 없음 — ' + (info.mask || 'none') + ' (끝 칸 갈래 — 이 결함의 자리가 아니다)');
        continue;
      }
      masked++;
      /* 알약 좌표로 환산 */
      const gotL = [inL, inL + pl.l];
      const gotR = [info.w - inR - pl.r, info.w - inR];
      console.log('   [A] 상자 인셋 좌 ' + inL + ' 우 ' + inR + ' · r' + info.radius
        + ' · 기둥 폭 ' + pl.l + '/' + pl.r);
      console.log('       좌 기둥(알약 좌표) ' + gotL[0].toFixed(1) + '..' + gotL[1].toFixed(1)
        + '   기대 0.0..30.0   Δ우변 ' + (gotL[1] - 30).toFixed(1));
      console.log('       우 기둥(알약 좌표) ' + gotR[0].toFixed(1) + '..' + gotR[1].toFixed(1)
        + '   기대 ' + (info.w - 30).toFixed(1) + '..' + info.w.toFixed(1)
        + '   Δ좌변 ' + (gotR[0] - (info.w - 30)).toFixed(1));

      /* ---------- [B] 찍힌 픽셀 ---------- */
      await shoot(page, 'A');
      await page.evaluate(c => {
        const s = document.createElement('style'); s.id = 'v463'; s.textContent = c; document.head.appendChild(s);
      }, FIX);
      await page.waitForTimeout(220);
      await shoot(page, 'B');
      const d = await diffBox(page, info);
      await page.evaluate(() => { const s = document.getElementById('v463'); if (s) s.remove(); });
      await page.waitForTimeout(150);

      const colKeys = Object.keys(d.cols).map(Number).sort((a, b) => a - b);
      console.log('   [B] 마스크 23px 주입 대조 — 다른 픽셀 **' + d.n + '개**'
        + (d.n ? ' · 열 ' + d.xmin + '..' + d.xmax + ' · 행 ' + d.ymin + '..' + d.ymax : ''));
      if (d.n) {
        /* 좌·우 두 띠로 갈라 찍는다 */
        const left = colKeys.filter(x => x < info.w / 2), right = colKeys.filter(x => x >= info.w / 2);
        console.log('       좌 띠 열 ' + (left.length ? left[0] + '..' + left[left.length - 1] : '없음')
          + '   우 띠 열 ' + (right.length ? right[0] + '..' + right[right.length - 1] : '없음'));
        strips++;
        /* 코너 기둥(0..30) 안이 깨끗한가 = 수정이 코너를 안 건드린다 */
        const inCorner = colKeys.filter(x => x < 30 || x > info.w - 30).length;
        if (inCorner === 0) cornerClean++;
        ok('   [D] ' + hname + ' — 진짜 코너 기둥(알약 x 0..30 · W−30..W) 안은 Δ0',
          inCorner === 0, inCorner + '열');
      } else {
        cornerClean++;
        ok('   [D] ' + hname + ' — 코너 기둥 Δ0 (전체가 Δ0)', true, '0열');
      }

      /* ---------- [C] 단면 ---------- */
      if (d.n) {
        /* 문제의 띠 **안쪽** 열을 고른다 — 직선부 한복판을 고르면 둘 다 같아서 아무것도 안 보인다 */
        const lx = Math.round((d.xmin + Math.min(d.xmax, d.xmin + 6)) / 2);
        const now = runs(await column(page, info, lx, 'A'));
        const fix = runs(await column(page, info, lx, 'B'));
        console.log('   [C] 알약 x=' + lx + ' 세로 단면');
        console.log('       현행 ' + fmt(now));
        console.log('       수정 ' + fmt(fix));
        console.log('       부모 기대 (배경 그라데이션) B7.0 F63.0 B7.0 D7.0');
      }
      if (process.env.V463_FULL) console.log('       mask = ' + info.mask);
    }

    console.log('\n────── 판정 ──────');
    ok('[A] 마스크를 쓰는 «가운데 칸» 표본이 있다', masked >= 1, masked + '곳 / 호스트 ' + hosts);
    console.log(' [B] 픽셀이 바뀌는 호스트: ' + strips + ' / ' + masked
      + '  ⇒ ' + (strips ? '등재문 ⓑ(«Δ0 유력»)는 **기각** — 실제로 그림이 바뀐다'
        : '등재문 ⓑ 확인 — 지금은 그림이 안 바뀐다(잠복)'));
    ok('[D] 코너 기둥은 어느 호스트에서도 안 바뀐다', masked >= 1 && cornerClean === masked, cornerClean + '/' + masked);
    ok('[C] 콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 80) : ''));

    console.log('\n' + (fail ? 'FAIL ' + fail + ' / ' : '') + 'PASS ' + pass + '/' + (pass + fail));
    process.exitCode = fail ? 1 : 0;
  } finally { await browser.close(); }
})();
