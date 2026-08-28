#!/usr/bin/env node
/* 게이트 — 작업 324 「강화·장착으로 전투력이 오르면 «⚔️ 전투력 +X» 토스트」 (저장소 주인 지시 2026-08-28)
 *
 *   node tools/verify324.js
 *
 * 주인 원문: «도감 강화나 뭐나 쨌든 강화했을때 또는 뭐 장착했을때 전투력 얼마나 올랐는지 같은거 notify로 떠야함».
 *
 * 지키는 성질:
 *   ① **한 액션 = 한 장** — `levelUp` 1회 → 토스트 정확히 1장.
 *   ② **Δ 는 거짓말하지 않는다**(156 «표기·지급·이펙트 삼자 일치») — 토스트 문자열의 수 = `cp()` 실측차를
 *      `fmtB` 로 찍은 것과 **문자 그대로** 같다. 어림수·자체 계산 금지.
 *   ③ **홀드는 합계 1장**(64/262/297 «꾹 누르면 연속 강화») — 100ms 간격 12회 → 1장, 그 값은 12회 합계.
 *   ④ **하락은 침묵** — 해제로 cp 가 내려가면 0장. 그 뒤 재장착은 다시 1장(기준선이 하락분을 먹고
 *      «+0» 이나 음수 노이즈를 내지 않는다).
 *   ⑤ **경로 커버리지** — markDirty 를 지나는 계열(강화 `levelUp`·일괄 `levelUpMax`·장착 `toggleEquip`·
 *      무기 `wpnEquip`·도감 `claimColl`·훈련 `trainBuy`/`trainUp`·단련 `temperUp`·축복 `activateBless`)과
 *      **markDirty 를 안 지나는 유일한 계열인 강화 탭 클릭**(`$('bUp')` → `applyBuy`)이 전부 뜬다.
 *      ⚠ ⑤의 마지막 항목이 이 작업의 함정이었다 — `S.lv` 는 `bonus()` 캐시 밖이라 강화 탭이
 *        markDirty 를 안 부른다. 감시자만 달고 끝냈으면 주인 지시의 한복판이 통째로 빠졌다.
 *   ⑥ **자동 구매는 침묵** — `S.autoBuy` 가 켜져 cp 가 계속 올라도 0장(0.4초마다 토스트 폭탄 금지).
 *   ⑦ **부팅은 침묵** — `load`·`dailyCheck`·시작 지급의 cp 점프로는 안 뜬다.
 *   ⑧ 149/206 규약 — 한 줄(`nowrap`)이고 프레임 1080 안에 든다. 다른 토스트와 같은 자리 규칙을 쓴다.
 *   ⑨ **되돌림 시험** — `cpFxArm` 을 무력화하면 ①이 0장이 된다(게이트가 이 작업이 심은 경로를
 *      보고 있다는 증거. 원래부터 있던 다른 토스트를 세고 있는 것이 아니다).
 *
 * 판정은 «논리(문자열)» 뿐 아니라 «화소(토스트 bbox 가 프레임 안에서 실제로 잉크를 낸다)» 도 본다 —
 * 292 «열렸는가 ≠ 보이는가» 처방. 강화 탭 항목은 **진짜 포인터 클릭**이다(LESSONS 65-② · 기능 완성 규칙).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → 토스트» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;
const WAIT = 1000;          /* CP_FX_MS(420) + 프레임 여유 + 토스트가 뜨는 시간 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* ── 부트 ──────────────────────────────────────────────────────────────────
   토스트는 1060ms 만에 스스로 사라지므로 «지금 화면에 있는가» 로 세면 경합이 난다.
   `#fxl` 에 MutationObserver 를 달아 **뜬 것을 전부 적어 둔다**(제품 코드는 한 줄도 안 건드린다). */
async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e12, dia: 1e6, best: 60, totalKills: 5000, rstone: 1e6, relic: 1e6 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof cp === 'function' && typeof cpTick === 'function');
  await page.evaluate(() => {
    window.__T = [];
    const L = document.getElementById('fxl');
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.classList && n.classList.contains('fx-toast')) {
        const r = n.getBoundingClientRect();
        window.__T.push({ t: n.textContent, x: r.left, w: r.width, ws: getComputedStyle(n).whiteSpace });
      }
    }))).observe(L, { childList: true });
  });
  /* 전투 루프가 재화 연출·스테이지 진행으로 판정을 흔들지 않게 멈춘다(다른 게이트와 같은 처방).
     ⚠ `loop()` 자체는 계속 돈다 — `cpTick` 이 그 안에 있으므로 여기서 멈추면 게이트가 제 발을 쏜다. */
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(1200);
  return { page, errs };
}

