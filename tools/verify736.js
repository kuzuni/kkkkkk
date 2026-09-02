#!/usr/bin/env node
/* 736 게이트 — 메인 HUD 장착 스킬 슬롯의 레벨 표기 «Lv. n»  (주인 지시 2026-09-02 04:35)
 *
 *   node tools/verify736.js      → `VERIFY736 n/m PASS|FAIL`
 *
 * 무엇을 지키는가
 *   [A] 라벨   — 배지가 «Lv. » + 그 스킬의 레벨이다(자릿수 스윕 1·10·MAX_LEVEL · 장착 칸 전수).
 *   [B] 짝     — **07 시트 장착 슬롯(`.sk-slv`)과 글자 그대로 같은 말**이다.
 *                (689 교훈 ① — «이 낱말이 있는 자리» 가 아니라 «이 낱말과 짝인 자리» 를 같이 묻는다.
 *                 한쪽만 물으면 나중에 다른 쪽이 되돌아가도 초록이다.)
 *   [C] 그릇   — 잘림 0 · 좌우 여백 ≥ 6px · **자릿수가 바뀌어도 상자 Δ0**(735 규약) ·
 *                최장 라벨(«Lv. » + MAX_LEVEL)을 담는다.
 *   [D] 불변   — 세로 기하(높이 40.1 · 하단 돌출 9.8 · 중심 48.8)와 슬롯 행 기하는 736 이 안 건드렸다 ·
 *                이웃 뱃지/이웃 슬롯 침범 0 · 716 의 등급색 토큰 불변.
 *   [E] 자리   — 빈 칸·미해금 칸에는 배지가 없다(레벨이 없는 칸이다).
 *   [F] 서체   — 라틴 «Lv.» 가 폴백으로 안 떨어진다(380 선례 · 689 교훈 ② — 겁내지 말고 잰다).
 *   [G] 프레임 — 9:13.3(1600)에서도 같은 상자·같은 침범 0(짧은 기기에서 UI 고정 요소는 절대값 그대로).
 *   [R] 되돌림 — 접두를 지우거나 그릇을 옛 폭(43.5)으로 되돌리면 **이 자가 빨개진다**(음성 대조).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

let ok = 0, tot = 0;
const fails = [];
const t = (name, cond, detail) => {
  tot++;
  if (cond) ok++; else fails.push(name + (detail ? ' — ' + detail : ''));
};

const openPage = async (browser, h) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof buildSlots === 'function' && typeof renderSkill === 'function'
    && typeof oLv === 'function' && typeof MAX_LEVEL !== 'undefined');
  await page.waitForTimeout(900);
  return { page, errs };
};

/* 장착 칸 전수 + 07 시트 짝을 한 번에 잰다 */
const scan = async (page, lv) => page.evaluate((L) => {
  const px = v => parseFloat(v) || 0;
  const ids = Object.keys(SK).slice(0, 8);
  S.own = S.own || {};
  ids.forEach(id => { S.own[id] = { l: L, n: 0 }; });
  S.eqSkill = ids.slice(0, 8);
  buildSlots();
  renderSkill();
  const slots = Array.prototype.slice.call(document.querySelectorAll('#slots .slot2'));
  const rows = slots.map((s, i) => {
    const b = s.querySelector('.lvv2');
    const sr = s.getBoundingClientRect();
    if (!b) return { i, has: false, slot: { x: sr.x, w: sr.width, bottom: sr.y + sr.height, cy: sr.y + sr.height / 2 } };
    const c = getComputedStyle(b), r = b.getBoundingClientRect();
    const rng = document.createRange(); rng.selectNodeContents(b);
    const ink = rng.getBoundingClientRect();
    const id = S.eqSkill[i];
    const s7 = document.querySelector('#bSk .sk-slot[data-skslot="' + id + '"] .sk-slv');
    return {
      i, has: true, id, txt: b.textContent, txt7: s7 ? s7.textContent : null,
      want: 'Lv. ' + oLv(id),
      box: { x: r.x, y: r.y, w: r.width, h: r.height },
      inner: r.width - 2 * px(c.borderTopWidth),
      ink: ink.width, ff: getComputedStyle(b).fontFamily.split(',')[0].trim(),
      out: (r.y + r.height) - (sr.y + sr.height),
      cy: (r.y + r.height / 2) - (sr.y + sr.height / 2),
      slot: { x: sr.x, w: sr.width, bottom: sr.y + sr.height },
      tokF: (s.getAttribute('style') || '').match(/--f:\s*([^;"]+)/) ? s.getAttribute('style').match(/--f:\s*([^;"]+)/)[1].trim() : '',
      tokR: (s.getAttribute('style') || '').match(/--r:\s*([^;"]+)/) ? s.getAttribute('style').match(/--r:\s*([^;"]+)/)[1].trim() : ''
    };
  });
  /* 최장 라벨의 잉크 — 그릇의 근거값(상수를 외우지 않는다) */
  const b0 = document.querySelector('#slots .lvv2');
  const c0 = getComputedStyle(b0);
  const d0 = document.createElement('span');
  d0.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;font-weight:' + c0.fontWeight
    + ';font-size:' + c0.fontSize + ';font-family:' + c0.fontFamily;
  d0.textContent = 'Lv. ' + MAX_LEVEL;
  document.body.appendChild(d0);
  const rng0 = document.createRange(); rng0.selectNodeContents(d0);
  const maxInk = rng0.getBoundingClientRect().width;
  const maxFf = getComputedStyle(d0).fontFamily.split(',')[0].trim();
  d0.remove();
  return { rows, maxInk, maxFf, maxLevel: MAX_LEVEL, fill: SK_FILL.map(String), rim: SK_RIM.map(String) };
}, lv);

