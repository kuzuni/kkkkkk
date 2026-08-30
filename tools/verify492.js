#!/usr/bin/env node
/* 게이트 — 작업 492 「50 코스튬 시트 격자 카드의 스프라이트를 «잘 보이게 크게»」
 *          (저장소 주인 보고 2026-08-30 — «코스튬들이 세부팝업에서는 아이콘 크게 잘나오는데
 *           그냥 코스튬 팝업에서는 너무 작게 나옴. 조절좀 하게 하셈 잘보이게 크게»)
 *
 *   node tools/verify492.js
 *
 * 지키는 성질: **카드 안 잉크가 «그림 자리» 를 채우고, 그 자리는 주인이 기준으로 지목한
 *              08 세부 팝업의 비(比)에서 나오며, 선언은 한 곳뿐이다.**
 *
 *   [A] 선언이 하나다 — `CARD_ART` 가 있고 카드 캔버스가 `cosCardSc()` **함수**를 읽는다.
 *       배율을 마크업에 손으로 적은 사본(예: `data-cossc="2"` 리터럴)이 생기면 빨개진다
 *       (402 «사본을 지운 것이 핵심» · 411 «값은 한 곳에서만»).
 *   [B] 그려진 잉크 — 격자 **50칸 전수**의 실제 알파 bbox 가 아이콘 영역(`.sk-ci` 156x96) 높이의
 *       **≥ 0.80**(주인 처방의 통과선)이고, 08 세부 박스의 비와 **±5%** 안이다.
 *       ⚠ 수리 전 값은 잉크 45px = **0.469**(기준의 51.7%)였다 — `tools/probe492.js`.
 *   [C] 배율은 정수다 — 픽셀 아트가 1:2 로 고르게 퍼져야 한다(79/80 규약 · 처방 ②).
 *       그리고 캔버스는 `image-rendering:pixelated` 로 그려진다.
 *   [D] 카드 기하 Δ0 — 카드 168x171 · 열 pitch 190 · 행 pitch 220 · 아이콘 영역 156x96 ·
 *       `Lv.n` 라벨 자리 · 진행바 자리가 **한 픽셀도 안 움직인다**(처방 ③ «스프라이트만»).
 *   [E] 넘침 0 — 잉크가 카드 밖으로 나가지 않고 하단 진행바를 침범하지 않는다.
 *       ⚠ `Lv.n` 라벨과의 겹침은 **결함이 아니다** — 26 펫 카드가 수리 전부터 13.5px 겹쳐 있는
 *          이 부품의 원래 성질이고(`probe492`), 라벨은 흰 글자 + 외곽선이라 그림 위에서 읽힌다.
 *   [F] 형제 자리 회귀 — 411 이 잡은 «착용 중» 슬롯(잉크 80 = 0.879)과 08 세부(0.906)는 **Δ0** 다.
 *       이 작업이 건드린 것은 격자 카드 하나뿐이다.
 *   [R] 되돌림 시험 — 배율을 옛 1 로 되돌린 사본은 [B] 가 **빨개진다**.
 *       이 항이 없으면 «무르게 푼 게이트» 다(334 교훈).
 *
 * [3]-(가) 기계적 검증: «선언 → 찍힌 픽셀» 판정이라 여기서 비평가를 띄우지 않는다.
 *          «눈» 쪽은 `tools/cap492.js` 의 3구역 대조 캡처로 따로 돈다(411 방식).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 10) / 10;

/* 페이지 안 잉크 측정기 — probe492 와 **같은 식**이다(자가 둘로 갈리면 안 된다) */
const MEAS = `
window.__ink492 = function (host, cardEl) {
  var hb = host.getBoundingClientRect();
  var cv = host.querySelector('canvas');
  if (!cv) return null;
  var cb = cv.getBoundingClientRect();
  var g = cv.getContext('2d', { willReadFrequently: true });
  var d = g.getImageData(0, 0, cv.width, cv.height).data;
  var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (var y = 0; y < cv.height; y++)
    for (var x = 0; x < cv.width; x++)
      if (d[(y * cv.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  if (x1 < 0) return { empty: true };
  var sx = cb.width / cv.width, sy = cb.height / cv.height;
  var ax = cb.x + x0 * sx, ay = cb.y + y0 * sy;
  var w = (x1 - x0 + 1) * sx, h = (y1 - y0 + 1) * sy;
  var r = { cvW: cv.width, cvH: cv.height, sc: cv.dataset.cossc || '',
            boxW: hb.width, boxH: hb.height, w: w, h: h,
            rW: w / hb.width, rH: h / hb.height,
            ir: getComputedStyle(cv).imageRendering };
  if (cardEl) {
    var kb = cardEl.getBoundingClientRect();
    r.cardW = kb.width; r.cardH = kb.height;
    r.top = kb.y - ay;                    /* >0 이면 카드 위로 삐져나옴 */
    r.bottom = (ay + h) - kb.bottom;      /* >0 이면 카드 아래로 삐져나옴 */
    var bar = cardEl.querySelector('.sk-bar');
    if (bar) { var bb = bar.getBoundingClientRect();
      r.barOv = Math.min(ay + h, bb.bottom) - Math.max(ay, bb.y); }
    var lv = cardEl.querySelector('.sk-clv');
    if (lv) { var lb = lv.getBoundingClientRect();
      r.lvBox = { x: lb.x - kb.x, y: lb.y - kb.y, w: lb.width, h: lb.height }; }
  }
  return r;
};`;

