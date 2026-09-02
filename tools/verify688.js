#!/usr/bin/env node
/* 게이트 — 작업 688 «재화 잔량 헤더 규약 통일» (2026-09-02, 저장소 주인 지시 01:25)
 *
 *   node tools/verify688.js
 *
 * 주인 원문: «단련석도 (단련석) 100 이런식으로 단련석이라고 한글로 표시 하지말기.
 *            단련석 현재 개수 표시에 ㅇㅇ. 그리고 그거 표시 왼쪽 말고 중앙에 표시되게 정렬하기.
 *            룬부분도 표시한다면 중앙으로»
 *
 * 절은 다섯 + 되돌림이다:
 *   [1] ★ 표기 — 단련 헤더 글자가 «수(콤마)» 뿐 · 한글 0자 · 아이콘(.cic) 1장
 *   [2] ★ 정렬 — **잉크** 중심 x = 헤더 중심 x (상자가 아니라 잉크로 잰다 — 687 4회차 규약)
 *   [3] ★ 한 부품 — 룬(#rnHd)·단련(.tp-hd) 두 헤더가 같은 껍데기(`.cur-hd`)를 쓰고
 *                  아이콘 상자·글자 크기·정렬·높이가 **한 값**이다(값을 두 번 안 적는다)
 *   [4] 값     — 613 승계: 헤더 수 = tstoneHave() 그대로 · 단련 1회 뒤 **즉시** 줄어든다
 *                (홀드 경로 liveTemper 도 같은 문자열을 쓴다 — 262 «두 벌 금지»)
 *   [5] 두 프레임 — 9:19(2280)·9:13.3(1600) 둘 다 [1]~[3] 이 성립하고 잉크가 띠 안이다
 *   §R  되돌림 — ⓐ 한글 라벨을 주입하면 [1] 이 · ⓑ `.pv` 를 절대 위치로 되돌리면 [2] 가 ·
 *                ⓒ 아이콘 크기를 옛 36 으로 되돌리면 [3] 이 **각각** 빨개진다
 *                (술어 셋이 서로 다른 것을 잡는다 — 한 술어가 셋을 다 덮으면 자가 무르다)
 *
 * ⚠ 잉크 중심은 아이콘 아트마다 다른 «상자 대비 잉크 폭» 을 써야 한다 —
 *   rstone viewBox 40/64 = **.625**(좌우 투명 10px씩) · tstone 48/48 = **1.0**(여백 0).
 *   이 값은 손 상수가 아니라 SVG viewBox 에서 온다(687 4회차가 −10 보정을 넣은 근거이고,
 *   그 −10 을 단련에 물려주면 반대로 어긋난다 — 그래서 CSS 는 `--cur-dx` 로 갈라 둔다).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* SVG viewBox 파생 — 손으로 적은 비가 아니다 */
const inkRatio = k => {
  const s = fs.readFileSync(path.join(ROOT, 'assets/ui/cur-' + k + '.svg'), 'utf8');
  const m = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(s);
  return Math.min(1, (+m[3]) / (+m[4]));
};
const INK = { tstone: inkRatio('tstone'), rstone: inkRatio('rstone') };

const boot = async (browser, h) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e12; S.dia = 1e6; S.rstone = 12345; S.tstone = 1234567; S.stage = 400;
    S.rune = { r1: 5, r2: 0, r3: 0 }; S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });
  await page.waitForTimeout(120);
  return { ctx, page, errs };
};

/* 헤더 한 자리를 읽는다 — 잉크 bbox·아이콘 상자·정렬·글자 크기 */
const READ = `(function(sel, ratio){
  const hd = document.querySelector(sel);
  if(!hd) return null;
  const i = hd.querySelector('.pv i');
  const hb = hd.getBoundingClientRect();
  const rg = document.createRange(); rg.selectNodeContents(i);
  const ib = rg.getBoundingClientRect();
  const im = i.querySelector('img.cic');
  const mb = im ? im.getBoundingClientRect() : null;
  const inkL = mb ? mb.left + (mb.width - mb.width * ratio) / 2 : ib.left;
  return {
    txt: i.textContent.replace(/\\s+/g, ' ').trim(),
    hangul: (i.textContent.match(/[가-힣]/g) || []).length,
    imgs: i.querySelectorAll('img.cic').length,
    icon: mb ? +mb.width.toFixed(2) : 0,
    fs: +parseFloat(getComputedStyle(i).fontSize).toFixed(2),
    align: getComputedStyle(hd).textAlign,
    h: +hb.height.toFixed(2),
    dCx: +Math.abs((inkL + ib.right) / 2 - (hb.left + hb.right) / 2).toFixed(2),
    inX: ib.left >= hb.left && ib.right <= hb.right,
    inY: ib.top >= hb.top - 1 && ib.bottom <= hb.bottom + 1
  };
})`;

