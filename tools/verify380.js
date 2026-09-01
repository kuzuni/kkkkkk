#!/usr/bin/env node
/* 게이트 — 작업 380 「13 재화 카드 수량 라벨 `×N` 의 잉크 «높이» 가 레퍼런스와 같다」
 *
 *   node tools/verify380.js
 *
 * 결함(2026-08-29 등재, 377 곁다리 실측): 가로는 377 이 `--qx` 로 ref 잉크폭에 맞췄는데
 * **세로가 +19~20%** 로 남아 있었다 — `×100` 잉크 101×**37** ↔ ref 97~98×**31** ·
 * `×50` 82×**36** ↔ ref 81×**30**. 글자가 ref 보다 좁고 길었다.
 *
 * 수리: 세로를 정하는 축은 `.cn-cd>.qt{font-size}` 하나이고 값은 **ref 잉크에서 역산**했다
 *   ×100 : 39.3 × (31−8)/(37−8) = 31.17   ×50 : 39.3 × (30−8)/(36−8) = 30.88  ⇒ **31px**
 * 그 축은 §7 다이아 판매(116)·§9 유물조각·§10 입장권과 **공용**이라(등재문 ⚠) 세로는 한 번에 내리고,
 * **폭은 계열마다 `--qk` 로 되돌렸다** — ref 가 있는 것은 광고 칸뿐이고 나머지 계열의 목표는
 * «수리 전 폭 그대로» 다. 광고 칸의 `qx` 만 377 과 **같은 방법으로** 다시 역산했다(1.08 → 1.33).
 *
 * ⚑ 자를 잘못 대면 이 결함은 안 보인다(377 이 못박은 함정을 그대로 물려받는다) —
 *   잉크는 `-webkit-text-stroke:8px`(위·아래 4px씩)까지라 rect·scrollWidth 는 «정상» 이라고 답한다.
 *   그래서 계산 스타일을 복사한 **사본을 마젠타 판 위에 띄워 찍고 잉크 bbox** 를 잰다.
 *
 * 지키는 성질
 *   [전제] 하네스 — 정식 경로로 13 재화 탭이 열리고 계열이 넷이다(ad 4 · dia 5 · rel 3 · dtk 8)
 *   [A] 광고 4칸 잉크 **높이** = ref(×100 31 · ×50 30) ±1
 *   [B] 세로 축은 계열 공용 — 20칸 전부 같은 `font-size`(«광고 칸만 줄였다» 로 새는 것을 막는다)
 *   [C] 잉크 **세로 자리**가 ref 띠(카드 기준 dy 167~172) 안이다 — 크기를 고치며 위치가 밀리지 않았다
 *   [D] 폭 회귀 — 광고 칸은 ref 폭 ±5(377 의 축) · dia·rel·dtk 는 **수리 전 폭 ±2**(남의 칸을 안 밀었다)
 *   [E] 손잡이 — `--qk`(폭 보존 배수)는 dia·rel·dtk 에만 있고 광고 칸은 1 이다
 *   [R] 되돌림 시험 — `font-size` 를 옛 39.3px 으로 되돌린 사본에서 [A] 가 빨개진다(높이 37·36)
 *   [R2] 두 번째 되돌림 — `--qk` 를 뺀 사본에서는 dia·rel·dtk 폭이 −7~−41px 로 줄어든다
 *        (= 이 보정이 실제로 일하고 있다. 여기가 초록이면 [D] 는 «저절로 맞는» 헛초록이다)
 *   [G] 콘솔 에러 0
 *
 * [3]-(가) 기계적 검증 — 레퍼런스 «대조» 는 측정표 수치와의 산술 비교라 비평가를 안 띄운다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const SRC = path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;

/* 레퍼런스 — 측정표 docs/measure/13-상점팝업재화탭.md §5-2 6행(«dy 167~172 · h 29~33»)·§5-3,
   그리고 index.html 6회차 정오(ref ① «×100» 잉크 97~98×31 @ x279~376 y1049~1080) */
const REF_H = { '×100': 31, '×50': 30 };
const REF_W = { '×100': 97.5, '×50': 81 };
const REF_DY = [167, 172];
/* 수리 전(380 착수 시점) 실측 렌더 폭 — `tools/probe380.js` 1회차. 계열별로 키를 나눈다
   (rel 의 «×100» 은 광고 칸과 문자열이 같지만 폭이 다르다 — 한 키로 묶으면 유령이 나온다) */
