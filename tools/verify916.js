/* 작업 916 게이트 — 89 유물 소환 팝업(#relw) 슬롯 `Lv.n` 라벨(.rw-c>u)
 * [3]-(가) 자로 재는 수치 (비평가 없음) · 제품 `index.html` **0줄**(등재문 기각).
 *
 * ══ 이 자가 지키는 것은 «값» 이 아니라 «창» 이다 ══════════════════════════════
 * 등재문(879 5회차)은 ref `Lv.43` 잉크를 **y200–214 = 15 ref px**(환산 33.3)로 읽고
 * «우리 27 ⇒ −19% · 서열이 ref ×1.15 ↔ 우리 ×0.84 로 뒤집혔다» 고 적었다.
 * 재현(`probe916`)이 그 15 를 그대로 만들어 냈고 **어디서 나왔는지도 같이 찍었다** —
 * 1행 **0번 칸만** 아이콘 아트가 밝아 y185~202 에 흰 화소를 남긴다(1·2번 칸은 그 띠에서 0개).
 * 창을 y200 위로 열면 그 칸에서만 잉크가 3~4행 자란다. 좁은 창(y202~)으로 재면
 * 세 칸 전부 **11~13 ref px**(측정표 §19 «11~12» 와 일치)이고, 우리 28.7 은 환산 27.4 대비 **+4.6%** 다.
 * ⇒ «−19%» 도 «서열 뒤집힘» 도 **창이 만든 값**이다. 남는 실차는 세로가 아니라
 *   **종횡비 −10.7%**(우리 서체가 같은 높이에서 좁다)이고 그 축은 892 가 이미
 *   «등방 배율에 불변 ⇒ 아트/서체 몫» 으로 닫았다(`verify860` 머리말 ④).
 *
 * ⚠ 그래서 이 자는 «우리 라벨이 27~30 인가» 만 묻지 않는다. 그것만 물으면
 *   **같은 유령이 다른 번호로 다시 등재된다**(자가 유령을 못 막는다). 세 겹으로 묻는다:
 *     [A] ref 를 재는 **창 규칙**(좁은 창 11~13 · 0번 칸 오염의 존재와 국소성)
 *     [B] 우리 잉크(가시성 차분 마스크 ∩ 흰 화소)
 *     [C] **서열 부호** — ref(좁은 창)·우리 둘 다 Lv < 캡션 (문턱 사슬 전체에서 불변)
 *     [R] 되돌림 시험 — 넓은 창을 쓰면 등재문의 값이 되살아나고(유령 재현),
 *         등재문 처방(라벨 확대)을 따르면 [B] 가 빨개진다(헛초록 아님)
 *
 * 근거: `tools/probe916.js` · 측정표 89 §19·§37 · `verify860` 머리말(892 이관) · A3-ⓑ 교훈.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const PNG = require('./png913').PNG();
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const REF = path.resolve(__dirname, '..', 'docs', 'ref', '89-유물-팝업.png');
const REF_K = 1080 / 486;
const HEIGHTS = [1920, 2280];
const THS = [110, 130, 150, 170, 190, 210];

let pass = 0, fail = 0; const bad = [];
function ck(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}
function bbox(px, W, win, th, mode, mask) {
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = win.y0; y <= win.y1; y++) for (let x = win.x0; x <= win.x1; x++) {
    const i = ((y * W + x) << 2);
    if (px[i + 3] < 128) continue;
    if (mask && !mask[y * W + x]) continue;
    const ok = mode === 'white' ? Math.min(px[i], px[i + 1], px[i + 2]) > th
                                : (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) > th;
    if (ok) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  return maxX < 0 ? null : { w: maxX - minX + 1, h: maxY - minY + 1, y0: minY, y1: maxY };
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;

/* ── [A] ref — 창 규칙 (프레임과 무관하므로 한 번만) ───────────────────────── */
const ref = PNG.sync.read(fs.readFileSync(REF));
const slotL = [216, 462, 711].map(v => v / REF_K);
const slotW = 151 / REF_K;
const lvWin = (l, y0) => ({ x0: Math.round(l - 6), x1: Math.round(l + slotW + 6), y0, y1: 222 });
const capWin = { x0: 30, x1: 456, y0: 630, y1: 658 };

const refT = THS.map(th => slotL.map(l => bbox(ref.data, ref.width, lvWin(l, 202), th, 'white')));
const refW = THS.map(th => slotL.map(l => bbox(ref.data, ref.width, lvWin(l, 185), th, 'white')));
const refCap = THS.map(th => bbox(ref.data, ref.width, capWin, th, 'lum'));

