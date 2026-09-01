/* 작업 727 — 재현(338 규칙: 등재문의 처방을 따르기 **전에** 실제로 찍힌 것부터 본다).
 *
 * 등재(706 곁다리): `tools/verify208.js` §6 세 항이 빨갛다 — 36/39.
 *   ① «등장 연출 2개가 #fxlc(전투 발 · 팝업 아래, 184)에 붙는다 — +0»
 *   ② «277 — 승급전도 28 규격 보스 HUD(#stinfo.bfight)를 켠다»
 *   ③ «277 — ⏱ 타이머가 승급전 남은 시간을 띄운다 — 15.0 (기대 0.0)»
 *
 * 갈래는 둘이고 이 자가 가른다:
 *   ⓐ **제품이 실제로 안 켠다** — 277 이후 누가 승급전 HUD·등장 연출을 떨어뜨렸다.
 *   ⓑ **게이트가 낡았다** — §6 이 «§5 에서 수호자를 잡은 직후» 에 승급전을 **다시** 열어
 *      «등장 순간» 을 재려 하는데, 332/475 의 격파 시퀀스(`bossClear`)와 665 의 재진입 가드
 *      (`battleLocked()` = `bossMode()` 가 stage 밖이거나 `bossClear` 가 살아 있으면 참)가
 *      그 재진입을 **정당하게** 막는다 ⇒ `startPromo()` 가 첫 줄에서 되돌아가고
 *      promo 는 null 인 채로 «켜졌는가» 를 재게 된다.
 *
 * 씬 셋 — 셋 다 같은 다섯 값(#fxlc 증가 · #fxl 증가 · .bfight · ⏱ 켜짐 · ⏱ 글자)으로 잰다:
 *   [A] **깨끗한 첫 진입** — 아무것도 안 잡은 판에서 startPromo()  → ⓐ 라면 여기서도 0 이다.
 *   [B] **게이트 §6 재현** — 수호자를 잡은 직후 게이트가 하는 그대로
 *        (`promo = null; enemies.length = 0; startPromo()`) → ⓑ 라면 여기서만 0 이다.
 *   [C] **원인 격리** — B 와 모든 것이 같고 격파 시퀀스만 제품 경로(`bossClearDone()`)로 닫은 뒤
 *        재진입 → 다시 켜지면 범인은 `bossClear` 하나로 확정된다.
 *
 * ⚠ 페이지의 게임 루프는 evaluate 사이에도 돈다 — `bossClear` 는 die + 1초(DUN_CLR_HOLD) 뒤에
 *   스스로 닫히므로 [B]·[C] 는 **한 evaluate 안에서** 연달아 재야 한다.
 * ⚠ §4 처럼 캔버스 픽셀을 읽지는 않지만 verify208 과 같은 조건으로 띄운다(`--allow-file-access-from-files`).
 *
 * 실행: node tools/probe727.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';

const SAVE = {
  rank: 0, best: 9999, stage: 50, gold: 1e30, dia: 1e12, trainStage: 6,
  lv: { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 20, pierce: 6 }
};

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const shot = s => '#fxlc +' + s.lcAdd + ' · #fxl +' + s.lAdd + ' · bfight ' + s.bfight
  + ' · ⏱ ' + (s.tmOn ? 'on' : 'off') + ' ' + s.tmTx + ' (promo.t ' + s.want + ')';

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify(SAVE)]);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.goto(URL);
    await p.waitForTimeout(1400);

    /* 한 씬을 재는 공용 조각 — 페이지 안에서만 쓴다(문자열로 심지 않고 evaluate 마다 다시 적는다). */
    const MEASURE = `(lc0, l0) => ({
      lcAdd: ((document.getElementById('fxlc') || {}).childElementCount || 0) - lc0,
      lAdd:  ((document.getElementById('fxl')  || {}).childElementCount || 0) - l0,
      bfight: !!(document.getElementById('stinfo') || { classList:{ contains(){ return false; } } })
                 .classList.contains('bfight'),
      tmOn:  !!document.getElementById('bossTm').classList.contains('on'),
      tmTx:  document.getElementById('bossTmN').textContent,
      want:  promo ? Math.max(0, promo.t).toFixed(1) : '—',
      promoOn: !!promo
    })`;

    /* ---------------- [A] 깨끗한 첫 진입 ---------------- */
    console.log('\n[A] 깨끗한 첫 진입 — 아무것도 안 잡은 판에서 startPromo()');
    const A = await p.evaluate(M => {
      const measure = eval(M);
      const lc0 = (document.getElementById('fxlc') || {}).childElementCount || 0;
      const l0 = (document.getElementById('fxl') || {}).childElementCount || 0;
      startPromo();
      const e = enemies.find(x => x.tk === 'promo');
      if (e) e.hp = e.max = 1e30;          /* 뒤 씬이 잴 수 있게 불사로 */
      drawHud();                            /* 277 — HUD 판정은 한 프레임 그린 뒤에 본다 */
      return measure(lc0, l0);
    }, MEASURE);
    console.log('       ' + shot(A));
    ok(A.promoOn, '[A] 승급전이 실제로 열렸다');
    ok(A.lcAdd >= 2, '[A] 등장 연출 2개가 #fxlc 에 붙는다 — +' + A.lcAdd);
    ok(A.lAdd === 0, '[A] #fxl(팝업 위)에는 한 개도 안 붙는다 — +' + A.lAdd);
    ok(A.bfight, '[A] #stinfo.bfight 가 켜진다');
    ok(A.tmOn && A.tmTx === A.want, '[A] ⏱ 가 승급전 남은 시간을 띄운다 — ' + A.tmTx + ' (기대 ' + A.want + ')');

    /* ---------------- [B]·[C] 한 evaluate 안에서 ---------------- */
    console.log('\n[B] 게이트 §6 재현 — 수호자를 잡은 직후 그대로 재진입 / [C] 격파 시퀀스만 닫고 재진입');
    const BC = await p.evaluate(M => {
      const measure = eval(M);
      /* §5 와 같은 처치 — 여기서 332/475 의 격파 시퀀스가 열린다 */
      const e0 = enemies.find(x => x.tk === 'promo');
      if (e0) { e0.hp = 0; killEnemy(e0); }
      const clr = bossClear ? { md: bossClear.md, t: +bossClear.t.toFixed(3), die: +bossClear.die.toFixed(3) } : null;
      const locked0 = battleLocked(), mode0 = bossMode();

      /* [B] — verify208 §6 이 하는 그대로 */
      promo = null; enemies.length = 0;
      const lcB = (document.getElementById('fxlc') || {}).childElementCount || 0;
      const lB = (document.getElementById('fxl') || {}).childElementCount || 0;
      const lockedB = battleLocked();
      startPromo();
      const eB = enemies.find(x => x.tk === 'promo');
      if (eB) eB.hp = eB.max = 1e30;
      drawHud();
      const B = measure(lcB, lB);

      /* [B2] — 옛 §7 이 그 창 안에서 돌던 «세 번 더 연다» 루프. 한 번도 안 열리면
         `first === last` 는 «배율이 안 튄다» 가 아니라 «아무 일도 안 일어났다» 다(헛초록). */
      const scale0 = ETYPE.promo.scale;
      let opened = 0;
      for (let i = 0; i < 3; i++) {
        promo = null; enemies.length = 0;
        startPromo();
        const e = enemies.find(x => x.tk === 'promo');
        if (e) { opened++; e.hp = e.max = 1e30; }
      }
      const B2 = { opened, same: ETYPE.promo.scale === scale0 };

      /* [C] — 격파 시퀀스만 제품 경로로 닫고(다른 값은 그대로) 다시 연다 */
      bossClearDone();                      /* promo 는 이미 null 이라 endPromo 는 안 탄다 = bossClear 만 닫힌다 */
      const clrAfter = !!bossClear, lockedC = battleLocked();
      enemies.length = 0;
      const lcC = (document.getElementById('fxlc') || {}).childElementCount || 0;
      const lC = (document.getElementById('fxl') || {}).childElementCount || 0;
      startPromo();
      const eC = enemies.find(x => x.tk === 'promo');
      if (eC) eC.hp = eC.max = 1e30;
      drawHud();
      const C = measure(lcC, lC);

      return { clr, mode0, locked0, lockedB, clrAfter, lockedC, B, B2, C };
    }, MEASURE);

    console.log('       처치 직후 — bossMode() ' + JSON.stringify(BC.mode0)
      + ' · bossClear ' + JSON.stringify(BC.clr) + ' · battleLocked() ' + BC.locked0);
    console.log('  [B]  ' + shot(BC.B));
    ok(BC.lockedB, '[B] 재진입 시점에 battleLocked() 가 참이다(격파 시퀀스 창)');
    ok(!BC.B.promoOn, '[B] startPromo() 가 첫 줄에서 되돌아간다 — promo 는 null');
    ok(BC.B.lcAdd === 0 && !BC.B.bfight,
      '[B] 그래서 «등장 연출·HUD 가 0» 으로 읽힌다 — 게이트 §6 이 재는 것이 이것이다');

    ok(BC.B2.opened === 0 && BC.B2.same,
      '[B2] 그 창에서는 «세 번 더 연다» 루프도 0회 열린다 — verify208 §7 이 헛초록이던 자리('
      + BC.B2.opened + '/3 · 배율 불변 ' + BC.B2.same + ')');

    console.log('  [C]  ' + shot(BC.C) + ' · bossClear ' + BC.clrAfter + ' · battleLocked() ' + BC.lockedC);
    ok(!BC.clrAfter && !BC.lockedC, '[C] 격파 시퀀스를 닫으면 잠금이 풀린다');
    ok(BC.C.promoOn, '[C] 같은 자리에서 승급전이 다시 열린다');
    ok(BC.C.lcAdd >= 2 && BC.C.bfight && BC.C.tmOn && BC.C.tmTx === BC.C.want,
      '[C] 세 항이 전부 되살아난다 — ' + shot(BC.C));

    /* ---------------- 판정 ---------------- */
    console.log('\n[판정] ⓐ(제품 결함) 이면 [A] 가 빨갛다 · ⓑ(게이트 부패) 이면 [A]·[C] 초록 · [B] 만 0');
    ok(errs.length === 0, '콘솔·페이지 에러 0건 — ' + errs.join(' | '));
    await ctx.close();
  } finally { await browser.close(); }

  console.log('\nPROBE727 ' + (fail ? 'FAIL' : 'PASS') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