const BEFORE_W = {
  'ad ×100': 101, 'ad ×50': 82,
  'dia ×5,000': 118, 'dia ×35,000': 139, 'dia ×75,000': 140, 'dia ×450,000': 171, 'dia ×1,000,000': 204,
  'rel ×100': 93, 'rel ×1,000': 129, 'rel ×10,000': 134,
  'dtk ×1': 43
};
const NEW_FS = 'font-size:31px;line-height:30px', OLD_FS = 'font-size:39.3px;line-height:30px';

let pass = 0, fail = 0;
const is = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : ' FAIL ') + m); };
const r1 = (v) => Math.round(v * 100) / 100;

const open = async (ctx, url) => {
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    window.step = () => {};
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.dia = 30000; S.gold = 1e9; S.relic = 5000;
    S.daily = S.daily || {}; S.daily.adBuy = {};
    openShopPage();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('#shopCats [data-cat]')].find(x => x.dataset.cat === 'coin');
    if (t) t.click();
  });
  await page.waitForTimeout(700);
  return { page, errs };
};

/* 계산 스타일을 복사한 사본을 마젠타 판에 깔고 잉크 bbox 를 잰다.
   ⚠ 판은 뷰포트 안이어야 하고(넘치면 잘린 자리가 통째로 «잉크» 로 읽힌다),
     행 창은 pitch 보다 좁아야 한다(넓으면 이웃 행이 섞여 높이가 두 배로 읽힌다). */
const measure = async (page) => {
  const HX = 40, HY = 180, PAD = 300, PITCH = 72;
  const M = await page.evaluate(([HX, HY, PAD, PITCH]) => {
    const cards = [...document.querySelectorAll('.shp-list.coin .cn-cd')];
    const old = document.getElementById('v380host'); if (old) old.remove();
    const host = document.createElement('div');
    host.id = 'v380host';
    host.style.cssText = 'position:fixed;left:' + HX + 'px;top:' + HY + 'px;width:1000px;height:'
      + (10 + cards.length * PITCH + 60) + 'px;background:#FF00FF;z-index:2147483647;overflow:visible;pointer-events:none';
    document.body.appendChild(host);
    const CP = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'color', 'white-space', 'text-indent', 'transform', 'transform-origin', 'paint-order',
      '-webkit-text-stroke-width', '-webkit-text-stroke-color'];
    const rows = cards.map((c, i) => {
      const q = c.querySelector('.qt');
      const cs = getComputedStyle(q), cc = getComputedStyle(c);
      const cr = c.getBoundingClientRect(), qr = q.getBoundingClientRect();
      const clone = document.createElement('div');
      clone.textContent = q.textContent;
      CP.forEach(k => clone.style.setProperty(k, cs.getPropertyValue(k)));
      clone.style.position = 'absolute';
      clone.style.left = PAD + 'px';
      clone.style.top = (10 + i * PITCH) + 'px';
      clone.style.height = cs.height;
      host.appendChild(clone);
      const b = clone.getBoundingClientRect();
      return {
        txt: q.textContent,
        fam: c.classList.contains('dia') ? 'dia' : c.classList.contains('rel') ? 'rel'
          : c.classList.contains('dtk') ? 'dtk' : 'ad',
        fs: parseFloat(cs.fontSize),
        qx: cc.getPropertyValue('--qx').trim(),
        qk: (getComputedStyle(q).getPropertyValue('--qk').trim() || '1'),
        card: { l: cr.left, t: cr.top }, qt: { l: qr.left, t: qr.top },
        box: { l: b.left - HX, t: b.top - HY }
      };
    });
    return { rows, host: { x: HX, y: HY, w: 1000, h: 10 + cards.length * PITCH + 60 }, pitch: PITCH };
  }, [HX, HY, PAD, PITCH]);

  if (M.host.y + M.host.h > H) throw new Error('사본 판이 뷰포트를 넘는다 — ' + (M.host.y + M.host.h));
  await page.waitForTimeout(120);
  const shot = await page.screenshot({ clip: { x: M.host.x, y: M.host.y, width: M.host.w, height: M.host.h } });
  const scan = await page.evaluate(async ([b64, hw, hh]) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = hw; cv.height = hh;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, hw, hh).data;
    const rows = [];
    for (let y = 0; y < hh; y++) {
      let a = -1, z = -1;
      for (let x = 0; x < hw; x++) {
        const o = (y * hw + x) * 4;
        if (Math.max(255 - d[o], d[o + 1], 255 - d[o + 2]) > 40) { if (a < 0) a = x; z = x; }
      }
      rows.push([a, z]);
    }
    return rows;
  }, [shot.toString('base64'), M.host.w, M.host.h]);
  await page.evaluate(() => { const h = document.getElementById('v380host'); if (h) h.remove(); });

  return M.rows.map((r, i) => {
    const y0 = Math.max(0, 10 + i * M.pitch - 12), y1 = Math.min(M.host.h - 1, 10 + i * M.pitch + 44);
    let l = Infinity, rr = -Infinity, t = Infinity, b = -Infinity;
    for (let y = y0; y <= y1; y++) { const [a, z] = scan[y]; if (a >= 0) { l = Math.min(l, a); rr = Math.max(rr, z); t = Math.min(t, y); b = Math.max(b, y); } }
    return Object.assign({}, r, {
      key: r.fam + ' ' + r.txt,
      inkW: (rr + 1) - l, inkH: (b + 1) - t,
      dyTop: (r.qt.t - r.card.t) + (t - r.box.t)
    });
  });
};