console.log('[A] ref 창 규칙 (486×687 · ×' + REF_K.toFixed(4) + ')');
ck('[A1] ref 좁은 창(y202~) Lv 잉크 h 가 3칸 × 문턱 6단 전부 11~13 ref px',
   refT.every(r => r.every(b => b && b.h >= 11 && b.h <= 13)),
   refT.map((r, i) => THS[i] + ':' + r.map(b => (b ? b.h : '–')).join('/')).join(' '));
ck('[A2] ref 넓은 창(y185~)에서 **0번 칸만** 3행 이상 자란다 (등재문의 15 가 나온 자리)',
   refT.every((r, i) => refW[i][0].h - r[0].h >= 3),
   refT.map((r, i) => THS[i] + ':' + (refW[i][0].h - r[0].h)).join(' '));
/* ⚠ 1회차에 이 항을 «오염은 0번 칸 고유» 로 적었다가 빨개졌다 — 2번 칸에도 아이콘 잔재가 있다
 *   (0/1/2 = 17/0/17~18 행). 오염은 «어느 칸» 이 아니라 **아이콘 아트에 달렸다**는 것이 사실이고,
 *   그래서 묻는 것을 바꿨다: 좁은 창은 칸을 안 타고(편차 ≤1), 넓은 창은 칸을 탄다(편차 ≥5).
 *   이것이 «창이 값을 만든다» 의 정확한 진술이고, 1번 칸(무오염)이 0·2번 칸을 반증한다. */
ck('[A3] 좁은 창은 **칸을 안 탄다** — 3칸 h 편차 ≤ 1 (문턱 사슬 전체)',
   refT.every(r => Math.max(...r.map(b => b.h)) - Math.min(...r.map(b => b.h)) <= 1),
   refT.map((r, i) => THS[i] + ':' + (Math.max(...r.map(b => b.h)) - Math.min(...r.map(b => b.h)))).join(' '));
ck('[A3b] 넓은 창은 **칸을 탄다** — 3칸 h 편차 ≥ 5 (아이콘 아트가 밝은 칸에서만 자란다)',
   refW.slice(0, 4).every(r => Math.max(...r.map(b => b.h)) - Math.min(...r.map(b => b.h)) >= 5),
   refW.map((r, i) => THS[i] + ':' + r.map(b => b.h).join('/')).join(' '));
ck('[A4] ref 캡션 1행 잉크 h = 13 (문턱 사슬 전체 불변 · 측정표 §37)',
   refCap.every(b => b && b.h === 13), refCap.map((b, i) => THS[i] + ':' + (b ? b.h : '–')).join(' '));
const refLvH150 = avg(refT[THS.indexOf(150)].map(b => b.h));
const refCapH150 = refCap[THS.indexOf(150)].h;
ck('[A5] 서열 — ref(좁은 창) 은 문턱 사슬 전체에서 Lv **<** 캡션 (등재문의 ×1.15 와 반대)',
   refT.every((r, i) => avg(r.map(b => b.h)) / refCap[i].h < 1),
   refT.map((r, i) => (avg(r.map(b => b.h)) / refCap[i].h).toFixed(3)).join(' '));
ck('[A6] 넓은 창으로 재면 그 부호가 **뒤집힌다** (유령의 기계 — 창이 값을 만든다)',
   refW.every((r, i) => avg(r.map(b => b.h)) / refCap[i].h > 1),
   refW.map((r, i) => (avg(r.map(b => b.h)) / refCap[i].h).toFixed(3)).join(' '));

