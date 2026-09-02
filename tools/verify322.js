#!/usr/bin/env node
/* 게이트 — 작업 322 「22 퀘스트 행 [보상 받기]·[모두 받기] 버튼에 «받을 수 있으면» 레드닷」
 * (저장소 주인 지시 2026-08-28)
 *
 *   node tools/verify322.js
 *
 * 규약
 *   ① 점등축 = `questReady` / `dqReady` (행) · `any`(= 한 행이라도 ready, [모두 받기]).
 *      **`disabled` 와는 별개 축**이지만 22 에서는 같은 조건에서 갈리므로 «disabled 행에 닷 0» 이 불변식이다.
 *   ② 노드는 `ready` 일 때만 찍는다(301·318 꼴) — 꺼진 자리에 죽은 마크업이 남지 않는다.
 *   ③ 299 규약: 닷 중심이 호스트(버튼) 상자의 우상단 사분면.
 *   ④ **즉시 소등**. 22 는 수령 뒤 목록 재렌더를 `fxRenderLater`(FXSOLO ≈620ms) 뒤로 미룬다 —
 *      그 창 안에서도 이미 받은 자리의 닷이 남아 있으면 안 된다(58 22회차와 같은 결함).
 *      [모두 받기] 한 번이면 다섯 행이 전부 비므로 «누른 버튼만» 이 아니라 목록 전체가 소등이다.
 *   ⑤ 목록 자체는 안 건드린다 — 재화 비행 출발점(`.qs-i`)이 살아 있어야 한다(verify58 [11]).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* 팝업 안 «지금 화면» 을 통째로 떠 온다 */
const SNAP = `(() => {
  const rows = [...document.querySelectorAll('.qs-b')].map(b => ({
    q: b.dataset.q, disabled: !!b.disabled, alert: b.classList.contains('alert'),
    dot: !!b.querySelector(':scope > .updot')
  }));
  const a = document.getElementById('qAll');
  const ready = [...document.querySelectorAll('.qs-b')].map(b => {
    const k = b.dataset.q;
    return k.startsWith('d:') ? dqReady(DQUESTS.find(x => x.id === k.slice(2)))
                              : questReady(QUESTS.find(x => x.id === k));
  });
  return { rows, ready,
    any: QUESTS.some(questReady) || DQUESTS.some(dqReady),
    all: a ? { disabled: !!a.disabled, alert: a.classList.contains('alert'),
               dot: !!a.querySelector(':scope > .updot') } : null,
    rowsAlive: document.querySelectorAll('.qs-r').length,
    startsAlive: document.querySelectorAll('.qs-r .qs-i').length };
})()`;