/* 빈 칸·미해금 칸 — 배지가 없어야 한다 */
const empties = async (page) => page.evaluate(() => {
  S.eqSkill = [null, null, null, null, null, null, null, null];
  buildSlots();
  const slots = Array.prototype.slice.call(document.querySelectorAll('#slots .slot2'));
  return {
    n: slots.length,
    withBadge: slots.filter(s => s.querySelector('.lvv2')).length,
    free: slots.filter(s => s.classList.contains('free')).length,
    lock: slots.filter(s => s.classList.contains('empty') && !s.classList.contains('free')).length
  };
});

(async () => {
  const browser = await launch(chromium);
  const { page, errs } = await openPage(browser, 2280);

  const maxLevel = await page.evaluate(() => MAX_LEVEL);
  const sets = {};
  for (const lv of [1, 10, maxLevel]) sets[lv] = await scan(page, lv);

  /* ---- [A] 라벨 ---- */
  for (const lv of [1, 10, maxLevel]) {
    const rows = sets[lv].rows.filter(r => r.has);
    t('[A1] Lv' + lv + ' — 장착 칸 8개 전부에 배지', rows.length === 8, rows.length + '개');
    t('[A2] Lv' + lv + ' — 배지 = «Lv. » + 그 스킬의 레벨',
      rows.every(r => r.txt.trim() === r.want), rows.map(r => '«' + r.txt + '»/기대«' + r.want + '»').slice(0, 3).join(' · '));
    t('[A3] Lv' + lv + ' — 맨 숫자로 되돌아간 칸 0',
      rows.every(r => /^Lv\./.test(r.txt.trim())), rows.filter(r => !/^Lv\./.test(r.txt.trim())).map(r => r.i).join(','));
  }

  /* ---- [B] 짝 — 07 시트와 같은 말 ---- */
  for (const lv of [1, 10, maxLevel]) {
    const rows = sets[lv].rows.filter(r => r.has && r.txt7 !== null);
    t('[B1] Lv' + lv + ' — 07 시트 슬롯 라벨이 잡힌다(짝을 못 찾으면 이 자는 무의미하다)',
      rows.length > 0, rows.length + '개');
    t('[B2] Lv' + lv + ' — 메인 배지 === 07 시트 라벨(글자 그대로)',
      rows.every(r => r.txt.trim() === r.txt7.trim()),
      rows.filter(r => r.txt.trim() !== r.txt7.trim()).map(r => '«' + r.txt + '»≠«' + r.txt7 + '»').join(' · '));
  }

  /* ---- [C] 그릇 ---- */
  const all = [].concat(...[1, 10, maxLevel].map(lv => sets[lv].rows.filter(r => r.has)));
  t('[C1] 잘림 0 — 잉크가 안쪽 폭 안', all.every(r => r.ink <= r.inner),
    all.filter(r => r.ink > r.inner).map(r => r.ink.toFixed(2) + '>' + r.inner.toFixed(2)).join(' · '));
  t('[C2] 좌우 여백 ≥ 6px', all.every(r => (r.inner - r.ink) / 2 >= 6),
    Math.min(...all.map(r => (r.inner - r.ink) / 2)).toFixed(2) + 'px 최소');
  const w0 = all[0].box.w, h0 = all[0].box.h;
  t('[C3] 자릿수가 바뀌어도 상자 Δ0 (735 — 출렁임 금지)',
    all.every(r => Math.abs(r.box.w - w0) < 0.01 && Math.abs(r.box.h - h0) < 0.01),
    w0.toFixed(2) + '×' + h0.toFixed(2));
  t('[C4] 최장 라벨 «Lv. ' + maxLevel + '» 을 담는다(상수가 아니라 잰 값으로)',
    (all[0].inner - sets[maxLevel].maxInk) / 2 >= 6,
    '안쪽 ' + all[0].inner.toFixed(2) + ' · 최장 잉크 ' + sets[maxLevel].maxInk.toFixed(2));

  /* ---- [D] 불변 ---- */
  t('[D1] 배지 높이 40.1 (A4 §3 — 736 은 세로를 안 건드렸다)',
    all.every(r => Math.abs(r.box.h - 40.1) <= 0.5), all[0].box.h.toFixed(2));
  t('[D2] 하단 돌출 9.8', all.every(r => Math.abs(r.out - 9.8) <= 0.5), all[0].out.toFixed(2));
  t('[D3] 슬롯 중심 기준 배지 중심 48.8', all.every(r => Math.abs(r.cy - 48.8) <= 0.5), all[0].cy.toFixed(2));
  t('[D4] 배지가 자기 슬롯 가로 폭 안 (이웃 슬롯 침범 0)',
    all.every(r => r.box.x >= r.slot.x - 0.01 && r.box.x + r.box.w <= r.slot.x + r.slot.w + 0.01),
    all[0].box.x.toFixed(1) + '..' + (all[0].box.x + all[0].box.w).toFixed(1));
  const rowsMax = sets[maxLevel].rows.filter(r => r.has).sort((a, b) => a.box.x - b.box.x);
  const gaps = rowsMax.slice(1).map((r, i) => r.box.x - (rowsMax[i].box.x + rowsMax[i].box.w));
  t('[D5] 이웃 배지 사이 틈 > 0', gaps.every(g => g > 0), gaps.map(g => g.toFixed(1)).join(' · '));
  t('[D6] 716 등급색 토큰 불변 — 장착 칸이 `--f`/`--r` 을 그대로 받는다',
    rowsMax.every(r => /^#|rgb/.test(r.tokF) && /^#|rgb/.test(r.tokR)),
    rowsMax[0].tokF + ' / ' + rowsMax[0].tokR);

  /* ---- [E] 자리 ---- */
  const em = await empties(page);
  t('[E1] 빈 칸·미해금 칸에는 배지가 없다', em.withBadge === 0, em.withBadge + '개');
  t('[E2] 그 칸들이 실제로 존재한다(전제 — 안 그리면 [E1] 은 공짜 초록)',
    em.free + em.lock === em.n && em.n === 8, 'free ' + em.free + ' · lock ' + em.lock);

  /* ---- [F] 서체 ---- */
  t('[F1] 배지 서체가 폴백으로 안 떨어진다(380·689)',
    all.every(r => /GameKR/i.test(r.ff)), all[0].ff);
  t('[F2] 최장 라벨도 같은 서체', /GameKR/i.test(sets[maxLevel].maxFf), sets[maxLevel].maxFf);

  /* ---- [R] 되돌림 시험 (음성 대조) ---- */
  const rev = await page.evaluate((ML) => {
    const px = v => parseFloat(v) || 0;
    const ids = Object.keys(SK).slice(0, 8);
    S.own = S.own || {};
    ids.forEach(id => { S.own[id] = { l: ML, n: 0 }; });
    S.eqSkill = ids;
    buildSlots();
    const b = document.querySelector('#slots .lvv2');
    const inkOf = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    /* R1 — 접두를 지운다 ⇒ [A2]·[B2] 의 술어가 거짓이어야 한다 */
    const keep = b.textContent;
    b.textContent = String(ML);
    const r1 = { pre: /^Lv\./.test(b.textContent.trim()) };
    b.textContent = keep;
    /* R2 — 그릇을 옛 폭(43.5)으로 되돌린다 ⇒ [C1]·[C2] 의 술어가 거짓이어야 한다 */
    b.style.width = '43.5px';
    const c = getComputedStyle(b);
    const inner = b.getBoundingClientRect().width - 2 * px(c.borderTopWidth);
    const r2 = { inner, ink: inkOf(b), fit: inkOf(b) <= inner, margin: (inner - inkOf(b)) / 2 };
    b.style.width = '';
    /* 원복 확인 — 되돌림 시험이 자기 트리를 더럽히지 않았는가 */
    const back = { w: b.getBoundingClientRect().width, txt: b.textContent };
    return { r1, r2, back };
  }, maxLevel);
  t('[R1] 접두를 지우면 «Lv.» 항이 거짓이 된다', rev.r1.pre === false, JSON.stringify(rev.r1));
  t('[R2] 그릇을 옛 폭 43.5 로 되돌리면 잘림이 난다',
    rev.r2.fit === false && rev.r2.margin < 6,
    '안쪽 ' + rev.r2.inner.toFixed(2) + ' · 잉크 ' + rev.r2.ink.toFixed(2) + ' · 여백 ' + rev.r2.margin.toFixed(2));
  t('[R3] 되돌림 시험 뒤 원복', Math.abs(rev.back.w - w0) < 0.01 && /^Lv\./.test(rev.back.txt.trim()),
    rev.back.w + ' / «' + rev.back.txt + '»');

  await page.context().close();

  /* ---- [G] 9:13.3 (1600) ---- */
  const g = await openPage(browser, 1600);
  const gs = await scan(g.page, maxLevel);
  const gr = gs.rows.filter(r => r.has);
  t('[G1] 1600 — 배지 상자가 2280 과 같다',
    gr.every(r => Math.abs(r.box.w - w0) < 0.01 && Math.abs(r.box.h - h0) < 0.01),
    gr[0].box.w.toFixed(2) + '×' + gr[0].box.h.toFixed(2));
  t('[G2] 1600 — 잘림 0 · 여백 ≥ 6', gr.every(r => r.ink <= r.inner && (r.inner - r.ink) / 2 >= 6),
    Math.min(...gr.map(r => (r.inner - r.ink) / 2)).toFixed(2));
  t('[G3] 1600 — 이웃 슬롯 침범 0',
    gr.every(r => r.box.x >= r.slot.x - 0.01 && r.box.x + r.box.w <= r.slot.x + r.slot.w + 0.01));
  t('[G4] 1600 — 라벨이 «Lv. n»', gr.every(r => r.txt.trim() === r.want), gr[0].txt);
  t('[G5] 콘솔 에러 0 (두 프레임)', errs.length === 0 && g.errs.length === 0,
    errs.concat(g.errs).join(' | ') || '0건');

  await browser.close();
  if (fails.length) { console.log('실패 항목:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log('VERIFY736 ' + ok + '/' + tot + ' ' + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