const clear = page => page.evaluate(() => { window.__T.length = 0; });
const got   = page => page.evaluate(() => window.__T.slice());
const cpToasts = list => list.filter(o => /전투력/.test(o.t));

/* 액션을 한 번 돌리고 «전투력 토스트» 만 걷어 온다. fn 은 페이지 안에서 도는 문자열 함수다.
   Δ 기대값은 **페이지가 직접 계산해서** 돌려준다 — 게이트가 fmtB 를 흉내 내면 그 흉내가 판정이 된다.
   `prep` 은 **재료 준비**다 — 스냅샷 밖에서 따로 돌려 그 cp 변화가 Δ 에 섞이지 않게 한다
   (훈련 단계 상한을 올리는 준비가 액션과 한 덩어리로 들어가 [5] 두 항목이 빨개졌다). */
async function act(page, fn, prep) {
  if (prep) { await page.evaluate(p => { new Function(p)(); }, prep); await page.waitForTimeout(WAIT); }
  await clear(page);
  const exp = await page.evaluate(src => {
    const f = new Function(src);
    const before = cp();
    f();
    return { before, after: cp(), txt: '⚔️ 전투력 +' + fmtB(cp() - before) };
  }, fn);
  await page.waitForTimeout(WAIT);
  exp.list = cpToasts(await got(page));
  return exp;
}

/* 278 처방 — 블록 하나가 던져도 **게이트가 즉사하지 않고 그 블록만 빨개진다**.
   319 가 `bagUse is not defined` 로 §5 후반·§6 을 통째로 못 돌게 만든 그 함정을 여기서 미리 닫는다. */
async function blk(name, fn) {
  try { await fn(); } catch (e) { ok(false, name + ' — 블록이 예외로 죽었다', String(e.message).split('\n')[0]); }
}

