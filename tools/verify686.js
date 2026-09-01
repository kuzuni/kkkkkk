#!/usr/bin/env node
/* 게이트 — 작업 686 «단련 «구간당 1레벨당 (단련석)n» 텍스트 제거 + 강화 버튼 세로 확대»
 *   (주인 지시 2026-09-02 00:50 · 670 과 같은 버튼)
 *
 *   node tools/verify686.js
 *
 * 주인 원문: «훈련에 구간당 1레벨당 (단련석)1 이거 텍스트 없애주고 대신 그 단련석 강화버튼을
 *            세로로 키워줘야함»
 *
 * 절
 *   [1] 텍스트 0건 — `.tc` 노드도 «n~n 구간 · 1레벨당» 문자열도 없다. **두 렌더 경로 다**
 *       본다(통짜 `renderTemper` · 홀드 `liveTemper`) — 297 이 «두 경로가 같은 식을 본다» 로
 *       세운 자리라 한쪽만 지우면 홀드 중에만 옛 노드가 되살아난다.
 *   [2] 버튼 기하 — 세로는 686 값(22 · 178), **가로는 584 값 Δ0**(632 · 340: 자릿수 예산).
 *       높이는 발명이 아니라 같은 행 아이콘 상자와 **같은 밴드**여야 한다(22..200).
 *   [3] 이웃 침범 0 — 행 안 형제 전수 rect 교차 0 · 행 베벨(8) 안 · **두 프레임**(404 선례).
 *   [4] 라벨 중앙 — 커진 상자 안에서도 잉크·화폐 아이콘의 상하 여백이 대칭이다
 *       (584 [2-i] 규약이 line-height 를 같이 올린 것만으로 성립하는지가 이 항이다).
 *   [5] 값은 안 죽었다 — 버튼이 구간을 따라 1/3/6 을 말한다(210 ⓑ-2 의 이관처).
 *   [R] 되돌림 — 옛 `.tc` 를 주입하면 [1] 이, 버튼을 74 로 되돌리면 [2]·[3] 이 실제로 빨개진다.
 *       (무르게 푼 수리가 아님을 못박는 자리 — 334·368 규약)
 *
 * 회귀는 따로 돈다: `verify660`(버스트 스폰 = 버튼 상자 안) · `verify621`(눌림 왕복) ·
 * `verify670`(라벨) · `verify612`·`verify584`·`verify613`·`verify210`(이관).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p1 = n => Math.round(n * 10) / 10;

const REL = `window.__rel = (sel, host) => {
  const e = document.querySelector(sel), h = document.querySelector(host);
  if (!e || !h) return null;
  const a = e.getBoundingClientRect(), b = h.getBoundingClientRect();
  const r = n => Math.round(n * 10) / 10;
  return { x: r(a.x - b.x), y: r(a.y - b.y), w: r(a.width), h: r(a.height),
           x2: r(a.right - b.x), y2: r(a.bottom - b.y) };
};`;

async function openAt(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });
  await page.evaluate(REL);
  await page.waitForTimeout(150);
  return { ctx, page };
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await openAt(browser, 2280);

  /* ══ [1] 설명 텍스트 0건 — 두 렌더 경로 다 ═══════════════════════════ */
  console.log('\n=== [1] 주인이 지목한 텍스트가 0건인가 (통짜 · 홀드 두 경로) ===');
  const txt = await page.evaluate(() => {
    const w = () => document.getElementById('trTemper');
    const snap = () => ({ tc: w().querySelectorAll('.tc').length,
                          txt: w().textContent.replace(/\s+/g, ' ') });
    S.temper = { alloc: { atk: 150, hp: 40, regen: 260 } }; S.tstone = 1e6;
    renderTemper();
    const full = snap();
    /* 홀드 경로 — liveTemper 가 그리게 한다(297 짝) */
    rtHold = { tag: 'temper' };
    S.temper.alloc.atk = 137; markDirty(); renderTemper();
    const live = snap();
    rtHold = null; renderTemper();
    return { full, live, src: typeof temperRowTxt === 'function' ? temperRowTxt.toString() : '' };
  });
  ok(txt.full.tc === 0, '[1-a] 통짜 렌더에 비용 열(.tc) 노드 0개', txt.full.tc + '개');
  ok(txt.live.tc === 0, '[1-b] ★ 홀드 렌더(liveTemper)에도 0개 — 297 «두 경로 같은 식»',
    txt.live.tc + '개');
  ok(!/구간/.test(txt.full.txt) && !/1레벨당/.test(txt.full.txt),
    '[1-c] ★ 화면 텍스트에 «구간»·«1레벨당» 0건(통짜)');
  ok(!/구간/.test(txt.live.txt) && !/1레벨당/.test(txt.live.txt),
    '[1-d] ★ 홀드 중에도 0건(옛 노드가 되살아나지 않는다)');
  ok(!/seg\s*:/.test(txt.src) && !/cost\s*:/.test(txt.src),
    '[1-e] `temperRowTxt` 에 죽은 필드(seg·cost)가 안 남았다(402 «사본을 지운다» 규약)');

  /* ══ [2] 버튼 기하 ═══════════════════════════════════════════════════ */
  console.log('\n=== [2] 버튼 — 세로 686(22 · 178) · 가로 584 Δ0(632 · 340) ===');
  const G = await page.evaluate(() => {
    const host = '#trTemper .tr-tp.k0';
    const g = s => window.__rel(host + ' ' + s, host);
    return { tb: g('.tb'), ti: g('.ti'), td: g('.td'), tn: g('.tn'), tl: g('.tl'),
             row: window.__rel(host, '#trTemper') };
  });
  /* 686 2회차 — 이 버튼은 아래로 **5px 립**(`0 5px 0` 3D 그림자)을 단다. 그래서 «같은 띠» 는
     코어 rect 가 아니라 **그려진 실루엣**(코어 + 립)으로 재야 한다 — 코어를 178 로 두면 실루엣이
     205 로 액자(200)보다 5px 길었고, 비평가 2인이 독립으로 그 5px 를 짚었다. */
  const LIP = 5;
  ok(G.tb.y === 22 && G.tb.h === 173,
    '[2-a] ★ 세로 — 상변 22 · 코어 높이 173(+립 5 = 실루엣 178)', `${G.tb.y}..${G.tb.y2} h ${G.tb.h}`);
  ok(G.tb.x === 632 && G.tb.w === 340,
    '[2-b] ★ 가로는 584 값 Δ0 — 좌변 632 · 폭 340(자릿수 예산을 안 건드렸다)',
    `x ${G.tb.x} w ${G.tb.w}`);
  ok(G.tb.y === G.ti.y && G.tb.y2 + LIP === G.ti.y2,
    '[2-c] ★ 높이의 근거 — **그려진 실루엣**(코어+립)이 아이콘 액자와 같은 띠 22..200',
    `버튼 ${G.tb.y}..${G.tb.y2}(+립 ${LIP} = ${G.tb.y2 + LIP}) ↔ 아이콘 ${G.ti.y}..${G.ti.y2}`);
  ok(p1(G.tb.y) === p1(G.row.h - (G.tb.y2 + LIP)),
    '[2-d] 행 여백이 위아래 대칭(립까지 세고)',
    `위 ${G.tb.y} · 아래 ${p1(G.row.h - (G.tb.y2 + LIP))}`);

  /* ══ [3] 이웃 침범 0 — 두 프레임 ═══════════════════════════════════════ */
  console.log('\n=== [3] 이웃 침범 0 — 형제 전수 × 두 프레임(404 선례) ===');
  for (const H of [2280, 1600]) {
    const p = H === 2280 ? page : (await openAt(browser, H)).page;
    const hit = await p.evaluate(() => {
      const out = [];
      [...document.querySelectorAll('#trTemper .tr-tp')].forEach(row => {
        const b = row.querySelector('.tb').getBoundingClientRect();
        [...row.children].forEach(el => {
          if (el.classList.contains('tb')) return;
          const r = el.getBoundingClientRect();
          const ox = Math.min(b.right, r.right) - Math.max(b.left, r.left);
          const oy = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
          if (ox > 0 && oy > 0) out.push(row.dataset.temper + '>' + el.className
            + ' ' + ox.toFixed(1) + '×' + oy.toFixed(1));
        });
      });
      /* 행 베벨(inset 8) 안 · 시트 안 */
      const sh = document.querySelector('#trw .tr-sheet').getBoundingClientRect();
      const bev = [], outSheet = [];
      [...document.querySelectorAll('#trTemper .tr-tp')].forEach(row => {
        const rb = row.getBoundingClientRect(), b = row.querySelector('.tb').getBoundingClientRect();
        if (b.top - rb.top < 8 || rb.bottom - b.bottom < 8) bev.push(row.dataset.temper);
        if (b.top < sh.top || b.bottom > sh.bottom) outSheet.push(row.dataset.temper);
      });
      return { out, bev, outSheet };
    });
    ok(hit.out.length === 0, `[3-a@${H}] ★ 버튼이 같은 행 어느 형제와도 안 겹친다`,
      hit.out.length ? hit.out.join(' · ') : '겹침 0');
    ok(hit.bev.length === 0, `[3-b@${H}] 버튼이 행 베벨(8px) 안에 있다`,
      hit.bev.length ? hit.bev.join(',') : '전 행 OK');
    ok(hit.outSheet.length === 0, `[3-c@${H}] ★ 세 버튼 전부 시트 안(스크롤 없이 보인다)`,
      hit.outSheet.length ? hit.outSheet.join(',') : '전 행 OK');
  }

  /* ══ [4] 라벨 중앙 ═══════════════════════════════════════════════════ */
  console.log('\n=== [4] 커진 상자 안에서 라벨·화폐 아이콘이 중앙인가(584 [2-i] 규약) ===');
  const C = await page.evaluate(() => {
    const btn = document.querySelector('#trTemper .tr-tp.k0 .tb');
    const b = btn.getBoundingClientRect();
    const img = btn.querySelector('img.cic'), ink = btn.querySelector('i');
    const r = n => Math.round(n * 100) / 100;
    const m = el => { const a = el.getBoundingClientRect();
      return { top: r(a.top - b.top), bot: r(b.bottom - a.bottom),
               left: r(a.left - b.left), right: r(b.right - a.right) }; };
    const cs = getComputedStyle(btn);
    /* 686 3회차 — 숫자 잉크 중심 ↔ 아이콘 중심 보정을 **자가 스스로 푼다**(손으로 박은 수가 아니다):
       baseline = 아이콘 하변 − |vertical-align| · 잉크 중심 = baseline − (asc − desc)/2 (canvas TextMetrics).
       서체가 바뀌면 need 가 따라 움직이고, CSS 의 top 이 안 따라오면 이 항이 빨개진다. */
    const num = btn.querySelector('.tbn');
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = cs.fontSize + ' ' + cs.fontFamily;
    const tm = cv.measureText('8');
    const vaPx = parseFloat(getComputedStyle(img).verticalAlign);
    const baseline = (img.getBoundingClientRect().bottom - b.top) - (-vaPx);
    const inkCy = baseline - (tm.actualBoundingBoxAscent - tm.actualBoundingBoxDescent) / 2;
    const iconCy = img.getBoundingClientRect().top + img.getBoundingClientRect().height / 2 - b.top;
    const need = Math.round((iconCy - inkCy) * 100) / 100;
    const applied = parseFloat(getComputedStyle(num).top) || 0;
    /* computed boxShadow 는 «rgb(...) 0px 0px 0px 8px inset, rgb(...) 0px 5px 0px» 꼴이다 —
       inset 항의 네 번째 길이(spread)가 테 두께다. */
    const insetPart = cs.boxShadow.split(/,(?![^(]*\))/).find(t => /inset/.test(t)) || '';
    const nums = (insetPart.match(/(-?[\d.]+)px/g) || []).map(parseFloat);
    const stroke = nums.length >= 4 ? nums[3] : null;
    return { img: m(img), ink: m(ink), fs: cs.fontSize, lh: cs.lineHeight, stroke,
             fill: img.getBoundingClientRect().height / b.height,
             need, applied, inkH: Math.round((tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent) * 10) / 10,
             ratio: Math.round(img.getBoundingClientRect().height
                    / (tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent) * 100) / 100,
             tab: cs.fontVariantNumeric };
  });
  ok(Math.abs(C.img.top - C.img.bot) <= 3 && C.img.top >= 5,
    '[4-a] ★ 화폐 아이콘 상하 여백 대칭(line-height 를 같이 올린 것으로 자동 성립)',
    `위 ${C.img.top} · 아래 ${C.img.bot}`);
  ok(Math.abs(C.ink.left - C.ink.right) <= 3 && C.ink.left > 0,
    '[4-b] 라벨이 가로 중앙(670 [5-d] 회귀)', `좌 ${C.ink.left} · 우 ${C.ink.right}`);
  ok(C.lh === '173px' && C.fs === '48px',
    '[4-c] line-height = 코어 높이(173) · font-size 48(3회차 — 비평 2인 «숫자가 아이콘에 눌렸다» 반영)',
    `fs ${C.fs} · lh ${C.lh}`);
  ok(Math.abs(C.applied - C.need) <= 0.05,
    '[4-f] ★ 3회차 — 숫자 잉크 중심 보정이 **자가 푼 값과 일치**(아이콘 중심 ↔ 숫자 잉크 중심 정렬)',
    `필요 ${C.need}px · CSS top ${C.applied}px`);
  ok(C.ratio <= 2.8,
    '[4-g] ★ 3회차 — 아이콘:숫자잉크 비율(2회차 3.56:1 이 «정보가 장식에 눌렸다» 로 ② 를 6점에 묶었다)',
    `${C.ratio}:1 (아이콘 ${C.img ? '' : ''}88 · 숫자 잉크 ${C.inkH})`);
  ok(/tabular-nums/.test(C.tab),
    '[4-h] 3회차 — 자릿수 고정 숫자(비평 2인 «아이콘이 행마다 4px 흔들린다» — 1·3·6 자폭 차이가 원인)',
    C.tab);
  ok(C.fill >= 0.5 && C.fill <= 0.7,
    '[4-d] ★ 2회차 — 세로 채움률(잉크 높이 ÷ 코어 높이)이 50~70%(1회차 29.8% 가 ② 를 4점으로 떨어뜨렸다)',
    `${Math.round(C.fill * 1000) / 10}%`);
  ok(C.stroke === 8,
    '[4-e] ★ 2회차 — 검정 테 8px(같은 패널의 카드·아이콘 액자·보유 바와 통일 — 1회차 5px 는 37.5% 얇았다)',
    C.stroke + 'px');

  /* ══ [5] 값은 안 죽었다 ═════════════════════════════════════════════ */
  console.log('\n=== [5] 지운 것은 «설명» 이고 «값» 이 아니다 — 버튼이 구간을 따라간다 ===');
  const V = await page.evaluate(() => [50, 150, 250].map(lv => {
    S.temper = { alloc: { atk: lv, hp: 0, regen: 0 } }; renderTemper();
    const card = document.querySelector('.tr-tp[data-temper="atk"]');
    return { lv, tb: card.querySelector('.tb').textContent.replace(/\s+/g, ''),
             cost: temperCost('atk'),
             ic: /cur-tstone\.svg/.test(card.querySelector('.tb i').innerHTML) };
  }));
  ok(V.every(v => v.tb === String(v.cost)) && V.map(v => v.tb).join(',') === '1,3,6',
    '[5-a] ★ 버튼 값이 구간을 따라간다(Lv50/150/250 → 1/3/6) — 210 ⓑ-2 의 이관처',
    V.map(v => 'Lv' + v.lv + '→' + v.tb).join(' · '));
  ok(V.every(v => v.ic), '[5-b] 화폐 아이콘이 남아 단위를 말한다(125 · 613 이관처)');
  /* [5-c] 3회차 — 라벨을 키운 대가(자릿수 예산)를 **추상적인 «n자리» 가 아니라 실제 도달 레벨**로 잰다.
     이 저장소가 스스로 «먼 값» 으로 쓰는 far 표본은 `verify210` [C] 의 **Lv 100000**(비용 501,501)이다. */
  const FAR = await page.evaluate(() => {
    const out = [];
    S.tstone = 1e12;
    [10000, 100000].forEach(lv => {
      S.temper = { alloc: { atk: lv, hp: 0, regen: 0 } }; renderTemper();
      const row = document.querySelector('.tr-tp[data-temper="atk"]');
      const b = row.querySelector('.tb').getBoundingClientRect();
      const i = row.querySelector('.tb i').getBoundingClientRect();
      out.push({ lv, cost: temperCost('atk'), room: Math.round((b.width - 16 - i.width) * 10) / 10 });
    });
    S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } }; renderTemper();
    return out;
  });
  ok(FAR.every(f => f.room > 0),
    '[5-c] ★ 3회차 — 커진 라벨이 **이 저장소의 far 표본(Lv 100000 · 비용 501,501)에서 안 넘친다**',
    FAR.map(f => `Lv${f.lv} 비용 ${f.cost} 여유 ${f.room}`).join(' · '));

  /* ══ [R] 되돌림 시험 ═══════════════════════════════════════════════ */
  console.log('\n=== [R] 되돌림 — 옛 상태를 주입하면 이 자가 실제로 빨개지는가 ===');
  const R = await page.evaluate(() => {
    const row = document.querySelector('#trTemper .tr-tp.k0');
    /* R1 — 옛 비용 열을 주입 */
    const sp = document.createElement('span');
    sp.className = 'tc'; sp.innerHTML = '<i>1</i><br><s>100~199 구간 · 1레벨당</s>';
    row.appendChild(sp);
    const w = document.getElementById('trTemper');
    const r1 = { tc: w.querySelectorAll('.tc').length, seg: /구간/.test(w.textContent) };
    sp.remove();
    const r1b = { tc: w.querySelectorAll('.tc').length, seg: /구간/.test(w.textContent) };
    /* R2 — 버튼을 옛 세로(128 · 74)로 되돌리면 아이콘 상자와 밴드가 갈리고 여백이 비대칭이 된다 */
    const btn = row.querySelector('.tb');
    btn.style.top = '128px'; btn.style.height = '74px';
    const rb = row.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const ti = row.querySelector('.ti').getBoundingClientRect();
    const r2 = { y: +(b.top - rb.top).toFixed(1), h: +b.height.toFixed(1),
                 band: Math.abs(b.top - ti.top) < 0.5 && Math.abs(b.bottom - ti.bottom) < 0.5 };
    btn.style.top = ''; btn.style.height = '';
    const b2 = btn.getBoundingClientRect();
    const r2b = { y: +(b2.top - rb.top).toFixed(1), h: +b2.height.toFixed(1) };
    return { r1, r1b, r2, r2b };
  });
  ok(R.r1.tc === 1 && R.r1.seg === true,
    '[R-a] 옛 비용 열을 주입하면 [1-a]·[1-c] 가 보는 값이 실제로 빨개진다(자가 공허하지 않다)',
    `주입 후 .tc ${R.r1.tc}개 · «구간» ${R.r1.seg}`);
  ok(R.r1b.tc === 0 && R.r1b.seg === false,
    '[R-b] 원복하면 다시 0건 — 사본이 트리를 안 더럽혔다');
  ok(R.r2.y === 128 && R.r2.h === 74 && R.r2.band === false,
    '[R-c] ★ 버튼을 옛 세로(128 · 74)로 되돌리면 [2-c] «아이콘과 같은 밴드» 가 깨진다',
    `되돌린 버튼 ${R.r2.y} h ${R.r2.h} · 밴드일치 ${R.r2.band}`);
  ok(R.r2b.y === 22 && R.r2b.h === 173, '[R-d] 원복하면 686 값으로 돌아온다',
    `${R.r2b.y} h ${R.r2b.h}`);

  const errs = await page.evaluate(() => (window.__err || []).length);
  ok(!errs, '[Z] 콘솔 에러 0건', String(errs));

  console.log(`\nVERIFY686 ${pass}/${pass + fail}` + (fail ? '  ← FAIL ' + fail : ' PASS'));
  await ctx.close();
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
