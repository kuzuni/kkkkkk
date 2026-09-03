#!/usr/bin/env node
/* 재현 — 작업 828 «단련 [단련] 버튼(`.tb`)의 자릿수 예산이 «넓히기» 로는 안 끝난다 —
 *   12자리(502px)부터 496 도 넘는다 · 150 «폭 클램프»(`fitNum`)가 이 버튼에 안 걸려 있다»
 *   (2026-09-02 등재, 769 §7 곁다리 — sess-1614-4218 워커 A 실측)
 *
 *   node tools/probe828.js
 *
 * 338 규칙: **처방 전에 재현한다.** 등재문이 적은 수(«12자리 = 502px > 496»)는 769 가 폭을
 * 340 → 496 으로 넓히면서 부수로 잰 값이라, 이 자가 **지금 트리에서** 다시 잰다.
 *
 *   [1] 자릿수 스윕 — 라벨(아이콘 + 숫자)의 잉크 폭을 8~15자리로 재고 «어느 자리부터 넘치는가» 를 찍는다.
 *       예산은 상수가 아니라 **버튼에게 묻는다**(368 처방) — `.tb` 안쪽 = 폭 − 검정 링(box-shadow inset) 좌우.
 *   [2] 넘치는 모양 — 넘칠 때 실제로 무슨 일이 나는가(잉크가 링을 뚫는가 · 줄이 접히는가).
 *       584·769 가 «두 줄로 접힘» 을 관측한 자리라 그 축을 같이 본다.
 *   [3] 도달 가능성 — 그 자릿수가 «닿을 수 있는 값» 인가. 단련은 만렙이 없으므로(주인 지시 ⓑ)
 *       비용 `(s+1)(s+2)/2`(s = ⌊lv/100⌋)는 무한히 자란다 ⇒ 자릿수 상한이 없다는 것을 산수로 못박는다.
 *   [4] 짧은 라벨의 현재 그림 — 수리가 **한 픽셀도 안 건드려야 할** 자리(686·670·769 가 푼 값)를
 *       미리 찍어 둔다(수리 뒤 verify828 [1] 이 같은 수를 다시 묻는다).
 *   [5] 두 경로 — 통짜 렌더(`renderTemper`)와 홀드 중 숫자 갱신(`liveTemper`)이 같은 라벨을 만드는가.
 *       297 규약(«두 경로가 어긋나면 홀드 중에만 옛 그림이 되살아난다»)이 클램프에도 그대로 걸린다.
 *
 * 이 자는 «지금 어떤가» 만 찍는다(합격/불합격 판정은 verify828).
 * ⚠ 수리 전·후 둘 다 초록으로 끝난다 — «넘치는가» 를 묻는 항은 **소스에서 읽은 예산**과 대조하고,
 *   «넘치면 안 된다» 는 판정은 게이트(verify828)에만 둔다(803 자리 — 수리 전에만 초록인
 *   재현자를 두면 다음 세션이 그 빨강을 게이트 부패로 읽는다).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const blk = t => console.log('\n' + t);
const p1 = n => Math.round(n * 10) / 10;

async function openAt(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e9; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });
  /* 공용 자 — 한 행의 «버튼 안쪽 예산 ↔ 라벨 잉크» 를 화면 px 로 통일해서 잰다.
     예산은 상수가 아니라 버튼에게 묻는다: 안쪽 = clientWidth − 검정 링(box-shadow inset spread) 좌우.
     ⚠ 링은 `.tb`(8px)와 `.tb.no`(5px)가 다르다 — 그래서 «지금 이 버튼» 것을 읽는다.
     ⚠ `natural` 은 «클램프를 안 걸었을 때 이 라벨이 요구하는 폭» 이다 — 인라인 fs 를 잠시 지우고 잰 뒤
       되돌린다. 수리 전·후가 **같은 수**를 내야 하는 축이라 이 자의 판정은 전부 이 값 위에 선다
       (803 — 수리 전에만 초록인 재현자를 두지 않는다). */
  await page.evaluate(`window.__tb = (i) => {
    const row = document.querySelector('.tr-tp.k' + i); if (!row) return null;
    const btn = row.querySelector('.tb'), num = row.querySelector('.tbn');
    const ic  = btn && btn.querySelector('img,.cic');
    if (!btn || !num) return null;
    const r1 = n => Math.round(n * 10) / 10;
    const br = btn.getBoundingClientRect();
    const sc = br.width / btn.offsetWidth;                 /* 프레임 → 화면 배율(fit()) */
    /* box-shadow 의 inset 조각에서 spread(네 번째 길이)를 읽는다. 색 함수의 쉼표를 먼저 지운다. */
    const bs = getComputedStyle(btn).boxShadow.replace(/rgba?\\([^)]*\\)/g, '');
    let ring = 0;
    for (const part of bs.split(',')) {
      if (part.indexOf('inset') < 0) continue;
      const nums = (part.match(/-?[\\d.]+px/g) || []).map(parseFloat);
      if (nums.length >= 4) ring = Math.max(ring, nums[3]);
    }
    const rg = document.createRange(); rg.selectNodeContents(num);
    const nr = rg.getBoundingClientRect();
    const irc = ic ? ic.getBoundingClientRect() : null;
    const icCS = ic ? getComputedStyle(ic) : null;
    const rects = [...rg.getClientRects()].filter(r => r.width > .5 && r.height > .5);
    const inkL = irc ? Math.min(irc.left, nr.left) : nr.left;
    const inkR = Math.max(nr.right, irc ? irc.right : -1e9);
    /* 클램프를 안 걸었을 때의 요구 폭 — 인라인 fs 를 잠시 지우고 잰다(수리 전이면 처음부터 없다) */
    const keep = num.style.fontSize;
    num.style.fontSize = '';
    rg.selectNodeContents(num);
    const natNum = rg.getBoundingClientRect().width / sc;
    num.style.fontSize = keep;
    const icUsed = ic ? ic.offsetWidth + (parseFloat(icCS.marginLeft) || 0)
                                       + (parseFloat(icCS.marginRight) || 0) : 0;
    return {
      natNum: r1(natNum),                                  /* 클램프 없는 숫자 잉크(레이아웃 px) */
      natLabel: r1(natNum + icUsed),                       /* 클램프 없는 라벨 요구 폭 */
      icUsed: r1(icUsed),
      txt: num.textContent, digits: num.textContent.replace(/[^0-9]/g, '').length,
      btnW: r1(btn.offsetWidth), ring: ring, sc: r1(sc * 1000) / 1000,
      room: r1(btn.offsetWidth - ring * 2),                /* 레이아웃 px 예산 */
      icW: irc ? r1(irc.width / sc) : 0,
      icGap: icCS ? r1(parseFloat(icCS.marginRight) || 0) : 0,
      numInk: r1(nr.width / sc),                           /* 숫자만의 잉크(레이아웃 px 환산) */
      labelInk: r1((inkR - inkL) / sc),                    /* 아이콘 + 간격 + 숫자 = 라벨 전체 잉크 */
      overL: r1((br.left + ring * sc - inkL) / sc),        /* >0 이면 왼쪽 링을 뚫었다 */
      overR: r1((inkR - (br.right - ring * sc)) / sc),     /* >0 이면 오른쪽 링을 뚫었다 */
      lines: rects.length,
      numTop: r1((nr.top - br.top) / sc),                  /* 버튼 상변 기준 숫자 잉크 상변 */
      btnH: r1(btn.offsetHeight),
      fs: r1(parseFloat(getComputedStyle(num).fontSize)),
      inlineFs: num.style.fontSize || ''
    };
  };`);
  /* 자릿수를 실제 모델로 만든다 — 비용 = (s+1)(s+2)/2, s = ⌊lv/100⌋ (손 문자열 주입이 아니다) */
  await page.evaluate(`window.__setDigits = (d) => {
    const want = Math.pow(10, d - 1);                       /* d 자리의 최솟값 */
    let s = Math.ceil((Math.sqrt(8 * want + 1) - 3) / 2);    /* (s+1)(s+2)/2 >= want */
    while ((s + 1) * (s + 2) / 2 < want) s++;
    S.temper = { alloc: { atk: s * 100, hp: s * 100, regen: s * 100 } };
    S.tstone = Math.max(1e9, (s + 1) * (s + 2) / 2 * 4);     /* 살 수 있어야 .no 가 아니다 */
    trMul = 1;
    renderTemper();
    return { s: s, cost: (s + 1) * (s + 2) / 2, lv: s * 100 };
  };`);
  return { ctx, page };
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await openAt(browser, 2280);
  const ev = fn => page.evaluate(fn).catch(e => ({ __err: String(e) }));

  /* ══ [4-선] 짧은 라벨 — 수리가 안 건드려야 할 자리 ═══════════════════ */
  blk('[4] 짧은 라벨(출고 상태) — 수리가 한 픽셀도 안 건드려야 할 자리');
  const base = await ev(() => window.__tb(0));
  if (!base || base.__err) ok(false, '기준 측정 실패: ' + (base && base.__err));
  else {
    console.log('       라벨 «' + base.txt + '» · 버튼 ' + base.btnW + ' · 링 ' + base.ring
      + ' ⇒ 예산 ' + base.room + ' · 아이콘 ' + base.icW + '+' + base.icGap
      + ' · 숫자 잉크 ' + base.numInk + ' · 라벨 잉크 ' + base.labelInk + ' · fs ' + base.fs);
    ok(base.btnW === 496, '[4-a] 버튼 폭은 769 가 놓은 496 이다', String(base.btnW));
    ok(base.ring === 8, '[4-b] 검정 링(inset spread)은 8px 이다', String(base.ring));
    ok(base.room === 480, '[4-c] 안쪽 예산 = 496 − 8×2 = 480(769 §7 의 그 수)', String(base.room));
    ok(base.inlineFs === '', '[4-d] 짧은 라벨에는 인라인 font-size 가 남지 않는다(150 규약)',
       '«' + base.inlineFs + '»');
    ok(base.labelInk < base.room, '[4-e] 짧은 라벨은 예산 안이다(넘칠 일이 없다)',
       base.labelInk + ' < ' + base.room);
  }

  /* ══ [1] 자릿수 스윕 ══════════════════════════════════════════════════ */
  blk('[1] 자릿수 스윕 — 어느 자리부터 «클램프 없는 라벨» 이 예산(480)을 넘는가');
  const sweep = [];
  for (let d = 8; d <= 15; d++) {
    const made = await page.evaluate(`window.__setDigits(${d})`);
    const m = await ev(() => window.__tb(0));
    if (!m || m.__err) { ok(false, d + '자리 측정 실패'); continue; }
    sweep.push({ d, ...m, lv: made.lv });
    console.log('       ' + String(d).padStart(2) + '자리 «' + m.txt + '»'
      + ' (Lv ' + made.lv.toLocaleString('en-US') + ')'
      + ' · 요구 숫자 ' + String(m.natNum).padStart(6)
      + ' · 요구 라벨 ' + String(m.natLabel).padStart(6)
      + ' · 예산차 ' + (m.natLabel - m.room > 0 ? '+' : '') + p1(m.natLabel - m.room)
      + ' · 지금 fs ' + m.fs + (m.inlineFs ? '(클램프)' : ''));
  }
  const digitsSeen = sweep.map(s => s.digits);
  ok(sweep.length === 8 && digitsSeen.every((v, i) => v === i + 8),
     '[1-a] 8~15자리를 실제 모델(비용 = (s+1)(s+2)/2)로 전부 만들었다', digitsSeen.join('·'));
  const first = sweep.find(s => s.natLabel > s.room);
  console.log('       ⇒ 처음 예산을 넘는 자리: ' + (first ? first.d + '자리 (요구 ' + first.natLabel
    + ' > 예산 ' + first.room + ')' : '없음'));
  ok(!!first, '[1-b] «넓히기» 로는 안 끝난다 — 예산을 넘는 자릿수가 실제로 존재한다',
     first ? first.d + '자리부터' : '15자리까지 안 넘침');
  ok(!!first && first.d === 12,
     '[1-c] 등재문의 «12자리부터» 가 맞다', first ? String(first.d) + '자리' : '—');
  const box = first && first.natLabel;
  ok(!!first && box > 496 && box < 512,
     '[1-d] 그 자리의 요구 폭은 등재문의 «502px» 과 같은 자리다(버튼 폭 496 도 넘는다)',
     first ? first.natLabel + 'px' : '—');
  /* 잉크는 자릿수에 대해 단조 증가여야 한다(한 자리 늘 때마다 한 글자 + 쉼표) */
  const mono = sweep.every((s, i) => i === 0 || s.natNum > sweep[i - 1].natNum);
  ok(mono, '[1-e] 요구 잉크는 자릿수에 단조 증가한다(예산이 언젠가 반드시 진다)',
     sweep.map(s => s.natNum).join(' < '));

  /* ══ [2] 넘칠 때 제품이 하는 일 ══════════════════════════════════════
     ⚠ 판정이 아니라 «지금 무엇을 하는가» 를 찍는 자리다. 수리 전에는 ⓐ(줄 접힘)·ⓑ(링 뚫기)이고
     수리 뒤에는 ⓒ(클램프)다 — 그래서 단언은 **셋 중 하나가 반드시 일어난다**로 둔다(803). */
  blk('[2] 예산을 넘는 자리에서 제품이 하는 일');
  const over = sweep.filter(s => s.natLabel > s.room);
  if (over.length) {
    over.forEach(s => {
      const what = s.inlineFs ? 'ⓒ 클램프(fs ' + s.fs + ')'
                 : (s.numTop > s.btnH - 1 ? 'ⓐ 줄 접힘 — 숫자가 버튼 밖(위에서 ' + s.numTop + 'px)'
                 : (s.overL > 0 || s.overR > 0 ? 'ⓑ 링 뚫기(좌 ' + s.overL + ' · 우 ' + s.overR + ')'
                 : '— 아무 일도 안 함'));
      console.log('       ' + String(s.d).padStart(2) + '자리 → ' + what);
    });
    const allHandled = over.every(s => s.inlineFs || s.numTop > s.btnH - 1 || s.overL > 0 || s.overR > 0);
    ok(allHandled,
       '[2-a] 예산을 넘는 자리에서는 셋 중 하나가 일어난다(줄 접힘 · 링 뚫기 · 클램프)',
       over.map(s => s.d + '자리:' + (s.inlineFs ? '클램프' : s.numTop > s.btnH - 1 ? '접힘' : '뚫기')).join(' · '));
    const worst = sweep[sweep.length - 1];
    console.log('       최악(' + worst.d + '자리): 숫자 상변 ' + worst.numTop + ' / 버튼 높이 ' + worst.btnH
      + ' · 좌 초과 ' + worst.overL + ' · 우 초과 ' + worst.overR + ' · 인라인 fs «' + worst.inlineFs + '»');
  } else {
    ok(false, '[2] 예산을 넘는 자리를 못 만들어 모양을 못 본다');
  }

  /* ══ [3] 도달 가능성 — 자릿수 상한이 없다 ════════════════════════════ */
  blk('[3] 도달 가능성 — 단련은 만렙이 없어 자릿수 상한이 없다');
  const G = await ev(() => {
    /* 소스의 식을 그대로 쓴다(두 벌 금지) — 상한이 «없다» 는 것을 산수로 못박는다 */
    const at = lv => temperSegCost(Math.floor(lv / TEMPER_SEG));
    return {
      seg: TEMPER_SEG,
      d12: at(4000000).toString().length,
      d15: at(140000000).toString().length,
      grow: at(4000000) < at(140000000),
      maxDecl: (typeof TEMPER_MAX !== 'undefined')
    };
  });
  if (G.__err) ok(false, '[3] evaluate 실패: ' + G.__err);
  else {
    console.log('       Lv 4,000,000 → ' + G.d12 + '자리 · Lv 140,000,000 → ' + G.d15 + '자리');
    ok(!G.maxDecl, '[3-a] 단련에는 만렙 상수가 없다(주인 지시 ⓑ «맥스 없음»)');
    ok(G.grow && G.d15 > G.d12,
       '[3-b] 비용은 레벨과 함께 무한히 자란다 ⇒ «상자를 더 넓히기» 는 원리적으로 끝이 없다',
       G.d12 + '자리 → ' + G.d15 + '자리');
  }

  /* ══ [5] 두 경로 ═════════════════════════════════════════════════════ */
  blk('[5] 두 경로 — 통짜 렌더 ↔ 홀드 중 숫자 갱신(297 규약)');
  await page.evaluate('window.__setDigits(14)');
  const R = await ev(() => {
    const num = () => document.querySelector('.tr-tp.k0 .tbn');
    const full = { t: num().textContent, fs: num().style.fontSize || '' };
    /* 홀드 경로만 다시 태운다 — 값은 그대로이고 갱신 경로만 다르다 */
    liveTemper();
    const live = { t: num().textContent, fs: num().style.fontSize || '' };
    return { full, live };
  });
  if (R.__err) ok(false, '[5] evaluate 실패: ' + R.__err);
  else {
    console.log('       통짜: «' + R.full.t + '» fs «' + R.full.fs + '»'
      + '  ↔  홀드: «' + R.live.t + '» fs «' + R.live.fs + '»');
    ok(R.full.t === R.live.t, '[5-a] 두 경로가 같은 문자열을 만든다');
    ok(R.full.fs === R.live.fs,
       '[5-b] 두 경로가 같은 클램프 상태를 만든다(어긋나면 홀드 중에만 다른 그림이 된다)',
       '«' + R.full.fs + '» ↔ «' + R.live.fs + '»');
  }

  await ctx.close();
  await browser.close();
  console.log('\nPROBE828 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
