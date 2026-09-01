#!/usr/bin/env node
/* 486 검증 — 23 훈련 카드 알약 = «지금 최종값» (저장소 주인 지시 2026-08-30, 스크린샷)
 *
 *   node tools/verify486.js
 *
 * 계약 한 줄 — **카드 3장의 초록 알약(`.cv`)은 «한 번 살 때 오르는 양» 이 아니라
 *   «지금 내 공격력 / 체력 / 체력 회복» 이다.** 주인 원문: «골드로 훈련 업글하는거 보면
 *   최종값이 몇인지 각각 써있어야함. 업글했을때 몇씩되는지는 안궁금함».
 *
 * 값의 출처는 `stat.dmg` / `stat.maxHp` / `stat.regen` — **전투가 실제로 쓰는 값**이다
 *   (훈련·단계 보너스·장비·펫·축복·도감이 다 곱해진 «지금 내 수치»). `U[k].val(lv)` 원값이 아니다.
 *
 * 재현 `tools/probe486.js` 가 먼저 잰 것(수리 전):
 *   · `.cv` = «+20 / +100 / +15» — 세 칸 전부 증가분. 같은 순간의 최종값 533 / 2.67A / 364 는 화면에 없다.
 *   · **폭은 결손이 아니었다** — 최장 문자열 «9.99AA» 잉크 146.88px / 예산 294px.
 *     등재문 처방 ③ 의 «필요하면 font-size 한 단 아래» 가지는 **안 탔다**(레이아웃 Δ0px).
 *   · ⚠ **등재문에 없던 자리 하나** — 58 «+n» 플로터(`trDeltaTxt`)가 `.cv` 글자를 그대로
 *     읽어 띄우고 있었다. 그대로 뒀으면 «방금 9.64G 를 얻었다» 는 거짓말이 됐다
 *     (58 26회차가 «거짓말» 로 못 박은 항목의 부호만 뒤집힌 꼴). ⇒ 값 계산을 분리했다.
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로):
 *   [A] 세 칸 = fmtB(stat.dmg/maxHp/regen) — 상태 4벌(부팅 · 고레벨 · 고단계 · 장비 배수)
 *   [B] «+» 접두 0건 · 증가분 문자열 0건
 *   [C] 구매 1회 뒤 **같은 프레임**에 값이 오른다(x1 · x10 · x30 · 통째 렌더 · 가벼운 갱신 둘 다)
 *   [D] MAX / «상한» 경로 유지 — 상한 카드는 알약 MAX · 버튼 «상한»(verify64·verify326 계약)
 *   [E] 잉크가 알약 안 — 최장 문자열까지 카드 내부(좌우 여백 ≥ 8px)
 *   [F] 58 플로터는 **증가분**을 말한다 — `.cv` 와 분리됐다(총량을 띄우지 않는다)
 *   [G] 라벨 — 재생 단위는 이름 줄로(«체력 회복/초») · 잉크가 카드 안
 *   [H] 안 건드린 축 — 레벨·비용·진행바·밸런스 상수 불변 · 레이아웃 Δ0px
 *   [R] 되돌림 시험 — `c.now` 를 `c.gain` 으로 되돌린 사본에서 주인이 본 그림이 그대로 재현된다
 *   [I] 콘솔·페이지 에러 0
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };
const eq = (m, got, want) => ok(got === want, m, 'got ' + JSON.stringify(got) + ' · want ' + JSON.stringify(want));
const sec = t => console.log('\n' + t);

const save = (stage, lv) => ({ gold: 1e30, dia: 1e9, best: 60, a105: 1, buyQty: 1,
  autoBuy: false, trainStage: stage, lv: { atk: lv, hp: lv, regen: lv } });

async function open(browser, file, sv) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  if (sv) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(sv)]);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function');
  await page.evaluate(() => { step = () => {}; S.autoBuy = false; openTrain(); renderTrain(); });
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}
/* 카드 3장의 «찍힌 글자» 와 그 순간의 최종값을 같이 돌려준다 */
const shot = page => page.evaluate(() => {
  const t = k => ((document.querySelector('#trCards [data-tr="' + k + '"] .cv i') || {}).textContent || '');
  const n = k => ((document.querySelector('#trCards [data-tr="' + k + '"] .cn i') || {}).textContent || '');
  return {
    cv: { atk: t('atk'), hp: t('hp'), regen: t('regen') },
    now: { atk: fmtB(stat.dmg), hp: fmtB(stat.maxHp), regen: fmtB(stat.regen) },
    cn: { atk: n('atk'), hp: n('hp'), regen: n('regen') },
    gain: trainCardData().reduce((o, c) => (o[c.k] = c.gain, o), {}),
  };
});

