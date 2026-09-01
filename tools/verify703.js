#!/usr/bin/env node
/* 작업 703 게이트 — 「공격 속도는 **목걸이 전속**이다」
 *
 *   node tools/verify703.js
 *
 * 주인 원문(2026-09-02 02:25): «유물에서 공속 바꾸게 하지말고 그거는 삭제하고, 목걸이에
 * 공격속도 증가를 추가로 넣기. 그래서 목걸이빼고는 어느곳에도 공격속도 관해서 있으면 안됨».
 *
 * 지킬 것(등재문 게이트 문면 그대로):
 *   [S] 선언 — 목걸이 밖 공속 축이 **소스에 0건**(유물 옵션 · 도감 세트 · 축복 효과 축 ·
 *       훈련 행 · 죽은 자기 강화 버프 축) + 양성항(목걸이에는 있다 · 바닥·천장 상수가 산다)
 *   [A] 바닥 — 아무것도 안 키운 상태의 `stat.rate` = `BASE_RATE`(구 훈련 행 Lv0 값 그대로)
 *   [B] 목걸이 실동작 — 보유가 올리고, 장착이 더 올린다
 *   [C] **전속 스윕** — 목걸이 밖 축을 전부 만렙으로 켜도 `mulRate()` 가 **1 그대로**
 *       (유물 10종 Lv100 · 도감 만단계 · 축복 3종 · 펫·코스튬·룬·단련·훈련·계급)
 *   [D] 축복 3번 카드 — 클릭하면 **체력 재생**이 오르고 공속은 한 자도 안 움직인다
 *   [E] 천장 — 목걸이 전종 Lv100 에서 `stat.rate` = `RATE_CAP`(구 훈련 행의 캡 그대로)
 *   [F] 유물 이관 — 구 세이브(공속 유물 보유·Lv n)를 **실로드**해도 Lv·보유가 그대로고,
 *       그 유물의 축이 공격력으로 붙는다(손해 0 · KEY 안 올림)
 *   [G] 표시 — 08 세부 팝업 목걸이 칸이 «공격 속도» 를 말하고, `.sk-db` 를 안 넘친다
 *   [R] 되돌림 — 목걸이에서 공속 축을 도로 빼면 [B] 가, 축복에 도로 얹으면 [C] 가 **실제로** 빨개진다
 *
 * ⚑ 왜 [R] 이 있는가 — [C] 는 «공속 축이 아무 데도 없으면» 그냥 참이라 무르게 잡기 쉽다.
 *   되돌린 상태가 빨개지는 것을 같이 못박아야 이 자가 «옮겼는가» 를 정말로 묻는 자가 된다.
 * ⚠ 축복의 **저장·DOM 키는 `rate` 그대로**다(세이브·자 열 곳이 그 키를 읽는다). 효과 축은
 *   `blessAxis()` 한 곳에서만 온다 — 키를 축으로 읽는 자를 새로 만들지 마라.
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

/* 목걸이 밖 축을 **전부** 켜는 표본. «어느 곳에도 없다» 를 묻는 항이라 한 카테고리라도
   빠뜨리면 그 자리가 영영 안 보인다 — bonus() 의 장부 열한 개를 그대로 따라간다. */
const ALL_BUT_AMULET = () => {
  S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null }; S.eqSkill = []; S.eqPet = [];
  S.lv = {}; S.coll = {}; S.rank = 0;
  S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
  markDirty();
  const base = { rate: mulRate(), stat: stat.rate };
  /* 유물 10종 Lv100 · 스킬/펫/무기/방패/코스튬 전종 Lv100 · 도감 만단계 · 축복 3종 · 계급 */
  RELICS.forEach(r => { S.own[r.id] = { n: 0, l: 100 }; });
  SKILLS.forEach(s => { S.own[s.id] = { n: 0, l: 100 }; });
  PETS.forEach(p => { S.own[p.id] = { n: 0, l: 100 }; });
  EQUIPS.filter(e => e.slot !== 'amulet').forEach(e => { S.own[e.id] = { n: 0, l: 100 }; });
  S.eqSlot.weapon = EQUIPS.filter(e => e.slot === 'weapon').slice(-1)[0].id;
  S.eqSlot.shield = EQUIPS.filter(e => e.slot === 'shield').slice(-1)[0].id;
  S.eqSkill = SKILLS.slice(0, 3).map(s => s.id);
  S.eqPet = PETS.slice(0, 3).map(p => p.id);
  COLL_SETS.forEach(st => { S.coll[st.key] = COLL_MAX_STEP; });
  BLESS.forEach(x => { S.bless.exp[x.k] = Date.now() + 6e5; });
  S.bless.lv = BLESS_MAXLV;
  S.rank = 20;
  try { Object.keys(S.avatars || {}).forEach(k => { S.avatars[k] = 1; }); } catch (_) {}
  S.lv.atk = 300; S.lv.hp = 300; S.lv.regen = 300; S.lv.gold = 100;
  markDirty();
  return { base, on: { rate: mulRate(), stat: stat.rate },
           atk: mulAtk(), gold: mulGold(), regen: mulRegen() };
};

