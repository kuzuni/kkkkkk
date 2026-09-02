#!/usr/bin/env node
/* 작업 719 게이트 — 「장비 합성 = 다음 티어 · [일괄합성] 버튼 하나」
 *
 *   node tools/verify719.js
 *
 * 주인 원문(2026-09-02 03:50): «장비들 합성도 있어야함. 합성시 현재꺼 5개소모해서 다음티어꺼 1개
 * 되고, 다음티어 없으면 다음등급 제일 낮은 티어꺼 1개 되고, 그런식으로 해야하고, 제일 높은 등급꺼는
 * 합성없고, 합성할수있는 시기가 됐을때부터 일괄합성버튼 뜨게 하고, 장비레벨 100레벨 된거만 합성 가능함.
 * 일괄합성 버튼만 만들어주면될듯. 합성버튼 말고»
 *
 * 지킬 것(PROGRESS 719 게이트 문면 그대로):
 *   [A] 산식 — 등급 «안» 은 다음 티어 · 등급 «끝» 은 다음 등급의 **최저 티어** · 최고 등급은 null.
 *       전수(3부위 × 36종)로 돌리고, 판정(`canCraft`)과 지급(`craft`)이 **같은 칸**을 가리키는지도 센다.
 *   [B] Lv100 미만은 재료가 아니다 — 조각이 넘쳐도 합성 0건(옛 랜덤 시절과 같은 조건이지만 자를 다시 놓는다).
 *   [C] 버튼 노출 — 0건이면 **노드째 숨김**, 1건 이상이면 보이고 라벨에 «(n)» + 레드닷(321·299 규약).
 *   [D] 레퍼런스 보존 — 합성 0건일 때 두 버튼 자리·폭은 **종전 값 그대로**(137/447 · 274). 3칸 배치는
 *       버튼이 뜰 때만(`.wm-in.n3`)이고 그때도 좌우 여백이 같다(가운데).
 *   [E] 일괄 실행 — 소모 5N ↔ 산출 N 재고 정합 · **장착분 보존**(S.eqSlot 3칸 · has·oLv 불변) ·
 *       연쇄(낮은 티어가 만든 산출이 다시 5개면 이어서) · 소진(끝난 뒤 canCraft 0건).
 *   [F] 결과 팝업 — 09 팝업이 그대로 뜨고 칸 수 = 산출 종수 · 합계 줄이 «건 합성» 이다.
 *   [G] 개별 합성 버튼 0건 — 08 세부 팝업에 `mCraft` 가 **소스에도 화면에도** 없다(주인 «합성버튼 말고»).
 *   [H] 세이브 재로드 — 합성 결과가 저장되고 다시 읽어도 같다(KEY 안 올림 = 이관 없음이 정답).
 *   [R] 되돌림 시험 — 산식을 옛 «다음 등급 랜덤» 으로 되돌린 사본에서 [A] 가 **실제로** 빨개진다.
 *
 * ⚑ 왜 [R] 이 있는가 — [A] 는 «다음 티어가 있으면 그것» 이라는 참을 그냥 확인만 하기 쉽다.
 *   되돌린 사본이 빨개져야 이 자가 «티어인가 등급인가» 를 정말로 가르는 자가 된다.
 * ⚑ 왜 [D] 가 있는가 — 버튼을 하나 더 놓는 작업이라 05 레퍼런스 배치를 밀기 가장 쉽다.
 *   «평시 Δ0px» 를 못박지 않으면 «뜰 때만 이탈» 이라는 이 수리의 전제가 조용히 무너진다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·    ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

async function boot(browser, url, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h || 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(600);
  return { ctx, page, errs };
}

/* 05 무기 팝업의 버튼 3개를 **본문(`.wm-in`) 기준**으로 읽는다.
   ⚠ 자리는 `offsetLeft`/`offsetWidth`(레이아웃 값)로 잰다 — `getBoundingClientRect` 는 60 쥬시
   등장 연출의 scale 을 같이 먹어 274 가 279.1 로 읽힌다(726 [782] 가 같은 자리에서 겪은 함정). */