(async () => {
  const browser = await launch(chromium);
  const { page, errs } = await boot(browser);

  /* ══ [1] 부팅 침묵 ═══════════════════════════════════════════════════════ */
  await blk('[1]', async () => {
    const all = await got(page);
    ok(cpToasts(all).length === 0, '[1] 부팅(load·dailyCheck·시작 지급)으로는 전투력 토스트가 안 뜬다',
      cpToasts(all).length + '장 / 전체 ' + all.length + '장');
  });

  /* 재료 — 강화할 스킬 하나에 조각을 넉넉히 준다.
     ⚠ 초기 상태(cp≈500)에서 한 칸 올리면 cp 증분이 0.5 미만이라 `Math.round` 로 **0** 이 된다
        (초회 실행에서 실제로 [2] 가 «505 → 505» 로 빨개졌다). 그것은 «Δ=0 은 침묵» 이라는 규칙대로지
        결함이 아니므로, 한 칸이 반올림에 안 먹히는 자리(기본 스탯을 올린 Lv50 스킬)에서 잰다.
        Δ=0 침묵 자체는 [4] 하락·[7] 자동 구매가 따로 지킨다. */
  await page.evaluate(() => {
    S.lv.atk = 260; S.lv.hp = 160;          /* cp 를 «한 칸이 반올림에 안 먹히는» 자리로 올려 둔다 */
    S.own.slash = { n: 99999, l: 50 };
    if (!S.eqSkill.includes('slash')) S.eqSkill.push('slash');
    markDirty();
  });
  await page.waitForTimeout(WAIT);
  await clear(page);

  /* ══ [2] levelUp 1회 → 1장 · Δ = cp 실측차 ══════════════════════════════ */
  await blk('[2]', async () => {
    const r = await act(page, "levelUp(SK['slash']);");
    ok(r.after > r.before, '[2] 강화 1회로 전투력이 실제로 올랐다 (판정 재료)', r.before + ' → ' + r.after);
    ok(r.list.length === 1, '[2] 토스트가 정확히 1장', r.list.length + '장');
    ok(r.list[0] && r.list[0].t === r.txt,
      '[2] 156 규약 — 문자열이 «cp 실측차» 그 자체다', '«' + (r.list[0] && r.list[0].t) + '» 기대 «' + r.txt + '»');
    ok(r.list[0] && r.list[0].ws === 'nowrap' && r.list[0].x >= 0 && r.list[0].x + r.list[0].w <= W,
      '[2] 149 규약 — 한 줄이고 프레임 1080 안',
      r.list[0] ? r.list[0].ws + ' · x' + r.list[0].x.toFixed(0) + ' w' + r.list[0].w.toFixed(0) : '없음');
  });

  /* ══ [3] 홀드 — 100ms 간격 12회 → 합계 1장 ══════════════════════════════ */
  await blk('[3]', async () => {
    await clear(page);
    const before = await page.evaluate(() => cp());
    /* 64 의 홀드 반복(TR_HOLD_IV0 160ms → TR_HOLD_IVMIN 60ms)보다 **느린** 100ms 로 민다 —
       느린 쪽이 창을 닫기 쉬우므로 이쪽이 통과하면 실제 홀드는 더 확실히 1장이다. */
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => levelUp(SK['slash']));
      await page.waitForTimeout(100);
    }
    const exp = await page.evaluate(b => '⚔️ 전투력 +' + fmtB(cp() - b), before);
    await page.waitForTimeout(WAIT);
    const list = cpToasts(await got(page));
    ok(list.length === 1, '[3] 홀드 12회 → 토스트 1장 (틱마다 1장이 아니다)', list.length + '장');
    ok(list[0] && list[0].t === exp, '[3] 그 1장이 «12회 합계» 다', '«' + (list[0] && list[0].t) + '» 기대 «' + exp + '»');
  });

  /* ══ [4] 하락은 침묵 · 되돌리면 다시 1장 ════════════════════════════════ */
  await blk('[4]', async () => {
    await clear(page);
    const d = await page.evaluate(() => { const b = cp(); toggleEquip(SK['slash'], 'skill'); return cp() - b; });
    await page.waitForTimeout(WAIT);
    const off = cpToasts(await got(page));
    ok(d < 0, '[4] 해제로 전투력이 내려갔다 (판정 재료)', 'Δ=' + d);
    ok(off.length === 0, '[4] 하락은 침묵 — 0장 (주인 지시는 «올랐는지»)', off.length + '장');

    const r = await act(page, "toggleEquip(SK['slash'], 'skill');");
    ok(r.after > r.before, '[4] 재장착으로 다시 올랐다 (판정 재료)', r.before + ' → ' + r.after);
    ok(r.list.length === 1 && r.list[0].t === r.txt,
      '[4] 재장착 → 1장, 값도 실측차 (하락분이 «+0» 노이즈로 새지 않는다)',
      r.list.length + '장 «' + (r.list[0] && r.list[0].t) + '» 기대 «' + r.txt + '»');
  });

  /* ══ [5] 경로 커버리지 — markDirty 계열 ═════════════════════════════════ */
  await blk('[5]', async () => {
    const cases = [
      ['일괄 강화 levelUpMax', "S.own.bolt = { n: 99999, l: 40 }; levelUpMax(SK['bolt']);"],
      ['무기 장착 [장착] 버튼', "S.eqSlot.weapon = null; markDirty();"
                              + " const e = EQUIPS.filter(x => x.slot === 'weapon').slice(-1)[0];"
                              + " S.own[e.id] = { n: 0, l: 60 }; openWeapon(e.id, 'weapon');"
                              + " document.getElementById('wpnBtnEq').onclick(); closeWeapon();"],
      ['훈련 구매 trainBuy',   "trainBuy('atk');",
                              "S.trainStage = 9; S.buyQty = 10; S.gold = 1e30; markDirty();"],
      ['훈련 단계 trainUp',    "trainUp();",
                              "TRAIN_STATS.forEach(id => S.lv[id] = trainCap()); markDirty();"],
      ['도감 claimColl',       "const st = COLL_SETS[0]; st.it.forEach(id => { if(!S.own[id]) S.own[id] = { n:0, l:1 }; }); markDirty(); claimColl(st.key, 1);"],
      ['축복 activateBless',   "activateBless('atk');"],
      ['단련 temperUp',        "temperObj().pts = 99999; temperUp(TEMPERS[0].k);"],
    ];
    for (const [name, src, prep] of cases) {
      const r = await act(page, src, prep);
      if (r.after <= r.before) { ok(false, '[5] ' + name + ' — 전투력이 안 올랐다 (재료 준비 실패)', r.before + ' → ' + r.after); continue; }
      ok(r.list.length === 1 && r.list[0].t === r.txt,
        '[5] ' + name + ' → 1장 · 값 = 실측차',
        r.list.length + '장 «' + (r.list[0] && r.list[0].t) + '» 기대 «' + r.txt + '»');
    }
  });

  /* ══ [6] 강화 탭 — markDirty 를 안 지나는 유일한 계열, 진짜 포인터 클릭 ══ */
  await blk('[6]', async () => {
    /* ⚠ [5] `trainUp` 이 17 스탯업 연출(`#statw`)을 띄운 채 끝난다 — 그대로 두면 진짜 클릭이
       오버레이에 막혀 30초 타임아웃이 난다(초회 실행 [6] 이 그렇게 죽었다). 먼저 치운다. */
    await page.evaluate(() => {
      closeModal(); closeWeapon(); document.getElementById('statw').classList.remove('on');
      S.autoBuy = false; S.buyQty = 10; S.gold = 1e30; goTab('grow', 1); uiDirty = true; renderUI();
    });
    await page.waitForTimeout(600);
    await clear(page);
    const before = await page.evaluate(() => cp());
    const sel = '#bUp .up[data-u="atk"]';
    ok(await page.$(sel) !== null, '[6] 강화 탭에 «공격력» 행이 있다 (클릭 대상)');
    await page.click(sel);
    const exp = await page.evaluate(b => ({ txt: '⚔️ 전투력 +' + fmtB(cp() - b), up: cp() - b }), before);
    await page.waitForTimeout(WAIT);
    const list = cpToasts(await got(page));
    ok(exp.up > 0, '[6] 진짜 클릭으로 전투력이 올랐다 (기능 완성 규칙 — 실동작)', 'Δ=' + exp.up);
    ok(list.length === 1 && list[0].t === exp.txt,
      '[6] 강화 탭 클릭 → 1장 · 값 = 실측차 (markDirty 를 안 부르는 경로도 걸린다)',
      list.length + '장 «' + (list[0] && list[0].t) + '» 기대 «' + exp.txt + '»');
  });

  /* ══ [7] 자동 구매 침묵 ═════════════════════════════════════════════════ */
  await blk('[7]', async () => {
    await page.evaluate(() => { S.gold = 1e30; S.autoBuy = true; });
    await clear(page);
    const before = await page.evaluate(() => cp());
    /* ⚠ 이 게이트는 판정을 흔들지 않으려고 `step` 을 비워 뒀는데 `autoBuyTick` 은 그 안에서 불린다.
       그래서 «켜 두고 기다리기» 로는 한 번도 안 돌았다(초회 실행 [7] 이 «113402973 → 113402973»).
       제품 함수를 **그대로** 0.4초 주기로 8회 민다 — 루프가 부르는 것과 같은 호출이다. */
    for (let i = 0; i < 8; i++) { await page.evaluate(() => autoBuyTick(1)); await page.waitForTimeout(300); }
    const after = await page.evaluate(() => { S.autoBuy = false; return cp(); });
    await page.waitForTimeout(WAIT);
    const list = cpToasts(await got(page));
    ok(after > before, '[7] 자동 구매로 전투력이 실제로 올랐다 (판정 재료)', before + ' → ' + after);
    ok(list.length === 0, '[7] 그래도 토스트는 0장 (0.4초마다 토스트 폭탄 금지)', list.length + '장');
  });

  /* ══ [8] 다른 토스트와 공존 ═════════════════════════════════════════════ */
  await blk('[8]', async () => {
    await clear(page);
    await page.evaluate(() => { notify('테스트 안내'); levelUp(SK['slash']); });
    await page.waitForTimeout(WAIT);
    const all = await got(page);
    ok(all.some(o => /테스트 안내/.test(o.t)), '[8] 남의 토스트가 밀려나지 않는다');
    ok(cpToasts(all).length === 1, '[8] 겹쳐도 전투력 토스트는 1장', cpToasts(all).length + '장');
  });

  /* ══ [9] 되돌림 시험 — 심은 경로를 끄면 사라진다 ═══════════════════════ */
  await blk('[9]', async () => {
    await page.evaluate(() => { window.__arm = cpFxArm; window.cpFxArm = () => {}; });
    const r = await act(page, "levelUp(SK['slash']);");
    await page.evaluate(() => { window.cpFxArm = window.__arm; });
    ok(r.after > r.before, '[9] 전투력은 그대로 올랐다 (판정 재료)', r.before + ' → ' + r.after);
    ok(r.list.length === 0,
      '[9] `cpFxArm` 을 무력화하면 0장 — 이 게이트는 324 가 심은 경로를 보고 있다', r.list.length + '장');
    /* 되돌린 뒤 정상 복귀까지 확인한다(시험이 뒤 항목을 오염시키지 않았는가) */
    const back = await act(page, "levelUp(SK['slash']);");
    ok(back.list.length === 1 && back.list[0].t === back.txt, '[9] 되돌리면 다시 1장',
      back.list.length + '장 «' + (back.list[0] && back.list[0].t) + '»');
  });

  /* ══ [10] 콘솔 ══════════════════════════════════════════════════════════ */
  ok(errs.length === 0, '[10] 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY324 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ 실패 ' + fail + '건' : '  ✓'));
  process.exit(fail ? 1 : 0);
})();
