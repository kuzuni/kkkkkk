#!/usr/bin/env node
/* 작업 1002 게이트 — 「버스트 알을 가두는 «액자» 가 자와 눈에서 다르다 — 자는 «쉬는 상자»,
 *  사람은 «눌린 상자»(621 `jz-dn`)를 잰다」
 *
 *   node tools/verify1002.js
 *
 * 무엇을 지키는가(세 겹):
 *   [A] 선언 — 누름의 두 값(`.94`·`8px`)이 `.jz-dn` **한 자리**에만 있고, 제품·자가 그 클래스를
 *       실제로 걸어 읽는다(손 상수 사본 0 · 진폭 회귀 0).
 *   [B] 기하 — 제품이 계산하는 «눌린 액자» 가 **실제로 클래스를 걸어 잰 상자**와 같고,
 *       가둠 상자가 «쉬는 ∩ 눌린» 이며, **안 눌리는 호스트는 한 값도 안 바뀐다**.
 *   [C] 잉크 — 실제 버스트가 **두 액자 모두** 안에서 끝난다(부호가 안 뒤집힌다).
 *   [R] 되돌림 — 가둠을 쉬는 상자로 되돌린 사본에서 **부호가 다시 뒤집히고**,
 *       점 대상(대조군)은 두 판에서 **같은 값**이다.
 *
 * ⚠ 등재문 정정(1회차): 등재문의 «눌린 액자 291×100 @(52,1778) · 스필 +5.18px» 은
 *   자가 클래스를 **호스트 자신**에게 걸어 잰 근사였다. 60 의 누름은 `jzTarget()` 이 고른
 *   **컨트롤**(훈련은 `.tr-card`)에 걸리므로 실제 눌린 액자는 **291.4×99.64 @(52.3,1766.54)**
 *   이고, 수리 전 스필은 **+0.07px** 이다(부호가 뒤집히는 것은 등재문 그대로다).
 * ⚠ 1회차 두 번째 정정: 쉬는 상자를 567 `jzRestRect` 로 뽑으면 **버스트마다 누름이 풀린다**
 *   (스타일을 박았다 되돌리는 손이라 트랜지션이 다시 시작한다 — `verify621` [R1] 이 즉시 빨개졌다).
 *   ⇒ 제품은 **읽기만** 한다(`offsetWidth` = 변환 없는 배치 폭). [A8] 이 그 자리를 지킨다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { launch } = require('./pwlaunch');
const { runScene } = require('./travel838');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const REV = path.join(ROOT, '.v1002-rev-' + process.pid + '.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 씬 — 838 의 두 씬에 «같은 눌림을 타는» 단련·룬을 더한다(등재문 꼬리 «verify818 [C1] 과 한 벌») */
const SC = {
  train:  { id: 'train',  n: '23 훈련 [강화]',   open: 'openTrain()',                    btn: '#trCards [data-tr] .cb', elem: true },
  temper: { id: 'temper', n: '23 단련 [강화]',   open: "openTrain(); setTrSub('temper')", btn: '#trw .tr-tp.k0 .tb',     elem: true },
  rune:   { id: 'rune',   n: '23 룬 [강화]',     open: "openTrain(); setTrSub('rune')",   btn: '#trw .tr-rn .rbt.b1',    elem: true },
  relic:  { id: 'relic',  n: '89 유물 소환(점)', open: 'openRelw()',                      btn: '#rwBasin',               elem: false }
};

/* ── [R] 사본 — 가둠 상자를 **수리 전(쉬는 상자)** 으로 되돌린다.
   ⚠ 951 교훈 — 치환이 조용히 no-op 이 되면 되돌림 시험이 «언제나 초록» 이 된다. 적용 수를 센다. */
const REVERTS = [
  ['const inM = rh ? Math.max(0, Math.min(sz/2 + FXB_INPAD, rh.w/2 - 1, rh.h/2 - 1)) : 0;',
   'const inM = r ? Math.max(0, Math.min(sz/2 + FXB_INPAD, r.w/2 - 1, r.h/2 - 1)) : 0;'],
  ['const bx0 = rh ? Math.max(20, rh.x + inM) : 20;',
   'const bx0 = r ? Math.max(20, r.x + inM) : 20;'],
  ['const bx1 = rh ? Math.min(FRAME_W - 20, rh.x + rh.w - inM) : FRAME_W - 20;',
   'const bx1 = r ? Math.min(FRAME_W - 20, r.x + r.w - inM) : FRAME_W - 20;'],
  ['const by0 = rh ? rh.y + inM : 20, by1 = rh ? rh.y + rh.h - inM : frameH - 20;',
   'const by0 = r ? r.y + inM : 20, by1 = r ? r.y + r.h - inM : frameH - 20;']
];