(async () => {
  console.log('=== VERIFY 380 — 13 재화 카드 `×N` 라벨의 잉크 높이가 레퍼런스와 같다 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');
  /* 되돌림 사본 둘. ⚠ 상대 경로 자산(웹폰트 126) 때문에 **반드시 같은 폴더**에 둔다 —
     저장소 밖(/tmp)에 두면 폴백 서체로 떨어져 같은 커밋이 다른 수를 낸다(377 1회차의 함정). */
  const revA = src.replace(NEW_FS, OLD_FS);                       /* 세로 축을 되돌린 사본 */
  const revB = src.replace(/;--qk:[0-9.]+/g, '');                 /* 폭 보존 손잡이를 뺀 사본 */
  const pA = path.join(path.dirname(SRC), `.verify380-fs-${process.pid}.html`);
  const pB = path.join(path.dirname(SRC), `.verify380-qk-${process.pid}.html`);
  fs.writeFileSync(pA, revA); fs.writeFileSync(pB, revB);
  process.on('exit', () => { [pA, pB].forEach(f => { try { fs.unlinkSync(f); } catch (e) {} }); });

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  const cur = await open(ctx, 'file://' + SRC);
  const M = await measure(cur.page);
  const ad = M.filter(c => c.fam === 'ad');
  const others = M.filter(c => c.fam !== 'ad');

  console.log('[전제] 하네스');
  is(M.length >= 16, '  [전제] 13 재화 탭 `.cn-cd` ' + M.length + '칸(≥16)');
  is(ad.length === 4, '  [전제] 광고 칸 4개 — ' + ad.map(c => c.txt).join(' · '));
  is(['dia', 'rel', 'dtk'].every(f => M.some(c => c.fam === f)),
    '  [전제] 같은 축을 쓰는 다른 계열이 셋 다 있다 — dia ' + M.filter(c => c.fam === 'dia').length
    + ' · rel ' + M.filter(c => c.fam === 'rel').length + ' · dtk ' + M.filter(c => c.fam === 'dtk').length);

  console.log('\n[A] 광고 4칸 잉크 **높이** = ref(×100 31 · ×50 30) ±1 — 이 작업의 본체');
  ad.forEach(c => is(Math.abs(c.inkH - REF_H[c.txt]) <= 1,
    '  A ' + c.txt.padEnd(5) + ' 잉크 ' + c.inkW + '×**' + c.inkH + '** vs ref ' + REF_W[c.txt] + '×'
    + REF_H[c.txt] + ' (세로 Δ' + r1(c.inkH - REF_H[c.txt]) + ')'));

  console.log('\n[B] 세로 축은 계열 공용 — 전 칸이 같은 `font-size`');
  is(new Set(M.map(c => c.fs)).size === 1,
    '  B `font-size` ' + [...new Set(M.map(c => c.fs))].join(' / ') + 'px · ' + M.length + '칸 동일');
  is(ad[0].fs === 31, '  B-b 그 값 = 31px (ref 잉크 역산: 39.3 × 23/29 = 31.17 · 39.3 × 22/28 = 30.88)');

  console.log('\n[C] 잉크 세로 자리가 ref 띠(dy ' + REF_DY[0] + '~' + REF_DY[1] + ') 안이다 — 위치 축은 안 건드렸다');
  const dyBad = M.filter(c => c.dyTop < REF_DY[0] || c.dyTop > REF_DY[1]);
  is(dyBad.length === 0, '  C 전 칸 dy ' + [...new Set(M.map(c => r1(c.dyTop)))].sort().join('/')
    + (dyBad.length ? ' — 벗어남 ' + dyBad.map(c => c.key + ' ' + r1(c.dyTop)).join(', ') : ''));

  console.log('\n[D] 폭 회귀 — 광고 칸은 ref ±5(377 의 축) · 나머지는 **수리 전 폭 ±2**');
  ad.forEach(c => is(Math.abs(c.inkW - REF_W[c.txt]) <= 5,
    '  D ' + c.txt.padEnd(5) + ' 잉크폭 ' + c.inkW + ' vs ref ' + REF_W[c.txt] + ' (Δ' + r1(c.inkW - REF_W[c.txt]) + ')'));
  ['dia', 'rel', 'dtk'].forEach((f) => {
    const rows = others.filter(c => c.fam === f);
    const bad = rows.filter(c => BEFORE_W[c.key] == null || Math.abs(c.inkW - BEFORE_W[c.key]) > 2);
    is(bad.length === 0, '  D-' + f + ' ' + rows.length + '칸 폭 수리 전 ±2 — '
      + [...new Set(rows.map(c => c.txt + ' ' + c.inkW + '(' + BEFORE_W[c.key] + ')'))].join(' · ')
      + (bad.length ? ' ← 벗어남 ' + bad.map(c => c.key).join(', ') : ''));
  });

  console.log('\n[E] 폭 보존 손잡이 `--qk` 는 남의 계열에만 있다 — 광고 칸은 ref 역산 `qx` 하나로 선다');
  is(ad.every(c => parseFloat(c.qk) === 1), '  E 광고 4칸 --qk = ' + [...new Set(ad.map(c => c.qk))].join('/'));
  is(ad.every(c => c.qx === ad[0].qx) && parseFloat(ad[0].qx) > 1.3,
    '  E-b 광고 4칸 --qx 동일 = ' + ad[0].qx + ' (fs 31 에서 ref 81 역산 = 1.3255 → 1.33)');
  is(['dia', 'rel', 'dtk'].every(f => others.filter(c => c.fam === f).every(c => parseFloat(c.qk) > 1)),
    '  E-c dia/rel/dtk --qk = ' + ['dia', 'rel', 'dtk'].map(f => f + ' ' + others.find(c => c.fam === f).qk).join(' · '));

  console.log('\n[R] 되돌림 시험 ① — `font-size` 를 옛 39.3px 으로 되돌린 사본에서 [A] 가 빨개진다');
  is(revA !== src && revA.includes(OLD_FS), '  R-0 사본 편집이 먹었다(`' + OLD_FS.split(';')[0] + '`)');
  {
    const rev = await open(ctx, 'file://' + pA);
    const RM = await measure(rev.page);
    const r100 = RM.find(c => c.fam === 'ad' && c.txt === '×100');
    const r50 = RM.find(c => c.fam === 'ad' && c.txt === '×50');
    is(!!r100 && r100.inkH - REF_H['×100'] >= 4,
      '  R-a 사본 «×100» 잉크 높이 ' + (r100 ? r100.inkH : '—') + ' — ref 31 보다 ≥4 크다(수리 전 상태 재현)');
    is(!!r50 && r50.inkH - REF_H['×50'] >= 4,
      '  R-b 사본 «×50» 잉크 높이 ' + (r50 ? r50.inkH : '—') + ' — ref 30 보다 ≥4 크다');
    is(rev.errs.length === 0, '  R-c 사본 콘솔 에러 ' + rev.errs.length + '건');
    await rev.page.close();
  }

  console.log('\n[R2] 되돌림 시험 ② — `--qk` 를 뺀 사본에서는 남의 계열 폭이 줄어든다(보정이 일하고 있다)');
  is(revB !== src && !/--qk:/.test(revB), '  R2-0 사본 편집이 먹었다(`--qk` 선언 0개)');
  {
    const rev = await open(ctx, 'file://' + pB);
    const RM = await measure(rev.page);
    const shrunk = RM.filter(c => c.fam !== 'ad' && BEFORE_W[c.key] != null && c.inkW < BEFORE_W[c.key] - 5);
    const others2 = RM.filter(c => c.fam !== 'ad');
    is(shrunk.length === others2.length && others2.length > 0,
      '  R2-a 사본에서 dia·rel·dtk ' + others2.length + '칸 전부 폭이 −5px 이상 줄었다 — '
      + [...new Set(others2.map(c => c.txt + ' ' + c.inkW + '←' + BEFORE_W[c.key]))].slice(0, 5).join(' · '));
    const adR = RM.filter(c => c.fam === 'ad');
    is(adR.every(c => Math.abs(c.inkW - ad.find(a => a.txt === c.txt).inkW) <= 1),
      '  R2-b 광고 칸은 그 사본에서도 그대로다 — `--qk` 는 광고 칸을 안 지난다');
    is(rev.errs.length === 0, '  R2-c 사본 콘솔 에러 ' + rev.errs.length + '건');
    await rev.page.close();
  }

  is(cur.errs.length === 0, '\n[G] 콘솔 에러 ' + cur.errs.length + '건'
    + (cur.errs.length ? ' — ' + cur.errs[0].slice(0, 140) : ''));

  await browser.close();
  console.log('\nVERIFY380 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
