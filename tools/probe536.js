#!/usr/bin/env node
/* 작업 536 — 재현: «verify43 [2] 카드 3장 top 이 일제히 +126px» 이 제품 결함인가 자 부패인가
 *
 *   node tools/probe536.js
 *
 * 등재문: «c1 705→831 · c2 885→1011 · c3 1065→1191 = 전부 +126px. left/width/height 는 Δ0.
 *          카드가 아니라 그릇이 옮겼다 — `#defw` 의 세로 정렬(패딩·justify-content·앵커)이 바뀐 모양».
 * 등재문 처방: «어느 쪽이 정답인지부터 정할 것 … 캡처 없이 숫자만으로 닫지 마라».
 *
 * ⚑ 338 규칙대로 처방 전에 재현한다. 이 자는 «누가 옳은가» 를 세 겹으로 가른다:
 *   [2] **변환 대조** — 18 화면의 앵커 5종(엠블럼·제목·카드1·2·3)이 각각 어느 변환을 따르는가.
 *       측정표 18 은 ref 1080×2340 절대 px 이고, 지시서 [2] 의 현행 변환은 **프레임 y = ref y − 84**,
 *       폐기된 옛 변환은 **ref y − 210**(1920 프레임 시절 · `docs/review/18-패배화면.md` 14행에 그대로 적혀 있다).
 *       +126 은 정확히 그 두 변환의 차(210 − 84)다.
 *   [3] **변환 무관 증거** — 측정표 §6 gap 표(엠블럼→제목 41 · 제목→카드1 80 · 카드 사이 14 · pitch 180)는
 *       **오프셋과 무관**하다. 그릇이 «옮긴» 것이 아니라 «변환이 바뀐» 것이면 gap 은 전부 살아 있어야 한다.
 *       그릇의 정렬(패딩·justify-content)이 실제로 바뀌었다면 gap 중 하나는 반드시 깨진다.
 *   [4] **찍힌 픽셀**(350·412 방식) — rect 가 아니라 실제로 그려진 카드 상·하변을 캡처에서 읽는다.
 *       캡처를 data URL 로 페이지에 되돌려 캔버스로 스캔한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra === undefined ? '' : '  [' + extra + ']')); };
const r1 = v => Math.round(v * 10) / 10;

/* 측정표 18 (docs/measure/18-패배화면.md) — ref 1080×2340 절대 px */
const REF = {
  emblem: 542,   // §2 원 전체 상변
  title: 791,    // §3 제목 잉크 상변
  c1: 915, c2: 1095, c3: 1275, // §4.1 카드 outer 상변
};
const STATUS = 84;   // 지시서 [2] 현행 변환 (프레임 y = ref y − 84)
const OLD = 210;     // 폐기된 옛 변환 (1920 프레임 시절)

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await page.evaluate(() => openDefeat());
  await page.waitForTimeout(400);
  /* 28-③ 교훈: 캔버스의 흰 데미지 숫자가 캡처를 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  const M = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080;
    const F = el => { const b = el.getBoundingClientRect(); return { x: (b.x - app.x) / sc, y: (b.y - app.y) / sc, w: b.width / sc, h: b.height / sc }; };
    const q = s => document.querySelector(s);
    /* 제목 잉크는 텍스트 노드 range 로 (박스가 아니라 글자 자리) */
    const inkOf = el => {
      if (!el) return null;
      const rg = document.createRange(); rg.selectNodeContents(el);
      const b = rg.getBoundingClientRect();
      return { x: (b.x - app.x) / sc, y: (b.y - app.y) / sc, w: b.width / sc, h: b.height / sc };
    };
    const cards = [1, 2, 3].map(n => F(q('.df-card.c' + n)));
    const dw = q('#defw');
    const cs = getComputedStyle(dw);
    return {
      appH: app.height / sc,
      emblem: q('#defw .df-emb') ? F(q('#defw .df-emb')) : null,
      title: q('#defw .df-title') ? { box: F(q('#defw .df-title')), ink: inkOf(q('#defw .df-title i') || q('#defw .df-title')) } : null,
      close: q('#defw .upr-close') ? { box: F(q('#defw .upr-close')), ink: inkOf(q('#defw .upr-close i') || q('#defw .upr-close')) } : null,
      cards,
      defwCS: { display: cs.display, justify: cs.justifyContent, align: cs.alignItems, padTop: cs.paddingTop, pos: cs.position, inset: cs.top + '/' + cs.left + '/' + cs.bottom },
      cardCS: [1, 2, 3].map(n => getComputedStyle(q('.df-card.c' + n)).top),
      html: q('#defw').innerHTML.length,
      names: [...q('#defw').children].map(e => e.className || e.tagName),
    };
  });

  console.log('\n[0] 그릇 상태 — «그릇이 옮겼다» 가설의 재료');
  console.log('   #defw computed: ' + JSON.stringify(M.defwCS));
  console.log('   .df-card top(css): ' + JSON.stringify(M.cardCS));
  console.log('   #defw 자식: ' + JSON.stringify(M.names));
  ok(M.defwCS.display === 'block', '#defw 는 flex 그릇이 아니다(display=' + M.defwCS.display + ') ⇒ «justify-content 가 밀었다» 는 성립할 수 없다');
  ok(M.cardCS.every((t, i) => parseFloat(t) === [831, 1011, 1191][i]),
    '카드 top 은 CSS 리터럴 절대값이다 — 그릇의 정렬이 아니라 «적힌 값» 이다', JSON.stringify(M.cardCS));

  console.log('\n[1] 재현 — verify43 [2] 가 본 값');
  const tops = M.cards.map(c => c.y);
  [1, 2, 3].forEach((n, i) => {
    const want = [705, 885, 1065][i];
    ok(Math.abs(tops[i] - want) > 1, 'c' + n + ' top 이 자의 기대값 ' + want + ' 와 다르다 (Δ' + r1(tops[i] - want) + ')', r1(tops[i]));
  });
  const deltas = [0, 1, 2].map(i => tops[i] - [705, 885, 1065][i]);
  ok(deltas.every(d => Math.abs(d - 126) <= 1), '어긋남이 셋 다 정확히 +126px = 등재문 그대로', deltas.map(r1).join(' / '));
  ok(M.cards.every(c => Math.abs(c.x - 91) <= 1 && Math.abs(c.w - 898) <= 1 && Math.abs(c.h - 166) <= 1),
    'left 91 · w 898 · h 166 은 Δ0 (카드 자체 기하는 안 움직였다)');

  console.log('\n[2] 변환 대조 — 앵커 5종이 각각 어느 변환을 따르는가 (ref−' + STATUS + ' 현행 / ref−' + OLD + ' 폐기)');
  const rows = [];
  const put = (name, refY, gotY) => { if (gotY == null) { console.log('   ' + name + ': 노드 없음(측정 불가)'); return; } rows.push({ name, refY, gotY, d84: gotY - (refY - STATUS), d210: gotY - (refY - OLD) }); };
  put('엠블럼 원 상변', REF.emblem, M.emblem ? M.emblem.y : null);
  put('제목 잉크 상변', REF.title, M.title ? M.title.ink.y : null);
  put('카드1 outer 상변', REF.c1, tops[0]);
  put('카드2 outer 상변', REF.c2, tops[1]);
  put('카드3 outer 상변', REF.c3, tops[2]);
  for (const r of rows) console.log('   ' + r.name.padEnd(16) + ' ref ' + String(r.refY).padStart(5) + ' → 프레임 ' + String(r1(r.gotY)).padStart(7) + '   Δ(ref−84) ' + String(r1(r.d84)).padStart(7) + '   Δ(ref−210) ' + String(r1(r.d210)).padStart(7));
  const near84 = rows.filter(r => Math.abs(r.d84) <= 3).length;
  const near210 = rows.filter(r => Math.abs(r.d210) <= 3).length;
  ok(near84 === rows.length, '앵커 ' + rows.length + '종이 **전부** 현행 변환(ref−84)을 따른다', near84 + '/' + rows.length);
  ok(near210 === 0, '옛 변환(ref−210)을 따르는 앵커는 0종 — 화면이 통째로 갈아탄 것이지 카드만 밀린 게 아니다', near210 + '/' + rows.length);

  console.log('\n[3] 변환 무관 증거 — 측정표 §6 gap 표 (오프셋과 무관하다)');
  const gap = (a, b) => b - a;
  if (M.emblem && M.title) ok(Math.abs(gap(M.emblem.y + M.emblem.h, M.title.ink.y) - 41) <= 4, '엠블럼 하변 → 제목 잉크 상변 = 41 ±4', r1(gap(M.emblem.y + M.emblem.h, M.title.ink.y)));
  if (M.title) ok(Math.abs(gap(M.title.ink.y + M.title.ink.h, tops[0]) - 80) <= 6, '제목 잉크 하변 → 카드1 상변 = 80 ±6', r1(gap(M.title.ink.y + M.title.ink.h, tops[0])));
  ok(Math.abs(gap(M.cards[0].y + M.cards[0].h, tops[1]) - 14) <= 1, '카드1 하변 → 카드2 상변 = 14 ±1', r1(gap(M.cards[0].y + M.cards[0].h, tops[1])));
  ok(Math.abs(gap(M.cards[1].y + M.cards[1].h, tops[2]) - 14) <= 1, '카드2 하변 → 카드3 상변 = 14 ±1', r1(gap(M.cards[1].y + M.cards[1].h, tops[2])));
  ok(Math.abs((tops[1] - tops[0]) - 180) <= 1 && Math.abs((tops[2] - tops[1]) - 180) <= 1, 'pitch(top→top) = 180 ×2', r1(tops[1] - tops[0]) + ' / ' + r1(tops[2] - tops[0] - 180));

  console.log('\n[4] 찍힌 픽셀 — 캡처를 되돌려 카드 상·하변을 직접 읽는다 (x=830 열: 몸통만 — 패널(…818) 오른쪽·버튼(841…) 왼쪽·코너 반경 밖)');
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
  const dataUrl = 'data:image/png;base64,' + shot.toString('base64');
  const px = await page.evaluate(async (u) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = u; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const col = cx.getImageData(830, 0, 1, img.height).data;
    const lum = y => 0.299 * col[y * 4] + 0.587 * col[y * 4 + 1] + 0.114 * col[y * 4 + 2];
    /* 카드 몸통(#7D86A7 / #F0D9BA)은 딤 배경보다 훨씬 밝다 — 밝은 띠 3개의 상·하변을 찾는다 */
    const bands = []; let s = -1;
    for (let y = 600; y < 1600; y++) {
      const bright = lum(y) > 90;
      if (bright && s < 0) s = y;
      if (!bright && s >= 0) { if (y - s > 60) bands.push([s, y - 1]); s = -1; }
    }
    return { h: img.height, bands };
  }, dataUrl);
  console.log('   밝은 띠: ' + JSON.stringify(px.bands));
  ok(px.bands.length === 3, '카드 3장이 픽셀로 3개 띠로 잡힌다', px.bands.length);
  if (px.bands.length === 3) {
    /* 검정 외곽선 6~7px 은 밝기 임계 아래라 띠는 «검정 안쪽» 에서 시작한다 — outer top + 6±2 */
    [0, 1, 2].forEach(i => {
      const inner = px.bands[i][0], want = [831, 1011, 1191][i] + 6;
      ok(Math.abs(inner - want) <= 3, '찍힌 카드' + (i + 1) + ' 밝은 몸통 상변 = outer ' + [831, 1011, 1191][i] + ' + 검정 6 = ' + want + ' ±3', inner);
      ok(Math.abs(inner - ([705, 885, 1065][i] + 6)) > 60, '  같은 자리가 자의 기대값(' + [705, 885, 1065][i] + ')과는 ' + Math.abs(inner - ([705, 885, 1065][i] + 6)) + 'px 어긋난다 = rect 만의 착시가 아니다');
    });
  }

  console.log('\n[5] 잘림·겹침 — 현행 자리가 프레임 2280 안에서 성립하는가');
  ok(tops[2] + M.cards[2].h <= M.appH, '카드3 하변(' + r1(tops[2] + M.cards[2].h) + ') ≤ 프레임 높이(' + r1(M.appH) + ')');
  if (M.close) ok(tops[2] + M.cards[2].h < M.close.ink.y, '카드3 하변 < «터치하여 닫기» 잉크 상변 (겹침 0)', r1(M.close.ink.y));
  ok(errs.length === 0, '콘솔/페이지 에러 0건', errs.join(' | '));

  await browser.close();
  console.log('\nPROBE536 ' + (fail ? 'FAIL' : 'PASS') + '  ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