(async () => {
  /* ─── [A] 선언이 하나다 (소스 판정) ─────────────────────────────────────── */
  ok(/const\s+CARD_ART\s*=\s*\{[^}]*h:\s*90[^}]*\}/.test(SRC),
     '[A1] `CARD_ART`(카드 그림 자리) 선언이 있다', (SRC.match(/const\s+CARD_ART\s*=.*/) || [''])[0].trim());
  ok(/const\s+cosCardSc\s*=\s*\(\)\s*=>[\s\S]{0,160}CARD_ART\.h[\s\S]{0,80}COS_INK\.h/.test(SRC),
     '[A2] `cosCardSc()` 가 CARD_ART·COS_INK 에서 **역산**된다(손으로 적은 값이 아니다)');
  const cardTag = (SRC.match(/<b class="sk-ci"><canvas class="cos-cv"[\s\S]{0,220}?<\/canvas>/) || [''])[0];
  ok(/data-cossc="'\s*\+\s*cosCardSc\(\)/.test(cardTag),
     '[A3] 격자 카드 캔버스가 `cosCardSc()` 를 읽는다(배율 리터럴 사본 없음)', cardTag ? '찾음' : '태그 못 찾음');
  /* ⚠ «리터럴 배율» 자체를 금지하면 안 된다 — 19 프로필 초상(`#pfPor`)·02 헤더(`#porCv`)는
     자기 상자를 가진 다른 자리라 `data-cossc="2"` 를 손으로 갖는 것이 정상이다(201).
     여기서 막을 것은 **카드 그림 자리를 손으로 두 번 적는 것**이다 — 형제 시트(26 펫)도 같은
     `CARD_ART` 에서 역산돼야 한다(411 이 슬롯에서 `PET_TH.slot ← SLOT_ART` 로 세운 규약). */
  ok(/card:\s*\{\s*w:\s*CARD_ART\.w\s*\+\s*6,\s*h:\s*CARD_ART\.h\s*\+\s*6,\s*fit:\s*3\s*\}/.test(SRC),
     '[A4] `PET_TH.card` 도 CARD_ART 에서 역산된다(형제 시트가 같은 그림 자리를 읽는다)',
     (SRC.match(/card:\s*\{[^}]*\}/) || [''])[0].trim());
  ok(!/card:\s*\{\s*w:\s*9\d\s*,\s*h:\s*7\d/.test(SRC),
     '[A5] 옛 손글씨 값 `card:{w:92,h:79}`(07 이모지 잉크 사본)이 남아 있지 않다');

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.addInitScript(MEAS);
  await p.goto(URL);
  await p.waitForFunction(() => typeof AVATARS !== 'undefined' && AVATARS.length > 0);
  await p.waitForTimeout(1400);

  /* 50칸 전수를 보려면 «보유/미보유/착용 중» 이 섞여 있어야 한다(미보유 칸도 그림을 그린다 — 82) */
  await p.evaluate(() => {
    Object.assign(S, DEF());
    S.best = 400; S.stage = 400; S.rank = 6;
    S.avatars = {}; S.cosLv = {};
    AVATARS.forEach((a, i) => { if (i % 5 !== 4) { S.avatars[a.id] = 1; S.cosLv[a.id] = (i * 7) % 400; } });
    uiDirty = true; renderUI();
  });
  await p.evaluate(() => gmHero('cos'));
  await p.waitForTimeout(900);

  const cardsOf = () => p.evaluate(() => Array.from(document.querySelectorAll('#bCos .sk-card[data-cosit]'))
    .map(el => window.__ink492(el.querySelector('.sk-ci'), el)).filter(Boolean));
  const detOf = () => p.evaluate(async () => {
    showCosDetail(AVATARS[3].id);
    await new Promise(z => setTimeout(z, 260));
    const r = window.__ink492(document.querySelector('#mbox .sk-ic'), null);
    closeModal();
    return r;
  });

  const cards = await cardsOf();
  const det = await detOf();
  await p.evaluate(() => gmHero('cos'));
  await p.waitForTimeout(600);

  /* ─── [B] 그려진 잉크 ────────────────────────────────────────────────────── */
  ok(cards.length === 50, '[B0] 격자 카드 50칸을 전부 쟀다', String(cards.length));
  ok(cards.every(c => !c.empty), '[B1] 빈 칸 0 — 50칸 전부 그림이 찍혔다(192 «빈 캔버스가 제일 나쁘다»)',
     String(cards.filter(c => c.empty).length) + '칸 비었음');
  const rH = cards.map(c => c.rH);
  const minH = Math.min(...rH), maxH = Math.max(...rH);
  ok(minH >= 0.80, '[B2] 전수 잉크 세로 ≥ 아이콘 영역의 0.80 (주인 처방 통과선)',
     `min ${minH.toFixed(4)} / max ${maxH.toFixed(4)} (수리 전 0.469)`);
  ok(det && det.rH >= 0.80, '[B3] 기준 자리(08 세부)도 같은 자로 재서 0.80 이상이다', det ? det.rH.toFixed(4) : '측정 실패');
  const rel = maxH / det.rH, rel2 = minH / det.rH;
  ok(rel <= 1.05 && rel2 >= 0.95,
     '[B4] 카드 비가 08 세부 비의 ±5% 안이다 (주인이 지목한 기준)',
     `카드 ${minH.toFixed(4)}~${maxH.toFixed(4)} / 기준 ${det.rH.toFixed(4)} = ${(rel2*100).toFixed(1)}~${(rel*100).toFixed(1)}%`);
  ok(maxH / minH <= 1.05, '[B5] 50칸끼리 덩치가 고르다 (max/min ≤ 1.05 — 411 눈금)',
     `${maxH.toFixed(4)} / ${minH.toFixed(4)} = ${(maxH / minH).toFixed(3)}`);
  ok(Math.abs(cards[0].h - 90) <= 0.6, '[B6] 잉크 세로가 그림 자리(CARD_ART.h 90)와 같다',
     `${px(cards[0].h)} (기대 90)`);
  ok(Math.abs(cards[0].w - 84) <= 0.6, '[B7] 잉크 가로 84 = 42x2 (종횡 유지 · 356 «등방»)', String(px(cards[0].w)));

  /* ─── [C] 배율은 정수 · pixelated ────────────────────────────────────────── */
  const sc = await p.evaluate(() => cosCardSc());
  ok(Number.isInteger(sc) && sc === 2, '[C1] 카드 배율이 **정수** 2 다 (79/80 픽셀 아트 규약)', String(sc));
  ok(cards.every(c => c.ir === 'pixelated'), '[C2] 카드 캔버스가 `image-rendering:pixelated` 로 그려진다',
     cards[0].ir);
  ok(cards.every(c => c.cvW === 96 && c.cvH === 96),
     '[C3] 캔버스 크기는 96x96 그대로다 (기하가 아니라 배율만 바뀌었다)',
     `${cards[0].cvW}x${cards[0].cvH}`);
  const slotSc = await p.evaluate(() => cosSlotSc());
  ok(slotSc !== sc && Math.abs(slotSc - 1.7778) < 0.001,
     '[C4] 슬롯 배율(411)은 카드와 별개로 그대로다', String(slotSc));

  /* ─── [D] 카드 기하 Δ0 ──────────────────────────────────────────────────── */
  const geo = await p.evaluate(() => {
    const els = Array.from(document.querySelectorAll('#bCos .sk-card[data-cosit]'));
    const b = els.map(e => e.getBoundingClientRect());
    const ci = els[0].querySelector('.sk-ci').getBoundingClientRect();
    const lv = els[0].querySelector('.sk-clv').getBoundingClientRect();
    const bar = els[0].querySelector('.sk-bar').getBoundingClientRect();
    return { w: b[0].width, h: b[0].height,
             colPitch: b[1].x - b[0].x, rowPitch: b[5].y - b[0].y,
             ciW: ci.width, ciH: ci.height, ciTop: ci.y - b[0].y,
             lvX: lv.x - b[0].x, lvY: lv.y - b[0].y, lvH: lv.height,
             barY: bar.y - b[0].y, barH: bar.height };
  });
  ok(px(geo.w) === 168 && px(geo.h) === 171, '[D1] 카드 168x171 Δ0', `${px(geo.w)}x${px(geo.h)}`);
  ok(px(geo.colPitch) === 190 && px(geo.rowPitch) === 220, '[D2] 열 pitch 190 · 행 pitch 220 Δ0',
     `${px(geo.colPitch)} / ${px(geo.rowPitch)}`);
  ok(px(geo.ciW) === 156 && px(geo.ciH) === 96 && px(geo.ciTop) === 20,
     '[D3] 아이콘 영역 156x96 · 카드상단+20 Δ0', `${px(geo.ciW)}x${px(geo.ciH)} @${px(geo.ciTop)}`);
  ok(px(geo.lvX) === 52 && px(geo.lvY) === 14 && px(geo.lvH) === 32,
     '[D4] `Lv.n` 라벨 자리 Δ0 (471 4회차 값)', `${px(geo.lvX)},${px(geo.lvY)} h${px(geo.lvH)}`);
  ok(px(geo.barY) === 126 && px(geo.barH) === 39, '[D5] 진행바 자리 Δ0',
     `${px(geo.barY)} h${px(geo.barH)}`);

  /* ─── [E] 넘침 0 ────────────────────────────────────────────────────────── */
  ok(cards.every(c => c.top <= 0.6), '[E1] 잉크가 카드 위로 안 삐져나온다',
     `최대 ${px(Math.max(...cards.map(c => c.top)))}px`);
  ok(cards.every(c => c.bottom <= 0.6), '[E2] 잉크가 카드 아래로 안 삐져나온다',
     `최대 ${px(Math.max(...cards.map(c => c.bottom)))}px`);
  ok(cards.every(c => c.barOv <= 0), '[E3] 잉크가 하단 진행바를 안 침범한다',
     `최대 겹침 ${px(Math.max(...cards.map(c => c.barOv)))}px`);
  ok(cards.every(c => c.rW <= 1), '[E4] 잉크 가로가 아이콘 영역 안이다',
     `최대 ${Math.max(...cards.map(c => c.rW)).toFixed(3)}`);

  /* ─── [F] 형제 자리 회귀 (411 · 08) ─────────────────────────────────────── */
  const slot = await p.evaluate(() => Array.from(document.querySelectorAll('#bCos .sk-slot[data-cosun]'))
    .map(el => window.__ink492(el.querySelector('.sk-si'), null)));
  ok(slot.length === 1 && Math.abs(slot[0].h - 80) <= 0.6,
     '[F1] «착용 중» 슬롯 잉크 80 (411 SLOT_ART) Δ0', slot.length ? String(px(slot[0].h)) : '없음');
  ok(Math.abs(det.h - 135) <= 3, '[F2] 08 세부 잉크 135 (기준 자리) Δ0', String(px(det.h)));

  /* ─── [G] 형제 시트 통일 (26 펫 — 비평가 AV·AW 2인 독립 B=3/10) ─────────────
     «같은 156x96 부품인데 덩치가 따로 논다» 가 1회차 채점의 최대 감점이었다(코스튬 90 ↔ 펫 57~71
     = 1.30배). 그림 자리를 둘이 같이 읽게 한 뒤로는 **종횡이 넓어 폭 상한에 걸리는 칸만** 낮다. */
  await p.evaluate(() => gmHero('pet'));
  await p.waitForTimeout(900);
  const pets = await p.evaluate(() => Array.from(document.querySelectorAll('#bPet .sk-card .sk-ci'))
    .map(el => window.__ink492(el, el.parentElement)).filter(Boolean));
  ok(pets.length >= 30, '[G0] 26 펫 카드를 전수로 쟀다', String(pets.length));
  const pW = pets.filter(c => c.w >= 96 - 2);                       /* 폭 상한에 걸린 칸 */
  const pH = pets.filter(c => !(c.w >= 96 - 2)).map(c => c.h);
  /* ⚠ 허용 오차 2px 은 «무르게 푼 것» 이 아니라 contain 의 반올림이다 — `drawSpriteTo` 가
     `Math.round(fr[3] × k)` 로 앉히고 림 2px 은 실루엣이 있는 변에만 붙으므로 원본 종횡에 따라
     1~2px 이 남는다(411 이 슬롯에서 쓴 오차도 3px 이다). 2/90 = 2.2% 로 411 «세로 덩치
     max/min ≤ 1.05» 눈금 안이다. */
  ok(pH.length > 0 && pH.every(h => Math.abs(h - 90) <= 2),
     '[G1] 폭 상한에 안 걸린 펫 칸은 전부 잉크 세로 90±2 = 코스튬과 같다',
     `${px(Math.min(...pH))}~${px(Math.max(...pH))} · 폭 상한 ${pW.length}칸 (수리 전 57~71)`);
  const uni = 90 / Math.min(...pets.map(c => c.h));
  ok(uni <= 1.45, '[G2] 코스튬↔펫 세로 덩치 (폭 상한 칸 포함) — 수리 전 1.58배에서 내려왔다',
     `${uni.toFixed(3)} (수리 전 90/57 = 1.579)`);
  ok(pets.every(c => c.barOv <= 0), '[G3] 펫 칸도 잉크가 진행바를 안 침범한다',
     `최대 겹침 ${px(Math.max(...pets.map(c => c.barOv)))}px`);
  ok(pets.every(c => c.top <= 0.6 && c.bottom <= 0.6), '[G4] 펫 칸도 카드 밖으로 안 나간다',
     `위 ${px(Math.max(...pets.map(c => c.top)))} · 아래 ${px(Math.max(...pets.map(c => c.bottom)))}`);
  await p.evaluate(() => gmHero('cos'));
  await p.waitForTimeout(700);

  /* ─── [R] 되돌림 시험 ───────────────────────────────────────────────────── */
  await p.evaluate(() => {
    document.querySelectorAll('#bCos .sk-card .cos-cv').forEach(cv => { cv.dataset.cossc = '1'; });
    cosPaint(document.getElementById('bCos'));
  });
  await p.waitForTimeout(300);
  const back = await cardsOf();
  const bMax = Math.max(...back.map(c => c.rH));
  ok(bMax < 0.80, '[R1] 배율을 옛 1 로 되돌린 사본은 [B2] 가 빨개진다',
     `되돌림 최대 ${bMax.toFixed(4)} (< 0.80 이어야 «무른 게이트» 가 아니다)`);
  ok(Math.abs(back[0].h - 45) <= 0.6, '[R2] 되돌리면 잉크가 정확히 옛 45px 이다(등재문 실측값)',
     String(px(back[0].h)));
  ok(bMax / det.rH < 0.60, '[R3] 되돌리면 기준(08 세부) 대비 60% 밑으로 떨어진다',
     `${(bMax / det.rH * 100).toFixed(1)}% (수리 전 51.7%)`);

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log(`\nVERIFY492 ${pass}/${pass + fail} ` + (fail ? '✗ FAIL' : '✓ PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