(async () => {
  const browser = await launch(chromium);
  try {
    for (const H of HEIGHTS) {
      console.log(`\n[frameH ${H}]`);
      const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(URL);
      await page.waitForTimeout(700);

      const geom = await page.evaluate(async () => {
        RELICS.forEach((x, i) => { S.own[x.id] = { n: 0, l: [43, 28, 29, 9, 10, 12, 10, 11, 9, 10][i] }; });
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
        return { us: us.map(R), cap: R(cap), texts: us.map(e => e.textContent) };
      });

      /* 가시성 차분 마스크 ∩ 밝은 잉크 — 이모지·이웃 라벨·글로우를 배제한다 */
      const inkOf = async (sel, idx, mode, th) => {
        const r = idx == null ? geom.cap : geom.us[idx];
        const pad = 8;
        const clip = { x: Math.max(0, Math.round(r.l) - pad), y: Math.max(0, Math.round(r.t) - pad),
                       width: Math.round(r.w) + pad * 2, height: Math.round(r.h) + pad * 2 };
        clip.width = Math.min(clip.width, 1080 - clip.x); clip.height = Math.min(clip.height, H - clip.y);
        const on = PNG.sync.read(await page.screenshot({ clip }));
        await page.evaluate(({ sel, idx }) => {
          const els = [...document.querySelectorAll(sel)];
          (idx == null ? [els[0]] : [els[idx]]).forEach(e => { e.dataset.v916 = '1'; e.style.visibility = 'hidden'; });
        }, { sel, idx });
        await page.waitForTimeout(60);
        const off = PNG.sync.read(await page.screenshot({ clip }));
        await page.evaluate(() => { document.querySelectorAll('[data-v916]').forEach(e => { e.style.visibility = ''; delete e.dataset.v916; }); });
        await page.waitForTimeout(60);
        const mask = new Uint8Array(on.width * on.height);
        for (let i = 0, k = 0; i < on.data.length; i += 4, k++) {
          if (Math.abs(on.data[i] - off.data[i]) > 8 || Math.abs(on.data[i + 1] - off.data[i + 1]) > 8 ||
              Math.abs(on.data[i + 2] - off.data[i + 2]) > 8) mask[k] = 1;
        }
        return bbox(on.data, on.width, { x0: 0, x1: on.width - 1, y0: 0, y1: on.height - 1 }, th, mode, mask);
      };
      const lvAt = async th => { const a = []; for (let i = 0; i < 3; i++) a.push(await inkOf('#relw .rw-c>u', i, 'white', th)); return a; };

      ck(`[${H}] 페이지 오류 0건`, errs.length === 0, errs.slice(0, 2).join(' | '));
      ck(`[${H}] 라벨 문자열이 ref 와 같은 5자 (「Lv.43·Lv.28·Lv.29」)`,
         JSON.stringify(geom.texts) === JSON.stringify(['Lv.43', 'Lv.28', 'Lv.29']), geom.texts.join(' '));

      const lv150 = await lvAt(150);
      const cap150 = await inkOf('#relw .rw-cap p', null, 'lum', 150);
      const lvH = avg(lv150.map(b => b.h)), lvW = avg([lv150[1].w, lv150[2].w]);
      const dH = 100 * (lvH / (refLvH150 * REF_K) - 1);

      console.log(`  · Lv 잉크 h=${lvH.toFixed(1)} w=${lvW.toFixed(1)} · 캡션 h=${cap150.h} w=${cap150.w}`);
      ck(`[${H}] [B1] Lv 잉크 h 26~30 (현행 27.0 · 래칫)`, lvH >= 26 && lvH <= 30, lvH.toFixed(2));
      ck(`[${H}] [B2] Lv 잉크 h 가 ref 환산(${(refLvH150 * REF_K).toFixed(1)}) 대비 |Δ| ≤ 12% — «−19%» 가 아니다`,
         Math.abs(dH) <= 12, dH.toFixed(1) + '%');
      ck(`[${H}] [B3] 캡션 1행 잉크 h 30~34 · w 890~915 (885 가 폭을 앵커로 잡은 자리)`,
         cap150.h >= 30 && cap150.h <= 34 && cap150.w >= 890 && cap150.w <= 915, `${cap150.h}×${cap150.w}`);
      /* [B4]·[B5] — 폭 축은 **판정이 아니라 래칫**이다.
       *   ref 폭 39 ref px 는 문턱 110~210 에서 미동도 없다(1·2번 칸) ⇒ 환산 86.7 이고 눈금 한 칸이
       *   ±2.2px(±2.6%) 다. 우리 현행(scaleX 1.1)은 91 = **+5.0%**, scaleX 를 걷으면 82.7 = **−4.6%** —
       *   **어느 쪽도 눈금 두 칸 안**이라 «맞다/틀리다» 를 못 가른다. 그래서 걷는 수리도, 더 늘이는
       *   수리도 하지 않고(제품 0줄) 지금 자리를 못박아 표류만 막는다(860 §R3 «래칫» 과 같은 뜻). */
      ck(`[${H}] [B4] Lv 잉크 w 88~94 (현행 91.0 래칫 · ref 환산 86.7 대비 +5.0% = 눈금 2칸 안)`,
         lvW >= 88 && lvW <= 94, lvW.toFixed(1));
      ck(`[${H}] [B5] Lv w/h 3.20~3.55 (현행 3.370 · ref 3.25 대비 +3.7%) — 비등방 변경에 즉시 반응한다`,
         (lvW / lvH) >= 3.20 && (lvW / lvH) <= 3.55, (lvW / lvH).toFixed(3));

      /* [C] 서열 — 문턱 사슬 전체에서 부호가 안 바뀐다 */
      const ratios = [];
      for (const th of THS) {
        const l = await lvAt(th), c = await inkOf('#relw .rw-cap p', null, 'lum', th);
        ratios.push(avg(l.map(b => b.h)) / c.h);
      }
      ck(`[${H}] [C1] 우리도 Lv **<** 캡션 — 문턱 6단 전부 (서열은 뒤집혀 있지 않다)`,
         ratios.every(v => v < 1), ratios.map(v => v.toFixed(3)).join(' '));
      ck(`[${H}] [C2] 그 비가 ref(좁은 창)와 0.15 이내 — «37% 뒤집힘» 이 아니다`,
         Math.abs(ratios[THS.indexOf(150)] - (refLvH150 / refCapH150)) <= 0.15,
         `우리 ${ratios[THS.indexOf(150)].toFixed(3)} ↔ ref ${(refLvH150 / refCapH150).toFixed(3)}`);

      /* [R] 되돌림 시험 — 등재문 처방(라벨 확대)을 따르면 [B] 가 빨개진다 */
      await page.evaluate(() => {
        document.querySelectorAll('#relw .rw-c>u').forEach(e => { e.style.fontSize = '42px'; });
        void document.body.offsetHeight;
      });
      await page.waitForTimeout(120);
      const lvBig = avg((await lvAt(150)).map(b => b.h));
      const dBig = 100 * (lvBig / (refLvH150 * REF_K) - 1);
      ck(`[${H}] §R1 등재문 처방대로 42px 로 키우면 ref 대비 +12% 를 **넘어** [B2] 가 빨개진다`,
         Math.abs(dBig) > 12, `h=${lvBig.toFixed(1)} ⇒ ${dBig.toFixed(1)}%`);
      await page.evaluate(() => { document.querySelectorAll('#relw .rw-c>u').forEach(e => { e.style.fontSize = ''; }); void document.body.offsetHeight; });
      await page.waitForTimeout(120);
      const lvBack = avg((await lvAt(150)).map(b => b.h));
      ck(`[${H}] §R2 원복하면 다시 [B1] 대역 (헛초록 아님)`, lvBack >= 26 && lvBack <= 30, lvBack.toFixed(2));

      /* §R3 — «scaleX(1.1) 을 걷는다» 는 대안이 실제로 어디에 착지하는지 찍는다.
       *   걷으면 폭이 ref 아래로 **부호만** 바뀌고(+5.0% → −4.6%) [B4] 가 빨개진다.
       *   ⇒ 걷는 것도 «수리» 가 아니다(같은 크기의 반대 오차) — 제품 0줄의 근거다. */
      await page.evaluate(() => {
        document.querySelectorAll('#relw .rw-c>u').forEach(e => { e.style.transform = 'none'; });
        void document.body.offsetHeight;
      });
      await page.waitForTimeout(120);
      const lvNoSx = await lvAt(150);
      const wNoSx = avg([lvNoSx[1].w, lvNoSx[2].w]);
      const dNoSx = 100 * (wNoSx / (39 * REF_K) - 1);
      ck(`[${H}] §R3 scaleX(1.1) 을 걷으면 폭이 ref 아래로 부호만 바뀐다 (−3~−7%) ⇒ [B4] 빨강`,
         dNoSx < -3 && dNoSx > -7 && !(wNoSx >= 88 && wNoSx <= 94), `w=${wNoSx.toFixed(1)} ⇒ ${dNoSx.toFixed(1)}%`);
      await page.evaluate(() => { document.querySelectorAll('#relw .rw-c>u').forEach(e => { e.style.transform = ''; }); void document.body.offsetHeight; });
      await page.waitForTimeout(120);

      await ctx.close();
    }
    console.log(`\nVERIFY916  ${pass}/${pass + fail}` + (fail ? '  FAIL: ' + bad.join(' · ') : '  PASS'));
    process.exit(fail ? 1 : 0);
  } finally { await browser.close(); }
})();
