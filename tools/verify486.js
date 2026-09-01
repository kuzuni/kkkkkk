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

/* ⚑ 708 (2026-09-01) — `page.evaluate` 안의 예외가 **게이트를 통째로 죽이던** 것을 막는다(278·228 처방 · 319 선례).
   660(주인 지시 «숫자 이펙트 폐지»)이 `trDeltaTxt()` 를 **선언째** 지웠는데 [F] 가 아직 그 함수를 부르고 있어
   `ReferenceError` 가 밖으로 나갔고, 프로세스가 [F] 한복판에서 끝나 **[G]·[H]·[R]·[I] 는 한 번도 안 돌았다**
   (`log: []` · 앞 절의 초록만 찍힌 채 종료 — «초록 n줄» 이 통과처럼 보이는 가장 나쁜 형태다).
   이제 예외는 `{ __err }` 로 잡혀 **그 블록의 항목만 빨개지고** 뒤 절은 계속 돈다.
   관례: 측정 뒤 `if (!blk(r, '이름')) …` 로 걸러 쓴다 — 죽은 블록은 FAIL 1건으로 세고 건너뛴다.
   ⚠ `open()` 안의 초기화 evaluate 는 **감싸지 않는다** — 그 자리가 죽으면 화면 자체가 안 열린 것이라
     블록을 이어 봐야 뒤 항목이 전부 거짓 빨강이 된다. */
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0] }; }
};
const blk = (r, m) => {
  if (r && r.__err) { ok(false, '  ' + m + ' — 평가가 죽었다: ' + r.__err); return false; }
  return true;
};

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
const shot = page => ev(page, () => {
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
      await ev(page, fn => { (new Function(fn))(); markDirty(); renderTrain(); }, '(' + mut.toString() + ')()');
      await page.waitForTimeout(80);
      const s = await shot(page);
      if (!blk(s, '[A] ' + label)) continue;
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
      const s = await ev(page, q => { S.buyQty = q; renderTrain();
        return ['atk', 'hp', 'regen'].map(k =>
          document.querySelector('#trCards [data-tr="' + k + '"] .cv i').textContent); }, qty);
      if (!blk(s, '[B] x' + qty)) continue;
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
        const r = await ev(page, ([q, p]) => {
          S.buyQty = q; S.gold = 1e30; markDirty(); renderTrain();
          const t = () => document.querySelector('#trCards [data-tr="atk"] .cv i').textContent;
          const b = { cv: t(), lv: lv('atk') };
          trainBuy('atk'); window[p]();
          return { b, a: { cv: t(), lv: lv('atk') }, want: fmtB(stat.dmg) };
        }, [qty, path2]);
        if (!blk(r, '[C] x' + qty + ' / ' + path2)) continue;
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
    const r = await ev(page, () => {
      S.trainStage = 3; const cap = trainCap();
      S.lv.atk = cap; S.lv.hp = 0; S.lv.regen = 0; markDirty(); renderTrain();
      const g = (k, s) => document.querySelector('#trCards [data-tr="' + k + '"] ' + s).textContent;
      return { cap, full: g('atk', '.cv i'), btn: g('atk', '.cb i'),
        cls: document.querySelector('#trCards [data-tr="atk"]').className,
        other: g('hp', '.cv i'), otherNow: fmtB(stat.maxHp) };
    });
    if (blk(r, '[D] 상한 카드')) {
      eq('  상한 카드 알약', r.full, 'MAX');
      eq('  상한 카드 버튼', r.btn, '상한');
      ok(/\bfull\b/.test(r.cls), '  상한 카드에 .full 클래스', r.cls);
      eq('  같은 화면의 상한 아닌 카드는 최종값 그대로', r.other, r.otherNow);
    }
    /* 가벼운 갱신 경로도 같은 규칙 */
    const r2 = await ev(page, () => { renderTrainLive();
      return document.querySelector('#trCards [data-tr="atk"] .cv i').textContent; });
    if (blk(r2, '[D] 가벼운 갱신')) eq('  가벼운 갱신 뒤에도 MAX', r2, 'MAX');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [E] 잉크가 알약 안 ══════════════════ */
  sec('[E] 잉크가 알약 안 — 최장 문자열까지 좌우 여백 ≥ 8px (예산 294px)');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(3, 20));
    const r = await ev(page, () => {
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
    if (blk(r, '[E] 알약 잉크')) {
      r.rows.forEach(x => ok(x.l >= 8 && x.rr >= 8 && x.w <= 294,
        '  «' + x.s + '» 잉크 ' + x.w + 'px · 여백 ' + x.l + '/' + x.rr, JSON.stringify(x)));
      eq('  font-size 는 한 단도 안 내렸다(레이아웃 Δ0px)', r.fs, '48.5px');
      eq('  카드 폭 불변', r.cardW, 326);
    }
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [F] 증가분 축은 알약 자리를 흉내내지 않는다 ══════════════════ */
  /* ⚑ 708(2026-09-01) — **축을 갈아 끼웠다**(333 처방 — 자리를 비우거나 무르게 풀지 않는다).
     ⓐ 628 이 세운 «플로터 문구 = 최종값 증분» 은 **660(주인 지시 «훈련도 숫자 이펙트 안뜨게»)이
       은퇴시켰다** — `trDeltaTxt()`·`trHoldGainTxt()` 가 **선언째** 사라졌고(index.html 34679 주석),
       그 두 함수를 부르던 이 절이 `ReferenceError` 를 밖으로 내보내 **자를 통째로 죽이고 있었다**
       ([G]·[H]·[R]·[I] 가 한 번도 안 돌았다 — 708 등재문).
     ⓑ 그렇다고 항을 지우면 486 이 지키던 뜻이 사라진다. 486 의 뜻은 «플로터» 가 아니라
       **«한 카드가 말하는 두 수가 서로 다른 자를 쓰지 않는다»** 이고, 그 뜻을 물려받은
       **살아 있는 자리**가 488 의 정산 요약 토스트다(«공격력 훈련 n회 (Lv. m)» — 홀드를 놓을 때 뜬다).
       ⇒ 폐지된 표본(플로터)은 **소스 축으로 방향을 뒤집어** 지키고([F1]),
          런타임 축은 살아 있는 표본(요약 토스트)으로 갈아 끼운다([F2]).
     ⚠ «훈련 플로터 0장» 자체는 `verify660` [D3] 이 계측기까지 세워 지킨다 — 여기서 겹쳐 세지 않는다.
     ⚠ [F3] 음성 대조가 없으면 [F2] 는 «토스트가 통째로 사라져도 초록» 이 된다(328~330 이관 교훈). */
  sec('[F] 증가분 축 — 폐지된 플로터(660)와, 그 뜻을 물려받은 살아 있는 마무리 문구(488)');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(12, 200));
    /* ── [F1] 소스 — 폐지된 표본은 «방향을 뒤집어» 지킨다 ───────────────────────── */
    const CODE = fs.readFileSync(SRC, 'utf8');
    const declAt = CODE.indexOf('function trDeltaTxt');
    if (declAt < 0) {
      ok(true, '  [F1] `trDeltaTxt()` 선언 0건 — 660 이 선언째 걷었다(죽은 코드 금지 · 295-②·399·460)');
      ok(CODE.indexOf('function trHoldGainTxt') < 0,
         '  [F1] `trHoldGainTxt()` 도 선언 0건 — 짝이 같이 걷혔다');
    } else {
      /* 되살아났다면 486 의 원래 못이 그대로 다시 박힌다 — «알약 글자를 되읽지 마라» */
      const end = CODE.indexOf('\nfunction ', declAt + 1);
      const body = CODE.slice(declAt, end < 0 ? declAt + 4000 : end);
      ok(!/\.cv/.test(body),
         '  [F1] `trDeltaTxt()` 가 되살아났다 — 그 본문이 알약(`.cv`) 글자를 되읽지 않는다');
    }
    /* ── [F2] 런타임 — 살아 있는 마무리 문구(488 요약 토스트) ────────────────────── */
    const r = await ev(page, async () => {
      const said = [];
      const nf = window.notify;
      window.notify = function (t) { said.push(String(t)); return nf.apply(this, arguments); };
      try {
        S.buyQty = 1; S.gold = 1e30; markDirty(); renderTrain();
        const card = document.querySelector('#trCards [data-tr="atk"]');
        const gain = (trainCardData().find(c => c.k === 'atk') || {}).gain;
        trHoldStart('atk', card);                       /* 홀드 — 350ms 뒤부터 틱 */
        await new Promise(z => setTimeout(z, 900));
        const cv = (trCard('atk') || card).querySelector('.cv i').textContent;
        trHoldStop(false);                              /* 놓는 순간 = 정산 요약 토스트 */
        const real = said.slice();
        /* 음성 대조용 — 같은 수집·대조 경로에 «알약 글자를 그대로 담은» 문구를 한 장 흘린다 */
        said.length = 0;
        notify('공격력 훈련 <b>3회</b> (Lv. 1) ' + cv);
        return { real, bait: said.slice(), cv, gain: String(gain), lv: lv('atk') };
      } finally { window.notify = nf; }
    });
    if (blk(r, '[F2] 홀드 정산 문구')) {
      const hit = t => t.indexOf(r.cv) >= 0;            /* 대조기 — «알약 글자를 되풀이하는가» */
      ok(r.real.length >= 1,
         '  [F2] 홀드를 놓으면 마무리 문구가 뜬다(488) — 표본이 살아 있다', JSON.stringify(r.real));
      ok(r.real.some(t => /훈련 <b>\d+회<\/b>/.test(t)),
         '  [F2] 그 문구는 «무엇을 몇 회» 꼴이다(룬·단련과 한 어휘)', JSON.stringify(r.real));
      ok(!r.real.some(hit),
         '  [F2] 그리고 알약 글자(«' + r.cv + '»)를 되풀이하지 않는다 — 두 수가 한 자를 다투지 않는다',
         JSON.stringify(r.real));
      /* `c.gain` 은 이미 «+n» 꼴 문자열이다(`trainCardData()`) — 접두를 다시 붙이지 않는다 */
      ok(!r.real.some(t => t.indexOf(r.gain) >= 0),
         '  [F2] 증가분(«' + r.gain + '»)도 되풀이하지 않는다(58 «+n» 은 660 으로 은퇴했다)',
         JSON.stringify(r.real));
      /* ── [F3] 음성 대조 — 위 셋이 헛초록이 아니다 ─────────────────────────────── */
      ok(r.bait.length === 1 && r.bait.every(hit),
         '  [F3] 음성 대조 — 알약 글자를 담은 문구를 흘리면 같은 대조기가 잡는다',
         JSON.stringify(r.bait));
    }
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [G] 라벨 ══════════════════ */
  sec('[G] 라벨 — 단위는 이름 줄에(«체력 회복/초») · 잉크가 카드 안');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(3, 20));
    const s = await shot(page);
    if (blk(s, '[G] 라벨')) {
      eq('  공격력 라벨', s.cn.atk, '공격력');
      eq('  체력 라벨', s.cn.hp, '체력');
      eq('  체력 회복 라벨에 «/초»', s.cn.regen, '체력 회복/초');
      ok(!/\/초|초당/.test(s.cv.regen), '  단위가 알약 쪽에는 안 붙었다(수만 담는다)', s.cv.regen);
    }
    const g = await ev(page, () => {
      const card = document.querySelector('#trCards [data-tr="regen"]');
      const el = card.querySelector('.cn i'), cr = card.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { l: +(r.left - cr.left).toFixed(2), rr: +(cr.right - r.right).toFixed(2), w: +r.width.toFixed(2) };
    });
    if (blk(g, '[G] 라벨 잉크'))
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
    const r = await ev(page, () => {
      const b = { prog: trainProg(), max: trainMax(), txt: $('trProg').textContent,
                  w: $('trFill').style.width, cost: trainBuyInfo('atk').cost, gold: S.gold };
      trainBuy('atk'); renderTrainLive();
      return { b, a: { prog: trainProg(), txt: $('trProg').textContent } };
    });
    if (blk(r, '[H] 진행바·비용')) {
      ok(r.a.prog === r.b.prog + 1, '  진행바는 483 계약대로 여전히 한 칸 오른다', r.b.prog + '→' + r.a.prog);
      ok(r.b.cost > 0, '  비용 계산은 그대로 살아 있다', r.b.cost);
    }
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
    const tmp = path.join(ROOT, `index.verify486-revert-${process.pid}.html`);
    fs.writeFileSync(tmp, CODE.split(M1).join(M1.replace('c.now', 'c.gain'))
                              .split(M2).join(M2.replace('c.now', 'c.gain')));
    try {
      const { ctx, page } = await open(browser, tmp, save(3, 20));
      const s = await shot(page);
      if (blk(s, '[R] 되돌린 사본')) {
        ok(/^\+/.test(s.cv.atk) && /^\+/.test(s.cv.hp) && /^\+/.test(s.cv.regen),
          '  R1 — 되돌린 사본은 세 칸 전부 «+» 증가분이다', JSON.stringify(s.cv));
        ok(s.cv.atk !== s.now.atk, '  R2 — 그리고 최종값(«' + s.now.atk + '»)이 화면에 없다', s.cv.atk);
      }
      const r = await ev(page, () => {
        S.buyQty = 1; S.gold = 1e30; markDirty(); renderTrain();
        const t = () => document.querySelector('#trCards [data-tr="atk"] .cv i').textContent;
        const b = t(); trainBuy('atk'); renderTrainLive();
        return { b, a: t() };
      });
      if (blk(r, '[R] 사본 구매')) eq('  R3 — 사도 알약 글자가 안 움직인다(= 주인이 본 그림)', r.a, r.b);
      await ctx.close();
    } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  }

  /* ══════════════════ [I] 콘솔 ══════════════════ */
  sec('[I] 콘솔');
  ok(allErrs.length === 0, '  콘솔 error / pageerror 0건', allErrs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY486 PASS ' : 'VERIFY486 FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