(async () => {
  const browser = await launch(chromium);
  let allErrs = [];

  /* ══════════════════ [A] 세 칸 = 최종값 ══════════════════ */
  sec('[A] 세 칸 = fmtB(stat.dmg / stat.maxHp / stat.regen) — 상태 4벌');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(3, 20));
    const cases = [
      ['부팅급 (단계 3 · lv 20)', () => {}],
      ['고레벨 (lv 900)', () => { S.trainStage = 20; S.lv.atk = S.lv.hp = S.lv.regen = 900; }],
      ['고단계 (단계 40 · lv 3000)', () => { S.trainStage = 40; S.lv.atk = S.lv.hp = S.lv.regen = 3000; }],
      /* 배수 축 — 최종값은 «훈련분» 이 아니라 «지금 내 수치» 여야 한다(도감/축복이 곱해진다) */
      ['배수 얹힘 (도감 세트)', () => { S.trainStage = 12; S.lv.atk = S.lv.hp = S.lv.regen = 300;
        try { Object.keys(S.dex || {}).slice(0, 6).forEach(k => { S.dex[k] = 9; }); } catch (e) {} }],
    ];
    for (const [label, mut] of cases) {
      await page.evaluate(fn => { (new Function(fn))(); markDirty(); renderTrain(); }, '(' + mut.toString() + ')()');
      await page.waitForTimeout(80);
      const s = await shot(page);
      eq('  ' + label + ' — 공격력 칸', s.cv.atk, s.now.atk);
      eq('  ' + label + ' — 체력 칸', s.cv.hp, s.now.hp);
      eq('  ' + label + ' — 체력 회복 칸', s.cv.regen, s.now.regen);
      /* 음성항 — 증가분과 «우연히 같은 글자» 로 통과하는 헛초록을 막는다 */
      ok(s.cv.atk !== s.gain.atk, '  ' + label + ' — 증가분(«' + s.gain.atk + '»)이 아니다', s.cv.atk);
    }
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [B] «+» 접두 0건 ══════════════════ */
  sec('[B] «+» 접두 0건 — 세 칸 · 전 상태');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(7, 200));
    for (const qty of [1, 10, 30]) {
      const s = await page.evaluate(q => { S.buyQty = q; renderTrain();
        return ['atk', 'hp', 'regen'].map(k =>
          document.querySelector('#trCards [data-tr="' + k + '"] .cv i').textContent); }, qty);
      ok(s.every(x => !/^\+/.test(x)), '  x' + qty + ' — 세 칸 어디에도 «+» 접두가 없다', JSON.stringify(s));
    }
    /* 소스 스캔 — 렌더 두 경로(통째·가벼운 갱신)가 `gain` 을 그리지 않는다 */
    const CODE = fs.readFileSync(SRC, 'utf8');
    ok(!/class="cv"><i>' \+ \(c\.full \? 'MAX' : c\.gain\)/.test(CODE),
      '  renderTrain() 이 `c.gain` 을 알약에 안 그린다');
    ok(!/set\('\.cv i', c\.full \? 'MAX' : c\.gain\)/.test(CODE),
      '  renderTrainLive() 도 `c.gain` 을 알약에 안 그린다');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [C] 구매 직후 같은 프레임 ══════════════════ */
  sec('[C] 구매 1회 → 같은 프레임에 새 최종값 (통째 렌더 · 가벼운 갱신 둘 다)');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(20, 300));
    for (const qty of [1, 10, 30]) {
      for (const path2 of ['renderTrain', 'renderTrainLive']) {
        const r = await page.evaluate(([q, p]) => {
          S.buyQty = q; S.gold = 1e30; markDirty(); renderTrain();
          const t = () => document.querySelector('#trCards [data-tr="atk"] .cv i').textContent;
          const b = { cv: t(), lv: lv('atk') };
          trainBuy('atk'); window[p]();
          return { b, a: { cv: t(), lv: lv('atk') }, want: fmtB(stat.dmg) };
        }, [qty, path2]);
        ok(r.a.lv === r.b.lv + qty, '  x' + qty + ' / ' + path2 + ' — 레벨이 ' + qty + ' 올랐다',
          r.b.lv + '→' + r.a.lv);
        eq('  x' + qty + ' / ' + path2 + ' — 알약이 새 최종값', r.a.cv, r.want);
        ok(r.a.cv !== r.b.cv, '  x' + qty + ' / ' + path2 + ' — 글자가 실제로 바뀌었다',
          r.b.cv + '→' + r.a.cv);
      }
    }
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [D] MAX / «상한» 경로 유지 ══════════════════ */
  sec('[D] 상한 카드 — 알약 «MAX» · 버튼 «상한» (verify64·verify326 계약을 안 깼다)');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(3, 0));
    const r = await page.evaluate(() => {
      S.trainStage = 3; const cap = trainCap();
      S.lv.atk = cap; S.lv.hp = 0; S.lv.regen = 0; markDirty(); renderTrain();
      const g = (k, s) => document.querySelector('#trCards [data-tr="' + k + '"] ' + s).textContent;
      return { cap, full: g('atk', '.cv i'), btn: g('atk', '.cb i'),
        cls: document.querySelector('#trCards [data-tr="atk"]').className,
        other: g('hp', '.cv i'), otherNow: fmtB(stat.maxHp) };
    });
    eq('  상한 카드 알약', r.full, 'MAX');
    eq('  상한 카드 버튼', r.btn, '상한');
    ok(/\bfull\b/.test(r.cls), '  상한 카드에 .full 클래스', r.cls);
    eq('  같은 화면의 상한 아닌 카드는 최종값 그대로', r.other, r.otherNow);
    /* 가벼운 갱신 경로도 같은 규칙 */
    const r2 = await page.evaluate(() => { renderTrainLive();
      return document.querySelector('#trCards [data-tr="atk"] .cv i').textContent; });
    eq('  가벼운 갱신 뒤에도 MAX', r2, 'MAX');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [E] 잉크가 알약 안 ══════════════════ */
  sec('[E] 잉크가 알약 안 — 최장 문자열까지 좌우 여백 ≥ 8px (예산 294px)');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(3, 20));
    const r = await page.evaluate(() => {
      const card = document.querySelector('#trCards [data-tr="atk"]');
      const el = card.querySelector('.cv i');
      const cr = card.getBoundingClientRect(), keep = el.textContent;
      /* fmtB(= fmtG) 가 낼 수 있는 최장 꼴 — «9.99AA»/«99.9AA» (3자리 + 소수 + 접미 2자) */
      const rows = ['999', '9.99K', '999K', '9.99AA', '99.9AA', '999AA', 'MAX'].map(s => {
        el.textContent = s; const r = el.getBoundingClientRect();
        return { s, w: +r.width.toFixed(2), l: +(r.left - cr.left).toFixed(2), rr: +(cr.right - r.right).toFixed(2) };
      });
      el.textContent = keep;
      return { rows, fs: getComputedStyle(el).fontSize, cardW: +cr.width.toFixed(2) };
    });
    r.rows.forEach(x => ok(x.l >= 8 && x.rr >= 8 && x.w <= 294,
      '  «' + x.s + '» 잉크 ' + x.w + 'px · 여백 ' + x.l + '/' + x.rr, JSON.stringify(x)));
    eq('  font-size 는 한 단도 안 내렸다(레이아웃 Δ0px)', r.fs, '48.5px');
    eq('  카드 폭 불변', r.cardW, 326);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [F] 58 플로터는 증가분 ══════════════════ */
  /* ⚑ 628(2026-09-01) — **축을 갈아 끼웠다**(333 처방 — 항을 지우거나 무르게 풀지 않는다).
     486 은 «플로터 = 증가분» 을 세우면서 그 증가분을 `U.atk.val()` **기저**로 적었는데,
     같은 작업이 알약(`.cv`)은 «지금 최종값»(`TRAIN_NOW` = `stat.*`)으로 옮겼다 —
     한 카드 안에서 두 수가 서로 다른 자를 쓰게 된 자리다(`probe628` [B]: atk +21.7% ·
     hp +19.3% · regen +16.7%). 486 의 «증가분을 말한다» 는 뜻은 그대로 두고,
     **무엇의 증가분인가**만 알약과 같은 축으로 돌린다.
     ⚠ 기대값을 제품 식으로 다시 적지 않는다 — **실제로 사서** 최종값의 전·후 차를 잰다.
     ⚠ 그리고 [F0] 로 «옛 기저 축이 되살아나면 빨강» 을 같이 못박는다 — 이 한 줄이 없으면
       «628 이 통째로 사라져도 초록인 게이트» 가 된다(328~330 의 이관 교훈). */
  sec('[F] 58 «+n» 플로터 — 증가분을 말한다(`.cv` 와 분리됐다 · 628 최종값 축)');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(12, 200));
    for (const qty of [1, 10, 30]) {
      const r = await page.evaluate(q => {
        S.buyQty = q; S.gold = 1e30; markDirty(); renderTrain();
        const card = document.querySelector('#trCards [data-tr="atk"]');
        const bi = trainBuyInfo('atk');
        const txt = trDeltaTxt(card);                    /* 구매 «전» 에 잡는 그 문자열 */
        const cv = card.querySelector('.cv i').textContent;
        /* 옛 축(기저) — 되살아나면 [F0] 이 빨개진다 */
        const baseWant = '+' + fmtB(U.atk.val(lv('atk') + bi.n) - U.atk.val(lv('atk')));
        const before = TRAIN_NOW.atk();
        trainBuy('atk');
        const d = TRAIN_NOW.atk() - before;
        /* `fmtG` 는 floor 라 «전·후를 빼서» 잰 값은 부동소수 누적으로 한 칸 내려앉을 수 있다 */
        return { txt, cv, baseWant, n: bi.n,
                 want: '+' + fmtB(d), wantEps: '+' + fmtB(d * (1 + 1e-9)) };
      }, qty);
      ok(r.txt === r.want || r.txt === r.wantEps,
         '  x' + qty + ' — 플로터 문구 = 실제 최종값 증분(628)', r.txt + ' ≟ ' + r.want);
      ok(r.txt !== r.baseWant,
         '  x' + qty + ' — [F0] 옛 «기저 증분» 축(«' + r.baseWant + '»)이 안 되살아났다');
      ok(r.txt !== r.cv, '  x' + qty + ' — 플로터가 알약 글자(«' + r.cv + '»)를 그대로 쓰지 않는다');
    }
    /* 상한에서는 안 띄운다(58 규약 유지) */
    const rf = await page.evaluate(() => {
      S.lv.atk = trainCap(); markDirty(); renderTrain();
      return trDeltaTxt(document.querySelector('#trCards [data-tr="atk"]'));
    });
    eq('  상한 카드에서는 플로터 문구가 빈 문자열', rf, '');
    /* 소스 — `.cv` 를 다시 읽는 경로가 되살아나지 않았다 */
    const CODE = fs.readFileSync(SRC, 'utf8');
    const body = CODE.slice(CODE.indexOf('function trDeltaTxt'), CODE.indexOf('function trHoldStop'));
    ok(!/\.cv/.test(body), '  trDeltaTxt 본문이 `.cv` 를 안 읽는다');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [G] 라벨 ══════════════════ */
  sec('[G] 라벨 — 단위는 이름 줄에(«체력 회복/초») · 잉크가 카드 안');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(3, 20));
    const s = await shot(page);
    eq('  공격력 라벨', s.cn.atk, '공격력');
    eq('  체력 라벨', s.cn.hp, '체력');
    eq('  체력 회복 라벨에 «/초»', s.cn.regen, '체력 회복/초');
    ok(!/\/초|초당/.test(s.cv.regen), '  단위가 알약 쪽에는 안 붙었다(수만 담는다)', s.cv.regen);
    const g = await page.evaluate(() => {
      const card = document.querySelector('#trCards [data-tr="regen"]');
      const el = card.querySelector('.cn i'), cr = card.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { l: +(r.left - cr.left).toFixed(2), rr: +(cr.right - r.right).toFixed(2), w: +r.width.toFixed(2) };
    });
    ok(g.l >= 8 && g.rr >= 8, '  «체력 회복/초» 잉크 ' + g.w + 'px · 여백 ' + g.l + '/' + g.rr + ' ≥ 8px',
      JSON.stringify(g));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [H] 안 건드린 축 ══════════════════ */
  sec('[H] 안 건드린 축 — 밸런스·진행바·비용 0줄');
  {
    const CODE = fs.readFileSync(SRC, 'utf8');
    ok(/const TRAIN_VAL_K = \{ atk:20, hp:100, regen:15 \}/.test(CODE), '  TRAIN_VAL_K 불변');
    /* 517 — 요구치 상수는 구간표로 갈렸다(주인 지시 2026-08-31). 486 이 지키는 것은 «알약·진행바를
       건드리지 않았다» 이므로, 요구치 축은 «표가 한 벌로 있다» 로 읽는다. */
    ok(/const TRAIN_NEED = \[300, 300, 300, 300, 600, 600, 600, 900\];/.test(CODE), '  TRAIN_NEED 구간표 불변(517)');
    ok(/const TRAIN_BONUS = 0\.10;/.test(CODE), '  TRAIN_BONUS 불변');
    ok(/const TRAIN_QTYS = \[1, 10, 30\];/.test(CODE), '  TRAIN_QTYS 불변');
    ok(/\.tr-card>\.cv\{left:0;right:0;top:288px;height:60px;line-height:60px;text-align:center\}/.test(CODE),
      '  `.cv` 기하(top 288 · h 60) 한 픽셀도 안 바뀌었다');
    ok(/\.tr-card>\.cv>i\{font-size:48\.5px/.test(CODE), '  `.cv` 글자 크기 48.5px 불변');
    const { ctx, page, errs } = await open(browser, SRC, save(9, 400));
    const r = await page.evaluate(() => {
      const b = { prog: trainProg(), max: trainMax(), txt: $('trProg').textContent,
                  w: $('trFill').style.width, cost: trainBuyInfo('atk').cost, gold: S.gold };
      trainBuy('atk'); renderTrainLive();
      return { b, a: { prog: trainProg(), txt: $('trProg').textContent } };
    });
    ok(r.a.prog === r.b.prog + 1, '  진행바는 483 계약대로 여전히 한 칸 오른다', r.b.prog + '→' + r.a.prog);
    ok(r.b.cost > 0, '  비용 계산은 그대로 살아 있다', r.b.cost);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [R] 되돌림 시험 ══════════════════ */
  sec('[R] 되돌림 — `c.now` 를 `c.gain` 으로 되돌린 사본에서 주인이 본 그림이 재현된다');
  {
    const CODE = fs.readFileSync(SRC, 'utf8');
    const M1 = "'<span class=\"cv\"><i>' + (c.full ? 'MAX' : c.now) + '</i></span>'";
    const M2 = "set('.cv i', c.full ? 'MAX' : c.now);";
    eq('  R0 전제 — 통째 렌더의 최종값 표기가 정확히 한 번', CODE.split(M1).length - 1, 1);
    eq('  R0 전제 — 가벼운 갱신의 최종값 표기가 정확히 한 번', CODE.split(M2).length - 1, 1);
    const tmp = path.join(ROOT, 'index.verify486-revert.html');
    fs.writeFileSync(tmp, CODE.split(M1).join(M1.replace('c.now', 'c.gain'))
                              .split(M2).join(M2.replace('c.now', 'c.gain')));
    try {
      const { ctx, page } = await open(browser, tmp, save(3, 20));
      const s = await shot(page);
      ok(/^\+/.test(s.cv.atk) && /^\+/.test(s.cv.hp) && /^\+/.test(s.cv.regen),
        '  R1 — 되돌린 사본은 세 칸 전부 «+» 증가분이다', JSON.stringify(s.cv));
      ok(s.cv.atk !== s.now.atk, '  R2 — 그리고 최종값(«' + s.now.atk + '»)이 화면에 없다', s.cv.atk);
      const r = await page.evaluate(() => {
        S.buyQty = 1; S.gold = 1e30; markDirty(); renderTrain();
        const t = () => document.querySelector('#trCards [data-tr="atk"] .cv i').textContent;
        const b = t(); trainBuy('atk'); renderTrainLive();
        return { b, a: t() };
      });
      eq('  R3 — 사도 알약 글자가 안 움직인다(= 주인이 본 그림)', r.a, r.b);
      await ctx.close();
    } finally { fs.unlinkSync(tmp); }
  }

  /* ══════════════════ [I] 콘솔 ══════════════════ */
  sec('[I] 콘솔');
  ok(allErrs.length === 0, '  콘솔 error / pageerror 0건', allErrs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY486 PASS ' : 'VERIFY486 FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
