/* 작업 916 재현 자 — 89 유물 소환 팝업(#relw) 의 슬롯 `Lv.n` 라벨(.rw-c>u)
 *
 * 등재문(879 5회차 ER·ES)과 측정표 §19 가 **서로 다른 부호**를 말한다:
 *   · 등재문 : ref `Lv.43` 잉크 y200–214 = 15 ref px(환산 33.3) ↔ 우리 27 ⇒ **−19%**
 *              관계로도 ref Lv(15) > 캡션(13) = ×1.15 ↔ 우리 Lv(27) < 캡션(32) = ×0.84 «서열 뒤집힘»
 *   · 측정표 §19 : ref Lv 잉크 h≈11~12(환산 26) ↔ 우리 27 ⇒ **+4%**(거의 맞다)
 * 두 자가 «ref 의 같은 글자» 를 다르게 읽었으므로 처방 전에 **같은 자로 둘 다** 잰다(338 규칙).
 *
 * ── 이 자가 쓰는 두 가지 규칙(둘 다 «밝은 잉크» 자이고 ref·우리에 **같이** 적용된다) ──
 *  ⓐ 흰 잉크 = min(R,G,B) > 문턱 — Lv 라벨은 #fff 이고 슬롯 테두리(#A67B50)·내부 radial 글로우는
 *     채도가 있어 min 채널이 낮다. 휘도 자로 재면 배경이 섞인다(1회차에 Lv h 가 60 으로 나왔다).
 *  ⓑ 크림 잉크 = 휘도 > 문턱 — 캡션은 #FFE4C2/#F1BC79 라 흰색 자에 안 걸린다.
 *
 * ── 창(window) 이 이 작업의 본체다 ──
 *  ref 슬롯 «1행 0번 칸» 은 **아이콘 아트 자체가 밝아** y185~202 에 흰 화소를 남긴다(1·2번 칸은 0개).
 *  그래서 창을 y200 위로 열면 0번 칸에서만 잉크가 **위로 3~4행 자란다** — 등재문의 15 가 그 값이다.
 *  이 자는 넓은 창(y185~222)과 좁은 창(y202~222)을 **둘 다** 찍어 그 차이를 눈에 보이게 한다.
 *  우리 쪽도 같은 함정이 있다(이모지 `.rw-c>i` 가 라벨 줄상자 위쪽을 덮는다) ⇒ 우리 잉크는
 *  **가시성 차분 마스크**(그 노드를 껐을 때 바뀌는 화소) ∩ 흰 화소로만 잰다.
 *
 * A3-ⓑ 교훈 — «임계 스윕 없는 크기 지적은 믿지 마라. 진짜 지적은 문턱을 흔들어도 부호가 안 바뀐다.»
 *
 * [3]-(가) 자로 재는 수치 — 비평가 없음.
 *   node tools/probe916.js            (frameH 2280)
 *   node tools/probe916.js --h 1600
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const PNG = require('./png913').PNG();
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const REF = path.resolve(__dirname, '..', 'docs', 'ref', '89-유물-팝업.png');
const REF_K = 1080 / 486;                       // 측정표 §배율 ×2.2222

const argv = process.argv.slice(2);
const H = (() => { const i = argv.indexOf('--h'); return i >= 0 ? +argv[i + 1] : 2280; })();
const THS = [110, 130, 150, 170, 190, 210];

function bbox(px, W, win, th, mode, mask) {
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
  for (let y = win.y0; y <= win.y1; y++) for (let x = win.x0; x <= win.x1; x++) {
    const i = ((y * W + x) << 2);
    if (px[i + 3] < 128) continue;
    if (mask && !mask[y * W + x]) continue;
    const ok = mode === 'white'
      ? Math.min(px[i], px[i + 1], px[i + 2]) > th
      : (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) > th;
    if (ok) { n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  return maxX < 0 ? null : { w: maxX - minX + 1, h: maxY - minY + 1, x0: minX, x1: maxX, y0: minY, y1: maxY, n };
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const f = (v, n = 1) => (Number.isFinite(v) ? v.toFixed(n) : ' – ');

(async () => {
  /* ══ 1. ref (486×687) ══ */
  const ref = PNG.sync.read(fs.readFileSync(REF));
  const slotL = [216, 462, 711].map(v => v / REF_K);       // 1행 3칸 좌변(860 이 확정한 216/462/711)
  const slotW = 151 / REF_K;
  const lvWin = (l, y0) => ({ x0: Math.round(l - 6), x1: Math.round(l + slotW + 6), y0, y1: 222 });
  const refCapWin = { x0: 30, x1: 456, y0: 630, y1: 658 };  // 측정표 §37 캡션 1행 (38,639,410,13)

  const refRows = THS.map(th => {
    const wide = slotL.map(l => bbox(ref.data, ref.width, lvWin(l, 185), th, 'white'));
    const tight = slotL.map(l => bbox(ref.data, ref.width, lvWin(l, 202), th, 'white'));
    const cap = bbox(ref.data, ref.width, refCapWin, th, 'lum');
    return { th, wide, tight, cap,
             wideH: avg(wide.map(b => (b ? b.h : NaN))), tightH: avg(tight.map(b => (b ? b.h : NaN))),
             // 폭은 **1·2번 칸만** 평균한다 — 0번 칸은 좁은 창에서도 아이콘 잔재가 라벨 띠의
             // 왼쪽으로 6~11px 들어와(좌변이 y 마다 100→111 로 흔들린다) 폭만 부푼다.
             tightW: avg([tight[1], tight[2]].map(b => (b ? b.w : NaN))),
             tightWs: tight.map(b => (b ? b.w : NaN)),
             capH: cap ? cap.h : NaN, capW: cap ? cap.w : NaN };
  });

  /* ══ 2. 우리 프레임 ══ */
  const browser = await launch(chromium);
  let ourRows = [], errs = [], css = {}, geom = null;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(700);

    geom = await page.evaluate(async () => {
      RELICS.forEach((x, i) => { S.own[x.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      openRelw();
      void document.body.offsetHeight;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const sig = () => [...document.querySelectorAll('#relw .rw-c')]
        .map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(1)},${q.top.toFixed(1)}`; }).join('|');
      let prev = '', same = 0, w = 0;
      while (w < 4000) { await wait(60); w += 60; const s = sig(); same = (s === prev && s) ? same + 1 : 0; prev = s; if (same >= 3) break; }
      const us = [...document.querySelectorAll('#relw .rw-c>u')].slice(0, 3);
      const cap = document.querySelector('#relw .rw-cap p');
      const R = el => { const q = el.getBoundingClientRect(); return { l: q.left, t: q.top, w: q.width, h: q.height }; };
      const cs = getComputedStyle(us[0]), cc = getComputedStyle(cap);
      return { us: us.map(R), cap: R(cap), texts: us.map(e => e.textContent),
               css: { uFs: cs.fontSize, uTf: cs.transform, uStroke: cs.webkitTextStrokeWidth,
                      cFs: cc.fontSize, cLh: cc.lineHeight, cStroke: cc.webkitTextStrokeWidth } };
    });
    css = geom.css;

    /* 가시성 차분 — 그 노드가 그린 화소만 남긴다(이모지·글로우·이웃 라벨 배제) */
    const inkOf = async (sel, idx, pad) => {
      const r = idx == null ? geom.cap : geom.us[idx];
      const clip = { x: Math.max(0, Math.round(r.l) - pad), y: Math.max(0, Math.round(r.t) - pad),
                     width: Math.round(r.w) + pad * 2, height: Math.round(r.h) + pad * 2 };
      clip.width = Math.min(clip.width, 1080 - clip.x); clip.height = Math.min(clip.height, H - clip.y);
      const on = PNG.sync.read(await page.screenshot({ clip }));
      await page.evaluate(({ sel, idx }) => {
        const els = [...document.querySelectorAll(sel)];
        (idx == null ? [els[0]] : [els[idx]]).forEach(e => { e.dataset.p916 = '1'; e.style.visibility = 'hidden'; });
      }, { sel, idx });
      await page.waitForTimeout(60);
      const off = PNG.sync.read(await page.screenshot({ clip }));
      await page.evaluate(() => { document.querySelectorAll('[data-p916]').forEach(e => { e.style.visibility = ''; delete e.dataset.p916; }); });
      await page.waitForTimeout(60);
      const mask = new Uint8Array(on.width * on.height);
      for (let i = 0, k = 0; i < on.data.length; i += 4, k++) {
        if (Math.abs(on.data[i] - off.data[i]) > 8 || Math.abs(on.data[i + 1] - off.data[i + 1]) > 8 ||
            Math.abs(on.data[i + 2] - off.data[i + 2]) > 8) mask[k] = 1;
      }
      return { png: on, mask };
    };

    const lv = [];
    for (let i = 0; i < 3; i++) lv.push(await inkOf('#relw .rw-c>u', i, 8));
    const capI = await inkOf('#relw .rw-cap p', null, 8);

    ourRows = THS.map(th => {
      const bs = lv.map(o => bbox(o.png.data, o.png.width, { x0: 0, x1: o.png.width - 1, y0: 0, y1: o.png.height - 1 }, th, 'white', o.mask));
      const cb = bbox(capI.png.data, capI.png.width, { x0: 0, x1: capI.png.width - 1, y0: 0, y1: capI.png.height - 1 }, th, 'lum', capI.mask);
      return { th, hs: bs.map(b => (b ? b.h : NaN)), ws: bs.map(b => (b ? b.w : NaN)),
               lvH: avg(bs.map(b => (b ? b.h : NaN))), lvW: avg(bs.map(b => (b ? b.w : NaN))),
               capH: cb ? cb.h : NaN, capW: cb ? cb.w : NaN };
    });
  } finally { await browser.close(); }

  /* ══ 3. 출력 ══ */
  console.log(`=== 작업 916 재현 (frameH ${H} · ref 486×687 ×${REF_K.toFixed(4)}) ===`);
  console.log('페이지 오류:', errs.length, errs.slice(0, 3));
  console.log('라벨 문자열:', JSON.stringify(geom.texts), '· CSS:', JSON.stringify(css));

  console.log('\n[A] ref — 창을 어디서 여느냐가 값을 만든다 (Lv 잉크 h · 1행 3칸)');
  console.log('  문턱 | 넓은 창 y185~  (0/1/2칸) | 좁은 창 y202~  (0/1/2칸) | 캡션 h');
  for (const r of refRows)
    console.log(`  ${String(r.th).padStart(4)} | ${r.wide.map(b => String(b ? b.h : '–').padStart(2)).join(' / ')}  (평균 ${f(r.wideH, 1)}) | ` +
                `${r.tight.map(b => String(b ? b.h : '–').padStart(2)).join(' / ')}  (평균 ${f(r.tightH, 1)}) | ${f(r.capH, 0)}`);
  console.log('  ⇒ 0번 칸만 넓은 창에서 3~4행 크다 = 그 칸 **아이콘 아트가 밝아** y185~202 에 흰 화소를 남긴다');
  console.log('    (1·2번 칸은 같은 창에서 흰 화소 0개 — 두 칸이 0번 칸을 반증한다)');

  console.log('\n[B] 우리 — 가시성 차분 마스크 ∩ 흰 잉크 (이모지·이웃 라벨 배제)');
  console.log('  문턱 | Lv h (0/1/2칸) | 평균 | Lv w 평균 | 캡션 h | 캡션 w');
  for (const r of ourRows)
    console.log(`  ${String(r.th).padStart(4)} | ${r.hs.map(v => String(v).padStart(2)).join(' / ')} | ${f(r.lvH).padStart(4)} | ${f(r.lvW).padStart(5)} | ${f(r.capH, 0).padStart(6)} | ${f(r.capW, 0).padStart(6)}`);

  const R = refRows.find(r => r.th === 150), O = ourRows.find(r => r.th === 150);
  console.log('\n[C] 판정 (문턱 150 · ref 는 좁은 창)');
  console.log(`  Lv  잉크 h : ref ${f(R.tightH, 2)} ⇒ 환산 ${f(R.tightH * REF_K)}  ↔  우리 ${f(O.lvH)}   ⇒ ${f(100 * (O.lvH / (R.tightH * REF_K) - 1))}%`);
  console.log(`  Lv  잉크 w : ref ${f(R.tightW, 2)}(1·2번 칸 · 3칸 각각 ${R.tightWs.join('/')}) ⇒ 환산 ${f(R.tightW * REF_K)}  ↔  우리 ${f(O.lvW)}   ⇒ ${f(100 * (O.lvW / (R.tightW * REF_K) - 1))}%`);
  console.log('             (ref 세 라벨은 「Lv.43 · Lv.28 · Lv.29」 로 **전부 5자** — 0번 칸 폭 49 는 문자열이 아니라 아이콘 잔재다)');
  console.log(`  캡션 잉크 h: ref ${f(R.capH, 2)} ⇒ 환산 ${f(R.capH * REF_K)}  ↔  우리 ${f(O.capH)}   ⇒ ${f(100 * (O.capH / (R.capH * REF_K) - 1))}%`);
  console.log(`  캡션 잉크 w: ref ${f(R.capW, 2)} ⇒ 환산 ${f(R.capW * REF_K)} ↔  우리 ${f(O.capW)}  ⇒ ${f(100 * (O.capW / (R.capW * REF_K) - 1))}%`);
  console.log('\n  서열비 Lv/캡션 — 문턱 사슬 전체');
  console.log('   ref (좁은 창):', refRows.map(r => f(r.tightH / r.capH, 3)).join(' '));
  console.log('   ref (넓은 창):', refRows.map(r => f(r.wideH / r.capH, 3)).join(' '), ' ← 등재문이 선 자리');
  console.log('   우리        :', ourRows.map(r => f(r.lvH / r.capH, 3)).join(' '));
  const sgn = a => a.map(v => (v > 1 ? '>' : '<')).join('');
  console.log('   부호열 ref(좁은 창)', sgn(refRows.map(r => r.tightH / r.capH)),
              '· ref(넓은 창)', sgn(refRows.map(r => r.wideH / r.capH)),
              '· 우리', sgn(ourRows.map(r => r.lvH / r.capH)));
})();
