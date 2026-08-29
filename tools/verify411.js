#!/usr/bin/env node
/* 게이트 — 작업 411 「07 스킬 · 26 펫 · 50 코스튬 «장착 슬롯» 아이콘을 키우고 통일한다」
 *          (저장소 주인 지시 2026-08-29 — «펫, 스킬, 코스튬 전부 아이콘이 좀 가독성있게 커져야함.
 *           내가 하는말은 그 팝업에서 그 슬롯부분» + «스샷으로 봤을 때 통일감 있어보여야함»)
 *
 *   node tools/verify411.js
 *
 * 지키는 성질: **세 시트가 «그림 자리» 한 곳을 읽고, 화면에 찍히는 잉크가 그 상자를 채운다.**
 *
 *   [A] 선언이 하나다 — `SLOT_ART` 가 있고 `PET_TH.slot`·`cosSlotSc()`·`slotEmoji()` 가 **그것에서
 *       역산**된다. 값을 손으로 다시 적은 사본이 생기면 빨개진다(402 «사본을 지운 것이 핵심»).
 *   [B] 그려진 잉크 — 세 시트 슬롯의 **실제 알파 bbox**(캔버스 크기가 아니다 · 21983 주석).
 *       세로 덩치 max/min ≤ 1.05 · 잉크 중심이 슬롯 중심 대비 |Δ| ≤ 2px.
 *       ⚠ 수리 전 값은 51 / 65 / 90 = **1.765** 이고 코스튬 중심은 −20.5 였다(`tools/probe411.js`).
 *   [C] 전수 스윕 — 슬롯에 걸릴 수 있는 그림 **전부**(이모지 27종 + 스프라이트 3종)를 통과시킨다.
 *       종횡이 상자보다 넓은 그림만 폭 상한에 걸리고(=dragon 1.469), 나머지는 전부 세로를 채운다.
 *       ⚑ **폭 상한에 걸리는 것은 결함이 아니라 356 규약**이다 — 늘려 채우면 그림이 찌그러진다.
 *   [D] 형제 부품 — 빈 칸 `[+]`·자물쇠가 장착 칸 그림과 **같이 비례**한다(394: 하나만 키우면 어긋난다).
 *   [E] 자리 불변 — 슬롯 115x115 · pitch 125 · 패널 1037x197 · `Lv.n` 라벨 잉크 자리는 **레퍼런스 그대로**.
 *       (이 작업의 이탈은 «그림 상자» 하나뿐이다 — 라벨·칸·패널은 한 픽셀도 안 움직인다)
 *   [F] 폴백 — 이모지 측정이 실패해도 칸이 비지 않는다(맨 글자 + `.sk-si` 폴백 font-size).
 *   [R] 되돌림 시험 — 그림 자리를 옛 값으로 되돌린 사본은 [B] 가 **빨개진다**.
 *       이 항이 없으면 «무르게 푼 게이트» 다(334 교훈).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «선언 → 기하» 판정이라 여기서 비평가를 띄우지 않는다.
 *          «눈» 쪽 채점은 `tools/cap411.js` 의 대조 캡처로 따로 돈다(등재문 ②).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const fs = require('fs');
const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const eq = (m, a, b) => ok(String(a) === String(b), m, String(a) === String(b) ? String(a) : `기대 ${b} · 실제 ${a}`);
const px = n => Math.round(n * 10) / 10;

/* 페이지 안 잉크 측정기 — probe411 과 **같은 식**이다(자가 둘로 갈리면 안 된다) */
const MEAS = `
window.__ink411 = function (slot) {
  var sb = slot.getBoundingClientRect();
  var host = slot.querySelector('.sk-si');
  if (!host) return null;
  var cv = host.querySelector('canvas');
  var ink = null, kind = '';
  var scan = function (g, w, h) {
    var d = g.getImageData(0, 0, w, h).data, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  if (cv) {
    kind = cv.className.indexOf('pt-cv') >= 0 ? 'sprite' : 'knight';
    var cb = cv.getBoundingClientRect();
    var b = scan(cv.getContext('2d', { willReadFrequently: true }), cv.width, cv.height);
    if (!b) return { kind: kind, empty: true };
    var sx = cb.width / cv.width, sy = cb.height / cv.height;
    ink = { x: cb.x + b.x * sx, y: cb.y + b.y * sy, w: b.w * sx, h: b.h * sy,
            cvW: cv.width, cvH: cv.height };
  } else {
    kind = 'emoji';
    var el = host.querySelector('i.sa-e') || host;
    var eb = el.getBoundingClientRect(), cs = getComputedStyle(el);
    var txt = (el.textContent || '').trim();
    if (!txt) return { kind: kind, empty: true };
    var N = 400, o = document.createElement('canvas'); o.width = N; o.height = N;
    var g = o.getContext('2d', { willReadFrequently: true });
    g.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    g.fillText(txt, N / 2, N * 0.7);
    var b2 = scan(g, N, N);
    if (!b2) return { kind: kind, empty: true, txt: txt };
    var m = g.measureText(txt);
    var A = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent;
    var D = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
    var base = eb.y + (eb.height - (A + D)) / 2 + A;
    ink = { x: eb.x + eb.width / 2 + (b2.x - N / 2), y: base + (b2.y - N * 0.7),
            w: b2.w, h: b2.h, txt: txt };
  }
  return { kind: kind, txt: ink.txt || null,
           slotW: sb.width, slotH: sb.height,
           w: Math.round(ink.w * 10) / 10, h: Math.round(ink.h * 10) / 10,
           cx: Math.round((ink.x + ink.w / 2 - sb.x - sb.width / 2) * 10) / 10,
           cy: Math.round((ink.y + ink.h / 2 - sb.y - sb.height / 2) * 10) / 10,
           cvW: ink.cvW || 0, cvH: ink.cvH || 0 };
};`;