(async () => {
  console.log('작업 703 — 공격 속도 목걸이 전속\n');

  /* ── [S] 선언 ─────────────────────────────────────────────────── */
  blk('S 선언 — 목걸이 밖 공속 축 0건');
  eq('S1 UPG 에 «공격 속도» 훈련 행 0곳', (CODE.match(/name:'공격 속도'/g) || []).length, 0);
  eq('S2 유물 옵션에 공속 축 0건 (RELICS 의 eff)', (CODE.match(/eff:'rate'/g) || []).length, 0);
  eq('S3 RELIC_EFF 에 공속 라벨 0건 (죽은 라벨은 되살아난다 — 295-②)',
     (CODE.match(/const RELIC_EFF = \{[^}]*rate:/g) || []).length, 0);
  eq('S4 도감 COLL_BASE 어느 탭에도 공속 축 0건',
     (CODE.match(/const COLL_BASE = \{[\s\S]{0,400}?\};/) || [''])[0].split('rate:').length - 1, 0);
  eq('S5 COLL_EFFN 에 공속 라벨 0건',
     (CODE.match(/const COLL_EFFN = \{[^}]*rate:/g) || []).length, 0);
  eq('S6 죽은 자기 강화 버프의 공속 축 0건 (`sbRate` 참조)',
     (CODE.match(/sbRate/g) || []).length, 0);
  /* 양성항 — «전부 지워서 초록» 을 막는다(347 교훈 ②: 끄기와 켜기는 짝으로) */
  ok(/const EQ_AXES = \{[^}]*amulet:\s*\[[^\]]*'rate'/.test(CODE),
     'S7 그 축은 목걸이(EQ_AXES.amulet)에 살아 있다',
     (CODE.match(/const EQ_AXES = \{[^}]*\}/) || ['(못 찾음)'])[0]);
  ok(/const BASE_RATE = [\d.]+;/.test(CODE) && /const RATE_CAP\s+= [\d.]+;/.test(CODE),
     'S8 바닥·천장 상수(BASE_RATE·RATE_CAP)가 선언돼 있다',
     ((CODE.match(/const BASE_RATE = [\d.]+/) || [''])[0]) + ' · ' +
     ((CODE.match(/const RATE_CAP\s+= [\d.]+/) || [''])[0]));
  ok(/const blessAxis = x => x\.ax \|\| x\.k;/.test(CODE),
     'S9 축복은 «저장 키» 와 «효과 축» 이 갈려 있다(blessAxis 한 곳)');

  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* ── [A] 바닥 ─────────────────────────────────────────────────── */
  blk('A 바닥 — 안 키운 상태의 공속 = BASE_RATE');
  const A = await ev(page, () => {
    S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null }; S.eqSkill = []; S.eqPet = [];
    S.lv = {}; S.coll = {}; S.rank = 0;
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
    markDirty();
    return { rate: stat.rate, base: BASE_RATE, cap: RATE_CAP, mul: mulRate() };
  });
  ok(A && near(A.rate, A.base, 1e-9), 'A1 stat.rate = BASE_RATE', A && A.rate + '/' + A.base);
  ok(A && near(A.mul, 1, 1e-9), 'A2 그 상태의 공속 배수는 1(붙는 축이 하나도 없다)', A && String(A.mul));

  /* ── [B] 목걸이 실동작 ────────────────────────────────────────── */
  blk('B 목걸이 — 보유가 올리고 장착이 더 올린다');
  const B = await ev(page, () => {
    const am = EQUIPS.filter(e => e.slot === 'amulet' && e.g === 0)[0];
    const r0 = stat.rate;
    S.own[am.id] = { n: 0, l: 1 }; markDirty();
    const r1 = stat.rate, g1 = mulRegen();
    S.eqSlot.amulet = am.id; markDirty();
    const r2 = stat.rate, g2 = mulRegen();
    return { id: am.id, r0, r1, r2, g1, g2 };
  });
  ok(B && B.r1 > B.r0, 'B1 목걸이를 보유하면 공속이 오른다', B && B.r0.toFixed(4) + ' → ' + B.r1.toFixed(4));
  ok(B && B.r2 > B.r1, 'B2 장착하면 더 오른다', B && B.r1.toFixed(4) + ' → ' + B.r2.toFixed(4));
  ok(B && B.g2 > B.g1, 'B3 원래 축(체력 재생)도 그대로 오른다 — «추가로» 지 «대체» 가 아니다',
     B && B.g1.toFixed(4) + ' → ' + B.g2.toFixed(4));

  /* ── [C] 전속 스윕 ────────────────────────────────────────────── */
  blk('C 전속 스윕 — 목걸이 밖 축을 전부 켜도 공속 배수는 1');
  const C = await ev(page, ALL_BUT_AMULET);
  ok(C && near(C.base.rate, 1, 1e-9), 'C1 스윕 전 공속 배수 1', C && String(C.base.rate));
  ok(C && near(C.on.rate, 1, 1e-9),
     'C2 유물·도감·축복·스킬·펫·무기·방패·코스튬·룬·단련·훈련·계급을 전부 켜도 공속 배수 1',
     C && String(C.on.rate));
  ok(C && near(C.on.stat, C.base.stat, 1e-9), 'C3 stat.rate 도 한 자도 안 움직인다',
     C && C.base.stat + ' → ' + C.on.stat);
  /* 양성 대조 — 같은 스윕이 다른 축은 실제로 크게 올렸다(«아무 축도 안 켜져서 초록» 이 아니다) */
  ok(C && C.atk > 100 && C.gold > 10, 'C4 같은 스윕이 공격력·골드는 실제로 올렸다(표본이 죽지 않았다)',
     C && '공격력 ×' + C.atk.toExponential(2) + ' · 골드 ×' + C.gold.toExponential(2));

  /* ── [D] 축복 3번 ─────────────────────────────────────────────── */
  blk('D 축복 3번 카드 — 체력 재생이 오르고 공속은 안 움직인다');
  const D = await ev(page, () => {
    S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null };
    S.lv = {}; S.coll = {}; S.rank = 0;
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    if (typeof openBless === 'function') openBless();
    const b0 = { rate: mulRate(), regen: mulRegen() };
    const card = document.getElementById('blsC_' + BLESS[2].k);
    const label = card ? card.querySelector('.h > i').textContent.trim() : null;
    if (card) card.click();
    markDirty();
    return { b0, on: { rate: mulRate(), regen: mulRegen() }, label,
             axis: blessAxis(BLESS[2]), key: BLESS[2].k, live: blessOn(BLESS[2].k) };
  });
  ok(D && D.live, 'D1 카드를 눌러 실제로 켜졌다(핸들러 경로 그대로)');
  ok(D && near(D.on.rate, D.b0.rate, 1e-9), 'D2 공속은 한 자도 안 움직인다', D && D.b0.rate + ' → ' + D.on.rate);
  ok(D && D.on.regen > D.b0.regen, 'D3 대신 체력 재생이 오른다', D && D.b0.regen + ' → ' + D.on.regen);
  ok(D && D.axis === 'regen' && D.key === 'rate',
     'D4 효과 축은 regen · 저장/DOM 키는 rate 그대로(세이브·자 열 곳 호환)', D && D.key + '→' + D.axis);
  ok(D && D.label === '체력 재생', 'D5 카드 이름표도 그 축을 말한다', D && String(D.label));

  /* ── [E] 천장 ─────────────────────────────────────────────────── */
  blk('E 천장 — 목걸이 전종 Lv100 에서 RATE_CAP');
  const E = await ev(page, () => {
    S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null };
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    EQUIPS.filter(e => e.slot === 'amulet').forEach(e => { S.own[e.id] = { n: 0, l: 100 }; });
    S.eqSlot.amulet = EQUIPS.filter(e => e.slot === 'amulet').slice(-1)[0].id;
    markDirty();
    return { rate: stat.rate, cap: RATE_CAP, mul: mulRate() };
  });
  ok(E && near(E.rate, E.cap, 1e-9), 'E1 stat.rate 가 천장에서 멈춘다(구 훈련 행의 캡 그대로)',
     E && E.rate + '/' + E.cap);
  ok(E && E.mul > 1, 'E2 그 천장은 «축이 죽어서» 가 아니라 «넘쳐서» 다(배수는 1보다 크다)',
     E && E.mul.toExponential(2));

  /* ── [F] 유물 이관 ────────────────────────────────────────────── */
  blk('F 유물 이관 — 구 세이브 실로드(손해 0 · KEY 안 올림)');
  const F = await ev(page, () => {
    /* 구 세이브 = 공속 유물(rl5)을 Lv 7 로 갖고 있던 사람. 그 자리를 그대로 써서 실로드한다. */
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    raw.own = raw.own || {};
    raw.own.rl5 = { n: 0, l: 7 };
    localStorage.setItem(KEY, JSON.stringify(raw));
    load();
    markDirty();
    const r = RELICS.find(x => x.id === 'rl5');
    return { lv: oLv('rl5'), own: has('rl5'), eff: r.eff, label: RELIC_EFF[r.eff],
             rateAxis: RELICS.filter(x => x.eff === 'rate').length };
  });
  ok(F && F.own && F.lv === 7, 'F1 구 세이브의 그 유물 보유·Lv 가 그대로 실린다(손해 0)', F && 'Lv' + F.lv);
  ok(F && F.eff === 'atk', 'F2 축은 동급 다른 옵션(공격력)으로 갈아졌다', F && F.eff + '/' + F.label);
  eq('F3 유물 표에 공속 축 0건', F && F.rateAxis, 0);

  /* ── [G] 표시 ─────────────────────────────────────────────────── */
  blk('G 표시 — 08 세부 팝업 목걸이 칸');
  const G = await ev(page, () => {
    const am = EQUIPS.filter(e => e.slot === 'amulet' && e.g === 0)[0];
    S.own[am.id] = { n: 0, l: 1 }; markDirty();
    showItem(am.id);        /* 08 세부 팝업 — 장비/펫/유물 공용 진입점 */
    const box = document.querySelector('.sk-db');
    if (!box) return { err: '.sk-db 를 못 찾았다' };
    const r = box.getBoundingClientRect();
    return { html: box.innerHTML, txt: box.textContent,
             over: box.scrollHeight - Math.round(r.height), h: Math.round(r.height),
             slotStat: SLOTS.find(s => s.k === 'amulet').stat };
  });
  ok(G && !G.err && /공격 속도/.test(G.txt), 'G1 목걸이 칸이 «공격 속도» 를 말한다', G && (G.err || ''));
  ok(G && /체력 재생/.test(G.txt), 'G2 원래 축(체력 재생)도 그대로 말한다');
  ok(G && G.over <= 0, 'G3 그 문구가 `.sk-db` 를 안 넘친다(485·664 규약 — 줄 수 불변)',
     G && '넘침 ' + G.over + 'px · 상자 ' + G.h);

  /* ── [R] 되돌림 ───────────────────────────────────────────────── */
  blk('R 되돌림 — 되돌리면 실제로 빨개진다');
  const R = await ev(page, () => {
    S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null };
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    const am = EQUIPS.filter(e => e.slot === 'amulet' && e.g === 0)[0];
    S.own[am.id] = { n: 0, l: 1 }; S.eqSlot.amulet = am.id; markDirty();
    const now = stat.rate;
    /* ⓐ 목걸이에서 공속 축을 도로 뺀다 → [B] 가 죽는다 */
    const keep = EQ_AXES.amulet.slice();
    EQ_AXES.amulet = ['regen']; markDirty();
    const off = stat.rate;
    EQ_AXES.amulet = keep; markDirty();
    const back = stat.rate;
    /* ⓑ 축복에 공속 축을 도로 얹는다 → [C]·[D] 가 죽는다 */
    S.bless.exp[BLESS[2].k] = Date.now() + 6e5; markDirty();
    const bOff = mulRate();
    const ax = BLESS[2].ax; BLESS[2].ax = 'rate'; markDirty();
    const bOn = mulRate();
    BLESS[2].ax = ax; markDirty();
    return { now, off, back, bOff, bOn, bBack: mulRate() };
  });
  ok(R && R.off < R.now, 'R1 목걸이에서 축을 빼면 공속이 바닥으로 내려간다([B] 가 죽는다)',
     R && R.now.toFixed(4) + ' → ' + R.off.toFixed(4));
  ok(R && near(R.back, R.now, 1e-9), 'R2 되돌리면 원래대로', R && R.back.toFixed(4));
  ok(R && R.bOn > R.bOff, 'R3 축복에 공속을 도로 얹으면 [C]·[D] 가 죽는다',
     R && R.bOff.toFixed(4) + ' → ' + R.bOn.toFixed(4));
  ok(R && near(R.bBack, R.bOff, 1e-9), 'R4 되돌리면 원래대로', R && R.bBack.toFixed(4));

  blk('Z 에러');
  eq('Z1 콘솔·페이지 에러 0건', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('    · ' + e));

  await browser.close();
  console.log('\nVERIFY703 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
