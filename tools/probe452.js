/* 작업 452 재현 프로브 — «21 도감 목걸이 탭 효과문이 [강화] 버튼을 파고든다»
 *
 *   node tools/probe452.js
 *
 * 338·344·372 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * 등재문(PROGRESS 452)의 주장:
 *   ⓐ 목걸이 탭만 겹침 **10.1px**(잉크 우변 726.6 > 버튼 좌변 716.5) · 나머지 다섯 탭은 겹침 0.
 *   ⓑ 2280 과 1600 이 **완전히 같은 좌표**다(가로 1080 공통 · 팝업은 세로만 준다) ⇒ 351 감점 대상이 아니다.
 *   ⓒ 원인 후보는 «문자열이 길다» 가 아니라 «효과문 상자가 버튼 자리를 안 비운다» —
 *      `.clb-eff` 가 `131..949` 로 블록 전폭을 잡고 버튼은 `717..956` 으로 그 위에 얹힌다.
 *   ⚠ 비평가 셋은 «4~5px» 로 읽었고 자는 «10.1px» 라고 적혀 있다 — 어느 쪽이 맞는지도 이 자가 답한다.
 *
 * 이 자가 추가로 묻는 것(등재문이 안 본 축):
 *   ⓓ 등재문의 10.1px 는 **부팅 세이브(단계 0 = «+0.0%»)** 값이다. 단계는 10 까지 오르고
 *      세트 등급 배율은 26 배까지 간다(`GRADE[7].mul`) ⇒ **워스트 문자열**에서 겹침이 얼마인가.
 *   ⓔ 겹침이 목걸이 «만» 의 문제인가, 아니면 **2항 탭 전부**(스킬·펫도 2항이다)의 문제인가.
 *
 * 재는 법 — 잉크는 레이아웃 상자가 아니라 **Range 의 bbox + `-webkit-text-stroke` 절반**이다
 * (340 교훈: 게이트가 초록이던 이유는 그것이 «레이아웃 박스» 를 쟀기 때문이다).
 * 좌표는 화면 px 를 fit() 배율로 나눠 **프레임 px** 로 되돌린다(등재문 726.6/716.5 와 같은 공간).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 페이지 안에서 도는 측정자 — 문자열로 넘겨 evaluate 안에서 함수로 되살린다.
 *
 * ⚑ 한 블록을 **두 번** 잰다(probe429 규약 — 재현 기록은 수리 전·후 «같은 뜻» 이어야 한다):
 *   raw  = 인라인 `font-size` 를 잠깐 걷어낸 상태 = «CSS 와 데이터가 정하는 기하» 자체.
 *          452 수리는 인라인 폰트만 얹으므로 **수리 전·후 값이 같다** ⇒ 등재문 대조는 이 값으로 한다.
 *   live = 지금 그려진 그대로 = 수리의 결과. 자는 «live ≤ raw» 와 «live 안 물림» 만 본다.
 */
const MEASURE = `(() => {
  const app = document.getElementById('app');
  const ar  = app.getBoundingClientRect();
  const sc  = ar.width / app.offsetWidth;                            /* fit() 배율 */
  const fx  = (v) => (v - ar.left) / sc;                             /* 화면 px → 프레임 px */
  const rows = [];
  document.querySelectorAll('#collList .clb').forEach((b, i) => {
    const eff = b.querySelector('.clb-eff'), btn = b.querySelector('.clb-btn');
    if (!eff || !btn) return;
    const rg = document.createRange();
    const one = () => {
      const cs = getComputedStyle(eff);
      const sw = parseFloat(cs.webkitTextStrokeWidth) || 0;          /* 획은 안팎으로 절반씩 */
      rg.selectNodeContents(eff);
      const r = rg.getBoundingClientRect(), bb = btn.getBoundingClientRect();
      if (!r.width) return null;
      const btnL = fx(bb.left);
      return { fs: Math.round(parseFloat(cs.fontSize) * 100) / 100,
        inkR: +(fx(r.right) + sw / 2).toFixed(1), btnL: +btnL.toFixed(1),
        /* 등재문은 획을 안 세고 Range bbox 만 썼다 — 두 공간을 같이 남겨 대조할 수 있게 한다 */
        rangeR: +fx(r.right).toFixed(1),
        over: +(fx(r.right) + sw / 2 - btnL).toFixed(1),
        overNoStroke: +(fx(r.right) - btnL).toFixed(1) };
    };
    const live = one();
    const keep = eff.style.fontSize;
    eff.style.fontSize = '';
    const raw = one();
    eff.style.fontSize = keep;
    if (!live || !raw) return;
    rows.push({ i, txt: eff.textContent, live, raw, fitted: keep !== '' });
  });
  return rows;
})()`;
const worstOf = (rows, k) => (rows || []).reduce((a, b) => (b[k].over > a[k].over ? b : a),
  (rows && rows[0]) || { live: { over: -999 }, raw: { over: -999 }, txt: '' });

