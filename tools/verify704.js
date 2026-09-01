#!/usr/bin/env node
/* 작업 704 게이트 — 「방패는 «골드 획득량 증가» 를 **추가로** 준다」
 *
 *   node tools/verify704.js
 *
 * 주인 원문(2026-09-02 02:25): «방패에는 골드획득량 증가를 추가로 넣기».
 *
 * 지킬 것(등재문 게이트 문면 그대로):
 *   [S] 선언 — 부위 축 표(`EQ_AXES`)의 방패에 골드 축이 있고, 라벨(`SLOTS[].stat`)도 그것을 말한다
 *   [A] 실동작 — 방패를 **보유**하면 골드 배수가 오르고, **장착**하면 더 오른다
 *   [B] «추가로» — 원래 축(최대 체력)이 한 자도 안 줄고 같이 오른다(대체가 아니다)
 *   [C] 적용 범위 — 그 배수가 실제 골드 수입(`stat.goldMul`)에 그대로 실린다
 *   [D] 다른 장비 불변 — 무기·목걸이는 골드 축을 안 건드린다(방패 «전속» 이 아니라 «추가» 이므로
 *       목걸이·펫·룬 등 원래 골드를 주던 축은 그대로 산다 — 그건 [E] 가 따로 센다)
 *   [E] 기존 골드 출처 회귀 — 펫 보유·코스튬·룬·훈련의 골드 축이 그대로 살아 있다
 *   [F] 세이브 — 이미 방패를 갖고 있던 구 세이브가 **실로드**만으로 새 효과를 받는다
 *       (효과가 표 파생이라 이관 코드가 없다 · KEY 안 올림)
 *   [G] 표시 — 08 세부 팝업 방패 칸이 «골드 획득» 을 말하고 `.sk-db` 를 안 넘친다
 *   [R] 되돌림 — 방패에서 골드 축을 도로 빼면 [A] 가 **실제로** 빨개진다
 *
 * ⚑ 왜 [R] 이 있는가 — [A] 는 «다른 데서 골드가 오기만 해도» 초록이 될 수 있다. 되돌린 상태가
 *   빨개지는 것을 같이 못박아야 이 자가 «방패가 주는가» 를 묻는 자가 된다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const CODE = fs.readFileSync(SRC, 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const eq = (m, got, want) => ok(got === want, m + ' — 기대 ' + want + ' · 실제 ' + got);
const near = (a, b, e) => Math.abs(a - b) <= e;
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

const CLEAR = () => {
  S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null }; S.eqSkill = []; S.eqPet = [];
  S.lv = {}; S.coll = {}; S.rank = 0;
  S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
  markDirty();
};

(async () => {
  console.log('작업 704 — 방패 «골드 획득량 증가» 추가\n');

  /* ── [S] 선언 ─────────────────────────────────────────────────── */
  blk('S 선언');
  ok(/const EQ_AXES = \{[^}]*shield:\s*\[[^\]]*'gold'/.test(CODE),
     'S1 부위 축 표의 방패에 골드 축이 있다',
     (CODE.match(/const EQ_AXES = \{[^}]*\}/) || ['(못 찾음)'])[0]);
  ok(/\{ k:'shield',[^}]*stat:'[^']*골드 획득'/.test(CODE),
     'S2 방패 라벨도 그 축을 말한다(표시와 실계산이 두 벌이 아니다 — 724 교훈)',
     (CODE.match(/\{ k:'shield',[^}]*\}/) || ['(못 찾음)'])[0]);
  ok(/\{ k:'shield',[^}]*stat:'최대 체력/.test(CODE),
     'S3 원래 축(최대 체력)이 라벨에서 안 밀려났다 — «추가로» 지 «대체» 가 아니다');

  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* ── [A][B][C] 실동작 ─────────────────────────────────────────── */
  blk('A·B·C 실동작 — 보유·장착이 골드를 올리고, 체력도 같이 오른다');
  const A = await ev(page, () => {
    S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null }; S.eqSkill = []; S.eqPet = [];
    S.lv = {}; S.coll = {}; S.rank = 0;
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    const sh = EQUIPS.filter(e => e.slot === 'shield' && e.g === 0)[0];
    const g0 = mulGold(), h0 = mulHp(), m0 = stat.goldMul;
    S.own[sh.id] = { n: 0, l: 1 }; markDirty();
    const g1 = mulGold(), h1 = mulHp(), m1 = stat.goldMul;
    S.eqSlot.shield = sh.id; markDirty();
    const g2 = mulGold(), h2 = mulHp(), m2 = stat.goldMul;
    return { id: sh.id, g0, g1, g2, h0, h1, h2, m0, m1, m2 };
  });
  ok(A && A.g1 > A.g0, 'A1 방패를 보유하면 골드 배수가 오른다', A && A.g0.toFixed(4) + ' → ' + A.g1.toFixed(4));
  ok(A && A.g2 > A.g1, 'A2 장착하면 더 오른다', A && A.g1.toFixed(4) + ' → ' + A.g2.toFixed(4));
  ok(A && A.h1 > A.h0 && A.h2 > A.h1, 'B1 원래 축(최대 체력)도 그대로 오른다(대체가 아니다)',
     A && A.h0.toFixed(4) + ' → ' + A.h2.toFixed(4));
  ok(A && A.m2 > A.m0 && near(A.m2 / A.m0, A.g2 / A.g0, 1e-9),
     'C1 그 배수가 실제 골드 수입(stat.goldMul)에 같은 비로 실린다',
     A && '수입 ×' + (A.m2 / A.m0).toFixed(4) + ' · 배수 ×' + (A.g2 / A.g0).toFixed(4));

  /* ── [D] 다른 부위 ────────────────────────────────────────────── */
  blk('D 다른 부위는 골드 축을 안 건드린다');
  const D = await ev(page, () => {
    const out = {};
    ['weapon', 'amulet'].forEach(k => {
      S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null }; markDirty();
      const g0 = mulGold();
      const it = EQUIPS.filter(e => e.slot === k && e.g === 0)[0];
      S.own[it.id] = { n: 0, l: 1 }; S.eqSlot[k] = it.id; markDirty();
      out[k] = { g0, g1: mulGold(), axes: EQ_AXES[k].slice() };
    });
    return out;
  });
  ['weapon', 'amulet'].forEach(k => {
    ok(D && near(D[k].g1, D[k].g0, 1e-9), 'D-' + k + ' 그 부위를 껴도 골드 배수는 그대로',
       D && D[k].g0 + ' → ' + D[k].g1 + ' · 축 [' + D[k].axes.join(',') + ']');
  });

  /* ── [E] 기존 골드 출처 회귀 ──────────────────────────────────── */
  blk('E 기존 골드 출처는 그대로 산다(방패가 «전속» 이 아니다)');
  const E = await ev(page, () => {
    const one = fn => { S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null }; S.eqPet = [];
                        S.lv = {}; S.coll = {};
                        S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
                        const a = mulGold(); fn(); markDirty(); return { a, b: mulGold() }; };
    return {
      pet:   one(() => { PETS.slice(0, 5).forEach(p => { S.own[p.id] = { n: 0, l: 10 }; }); }),
      rune:  one(() => { try { Object.keys(S.rune || {}).forEach(k => { S.rune[k] = 20; }); } catch (_) {} }),
      /* ⚠ 훈련의 골드 축은 `bonus()` 밖이다 — `stat.goldMul = U.gold.val(Lv) × mulGold()` 라
         배수가 아니라 **바닥값**을 올린다. 그래서 이 한 줄만 `stat.goldMul` 로 잰다
         (`mulGold()` 로 재면 영영 «안 오른다» 로 빨갛다 — 자가 틀린 것이지 제품이 아니다). */
      train: (() => { S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null };
                      S.lv = {}; markDirty(); const a = stat.goldMul;
                      S.lv.gold = 30; markDirty(); return { a, b: stat.goldMul }; })(),
      coll:  one(() => { COLL_SETS.filter(s => s.eff.gold).forEach(s => { S.coll[s.key] = COLL_MAX_STEP; }); }),
      blessAll: one(() => { BLESS.forEach(x => { S.bless.exp[x.k] = Date.now() + 6e5; }); })
    };
  });
  ['pet', 'rune', 'train', 'coll', 'blessAll'].forEach(k => {
    ok(E && E[k].b > E[k].a, 'E-' + k + ' 이 출처의 골드 축은 그대로 산다',
       E && E[k].a.toFixed(4) + ' → ' + E[k].b.toFixed(4));
  });

  /* ── [F] 세이브 ───────────────────────────────────────────────── */
  blk('F 세이브 — 이미 방패를 갖고 있던 구 세이브가 실로드만으로 새 효과를 받는다');
  const F = await ev(page, () => {
    const sh = EQUIPS.filter(e => e.slot === 'shield' && e.g === 1)[0];
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    raw.own = raw.own || {};
    raw.own[sh.id] = { n: 0, l: 5 };
    raw.eqSlot = Object.assign({ weapon: null, shield: null, amulet: null }, raw.eqSlot || {});
    raw.eqSlot.shield = sh.id;
    localStorage.setItem(KEY, JSON.stringify(raw));
    load(); markDirty();
    const withIt = mulGold(), lv = oLv(sh.id);
    S.own = {}; S.eqSlot.shield = null; markDirty();
    return { id: sh.id, lv, withIt, without: mulGold(), key: KEY };
  });
  ok(F && F.lv === 5, 'F1 구 세이브의 방패 보유·Lv 가 그대로 실린다(손해 0)', F && 'Lv' + F.lv);
  ok(F && F.withIt > F.without, 'F2 이관 코드 없이 그 방패가 골드를 준다(효과는 표 파생)',
     F && F.without.toFixed(4) + ' → ' + F.withIt.toFixed(4));

  /* ── [G] 표시 ─────────────────────────────────────────────────── */
  blk('G 표시 — 08 세부 팝업 방패 칸');
  const G = await ev(page, () => {
    const sh = EQUIPS.filter(e => e.slot === 'shield' && e.g === 0)[0];
    S.own[sh.id] = { n: 0, l: 1 }; markDirty();
    showItem(sh.id);
    const box = document.querySelector('.sk-db');
    if (!box) return { err: '.sk-db 를 못 찾았다' };
    const r = box.getBoundingClientRect();
    return { txt: box.textContent, over: box.scrollHeight - Math.round(r.height), h: Math.round(r.height) };
  });
  ok(G && !G.err && /골드 획득/.test(G.txt), 'G1 방패 칸이 «골드 획득» 을 말한다', G && (G.err || ''));
  ok(G && /최대 체력/.test(G.txt), 'G2 원래 축(최대 체력)도 그대로 말한다');
  ok(G && G.over <= 0, 'G3 그 문구가 `.sk-db` 를 안 넘친다(485·664 규약)',
     G && '넘침 ' + G.over + 'px · 상자 ' + G.h);

  /* ── [R] 되돌림 ───────────────────────────────────────────────── */
  blk('R 되돌림');
  const R = await ev(page, () => {
    S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null }; markDirty();
    const sh = EQUIPS.filter(e => e.slot === 'shield' && e.g === 0)[0];
    S.own[sh.id] = { n: 0, l: 1 }; S.eqSlot.shield = sh.id; markDirty();
    const now = mulGold();
    const keep = EQ_AXES.shield.slice();
    EQ_AXES.shield = ['hp']; markDirty();
    const off = mulGold();
    EQ_AXES.shield = keep; markDirty();
    return { now, off, back: mulGold() };
  });
  ok(R && R.off < R.now, 'R1 방패에서 골드 축을 빼면 [A] 가 죽는다',
     R && R.now.toFixed(4) + ' → ' + R.off.toFixed(4));
  ok(R && near(R.back, R.now, 1e-9), 'R2 되돌리면 원래대로', R && R.back.toFixed(4));

  blk('Z 에러');
  eq('Z1 콘솔·페이지 에러 0건', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('    · ' + e));

  await browser.close();
  console.log('\nVERIFY704 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