const READ_BTN = () => {
  const R = id => {
    const e = document.getElementById(id);
    if (!e) return null;
    const st = getComputedStyle(e);
    return { shown: st.display !== 'none' && e.offsetWidth > 0,
             x: e.offsetLeft, w: e.offsetWidth,
             txt: (e.textContent || '').trim(),
             alert: e.classList.contains('alert'), dot: !!e.querySelector('.updot') };
  };
  const inw = document.querySelector('#wpnw .wm-in');
  return { eq: R('wpnBtnEq'), up: R('wpnBtnUp'), cf: R('wpnBtnCf'),
           n3: !!(inw && inw.classList.contains('n3')),
           inW: inw ? inw.offsetWidth : 0 };
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const bare = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, URL);

  /* ── [A] 산식 ─────────────────────────────────────────────────────── */
  blk('A — 산식: 등급 안은 다음 티어 · 등급 끝은 다음 등급 최저 티어 · 최고 등급은 없음');
  const A = await ev(page, () => {
    const rows = EQUIPS.map(it => {
      const nx = nextTierItem(it);
      const same = EQUIPS.filter(e => e.slot === it.slot && e.g === it.g);
      const last = it.j === Math.max(...same.map(e => e.j));
      const ngPool = EQUIPS.filter(e => e.slot === it.slot && e.g === it.g + 1);
      const minJ = ngPool.length ? Math.min(...ngPool.map(e => e.j)) : null;
      return { id: it.id, g: it.g, j: it.j, last, nx: nx && nx.id,
               nxg: nx && nx.g, nxj: nx && nx.j, hasNg: !!ngPool.length, minJ };
    });
    return {
      n: rows.length,
      inTier: rows.filter(r => !r.last).every(r => r.nxg === r.g && r.nxj === r.j + 1),
      border: rows.filter(r => r.last && r.hasNg).every(r => r.nxg === r.g + 1 && r.nxj === r.minJ),
      topNull: rows.filter(r => r.last && !r.hasNg).every(r => r.nx === null),
      topCnt: rows.filter(r => !r.hasNg && r.last).length,
      /* 판정 ↔ 지급 항등 — 랜덤이 사라졌으므로 100번 물어도 같은 칸이어야 한다 */
      stable: (() => {
        const it = EQ.weapon0;
        const s = new Set();
        for (let i = 0; i < 100; i++) { const x = nextTierItem(it); s.add(x && x.id); }
        return s.size === 1 && s.has('weapon0_2');   /* 260 자리: weapon0(j2) → weapon0_2(j3) */
      })(),
      sample: [EQ.weapon0.id + '→' + (nextTierItem(EQ.weapon0) || {}).id,
               EQ.weapon0_3.id + '→' + (nextTierItem(EQ.weapon0_3) || {}).id,
               EQ.weapon7.id + '→' + String((nextTierItem(EQ.weapon7) || {}).id)]
    };
  });
  ok(!!A && A.inTier, 'A1 등급 «안» — 다음 티어(j+1) 고정', A && (A.n + '종 전수'));
  ok(!!A && A.border, 'A2 등급 «끝» — 다음 등급의 **최저 티어**', A && A.sample[1]);
  ok(!!A && A.topNull && A.topCnt === 3, 'A3 최고 등급(불멸 3부위)은 합성 없음', A && (A.topCnt + '칸 null'));
  ok(!!A && A.stable, 'A4 판정↔지급 항등 — 100회 물어도 같은 칸(랜덤 폐지)', A && A.sample[0]);
  ok(/nextTierItem/.test(bare) && !/nextGradeItem/.test(bare),
     'A5 선언 — `nextTierItem` 만 있고 옛 `nextGradeItem` 은 코드에 0건');

  /* ── [B] Lv100 조건 ───────────────────────────────────────────────── */
  blk('B — 재료 조건: Lv100 도달분만');
  const B = await ev(page, () => {
    const it = EQ.weapon0;
    const r = {};
    S.own[it.id] = { n: 999, l: 99 };  r.lv99 = canCraft(it);
    S.own[it.id] = { n: 999, l: 100 }; r.lv100 = canCraft(it);
    S.own[it.id] = { n: 4,   l: 100 }; r.frag4 = canCraft(it);
    S.own[it.id] = { n: 5,   l: 100 }; r.frag5 = canCraft(it);
    delete S.own[it.id];               r.none = canCraft(it);
    return r;
  });
  ok(!!B && !B.lv99 && B.lv100, 'B1 Lv99 불가 · Lv100 가능');
  ok(!!B && !B.frag4 && B.frag5, 'B2 조각 4개 불가 · 5개(CRAFT_NEED) 가능');
  ok(!!B && !B.none, 'B3 미보유는 불가');

  /* ── [C]·[D] 버튼 노출과 자리 ─────────────────────────────────────── */
  blk('C·D — [일괄합성] 노출 조건과 05 레퍼런스 보존');
  const D0 = await ev(page, async () => {
    S.own = {}; S.eqSlot = { weapon:null, shield:null, amulet:null };
    S.own.weapon0 = { n: 0, l: 1 };
    save(); openWeapon(null, 'weapon');
    return null;
  });
  await page.waitForTimeout(250);
  const c0 = await ev(page, READ_BTN);
  ok(!!c0 && c0.cf && !c0.cf.shown, 'C1 합성 0건 — [일괄합성] 노드째 숨김');
  ok(!!c0 && !c0.n3, 'C2 합성 0건 — `.wm-in.n3` 안 붙는다');
  ok(!!c0 && Math.abs(c0.eq.x - 137) < 0.6 && Math.abs(c0.up.x - 447) < 0.6
        && Math.abs(c0.eq.w - 274) < 0.6 && Math.abs(c0.up.w - 274) < 0.6,
     'D1 평시 두 버튼 = 레퍼런스 값 그대로(137/447 · 274)',
     c0 && ('x ' + c0.eq.x + '/' + c0.up.x + ' · w ' + c0.eq.w));

  await ev(page, () => {
    S.own.weapon0 = { n: 12, l: 100 };   /* 12개 → 2건 합성 가능(5·2 = 10 소모) */
    save(); renderWpn();
  });
  await page.waitForTimeout(200);
  const c1 = await ev(page, READ_BTN);
  ok(!!c1 && c1.cf.shown, 'C3 합성 1건 이상 — 버튼이 뜬다');
  ok(!!c1 && /일괄합성/.test(c1.cf.txt) && /\(1\)/.test(c1.cf.txt), 'C4 라벨에 «(n)» — 가능한 조합 수', c1 && c1.cf.txt);
  ok(!!c1 && c1.cf.alert && c1.cf.dot, 'C5 레드닷(299·321 규약 — 지금 누를 수 있다)');
  ok(!!c1 && c1.n3, 'D2 뜰 때만 3칸 배치(`.wm-in.n3`)');
  ok(!!c1 && Math.abs(c1.eq.x - (c1.inW - (c1.cf.x + c1.cf.w))) < 1.0,
     'D3 3칸 배치도 좌우 여백이 같다(가운데)',
     c1 && ('좌 ' + c1.eq.x + ' / 우 ' + (c1.inW - (c1.cf.x + c1.cf.w)).toFixed(1)));
  ok(!!c1 && c1.eq.x + c1.eq.w <= c1.up.x + 0.5 && c1.up.x + c1.up.w <= c1.cf.x + 0.5,
     'D4 3칸이 서로 안 겹친다',
     c1 && [c1.eq.x + '+' + c1.eq.w, c1.up.x + '+' + c1.up.w, c1.cf.x + '+' + c1.cf.w].join(' · '));

  /* ── [E] 일괄 실행 ────────────────────────────────────────────────── */
  blk('E — [일괄합성] 실행: 재고 정합 · 장착분 보존 · 연쇄 · 소진');
  const E = await ev(page, () => {
    S.own = {}; S.eqSlot = { weapon:'weapon0', shield:null, amulet:null };
    /* weapon0(g0 j2) 12개 → weapon0_2 2개.  weapon0_2 는 이미 만렙 3개라 2개가 더해지면 5개 = 연쇄 1건 */
    S.own.weapon0   = { n: 12, l: 100 };
    S.own.weapon0_2 = { n: 3,  l: 100 };
    save();
    const before = { w0: frag('weapon0'), w02: frag('weapon0_2'), w03: frag('weapon0_3'),
                     eq: S.eqSlot.weapon, has0: has('weapon0'), lv0: oLv('weapon0') };
    const r = craftAll(wpnList());
    const after = { w0: frag('weapon0'), w02: frag('weapon0_2'), w03: frag('weapon0_3'),
                    has03: has('weapon0_3'),
                    eq: S.eqSlot.weapon, has0: has('weapon0'), lv0: oLv('weapon0'),
                    left: wpnList().filter(canCraft).length };
    /* 소모 총합 ↔ 산출 총합 — 산출 1건마다 재료 5개 */
    const got = r.made.reduce((s, m) => s + m.to, 0);
    const used = r.made.reduce((s, m) => s + m.from, 0);
    return { before, after, n: r.n, got, used, made: r.made.map(m => m.it.id + '×' + m.to) };
  });
  ok(!!E && E.n === 3 && E.got === 3, 'E1 소진까지 — 12개 → 2건 + 연쇄 1건 = 3건', E && E.made.join(', '));
  ok(!!E && E.used === E.got * 5, 'E2 재고 정합 — 소모 5N ↔ 산출 N', E && (E.used + ' ↔ ' + E.got));
  /* ⚠ 「산출 1개」 의 자리는 **밑동이냐 여분이냐**로 갈린다 — 처음 얻는 칸은 `{n:0,l:1}`(밑동 1개,
     조각 0) 이고 이미 있는 칸은 `n++`(여분 +1) 다. 그래서 연쇄의 증거는 `frag(weapon0_3)` 이 아니라
     **has(weapon0_3)** 이다(강화 경로가 처음부터 그렇게 세고 있다 — `craft()` 원본과 같은 줄). */
  ok(!!E && E.after.w0 === E.before.w0 - 10 && E.after.w02 === 0 && E.after.has03 && E.after.w03 === 0,
     'E3 연쇄 — 낮은 티어가 만든 산출(5개)이 다시 합성돼 다음 티어 밑동이 된다',
     E && ('w0 ' + E.after.w0 + ' · w0_2 ' + E.after.w02 + ' · w0_3 has=' + E.after.has03 + ' n=' + E.after.w03));
  ok(!!E && E.after.eq === 'weapon0' && E.after.has0 && E.after.lv0 === 100,
     'E4 장착분 보존 — 소모는 «여분(n)» 뿐이라 장착 칸·밑동·Lv 가 그대로다',
     E && (E.after.eq + ' Lv' + E.after.lv0));
  ok(!!E && E.after.left === 0, 'E5 끝난 뒤 합성 가능 0건(소진)');

  /* ── [F] 결과 팝업 ────────────────────────────────────────────────── */
  blk('F — 결과 표시(09 팝업 준용)');
  const F = await ev(page, async () => {
    S.own = {}; S.eqSlot = { weapon:null, shield:null, amulet:null };
    S.own.weapon0 = { n: 10, l: 100 };
    S.own.weapon1 = { n: 5,  l: 100 };
    save(); openWeapon(null, 'weapon');
    document.getElementById('wpnBtnCf').click();
    return null;
  });
  await page.waitForTimeout(500);
  const Fr = await ev(page, () => {
    const w = document.getElementById('upw');
    return { on: w.classList.contains('on'),
             cards: w.querySelectorAll('.upr-cel').length,
             cnt: (document.getElementById('upCnt').textContent || '').trim(),
             lv: [...w.querySelectorAll('.upr-cel .upr-lv')]
                   .map(e => [...e.querySelectorAll('i')].map(i => +i.textContent)) };
  });
  ok(!!Fr && Fr.on, 'F1 09 결과 팝업이 뜬다');
  ok(!!Fr && Fr.cards === 2, 'F2 칸 수 = 산출 종수(weapon0_2 · weapon1_4)', Fr && String(Fr.cards));
  ok(!!Fr && /건 합성/.test(Fr.cnt) && /총/.test(Fr.cnt), 'F3 합계 줄이 «총 N건 합성»', Fr && Fr.cnt);
  /* 칸의 두 수는 «소모 조각 ▶ 산출 개수» 다 — 항등 «소모 = 산출 × CRAFT_NEED(5)» 를 칸마다 센다
     (weapon0 10개 → weapon0_2 2개 = «10 ▶ 2» · weapon1 5개 → weapon1_4 1개 = «5 ▶ 1») */
  ok(!!Fr && Fr.lv.length === 2 && Fr.lv.every(p => p.length === 2 && p[0] === p[1] * 5),
     'F4 칸마다 «소모 조각 ▶ 산출 개수» (소모 = 산출×5)',
     Fr && Fr.lv.map(p => p.join('▶')).join(' / '));
  await ev(page, () => closeUpAll());

  /* ── [G] 개별 합성 버튼 폐지 ──────────────────────────────────────── */
  blk('G — 개별 [합성] 버튼 0건(주인 «합성버튼 말고»)');
  ok(!/mCraft/.test(bare), 'G1 소스(주석 제외)에 `mCraft` 0건');
  const G = await ev(page, async () => {
    S.own = {}; S.own.weapon0 = { n: 20, l: 100 }; save();
    showItem('weapon0');
    const ids = [...document.querySelectorAll('#mbox .sk-act button')].map(b => b.id);
    const txt = (document.querySelector('#mbox .sk-db') || {}).textContent || '';
    closeModal && closeModal();
    return { ids, txt: txt.trim() };
  });
  ok(!!G && G.ids.indexOf('mCraft') < 0 && G.ids.indexOf('mLv') >= 0,
     'G2 만렙 장비 08 세부 팝업 버튼 = [장착]·[MAX] (합성 버튼 없음)', G && G.ids.join(','));
  ok(!!G && /1개로 합성/.test(G.txt) && !/등급으로 합성/.test(G.txt),
     'G3 설명이 «다음 티어 1개로 합성» 을 말한다(«다음 등급» 문면 0건)', G && G.txt.slice(-42));

  /* ── [H] 세이브 재로드 ────────────────────────────────────────────── */
  blk('H — 세이브: 합성 결과가 저장되고 재로드에서 같다');
  const H1 = await ev(page, () => {
    S.own = {}; S.own.weapon2 = { n: 5, l: 100 }; save();
    craftAll(wpnList());
    return { w2: frag('weapon2'), made: frag('weapon2_3'), has: has('weapon2_3'), key: KEY };
  });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined');
  await page.waitForTimeout(500);
  const H2 = await ev(page, () => ({ w2: frag('weapon2'), made: frag('weapon2_3'), has: has('weapon2_3'), key: KEY }));
  ok(!!H1 && !!H2 && H1.made === H2.made && H1.has === H2.has && H1.w2 === H2.w2
        && H1.has === true && H1.w2 === 0,
     'H1 재로드 뒤에도 같은 재고 — 재료 0 · 산출(weapon2_3) 보유',
     H1 && ('w2 ' + H1.w2 + ' · has(w2_3) ' + H1.has + ' → ' + H2.w2 + '/' + H2.has));
  ok(!!H1 && !!H2 && H1.key === H2.key, 'H2 KEY 안 올림(세이브 이관 없음이 정답 — 필드가 안 늘었다)', H2 && H2.key);

  ok(errs.length === 0, 'E0 콘솔 에러 0건', errs.slice(0, 2).join(' | '));
  await ctx.close();

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  blk('R — 되돌림: 옛 «다음 등급 랜덤» 사본에서 [A] 가 빨개진다');
  const revSrc = code.replace(
    /const up = EQUIPS\.filter\(e => e\.slot === it\.slot && e\.g === it\.g && e\.j === it\.j \+ 1\);\n  if\(up\.length\) return up\[0\];[^\n]*\n/,
    'const up = [];\n  if(up.length) return up[0];\n');
  const revOK = revSrc !== code;
  const tmp = path.resolve(__dirname, '..', '.719-rev.html');
  fs.writeFileSync(tmp, revSrc);
  const rb = await boot(browser, 'file://' + tmp.replace(/\\/g, '/'));
  const R = await ev(rb.page, () => {
    const rows = EQUIPS.map(it => {
      const nx = nextTierItem(it);
      const same = EQUIPS.filter(e => e.slot === it.slot && e.g === it.g);
      const last = it.j === Math.max(...same.map(e => e.j));
      return { last, g: it.g, nxg: nx && nx.g, nxj: nx && nx.j, j: it.j };
    });
    return rows.filter(r => !r.last).every(r => r.nxg === r.g && r.nxj === r.j + 1);
  });
  ok(revOK, 'R0 되돌림 사본이 실제로 만들어졌다(치환 성공)');
  ok(R === false, 'R1 등급 «안 다음 티어» 를 없앤 사본에서 [A1] 이 빨갛다', String(R));
  await rb.ctx.close();
  fs.unlinkSync(tmp);

  await browser.close();
  console.log('\nVERIFY719 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