function revertCopy(code){
  let out = code, hit = 0;
  for(const [from, to] of REVERTS){ if(out.indexOf(from) < 0) continue; out = out.replace(from, to); hit++; }
  fs.writeFileSync(REV, out);
  return hit;
}

(async () => {
  console.log('# 1002 게이트 — 가둠 액자를 «쉬는 ∩ 눌린» 으로');
  const code = fs.readFileSync(SRC, 'utf8');
  const tool = fs.readFileSync(path.join(__dirname, 'travel838.js'), 'utf8');

  /* ───────── [A] 선언 ───────── */
  console.log('\n[A] 선언 — 누름의 두 값이 한 자리에만 있다');
  ok(/\.jz-dn\{scale:\.94;translate:0 8px/.test(code),
     'A1 누름의 두 값은 `.jz-dn` **한 자리**에 그대로다(진폭 회귀 0 · `verify579` [1-b]·`verify621` [A10] 어휘 보존)');
  ok(/d\.className = 'jz-dn';/.test(code) && /parseFloat\(cs\.scale\)/.test(code),
     'A2 제품(`fxbPressVals`)이 **그 클래스를 실제로 걸어 잰다** — 손 상수 사본 0');
  ok(!/FXB_PRESS_SC|const .*= *0?\.94/.test(code.slice(code.indexOf('function fxbPressVals'), code.indexOf('function fxbHoldBox'))),
     'A3 그 자리에 `.94`·`8` 을 손으로 적어 둔 상수가 없다');
  ok(/const im = Math\.max\(0, Math\.min\(nsz\/2 \+ FXB_INPAD, r\.w\/2 - 1, r\.h\/2 - 1\)\);/.test(code),
     'A4 838 의 **밑각 배분**(대표 상자)은 안 건드렸다 — 두 축을 같이 만지지 않는다(338 규칙)');
  ok(/const bx0 = rh \?/.test(code) && /const bx1 = rh \?/.test(code) && /const by0 = rh \?/.test(code)
     && /const inM = rh \?/.test(code),
     'A5 가둠 네 변이 **쉬는 상자 `r` 이 아니라** 가둠 상자 `rh` 를 읽는다');
  ok(/const rx = r && !fo \?/.test(code) && /const fitK = \(fo && r\) \?/.test(code),
     'A6 탄생 타원·알 크기는 **종전 그대로 쉬는 상자**에서 파생된다(619 13회차 «타원은 한 픽셀도 안 건드린다»)');
  ok(/jzTarget\(el\)/.test(tool) && /pc\.classList\.add\('jz-dn'\)/.test(tool),
     'A7 자(`travel838`)도 **제품이 누르는 그 노드**에 클래스를 건다(1002 정정)');
  ok(/const rh = \(t && t\.nodeType\) \? fxbHoldBox\(t, r\) : r;/.test(code),
     'B6 **점 대상**(좌표 호출)은 종전 그대로다 — 가둠 상자 자체를 안 쓴다');
  {
    const i0 = code.indexOf('function fxbPressVals'), i1 = code.indexOf('function fxBurst(t,');
    const seg = i0 > 0 && i1 > i0 ? code.slice(i0, i1) : code;
    ok(seg.indexOf('jzRestRect') < 0 && /offsetWidth/.test(seg),
       'A8 가둠 계산은 **읽기만** 한다 — 스타일을 박았다 되돌리는 손(`jzRestRect`)을 안 쓴다',
       '1회차 실측: 쓰면 홀드 내내 누름이 풀린다(`verify621` [R1] restPct 0.68/0.63/0.60)');
  }

  /* ───────── [B] 기하 ───────── */
  console.log('\n[B] 기하 — 제품이 계산하는 눌린 액자 == 실제로 눌러 잰 상자');
  const b = await launch(chromium);
  let geo = null;
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto('file://' + SRC.replace(/\\/g, '/'));
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; S.relic = 250000;
      if(S.temper) S.temper.pts = 1e6;
      S.rune = S.rune || {}; S.rune.r1 = 400;
      uiDirty = true; if(typeof renderUI === 'function') renderUI();
    });
    geo = await page.evaluate(async (sels) => {
      const out = [];
      for(const [key, open, sel] of sels){
        (new Function(open))();
        await new Promise(r => setTimeout(r, 500));
        const el = document.querySelector(sel);
        if(!el){ out.push({ key, miss: true }); continue; }
        const rest = fxRect(el);                       /* 트리거 전이라 그려진 상자 = 쉬는 상자다 */
        const pp = fxbPressPair(el, rest);
        const pred = pp && pp.press;
        const hold = fxbHoldBox(el, rest);
        /* 실측 — 제품이 누르는 노드(`jzTarget`)에 진짜 클래스를 걸고 다 앉을 때까지 기다린다 */
        let real = null, pcName = null;
        const pc0 = jzTarget(el);
        const pc = (pc0 && (pc0 === el || pc0.contains(el))) ? pc0 : null;
        if(pc){
          pcName = pc.tagName + '.' + String(pc.className || '').split(/\s+/)[0];
          const had = pc.classList.contains('jz-dn');
          if(!had) pc.classList.add('jz-dn');
          await new Promise(r => setTimeout(r, 200));
          real = fxRect(el);
          if(!had) pc.classList.remove('jz-dn');
          await new Promise(r => setTimeout(r, 200));
        }
        out.push({ key, sel, pcName, rest, pred, hold, real });
      }
      /* 음성항 — **안 눌리는 호스트**. 컨트롤 사슬 밖에 있는 자리를 찾아 «한 값도 안 바뀐다» 를 묻는다
         (`#rwBasin` 은 조상 `.rw-basin` 이 컨트롤이라 이 자리에 못 쓴다 — 1회차 실측). */
      const cand = ['#hud', '#trw .tr-hd', '#trCards', '#app'];
      for(const s2 of cand){
        const el = document.querySelector(s2);
        if(!el) continue;
        let pc = null; try { pc = jzTarget(el); } catch(_){}
        if(pc && (pc === el || pc.contains(el))) continue;      /* 눌리는 자리는 음성항이 못 된다 */
        const rest = fxRect(el);
        if(!rest) continue;
        const pp2 = fxbPressPair(el, rest);
        out.push({ key: 'nopress', sel: s2, rest, hold: fxbHoldBox(el, rest),
                   pred: pp2 && pp2.press, real: null, pcName: null });
        break;
      }
      return out;
    }, [['train', 'openTrain()', SC.train.btn],
        ['temper', "openTrain(); setTrSub('temper')", SC.temper.btn],
        ['rune', "openTrain(); setTrSub('rune')", SC.rune.btn],
        ['relicPt', 'openRelw()', SC.relic.btn]]);
    ok(errs.length === 0, 'B0 콘솔 에러 0', errs.slice(0, 2).join(' | '));
  } finally { await b.close(); }

  const near = (a, c, e) => Math.abs(a - c) <= (e === undefined ? 0.5 : e);
  for(const g of (geo || [])){
    if(g.miss){ ok(false, 'B? ' + g.key + ' 호스트를 못 찾았다', g.sel); continue; }
    if(g.key === 'relicPt') continue;    /* 유물은 **점 대상** 호출이라 가둠 자체를 안 쓴다(아래 B6 이 소스로 묻는다) */
    if(g.key === 'nopress'){
      ok(!g.pred && near(g.hold.x, g.rest.x) && near(g.hold.y, g.rest.y)
         && near(g.hold.w, g.rest.w) && near(g.hold.h, g.rest.h),
         'B4 안 눌리는 호스트(`' + g.sel + '`)는 가둠 상자가 **쉬는 상자 그대로**다 — 한 값도 안 바뀐다',
         p2(g.hold.w) + '×' + p2(g.hold.h) + ' ↔ 쉬는 ' + p2(g.rest.w) + '×' + p2(g.rest.h));
      continue;
    }
    const nm = g.key;
    ok(!!g.pred && !!g.real, 'B1-' + nm + ' 눌리는 컨트롤을 찾았다', g.pcName || '없음');
    if(!g.pred || !g.real) continue;
    ok(near(g.pred.x, g.real.x) && near(g.pred.y, g.real.y) && near(g.pred.w, g.real.w) && near(g.pred.h, g.real.h),
       'B2-' + nm + ' 예측한 눌린 액자 == 실제로 눌러 잰 상자',
       '예측 ' + p2(g.pred.w) + '×' + p2(g.pred.h) + ' @(' + p2(g.pred.x) + ',' + p2(g.pred.y) + ')'
       + ' ↔ 실측 ' + p2(g.real.w) + '×' + p2(g.real.h) + ' @(' + p2(g.real.x) + ',' + p2(g.real.y) + ')');
    const ix0 = Math.max(g.rest.x, g.real.x), iy0 = Math.max(g.rest.y, g.real.y);
    const ix1 = Math.min(g.rest.x + g.rest.w, g.real.x + g.real.w);
    const iy1 = Math.min(g.rest.y + g.rest.h, g.real.y + g.real.h);
    ok(near(g.hold.x, ix0) && near(g.hold.y, iy0) && near(g.hold.x + g.hold.w, ix1) && near(g.hold.y + g.hold.h, iy1),
       'B3-' + nm + ' 가둠 상자 == 쉬는 ∩ 눌린',
       '가둠 ' + p2(g.hold.w) + '×' + p2(g.hold.h) + ' @(' + p2(g.hold.x) + ',' + p2(g.hold.y) + ')');
    ok(g.hold.w < g.rest.w - 1 || g.hold.h < g.rest.h - 1,
       'B5-' + nm + ' 그 상자가 쉬는 상자보다 **실제로 좁다**(음성항 — 교집합이 공허하지 않다)',
       '쉬는 ' + p2(g.rest.w) + '×' + p2(g.rest.h) + ' → 가둠 ' + p2(g.hold.w) + '×' + p2(g.hold.h));
  }

  /* ───────── [C] 잉크 ───────── */
  console.log('\n[C] 잉크 — 두 액자 «모두» 안에서 끝난다');
  const now = {};
  for(const k of ['train', 'temper', 'rune']){
    const s = await runScene(SC[k]);
    now[k] = s;
    if(s.err){ ok(false, 'C-' + k + ' 표본을 못 얻었다', s.err); continue; }
    ok(s.spill < 0, 'C1-' + k + ' 쉬는 액자 안에서 끝난다 — ' + p2(s.spill) + 'px',
       '619 13·14회차의 그 값(음수 = 안쪽)');
    ok(s.spillP < 0, 'C2-' + k + ' **눌린 액자** 안에서도 끝난다 — ' + p2(s.spillP) + 'px',
       '수리 전 훈련 +0.07px(부호가 뒤집혔다) · 등재문 «부호가 뒤집힌다»');
  }
  const relicNow = await runScene(SC.relic);
  ok(!relicNow.err, 'C3 대조군(점 대상) 표본을 얻었다', relicNow.err || '');

  /* ───────── [R] 되돌림 ───────── */
  console.log('\n[R] 되돌림 — 가둠을 쉬는 상자로 되돌리면 부호가 다시 뒤집힌다');
  const hit = revertCopy(code);
  try {
    ok(hit === REVERTS.length, 'R0 되돌릴 자리를 다 찾았다 — ' + hit + '/' + REVERTS.length,
       '치환이 조용히 no-op 이면 이 시험은 언제나 초록이다(951 교훈)');
    const rev = await runScene(Object.assign({}, SC.train), REV);
    ok(!rev.err, 'R1 사본에서 표본을 얻었다', rev.err || '');
    if(!rev.err){
      ok(rev.spillP > now.train.spillP + 2,
         'R2 사본은 **눌린 액자** 기준 스필이 다시 커진다 — ' + p2(rev.spillP) + 'px (지금 트리 '
         + p2(now.train.spillP) + 'px)', '수리 전 실측 +0.07px');
      ok(rev.spillP >= 0 || rev.spill > -1,
         'R3 그 사본에서는 잉크가 눌린 액자에 **닿거나 넘는다** — ' + p2(rev.spillP) + 'px',
         '619 14회차 «잉크와 액자 사이에 늘 4px» 이 눌린 액자에서는 안 지켜졌다');
    }
    const relicRev = await runScene(Object.assign({}, SC.relic), REV);
    ok(!relicRev.err && Math.abs(relicRev.spill - relicNow.spill) < 0.01,
       'R4 점 대상(대조군)은 두 판에서 **같은 값** — ' + p2(relicNow.spill) + 'px ↔ ' + p2(relicRev.spill) + 'px',
       '«안 눌리는 자리는 한 값도 안 바뀐다»');
  } finally { try { fs.unlinkSync(REV); } catch (_) {} }

  console.log('\nVERIFY1002 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); try { fs.unlinkSync(REV); } catch (_) {} process.exit(1); });