const readBoth = page => page.evaluate(([R, it, ir]) => {
  const f = eval(R);
  setTrSub('temper'); renderTrain();
  const t = f('#trTemper .tp-hd', it);
  setTrSub('rune'); setRuneSub('r1'); renderTrain();
  const r = f('#rnHd', ir);
  setTrSub('temper'); renderTrain();
  return { t, r };
}, [READ, INK.tstone, INK.rstone]);

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, 2280);

  /* ══ [1] ★ 표기 — «(아이콘) 수량» 만 ═══════════════════════════════════ */
  console.log('[1] ★ 표기 — 단련 헤더가 «(아이콘) 수량» 뿐(한글 재화명 금지)');
  const b = await readBoth(page);
  ok(/^[\d,]+$/.test(b.t.txt), '★ 글자는 수(콤마 포함)뿐이다', '«' + b.t.txt + '»');
  ok(b.t.hangul === 0, '★ 한글 재화명 0자(«단련석» 금지 — 주인 원문)', b.t.hangul + '자');
  ok(b.t.imgs === 1, '아이콘 1장으로 «무엇을 세는가» 를 말한다(125 규약 .cic)', String(b.t.imgs));
  ok(b.t.txt === '1,234,567', '주입값 1,234,567 이 fmt 그대로 찍힌다(손으로 적은 수가 아니다)', b.t.txt);

  /* ══ [2] ★ 정렬 — 잉크 중앙 ════════════════════════════════════════════ */
  console.log('[2] ★ 정렬 — 잉크 중심 = 헤더 중심(주인 원문 «왼쪽 말고 중앙»)');
  ok(b.t.align === 'center', '헤더 정렬이 center 다(수리 전 start)', b.t.align);
  ok(b.t.dCx <= 2, '★ **잉크**(아이콘 잉크 + 수)가 헤더 가로 중앙이다 — Δ≤2px', 'Δ' + b.t.dCx + 'px');
  ok(b.t.inX && b.t.inY, '잉크가 헤더 띠 안에 온전하다(잘림 0)');
  ok(b.r.dCx <= 2, '룬 헤더도 중앙 그대로다(«룬부분도 표시한다면 중앙으로» · 687 회귀)', 'Δ' + b.r.dCx + 'px');

  /* ══ [3] ★ 한 부품 — 두 헤더가 같은 껍데기·같은 크기 ═══════════════════ */
  console.log('[3] ★ 한 부품 — `.cur-hd` 하나에서 파생(값을 두 번 안 적는다)');
  const cls = await page.evaluate(() => ({
    t: document.querySelector('#trTemper .tp-hd').classList.contains('cur-hd'),
    r: document.getElementById('rnHd').classList.contains('cur-hd')
  }));
  ok(cls.t && cls.r, '★ 두 헤더가 공용 클래스 `.cur-hd` 를 쓴다', JSON.stringify(cls));
  ok(Math.abs(b.t.icon - b.r.icon) <= 0.5, '★ 아이콘 상자가 한 값이다(수리 전 36 ↔ 53)',
    b.t.icon + ' ↔ ' + b.r.icon);
  ok(Math.abs(b.t.fs - b.r.fs) <= 0.5, '★ 글자 크기가 한 값이다(수리 전 36 ↔ 52)', b.t.fs + ' ↔ ' + b.r.fs);
  ok(Math.abs(b.t.h - b.r.h) <= 0.5 && Math.abs(b.t.h - 88) <= 0.5, '띠 높이가 한 값 88 이다(613·687 규약)',
    b.t.h + ' ↔ ' + b.r.h);
  ok(b.t.align === b.r.align, '정렬도 한 값이다', b.t.align + ' ↔ ' + b.r.align);
  ok(/const curHeadTxt/.test(CODE) && CODE.split('curHeadTxt(').length >= 4,
    '★ 텍스트도 한 부품이다 — `curHeadTxt()` 선언 1 + 호출 2(룬·단련)',
    (CODE.split('curHeadTxt(').length - 1) + '자리');
  ok(!/curIc\('tstone',\s*36\)/.test(CODE), '옛 «아이콘 36 + 한글 라벨» 식이 소스에 남아 있지 않다');
  ok(/\.cur-hd\s*\{/.test(CODE) && !/\.tr-temp>\.tp-hd>\.pv\{/.test(CODE),
    '단련 쪽 제 CSS(.tp-hd>.pv 절대 위치)가 선언째 사라졌다 — 자리만 남는다');

  /* ══ [4] 값 — 613 승계(즉시 갱신 · 홀드 경로도 같은 문자열) ════════════ */
  console.log('[4] 값 — 613 승계: 즉시 갱신 · 통짜 ≡ 홀드(262 «두 벌 금지»)');
  const val = await page.evaluate(() => {
    setTrSub('temper'); S.tstone = 500; S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
    renderTrain();
    const read = () => document.querySelector('#trTemper .tp-hd .pv i').textContent.trim();
    const before = read();
    const cost = temperCost('atk');
    temperUp('atk'); renderTemper();
    const after = read();
    const left = tstoneHave();          /* ⚠ 아래 홀드 시험이 잔액을 갈아엎으므로 **여기서** 잰다 */
    /* 홀드 경로(liveTemper)가 같은 문자열을 쓰는가 — 통짜 없이 값만 바꾼다 */
    S.tstone = 42; liveTemper();
    const held = read();
    renderTrain();
    return { before, after, held, cost, left, want: fmt(500 - cost), want42: fmt(42) };
  });
  ok(val.before === '500', '헤더가 보유 개수를 그대로 말한다', val.before);
  ok(val.after === val.want && val.left === 500 - val.cost,
    '★ 단련 1회 뒤 즉시 «500 − 비용» 이 찍힌다(613 승계)', val.after + ' (비용 ' + val.cost + ')');
  ok(val.held === val.want42, '홀드 경로(liveTemper)도 같은 부품으로 그린다 — 통짜 없이 갱신', val.held);

  /* ══ [5] 두 프레임 ═════════════════════════════════════════════════════ */
  console.log('[5] 두 프레임 — 9:19(2280) · 9:13.3(1600)');
  await ctx.close();
  const h2 = await boot(browser, 1600);
  const b2 = await readBoth(h2.page);
  ok(b2.t.hangul === 0 && /^[\d,]+$/.test(b2.t.txt), '1600 에서도 «수뿐»', '«' + b2.t.txt + '»');
  ok(b2.t.dCx <= 2, '1600 에서도 잉크가 중앙', 'Δ' + b2.t.dCx + 'px');
  ok(b2.t.inX && b2.t.inY, '1600 에서도 잉크가 띠 안(잘림 0)');
  ok(Math.abs(b2.t.icon - b2.r.icon) <= 0.5 && Math.abs(b2.t.fs - b2.r.fs) <= 0.5,
    '1600 에서도 두 헤더가 한 값', b2.t.icon + '/' + b2.t.fs + ' ↔ ' + b2.r.icon + '/' + b2.r.fs);

  /* ══ §R 되돌림 — 세 술어가 서로 다른 것을 잡는다 ═══════════════════════ */
  console.log('§R 되돌림 — 수리 전 셋을 각각 주입하면 각각 빨개진다');
  const rev = await h2.page.evaluate(([R, it]) => {
    const f = eval(R);
    setTrSub('temper'); renderTrain();
    const sel = '#trTemper .tp-hd';
    const i = document.querySelector(sel + ' .pv i');
    const hd = document.querySelector(sel);

    const orig = i.innerHTML;
    i.innerHTML = i.innerHTML.replace('<b', ' 단련석 <b');          /* ⓐ 옛 한글 라벨 */
    const a = f(sel, it);
    i.innerHTML = orig;

    const st = document.createElement('style');                     /* ⓑ 옛 절대 위치 */
    st.textContent = '.tr-temp>.tp-hd>.pv{position:absolute;left:28px;top:16px}';
    document.head.appendChild(st);
    const b = f(sel, it);
    st.remove();

    const im = i.querySelector('img.cic');                          /* ⓒ 옛 아이콘 36 */
    /* ⚠ 인라인 style 을 지우면 원복이 아니라 `.cic` 기본값(1.08em = 56.2)으로 **미끄러진다** —
       curIc 이 크기를 인라인으로 적기 때문이다. 원문을 통째로 담았다가 되돌린다. */
    const css = im.getAttribute('style');
    im.style.width = im.style.height = '36px';
    const c = f(sel, it);
    im.setAttribute('style', css);

    const back = f(sel, it);
    return { a, b, c, back };
  }, [READ, INK.tstone]);
  ok(rev.a.hangul === 3 && !/^[\d,]+$/.test(rev.a.txt),
    '[R-a] 한글 라벨을 주입하면 [1] 이 빨개진다(자가 공허하지 않다)', '«' + rev.a.txt + '»');
  ok(rev.b.dCx > 2, '[R-b] `.pv` 를 옛 절대 위치로 되돌리면 [2] 중앙 술어만 빨개진다',
    'Δ' + rev.b.dCx + 'px');
  ok(rev.c.icon < 40 && rev.c.hangul === 0,
    '[R-c] 아이콘을 옛 36 으로 되돌리면 [3] «한 값» 이 빨개진다(라벨 술어는 그대로 초록)',
    rev.c.icon + 'px');
  ok(rev.back.hangul === 0 && rev.back.dCx <= 2 && Math.abs(rev.back.icon - 53) <= 0.5,
    '[R-d] 원복하면 셋 다 다시 초록 — 사본이 트리를 안 더럽혔다',
    rev.back.icon + 'px / Δ' + rev.back.dCx + 'px');

  ok(errs.length === 0 && h2.errs.length === 0, '콘솔·페이지 에러 0건',
    errs.concat(h2.errs).slice(0, 3).join(' / '));

  await h2.ctx.close();
  await browser.close();
  console.log('\nVERIFY688 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
