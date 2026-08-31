/* 작업 595 재현 프로브 — «10 상점 페이지도 켠 뒤 0.6초 동안 아래 화면 그대로 얼어 있다»
 *
 *   node tools/probe595.js            # 재현 + 계측 바닥 + 층별 인터리브 A/B
 *   node tools/probe595.js --reps 5   # 인터리브 반복 수(기본 3)
 *   node tools/probe595.js --arms a,b # 특정 팔만
 *
 * ⚠ **새 자를 짜지 않았다**(PROGRESS 595 «새 자를 짜지 마라»). 재는 법·축·계측 바닥은
 *   `tools/probe586.js` 의 것을 **그대로** 쓴다 — α 최소제곱 · T_hold(α≥0.10) · T_show(α≥0.9) ·
 *   내용 없는 불투명 면으로 바닥 재기 · 인터리브 중앙값. 바뀐 것은 **무엇을 껐다 켜는가** 뿐이다.
 *   (586 은 «두 처방을 하나씩 되돌리는» 팔이었고, 여기는 «카드의 칠하기 층을 하나씩 끄는» 팔이다.
 *    595 는 처방이 아직 없으므로 되돌릴 것이 없고, 물어야 할 것은 «그 0.6초가 어느 층인가» 다.)
 *
 * ⚠ 586 §5 가 이미 못박은 것 둘 — 여기서 다시 재지 않는다:
 *   ① 뿌리는 카드의 첫 래스터다(`.shp-card{visibility:hidden}` 하나로 584 → 239ms).
 *   ② 586 의 처방(`.on:not(.warm)` 로 **미루기**)은 상점에서 **더 나빠진다**(545 → 695ms).
 *   ⇒ 이 프로브가 답할 질문은 «미룰까» 가 아니라 «**무엇을 줄일까**» 다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const REPS = (() => { const i = process.argv.indexOf('--reps'); return i > 0 ? (process.argv[i + 1] | 0) || 3 : 3; })();
const ONLY = (() => { const i = process.argv.indexOf('--arms'); return i > 0 ? String(process.argv[i + 1]).split(',') : null; })();

/* ── 팔 — 카드 한 장이 «칠하는» 층을 하나씩 끈다 ────────────────────────────
   끄는 것은 전부 **그리기**뿐이고 배치는 그대로다(visibility/animation/filter/background).
   즉 여기서 나오는 차이는 곧 «그 층의 첫 래스터 비용» 이다. */
const ARMS = {
  now:    { t: '지금(수리 전)', css: '' },
  none:   { t: '카드를 아예 안 칠함(586 §5 재확인)', css: '#shopw .shp-card{visibility:hidden}' },
  filter: { t: 'ⓐ 카드 drop-shadow 필터만 끔', css: '#shopw .shp-card{filter:none}' },
  ray:    { t: 'ⓑ 본문 방사 광선(conic+mask)만 끔', css: '#shopw .shp-card>.cbg::before{display:none}' },
  sweep:  { t: 'ⓒ 헤더 광택 띠 2겹만 끔', css: '#shopw .shp-card>.chd::after,#shopw .shp-card>.chd::before{display:none}' },
  art:    { t: 'ⓓ 상자 아트(이모지 185px)만 끔', css: '#shopw .shp-card .cart{visibility:hidden}' },
  anim:   { t: 'ⓔ 카드 안 애니메이션 전부 끔', css: '#shopw .shp-card *,#shopw .shp-card{animation:none!important}' },
  jzp:    { t: 'ⓕ 본문 빛 입자(.jzp)만 끔', css: '#shopw .shp-card .jzp{display:none}' },
  btn:    { t: 'ⓖ 버튼 3종(.cbtn)만 끔', css: '#shopw .shp-card .cbtn{visibility:hidden}' },
  re:     { t: 'ⓜ 두 번째 열기(지금 코드 — 매번 다시 그린다)', css: '' },
  renc:   { t: 'ⓝ 두 번째 열기 · 다시 그리기 없음(«안 바뀌면 안 그린다» 상한)', css: '' },
  /* ⓗ~ⓙ — «층» 이 아니라 «장수» 를 묻는 팔. 목록은 5장인데 뷰포트에는 3.7장뿐이다
     (목록 1842 − padding 62 = 1780 ÷ pitch 479). 넷째·다섯째는 **화면 밖인데도 칠해진다.** */
  top3:   { t: 'ⓗ 화면 밖 카드 2장을 안 칠함', css: '#shopw .shp-card:nth-child(n+4){visibility:hidden}' },
  one:    { t: 'ⓘ 첫 카드만 칠함(장수 비례 확인)', css: '#shopw .shp-card:nth-child(n+2){visibility:hidden}' },
  cv:     { t: 'ⓙ content-visibility:auto(화면 밖 자동 생략)',
            css: '#shopw .shp-card{content-visibility:auto;contain-intrinsic-size:980px 450px}' },
  /* ⓚ — 그림은 그대로 두고 **같은 그림을 더 싸게**. `filter:drop-shadow` 는 카드 서브트리를
     통째로 별도 표면에 렌더한 뒤 실루엣을 뽑는데, 카드 실루엣은 `.cfr`(radius 26 검정 테)가
     만드는 **둥근 사각 그대로**라 같은 그림이 `box-shadow` 로도 나온다(blur 0 · spread 0). */
  /* ⓗ 는 «화면 밖» 이라고 이름 붙였지만 실은 **4번째(343/450 = 76% 가 보이는 카드)** 까지 같이
     껐다(목록 1842 · 카드 top 62/541/1020/1499/1978). 그래서 축을 둘로 가른다 —
     off5 = **진짜로 한 픽셀도 안 보이는** 5번째만 · p4 = **보이는** 4번째만. */
  off5:   { t: 'ⓗ-1 한 픽셀도 안 보이는 5번째 카드만 끔', css: '#shopw .shp-card:nth-child(5){visibility:hidden}' },
  p4:     { t: 'ⓗ-2 76% 보이는 4번째 카드만 끔', css: '#shopw .shp-card:nth-child(4){visibility:hidden}' },
  box:    { t: 'ⓚ drop-shadow 필터 → 같은 그림의 box-shadow',
            css: '#shopw .shp-card{filter:none;box-shadow:0 10px 0 rgba(0,0,0,.33)}' },
  combo:  { t: 'ⓛ ⓚ + 화면 밖 카드 미루기',
            css: '#shopw .shp-card{filter:none;box-shadow:0 10px 0 rgba(0,0,0,.33)}'
               + '#shopw .shp-card:nth-child(n+4){visibility:hidden}' },
};

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 64 - t.length)));
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };

const SETUP = 'S.guide.idx = 99;';

/* 두 번째 열기 계열 — 켜기 **전에** 한 번 열었다 닫는다.
   re   = 지금 코드 그대로 두 번째 열기(매번 `renderShopPage()` 가 innerHTML 을 새로 만든다)
   renc = 그 다시 그리기만 없앤 두 번째 열기(= «안 바뀌었으면 다시 안 그린다» 의 상한) */
const PRE = {
  re:   'openShopPage(); closeShopPage();',
  renc: 'openShopPage(); closeShopPage(); renderShopPage = function(){};',
};

/* 한 번 열고 T_hold·T_show 를 잰다. arm==='cal' 이면 계측 바닥(내용 없는 불투명 면). */
async function measure(ctx, lab, arm) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1500);
  await page.evaluate(new Function(SETUP));
  const css = arm === 'cal' ? '' : (ARMS[arm] || {}).css;
  if (css) await page.evaluate((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  if (PRE[arm]) { await page.evaluate(new Function(PRE[arm])); await page.waitForTimeout(600); }
  if (arm === 'cal') {
    await page.evaluate(() => {
      const d = document.createElement('div'); d.id = '__cal595';
      d.style.cssText = 'position:absolute;left:0;right:0;top:104px;bottom:180px;background:#26211B;z-index:9;display:none';
      document.getElementById('app').appendChild(d);
    });
  }
  await page.waitForTimeout(400);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, d: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (_) {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 2280, everyNthFrame: 1 });
  await page.waitForTimeout(700);

  const onAt = await page.evaluate(new Function(arm === 'cal'
    ? "document.getElementById('__cal595').style.display='block'; return Date.now();"
    : 'var t = Date.now(); openShopPage(); return t;'));

  await page.waitForTimeout(2800);
  await cdp.send('Page.stopScreencast');
  const box = arm === 'cal' ? [0, 104, 1080, 1996]
    : (await page.evaluate(() => { const r = document.getElementById('shopw').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })).map(Math.round);

  await lab.bringToFront();
  const res = await lab.evaluate(async ({ list, box }) => {
    /* jpeg 는 node 에 디코더가 없어 캔버스로 되돌려 읽는다(368 처방).
       ⚠ 배경 탭에서 `img.decode()` 는 EncodingError 로 즉사한다 — `onload` 로 받는다(586 교훈). */
    const dec = (d) => new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          c.getContext('2d').drawImage(im, 0, 0);
          res(c.getContext('2d').getImageData(box[0], box[1], box[2], box[3]).data);
        } catch (e) { res(null); }
      };
      im.onerror = () => res(null);
      im.src = 'data:image/jpeg;base64,' + d;
    });
    const px = [], keep = [];
    for (let i = 0; i < list.length; i++) { const p = await dec(list[i].d); if (p) { px.push(p); keep.push(i); } }
    if (px.length < 3) return { bad: true };
    const old = px[0], pg = px[px.length - 1];
    const alpha = (F) => { let n = 0, d = 0;
      for (let i = 0; i < F.length; i += 16) for (let k = 0; k < 3; k++) {
        const q = pg[i + k] - old[i + k]; if (Math.abs(q) < 24) continue;
        n += (F[i + k] - old[i + k]) * q; d += q * q; }
      return d ? n / d : 1; };
    return { keep, a: px.map((p) => +alpha(p).toFixed(3)) };
  }, { list: frames.map((f) => ({ d: f.d })), box });

  if (res.bad) { await page.close(); return { tHold: null, tShow: null, rows: [], box, errs }; }
  const rows = res.keep.map((fi, i) => ({ t: Math.round(frames[fi].t - onAt), a: res.a[i] })).filter((r) => r.t >= -30);
  const shown = rows.find((r) => r.a >= 0.9);
  const moved = rows.find((r) => r.a >= 0.10);
  await page.close();
  return { tHold: moved ? Math.max(0, moved.t) : null, tShow: shown ? Math.max(0, shown.t) : null, rows, box, errs };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const lab = await ctx.newPage();
  await lab.setContent('<canvas id="a"></canvas>');

  /* ── ① 재현 ────────────────────────────────────────────────────────────── */
  blk('① 재현 — 10 상점을 한 번 열고 렌더된 페이지 불투명도 α 를 프레임마다 읽는다');
  const one = await measure(ctx, lab, 'now');
  console.log('  패널 사각 ' + one.box.join(',') + ' · 켠 뒤 프레임 ' + one.rows.length + '장');
  for (const r of one.rows.slice(0, 12)) {
    console.log('    t=' + String(r.t).padStart(5) + 'ms  α=' + r.a.toFixed(3)
      + (r.a < 0.9 ? '   ← 아래 화면이 ' + Math.round((1 - r.a) * 100) + '% 비친다' : ''));
  }
  console.log('  ⇒ T_hold(얼어 있는 시간) = ' + one.tHold + 'ms · T_show(정착) = ' + one.tShow + 'ms');
  ok(one.tShow !== null, '열기가 재현된다(끝내 α ≥ 0.9 에 닿는다)');
  ok(one.errs.length === 0, '콘솔 예외 0건');

  /* ── ② 계측 바닥 ───────────────────────────────────────────────────────── */
  blk('② 계측 바닥 — 내용 없는 불투명 면을 같은 사각에 켜면 몇 ms 인가');
  const cal = await measure(ctx, lab, 'cal');
  console.log('  ⇒ 바닥 T_hold = ' + cal.tHold + 'ms · T_show = ' + cal.tShow + 'ms');
  ok(cal.tHold !== null && cal.tHold < 400, '바닥이 측정된다 — T_hold ' + cal.tHold + 'ms');

  /* ── ③ 층별 인터리브 ──────────────────────────────────────────────────── */
  const keys = (ONLY || Object.keys(ARMS)).filter((k) => ARMS[k]);
  blk('③ 층별 — 카드의 칠하기 층을 하나씩 끈다 (인터리브 ' + REPS + '회 · 중앙값)');
  for (const k of keys) console.log('    ' + k.padEnd(7) + ' = ' + ARMS[k].t);
  const arms = {}, armsS = {};
  for (const k of keys) { arms[k] = []; armsS[k] = []; }
  for (let i = 0; i < REPS; i++) {
    const line = [];
    for (const k of keys) {
      const r = await measure(ctx, lab, k);
      if (r.tHold !== null) arms[k].push(r.tHold);
      if (r.tShow !== null) armsS[k].push(r.tShow);
      line.push(k + ' ' + String(r.tHold).padStart(4));
    }
    console.log('  #' + (i + 1) + '  ' + line.join(' · '));
  }
  const M = {}, MS = {};
  for (const k of keys) { M[k] = med(arms[k]); MS[k] = med(armsS[k]); }
  console.log('\n  층                                   T_hold  바닥 위  지금 대비');
  for (const k of keys) {
    console.log('  ' + (k + ' ' + ARMS[k].t).padEnd(36).slice(0, 36)
      + String(M[k]).padStart(6) + 'ms' + String(M[k] - cal.tHold).padStart(7) + 'ms'
      + String(M[k] - M.now).padStart(9) + 'ms   (T_show ' + MS[k] + ')');
  }
  ok(M.now - cal.tHold > 200, '재현 — 상점은 바닥 위 ' + (M.now - cal.tHold) + 'ms 얼어 있다');
  if (M.none != null) ok(M.now - M.none > 150, '뿌리는 카드의 첫 래스터다 — 안 칠하면 ' + M.none + 'ms (586 §5 재확인)');

  console.log('\nPROBE595 ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