(async () => {
  const browser = await launch(chromium);
  const TABS = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];

  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(URL);
    await page.waitForTimeout(900);

    const ev = async (fn, arg) => {
      try { return await page.evaluate(fn, arg); }
      catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
    };

    console.log('\n' + '='.repeat(74) + '\n  프레임 1080×' + H + '\n' + '='.repeat(74));

    /* ── 문 열기 — smoke 와 같은 살아 있는 문(`.side .ibtn[data-pop="coll"]`) ── */
    const opened = await ev(() => {
      const b = document.querySelector('.side .ibtn[data-pop="coll"]');
      if (!b) return { open: false, why: '진입 버튼 없음' };
      b.click();
      return { open: !!document.querySelector('#collw .clb'), why: '' };
    });
    if (opened.__err || !opened.open) { console.log('  ❌ 도감 팝업을 못 열었다 ' + JSON.stringify(opened)); fail++; continue; }

    /* ── ⓐⓒ 부팅 세이브(단계 0)에서 6탭 전수 ────────────────────────── */
    blk('ⓐ 부팅 세이브(단계 0) — 6탭 전수 겹침');
    const base = {};
    for (const t of TABS) {
      const r = await ev((tab) => { collTab = tab; renderColl21(); return true; }, t);
      if (r && r.__err) { console.log('  ❌ ' + t + ' : ' + r.__err); fail++; continue; }
      await page.waitForTimeout(60);
      const rows = await ev(MEASURE);
      if (rows && rows.__err) { console.log('  ❌ ' + t + ' : ' + rows.__err); fail++; continue; }
      base[t] = rows;
      const w = worstOf(rows, 'raw'), l = worstOf(rows, 'live');
      console.log('  ' + t.padEnd(7) + ' 블록 ' + String(rows.length).padStart(2) +
        '개 · raw 최악 ' + String(w.raw.over).padStart(6) + 'px · live 최악 ' + String(l.live.over).padStart(6) + 'px' +
        (w.txt ? '  「' + w.txt + '」 raw 잉크우변 ' + w.raw.inkR + ' / 버튼좌변 ' + w.raw.btnL : ''));
    }

    const overTabs = TABS.filter((t) => (base[t] || []).some((r) => r.raw.over > 0));
    console.log('  ⇒ raw 로 겹치는 탭 : ' + (overTabs.length ? overTabs.join(', ') : '(없음)'));
    console.log('  ⇒ live 로 겹치는 탭 : ' +
      (TABS.filter((t) => (base[t] || []).some((r) => r.live.over > 0)).join(', ') || '(없음)'));
    if (H === 2280) {
      const am = worstOf(base.amulet, 'raw');
      ok(am.raw.over > 0, '등재문 ⓐ — 목걸이 탭은 CSS·데이터만으로는 버튼을 파고든다 (raw 겹침 ' + am.raw.over + 'px)');
      /* ⚑ 등재문의 «10.1px» 은 **획을 뺀 Range bbox** 값이다 — 찍히는 잉크는 획 절반(4.5px)만큼 더 나가
         **14.6px** 다. 비평가 셋이 읽은 «4~5px» 은 둘 중 어느 쪽도 아니다(눈은 획을 반만 센다). */
      ok(Math.abs(am.raw.overNoStroke - 10.1) < 1.0,
        '등재문의 «10.1px» 은 획을 뺀 값이고 그대로 재현된다 (' + am.raw.overNoStroke + 'px)');
      ok(Math.abs(am.raw.over - am.raw.overNoStroke - 4.5) < 0.2,
        '찍히는 잉크는 그보다 획 절반(4.5px)만큼 더 나간다 = ' + am.raw.over + 'px (340 교훈: 레이아웃 박스가 아니다)');
      ok(overTabs.length === 1 && overTabs[0] === 'amulet',
        '등재문 ⓐ — 단계 0 에서 raw 로 겹치는 탭은 목걸이 하나뿐이다 (' + overTabs.join(',') + ')');
      /* ⓒ — 상자가 버튼 자리를 안 비운다: 효과 바의 «레이아웃» 우변이 버튼 좌변을 넘는가 */
      const boxes = await ev(() => {
        const app = document.getElementById('app');
        const sc = app.getBoundingClientRect().width / app.offsetWidth;
        const fx = (v) => (v - app.getBoundingClientRect().left) / sc;
        const b = document.querySelector('#collList .clb');
        const eff = b.querySelector('.clb-eff'), btn = b.querySelector('.clb-btn');
        const e = eff.getBoundingClientRect(), t = btn.getBoundingClientRect();
        return { effL: +fx(e.left).toFixed(1), effR: +fx(e.right).toFixed(1),
                 btnL: +fx(t.left).toFixed(1), btnR: +fx(t.right).toFixed(1) };
      });
      if (boxes.__err) { console.log('  ❌ ' + boxes.__err); fail++; }
      else {
        console.log('  효과 바 상자 ' + boxes.effL + '..' + boxes.effR + ' · 버튼 ' + boxes.btnL + '..' + boxes.btnR);
        ok(boxes.effR > boxes.btnL,
          '등재문 ⓒ — 효과 바 상자가 버튼 자리를 안 비운다(바 우변 ' + boxes.effR + ' > 버튼 좌변 ' + boxes.btnL + ')');
      }
    }

    /* ── ⓓ 워스트 문자열 — 단계 10 · 최고 등급 배율 ───────────────── */
    blk('ⓓ 워스트(단계 10 · 전 세트 만렙) — 등재문이 안 본 축');
    const worstAll = {};
    for (const t of TABS) {
      const r = await ev((tab) => {
        /* 상태를 손으로 안 짓는다 — 제품의 표(COLL_SETS)가 정한 구성원에게 실제 Lv 를 준다 */
        COLL_SETS.filter((st) => st.tab === tab).forEach((st) => {
          st.it.forEach((id) => { S.own[id] = S.own[id] || { l: 0, n: 0 }; S.own[id].l = COLL_MAX_STEP; });
          S.coll[st.key] = COLL_MAX_STEP;
        });
        collTab = tab; renderColl21(); return true;
      }, t);
      if (r && r.__err) { console.log('  ❌ ' + t + ' : ' + r.__err); fail++; continue; }
      await page.waitForTimeout(60);
      const rows = await ev(MEASURE);
      if (rows && rows.__err) { console.log('  ❌ ' + t + ' : ' + rows.__err); fail++; continue; }
      worstAll[t] = rows;
      const w = worstOf(rows, 'raw'), l = worstOf(rows, 'live');
      console.log('  ' + t.padEnd(7) + ' raw 최악 ' + String(w.raw.over).padStart(6) +
        'px · live 최악 ' + String(l.live.over).padStart(6) + 'px  「' + w.txt + '」');
    }
    const wTabs = TABS.filter((t) => (worstAll[t] || []).some((r) => r.raw.over > 0));
    console.log('  ⇒ raw 로 겹치는 탭 : ' + (wTabs.length ? wTabs.join(', ') : '(없음)'));
    console.log('  ⇒ live 로 겹치는 탭 : ' +
      (TABS.filter((t) => (worstAll[t] || []).some((r) => r.live.over > 0)).join(', ') || '(없음)'));
    if (H === 2280) {
      const amW = worstOf(worstAll.amulet, 'raw'), am0 = worstOf(base.amulet, 'raw');
      ok(amW.raw.over > am0.raw.over,
        'ⓓ — 등재문의 10.1px 는 **부팅값**이다. 단계가 오르면 더 깊어진다 (raw ' +
        am0.raw.over + ' → ' + amW.raw.over + 'px)');
      ok(wTabs.length > 1,
        'ⓔ — 워스트에서는 목걸이 «만» 의 문제가 아니다 — 2항 탭이 같이 물린다 (' + wTabs.join(',') + ')');
    }

    /* ── ⓑ 두 해상도 같은 좌표인가 ─────────────────────────────────── */
    if (H === 1600) {
      blk('ⓑ 1600 ↔ 2280 — 351 감점 대상이 아닌 이유');
      console.log('  (위 두 절의 값을 2280 절과 눈으로 대조한다 — 아래 요약이 자다)');
      console.log('  1600 단계0 목걸이 raw 최악 겹침 : ' + worstOf(base.amulet, 'raw').raw.over + 'px');
    }

    console.log('\n  콘솔 오류 ' + errs.length + '건' + (errs.length ? ' : ' + errs.slice(0, 3).join(' | ') : ''));
    ok(errs.length === 0, '콘솔 오류 0건');
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + '='.repeat(74));
  console.log('  probe452 : ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