const SEED = () => {
  Object.assign(S, DEF());
  S.best = 200; S.stage = 200;
  S.own = {}; SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
  S.eqSkill = [];
  SKILLS.slice(0, 6).forEach(s => toggleEquip(s, 'skill'));
  S.pet = {}; S.eqPet = [];
  PETS.slice(0, 2).forEach(t => { S.pet[t.id] = { n: 3, l: 2 }; toggleEquip(t, 'pet'); });
  buildSlots(); uiDirty = true; renderUI();
};

async function inksOf(p) {
  const rows = [];
  for (const [sub, sel] of [['sk', '#bSk .sk-slot[data-skslot]'],
                            ['pet', '#bPet .sk-slot[data-ptslot]'],
                            ['cos', '#bCos .sk-slot[data-cosun]']]) {
    await p.evaluate(s => gmHero(s), sub);
    await p.waitForTimeout(800);
    const r = await p.evaluate(q => [...document.querySelectorAll(q)]
      .map(el => window.__ink411(el)).filter(Boolean), sel);
    r.forEach(x => rows.push(Object.assign({ sheet: sub }, x)));
  }
  return rows;
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.addInitScript(MEAS);
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1500);
  await p.evaluate(SEED);

  /* ── [A] 선언이 하나다 ── */
  console.log('[A] 그림 자리 선언 — 값은 한 곳에서만 나온다');
  const A = await p.evaluate(() => ({
    art: typeof SLOT_ART !== 'undefined' ? { h: SLOT_ART.h, w: SLOT_ART.w } : null,
    pet: PET_TH.slot, sc: typeof cosSlotSc === 'function' ? cosSlotSc() : null,
    cosInk: typeof COS_INK !== 'undefined' ? COS_INK : null,
    hasEmo: typeof slotEmoji === 'function'
  }));
  ok(!!A.art, 'SLOT_ART 선언이 있다', A.art ? A.art.w + 'x' + A.art.h : '없음');
  ok(A.hasEmo, 'slotEmoji() 가 있다 — 이모지도 그림 자리를 읽는다');
  eq('PET_TH.slot 이 그림 자리에서 역산된다', `${A.pet.w}x${A.pet.h}`, `${A.art.w + 6}x${A.art.h + 6}`);
  ok(Math.abs(A.sc - Math.min(A.art.h / A.cosInk.h, A.art.w / A.cosInk.w)) < 1e-4,
     'cosSlotSc() 가 그림 자리에서 역산된다', String(A.sc));
  /* 사본 금지 — 옛 손글씨 상수가 슬롯 경로에 되살아나면 빨강 */
  ok(!/slot:\s*\{\s*w:\s*\d/.test(SRC), 'PET_TH.slot 에 손으로 적은 숫자가 없다');
  ok(!/data-cossc="2"/.test(SRC) || (SRC.match(/data-cossc="2"/g) || []).length === 0
     || !/sk-si"><canvas class="cos-cv" width="96"/.test(SRC),
     '코스튬 슬롯 캔버스가 손으로 적은 96x126 이 아니다');

  /* ── [B] 그려진 잉크 ── */
  console.log('[B] 그려진 잉크 — 세 시트가 같은 덩치인가');
  const rows = await inksOf(p);
  ok(rows.length >= 4, '슬롯 표본 수', rows.length + '칸(스킬 6 · 펫 2 · 코스튬 1 기대)');
  ok(rows.every(r => !r.empty), '빈 칸이 없다(그림이 실제로 그려졌다)');
  const kinds = [...new Set(rows.map(r => r.kind))].sort().join(',');
  eq('출처 셋이 다 걸렸다', kinds, 'emoji,knight,sprite');
  const hs = rows.map(r => r.h);
  const ratio = Math.max(...hs) / Math.min(...hs);
  ok(ratio <= 1.05, '세로 덩치 max/min ≤ 1.05',
     `${px(Math.max(...hs))} / ${px(Math.min(...hs))} = ${ratio.toFixed(3)} (수리 전 1.765)`);
  ok(rows.every(r => Math.abs(r.cx) <= 2), '잉크 가로 중심이 슬롯 중심 ±2px',
     'max |cx| ' + px(Math.max(...rows.map(r => Math.abs(r.cx)))));
  ok(rows.every(r => Math.abs(r.cy) <= 2), '잉크 세로 중심이 슬롯 중심 ±2px',
     'max |cy| ' + px(Math.max(...rows.map(r => Math.abs(r.cy)))) + ' (수리 전 코스튬 −20.5)');
  /* 링(안쪽 91) 을 안 밟는다 — 상자 88x80 이라 사방 여유가 남아야 한다 */
  ok(rows.every(r => r.w <= A.art.w + 2 && r.h <= A.art.h + 2), '어느 칸도 그림 자리를 안 넘는다',
     '최대 ' + px(Math.max(...rows.map(r => r.w))) + 'x' + px(Math.max(...hs)));
  /* 시트별 대표값이 서로 5% 안 */
  const per = {};
  rows.forEach(r => { (per[r.sheet] = per[r.sheet] || []).push(r.h); });
  const reps = Object.keys(per).map(k => ({ k, h: per[k].reduce((a, b) => a + b, 0) / per[k].length }));
  ok(Math.max(...reps.map(r => r.h)) / Math.min(...reps.map(r => r.h)) <= 1.05,
     '시트별 평균 세로 덩치도 5% 안', reps.map(r => r.k + ' ' + px(r.h)).join(' · '));

  /* ── [C] 전수 스윕 ── */
  console.log('[C] 전수 스윕 — 슬롯에 걸릴 수 있는 그림 전부');
  const sw = await p.evaluate(() => {
    const out = { emo: [], pet: [], box: { w: SLOT_ART.w, h: SLOT_ART.h } };
    const P = SA_P;
    SKILLS.forEach(s => {
      const m = saInk(s.ic);
      if (!m) { out.emo.push({ ic: s.ic, id: s.id, miss: 1 }); return; }
      const k = m.fs / P;
      const cv = document.createElement('canvas'); cv.width = P * 3; cv.height = P * 3;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.font = P + 'px ' + saFam; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#000'; g.fillText(s.ic, cv.width / 2, Math.round(cv.height * 0.72));
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++)
        if (d[(y * cv.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      out.emo.push({ ic: s.ic, id: s.id, w: (x1 - x0 + 1) * k, h: (y1 - y0 + 1) * k });
    });
    const T = PET_TH.slot, seen = {};
    PETS.forEach(t => {
      const k0 = t.sp; if (seen[k0]) return; seen[k0] = 1;
      const At = ATLAS[k0], sp = PET_SP[k0];
      const fr = At && At.a && sp && At.a[sp.anim] && At.f[At.a[sp.anim][0]];
      if (!fr) { out.pet.push({ sp: k0, miss: 1 }); return; }
      const ins = (T.fit | 0) + 2;
      const kk = Math.min((T.w - ins * 2) / fr[2], (T.h - ins * 2) / fr[3]);
      out.pet.push({ sp: k0, w: Math.round(fr[2] * kk) + 4, h: Math.round(fr[3] * kk) + 4 });
    });
    return out;
  });
  ok(sw.emo.every(e => !e.miss), '이모지 측정 실패 0건', sw.emo.length + '종');
  ok(sw.pet.every(e => !e.miss), '스프라이트 측정 실패 0건', sw.pet.length + '종');
  const all = sw.emo.concat(sw.pet).filter(e => !e.miss);
  ok(all.every(e => e.w <= sw.box.w + 1 && e.h <= sw.box.h + 1),
     '전 품목이 그림 자리 안에 담긴다', sw.box.w + 'x' + sw.box.h);
  /* 폭 상한에 걸리는 것 = 종횡이 상자보다 넓은 그림. 그 외는 전부 세로를 채운다 */
  const capped = all.filter(e => e.w >= sw.box.w - 1);
  const free = all.filter(e => e.w < sw.box.w - 1);
  ok(free.every(e => Math.abs(e.h - sw.box.h) <= 3.5), '폭 상한에 안 걸린 품목은 전부 세로를 채운다',
     free.length + '종 · h ' + px(Math.min(...free.map(e => e.h))) + '~' + px(Math.max(...free.map(e => e.h))));
  ok(capped.every(e => e.w / e.h > sw.box.w / sw.box.h),
     '폭 상한에 걸린 것은 «상자보다 넓은» 그림뿐이다(356 등방 — 늘려 채우지 않는다)',
     capped.map(e => (e.ic || e.sp) + ' ' + px(e.w) + 'x' + px(e.h)).join(' · ') || '없음');

  /* ── [D] 형제 부품 ── */
  console.log('[D] 형제 부품 — [+]·자물쇠가 같이 비례하는가');
  const sib = await p.evaluate(() => {
    gmHero('sk');
    const g = {};
    const plus = document.querySelector('#bSk .sk-slot.free .sk-plus');
    if (plus) { const r = plus.getBoundingClientRect(); g.plus = [r.width, r.height]; }
    const st = document.createElement('div');
    st.innerHTML = '<span class="sk-lock"></span>';
    return { plus: g.plus || null,
             lockTf: (function () {
               const el = document.querySelector('#bSk .sk-slot.lock>.sk-lock');
               return el ? getComputedStyle(el).transform : null;
             })() };
  });
  await p.waitForTimeout(500);
  const sib2 = await p.evaluate(() => {
    const plus = document.querySelector('#bSk .sk-slot.free .sk-plus');
    const r = plus && plus.getBoundingClientRect();
    return { plus: r ? [Math.round(r.width), Math.round(r.height)] : null };
  });
  ok(!!sib2.plus, '빈 칸 [+] 가 있다');
  if (sib2.plus) eq('[+] 크기가 같이 커졌다(52 → 64)', sib2.plus.join('x'), '64x64');
  const lockScale = /\.sk-slot\.lock>\.sk-lock\{[^}]*transform:scale\(([\d.]+)\)/.exec(SRC);
  ok(!!lockScale && +lockScale[1] > 1.2, '자물쇠도 같이 비례한다(1.061 → ≥1.2)',
     lockScale ? lockScale[1] : '없음');
  /* 자물쇠가 링 안쪽(12..103)을 안 밟는다 — 49x57 을 중심 48.5 에서 배율만큼 키운 값 */
  if (lockScale) {
    const s = +lockScale[1], top = 48.5 - 57 * s / 2, bot = 48.5 + 57 * s / 2;
    ok(top >= 11.5 && bot <= 86, '자물쇠가 링 안쪽 ~ St.n 라벨 사이에 든다',
       px(top) + '..' + px(bot));
  }

  /* ── [E] 자리 불변 ── */
  console.log('[E] 자리 불변 — 이탈은 «그림 상자» 하나뿐이다');
  const geo = await p.evaluate(() => {
    gmHero('sk');
    const q = s => document.querySelector(s);
    const r = el => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; };
    const slots = [...document.querySelectorAll('#bSk .sk-eqp .sk-slot')].map(r);
    const panel = r(q('#bSk .sk-eqp'));
    const lv = q('#bSk .sk-slot[data-skslot] .sk-slv');
    const lvc = getComputedStyle(lv);
    const sr = q('#bSk .sk-slot[data-skslot]').getBoundingClientRect();
    const lr = lv.getBoundingClientRect();
    return { panel: [Math.round(panel[2]), Math.round(panel[3])],
             slot: [Math.round(slots[0][2]), Math.round(slots[0][3])],
             pitch: Math.round(slots[1][0] - slots[0][0]),
             lvTop: Math.round(lr.y - sr.y), lvH: Math.round(lr.height), lvFs: lvc.fontSize };
  });
  await p.waitForTimeout(300);
  eq('슬롯 칸 115x115', geo.slot.join('x'), '115x115');
  eq('슬롯 pitch 125', geo.pitch, 125);
  eq('슬롯 패널 1037x197', geo.panel.join('x'), '1037x197');
  eq('`Lv.n` 상자 top(슬롯 기준) 76 — 레퍼런스 그대로', geo.lvTop, 76);
  eq('`Lv.n` 상자 높이 32 — 레퍼런스 그대로', geo.lvH, 32);
  eq('`Lv.n` font-size 27 — 레퍼런스 그대로', geo.lvFs, '27px');

  /* ── [F] 폴백 ── */
  console.log('[F] 폴백 — 재기에 실패해도 칸이 안 빈다');
  const fb = await p.evaluate(() => {
    /* 측정기를 강제로 실패시키고 다시 그린다 */
    const orig = saInk, cache = Object.keys(saCache);
    cache.forEach(k => delete saCache[k]);
    // eslint-disable-next-line no-global-assign
    window.saInk = () => null;
    const html = slotEmoji('🗡️');
    window.saInk = orig;
    cache.forEach(k => { });
    return { html, plain: html === '🗡️' };
  });
  ok(fb.plain, '측정 실패 시 맨 글자로 떨어진다(빈 칸이 되지 않는다)', fb.html);
  const fbFs = /\.sk-si\{[^}]*font-size:58px/.test(SRC);
  ok(fbFs, '`.sk-si` 에 폴백 font-size 58 이 남아 있다');

  /* ── [R] 되돌림 시험 ── */
  console.log('[R] 되돌림 시험 — 옛 값으로 되돌리면 [B] 가 빨개진다');
  await p.evaluate(() => {
    /* 411 이전으로: 이모지는 맨 글자 · 펫 캔버스 69x59 · 코스튬 96x126@2 · 상자 12..82 */
    window.slotEmoji = ch => ch;
    PET_TH.slot = { w: 69, h: 59, fit: 3 };
    window.cosSlotSc = () => 2;
    const st = document.createElement('style');
    st.id = 'r411';
    st.textContent = '.sk-si{height:70px!important;font-size:58px!important;line-height:70px!important}'
      + ':is(#bSk,#bPet,#bCos) b.sk-si{display:block!important}'
      + '#bCos .sk-si{display:flex!important;align-items:flex-end!important}';
    document.head.appendChild(st);
    /* 코스튬 캔버스는 마크업이 만드는 값이라 직접 되돌린다 */
    window.__r411cos = true;
    uiDirty = true; renderUI();
  });
  await p.evaluate(() => {
    gmHero('cos');
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.querySelectorAll('#bCos .sk-slot .cos-cv').forEach(cv => {
      cv.width = 96; cv.height = 126; cv.dataset.cossc = '2';
    });
    cosPaint(document.getElementById('bCos'));
  });
  await p.waitForTimeout(300);
  const rr = await inksOf(p);
  const rh = rr.filter(r => !r.empty).map(r => r.h);
  const rratio = Math.max(...rh) / Math.min(...rh);
  ok(rratio > 1.4, '[R] 되돌린 사본은 세로 덩치가 다시 벌어진다',
     `${px(Math.max(...rh))} / ${px(Math.min(...rh))} = ${rratio.toFixed(3)} (> 1.4 이어야 «무른 게이트» 가 아니다)`);
  const rcos = rr.find(r => r.kind === 'knight');
  ok(!!rcos && Math.abs(rcos.cy) > 8, '[R] 되돌리면 코스튬 중심이 다시 위로 올라간다',
     rcos ? String(rcos.cy) : '표본 없음');

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log(`\nVERIFY411 ${pass}/${pass + fail} ` + (fail ? '✗ FAIL' : '✓ PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