const consist = (tag, s) => {
  const lit = s.rows.filter(r => r.dot).length;
  const rdy = s.ready.filter(Boolean).length;
  ok(lit === rdy, tag + ' 점등 버튼 수 = ready 행 수', lit + ' / ' + rdy);
  ok(s.rows.every(r => r.dot === r.alert), tag + ' 노드와 `.alert` 가 항상 같이 간다',
     s.rows.map(r => (r.dot ? '1' : '0') + (r.alert ? '1' : '0')).join(' '));
  ok(s.rows.every(r => !(r.disabled && r.dot)), tag + ' disabled 행에 닷 0',
     s.rows.filter(r => r.disabled && r.dot).map(r => r.q).join(',') || '없음');
  ok(!!s.all && s.all.dot === s.any && s.all.alert === s.any,
     tag + ' [모두 받기] 점등 = any(' + s.any + ')',
     s.all ? 'dot ' + s.all.dot + ' / alert ' + s.all.alert : '버튼 없음');
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openQuest === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* ── [A] 아무것도 못 받는 상태 — 닷 0 · [모두 받기] 소등 ─────────────────── */
  console.log('\n[A] 전부 미달');
  /* ⚑ 799 이관 — 업적 퀘스트에는 «기준선»(`S.quest[].base`)이 없다. «아무것도 못 받는 상태» 를
     만드는 길이 «기준선을 지금 값으로 올린다» 에서 **«누적 카운터를 0 으로 두고 받은 칸도 0»**
     으로 바뀌었다(도감은 신규 세이브의 보유 1종 < 첫 목표 5종이라 자연히 미달이다). */
  await page.evaluate(() => {
    QUESTS.forEach(q => { S.quest[q.id] = { s: 0 }; });
    S.totalKills = 0; S.best = 0; S.summons = 0; S.upgrades = 0;
    S.daily.qb = null; S.daily.q = {}; dqProg(DQUESTS[0]);       /* 스냅샷을 현재로 */
    qTab = 'rep'; openQuest('rep');
  });
  await page.waitForTimeout(300);
  let s = await page.evaluate(SNAP);
  consist('[A]', s);
  ok(s.rows.every(r => !r.dot), '[A] 닷 0개', s.rows.filter(r => r.dot).length + '개');

  /* ── [B] 반복 5행 중 3행만 ready ────────────────────────────────────────── */
  console.log('\n[B] 반복 탭 — 5행 중 3행 ready');
  await page.evaluate(() => {
    /* 799 — 받은 칸을 0 으로 되돌리고 카운터만 올린다(옛 «기준선 0» 과 같은 뜻) */
    QUESTS.forEach(q => { S.quest[q.id] = { s: 0 }; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 0;
    openQuest('rep');
  });
  await page.waitForTimeout(300);
  s = await page.evaluate(SNAP);
  consist('[B]', s);
  ok(s.ready.filter(Boolean).length === 3, '[B] ready 행이 정확히 3개', s.ready.filter(Boolean).length + '개');

  /* ── [C] 299 규약 — 닷 중심이 버튼 우상단 사분면 ────────────────────────── */
  console.log('\n[C] 299 우상단 사분면 · 클립·충돌');
  const geo = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.qs-b > .updot, #qAll > .updot').forEach(d => {
      const h = d.parentElement;
      const prev = d.style.animation; d.style.animation = 'none';
      const dr = d.getBoundingClientRect(); const hr = h.getBoundingClientRect();
      d.style.animation = prev;
      out.push({ host: h.id || h.className.split(' ')[0],
        q: (dr.left + dr.width / 2 > hr.left + hr.width / 2) && (dr.top + dr.height / 2 < hr.top + hr.height / 2),
        w: Math.round(dr.width), h: Math.round(dr.height),
        /* 링(바깥 7.5px)까지 포함해 라벨 `<b>` 상자를 밟지 않는지 */
        hitLabel: (() => {
          const b = h.querySelector('b'); if (!b) return false;
          const br = b.getBoundingClientRect(), R = 7.5;
          return Math.max(0, Math.min(dr.right + R, br.right) - Math.max(dr.left - R, br.left)) > 0
              && Math.max(0, Math.min(dr.bottom + R, br.bottom) - Math.max(dr.top - R, br.top)) > 0;
        })(),
        /* ⚠ 정지 rect 만 재면 모자란다 — 60 쥬시가 이 닷에 `jzDotIn`(0→**1.3**→1)과
           `jzDotPulse`(2초마다 1.14)를 영구히 건다(11032행). 283 이 `.sk-card` 자리를 고를 때
           «등장 1.3 배율에서도» 를 따진 것과 같은 검사다.
           닷은 **원**이므로 상자 겹침이 아니라 «중심 → 라벨 잉크 상자의 가장 가까운 점» 거리를
           반지름(21 = 닷 13.5 + 링 7.5)의 1.3배와 견준다. */
        clear13: (() => {
          const b = h.querySelector('b'); if (!b) return 999;
          const br = b.getBoundingClientRect();
          const cx = dr.left + dr.width / 2, cy = dr.top + dr.height / 2;
          const nx = Math.max(br.left, Math.min(cx, br.right));
          const ny = Math.max(br.top, Math.min(cy, br.bottom));
          return Math.hypot(cx - nx, cy - ny) - (dr.width / 2 + 7.5) * 1.3;
        })() });
    });
    /* .qs-pn 은 overflow-y:auto 라 가로도 클립된다 — 링 우단이 콘텐츠 안인지 */
    const pn = document.querySelector('.qs-pn');
    const pr = pn.getBoundingClientRect(), pad = parseFloat(getComputedStyle(pn).paddingRight);
    const clipped = [...document.querySelectorAll('.qs-b > .updot')]
      .filter(d => d.getBoundingClientRect().right + 7.5 > pr.right - pad).length;
    return { out, clipped };
  });
  ok(geo.out.length > 0, '[C] 잰 닷이 있다', geo.out.length + '개');
  ok(geo.out.every(g => g.q), '[C] 전부 우상단 사분면',
     geo.out.filter(g => !g.q).map(g => g.host).join(',') || '위반 0');
  ok(geo.out.every(g => g.w === 27 && g.h === 27), '[C] 닷 27x27(166 공용 규격)',
     [...new Set(geo.out.map(g => g.w + 'x' + g.h))].join(','));
  ok(geo.out.every(g => !g.hitLabel), '[C] 링이 라벨 `<b>` 상자를 안 밟는다',
     geo.out.filter(g => g.hitLabel).map(g => g.host).join(',') || '겹침 0');
  ok(geo.out.every(g => g.clear13 > 0), '[C] jzDotIn 봉우리(scale 1.3)에서도 라벨 잉크와 안 닿는다',
     '최소 여유 ' + Math.min(...geo.out.map(g => Math.round(g.clear13 * 100) / 100)) + 'px');
  ok(geo.clipped === 0, '[C] .qs-pn 가로 클립에 안 걸린다', geo.clipped + '개 잘림');

  /* ── [D] 한 행 수령 → 지연 재렌더 «전» 에 그 행만 즉시 소등 ─────────────── */
  console.log('\n[D] 행 수령 즉시 소등 (fxRenderLater 창 안)');
  const before = await page.evaluate(SNAP);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.qs-b')].find(x => !x.disabled);
    window.__q322 = b.dataset.q; b.click();
  });
  await page.waitForTimeout(60);                      /* FXSOLO(620ms) 재렌더 «전» */
  let d = await page.evaluate(SNAP);
  const claimed = await page.evaluate(() => window.__q322);
  const row = d.rows.find(r => r.q === claimed);
  ok(row && !row.dot, '[D] 받은 행이 재렌더 전에 이미 소등', claimed + ' dot=' + (row ? row.dot : '?'));
  consist('[D]', d);
  ok(d.rowsAlive === before.rowsAlive && d.startsAlive === before.startsAlive,
     '[D] 목록·재화 출발점(.qs-i)은 그대로 — verify58 [11]',
     d.rowsAlive + '행 / 출발점 ' + d.startsAlive);
  await page.waitForTimeout(1200);                    /* 재렌더까지 기다려 다시 일치 확인 */
  consist('[D-재렌더후]', await page.evaluate(SNAP));

  /* ── [E] [모두 받기] → 다섯 행 전부 즉시 소등 ───────────────────────────── */
  console.log('\n[E] [모두 받기] 즉시 소등');
  await page.evaluate(() => {
    /* 799 — 앞 절들이 이미 칸을 받아 `s` 가 커져 있다. 0 으로 되돌려야 다시 «받을 수 있다» */
    QUESTS.forEach(q => { S.quest[q.id] = { s: 0 }; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9;
    openQuest('rep');
  });
  await page.waitForTimeout(250);
  const e0 = await page.evaluate(SNAP);
  ok(e0.rows.filter(r => r.dot).length >= 4 && e0.all.dot, '[E] 누르기 전 여러 행 + [모두 받기] 점등',
     e0.rows.filter(r => r.dot).length + '행 · all=' + e0.all.dot);
  await page.evaluate(() => document.getElementById('qAll').click());
  await page.waitForTimeout(60);
  const e1 = await page.evaluate(SNAP);
  ok(e1.rows.every(r => !r.dot), '[E] 재렌더 전에 모든 행 소등', e1.rows.filter(r => r.dot).length + '개 남음');
  ok(!e1.all.dot && !e1.all.alert, '[E] [모두 받기]도 즉시 소등', 'dot=' + e1.all.dot);
  consist('[E]', e1);
  await page.waitForTimeout(1200);
  consist('[E-재렌더후]', await page.evaluate(SNAP));

  /* ── [F] 일일 탭도 같은 규약 ────────────────────────────────────────────── */
  console.log('\n[F] 일일 탭');
  await page.evaluate(() => {
    S.daily.q = {}; S.daily.qb = { dsum: 0, dupg: 0, dkill: 0, dspin: 0, ddun: 0 };
    S.summons = 1e9; S.upgrades = 1e9; S.totalKills = 1e9;   /* dsum·dupg·dkill 만 ready */
    S.cnt.spins = 0; S.cnt.dungeon = 0;
    openQuest('daily');
  });
  await page.waitForTimeout(300);
  const f0 = await page.evaluate(SNAP);
  consist('[F]', f0);
  ok(f0.rows.filter(r => r.dot).length === 3, '[F] 일일 ready 3행만 점등',
     f0.rows.filter(r => r.dot).length + '개');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.qs-b')].find(x => !x.disabled);
    window.__q322 = b.dataset.q; b.click();
  });
  await page.waitForTimeout(60);
  const f1 = await page.evaluate(SNAP);
  const cl2 = await page.evaluate(() => window.__q322);
  const r2 = f1.rows.find(r => r.q === cl2);
  ok(r2 && !r2.dot, '[F] 받은 일일 행 즉시 소등', cl2 + ' dot=' + (r2 ? r2.dot : '?'));
  consist('[F-수령후]', f1);

  ok(errs.length === 0, '[G] 콘솔·런타임 에러 0', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY322 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
